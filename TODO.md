# Fortized — Master TODO

Merged from the three IRL lists ("What's Wrong?", "Redesigning things",
"Implementing new features") + the in-session carryover from the
profile/embed/staff-console redesign passes. Sorted by **priority**
within each tier, with rough **effort** estimates (S = afternoon,
M = a day or two, L = a week-ish, XL = multi-week).

Priority key:
- **P0** — blocking, breaks user experience or shipping
- **P1** — high impact, needed before public usage scales
- **P2** — meaningful polish / coherence work
- **P3** — nice-to-have, can wait

---

## P0 — Ship-blockers

These are the items that make the app feel broken or incomplete to a
new user. Should be hit first.

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 1 | **Chat: how it loads / how it works** | XL | The single biggest "will anyone actually use this" item — message load races, scroll jumps, infinite-scroll edges, draft loss, attachment retry, reply/edit/delete sync. Touches DM + GC + bastion channels. |
| 2 | **Bugs in Friends list (from DMs)** | M | Whatever's currently misbehaving in the Friends tab inside the DM view. Triage first, then fix. |
| 3 | **DM sidebar: fix + redesign** | M | Sidebar entries, ordering, unread surface, redesign for the new userbar/chatbar coherence. |
| 4 | **Forum-post real-time sync** | M | Need an entry point — likely a Supabase Realtime channel subscription on `forum_posts`. |
| 5 | **Game reviews — RLS in Supabase** | S | Apply the pending RLS policies to `game_reviews` so reads/writes don't bypass auth. |

## P1 — Foundations & coherence (do before "redesign sweeps")

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 6 | **Settings card — full redesign** | L | Currently messy, half-finished, doesn't match gamescard/profilecard treatment. Re-skin + finish unfinished panes. |
| 7 | **Navigation bar redesign** (Home / DMs / Discover / Forum / Atelier) | L | Too noisy, feels overloaded. Reshape information density — fewer top-level slots, clearer hierarchy. |
| 8 | **Activity system rework** (online / idle / dnd / invisible / offline) | M | Carried from earlier sessions. Distinguish presence vs custom status, fix auto-away race vs manual changes (`_resetIdle()` at `app/app.js:497`). |
| 9 | **Game activity + detector + 3.2.0 desktop-app link** | L | Wire the new desktop app's activity feed to the web profile / userbar. |
| 10 | **Supabase migrations to run** | S | Pending DDL:<br>• `alter table dms add column if not exists flags jsonb;`<br>• `alter table users add column if not exists staff_caps_extra jsonb;`<br>• `alter table users add column if not exists country_code text;`<br>• `alter table users add column if not exists region_code text;`<br>• `incidents`, `watchlist`, `v_country_user_count` (full DDL in Phase 1–9 commit). |
| 11 | **Backfill `country_code`** for existing users on next login | S | Inject in the login flow once column lands. |
| 12 | **Plug live-thread viewer** into the real read-only message mirror | M | Currently the staff watchlist live-thread is a placeholder. |
| 13 | **Server-side polls/forms persistence** | M | Today votes + submissions live in `localStorage` — invisible across devices. Move to Supabase tables. |

## P1.5 — Big systems still pending (heavy lift but high payoff)

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 14 | **Mobile redesign — make the whole app usable on a phone** | XL | Touches every surface: sidebar / userbar / chatbar / profile cards / settings / modals / staff console. Probably needs a dedicated mobile shell (collapsible sidebars, bottom nav, sheet-style modals) rather than reflowing the desktop layout. Should land BEFORE the rest of the redesign sweeps so they only have to be designed once. |
| 15 | **Staff Console — heavy redesign + reorder** | XL | Phase 1–9 shell exists; the legacy `#view-admin` pages still need to be migrated into the new shell incrementally. Also a "full revamp" pass deferred earlier. |
| 16 | **Bastion deep-review** (how it works, bugs, new features) | L | Audit the whole flow, file a sub-list of fixes, then execute. |
| 17 | **Bastion creation flow review** | M | Sub-audit of `#16` focused on the creation wizard. |
| 18 | **Easier bastion management / creation / editing / customizing + role icons next to display names** | L | Replace role tags with role icons (Discord-style, but free — Guilded used to do this). |
| 19 | **Group chats deep-review** | M | Same audit pattern as bastions. |
| 20 | **Memberlist redesign** (bastions + group chats) | M | Includes fixing how it actually works. |
| 21 | **Calls + Party Rooms** — fix + new features | L | Big surface; will need a separate breakdown. |
| 22 | **Inbox + system redesign** | M | The whole inbox surface. |
| 23 | **Notifications redesign** | M | Not everything done — finish the surface, polish the toast/feed/badge flow. |
| 24 | **Discover — Activities feature** | M | New feature; spec lives in your head — write it down before starting. |

## P2 — Visual / polish sweeps

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 25 | **App Homepage redesign** (fresh look + seasonal hooks) | L | Currently looks ugly per your note. |
| 26 | **Badges redesign** | S | Photoshop work — on you, not me. |
| 27 | **Page-by-page review of the whole app** | L | Full sweep, bug pass + UI polish. |
| 28 | **Userbar further polish** (beyond the recent pill rework) | S | |
| 29 | **Textchatbar further polish** | S | |
| 30 | **App-page general visual sweep** | M | |
| 31 | **"May updates"** | ? | Awaiting spec from you. |
| 32 | **Second topbar consistency** across pages | S | "Need to put a bit everywhere" — tell me which pages need it. |
| 33 | **Migrate `#view-admin` pages** into the new staff shell | M | (Subtask of #15 but tractable on its own.) |
| 34 | **Avatar transparency / typing-area / skeleton scroll selectors via Inspect UI** | S | Carried from earlier — quick targeted polish using the new inspector. |

## P3 — Nice-to-have / micro-polish

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 35 | **Bastion-invite embed** — collapse onto `_uniformEmbed` call | S | Currently has its own DOM. |
| 36 | **File-card embed** (`[FTZFILE:…]`) — migrate to `_uniformEmbed` | S | Wrapper picks up the look; clean migration would tighten it. |
| 37 | **Embed builders** — surface elsewhere (e.g. bastion announcements panel) | S | If you want polls/forms accessible from more places. |
| 38 | **Status-system follow-ups** if symptoms persist (rename "status" vs "custom status", `onDisconnect` retry on auth-change) | S | Sitting from earlier session. |
| 39 | **Loading-screen branch cleanup** | S | The `FortizedSocial`-undefined branch sets a label but never returns; works today but fragile. |

---

## Reference — recent session summary

For quick recall of what was just landed (not pending):

- Profile system rebuild (Profile Card modal, popovers, DM panel, Settings preview triple-card)
- Embeds — Fortized brand template across every link/video/audio/poll/form/bastion-invite, dominant-color extraction, no shadows, no left glow, userbar-surface matching
- Polls + Forms (auto-send like attachments, owner-only submissions viewer + CSV export)
- Userbar — real headset glyphs, input/output device popovers (Fortized yellow theme), brighter icons
- Staff Console Phase 1–9 (capabilities, inspector dock, Cmd+K, Live Ops, watchlist, incidents, world map)
- Inspector Pause vs Freeze split — Pause idles the picker; Freeze halts every event + CSS animation
- Modal backdrop unified at 60% black flat; per-card shadows removed
- New emojis `:pouting:` / `:lmfao:` / `:seagull_shut:` injected into Smileys + Nature picker tabs (not Fortized Guide)
- Note feature on profile cards is now inline (Discord-style, `(only visible to you)`)
- Bastion invite embed — Discord-/Guilded-like compact layout, yellow accent + green Join + red Invalid
