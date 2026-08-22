# Fortized — the full rework plan

One document. Every surface in the app, rebuilt from scratch, in an order where
each phase stands on the one before it. Written so it can be handed to somebody
else and picked up cold.

---

## 0. The rules that apply to every single phase

These are not preferences. A phase that breaks one of these is not done.

**Design source.** The six pages already redesigned are the reference:
**Friends · Radiance · Fortshop · Quests · Discover · Staff console.** Nothing
new gets invented. If a thing exists there, it is reused verbatim: `.fs-btn`
(3D buttons), `.disc-subnav` (page topbars), `.qst-group` (section heads),
`.fs-tb-panel` / `.notif-panel-v2` (panels), `.ftz-select`, `.settings-input`,
`.ftz-confirm-card.ftz-ac-card` (small cards), `.modal.settings-modal` (big
cards), `_ftzNotFound` (empty states).

**Shape, from Guilded. Details, from Discord where we have an equivalent.**
Guilded decides the information architecture — what is a page, what is a
channel, what lives in a sidebar. Discord decides interaction detail where we
already have the equivalent concept. Neither gets copied wholesale, and we do
not invent a third thing.

**Icons.** Filled FontAwesome **solid SVG paths, inlined** through `_faIcon`.
Never an FA CSS class (the CDN can fail and the icon is load-bearing). Never an
OS emoji as an icon. The user-supplied SVGs/PNGs (Onyx, Radiance, Bounties,
Emoji, GIF, security shield, brand marks) stay, rendered as `currentColor`
masks — they are part of the icon set, not an exception to it.

**Controls are ours.** Checkmarks are `.ftz-chk` (the circular Gift Radiance
one). Numbers are `_stfStep`. Colours are `_ftzColorPop`. Dropdowns are
`.ftz-select`. Dates are `_stfCal`. A native control appearing in new markup is
a bug.

**Close buttons.** Big card → `.settings-close`. Small card → `.ftz-close-btn
.ftz-ac-x`.

**No glows.** A coloured blur halo is banned everywhere. Neutral black drop
shadows are fine.

**Type.** Syne (`--font-display`) for titles, labels, buttons, names. Weight
≤700. Body font for prose. No em dashes in user-facing copy — use `·`.

**Egress.** We are over the Supabase quota. No new whole-table reads. Never add
media (pfp/banner data URLs) to a bulk column set. `getUsers()` scans the entire
users table — any new caller is a red flag. Prefer `getUsersByNames(names, cols)`
and the existing caches.

**Honesty in copy.** Passwords are still plaintext and RLS is still off for
`users`. Until both are fixed, **no UI text may call anything private, secure or
safe** — not a channel, not a permission, not a trade.

---

## Definition of Done — the same six questions for every phase

The recurring complaint is "empty shells". This is the fix: a phase is not
finished until all six answer yes.

1. **It saves.** Every control writes to the real store, through the existing
   write boundary, and the write is checked for failure.
2. **It loads.** A fresh reload shows exactly what was saved. No state that only
   exists in memory.
3. **It propagates.** Other people see it — socket emit + the existing realtime
   path — and a second device agrees.
4. **It has all four states.** Loading (skeleton, not a spinner in a void),
   empty (`_ftzNotFound` with a real reason), error (says what failed), and
   no-permission (the control is absent or disabled with a reason, and the guard
   also runs at the mutation, not only where the button is drawn).
5. **It is wired outward.** Everything else that should react, reacts: sidebar,
   member list, chat header, audit log, notifications, search, Discover.
6. **It is reachable.** There is a route to it from the normal UI, and a route
   back. Nothing is only openable from the console.

Plus, per phase: `node --check` clean, 42 relationship tests pass, styles.css
reparses to the expected rule count, a plainview screenshot, and a live-verify
list for the things the sandbox cannot see.

---

## Phase 0 — The design system, made real (do this first)

The reason every round comes back as "the design doesn't match" is that there is
no component kit; there are 20,700 lines of CSS and a habit of writing new
classes. This phase makes the kit an actual object with a name.

