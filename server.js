// ════════════════════════════════════════════════════
// FORTIZED — Node.js + Socket.io Real-Time Server
// ════════════════════════════════════════════════════
// Sits alongside Firebase for persistent storage.
// Handles live, low-latency events: messages, typing,
// presence, status changes, and activity broadcasting.

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Supabase (for persisting presence on disconnect) ─────
const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://ufnjjddqnicbzyjfawrb.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbmpqZGRxbmljYnp5amZhd3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTkzMjgsImV4cCI6MjA4ODIzNTMyOH0.5Sfc_wQO6T3mQT6lqsPTAntqyxhDZJqTrZ3GNkyQSEk';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 30000,
  pingInterval: 10000,
  maxHttpBufferSize: 50 * 1024 * 1024,
  transports: ['polling', 'websocket'], // Allow polling fallback first
  allowUpgrades: true, // Upgrade from polling to websocket when possible
  path: '/socket.io/',
});

const PORT = process.env.PORT || 3000;

// ── CORS for API routes ───────────────────────────
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── JSON body parsing ─────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Security headers ─────────────────────────────
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.set('X-DNS-Prefetch-Control', 'on');
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// ── invite.fortized.com — a front door, NOT a second copy of the site ──────
// ⚠️ Express does not care which hostname a request arrived on: every route in
// this file answers on every domain pointed at the service. So the moment
// invite.fortized.com resolved here it published a COMPLETE duplicate of
// fortized.com on a second hostname — every page, the whole app, the login
// form, all of it. That is three separate problems, not a cosmetic one:
//   · Search engines see two hosts serving identical pages and split or
//     penalise the ranking of both.
//   · A browser treats it as a DIFFERENT ORIGIN. Cookies, localStorage, the
//     service worker and the logged-in session on www do not exist over there,
//     so the "same" app behaves like a stranger's first visit — which is
//     exactly why animations that had already played on www played again here.
//   · Anyone who lands on it is browsing a copy that nothing else links to.
//
// This runs BEFORE any route that serves a page, so the invite host answers
// exactly two things: a code, or a way back to the real site. It never serves
// HTML of its own, which also keeps the session on ONE origin.
const INVITE_CODE_RE = /^[\w-]{3,64}$/;
const MAIN_ORIGIN = (process.env.FTZ_MAIN_ORIGIN || 'https://www.fortized.com').replace(/\/+$/, '');
// ⚠️ On the invite host ANY single segment would otherwise read as a code, so
// someone typing invite.fortized.com/login would be told their invite is
// invalid instead of being shown the login page. These names are pages, never
// codes; they get sent to the real page on the main site.
const INVITE_HOST_RESERVED = new Set([
  'app', 'login', 'signup', 'newsroom', 'support', 'download', 'privacy',
  'terms', 'legal', 'blog', 'invite', 'i', 'join', 'api', 'discover',
]);
app.use((req, res, next) => {
  // Strip the port: a Host header is `invite.fortized.com:443` behind some proxies.
  const host = String(req.headers.host || '').toLowerCase().split(':')[0];
  if (!host.startsWith('invite.')) return next();
  const seg = req.path.replace(/^\/+|\/+$/g, '');
  if (INVITE_CODE_RE.test(seg) && !INVITE_HOST_RESERVED.has(seg.toLowerCase())) {
    // 302, not 301: a code can be revoked, and a permanent redirect would be
    // cached in the browser forever pointing at a dead invite.
    return res.redirect(302, MAIN_ORIGIN + '/app?invite=' + encodeURIComponent(seg));
  }
  // A real page name keeps its path; anything else goes to the front door.
  return res.redirect(301, MAIN_ORIGIN + (INVITE_HOST_RESERVED.has(seg.toLowerCase()) ? '/' + seg : '/'));
});

// ══════════════════════════════════════════════════════════════════════════
// TRADING — server-authoritative.
//
// The client is NEVER trusted with a trade. It may only ask; every check and
// every balance/inventory move happens here, and the actual swap runs inside
// one Postgres transaction (the `ftz_trade_settle` RPC) so a trade can never
// half-apply, duplicate an item, or be replayed.
//
// Two things gate how safe this really is, and both need setting on the host:
//   SUPABASE_SERVICE_ROLE — lets the server write rows the browser can't.
//                           Without it we fall back to the anon key, which
//                           means the client could still bypass us entirely.
//   FTZ_SESSION_SECRET    — signs the session tokens below. Falls back to a
//                           per-boot random value (tokens die on restart).
// See docs/trading-server.md for the SQL and the rollout order.
// ══════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';
// Privileged client when the service role is configured; otherwise the same
// anon client, so the endpoints still work (just without the extra teeth).
const sbAdmin = SUPABASE_SERVICE_ROLE
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
  : sb;
const FTZ_SESSION_SECRET = process.env.FTZ_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TRADE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;   // 12h

function _signSession(username, exp) {
  return crypto.createHmac('sha256', FTZ_SESSION_SECRET)
    .update(`${username}.${exp}`).digest('base64url');
}
function _issueSession(username) {
  const exp = Date.now() + TRADE_SESSION_TTL_MS;
  return `${Buffer.from(username).toString('base64url')}.${exp}.${_signSession(username, exp)}`;
}
// Returns the username the token proves, or null. Constant-time compare so the
// signature can't be brute-forced a byte at a time.
function _readSession(req) {
  const raw = req.get('X-Ftz-Session') || (req.body && req.body.session) || '';
  const parts = String(raw).split('.');
  if (parts.length !== 3) return null;
  let username;
  try { username = Buffer.from(parts[0], 'base64url').toString('utf8'); } catch { return null; }
  const exp = Number(parts[1]);
  if (!username || !Number.isFinite(exp) || Date.now() > exp) return null;
  const want = Buffer.from(_signSession(username, exp));
  const got = Buffer.from(parts[2]);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  return username;
}

// POST /api/session — exchange credentials for a short-lived trade session.
// The password check happens HERE, so a trade can't be authorised by a client
// that merely knows a username.
app.post('/api/session', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const { data, error } = await sbAdmin.from('users')
      .select('username,password').eq('username', username).maybeSingle();
    if (error) throw error;
    if (!data || data.password !== password) return res.status(401).json({ error: 'Invalid credentials.' });
    res.json({ session: _issueSession(username), expiresIn: TRADE_SESSION_TTL_MS });
  } catch (e) {
    console.warn('[session] failed:', e.message);
    res.status(503).json({ error: 'Session service unavailable.' });
  }
});

const TRADE_MAX_ITEMS = 12;
const TRADE_MAX_ONYX = 1_000_000;
const _tradeRate = new Map();   // username → [timestamps]
function _tradeRateOK(user, limit = 12, windowMs = 60_000) {
  const now = Date.now();
  const hits = (_tradeRate.get(user) || []).filter(t => now - t < windowMs);
  hits.push(now);
  _tradeRate.set(user, hits);
  return hits.length <= limit;
}

function _tradeCanReceive(target, sender) {
  const policy = target?.raw?.tradePolicy || target?.trade_policy || 'friends';
  if (policy === 'nobody') return false;
  if (policy === 'everyone') return true;
  const friends = Array.isArray(target?.friends) ? target.friends : [];
  const names = friends.map(f => String(f?.username || f || '').toLowerCase());
  if (names.includes(String(sender).toLowerCase())) return true;
  return false;   // 'bastion' needs a shared-bastion read; treated as friends-only for now
}

// Which column holds a given item kind. Kept in sync with the client catalogue.
const TRADE_KIND_COL = { decoration: 'ownedDecorations', nameplate: 'ownedNameplates', appearance: 'unlockedAppearances' };
function _ownedList(row, col) {
  const v = (row?.raw && row.raw[col]) ?? row?.[col];
  return Array.isArray(v) ? v : [];
}
// Every item a user actually holds, flattened. Ownership is verified against
// this at BOTH create and settle time, so an item sold in between can't be traded.
function _ownsAll(row, ids) {
  const held = new Set([
    ..._ownedList(row, 'ownedDecorations'),
    ..._ownedList(row, 'ownedNameplates'),
    ..._ownedList(row, 'unlockedAppearances'),
  ]);
  return (ids || []).every(id => held.has(id));
}

async function _tradeUser(username) {
  const { data, error } = await sbAdmin.from('users')
    .select('username,display_name,onyx,friends,raw').eq('username', String(username).toLowerCase()).maybeSingle();
  if (error) throw error;
  return data;
}

