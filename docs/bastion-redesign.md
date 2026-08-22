# Bastion — full redesign and rework

**Status: PLAN, awaiting approval. Nothing here is built yet.**
*(Revised after the user's precisions: channels not rooms, Radiance-linked
boosting, eight channel types, Guilded-shaped roles and member lists, and the
bastion pages.)*

The bar is the staff console rebuild: that went from *"a freaking mess"* to
something finished, and it got there by being **assembled out of the app's own
parts** rather than given a new visual language. Same method here.

---

## 1. Vocabulary — settled first, because it leaks everywhere

**Rooms are called channels.** Discord's and Guilded's word, and already what
most of the app says. What is left is the sidebar's five hardcoded headings
("TEXT ROOMS", "PARTY ROOMS", "WALL ROOMS", "ANNOUNCEMENT ROOMS", "POLL ROOMS"),
one settings button reading "+ Party Channel", and the internal names
`showCreateRoomModal` and `.room-topbar`. The headings are deleted outright by
§3.1; the internals get renamed as each is rebuilt, not in a blind sweep.

---

## 2. What is actually there today

Measured, not guessed.

| Surface | Function | Size | Inline `style="` |
|---|---|---:|---:|
| Left sidebar (channels) | `renderBastionSidebar` | 194 lines | 19 |
| Bastion overview | `renderBastionHub` | 97 lines | 27 |
| Create-a-channel card | `showCreateRoomModal` | 119 lines | 38 |
| Settings body (24 tabs) | `renderBSettingsMain` | ~900 lines | **401** |

**401 inline style attributes in the settings body alone.** The exact diagnosis
Discover had: the page is painted by hand, so it cannot answer the appearance
system. Recolour the app and bastion settings stay the same.

### 🐞 The headline bug: categories already exist, and the sidebar ignores them

This is not a missing feature. It is a **disconnected one**.

- `b.categories` is real. `ch.categoryId` is real.
- The **Channels settings tab** (line 20686) fully supports them: create, rename,
  delete, add a channel to one, and it groups the list by category.
- The **Discord importer** maps Discord's category tree onto them correctly
  (line 19400).
- Templates carry them. `_createCategory` / `renameCategory` / `deleteCategory`
  all exist.

And `renderBastionSidebar` — **the only place a member ever sees the channel
list** — throws all of it away and groups by channel *type* instead:

```js
catWrap('text','📝','TEXT ROOMS','text',textHTML);
catWrap('forum',ftzIcon('chat','12'),'WALL ROOMS','forum',forumHTML);
catWrap('voice',ftzIcon('mic','12'),'PARTY ROOMS','voice',voiceHTML);
```

So an owner can build *Plant Hall · Book Club · plant chats* in settings, save
it, and see **absolutely nothing change**. Their structure exists in the
database and is invisible in the app. Two of the five headings are also labelled
with OS emoji (`📝`, `🗳`) rather than icons.

Wiring the sidebar to the data that is already there is the single highest-value
change in this whole document.

### The other real problems

**① No per-channel permissions.** `restricted` exists but only means
*age-restricted*. There is no way to say "this channel is for Moderators" — the
most-asked thing of any role system. Your Discord screenshot has a locked
`#plant-mods`; we cannot draw that lock because we cannot express it.

**② The boost progress bar is a lie.** `renderBastionSidebar` line 10760:

```js
const boostProgress = boostLv > 0 ? Math.floor(Math.random() * 100) : 0;
```

A **random number**, re-rolled on every render. Same family as the invented
"N Online" counts deleted from Discover. It goes — and §3.5 replaces it with the
real Discord-style goal bar from your screenshot.

**③ Roles are a flat list with no ordering, no icons, no gradients.** The tab
renders a list whose only handle on priority is a `#3` you type into a form.
Both references drag to reorder, and in both, **that ordering is the hierarchy**,
so it has to be direct.

