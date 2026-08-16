# Bastion — full redesign and rework

**Status: PLAN, awaiting approval. Nothing here is built yet.**

The bar is the staff console rebuild: that went from *"a freaking mess"* to
something finished, and it got there by being **assembled out of the app's own
parts** rather than given a new visual language. Same method here.

---

## 1. What is actually there today

I measured this rather than guessing. These are the numbers that matter.

| Surface | Function | Size | Inline `style="` |
|---|---|---:|---:|
| Left sidebar (channels) | `renderBastionSidebar` | 194 lines | 19 |
| Bastion overview | `renderBastionHub` | 97 lines | 27 |
| Create-a-channel card | `showCreateRoomModal` | 119 lines | 38 |
| Settings body (24 tabs) | `renderBSettingsMain` | ~900 lines | **401** |
| Creation templates | `renderBastionTemplateGrid` | 30 lines | 10 |

**401 inline style attributes in the settings body alone.** That is the exact
diagnosis Discover had before its rebuild: the page is painted by hand, so it
cannot answer the appearance system. Recolour the app and bastion settings stay
the same.

### The five real problems, not cosmetics

**① You cannot make your own channel categories.** This is the big one. The
sidebar's categories are **hardcoded by channel type** — `catWrap('text',…)`,
`'TEXT ROOMS'`, `'WALL ROOMS'`, `'PARTY ROOMS'`, `'ANNOUNCEMENT ROOMS'`,
`'POLL ROOMS'`. Look at your own screenshot: *Plant Hall*, *Book Club*, *plant
chats*, each holding a **mix** of text and voice rooms. That is how people
actually organise a community, and today it is impossible — a voice room can
never sit next to the text room it belongs with. Two of the five headings are
labelled with OS emoji (`📝`, `🗳`) instead of icons.

**② There are no per-channel permissions.** `restricted` exists but only means
*age-restricted*. There is no way to say "this channel is for Moderators", which
is the single most-asked thing of any role system. Your Discord screenshot has a
`#plant-mods` channel with a lock on it; we cannot draw that lock because we
cannot express it.

**③ The boost progress bar is a lie.** `renderBastionSidebar` line 10760:

```js
const boostProgress = boostLv > 0 ? Math.floor(Math.random() * 100) : 0;
```

A **random number**, re-rolled on every render. Same family as the invented
"N Online" counts deleted from Discover and the invite embed. It goes.

**④ Roles are a flat list with no ordering and no icons.** The roles tab renders
a sorted list where the only handle on priority is a `#3` number you edit in a
form. Discord's roles list — your screenshot — is **drag-ordered**, and that
ordering *is* the permission hierarchy, so it has to be direct. We also have no
role icons and no role-colour-on-name in chat, both of which are in the
reference.

**⑤ Bastion creation is four hidden divs and stops too early.** `showBastionStep1`
/ `showBastionStep2` swap `display:none`, so there is no motion and no sense of
progress. And it ends the moment the bastion exists — the Guilded flow you sent
keeps going: *personalize → what do you play → invite people → nice work*. Ours
drops you into an empty bastion with no icon, no members and nothing to do.

### What is genuinely good and must survive

- **`renderMemberList` is virtualised** — a flat render schedule with measured
  row heights and an IntersectionObserver resolving rows by index. That is real
  engineering on a list that can be thousands long. **Redesign its looks, do not
  touch its mechanism.**
- Role grouping, online/offline split and live Socket.IO presence in the member
  list are correct.
- `ROLE_TEMPLATES` (apply a preset role structure) is a good idea worth keeping.
- The invite card has real CSS and already carries the 3D button recipe.
- Bastion settings has genuine depth: automod, starboard, mood, reputation,
  insights, welcome messages, events, bots. **The features are not the problem.**

---

## 2. Design rules for this rework

1. **Assemble from what exists.** `.fs-btn` · `.ftz-confirm-card.ftz-ac-card` ·
   `.ftz-close-btn.ftz-ac-x` · `.disc-subnav` · `.qst-group` · `.fs-tb-panel` ·
   `.fr-row`/`.fr-act` · `.ftz-select` · `.settings-input` · `_ftzNotFound` ·
   `.nm-check`. New `.bst-*` names are **glue only** — shell, rails, drag
   handles. If I invent a card language, the rework has failed the same way the
   first staff-console attempt did.