- **`docs/design-system.md`** — one page listing every component with its class,
  its variants, and a screenshot. If it is not in there, it does not exist.
- **A live kitchen-sink page** (`/app/__kit`, dev only) rendering every
  component in every state. This is what a new surface is checked against.
- **Token audit.** Every hardcoded `rgba(255,255,255,…)`, `#fff`, `#13161d` in
  the surfaces we are about to rebuild becomes a token, so appearances actually
  recolour them.
- **The icon registry.** `_FA_ICON_PATHS` becomes the single source. Sweep the
  app for OS emoji used as icons and replace each with a real glyph. Ship a
  `tools/check-icons.mjs` that fails on an emoji in markup or an unknown icon
  name (`_faIcon` currently returns empty string silently — that stays, but the
  checker catches it).
- **Kill the competing families.** `.sc-*` (dead staff console), `.fs2-*`,
  `.pk-*`, and the ad-hoc inline-style blocks get deleted, not left inert.

**Done when** a new surface can be built by only naming existing classes, and
the checker passes with zero emoji-as-icon and zero unknown glyphs.

---

## Phase 1 — One chat system (DMs = group chats = bastion channels)

Today there are three send paths, three render paths and three sets of quirks:
`sendDM` (9869), `sendGCMessage` (10643), `handleChatSend` (47537), all landing
in `renderMessages` (13160) / `appendMessage` (14216) with different context
objects. That divergence is why the bastion chatbar is not the DM chatbar.

**1a. One transport.** A `Conversation` object with `{kind:'dm'|'gc'|'channel',
id, canSend, canAttach, slowMode, members}`. Every send goes through
`sendMessage(conversation, draft)`. The three existing entry points become thin
wrappers that build a `Conversation` and call it.

**1b. One renderer.** `renderMessages` / `appendMessage` take the conversation,
not a context string. Everything conditional on kind (member list presence,
role colours, permission to delete) reads off `conversation`.

**1c. One composer.** One chatbar component: attachments tray, emoji, GIF,
sticker, bot commands, reply bar, edit box, slow-mode countdown, typing
indicator, permission-disabled state. The bastion, DM and GC chatbars stop being
three lookalikes.

**1d. One message row.** Header, grouped continuation, reply reference, media
grid, embeds, reactions, sending/failed states, edited marker, system messages.

**1e. Mentions, rebuilt** (the user has called this out separately). `@user`,
`@role`, `@here`, `#channel`, with an autocomplete that reads the conversation
(bastion members and roles in a channel; participants in a GC), keyboard
navigation, and a rendered pill that resolves to a real profile. Notifications
and the inbox mention count come off the same resolver.

**Done when** the exact same chatbar and the exact same message row appear in a
DM, a group chat and a bastion channel, and a change to either shows up in all
three at once.

**Risk:** this is the hottest code in the app. Do it behind a flag, surface by
surface, DM last.

---

## Phase 2 — The four picker cards: GIFs · Stickers · Emojis · Bot commands

All four already share `_pickerTopTabs` (27194) and diverge after that.
`buildEmojiPicker` (27235), `openStickerPicker` (46920), `openBotCommandPanel`
(47111) — the bot panel is the least designed of the three.

- One shell: search, left rail of sources, sectioned scroll body, hover footer
  naming what you are looking at and where it came from.
- Emoji: our packs, bastion emojis, recents, skin tones, `:name:` typing.
- Stickers: per-bastion sections. **Stickers have no `:` and cannot be typed in
  chat** — the UI must not imply otherwise.
- GIFs: masonry, categories, Collection tab, one collect control.
- Bots: real command list per bot, arguments, a run affordance, and the
  per-channel/per-role disable that `ch.botsDisabled` is currently a stub for.
- Cross-bastion emoji visibility (the open `[FTZEMOJI:name|bastionId]` token
  work) lands here.

---

## Phase 3 — Profile surfaces

One renderer, five mounts: the profile card modal, the mini popover, your own
popover, the DM right sidebar, and every inline preview.
Anchors: `viewUserProfile` (31017), `_fppRenderFullPanel` (62631),
`showMiniProfilePreview` (62759), `_enrichDMHeader` (9191).

