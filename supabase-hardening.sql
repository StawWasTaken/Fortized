-- ═══════════════════════════════════════════════════════════════════
-- FORTIZED — Supabase hardening (paste into SQL Editor, run top to bottom)
-- ═══════════════════════════════════════════════════════════════════
-- Why this file exists:
--
-- 1) THE RECURRING TRANSPARENT AVATAR. The old crop modal exported a
--    fully-transparent PNG (a valid file, ~2-7 KB) and clients from that
--    era still carry it in localStorage. Devices running OLD cached
--    app.js (a phone tab that's been asleep for a week) boot from that
--    localStorage and their old "heal-save" writes the blank avatar
--    straight back into the users row — which is why the bug keeps
--    COMING BACK on every account no matter what the new client code
--    does. The new client code (2026fix245) refuses these values, but
--    the only thing that stops OLD clients is the database itself:
--    the trigger below rejects the blank-PNG signature at the row.
--
-- 2) THE EGRESS OVERAGE. Avatars/banners were stored as ~1 MB PNG data
--    URLs inside users rows, and every profile fetch ships those bytes.
--    New uploads are webp (~30-60 KB) and existing accounts recompress
--    themselves at their next login. The cleanup below also empties the
--    known-corrupt blobs immediately, and the index makes the unread-
--    count + notification-prune queries cheap.

-- ── STEP 1 · Look at the damage first ────────────────────────────────
-- Blank-export signature: png data-url, implausibly small for 480×480.
SELECT username,
       length(pfp)                        AS pfp_chars,
       md5(pfp)                           AS pfp_md5
FROM   users
WHERE  pfp LIKE 'data:image/png%'
AND    length(pfp) < 12000
ORDER  BY length(pfp);

-- Sanity check the other direction — the biggest rows (egress hogs):
SELECT username, length(pfp) AS pfp_chars, length(banner) AS banner_chars
FROM   users
ORDER  BY coalesce(length(pfp),0) + coalesce(length(banner),0) DESC
LIMIT  20;

-- ── STEP 2 · One-time cleanup of poisoned rows ───────────────────────
-- Empties every blank-signature avatar NOW (affected users see the
-- default avatar and simply re-upload) instead of waiting for each
-- account's next login to self-heal.
UPDATE users
SET    pfp = ''
WHERE  pfp LIKE 'data:image/png%'
AND    length(pfp) < 12000;

-- ── STEP 3 · The guard trigger ───────────────────────────────────────
-- Blocks the blank-PNG signature from ever landing in a row again, no
-- matter how old the client that writes it is. Deliberate clears
-- (pfp = '') stay allowed — the in-app "Remove avatar" and the client-
-- side heal both use them.
--
-- Threshold history: first shipped at <12000, which ALSO caught some
-- legitimately-tiny PNG avatars — the user saved, saw the avatar
-- locally, then the next refresh "removed" it because the row silently
-- kept the old value. Now <6000 (the blank 480×480 export is ~2-4 KB
-- as a data URL; real avatars above 6 KB pass), and the client does a
-- read-back after save so any rejection is reported immediately
-- instead of vanishing later. RE-RUN this block if you applied the old
-- version — CREATE OR REPLACE updates it in place.
-- To retire the guard later: DROP TRIGGER trg_users_reject_blank_pfp ON users;
CREATE OR REPLACE FUNCTION ftz_reject_blank_pfp()
RETURNS trigger AS $$
BEGIN
  IF NEW.pfp IS NOT NULL
     AND NEW.pfp LIKE 'data:image/png%'
     AND length(NEW.pfp) < 6000
     AND NEW.pfp IS DISTINCT FROM OLD.pfp THEN
    RAISE NOTICE 'ftz_reject_blank_pfp: refused blank-signature avatar for % (% chars)', NEW.username, length(NEW.pfp);
    NEW.pfp := OLD.pfp;   -- keep whatever the row already had
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_reject_blank_pfp ON users;
CREATE TRIGGER trg_users_reject_blank_pfp
BEFORE UPDATE OF pfp ON users
FOR EACH ROW
EXECUTE FUNCTION ftz_reject_blank_pfp();

-- ── STEP 4 · Notifications: retention support ────────────────────────
-- The app now prunes each user's READ notifications older than 30 days
-- at boot, and the unread badge counts read=false rows constantly.
-- This index makes both O(log n) instead of table scans.
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_time
ON notifications (username, read, time);

-- ── STEP 5 · Verify ──────────────────────────────────────────────────
-- Re-run the STEP 1 SELECT: it should return zero rows. Then try saving
-- an avatar in the app — the console should log
--   [saveUserObject] ✓ wrote [pfp] …
-- and the avatar should survive refreshes on every device.
