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
app.use(express.json());

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
    if (data.access_token) {
      _igdbToken = data.access_token;
      _igdbTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      console.log('[IGDB] Token acquired, expires in', data.expires_in, 'seconds');
      return _igdbToken;
    }
    console.error('[IGDB] Token response missing access_token:', JSON.stringify(data));
  } catch (e) { console.error('[IGDB] Token error:', e.message); }
  return null;
}

app.post('/api/igdb/search', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query required' });
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
    res.json({ results });
  } catch (e) {
    console.error('[IGDB] Search error:', e.message);
    res.status(500).json({ error: 'IGDB request failed' });
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
      body: `where name ~ (${nameList}); fields name,genres.name,cover.image_id,summary; limit 20;`,
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
    res.json({ results });
  } catch (e) {
    console.error('[IGDB] Lookup error:', e.message);
    res.status(500).json({ error: 'IGDB request failed' });
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
  if (!u) return res.status(400).json({ error: 'invalid username' });

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

// Step 1: App sends PKCE verifier before opening Spotify auth
app.post('/api/spotify-auth-init', (req, res) => {
  const { state, codeVerifier, clientId, redirectUri } = req.body;
  if (!state || !codeVerifier) return res.status(400).json({ error: 'Missing state or codeVerifier' });
  _spotifyAuth.set(state, { codeVerifier, clientId, redirectUri, ts: Date.now(), tokens: null });
  res.json({ ok: true });
});

// Step 2: Callback page sends the authorization code
app.post('/api/spotify-code', async (req, res) => {
  const { state, code } = req.body;
  if (!state || !code) return res.status(400).json({ error: 'Missing state or code' });
  const entry = _spotifyAuth.get(state);
  if (!entry) return res.status(404).json({ error: 'Unknown state' });

  // Exchange the code for tokens right here on the server
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: entry.redirectUri || 'https://fortized.com/spotify-callback.html',
        client_id: entry.clientId || 'a632e938880e4e84b27d73a5d32be42e',
        code_verifier: entry.codeVerifier,
      }).toString(),
    });
    const data = await tokenRes.json();
    if (data.access_token) {
      entry.tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || null,
        expires_in: data.expires_in || 3600,
      };
      res.json({ ok: true });
    } else {
      console.error('[Spotify] Token exchange failed:', data);
      entry.tokens = { error: data.error_description || data.error || 'Token exchange failed' };
      res.json({ ok: false, error: entry.tokens.error });
    }
  } catch (e) {
    console.error('[Spotify] Token exchange error:', e);
    entry.tokens = { error: e.message };
    res.json({ ok: false, error: e.message });
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

// ── Serve static frontend ──────────────────────────
// Disable caching for HTML files so code updates are picked up immediately
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/' || !req.path.includes('.')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html',
}));
// SPA-style fallback for /app, /login, etc.
['app', 'login', 'signup', 'blog', 'support', 'download', 'privacy', 'terms', 'legal'].forEach(route => {
  app.get(`/${route}`, (_req, res) => res.sendFile(path.join(__dirname, route, 'index.html')));
  app.get(`/${route}/{*rest}`, (_req, res) => res.sendFile(path.join(__dirname, route, 'index.html')));
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
const typingState = new Map();   // roomKey -> Set<username>
const roomMembers = new Map();   // roomKey -> Set<socketId>

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
    username = (data.username || '').trim().toLowerCase();
    if (!username) return;
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
    if (!username) return;
    const entry = onlineUsers.get(username) || { socketId: socket.id };
    entry.gameActivity = data.activity || null;
    onlineUsers.set(username, entry);
    const broadcastStatus = entry.status === 'invisible' ? 'offline' : entry.status;
    // Hide game activity if invisible (would leak presence)
    const broadcastActivity = entry.status === 'invisible' ? null : entry.gameActivity;
    io.emit('presence:update', { username, status: broadcastStatus, gameActivity: broadcastActivity });
  });

  // ── Join a chat room (DM, bastion channel, group chat) ──
  socket.on('room:join', (data) => {
    const key = roomKey(data.type, data.id1, data.id2);
    socket.join(key);
    if (!roomMembers.has(key)) roomMembers.set(key, new Set());
    roomMembers.get(key).add(socket.id);
  });

  socket.on('room:leave', (data) => {
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
    const key = roomKey(data.type, data.id1, data.id2);
    if (!typingState.has(key)) typingState.set(key, new Set());
    typingState.get(key).add(username);
    socket.to(key).emit('typing:update', { room: key, users: [...typingState.get(key)] });
  });

  socket.on('typing:stop', (data) => {
    if (!username) return;
    const key = roomKey(data.type, data.id1, data.id2);
    typingState.get(key)?.delete(username);
    socket.to(key).emit('typing:update', { room: key, users: [...(typingState.get(key) || [])] });
  });

  // ── Message Edit (live broadcast) ──
  socket.on('message:edit', (data) => {
    if (!username) return;
    const key = roomKey(data.type, data.id1, data.id2);
    io.to(key).emit('message:edited', {
      room: key,
      messageId: data.messageId,
      newText: data.newText,
      editedBy: username,
    });
  });

  // ── Message Delete (live broadcast) ──
  socket.on('message:delete', (data) => {
    if (!username) return;
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
    const key = roomKey(data.type, data.id1, data.id2);
    io.to(key).emit('reaction:update', {
      room: key,
      messageId: data.messageId,
      emoji: data.emoji,
      username,
    });
  });

  // ── Notifications (targeted) ──
  socket.on('notification:send', (data) => {
    if (!data.to) return;
    io.to(`user:${data.to}`).emit('notification:new', data.notification);
  });

  // ── Friend Request Events ──
  socket.on('friend:request', (data) => {
    io.to(`user:${data.to}`).emit('friend:request:new', { from: username });
  });
  socket.on('friend:accept', (data) => {
    io.to(`user:${data.to}`).emit('friend:accepted', { from: username });
  });

  // ── Poll Events (real-time broadcast) ──
  socket.on('poll:update', (data) => {
    if (!data.bastionId) return;
    // Broadcast to all connected clients so sidebar badges + poll channels update
    io.emit('poll:updated', {
      bastionId: data.bastionId,
      channelName: data.channelName,
      action: data.action, // 'create', 'vote', 'unvote', 'delete'
      pollKey: data.pollKey,
      username,
    });
  });

  // ── Announcement Events (real-time broadcast) ──
  socket.on('announcement:broadcast', (data) => {
    io.emit('announcement:new', {
      text: data.text,
      from: username,
    });
  });
  socket.on('announcement:clear', () => {
    io.emit('announcement:cleared', { from: username });
  });

  // ── Role / Bastion Update Events (real-time broadcast) ──
  socket.on('bastion:update', (data) => {
    if (!data.bastionId) return;
    io.emit('bastion:updated', {
      bastionId: data.bastionId,
      field: data.field, // 'roles', 'memberRoles', 'channels', 'name', etc.
      username,
    });
  });

  // ── Profile Update (pfp, displayName, etc.) ──
  socket.on('profile:update', (data) => {
    if (!username) return;
    io.emit('profile:updated', {
      username,
      pfp: data.pfp || null,
      displayName: data.displayName || null,
      displayFont: data.displayFont || null,
      displayEffect: data.displayEffect || null,
      displayColor: data.displayColor || null,
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

    // Only mark offline if the user doesn't have another active connection
    // (handles multi-tab: if they still have a tab open, stay online)
    const stillConnected = [...io.sockets.sockets.values()].some(s => {
      return s.id !== socket.id && s.data?.username === username;
    });

    if (stillConnected) {
      // User still has other tabs — re-associate onlineUsers with a remaining socket
      const remainingSocket = [...io.sockets.sockets.values()].find(s =>
        s.id !== socket.id && s.data?.username === username
      );
      if (remainingSocket && prevEntry) {
        onlineUsers.set(username, { ...prevEntry, socketId: remainingSocket.id });
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
    const result = {};
    (usernames || []).forEach(u => {
      const normalized = (u || '').trim().toLowerCase();
      const entry = onlineUsers.get(normalized);
      if (entry) {
        const s = entry.status === 'invisible' ? 'offline' : entry.status;
        const ga = entry.status === 'invisible' ? null : entry.gameActivity;
        result[u] = { status: s, gameActivity: ga };
      } else {
        result[u] = { status: 'offline', gameActivity: null };
      }
    });
    callback(result);
  });
});

// ── Start ──────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[Fortized] Server running on port ${PORT}`);
  console.log(`[Fortized] Socket.io real-time layer active`);
});
