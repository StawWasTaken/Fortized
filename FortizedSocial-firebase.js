const firebaseConfig = {
  apiKey: "AIzaSyDeKw90592XdSKSXr1mefodYhca53AVP9M",
  authDomain: "fortized-5ffcf.firebaseapp.com",
  databaseURL: "https://fortized-5ffcf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fortized-5ffcf",
  storageBucket: "fortized-5ffcf.firebasestorage.app",
  messagingSenderId: "232126031951",
  appId: "1:232126031951:web:c66312d3175f137c25223a"
};

const FortizedSocial = (() => {

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  const P = {
    user:        u  => `users/${u}`,
    status:      u  => `statuses/${u}`,
    notifs:      u  => `notifications/${u}`,
    dm:         (a, b) => `dms/${[a, b].sort().join('__')}`,
    dmIndex:     u  => `dmIndex/${u}`,
    bastionMsgs:(id, ch) => `bastionMsgs/${id}/${ch}`,
    bastionMembers: id  => `bastionMembers/${id}`,
    globalBastions:     `globalBastions`,
    globalBastion: id   => `globalBastions/${id}`,
    invites:            `invites`,
    invite:      code   => `invites/${code}`,
    bastionTemplates:       `bastionTemplates`,
    bastionTemplate: id  => `bastionTemplates/${id}`,
  };

  // ── Normalize username ─────────────────────────────────────
  // ALL usernames are stored lowercase. Normalize before any lookup.
  function norm(u) {
    return (u || '').trim().toLowerCase();
  }

  function dbGet(path) {
    return db.ref(path).get().then(snap => snap.exists() ? snap.val() : null);
  }
  function dbSet(path, val) { return db.ref(path).set(val); }
  function dbUpdate(path, val) { return db.ref(path).update(val); }
  function dbPush(path, val) { return db.ref(path).push(val); }
  function dbRemove(path) { return db.ref(path).remove(); }
  function dbTransaction(path, fn) { return db.ref(path).transaction(fn); }

  // ── Session ────────────────────────────────────────────────
  function getCurrentUsername() {
    return localStorage.getItem('ftz_current') ||
           localStorage.getItem('fortized_current_user') || null;
  }
  function setCurrentUsername(u) {
    localStorage.setItem('ftz_current', u);
    localStorage.setItem('fortized_current_user', u);
  }
  function clearCurrentUsername() {
    localStorage.removeItem('ftz_current');
    localStorage.removeItem('fortized_current_user');
  }

  // ── User CRUD ──────────────────────────────────────────────
  async function getUsers() {
    const snap = await db.ref('users').get();
    if (!snap.exists()) return [];
    return Object.values(snap.val());
  }

  async function getUserByName(username) {
    if (!username) return null;
    // Always normalize — users are stored under lowercase keys
    return dbGet(P.user(norm(username)));
  }

  async function saveUserObject(user) {
    if (!user?.username) return;
    await dbUpdate(P.user(norm(user.username)), user);
  }

  // ── Auth ───────────────────────────────────────────────────
  // Protected names — usernames containing these bases (with optional
  // repeated trailing characters) are blocked to prevent impersonation.
  const PROTECTED_NAMES = ['staw', 'fortized', 'joyster'];

  function isProtectedUsername(name) {
    const clean = name.replace(/[^a-z]/g, '');
    for (const base of PROTECTED_NAMES) {
      if (clean === base) return true;
      // Block patterns like "staww", "stawr", "stawrer", "stawrerr", etc.
      if (clean.length > base.length && clean.startsWith(base)) return true;
    }
    return false;
  }

  async function register(username, password, email = '') {
    username = norm(username).replace(/[^a-z0-9_]/g, '');
    if (!username || username.length < 3)
      return { ok: false, msg: 'Username must be 3+ characters (a-z, 0-9, _).' };
    if (!password || password.length < 6)
      return { ok: false, msg: 'Password must be 6+ characters.' };

    // Check if registrations are disabled globally
    try {
      const gsSnap = await db.ref('admin/global_settings/disableRegistration').get();
      if (gsSnap.exists() && gsSnap.val() === true)
        return { ok: false, msg: 'New registrations are currently disabled. Please try again later.' };
    } catch(e) { /* allow registration if settings check fails */ }

    // Block usernames that impersonate protected names
    if (isProtectedUsername(username))
      return { ok: false, msg: 'This username is not available.' };

    const existing = await getUserByName(username);
    if (existing) return { ok: false, msg: 'Username already taken.' };

    // Limit: same email can be used by max 3 accounts
    if (email) {
      const emailLower = email.trim().toLowerCase();
      const allUsers = await getUsers();
      const emailCount = allUsers.filter(u =>
        u.email && u.email.trim().toLowerCase() === emailLower
      ).length;
      if (emailCount >= 3)
        return { ok: false, msg: 'This email has already been used for the maximum number of accounts (3).' };
    }

    const user = {
      username, password, email,
      displayName: username,
      pfp: null, banner: null,
      onyx: 25,
      status: 'online',
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      bastions: [],
      notifications: [],
      radianceUntil: null,
      lastDaily: null,
      createdAt: new Date().toISOString()
    };
    await dbSet(P.user(username), user);
    setCurrentUsername(username);
    return { ok: true, user };
  }

  async function login(username, password) {
    username = norm(username);
    const user = await getUserByName(username);
    if (!user) return { ok: false, msg: 'User not found.' };
    if (user.password !== password) return { ok: false, msg: 'Wrong password.' };
    setCurrentUsername(username);
    await setStatus(username, 'online');
    return { ok: true, user };
  }

  async function logout(username) {
    await setStatus(norm(username), 'offline');
    stopPolling();
    clearCurrentUsername();
  }

  // ── Status ─────────────────────────────────────────────────
  const VALID_STATUSES = new Set(['online','away','dnd','invisible','offline']);

  async function getStatus(username) {
    const val = await dbGet(P.status(norm(username)));
    return (val && VALID_STATUSES.has(val)) ? val : 'offline';
  }

  async function setStatus(username, status) {
    username = norm(username);
    if (!VALID_STATUSES.has(status)) status = 'offline';
    // Single authoritative write to statuses/{username}
    // users/{username}/status kept in sync for profile reads
    await Promise.all([
      dbSet(P.status(username), status),
      dbUpdate(P.user(username), { status }),
    ]);
  }

  // ── Notifications ──────────────────────────────────────────
  async function getNotifications(username) {
    const data = await dbGet(P.notifs(norm(username)));
    if (!data) return [];
    return Object.values(data).sort((a, b) =>
      new Date(b.time) - new Date(a.time)
    );
  }

  async function addNotification(toUsername, notif) {
    notif.id   = Date.now().toString(36) + Math.random().toString(36).slice(2);
    notif.time = new Date().toISOString();
    notif.read = false;
    await dbSet(`${P.notifs(norm(toUsername))}/${notif.id}`, notif);
  }

  async function markNotificationsRead(username) {
    const data = await dbGet(P.notifs(norm(username)));
    if (!data) return;
    const updates = {};
    Object.keys(data).forEach(k => { updates[`${k}/read`] = true; });
    await dbUpdate(P.notifs(norm(username)), updates);
  }

  async function markNotificationReadBySource(username, type, from) {
    const data = await dbGet(P.notifs(norm(username)));
    if (!data) return;
    const updates = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v.read) return;
      if (type && v.type !== type) return;
      if (from && (v.from||'').toLowerCase() !== (from||'').toLowerCase()) return;
      updates[`${k}/read`] = true;
    });
    if (Object.keys(updates).length) await dbUpdate(P.notifs(norm(username)), updates);
  }

  async function getUnreadCount(username) {
    const notifs = await getNotifications(username);
    return notifs.filter(n => !n.read).length;
  }

  // ── Friend System ──────────────────────────────────────────
  async function sendFriendRequest(fromUsername, toUsername) {
    // Normalize both — this is the critical fix
    fromUsername = norm(fromUsername);
    toUsername   = norm(toUsername);

    if (!toUsername) return { ok: false, msg: 'Enter a username.' };
    if (fromUsername === toUsername) return { ok: false, msg: "Can't add yourself." };

    const [fu, tu] = await Promise.all([
      getUserByName(fromUsername),
      getUserByName(toUsername)
    ]);
    if (!fu) return { ok: false, msg: 'Your account not found.' };
    if (!tu) return { ok: false, msg: `User "${toUsername}" not found.` };

    const friends       = fu.friends           || [];
    const sentReqs      = fu.friendRequestsSent || [];
    const theirSentReqs = tu.friendRequestsSent || [];

    if (friends.includes(toUsername))   return { ok: false, msg: 'Already friends.' };
    if (sentReqs.includes(toUsername))  return { ok: false, msg: 'Request already sent.' };

    // If they already sent us a request, just accept
    if (theirSentReqs.includes(fromUsername)) {
      return acceptFriendRequest(fromUsername, toUsername);
    }

    await dbUpdate(P.user(fromUsername), {
      friendRequestsSent: [...sentReqs, toUsername]
    });
    const theirReceived = tu.friendRequestsReceived || [];
    if (!theirReceived.includes(fromUsername)) {
      await dbUpdate(P.user(toUsername), {
        friendRequestsReceived: [...theirReceived, fromUsername]
      });
    }

    await addNotification(toUsername, { type: 'friend_request', from: fromUsername });
    return { ok: true, msg: `Friend request sent to ${toUsername}!` };
  }

  async function acceptFriendRequest(myUsername, fromUsername) {
    myUsername   = norm(myUsername);
    fromUsername = norm(fromUsername);

    const [mu, fu] = await Promise.all([
      getUserByName(myUsername),
      getUserByName(fromUsername)
    ]);
    if (!mu || !fu) return { ok: false, msg: 'User not found.' };

    const myFriends  = [...(mu.friends || [])];
    const hisFriends = [...(fu.friends || [])];
    if (!myFriends.includes(fromUsername))  myFriends.push(fromUsername);
    if (!hisFriends.includes(myUsername))   hisFriends.push(myUsername);

    await dbUpdate(P.user(myUsername), {
      friends:                myFriends,
      friendRequestsReceived: (mu.friendRequestsReceived || []).filter(u => u !== fromUsername),
      friendRequestsSent:     (mu.friendRequestsSent     || []).filter(u => u !== fromUsername)
    });
    await dbUpdate(P.user(fromUsername), {
      friends:                hisFriends,
      friendRequestsSent:     (fu.friendRequestsSent     || []).filter(u => u !== myUsername),
      friendRequestsReceived: (fu.friendRequestsReceived || []).filter(u => u !== myUsername)
    });

    await addNotification(fromUsername, { type: 'friend_accept', from: myUsername });
    return { ok: true, msg: `You are now friends with ${fromUsername}!` };
  }

  const acceptFriend = acceptFriendRequest;

  async function declineFriendRequest(myUsername, fromUsername) {
    myUsername   = norm(myUsername);
    fromUsername = norm(fromUsername);
    const [mu, fu] = await Promise.all([
      getUserByName(myUsername),
      getUserByName(fromUsername)
    ]);
    if (mu) await dbUpdate(P.user(myUsername), {
      friendRequestsReceived: (mu.friendRequestsReceived || []).filter(u => u !== fromUsername)
    });
    if (fu) await dbUpdate(P.user(fromUsername), {
      friendRequestsSent: (fu.friendRequestsSent || []).filter(u => u !== myUsername)
    });
    return { ok: true };
  }

  async function removeFriend(myUsername, friendUsername) {
    myUsername     = norm(myUsername);
    friendUsername = norm(friendUsername);
    const [mu, fu] = await Promise.all([
      getUserByName(myUsername),
      getUserByName(friendUsername)
    ]);
    if (mu) await dbUpdate(P.user(myUsername), {
      friends: (mu.friends || []).filter(u => u !== friendUsername)
    });
    if (fu) await dbUpdate(P.user(friendUsername), {
      friends: (fu.friends || []).filter(u => u !== myUsername)
    });
    return { ok: true };
  }

  // ── Direct Messages ────────────────────────────────────────
  async function getDMMessages(user1, user2) {
    const data = await dbGet(P.dm(norm(user1), norm(user2)));
    if (!data) return [];
    return Object.values(data).sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  async function sendDMMessage(fromUsername, toUsername, text) {
    fromUsername = norm(fromUsername);
    toUsername   = norm(toUsername);
    const now = new Date();
    const msg = {
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2),
      from:      fromUsername,
      text,
      time:      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString()
    };

    await dbSet(`${P.dm(fromUsername, toUsername)}/${msg.id}`, msg);

    const [myIdx, theirIdx] = await Promise.all([
      dbGet(P.dmIndex(fromUsername)),
      dbGet(P.dmIndex(toUsername))
    ]);

    const updateIdx = async (username, partner, current) => {
      const arr = current ? (Array.isArray(current) ? current : Object.values(current)) : [];
      const filtered = arr.filter(u => u !== partner);
      filtered.unshift(partner);
      await dbSet(P.dmIndex(username), filtered.slice(0, 30));
    };
    await Promise.all([
      updateIdx(fromUsername, toUsername, myIdx),
      updateIdx(toUsername, fromUsername, theirIdx)
    ]);

    await addNotification(toUsername, {
      type: 'dm', from: fromUsername,
      data: { preview: text.slice(0, 60) }
    });

    return msg;
  }

  async function getRecentDMPartners(username) {
    const data = await dbGet(P.dmIndex(norm(username)));
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  }

  // ── Bastion Messages ───────────────────────────────────────
  async function getBastionChannelMessages(bastionId, channelId) {
    const data = await dbGet(P.bastionMsgs(bastionId, channelId));
    if (!data) return [];
    return Object.values(data).sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  async function sendBastionChannelMessage(bastionId, channelId, fromUsername, text) {
    const now = new Date();
    const msgRef = db.ref(P.bastionMsgs(bastionId, channelId)).push();
    const msg = {
      id:        msgRef.key,
      from:      norm(fromUsername),
      text,
      time:      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString()
    };
    await msgRef.set(msg);
    return msg;
  }

  async function addReaction(bastionId, channelId, msgId, emoji, username) {
    const path = `${P.bastionMsgs(bastionId, channelId)}/${msgId}/reactions/${emoji}`;
    await dbTransaction(path, current => {
      const arr = current ? (Array.isArray(current) ? current : Object.values(current)) : [];
      const idx = arr.indexOf(norm(username));
      if (idx !== -1) arr.splice(idx, 1);
      else arr.push(norm(username));
      return arr.length ? arr : null;
    });
  }

  // ── Global Bastions ────────────────────────────────────────
  async function getGlobalBastions() {
    return (await dbGet(P.globalBastions)) || {};
  }
  async function saveGlobalBastion(id, data) {
    await dbSet(P.globalBastion(id), data);
  }
  async function getGlobalBastion(id) {
    return dbGet(P.globalBastion(id));
  }

  // ── Bastion Members ────────────────────────────────────────
  async function getBastionMembers(bastionId) {
    const data = await dbGet(P.bastionMembers(bastionId));
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  }
  async function addBastionMember(bastionId, username) {
    const members = await getBastionMembers(bastionId);
    const u = norm(username);
    if (!members.includes(u)) members.push(u);
    await dbSet(P.bastionMembers(bastionId), members);
  }
  async function removeBastionMember(bastionId, username) {
    const u = norm(username);
    const members = await getBastionMembers(bastionId);
    await dbSet(P.bastionMembers(bastionId), members.filter(m => m !== u));
    // Also clean memberRoles so the user doesn't ghost in member lists
    try {
      const ref = firebase.database().ref(P.globalBastion(bastionId) + '/memberRoles/' + u);
      await ref.remove();
    } catch {}
  }

  // ── Invites ────────────────────────────────────────────────
  async function getInvite(code) { return dbGet(P.invite(code)); }
  async function saveInvite(code, data) { await dbSet(P.invite(code), data); }
  async function incrementInviteUses(code) {
    await dbTransaction(P.invite(code) + '/uses', n => (n || 0) + 1);
  }

  // ── Socket.io Real-Time Layer ──────────────────────────────
  // Socket.io provides instant delivery; Firebase listeners are kept as fallback
  // for data persistence and offline/reconnection scenarios.
  let _socket = null;
  let _socketReady = false;
  let _socketCallbacks = {};
  let _socketRooms = new Set();

  function _getSocketURL() {
    if (typeof window !== 'undefined' && window.location) {
      const loc = window.location;
      if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
        return loc.protocol + '//' + loc.hostname + ':3000';
      }
      return loc.origin;
    }
    return 'http://localhost:3000';
  }

  function initSocket(username, callbacks) {
    _socketCallbacks = callbacks || {};
    if (_socket) { try { _socket.disconnect(); } catch(_){} _socket = null; }
    // Socket.io loads async — if not ready yet, try again after a short delay
    if (typeof window === 'undefined' || typeof window.io === 'undefined') {
      console.log('[Fortized] Socket.io not loaded yet, will retry in 3s');
      setTimeout(function() {
        if (typeof window !== 'undefined' && typeof window.io !== 'undefined') {
          initSocket(username, callbacks);
        } else {
          console.warn('[Fortized] Socket.io unavailable, using Firebase only');
        }
      }, 3000);
      return;
    }
    try {
      _socket = window.io(_getSocketURL(), {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 5000,
      });
      _socket.on('connect', function() {
        _socketReady = true;
        console.log('[Fortized] Socket.io connected');
        _socket.emit('identify', {
          username: norm(username),
          status: (callbacks || {}).initialStatus || 'online',
          gameActivity: (callbacks || {}).initialGameActivity || null,
        });
        _socketRooms.forEach(function(room) { _socket.emit('room:join', room); });
      });
      _socket.on('disconnect', function() { _socketReady = false; });
      _socket.on('connect_error', function() {
        // Don't spam console — Socket.io will retry up to reconnectionAttempts
        _socketReady = false;
      });
      _socket.on('message:new', function(data) {
        if (_socketCallbacks.onMessage) _socketCallbacks.onMessage(data.room, data.message);
      });
      _socket.on('typing:update', function(data) {
        if (_socketCallbacks.onTyping) _socketCallbacks.onTyping(data.room, data.users);
      });
      _socket.on('presence:update', function(data) {
        if (_socketCallbacks.onStatusChange) _socketCallbacks.onStatusChange({ username: data.username, status: data.status, gameActivity: data.gameActivity || null });
      });
      _socket.on('notification:new', function(notif) {
        if (_socketCallbacks.onNewNotification) _socketCallbacks.onNewNotification(notif);
        updateNotifBadgeExternal(username);
      });
      _socket.on('friend:request:new', function(data) {
        if (_socketCallbacks.onFriendRequest) _socketCallbacks.onFriendRequest(data);
      });
      _socket.on('friend:accepted', function(data) {
        if (_socketCallbacks.onFriendAccepted) _socketCallbacks.onFriendAccepted(data);
      });
      _socket.on('reaction:update', function(data) {
        if (_socketCallbacks.onReaction) _socketCallbacks.onReaction(data);
      });
      _socket.on('message:deleted', function(data) {
        if (_socketCallbacks.onMessageDeleted) _socketCallbacks.onMessageDeleted(data);
      });
    } catch (e) {
      console.warn('[Fortized] Socket.io init failed, Firebase only', e);
      _socket = null;
      _socketReady = false;
    }
  }

  function getSocket() { return _socket; }
  function isSocketReady() { return _socketReady; }

  function socketEmit(event, data) {
    try {
      if (_socket && _socketReady) { _socket.emit(event, data); return true; }
    } catch(_) {}
    return false;
  }

  function joinRoom(type, id1, id2) {
    var room = { type: type, id1: id1, id2: id2 };
    _socketRooms.add(room);
    if (_socket && _socketReady) _socket.emit('room:join', room);
  }
  function leaveRoom(type, id1, id2) {
    _socketRooms.forEach(function(r) {
      if (r.type === type && r.id1 === id1 && r.id2 === id2) _socketRooms.delete(r);
    });
    if (_socket && _socketReady) _socket.emit('room:leave', { type: type, id1: id1, id2: id2 });
  }

  function queryPresence(usernames) {
    return new Promise(function(resolve) {
      if (_socket && _socketReady) {
        _socket.emit('presence:query', usernames, resolve);
        setTimeout(function() { resolve(null); }, 3000);
      } else { resolve(null); }
    });
  }

  function disconnectSocket() {
    if (_socket) { _socket.disconnect(); _socket = null; }
    _socketReady = false;
    _socketRooms.clear();
  }

  // ── Firebase Real-time Listeners (fallback) ──────────────
  let _listeners = [];
  let _callbacks = {};

  function startFirebasePolling(username, callbacks) {
    _callbacks = callbacks || {};
    stopFirebasePolling();
    username = norm(username);

    const notifRef = db.ref(P.notifs(username));
    const notifHandler = notifRef.on('child_added', snap => {
      const n = snap.val();
      if (!n || n.read) return;
      _callbacks.onNewNotification?.(n);
      updateNotifBadgeExternal(username);
    });
    _listeners.push({ ref: notifRef, event: 'child_added', handler: notifHandler });

    const dmIndexRef = db.ref(P.dmIndex(username));
    const dmIndexHandler = dmIndexRef.on('value', snap => {
      _callbacks.onDMIndexChange?.();
    });
    _listeners.push({ ref: dmIndexRef, event: 'value', handler: dmIndexHandler });

    const statusRef = db.ref('statuses');
    const statusHandler = statusRef.on('child_changed', snap => {
      _callbacks.onStatusChange?.({ username: snap.key, status: snap.val() });
    });
    _listeners.push({ ref: statusRef, event: 'child_changed', handler: statusHandler });
  }

  function startPolling(username, callbacks) {
    callbacks = callbacks || {};
    // Firebase listeners are the primary real-time system — start FIRST
    startFirebasePolling(username, callbacks);
    // Socket.io is an optional enhancement — start async, never blocks
    try { initSocket(username, callbacks); } catch(_) {}
  }

  function stopPolling() {
    disconnectSocket();
    stopFirebasePolling();
  }

  function stopFirebasePolling() {
    _listeners.forEach(({ ref, event, handler }) => {
      try { ref.off(event, handler); } catch (_) {}
    });
    _listeners = [];
  }

  function listenBastionChannel(bastionId, channelId, callback) {
    joinRoom('bastion', bastionId, channelId);
    const ref = db.ref(P.bastionMsgs(bastionId, channelId));
    const handler = ref.on('child_added', snap => { callback?.(snap.val()); });
    return () => {
      ref.off('child_added', handler);
      leaveRoom('bastion', bastionId, channelId);
    };
  }

  function listenDM(user1, user2, callback) {
    joinRoom('dm', norm(user1), norm(user2));
    const ref = db.ref(P.dm(norm(user1), norm(user2)));
    const handler = ref.on('child_added', snap => { callback?.(snap.val()); });
    return () => {
      ref.off('child_added', handler);
      leaveRoom('dm', norm(user1), norm(user2));
    };
  }

  async function updateNotifBadgeExternal(username) {
    if (typeof window !== 'undefined' && typeof window.updateNotifBadge === 'function') {
      window.updateNotifBadge();
    }
  }

  // ── Audio ──────────────────────────────────────────────────
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  }

  // ── Reports ────────────────────────────────────────────────
  async function submitReport(report) {
    if (!report?.id) return;
    await dbSet(`reports/${report.id}`, report);
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    register, login, logout, getCurrentUsername,
    getUsers, getAllUsers: async () => (await db.ref('users').get()).val() || {},
    getUserByName, saveUserObject,
    getStatus, setStatus,
    getNotifications, addNotification, markNotificationsRead, markNotificationReadBySource, getUnreadCount,
    sendFriendRequest, acceptFriendRequest, acceptFriend, declineFriendRequest, removeFriend,
    getDMMessages, sendDMMessage, getRecentDMPartners,
    getBastionChannelMessages, sendBastionChannelMessage, addReaction,
    getGlobalBastions, saveGlobalBastion, getGlobalBastion,
    getBastionMembers, addBastionMember, removeBastionMember,
    getInvite, saveInvite, incrementInviteUses,
    submitReport,
    startPolling, stopPolling, listenBastionChannel, listenDM,
    initSocket, getSocket, isSocketReady, socketEmit,
    joinRoom, leaveRoom, queryPresence, disconnectSocket,
    playNotificationSound,
  };

})();
