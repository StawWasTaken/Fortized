# Today — staw's punch list

Captured 2026-06-06. Not the long-term roadmap — only items asked for in
the current chat session that we agreed to tackle today.

## 1. Context menu + `.msg-acts` audit
- **What:** every row in the message context menu + every button in the
  `.msg-acts` hover strip (Reply, React, Edit, Delete, Forward, Pin, etc.)
- **Goals:**
  1. Document what each item is for, who can see it, and what it does
     when the target is (a) your own message, (b) someone else's
     message, (c) a system message.
  2. Verify each one end-to-end in the running app (open chat → trigger →
     observe network call + UI feedback + persistence after reload).
  3. Replace the SVG icons. Current set is inconsistent (mix of stroke
     widths + corner styles); standardise on the `_svgIcons` 1.8 stroke
     family.
- **Surfaces to cover:**
  - DMs / GCs / bastion channels / forum / pinned panel.
  - Bastion owner + role-with-`manage_messages` variants.

## 2. Per-platform embed review
- **Targets:**
  - YouTube long-form vs Shorts vs embedded clips (`?clip=…`)
  - X / Twitter (single tweet, thread, image-only, video tweet)
  - Instagram (post, reel, story link)
  - TikTok (post + profile-only link)
  - Fortized bastion invite — `fortized.com/app?invite=<code>` should
    render the "preview + Join" card, not a generic link card
  - Fortized template invite — `fortized.com/template/<id>`
  - Spotify (track, album, playlist, podcast)
  - Reddit, Twitch, GitHub for completeness
- **Goal:** each platform gets its **own** embed look — accent colour,
  metadata, action button — not the generic `_uniformEmbed` shell.
  Audit existing handlers in `parseMD` and `_uniformEmbed`, add what's
  missing.

## 3. Discover overhaul
- **Second topbar** — re-do (currently mismatched with the main topbar's
  pill style + spacing).
- **Bastion cards** — review layout, member-count placement, banner
  fallback, hover behaviour, action buttons.
- **Activities** — verify the activities row works (cards, status,
  presence pull-through, join button).
- **NEW: Join-by-invite from Discover.**
  - UI: matches the "Add Friend" card (input + button on the right).
  - Accepts `fortized.com/app?invite=<code>` URL or raw `<code>`.
  - Validates against the `invites` table, joins on success, opens the
    bastion. Mirrors the friend-request flow but resolves to a bastion.

## 4. Swiftign redesign for the Fortized app (parked, big job)

we already shipped the swiftign design on swiftaw and on the fortized
web/marketing pages. the app is the last piece. parking it here so we
don't forget, but realistically this is hours of careful surface-by-
surface work and the app needs to be less buggy first - so it's a "do
this once the chaos calms" item, not a today item.

scope (from the brief staw pasted):

**house rules (every session when we touch this)**
- push directly to main on stawwastaken/fortized, no feature branches.
- british english everywhere (colour, behaviour, organise, customise,
  recognise, centre, favourite, grey, analyse).
- tone: lowercase, conversational, no em-dashes, use a normal dash.
- no "still A / still B / still C -> punchline" copy beats.
- reference: swiftaw.com/innovation-room (the swiftign article),
  swiftaw.com, fortized.com marketing pages, pinterest gestalt feel
  (rounded tiles, soft tinted panels).

**currently shipped on /app**
- loading race fix - utils.js no longer force-shows view-home mid-init.
- loader gif tinted yellow via css filter.
- loader retry button is now a yellow 3d swiftign sticker.
- toast - sticker treatment with hard offset shadow + slight tilt.
- offline banner - sticker treatment.
- sidebar rail active state - hard offset shadow on active rail
  buttons and bastions.
- `.swf-*` utility classes - `.swf-chip.{yellow|pink|blue|mint|lilac|peach}`,
  `.swf-btn-3d`, `.swf-sticker`, `.swf-tilt-l/r`. drop into any new surface.
- `.btn-a` / `.btn-g` global - all primary/ghost buttons are 3d swiftign.
- `.modal` global - all modals inherit the sticker frame.
- create bastion modal - the reference, use it for the rest.

**reverted (lessons learned)**
v2 and v3 broad-brush layers targeted classes that don't exist
(`.modal-card`, `.create-btn`, `.ftz-btn-primary`), forced yellow on
profile buttons that must respect the user's theme colour, and forced
syne/tilts on dense surfaces (notification items, member rows, channel
list) where they didn't fit. lesson: surface-by-surface, audit real
dom classes first, never broad-brush.