// POST /api/trades/create — validate and record an offer. Nothing moves yet.
app.post('/api/trades/create', async (req, res) => {
  const me = _readSession(req);
  if (!me) return res.status(401).json({ error: 'Sign in again to trade.' });
  if (!_tradeRateOK(me)) return res.status(429).json({ error: 'Slow down — too many trade requests.' });

  const to = String(req.body?.to || '').trim().toLowerCase();
  const giveOnyx = Math.floor(Number(req.body?.giveOnyx) || 0);
  const getOnyx  = Math.floor(Number(req.body?.getOnyx) || 0);
  const give = Array.isArray(req.body?.give) ? [...new Set(req.body.give.map(String))] : [];
  const get  = Array.isArray(req.body?.get)  ? [...new Set(req.body.get.map(String))]  : [];

  if (!to || to === me) return res.status(400).json({ error: 'Pick someone else to trade with.' });
  if (giveOnyx < 0 || getOnyx < 0 || giveOnyx > TRADE_MAX_ONYX || getOnyx > TRADE_MAX_ONYX)
    return res.status(400).json({ error: 'That Onyx amount is out of range.' });
  if (give.length > TRADE_MAX_ITEMS || get.length > TRADE_MAX_ITEMS)
    return res.status(400).json({ error: `Up to ${TRADE_MAX_ITEMS} items per side.` });
  if (!giveOnyx && !getOnyx && !give.length && !get.length)
    return res.status(400).json({ error: 'The trade is empty.' });

  try {
    const [sender, target] = await Promise.all([_tradeUser(me), _tradeUser(to)]);
    if (!sender) return res.status(401).json({ error: 'Account not found.' });
    if (!target) return res.status(404).json({ error: 'That user doesn’t exist.' });
    if (!_tradeCanReceive(target, me)) return res.status(403).json({ error: 'They aren’t accepting trade requests from you.' });
    if ((sender.onyx || 0) < giveOnyx) return res.status(400).json({ error: 'You don’t have that much Onyx.' });
    if (!_ownsAll(sender, give)) return res.status(400).json({ error: 'You don’t own everything you’re offering.' });
    if (!_ownsAll(target, get)) return res.status(400).json({ error: 'They don’t own everything you asked for.' });
    if ((target.onyx || 0) < getOnyx) return res.status(400).json({ error: 'They don’t have that much Onyx.' });

    const row = {
      id: 'tr_' + crypto.randomBytes(9).toString('base64url'),
      from_user: me, to_user: to, status: 'pending',
      from_onyx: giveOnyx, to_onyx: getOnyx,
      from_items: give, to_items: get,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    const { error } = await sbAdmin.from('trades').insert(row);
    if (error) throw error;
    res.json({ ok: true, trade: row });
  } catch (e) {
    console.warn('[trades/create] failed:', e.message);
    res.status(503).json({ error: 'Couldn’t open that trade right now.', detail: e.message });
  }
});

// GET /api/trades — everything pending in both directions, for the session user.
app.get('/api/trades', async (req, res) => {
  const me = _readSession(req);
  if (!me) return res.status(401).json({ error: 'Sign in again to trade.' });
  try {
    const { data, error } = await sbAdmin.from('trades')
      .select('*').or(`from_user.eq.${me},to_user.eq.${me}`)
      .eq('status', 'pending').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const now = Date.now();
    const live = (data || []).filter(t => !t.expires_at || new Date(t.expires_at).getTime() > now);
    res.json({
      incoming: live.filter(t => t.to_user === me),
      outgoing: live.filter(t => t.from_user === me),
    });
  } catch (e) {
    console.warn('[trades/list] failed:', e.message);
    res.status(503).json({ error: 'Couldn’t load your trades.' });
  }
});

// POST /api/trades/respond — accept or decline. Accepting runs the atomic RPC:
// it re-checks balances and ownership inside the transaction, so a trade that
// was valid a minute ago but isn't now fails cleanly instead of half-applying.
app.post('/api/trades/respond', async (req, res) => {
  const me = _readSession(req);
  if (!me) return res.status(401).json({ error: 'Sign in again to trade.' });
  if (!_tradeRateOK(me, 30)) return res.status(429).json({ error: 'Slow down.' });
  const id = String(req.body?.id || '');
  const accept = !!req.body?.accept;
  if (!id) return res.status(400).json({ error: 'Missing trade id.' });
  try {
    const { data: trade, error: readErr } = await sbAdmin.from('trades').select('*').eq('id', id).maybeSingle();
    if (readErr) throw readErr;
    if (!trade) return res.status(404).json({ error: 'That trade no longer exists.' });
    if (trade.to_user !== me) return res.status(403).json({ error: 'That trade isn’t yours to answer.' });
    if (trade.status !== 'pending') return res.status(409).json({ error: 'That trade was already answered.' });
    if (trade.expires_at && new Date(trade.expires_at).getTime() < Date.now()) {
      await sbAdmin.from('trades').update({ status: 'expired' }).eq('id', id).eq('status', 'pending');
      return res.status(409).json({ error: 'That trade expired.' });
    }
    if (!accept) {
      // Guarded on status so two clicks can't both "win".
      const { data, error } = await sbAdmin.from('trades')
        .update({ status: 'declined', settled_at: new Date().toISOString() })
        .eq('id', id).eq('status', 'pending').select();
      if (error) throw error;
      if (!data || !data.length) return res.status(409).json({ error: 'That trade was already answered.' });
      return res.json({ ok: true, status: 'declined' });
    }
    const { data, error } = await sbAdmin.rpc('ftz_trade_settle', { p_trade_id: id, p_actor: me });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || result.ok === false) return res.status(409).json({ error: result?.reason || 'The trade could no longer be settled.' });
    res.json({ ok: true, status: 'accepted' });
  } catch (e) {
    console.warn('[trades/respond] failed:', e.message);
    res.status(503).json({ error: 'Couldn’t settle that trade.', detail: e.message });
  }
});

// POST /api/trades/cancel — the sender withdrawing their own offer.
app.post('/api/trades/cancel', async (req, res) => {
  const me = _readSession(req);
  if (!me) return res.status(401).json({ error: 'Sign in again to trade.' });
  const id = String(req.body?.id || '');
  if (!id) return res.status(400).json({ error: 'Missing trade id.' });
  try {
    const { data, error } = await sbAdmin.from('trades')
      .update({ status: 'cancelled', settled_at: new Date().toISOString() })
      .eq('id', id).eq('from_user', me).eq('status', 'pending').select();
    if (error) throw error;
    if (!data || !data.length) return res.status(409).json({ error: 'That trade can’t be cancelled any more.' });
    res.json({ ok: true });
  } catch (e) {
    console.warn('[trades/cancel] failed:', e.message);
    res.status(503).json({ error: 'Couldn’t cancel that trade.' });
  }
});

// GET /api/trades/health — is the server-authoritative path actually usable?
// The client checks this to decide whether to use the API or stay local.
app.get('/api/trades/health', async (_req, res) => {
  const out = {
    serviceRole: !!SUPABASE_SERVICE_ROLE,
    sessionSecret: !!process.env.FTZ_SESSION_SECRET,
    table: false, rpc: false,
  };
  try { const { error } = await sbAdmin.from('trades').select('id').limit(1); out.table = !error; } catch {}
  try {
    const { error } = await sbAdmin.rpc('ftz_trade_settle', { p_trade_id: '__probe__', p_actor: '__probe__' });
    // A missing function 404s; anything else means the RPC exists and simply
    // rejected the probe, which is exactly what we want to see.
    out.rpc = !error || !/does not exist|not find/i.test(error.message || '');
  } catch {}
  out.ready = out.table && out.rpc;
  res.json(out);
});

// ══════════════════════════════════════════════════════════════════
// Send Onyx — member to member, Radiance only
// ══════════════════════════════════════════════════════════════════
// Moving balance between two accounts has to be atomic, so the real work
// happens in the `ftz_onyx_send` Postgres function (SECURITY DEFINER): it
// locks both user rows FOR UPDATE in alphabetical order — the same
// deadlock-safe ordering ftz_trade_settle uses — re-checks the sender's
// Radiance and balance server-side, and moves the Onyx in one statement.
// SQL lives in docs/trading-server.md.
const ONYX_SEND_MAX = 50000;

app.post('/api/onyx/send', async (req, res) => {
  const me = _readSession(req);
  if (!me) return res.status(401).json({ error: 'Sign in again to send Onyx.' });
  if (!_tradeRateOK(me, 10)) return res.status(429).json({ error: 'Slow down — too many sends.' });

  const to = String(req.body?.to || '').trim().replace(/^@/, '');
  const amount = Math.floor(Number(req.body?.amount) || 0);
  const note = String(req.body?.note || '').slice(0, 200);

  if (!to) return res.status(400).json({ error: 'Who is it going to?' });
  if (to.toLowerCase() === me.toLowerCase()) return res.status(400).json({ error: 'You cannot send Onyx to yourself.' });
  if (amount < 1) return res.status(400).json({ error: 'Enter an amount.' });
  if (amount > ONYX_SEND_MAX) return res.status(400).json({ error: `The most you can send at once is ${ONYX_SEND_MAX.toLocaleString('en-GB')} Onyx.` });

  try {
    const { data, error } = await sbAdmin.rpc('ftz_onyx_send', {
      p_from: me, p_to: to, p_amount: amount,
    });
    if (error) {
      if (!_rpcMissing(error)) throw error;
      // No RPC deployed yet — do it here instead. See _onyxSendCAS.
      const r = await _onyxSendCAS(me, to, amount);
      if (!r.ok) return res.status(409).json({ error: r.reason });
      return res.json({ ok: true, amount, to, note, balance: r.balance, mode: 'cas' });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || result.ok === false) {
      return res.status(409).json({ error: result?.reason || 'That send could not go through.' });
    }
    res.json({ ok: true, amount, to, note, balance: result.from_balance, mode: 'rpc' });
  } catch (e) {
    console.warn('[onyx/send] failed:', e.message);
    res.status(503).json({ error: 'Couldn’t send that Onyx.', detail: e.message });
  }
});

function _rpcMissing(error) {
  const m = (error?.message || '') + ' ' + (error?.details || '');
  return /does not exist|not find|could not find the function|schema cache/i.test(m);
}

// ── Transfer without the RPC ───────────────────────────────────────
// ⚠️ This is the FALLBACK, not the preferred path. `ftz_onyx_send` does the
// whole move inside one Postgres transaction with both rows locked; nothing in
// JS can match that. What this CAN do is make the dangerous half safe:
// the debit is a compare-and-swap (`.eq('onyx', seen)`), so if anything else
// touched the sender's balance between our read and our write the update
// matches zero rows and we retry against the new value. That is what actually
// prevents a double-spend — two concurrent sends can never both succeed off
// the same balance. The credit is the same CAS, and if it can't be landed the
// debit is rolled back the same way.
// The residual risk is a process death in the gap between debit and credit,
// which would strand the amount. It is logged loudly so it can be reconciled.
// Run the SQL in docs/trading-server.md §2c and this stops being used.
const _CAS_TRIES = 5;
async function _onyxRow(username) {
  const { data, error } = await sbAdmin.from('users')
    .select('username,onyx,radiance_until').eq('username', String(username).toLowerCase()).maybeSingle();
  if (error) throw error;
  return data;
}
async function _onyxAdjust(username, delta, { floor = false } = {}) {
  for (let i = 0; i < _CAS_TRIES; i++) {
    const row = await _onyxRow(username);
    if (!row) return { ok: false, reason: 'account-missing' };
    const seen = row.onyx || 0;
    if (floor && seen + delta < 0) return { ok: false, reason: 'insufficient' };
    const next = Math.max(0, seen + delta);
    const { data, error } = await sbAdmin.from('users')
      .update({ onyx: next }).eq('username', row.username).eq('onyx', seen).select('onyx');
    if (error) throw error;
    if (data && data.length) return { ok: true, balance: next };
    // Someone else wrote in between — re-read and try again against the new value.
  }
  return { ok: false, reason: 'contended' };
}
async function _onyxSendCAS(from, to, amount) {
  const [sender, target] = await Promise.all([_onyxRow(from), _onyxRow(to)]);
  if (!sender) return { ok: false, reason: 'Account not found.' };
  if (!target) return { ok: false, reason: 'That user doesn’t exist.' };
  if (!(Number(sender.radiance_until) > Date.now())) return { ok: false, reason: 'Sending Onyx requires Radiance.' };
  if ((sender.onyx || 0) < amount) return { ok: false, reason: 'You don’t have that much Onyx.' };

  const debit = await _onyxAdjust(sender.username, -amount, { floor: true });
  if (!debit.ok) {
    return { ok: false, reason: debit.reason === 'insufficient'
      ? 'You don’t have that much Onyx.' : 'Too busy to send that right now — try again.' };
  }
  const credit = await _onyxAdjust(target.username, amount);
  if (!credit.ok) {
    const back = await _onyxAdjust(sender.username, amount);
    if (!back.ok) console.error('[onyx/send] STRANDED', amount, 'from', sender.username, 'to', target.username);
    return { ok: false, reason: 'That send could not go through — nothing was taken.' };
  }
  return { ok: true, balance: debit.balance };
}

