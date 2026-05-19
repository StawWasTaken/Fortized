# Fortized — Pending Work

Carried forward from the "redesign profile previews + fix bugs" session.
Items here were explicitly deferred — they are not blocked, just not done yet.

## Profile previews redesign (the big visual pass)

Goal: unify all four variants on the GamesCard design language, with a
consistent information hierarchy. Higher number = less info shown.

| Rank | Variant                          | File                          |
|------|----------------------------------|-------------------------------|
| 1    | Profile Card (full modal)        | `profile-card.html`, rendered in `app/app.js` |
| 2    | Userbar own-profile panel        | `own-profile-panel.html`, rendered ~`app/app.js:40313` |
| 2    | Chat/memberlist mini preview     | `profile-preview.html` (`.mini-profile-preview`) |
| 2    | DM sidebar panel                 | `dm-profile-panel.html` |
| 3    | Settings profile preview         | `app/app.js:17150` (variant of mini) |

Required info on every variant (the "main infos"):
- banner, pfp + status dot, display name, @username, pronouns, custom status

Tier-2 variants add: badges, "about me" snippet, member since, game collection.
Tier-1 (Profile Card) adds: full bio, roles, activity tab, mutual friends tab,
full game collection grid, action buttons.

Visual direction: match the `.pw-widget` GamesCard look — radial gradient
surface + glowing accent top bar — but lean a bit closer to Discord's
proportions for the smaller previews. Reference screenshots: see the
session attachments (Discord profile modal — inspiration only, not the
custom-themed version).

Also wire up: status switcher (online/idle/dnd/invisible), "Edit Custom
Status", "Edit Profile", "Switch Accounts" — only on the userbar own-profile
panel.

## Status-system fixes

`FtzStatus` module looks structurally sound (`app/app.js:296+`), so I
didn't make speculative changes. Need a concrete repro for each symptom
before fixing:
- which status (online/idle/dnd/invisible) misbehaves and how
- whether it's the local display, the broadcast to other clients, or
  the persistence across reload
- distinction between "status" (presence) and "custom status" (free-text
  message) — possible rename pending per user

Once we have a repro, likely suspects are:
- `_broadcast()` (`app/app.js:435`) silently swallows socket failures
- auto-away restore at `_resetIdle()` (`:497`) — could fight with
  manual changes during the same animation frame
- Firebase `onDisconnect` setup at `:572` — wrapped in try/catch but
  may need a retry on auth-change

## Loading "stuck on loading Fortized"

Fixed the most likely root cause (data-loss guard was super-admin only).
Remaining suspects if it still happens:
- `appInit` 10s safety timer (`app/app.js:9785`) can race past the
  inner 7s + 1.5s + 5s retry chain → loader hides while init is still
  running. Could collapse to a single bounded loop.
- `FortizedSocial`-undefined branch sets a label but never returns,
  then falls through into the online path that re-checks it. Fine
  today but fragile.
- Need a console log dump from a real stuck session to know which
  phase actually hangs.

## Tooltip — possible follow-ups

Done in this pass: darker, less rounded, arrow pointing at element.
Not done:
- `.rail-tooltip` and `.rail-nav-tooltip` still use the old rounder
  glass style. Decide whether they should match `.ftz-tooltip` or
  intentionally stay distinct (rail tooltips have icons + hint keys,
  which is a different content shape).
- Reaction tooltip (`.ftz-reaction-tip`) likewise.
