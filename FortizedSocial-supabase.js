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

  // ── Aggressive Cache Layer ──────────────────────────
  // Serves data from memory/localStorage to minimize Supabase egress.
  // Critical: Supabase egress is at 620% of free tier limit — every
  // query avoided keeps the site alive.
  const _cache = {};
  const _CACHE_TTL = {
    user: 300000,           // 5 min — user profiles (was 2min)
    userEnforce: 120000,    // 2 min — ban/suspension checks (was 1min)
    notifications: 300000,  // 5 min — notification list (was 2min)
    unreadCount: 120000,    // 2 min — unread badge count (was 1min)
    dmMessages: 120000,     // 2 min — DM message lists (was 1min)
    bastionMsgs: 120000,    // 2 min — bastion channel messages (was 1min)
    globalBastions: 600000, // 10 min — global bastion registry (was 5min)
    globalBastion: 300000,  // 5 min — single bastion data (was 2min)
    bastionMembers: 300000, // 5 min — bastion member lists (was 2min)
    dmIndex: 120000,        // 2 min — DM partner index (was 1min)
    adminKV: 300000,        // 5 min — admin key-value data (was 2min)
    globalSettings: 600000, // 10 min — admin global settings (was 5min)
    status: 60000,          // 1 min — user status (was 30s)
    reports: 120000,        // 2 min — admin reports
    staff: 300000,          // 5 min — staff list
  };

  function _cacheGet(key) {
    const entry = _cache[key];
    if (!entry) return undefined;
    if (Date.now() - entry.ts > (entry.ttl || 60000)) {
      delete _cache[key];
      return undefined;
    }
    return entry.val;
  }

  function _cacheSet(key, val, ttl) {
    _cache[key] = { val, ts: Date.now(), ttl: ttl || 60000 };
    // Also persist critical data to localStorage for offline fallback
    try {
      if (key.startsWith('user:') || key === 'globalBastions' || key.startsWith('staff')) {
        localStorage.setItem('ftz_cache_' + key, JSON.stringify({ val, ts: Date.now() }));
      }
    } catch {}
  }

  function _cacheDel(key) { delete _cache[key]; }

  // Try localStorage fallback if memory cache is empty (page reload scenario)
  function _cacheGetWithFallback(key, ttl) {
    const mem = _cacheGet(key);
    if (mem !== undefined) return mem;
    try {
      const stored = localStorage.getItem('ftz_cache_' + key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Use longer TTL for localStorage fallback (5 min) to keep site alive when throttled
        if (Date.now() - parsed.ts < Math.max(ttl || 60000, 300000)) {
          _cache[key] = { val: parsed.val, ts: parsed.ts, ttl: ttl || 60000 };
          return parsed.val;
        }
      }
    } catch {}
    return undefined;
  }

  function _cacheInvalidatePrefix(prefix) {
    for (const key of Object.keys(_cache)) {
      if (key.startsWith(prefix)) delete _cache[key];
    }
  }

  function invalidateUserCache(username) {
    if (!username) return;
    const normed = norm(username);
    _cacheInvalidatePrefix('user:' + normed);
    _cacheInvalidatePrefix('userEnf:' + normed);
  }

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
  // Lightweight columns for list views (no heavy arrays/JSON)
  const _USER_LIST_COLS = 'username,display_name,pfp,banner,status,onyx,custom_status,bio,badges,radiance_until,radiance_plus,active_decoration,profile_theme,game_activity,last_seen,created_at';
  // Columns needed for enforcement checks only
  const _USER_ENFORCE_COLS = 'username,banned,ban_reason,suspension,suspended_until,active_warning,raw';

  async function getUsers() {
    const cached = _cacheGet('allUsers');
    if (cached !== undefined) return cached;
    const { data } = await sb.from('users').select(_USER_LIST_COLS);
    const result = (data || []).map(_userFromRow);
    _cacheSet('allUsers', result, _CACHE_TTL.user);
    return result;
  }

  async function getUserByName(username, opts) {
    if (!username) return null;
    const cols = (opts && opts.columns) ? opts.columns : '*';
    const isEnforce = cols === _USER_ENFORCE_COLS;
    const cacheKey = isEnforce ? 'userEnf:' + norm(username) : 'user:' + norm(username);
    const ttl = isEnforce ? _CACHE_TTL.userEnforce : _CACHE_TTL.user;
    const skipCache = opts && opts.noCache; // Allow bypassing cache for critical loads
    if (!skipCache) {
      const cached = _cacheGetWithFallback(cacheKey, ttl);
      if (cached !== undefined) return cached;
    }
    const { data } = await sb.from('users').select(cols).eq('username', norm(username)).maybeSingle();
    const result = data ? _userFromRow(data) : null;
    _cacheSet(cacheKey, result, ttl);
    return result;
  }

  // Batch fetch multiple users in a single query
  async function getUsersByNames(usernames, cols) {
    if (!usernames || !usernames.length) return [];
    const normed = usernames.map(norm).filter(Boolean);
    if (!normed.length) return [];
    // Check which users are already cached
    const uncached = [];
    const results = [];
    for (const u of normed) {
      const cached = _cacheGet('user:' + u);
      if (cached !== undefined) results.push(cached);
      else uncached.push(u);
    }
    if (uncached.length > 0) {
      const { data } = await sb.from('users').select(cols || _USER_LIST_COLS).in('username', uncached);
      (data || []).forEach(r => {
        const user = _userFromRow(r);
        _cacheSet('user:' + norm(user.username), user, _CACHE_TTL.user);
        results.push(user);
      });
    }
    return results;
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
    const row = {
      username: norm(u.username),
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
      last_daily: _isoToBigint(u.lastDaily),
      blocked_users: u.blockedUsers || [],
      ignored_users: u.ignoredUsers || {},
      group_chats: u.groupChats || [],
      suspension: u.suspension || null,
      suspended_until: _isoToBigint(u.suspendedUntil),
      active_warning: u.activeWarning || null,
      game_activity: u.gameActivity || null,
      last_seen: _isoToBigint(u.lastSeen),
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
    // Only include password if we actually have one. NEVER emit a fallback like
    // 'system' here — with upsert+merge semantics that would silently overwrite
    // the user's real password whenever a partial in-memory object (missing the
    // password field) is saved.
    if (typeof u.password === 'string' && u.password.length > 0) {
      row.password = u.password;
    }
    return row;
  }

  // Protected accounts: writes must never clobber profile data (pfp/banner/bio/
  // friends/radiance/etc) with empty values. Only badges + admin perms (role,
  // isAdmin, isModerator, forceLogoutAt, banned, banReason, suspension) may be
  // freely changed. Everything else is non-destructively merged against the
  // existing DB row so stale/partial saves can't erase data.
  const _PROTECTED_ACCOUNTS_HARD = new Set(['staw', 'fortized', 'joyster']);
  // Admin/moderation fields that ARE allowed to change freely (even to empty).
  const _PROTECTED_WRITABLE_FIELDS = new Set([
    'badges', 'role', 'isAdmin', 'isModerator', 'isSuperAdmin',
    'forceLogoutAt', 'banned', 'banReason', 'suspension', 'suspendedUntil',
    'activeWarning', 'lastSeen', 'status', 'customStatus', 'gameActivity',
    'onyx', 'password', // password changes must flow through
  ]);
  const _PROTECTED_WRITABLE_COLS = new Set([
    'badges', 'banned', 'ban_reason', 'suspension', 'suspended_until',
    'active_warning', 'last_seen', 'status', 'custom_status', 'game_activity',
    'onyx', 'password', 'raw',
  ]);

  function _isHardProtected(username) {
    return _PROTECTED_ACCOUNTS_HARD.has(norm(username));
  }

  // Given incoming row + existing DB row for a protected account, return a
  // merged row where empty/null fields in the new row fall back to existing
  // values. Fields in _PROTECTED_WRITABLE_COLS are always taken from the new
  // row. For `raw` JSONB, we shallow-merge so admin fields in raw can update
  // without erasing unrelated extras.
  function _mergeProtectedRow(newRow, existingRow) {
    if (!existingRow) return newRow;
    const out = { ...existingRow, ...newRow };
    for (const col of Object.keys(newRow)) {
      if (_PROTECTED_WRITABLE_COLS.has(col)) continue;
      const nv = newRow[col];
      const ev = existingRow[col];
      const isEmpty = nv == null
        || (Array.isArray(nv) && nv.length === 0 && Array.isArray(ev) && ev.length > 0)
        || (typeof nv === 'string' && nv === '' && typeof ev === 'string' && ev !== '')
        || (typeof nv === 'object' && !Array.isArray(nv) && nv && Object.keys(nv).length === 0 && ev && typeof ev === 'object' && Object.keys(ev).length > 0);
      if (isEmpty) out[col] = ev;
    }
    // Password is special: even though it's in the writable set, we never want
    // to accept a falsy new value (null/''/undefined) over a real existing one.
    // This is the last line of defence against the 'system'-password bug.
    if (!newRow.password && existingRow.password) out.password = existingRow.password;
    // Shallow merge raw JSONB so protected extras survive partial saves.
    if (existingRow.raw && typeof existingRow.raw === 'object') {
      out.raw = { ...existingRow.raw, ...(newRow.raw || {}) };
    }
    // username always from new row (normalized)
    out.username = newRow.username;
    return out;
  }

  async function saveUserObject(user) {
    if (!user?.username) return;
    _cacheDel('user:' + norm(user.username));
    _cacheDel('userEnf:' + norm(user.username));
    let row = _userToRow(user);
    if (_isHardProtected(user.username)) {
      try {
        const { data: existing } = await sb.from('users').select('*').eq('username', norm(user.username)).maybeSingle();
        if (existing) {
          row = _mergeProtectedRow(row, existing);
          console.debug('[saveUserObject] Protected account merge applied for', user.username);
        }
      } catch (e) {
        console.warn('[saveUserObject] Protected merge lookup failed, aborting write to avoid data loss:', e?.message);
        return;
      }
    }
    console.debug('[saveUserObject] Saving user:', {
      username: user.username,
      pfp: row.pfp ? 'set' : 'null',
      banner: row.banner ? 'set' : 'null',
      onyx: row.onyx
    });
    const { data, error } = await sb.from('users').upsert(row, { onConflict: 'username' });
    if (error) {
      console.error('[saveUserObject] UPSERT FAILED:', error.message, error.code);
      throw new Error(`Upsert failed: ${error.message}`);
    }
    console.debug('[saveUserObject] ✓ Successfully saved user data');
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
    const cacheKey = 'status:' + norm(username);
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('statuses').select('status').eq('username', norm(username)).maybeSingle();
    const val = data?.status;
    const result = (val && VALID_STATUSES.has(val)) ? val : 'offline';
    _cacheSet(cacheKey, result, _CACHE_TTL.status);
    return result;
  }

  async function setStatus(username, status) {
    username = norm(username);
    if (!VALID_STATUSES.has(status)) status = 'offline';
    _cacheSet('status:' + username, status, _CACHE_TTL.status);
    try {
      const [res1, res2] = await Promise.all([
        sb.from('statuses').upsert({ username, status }, { onConflict: 'username' }),
        sb.from('users').update({ status }).eq('username', username),
      ]);
      if (res1.error) console.error('[setStatus] Statuses update failed:', res1.error.message);
      if (res2.error) console.error('[setStatus] Users update failed:', res2.error.message);
    } catch(e) {
      console.error('[setStatus] Exception:', e.message);
    }
  }

  // ── Notifications ────────────────────────────────────
  async function getNotifications(username) {
    const cacheKey = 'notifs:' + norm(username);
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('notifications').select('id,type,from,time,read,data')
      .eq('username', norm(username))
      .order('time', { ascending: false })
      .limit(50);
    if (!data || !data.length) { _cacheSet(cacheKey, [], _CACHE_TTL.notifications); return []; }
    const result = data.map(r => ({
      ...(r.data || {}),
      id: r.id, type: r.type, from: r.from, time: r.time,
      read: r.read,
      data: r.data,
    }));
    _cacheSet(cacheKey, result, _CACHE_TTL.notifications);
    return result;
  }

  async function addNotification(toUsername, notif) {
    notif.id   = Date.now().toString(36) + Math.random().toString(36).slice(2);
    notif.time = new Date().toISOString();
    notif.read = false;
    _cacheDel('notifs:' + norm(toUsername));
    _cacheDel('unread:' + norm(toUsername));
    try {
      const { error } = await sb.from('notifications').insert({
        id: notif.id,
        username: norm(toUsername),
        type: notif.type || null,
        from: notif.from || null,
        time: notif.time,
        read: false,
        data: notif.data || notif,
      });
      if (error) {
        console.error('[addNotification] Insert failed:', error.message);
      } else {
        console.debug('[addNotification] Sent to', toUsername, 'type:', notif.type);
      }
    } catch(e) {
      console.error('[addNotification] Exception:', e.message);
    }
  }

  async function markNotificationsRead(username) {
    username = norm(username);
    _cacheDel('notifs:' + username);
    _cacheDel('unread:' + username);
    try {
      const { error } = await sb.from('notifications').update({ read: true }).eq('username', username);
      if (error) {
        console.error('[markNotificationsRead] Update failed:', error.message);
      } else {
        console.debug('[markNotificationsRead] Marked all read for', username);
      }
    } catch(e) {
      console.error('[markNotificationsRead] Exception:', e.message);
    }
  }

  async function markNotificationReadBySource(username, type, from) {
    _cacheDel('notifs:' + norm(username));
    _cacheDel('unread:' + norm(username));
    let q = sb.from('notifications').update({ read: true }).eq('username', norm(username)).eq('read', false);
    if (type) q = q.eq('type', type);
    if (from) q = q.eq('from', norm(from));
    await q;
  }

  async function getUnreadCount(username) {
    const cacheKey = 'unread:' + norm(username);
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('username', norm(username)).eq('read', false);
    const result = count || 0;
    _cacheSet(cacheKey, result, _CACHE_TTL.unreadCount);
    return result;
  }

  // ── Friend System ────────────────────────────────────
  async function sendFriendRequest(fromUsername, toUsername) {
    fromUsername = norm(fromUsername);
    toUsername   = norm(toUsername);
    _cacheDel('user:' + fromUsername); _cacheDel('user:' + toUsername);
    if (!toUsername) return { ok: false, msg: 'Enter a username.' };
    if (fromUsername === toUsername) return { ok: false, msg: "Can't add yourself." };

    // Fetch fresh data to avoid stale friend lists
    const [fu, tu] = await Promise.all([
      getUserByName(fromUsername, { noCache: true }),
      getUserByName(toUsername, { noCache: true })
    ]);
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

    try {
      const { error: err1 } = await sb.from('users').update({ friend_requests_sent: [...sentReqs, toUsername] }).eq('username', fromUsername);
      if (err1) throw new Error(`Update sender failed: ${err1.message}`);

      const theirReceived = tu.friendRequestsReceived || [];
      if (!theirReceived.includes(fromUsername)) {
        const { error: err2 } = await sb.from('users').update({ friend_requests_received: [...theirReceived, fromUsername] }).eq('username', toUsername);
        if (err2) throw new Error(`Update receiver failed: ${err2.message}`);
      }

      await addNotification(toUsername, { type: 'friend_request', from: fromUsername });
      console.debug('[Friend Request] Sent from', fromUsername, 'to', toUsername);
      return { ok: true, msg: `Friend request sent to ${toUsername}!` };
    } catch (e) {
      console.error('[sendFriendRequest Error]', e.message);
      return { ok: false, msg: 'Failed to send request: ' + e.message };
    }
  }

  async function acceptFriendRequest(myUsername, fromUsername) {
    myUsername   = norm(myUsername);
    fromUsername = norm(fromUsername);
    _cacheDel('user:' + myUsername); _cacheDel('user:' + fromUsername);
    // Fetch fresh data to ensure friend lists are current
    const [mu, fu] = await Promise.all([
      getUserByName(myUsername, { noCache: true }),
      getUserByName(fromUsername, { noCache: true })
    ]);
    if (!mu || !fu) return { ok: false, msg: 'User not found.' };

    const myFriends  = [...(mu.friends || [])];
    const hisFriends = [...(fu.friends || [])];
    if (!myFriends.includes(fromUsername))  myFriends.push(fromUsername);
    if (!hisFriends.includes(myUsername))   hisFriends.push(myUsername);

    try {
      const { error: err1 } = await sb.from('users').update({
        friends: myFriends,
        friend_requests_received: (mu.friendRequestsReceived || []).filter(u => u !== fromUsername),
        friend_requests_sent: (mu.friendRequestsSent || []).filter(u => u !== fromUsername),
      }).eq('username', myUsername);
      if (err1) throw new Error(`Update my profile failed: ${err1.message}`);

      const { error: err2 } = await sb.from('users').update({
        friends: hisFriends,
        friend_requests_sent: (fu.friendRequestsSent || []).filter(u => u !== myUsername),
        friend_requests_received: (fu.friendRequestsReceived || []).filter(u => u !== myUsername),
      }).eq('username', fromUsername);
      if (err2) throw new Error(`Update their profile failed: ${err2.message}`);

      await addNotification(fromUsername, { type: 'friend_accept', from: myUsername });
      console.debug('[Friend Accept] Users', myUsername, 'and', fromUsername, 'are now friends');
      return { ok: true, msg: `You are now friends with ${fromUsername}!` };
    } catch (e) {
      console.error('[acceptFriendRequest Error]', e.message);
      return { ok: false, msg: 'Failed to accept: ' + e.message };
    }
  }

  const acceptFriend = acceptFriendRequest;

  async function declineFriendRequest(myUsername, fromUsername) {
    myUsername   = norm(myUsername);
    fromUsername = norm(fromUsername);
    try {
      const [mu, fu] = await Promise.all([
        getUserByName(myUsername, { noCache: true }),
        getUserByName(fromUsername, { noCache: true })
      ]);
      if (mu) {
        const { error: err1 } = await sb.from('users').update({
          friend_requests_received: (mu.friendRequestsReceived || []).filter(u => u !== fromUsername)
        }).eq('username', myUsername);
        if (err1) throw new Error(`Decline for ${myUsername} failed: ${err1.message}`);
      }
      if (fu) {
        const { error: err2 } = await sb.from('users').update({
          friend_requests_sent: (fu.friendRequestsSent || []).filter(u => u !== myUsername)
        }).eq('username', fromUsername);
        if (err2) throw new Error(`Decline for ${fromUsername} failed: ${err2.message}`);
      }
      console.debug('[declineFriendRequest] Request declined:', { myUsername, fromUsername });
      return { ok: true };
    } catch(e) {
      console.error('[declineFriendRequest Error]', e.message);
      return { ok: false, msg: 'Failed to decline: ' + e.message };
    }
  }

  async function removeFriend(myUsername, friendUsername) {
    myUsername     = norm(myUsername);
    friendUsername = norm(friendUsername);
    try {
      const [mu, fu] = await Promise.all([
        getUserByName(myUsername, { noCache: true }),
        getUserByName(friendUsername, { noCache: true })
      ]);
      if (mu) {
        const { error: err1 } = await sb.from('users').update({
          friends: (mu.friends || []).filter(u => u !== friendUsername)
        }).eq('username', myUsername);
        if (err1) throw new Error(`Remove for ${myUsername} failed: ${err1.message}`);
      }
      if (fu) {
        const { error: err2 } = await sb.from('users').update({
          friends: (fu.friends || []).filter(u => u !== myUsername)
        }).eq('username', friendUsername);
        if (err2) throw new Error(`Remove for ${friendUsername} failed: ${err2.message}`);
      }
      console.debug('[removeFriend] Friend removed:', { myUsername, friendUsername });
      return { ok: true };
    } catch(e) {
      console.error('[removeFriend Error]', e.message);
      return { ok: false, msg: 'Failed to remove friend: ' + e.message };
    }
  }

  // ── Direct Messages ──────────────────────────────────
  function _dmKey(u1, u2) { return [norm(u1), norm(u2)].sort().join('__'); }

  async function getDMMessages(user1, user2, limit) {
    const key = _dmKey(user1, user2);
    const max = limit || 100;
    const cacheKey = 'dm:' + key + ':' + max;
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    try {
      // Parse users from dmKey (format: "user1__user2")
      const [u1, u2] = key.split('__');

      // Try old schema first with dm_key column
      let { data, error } = await sb.from('dms')
        .select('*')
        .eq('dm_key', key)
        .order('timestamp', { ascending: false })
        .limit(max);

      // If that fails or returns empty, try new schema with from/username columns
      if ((error || !data || data.length === 0) && u1 && u2) {
        console.debug('[getDMMessages] Trying new schema with from/username columns');
        // Query both directions: (from=u1 AND username=u2) OR (from=u2 AND username=u1)
        const res1 = await sb.from('dms')
          .select('*')
          .eq('from', u1)
          .eq('username', u2)
          .order('time', { ascending: false })
          .limit(Math.ceil(max / 2));

        const res2 = await sb.from('dms')
          .select('*')
          .eq('from', u2)
          .eq('username', u1)
          .order('time', { ascending: false })
          .limit(Math.ceil(max / 2));

        if (!res1.error && !res2.error) {
          data = [...(res1.data || []), ...(res2.data || [])].sort((a, b) => {
            const timeA = a.time || a.timestamp || 0;
            const timeB = b.time || b.timestamp || 0;
            return new Date(timeB) - new Date(timeA);
          }).slice(0, max);
          error = null;
        } else {
          error = res1.error || res2.error;
        }
      }

      if (error) {
        console.error('[getDMMessages] Query error:', error.message);
        return [];
      }

      // Reverse to chronological order after fetching latest N
      const result = (data || []).reverse().map(r => {
        // Handle both old schema (columns: id, from, text, time, timestamp, etc.)
        // and new schema (columns: id, username, type, from, time, read, data)
        if (r.text !== undefined) {
          // Old schema - has direct text column
          return _dmFromRow(r);
        } else {
          // New schema - text might be in data column (JSONB)
          const msgData = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
          return _dmFromPollingRow(r, msgData);
        }
      });

      console.debug('[getDMMessages]', { between: key, count: result.length, sample: result.slice(-3).map(m => ({ id: m.id, from: m.from, text: m.text?.slice(0,40) })) });
      _cacheSet(cacheKey, result, _CACHE_TTL.dmMessages);
      return result;
    } catch(e) {
      console.error('[getDMMessages] Exception:', e.message);
      return [];
    }
  }

  function _dmFromRow(r) {
    return { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, edited: r.edited || false, newText: r.new_text || undefined, reactions: r.reactions || undefined, forwarded: r.forwarded || false, forwardedBy: r.forwarded_by || undefined };
  }

  function _dmFromPollingRow(r, msgData) {
    // Extract message from polling response where data might be in a JSON column
    // Handle both schemas: old (direct text column) and new (data column as JSONB)
    return {
      id: msgData.id || r.id,
      from: msgData.from || r.from,
      text: msgData.text || r.text || '',  // msgData.text for new schema, r.text for old schema
      time: msgData.time || r.time,
      timestamp: msgData.timestamp || r.timestamp || r.time,
      edited: msgData.edited || false,
      newText: msgData.newText || msgData.new_text || undefined,
      reactions: msgData.reactions || undefined,
      forwarded: msgData.forwarded || false,
      forwardedBy: msgData.forwardedBy || msgData.forwarded_by || undefined
    };
  }

  async function sendDMMessage(fromUsername, toUsername, text, opts) {
    fromUsername = norm(fromUsername);
    toUsername   = norm(toUsername);
    const key = _dmKey(fromUsername, toUsername);
    _cacheInvalidatePrefix('dm:' + key); // Clear DM cache for this conversation
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

    try {
      const { data, error } = await sb.from('dms').insert(row);
      if (error) {
        console.error('[DM Insert Error]', error.message, error.code);
        throw new Error(`DM insert failed: ${error.message} (${error.code})`);
      }
      console.debug('[DM Sent] Message inserted:', { from: fromUsername, to: toUsername, id: msg.id });
    } catch (e) {
      console.error('[sendDMMessage] Insert failed:', e.message);
      throw e;
    }

    // Update DM index for both users
    try {
      const [myIdx, theirIdx] = await Promise.all([
        _getDMIndex(fromUsername),
        _getDMIndex(toUsername),
      ]);

      const updateIdx = async (username, partner, current) => {
        const arr = Array.isArray(current) ? [...current] : [];
        const filtered = arr.filter(u => u !== partner);
        filtered.unshift(partner);
        const { error } = await sb.from('dm_index').upsert({ username, partners: filtered.slice(0, 30) }, { onConflict: 'username' });
        if (error) {
          console.warn('[DM Index Update Error]', error.message);
        }
      };
      await Promise.all([
        updateIdx(fromUsername, toUsername, myIdx),
        updateIdx(toUsername, fromUsername, theirIdx),
      ]);
    } catch (e) {
      console.warn('[DM Index Update] Failed but continuing:', e.message);
    }

    // Notify recipient
    try {
      await addNotification(toUsername, {
        type: 'dm', from: fromUsername,
        data: { preview: text.slice(0, 60) }
      });
    } catch (e) {
      console.warn('[DM Notification] Failed but continuing:', e.message);
    }

    return msg;
  }

  // ── Delete Messages ─────────────────────────────────
  async function editMessage(type, opts) {
    const editData = { text: opts.newText, edited: true };
    if (type === 'dm') {
      const key = _dmKey(opts.user1, opts.user2);
      _cacheInvalidatePrefix('dm:' + key);
      const { error } = await sb.from('dms').update(editData).eq('dm_key', key).eq('id', opts.messageId);
      if (error) console.error('[editMessage] DM edit failed:', error.message);
    } else if (type === 'gc') {
      _cacheInvalidatePrefix('gcm:' + opts.gcId);
      const { error } = await sb.from('group_chat_messages').update(editData).eq('gc_id', opts.gcId).eq('id', opts.messageId);
      if (error) console.error('[editMessage] GC edit failed:', error.message);
    } else if (type === 'bastion') {
      _cacheDel('bm:' + opts.bastionId + ':' + opts.channelId);
      const { error } = await sb.from('bastion_msgs').update(editData).eq('bastion_id', opts.bastionId).eq('channel_id', opts.channelId).eq('id', opts.messageId);
      if (error) console.error('[editMessage] Bastion edit failed:', error.message);
    }
  }

  async function deleteMessage(type, opts) {
    if (type === 'dm') {
      const key = _dmKey(opts.user1, opts.user2);
      _cacheInvalidatePrefix('dm:' + key);
      const { error } = await sb.from('dms').delete().eq('dm_key', key).eq('id', opts.messageId);
      if (error) throw new Error('Failed to delete DM: ' + error.message);
    } else if (type === 'gc') {
      _cacheInvalidatePrefix('gcm:' + opts.gcId);
      const { error } = await sb.from('group_chat_messages').delete().eq('gc_id', opts.gcId).eq('id', opts.messageId);
      if (error) throw new Error('Failed to delete GC message: ' + error.message);
    } else if (type === 'bastion') {
      _cacheDel('bm:' + opts.bastionId + ':' + opts.channelId);
      const { error } = await sb.from('bastion_msgs').delete().eq('bastion_id', opts.bastionId).eq('channel_id', opts.channelId).eq('id', opts.messageId);
      if (error) throw new Error('Failed to delete bastion message: ' + error.message);
    } else {
      throw new Error('Unknown message type: ' + type);
    }
  }

  async function _getDMIndex(username) {
    const cacheKey = 'dmIdx:' + norm(username);
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('dm_index').select('partners').eq('username', norm(username)).maybeSingle();
    const result = data?.partners || [];
    _cacheSet(cacheKey, result, _CACHE_TTL.dmIndex);
    return result;
  }

  async function getRecentDMPartners(username) {
    return _getDMIndex(norm(username));
  }

  // ── Bastion Messages ─────────────────────────────────
  async function getBastionChannelMessages(bastionId, channelId, limit, offset) {
    const _limit = limit || 100;
    const _offset = offset || 0;
    if (!_offset) {
      const cacheKey = 'bm:' + bastionId + ':' + channelId;
      const cached = _cacheGet(cacheKey);
      if (cached !== undefined) return cached;
    }
    const { data } = await sb.from('bastion_msgs')
      .select('id,from,text,time,timestamp,edited,reactions')
      .eq('bastion_id', bastionId)
      .eq('channel_id', channelId)
      .order('timestamp', { ascending: false })
      .range(_offset, _offset + _limit - 1);
    const result = (data || []).reverse().map(r => ({
      id: r.id, from: r.from, text: r.text, time: r.time,
      timestamp: r.timestamp, edited: r.edited || false,
      reactions: r.reactions || undefined,
    }));
    if (!_offset) _cacheSet('bm:' + bastionId + ':' + channelId, result, _CACHE_TTL.bastionMsgs);
    return result;
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
    try {
      const { data, error: err1 } = await sb.from('bastion_msgs')
        .select('reactions')
        .eq('bastion_id', bastionId)
        .eq('channel_id', channelId)
        .eq('id', msgId)
        .maybeSingle();

      if (err1) throw new Error(`Fetch reactions failed: ${err1.message}`);

      const reactions = data?.reactions || {};
      const arr = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
      const idx = arr.indexOf(username);
      if (idx !== -1) arr.splice(idx, 1);
      else arr.push(username);
      if (arr.length) reactions[emoji] = arr;
      else delete reactions[emoji];

      const { error: err2 } = await sb.from('bastion_msgs')
        .update({ reactions: Object.keys(reactions).length ? reactions : null })
        .eq('bastion_id', bastionId)
        .eq('channel_id', channelId)
        .eq('id', msgId);

      if (err2) throw new Error(`Update reactions failed: ${err2.message}`);
      console.debug('[addReaction] Reaction added:', { msgId, emoji, username });
    } catch(e) {
      console.error('[addReaction] Failed:', e.message);
    }
  }

  async function toggleReaction(msgId, emoji, context, username) {
    username = norm(username);
    try {
      let reactions = {};
      let updateSuccess = false;

      if (context === 'dm') {
        // DMs - find the message and toggle reaction
        const { data, error: err1 } = await sb.from('dms')
          .select('*')
          .eq('id', msgId)
          .maybeSingle();

        if (err1 || !data) throw new Error('Message not found');

        const msgData = typeof data.data === 'string' ? JSON.parse(data.data) : (data.data || {});
        reactions = msgData.reactions || {};
        const arr = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
        const idx = arr.indexOf(username);
        if (idx !== -1) arr.splice(idx, 1);
        else arr.push(username);
        if (arr.length) reactions[emoji] = arr;
        else delete reactions[emoji];

        msgData.reactions = Object.keys(reactions).length ? reactions : undefined;
        const { error: err2 } = await sb.from('dms')
          .update({ data: msgData })
          .eq('id', msgId);

        if (err2) throw new Error(`Update failed: ${err2.message}`);
        updateSuccess = true;
      } else if (context === 'gc') {
        // Group chats - find and update reaction
        const { data, error: err1 } = await sb.from('group_chat_messages')
          .select('reactions')
          .eq('id', msgId)
          .maybeSingle();

        if (err1 || !data) throw new Error('Message not found');

        reactions = data?.reactions || {};
        const arr = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
        const idx = arr.indexOf(username);
        if (idx !== -1) arr.splice(idx, 1);
        else arr.push(username);
        if (arr.length) reactions[emoji] = arr;
        else delete reactions[emoji];

        const { error: err2 } = await sb.from('group_chat_messages')
          .update({ reactions: Object.keys(reactions).length ? reactions : null })
          .eq('id', msgId);

        if (err2) throw new Error(`Update failed: ${err2.message}`);
        updateSuccess = true;
      } else if (context === 'ch') {
        // This is handled by addReaction, but return the reactions
        // The UI will call addReaction directly for bastions
        throw new Error('Use addReaction for bastion messages');
      }

      if (updateSuccess) {
        console.debug('[toggleReaction] Reaction toggled:', { msgId, emoji, username, users: reactions[emoji] || [] });
        return { users: reactions[emoji] || [] };
      }
    } catch(e) {
      console.error('[toggleReaction] Failed:', e.message);
      return null;
    }
  }

  // ── Global Bastions ──────────────────────────────────
  async function getGlobalBastions() {
    const cached = _cacheGetWithFallback('globalBastions', _CACHE_TTL.globalBastions);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('global_bastions').select('id,data');
    const result = {};
    (data || []).forEach(r => { result[r.id] = r.data; });
    _cacheSet('globalBastions', result, _CACHE_TTL.globalBastions);
    return result;
  }
  async function saveGlobalBastion(id, bdata) {
    _cacheDel('globalBastions');
    _cacheDel('gb:' + id);
    await sb.from('global_bastions').upsert({ id, data: bdata }, { onConflict: 'id' });
  }
  async function getGlobalBastion(id) {
    const cacheKey = 'gb:' + id;
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('global_bastions').select('data').eq('id', id).maybeSingle();
    const result = data?.data || null;
    _cacheSet(cacheKey, result, _CACHE_TTL.globalBastion);
    return result;
  }

  async function deleteGlobalBastion(id) {
    _cacheDel('globalBastions');
    _cacheDel('gb:' + id);
    await sb.from('global_bastions').delete().eq('id', id);
    // Also clean up bastion members
    try { await sb.from('bastion_members').delete().eq('bastion_id', id); } catch(e) {}
  }

  function clearBastionCache() {
    _cacheDel('globalBastions');
  }

  // ── Bastion Members ──────────────────────────────────
  async function getBastionMembers(bastionId) {
    const cacheKey = 'bMembers:' + bastionId;
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('bastion_members').select('members').eq('bastion_id', bastionId).maybeSingle();
    const result = data?.members || [];
    _cacheSet(cacheKey, result, _CACHE_TTL.bastionMembers);
    return result;
  }
  async function addBastionMember(bastionId, username) {
    _cacheDel('bMembers:' + bastionId);
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
    const cacheKey = 'inv:' + code;
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('invites').select('data').eq('code', code).maybeSingle();
    const result = data?.data || null;
    _cacheSet(cacheKey, result, 120000);
    return result;
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
        transports: ['polling', 'websocket'], // Start with polling (works through Cloudflare), upgrade to WS
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
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
        // Notify app that socket is ready — triggers presence refresh
        if (_socketCallbacks.onConnected) setTimeout(function() { _socketCallbacks.onConnected(); }, 500);
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
        // Supabase real-time now handles messages directly from DB
        // Socket.IO message:new is kept as fallback only
        console.debug('[Socket.IO] Received message:new (fallback):', data.room);
        if (_socketCallbacks.onMessage) _socketCallbacks.onMessage(data.room, data.message);
      });
      _socket.on('typing:update', function(data) {
        if (_socketCallbacks.onTyping) _socketCallbacks.onTyping(data.room, data.users);
      });
      _socket.on('presence:update', function(data) {
        if (_socketCallbacks.onStatusChange) _socketCallbacks.onStatusChange({ username: data.username, status: data.status, gameActivity: data.gameActivity || null, activityState: data.activityState || null });
      });
      _socket.on('activity:changed', function(data) {
        if (_socketCallbacks.onActivityChange) _socketCallbacks.onActivityChange({ username: data.username, activityState: data.activityState || null, gameActivity: data.gameActivity || null });
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

  // Client-side rate limiting for Socket.IO events
  var _emitLastTime = {};
  var _emitCooldowns = { 'status:set': 2000, 'typing:start': 1000, 'typing:stop': 1000, 'activity:set': 3000, 'activity:update': 3000 };
  function socketEmit(event, data) {
    try {
      if (!_socket || !_socketReady) return false;
      var cooldown = _emitCooldowns[event];
      if (cooldown) {
        var now = Date.now();
        if (_emitLastTime[event] && now - _emitLastTime[event] < cooldown) return false;
        _emitLastTime[event] = now;
      }
      _socket.emit(event, data);
      return true;
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

  async function queryPresence(usernames) {
    if (!usernames || !usernames.length) return {};
    // Primary: query Supabase statuses table directly (always works)
    try {
      const { data } = await sb.from('statuses').select('username,status').in('username', usernames.map(u => norm(u)));
      if (data && data.length) {
        const result = {};
        usernames.forEach(u => { result[u] = { status: 'offline', gameActivity: null }; });
        data.forEach(row => { if (row.username && row.status) result[row.username] = { status: row.status, gameActivity: null }; });
        return result;
      }
    } catch(e) { /* fall through to Socket.IO */ }
    // Fallback: Socket.IO query (may not work through Cloudflare)
    return new Promise(function(resolve) {
      if (_socket && _socketReady) {
        _socket.emit('presence:query', usernames, resolve);
        setTimeout(function() { resolve(null); }, 2000);
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

  // Tab-visibility gate: when the tab is hidden, skip polling bodies
  // entirely. Socket.io still delivers pushes if/when it reconnects, but
  // we don't burn Supabase egress on a background tab.
  function _tabHidden() {
    try { return typeof document !== 'undefined' && document.hidden === true; } catch(_) { return false; }
  }

  let _dmPollingIntervals = new Map(); // Track polling intervals per DM conversation
  let _lastDmTimestamp = new Map(); // Track last seen message timestamp per conversation

  async function startDMPolling(dmKey) {
    if (_dmPollingIntervals.has(dmKey)) return;

    const pollInterval = setInterval(async () => {
      if (_tabHidden()) return;
      try {
        const { data, error } = await sb.from('dms')
          .select('id,from,text,time,timestamp,edited,reactions')
          .eq('dm_key', dmKey)
          .order('timestamp', { ascending: false })
          .limit(3);

        if (error || !data) return;

        const room = 'dm:' + dmKey;
        const cb = _socketCallbacks.onMessage || _callbacks.onMessage;
        const editCb = _socketCallbacks.onMessageEdited;
        const deleteCb = _socketCallbacks.onMessageDeleted;
        for (const row of data.reverse()) {
          const msgTime = new Date(row.timestamp).getTime();
          const lastTime = _lastDmTimestamp.get(dmKey) || 0;
          if (msgTime > lastTime) {
            if (cb) cb(room, { id: row.id, from: row.from, text: row.text, time: row.time, timestamp: row.timestamp, edited: row.edited, reactions: row.reactions });
          }
          const prevText = _lastMsgTexts.get(row.id);
          if (prevText !== undefined && prevText !== row.text && editCb) {
            editCb({ messageId: row.id, newText: row.text, editedBy: row.from });
          }
          _lastMsgTexts.set(row.id, row.text);
        }
        const currentIds = new Set(data.map(r => r.id));
        const prevIds = _lastPollIds.get('dm:'+dmKey);
        if (prevIds && deleteCb) {
          prevIds.forEach(id => { if (!currentIds.has(id)) deleteCb({ messageId: id, deletedBy: '' }); });
        }
        _lastPollIds.set('dm:'+dmKey, currentIds);
        if (data.length > 0) _lastDmTimestamp.set(dmKey, new Date(data[data.length-1].timestamp).getTime());
      } catch(e) { /* silently skip */ }
    }, 4000); // Poll every 4s (reduced from 1.5s to cut Supabase egress; socket.io handles live delivery)

    _dmPollingIntervals.set(dmKey, pollInterval);
  }

  function stopDMPolling(dmKey) {
    const interval = _dmPollingIntervals.get(dmKey);
    if (interval) {
      clearInterval(interval);
      _dmPollingIntervals.delete(dmKey);
      _lastDmTimestamp.delete(dmKey);
      console.log('[DMPolling] Stopped polling for:', dmKey);
    }
  }

  // ── Channel polling (for bastion channels) ──
  let _channelPollingIntervals = new Map();
  let _lastChannelTimestamp = new Map();
  let _lastPollIds = new Map(); // channelKey -> Set of message IDs from last poll
  let _lastMsgTexts = new Map(); // msgId -> last known text (for edit detection)

  async function startChannelPolling(channelKey) {
    if (_channelPollingIntervals.has(channelKey)) return;
    // channelKey format: 'bastion:BASTION_ID:CHANNEL_NAME'
    const parts = channelKey.replace(/^bastion:/, '').split(':');
    const bastionId = parts[0] || '';
    const channelId = parts[1] || '';
    if (!bastionId || !channelId) return;

    const pollInterval = setInterval(async () => {
      if (_tabHidden()) return;
      try {
        const { data, error } = await sb.from('bastion_msgs')
          .select('id,from,text,time,timestamp,edited,reactions')
          .eq('bastion_id', bastionId)
          .eq('channel_id', channelId)
          .order('timestamp', { ascending: false })
          .limit(3);

        if (error) return; // silently skip on error

        if (data) {
          const room = 'bastion:' + bastionId + ':' + channelId;
          const cb = _socketCallbacks.onMessage || _callbacks.onMessage;
          const editCb = _socketCallbacks.onMessageEdited;
          const deleteCb = _socketCallbacks.onMessageDeleted;
          // Detect new messages
          for (const row of (data || []).reverse()) {
            const msgTime = new Date(row.timestamp).getTime();
            const lastTime = _lastChannelTimestamp.get(channelKey) || 0;
            if (msgTime > lastTime) {
              if (cb) cb(room, { id: row.id, from: row.from, text: row.text, time: row.time, timestamp: row.timestamp, edited: row.edited, reactions: row.reactions });
            }
            // Detect edits (text changed for existing messages)
            const prevText = _lastMsgTexts.get(row.id);
            if (prevText !== undefined && prevText !== row.text && editCb) {
              editCb({ messageId: row.id, newText: row.text, editedBy: row.from });
            }
            _lastMsgTexts.set(row.id, row.text);
          }
          // Detect deletes (messages that were in prev poll but not in this one)
          const currentIds = new Set((data||[]).map(r => r.id));
          const prevIds = _lastPollIds.get(channelKey);
          if (prevIds && deleteCb) {
            prevIds.forEach(id => { if (!currentIds.has(id)) deleteCb({ messageId: id, deletedBy: '' }); });
          }
          _lastPollIds.set(channelKey, currentIds);
          if (data.length > 0) _lastChannelTimestamp.set(channelKey, new Date(data[data.length-1].timestamp).getTime());
        }
      } catch (err) { /* silently skip */ }
    }, 4000); // Poll every 4s (reduced from 1.5s to cut Supabase egress; socket.io handles live delivery)

    _channelPollingIntervals.set(channelKey, pollInterval);
  }

  function stopChannelPolling(channelKey) {
    const interval = _channelPollingIntervals.get(channelKey);
    if (interval) {
      clearInterval(interval);
      _channelPollingIntervals.delete(channelKey);
      _lastChannelTimestamp.delete(channelKey);
      console.log('[ChannelPolling] Stopped polling for:', channelKey);
    }
  }

  // ── Friend Request Polling ──
  let _friendRequestPollingInterval = null;
  let _lastFriendRequestState = { sent: 0, received: 0 };

  async function startFriendRequestPolling(username) {
    if (_friendRequestPollingInterval) {
      console.log('[FriendRequestPolling] Already polling');
      return;
    }

    username = norm(username);
    console.log('[FriendRequestPolling] ✓ Starting polling for:', username);

    _friendRequestPollingInterval = setInterval(async () => {
      if (_tabHidden()) return;
      try {
        const { data, error } = await sb.from('users')
          .select('friend_requests_sent,friend_requests_received')
          .eq('username', username)
          .maybeSingle();

        if (error) {
          console.error('[FriendRequestPolling] Query error:', error.message);
          return;
        }

        if (data) {
          const sent = (data.friend_requests_sent || []).length;
          const received = (data.friend_requests_received || []).length;

          if (sent !== _lastFriendRequestState.sent || received !== _lastFriendRequestState.received) {
            console.log('[FriendRequestPolling] 🔔 FRIEND REQUEST CHANGE:', { sent, received });
            _lastFriendRequestState = { sent, received };
            if (_callbacks.onFriendRequestsUpdate) {
              _callbacks.onFriendRequestsUpdate({
                sent: data.friend_requests_sent || [],
                received: data.friend_requests_received || []
              });
            }
          }
        }
      } catch (e) {
        console.error('[FriendRequestPolling] Error:', e?.message);
      }
    }, 15000); // Poll every 15s (reduced from 4s to cut egress; socket events handle real-time)
  }

  function stopFriendRequestPolling() {
    if (_friendRequestPollingInterval) {
      clearInterval(_friendRequestPollingInterval);
      _friendRequestPollingInterval = null;
      console.log('[FriendRequestPolling] Stopped');
    }
  }

  // ── Voice Room Polling ──
  let _voiceRoomPollingInterval = null;
  let _lastVoiceRoomState = new Map();

  async function startVoiceRoomPolling(username) {
    if (_voiceRoomPollingInterval) {
      console.log('[VoiceRoomPolling] Already polling');
      return;
    }

    username = norm(username);
    console.log('[VoiceRoomPolling] ✓ Starting polling for:', username);

    _voiceRoomPollingInterval = setInterval(async () => {
      if (_tabHidden()) return;
      try {
        // Get user's bastion list
        const { data: userData, error: userErr } = await sb.from('users')
          .select('bastions')
          .eq('username', username)
          .maybeSingle();

        if (userErr || !userData || !userData.bastions) {
          return;
        }

        const bastions = userData.bastions;

        // Check each bastion for voice room changes
        for (const bastionId of bastions) {
          const { data: bastionData, error: bastionErr } = await sb.from('global_bastions')
            .select('voice_channels')
            .eq('id', bastionId)
            .maybeSingle();

          if (bastionErr || !bastionData || !bastionData.voice_channels) {
            continue;
          }

          const voiceChannels = bastionData.voice_channels;
          for (const channelName in voiceChannels) {
            const channel = voiceChannels[channelName];
            const participants = channel.participants || [];
            const key = bastionId + ':' + channelName;
            const lastState = _lastVoiceRoomState.get(key);
            const lastParticipants = lastState ? lastState.participants : [];

            // Compare participant lists (as sorted JSON string)
            const currentStr = JSON.stringify(participants.sort());
            const lastStr = JSON.stringify(lastParticipants.sort());

            if (currentStr !== lastStr) {
              console.log('[VoiceRoomPolling] 🔔 VOICE ROOM CHANGE:', { bastionId, channelName, participants });
              _lastVoiceRoomState.set(key, { participants });
              if (_callbacks.onVoiceRoomUpdate) {
                _callbacks.onVoiceRoomUpdate({
                  bastionId,
                  channelName,
                  participants
                });
              }
            } else if (!lastState) {
              // Initialize state tracking
              _lastVoiceRoomState.set(key, { participants });
            }
          }
        }
      } catch (e) {
        console.error('[VoiceRoomPolling] Error:', e?.message);
      }
    }, 12000); // Poll every 12s (reduced from 4s to cut egress; voice events push via socket)
  }

  function stopVoiceRoomPolling() {
    if (_voiceRoomPollingInterval) {
      clearInterval(_voiceRoomPollingInterval);
      _voiceRoomPollingInterval = null;
      console.log('[VoiceRoomPolling] Stopped');
    }
  }

  function startSupabasePolling(username, callbacks) {
    _callbacks = callbacks || {};
    stopSupabasePolling();

    // Start friend request polling
    startFriendRequestPolling(username);
    // Start voice room polling
    startVoiceRoomPolling(username);

    console.log('[Fortized] Supabase real-time initialized (using active polling for instant delivery)');
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
    _subscriptions.forEach(channel => {
      try {
        sb.removeChannel(channel);
      } catch (e) {
        console.warn('[Fortized] Failed to remove channel:', e?.message);
      }
    });
    _subscriptions = [];
    // Stop all polling intervals
    stopFriendRequestPolling();
    stopVoiceRoomPolling();
    // Stop DM + channel polling too — otherwise they keep burning egress
    // after logout / session teardown.
    _dmPollingIntervals.forEach((interval) => { try { clearInterval(interval); } catch(_){} });
    _dmPollingIntervals.clear();
    _lastDmTimestamp.clear();
    _channelPollingIntervals.forEach((interval) => { try { clearInterval(interval); } catch(_){} });
    _channelPollingIntervals.clear();
    _lastChannelTimestamp.clear();
    console.log('[Fortized] Supabase real-time subscriptions stopped');
  }

  // ── EGRESS EMERGENCY: Supabase real-time subscriptions replaced with Socket.io ──
  // These functions still join Socket.io rooms for real-time updates,
  // but no longer create Supabase postgres_changes subscriptions.
  function listenBastionChannel(bastionId, channelId, callback) {
    joinRoom('bastion', bastionId, channelId);
    // Socket.io 'message:new', 'message:edited', 'message:deleted' events
    // handle real-time bastion messages — no Supabase subscription needed
    return () => {
      leaveRoom('bastion', bastionId, channelId);
    };
  }

  function listenDM(user1, user2, callback) {
    joinRoom('dm', norm(user1), norm(user2));
    // Socket.io 'message:new', 'message:edited', 'message:deleted' events
    // handle real-time DM messages — no Supabase subscription needed
    return () => {
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
    const cached = _cacheGetWithFallback('globalSettings', _CACHE_TTL.globalSettings);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('admin_global_settings').select('data').eq('id', 1).maybeSingle();
    const result = data?.data || {};
    _cacheSet('globalSettings', result, _CACHE_TTL.globalSettings);
    return result;
  }

  // ── Admin CRUD helpers (Supabase-native) ────────────
  // These replace the old Firebase admin/* paths.
  // Uses a generic 'admin_kv' table with {key TEXT PK, data JSONB}
  // and the existing 'reports' table and 'users' table columns.

  async function _adminKVGet(key) {
    const cacheKey = 'akv:' + key;
    const cached = _cacheGetWithFallback(cacheKey, _CACHE_TTL.adminKV);
    if (cached !== undefined) return cached;
    const { data } = await sb.from('admin_kv').select('data').eq('key', key).maybeSingle();
    const result = data?.data ?? null;
    _cacheSet(cacheKey, result, _CACHE_TTL.adminKV);
    return result;
  }
  async function _adminKVSet(key, val) {
    _cacheDel('akv:' + key);
    await sb.from('admin_kv').upsert({ key, data: val }, { onConflict: 'key' });
  }

  // -- Reports --
  async function adminGetReports() {
    const cached = _cacheGet('reports');
    if (cached !== undefined) return cached;
    const { data } = await sb.from('reports').select('id,data').limit(200);
    const result = (data || []).map(r => r.data || r);
    _cacheSet('reports', result, _CACHE_TTL.reports);
    return result;
  }
  async function adminSaveReport(report) {
    if (!report?.id) return;
    _cacheDel('reports');
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
    _cacheDel('globalSettings');
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
  async function adminGetFeedback() {
    return (await _adminKVGet('feedback')) || [];
  }
  async function adminPushFeedback(entry) {
    _cacheDel('akv:feedback');
    const list = (await _adminKVGet('feedback')) || [];
    list.push(entry);
    await _adminKVSet('feedback', list.slice(-200));
  }

  // Invalidate all admin-related caches so next fetch hits Supabase directly
  function adminInvalidateCache() {
    _cacheDel('reports');
    _cacheDel('akv:bans');
    _cacheDel('akv:staff');
    _cacheDel('akv:audit_log');
    _cacheDel('akv:nsfw_queue');
    _cacheDel('akv:nsfw_banned_hashes');
    _cacheDel('akv:support_tickets');
    _cacheDel('akv:scheduled_actions');
    _cacheDel('akv:feedback');
    _cacheDel('globalSettings');
  }

  // ── File Storage (Supabase Storage CDN) ─────────────
  async function uploadFile(fileName, fileBlob) {
    const bucket = 'attachments';
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6) + '_' + safeName;
    try {
      const { data, error } = await sb.storage.from(bucket).upload(path, fileBlob, { upsert: false });
      if (error) {
        console.warn('[Storage] Upload failed:', error.message);
        return { error: error.message };
      }
      const { data: pubUrl } = sb.storage.from(bucket).getPublicUrl(path);
      return { path, url: pubUrl.publicUrl };
    } catch (e) {
      console.warn('[Storage] Upload exception:', e.message);
      return { error: e.message };
    }
  }

  // ── Ads API ──────────────────────────────────────────
  async function getGlobalAds() {
    try {
      const { data } = await sb.from('global_ads').select('*').eq('status', 'active');
      return (data||[]).map(r => {
        try { return typeof r.data === 'string' ? JSON.parse(r.data) : r.data; } catch { return r; }
      }).filter(a => a && new Date(a.expiresAt) > new Date());
    } catch(e) { console.warn('[Ads] getGlobalAds failed:', e?.message); return []; }
  }
  async function getTakenDownAdIds() {
    try {
      const { data } = await sb.from('global_ads').select('id').in('status', ['taken_down','cancelled']);
      return new Set((data||[]).map(r => r.id));
    } catch(e) { return new Set(); }
  }
  async function upsertGlobalAd(ad) {
    if (!ad?.id) return;
    try {
      await sb.from('global_ads').upsert({ id: ad.id, owner: ad.owner, status: ad.status, data: JSON.stringify(ad) }, { onConflict: 'id' });
    } catch(e) { console.warn('[Ads] upsertGlobalAd failed:', e?.message); }
  }
  async function removeGlobalAd(adId) {
    if (!adId) return;
    try { await sb.from('global_ads').delete().eq('id', adId); } catch(e) { console.warn('[Ads] removeGlobalAd failed:', e?.message); }
  }

  // ── Announcements API ──────────────────────────────────
  async function getAnnouncements() {
    return (await _adminKVGet('announcements')) || [];
  }
  async function saveAnnouncements(list) {
    await _adminKVSet('announcements', list);
  }

  // ── Forum API ──────────────────────────────────────
  async function getForumThreads(category, limit, offset) {
    try {
      let q = sb.from('forum_threads').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false });
      if (category && category !== 'all') q = q.eq('category', category);
      if (limit) q = q.limit(limit);
      if (offset) q = q.range(offset, offset + (limit || 20) - 1);
      const { data } = await q;
      return data || [];
    } catch(e) { console.warn('[Forum] getForumThreads failed:', e?.message); return []; }
  }
  async function getForumThread(threadId) {
    try {
      const { data } = await sb.from('forum_threads').select('*').eq('id', threadId).maybeSingle();
      return data || null;
    } catch(e) { console.warn('[Forum] getForumThread failed:', e?.message); return null; }
  }
  async function createForumThread(thread) {
    try {
      const { data, error } = await sb.from('forum_threads').insert(thread);
      if (error) throw error;
      return data;
    } catch(e) { console.warn('[Forum] createForumThread failed:', e?.message); return null; }
  }
  async function updateForumThread(threadId, updates) {
    try {
      const { error } = await sb.from('forum_threads').update(updates).eq('id', threadId);
      if (error) {
        const msg = (error.message || '') + '';
        const m = msg.match(/column\s+"?(\w+)"?\s+of\s+relation|Could not find the '(\w+)' column/i);
        const unknown = m && (m[1] || m[2]);
        if (unknown && (unknown in updates)) {
          const retry = { ...updates }; delete retry[unknown];
          console.warn('[Forum] updateForumThread: column "' + unknown + '" missing, retrying without it. Run supabase-schema.sql to enable.');
          const r = await sb.from('forum_threads').update(retry).eq('id', threadId);
          if (r.error) throw r.error;
        } else { throw error; }
      }
    } catch(e) { console.warn('[Forum] updateForumThread failed:', e?.message); throw e; }
  }
  async function deleteForumThread(threadId) {
    try {
      await sb.from('forum_threads').delete().eq('id', threadId);
    } catch(e) { console.warn('[Forum] deleteForumThread failed:', e?.message); }
  }
  async function getForumPosts(threadId) {
    try {
      const { data } = await sb.from('forum_posts').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
      return data || [];
    } catch(e) { console.warn('[Forum] getForumPosts failed:', e?.message); return []; }
  }
  async function createForumPost(post) {
    try {
      const { data, error } = await sb.from('forum_posts').insert(post);
      if (error) throw error;
      return data;
    } catch(e) { console.warn('[Forum] createForumPost failed:', e?.message); return null; }
  }
  async function updateForumPost(postId, updates) {
    try {
      const { error } = await sb.from('forum_posts').update(updates).eq('id', postId);
      if (error) {
        const msg = (error.message || '') + '';
        const m = msg.match(/column\s+"?(\w+)"?\s+of\s+relation|Could not find the '(\w+)' column/i);
        const unknown = m && (m[1] || m[2]);
        if (unknown && (unknown in updates)) {
          const retry = { ...updates }; delete retry[unknown];
          console.warn('[Forum] updateForumPost: column "' + unknown + '" missing, retrying without it. Run supabase-schema.sql to enable.');
          const r = await sb.from('forum_posts').update(retry).eq('id', postId);
          if (r.error) throw r.error;
        } else { throw error; }
      }
    } catch(e) { console.warn('[Forum] updateForumPost failed:', e?.message); throw e; }
  }
  async function deleteForumPost(postId) {
    try {
      await sb.from('forum_posts').delete().eq('id', postId);
    } catch(e) { console.warn('[Forum] deleteForumPost failed:', e?.message); }
  }
  async function searchForumThreads(query) {
    try {
      const { data } = await sb.from('forum_threads').select('*').ilike('title', '%' + query + '%').order('updated_at', { ascending: false }).limit(30);
      return data || [];
    } catch(e) { console.warn('[Forum] search failed:', e?.message); return []; }
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
      const cached = _cacheGet('allUsersMap');
      if (cached !== undefined) return cached;
      const { data } = await sb.from('users').select(_USER_LIST_COLS);
      const result = {};
      (data || []).forEach(r => { const u = _userFromRow(r); result[u.username] = u; });
      _cacheSet('allUsersMap', result, _CACHE_TTL.user);
      return result;
    },
    getUsersByNames,
    getUserByName, saveUserObject, invalidateUserCache,
    getStatus, setStatus,
    getNotifications, addNotification, markNotificationsRead, markNotificationReadBySource, getUnreadCount,
    sendFriendRequest, acceptFriendRequest, acceptFriend, declineFriendRequest, removeFriend,
    getDMMessages, sendDMMessage, editMessage, deleteMessage, getRecentDMPartners,
    getBastionChannelMessages, sendBastionChannelMessage, addReaction, toggleReaction,
    getGlobalBastions, saveGlobalBastion, getGlobalBastion, deleteGlobalBastion, clearBastionCache,
    getGlobalAds, upsertGlobalAd, removeGlobalAd, getTakenDownAdIds,
    getAnnouncements, saveAnnouncements,
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
    adminGetFeedback, adminPushFeedback,
    adminInvalidateCache,
    getForumThreads, getForumThread, createForumThread, updateForumThread, deleteForumThread,
    getForumPosts, createForumPost, updateForumPost, deleteForumPost, searchForumThreads,
    uploadFile,
    startPolling, stopPolling, listenBastionChannel, listenDM,
    startDMPolling, stopDMPolling, startChannelPolling, stopChannelPolling,
    startFriendRequestPolling, stopFriendRequestPolling, startVoiceRoomPolling, stopVoiceRoomPolling,
    initSocket, getSocket, isSocketReady, socketEmit,
    joinRoom, leaveRoom, queryPresence, disconnectSocket,
    playNotificationSound,
  };

})();