**④ Bastion creation is four hidden divs and stops too early.** `display:none`
swapping, no motion, and it ends the moment the bastion exists — no icon, no
members, nothing to do. Your Guilded flow keeps going: personalize → what you
play → invite people → nice work.

**⑤ There is only one boost currency concept.** `b.boostLevel` is a level (0–3)
with no boost *count* behind it, so "10/20 Boosts" cannot be drawn.

### What is genuinely good and must survive

- **`renderMemberList` is virtualised** — a flat render schedule with measured
  row heights and an IntersectionObserver resolving rows by index. Real
  engineering on a list that can run to thousands. **Redesign its looks, do not
  touch its mechanism.**
- Role grouping, online/offline split, live Socket.IO presence.
- `ROLE_TEMPLATES`, the Discord importer, bastion templates.
- Settings has genuine depth: automod, starboard, mood, reputation, insights,
  welcome messages, events, bots. **The features are not the problem.**

---

## 3. The plan, surface by surface

### 3.0 Design rules

1. **Assemble from what exists.** `.fs-btn` · `.ftz-confirm-card.ftz-ac-card` ·
   `.ftz-close-btn.ftz-ac-x` · `.disc-subnav` · `.qst-group` · `.fs-tb-panel` ·
   `.fr-row`/`.fr-act` · `.ftz-select` · `.settings-input` · `.nm-check` ·
   `_ftzNotFound` · `.gs-track`. New `.bst-*` names are **glue only**.
2. **Every colour from a token.** No `rgba()` literals, no `#5865f2`.
3. **No glows. No idle animation.** Arrival only.
4. **Nothing invented.** If we do not measure it, we do not print it.
5. **Weights 500–700.** These surfaces are full of legacy `800`.
6. **Egress-aware.** Categories and permissions ride in the **existing** bastion
   row. No new table, no new per-open read.

---

### 3.1 Channels and the left sidebar — `.bst-rail`

**Wire the sidebar to `b.categories`.** The five type-groups are deleted.
Channels render inside their real category; anything with no `categoryId` sits
in an implicit top group, exactly like both references. A category holds **any
mix of types** — which is the whole point, and what lets a voice channel sit
beside the text channel it belongs with.

- Channel **type becomes a glyph on the row**, not a heading. That is what frees
  a category to be about *topic*.
- **Drag to reorder** — channels inside a category, and categories among
  themselves — reusing `_initBastionDrag`, which already does this for the rail.
- Collapsed state persists per member in localStorage. It is a view preference,
  not shared state, so it must never cost a write.
- A locked channel (§3.3) draws a lock. Voice channels list who is in them
  underneath — we have that data and do not show it.

**Eight channel types**, per your list:

| Type | What it is |
|---|---|
| **Text** | The normal channel. |
| **Announcement** | Post-restricted; everyone else reads. |
| **Blog** | Long-form posts with a title, cover and body — an author surface, not a chat. |
| **Forum** | Threads people open and reply in. |
| **Gallery** | Media-first grid; images and video are the post. |
| **Voice** | Everyone can talk. |
| **Stage** | Voice for a crowd: **speakers on top**, audience below, hands raised to speak, a **priority speaker** who ducks everyone else, and screen/video share. |
| **Rules** | The bastion's rules, with an agree gate before the rest opens. |

Each ships with a real empty state, on the reference's shape: the big type glyph,
**"Welcome to #media!"**, "This is the start of the #media channel.", and an
**Edit Channel** button for anyone who can.

**The header.** Banner hero, emblem, name, one chevron opening the bastion menu.
The `▼` text glyph becomes a real icon; the boost pill stops being a gradient
built in a template string; the random progress bar is replaced by §3.5's goal
bar.

---

### 3.2 The bastion pages

Today a bastion is a channel list and a settings modal. It gets a real page set,
reached from the bastion menu, on the `.disc-subnav` topbar the rest of the app
uses:

- **Overview** — banner, emblem, name, tagline, honest stats, what is happening.
- **Browse channels** — every channel with its description and type, categories
  as sections, joinable/mutable in place. The way you find the channel you have
  never opened.
