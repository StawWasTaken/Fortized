# Server-side trading — rollout

The trade UI now talks to the server instead of writing the other person's row
from the browser. This document is the part **you** have to run.

## Why this matters more than the endpoints

Fortized has no real authentication layer today. `login()` reads the user's row
with the **anon key** and compares `user.password !== password` in the browser.
That means, right now, anyone holding the anon key (it ships in the client, so:
anyone) can read every row in `users` — including plaintext passwords — and
write any row they like.

No trading system can be safe on top of that. The endpoints below remove the
*client* from the trust path, which is a real and necessary improvement — but
until the two steps in **Hardening** land, a determined attacker can still skip
the API and write Supabase directly.

Order of operations matters. Do step 1 and 2 first: the API is inert without
them, and the client stays on its current local path until
`GET /api/trades/health` reports `ready: true`.

## 1. Environment (Render → your service → Environment → Add Environment Variable)

### `SUPABASE_SERVICE_ROLE`

**Where the value comes from:** Supabase dashboard → your project → the gear
icon (**Project Settings**) → **API Keys** → the key labelled **`service_role`**
/ `secret`. Click *Reveal*, copy the whole thing, paste it as the value.

It's a long JWT starting `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…` — it looks
like the anon key you already have, but the middle segment decodes to
`"role":"service_role"` instead of `"role":"anon"`. If you paste the anon key
here by mistake nothing will error; it will just silently enforce nothing. You
can check which one you pasted at `/api/trades/health` — `serviceRole: true`
only means *a* value is set, so decode the middle segment on jwt.io if unsure.

**This key bypasses every Supabase security rule.** It must only ever live in
Render's environment. Never put it in `app/`, in any file that ships to the
browser, or in a commit.

### `FTZ_SESSION_SECRET`

**Where the value comes from:** you invent it. Any long random string — it's
only used as an HMAC key to sign session tokens, so it never has to match
anything else. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

If you leave it unset the server generates a fresh random one on every boot,
which means every deploy invalidates everyone's trade session and they have to
reload the app. Not dangerous — just annoying.

Changing this value later is safe: it logs everyone out of trading once, and
they recover on the next page load.

## 2. SQL (Supabase → SQL editor)

