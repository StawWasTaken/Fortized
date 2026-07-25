# Fortized — working notes for Claude

## 🔴 SESSION HANDOFF (as of cache-bust `2026fix402`)

Branch **`claude/safety-system-perf-gjrtso`**, mirrored to `main` (standing rule:
**mirror to `main` AND push the session branch every push**; bump cache-bust
`2026fixNNN` in `app/index.html` (9 refs) + `SW_VERSION` in `sw.js`; pre-commit
`node --check app/app.js && node --check FortizedSocial-supabase.js && node
tests/test-relationship.js` (42 pass)). **Sandbox can't reach Supabase OR the
GitHub CDN**, so perk art / wordmarks / the emoji icon / avatar-decoration /
styled names / the whole logged-in app need a LIVE eyeball on deploy — verified
here via Playwright with placeholder art only.

### ✅ Shipped this session (`388`→`402`) — big picture

- **RADIANCE PAGE — heavily iterated redesign** (the bulk of the session). Final
  state: NO crystal / no ambient FX (felt "AI"). **Avatar-forward header**: big
  avatar (104px, renders `CU.activeDecoration` overlay) + small secondary
  greeting + BIG styled display name (`_dmNameStyleAttr(CU)`). Greeting is
  time-based `_radGreeting()` (6–12 morning · 12–13 "Yum yum yum…" · 13–17
  afternoon · 17–21 evening · 21–03 night · 03–06 "Night owl…"). **Calm/premium/
  aerated**, centered `max-width`, off-white text. **Pink-primary identity**:
  `--rad-pink:#ef5fb0`; `--rad-grad` = pink→brand-yellow (buttons/best-value/
  gift/CTA). **All buttons = app 3D recipe** (`.btn-a`/`.btn-g` hard edge, press
  on `:active`), **NO outer glow** (user hates glows). **Status strip**
  redesigned into value/label segments (days-left · renews / balance · Cancel).
- **The Vault = flat 3-up carousel** (`.rad-carousel`/`.rad-ctrack`/`.rad-cslide`;
  JS `_radCarLayout`/`_radCarouselInit`/`_radCarouselPrev`/`Next`/`Go`,
  `_radCarTimer`). All THREE perks fully visible (flat, no coverflow overlap):
  active centred + big w/ pink stroke, both neighbours full beside it. Autoplay
  6.5s (pauses on hover). **Text OVERLAYS the art** (bottom scrim), clear of the
  centred icon. **Hover arrow bubbles** (`.rad-carr`, fade in on carousel hover)
  + slides clickable. Hover on centre grows it + thickens the pink stroke.
  5 highlighted perks use REAL CDN art (`_CDN` = SwiftawCDN/): `500mb%20upload
  .png`, `badge.png`, `emojis.png`, `banners.png` (image/GIF banners = Radiance-
  only), `earlyacess.png` (Early Access). Dropped "Name Effects & Colours"
  (Display Name Styles are FREE). Smaller list (`MORE`): Soundboard / Custom
  Cursors / 10% Discount / Starter Drops, consistent 1-line copy, no ellipsis.
- **Gift Radiance**: (1) the popup redesigned to the New-Message card style
  (`.nm-row`/`.nm-check` filling checkmarks; `toggleFriendSelection(i)` toggles a
  Set + row state; `openRadianceGiftModal`). (2) a Discord-style **banner**
  (`.rad-giftbanner`) with inspired title/copy, the `radianceText.png` wordmark
  in the title, and `RadianceShare.png` art on the right; extra top margin.
- **Topbars uniformized** (Friends + Radiance): 22px icon on both, smaller
  wordmark so the icon reads bigger. Friends = `FRIENDS` (Syne extrabold caps);
  Radiance = `radianceText.png` wordmark + logo tinted to text colour
  (currentColor mask). CSS `.rad-subnav-ico`/`.rad-subnav-word`/`.fr-subnav-brand`.
- **Default emoji icon → `EmojiSVG.png`** as a currentColor mask (`.ftz-emoji-ico`)
  everywhere: `_CHATBAR_EMOJI_SVG` (line ~10), `_ADD_REACTION_ICON_HTML`, the
  chatbar button. Chatbar hover still cycles pack glyphs (`randomizeChatbarEmoji`
  now also matches `.ftz-emoji-ico`).
- **GIF collections → per-account** (`fav_gifs` JSONB column — USER RAN THE SQL).
  Isolated `loadFavGifs`/`saveFavGifs` in supabase.js (excluded from
  `_USER_LIST_COLS`; http(s) URLs only, data: URLs stay local — egress).
  app.js: `_favGifs`/`_hydrateFavGifs`/`_persistFavGifs`, hydrated once in
  `refreshCU`.
