# Swiftaw Lifecheck — setup + what was broken

Lifecheck gates semi-important actions (quest Onyx claims, password/email
changes, security-key removal, Onyx code redemption). This is how it's wired
and what you still have to do by hand.

## What was broken

Two independent bugs, either one of which was enough to kill verification.

### 1. The site key was made up

`app.js` hardcoded `lc_fortized_public`. Real keys are issued on the Lifecheck
dashboard and always look like `lc_site_<12 chars>`.

That name failed in two ways at once:

- `lifecheck_issue_token` looks the key up in `lifecheck_keys` by exact match.
  `lc_fortized_public` isn't a row there, so it returned `NULL` — no token.
- The widget (`embed.html`) decided whether to even *ask* the server for a
  token with `/^lc_site_/.test(SITE_KEY)`. `lc_fortized_public` doesn't match,
  so the widget silently dropped into its local-preview mode, which only mints
  a token on `swiftaw.com` itself. Off-site it mints nothing.

Both paths end at the same dead end, which is the message you saw:

> Can't verify here. Lifecheck isn't set up for this site.

Adding the domain on the dashboard could never fix this — the allowed-domains
check runs *after* the key lookup, and the key didn't exist.

### 2. The server sent the wrong `apikey`

`server.js` called the verify RPC with `apikey: lc_fortized_public` — our
Lifecheck key in the header that the API host uses to identify the *project*.
That header has to carry Lifecheck's own public API key
(`sb_publishable_dqsqX2klo1j4xSyEFA7O1w_UjM8lEGf`), which is the same fixed
value for every Lifecheck customer.

The result is `401 Invalid API key` before the token is read, so
`/api/lifecheck/verify` would have failed even with a valid key and a valid
token. The Lifecheck docs said `apikey: LIFECHECK_PUBLIC_KEY`, which reads like
"your public Lifecheck key" — server.js followed the docs. The docs are now
fixed to show the literal value and call out the distinction.

## What you need to do

### 1. Create a real key

Go to <https://swiftaw.com/lifecheck/keys> and create a key:

- **Name**: `Fortized`
- **Allowed domains**: `fortized.com` (comma-separated for more). Subdomains
  are matched automatically, so `www.fortized.com` is already covered. Leave
  it empty to allow any domain. Add `localhost` if you want local testing.

  **Hostnames only — not URLs.** The allow-list is compared against the
  embedding page's `location.hostname`, which is bare (`fortized.com`). An
  entry pasted as `https://fortized.com` matched nothing and rejected every
  request, and the widget's error looked identical to a bad key. The dashboard
  now strips the scheme for you, and the SQL migration
  `supabase/migrations/2026-08-14-lifecheck-domain-normalisation.sql` (Swiftaw
  repo) normalises both at match time and in the stored rows — run it once in
  the Supabase SQL editor if it hasn't been applied.

You get back a `lc_site_…` (public) and a `lc_secret_…` (private) pair.

### 2. Set the env vars on Render

| Variable | Value |
| --- | --- |
| `SWIFTAW_LIFECHECK_SITEKEY` | the `lc_site_…` key |
| `SWIFTAW_LIFECHECK_SECRET` | the `lc_secret_…` key |

Both are required. Optional overrides: `SWIFTAW_LIFECHECK_URL` (verify
endpoint), `SWIFTAW_LIFECHECK_APIKEY` (Lifecheck's public API key — the default
is correct, only set it if Swiftaw rotates the project).

The site key is **not** hardcoded in the client any more. The app reads it from
`GET /api/lifecheck/health`, so the key the widget uses can't drift from the one
registered on the dashboard.

### 3. Check it

```
GET https://fortized.com/api/lifecheck/health
→ { "configured": true, "sitekey": "lc_site_…" }
```

`configured: false` means the secret is missing. `sitekey: ""` means the site
key is missing, and the app will skip the widget entirely and use the built-in
slide challenge.

Then trigger a gate in the app (redeem an Onyx code is the easiest — it's always
gated) and watch the console:

- **Verified** → done.
- `[Lifecheck] widget cannot verify (sitekey-rejected)` → the key doesn't exist,
  or `fortized.com` isn't on its allowed-domains list.
- `[Lifecheck] verification rejected invalid-input-secret` → `SWIFTAW_LIFECHECK_SECRET`
  doesn't match the site key's pair.
- `[Lifecheck] verification rejected timeout-or-duplicate` → the token was
  already consumed or is older than ~2 minutes.
- `[Lifecheck] verification rejected upstream 401` → the `apikey` header is
  wrong (only possible if you've overridden `SWIFTAW_LIFECHECK_APIKEY`).

## How it fits together

1. `swiftawLifecheck(opts)` (app.js) opens the gate modal.
2. It fetches `/api/lifecheck/health` for the site key. No key → built-in
   slide challenge, done.
3. It loads `https://swiftaw.com/lifecheck/lifecheck.js` and renders the widget
   in a sandboxed iframe served from swiftaw.com.
4. The user passes → the widget calls `lifecheck_issue_token` with the site key
   and the host page's hostname → single-use token, valid ~2 minutes.
5. The token comes back over `postMessage`; the app POSTs it to
   `/api/lifecheck/verify`.
6. The server calls `lifecheck_verify_token` with the **secret** (never in the
   browser), which consumes the token and returns a verdict. The gate opens on
   `success: true`.

Fallbacks, in order: no site key, or the loader is blocked/times out, or the
widget reports it can't verify (`error-callback`) → the built-in slide
challenge. If the secret isn't configured, a widget pass is accepted on its own
so the gate still works — set the secret to close that gap.

A successful check grants a 90-second grace window (`_lifecheckPassedUntil`), so
back-to-back gated actions don't re-prompt.
