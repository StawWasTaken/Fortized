# Moving avatars & banners out of the DB (egress fix)

**Problem:** `users.pfp` and `users.banner` hold base64 image **data URLs**
inline. Every read of a user row (friend lists, memberlists, DM partners,
search, the whole-table `getUsers()` admin scans) drags those bytes across the
wire. That is the primary driver of the Supabase **egress blowout** (hit 635%
of the 5 GB quota).

**Fix:** store the image in Supabase **Storage** (already configured — the app
uses the public `attachments` bucket for message uploads) and keep only its
**URL** in the row. A pfp column drops from ~13 KB to ~100 bytes; a banner from
multiple MB to ~100 bytes. Reads get tiny; the image bytes come from Storage
(CDN-cached), not the DB API.

Reads need **no changes** — `<img src>` renders a `data:` URL and an `https:`
URL identically, and old un-migrated rows keep working during the transition.

---

## Rollout (safe, staged)

### 1. It's already deployed, OFF by default
The client-side offload lives in `saveUserObject` (`FortizedSocial-supabase.js`)
and is gated behind a per-browser flag, so shipping it changed nothing yet. On
ANY upload failure it silently keeps the inline data URL (today's behaviour), so
it can never block a save.

### 2. Prove it on ONE account
In your browser console on the live site:
```js
localStorage.setItem('ftz_media_storage', '1');
```
Then: **upload a new avatar → Save → reload.** Verify:
- Console shows `[media] pfp offloaded to Storage (…B → URL)`.
- The avatar still renders, and survives the reload.
- (Optional) In Supabase → Table editor → `users`, your `pfp` is now an
  `https://…/storage/v1/object/public/attachments/user-media/…` URL, not a
  `data:` blob.

If anything looks wrong, unset the flag (`localStorage.removeItem('ftz_media_storage')`)
and you're back to the old behaviour instantly.

### 3. Flip it on for everyone
Once proven, change `_mediaStorageEnabled()` in `FortizedSocial-supabase.js`
to `return true;` (or default the flag on), bump the cache-bust, and deploy.
From then on every avatar/banner save offloads automatically.

### 4. Backfill existing rows (delivers the immediate egress drop)
New saves only migrate a user when they next edit. To reclaim egress now, run
the one-time bulk migration against the existing rows:

```bash
npm i @supabase/supabase-js        # once
# Dry run first — reports what it WOULD do, writes nothing:
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
node tools/migrate-media-to-storage.mjs

# Apply:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
node tools/migrate-media-to-storage.mjs --commit
```
The service-role key is required (reads every row, writes past RLS). **Never
commit it.** The script is idempotent — already-migrated rows (https URLs) are
skipped, so it's safe to re-run if interrupted.

---

## Notes
- Filenames are stamped per save (`user-media/<user>/pfp-<stamp>.webp`), so each
  new image gets an immutable URL — perfect CDN caching, no stale-image issues.
- Old Storage files are not auto-deleted (storage is cheap; egress is the cost).
  A future cleanup pass can prune orphaned `user-media/<user>/*` if desired.
- The transparency guard still runs **before** upload, so a blank image is
  never offloaded.
- This does not change the `banner`-excluded-from-`_USER_LIST_COLS` rule — keep
  large media out of bulk column sets regardless.
