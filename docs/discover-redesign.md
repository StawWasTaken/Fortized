# Discover — redesign plan

**Status: awaiting approval. Nothing below is built yet.**
Edit this file freely — strike out what you don't want, add what's missing, and
I'll build exactly what survives.

---

## 1. What's wrong with the page today

Discover never got the treatment Radiance, the Fortshop and Quests got. It is
the oldest-looking page left in the app, and it isn't only a looks problem:

| | Today | Why it hurts |
|---|---|---|
| **Styling** | Inline `style="…"` on nearly every element, hand-rolled gradients, `onmouseenter="this.style.transform=…"` | Doesn't follow the appearance themes at all. Recolour the app and Discover stays the same. |
| **Buttons** | `.ftz-btn ftz-btn-accent`, custom pills | Not the 3D `.fs-btn` recipe. They don't press. |
| **Empty state** | `.ftz-empty` with a magnifier glyph | Every other page uses Heroic Search (`_ftzNotFound`). |
| **Badges** | OS emoji — 🟦 🟪 👑 🔥 💤 | We removed OS emoji everywhere else. They render differently per platform. |
| **🐞 Fake data** | `Math.max(1, Math.floor(mc * 0.3)) + " Online"` | **The online count is invented from the member count.** A bastion with 10 members always reads "3 Online" whether anyone is there or not. This is the one item I'd call a bug, not a style issue. |
| **Trending** | `memberCount >= 5` | A fixed threshold, not a trend. Nothing is measured over time. |
| **Categories** | 7 hardcoded tabs (`all/gaming/art/tech/social/music/education`) | **No bastion can actually set `b.category`** — there is no UI for it, so every tab except "All" is permanently empty. |
| **Sorting** | verified → members → oldest | Fine, but invisible. You can't change it. |
| **Featured** | Top 3 by member count, labelled "Trending" | Same list as the top of the grid, so the page repeats itself. |

**The two blockers before any of this is worth doing:** categories and tags have
no authoring UI, and there is no presence signal per bastion. Both are addressed
in §4.

---

## 2. What we take from each reference

**Guilded (our favourite — the strongest structure).** Horizontal **rails** per
theme with a `View more` link and arrow paging, rather than one flat grid. Cards
lead with the emblem over a banner, then name, description, and a **two-number
stat line** (followers · members). A row of small game/tag glyphs with a `+34`
overflow chip. The primary action is a single yellow button in the card
(`Join` / `Apply`) — which is already our accent colour.

**Discord.** A big typographic hero with a category bar pinned to the top of the
page, and `Featured Servers` as a proper titled section below it. Their card is
banner → emblem overlapping the banner's bottom edge → name → description →
two dot-stats. Clean, and closest to what our `.bc` card already tries to be.

**Osmium.** Centred hero with the search bar as the hero's main event, and
**tag chips on every card**. Their cards are equal-height with the button pinned
to the bottom, which is why the row reads as tidy even with descriptions of very
different lengths.

**What we do NOT take:** Discord's giant marketing headline (we're an in-app
page, not a landing page), and Osmium's "powered by" strip.

---

## 3. The proposed page

Built entirely from parts the app already has — no new visual vocabulary.