**what's left (priority order)**
1. profile panel (`.fpp__*`) - buttons/chips inside profile must adopt
   the user's theme accent, not hard-code yellow. find the user-theme
   css variable and read from it. audit `own-profile-panel.html`,
   `dm-profile-panel.html`, `profile-card.html`, `.fpp__*` rules.
2. home view (`#view-home`) - feel like the fortized marketing
   homepage: yellow sticker hero, bento grid using `/Icons/*`, tilted
   feature stickers, live "bastions created on fortized" counter,
   yellow outro card.
3. settings modal - per-subpage sticker pass (account, profile,
   privacy, voice & video, notifications, theme, subscription,
   sessions, connections). theme-aware buttons keep their theme
   awareness.
4. bastion overview / settings - yellow sticker card on the fortized
   banner backdrop (marketing ramparts panel pattern).
5. channel list - subtle sticker active state only. no tilts, no slide
   animations.
6. dm list / friends view - same; sticker active state only.
7. other modals - add friend, join bastion, new dm / group chat,
   forward message, role editor, assign role, leave bastion confirm,
   boost, events, overview. the global `.modal` treatment already
   applies; check each renders cleanly.
8. message input bar + message rows - leave alone unless explicitly
   asked. high-frequency, high-risk.
9. mobile (<=720px) - soften tilts and 3d shadows (matches marketing).
10. floating decorations - small bobbing fontawesome svgs into home +
    settings (not chat).

**architecture notes**
- `/app/styles.css` is ~11,950 lines of densely-packed single-line css.
  never edit in place, always append at the bottom or create
  `app/styles.swiftign.css`.
- use body-prefixed selectors (`body .foo`) to outrank packed rules.
- audit real dom classes first with grep on `index.html` and `app.js`
  render functions. v4 wins came from finding `.btn-a` / `.btn-g` /
  `.modal` / `.tmpl-card` / `.vis-opt` / `.tic-*`; v2/v3 failures
  came from guessing.
- bump the cache-buster (`?v=2026swfn5`) on every css/js change.

**"feels swiftign" acceptance criteria**
- buttons feel 3d (hard offset shadow, press in on click).
- modals feel like stickers (slight tilt, sticker frame, hard offset
  shadow).
- profile panel respects the user's chosen theme colour.
- home view feels like a small fortized marketing site.
- chat is untouched and still snappy.
- mobile straightens the tilts.
- nothing else in the app feels broken or visually inconsistent.

## 5. Login + signup pages redesign

staw plans to redo the fortized login and signup flows. scope to be
defined - hold a slot here so it doesn't get lost. likely a swiftign
pass (sticker frame, 3d buttons, yellow accent) plus whatever ux
changes staw wants (oauth providers, magic link, etc.). will
re-scope properly when we pick it up.

---

## Done today (out of these or adjacent)
- File tokens stripped from "Copy Text" (no more pasting `[FTZIMG:…]`).
- Inline-block on image attachments → block, so text + image no longer
  share a line awkwardly.
- Reply preview moved above avatar+content; L-connector reaches the
  big avatar's centre column.
- `_tsFromId` fix → old messages stop masquerading as the most recent.
- Replies persist across reload (requires `reply_to JSONB` column).
- Mutes persist on the account, not the device.
- `chat-msgs-initial-loading` was hiding live messages → per-row tagging
  fix so real-time updates stay visible.
- Messages disappearing on scroll-up → `_loadOlderMessages` shuffle bug
  fixed (captured `lastChild` after dedup-rejected append).
- Skeleton → blank gap eliminated (`display:none` + atomic reveal).
- Profile reverting across devices → trust window 24h → 5min.
- Typing indicator stuck on → 6s client-side auto-clear.
- DM typing match → lenient substring (so future room-key changes don't
  silently break it).
- Image-lightbox zoom → `overflow:visible` on the wrap so `scale()`
  actually grows the image instead of cropping it.
- Userbar + embeds → use translucent surfaces so custom appearances
  show through (was solid `#15171e` / `#1c1e22` before).
- Reveal safety: try/catch + once-guard so a thrown reveal can't leave
  messages stuck under `.msg-pre-reveal`.
- "Failed to save data" toast: silenced for transient backend failures
  (data is in localStorage; next save retries). Only surfaces when
  actually offline.