// GET /api/onyx/health — the client probes this once and falls back to
// hiding the feature rather than half-completing a transfer.
app.get('/api/onyx/health', async (_req, res) => {
  const out = { serviceRole: !!SUPABASE_SERVICE_ROLE, sessionSecret: !!process.env.FTZ_SESSION_SECRET, rpc: false, max: ONYX_SEND_MAX };
  try {
    const { error } = await sbAdmin.rpc('ftz_onyx_send', { p_from: '__probe__', p_to: '__probe__', p_amount: 0 });
    // A missing function 404s; any other error means it exists and simply
    // rejected the probe — which is exactly what we want to see.
    out.rpc = !error || !_rpcMissing(error);
  } catch {}
  // Without the RPC we can still transfer safely enough (see _onyxSendCAS), so
  // the feature is available — `mode` says which path a send will take, and
  // `advice` names what would upgrade it.
  out.mode = out.rpc ? 'rpc' : 'cas';
  out.ready = true;
  if (!out.rpc) out.advice = 'Run the ftz_onyx_send SQL (docs/trading-server.md §2c) for a single-transaction transfer.';
  res.json(out);
});

// ── GET /api/geo — which country is this request coming from? ────────
// ⚠️ WHY THIS EXISTS. Country detection runs in the member's own browser:
// timezone first, then the browser locale, then a network lookup. The network
// leg used to be ipapi.co, which is cross-origin — so most ad blockers kill it
// outright, and the free tier rate-limits. That left accounts unplaced with no
// way to recover. This endpoint is SAME-ORIGIN: no blocker, no CORS, no quota.
//
// Almost always free: every CDN in front of us already resolved the country
// and put it in a header, so the common path costs zero outbound calls. The IP
// lookup is only for a bare origin with no CDN, and its result is cached per
// IP so a whole household resolves once.
const _GEO_HEADERS = [
  'cf-ipcountry',              // Cloudflare
  'cloudfront-viewer-country', // CloudFront
  'x-vercel-ip-country',       // Vercel
  'x-appengine-country',       // App Engine
  'fastly-geo-countrycode',    // Fastly
  'x-geo-country', 'x-country-code',
];
const _geoCache = new Map();   // ip → { cc, at }
const _GEO_TTL = 24 * 60 * 60 * 1000;
function _clientIP(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || '';
}
app.get('/api/geo', async (req, res) => {
  const ok = cc => /^[A-Z]{2}$/.test(cc) && cc !== 'XX' && cc !== 'T1';
  for (const h of _GEO_HEADERS) {
    const cc = String(req.headers[h] || '').trim().toUpperCase();
    if (ok(cc)) return res.json({ country: cc, source: h });
  }
  const ip = _clientIP(req);
  if (!ip) return res.json({ country: null, source: 'none' });
  const hit = _geoCache.get(ip);
  if (hit && Date.now() - hit.at < _GEO_TTL) {
    return res.json({ country: hit.cc, source: hit.cc ? 'cache' : 'none' });
  }
  let cc = null;
  try {
    // A private/loopback address can't be geolocated — don't waste the call.
    if (!/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/i.test(ip)) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode`, { signal: ctl.signal });
      clearTimeout(t);
      if (r.ok) {
        const j = await r.json();
        const v = String(j?.countryCode || '').trim().toUpperCase();
        if (ok(v)) cc = v;
      }
    }
  } catch (_) { /* stays null — the client still has tz + locale */ }
  _geoCache.set(ip, { cc, at: Date.now() });
  if (_geoCache.size > 5000) _geoCache.delete(_geoCache.keys().next().value);
  res.json({ country: cc, source: cc ? 'ip' : 'none' });
});

// ── Health check endpoint ─────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    connections: io.sockets.sockets.size,
    onlineUsers: onlineUsers.size,
  });
});

// ── GET /api/status — ONE source of truth for "is Fortized up?" ──────
// The public status page and the staff console both read this. They used to
// disagree completely: the status page was seven hardcoded "Operational"
// badges that could not go red if the whole platform was on fire, and the
// console ran its own probes with different names. Now there is one list of
// components, probed server-side, and both surfaces render the same answer.
//
// Maintenance mode is part of the picture: if staff have flipped the switch,
// every member-facing component reports `maintenance` rather than pretending
// nothing is happening.
const _STATUS_COMPONENTS = [
  { id: 'app',          label: 'Web app',            desc: 'fortized.com/app' },
  { id: 'realtime',     label: 'Messaging & rooms',  desc: 'DMs, group chats, bastion channels' },
  { id: 'database',     label: 'Accounts & data',    desc: 'Profiles, bastions, everything stored' },
  { id: 'economy',      label: 'Fortshop & economy', desc: 'Onyx, trading, Radiance' },
  { id: 'verification', label: 'Human verification', desc: 'Lifecheck on sensitive actions' },
  { id: 'moderation',   label: 'Safety systems',     desc: 'Automod and report triage' },
];

// Cached briefly — the status page is public, and an un-cached endpoint that
// probes Supabase on every hit is a free way to burn the egress quota.
let _statusCache = null, _statusAt = 0;
const _STATUS_TTL = 20000;

async function _buildStatus() {
  const state = {};
  const note = {};

  // App server: we are answering, so it is up.
  state.app = 'operational';
  note.app = 'uptime ' + Math.floor(process.uptime()) + 's';

  // Realtime: the socket layer is in-process.
  state.realtime = 'operational';
  note.realtime = io.sockets.sockets.size + ' connected';

  // Database: one cheap read.
  try {
    const t0 = Date.now();
    const { error } = await sbAdmin.from('admin_kv').select('key').limit(1);
    state.database = error ? 'down' : 'operational';
    note.database = error ? (error.message || 'unreachable') : (Date.now() - t0) + 'ms';
  } catch (e) { state.database = 'down'; note.database = 'unreachable'; }

  // Economy: trading needs the settle RPC, sends need theirs. Either one
  // missing is degraded, not down — the Fortshop itself still works.
  let tradesOk = false, sendOk = false;
  try {
    const { error } = await sbAdmin.rpc('ftz_trade_settle', { p_trade_id: '__probe__', p_actor: '__probe__' });
    tradesOk = !error || !/does not exist|not find/i.test(error.message || '');
  } catch {}
  try {
    const { error } = await sbAdmin.rpc('ftz_onyx_send', { p_from: '__probe__', p_to: '__probe__', p_amount: 0 });
    sendOk = !error || !/does not exist|not find/i.test(error.message || '');
  } catch {}
  state.economy = (tradesOk && sendOk) ? 'operational' : (tradesOk || sendOk) ? 'degraded' : 'degraded';
  note.economy = tradesOk && sendOk ? 'trading and sends ready'
    : tradesOk ? 'sends not set up' : sendOk ? 'trading not set up' : 'running client-side';

  // Verification + moderation are configuration, not liveness.
  const lifecheck = !!(process.env.SWIFTAW_LIFECHECK_SITEKEY && process.env.SWIFTAW_LIFECHECK_APIKEY);
  state.verification = lifecheck ? 'operational' : 'degraded';
  note.verification = lifecheck ? 'configured' : 'falling back to the built-in challenge';

  const aiKey = !!(process.env.AI_MOD_KEY || '').trim();
  state.moderation = aiKey ? 'operational' : 'degraded';
  note.moderation = aiKey ? 'configured' : 'running on the local ruleset';

  // Maintenance overrides everything member-facing.
  let maintenance = false, maintenanceMessage = '';
  try {
    // Global settings are their own single-row table, NOT an admin_kv key.
    const { data } = await sbAdmin.from('admin_global_settings').select('data').eq('id', 1).maybeSingle();
    const gs = data?.data || {};
    maintenance = !!(gs.maintenanceMode || gs.maintenance);
    maintenanceMessage = gs.maintenanceMessage || '';
  } catch {}
  if (maintenance) {
    for (const c of _STATUS_COMPONENTS) if (c.id !== 'app') { state[c.id] = 'maintenance'; note[c.id] = 'scheduled maintenance'; }
  }

  const components = _STATUS_COMPONENTS.map(c => ({ ...c, state: state[c.id] || 'down', note: note[c.id] || '' }));
  const overall = maintenance ? 'maintenance'
    : components.some(c => c.state === 'down') ? 'down'
      : components.some(c => c.state === 'degraded') ? 'degraded' : 'operational';

  return { overall, maintenance, maintenanceMessage, components, checkedAt: new Date().toISOString() };
}

app.get('/api/status', async (_req, res) => {
  try {
    if (_statusCache && Date.now() - _statusAt < _STATUS_TTL) return res.json(_statusCache);
    _statusCache = await _buildStatus();
    _statusAt = Date.now();
    res.json(_statusCache);
  } catch (e) {
    res.status(503).json({ overall: 'down', components: [], error: 'status unavailable' });
  }
});

// ── IGDB API Proxy ────────────────────────────────
// Proxies requests to IGDB (via Twitch auth) so the
// client can fetch game metadata (genre, cover art).
let _igdbToken = null;
let _igdbTokenExpiry = 0;

async function getIGDBToken() {
  if (_igdbToken && Date.now() < _igdbTokenExpiry) return _igdbToken;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('[IGDB] Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET');
    return null;
  }
  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, { method: 'POST' });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[IGDB] Token request failed:', res.status, errText);
      return null;
    }
    const data = await res.json();
    if (data.access_token && typeof data.expires_in === 'number' && data.expires_in > 0) {
      _igdbToken = data.access_token;
      _igdbTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      console.log('[IGDB] Token acquired, expires in', data.expires_in, 'seconds');
      return _igdbToken;
    }
    console.error('[IGDB] Token response missing access_token or expires_in:', JSON.stringify(data));
  } catch (e) { console.error('[IGDB] Token error:', e.message); }
  return null;
}

// Cheap availability probe — avoids burning a search quota on every client load.
app.get('/api/igdb/health', async (req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(503).json({ ok: false, reason: 'not_configured' });
  const token = await getIGDBToken();
  if (!token) return res.status(503).json({ ok: false, reason: 'token_failed' });
  return res.json({ ok: true });
});

app.post('/api/igdb/search', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query required' });
  if (query.length > 200) return res.status(400).json({ error: 'query too long' });
  const token = await getIGDBToken();
  if (!token) return res.status(503).json({ error: 'IGDB not configured' });
  try {
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: `search "${query.replace(/"/g, '')}"; fields name,genres.name,cover.image_id,summary,first_release_date; limit 10;`,
    });
    if (!igdbRes.ok) {
      const errText = await igdbRes.text().catch(() => '');
      console.error('[IGDB] Search API error:', igdbRes.status, errText);
      // Invalidate token on auth errors so next request gets a fresh one
      if (igdbRes.status === 401 || igdbRes.status === 403) { _igdbToken = null; _igdbTokenExpiry = 0; }
      return res.status(igdbRes.status).json({ error: 'IGDB API error: ' + igdbRes.status });
    }
    const games = await igdbRes.json();
    if (!Array.isArray(games)) {
      console.error('[IGDB] Unexpected response format:', JSON.stringify(games).slice(0, 300));
      return res.status(500).json({ error: 'IGDB returned unexpected format' });
    }
    const results = games.map(g => ({
      id: g.id,
      name: g.name,
      genres: (g.genres || []).map(gn => gn.name),
      coverUrl: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null,
      coverThumb: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.jpg` : null,
      summary: g.summary ? g.summary.slice(0, 200) : null,
      year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
    }));
    return res.json({ results });
  } catch (e) {
    console.error('[IGDB] Search error:', e.message);
    return res.status(500).json({ error: 'IGDB request failed' });
  }
});

app.post('/api/igdb/lookup', async (req, res) => {
  const { names } = req.body;
  if (!Array.isArray(names) || !names.length) return res.status(400).json({ error: 'names array required' });
  const token = await getIGDBToken();
  if (!token) return res.status(503).json({ error: 'IGDB not configured' });
  try {
    const nameList = names.slice(0, 20).map(n => `"${(n||'').replace(/"/g, '')}"`).join(',');
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      // IGDB list match uses `= (a,b,c)` — `~` is single-value fuzzy match only.
      body: `where name = (${nameList}); fields name,genres.name,cover.image_id,summary; limit 20;`,
    });
    if (!igdbRes.ok) {
      const errText = await igdbRes.text().catch(() => '');
      console.error('[IGDB] Lookup API error:', igdbRes.status, errText);
      if (igdbRes.status === 401 || igdbRes.status === 403) { _igdbToken = null; _igdbTokenExpiry = 0; }
      return res.status(igdbRes.status).json({ error: 'IGDB API error: ' + igdbRes.status });
    }
    const games = await igdbRes.json();
    if (!Array.isArray(games)) {
      console.error('[IGDB] Unexpected lookup response:', JSON.stringify(games).slice(0, 300));
      return res.status(500).json({ error: 'IGDB returned unexpected format' });
    }
    const results = {};
    games.forEach(g => {
      results[g.name] = {
        genres: (g.genres || []).map(gn => gn.name),
        coverUrl: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null,
        coverThumb: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.jpg` : null,
        summary: g.summary ? g.summary.slice(0, 200) : null,
      };
    });
    return res.json({ results });
  } catch (e) {
    console.error('[IGDB] Lookup error:', e.message);
    return res.status(500).json({ error: 'IGDB request failed' });
  }
});

// Fetch the full metadata blob for a single game by name (best match).
// Used by the in-app "registered game card" modal.
app.post('/api/igdb/game', async (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' });
  const token = await getIGDBToken();
  if (!token) return res.status(503).json({ error: 'IGDB not configured' });
  try {
    const safe = name.replace(/"/g, '');
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: `search "${safe}"; fields name,summary,genres.name,cover.image_id,first_release_date,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,platforms.name,platforms.abbreviation,screenshots.image_id,videos.video_id,videos.name,websites.url,websites.category,rating,rating_count,aggregated_rating,aggregated_rating_count; limit 1;`,
    });
    if (!igdbRes.ok) {
      const errText = await igdbRes.text().catch(() => '');
      console.error('[IGDB] Game API error:', igdbRes.status, errText);
      if (igdbRes.status === 401 || igdbRes.status === 403) { _igdbToken = null; _igdbTokenExpiry = 0; }
      return res.status(igdbRes.status).json({ error: 'IGDB API error: ' + igdbRes.status });
    }
    const games = await igdbRes.json();
    if (!Array.isArray(games) || !games.length) return res.json({ game: null });
    const g = games[0];
    const companies = g.involved_companies || [];
    const developers = companies.filter(c => c.developer).map(c => c.company?.name).filter(Boolean);
    const publishers = companies.filter(c => c.publisher).map(c => c.company?.name).filter(Boolean);
    // Website category codes (IGDB): 1=official, 13=steam, 2=wikia, 3=wikipedia, 4=facebook,
    // 5=twitter/x, 6=twitch, 8=instagram, 9=youtube, 10=iphone, 11=ipad, 12=android,
    // 14=reddit, 15=itch, 16=epicgames, 17=gog, 18=discord
    const WEBSITE_KIND = {1:'official',13:'steam',3:'wikipedia',4:'facebook',5:'twitter',6:'twitch',8:'instagram',9:'youtube',14:'reddit',15:'itch',16:'epic',17:'gog',18:'discord'};
    const links = (g.websites || [])
      .map(w => ({ kind: WEBSITE_KIND[w.category] || 'link', url: w.url }))
      .filter(l => l.url);
    const game = {
      id: g.id,
      name: g.name,
      summary: g.summary || null,
      genres: (g.genres || []).map(x => x.name),
      coverUrl: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_1080p/${g.cover.image_id}.jpg` : null,
      coverThumb: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null,
      screenshots: (g.screenshots || []).slice(0, 6).map(s => ({
        thumb: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${s.image_id}.jpg`,
        full:  `https://images.igdb.com/igdb/image/upload/t_screenshot_huge/${s.image_id}.jpg`,
      })),
      videos: (g.videos || []).slice(0, 3).map(v => ({
        id: v.video_id,
        name: v.name || 'Trailer',
        embedUrl: `https://www.youtube-nocookie.com/embed/${v.video_id}?rel=0&modestbranding=1`,
        thumb: `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`,
      })),
      releaseDate: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString() : null,
      developers, publishers,
      platforms: (g.platforms || []).map(p => ({ name: p.name, abbr: p.abbreviation || null })),
      links,
      userRating: typeof g.rating === 'number' ? Math.round(g.rating) : null,
      userRatingCount: g.rating_count || 0,
      criticRating: typeof g.aggregated_rating === 'number' ? Math.round(g.aggregated_rating) : null,
      criticRatingCount: g.aggregated_rating_count || 0,
    };
    return res.json({ game });
  } catch (e) {
    console.error('[IGDB] Game error:', e.message);
    return res.status(500).json({ error: 'IGDB request failed' });
  }
});

