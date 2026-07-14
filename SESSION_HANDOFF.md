# SESSION HANDOFF — Fortized (Opus 4.8 session)

## Standing directives (carry over)
- Every commit: mirror to `main` (`git branch -f main HEAD && git push origin main`) **and** the session branch.
- Bump the cache-bust token on every push: `?v=2026fixNNN` in `app/index.html` **and** `SW_VERSION` in `sw.js`. **Currently at `2026fix260`.**
- Verify end-to-end before claiming done. Never destroy hand-tuned components (`.fpp__cs-bubble`). Ship exactly what's asked.
- The app is **Supabase-only now** — but the code still makes hundreds of `firebase.database()` calls routed through `firebase-compat-shim.js` → Supabase. **This shim is the root of the "data loading sucks / forgets stuff / slow" problems AND several read/write-location bugs** (e.g. GC reactions read `data.reactions` but code wrote the `reactions` column). Migrating off the shim to native Supabase is the highest-leverage remaining work.
- Sandbox CANNOT reach Supabase (egress allowlist). Data-layer testing uses `tests/test-relationship.js` (mock harness). Node `--check` + the harness before every commit.

## ⚠️ THE AVATAR BUG — still open, now instrumented
User is very frustrated (many attempts). **Key clue: BANNERS WORK, AVATARS DON'T** → it's avatar-specific code, not the shared save path.

Fixes shipped this session that were REAL but didn't fully resolve it:
- `f00a31e` refreshCU empty-rescue now runs for everyone (was super-admin only) + 90s recent-edit guard.
- `a1d6452` **THE big console-confirmed one**: global img-error handler redirected every failed avatar to `/default pfp2.png` which is **404** (only `default avatar.png` exists) → transparent; and `buildAvatarHTML` onerror crashed on `this.parentElement.insertBefore` (null parent). Both fixed.
- `ef02737` **Neutered `_healBlankAvatar`** — it was the ONLY avatar-specific DESTRUCTIVE path (cleared CU.pfp + wrote DB when it judged blank; re-encoded "oversized" PNGs and overwrote). No banner equivalent → perfect fit for "banner works, avatar doesn't". Now **diagnostic-only**, never touches DB.

**NEXT STEP: get the `[AVATAR-DIAG]` console lines from the user.** After deploying `2026fix260`, have them: (1) upload+save an avatar, (2) reload. Console will show:
- `[AVATAR-DIAG] saving — CU.pfp string len=… head=data:image/webp…` (at save)
- `[saveUserObject] ✓ wrote [pfp, …]` (DB write confirmed) OR `UPDATE FAILED`
- `[AVATAR-DIAG] boot pfp: string len=… head=…` (what the DB returned on reload)
These three lines pinpoint whether it's SAVE (pfp empty at save / write failed) or PERSIST (wrote but boot reads empty → DB/replica/trigger) or RENDER. Do NOT ship another blind avatar fix without these.

Hypotheses still standing if diag shows pfp IS saved+returned but still transparent: (a) webp export failing on their browser → PNG path; (b) the `ftz_reject_blank_pfp` DB trigger from `supabase-hardening.sql` reverting a small PNG (`NEW.pfp := OLD.pfp`); (c) pfpCrop stale from an old GIF applying a CSS crop to a static image. Once diag isolates the stage, remove the diag logs.

## Other console-confirmed issues (from user's logs)
- **`getUserByName: canceling statement due to statement timeout` (×7)** — Supabase server-side timeouts pulling large rows (megabyte pfp/banner) under plan overage. Mitigations shipped: webp crop exports (`applyCrop`), boot `_shrinkLegacyBanner`, column-scoped relationship fetches, `getUserByName`/`login` retry-on-error. Real cure = shim migration + shrinking the big rows. Can't fix DB from sandbox.
- `global_bastions?select=voice_channels [400]` — self-disables after 1 hit (`_voiceSchemaBroken`). Benign.
- `127.0.0.1/ping` CORS + `__cf_bm` cookie — benign (desktop probe + Cloudflare).
- DMs `dms.created_at does not exist` — FIXED (`a1d6452`), removed phantom column that made every DM query error → empty.

## Shipped this session (all on main)
Friends convergence engine + real-time (both users see friendship); FA icons across friends; inbox rework → renamed **Inbox**, day-grouping, his fa-inbox icon, smart badge (white dot = unread, white 1-9+ = mentions **+ friend requests**); bastion/GC **mention notifications**; per-room topbar actions (voice/video/pinned/add-to-DM on DM/GC headers, pinned+memberlist toggle on channels — video/GC calls are honest stubs pending LiveKit); Manage Accounts card + rebuilt Add-Account card **with passkey 2FA**; Member/Friends-Since icons (Fortized logo masked + fa-user-group + bastion emblem dot); unified tooltips (rotated-square arrow = one element); **custom-status + status-duration rebuild** (chips 30m/1h/8h/24h/3d/Forever/Custom + sync toggle, timed idle/dnd/invisible, invisible hides CS); report cards 3D+FA; **DM+GC reactions fixed** (write-location matched read); onyx-yellow bug + soft onyx/streak tooltips + protected-streak badge; 3 exact FA icon swaps (send/trash/clock); global **autofill suppression** on all credential fields (+ login/signup pages); **login resilience** (retry transient Supabase errors); **block chatbar lock** with Unblock button.

## TODO — user's queue, in order
1. **Avatar** — get `[AVATAR-DIAG]` output, isolate the stage, fix, remove diags. #1 priority, user is furious.
2. **Custom status re-rework AGAIN** (user wants clear-after as a **dropdown** to save space, sync toggle **inside that dropdown**; clear-after appears **only on hover of the status you want**; same hover pattern for the status chooser; keep it practical; show current sync state on both the status and CS-clear-after dropdowns).
3. **Add-friend card redesign**: move Joyster mascot to top-right like Discord's Wumpus (screenshots given); redesign the user preview to fill the big empty space; (send icon already swapped to the FA v7 paper-plane).
4. **Staff console fix** (harmonize with `.ftz-card--big`; user reports it's broken — investigate).
5. **Limited profiles for non-friends** (task #14, still pending): Discord-style — can't see full profile of a non-friend you reached via shared server/GC; banner on top "couldn't load all parts of profile". Ignore = blurred profile, click to unblur. Block = unfriend + block + the block features. Keep old DM history readable after unfriend.
6. **Data-layer migration** off the firebase-compat shim → native Supabase (the root of slowness/forgetfulness). Big, careful, needs live testing.
7. Backlog: react-system rework; bastion revamp (Guilded-style events/levels/boosts/channel icons/calmer sidebar); bastion+GC memberlist sidebars (real nameplates); DM sidebar redesign; navigation redesign (too many pages); page-by-page review; LiveKit voice/video (user will give instructions).

## The goal (unchanged)
Discord reliability, Guilded's calm density, the web pages' 3D/yellow design language. Data trust first, then presentation, one verified slice at a time.
