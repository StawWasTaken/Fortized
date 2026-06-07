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