- **Leafen = platform account like Joyster**: added to `SUPER_ADMINS`,
  `MANUAL_BOTS` (Bot badge + mentionable), `PROTECTED_NAMES`/`BOT_NAMES` (both
  data layers).
- **Uploads: 350 MB free / 500 MB Radiance** via Supabase Storage.
  `_addPendingAttachment` no longer base64-encodes files >4 MB (keeps the Blob +
  object-URL preview); `handleChatSend` uploads the Blob via
  `FortizedSocial.uploadFile` → `attachments` bucket, stores the URL. Small files
  stay inline. ⚠️ **USER ACTION: raise the `attachments` bucket file-size limit
  to 500 MB in Supabase** or uploads >50 MB (bucket default) fail.
- Earlier this session (still relevant): avatar transparent-in-DM-panel bug fix
  (`_pfpLooksCorrupt` guard on the realtime `.fpp__av` repaint); DM friends-home
  cleanup; home-rail yellow; greeting; etc.

### 🔧 LEFT TO DO / OPEN (next session)
1. **NEXT TASK — "14-day Radiance milestone reward" (spec complete):** when a
   user reaches **≥14 cumulative Radiance days purchased** (plans ADD days, they
   don't replace — e.g. two 7-day buys = 14), grant them a **FREE theme
   appearance they keep FOREVER** (even after Radiance lapses). The theme is a
   **soft pink** (Radiance-flavoured, but soft). TODO: (a) track cumulative days
   bought — add a counter (e.g. `CU.radianceDaysBought += days`) in
   `purchaseRadiance`/`buyRadiance`/gift-claim paths (NOT just the expiry); (b)
   on crossing 14, permanently add the theme to the user's owned/unlocked
   appearances (`unlockedAppearances`/owned list) + notify; (c) build the
   soft-pink appearance in the appearance/theme system (see the Fortshop
   appearance items + `applyAppearance`). Keep egress-aware.
2. **LIVE-VERIFY the whole Radiance page on deploy** (sandbox is Supabase+CDN
   blind): perk PNGs + `RadianceShare.png` + `radianceText.png` wordmark render;
   `EmojiSVG.png` chatbar/reaction icons; avatar decoration + styled display name
   in the header; carousel (flat 3-up, autoplay, hover arrows, click); gift popup
   + banner; GIF collection syncing across browsers; Leafen's Bot badge/perms;
   uploads once the bucket limit is raised.
3. **Deferred: Discord-style chat auto-scroll** — full pass NOT done (user only
   greenlit uploads). Gaps: short chats bottom-anchored (flex `margin-top:auto`
   on `.chat-msgs`) + a scroll-position "Jump to Present" pill across DM/GC/
   channel. Hot path — needs live verification.

### 🧭 Key anchors (this session)
Radiance render: `renderAtelierTab` `if (tab==='radiance')` block (`app/app.js`
~46213). Helpers just above `_renderShopItemCard`: `_radGreeting`,
`_radGoSection`/`_radSetActiveTab`/`_radBindScrollSpy`, carousel
`_radCarLayout`/`_radCarouselInit`/`Prev`/`Next`/`Go`. `FEATURED`/`MORE` arrays
+ `_CDN` inside the block. CSS: appended `RADIANCE …` blocks v1→v9 at the END of
`app/styles.css` (v9 = flat carousel + arrows; earlier `.rad-feature*` rules are
dead). Topbar markup: `#view-radiance` in `app/index.html` (`.rad-subnav` +
`.rad-subnav-word` img). Emoji: `_CHATBAR_EMOJI_SVG`/`_ADD_REACTION_ICON_HTML`/
`randomizeChatbarEmoji` + `.ftz-emoji-ico` CSS. Gift: `openRadianceGiftModal`/
`toggleFriendSelection`/`filterGiftFriends`/`updateGiftCost`. Data: `loadFavGifs`/
`saveFavGifs` (`FortizedSocial-supabase.js`, exposed ~line 3355); `_favGifs`/
`_hydrateFavGifs`/`_persistFavGifs` (app.js ~40511). Accounts: `SUPER_ADMINS`/
`MANUAL_BOTS` (app.js ~1035), `PROTECTED_NAMES`/`BOT_NAMES` (supabase ~737,
firebase ~82). Uploads: `_addPendingAttachment`/`handleChatSend` (app.js ~41513),
`uploadFile` (supabase ~2959). Plan doc: `docs/radiance-redesign.md`.

---

## 🔴 SESSION HANDOFF (as of cache-bust `2026fix379`)

Branch **`claude/safety-system-perf-wnedxw`**, mirrored to `main`. Standing rules
unchanged (egress-aware; mirror-to-`main` + bump cache-bust every push;
pre-commit `node --check app/app.js && node --check FortizedSocial-supabase.js
&& node tests/test-relationship.js` (42 pass); **the sandbox can NOT reach
Supabase, so the whole logged-in app can't be runtime-tested here** — structure
+ Playwright plainviews only; everything below needs a LIVE eyeball on deploy).

### ✅ Shipped this session (`368`→`379`) — big picture

- **Scrollbars, final state**: the custom **FtzScroll** JS overlay (rounded
  track + thumb capsule) is now **CHAT ONLY** (`_FTZ_SB_SEL = ['.chat-msgs']`).
  Everywhere else = the **native** scrollbar: slim, rounded full-capsule thumb,
  no track, tinted to `--muted-light` (same family as the chat overlay), not
  thick. Web pages (marketing/login/legal/etc.) use the browser DEFAULT
  scrollbar (removed the custom rule from `css/fortized-2026.css`). FtzScroll
  gained: adaptive thickness, ratio edge-gap (~10px), a `.chat-msgs` right
  gutter so message hitboxes stop before the bar, wheel-forwarding + track
  click-to-jump.
- **Chat date/time separators redesigned** (`_dateDividerParts` /
  `_dateDividerInner` / `_makeDateDivider` / `_makeGapDivider`,
  `_insertSeparatorIfNeeded`): tactile centred Syne PILL (depth, rounded, fading
  side-lines), Today/Yesterday/New-Year treatments (Today = faint yellow accent;
  brand yellow stays a spice), **same-day "breathing point" gap markers** after
  a ≥4h pause (`_DATE_SEP_GAP_MS`), midnight self-refresh via the 5s ticker.
  Inserted from EVERY live append path (send/receive/bot) so they appear
  instantly — the check lives inside `appendMessage` (after dedup) with a
  `skipSep` opt-out for the trickle-render + pagination callers. **No SVG icons**
  (user removed them) — text-only pills.
- **Left rail (navbar) REDESIGNED** (structure + `styles.css` ~83-166): top→bot
  = **Home (Fortized logo, colour-overlaid MASK)** → divider → bastions →
  **Discover** → **Create Bastion** (Discover+Create pinned under bastions).
  DMs/Radiance/Fortshop/Quests/Creator buttons REMOVED from the rail. Uniform
  44px buttons: idle = translucent-white fill + icon in text colour; **active =
  SOLID brand yellow, no gradient/glow, icon `#13161d`**. No left indicator bar.
  Bastion emblems uniformized (active = solid-yellow frame via inset emblem;
  unread = small white dot). Gotcha: the logo mask needs a **no-space filename**
  (`/fortized-logo.png`, added) AND `display:block!important` (the
  `.rail-btn span{display:none}` label rule was hiding it).
- **DM sidebar launchers**: after Friends, in order **Friends · Radiance ·
  Fortshop · Quests · Creator Hub** (`renderDMSidebar`). Radiance = its logo as a
  `.dm-nav-mask` colour-overlay; others inline SVG. Friends button →
  `showView('friends')`.
- **Pages restructured (deep)**: **deleted `#view-home`, `#view-forum`,
  `#view-atelier`**. Radiance/Fortshop/Quests/Creator are now their **own
  `#view-*` routes**, sharing ONE render host `#atelier-host` that showView
  **moves into the active page** (they still call `renderAtelierTab`/
  `switchAtelierTab` → `#atelier-content`; full per-page independence comes with
  each manual redesign). **Friends = the new home**, its own page separate from
  DMs; Fortized logo + DM-sidebar Friends button both open it. **Joyster + the
  "Did You Know" tips strip migrated** from home into `#view-friends`
  (`#home-dyk-strip` + Joyster mount; Joyster start/stop now keyed to `friends`).
- **Real URLs** (`_ftzRouter`): `/app/friends`, `/app/radiance`, `/app/fortshop`,
  `/app/quests`, `/app/creator` (+ `/app/messages`, `/app/discover`, `/app/bastion`).
  Default `/app` → friends; legacy `/app/atelier`→radiance, `/app/forum`→friends.
  `applyInitialRoute` loads the right view on refresh. `server.js` catch-all
  `/app/{*rest}` already serves all of them; added explicit no-cache routes too.
  `window._initialView='friends'`. `showView` aliases retired routes
  (home/forum→friends, atelier→radiance); `switchAtelierTab(tab)` navigates to
  the matching page if not already there.
- **Newsroom**: hand-curated to 4 — Grand Fortshop Updates, May Safety Report
  (real banner `/may-safety-report.png`), The Fortress Comes to Your Desktop
  (Launch), How We Handle Your Private Messages (Security) — all rewritten in a
  plain, human, NON-AI voice. **Removed the forum→article translator**
  (`forumBodyToHtml` + `loadForumAnnouncementPosts`) that was duplicating
  articles as "FROM ANNOUNCEMENT · FORUM"; only staff `loadAdminAnnouncements`
  remains as a dynamic source. Assets added: `fortized-logo.png`,
  `may-safety-report.png`.

### 🔧 LEFT TO DO / OPEN (next session)
1. **LIVE-VERIFY the whole restructure** (couldn't runtime-test — no Supabase in
   sandbox). Priority: the **Fortshop/Radiance/Quests/Creator pages render +
   the SHOP still lets you buy** (highest risk); the **Friends page** (Joyster +
   tips + friends list); nav between all pages + bastions; **real URLs refresh
   correctly** (`/app/radiance`, `/app/friends`, …); scrollbars (chat overlay vs
   native elsewhere).
2. **Manually redesign each page** (the user will pair): Friends (currently a
   placeholder: Joyster + tips + friends list), Radiance, Fortshop, Quests,
   Creator Hub. Once redesigned, give each its OWN content instead of the shared
   `#atelier-host` (remove the reparenting hack in `showView`).
3. **Remove the redundant DMs empty-state** `showDMFriendsHome` fallback once the
   separate Friends page is confirmed (it still renders a friends-home inside
   `#view-dms` when no DM is open).
4. Consider whether staff `loadAdminAnnouncements` should stay in the newsroom.

### 🧭 Key anchors (this session)
`showView` + `_ftzRouter` (routes/paths/applyInitialRoute) + `_currentView`;
`#atelier-host` reparenting in showView; `switchAtelierTab` (nav guard);
`renderDMSidebar` (launcher buttons); `updateSidebar`/`updateTopbar` (new
routes); `_startJoysterBubbles`/`getDYKHtml` (friends post-callback);
`_dateDividerParts`/`_makeGapDivider`/`_insertSeparatorIfNeeded`/`appendMessage`
(separators); `FtzScroll`/`_FTZ_SB_SEL`/`_ftzScrollRollout`; rail CSS
`styles.css` ~83-166 (`.rail-btn`/`.rail-brand-ico`/`.rail-bastion`), native
scrollbar block ~14625. Newsroom `ARTICLES` (4) + `loadAdminAnnouncements`.

---

## 🔴 SESSION HANDOFF (as of cache-bust `2026fix367`)

Branch `claude/safety-system-perf-pa19i0`, mirrored to `main`. Standing rules
unchanged (egress-aware; mirror-to-`main` + bump cache-bust every push;
pre-commit `node --check app/app.js && node --check FortizedSocial-supabase.js
&& node tests/test-relationship.js` (42 pass); verify UI via Playwright
plainviews — CDN/Supabase unreachable in-sandbox, so DM-sidebar/quick-switcher/
scrollbar visuals need a LIVE eyeball on deploy).

### ✅ Shipped this session (`353`→`367`) — big picture
- **Safety-system perf**: `runAutomod` context scan now caps to the last 20
  message rows (`_recentAutomodContext`) instead of scanning the whole DOM on
  every send.
- **AI moderation key FIXED + diagnosable**: `AI_MOD_KEY` (Groq) works; server
  trims the key + surfaces the real upstream error; **`GET /api/moderate/health`**
  does a live test call (never leaks the key). One key powers automod + Joyster.
- **Reactive Joyster** (homepage): real AI lines tied to what the user does
  (idle bubbles, button clicks, poking him), addresses by displayName, keeps
  "go touch grass!". Controls a bounded Onyx swing (**-4..+5** per reaction,
  **±15 net/user/day cap**, localStorage) + a persistent **relation** score
  (`joyster_rel_<user>`). Line-first `[[onyx=N relation=M]]` format (never
  leaks JSON). Debug: `ftzJoysterRelation()`, `ftzJoysterReact(d)`.
- **DM topbar avatar "disappearing" FIXED**: `_enrichDMHeader` no longer paints
  a throttled/empty profile read over a good cached pfp.
- **TACTILE PASS 1** (`styles.css` end, append-only): button press/hover/depth,
  non-selectable usernames, + the design-language section in CLAUDE.md.
- **Live relative timestamps**: today's recent messages tick "just now" (brand
  yellow) → "a few moments ago" → `14:35`; Yesterday `14:35`; older
  `20/07/2026 14:35`. `_fmtMsgTimeLabel` + 5s ticker `_tickMsgTimes`
  (only touches `.msg-ts-live`).