- **Members** — *a page, not the rail*. Search, filter by role, sort by joined
  or by name, bulk role assignment, join dates, and moderation actions inline.
  This is where you administer people; the rail is where you see who is around.
- **Events** — the existing events system, given a page.
- **Boosting** — §3.5.

---

### 3.3 Roles and permissions — Guilded's editor

**Drag-ordered role list** with "**+ Add another role**" at the top, each role
showing its icon, its name in its own colour, and its member count. The note from
the reference stays because it explains the model: *"Members display the highest
role on this list. Drag the roles to reorder."*

**The editor**, on the settings shell:

- **Role name** and **Role colour** with a **Solid / Gradient** switch — Guilded's
  swatch grid plus a custom picker. A gradient role name is drawn with the same
  machinery `DISPLAY_NAME_EFFECTS` already uses for gradient display names, so
  this costs no new rendering path.
- **Role icon** — **Upload image** or **Choose emote** (from the bastion's own
  emoji), with Remove. Drawn beside the name in chat and in the member list.
- **Role settings** toggles: **Self-assignable**, **Mentionable**, **Display
  separately** (its own member-list group).
- **Permissions** — grouped and searchable, each a `.nm-check` row with a
  one-line explanation. The existing `role.permissions` array stays as the
  storage shape, so **no migration**.
- **Members** — add and remove via `_stfPicker`, the console's typeahead with
  avatars and styled names.

**Per-channel overrides** — new `ch.overrides = { roleId: {allow:[], deny:[]} }`.
This is what makes a locked `#plant-mods` possible. Resolution: `@everyone` →
role overrides by priority → member override. One shared `_bstCan(user, ch,
perm)` used by the sidebar (to hide), the chatbar (to disable) and the send path
(to refuse) — **the guard runs at the action, not only where the button is
drawn**, which is the rule the console's rank guard taught us.

---

### 3.4 Member list — Guilded's shape

Keep the virtualiser; change what it draws.

- **"+ Invite"** pinned at the top of the rail.
- Groups headed **count first** — "1 Captain", "1 Social", "6 VIP" — for roles
  marked *Display separately*, then Online, then Offline.
- **Role icon** beside the avatar, name in the **role's colour** (font at rest,
  colour and effect on hover, per the standing rule), **BOT** capsule for bots.
- Thicker rows, the tactile hover, and `_ftzNotFound` when a search finds nobody.

---

### 3.5 Boosting — Radiance's power, spent on a bastion

**The lore:** boosting and Radiance draw on the same power. **You do not need
Radiance to boost** — boosts are bought with **Onyx** — but **Radiance grants
free boosts** to spend. That is the relationship, and it is why every boost
surface wears the Radiance overlay (`.ftz-ov-rad`, already built).

**The data.** New `b.boosts` (a real count) with `b.boostLevel` **derived** from
thresholds and still written, so everything reading it today keeps working. That
is what makes the reference's bar drawable:

```
Boost Goal  ▓▓▓▓▓▓▓░░░░░░░   10/20 Boosts  ›
```

Real numbers, no `Math.random()`.

**The boost page** — the perk list from your screenshot: each perk with its
**LVL** badge, what it unlocks, and an unlock button. Perks map onto things we
already have and things this rework adds: emoji and sticker slots (already
level-gated), bastion banner, **invite background**, custom invite link, role
icons, more categories, higher upload limits.

**The logo** is `boosting logo.png` at the web root — **not in the repo yet**;
I will wire the path and it will draw the moment you drop the file in.

---

### 3.6 The unlock button — one component, two badges

You want the same control in two places, so it is built once:

```
.ftz-unlock          appearance background, WHITE text, logo at the LEFT
.ftz-unlock--boost   boosting logo   →  "Unlock with Boosting"
.ftz-unlock--rad     radiance logo   →  "Unlock Radiance"
```

