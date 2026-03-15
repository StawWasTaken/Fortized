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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 30000,
  pingInterval: 10000,
});

const PORT = process.env.PORT || 3000;

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

// ── Serve static frontend ──────────────────────────
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html',
}));
// SPA-style fallback for /app, /login, etc.
['app', 'login', 'signup', 'blog', 'support', 'download', 'privacy', 'terms', 'legal'].forEach(route => {
  app.get(`/${route}`, (_req, res) => res.sendFile(path.join(__dirname, route, 'index.html')));
  app.get(`/${route}/*`, (_req, res) => res.sendFile(path.join(__dirname, route, 'index.html')));
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
    onlineUsers.set(username, {
      socketId: socket.id,
      status: data.status || 'online',
      gameActivity: data.gameActivity || null,
    });
    socket.join(`user:${username}`);
    // Broadcast presence to everyone
    io.emit('presence:update', {
      username,
      status: data.status || 'online',
      gameActivity: data.gameActivity || null,
    });
  });

  // ── Status Change ──
  socket.on('status:set', (data) => {
    if (!username) return;
    const entry = onlineUsers.get(username) || { socketId: socket.id };
    entry.status = data.status || 'online';
    onlineUsers.set(username, entry);
    io.emit('presence:update', { username, status: entry.status, gameActivity: entry.gameActivity });
  });

  // ── Game / App Activity ──
  socket.on('activity:set', (data) => {
    if (!username) return;
    const entry = onlineUsers.get(username) || { socketId: socket.id };
    entry.gameActivity = data.activity || null;
    onlineUsers.set(username, entry);
    io.emit('presence:update', { username, status: entry.status, gameActivity: entry.gameActivity });
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
    socket.to(key).emit('typing:update', { room: key, users: [...typingState.get(key)].filter(u => u !== username) });
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
    socket.to(key).emit('message:edited', {
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
    socket.to(key).emit('message:deleted', {
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
    const key = roomKey('bastion', data.bastionId, data.channelId || '__polls');
    io.to(key).emit('poll:updated', {
      bastionId: data.bastionId,
      channelName: data.channelName,
      action: data.action, // 'create', 'vote', 'unvote', 'delete'
      pollKey: data.pollKey,
      username,
    });
    // Also broadcast to all bastion rooms for sidebar updates
    io.emit('poll:updated', {
      bastionId: data.bastionId,
      channelName: data.channelName,
      action: data.action,
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

  // ── Disconnect ──
  socket.on('disconnect', () => {
    if (!username) return;
    onlineUsers.delete(username);
    // Broadcast offline status
    io.emit('presence:update', { username, status: 'offline', gameActivity: null });
    // Clean up typing state
    for (const [key, typers] of typingState) {
      if (typers.has(username)) {
        typers.delete(username);
        io.to(key).emit('typing:update', { room: key, users: [...typers] });
      }
    }
  });

  // ── Bulk Presence Query ──
  socket.on('presence:query', (usernames, callback) => {
    if (typeof callback !== 'function') return;
    const result = {};
    (usernames || []).forEach(u => {
      const entry = onlineUsers.get(u);
      result[u] = entry ? { status: entry.status, gameActivity: entry.gameActivity } : { status: 'offline', gameActivity: null };
    });
    callback(result);
  });
});

// ── Start ──────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[Fortized] Server running on port ${PORT}`);
  console.log(`[Fortized] Socket.io real-time layer active`);
});
