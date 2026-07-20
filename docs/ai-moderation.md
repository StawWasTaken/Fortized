# AI moderation (automod, powered by a real model)

The automod has two layers:

1. **Local regex** (always on, instant, no key needed) — catches the clearest
   severe stuff (direct threats, "kill yourself" / "kys", "rape you", slurs,
   "I will doxx you"). This is the offline fallback and never needs the AI.
2. **AI layer** (optional, smarter) — a real language model that reads the
   **chat context**, not just one message, and judges intent: physical &
   psychological threats, encouraging self-harm, doxxing, hate, and
   **cyberbullying**. It powers report triage and (in Autonomous mode) live
   message review.

The model is called **server-side** (`POST /api/moderate` in `server.js`), so
the API key never touches the browser. It's provider-agnostic — any
OpenAI-compatible chat endpoint works.

## Enable it (free)

1. Get a **free API key**. Recommended: **Groq** (`https://console.groq.com`),
   which has a generous free tier and is very fast. (Google Gemini, Together,
   OpenRouter, or OpenAI also work — anything OpenAI-compatible.)
2. Add it to the server environment (e.g. your host's env vars or `.env`):

   ```
   AI_MOD_KEY=your_free_api_key_here
   # optional overrides (defaults shown):
   # AI_MOD_URL=https://api.groq.com/openai/v1/chat/completions
   # AI_MOD_MODEL=llama-3.3-70b-versatile
   ```

   For Google Gemini's OpenAI-compatible endpoint, set:
   ```
   AI_MOD_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
   AI_MOD_MODEL=gemini-1.5-flash
   ```
3. Restart the server. `GET /api/moderate` with a message will now return a
   verdict; with **no key set** it returns `{available:false}` and the client
   silently falls back to the local regex.

## How it decides

The endpoint asks the model to return JSON:
`{flagged, category, severity, action: none|warn|suspend, reason, confidence}`.

- **Report triage** (Control Room → AI report triage): `Assist` records a
  recommendation for the human queue; `Autonomous` warns + deletes clear-cut
  cases (suspensions/bans still go to a human).
- **Live messages** (only when AI mode = `Autonomous`): every sent message that
  passes a cheap pre-screen is reviewed with context; the AI can **warn or
  suspend** (never ban). Non-autonomous modes leave live messages to the regex.

## Cost / rate limits

To stay inside a free tier, the client only sends a message to the AI if it
contains *some* potentially-concerning token (`_AI_MOD_PRESCREEN`) — obviously
clean messages never hit the API. If you run a busy server and hit rate limits,
tighten that pre-screen or move to a paid tier / a self-hosted model (point
`AI_MOD_URL` at it).

## Tuning

- Local patterns: `_AUTOMOD_THREAT_PATTERNS` in `app/app.js`.
- The model's policy prompt: the `sys` string in the `/api/moderate` handler in
  `server.js`.
