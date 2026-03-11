// ════════════════════════════════════════════════════
// FORTIZED — Node.js + Socket.io Real-Time Server
// ════════════════════════════════════════════════════
// Sits alongside Firebase for persistent storage.
// Handles live, low-latency events: messages, typing,
// presence, status changes, and activity broadcasting.

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
