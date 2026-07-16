# Fortized — working notes for Claude

## ⚠️ #1 STANDING RULE: SUPABASE EGRESS

**We are over the Supabase egress quota (5 GB) — recently 635% (~31.7 GB).**
Egress overage throttles the project and causes intermittent read/write
failures (boot-after-login failures, and very likely the avatar-save
regression). **Every change must be egress-aware. Never make it worse.**

Rules:
- **Never put large media (pfp/banner data-URLs, images, base64 blobs) into
  bulk column sets or whole-table scans.** `banner` is the heaviest column and
  must stay OUT of `_USER_LIST_COLS` / any `getUsers`/`getUsersByNames` read —
  it belongs only to the on-demand full-profile fetch (`getUserByName(name,
  {noCache:true})`, cols `*`).
- Prefer the client caches (`_pfpCache`, `_profileCache`, `_fullProfileCache`,
  all localStorage-persisted) over refetching rows.
- Avoid `select('*')` on `users` in hot paths; select only the columns you use.
- `getUsers()` scans the ENTIRE users table — treat any new caller as a red
  flag and give it the leanest columns possible.
- The real long-term fix — moving images out of the DB row into Storage and
  storing only a URL — is now BUILT: `saveUserObject` offloads pfp/banner
  data-URLs to the `attachments` bucket behind a per-browser flag
  (`localStorage.ftz_media_storage='1'`), OFF by default, with automatic
  fallback to the inline data URL. Bulk backfill for existing rows:
  `tools/migrate-media-to-storage.mjs`. Full rollout steps:
  `docs/media-storage.md`. Flip `_mediaStorageEnabled()` to `true` once
  proven on one account, then run the backfill to reclaim egress.

## Standing dev directives (every commit)

- **Mirror to `main` AND push the session branch.** `main` is the deploy
  branch: `git branch -f main HEAD && git push origin main` plus
  `git push -u origin <session-branch>`.
- **Bump the cache-bust every push:** `?v=2026fixNNN` in `app/index.html`
  (9 refs) + `SW_VERSION` in `sw.js`. One-liner:
  `sed -i 's/2026fixNNN/2026fixNNN+1/g' app/index.html sw.js`.
- **Before every commit:** `node --check app/app.js && node --check
  FortizedSocial-supabase.js && node tests/test-relationship.js` (42 tests
  must pass).
- Never destroy hand-tuned components. Verify end-to-end before claiming done.

## UI conventions

- **Icons: ALWAYS use FontAwesome SVG icons.** Inline the FA solid SVG path
  (`<svg viewBox="0 0 ... " fill="currentColor">…</svg>`, sized via CSS with
  `height + width:auto`), not the custom `ftzIcon()` Feather-style set, for new
  UI. FA is loaded app-wide; `fill:currentColor` inherits the surrounding text
  colour.
- Rail/notification count badges are **capsules** (`min-width`+`padding`+
  `border-radius:100px`), not circles, with a `box-shadow` ring in the LIVE
  appearance surface colour (`var(--rail)` / `var(--sidebar)` — the appearance
  system rewrites these) so the badge reads as punched out of the background.

## Environment notes

- Sandbox CANNOT reach Supabase — data-layer testing is the mock harness
  `tests/test-relationship.js`.
- Playwright IS available: module at `/opt/node22/lib/node_modules/playwright`,
  chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. FA icons
  don't load in-sandbox (CDN blocked) but layout + local PNGs render
  accurately. Web root = repo root (`/app/styles.css`, `/JoysterPoint.png`).
- Share prototype "plainviews" (Playwright PNGs via SendUserFile) for UI work.

## Architecture

- Supabase-only, but code still calls `firebase.database()` via
  `firebase-compat-shim.js` → Supabase.
- `saveUserObject` (`FortizedSocial-supabase.js`) is the single DB-write
  boundary: transparency guard + `_EMPTY_GUARDED_COLS` + `_RELATIONSHIP_COLS`
  masking + delta-diff (writes only changed columns). Raw-resident fields
  (pfpCrop, disabled, …) round-trip via the `raw` JSONB column.
- Settings save (`saveAllSettings`, app.js): diffs vs `_settingsOriginal` and
  writes only changed fields; the banner is written in its own isolated UPDATE
  so it can't sink the avatar write.

## Avatar bug (open)

Symptom: set avatar → looks fine → Save → avatar becomes fully transparent;
affects every account; "used to work before"; no obvious console errors.
Ruled out: the transparency guard (proven to pass opaque webp) and the crop
pipeline (alpha-probes and refuses blank exports). Leading theory: the good
write intermittently fails / is dropped under egress throttling, leaving a
stale/transparent value that the client reads back. `2026fix274` added an
on-screen DB-error toast (`window._ftzLastDbError`) so a failed save now shows
the exact columns + payload bytes + message + code — get that on the next
repro. Reducing egress may itself resolve the intermittency.
