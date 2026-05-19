# Fortized — Pending Work

Carried forward from the "redesign profile previews + fix bugs" sessions.
Items here were explicitly deferred — they are not blocked, just not done yet.

## Profile previews redesign — VISUAL UNIFICATION DONE

Landed a single retrofit block at the bottom of `app/styles.css` that
gives every profile-preview surface the `.pw-widget` GamesCard
treatment — theme-aware `var(--panel)` base + corner accent wash +
single thin glowing top rule + matching section-title typography +
ghost-accent action buttons. Profile Card (rank 1) gets the strongest
treatment; Mini / DM / Own / Settings get a dialed-back version
closer to Discord proportions.

| Rank | Variant                          | Rendering site                     | Status |
|------|----------------------------------|------------------------------------|--------|
| 1    | Profile Card (full modal)        | `_viewUserProfile()` ~`app/app.js:18758` | retrofit applied |
| 2    | Userbar own-profile panel        | delegates to mini, fallback ~`:40339`     | retrofit applied |
| 2    | Chat/memberlist mini preview     | `showMiniProfilePreview()` ~`:40456`      | retrofit applied |
| 2    | DM sidebar panel                 | `showDMUserPanel()` ~`:29467`             | retrofit applied + Games strip added |
| 3    | Settings profile preview         | `buildProfileView('myprofile')` ~`:17209` | retrofit applied |

### Remaining nice-to-haves (deferred)

- The userbar own-profile panel currently delegates to the mini
  popover. Status switching is reachable via the popover's "Status"
  button (opens `openStatusPicker`), not inline. If you want
  Discord-style inline status radios in the userbar popover, that
  needs new HTML in `showMiniProfilePreview` gated on
  `_isUserbarAnchor`.
- Settings preview "Switch Accounts" CTA isn't surfaced anywhere
  outside the legacy own-profile-panel fallback. If you want it
  on the userbar popover too, add to the `isOwn` actions row in
  `showMiniProfilePreview`.
- Full visual rewrite of the inline-styled banner/avatar/status-row
  structure (vs. the current CSS retrofit) would clean up the JS
  but isn't necessary to match the spec.

## Status-system — partial fix landed, monitor for repros

Done: `_broadcast()` now guards against `FortizedSocial` being undefined
and against `socketEmit` throwing synchronously — the previous code
would let one bad emit abort the whole `set()` call, leaving the user's
new status unsaved. Local dot is also force-refreshed without waiting
on the server.

Still open if symptoms persist:
- distinguish "status" (presence) from "custom status" — possible rename
- auto-away restore at `_resetIdle()` (`app/app.js:497`) may fight with
  manual changes during the same animation frame
- Firebase `onDisconnect` setup at `:572` — wrapped in try/catch but
  may need a retry on auth-change

## Loading "stuck on loading Fortized" — DONE for now

Done across the three passes:
- Data-loss guard on init now runs for all users (was super-admin only).
- Safety timer raised 10s → 20s so the loader doesn't fade
  mid-init.
- Inner retry chain collapsed into a single bounded loop
  (`FETCH_ATTEMPTS=2`, `FETCH_TIMEOUT_MS=6000`, `FETCH_BACKOFF_MS=1200`).
  Worst case ~14s, well within the 20s safety window. Cache
  fallback runs once after all attempts fail instead of being
  duplicated in two `catch` blocks.

Still open only if symptoms persist:
- `FortizedSocial`-undefined branch sets a label but never returns,
  then falls through into the online path that re-checks it. Works
  today but fragile.
- Need a console log dump from a real stuck session to know which
  phase (if any) still hangs.

## Tooltips — DONE

All three tooltip variants (`ftz-tooltip`, `rail-tooltip`,
`rail-nav-tooltip`, `ftz-reaction-tip`) now share:
- `#05060a` background, 1px subtle border, 4px radius, tight shadow
- CSS arrow via `::after` pointing at the source element
- `data-place="top|bottom|left|right"` + `--arrow-x` for re-aligning
  after viewport clamping.

## Hearken card — DONE (v3)

Rebuilt on the `.pw-widget` treatment, now theme-aware. Per-version
notes:
- v2: dropped the shimmer animation, centered halo, and oversized
  display title; cut width to 360px and matched buttons to
  `.pw-gc-add-btn`.
- v3: bumped to 460px, 20px radius, surface uses
  `var(--panel)` under a translucent black film and the corner
  accent wash so the user's chosen appearance bleeds through
  (same trick the gamescards use). Title is "Hearken, Hearken!",
  "Daily Quest" label dropped to weight 600.
