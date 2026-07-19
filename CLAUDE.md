# Fortized — working notes for Claude

## 🔴 SESSION HANDOFF (as of cache-bust `2026fix329`)

**Shipped `2026fix329` (crash fixes + spoiler/bot-profile redesign):**
- **Video→GIF no longer freezes the tab**: `_encodeFramesAsGif` is now async and
  `await`s a `setTimeout(0)` between frames (yields to the event loop); sampling
  capped to 240px / ≤50 frames (~8fps) + a progress toast. `_videoToGif` awaits it.
- **Spoiler crash fixed + redesigned**: a NEW parseMD pre-pass (before the FTZ
  token + generic `||text||` passes) matches `||[FTZ…]||`, recurses `parseMD`
  once to expand just that token, then wraps the media in `.ftz-spoiler-media`
  (blur + centred SPOILER pill, click/Enter reveals). This stops the generic
  spoiler regex from wrapping an already-expanded media blob (the crash). Text
  `.msg-spoiler` redesigned to a solid Discord-style block (no blur leak).
  `[data-spoiler-mode="always"]` reveals media spoilers too.
- **Collect button back on the RIGHT for every gif** (incl. uploaded/FortGified):
  `_attWrap` gifs render the always-on `_gifCollectBtnHTML` top-right and the
  download/modify/delete hover row shifts left via `.ftz-att-ctrls--offset`
  (`opts.noCollect`). Removed `cgf-left`.
- **FortGified special bot profile** (`_fppRenderBotPanel` + `_showFortgifiedProfilePopover`
  for avatar/name clicks + `_openFortgifiedProfileModal` for `viewUserProfile`):
  yellow brand-icon banner, bot badge + BOT capsule, name, bot ID
  (`FORTGIFIED_BOT_ID`, no @username), "by @fortized", Description (`FORTGIFIED_DESC`),
  Commands (Image/Video to GIF), "Created On" (`FORTGIFIED_CREATED`). Guards in
  `showMiniProfilePreview` + `viewUserProfile` route FortGified here (it has no DB row).
- **Reply bar** (`.chat-reply-bar`) surface now matches the room topbar
  (`linear-gradient(rgba(0,0,0,.4)…),var(--channel)`); the reply name uses the
  target's DISPLAY NAME + display font/effect/colour via `_applyReplyName`.


Branch `claude/staff-console-world-map-vawn5l`, mirrored to `main`. Standing
rules unchanged (egress; mirror-to-main + cache-bust every push; `node --check`
app.js + supabase + 42 relationship tests pre-commit; verify UI via Playwright
plainviews — CDN/Supabase unreachable in-sandbox).

**Shipped `2026fix328` (FortGified rework + collect fixes + Tenor embed):**
- **FortGified = TWO commands** (`_openMsgBotsMenu`): "Image to GIF" and "Video
  to GIF" (≤15s). Image command uses `_msgFindConvertibleImage` = ONLY
  `img.ftz-chat-img` (real uploaded JPEG/PNG) — stickers (`.msg-sticker`), GIFs
  (`.ftz-embed-gif img`) and emojis (`.msg-emoji`) are NO LONGER convertible.
  `_fortgifiedGifify(msgId,context,mode)` gained the `mode` arg.
- **Trigger-owner delete**: the user who ran a bot command can delete that bot
  message. Durable record = the `**@<user>** used **<cmd>**` text prefix, read
  by `_parseBotTrigger`/`_iTriggeredMsg`; `appendMessage` stamps
  `row.dataset.triggeredBy`. Threaded a `canDel` flag through `buildMsgActions`/
  `_buildMsgActsInner`/`_showMsgMoreMenu` + the right-click ctx menu.
- **Collect on FortGified/uploaded gifs FIXED**: the FTZIMG-gif branch now emits
  the SAME always-visible `_gifCollectBtnHTML` inside `.ftz-embed-gif` (class
  `cgf-left` → top-left so it clears the attWrap download/modify/delete row);
  `_attWrap` skips its own collect via `opts.noCollect`.
- **GIF-panel Collection tab**: the red "Remove" ✕ is gone — each card shows the
  filled bookmark (collected); clicking uncollects. Real-time: `toggleFavGif`→
  `_syncGifCollectBtns` updates every visible button for that url AND re-renders
  the Collection tab live.