// ── Beacon endpoint for reliable tab-close offline ──
// navigator.sendBeacon fires synchronously on unload, so
// this guarantees the DB is updated even if the socket
// hasn't disconnected yet.
app.post('/api/presence/offline', async (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string') return res.status(400).json({ error: 'username required' });
  const u = username.trim().toLowerCase();
  if (!u || u.length > 32) return res.status(400).json({ error: 'invalid username' });

  // Only mark offline if no active socket exists for this user
  const hasSocket = onlineUsers.has(u);
  if (!hasSocket) {
    const now = Date.now();
    await Promise.all([
      sb.from('statuses').upsert({ username: u, status: 'offline' }, { onConflict: 'username' }),
      sb.from('users').update({ status: 'offline', last_seen: now, game_activity: null }).eq('username', u),
    ]).catch(err => console.warn('[Beacon] offline update failed for', u, err.message));
    io.emit('presence:update', { username: u, status: 'offline', gameActivity: null });
  }
  res.status(204).end();
});

// ── AI content moderation (server-proxied; key never touches the client) ──
// Free + provider-agnostic (OpenAI-compatible). Enable by setting AI_MOD_KEY in
// the environment. Optional overrides: AI_MOD_URL (default Groq's free API) and
// AI_MOD_MODEL (default a Llama model). Returns {available:false} when no key is
// set, so the client silently falls back to its local regex checks.
app.post('/api/moderate', async (req, res) => {
  // Trim: a trailing newline/space in the pasted env var value is the most
  // common "my key doesn't work" cause — it corrupts the Bearer header.
  const key = (process.env.AI_MOD_KEY || process.env.GROQ_API_KEY || '').trim();
  if (!key) return res.json({ available: false });
  const message = (req.body && typeof req.body.message === 'string') ? req.body.message.slice(0, 2000) : '';
  if (!message.trim()) return res.json({ available: true, flagged: false });
  const context = Array.isArray(req.body && req.body.context)
    ? req.body.context.slice(-14).map(s => String(s).slice(0, 300)) : [];
  const url = process.env.AI_MOD_URL || 'https://api.groq.com/openai/v1/chat/completions';
  const model = process.env.AI_MOD_MODEL || 'llama-3.3-70b-versatile';
  const sys = [
    "You are Fortized's automated safety moderator for a gaming chat app. Judge the MESSAGE TO REVIEW using the chat context to read intent.",
    'Flag ONLY genuinely harmful content in these categories:',
    '- physical_threat: a credible threat of real-world violence toward a person',
    '- sexual_threat: a threat of sexual violence',
    '- self_harm: encouraging or pressuring another person to kill or harm themselves (e.g. "kill yourself", "kys", "go die")',
    '- doxxing: threatening to expose someone\'s private info/address or to swat them',
    '- hate: slurs or dehumanizing hate toward a protected group',
    '- harassment: targeted, sustained cyberbullying or harassment of a person',
    'Do NOT flag: ordinary profanity, edgy jokes, gaming trash-talk ("I\'ll kill you" about a game), venting, or someone expressing their OWN distress ("I want to kill myself" is a person who may need help, NOT a violation).',
    'Pick action: "none", "warn" (most violations), or "suspend" (severe or repeated: credible threats, sexual threats, telling someone to self-harm, slurs, or sustained harassment).',
    'Respond ONLY with compact JSON: {"flagged":bool,"category":str,"severity":"none"|"low"|"medium"|"high","action":"none"|"warn"|"suspend","reason":"short human phrase e.g. threatening violence against someone","confidence":0..1}',
  ].join('\n');
  const userMsg = 'CHAT CONTEXT (oldest to newest):\n' + (context.join('\n') || '(none)') + '\n\nMESSAGE TO REVIEW:\n' + message;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0, max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!r.ok) {
      // Surface the real upstream error (decommissioned model, bad key, rate
      // limit, …) instead of a bare status, and log it so it shows in Render.
      let body = '';
      try { body = (await r.text()).slice(0, 500); } catch (_) {}
      console.warn('[moderate] upstream ' + r.status + ' from ' + url + ' (model=' + model + '): ' + body);
      return res.json({ available: true, flagged: false, error: 'upstream ' + r.status, detail: body });
    }
    const j = await r.json();
    let out = {};
    try { out = JSON.parse((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '{}'); } catch (_) {}
    const sev = ['none', 'low', 'medium', 'high'].includes(out.severity) ? out.severity : 'none';
    const act = ['none', 'warn', 'suspend'].includes(out.action) ? out.action : (out.flagged ? 'warn' : 'none');
    return res.json({
      available: true,
      flagged: !!out.flagged,
      category: String(out.category || '').slice(0, 40),
      severity: sev,
      action: act,
      reason: String(out.reason || 'a safety violation').slice(0, 120),
      confidence: (typeof out.confidence === 'number') ? out.confidence : null,
    });
  } catch (e) {
    return res.json({ available: true, flagged: false, error: String((e && e.message) || e) });
  }
});