- **"Original message was deleted" now PERSISTS** across re-renders
  (`_deletedMsgIds` localStorage; undo un-records).
- **DM / FRIENDS SIDEBAR REDESIGN** (the big one — `.dmn` nameplates):
  search ("Find or start a conversation") + Friends button + section header
  (FA icons); 38px avatar + status dot; **subline = CUSTOM STATUS only** (blank
  if none, official accounts blank) — NEVER last message, NEVER a timestamp;
  display-name **colour/effects reveal only on hover or when you're in that DM**
  (font always) via `_dmNameEffect`; unread = **yellow dot** only; loading
  **skeletons** on cold load; less yellow overall (active rail/nav/search =
  white).
- **STATIC-FEEL cache** (`_dmScrollCache`, 30s TTL): navigating back restores a
  fully-hydrated HTML snapshot instantly — no reload flash, no reshuffle; an
  already-visible sidebar refreshes IN PLACE. Sort by last activity; a row
  bumps to top **only on a genuinely newer message, never on open**
  (`_updateDMSidebarForNewMessage` guards `ts > prev`). Invalidate with
  `_invalidateDmSidebarCache()`.
- **Unified New Message picker** (no tabs): tick 1 → DM, tick 2+ → group chat
  (auto-named, ≤10). `createGroupChat(members, name)`.
