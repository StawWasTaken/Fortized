# Chat picker redesign — implementation recipe

**Goal:** one tabbed popover — **GIFs / Stickers / Emoji / Bots** — replacing the
four separate popovers. Discord layout, Guilded footer, Fortized dark-glass +
gold. Approved static mockup: **`docs/picker-redesign-mockup.html`** (open it in a
browser or Playwright to see the target; `.pk-*` classes are the reference).

Direction is LOCKED (confirmed with the user):
- One tabbed panel, tabs at top (GIFs/Stickers/Emoji/Bots), gold underline on active.
- Emoji uses a **right-side** icon rail (Discord layout, Fortized's side).
- **Guilded footer** on the emoji tab showing the hovered emoji (`:name: · Category`).
- **Solid background — NO `backdrop-filter`** (that was the emoji flicker cause).
- **FontAwesome** icons throughout (inline `<i class="fa-solid fa-…">`, the app
  loads FA app-wide; the mockup uses placeholder SVGs — swap for FA on build).
- The **GIF grid is already good** (Discord masonry, natural ratios — see
  `.gif-masonry` in styles.css). Do NOT rebuild it; just host it inside the shell.

## Files / functions involved (app/app.js unless noted)
- `toggleEmojiPicker(targetId)` — opens the emoji panel (`#emoji-picker`, class
  `.emoji-picker-panel`). Positioning + `.show` + `_bindPickerOutsideClose` live here.
- `buildEmojiPicker()` — **REBUILD FROM SCRATCH** on the new shell (see below).
- `buildEmojiSidebar()`, `renderEmojiGrid()`, `_wireEmojiLazyHydrator()`,
  `_hydrateEmojiSection()`, `_wireEmojiScrollSpy()`, `renderEmojiCell()`,
  `_showEmojiInfo`, hover preview (`_emojiHover`) — current emoji internals.
- `_pickerTopTabs(active)` + `_switchPickerTab(tab)` — the existing top-tab row and
  its switch logic (currently swaps between separate popovers). Rework so tabs
  switch the CONTENT inside ONE shell instead of opening separate elements.
- `openGiphyPicker(inputId)` — GIF popover (`#giphy-picker`, `.chat-picker-base`).
  Keep its masonry/`_loadCollectionPreviews`/`loadGiphyTrending`/`searchGifs`; move
  its markup into the shell body.
- `openStickerPicker(inputId)` — sticker popover (`#sticker-picker`). Re-skin grid.
- `openBotCommandPanel(inputId, context)` — bots popover (`#botcmd-picker`). Re-skin list.
- CSS: `app/styles.css` — add a `.pk-*` block (copy from the mockup), keep existing
  `.gif-masonry`, `.emoji-picker-panel` (drop its `backdrop-filter`).

## Shell structure (one popover, tabbed)
```
.pk (was .chat-picker-base / .emoji-picker-panel — solid bg, no blur)
  .pk-tabs        → 4 FA-icon tabs (GIFs/Stickers/Emoji/Bots), active = gold underline
  .pk-search      → rounded search (magnifier + input + clear ✕); placeholder per tab
  .pk-body        → flex row
     .pk-main     → .pk-scroll (the active tab's scrollable content)
     .pk-rail     → RIGHT icon rail — EMOJI TAB ONLY (categories); hidden on other tabs
  .pk-foot        → Guilded footer — EMOJI TAB ONLY (hovered emoji preview + name + tone)
```
Tab bodies:
- **Emoji:** `.pk-scroll` = sticky section headers (Frequently used / Collection /
  Fortized Guide / [bastions] / unicode categories) + `.pk-egrid` grids. `.pk-rail`
  = category jump buttons. `.pk-foot` = hovered emoji.
- **GIF:** `.pk-scroll` holds the existing collection view + `<div class="gif-masonry">`
  results (already built by renderGiphyResults). No rail, no footer.
- **Sticker:** grid of stickers (re-skin `.spp-*` into `.pk-egrid`-like cells).
- **Bots:** command list (re-skin `.botcmd-*`).

## Emoji rebuild — kill the flicker + "not every emoji loads"
Root causes to eliminate:
1. `backdrop-filter` on the panel re-composited during the entrance animation →
   **remove `backdrop-filter`, use a solid bg** (`#15171f`-ish), opacity-only fade.
2. Lazy hydration via IntersectionObserver raced the open animation → some sections
   never hydrated. **Eager-render ALL sections synchronously** while the panel is
   still `display:none`, THEN show (one rAF later). No IntersectionObserver for
   hydration (a scroll-spy observer for the rail highlight is fine — wire it AFTER
   content exists).
Preserve every feature: search, frequently-used, **Collection** (the renamed
favourites), Fortized Guide, bastion custom emojis, hover preview (drives `.pk-foot`),
click-to-insert, right-click-to-collect.

## Tab switching
Rework `_switchPickerTab(tab)` to keep ONE `.pk` element and swap only:
- active `.pk-tab`, the `.pk-search` placeholder,
- the `.pk-scroll` body (call the tab's render fn),
- show/hide `.pk-rail` + `.pk-foot` (emoji only).
Remember the last-open tab so reopening restores it. `_bindPickerOutsideClose(el, close)`
already handles outside-click for the shell — reuse it.

## Verify
- `node --check app/app.js && node tests/test-relationship.js` (42 pass).
- Plainview each tab via a Playwright harness against `/app/styles.css` (FA + Klipy
  are CDN-blocked in-sandbox → icons/gifs show placeholders; layout is accurate).
- Bump cache-bust (`?v=2026fixNNN` ×9 in app/index.html + SW_VERSION), mirror to main.