- One `renderProfile(user, {variant})`. The variants differ in size and which
  cards are shown, never in markup.
- Fix the standing bug: **the DM right sidebar loads the wrong person.**
- Fix the standing regression: **display-name effect + colour must only appear
  on hover** in chat, member lists and the DM sidebar; the font always applies.
  Three code paths currently paint the effect inline at rest.
- Nameplates, decorations, badges, widgets, games card, wishlist, mutuals — each
  one either works everywhere the profile is drawn, or is removed.
- Badges get their own rework (existing backlog item).

---

## Phase 4 — Bastion layout

The frame everything else sits in. `renderBastionSidebar` (11406),
`selectChannel` (11766).

- **Topbar** on the `.disc-subnav` shape, like every other page.
- **Sidebar**: banner, name with badges (verified · community · boost tier), the
  integrated pages row, then categories and channels. Drag to reorder channels
  and categories. Create and edit a channel **from the sidebar**, never from
  settings. Unread and mention states. Collapsed categories persist.
- **Channel header**: name, description, member count, pinned, search, notify
  settings, and the per-channel controls.
- **Right rail**: the member list (phase 5), collapsible, remembered.
- One route per channel so a refresh lands back where you were.

---

## Phase 5 — The member list, Guilded-shaped

`renderMemberList` (15668) is virtualised on fixed row heights — keep that, it
is the reason it scrolls well.

- Grouped by hoisted role, in role order, then Online, then Offline.
- Row: avatar with decoration and status, display name in the member's own
  font (effect on hover only), role icon, tags, the new-member badge, the
  playing/activity subline.
- Right-click menu that actually acts: roles, timeout, kick, ban, message,
  profile, mention, and the rank guard at the mutation.
- Search, and a real count that does not lie.
- Fix the identity confusion (existing backlog item): display name vs username
  vs nickname, resolved once, used everywhere.

---

## Phase 6 — Bastion settings

The shell exists; the tabs need to be complete rather than present.

Overview · Channels · Roles · Members · Invites · Emojis · Stickers · Boosts ·
Community · AutoMod · Welcome · Audit log · Integrations · Templates · Danger.

- Roles finished to Guilded parity: permissions by category with search, the
  three-state override read, member assignment, drag priority, icon (an emoji
  here, not an "emote"), colour and gradient through our picker, and the
  `@everyone` role in the same editor.
- Members tab and the members **card** are the same component in two mounts.
- Invites: list, uses, expiry, revoke, and the custom vanity link — **Tier 3
  boost perk, open-entry and Community bastions only**.
- Emojis and Stickers as two separate, complete pages, with the upload card the
  user specified. It is **Edit**, not Rename.
- Applications: real questions, real review queue, accept/reject with a reason,
  and a notification to the applicant.
- Audit log: every mutation in the bastion writes one, avatars and data load.

---

## Phase 7 — Bastion creation, and Get Started for a new bastion

- Creation (`createBastion`, 20600) rebuilt: name, emblem, banner, template,
  privacy, category and tags, first channels. It writes one complete bastion,
  not a stub to be fixed later in settings.
- **Get Started for a bastion** — the second onboarding flow. Reuse the `.gs-*`
  guide verbatim; only the frames change. It runs once you are *inside* a
  bastion you just made, not during creation: name it, set the emblem, make a
  channel, set a welcome, invite someone.

---

## Phase 8 — The integrated pages

Toggleable per bastion, not channels: **Overview · Browse channels · Members ·
Boosts · Events (with scheduling and a calendar) · Lists (a collaborative
board) · Rules (Community only) · Docs (Community only).**

Each one is a real page inside the bastion, reachable from the sidebar, with
the six Definition-of-Done answers. Events already read and write
(`events/<bastionId>`, RSVPs included) — that is the level the rest need to
reach.

---

## Phase 9 — Channel types

**Text · Voice · Rules · Announcement · Stage · Forum · Gallery**, plus
categories.

