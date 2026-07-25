# Radiance page redesign — plan

Status: **PLAN / not yet built.** This is the working spec for the next Radiance
redesign session. Pairs with the user.

## Direction (from the user)

- **Original.** Not copied from Discord or Guilded. The current page is a
  near-copy of Discord Nitro's "Explore What's New" card wall — that goes.
- **Premium, professional, tactile** — matches the standing design language
  (`CLAUDE.md` → "Design language — TACTILE / juicy"): filled FA6 icons, rounded
  `--radius-*`, Syne 500–700 (no 800/900), satisfying press/hover, subtle depth,
  accent used as a *spice*.
- **Gamer-oriented** userbase — should read like a premium in-game prestige /
  membership screen, not a webby pricing page.
- Three jobs: **Sell Radiance**, **Show my status**, **Perks explorer**.

## Concept — "The Radiance Prism"

Build the page around the logo itself (the pink→yellow refracting diamond),
treated as a **living crystal that charges with your membership**.

Mental model: a premium **gamer prestige screen** — a centerpiece artifact, a
status HUD, a perks vault, a plan selector. Dark, glassy, light-bloom + depth.

Same layout for members and non-members; only the *state* differs. For a
non-member the crystal is **dormant/dimmed** and activating it *is* the sell.

## Design decisions (defaults — user can veto any)

- **Centerpiece:** full **living Radiance crystal** — animated CSS/SVG prism
  (the logo's diamond) with a slow light-sweep that **visibly "charges" by days
  remaining**. Dormant for non-members. (Alt: refined static prism.)
- **Color:** keep the **pink→yellow** gradient as Radiance's identity (it's the
  logo) but **deepen/premium-ize it** — richer magenta→gold, real bloom, glassy
  dark surfaces — so it stops looking washed-out. Stays visually distinct from
  the app's plain brand yellow. (Alt: yellow/gold-forward, pink as spice.)
- **Remove** the two full-width `AtelierWorld.webm` video layers (heavy,
  `mix-blend-mode:overlay`, egress/perf) → replace with a self-contained CSS
  aurora/particle field.

## Page structure

1. **Prism Hero** — living crystal on the left. Right side:
   - member → "Welcome back · Radiance active"
   - non-member → "Ascend to Radiance" pitch + primary CTA (dormant crystal).
2. **Status HUD** (members) — tactile stat row: **days remaining** with a radial
   charge ring, **active since**, **auto-renew / cancel**, subtle **renewal
   streak**. Non-members: collapses to a compact "what you'd get" teaser.
3. **The Vault — Perks Explorer** *(net-new; today only shows 4 hardcoded)* — a
   rich grid of the **real** gated perks (traced in code, all behind
   `_hasRadiance`): Radiance Badge, Custom Emojis Everywhere, 100 MB Uploads,
   Animated Profile Banner, Custom Cursors, Soundboard, Name Effects/Colors,
   Starter Drops, 10% Fortshop Discount, Gift Radiance. Each card: filled FA
   icon, hover lift/tilt, a "how it works" micro-line, and an **Active/Locked**
   state driven by `_hasRadiance(CU)`.
4. **Plan Selector** — the three tiers (7/30/90 days) rebuilt as tactile "power
   cell" cards (per-day value + BEST VALUE flag), wired to the **existing**
   `purchaseRadiance(true, days, onyx)`. Economy unchanged.
5. **Gift Radiance** — kept, restyled into the flow (existing
   `openRadianceGiftModal`).

## Technical approach (low-risk, no economy/data changes)

- Rebuild **only** the `if (tab === 'radiance')` block in `renderAtelierTab`
  (`app/app.js` ~46081–46195). Quests / Shop / Creator untouched.
- Reuse plumbing verbatim: `_hasRadiance`, `_radianceExpiry`, `purchaseRadiance`,
  `cancelRadiance`, `openRadianceGiftModal`, `_stackFromExpiry`. **No
  `radianceUntil` / data-layer changes** (that column work is already done).
- Move styles out of inline soup into a dedicated **`RADIANCE PAGE`** block in
  `app/styles.css` (like the Friends redesign) — theme-aware, tactile tokens,
  Syne ≤700, FA solid icons. Keeps `renderAtelierTab` readable.
- Self-contained / egress-safe: CSS-only effects, local `/radiance-logo.png`,
  no CDN, no video.
- Stays inside the shared `#atelier-host` / `.atelier-content-inner` host
  (per-page independence is a later step per the handoff).

## Out of scope for this task (later)

- **10 evolving animated Radiance badges** — belongs to the **badge redesign**
  task. Generate them as animated SVGs from the logo; if not good enough, the
  user commissions Claude Design and drops assets in the repo. The Vault's
  "Radiance Badge" card is built to swap those in later.

## Verify + ship

- Sandbox is Supabase-blind: validate structure via
  `node --check app/app.js && node --check FortizedSocial-supabase.js && node
  tests/test-relationship.js` (42 pass) + Playwright plainviews of **both**
  member and non-member states (force `_hasRadiance` in a harness).
- Standard push: mirror to `main`, bump cache-bust (`2026fixNNN` ×9 in
  `app/index.html` + `SW_VERSION` in `sw.js`), push the session branch.

## Key anchors

`renderAtelierTab` radiance block (`app/app.js` ~46081); `_hasRadiance` /
`_radianceExpiry` (~154); `purchaseRadiance` / `cancelRadiance` (~51649/51688);
`openRadianceGiftModal` (~32612); `_stackFromExpiry` (~26445). Host markup:
`#atelier-host` / `#atelier-content` (`app/index.html` ~573). CSS: `.atelier-*`
(`app/styles.css` ~2382), `.disc-subnav` tabs (~2053).