- **Tenor page URLs embed** (`tenor.com/view/…-<id>`): old v1 API is dead, so we
  render Tenor's keyless iframe (`_tenorEmbedHTML` → `tenor.com/embed/<id>`,
  `.ftz-tenor-embed`) immediately; `_resolveTenorId` still tries the API only to
  UPGRADE the iframe to a collectible inline gif, else leaves the iframe.
  ⚠️ Needs live verification (network blocked in-sandbox).

**Shipped `2026fix327` (GIF collections + replies):**
- **Unified GIF collect control** (`_gifCollectId`/`isGifCollected`/
  `toggleFavGif`/`_gifBookmarkSVG`/`_gifCollectBtnHTML`/`_gifCollectClick`/
  `_syncGifCollectBtns`, near `saveFavGif`). One code path across EVERY surface:
  chat `.ftz-embed-gif` embeds (FTZGIF + giphy/tenor/klipy/generic + the async
  Tenor/Klipy resolvers), `_attWrap` gif attachments (FortGified + uploaded
  gifs), the media right-click menu, the media **lightbox** (new collect btn,
  gated by `_looksLikeGif(src)`), and the GIF-picker search results. Fixes
  "collect doesn't work on other users'/FortGified gifs" — the button is now
  present + functional everywhere and **toggles** (collect/uncollect).
- **Collected state shown**: filled bookmark (accent, always visible) vs outline
  bookmark (white, hover) + `data-tip` "Collected"/"Collect". Matches by URL
  first (back-compat with pre-existing slice(-16) ids). Toggling one button
  live-syncs every visible button for that url (`_syncGifCollectBtns`, and
  re-renders the Collection tab if open).
- **Replies always render a full header** (avatar + name + time), even when they
  would group under the previous message — `if (msg.replyTo) isFirst = true;`
  in `appendMessage` (Discord-style).
- **Reply preview attachments** show an image SVG icon + "Attachment" tooltip
  instead of the media/raw token. Strip regex now tolerates a **truncated**
  token (missing `]`) — a capped reply snapshot can cut a big sticker/image
  data-URL mid-token, which was leaking raw `[FTZSTICKER:data:image/…` text
  into the preview. Icon = fa-image (viewBox 0 0 448 512), sized 13px.

**Shipped `2026fix320`→`326` (rounds 3–5 of user feedback):**
- **Right-click a message → "Bots"** (in the real ctx menu `handleContextMenu`,
  NOT the ⋯ More menu) → opens the **Bots flyout** (`_openMsgBotsMenu` /
  `.ctx-apps-flyout` — search + "Bots" section listing each message-command bot
  + commands). FortGified → **Convert to GIF**; enabled for images and videos
  **<15s**, disabled+hinted otherwise. Gate: `ch.botsDisabled`.
- **FortGified video→GIF** (`_videoToGif` + `_encodeFramesAsGif`: multi-frame
  animated GIF89a, local palettes + Netscape loop; 320px/~10fps/≤180 frames;
  VERIFIED decodable in Chromium). Image path = single-frame (`_encodeCanvasAsGif`).
- **Bare GIF links embed**: added Tenor **page** URLs (`tenor.com/view/…-id` →
  `_resolveTenorId`, public demo key, link fallback). Direct media + Giphy +
  Klipy pages already embedded.
- **Modify Attachment card redesigned** (`_renderModifyAttachmentCard`): thumb +
  Filename + **Alt Text** + Mark-as-spoiler, FA icons. Alt flows via a 3rd
  FTZIMG token seg `[FTZIMG:name|url|alt]`; spoiler wraps token in `||…||`.
- **Sent-attachment corner controls** (`_attWrap` on FTZIMG images/gifs):
  Download, Collect(gif), Modify+Delete (own-only via `.own`). Delete drops the
  one token (keeps caption) or deletes the msg; persist via `_persistMessageEdit`.
  **Ownership checks are now case-insensitive** (history rows lowercase `from` —
  was why Modify/Delete "didn't work on sent").