```sql
-- ── The trade ledger ────────────────────────────────────────────────
create table if not exists public.trades (
  id           text primary key,
  from_user    text not null,
  to_user      text not null,
  status       text not null default 'pending',
  from_onyx    integer not null default 0,
  to_onyx      integer not null default 0,
  from_items   jsonb   not null default '[]'::jsonb,
  to_items     jsonb   not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz,
  settled_at   timestamptz,
  constraint trades_status_ck check (status in ('pending','accepted','declined','cancelled','expired')),
  constraint trades_onyx_ck   check (from_onyx >= 0 and to_onyx >= 0),
  constraint trades_parties_ck check (from_user <> to_user)
);

create index if not exists trades_to_pending_idx   on public.trades (to_user)   where status = 'pending';
create index if not exists trades_from_pending_idx on public.trades (from_user) where status = 'pending';

-- Lock the table to the service role. The browser must go through the API.
alter table public.trades enable row level security;
revoke all on public.trades from anon, authenticated;

-- ── Atomic settlement ───────────────────────────────────────────────
-- Everything below runs in ONE transaction. Both rows are locked FOR UPDATE
-- before anything is read, so two people accepting at the same moment
-- serialise instead of both succeeding.
create or replace function public.ftz_trade_settle(p_trade_id text, p_actor text)
returns table (ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  t        public.trades%rowtype;
  sender   public.users%rowtype;
  receiver public.users%rowtype;
  s_held   jsonb;
  r_held   jsonb;
  item     text;
begin
  select * into t from public.trades where id = p_trade_id for update;
  if not found                     then return query select false, 'No such trade.';        return; end if;
  if t.status <> 'pending'         then return query select false, 'Already answered.';     return; end if;
  if t.to_user <> lower(p_actor)   then return query select false, 'Not your trade.';       return; end if;
  if t.expires_at is not null and t.expires_at < now() then
    update public.trades set status = 'expired' where id = t.id;
    return query select false, 'That trade expired.'; return;
  end if;

  -- Deterministic lock order (alphabetical) so two trades between the same
  -- pair, in opposite directions, can never deadlock each other.
  if t.from_user < t.to_user then
    select * into sender   from public.users where username = t.from_user for update;
    select * into receiver from public.users where username = t.to_user   for update;
  else
    select * into receiver from public.users where username = t.to_user   for update;
    select * into sender   from public.users where username = t.from_user for update;
  end if;
  if sender.username is null or receiver.username is null then
    return query select false, 'One of the accounts is gone.'; return;
  end if;

  if coalesce(sender.onyx, 0)   < t.from_onyx then return query select false, 'They can no longer cover their Onyx.'; return; end if;
  if coalesce(receiver.onyx, 0) < t.to_onyx   then return query select false, 'You no longer have that much Onyx.';  return; end if;

  -- Everything each side currently holds, across all three inventory keys.
  s_held := coalesce(sender.raw->'ownedDecorations','[]'::jsonb)
          || coalesce(sender.raw->'ownedNameplates','[]'::jsonb)
          || coalesce(sender.raw->'unlockedAppearances','[]'::jsonb);
  r_held := coalesce(receiver.raw->'ownedDecorations','[]'::jsonb)
          || coalesce(receiver.raw->'ownedNameplates','[]'::jsonb)
          || coalesce(receiver.raw->'unlockedAppearances','[]'::jsonb);

  for item in select jsonb_array_elements_text(t.from_items) loop
    if not (s_held ? item) then return query select false, 'They no longer own ' || item || '.'; return; end if;
  end loop;
  for item in select jsonb_array_elements_text(t.to_items) loop
    if not (r_held ? item) then return query select false, 'You no longer own ' || item || '.'; return; end if;
  end loop;

  -- Onyx
  update public.users set onyx = coalesce(onyx,0) - t.from_onyx + t.to_onyx where username = t.from_user;
  update public.users set onyx = coalesce(onyx,0) - t.to_onyx + t.from_onyx where username = t.to_user;

  -- Items: remove from the giver, add to the receiver, per inventory key.
  perform public.ftz_move_items(t.from_user, t.to_user, t.from_items);
  perform public.ftz_move_items(t.to_user, t.from_user, t.to_items);

  update public.trades set status = 'accepted', settled_at = now() where id = t.id;
  return query select true, null::text;
end;
$$;

-- Moves a set of item ids from one user to another, keeping each id in
-- whichever inventory key it was already filed under.
create or replace function public.ftz_move_items(p_from text, p_to text, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  from_raw jsonb;
  to_raw   jsonb;
  keep     jsonb;
  moved    jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then return; end if;
  select raw into from_raw from public.users where username = p_from;
  select raw into to_raw   from public.users where username = p_to;

  foreach k in array array['ownedDecorations','ownedNameplates','unlockedAppearances'] loop
    -- What this key holds that the trade is moving, and what stays behind.
    select coalesce(jsonb_agg(v), '[]'::jsonb) into moved
      from jsonb_array_elements_text(coalesce(from_raw->k,'[]'::jsonb)) v
      where p_items ? v;
    select coalesce(jsonb_agg(v), '[]'::jsonb) into keep
      from jsonb_array_elements_text(coalesce(from_raw->k,'[]'::jsonb)) v
      where not (p_items ? v);

    if jsonb_array_length(moved) > 0 then
      from_raw := jsonb_set(coalesce(from_raw,'{}'::jsonb), array[k], keep, true);
      -- Union, so re-receiving something you already have can't duplicate it.
      to_raw := jsonb_set(
        coalesce(to_raw,'{}'::jsonb), array[k],
        (select coalesce(jsonb_agg(distinct v), '[]'::jsonb)
           from jsonb_array_elements_text(coalesce(to_raw->k,'[]'::jsonb) || moved) v),
        true);
    end if;
  end loop;

  update public.users set raw = from_raw where username = p_from;
  update public.users set raw = to_raw   where username = p_to;
end;
$$;

revoke all on function public.ftz_trade_settle(text, text) from anon, authenticated;
revoke all on function public.ftz_move_items(text, text, jsonb) from anon, authenticated;
```