Appearance-token background (so it is right under all five themes), white label,
the app's 3D press. **No glow ring** — the reference has one; our standing rule
does not. Used on every locked bastion perk and on the Radiance page.

---

### 3.7 Bastion settings — `.bst-set-*`

**Shell:** the settings-modal shell the staff console uses — sectioned left rail,
sticky header with per-page title and lead, one scroll body. The 24 tabs grouped
so the rail is legible:

- **Bastion** — Overview · Emblem & banner · Mood · Vanity URL
- **Structure** — Channels & categories · Roles · Members · Invites
- **Expression** — Emoji · Stickers · Soundboard
- **Moderation** — Automod · Bans · Slowmode · Rules · Audit
- **Growth** — Insights · Boosting · Events · Announcements · Welcome · Starboard
- **Advanced** — Bots · Templates · Danger zone

**Every tab rebuilt on `.fs-tb-panel` + `.fr-row` + `.ftz-select` +
`.settings-input`** — which is what removes the 401 inline styles and makes the
whole thing appearance-aware. **No feature is dropped.**

---

### 3.8 Bastion creation — sliding frames, then the welcome

Rebuilt on **`.gs-track`, the Get Started guide's mechanism, verbatim**: one card
that never moves or resizes, frames sliding leftwards inside it, `flex:0 0 100%`
so one translate is exactly one frame at any width, on the pure ease-out curve
(`.58s cubic-bezier(.22,.9,.24,1)`) that took two rounds to get right. Only the
frames change.

1. **Start** — from scratch, from a template, or import.
2. **Template** (branch) — the template grid.
3. **Personalize** — emblem upload + name, with the live name check.
4. **What is it about** — category and tags, which also **feeds Discover**
   (round 9 built category chips there and nothing could set them; this closes
   that loop).
5. **Invite people** — the link, ready to copy, as `invite.fortized.com/CODE`.
6. **Nice work** — the finished bastion, and in.

Then **task #39**, the Get Started guide *for* a new bastion, becomes the natural
follow-on: the same `.gs-*` frames, run once you are inside, walking the owner
through their first channel, first role and first invite.

---

### 3.9 Invite system

Canonical links **shipped** (`2026fix505`) — every link the app hands out is
`invite.fortized.com/CODE`, and a logged-out visitor's code now survives login
and signup. Left to do:

- **Rebuild the invite card** on `.ftz-confirm-card` rather than its own bespoke
  `.invite-*` family (there is also a duplicate `.invite-accept-btn` rule at
  `styles.css` 5438 and 10702 — one wins arbitrarily).
- Show what you are joining: **invite background** (a boost perk), emblem, name,
  member count, who invited you.
- **Invite management** in settings — expiry, max uses, revoke, real uses count,
  on the console's Onyx-codes shape.

---

## 4. Phasing

Each phase ships and is verifiable alone. I would not do this in one push.

| # | Phase | Why this order |
|---|---|---|
| 1 | Sidebar wired to real categories + channel rows + the 8 types | The daily surface, and it makes an existing feature visible for the first time |
| 2 | Roles, permissions, per-channel overrides | Deepest work; unblocks locked channels |
| 3 | Settings shell + all tabs rebuilt | Mechanical once 1–2 define the components |
| 4 | Boosting + the unlock button + the bastion pages | Self-contained; the button is shared with Radiance |
| 5 | Creation flow + overview | Reuses `.gs-*` wholesale |
| 6 | Invite card + invite management | Smallest; half already landed |
| 7 | Member list visual pass | Last on purpose — no data model behind it |
| 8 | **Identity confusion — the bug hunt** | A correctness phase, not a design one. Do it before 7: the member list is where the symptom shows, and repainting it first would only hide the fault |
| 9 | **One chat system for channels and DMs** | Largest and last, because it touches the hottest code in the app and every phase above narrows what still differs |

### 3.10 Identity confusion — display names, usernames, banners (phase 8)

