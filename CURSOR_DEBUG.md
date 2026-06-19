# Fortized Custom Cursors — Not Replacing the System Cursor

## What we want
Two cosmetic cursor sets the user picks from `Settings → Appearance`:
- **Knight** (default) — gauntlet PNG
- **Fortizan** — plain hand PNG

Each set has two PNGs: a normal pointer and a "clickable" variant
that swaps in over interactive elements. PC only — phones / tablets
fall back to the platform default via `@media (hover:hover) and
(pointer:fine)`. Free for every user, no entitlements.

## How it's wired right now

### Boot (app.js, near the appearance settings tab)
```js
const _FTZ_CURSORS = {
  knight: {
    normal:    'https://raw.githubusercontent.com/StawWasTaken/Swiftaw/refs/heads/main/SwiftawCDN/FTZCursors/FTZKnightCursor1.png',
    clickable: 'https://raw.githubusercontent.com/StawWasTaken/Swiftaw/refs/heads/main/SwiftawCDN/FTZCursors/FTZKnightCursor2.png',
  },
  fortizian: {
    normal:    'https://raw.githubusercontent.com/StawWasTaken/Swiftaw/refs/heads/main/SwiftawCDN/FTZCursors/FTZFortizianCursor1.png',
    clickable: 'https://raw.githubusercontent.com/StawWasTaken/Swiftaw/refs/heads/main/SwiftawCDN/FTZCursors/FTZFortizianCursor2.png',
  },
};
function _applyFortizedCursor(id) {
  if (!_FTZ_CURSORS[id]) id = 'knight';
  try { localStorage.setItem('ftz_cursor', id); } catch (_) {}
  const html = document.documentElement;
  Object.keys(_FTZ_CURSORS).forEach(k => html.classList.remove('ftz-cursor-' + k));
  html.classList.add('ftz-cursor-' + id);
}
// Apply at boot, before first paint.
(() => {
  try {
    const saved = localStorage.getItem('ftz_cursor') || 'knight';
    if (_FTZ_CURSORS[saved]) document.documentElement.classList.add('ftz-cursor-' + saved);
  } catch (_) {}
})();
```

### CSS (styles.css)
```css
@media (hover: hover) and (pointer: fine){
  html.ftz-cursor-knight,
  html.ftz-cursor-knight body,
  html.ftz-cursor-knight *{
    cursor:url('https://raw.githubusercontent.com/StawWasTaken/Swiftaw/refs/heads/main/SwiftawCDN/FTZCursors/FTZKnightCursor1.png') 4 2, default !important;
  }
  html.ftz-cursor-knight :is(
    a, button, [role="button"], [role="link"], [role="menuitem"], [role="tab"],
    [role="checkbox"], [role="radio"], [role="switch"], [role="option"],
    [tabindex]:not([tabindex="-1"]),
    summary, label, select,
    input[type="checkbox"], input[type="radio"],
    input[type="submit"], input[type="button"], input[type="reset"], input[type="file"],
    [style*="cursor:pointer"], [style*="cursor: pointer"]
  ){ cursor:url('https://raw.githubusercontent.com/StawWasTaken/Swiftaw/refs/heads/main/SwiftawCDN/FTZCursors/FTZKnightCursor2.png') 4 2, pointer !important; }

  /* (same block repeated for .ftz-cursor-fortizian with its two PNGs) */

  /* Keep I-beam over text inputs */
  html.ftz-cursor-knight :is(input:not([type]), input[type="text"], ..., textarea, [contenteditable="true"], [contenteditable=""]),
  html.ftz-cursor-fortizian :is(...){
    cursor:text !important;
  }
}
@media not all and (hover: hover) and (pointer: fine){
  .ftz-cursor-section-pc-only{ display:none !important; }
}
```

## What's happening when it fails
Even though:
- `<html>` has the class `ftz-cursor-knight` (confirmed via DevTools)
- The CSS rule has `!important`
- The catch-all wildcard `*` is in there to beat every inline `cursor:pointer`
- The PNG URLs are reachable in a browser tab

…the system cursor is **not** replaced. The cursor stays at the
platform default.

## Suspected root cause

### Most likely: PNG dimensions exceed browser limits
CSS `cursor: url()` has hard size caps:
- **Chrome / Edge**: ≤ 128×128 px (silently falls back to `default`)
- **Firefox**: ≤ 128×128 px (also silent fallback)
- **Safari**: ≤ 128×128 px (silent fallback)
- Some browsers won't honour images > 32×32 on Windows for legacy
  reasons even when the spec allows up to 128×128.

If the source PNGs at
`https://raw.githubusercontent.com/StawWasTaken/Swiftaw/refs/heads/main/SwiftawCDN/FTZCursors/FTZKnightCursor1.png` (and the other three) are bigger
than 128×128, every browser will load the URL successfully but
ignore the cursor and fall back to the comma-separated fallback
(`default` for the base, `pointer` for the clickable variant).
That matches the symptom exactly — no error, no console warning,
no network failure, just the default cursor staying put.

### Less likely but possible
- **Non-power-of-two dimensions** trip up some Windows builds.
- **PNG bit depth** other than 8-bit RGBA can be rejected.
- **Animated PNG (APNG)** — only animated cursors are
  unsupported.
- **CORS** is **not** the issue here. `cursor: url()` does not
  enforce CORS; the browser fetches as a same-origin-style image
  load. `raw.githubusercontent.com` serves `Access-Control-
  Allow-Origin: *` anyway.

## How to verify
1. Open the four URLs directly in a tab and check the displayed
   dimensions (Right-click → Properties / Inspect → Image
   info). If any are larger than 128×128, that's the cause.
2. In DevTools, hover any element and check the **Computed**
   tab → `cursor`. If it shows `url(...) 4 2, default` but the
   actual cursor is the platform arrow, the URL is loading but
   the image is being rejected. Definitive size issue.
3. In the Network tab, the PNG should appear as `200 OK`. If
   it's `200 OK` *and* the computed style is right *and* the
   cursor still doesn't swap, it's size or format.

## The fix
Re-export the four PNGs at **32×32** (or at most **64×64**) with
the hotspot point near the tip of the index finger. Save as
8-bit PNG with alpha. Re-upload to the same paths. No code
change needed once the source images are within the cap.

If higher-DPI is desired, ship 32×32 for SD and provide a
2× / 3× variant via `image-set()`:
```css
cursor:
  url('Cursor1.png') 4 2,
  url('Cursor1@2x.png') 8 4,
  default !important;
```
Browsers will pick the variant that matches the device pixel
ratio.

## Files involved
- `app/app.js` — `_FTZ_CURSORS` map, `_applyFortizedCursor()`,
  boot IIFE, and the cursor picker UI rendered inside
  `else if (tab === 'appearance')`.
- `app/styles.css` — `.ftz-cursor-knight` and
  `.ftz-cursor-fortizian` rule blocks inside the
  `@media (hover: hover) and (pointer: fine)` query, plus
  `.ftz-cursor-section-pc-only` hide on touch.
- App scope is enforced naturally: the class is only ever set
  on `<html>` by app.js running inside `index.html`, so nothing
  outside the Fortized SPA picks up the rule.
