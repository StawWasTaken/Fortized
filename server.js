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

// ── Health check endpoint ─────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    connections: io.sockets.sockets.size,
    onlineUsers: onlineUsers.size,
  });
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
// ── Joyster AI proxy — keeps the Gemini key on the server, not the client ──
// Client POSTs { body: <gemini-request-body> } and we forward to Gemini with our key.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL   = process.env.GEMINI_MODEL   || 'gemini-2.5-flash';
app.post('/api/joyster', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'AI not configured' });
  const body = req.body?.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Missing body' });
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_API_KEY}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    res.status(upstream.status).type('application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'Upstream failed' });
  }
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
app.options('/api/v1/*', (req, res) => {
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
    <meta property="og:image" content="${bastion.banner||bastion.icon||'https://fortized.com/Fortized banner.png'}">
    <meta property="og:url" content="https://fortized.com/app?invite=${code}">
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
app.get('/app/messages', (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/discover', (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/atelier',  (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/bastion',  (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/forum',    (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
app.get('/app/forum/{*rest}', (_req, res) => sendHtmlNoCache(res, path.join(__dirname, 'app', 'index.html')));
// SPA-style fallback for /app, /login, etc.
['app', 'login', 'signup', 'blog', 'support', 'download', 'privacy', 'terms', 'legal'].forEach(route => {
  app.get(`/${route}`,            (_req, res) => sendHtmlNoCache(res, path.join(__dirname, route, 'index.html')));
  app.get(`/${route}/{*rest}`,    (_req, res) => sendHtmlNoCache(res, path.join(__dirname, route, 'index.html')));
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