### 2c. Send Onyx (`ftz_onyx_send`)

Powers the Radiance-only **Send Onyx** button on profile cards. Same shape as
the trade settle: both rows locked `FOR UPDATE` in alphabetical order so two
sends crossing each other can't deadlock, Radiance and balance re-checked
server-side, and the move done in one statement. Run this once:

```sql
create or replace function public.ftz_onyx_send(p_from text, p_to text, p_amount int)
returns table (ok boolean, reason text, from_balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  a text; b text;
  from_onyx bigint; to_onyx bigint;
  from_rad bigint;
begin
  if p_amount is null or p_amount < 1 then
    return query select false, 'Enter an amount.', null::bigint; return;
  end if;
  if p_amount > 50000 then
    return query select false, 'The most you can send at once is 50 000 Onyx.', null::bigint; return;
  end if;
  if lower(p_from) = lower(p_to) then
    return query select false, 'You cannot send Onyx to yourself.', null::bigint; return;
  end if;

  -- Alphabetical lock order — deadlock-safe when two sends cross.
  if lower(p_from) < lower(p_to) then a := p_from; b := p_to; else a := p_to; b := p_from; end if;
  perform 1 from users where lower(username) = lower(a) for update;
  perform 1 from users where lower(username) = lower(b) for update;

  select onyx, radiance_until into from_onyx, from_rad
    from users where lower(username) = lower(p_from);
  select onyx into to_onyx from users where lower(username) = lower(p_to);

  if from_onyx is null then
    return query select false, 'Sender not found.', null::bigint; return;
  end if;
  if to_onyx is null then
    return query select false, 'No account by that name.', null::bigint; return;
  end if;
  if from_rad is null or from_rad < (extract(epoch from now()) * 1000)::bigint then
    return query select false, 'Sending Onyx is a Radiance feature.', null::bigint; return;
  end if;
  if from_onyx < p_amount then
    return query select false, 'Not enough Onyx.', from_onyx; return;
  end if;

  update users set onyx = onyx - p_amount where lower(username) = lower(p_from);
  update users set onyx = onyx + p_amount where lower(username) = lower(p_to);

  return query select true, null::text, (from_onyx - p_amount);
end;
$$;

revoke all on function public.ftz_onyx_send(text, text, int) from anon, authenticated;
```

## 3. Verify

`GET https://<host>/api/trades/health` should return:

```json
{ "serviceRole": true, "sessionSecret": true, "table": true, "rpc": true, "ready": true }
```

The client polls this once per session. While `ready` is false it keeps using
the old local path, so a half-finished rollout doesn't break trading — it just
doesn't harden it.

`GET https://<host>/api/onyx/health` should return:

```json
{ "serviceRole": true, "sessionSecret": true, "rpc": true, "max": 50000, "ready": true }
```

Send Onyx has **no local fallback** on purpose — a half-completed balance
transfer is worse than a disabled button, so while `ready` is false the client
tells the member the feature is unavailable instead of trying it client-side.

## Hardening — still open, and needed before this is genuinely safe

1. **Stop storing plaintext passwords.** Hash with bcrypt/argon2 and move the
   comparison server-side (`POST /api/session` is already the right shape for
   it — it just needs to compare a hash).
2. **Turn on RLS for `users`** so the anon key can't read or write arbitrary
   rows. This is the big one: until it lands, the trade API can be bypassed by
   writing `users` directly, and every password in the table is readable.

Until then this system is *server-authoritative* — the honest description —
but not *tamper-proof*.
