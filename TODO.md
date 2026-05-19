# Fortized — Pending Work

Carried forward from the "redesign profile previews + fix bugs" sessions.
Items here were explicitly deferred — they are not blocked, just not done yet.

## Profile previews redesign (the big visual pass) — NOT STARTED

Goal: unify all four variants on the GamesCard design language, with a
consistent information hierarchy. Higher number = less info shown.

| Rank | Variant                          | File                          |
|------|----------------------------------|-------------------------------|
| 1    | Profile Card (full modal)        | `profile-card.html`, rendered in `app/app.js` |
| 2    | Userbar own-profile panel        | `own-profile-panel.html`, rendered ~`app/app.js:40320` |
| 2    | Chat/memberlist mini preview     | `profile-preview.html` (`.mini-profile-preview`) |
| 2    | DM sidebar panel                 | `dm-profile-panel.html` |
| 3    | Settings profile preview         | `app/app.js:17150` (variant of mini) |

Required info on every variant (the "main infos"):
- banner, pfp + status dot, display name, @username, pronouns, custom status

Tier-2 variants add: badges, "about me" snippet, member since, game collection.
Tier-1 (Profile Card) adds: full bio, roles, activity tab, mutual friends tab,
full game collection grid, action buttons.

Visual direction: match the `.pw-widget` GamesCard look — subtle dark
surface, top-left accent wash, single thin glowing rule on top, no
shimmer — but lean a bit closer to Discord's proportions for the
smaller previews. Reference screenshots: see the session attachments
(Discord profile modal — inspiration only, not the custom-themed
version).

Also wire up: status switcher (online/idle/dnd/invisible), "Edit Custom
Status", "Edit Profile", "Switch Accounts" — only on the userbar own-profile
panel.

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