- Creating Rules creates a real draggable channel, one per bastion maximum.
- Each type gets its own header, its own composer affordances and its own empty
  state. A type that only changes the glyph is not a type.

---

## Phase 10 — Community Bastion, badges, boosts

- Community mode: accept ToS + ToU, pass a Lifecheck. Toggleable off only every
  30 days with a warning, and back on 3 days later.
- Badges: verified, community, boosted — drawn wherever a bastion is drawn.
- Boosts: **Tier 1 / 2 / 3 at 2 / 4 / 6 boosts**. No boosts from Radiance;
  **200 Onyx per boost per month**. Landscape cards. Every perk actually
  unlocks something.

---

## Phase 11 — Settings

`_SETTINGS_TAB_META` (28214) feeds the header strip and the `ICN` map feeds the
nav row — **both** must change when an icon changes. Every tab audited for dead
switches, and the appearance page finished.

---

## Phase 12 — Creator Hub

Currently one branch (`tab === 'creator'`, 55008). Rebuilt as a real section:
ads, payouts, analytics, bots, templates — with honest numbers or nothing.

---

## Phase 13 — Games cards and activity

`_fppGamesCardHTML` (62309). The controller mark is done; the surface is not.
Games on the profile, "playing" in the member list and the DM sidebar, and the
retired activity system reworked alongside the desktop app.

---

## Phase 14 — Everything else, and the cleanup

- Inbox and in-app notifications.
- Emoji reactions on messages.
- Status and custom status.
- Media players and embeds.
- The crop system — once, shared by avatars, banners, emblems, emojis.
- Bastion Moments, and making them reportable.
- The remaining native `<select>` elements converted to `.ftz-select` (33 of
  them; the field is already skinned, the open list is still the OS's).
- Delete every dead namespace and unreferenced function found on the way.

---

## Order, and why

```
0  design system + icons        ← everything depends on it
1  chat system                  ← the biggest shared surface
2  picker cards                 ← attached to the chat composer
3  profile surfaces             ← used by chat and the member list
4  bastion layout
5  member list
6  bastion settings
7  bastion creation + guide
8  integrated pages
9  channel types
10 community · badges · boosts
11 settings
12 creator hub
13 games cards
14 the rest + cleanup
```

Phases 4-10 are the bastion. They are late on purpose: a bastion is chat plus
profiles plus the component kit, and rebuilding it before those three are solid
is what produced the last few rounds.

---

## Carried over — the standing to-do list

These fold into the phases above rather than being separate work:

- **Blocking, user-side:** hash passwords and move the comparison server-side;
  turn on RLS for `users`; rotate the compromised Lifecheck secret; run the
  domain-normalisation migration; run the `ftz_onyx_send` SQL.
- Bastion identity confusion (→ phase 3/5) · one chat system (→ 1) · Guilded
  member list (→ 5) · channel types (→ 9) · integrated pages (→ 8) · Community
  bastion (→ 10) · bastion creation (→ 7) · Get Started for a bastion (→ 7).
- Profile badges (→ 3) · nameplates everywhere (→ 3) · profile surfaces (→ 3).
- Inbox and notifications · reactions · status · media players · crop system ·
  Bastion Moments and reporting (→ 14).
- Settings polish (→ 11) · creator hub (→ 12) · games cards (→ 13).
- Activities on Discover — **ask what it should be before building.**
- A home for `PlayComputer.png`.
- Staff console: real mod history and a shared watchlist.
- Get Started reworked into a real guided tutorial.
- Fortized treasury: platform accounts share one balance.
- Elder Futhark as the realm's language · more content-slide transitions ·
  branding line change · web pages (support dropdown, login and signup rebuild,
  login QR) · the Fable-5-later items.

---

## How each phase is delivered

1. A short written plan for that phase, agreed before code.
2. Built in one pass, on the kit, to the six Definition-of-Done answers.
3. Screenshot from a plainview running the real functions.
4. `node --check` + 42 tests + the CSS rule count.
5. A live-verify list of what the sandbox cannot see.
6. Pushed to the branch and mirrored to `main`, cache-bust bumped.

No phase starts before the previous one answers all six questions.