- **Save = native Save-As** (`showSaveFilePicker`, original ext; anchor fallback).
- **Edit box behaves like the chatbar**: `setupEmojiAutocomplete('edit-ta')`
  (:emoji: suggestions, emoji select/delete), surface matches `.chat-input-outer`,
  emoji icon `#b3b2b4`.
- **Chatbar attachment spoiler**: overlay `pointer-events:none` + action row
  `z-index:3` (was blocking clicks); added eye "Spoiler Attachment" toggle
  (`_toggleAttachSpoiler`); card actions now FA SVGs.
- **"BOT"** label everywhere (never "APP"; Apps = Discord's word).

**STILL OPEN (user queue):**
- **#21 Chatbar redesign** — pending-attachment preview "sucks", make it
  Discord-like; make the chatbar grow taller **downward** with text/attachments
  (not the current janky way). Ref screenshots. NOT started.
- **#22** — extend corner Modify/Delete to **video/audio/file** (images/gif only
  today; video/audio players have their own download — wrap carefully).
- Open Qs for user: remove the **chatbar Bots tab** (the "plus thing" picker)
  entirely? (kept for now, non-destructive.)

**FUTURE — full Bot system (user spec, #23, build later):**
1. @fortized built-in bots ALWAYS available in the Bots command button.
2. Create + add **custom bots** to Bastions AND Group Chats.
3. Bastion owners can disable bot-command use **per-channel or per-role**, or
   disable only certain bots. (Groundwork today: FortGified built-in, Bots
   flyout, `ch.botsDisabled` gate stub — no settings UI yet.)

---
### Previous handoff (kept for history)
## 🔴 SESSION HANDOFF (as of cache-bust `2026fix319`)

**Shipped in `2026fix319` (round 2 of user feedback):**
- **Emoji cells → Twemoji** (`renderEmojiCell` now emits `<img loading=lazy>`,
  glyph onerror fallback) — was OS glyphs ("not twemojis/not loading").
- **Rail overflow ROOT CAUSE fixed**: emblem `onerror` fallback nested double
  quotes inside the double-quoted attr, leaking `ST>`/`FO>` text on image
  failure. Now `_railEmblemFail()` + `.epp-emblem-fallback` + `overflow:hidden`
  (emoji sidebar, `_stickerRailBtn`, bot rail, `_botAvatarHTML`).
- **Topbar tabs only in chatbar context** — `buildEmojiPicker` computes
  `chatbarMode` (insert mode + ch/dm/gc-input + no status override) and only
  then renders `_pickerTopTabs`; hidden for reactions/edit/status/about/forum.
- **FortGified always in Bots panel** (`_botGroups` prepends it, all contexts;
  blue APP tag; `_fortgifiedHint` on click since it's a message command).
- **Edit box → chatbar style** (`.edit-chatbar`: rounded row, inline emoji
  button, "escape to cancel • enter to save" hint; no Save/Cancel buttons).
- **Media menu**: no "Copy Image" for GIFs; Collect uses a bookmark icon in
  `currentColor` (was yellow star).
- **DM panel** now `align-self:flex-start` + `height:fit-content` (capped) — a
  compact floating card, not a full-height sidebar.



Branch `claude/staff-console-world-map-zgvrsa`, mirrored to `main`. Standing
rules below still apply (egress, mirror-to-main + bump cache-bust every push,
`node --check` + 42 relationship tests pre-commit).

**Shipped THIS session (`2026fix315`–`318`):**
- **Pickers redesigned to Discord style** (user's explicit direction, NOT the
  GIF-panel collection cards — those were built in 315 then replaced in 317):
  sticker panel = LEFT rail of bastion emblems + collapsible per-pack sections
  (`_stickerToggleSection`) + "name from <bastion>" footer; emoji rail moved
  LEFT (`.epp-sidebar--left`); bots = flat list, per-bot section headers
  (avatar + count pill) + left avatar rail (`_renderBotList`/`_botRailJump`).
- **GIF tab/chatbar icon** = supplied `GIFSVG.png` as a currentColor CSS mask
  (`.gif-mask-ico`) — tints like the FA icons. Asset at web root.
- **Search bars unified**: GIF panel uses `.epp-search-*`; all picker search
  inputs have autocomplete/appearance/autofill guards ("blocky" fix — was
  likely native autofill repaint; unconfirmed by user).
- **DM user panel** = floating rounded card (18px radius, detached all edges;
  container padding in index.html + `.fpp--dm` CSS).
- **Media right-click menu** (capture-phase, `_mediaCtxMenu`): Copy Image /
  Save Image / Save GIF / Save Video / Save Audio / Save Sticker / Copy Link /
  Collect GIF, on chat images (`.ftz-chat-img`), `.ftz-embed-gif`, stickers,
  `.ftz-vp` video, `.ftz-ap` audio, lightbox.
- **FortGified built-in bot**: right-click image message → Bots → Convert to
  GIF. Real single-frame GIF89a encoder in-app (`_encodeCanvasAsGif`:
  median-cut palette + LZW; VERIFIED decodable in Chromium, avg err 1.24/255).
  Posts persisted everyone-visible reply as `fortgified` in DM/GC/channel
  (`_fortgifiedPost`; `sendDMMessage` gained `opts.senderName`). Renders with
  `/FortGified-PFP.png`, display name FortGified, blue `.ftz-app-capsule`,
  zero DB lookups; in `MANUAL_BOTS`. Gate: `ch.botsDisabled` (setting itself
  not yet built — bot-system redesign later).
- `docs/dms-optional-columns.md` — SQL the USER must run for the dms table
  warning (forwarded/reply_to/flags cols) + notes on cookie/avatar/embed noise.

**Still open (user's queue, in order):** ① console-errors cleanup remainder
(user runs the dms SQL; __cf_bm cookie + invalid-invite warn = no-op by
design); ② bare GIF links auto-embed in parseMD (Tenor/Klipy/Giphy page-URL →
media resolve; then simplify the editMsg/saveEdit FTZGIF unwrap path);
③ attachment corner hover controls (modify/download/collect/delete-one-token,
ties into `_splitFileTokens`). User feedback pending on: picker redesign look,
DM floating card, FortGified avatar rendering live.

**Shipped later this session (`2026fix312`–`314`):**
- **Emoji flicker FIXED** — removed `content-visibility:auto` from
  `.epp-section-grid`; it repainted every section from a placeholder height when
  the panel flipped `display:none`→visible (the open-flicker). Now eager-paints.
- **Avatars "disappear after some time" FIXED** — the cross-user realtime handler
  wrote `_pfpCache[user]=data.pfp` + `img.src` raw, guarded only vs KNOWN-blank;
  it missed the truncated 500-char corruption, so a stale broadcast poisoned the
  cache + blanked good avatars. New `_pfpLooksCorrupt()` (truncated OR known-blank
  + kicks an async probe) now gates that write and the member `existingImg`
  fast-path. Real cure still Media→Storage.
- **GIF link on edit (Discord-style)** — editing a linked GIF (`[FTZGIF:url]`)
  shows the bare URL + a live preview (`editMsg`/`saveEdit` unwrap→re-wrap);
  uploaded GIFs (`[FTZIMG:…]`) stay hidden. Superseded by NEXT-SESSION #2.
- **Chatbar icons** — sticker now the provided folded-corner SVG (chatbar + tab);
  ALL chatbar icons rest at **#b3b2b4** (topbar grey). The colour needed
  `.chat-input-actions .cit-*` specificity to beat `.chat-input-actions
  button{color:var(--muted)}` (verified computed fill = rgb(179,178,180)).

**Done THIS session (`2026fix311`) — full picker redesign to the locked spec:**
- **Built to the older session's locked spec + mockup** (`docs/picker-redesign.md`
  + `docs/picker-redesign-mockup.html` on branch `…-emxyxn`, `.pk-*` classes).
- **Emoji panel REBUILT** to the mockup shell (theme-aware): full-width rounded
  search (magnifier + clear ✕), `.epp-body` row [scroll grid | right rail], and a
  **Guilded footer** (`_eppFootSet`: hovered emoji preview + `:name: · Category`).
  Section headers → theme gradient fade; tabs → gold glow-underline; rail →
  accent-dim active + edge bar. Eager render preserved (no hydration race).
- **Sticker panel REBUILT to mirror emoji** (`openStickerPicker` +
  `_stickerGroups`/`_stickerSection`/`_stickerRailBtn`/`_wireStickerHover`): per-
  bastion **sections** in `.epp-scroll`, a **right rail** of bastions
  (`_stickerRailJump`), search (flat filtered + rail hidden via `.spp-searching`),
  hover footer. Cells `.spp-sec-grid` (4-col).
- **Chatbar buttons** rebuilt as inline filled FA SVGs (`.cit-ico`,
  `fill:currentColor`, sized by height): `+`=fa-plus (now a real button like the
  others), GIF=fa-film (same as panel tab), sticker=fa-note-sticky, emoji=the
  provided fa-face-smile, bots=the provided fa-robot (viewBox `0 -40 640 552` so
  the antenna isn't clipped). `randomizeChatbarEmoji` hover-swap normalised
  (consistent height / width:auto / currentColor — fixes the old size/squareness
  bug). Picker tabs use the identical inline SVGs (`.pt-ico`).
- **Pickers follow the appearance theme:** `.chat-picker-base` +
  `.emoji-picker-panel` bg = `var(--panel)`; search/rail/footer surfaces use
  `var(--bg)`/`var(--panel2)`; all rewritten live by `applyAppearance`.
- **Avatars:** self + member-list + DM-topbar render paths confirmed routed
  through `buildAvatarHTML` (message rows, replies, `.gc-ml-av`/`.ml-av-wrap`,
  `#rail-ub-avatar`, `_navPfp`, `_dnAvHtml`, DM `#dm-rt-av` initial+enrich).

**Done earlier this session (superseded pieces kept for history):**
- **Tabbed picker redesign shipped.** The four chat pickers now live under ONE
  shared 4-tab bar — **GIFs / Stickers / Emoji / Bots** (`_pickerTopTabs`,
  `_switchPickerTab`). Bots is now a first-class tab (`openBotCommandPanel`
  carries the bar + `_botcmdInput`; context inferred from the input id).
  - **FontAwesome tab icons** (`fa-film`/`fa-note-sticky`/`fa-face-smile`/
    `fa-robot`) — `currentColor`, so the active tab's icon turns gold.
  - **Solid background, NO `backdrop-filter`** on `.chat-picker-base` +
    `.emoji-picker-panel` (`--pk-bg,#171a22`) — this was the emoji flicker.
  - **Emoji panel restructured to a column**: full-width tab bar on top, then a
    `.epp-body` row of `[.epp-main grid | .epp-sidebar right icon rail]`, then a
    Guilded-style `.epp-footer` (`#epp-hover-label`) showing the hovered emoji.
  - All four panels unified to **460px** + same chat-input anchoring so
    switching tabs never resizes/jumps the popover.
  - NOTE: did NOT rebuild `buildEmojiPicker` from scratch — the grid already
    eager-renders every section (`_wireEmojiLazyHydrator`), so the flicker +
    "not every emoji loads" race the old handoff wanted fixed was already gone.
    Reskinned the working eager-render instead. (The `panelkit.html` mockup was
    lost with the old scratchpad; rebuilt from the spec in this file.)
- **Avatar render paths routed through `buildAvatarHTML`** (priority 2). Raw
  `<img src=pfp>` self/member renders only recovered *truncated* data-URLs (via
  onerror); valid-but-transparent PNGs loaded clean and showed an invisible
  circle. Converted: rail userbar self-avatar (`#rail-ub-avatar`, 34), settings
  ID-tile self (`_navPfp`, 42), display-name preview (`_dnAvHtml`), member-list
  row (`.gc-ml-av`, 30) + DM/member rows (`.ml-av-wrap`, 34, both crop + plain
  render branches). LEFT raw (not the reported bug, higher conversion risk):
  bot avatars (`bot.avatar` — not user pfps), forum author avatars
  (`author_pfp`, separate DB field), trade/staff-dossier/reseller, and the
  member-row `existingImg` fast-path (preserves the decoration overlay). The
  permanent cure is still Media→Storage.

**Done earlier (chat pickers + avatar):**
- Chat GIF panel: Discord **masonry** (natural aspect ratios via CSS `columns`
  on an inner `.gif-masonry` wrapper inside the vertical scroll container),
  category-click = search, 26 cards (24 categories + Trending + **Collection**,
  the renamed Favourites — you "collect" GIFs), FA icons, previews = 1 random
  GIF per category (throttled 3-at-a-time, session-cached).
- Chat GIF embeds show full natural ratio (`.ftz-embed-gif img` →
  `object-fit:contain`, no square crop).
- All 4 pickers: robust click-outside-to-close (`_bindPickerOutsideClose`);
  sticker/botcmd chatbar buttons now use the global `data-tip` tooltip.
- **Emoji/sticker info card** (click an emoji in chat/bio/forum) redesigned
  Discord-style (`_showEmojiTooltip`/`_showStickerTooltip`, `.emoji-tooltip`
  `.et-*` classes): preview tile + `:name:` + type chip + description + "This
  emoji is from" bastion footer.
- **Avatar corruption ROOT CAUSE fixed** (`2026fix299`): a 500-char truncated
  data:image looped between clients (echo → `_acceptIncomingPfp` accepted
  non-PNG blindly → CU poisoned → re-written). Guards now reject too-small
  data:image on BOTH incoming (`_acceptIncomingPfp`) and outgoing
  (`saveUserObject`) sides; `buildAvatarHTML` renders the initial letter for
  corrupt pfps everywhere; `_healBlankAvatar` backs up the last-good avatar to
  `localStorage.ftz_good_pfp_<user>` and restores+re-pushes it on boot.
  **The real cure is still the Media→Storage rollout** (see Open items) — the
  write keeps getting dropped by egress throttling so the DB row stays corrupt.

**NEXT SESSION — LOCKED priorities (user, verbatim intent):**
1. **Completely rework & REDESIGN the Stickers, Bot-commands, and Emoji tabs.**
   The user wants a full redesign — the current `.pk-*` pass (this session) is
   NOT what they want; treat it as a starting point, not the target. Ask them
   for the reference/mockup up front (they may provide one, like the emoji
   `docs/picker-redesign-mockup.html`). Current code to replace/evolve:
   `buildEmojiPicker` (+ `renderEmojiGrid`/`buildEmojiSidebar`/`_eppFootSet`),
   `openStickerPicker` (+ `_stickerGroups`/`_stickerSection`/`_stickerRailBtn`/
   `_wireStickerHover`), `openBotCommandPanel` (least-designed — still the flat
   `.botcmd-*` list; needs the most work). All share `_pickerTopTabs` /
   `_switchPickerTab`. Keep egress rules + eager render.
2. **All GIF LINKS must embed** (Tenor, Klipy, giphy, others). Today ONLY the
   Klipy-picker token `[FTZGIF:url]` embeds (`parseMD` ~app.js:33726); a bare
   gif/tenor/klipy link pasted as text just auto-links, it does NOT embed. Add a
   bare-URL → GIF-embed detector in `parseMD` (tenor.com/view/…, klipy.com/gifs/
   …, giphy.com/gifs/…, direct `.gif`/`.mp4`). Tenor/Klipy *page* URLs need
   resolving to the media URL (Tenor API/oembed; Klipy client already exists —
   see `_klipyGifUrl`/`KLIPY_BASE`). NOTE: this session added Discord-style
   "show the link when editing a linked GIF" (`editMsg`/`saveEdit`, re-wraps
   `[FTZGIF:]`) — once bare links auto-embed, that edit path can be simplified.
3. **Attachment/file corner controls** (hover actions in the corner of each
   file/attachment): modify attachment, download (video/audio/file), collect GIF
   (the star/`saveFavGif` already exists on `.ftz-embed-gif` via
   `.chat-gif-fav-btn` — extend the pattern), and DELETE just the attachment when
   it's sent alongside text (remove the one token, keep the caption — ties into
   `_splitFileTokens` + `editMsg`/`saveEdit`). Render sites in `parseMD`:
   `[FTZIMG:name|url]` (~33797), `[FTZVID:…]` (~33817), `[FTZAUD:…]`,
   `[FTZFILE:name|size|url]` (~33890), and the `.ftz-embed-gif` blocks.

**Also still open (lower priority):** Media→Storage rollout (the real avatar +
egress cure, USER-side — `localStorage.ftz_media_storage='1'` → flip
`_mediaStorageEnabled()` → run `tools/migrate-media-to-storage.mjs --commit`);
remaining raw avatar paths (forum `author_pfp`, trade/staff/reseller tiles).

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

## Staff console redesign (IN PROGRESS — finish ASAP)

Goal: one cohesive, staff-first console. **Finish it the fastest reasonable
way** — most pages already sit on the shared component system, so prefer
uniformizing over from-scratch rebuilds. Cache-bust as of this note:
`2026fix293`.

Shared design system already built (reuse it, don't reinvent):
- Shell = the SETTINGS modal. `#sc-nav` is a real `.profile-nav` (identical to
  settings). Page header = `.sc-head`/`.sc-head-title`; every title icon
  inherits the text colour (`.sc-head-title i{color:inherit}`). Page title must
  equal its navbar label.
- Command Center (dashboard): `.sc-cc-*`, `.sc-cmd` (⌘K → openStaffPalette),
  `.sc-queue`/`.sc-qcard` attention cards, `.sc-pulse`/`.sc-ptile`,
  `.sc-feed`/`.sc-fe`, `.sc-qa`/`.sc-qab`.
- Data pages: `.sc-card`, `.sc-table-header`, `.sc-row`, `.sc-btn` variants,
  `.sc-input`/`.sc-select`. Inspect opens the slide-in **drawer**
  (`.sc-drawer`, `adminInspectUser`→`_openInspectDrawer`); all Inspect buttons
  route through it.
- Moderation action modals: `_scActionCard({icon|iconHTML,accent,title,fields,
  confirmLabel,danger,onConfirm})` — used for ban/warn/suspend/give_onyx/
  radiance. `.sc-act` = colour-coded subject action buttons.
- Subject dossier Intel = `.sc-dossier-grid` + `.sc-intel-grid`/`.sc-intel`.

DONE: Command Center, sidebar=settings, unified headers, Users table+inspect
drawer, User Lookup buttons+action cards, Subject Intel, radiance-count bug
(bigint vs ISO — compare Date.now()), radiance icon (mono via `.sc-rad-mask`),
Broadcasts→**Ad Emplacements** rename, Global Monitor uniformized.

STILL TODO (in order, fast): Ad Emplacements content, Content Review,
Feedback, Users list polish, Bastions, **Reports** (wants one-at-a-time
review-queue archetype), Bans, Suspensions (subtab already exists under
Moderation), Economy, Statistics, a bit of Audit. These already use `.sc-*`
components — mostly polish/uniformize, only Reports needs the deeper
review-queue rebuild. Verify each with a Playwright plainview (FA + Google
fonts + external images are CDN-blocked in-sandbox → placeholders).

### Global Monitor — world-map rework (DONE)
Replaced the CDN D3/TopoJSON choropleth with a **self-contained zoomable
world map** (`renderStaffWorldMap`, app.js). Geometry ships as a same-origin,
SW-cached asset `app/world-map-data.js` (Natural Earth 1 paths keyed by
ISO-3166 alpha-2, generated from world-atlas 110m — public domain; regen
recipe lives in the scratchpad `mapgen/gen.js`). Features: wheel/drag
zoom-pan (viewBox-space transform on `.scmap__layer`), hover tooltip +
click-to-pin per country, choropleth via `_scMapFill`, and a continent
legend with **per-continent totals** whose chips zoom-to-bounds. Egress-lean:
counts come from `_scCountryCounts`, computed once by `_staffOpsRefresh` from
the already-fetched user list — the map never scans users itself. No external
tiles or CDN.

## Open items needing the USER (can't be done from the sandbox)
- **Media→Storage rollout** = the real egress + avatar-transparency + login-
  quota fix. Enable per browser: `localStorage.ftz_media_storage='1'`, test one
  account, then flip `_mediaStorageEnabled()`→true and run
  `tools/migrate-media-to-storage.mjs --commit`. See `docs/media-storage.md`.
- Confirm the console nav now matches settings live (15px FA icon fix); if not
  pixel-perfect, convert the nav icons to inline SVGs.

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