### 3.1 Topbar
Keep `.disc-subnav` (it's already the shared page-topbar component). Tabs become
**Browse · Featured · My Bastions**, matching how the Fortshop subnav works.

### 3.2 Hero
Replace the current `.disc-hero` with the **`.qst-banner` + `.qst-crest`**
treatment used by Quests, and the same cover-fade ramp the Fortshop hero uses
(the 15-stop `color-mix` smoothstep in `var(--channel)`, so the art dissolves
into the page instead of banding).

- Crest, eyebrow (`DISCOVER`), title **"Find your people."**
- `.qst-bstat` pills: **N communities · N members · N joined by you**
- The **search field is in the hero**, Osmium-style — our `.fr-search` component
  at a larger size, placeholder *"Scout the realm…"*

### 3.3 Filter row
Replaces the seven dead category tabs.

- **Category chips** driven by categories that actually exist in the data, so a
  chip is never empty. `All` always present.
- **Sort** via `_ftzSelectHTML` (the settings dropdown, same as the Fortshop):
  Most members · Newest · Most active · A–Z
- **`Joined` toggle** — `.stf-toggle`, to hide bastions you're already in

### 3.4 Rails (the Guilded structure — the core of the redesign)
Instead of one flat grid, the Browse tab becomes stacked horizontal rails, each
a `.qst-group` header + a horizontally scrolling row with `.fr-act` round arrow
controls and a `View all` link that drops into the full grid filtered to it:

1. **Featured** — staff-picked. Uses the `featured` flag the bastion dossier in
   the console already writes (it exists and nothing reads it today).
2. **Rising** — real growth, see §4.2.
3. **Verified** — bastions with the verified badge (and after this round,
   bastions are the *only* thing that can be verified).
4. **Fresh arrivals** — created in the last 30 days, so a new bastion gets a
   window of visibility instead of being buried under member count forever.
5. **One rail per live category** — Gaming, Art, Tech, …

Searching or picking a filter collapses the rails into **one responsive grid**
(the current `.bastion-grid`, restyled). Heroic Search on no results.

### 3.5 The card — rebuilt as `.disc-card`
Same shape as Guilded/Discord, our materials:

```
┌──────────────────────────────┐
│ banner (16:9, object-cover)  │  ← boost tier chip, top-right
│                              │
│   ┌────┐                     │
└───│emb │─────────────────────┘  ← emblem overlaps the banner's bottom edge
    └────┘  Name ✓verified
    tag · tag · tag              ← real chips, max 3, `+N` overflow (Osmium)
    Description, clamped 2 lines
    ─────────────────────────
    ● 128 members  · Active     ← honest stats only, see §4.1
    [       Join        ]        ← .fs-btn--primary, pinned to the bottom
```

- 2px `var(--border)` on `var(--panel)`, `--radius-lg` — the inbox/console card
  language, not the current translucent yellow-tinted gradients
- Hover: the `.fr-row` lift, `stfRowIn`-style staggered entrance with
  **`animation-fill-mode: backwards`** so the hover lift survives
- Already joined → the button becomes a neutral **`Open`** that jumps straight
  in, rather than a decorative "✓ Joined" tag you can't click
- **No glows.** No OS emoji anywhere.

---

## 4. The data work (this is what makes it real, not a reskin)

Three of these are what separate a redesign from a rework. All are egress-safe —
they read data the page already fetches, or write one small row.

### 4.1 🐞 Kill the fake "Online" number
Delete it. Two honest options, pick one:

- **(a) Ship without it** — show `N members` and an **Active / Quiet** state
  derived from the bastion's real last-message timestamp. Zero new reads.
- **(b) Real presence** — count members currently online from the presence data
  we already hold. Accurate, but only for members the client has presence for,
  so it under-reports.

**My recommendation: (a).** "Active" from a real timestamp is truthful; a
precise-looking number that is under-counted is worse than no number.

### 4.2 Rising = actual growth
Store a **weekly member-count snapshot** per bastion (one small `admin_kv` row
for all bastions, written once a day by whoever loads Discover first — not per
user, not per bastion). Rising = biggest 7-day delta. Until a week of history
exists the rail hides itself rather than faking it.

### 4.3 Categories + tags need an author
Add **Category** (one of a fixed list) and **Tags** (up to 5, free text) to
**Bastion Settings → Overview**. Without this the filters can never work, and the
tag chips in §3.5 have nothing to show. Staff can also set them from the bastion
dossier in the console.

---

## 5. What I'd leave alone
- **Activities** — the sub-page and its permission cards are recent and good. It
  keeps its tab and only picks up the new card material.
- `promptJoinPublicBastion` and the whole join flow — untouched.
- The `_extractCardColor` dominant-colour trick — it's nice, it stays.

---

## 6. Open questions for you

1. **Rails or grid?** I've proposed Guilded-style rails with a grid on
   search/filter. Say the word if you'd rather it stay one grid throughout.
2. **The Online number** — (a) drop it for Active/Quiet, or (b) real presence?
   I recommend (a).
3. **Category + tag authoring in Bastion Settings** — in scope for this round,
   or a separate one? The filters are dead until it lands.
4. **Featured** — staff-picked from the console (my assumption), or automatic?
5. Anything from the three screenshots I've under-weighted?

---

## 7. Suggested order of work

1. Card + hero + filter row on the app's components (pure visual, no data)
2. Rails structure + Featured/Verified/Fresh (data we already have)
3. Category + tag authoring in Bastion Settings → the filters go live
4. Rising snapshots (needs a week of data before the rail appears)