- **Context-menu icons → FontAwesome 6 SOLID** (`_ctxIcons`, whole ctx system).
- **Quick Switcher** (`_openQuickSwitcher`, Ctrl/Cmd+K or the sidebar search):
  Fortized-original jump card — searches DMs, GCs, bastion channels (tagged with
  where they're from) + a Hidden section to reopen; **signature hand-drawn
  arrows** (thin, opaque, gentle bob) MUST stay. Solid overlay (not blur).
- **`FtzScroll`** — a JS overlay scrollbar module built from the user's template
  (rounded light track + brighter thumb, draggable). Currently attached ONLY to
  the quick-switcher results. Native slim scrollbar (white, no arrows,
  `scrollbar-width:thin`) is the app-wide default.

### 🔧 TO-DO / OPEN (next session, in priority)
1. **NAVBAR (rail) REDESIGN — user will guide MANUALLY.** They rejected the
   auto reskin (it was reverted). Spec: much less yellow (only active/notif/
   Create), FA6 solid icons, tactile hover (scale+brightness), Syne. Structure:
   Friends/DMs as **default landing**; **remove Homepage top-level** and migrate
   its components (Joyster tips, ad/banner card, "Did You Know" strip) into the
   new home or Discover; **Atelier → a full Creator-Hub section** (Radiance
   Dwelling, Quests, Fortshop, Creator tools); keep the big + Create Bastion.
   Don't do it blind — pair with the user.
2. **Roll `FtzScroll` out app-wide.** `FtzScroll.attach(el)` or add
   `data-ftz-scroll` + call `FtzScroll.auto()`. Target `#sidebar-scroll`,
   `.nm-picker`, member lists, modal bodies — NOT `.chat-msgs` (hot/anchored,
   risky) without care. Each attach is layout-sensitive (overlay positioned to
   the host's box within a `position:relative` parent) → verify each LIVE.
3. **New-message sidebar freshness**: 30s cache TTL means a background convo may
   lag up to 30s; invalidation already fires on send/receive. Tighten if needed.
4. **Live-verify everything** (sandbox blind): DM sidebar redesign, static feel
   (home↔bastion↔back = no reload/reshuffle), skeletons, ctx FA icons, quick
   switcher data + arrows, scrollbars.

### 📋 Locked behaviours to respect
- **Design language = TACTILE/juicy** (see the dedicated section below): FA
  solid filled icons, **minimal yellow** (accent is a SPICE — active states,
  notifs, Create, unread dot ONLY), white-forward everywhere else, Syne
  medium-bold (not extrabold), rounded, satisfying press/hover.
- **DM nameplate subline = custom status ONLY** (blank if none; official
  accounts blank). No last message. No "2 days ago" timestamps in the list.
- **Display-name colour/effects** never show at rest in the DM list — only on
  hover or in the open DM. **Font always applies.**
- **DM order** = last activity; opening a DM must NOT bump it; new-message bump
  only when `ts > prev`. Keep the static `_dmScrollCache`.
- **Quick switcher**: keep the hand-drawn arrows; opens from sidebar search +
  Ctrl/Cmd+K; solid (non-blur) overlay like other modals.
- **Scrollbars**: slim, WHITE (not accent), no arrows. `FtzScroll` = the JS
  option (their template); native = the fallback.

### 🧭 Key anchors (app.js)
`renderDMSidebar` / `_dmScrollCache` / `_dmApplyActive` / `_invalidateDmSidebarCache`;
`_customStatusText` / `_dmLastRead` / `_setDmLastRead` / `_dmNameEffect`;
`_updateDMSidebarForNewMessage` / `_updateGCSidebarForNewMessage`;
`_fmtMsgTimeLabel` / `_tickMsgTimes`; `_deletedMsgIds` / `_markRepliesDeleted`;
`_ctxIcons` (FA); `FtzScroll`; `_openQuickSwitcher` / `_qsGather` / `_qsArrowsHTML`;
Joyster: `JOYSTER_REACT_SYSTEM` / `_joysterAIReact` / `_joysterApplyOnyx` /
`_joysterRelation`. Server: `/api/moderate` (+ `/health`), `/api/joyster`.

---

## 🔴 SESSION HANDOFF (as of cache-bust `2026fix335`)

Branch `claude/staff-console-world-map-vawn5l`, mirrored to `main`. Standing
rules unchanged (egress; mirror-to-main + cache-bust every push; `node --check`
app.js + supabase + 42 relationship tests pre-commit; verify UI via Playwright
plainviews — CDN/Supabase unreachable in-sandbox).

### ✅ Shipped this session (`2026fix327`→`335`) — big picture
- **GIF collections, unified**: one collect control everywhere (chat embeds,
  sent-attachment corner controls, media lightbox, GIF picker). Filled=collected
  (accent, always shown) vs outline; toggles; live-syncs every visible copy +
  the Collection tab. Collect button is TOP-LEFT on gifs (att-btn styled),
  controls top-right. `_gifCollectId`/`isGifCollected`/`toggleFavGif`/
  `_gifCollectBtnHTML`/`_syncGifCollectBtns` near `saveFavGif`.
- **FortGified bot**: TWO commands — Image to GIF (real uploaded images only, via
  `_msgFindConvertibleImage`) + Video to GIF (≤15s). Runnable 3 ways: right-click
  message, chatbar Bots panel, and the bot profile — the panel/profile ones arm
  a "pick a message" mode (`_fortgifiedRunFromPanel`/`_fortgifiedDisarm`). The
  invoking user can DELETE the bot's message (`_parseBotTrigger`/`_iTriggeredMsg`
  + `canDel` threaded through the action bar/more-menu/ctx-menu). Video encoder
  is async + bounded (240px/≤50 frames, yields between frames) so it no longer
  freezes. Special **bot profile** (`_fppRenderBotPanel`): brand-icon banner, bot
  badge, BOT tag, bot ID, "by @fortized", Description + Created On in one about
  card, runnable Commands. Bots are signup-reserved (`BOT_NAMES`) + mentionable.
- **Multi-attachment (up to 10)**: `window._pendingAttachments` array (+ legacy
  `_pendingAttachment` accessor). Preview = wrapping tray of uniform cards, per-
  card spoiler/modify/remove. "Too many uploads" modal at the cap. Upload shows
  a real message-row progress card (avatar+name+time+caption + bar).
- **Message media grid**: `_layoutMsgMedia` lifts media OUT of the inline text
  into `.msg-media-grid` BELOW the caption (fixes "text left / image right");
  multiples tile 2-col (≤4) / 3-col (5+) square cells. NOW ALSO re-applied on
  every edit/rerender path (saveEdit, edit-broadcast, `_attRerender`,
  `_liveUpdateMessage`) — editing used to drop the grid.
- **Lightbox gallery arrows**: ‹ › + "n/N" counter for multi-media messages
  (`_openLightboxFromImg` gathers `.msg-media-grid` siblings; `_galGo`, ←/→ keys).
- **Spoilers redesigned + un-frozen**: media spoilers render blur + SPOILER pill
  first-class (parseMD pre-pass); text spoiler = solid Discord block.
- **Tenor page URLs embed** via keyless iframe (`_tenorEmbedHTML`; v1 API dead).
- **Frozen-DM cure (two layers)**: (1) drafts only keep attachments ≤1.5 MB
  (`_draftSafeAtts`); (2) `_defuseHugeMedia` at the top of `parseMD` swaps a FTZ
  token carrying a >1.5 MB base64 data URL for a light `[FTZBIG:…]` "too big to
  display" card — a stuck 20-30 MB inline attachment no longer freezes the DM on
  open. User can then delete the offending message.
- **Delete button fix**: the FortGified pick-mode capture handler could stay
  armed and hijack every message click (incl. Delete) — now cancels on any
  control/outside click.
- **Reply polish**: replies always show a full header; reply preview shows an
  attachment icon (not the raw token, truncation-tolerant); reply bar matches the
  topbar colour + shows the target's display name/effect; a reply to a DELETED
  message now shows "Original message was deleted" + the Fortized brand icon
  (`_markRepliesDeleted`, `data-reply-to`).
- **DM profile sidebar**: clean rounded panel (16px), banner flush inside the
  round, NO shadow, NO brand yellow top-line (`.fpp--dm::before{display:none}`),
  flush-left (no dark gap "shadow"), small top/right/bottom inset.

### 🔧 LEFT TO DO / OPEN
- **Room topbar full-width (DEFERRED, needs care)**: user wants
  `#dm-chat-wrap .room-topbar` to extend RIGHT, *under* the DM sidebar, to the
  screen edge (full-width top bar with the sidebar on top of its right end).
  The topbar lives inside `#dm-chat-wrap` (flex:1, `overflow:hidden`) so it can't
  just be widened — needs a real layout change (lift the topbar to span
  `#view-dms`, or a full-width top strip + offset the sidebar/messages). Left
  undone to avoid breaking the delicate DM layout — confirm exact intent first.
- **Multiple VIDEO/AUDIO attachments don't tile** — only images/gifs go in the
  media grid (tiling a video player to a thumbnail makes it unusable). Fine for
  now; revisit if asked.
- **Live-verify (sandbox can't reach CDN/Supabase)**: the Tenor iframe embed, the
  upload-progress row, the "too many uploads" modal, the deleted-reply Fortized
  icon, and the rounded DM sidebar all render from app context the plainview
  harness can't fully reproduce — eyeball them once `335` deploys.
- **Undo-delete edge case**: undoing a delete does NOT restore reply-refs from
  the "Original message was deleted" state until a full re-render (minor).

### 📋 Locked behaviours to preserve
- Bots = our word (never "Apps"). FortGified: hidden from member lists, renders
  with `/FortGified-PFP.png` + blue BOT capsule, zero DB lookups, `ch.botsDisabled`
  gate. Collect state matches by URL first (back-compat w/ old slice(-16) ids).

---
### Older handoff (kept for history)
## 🔴 SESSION HANDOFF (as of cache-bust `2026fix334`)

**Shipped `2026fix334` (frozen-DM cure + delete fix + lightbox arrows + polish):**
- **Frozen DM that freezes ON OPEN**: a posted message carrying a 20–30 MB inline
  base64 data URL froze the render (40 regex passes over tens of MB + decoding a
  giant data URL). `_defuseHugeMedia` (top of `parseMD`) swaps any FTZ token
  >1.5 MB for a light `[FTZBIG:…]` placeholder → `.ftz-big-att` "too big to
  display" card. The DM opens; the user can then delete that message.
- **Delete button fix**: FortGified pick-mode left a capture-phase click handler
  armed that hijacked ALL message clicks (incl. Delete). Now it cancels on any
  click of a control/button/outside a message, and disarms after firing.
- **Upload-progress is now a real message row** (avatar + name + time + caption,
  then the "Uploading N Files" bar as the body) — `_showUploadProgress` takes a
  caption; `handleChatSend` passes the input text.
- **DM sidebar is now ROUNDED like Discord** (`border-radius:16px`, `margin:8px`,
  banner rounded top) — kept the no-shadow / no-yellow-line fixes.
- **Lightbox gallery arrows**: opening media in a multi-media message shows ‹ ›
  arrows + an "n / N" counter (`_openLightboxFromImg` gathers the `.msg-media-grid`
  siblings → `meta.gallery`; `_galGo` swaps `curSrc`, arrows + ←/→ keys).


**Shipped `2026fix333` (DM profile sidebar cleanup):**
- **DM profile sidebar (`.fpp--dm`) is now a clean flush panel** (Discord-style):
  removed the drop shadow, the floating 18px rounded-card look, the border, and
  the brand **yellow top-accent line** (`.fpp--dm::before{display:none}` — that
  was the "bug" at the top). Full-height, banner flush to the top, only a subtle
  left divider. Also removed the container's `background:transparent` + padding
  in `index.html` (that gap was showing the page through the rounded corner).


**Shipped `2026fix332` (media grid + upload UI + frozen-DM fix):**
- **Message media now renders BELOW the caption in a grid** (`_layoutMsgMedia`
  lifts `.ftz-att-wrap`/`.ftz-embed-gif`/`.ftz-spoiler-media` out of the inline
  text into `.msg-media-grid`): fixes "text left / image right"; multiples tile
  as even square cells (2 cols ≤4, 3 cols ≥5) via CSS grid + object-fit cover.
- **"Too many uploads" modal** (`_showUploadLimitCard`, `.ftz-uplimit-card`)
  replaces the 10-cap toast.
- **Upload-progress card** while a message's attachments upload
  (`_showUploadProgress` → `.ftz-upload-card`: file glyph + "Uploading N Files —
  size" + accent bar that fills per file + ✕). Wired into `handleChatSend`.
- **Frozen-DM fix**: a big base64 attachment stuck in a localStorage DRAFT froze
  the chat on every re-open. Drafts now only keep attachments ≤1.5 MB
  (`_draftSafeAtts`, `_DRAFT_ATT_MAX_LEN`); restore filters the same, so an
  existing oversized draft is skipped and the DM opens again.


**Shipped `2026fix331` (multi-attachment + collect/bot polish + mentions):**
- **Up to 10 attachments per message**: `window._pendingAttachments` array (back-
  compat `_pendingAttachment` accessor → first item). `openFileUpload` (multiple),
  drop, paste all push (cap `_ATT_MAX`=10). Preview = a wrapping tray of uniform
  Discord-style cards (`_attCardHTML`; per-card spoiler/modify/remove by index).
  `handleChatSend` loops all → joins tokens. Drafts store `attachments[]`.
- **Multiple media in a sent message tile** (`.msg-multi-media`, tagged in
  appendMessage when >1 img/gif) instead of a full-width vertical stack.
- **Collect button restyled to match `.ftz-att-btn`** and moved TOP-LEFT for every
  gif (aligned with the top-right download/modify/delete row; `--offset` removed).
- **Bot profile**: removed the badge card; name uses the plain in-chat style
  (`.fpp__name--plain`); Description + Created On combined in one about card;
  command rows are clean borderless list items.
- **Panel/profile commands pick a MESSAGE** now (`_fortgifiedRunFromPanel` arms a
  message-pick mode → click a message w/ media → converts first attachment;
  `_fortgifiedDisarm`, `.ftz-pick-hint`), not a file picker.
- **Signup rejects bot names** (`BOT_NAMES` in `isProtectedUsername`, supabase).
- **Bots are mentionable** (`_isMentionableHere` → MANUAL_BOTS); groundwork for
  future custom-bot mentions.


**Shipped `2026fix330` (collect overlap + bot-profile polish + panel commands):**
- **Collect button no longer sits under the download/modify/delete row**: the
  offset rule lost the cascade (`.ftz-att-ctrls{right:8px}` came later). Fixed to
  `.ftz-att-ctrls.ftz-att-ctrls--offset{right:44px}` (higher specificity).
- **Bot description shortened** to "Turns your images and short clips into GIFs."
  (`FORTGIFIED_DESC`).
- **Bot profile now matches user profiles**: Description + **Created On** share ONE
  `.fpp-card--about` card (separator between, like About Me + Joined); added the
  real **bot badge** (`.ftz-badge.badge-bot`, `/badges/bot.png`) in a badges card.
- **Bot command panel + profile commands are runnable**: both "Image to GIF" and
  "Video to GIF" now appear in the chatbar bots panel AND the profile, and clicking
  one opens a file picker → converts → posts (`_fortgifiedRunFromPanel(mode)` +
  `_botRunBuiltin`). Message right-click path unchanged.


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

## Design language — TACTILE / "juicy" (standing direction, applies to ALL UI)

Fortized must feel like a **premium native app** (modern Discord + Guilded +
the Roblox Player desktop app), NOT a website. Every new/changed UI is built to
this. "Tactile / juicy" = physical, responsive, satisfying: big clickable
areas, pleasing hover states, smooth-but-restrained motion, subtle depth
(3D/shadows), friendly filled icons. The opposite of flat, thin, sterile, webby.

Rules:
- **No webby feel**: avoid tiny elements, thin 1px hairlines, generic flat web
  UI. Elements should feel substantial.
- **Icons**: big, friendly, FILLED SVGs (FA6 solid or our custom set),
  substantial but not oversized. (See the FontAwesome rule below.)
- **Corners**: rounded everywhere, moderate-to-high radius — use the `--radius-*`
  tokens (8/12/16/22/pill).
- **Font**: Syne (`--font-display`) for titled/headline UI, **medium-to-bold
  weights (500–700). AVOID extrabold (800/900)** — the codebase is full of
  legacy `font-weight:800`; dial new work to ≤700 and reduce 800s when you
  touch a component.
- **Micro-interactions**: subtle, satisfying press + hover states on everything
  interactive. Buttons press DOWN on `:active` (translateY) and lift slightly on
  hover; important/primary buttons carry subtle 3D depth (raised edge + soft
  shadow). Motion is smooth but never over-the-top; reuse `--ease-out`.
- **Scrollbars**: big + visible + yellow accent (`--accent`), not thin/grey.
  (Base is set in styles.css "TACTILE PASS 1".)
- **Non-selectable** usernames/display names (they're labels, not copy targets).
  Real content (message text, bios) stays selectable.
- **Accent yellow (`--accent`, #fff93e / Swiftaw brand) is a SPICE**, not a
  base: use it on key interactive states and links ONLY, not large fills.
- **Dynamic touches** are welcome (e.g. the chatbar emoji button that cycles
  icons on hover) — used tastefully.
- Must read as "made by a big company": consistent, human, high-polish. No
  generic AI-looking output. Build features FULLY (real DB + logic, both sides),
  with proper empty/loading/hover/error states, and update related surfaces
  (homepage, docs, legal) to match. Analyze the existing design system first.

Implementation notes:
- Shared tactile base lives at the END of `app/styles.css` under
  "TACTILE PASS 1" (append-only so it can't disturb hand-tuned rules): yellow
  scrollbars, button press/hover/depth, non-selectable names. Extend it in
  further passes rather than scattering one-off styles.
- STILL TODO on the tactile rollout: retire legacy `font-weight:800`→700 across
  components; audit thin borders → softer/thicker; bigger hit areas on small
  controls; friendlier filled icons where Feather-style `ftzIcon()` remains.

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