// Diagnostic: hit this in a browser (GET /api/moderate/health) to see EXACTLY
// why moderation isn't working. It does a tiny real call to the provider and
// reports the key presence, the model, and the upstream status + error body.
// Never returns the key itself. Use it to debug AI_MOD_KEY setup on Render.
app.get('/api/moderate/health', async (req, res) => {
  const rawKey = process.env.AI_MOD_KEY || process.env.GROQ_API_KEY || '';
  const key = rawKey.trim();
  const url = process.env.AI_MOD_URL || 'https://api.groq.com/openai/v1/chat/completions';
  const model = process.env.AI_MOD_MODEL || 'llama-3.3-70b-versatile';
  const info = {
    keyPresent: !!key,
    keyLength: key.length,
    keyHadWhitespace: rawKey !== key,
    keyPrefix: key ? key.slice(0, 4) : null, // e.g. "gsk_" for a Groq key
    url, model,
  };
  if (!key) return res.status(503).json({ ok: false, reason: 'no_key', ...info });
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0, max_tokens: 5,
        messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    const body = (await r.text()).slice(0, 800);
    if (!r.ok) return res.status(200).json({ ok: false, reason: 'upstream_error', status: r.status, detail: body, ...info });
    return res.json({ ok: true, status: r.status, ...info });
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'fetch_failed', error: String((e && e.message) || e), ...info });
  }
});

// ── Swiftaw Lifecheck: server-side token verification ─────────────
// The browser widget mints a single-use token; the client posts it here and we
// confirm it with Swiftaw using the SECRET key, which never leaves the server.
// Gate the client action on { success: true }. If the secret isn't configured
// the client falls back to its built-in challenge (configured:false tells it so).
const LIFECHECK_VERIFY_URL = process.env.SWIFTAW_LIFECHECK_URL
  || 'https://mwszvynzzugbowdngzab.supabase.co/rest/v1/rpc/lifecheck_verify_token';
// Lifecheck's OWN public API key for its RPC host. This is a fixed value that
// is identical for every Lifecheck customer and safe to ship — it is NOT one of
// our keys. We used to send our site key here, which the API rejects with
// 401 "Invalid API key" before it ever reads the token, so every verification
// failed no matter how the widget behaved.
const LIFECHECK_APIKEY = (process.env.SWIFTAW_LIFECHECK_APIKEY
  || 'sb_publishable_dqsqX2klo1j4xSyEFA7O1w_UjM8lEGf').trim();
// OUR public site key, issued on the Lifecheck dashboard — always `lc_site_…`.
// The browser widget needs it and it is safe in client code, but it must be a
// key that actually exists with fortized.com on its allowed-domains list. When
// it's unset the client skips the widget entirely and uses the built-in
// challenge, rather than rendering a widget that cannot mint a token.
const LIFECHECK_SITEKEY = (process.env.SWIFTAW_LIFECHECK_SITEKEY || '').trim();
app.post('/api/lifecheck/verify', async (req, res) => {
  const secret = (process.env.SWIFTAW_LIFECHECK_SECRET || '').trim();
  const token = (req.body && typeof req.body.token === 'string') ? req.body.token.trim() : '';
  if (!secret) return res.json({ success: false, configured: false, error: 'secret-not-configured' });
  if (!token)  return res.json({ success: false, configured: true, error: 'missing-input-token' });
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(LIFECHECK_VERIFY_URL, {
      method: 'POST',
      headers: { 'apikey': LIFECHECK_APIKEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: secret, p_token: token }),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!r.ok) {
      let body = ''; try { body = (await r.text()).slice(0, 300); } catch (_) {}
      console.warn('[lifecheck] upstream ' + r.status + ': ' + body);
      return res.json({ success: false, configured: true, error: 'upstream ' + r.status });
    }
    const j = await r.json();
    // The RPC can return a single object or a one-row array — normalise both.
    const v = Array.isArray(j) ? (j[0] || {}) : (j || {});
    return res.json({
      success: !!v.success,
      configured: true,
      score: (typeof v.score === 'number') ? v.score : null,
      passed: String(v.passed || ''),
      hostname: String(v.hostname || ''),
      errorCodes: Array.isArray(v['error-codes']) ? v['error-codes'] : (Array.isArray(v.error_codes) ? v.error_codes : []),
    });
  } catch (e) {
    return res.json({ success: false, configured: true, error: String((e && e.message) || e) });
  }
});
// Client config + diagnostic. Never leaks the secret — it only reports whether
// one is set. `sitekey` is public by design (the widget puts it in a URL), and
// serving it from here keeps the client from hardcoding a key that doesn't
// match whatever is registered on the Lifecheck dashboard.
app.get('/api/lifecheck/health', (req, res) => {
  res.json({
    configured: !!(process.env.SWIFTAW_LIFECHECK_SECRET || '').trim(),
    sitekey: LIFECHECK_SITEKEY,
    // Back-compat with older clients that read `public`.
    public: LIFECHECK_SITEKEY,
  });
});

// ── Spotify OAuth (server-side exchange) ──────────
// The server holds the PKCE verifier and does the full token exchange
// so the app and callback don't need to share localStorage.
const _spotifyAuth = new Map(); // state -> { codeVerifier, clientId, redirectUri, ts, tokens }
// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _spotifyAuth) {
    if (now - v.ts > 600000) _spotifyAuth.delete(k);
  }
}, 300000);

// Env-driven Spotify config — mirrors the IGDB setup. Client reads this
// from /api/spotify/config so nothing is hardcoded on the client side.
function _spotifyConfig() {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'https://fortized.com/spotify-callback.html',
  };
}

// Health probe — same pattern as /api/igdb/health.
app.get('/api/spotify/health', (req, res) => {
  const cfg = _spotifyConfig();
  if (!cfg.clientId) return res.status(503).json({ ok: false, reason: 'not_configured' });
  return res.json({ ok: true, clientId: cfg.clientId, redirectUri: cfg.redirectUri });
});

// Config (for the client to build the authorize URL without hardcoding).
app.get('/api/spotify/config', (req, res) => {
  const cfg = _spotifyConfig();
  if (!cfg.clientId) return res.status(503).json({ error: 'Spotify not configured on server' });
  res.json({ clientId: cfg.clientId, redirectUri: cfg.redirectUri });
});

// Step 1: App sends PKCE verifier before opening Spotify auth
app.post('/api/spotify-auth-init', (req, res) => {
  const { state, codeVerifier } = req.body;
  if (!state || !codeVerifier) return res.status(400).json({ error: 'Missing state or codeVerifier' });
  const cfg = _spotifyConfig();
  if (!cfg.clientId) return res.status(503).json({ error: 'Spotify not configured on server' });
  _spotifyAuth.set(state, { codeVerifier, clientId: cfg.clientId, redirectUri: cfg.redirectUri, ts: Date.now(), tokens: null });
  res.json({ ok: true });
});

// Step 2: Callback page sends the authorization code
app.post('/api/spotify-code', async (req, res) => {
  const { state, code } = req.body;
  if (!state || !code) return res.status(400).json({ error: 'Missing state or code' });
  const entry = _spotifyAuth.get(state);
  if (!entry) return res.status(404).json({ error: 'Unknown state' });
  const cfg = _spotifyConfig();
  if (!cfg.clientId) return res.status(503).json({ error: 'Spotify not configured on server' });

  // Exchange the code for tokens. PKCE flow (no client secret required)
  // but we include one when available for wider compatibility.
  try {
    const body = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: entry.redirectUri || cfg.redirectUri,
      client_id: entry.clientId || cfg.clientId,
      code_verifier: entry.codeVerifier,
    };
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (cfg.clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
    }
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers,
      body: new URLSearchParams(body).toString(),
    });
    const data = await tokenRes.json();
    if (data.access_token) {
      entry.tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || null,
        expires_in: data.expires_in || 3600,
      };
      return res.json({ ok: true });
    }
    console.error('[Spotify] Token exchange failed:', data);
    entry.tokens = { error: data.error_description || data.error || 'Token exchange failed' };
    return res.json({ ok: false, error: entry.tokens.error });
  } catch (e) {
    console.error('[Spotify] Token exchange error:', e);
    entry.tokens = { error: e.message };
    return res.json({ ok: false, error: e.message });
  }
});

// Step 3: App polls for the tokens
app.get('/api/spotify-tokens/:state', (req, res) => {
  const entry = _spotifyAuth.get(req.params.state);
  if (!entry) return res.json({ tokens: null });
  if (entry.tokens) {
    _spotifyAuth.delete(req.params.state); // One-time read
    return res.json({ tokens: entry.tokens });
  }
  res.json({ tokens: null }); // Not ready yet
});

