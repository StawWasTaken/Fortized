# Fortized — Swiftign redesign · what's left to do

_State on 13 jun 2026, after the first Swiftign pass on `/app`._

## House rules (carry into every session)

1. Push directly to `main` on `stawwastaken/fortized` (no feature branches).
2. **British English** everywhere — colour, behaviour, organise, customise, recognise, centre, favourite, grey, analyse.
3. Tone: lowercase, conversational, no em-dashes (only `-`).
4. Don't add "still A / still B / still C → punchline" copy beats.
5. Swiftign reference: `swiftaw.com/innovation-room` (Swiftign article) + `swiftaw.com` + `fortized.com` marketing pages + Pinterest Gestalt feel (rounded tiles, soft tinted panels).

## What's currently shipped on `/app`

| Layer | Status | Notes |
|---|---|---|
| Loading screen race fix | shipped | `utils.js` no longer force-shows `view-home` mid-init; `app.js` clears utils.js timer before installing its own. |
| Loader GIF tinted yellow | shipped | CSS filter (`sepia → saturate → hue-rotate`). |
| Loader retry button | shipped | Now a yellow 3D Swiftign sticker button. |
| Toast | shipped (v1) | Sticker treatment with hard offset shadow + slight tilt. |
| Offline banner | shipped (v1) | Sticker treatment. |
| Sidebar rail active state | shipped (v1) | Hard offset shadow on active rail buttons and bastions. |
| `.swf-*` utility classes | shipped (v1) | `.swf-chip.{tint}`, `.swf-btn-3d`, `.swf-sticker`, `.swf-tilt-*`. Available to drop into any new HTML/JS surface. |
| **Create Bastion modal** | shipped (v4) | **User explicitly liked this one. Use it as the reference for the rest of the redesign.** Sticker frame, gradient yellow title, tilted template tiles, sticker-chip vis-opt toggles, 3D `.btn-a` / `.btn-g`. |
| `.btn-a` / `.btn-g` global | shipped (v4) | All primary/ghost buttons across the app are now 3D Swiftign-style. |
| `.modal` global | shipped (v4) | All modals (not just Create Bastion) inherit the sticker frame. |

## What was tried and reverted

v2 and v3 layers were **reverted** because they:
- Targeted classes that don't exist (`.modal-card`, `.create-btn`, `.ftz-btn-primary`).
- Broad-brushed selectors with `!important` that destroyed per-area styling.
- **Forced yellow on profile buttons that should adopt the user's chosen theme colour.**
- Forced Syne / tilts on surfaces where it didn't fit (notification items, member rows, channel list).

The lesson for the next session: **work surface-by-surface, audit the real DOM classes first, never broad-brush.**

## What's left to redesign (in priority order)

### 1. Profile panel (`.fpp__*`) — must respect theme colour
The user has a theme accent colour. Buttons, accents, and chips inside the profile panel **must adopt that colour**, not hard-code yellow. Use `currentColor` / CSS custom properties from the panel's own `--theme-*` variables. Verify against:
- Own profile panel (`own-profile-panel.html`)
- DM profile panel (`dm-profile-panel.html`)
- Profile card (`profile-card.html`)
- `.fpp__*` selectors inside `app/styles.css`

Audit which CSS variable holds the user's accent, then make our overrides read that variable instead of `var(--accent)`.

### 2. Home view (`#view-home` / `.view-home`)
Currently still feels "Discord-like". Should feel like the Fortized marketing homepage:
- Yellow sticker hero with the Knight + rotating rings vibe
- Bento toolkit grid using `/Icons/*` art on each card
- Tilted feature stickers
- The "Bastions created on Fortized" live counter sticker
- Yellow outro card

Don't broad-brush — write a dedicated `.view-home` block with its own selectors.

### 3. Settings modal (all subpages)
Each settings subpage needs the sticker treatment, but **buttons inside settings that are user-theme-aware must keep theme awareness**.

Surfaces: Account, Profile, Privacy, Voice & Video, Notifications, Theme, Subscription, Sessions, Connections.

### 4. Bastion overview / settings
The bastion overview card on the home view of a bastion should be a yellow sticker on the Fortized banner backdrop (matches the marketing site's Ramparts panel pattern).

### 5. Server channel list
Subtle sticker active state, but don't add tilts or slide animations (v3 added those and they felt wrong in a dense list).

### 6. DM list / Friends view
Same — sticker active state only, no tilts on rows.

### 7. Other modals to align with Create Bastion's pattern
- Add Friend (`#modal-add-friend`)
- Join Bastion (`#modal-join-bastion`)
- New DM / Group Chat (`#modal-create-group-chat`)
- Forward Message
- Role Editor / Assign Role
- Leave Bastion Confirm
- Boost / Events / Overview modals

The `.modal` global sticker treatment from v4 already applies; check each one renders cleanly and doesn't need a tweak.

### 8. Message input bar + message rows
**LEAVE ALONE** unless explicitly asked. High-frequency, high-risk surface. Any change here can break the chat experience.

### 9. Mobile (≤720px)
All tilts and 3D shadows should soften. The marketing rule: ≤720px straightens cards. Apply same to `/app`.

### 10. Floating decorations
Lab article mentions "floating FontAwesome SVGs that gently bob between sections" — bring a small set into the home view + settings, not into chat.

## Architecture notes for the next session

- The `/app/styles.css` is **11,950 lines of densely-packed single-line CSS**. Editing in place is risky.
- All Swiftign work should append at the bottom (where v1 + v4 + keepers currently live) OR live in a separate `/app/styles.swiftign.css` file.
- Use **body-prefixed selectors** (`body .foo`) to outrank the packed rules above.
- **Audit the real DOM classes first** with grep on `index.html` and on `app.js` render functions. Don't guess class names.
- The cache-buster query string (`?v=2026swfn4`) needs bumping on every CSS / JS change so the service worker reloads.

## Files worth knowing about

| Path | What |
|---|---|
| `app/index.html` | Modal markup, sidebar, topbar, etc. The source of truth for which classes are actually rendered. |
| `app/styles.css` | The big one. Search by selector, never by line range. |
| `app/app.js` | 51k lines. Render functions live here. Search for the actual HTML strings to find selectors used at runtime. |
| `app/utils.js` | Loading screen safety timer. |
| `swiftaw.com/innovation-room` | The Swiftign article. Read it before starting. |
| `css/fortized-2026.css` + `fortized-2026.js` | Marketing-site Swiftign system. Reference. |

## Acceptance criteria for a "this feels Swiftign" pass

When the user reloads `/app`:
- Buttons feel 3D (hard offset shadow, press in on click).
- Modals feel like stickers (slightly tilted, sticker frame, hard offset shadow).
- Profile panel respects the user's chosen theme colour.
- Home view feels like a small version of the Fortized marketing site.
- Chat itself is untouched and still snappy.
- Mobile straightens the tilts.
- Nothing in the rest of the app feels broken or visually inconsistent.