The user's words: *"it confuses members & users displaynames, usernames
banners, mixes all together, its crazy"*. This is a **bug class, not a polish
item**, and it needs a real root-cause pass rather than patching each surface
where it shows.

The shape of the fault, as far as it is understood:

- **A member is not a user.** `b.members` holds names; the person behind the
  name lives in the `users` table. Every bastion surface has to bridge that gap,
  and each one does it differently — some read `_profileCache`, some
  `_pfpCache`, some re-resolve through `getUserByName`, some just print the
  stored string. Where two of those disagree, one member wears another's name.
- **Display name vs username vs member nickname** are three different strings
  and the surfaces do not agree on which one they are showing.
- **`banner` is the heaviest column in the table** and is deliberately kept OUT
  of `_USER_LIST_COLS` and every bulk read (standing egress rule). So a bulk
  path has no banner at all, and anything that falls back to a *cached* banner
  can serve the previously-cached person's — which is the most visible half of
  what the user is seeing.

Where to look, in order: `renderMemberList`'s avatar and name fast-paths (it is
virtualised, and a fast-path that reuses an existing node is exactly where an
identity can stick), `_ftzStyledNameHTML` / `_dmNameStyleAttr`, the realtime
`profile:update` handler, and every cache keyed by something other than the
username.

**Rule for the fix:** one resolver, one key. A surface asks for a person by
username and gets back a single object; nothing composes identity out of two
caches. And it must not add reads — the caches exist because of the egress
quota.

### 3.11 One chat system for channels and DMs (phase 9)

The user's words: *"bastions are a mess they are different than DM chats (i
want all the chat areas to use the same system)"*.

Today a bastion channel and a DM are two parallel implementations of the same
screen: `loadBastionChannel` vs `loadDMMessages`, `sendChannel` vs `sendDM`,
separate realtime listeners, separate open-and-scroll paths, separate topbars.
Every chat fix so far has had to be made two or three times, and the ones that
were only made once are the bugs.

The target is **one surface with a source**: a chat component that takes a
conversation (channel, DM, group chat) and does not care which it got. Sending,
receiving, the auto-scroll chase, the sending state, deletes, separators,
attachments and the picker stack are written once.

⚠️ **This is the hottest code in the app** and the auto-scroll work alone took
a full session to get right. It is last deliberately. It is also the phase most
likely to want splitting: read path first, then send, then realtime.

---

## 5. Risks, stated up front

- **Migration: none.** Categories already exist in the data. Bastions without
  them read as one implicit group; nothing to run, nothing breaks.
- **`b.boosts` is new** and absent on every existing bastion. Read as
  `b.boosts ?? _boostsForLevel(b.boostLevel)` so a bastion that is already Level
  2 keeps its level and its bar reads correctly from day one.
- **Permissions are a security surface.** Hiding a channel is not denying access.
  `_bstCan` is checked at every mutation — and the honest limit stands: until
  passwords are hashed and RLS is on for `users`, anything client-side can be
  bypassed by writing Supabase directly. **I will not call channel permissions
  "secure" in any UI copy until that lands.**
- **`renderBastionSidebar` is hot** — it runs on every channel switch. Grouping
  by category is a pass over an array already in memory. No new reads.
- **Stage channels are the one genuinely new system** here — speaker roles,
  hand-raising, priority speaker. Larger than it looks and worth its own phase if
  it starts to sprawl.
- **Scale.** The largest surface in the app after chat. Phase 1 alone is
  comparable to the Discover rebuild.

---

## 6. Still open

1. **Role icons** — free, boost-gated (the reference gates them), or Radiance?
2. **Guilded's "Make channel public"** — a channel readable from outside the
   bastion entirely. Want it, or is Discover enough?
3. **Bastion profile** — the Discord shot has traits, description, banner-colour
   picker and a live invite-card preview. Its own settings page?
4. **Boost thresholds** — how many boosts per level, and how many free boosts a
   Radiance member gets.
