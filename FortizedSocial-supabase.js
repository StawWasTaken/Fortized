// ════════════════════════════════════════════════════
// FORTIZED — Supabase Backend (drop-in replacement for Firebase)
// ════════════════════════════════════════════════════
// Exposes the exact same FortizedSocial public API so all
// existing UI code keeps working without changes.

const SUPABASE_URL  = 'https://ufnjjddqnicbzyjfawrb.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbmpqZGRxbmljYnp5amZhd3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTkzMjgsImV4cCI6MjA4ODIzNTMyOH0.5Sfc_wQO6T3mQT6lqsPTAntqyxhDZJqTrZ3GNkyQSEk';

const FortizedSocial = (() => {

  // Gracefully handle missing Supabase CDN (offline / blocked)
  let sb;
  let _offlineMode = false;
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  } else {
    console.warn('[Fortized] Supabase SDK not loaded — running in offline mode');
    _offlineMode = true;
    // Stub that rejects all queries so callers get clean errors
    const _reject = () => ({ data: null, error: { message: 'offline' } });
    const _chain = () => new Proxy({}, { get: () => _chain });
    sb = { from: () => ({ select: _chain, insert: _reject, update: _reject, upsert: _reject, delete: _reject }), rpc: () => Promise.resolve(_reject()) };
  }

  // ── Helpers ──────────────────────────────────────────
  function norm(u) { return (u || '').trim().toLowerCase(); }

  // ── Session ──────────────────────────────────────────
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

  // ── User CRUD ────────────────────────────────────────
  async function getUsers() {
    const { data } = await sb.from('users').select('*');
    return (data || []).map(_userFromRow);
  }

  async function getUserByName(username) {
    if (!username) return null;
    const { data } = await sb.from('users').select('*').eq('username', norm(username)).maybeSingle();
    return data ? _userFromRow(data) : null;
  }

  // Convert DB row → Firebase-shaped user object for compatibility
  // Helper: BIGINT epoch-ms ↔ ISO string conversion for radiance timestamps
  function _bigintToISO(v) {
    if (!v) return null;
    if (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))) return new Date(Number(v)).toISOString();
    // Already an ISO string
    if (typeof v === 'string' && v.includes('T')) return v;
    return null;
  }
  function _isoToBigint(v) {
    if (!v) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
    try { const ms = new Date(v).getTime(); return isNaN(ms) ? null : ms; } catch { return null; }
  }

  function _userFromRow(r) {
    if (!r) return null;
    // Merge any extra fields stored in raw JSONB
    const extra = r.raw || {};
    return {
      username: r.username,
      password: r.password,
      email: r.email || '',
      displayName: r.display_name || r.username,
      pfp: r.pfp || null,
      banner: r.banner || null,
      onyx: r.onyx ?? 25,
      status: r.status || 'offline',
      customStatus: r.custom_status || null,
      friends: r.friends || [],
      friendRequestsSent: r.friend_requests_sent || [],
      friendRequestsReceived: r.friend_requests_received || [],
      bastions: r.bastions || [],
      notifications: [],
      radianceUntil: _bigintToISO(r.radiance_until) || (extra.radianceUntil || null),
      radiancePlus: _bigintToISO(r.radiance_plus) || (extra.radiancePlus || null),
      lastDaily: r.last_daily || null,
      blockedUsers: r.blocked_users || [],
      ignoredUsers: r.ignored_users || {},
      groupChats: r.group_chats || [],
      suspension: r.suspension || null,
      suspendedUntil: r.suspended_until || null,
      activeWarning: r.active_warning || null,
      gameActivity: r.game_activity || null,
      lastSeen: r.last_seen || null,
      profileTheme: r.profile_theme || null,
      activeDecoration: r.active_decoration || null,
      bio: r.bio || '',
      badges: r.badges || [],
      connections: r.connections || [],
      banned: r.banned || false,
      banReason: r.ban_reason || null,
      createdAt: r.created_at || null,
      ...extra,
    };
  }

  // Convert app user object → DB row for upsert
  function _userToRow(u) {
    // Collect known columns; stash everything else in raw
    const known = new Set([
      'username','password','email','displayName','pfp','banner','onyx','status',
      'customStatus','friends','friendRequestsSent','friendRequestsReceived',
      'bastions','notifications','radianceUntil','radiancePlus','lastDaily',
      'blockedUsers','ignoredUsers','groupChats','suspension','suspendedUntil',
      'activeWarning','gameActivity','lastSeen','profileTheme','activeDecoration',
      'bio','badges','connections','banned','banReason','createdAt',
    ]);
    const raw = {};
    for (const k of Object.keys(u)) {
      if (!known.has(k)) raw[k] = u[k];
    }
    return {
      username: norm(u.username),
      password: u.password,
      email: u.email || '',
      display_name: u.displayName || u.username,
      pfp: u.pfp || null,
      banner: u.banner || null,
      onyx: u.onyx ?? 25,
      status: u.status || 'offline',
      custom_status: u.customStatus || null,
      friends: u.friends || [],
      friend_requests_sent: u.friendRequestsSent || [],
      friend_requests_received: u.friendRequestsReceived || [],
      bastions: u.bastions || [],
      radiance_until: _isoToBigint(u.radianceUntil),
      radiance_plus: _isoToBigint(u.radiancePlus),
      last_daily: u.lastDaily || null,
      blocked_users: u.blockedUsers || [],
      ignored_users: u.ignoredUsers || {},
      group_chats: u.groupChats || [],
      suspension: u.suspension || null,
      suspended_until: u.suspendedUntil || null,
      active_warning: u.activeWarning || null,
      game_activity: u.gameActivity || null,
      last_seen: u.lastSeen || null,
      profile_theme: u.profileTheme || null,
      active_decoration: u.activeDecoration || null,
      bio: u.bio || '',
      badges: u.badges || [],
      connections: u.connections || [],
      banned: u.banned || false,
      ban_reason: u.banReason || null,
      created_at: u.createdAt || null,
      raw: Object.keys(raw).length ? raw : null,
    };
  }

  async function saveUserObject(user) {
    if (!user?.username) return;
    const row = _userToRow(user);
    await sb.from('users').upsert(row, { onConflict: 'username' });
  }

  // ── Auth ─────────────────────────────────────────────
  const PROTECTED_NAMES = ['staw', 'fortized', 'joyster'];

  function isProtectedUsername(name) {
    const clean = name.replace(/[^a-z]/g, '');
    for (const base of PROTECTED_NAMES) {
      if (clean === base) return true;
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
      const gs = await _getGlobalSettings();
      if (gs && gs.disableRegistration === true)
        return { ok: false, msg: 'New registrations are currently disabled. Please try again later.' };
    } catch(e) {}

    if (isProtectedUsername(username))
      return { ok: false, msg: 'This username is not available.' };

    const existing = await getUserByName(username);
    if (existing) return { ok: false, msg: 'Username already taken.' };

    if (email) {
      const emailLower = email.trim().toLowerCase();
      const { data: emailUsers } = await sb.from('users').select('username').eq('email', emailLower);
      if (emailUsers && emailUsers.length >= 3)
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
    const row = _userToRow(user);
    await sb.from('users').insert(row);
    await sb.from('statuses').upsert({ username, status: 'online' }, { onConflict: 'username' });
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

  // ── Status ───────────────────────────────────────────
  const VALID_STATUSES = new Set(['online','away','dnd','invisible','offline']);

  async function getStatus(username) {
    const { data } = await sb.from('statuses').select('status').eq('username', norm(username)).maybeSingle();
    const val = data?.status;
    return (val && VALID_STATUSES.has(val)) ? val : 'offline';
  }

  async function setStatus(username, status) {
    username = norm(username);
    if (!VALID_STATUSES.has(status)) status = 'offline';
    await Promise.all([
      sb.from('statuses').upsert({ username, status }, { onConflict: 'username' }),
      sb.from('users').update({ status }).eq('username', username),
    ]);
  }

  // ── Notifications ────────────────────────────────────
  async function getNotifications(username) {
    const { data } = await sb.from('notifications').select('*').eq('username', norm(username));
    if (!data || !data.length) return [];
    return data.map(r => ({
      ...(r.data || {}),
      id: r.id, type: r.type, from: r.from, time: r.time,
      read: r.read,
      data: r.data,
    })).sort((a, b) => new Date(b.time) - new Date(a.time));
  }

  async function addNotification(toUsername, notif) {
    notif.id   = Date.now().toString(36) + Math.random().toString(36).slice(2);
    notif.time = new Date().toISOString();
    notif.read = false;
    await sb.from('notifications').insert({
      id: notif.id,
      username: norm(toUsername),
      type: notif.type || null,
      from: notif.from || null,
      time: notif.time,
      read: false,
      data: notif.data || notif,
    });
  }

  async function markNotificationsRead(username) {
    await sb.from('notifications').update({ read: true }).eq('username', norm(username));
  }

  async function markNotificationReadBySource(username, type, from) {
    let q = sb.from('notifications').update({ read: true }).eq('username', norm(username)).eq('read', false);
    if (type) q = q.eq('type', type);
    if (from) q = q.eq('from', norm(from));
    await q;
  }

  async function getUnreadCount(username) {
    const { count } = await sb.from('notifications').select('*', { count: 'exact', head: true }).eq('username', norm(username)).eq('read', false);
    return count || 0;
  }

  // ── Friend System ────────────────────────────────────
  async function sendFriendRequest(fromUsername, toUsername) {
    fromUsername = norm(fromUsername);
    toUsername   = norm(toUsername);
    if (!toUsername) return { ok: false, msg: 'Enter a username.' };
    if (fromUsername === toUsername) return { ok: false, msg: "Can't add yourself." };

    const [fu, tu] = await Promise.all([getUserByName(fromUsername), getUserByName(toUsername)]);
    if (!fu) return { ok: false, msg: 'Your account not found.' };
    if (!tu) return { ok: false, msg: `User "${toUsername}" not found.` };

    const friends       = fu.friends           || [];
    const sentReqs      = fu.friendRequestsSent || [];
    const theirSentReqs = tu.friendRequestsSent || [];

    if (friends.includes(toUsername))   return { ok: false, msg: 'Already friends.' };
    if (sentReqs.includes(toUsername))  return { ok: false, msg: 'Request already sent.' };

    if (theirSentReqs.includes(fromUsername)) {
      return acceptFriendRequest(fromUsername, toUsername);
    }

    await sb.from('users').update({ friend_requests_sent: [...sentReqs, toUsername] }).eq('username', fromUsername);
    const theirReceived = tu.friendRequestsReceived || [];
    if (!theirReceived.includes(fromUsername)) {
      await sb.from('users').update({ friend_requests_received: [...theirReceived, fromUsername] }).eq('username', toUsername);
    }

    await addNotification(toUsername, { type: 'friend_request', from: fromUsername });
    return { ok: true, msg: `Friend request sent to ${toUsername}!` };
  }

  async function acceptFriendRequest(myUsername, fromUsername) {
    myUsername   = norm(myUsername);
    fromUsername = norm(fromUsername);

    const [mu, fu] = await Promise.all([getUserByName(myUsername), getUserByName(fromUsername)]);
    if (!mu || !fu) return { ok: false, msg: 'User not found.' };

    const myFriends  = [...(mu.friends || [])];
    const hisFriends = [...(fu.friends || [])];
    if (!myFriends.includes(fromUsername))  myFriends.push(fromUsername);
    if (!hisFriends.includes(myUsername))   hisFriends.push(myUsername);

    await sb.from('users').update({
      friends: myFriends,
      friend_requests_received: (mu.friendRequestsReceived || []).filter(u => u !== fromUsername),
      friend_requests_sent: (mu.friendRequestsSent || []).filter(u => u !== fromUsername),
    }).eq('username', myUsername);
    await sb.from('users').update({
      friends: hisFriends,
      friend_requests_sent: (fu.friendRequestsSent || []).filter(u => u !== myUsername),
      friend_requests_received: (fu.friendRequestsReceived || []).filter(u => u !== myUsername),
    }).eq('username', fromUsername);

    await addNotification(fromUsername, { type: 'friend_accept', from: myUsername });
    return { ok: true, msg: `You are now friends with ${fromUsername}!` };
  }

  const acceptFriend = acceptFriendRequest;

  async function declineFriendRequest(myUsername, fromUsername) {
    myUsername   = norm(myUsername);
    fromUsername = norm(fromUsername);
    const [mu, fu] = await Promise.all([getUserByName(myUsername), getUserByName(fromUsername)]);
    if (mu) await sb.from('users').update({
      friend_requests_received: (mu.friendRequestsReceived || []).filter(u => u !== fromUsername)
    }).eq('username', myUsername);
    if (fu) await sb.from('users').update({
      friend_requests_sent: (fu.friendRequestsSent || []).filter(u => u !== myUsername)
    }).eq('username', fromUsername);
    return { ok: true };
  }

  async function removeFriend(myUsername, friendUsername) {
    myUsername     = norm(myUsername);
    friendUsername = norm(friendUsername);
    const [mu, fu] = await Promise.all([getUserByName(myUsername), getUserByName(friendUsername)]);
    if (mu) await sb.from('users').update({
      friends: (mu.friends || []).filter(u => u !== friendUsername)
    }).eq('username', myUsername);
    if (fu) await sb.from('users').update({
      friends: (fu.friends || []).filter(u => u !== myUsername)
    }).eq('username', friendUsername);
    return { ok: true };
  }

  // ── Direct Messages ──────────────────────────────────
  function _dmKey(u1, u2) { return [norm(u1), norm(u2)].sort().join('__'); }

  async function getDMMessages(user1, user2) {
    const key = _dmKey(user1, user2);
    const { data } = await sb.from('dms').select('*').eq('dm_key', key).order('timestamp', { ascending: true });
    return (data || []).map(_dmFromRow);
  }

  function _dmFromRow(r) {
    return { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, edited: r.edited || false, newText: r.new_text || undefined, reactions: r.reactions || undefined, forwarded: r.forwarded || false, forwardedBy: r.forwarded_by || undefined };
  }

  async function sendDMMessage(fromUsername, toUsername, text, opts) {
    fromUsername = norm(fromUsername);
    toUsername   = norm(toUsername);
    const key = _dmKey(fromUsername, toUsername);
    const now = new Date();
    const msg = {
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2),
      from:      fromUsername,
      text,
      time:      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString()
    };

    const row = { dm_key: key, id: msg.id, from: msg.from, text: msg.text, time: msg.time, timestamp: msg.timestamp };
    if (opts?.forwarded) { row.forwarded = true; row.forwarded_by = opts.forwardedBy || fromUsername; msg.forwarded = true; msg.forwardedBy = row.forwarded_by; }
    await sb.from('dms').insert(row);

    // Update DM index for both users
    const [myIdx, theirIdx] = await Promise.all([
      _getDMIndex(fromUsername),
      _getDMIndex(toUsername),
    ]);

    const updateIdx = async (username, partner, current) => {
      const arr = Array.isArray(current) ? [...current] : [];
      const filtered = arr.filter(u => u !== partner);
      filtered.unshift(partner);
      await sb.from('dm_index').upsert({ username, partners: filtered.slice(0, 30) }, { onConflict: 'username' });
    };
    await Promise.all([
      updateIdx(fromUsername, toUsername, myIdx),
      updateIdx(toUsername, fromUsername, theirIdx),
    ]);

    await addNotification(toUsername, {
      type: 'dm', from: fromUsername,
      data: { preview: text.slice(0, 60) }
    });
    return msg;
  }

  // ── Delete Messages ─────────────────────────────────
  async function deleteMessage(type, opts) {
    if (type === 'dm') {
      const key = _dmKey(opts.user1, opts.user2);
      const { error } = await sb.from('dms').delete().eq('dm_key', key).eq('id', opts.messageId);
      if (error) throw new Error('Failed to delete DM: ' + error.message);
    } else if (type === 'gc') {
      const { error } = await sb.from('group_chat_messages').delete().eq('gc_id', opts.gcId).eq('id', opts.messageId);
      if (error) throw new Error('Failed to delete GC message: ' + error.message);
    } else if (type === 'bastion') {
      const { error } = await sb.from('bastion_msgs').delete().eq('bastion_id', opts.bastionId).eq('channel_id', opts.channelId).eq('id', opts.messageId);
      if (error) throw new Error('Failed to delete bastion message: ' + error.message);
    } else {
      throw new Error('Unknown message type: ' + type);
    }
  }

  async function _getDMIndex(username) {
    const { data } = await sb.from('dm_index').select('partners').eq('username', norm(username)).maybeSingle();
    return data?.partners || [];
  }

  async function getRecentDMPartners(username) {
    return _getDMIndex(norm(username));
  }

  // ── Bastion Messages ─────────────────────────────────
  async function getBastionChannelMessages(bastionId, channelId) {
    const { data } = await sb.from('bastion_msgs')
      .select('*')
      .eq('bastion_id', bastionId)
      .eq('channel_id', channelId)
      .order('timestamp', { ascending: true });
    return (data || []).map(r => ({
      id: r.id, from: r.from, text: r.text, time: r.time,
      timestamp: r.timestamp, edited: r.edited || false,
      reactions: r.reactions || undefined,
    }));
  }

  async function sendBastionChannelMessage(bastionId, channelId, fromUsername, text) {
    const now = new Date();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const msg = {
      id,
      from: norm(fromUsername),
      text,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString()
    };
    await sb.from('bastion_msgs').insert({
      bastion_id: bastionId, channel_id: channelId,
      id: msg.id, from: msg.from, text: msg.text,
      time: msg.time, timestamp: msg.timestamp,
    });
    return msg;
  }

  async function addReaction(bastionId, channelId, msgId, emoji, username) {
    username = norm(username);
    const { data } = await sb.from('bastion_msgs')
      .select('reactions')
      .eq('bastion_id', bastionId)
      .eq('channel_id', channelId)
      .eq('id', msgId)
      .maybeSingle();

    const reactions = data?.reactions || {};
    const arr = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
    const idx = arr.indexOf(username);
    if (idx !== -1) arr.splice(idx, 1);
    else arr.push(username);
    if (arr.length) reactions[emoji] = arr;
    else delete reactions[emoji];

    await sb.from('bastion_msgs')
      .update({ reactions: Object.keys(reactions).length ? reactions : null })
      .eq('bastion_id', bastionId)
      .eq('channel_id', channelId)
      .eq('id', msgId);
  }

  // ── Global Bastions ──────────────────────────────────
  async function getGlobalBastions() {
    const { data } = await sb.from('global_bastions').select('*');
    const result = {};
    (data || []).forEach(r => { result[r.id] = r.data; });
    return result;
  }
  async function saveGlobalBastion(id, bdata) {
    await sb.from('global_bastions').upsert({ id, data: bdata }, { onConflict: 'id' });
  }
  async function getGlobalBastion(id) {
    const { data } = await sb.from('global_bastions').select('data').eq('id', id).maybeSingle();
    return data?.data || null;
  }

  // ── Bastion Members ──────────────────────────────────
  async function getBastionMembers(bastionId) {
    const { data } = await sb.from('bastion_members').select('members').eq('bastion_id', bastionId).maybeSingle();
    return data?.members || [];
  }
  async function addBastionMember(bastionId, username) {
    const members = await getBastionMembers(bastionId);
    const u = norm(username);
    if (!members.includes(u)) members.push(u);
    await sb.from('bastion_members').upsert({ bastion_id: bastionId, members }, { onConflict: 'bastion_id' });
  }
  async function removeBastionMember(bastionId, username) {
    const u = norm(username);
    const members = await getBastionMembers(bastionId);
    await sb.from('bastion_members').upsert({ bastion_id: bastionId, members: members.filter(m => m !== u) }, { onConflict: 'bastion_id' });
    // Clean memberRoles
    try {
      const b = await getGlobalBastion(bastionId);
      if (b && b.memberRoles && b.memberRoles[u]) {
        delete b.memberRoles[u];
        await saveGlobalBastion(bastionId, b);
      }
    } catch {}
  }

  // ── Invites ──────────────────────────────────────────
  async function getInvite(code) {
    const { data } = await sb.from('invites').select('data').eq('code', code).maybeSingle();
    return data?.data || null;
  }
  async function saveInvite(code, idata) {
    await sb.from('invites').upsert({ code, data: idata }, { onConflict: 'code' });
  }
  async function incrementInviteUses(code) {
    const invite = await getInvite(code);
    if (invite) {
      invite.uses = (invite.uses || 0) + 1;
      await saveInvite(code, invite);
    }
  }

  // ── Reports ──────────────────────────────────────────
  async function submitReport(report) {
    if (!report?.id) return;
    await sb.from('reports').upsert({ id: report.id, data: report }, { onConflict: 'id' });
  }

  // ── Socket.io Real-Time Layer ────────────────────────
  // Kept identical — Socket.io is the real-time broadcast layer,
  // Supabase replaces Firebase as the persistence layer.
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
    if (typeof window === 'undefined' || typeof window.io === 'undefined') {
      console.log('[Fortized] Socket.io not loaded yet, will retry in 3s');
      setTimeout(function() {
        if (typeof window !== 'undefined' && typeof window.io !== 'undefined') {
          initSocket(username, callbacks);
        } else {
          console.warn('[Fortized] Socket.io unavailable');
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
      _socket.on('disconnect', function() {
        _socketReady = false;
        var banner = document.getElementById('offline-banner');
        if (banner && !navigator.onLine) banner.classList.add('visible');
      });
      _socket.on('connect_error', function() {
        _socketReady = false;
        var banner = document.getElementById('offline-banner');
        if (banner && !navigator.onLine) banner.classList.add('visible');
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
      _socket.on('message:edited', function(data) {
        if (_socketCallbacks.onMessageEdited) _socketCallbacks.onMessageEdited(data);
      });
      _socket.on('message:deleted', function(data) {
        if (_socketCallbacks.onMessageDeleted) _socketCallbacks.onMessageDeleted(data);
      });
      // ── Real-time poll updates ──
      _socket.on('poll:updated', function(data) {
        if (_socketCallbacks.onPollUpdate) _socketCallbacks.onPollUpdate(data);
      });
      // ── Real-time announcement updates ──
      _socket.on('announcement:new', function(data) {
        if (_socketCallbacks.onAnnouncementNew) _socketCallbacks.onAnnouncementNew(data);
      });
      _socket.on('announcement:cleared', function(data) {
        if (_socketCallbacks.onAnnouncementCleared) _socketCallbacks.onAnnouncementCleared(data);
      });
      // ── Real-time bastion/role updates ──
      _socket.on('bastion:updated', function(data) {
        if (_socketCallbacks.onBastionUpdate) _socketCallbacks.onBastionUpdate(data);
      });
      // ── Real-time profile updates (pfp, displayName) ──
      _socket.on('profile:updated', function(data) {
        if (_socketCallbacks.onProfileUpdate) _socketCallbacks.onProfileUpdate(data);
      });
    } catch (e) {
      console.warn('[Fortized] Socket.io init failed', e);
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

  // ── Supabase Real-time Listeners (replaces Firebase listeners) ──
  let _subscriptions = [];
  let _callbacks = {};

  function startSupabasePolling(username, callbacks) {
    _callbacks = callbacks || {};
    stopSupabasePolling();
    username = norm(username);

    // Listen for new notifications
    const notifSub = sb.channel('notifs-' + username)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'username=eq.' + username,
      }, payload => {
        const n = payload.new;
        if (!n || n.read) return;
        const notif = { ...(n.data || {}), id: n.id, type: n.type, from: n.from, time: n.time, read: n.read };
        _callbacks.onNewNotification?.(notif);
        updateNotifBadgeExternal(username);
      })
      .subscribe();
    _subscriptions.push(notifSub);

    // Listen for status changes
    const statusSub = sb.channel('statuses-all')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'statuses',
      }, payload => {
        const row = payload.new;
        if (row) _callbacks.onStatusChange?.({ username: row.username, status: row.status });
      })
      .subscribe();
    _subscriptions.push(statusSub);

    // Listen for DM index changes
    const dmIdxSub = sb.channel('dmidx-' + username)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dm_index',
        filter: 'username=eq.' + username,
      }, () => {
        _callbacks.onDMIndexChange?.();
      })
      .subscribe();
    _subscriptions.push(dmIdxSub);
  }

  function startPolling(username, callbacks) {
    callbacks = callbacks || {};
    // Merge with existing callbacks (e.g. from initSocket called earlier) to avoid overwriting
    var merged = Object.assign({}, _callbacks, callbacks);
    startSupabasePolling(username, merged);
    // Only init socket if not already connected
    if (!_socket || !_socketReady) {
      try { initSocket(username, merged); } catch(_) {}
    }
  }

  function stopPolling() {
    disconnectSocket();
    stopSupabasePolling();
  }

  function stopSupabasePolling() {
    _subscriptions.forEach(sub => {
      try { sb.removeChannel(sub); } catch (_) {}
    });
    _subscriptions = [];
  }

  function listenBastionChannel(bastionId, channelId, callback) {
    joinRoom('bastion', bastionId, channelId);
    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const sub = sb.channel('bastion-' + bastionId + '-' + channelId + '-' + uid)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bastion_msgs',
        filter: 'bastion_id=eq.' + bastionId,
      }, payload => {
        const r = payload.new;
        if (r && r.channel_id === channelId) {
          callback?.({ id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, reactions: r.reactions });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bastion_msgs',
        filter: 'bastion_id=eq.' + bastionId,
      }, payload => {
        const r = payload.new;
        if (r && r.channel_id === channelId) {
          callback?.({ id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, reactions: r.reactions, _event: 'update' });
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'bastion_msgs',
        filter: 'bastion_id=eq.' + bastionId,
      }, payload => {
        const r = payload.old;
        if (r && r.id) {
          callback?.({ id: r.id, _event: 'delete' });
        }
      })
      .subscribe();
    return () => {
      sb.removeChannel(sub);
      leaveRoom('bastion', bastionId, channelId);
    };
  }

  function listenDM(user1, user2, callback) {
    const key = _dmKey(user1, user2);
    joinRoom('dm', norm(user1), norm(user2));
    const sub = sb.channel('dm-' + key)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dms',
        filter: 'dm_key=eq.' + key,
      }, payload => {
        const r = payload.new;
        if (r) callback?.(_dmFromRow(r));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dms',
        filter: 'dm_key=eq.' + key,
      }, payload => {
        const r = payload.new;
        if (r) { const m = _dmFromRow(r); m._event = 'update'; callback?.(m); }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'dms',
        filter: 'dm_key=eq.' + key,
      }, payload => {
        const r = payload.old;
        if (r && r.id) callback?.({ id: r.id, _event: 'delete' });
      })
      .subscribe();
    return () => {
      sb.removeChannel(sub);
      leaveRoom('dm', norm(user1), norm(user2));
    };
  }

  async function updateNotifBadgeExternal(username) {
    if (typeof window !== 'undefined' && typeof window.updateNotifBadge === 'function') {
      window.updateNotifBadge();
    }
  }

  // ── Audio ────────────────────────────────────────────
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

  // ── Internal helpers for admin global settings ───────
  async function _getGlobalSettings() {
    const { data } = await sb.from('admin_global_settings').select('data').eq('id', 1).maybeSingle();
    return data?.data || {};
  }

  // ── Admin CRUD helpers (Supabase-native) ────────────
  // These replace the old Firebase admin/* paths.
  // Uses a generic 'admin_kv' table with {key TEXT PK, data JSONB}
  // and the existing 'reports' table and 'users' table columns.

  async function _adminKVGet(key) {
    const { data } = await sb.from('admin_kv').select('data').eq('key', key).maybeSingle();
    return data?.data ?? null;
  }
  async function _adminKVSet(key, val) {
    await sb.from('admin_kv').upsert({ key, data: val }, { onConflict: 'key' });
  }

  // -- Reports --
  async function adminGetReports() {
    const { data } = await sb.from('reports').select('*');
    return (data || []).map(r => r.data || r);
  }
  async function adminSaveReport(report) {
    if (!report?.id) return;
    await sb.from('reports').upsert({ id: report.id, data: report }, { onConflict: 'id' });
  }

  // -- Bans (stored as admin_kv key 'bans' array AND on user row) --
  async function adminGetBans() {
    return (await _adminKVGet('bans')) || [];
  }
  async function adminSaveBan(banObj) {
    const bans = await adminGetBans();
    const existing = bans.findIndex(b => b.username === banObj.username);
    if (existing >= 0) bans[existing] = banObj; else bans.push(banObj);
    await _adminKVSet('bans', bans);
    // Also mark the user's row
    const { data: row } = await sb.from('users').select('raw').eq('username', norm(banObj.username)).maybeSingle();
    if (row !== null) {
      await sb.from('users').update({ banned: true, ban_reason: banObj.reason || null }).eq('username', norm(banObj.username));
    }
  }
  async function adminRemoveBan(username) {
    const bans = (await adminGetBans()).filter(b => b.username !== username);
    await _adminKVSet('bans', bans);
    await sb.from('users').update({ banned: false, ban_reason: null }).eq('username', norm(username));
  }

  // -- Suspensions (stored on user row) --
  async function adminSuspendUser(username, suspObj) {
    await sb.from('users').update({
      suspension: suspObj,
      suspended_until: suspObj.until
    }).eq('username', norm(username));
  }
  async function adminUnsuspendUser(username) {
    await sb.from('users').update({ suspension: null, suspended_until: null }).eq('username', norm(username));
  }

  // -- Warnings (stored on user row) --
  async function adminWarnUser(username, warningObj) {
    await sb.from('users').update({ active_warning: warningObj }).eq('username', norm(username));
  }
  async function adminClearWarning(username) {
    await sb.from('users').update({ active_warning: null }).eq('username', norm(username));
  }

  // -- Force logout (set a flag on user row that client checks) --
  async function adminForceLogout(username) {
    const { data: row } = await sb.from('users').select('raw').eq('username', norm(username)).maybeSingle();
    const raw = row?.raw || {};
    raw.forceLogoutAt = new Date().toISOString();
    await sb.from('users').update({ raw }).eq('username', norm(username));
  }

  // -- NSFW Queue --
  async function adminGetNsfwQueue() {
    return (await _adminKVGet('nsfw_queue')) || [];
  }
  async function adminSaveNsfwQueue(queue) {
    await _adminKVSet('nsfw_queue', queue);
  }

  // -- Staff --
  async function adminGetStaff() {
    return (await _adminKVGet('staff')) || { admins: [], moderators: [] };
  }
  async function adminSaveStaff(staff) {
    await _adminKVSet('staff', staff);
  }

  // -- Audit Log --
  async function adminGetAuditLog() {
    return (await _adminKVGet('audit_log')) || [];
  }
  async function adminPushAuditLog(entry) {
    const log = await adminGetAuditLog();
    log.unshift(entry);
    await _adminKVSet('audit_log', log.slice(0, 500));
  }

  // -- Global Settings --
  async function adminGetGlobalSettings() {
    return await _getGlobalSettings();
  }
  async function adminSaveGlobalSettings(settings) {
    await sb.from('admin_global_settings').upsert({ id: 1, data: settings }, { onConflict: 'id' });
  }

  // -- NSFW Banned Hashes --
  async function adminGetNsfwBannedHashes() {
    return (await _adminKVGet('nsfw_banned_hashes')) || [];
  }
  async function adminSaveNsfwBannedHashes(hashes) {
    await _adminKVSet('nsfw_banned_hashes', hashes);
  }

  // -- User field updates (onyx, radiance, etc) --
  async function adminUpdateUserField(username, field, value) {
    const u = await getUserByName(username);
    if (!u) return;
    u[field] = value;
    await saveUserObject(u);
  }

  // -- Support tickets --
  async function adminGetSupportTickets() {
    return (await _adminKVGet('support_tickets')) || {};
  }
  async function adminSaveSupportTickets(tickets) {
    await _adminKVSet('support_tickets', tickets);
  }

  // -- Scheduled actions --
  async function adminGetScheduledActions() {
    return (await _adminKVGet('scheduled_actions')) || [];
  }
  async function adminSaveScheduledActions(actions) {
    await _adminKVSet('scheduled_actions', actions);
  }

  // -- NSFW AI feedback & safe hashes --
  async function adminPushNsfwAIFeedback(feedback) {
    const list = (await _adminKVGet('nsfw_ai_feedback')) || [];
    list.push(feedback);
    await _adminKVSet('nsfw_ai_feedback', list);
  }
  async function adminSaveNsfwSafeHash(hashKey, data) {
    const hashes = (await _adminKVGet('nsfw_safe_hashes')) || {};
    hashes[hashKey] = data;
    await _adminKVSet('nsfw_safe_hashes', hashes);
  }

  // -- Admin signals (force refresh, clear sessions, staff revocation) --
  async function adminSetSignal(key, value) {
    await _adminKVSet('signal_' + key, value);
  }
  async function adminGetSignal(key) {
    return await _adminKVGet('signal_' + key);
  }

  // -- Feedback storage --
  async function adminPushFeedback(entry) {
    const list = (await _adminKVGet('feedback')) || [];
    list.push(entry);
    await _adminKVSet('feedback', list.slice(-200));
  }

  // ── Public API ───────────────────────────────────────
  return {
    sb, // Expose supabase client for direct calls in app code
    norm,
    _userFromRow,
    _userToRow,
    _dmKey,
    register, login, logout, getCurrentUsername,
    getUsers, getAllUsers: async () => {
      const { data } = await sb.from('users').select('*');
      const result = {};
      (data || []).forEach(r => { const u = _userFromRow(r); result[u.username] = u; });
      return result;
    },
    getUserByName, saveUserObject,
    getStatus, setStatus,
    getNotifications, addNotification, markNotificationsRead, markNotificationReadBySource, getUnreadCount,
    sendFriendRequest, acceptFriendRequest, acceptFriend, declineFriendRequest, removeFriend,
    getDMMessages, sendDMMessage, deleteMessage, getRecentDMPartners,
    getBastionChannelMessages, sendBastionChannelMessage, addReaction,
    getGlobalBastions, saveGlobalBastion, getGlobalBastion,
    getBastionMembers, addBastionMember, removeBastionMember,
    getInvite, saveInvite, incrementInviteUses,
    submitReport,
    // Admin API
    adminGetReports, adminSaveReport,
    adminGetBans, adminSaveBan, adminRemoveBan,
    adminSuspendUser, adminUnsuspendUser,
    adminWarnUser, adminClearWarning,
    adminForceLogout,
    adminGetNsfwQueue, adminSaveNsfwQueue,
    adminGetStaff, adminSaveStaff,
    adminGetAuditLog, adminPushAuditLog,
    adminGetGlobalSettings, adminSaveGlobalSettings,
    adminGetNsfwBannedHashes, adminSaveNsfwBannedHashes,
    adminUpdateUserField,
    adminGetSupportTickets, adminSaveSupportTickets,
    adminGetScheduledActions, adminSaveScheduledActions,
    adminPushNsfwAIFeedback, adminSaveNsfwSafeHash,
    adminSetSignal, adminGetSignal,
    adminPushFeedback,
    startPolling, stopPolling, listenBastionChannel, listenDM,
    initSocket, getSocket, isSocketReady, socketEmit,
    joinRoom, leaveRoom, queryPresence, disconnectSocket,
    playNotificationSound,
  };

})();
