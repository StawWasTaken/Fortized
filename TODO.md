# Fortized — Pending Work

Carried forward from the "redesign profile previews + fix bugs" sessions.
Items here were explicitly deferred — they are not blocked, just not done yet.

## Profile previews redesign — FULL REWRITE DONE

Component library: `.fpp-*` ("Fortized Profile Preview"). Single
source of truth at the bottom of `app/styles.css`. No `!important`
hacks, no inline-styled per-variant overrides — all five surfaces
are composed from the same primitives.

| Rank | Variant                       | Class            | Width   | Rendering site                                |
|------|-------------------------------|------------------|---------|-----------------------------------------------|
| 1    | Profile Card (full modal)     | `.fpp-card-modal`| 900px   | `_viewUserProfile()` ~`app/app.js:18758`      |
| 2    | Userbar own-profile popover   | `.fpp.fpp--own`  | 340px   | `_renderOwnProfilePopover()`                  |
| 2    | Chat/memberlist mini popover  | `.fpp.fpp--mini` | 340px   | `showMiniProfilePreview()`                    |
| 2    | DM sidebar panel              | `.fpp.fpp--dm`   | full    | `showDMUserPanel()` ~`:29467`                 |
| 3    | Settings preview stack        | 3 stacked cards  | 380px   | `buildProfileView('myprofile')` ~`:17209`     |

### What landed

- **Shared primitives**: `.fpp__banner`, `.fpp__av-row`, `.fpp__av`,
  `.fpp__cs-bubble` (Discord-style chat bubble overlapping the
  avatar), `.fpp__identity`, `.fpp-card` (boxed sub-card for Bio /
  Member Since / Games), `.fpp-row` (interactive chevron row),
  `.fpp__games-strip`, `.fpp__actions` (`[Message wide] [+ square]
  [⋯ square]`), `.fpp-menu` (dropdown for ⋯), `.fpp__msg-input`
  (pinned-bottom composer).
- **Theme-aware surface**: every variant uses `var(--panel)` under a
  translucent black film + corner accent wash, so the user's chosen
  Appearance bleeds through automatically.
- **Single glowing top rule** via `::before` on every surface, matching
  the gamescards.
- **Discord-style action row**: `[Message]` (flex 1) + `[+ / ✓ / ⏳]`
  square friend-state button + `[⋯]` square that opens a dropdown
  menu containing Invite to Bastion ▶ (with nested sub-menu of the
  user's bastions), Ignore, Block, Report.
- **Userbar own-profile popover**: status row + chevron that opens
  a nested submenu (NOT 4 inline radios). Switch-accounts row with
  the same pattern, showing all saved accounts + Add account + Log
  out. Inline bio, game-collection strip, Edit Profile primary CTA.
- **Settings preview replaced** with the Discord triple-preview:
  (1) profile preview — banner + pfp + cs bubble + identity +
  "Example Button" only, no bio/badges/games. (2) Message preview —
  chat bubble using the user's display style. (3) Nameplate preview
  — 32px row.
- **DM sidebar panel** uses Bio / Member Since / Games / Mutual
  Friends as boxed cards + a pinned-bottom Message input.
- **Profile Card modal** is 900px 2-panel: left = banner + pfp + cs
  bubble + identity + inline bio + member since + roles +
  connections + note + actions; right = Board (widgets + Games I
  Like 4-col grid) / Activity / Wishlist / Mutual Friends tabs.

### Helpers added
- `_fppFormatDate`, `_fppBannerHTML`, `_fppAvatarHTML`,
  `_fppCSBubbleHTML`, `_fppIdentityHTML`, `_fppBioCardHTML`,
  `_fppMemberSinceCardHTML`, `_fppGamesCardHTML`, `_fppActionRowHTML`
- `_fppClose`, `_fppShowMoreMenu`, `_fppShowInviteSub`,
  `_fppShowStatusSubmenu`, `_fppShowAccountsSubmenu`,
  `_fppPositionPopover`, `_fppSwitchTab`

### What was deleted
- All `.mpp-*`, `.up-left-*`, `.up-right-*`, `.up-card`, `.dm-up-*`,
  `.own-profile-panel`, `.settings-profile-preview` rendering HTML.
  Their CSS stays in `styles.css` for now (dead code; safe to garbage-
  collect in a future pass).
- The legacy 4-radio own-profile panel + `_closeOwnProfileOutside` +
  `_ownProfileOpen` state tracking.

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