// Server-side refresh — clients POST their refresh_token and get a new
// access_token back. Keeps the refresh flow server-owned so we can later
// drop in Basic auth with the client secret without leaking it to browsers.
app.post('/api/spotify/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });
  const cfg = _spotifyConfig();
  if (!cfg.clientId) return res.status(503).json({ error: 'Spotify not configured on server' });
  try {
    const body = {
      grant_type: 'refresh_token',
      refresh_token,
      client_id: cfg.clientId,
    };
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (cfg.clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
    }
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers,
      body: new URLSearchParams(body).toString(),
    });
    const data = await r.json();
    if (data.access_token) {
      return res.json({
        access_token: data.access_token,
        refresh_token: data.refresh_token || null,
        expires_in: data.expires_in || 3600,
      });
    }
    console.error('[Spotify] Refresh failed:', data);
    return res.status(400).json({ error: data.error_description || data.error || 'Refresh failed' });
  } catch (e) {
    console.error('[Spotify] Refresh error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// ── Bastion Invite API ────────────────────────────
// Returns bastion info for an invite code (used by invite landing page + chat embeds)
// ── Joyster AI proxy — keeps the key on the server, not the client ──
// Client POSTs { body: <gemini-request-body> }. If GEMINI_API_KEY is set we
// forward straight to Gemini. Otherwise we reuse the SAME key as the moderation
// AI (AI_MOD_KEY, OpenAI-compatible) so you only ever configure one key — we
// translate the Gemini request in and the Gemini response shape back out, so the
// client needs no changes.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL   = process.env.GEMINI_MODEL   || 'gemini-2.5-flash';
app.post('/api/joyster', async (req, res) => {
  const body = req.body?.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Missing body' });

  // Preferred path: a dedicated Gemini key.
  if (GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_API_KEY}`;
      const upstream = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const text = await upstream.text();
      return res.status(upstream.status).type('application/json').send(text);
    } catch (e) { return res.status(502).json({ error: 'Upstream failed' }); }
  }

  // Fallback: reuse the moderation key (OpenAI-compatible, e.g. Groq).
  const key = (process.env.AI_MOD_KEY || process.env.GROQ_API_KEY || '').trim();
  if (!key) return res.status(503).json({ error: 'AI not configured' });
  try {
    const url = process.env.AI_MOD_URL || 'https://api.groq.com/openai/v1/chat/completions';
    const model = process.env.AI_MOD_MODEL || 'llama-3.3-70b-versatile';
    const sysText = (body.systemInstruction?.parts || []).map(p => p && p.text).filter(Boolean).join('\n');
    const userText = (body.contents || []).map(c => (c.parts || []).map(p => p && p.text).filter(Boolean).join('\n')).filter(Boolean).join('\n');
    const messages = [];
    if (sysText) messages.push({ role: 'system', content: sysText });
    messages.push({ role: 'user', content: userText || 'Say something in character.' });
    const gc = body.generationConfig || {};
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: (typeof gc.temperature === 'number') ? gc.temperature : 1.0, max_tokens: gc.maxOutputTokens || 150, messages }),
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'upstream ' + upstream.status });
    const j = await upstream.json();
    const out = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    // Return the Gemini response shape the client already parses.
    return res.json({ candidates: [{ content: { parts: [{ text: out }] } }] });
  } catch (e) { return res.status(502).json({ error: 'Upstream failed' }); }
});

// ─── Public API: Fortized API Keys ──────────────────────────────────
// Third-party integrations call /api/v1/* with a `ftz_…` key supplied
// either as `X-Fortized-Key` header or `?key=` query parameter. Keys
// live on the user record (raw.apiKeys[]); we look up the owning user
// via Supabase JSONB containment.

function _readApiKey(req) {
  const h = req.headers['x-fortized-key'];
  if (typeof h === 'string' && h.startsWith('ftz_')) return h;
  const q = req.query?.key;
  if (typeof q === 'string' && q.startsWith('ftz_')) return q;
  return null;
}

async function _findKeyOwner(token) {
  if (!token || !token.startsWith('ftz_')) return null;
  try {
    const { data } = await sb.from('users').select('username,display_name,pfp,raw').contains('raw', { apiKeys: [{ key: token }] }).limit(1);
    if (!Array.isArray(data) || !data.length) return null;
    const row = data[0];
    const keys = Array.isArray(row?.raw?.apiKeys) ? row.raw.apiKeys : [];
    const rec = keys.find(k => k && k.key === token);
    if (!rec) return null;
    return { row, rec };
  } catch(e) {
    console.warn('[API] key lookup failed:', e.message);
    return null;
  }
}

async function _bumpKeyLastUsed(row, rec) {
  try {
    const keys = (row.raw.apiKeys || []).map(k => k && k.id === rec.id ? { ...k, lastUsed: new Date().toISOString() } : k);
    const newRaw = { ...(row.raw || {}), apiKeys: keys };
    await sb.from('users').update({ raw: newRaw }).eq('username', row.username);
  } catch(_) {}
}

function _scopeAllows(rec, scope) {
  const scopes = Array.isArray(rec?.scopes) ? rec.scopes : [];
  return scopes.includes(scope);
}

// GET /api/v1/me — verify a key and identify its owner.
app.get('/api/v1/me', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const token = _readApiKey(req);
  if (!token) return res.status(401).json({ error: 'Missing key. Pass X-Fortized-Key header or ?key=…' });
  const found = await _findKeyOwner(token);
  if (!found) return res.status(401).json({ error: 'Invalid or revoked key.' });
  if (!_scopeAllows(found.rec, 'identify')) return res.status(403).json({ error: 'Key lacks the `identify` scope.' });
  // Don't await — bump the timestamp lazily so we don't slow the response.
  _bumpKeyLastUsed(found.row, found.rec);
  res.json({
    username: found.row.username,
    displayName: found.row.display_name || found.row.username,
    pfp: found.row.pfp || null,
    verified: !!(found.row.raw && found.row.raw.verified),
    scopes: found.rec.scopes || [],
  });
});

// GET /api/v1/bastions/:id — public info for a bastion the key's owner
// owns (member count, name, icon). Used by the upcoming embed widgets.
app.get('/api/v1/bastions/:id', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const token = _readApiKey(req);
  if (!token) return res.status(401).json({ error: 'Missing key.' });
  const found = await _findKeyOwner(token);
  if (!found) return res.status(401).json({ error: 'Invalid or revoked key.' });
  if (!_scopeAllows(found.rec, 'bastions:read')) return res.status(403).json({ error: 'Key lacks the `bastions:read` scope.' });
  try {
    const { data: row } = await sb.from('global_bastions').select('id,data').eq('id', req.params.id).maybeSingle();
    if (!row || !row.data) return res.status(404).json({ error: 'Bastion not found.' });
    const b = row.data;
    // Only owners or admins should expose details; readonly members count for everyone else.
    const isOwner = b.owner === found.row.username;
    _bumpKeyLastUsed(found.row, found.rec);
    res.json({
      id: row.id,
      name: b.name || '',
      icon: b.icon || null,
      memberCount: Array.isArray(b.members) ? b.members.length : 0,
      online: Array.isArray(b.members) ? b.members.filter(m => m && m.status && m.status !== 'offline').length : 0,
      vanity: b.vanityUrl || null,
      isOwner,
    });
  } catch(e) {
    console.warn('[API] bastion read failed:', e.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Preflight for cross-origin embeds.
app.options('/api/v1/{*rest}', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'X-Fortized-Key, Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.sendStatus(204);
});

app.get('/api/bastion/invite/:code', async (req, res) => {
  try {
    const code = req.params.code;
    if (!code) return res.json({ success: false, error: 'No invite code' });

    // 1. Look up invite in the dedicated invites table
    const { data: invData } = await sb.from('invites').select('data').eq('code', code).maybeSingle();
    const invite = invData?.data || null;

    let bastion = null;

    // 2. If invite has a bastionId, fetch the bastion directly
    if (invite?.bastionId) {
      const { data: bData } = await sb.from('global_bastions').select('id,data').eq('id', invite.bastionId).maybeSingle();
      if (bData?.data) bastion = { ...bData.data, id: bData.id };
    }

    // 3. Fallback: search all global bastions for the invite code
    if (!bastion) {
      const { data: allBastions } = await sb.from('global_bastions').select('id,data');
      if (allBastions) {
        for (const row of allBastions) {
          const b = row.data;
          if (!b || !b.invites) continue;
          const found = b.invites.find(inv => inv.code === code);
          if (found) {
            if (found.expires && new Date(found.expires) < new Date()) continue;
            if (found.maxUses && (found.uses || 0) >= found.maxUses) continue;
            bastion = { ...b, id: row.id };
            break;
          }
        }
      }
    }

    if (!bastion) return res.json({ success: false, error: 'Invite not found or expired' });

    // 4. Get member count
    const { data: membersData } = await sb.from('bastion_members').select('members').eq('bastion_id', bastion.id).maybeSingle();
    const memberCount = membersData?.members?.length || 1;

    res.json({
      success: true,
      bastion: {
        id: bastion.id,
        name: bastion.name || 'Unnamed Bastion',
        icon: bastion.icon || null,
        emblem: bastion.emblem || null,
        banner: bastion.banner || null,
        desc: bastion.desc || bastion.description || '',
        memberCount,
        boostLevel: bastion.boostLevel || 0,
        owner: bastion.owner || invite?.createdBy || null,
      }
    });
  } catch (e) {
    console.error('[API] bastion invite lookup failed:', e.message);
    res.json({ success: false, error: 'Server error' });
  }
});

// ── Static file cache headers ──────────────────────
// Must run BEFORE express.static so headers are set before the file is sent.
app.use((req, res, next) => {
  const p = req.path;
  // Service worker: must never be cached by CDN or browser — always fetch fresh
  if (p === '/sw.js') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return next();
  }
  // HTML / navigation: no-cache so deploys are always picked up
  if (p.endsWith('.html') || p === '/' || !p.includes('.')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return next();
  }
  // Versioned assets (?v=...): immutable — content never changes for a given URL
  if (req.query.v) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return next();
  }
  // Everything else (images, fonts, unversioned assets): revalidate each time
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  next();
});
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html',
}));
// Vanity invite URL: /join/BASTION_NAME → redirect to /app?invite=CODE
app.get('/join/:vanity', async (req, res) => {
  try {
    const vanity = req.params.vanity.toLowerCase();
    // Search global_bastions for matching vanity URL or name
    const { data: allBastions } = await sb.from('global_bastions').select('id,data');
    if (allBastions) {
      for (const row of allBastions) {
        const b = row.data;
        if (!b) continue;
        if ((b.vanityUrl||'').toLowerCase() === vanity || (b.name||'').toLowerCase().replace(/[^a-z0-9]/g,'') === vanity) {
          // Find an active invite
          const invites = b.invites || [];
          const active = invites.find(inv => {
            if (inv.expires && new Date(inv.expires) < new Date()) return false;
            if (inv.maxUses && (inv.uses||0) >= inv.maxUses) return false;
            return true;
          });
          if (active) return res.redirect('/app?invite=' + active.code);
          // No active invite — try the invites table
          const { data: invData } = await sb.from('invites').select('data').eq('data->>bastionId', row.id).limit(1);
          if (invData?.length) return res.redirect('/app?invite=' + (invData[0].data?.code || ''));
        }
      }
    }
    res.redirect('/app?error=vanity_not_found');
  } catch (e) {
    console.error('[Vanity] Lookup failed:', e.message);
    res.redirect('/app');
  }
});

// App subpage routes — each has its own index.html
// Dynamic OG embed for invite links (shows bastion info when shared on Discord/etc)
app.get('/invite', async (req, res) => {
  const code = req.query.invite || req.query.code || '';
  if (!code) return res.sendFile(path.join(__dirname, 'invite', 'index.html'));
  try {
    // Look up bastion data for OG tags
    const { data: invData } = await sb.from('invites').select('data').eq('code', code).maybeSingle();
    const invite = invData?.data || null;
    let bastion = null;
    if (invite?.bastionId) {
      const { data: bData } = await sb.from('global_bastions').select('id,data').eq('id', invite.bastionId).maybeSingle();
      if (bData?.data) bastion = bData.data;
    }
    if (!bastion) {
      const { data: allB } = await sb.from('global_bastions').select('id,data');
      if (allB) for (const row of allB) { if (row.data?.invites?.some(i => i.code === code)) { bastion = row.data; break; } }
    }
    // Read the invite HTML and inject OG tags
    const fs = require('fs');
    let html = fs.readFileSync(path.join(__dirname, 'invite', 'index.html'), 'utf8');
    if (bastion) {
      const ogTags = `<meta property="og:title" content="${(bastion.name||'Bastion').replace(/"/g,'&quot;')} — Fortized">
    <meta property="og:description" content="${(bastion.desc||bastion.tagline||'Join this bastion on Fortized!').replace(/"/g,'&quot;').slice(0,200)}">
    <meta property="og:image" content="${bastion.banner||bastion.icon||'https://fortized.com/Fortized banner.png?v=2'}">
    <meta property="og:url" content="https://invite.fortized.com/${encodeURIComponent(code)}">
    <meta name="theme-color" content="#fff93e">`;
      html = html.replace('</head>', ogTags + '\n</head>');
    }
    res.send(html);
  } catch (e) {
    console.error('[Invite OG] Failed:', e.message);
    res.sendFile(path.join(__dirname, 'invite', 'index.html'));
  }
});

// Helper: send an HTML file with explicit no-cache headers so nothing between
// origin and browser (CDN, Render edge, HTTP cache) can ever serve a stale copy.
// `cacheControl: false` stops sendFile from setting its own max-age default.
function sendHtmlNoCache(res, filePath) {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(filePath, { cacheControl: false });
}
// Explicit no-cache app routes (all other /app/* paths are covered by the
// /app/{*rest} SPA fallback below, incl. /app/friends, /app/radiance,
// /app/fortshop, /app/quests, /app/creator).
app.get('/app/messages', (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/friends',  (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/discover', (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/radiance', (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/fortshop', (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/quests',   (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/creator',  (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/bastion',  (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
// ── Short invite links ────────────────────────────────────────────────
// Everything lands on /app?invite=CODE, which the client already resolves
// (checkInviteLink -> joinByInvite -> the invite card). These are only nicer
// front doors onto that one path.
//   fortized.com/invite/CODE
//   fortized.com/i/CODE
//   invite.fortized.com/CODE   ← handled by the host guard near the top of this
//                                file, which never reaches these routes.
// ⚠️ A code is [A-Za-z0-9_-] only (INVITE_CODE_RE, defined with that guard).
// Anything else falls through to the normal routes, so a stray /i/… can never
// shadow a real page.
function sendInvite(res, code) { res.redirect(302, '/app?invite=' + encodeURIComponent(code)); }
app.get('/invite/:code', (req, res, next) =>
  INVITE_CODE_RE.test(req.params.code) ? sendInvite(res, req.params.code) : next());
app.get('/i/:code', (req, res, next) =>
  INVITE_CODE_RE.test(req.params.code) ? sendInvite(res, req.params.code) : next());

// Backwards-compat: /blog -> /newsroom (folder was renamed)
app.get('/blog', (_req, res) => res.redirect(301, '/newsroom'));
app.get('/blog/{*rest}', (req, res) => res.redirect(301, '/newsroom'));
// SPA-style fallback for /app, /login, etc.
['app', 'login', 'signup', 'newsroom', 'support', 'download', 'privacy', 'terms', 'legal'].forEach(route => {
  app.get(`/${route}`,            (_req, res) => sendHtmlNoCache(res, path.join(__dirname, route, 'index.html')));
  app.get(`/${route}/{*rest}`,    (_req, res) => sendHtmlNoCache(res, path.join(__dirname, route, 'index.html')));
});

// Explicit no-cache for all support subpages
['support/status', 'support/help', 'support/contact', 'support/contact/index'].forEach(route => {
  app.get(`/${route}`, (_req, res) => sendHtmlNoCache(res, path.join(__dirname, route.replace('/contact/index', '/contact') + '.html')));
});

// ── Custom 404 page for unknown routes ────────────
app.use((req, res, next) => {
  // Let API routes and socket.io pass through
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
  res.status(404).sendFile(path.join(__dirname, '404', 'index.html'));
});

// ── In-memory live state ───────────────────────────
// These are ephemeral — Firebase remains the source of truth for persistence.
// Socket.io handles the real-time broadcast layer.
const onlineUsers = new Map();   // username -> { socketId, status, gameActivity }
const userSockets = new Map();   // username -> Set<socketId> (multi-tab tracking)
const typingState = new Map();   // roomKey -> Set<username>
const roomMembers = new Map();   // roomKey -> Set<socketId>

// ── Rate limiter for socket events ──
const _rateLimits = new Map();  // socketId -> { event: lastTime }
function rateLimit(socketId, event, cooldownMs = 100) {
  const key = socketId + ':' + event;
  const now = Date.now();
  const last = _rateLimits.get(key) || 0;
  if (now - last < cooldownMs) return false;
  _rateLimits.set(key, now);
  return true;
}
// Cleanup rate limits every minute
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [k, v] of _rateLimits) {
    if (v < cutoff) _rateLimits.delete(k);
  }
}, 60000);

// ── Input sanitization helper ──
function sanitizeString(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function roomKey(type, id1, id2) {
  if (type === 'dm') return `dm:${[id1, id2].sort().join('__')}`;
  if (type === 'bastion') return `bastion:${id1}:${id2}`;
  if (type === 'gc') return `gc:${id1}`;
  return `${type}:${id1}`;
}

// ── Socket.io Connection ───────────────────────────
io.on('connection', (socket) => {
  let username = null;

  // ── Auth / Identify ──
  socket.on('identify', (data) => {
    if (!data || typeof data !== 'object') return;
    username = (data.username || '').trim().toLowerCase();
    if (!username || username.length > 32) return;
    // Tag socket so multi-tab disconnect check can find it
    socket.data = socket.data || {};
    socket.data.username = username;

    const status = data.status || 'online';
    const gameActivity = data.gameActivity || null;
    onlineUsers.set(username, {
      socketId: socket.id,
      status,
      gameActivity,
    });
    // Track multi-tab connections for fast disconnect lookups
    if (!userSockets.has(username)) userSockets.set(username, new Set());
    userSockets.get(username).add(socket.id);
    socket.join(`user:${username}`);

    // Persist online status to DB (user just connected)
    const visibleStatus = status === 'invisible' ? 'offline' : status;
    Promise.all([
      sb.from('statuses').upsert({ username, status: visibleStatus }, { onConflict: 'username' }),
      sb.from('users').update({ status: visibleStatus }).eq('username', username),
    ]).catch(err => console.warn('[Presence] DB online update failed for', username, err.message));

    // Broadcast presence to everyone (hide invisible as offline)
    io.emit('presence:update', { username, status: visibleStatus, gameActivity });
  });

  // ── Status Change ──
  socket.on('status:set', (data) => {
    if (!username) return;
    const entry = onlineUsers.get(username) || { socketId: socket.id };
    entry.status = data.status || 'online';
    onlineUsers.set(username, entry);
    const broadcastStatus = entry.status === 'invisible' ? 'offline' : entry.status;
    // Persist to DB
    Promise.all([
      sb.from('statuses').upsert({ username, status: broadcastStatus }, { onConflict: 'username' }),
      sb.from('users').update({ status: broadcastStatus }).eq('username', username),
    ]).catch(err => console.warn('[Presence] DB status update failed for', username, err.message));
    io.emit('presence:update', { username, status: broadcastStatus, gameActivity: entry.gameActivity });
  });

  // ── Game / App Activity ──
  socket.on('activity:set', (data) => {
    if (!username || !data || typeof data !== 'object') return;
    if (!rateLimit(socket.id, 'activity:set', 500)) return;
    const entry = onlineUsers.get(username) || { socketId: socket.id };
    entry.gameActivity = data.activity || null;
    entry.activityState = data.activityState || null;  // Store new multi-activity format
    onlineUsers.set(username, entry);
    const broadcastStatus = entry.status === 'invisible' ? 'offline' : entry.status;
    // Hide game activity if invisible (would leak presence)
    const broadcastActivity = entry.status === 'invisible' ? null : entry.gameActivity;
    const broadcastActivityState = entry.status === 'invisible' ? null : entry.activityState;
    io.emit('presence:update', { username, status: broadcastStatus, gameActivity: broadcastActivity, activityState: broadcastActivityState });
  });

  // Handle real-time activity updates from broadcastIfChanged()
  socket.on('activity:update', (data) => {
    if (!username || !data || typeof data !== 'object') return;
    if (!rateLimit(socket.id, 'activity:update', 500)) return;
    const entry = onlineUsers.get(username) || { socketId: socket.id };
    entry.activityState = data.activityState || null;
    entry.gameActivity = data.activityState?.primary || null;  // Keep backward compat
    onlineUsers.set(username, entry);
    const broadcastStatus = entry.status === 'invisible' ? 'offline' : entry.status;
    const broadcastActivityState = entry.status === 'invisible' ? null : entry.activityState;
    const broadcastActivity = entry.status === 'invisible' ? null : entry.gameActivity;
    // Broadcast activity update to all clients (includes real-time updates)
    io.emit('activity:changed', { username, activityState: broadcastActivityState, gameActivity: broadcastActivity });
  });

  // ── Join a chat room (DM, bastion channel, group chat) ──
  socket.on('room:join', (data) => {
    if (!data || !data.type) return;
    if (!rateLimit(socket.id, 'room:join', 200)) return;
    const key = roomKey(data.type, data.id1, data.id2);
    socket.join(key);
    if (!roomMembers.has(key)) roomMembers.set(key, new Set());
    roomMembers.get(key).add(socket.id);
  });

  socket.on('room:leave', (data) => {
    if (!data || !data.type) return;
    const key = roomKey(data.type, data.id1, data.id2);
    socket.leave(key);
    roomMembers.get(key)?.delete(socket.id);
    // Clear typing state for this user in the room
    typingState.get(key)?.delete(username);
    io.to(key).emit('typing:update', { room: key, users: [...(typingState.get(key) || [])] });
  });

  // ── Live Message Relay ──
  // Client sends message (after saving to Firebase), server broadcasts instantly.
  socket.on('message:send', (data) => {
    if (!username) return;
    if (!rateLimit(socket.id, 'message:send', 200)) return;  // Rate limit: 5 msgs/sec max
    if (!data || !data.type || !data.message) return;  // Validate required fields
    const key = roomKey(data.type, data.id1, data.id2);
    // Broadcast to everyone in the room (including sender for confirmation)
    io.to(key).emit('message:new', {
      room: key,
      message: data.message,
    });
    // Clear typing for sender
    typingState.get(key)?.delete(username);
    io.to(key).emit('typing:update', { room: key, users: [...(typingState.get(key) || [])] });
  });

  // ── Typing Indicators ──
  socket.on('typing:start', (data) => {
    if (!username) return;
    if (!rateLimit(socket.id, 'typing:start', 1000)) return;  // Rate limit: 1/sec
    if (!data || !data.type) return;
    const key = roomKey(data.type, data.id1, data.id2);
    if (!typingState.has(key)) typingState.set(key, new Set());
    typingState.get(key).add(username);
    socket.to(key).emit('typing:update', { room: key, users: [...typingState.get(key)] });
  });

  socket.on('typing:stop', (data) => {
    if (!username || !data || !data.type) return;
    const key = roomKey(data.type, data.id1, data.id2);
    typingState.get(key)?.delete(username);
    socket.to(key).emit('typing:update', { room: key, users: [...(typingState.get(key) || [])] });
  });

  // ── Message Edit (live broadcast) ──
  socket.on('message:edit', (data) => {
    if (!username) return;
    if (!rateLimit(socket.id, 'message:edit', 300)) return;
    if (!data || !data.type || !data.messageId) return;
    const key = roomKey(data.type, data.id1, data.id2);
    io.to(key).emit('message:edited', {
      room: key,
      messageId: data.messageId,
      newText: sanitizeString(data.newText, 500000),
      editedBy: username,
    });
  });

  // ── Message Delete (live broadcast) ──
  socket.on('message:delete', (data) => {
    if (!username) return;
    if (!rateLimit(socket.id, 'message:delete', 300)) return;
    if (!data || !data.type || !data.messageId) return;
    const key = roomKey(data.type, data.id1, data.id2);
    io.to(key).emit('message:deleted', {
      room: key,
      messageId: data.messageId,
      deletedBy: username,
    });
  });

  // ── Reactions (live broadcast) ──
  socket.on('reaction:toggle', (data) => {
    if (!username) return;
    if (!rateLimit(socket.id, 'reaction:toggle', 200)) return;
    if (!data || !data.type || !data.messageId || !data.emoji) return;
    const key = roomKey(data.type, data.id1, data.id2);
    io.to(key).emit('reaction:update', {
      room: key,
      messageId: data.messageId,
      emoji: sanitizeString(data.emoji, 32),
      username,
    });
  });

  // ── Notifications (targeted) ──
  socket.on('notification:send', (data) => {
    if (!data || !data.to || typeof data.to !== 'string') return;
    if (!rateLimit(socket.id, 'notification:send', 500)) return;
    io.to(`user:${data.to}`).emit('notification:new', data.notification);
  });

  // ── Friend Request Events ──
  socket.on('friend:request', (data) => {
    if (!username || !data?.to || typeof data.to !== 'string') return;
    if (!rateLimit(socket.id, 'friend:request', 2000)) return;
    const to = sanitizeString(data.to, 32);
    if (!to) return;
    io.to(`user:${to}`).emit('friend:request:new', { from: username });
  });
  socket.on('friend:accept', (data) => {
    if (!username || !data?.to || typeof data.to !== 'string') return;
    if (!rateLimit(socket.id, 'friend:accept', 1000)) return;
    const to = sanitizeString(data.to, 32);
    if (!to) return;
    io.to(`user:${to}`).emit('friend:accepted', { from: username });
  });

  // ── Poll Events (real-time broadcast) ──
  socket.on('poll:update', (data) => {
    if (!username || !data?.bastionId) return;
    if (!rateLimit(socket.id, 'poll:update', 500)) return;
    // Validate action against allowed values
    const validActions = ['create', 'vote', 'unvote', 'delete'];
    if (data.action && !validActions.includes(data.action)) return;
    // Broadcast to all connected clients so sidebar badges + poll channels update
    io.emit('poll:updated', {
      bastionId: sanitizeString(data.bastionId, 100),
      channelName: sanitizeString(data.channelName || '', 100),
      action: data.action || 'update',
      pollKey: sanitizeString(data.pollKey || '', 100),
      username,
    });
  });

  // ── Announcement Events (real-time broadcast) ──
  socket.on('announcement:broadcast', (data) => {
    if (!username) return;
    if (!rateLimit(socket.id, 'announcement:broadcast', 5000)) return;
    if (!data?.text || typeof data.text !== 'string') return;
    io.emit('announcement:new', {
      text: sanitizeString(data.text, 500),
      from: username,
    });
  });
  socket.on('announcement:clear', () => {
    if (!username) return;
    if (!rateLimit(socket.id, 'announcement:clear', 5000)) return;
    io.emit('announcement:cleared', { from: username });
  });

  // ── Role / Bastion Update Events (real-time broadcast) ──
  socket.on('bastion:update', (data) => {
    if (!username || !data?.bastionId) return;
    if (!rateLimit(socket.id, 'bastion:update', 500)) return;
    io.emit('bastion:updated', {
      bastionId: sanitizeString(data.bastionId, 100),
      field: sanitizeString(data.field || '', 50),
      username,
    });
  });

  // ── Profile Update (pfp, displayName, etc.) ──
  socket.on('profile:update', (data) => {
    if (!username) return;
    if (!rateLimit(socket.id, 'profile:update', 1000)) return;
    if (!data || typeof data !== 'object') return;
    // Validate field against allowed values
    const validFields = ['pfp', 'displayName', 'displayFont', 'displayEffect', 'displayColor'];
    if (data.field && !validFields.includes(data.field)) return;
    io.emit('profile:updated', {
      username,
      pfp: typeof data.pfp === 'string' ? sanitizeString(data.pfp, 500) : null,
      displayName: data.displayName ? sanitizeString(data.displayName, 50) : null,
      displayFont: typeof data.displayFont === 'string' ? sanitizeString(data.displayFont, 50) : null,
      displayEffect: typeof data.displayEffect === 'string' ? sanitizeString(data.displayEffect, 50) : null,
      displayColor: typeof data.displayColor === 'string' ? sanitizeString(data.displayColor, 20) : null,
      field: data.field || 'pfp',
    });
  });

  // ── Disconnect ──
  // Discord-style: when the socket drops (tab closed, network lost, etc.)
  // we persist offline status + last_seen to the database so the user
  // appears offline to everyone — even those who query the DB directly.
  socket.on('disconnect', () => {
    if (!username) return;
    const prevEntry = onlineUsers.get(username);

    // Remove this socket from the user's socket set
    const sockets = userSockets.get(username);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) userSockets.delete(username);
    }

    // Only mark offline if the user doesn't have another active connection
    const stillConnected = sockets && sockets.size > 0;

    if (stillConnected) {
      // User still has other tabs — re-associate onlineUsers with a remaining socket
      const remainingSocketId = sockets.values().next().value;
      if (remainingSocketId && prevEntry) {
        onlineUsers.set(username, { ...prevEntry, socketId: remainingSocketId });
      }
    } else {
      // User is truly gone — remove from onlineUsers and broadcast offline
      onlineUsers.delete(username);

      // Broadcast ephemeral offline to connected clients
      io.emit('presence:update', { username, status: 'offline', gameActivity: null });

      // Persist to database — user is truly gone
      const now = Date.now();
      Promise.all([
        sb.from('statuses').upsert({ username, status: 'offline' }, { onConflict: 'username' }),
        sb.from('users').update({ status: 'offline', last_seen: now, game_activity: null }).eq('username', username),
      ]).catch(err => console.warn('[Presence] DB offline update failed for', username, err.message));
    }

    // Clean up typing state
    for (const [key, typers] of typingState) {
      if (typers.has(username)) {
        typers.delete(username);
        io.to(key).emit('typing:update', { room: key, users: [...typers] });
      }
    }

    // Clean up room members
    for (const [key, members] of roomMembers) {
      members.delete(socket.id);
      if (members.size === 0) roomMembers.delete(key);
    }
  });

  // ── Bulk Presence Query ──
  socket.on('presence:query', (usernames, callback) => {
    if (typeof callback !== 'function') return;
    if (!rateLimit(socket.id, 'presence:query', 2000)) return callback({});
    if (!Array.isArray(usernames) || usernames.length > 200) return callback({});
    const result = {};
    usernames.forEach(u => {
      const normalized = (u || '').trim().toLowerCase();
      const entry = onlineUsers.get(normalized);
      if (entry) {
        const s = entry.status === 'invisible' ? 'offline' : entry.status;
        const ga = entry.status === 'invisible' ? null : entry.gameActivity;
        const as = entry.status === 'invisible' ? null : entry.activityState;
        result[u] = { status: s, gameActivity: ga, activityState: as };
      } else {
        result[u] = { status: 'offline', gameActivity: null };
      }
    });
    callback(result);
  });
});

// ── Global Error Handlers (prevent server crash) ──
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  // Don't exit — keep serving
});

process.on('unhandledRejection', (reason) => {
  console.error('[WARN] Unhandled Promise Rejection:', reason);
});

// ── Express error middleware ──
app.use((err, req, res, next) => {
  console.error('[Express] Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Periodic cleanup of stale state ──
setInterval(() => {
  // Clean up stale typing indicators (> 15 seconds old)
  for (const [key, typers] of typingState) {
    if (typers.size === 0) typingState.delete(key);
  }
  // Clean up empty room member sets
  for (const [key, members] of roomMembers) {
    if (members.size === 0) roomMembers.delete(key);
  }
}, 30000);

// ── Graceful Shutdown ─────────────────────────────
function gracefulShutdown(signal) {
  console.log(`[Fortized] ${signal} received, shutting down gracefully...`);
  io.close(() => {
    console.log('[Fortized] Socket.io connections closed');
    server.close(() => {
      console.log('[Fortized] HTTP server closed');
      process.exit(0);
    });
  });
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('[Fortized] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Periodic stats logging ────────────────────────
setInterval(() => {
  console.log(`[Fortized] Stats: ${onlineUsers.size} online, ${io.sockets.sockets.size} sockets, ${typingState.size} typing rooms, ${roomMembers.size} active rooms`);
}, 300000); // Every 5 minutes

// ── Start ──────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[Fortized] Server running on port ${PORT}`);
  console.log(`[Fortized] Socket.io real-time layer active`);
});