2. **Every colour from a token.** No `rgba(…)` literals, no `#5865f2`. The whole
   point is that a bastion looks right under all five appearances.
3. **No glows. No idle animation.** Arrival animations only.
4. **Nothing invented.** If we do not measure it, we do not print it.
5. **Font weights 500–700.** The bastion surfaces are full of legacy `800`.
6. **Egress-aware.** Bastion reads are already hot; nothing here adds a per-open
   full-table read, and the category/permission work rides in the **existing**
   bastion row rather than adding a table.

---

## 3. The plan, surface by surface

### 3.1 Left sidebar and channels — `.bst-rail`

The centrepiece, because it is what you look at all day.

**Real categories.** New `b.categories = [{ id, name, collapsed, order }]` and
`ch.categoryId` on each channel. Uncategorised channels sit in an implicit top
group, exactly like Discord. Categories are **created, renamed, reordered and
deleted by the owner**, and hold **any mix of channel types**. The five
hardcoded type-groups are deleted.

- Channel type becomes a **glyph on the row** (`#`, speaker, megaphone, board,
  ballot) instead of a heading, which is what frees a category to be about
  *topic*.
- **Drag to reorder**, channels within a category and categories among
  themselves — reusing `_initBastionDrag`, which already does this for the rail.
- Collapsed state persists per bastion, per member (localStorage — it is a view
  preference, not shared state, so it must not cost a write).

**The header.** Banner hero, emblem, name, and one chevron opening the bastion
menu. The `▼` text glyph becomes a real icon; the boost pill stops being a
`linear-gradient` built in a template string; **the random progress bar is
deleted** and replaced with the honest figure — boosts held out of boosts
needed, which we do know.

**The rows.** Thicker hit areas, the tactile hover, unread as a white dot and a
bolded name, mentions as the yellow count capsule. A locked channel (see 3.2)
draws a lock. Voice rooms list who is in them underneath, which we have the data
for and do not currently show.

### 3.2 Roles and permissions — the part with real work in it

**Drag-ordered role list**, top to bottom, priority implied by position — the
Discord screenshot. Colour dot, name, member count, drag handle.

**A real role editor** on the settings shell with the reference's four tabs:
- **Display** — name, colour (swatch grid + custom picker), **role icon**,
  "show separately in the member list", and a **live preview** of a message from
  someone wearing it.
- **Permissions** — grouped and searchable, each a `.nm-check` row with a
  one-line explanation. Today's `(b.roles||[]).permissions` array stays as the
  storage shape, so no migration.
- **Members** — add and remove, through `_stfPicker` (the typeahead with avatars
  and styled names that the console already uses).

**Per-channel permission overrides** — new `ch.overrides = { roleId: {allow:[],
deny:[]} }`. This is what makes `#plant-mods` possible. Resolution order:
`@everyone` → role overrides by priority → member override. One shared
`_bstCan(user, ch, perm)` used by the sidebar (to hide it), the chatbar (to
disable it) and the send path (to refuse it) — **the guard runs at the action,
not only where the button is drawn.** That is the rule the console's rank guard
taught us.

### 3.3 Member list — visual only

Keep the virtualiser. Change: role-coloured names (font at rest, colour and
effect on hover, per the standing rule), role icons beside names, thicker rows
with the tactile hover, a real section header instead of an inline-styled div,
and `_ftzNotFound` when a search matches nobody.

### 3.4 Bastion overview — `renderBastionHub`

Rebuilt on the Discover hero treatment we already shipped: banner, emblem, name,
tagline, then honest stat plates (members, channels, created, boost tier) and
the action row. It is currently 97 lines carrying 27 inline styles and reads
like a placeholder.

### 3.5 Bastion settings — `.bst-set-*`

**Shell:** the settings-modal shell the staff console uses — a sectioned left
rail, a sticky header with per-page title and lead, and one scroll body. The 24
tabs get grouped so the rail is legible:

- **Bastion** — Overview · Emblem & banner · Mood · Vanity URL
- **Structure** — Channels & categories · Roles · Members · Invites
- **Expression** — Emoji · Stickers · Soundboard
- **Moderation** — Automod · Bans · Slowmode · Rules · Audit
- **Growth** — Insights · Boost · Events · Announcements · Welcome · Starboard
- **Advanced** — Bots · Templates · Danger zone

**Every tab rebuilt on `.fs-tb-panel` + `.fr-row` + `.ftz-select` +
`.settings-input`**, which is what removes the 401 inline styles and makes the
whole thing appearance-aware. No feature is dropped.

### 3.6 Bastion creation — sliding frames, then the welcome

Rebuilt on **`.gs-track`, the Get Started guide's mechanism, verbatim**: one card
that never moves or resizes, frames sliding leftwards inside it, `flex:0 0 100%`
so one translate is exactly one frame at any width, on the pure ease-out curve
(`.58s cubic-bezier(.22,.9,.24,1)`) that took two rounds to get right. Only the
frames change. This is exactly what you asked for.

Frames, following the Guilded flow you sent:

1. **Start** — from scratch, from a template, or import a template link.
2. **Template** (branch) — the template grid.
3. **Personalize** — emblem upload + name, with the live "your name looks good"
   check.
4. **What is it about** — category and tags, which also **feeds Discover**
   (round 9 built category chips there and nothing could set them; this closes
   that loop).
5. **Invite people** — the invite link, ready to copy, in the
   `invite.fortized.com/CODE` shape.
6. **Nice work** — the finished bastion, and in.

Then **`#39`, the Get Started guide for a new bastion**, becomes the natural
follow-on: the same `.gs-*` frames, run once you are inside, walking the owner
through their first channel, first role and first invite.

### 3.7 Invite system

Canonical links are **done and shipped** (`2026fix505`) — every link the app
hands out is now `invite.fortized.com/CODE`, and the logged-out visitor's code
survives login and signup. What is left for this rework:

- **Rebuild the invite card** on `.ftz-confirm-card` instead of its own bespoke
  `.invite-*` family (there is also a duplicate `.invite-accept-btn` rule at
  `styles.css` 5438 and 10702 — one wins arbitrarily).
- Show what you are joining: banner, emblem, name, member count, who invited
  you. It should look like the thing on the other side of the door.
- **Invite management in settings** — per-invite expiry, max uses, revoke, and
  the real uses count, on the console's Onyx-codes shape.

---

## 4. Phasing

Each phase ships and is verifiable on its own. I would not do this in one push.

| # | Phase | Why this order |
|---|---|---|
| 1 | Categories + channel rows + sidebar | The daily surface, and everything else references channels |
| 2 | Roles, permissions, per-channel overrides | The deepest work; unblocks locked channels |
| 3 | Settings shell + all 24 tabs rebuilt | Mechanical once 1–2 define the components |
| 4 | Creation flow + overview | Self-contained; reuses `.gs-*` wholesale |
| 5 | Invite card + invite management | Smallest, and half of it already landed |
| 6 | Member list visual pass | Deliberately last — no data model behind it |

---

## 5. Risks, stated up front

- **Migration.** Existing bastions have no `categories` and no `categoryId`.
  Handled by reading them as one implicit group and writing categories only when
  an owner first makes one — **no migration, nothing to run, old bastions keep
  working untouched.**
- **Permissions are a security surface.** Hiding a channel in the sidebar is not
  the same as denying access. `_bstCan` gets checked at every mutation, and the
  honest limit stands: until passwords are hashed and RLS is on for `users`,
  anything client-side can be bypassed by writing Supabase directly. I will not
  describe channel permissions as "secure" in any UI copy until that lands.
- **`renderBastionSidebar` is hot** — it runs on every channel switch. Categories
  add a grouping pass over an array that is already in memory; no new reads.
- **Scale.** This is the largest surface in the app after chat. Phase 1 alone is
  comparable to the Discover rebuild.

---

## 6. Open questions for you

1. **Channel types** — Guilded's create-channel card offers ten (chat, voice,
   stream, calendar, scheduling, announcement, list, docs, media…). We have five.
   Do you want more, and which?
2. **Role icons** — Discord gates them behind a boost level. Free, boost-gated,
   or Radiance?
3. **"Make channel public"** — Guilded's toggle exposes a channel outside the
   server entirely. Do you want that, or is Discover enough?
4. **Bastion profile** — the Discord screenshot has traits, a description, a
   banner colour picker and a live invite-card preview. Worth building as its own
   settings page?
