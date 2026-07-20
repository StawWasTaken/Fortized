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
    user: 30000,            // 30 s — user profiles. Profile surfaces
                            // (mini popover / DM panel / profile card)
                            // pass {noCache:true} for guaranteed-fresh
                            // reads anyway; this TTL just bounds how
                            // long any other cached lookup (memberlist,
                            // avatar refresh, etc.) can stay stale
                            // before naturally aging out — was 5 min,
                            // which was the "user A still sees the
                            // elephant" bug.
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

  function _cacheDel(key) {
    delete _cache[key];
    // Also evict from localStorage — _cacheSet persists certain keys
    // there as an offline fallback (see the persistence branch above),
    // and without this matching delete the stale copy survives a save
    // and gets served back to the next getUserByName via
    // _cacheGetWithFallback. That's the "I cleared my decoration and
    // it came back after refresh" bug — the DB was actually written
    // correctly, but the page load read the cached row instead of
    // hitting the DB at all.
    try { localStorage.removeItem('ftz_cache_' + key); } catch {}
  }

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
  // NOTE (egress): `banner` is deliberately EXCLUDED here. It is the single
  // heaviest column (a custom banner is a multi-MB data URL, animated-GIF
  // banners more) and it is NEVER rendered in a list/suggestion/search
  // context — only on the full profile card, which fetches the complete row
  // (`getUserByName(name, {noCache:true})`, cols '*') on demand. Pulling it
  // in every bulk read (getUsers over the WHOLE table, getUsersByNames for
  // memberlists/DM partners) was a primary driver of the Supabase egress
  // blowout. Keep large media OUT of bulk column sets.
  const _USER_LIST_COLS = 'username,display_name,pfp,status,onyx,custom_status,bio,badges,radiance_until,radiance_plus,active_decoration,profile_theme,game_activity,last_seen,created_at,raw';
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
    // Retry once on a backend ERROR (over-plan connection/egress limit —
    // the transient "demand exceeded" that made boot right after login
    // fail until a manual refresh). A genuine miss (data null, no error)
    // is NOT retried — that's just "no such user".
    let data = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 350));
      const res = await sb.from('users').select(cols).eq('username', norm(username)).maybeSingle();
      data = res.data;
      if (!res.error) break;
      console.warn('[getUserByName] query error (attempt ' + (attempt + 1) + '):', res.error.message);
    }
    // Full rows become the delta-write baseline for this user.
    if (data && cols === '*') _rememberRow(data);
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


  function _isPublicUserId(v) { return /^ftz-u\d+$/.test(String(v || '')); }
  function _isPublicBastionId(v) { return /^ftz-b\d+$/.test(String(v || '')); }
  async function _nextPublicId(kind) {
    const k = kind === 'bastion' || kind === 'b' ? 'b' : 'u';
    try {
      const { data, error } = await sb.rpc('ftz_next_id', { p_type: k === 'u' ? 'user' : 'bastion' });
      if (!error && typeof data === 'number') return `ftz-${k}${data}`;
      if (!error && typeof data === 'string' && /^\d+$/.test(data)) return `ftz-${k}${data}`;
      if (error) console.warn('[ID] ftz_next_id RPC error:', error.message);
    } catch(e) { console.warn('[ID] ftz_next_id RPC failed:', e?.message); }
    return `ftz-${k}${Date.now()}${Math.floor(Math.random()*10000)}`;
  }
  async function ensureUserPublicId(username) {
    const u = await getUserByName(username, { noCache: true });
    if (!u) return norm(username);
    if (_isPublicUserId(u.id)) return u.id;
    u.id = await _nextPublicId('user');
    await saveUserObject(u);
    return u.id;
  }
  async function getUserByPublicId(publicId) {
    publicId = String(publicId || '').toLowerCase();
    if (!_isPublicUserId(publicId)) return null;
    const { data } = await sb.from('users').select('*').contains('raw', { id: publicId }).maybeSingle();
    if (data) _rememberRow(data);
    return data ? _userFromRow(data) : null;
  }
  async function resolveUsername(identifier) {
    const id = String(identifier || '').toLowerCase();
    if (!id) return '';
    if (_isPublicUserId(id)) {
      const u = await getUserByPublicId(id);
      return u?.username || '';
    }
    return norm(id);
  }
  async function getUserPublicId(username) { return ensureUserPublicId(username); }
  async function getDMKey(user1, user2) {
    const [id1, id2] = await Promise.all([ensureUserPublicId(user1), ensureUserPublicId(user2)]);
    return [id1, id2].sort().join('__');
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
    // Merge any extra fields stored in raw JSONB. IMPORTANT: strip the
    // known-column keys from `extra` before spreading. Legacy rows can
    // carry stale pfp/banner/bio/etc inside `raw` from a past write
    // that mis-stored them there; spreading raw at the end would let
    // those stale values overwrite the fresh column values on every
    // read, which is what surfaced as "loads an older version of my
    // avatar / banner / about-me" on refresh. Column value ALWAYS
    // wins for known fields.
    const rawSrc = r.raw || {};
    const STALE_KEYS = new Set([
      'id','username','password','email','displayName','pfp','banner',
      'onyx','status','customStatus','friends','friendRequestsSent',
      'friendRequestsReceived','bastions','notifications','radianceUntil',
      'radiancePlus','lastDaily','blockedUsers','ignoredUsers','groupChats',
      'suspension','suspendedUntil','activeWarning','gameActivity',
      'lastSeen','profileTheme','activeDecoration','bio','badges',
      'connections','banned','banReason','createdAt',
    ]);
    const extra = {};
    for (const k of Object.keys(rawSrc)) {
      if (!STALE_KEYS.has(k)) extra[k] = rawSrc[k];
    }
    return {
      id: rawSrc.id || null,
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
      radianceUntil: _bigintToISO(r.radiance_until) || (rawSrc.radianceUntil || null),
      radiancePlus: _bigintToISO(r.radiance_plus) || (rawSrc.radiancePlus || null),
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

  // ── Delta-write engine ───────────────────────────────
  // The single biggest source of data loss was whole-row upserts: any
  // stale or partially-hydrated in-memory user object rewrote EVERY
  // column, wiping whatever it didn't carry. saveUserObject now diffs
  // against the last full DB row seen this session and writes only the
  // columns that actually changed. Wipes become structurally impossible;
  // saves also get dramatically smaller (no more re-sending megabyte
  // data-URL avatars to update lastSeen).
  const _lastRowByUser = {}; // username -> last full DB row seen
  function _rememberRow(row) {
    if (row && row.username) _lastRowByUser[norm(row.username)] = row;
  }

  // Columns where an empty value arriving via a whole-object save is far
  // more likely a partially-hydrated CU than a deliberate clear. These
  // never go from non-empty to empty on the implicit path; deliberate
  // clears pass an explicit field list (saveUserObject(user,{fields}))
  // which bypasses this guard. Ephemeral/presence/moderation columns
  // (status, last_seen, game_activity, suspension…) are NOT listed —
  // they may empty freely, e.g. clearing suspension or game activity.
  const _EMPTY_GUARDED_COLS = new Set([
    'pfp', 'banner', 'bio', 'display_name', 'custom_status',
    'active_decoration', 'profile_theme', 'email', 'badges', 'connections',
    'friends', 'friend_requests_sent', 'friend_requests_received',
    'bastions', 'blocked_users', 'ignored_users', 'group_chats',
  ]);

  // Columns the implicit (whole-object) save path never writes at all —
  // the relationship engine below is their only writer. Explicit-field
  // saves may still target them (admin tooling).
  const _RELATIONSHIP_COLS = new Set([
    'friends', 'friend_requests_sent', 'friend_requests_received',
  ]);

  // App-level field name -> DB column, for explicit-field saves.
  // Anything not listed here lives inside the raw JSONB column.
  const _FIELD_TO_COL = {
    email: 'email', displayName: 'display_name', pfp: 'pfp', banner: 'banner',
    onyx: 'onyx', status: 'status', customStatus: 'custom_status',
    friends: 'friends', friendRequestsSent: 'friend_requests_sent',
    friendRequestsReceived: 'friend_requests_received', bastions: 'bastions',
    radianceUntil: 'radiance_until', radiancePlus: 'radiance_plus',
    lastDaily: 'last_daily', blockedUsers: 'blocked_users',
    ignoredUsers: 'ignored_users', groupChats: 'group_chats',
    suspension: 'suspension', suspendedUntil: 'suspended_until',
    activeWarning: 'active_warning', gameActivity: 'game_activity',
    lastSeen: 'last_seen', profileTheme: 'profile_theme',
    activeDecoration: 'active_decoration', bio: 'bio', badges: 'badges',
    connections: 'connections', banned: 'banned', banReason: 'ban_reason',
    password: 'password',
  };

  function _sameVal(a, b) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  function _isEmptier(nv, ev) {
    return nv == null
      || (Array.isArray(nv) && nv.length === 0 && Array.isArray(ev) && ev.length > 0)
      || (typeof nv === 'string' && nv === '' && typeof ev === 'string' && ev !== '')
      || (typeof nv === 'object' && !Array.isArray(nv) && nv && Object.keys(nv).length === 0 && ev && typeof ev === 'object' && Object.keys(ev).length > 0);
  }

  // ── AVATAR CORRUPTION GUARD (root fix for "avatar gets replaced by a
  // totally transparent image") ─────────────────────────────────────────
  // A fully-transparent pfp reaching the row is THE avatar bug: it renders
  // blank to EVERYONE and overwrites the user's real stored avatar. It can
  // ride in on ANY full-object save (voice save, init save, cross-device
  // echo) if CU.pfp got corrupted in memory — so we gate it here at the one
  // shared DB-write boundary instead of at ~30 call sites. Only drops the
  // pfp when it PROVABLY decodes to all-transparent; a decode failure is
  // inconclusive and never drops. Empty string ('' = "Remove avatar") is
  // not a data-URL and passes straight through.
  function _pfpProvablyTransparent(v) {
    return new Promise(resolve => {
      try {
        if (typeof v !== 'string' || !v.startsWith('data:image') || v.length < 64) return resolve(false);
        if (typeof document === 'undefined' || typeof Image === 'undefined') return resolve(false);
        const img = new Image();
        img.onload = () => {
          try {
            if (!img.naturalWidth || !img.naturalHeight) return resolve(true);
            const w = Math.min(img.naturalWidth, 32), h = Math.min(img.naturalHeight, 32);
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, w, h);
            const d = ctx.getImageData(0, 0, w, h).data;
            for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return resolve(false);
            resolve(true);
          } catch (_) { resolve(false); }
        };
        img.onerror = () => resolve(false); // inconclusive — never drop on a decode failure
        img.src = v;
      } catch (_) { resolve(false); }
    });
  }

  // ── User-media Storage offload (egress) ───────────────────────────────
  // Rollout gate: OFF by default. A browser opts in with
  //   localStorage.setItem('ftz_media_storage','1')
  // so it can be proven end-to-end on one account (upload avatar → Save →
  // confirm the row's pfp is now an https URL, the image renders, and it
  // survives a reload) before we flip the default on for everyone.
  const _MEDIA_BUCKET = 'attachments'; // reuse the already-public bucket uploadFile() uses
  function _mediaStorageEnabled() {
    try { return typeof localStorage !== 'undefined' && localStorage.getItem('ftz_media_storage') === '1'; }
    catch (_) { return false; }
  }
  // Upload one image data URL to Storage; return its public URL, or null on
  // ANY failure (caller then keeps the inline data URL — today's behaviour).
  async function _uploadUserMedia(username, kind, dataUrl) {
    try {
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
      if (!sb?.storage) return null;
      const blob = await (await fetch(dataUrl)).blob();
      // Content type + extension straight from the blob (webp for our crops).
      const ext = ((blob.type || 'image/webp').split('/')[1] || 'webp').split(';')[0];
      // Content-addressed-ish path: a fresh stamp each save gives an
      // immutable URL that changes when the image changes — perfect CDN
      // caching, and no stale-image problem from reusing one filename.
      const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const path = 'user-media/' + norm(username) + '/' + kind + '-' + stamp + '.' + ext;
      const { error } = await sb.storage.from(_MEDIA_BUCKET).upload(path, blob, { upsert: true, contentType: blob.type || 'image/webp' });
      if (error) { console.warn('[media] ' + kind + ' upload failed, keeping inline data URL:', error.message); return null; }
      const { data: pub } = sb.storage.from(_MEDIA_BUCKET).getPublicUrl(path);
      const url = pub && pub.publicUrl;
      if (url) console.info('[media] ' + kind + ' offloaded to Storage (' + blob.size + 'B → URL) for ' + username);
      return url || null;
    } catch (e) { console.warn('[media] ' + kind + ' upload exception, keeping inline data URL:', e?.message); return null; }
  }

  // A Supabase write that transiently fails at the network layer — a
  // NetworkError / "Failed to fetch", most often the project throttling us
  // over the egress quota — used to silently drop the write, which is why
  // saved avatars intermittently never persisted (confirmed from a live
  // [saveUserObject] UPDATE FAILED: … NetworkError). Retry those transient
  // failures a few times with backoff. Real errors (constraint, auth, HTTP
  // status) carry a code and are NOT retried.
  function _isTransientWriteErr(error) {
    if (!error) return false;
    if (error.code) return false; // Postgres/HTTP error → not a transient network drop
    const m = (error.message || '').toLowerCase();
    return m.includes('networkerror') || m.includes('failed to fetch') || m.includes('network request failed') || m.includes('load failed') || m.includes('fetch');
  }
  async function _usersWriteRetry(kind, changed, uname, tries) {
    tries = tries || 3;
    let last = null;
    for (let i = 0; i < tries; i++) {
      let error;
      if (kind === 'upsert') ({ error } = await sb.from('users').upsert(changed, { onConflict: 'username' }));
      else ({ error } = await sb.from('users').update(changed).eq('username', uname));
      if (!error) return { error: null, attempts: i + 1 };
      last = error;
      if (!_isTransientWriteErr(error) || i === tries - 1) break;
      console.warn('[saveUserObject] transient write failure (attempt ' + (i + 1) + '/' + tries + '), retrying:', error.message);
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, i))); // 0.5s, 1s, 2s
    }
    return { error: last, attempts: tries };
  }

  // saveUserObject(user)             — implicit: diff vs baseline, guarded
  // saveUserObject(user, {fields})   — explicit: write exactly these fields,
  //                                    empties included (how clears persist)
  async function saveUserObject(user, opts) {
    if (!user?.username) return;
    const uname = norm(user.username);
    _cacheDel('user:' + uname);
    _cacheDel('userEnf:' + uname);
    if (!_isPublicUserId(user.id)) user.id = await _nextPublicId('user');
    const desired = _userToRow(user);

    // Baseline = last full row seen this session; fetch once if we have
    // none. If the fetch ITSELF fails, abort: a blind write with no
    // baseline is exactly the stale-overwrite bug this path exists to kill.
    let base = _lastRowByUser[uname];
    if (!base) {
      const { data, error } = await sb.from('users').select('*').eq('username', uname).maybeSingle();
      if (error) {
        console.warn('[saveUserObject] baseline fetch failed, aborting write to avoid data loss:', error.message);
        throw new Error('Baseline fetch failed: ' + error.message);
      }
      if (data) { base = data; _rememberRow(data); }
    }

    if (!base) {
      // Row genuinely doesn't exist — brand-new user, full insert.
      if (await _pfpProvablyTransparent(desired.pfp)) {
        console.warn('[saveUserObject] BLOCKED transparent pfp on INSERT for ' + uname + ' — storing blank instead.');
        desired.pfp = '';
      }
      const { error } = await _usersWriteRetry('upsert', desired, uname);
      if (error) {
        console.error('[saveUserObject] INSERT FAILED:', error.message, error.code);
        throw new Error(`Upsert failed: ${error.message}`);
      }
      _rememberRow(desired);
    } else {
      const explicit = (Array.isArray(opts?.fields) && opts.fields.length) ? opts.fields : null;
      const changed = {};
      if (explicit) {
        let rawOut = null;
        for (const f of explicit) {
          const col = _FIELD_TO_COL[f];
          if (col === 'password') {
            // Never write a falsy password over a real one, even explicitly.
            if (typeof user.password === 'string' && user.password.length > 0) changed.password = user.password;
          } else if (col) {
            changed[col] = (desired[col] === undefined) ? null : desired[col];
          } else {
            // raw-resident field (pronouns, socials, pfpCrop, …). Merge
            // over the FRESHEST raw we can get so we don't resurrect
            // stale keys from an old baseline.
            if (!rawOut) {
              let freshRaw = base.raw;
              try {
                const { data: rr } = await sb.from('users').select('raw').eq('username', uname).maybeSingle();
                if (rr) freshRaw = rr.raw;
              } catch (_) {}
              rawOut = { ...(freshRaw || {}) };
            }
            if (user[f] === undefined) delete rawOut[f]; else rawOut[f] = user[f];
          }
        }
        if (rawOut) changed.raw = rawOut;
      } else {
        for (const col of Object.keys(desired)) {
          if (col === 'username' || col === 'created_at' || col === 'raw') continue;
          // Relationship columns are owned by the friend ops
          // (_setPairState) — they always write both users' rows
          // together. A whole-object save works from a single-user CU
          // snapshot that may predate the other side's action, so it is
          // NEVER authoritative for these; letting it write them is how
          // a just-accepted request used to get re-added by the sender.
          if (_RELATIONSHIP_COLS.has(col)) continue;
          const nv = desired[col], ev = base[col];
          if (_sameVal(nv, ev)) continue;
          if (col === 'password' && !nv) continue;
          if (_EMPTY_GUARDED_COLS.has(col) && _isEmptier(nv, ev)) continue;
          changed[col] = nv;
        }
        // raw JSONB: shallow-merge so extras a partial CU doesn't carry
        // survive; keys the CU does carry win (including empty values —
        // raw-resident fields clear normally on this path).
        const mergedRaw = { ...(base.raw || {}), ...(desired.raw || {}) };
        if (!_sameVal(mergedRaw, base.raw || {})) changed.raw = mergedRaw;
      }
      // created_at is immutable once set — the real join date always wins.
      if (!base.created_at && desired.created_at) changed.created_at = desired.created_at;

      // Keystone avatar guard: never let a fully-transparent pfp overwrite
      // the stored avatar. The stack pinpoints WHICH save carried the bad
      // value, turning a silent corruption into one loud, actionable line.
      if (typeof changed.pfp === 'string' && changed.pfp.length && await _pfpProvablyTransparent(changed.pfp)) {
        console.warn('[saveUserObject] BLOCKED transparent pfp for ' + uname
          + ' — keeping the previous avatar (' + changed.pfp.length + ' chars). Origin:\n'
          + ((new Error().stack || '').split('\n').slice(2, 7).join('\n')));
        delete changed.pfp;
      }
      // Corrupt/truncated guard: a real avatar data-URL is many KB. A
      // data:image under ~1.5k chars is a truncated fragment (the 500-char
      // JPEG/webp from the transparency bug). NEVER write it over the stored
      // avatar — that's how the corruption persisted in the row and got
      // re-broadcast. Drop it so the good stored value survives.
      if (typeof changed.pfp === 'string' && /^data:image\//i.test(changed.pfp) && changed.pfp.length < 1500) {
        console.warn('[saveUserObject] BLOCKED corrupt/truncated pfp for ' + uname
          + ' (' + changed.pfp.length + ' chars, head=' + changed.pfp.slice(0, 24) + ') — keeping the previous avatar. Origin:\n'
          + ((new Error().stack || '').split('\n').slice(2, 6).join('\n')));
        delete changed.pfp;
      }

      // ── EGRESS: offload heavy image data-URLs to Storage ──────────────
      // The pfp/banner columns holding multi-KB→multi-MB base64 data URLs
      // are the root of the egress blowout: every row read drags the bytes.
      // When enabled, upload the image to the (already-configured, public)
      // Storage bucket and store only its URL in the row — turning a ~13 KB
      // pfp / multi-MB banner column into a ~100-byte link. Runs AFTER the
      // transparency guard so a blank image is never uploaded. Fully
      // fail-safe: on ANY upload error we keep the inline data URL (today's
      // behaviour), so a missing bucket / quota hiccup can never block a
      // save. Opt-in per browser (localStorage ftz_media_storage='1') until
      // proven end-to-end, then flipped on for everyone. Mutating user.<col>
      // to the URL keeps the in-memory object, the self-echo, the broadcast
      // and the next delta-diff all consistent with the row (otherwise every
      // later save would see the data URL as "changed" and re-upload).
      if (_mediaStorageEnabled()) {
        for (const col of ['pfp', 'banner']) {
          if (typeof changed[col] === 'string' && changed[col].startsWith('data:')) {
            const _url = await _uploadUserMedia(uname, col, changed[col]);
            if (_url) { changed[col] = _url; try { user[col] = _url; } catch (_) {} }
          }
        }
      }

      if (Object.keys(changed).length === 0) {
        console.debug('[saveUserObject] no-op — nothing changed for', uname);
      } else {
        // Surface the exact bytes we're about to send so a "save didn't
        // stick" report carries the payload size (a multi-MB banner/pfp
        // riding along is the classic cause of a NetworkError throw).
        const _cols = Object.keys(changed);
        let _bytes = 0; try { _bytes = JSON.stringify(changed).length; } catch (_) {}
        try { if (typeof window !== 'undefined' && changed.pfp !== undefined) window._ftzAvatarTrace?.('3-db-write', changed.pfp, { note: 'exact bytes sent to users.update', cols: _cols.join(',') }); } catch (_) {}
        const { error, attempts } = await _usersWriteRetry('update', changed, uname);
        if (error) {
          const _msg = '[' + _cols.join(', ') + '] ' + _bytes + 'B — ' + error.message + ' (' + (error.code || 'no-code') + ') after ' + attempts + ' attempt(s)';
          console.error('[saveUserObject] UPDATE FAILED:', _msg);
          try { if (typeof window !== 'undefined') window._ftzLastDbError = _msg; } catch (_) {}
          throw new Error(`Update failed: ${error.message}`);
        }
        if (attempts > 1) console.info('[saveUserObject] write succeeded on attempt ' + attempts + ' for', uname);
        try { if (typeof window !== 'undefined') window._ftzLastDbError = null; } catch (_) {}
        _lastRowByUser[uname] = { ...base, ...changed };
        // console.info (not .debug) so the write trail is visible in a
        // default DevTools console — this line is the first thing to ask
        // for when someone reports a save that "didn't stick".
        console.info('[saveUserObject] ✓ wrote [' + Object.keys(changed).join(', ') + '] for', uname);
      }
    }
    // Broadcast so friends/DM partners/bastion-mates see displayName / pfp /
    // banner / bio / decoration / status changes without refreshing. Payload
    // is deliberately small; the receiver's onProfileUpdated hook patches
    // visible surfaces (fpp cards, message rows, DM sidebar).
    try {
      try { if (typeof window !== 'undefined' && user.pfp !== undefined) window._ftzAvatarTrace?.('3b-broadcast', user.pfp, { note: 'pfp value put on the wire to other clients' }); } catch (_) {}
      socketEmit('profile:update', {
        username: user.username,
        displayName: user.displayName,
        pfp: user.pfp,
        banner: user.banner,
        bio: user.bio,
        pronouns: user.pronouns,
        displayFont: user.displayFont,
        displayEffect: user.displayEffect,
        displayColor: user.displayColor,
        displayColor2: user.displayColor2,
        activeDecoration: user.activeDecoration,
      });
    } catch(_) {}
  }

  // ── Auth ─────────────────────────────────────────────
  const PROTECTED_NAMES = ['staw', 'fortized', 'joyster'];
  // Built-in bot accounts — reserved so no human can register a bot's name.
  // Keep in sync with MANUAL_BOTS in app.js. (Custom user-created bots will be
  // checked against their own registry once that ships.)
  const BOT_NAMES = ['fortized', 'joyster', 'fortizedsafety', 'fortgified'];

  function isProtectedUsername(name) {
    const clean = name.replace(/[^a-z]/g, '');
    if (BOT_NAMES.includes(clean)) return true;
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
      id: await _nextPublicId('user'),
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
      needsWelcome: true, // triggers the @fortized welcome DM on first boot
      createdAt: new Date().toISOString()
    };
    const row = _userToRow(user);
    await sb.from('users').insert(row);
    await sb.from('statuses').upsert({ username, status: 'online' }, { onConflict: 'username' });
    setCurrentUsername(username);
    return { ok: true, user };
  }

  async function login(identifier, password) {
    // Accept either username or email — most users instinctively type their
    // email, and forcing username-only was a major source of "User not found"
    // confusion. Try username lookup first (cheap, normalised), then fall
    // back to an email lookup when the identifier looks like an email.
    const raw = (identifier || '').trim();
    if (!raw) return { ok: false, msg: 'Please enter your username or email.' };
    const looksLikeEmail = raw.includes('@');

    // The account is over its Supabase plan, so a lookup query can
    // intermittently come back as an ERROR (connection/egress limit —
    // the "demand exceeded" the user sees) rather than a clean miss.
    // Distinguishing "genuinely no such user" from "transient backend
    // error" matters: the old code treated a thrown query as null →
    // "User not found" for correct credentials, and only a manual page
    // refresh (a fresh attempt after the limit cleared) got them in.
    // Look the user up with bounded retries, and — critically — surface
    // a "busy, try again" error instead of a false "not found" when
    // every attempt errored.
    async function _lookup() {
      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 400 * attempt));
        try {
          if (!looksLikeEmail) {
            const { data, error } = await sb.from('users').select('*').eq('username', norm(raw)).maybeSingle();
            if (error) { lastErr = error; continue; }
            if (data) _rememberRow(data);
            return { user: data ? _userFromRow(data) : null, errored: false };
          } else {
            const { data, error } = await sb.from('users').select('*').eq('email', raw.toLowerCase()).limit(1).maybeSingle();
            if (error) { lastErr = error; continue; }
            if (data) _rememberRow(data);
            return { user: data ? _userFromRow(data) : null, errored: false };
          }
        } catch (e) { lastErr = e; }
      }
      console.warn('[login] lookup errored on every attempt:', lastErr?.message);
      return { user: null, errored: true };
    }

    const { user, errored } = await _lookup();
    if (!user) {
      // Every attempt hit a backend error → don't lie with "not found";
      // tell the user it's the server so retrying (not re-checking their
      // password) is the obvious move.
      if (errored) return { ok: false, msg: 'The server is busy right now — please try again in a moment.', retry: true };
      return { ok: false, msg: looksLikeEmail ? 'No account found for that email.' : 'User not found.' };
    }
    if (user.password !== password) return { ok: false, msg: 'Wrong password.' };
    setCurrentUsername(user.username);
    // setStatus does a network round-trip to the statuses table + a
    // users.status update. A flake there used to fail the whole login
    // — but by this point the username is already persisted, so the
    // login was actually successful. Don't await + don't let it
    // bubble; let the app's normal presence loop handle it on next
    // load if it failed here.
    setStatus(user.username, 'online').catch(e => console.warn('[login] presence set failed (login still succeeded):', e?.message));
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
  async function getNotifications(username, opts) {
    const cacheKey = 'notifs:' + norm(username);
    if (!opts?.noCache) {
      const cached = _cacheGet(cacheKey);
      if (cached !== undefined) return cached;
    }
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
    _cacheDel('unreadSum:' + norm(toUsername));
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
    _cacheDel('unreadSum:' + username);
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
    _cacheDel('unreadSum:' + norm(username));
    let q = sb.from('notifications').update({ read: true }).eq('username', norm(username)).eq('read', false);
    if (type) q = q.eq('type', type);
    if (from) q = q.eq('from', norm(from));
    await q;
  }

  async function getUnreadCount(username, opts) {
    const cacheKey = 'unread:' + norm(username);
    if (!opts?.noCache) {
      const cached = _cacheGet(cacheKey);
      if (cached !== undefined) return cached;
    }
    const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('username', norm(username)).eq('read', false);
    const result = count || 0;
    _cacheSet(cacheKey, result, _CACHE_TTL.unreadCount);
    return result;
  }

  // Direct-mention notification: called by the app's send paths when a
  // message contains @usernames. Light checks only (existence + "did
  // they block the sender" via the 5-column relationship fetch), capped
  // by the caller. Never notifies the sender about themselves.
  async function notifyMention(fromUsername, toUsername, data) {
    const from = norm(fromUsername), to = norm(toUsername);
    if (!from || !to || from === to) return { ok: false };
    try {
      const target = await _fetchRelRow(to);
      if (!target) return { ok: false };                      // no such account
      if (_hasU(target.blockedUsers, from)) return { ok: false }; // they blocked the sender — stay silent
      await addNotification(to, { type: 'mention', from, data: data || {} });
      try { socketEmit('notification:new', { username: to, type: 'mention', from }); } catch (_) {}
      return { ok: true };
    } catch (_) { return { ok: false }; }
  }

  // Unread breakdown in ONE light query: total unread + how many are
  // "counted" (direct mentions AND friend requests). Drives the
  // Discord-style topbar badge — white dot = "something unread", white
  // 1-9+ = unread mentions/friend-requests.
  const _BADGE_COUNTED = new Set(['mention', 'friend_request']);
  async function getUnreadSummary(username, opts) {
    const cacheKey = 'unreadSum:' + norm(username);
    if (!opts?.noCache) {
      const cached = _cacheGet(cacheKey);
      if (cached !== undefined) return cached;
    }
    let result = { total: 0, mentions: 0, counted: 0 };
    try {
      const { data } = await sb.from('notifications').select('type')
        .eq('username', norm(username)).eq('read', false).limit(100);
      const rows = data || [];
      const counted = rows.filter(r => _BADGE_COUNTED.has(r.type)).length;
      result = { total: rows.length, mentions: counted, counted };
    } catch (_) {}
    _cacheSet(cacheKey, result, _CACHE_TTL.unreadCount);
    return result;
  }

  // Read back a single column's stored length — the settings flow uses
  // this to VERIFY an avatar actually landed (a DB-side guard trigger
  // can silently keep the old value; without a read-back the client
  // shows the new image until the next refresh "removes" it).
  async function getStoredFieldLength(username, col) {
    const allowed = { pfp: 'pfp', banner: 'banner' };
    const c = allowed[col];
    if (!c) return null;
    try {
      const { data } = await sb.from('users').select(c).eq('username', norm(username)).maybeSingle();
      if (!data) return null;
      return (data[c] || '').length;
    } catch (_) { return null; }
  }

  // Retention: the notifications table only ever grew — every insert
  // stayed forever. Prune the caller's READ notifications older than
  // `olderThanDays` (default 30); unread ones are kept indefinitely so
  // nothing vanishes before it was seen. Called fire-and-forget after
  // boot.
  async function pruneNotifications(username, opts) {
    const days = Math.max(1, opts?.olderThanDays || 30);
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    try {
      const { error } = await sb.from('notifications').delete()
        .eq('username', norm(username)).eq('read', true).lt('time', cutoff);
      if (error) console.warn('[pruneNotifications]', error.message);
      else console.debug('[pruneNotifications] pruned read notifications older than', days, 'days for', norm(username));
    } catch (e) { console.warn('[pruneNotifications]', e?.message); }
  }

  // ── Friend System ────────────────────────────────────
  // ── Relationship engine ──────────────────────────────
  // A relationship lives denormalized on BOTH users' rows (friends,
  // friend_requests_sent, friend_requests_received) and the two row
  // writes are not transactional. Historically a failed second write
  // left the pair permanently split — one user saw "friends", the
  // other didn't, and nothing ever repaired it. Every mutation now
  // funnels through _setPairState: compute the ONE state the pair
  // should be in, write minimal membership patches to both rows
  // (the OTHER user's row first — a half-applied op then always
  // leaves the actor's UI an affordance to retry), verify, and
  // retry once. syncRelationship() runs the same convergence for a
  // pair without an op, which is how legacy split rows self-heal.
  function _hasU(arr, u)    { return (arr || []).map(norm).includes(u); }
  function _withU(arr, u)   { const a = (arr || []).map(norm); return a.includes(u) ? a : [...a, u]; }
  function _withoutU(arr, u){ return (arr || []).map(norm).filter(x => x !== u); }

  // Relationship ops only need five tiny columns. Fetching full rows
  // here shipped every avatar/banner data-URL along for the ride — a
  // single friend op against a heavy account moved MEGABYTES of
  // Supabase egress for data the op never looked at.
  const _REL_COLS = 'username,friends,friend_requests_sent,friend_requests_received,blocked_users';
  async function _fetchRelRow(username) {
    const un = norm(username);
    if (!un) return null;
    const { data } = await sb.from('users').select(_REL_COLS).eq('username', un).maybeSingle();
    if (!data) return null;
    return {
      username: data.username,
      friends: data.friends || [],
      friendRequestsSent: data.friend_requests_sent || [],
      friendRequestsReceived: data.friend_requests_received || [],
      blockedUsers: data.blocked_users || [],
    };
  }

  // The one consistent state for a pair, given both fresh user objects.
  // 'a>b' = a has a pending request to b. Pendings are RECEIVER-
  // authoritative: a request exists iff the receiver's row carries it,
  // so a sender-side leftover from a silent ignore can never resurrect
  // a request in the receiver's inbox.
  function _pairTargetState(a, b) {
    const an = norm(a.username), bn = norm(b.username);
    if (_hasU(a.blockedUsers, bn) || _hasU(b.blockedUsers, an)) return 'none';
    const fA = _hasU(a.friends, bn), fB = _hasU(b.friends, an);
    if (fA && fB) return 'friends';
    const aToB = _hasU(b.friendRequestsReceived, an);
    const bToA = _hasU(a.friendRequestsReceived, bn);
    if (fA !== fB) {
      // One row says friends, the other doesn't. Any surviving request
      // half means a half-finished ACCEPT — complete it. No request
      // linkage means a half-finished REMOVE — complete that instead.
      const anyReq = aToB || bToA || _hasU(a.friendRequestsSent, bn) || _hasU(b.friendRequestsSent, an);
      return anyReq ? 'friends' : 'none';
    }
    if (aToB && bToA) return 'friends'; // crossed requests auto-accept
    if (aToB) return 'a>b';
    if (bToA) return 'b>a';
    return 'none';
  }

  // Membership patch for one row so it matches the wanted relation to
  // `other`. Only the three relationship columns, only when they differ.
  function _pairRowPatch(row, other, want) {
    const patch = {};
    if (_hasU(row.friends, other) !== want.friend)
      patch.friends = want.friend ? _withU(row.friends, other) : _withoutU(row.friends, other);
    if (_hasU(row.friendRequestsSent, other) !== want.sent)
      patch.friend_requests_sent = want.sent ? _withU(row.friendRequestsSent, other) : _withoutU(row.friendRequestsSent, other);
    if (_hasU(row.friendRequestsReceived, other) !== want.received)
      patch.friend_requests_received = want.received ? _withU(row.friendRequestsReceived, other) : _withoutU(row.friendRequestsReceived, other);
    return patch;
  }

  // Write one row's patch; optionally stamp raw.friendsSince[other]
  // (merged over the freshest raw so nothing else gets clobbered).
  // Refreshes the delta baseline + kills caches so every later reader
  // sees the new state.
  async function _applyPairPatch(username, patch, stampSinceFor) {
    const un = norm(username);
    if (stampSinceFor) {
      try {
        const { data: rr } = await sb.from('users').select('raw').eq('username', un).maybeSingle();
        const raw = { ...(rr?.raw || {}) };
        const fs = { ...(raw.friendsSince || {}) };
        if (!fs[stampSinceFor]) {
          fs[stampSinceFor] = new Date().toISOString();
          patch = { ...patch, raw: { ...raw, friendsSince: fs } };
        }
      } catch (_) { /* stamp is cosmetic — never block the relationship write */ }
    }
    if (!Object.keys(patch).length) return true;
    const { error } = await sb.from('users').update(patch).eq('username', un);
    if (error) {
      console.error('[friends] row write failed for', un, '—', error.message);
      return false;
    }
    if (_lastRowByUser[un]) _lastRowByUser[un] = { ..._lastRowByUser[un], ...patch };
    _cacheDel('user:' + un); _cacheDel('userEnf:' + un);
    return true;
  }

  // Drive the pair to `target` ('friends' | 'a>b' | 'b>a' | 'none').
  // Fetches fresh rows itself so it also repairs drift that happened
  // since the caller looked.
  async function _setPairState(aName, bName, target, _retried) {
    const [a, b] = await Promise.all([_fetchRelRow(aName), _fetchRelRow(bName)]);
    if (!a || !b) return { ok: false, msg: 'User not found.', state: 'none' };
    const an = norm(a.username), bn = norm(b.username);
    const wantA = { friend: target === 'friends', sent: target === 'a>b', received: target === 'b>a' };
    const wantB = { friend: target === 'friends', sent: target === 'b>a', received: target === 'a>b' };
    const patchA = _pairRowPatch(a, bn, wantA);
    const patchB = _pairRowPatch(b, an, wantB);
    const becameFriends = target === 'friends' && ('friends' in patchA || 'friends' in patchB);
    const okB = await _applyPairPatch(bn, patchB, becameFriends ? an : null);
    const okA = await _applyPairPatch(an, patchA, becameFriends ? bn : null);
    if (!(okA && okB)) {
      if (!_retried) return _setPairState(aName, bName, target, true);
      return { ok: false, msg: 'Could not update both accounts — it will self-heal on the next sync.', state: target };
    }
    const changed = Object.keys(patchA).length + Object.keys(patchB).length > 0;
    if (changed) console.info('[friends] pair', an, '+', bn, '→', target);
    return { ok: true, state: target, changed };
  }

  // Converge a pair to whatever consistent state its rows imply.
  // Exposed as syncRelationship — the app calls it when it notices two
  // rows disagreeing (legacy half-applied ops heal here).
  async function _syncPair(u1, u2) {
    const [a, b] = await Promise.all([_fetchRelRow(u1), _fetchRelRow(u2)]);
    if (!a || !b) return { ok: false, msg: 'User not found.', state: 'none' };
    return _setPairState(u1, u2, _pairTargetState(a, b));
  }
  const syncRelationship = _syncPair;

  async function sendFriendRequest(fromUsername, toUsername) {
    fromUsername = norm(fromUsername);
    toUsername   = norm(toUsername);
    if (!toUsername) return { ok: false, msg: 'Enter a username.' };
    if (fromUsername === toUsername) return { ok: false, msg: "Can't add yourself." };
    const [fu, tu] = await Promise.all([_fetchRelRow(fromUsername), _fetchRelRow(toUsername)]);
    if (!fu) return { ok: false, msg: 'Your account not found.' };
    if (!tu) return { ok: false, msg: `User "${toUsername}" not found.` };
    // Block guard — a block by EITHER side prevents new friend requests.
    // The "they blocked you" case gets a deliberately vague message so a
    // block is never confirmed to the blocked person.
    if (_hasU(fu.blockedUsers, toUsername))
      return { ok: false, msg: 'You have this user blocked. Unblock them first.' };
    if (_hasU(tu.blockedUsers, fromUsername))
      return { ok: false, msg: "Couldn't send the request." };

    const cur = _pairTargetState(fu, tu);
    if (cur === 'friends') {
      // Also converges half-finished accepts the moment either side
      // tries to re-add the other.
      await _setPairState(fromUsername, toUsername, 'friends');
      return { ok: false, msg: 'Already friends.' };
    }
    if (cur === 'a>b') return { ok: false, msg: 'Request already sent.' };

    const target = cur === 'b>a' ? 'friends' : 'a>b'; // they already asked → instant accept
    const r = await _setPairState(fromUsername, toUsername, target);
    if (!r.ok) return { ok: false, msg: 'Failed to send request: ' + (r.msg || 'connection error') };
    if (target === 'friends') {
      await addNotification(toUsername, { type: 'friend_accept', from: fromUsername });
      try { socketEmit('friend:accepted', { from: toUsername, to: fromUsername }); } catch (_) {}
      return { ok: true, accepted: true, msg: `You are now friends with ${toUsername}!` };
    }
    await addNotification(toUsername, { type: 'friend_request', from: fromUsername });
    try { socketEmit('friend:request', { from: fromUsername, to: toUsername }); } catch (_) {}
    console.debug('[Friend Request] Sent from', fromUsername, 'to', toUsername);
    return { ok: true, msg: `Friend request sent to ${toUsername}!` };
  }

  async function acceptFriendRequest(myUsername, fromUsername) {
    myUsername   = norm(myUsername);
    fromUsername = norm(fromUsername);
    const [mu, fu] = await Promise.all([_fetchRelRow(myUsername), _fetchRelRow(fromUsername)]);
    if (!mu || !fu) return { ok: false, msg: 'User not found.' };
    // Block guard — accepting is off the table while either side blocks.
    if (_hasU(mu.blockedUsers, fromUsername))
      return { ok: false, msg: 'You have this user blocked. Unblock them first.' };
    if (_hasU(fu.blockedUsers, myUsername))
      return { ok: false, msg: "Couldn't accept the request." };

    const cur = _pairTargetState(mu, fu);
    if (cur === 'a>b') return { ok: false, msg: "They haven't accepted your request yet." };
    if (cur === 'none') return { ok: false, msg: 'That request is no longer there.' };
    const alreadyFriends = cur === 'friends';

    const r = await _setPairState(myUsername, fromUsername, 'friends');
    if (!r.ok) return { ok: false, msg: 'Failed to accept: ' + (r.msg || 'connection error') };
    if (!alreadyFriends) {
      await addNotification(fromUsername, { type: 'friend_accept', from: myUsername });
      console.debug('[Friend Accept] Users', myUsername, 'and', fromUsername, 'are now friends');
    }
    try { socketEmit('friend:accepted', { from: fromUsername, to: myUsername }); } catch (_) {}
    return { ok: true, msg: `You are now friends with ${fromUsername}!` };
  }

  const acceptFriend = acceptFriendRequest;

  // Decline (a.k.a. ignore) an INCOMING request. Deliberately silent:
  // no notification, no socket event — the sender's UI converges on
  // its next fresh read instead of getting a live "you were ignored"
  // signal. A crossed outgoing request from me survives the decline.
  async function declineFriendRequest(myUsername, fromUsername) {
    myUsername   = norm(myUsername);
    fromUsername = norm(fromUsername);
    const [mu, fu] = await Promise.all([_fetchRelRow(myUsername), _fetchRelRow(fromUsername)]);
    if (!mu || !fu) return { ok: false, msg: 'User not found.' };
    // Genuine friendship check (NOT _pairTargetState — that reads
    // crossed pendings as friends-to-be, and declining one half of a
    // crossed pair is legitimate).
    if (_hasU(mu.friends, fromUsername) && _hasU(fu.friends, myUsername))
      return { ok: false, msg: 'You are already friends — remove them instead.' };
    const mineStillOut = _hasU(fu.friendRequestsReceived, myUsername);
    const r = await _setPairState(myUsername, fromUsername, mineStillOut ? 'a>b' : 'none');
    if (!r.ok) return { ok: false, msg: 'Failed to decline: ' + (r.msg || 'connection error') };
    console.debug('[declineFriendRequest] Request declined:', { myUsername, fromUsername });
    return { ok: true };
  }

  // Cancel an OUTGOING request. Emits friend:removed so the receiver's
  // pending entry disappears live. A crossed incoming request from them
  // survives the cancel.
  async function cancelFriendRequest(myUsername, toUsername) {
    myUsername = norm(myUsername);
    toUsername = norm(toUsername);
    const [mu, tu] = await Promise.all([_fetchRelRow(myUsername), _fetchRelRow(toUsername)]);
    if (!mu || !tu) return { ok: false, msg: 'User not found.' };
    // Genuine friendship check — see declineFriendRequest.
    if (_hasU(mu.friends, toUsername) && _hasU(tu.friends, myUsername))
      return { ok: false, msg: 'You are already friends — remove them instead.' };
    const theirsStillIn = _hasU(mu.friendRequestsReceived, toUsername);
    const r = await _setPairState(myUsername, toUsername, theirsStillIn ? 'b>a' : 'none');
    if (!r.ok) return { ok: false, msg: 'Failed to cancel: ' + (r.msg || 'connection error') };
    try { socketEmit('friend:removed', { from: myUsername, to: toUsername }); } catch (_) {}
    return { ok: true };
  }

  async function removeFriend(myUsername, friendUsername) {
    myUsername     = norm(myUsername);
    friendUsername = norm(friendUsername);
    const r = await _setPairState(myUsername, friendUsername, 'none');
    if (!r.ok) return { ok: false, msg: 'Failed to remove friend: ' + (r.msg || 'connection error') };
    try { socketEmit('friend:removed', { from: myUsername, to: friendUsername }); } catch (_) {}
    console.debug('[removeFriend] Friend removed:', { myUsername, friendUsername });
    return { ok: true };
  }

  // ── Direct Messages ──────────────────────────────────
  function _dmKey(u1, u2) { return [norm(u1), norm(u2)].sort().join('__'); } // legacy username key

  // Full desired column set, the must-exist floor, and the session-remembered
  // working set (see the resilient select in getDMMessages).
  const _DM_COLS_FULL = ['id','dm_key','from','text','timestamp','edited','new_text','reactions','forwarded','forwarded_by','reply_to','flags'];
  const _DM_COLS_CORE = ['id','dm_key','from','text','timestamp'];
  let _dmWorkingCols = null;
  async function getDMMessages(user1, user2, limit, offset) {
    const key = await getDMKey(user1, user2);
    const legacyKey = _dmKey(user1, user2);
    const max = Math.min(limit || 500, 1000);
    const skip = offset || 0;
    // Only cache the initial fetch (no offset); paginated calls are uncached
    const cacheKey = skip === 0 ? 'dm:' + key + ':' + max : null;
    if (cacheKey) {
      const cached = _cacheGet(cacheKey);
      if (cached !== undefined) return cached;
    }
    try {
      // Canonical schema: dm_key + timestamp. Optimize by selecting only needed
      // columns instead of * (faster query, less data transfer, avoids timeouts).
      // The old "from/username/time" fallback is permanently removed.
      // NOTE: no created_at — that column does not exist on `dms`, and
      // including it made the WHOLE select error out ('column dms.created_at
      // does not exist') → every DM thread returned empty. The timestamp
      // logic falls back to the `timestamp` column just fine.
      // Resilient column selection. Optional columns (forwarded, reply_to,
      // flags, …) don't exist on every deployment of the `dms` table; a
      // single missing one made the ENTIRE select 400 → every DM thread
      // came back empty ("data loading sucks"). Instead of hard-failing,
      // strip the offending column and retry, and REMEMBER the working set
      // for the rest of the session so we don't 400 on every call.
      const dmKeys = key === legacyKey ? [key] : [key, legacyKey];
      let cols = (_dmWorkingCols || _DM_COLS_FULL).slice();
      let data = null, error = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        ({ data, error } = await sb.from('dms')
          .select(cols.join(','))
          .in('dm_key', dmKeys)
          .order('timestamp', { ascending: false })
          .range(skip, skip + max - 1));
        if (!error) { _dmWorkingCols = cols; break; }
        const m = /column\s+(?:[\w"]+\.)?"?(\w+)"?\s+does not exist/i.exec(error.message || '');
        const bad = m && m[1];
        if (bad && !_DM_COLS_CORE.includes(bad) && cols.includes(bad)) {
          if (!window._dmSchemaWarned) {
            window._dmSchemaWarned = true;
            console.warn('[getDMMessages] `dms` table is missing optional column(s); loading without them. First:', bad);
          }
          cols = cols.filter(c => c !== bad);
          continue;   // retry with the reduced set
        }
        break;        // unknown error, or a CORE column is missing — give up
      }

      if (error) {
        console.error('[getDMMessages] Query error:', error.message || error);
        return [];
      }

      // Reverse to chronological order after fetching latest N
      const result = (data || []).map(r => {
        // Handle both old schema (columns: id, from, text, time, timestamp, etc.)
        // and new schema (columns: id, username, type, from, time, read, data)
        if (r.text !== undefined) {
          return _dmFromRow(r);
        } else {
          const msgData = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
          return _dmFromPollingRow(r, msgData);
        }
      });
      // Stable chronological sort: timestamp ascending, id as tiebreaker.
      // The DB's `order timestamp DESC + reverse` was unstable when two
      // messages shared a timestamp, which is exactly what you get when
      // the polling fallback stamps "now" on rows without a real ts.
      // Stable chronological sort. Missing timestamps sort to the START
      // (oldest) — never the end — so a row with a corrupted ts column
      // can't masquerade as the most recent message.
      result.sort((a, b) => {
        const ta = a.timestamp ? +new Date(a.timestamp) : 0;
        const tb = b.timestamp ? +new Date(b.timestamp) : 0;
        if (ta !== tb) return ta - tb;
        return String(a.id||'').localeCompare(String(b.id||''));
      });

      console.debug('[getDMMessages]', { between: key, count: result.length, sample: result.slice(-3).map(m => ({ id: m.id, from: m.from, text: m.text?.slice(0,40) })) });
      if (cacheKey) _cacheSet(cacheKey, result, _CACHE_TTL.dmMessages);
      return result;
    } catch(e) {
      console.error('[getDMMessages] Exception:', e.message);
      return [];
    }
  }

  function _dmFromRow(r) {
    return { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: _pickTimestamp(r.timestamp, r.created_at, r.inserted_at, _tsFromId(r.id)), edited: r.edited || false, newText: r.new_text || undefined, reactions: r.reactions || undefined, forwarded: r.forwarded || false, forwardedBy: r.forwarded_by || undefined, replyTo: _parseJSONIsh(r.reply_to), flags: Array.isArray(r.flags) ? r.flags : (r.flags && typeof r.flags === 'string' ? (() => { try { return JSON.parse(r.flags); } catch { return undefined; } })() : undefined) };
  }
  // Best-effort timestamp recovery from the message id. Our ids look like
  // `<base36 Date.now()><base36 Math.random()>` concatenated — Date.now()
  // is 8 chars for the current epoch, plus ~10 random chars after. The old
  // split-on-non-alphanumeric approach kept the whole 18-char id and the
  // length cap rejected it, so we silently never recovered any timestamp.
  // Now we try the first 8, 9, 7 chars and accept the first that decodes
  // to a plausibly-recent ms.
  function _tsFromId(id) {
    if (!id || typeof id !== 'string') return null;
    for (const len of [8, 9, 7, 10]) {
      const head = id.slice(0, len);
      if (head.length !== len) continue;
      const ms = parseInt(head, 36);
      if (Number.isFinite(ms) && ms > 946684800000 && ms < Date.now() + 86400000) {
        return new Date(ms).toISOString();
      }
    }
    return null;
  }
  function _parseJSONIsh(v) {
    if (v == null) return undefined;
    if (typeof v === 'object') return v;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return undefined; } }
    return undefined;
  }

  function _dmFromPollingRow(r, msgData) {
    // Extract message from polling response where data might be in a JSON column
    // Handle both schemas: old (direct text column) and new (data column as JSONB)
    // Pick the first candidate that ISN'T an HH:MM display string — those are
    // not real timestamps and were silently surfacing as "3 weeks ago".
    const ts = _pickTimestamp(msgData.timestamp, r.timestamp, r.created_at, r.inserted_at, _tsFromId(msgData.id || r.id));
    return {
      id: msgData.id || r.id,
      from: msgData.from || r.from,
      text: msgData.text || r.text || '',
      time: msgData.time || r.time,
      timestamp: ts,
      edited: msgData.edited || false,
      newText: msgData.newText || msgData.new_text || undefined,
      // Prefer the top-level reactions column (where toggleReaction now
      // writes) over any legacy copy inside the data blob.
      reactions: r.reactions || msgData.reactions || undefined,
      forwarded: msgData.forwarded || false,
      forwardedBy: msgData.forwardedBy || msgData.forwarded_by || undefined,
      replyTo: _parseJSONIsh(msgData.replyTo || msgData.reply_to || r.reply_to)
    };
  }
  function _pickTimestamp(...candidates) {
    for (const c of candidates) {
      if (c == null || c === '') continue;
      if (typeof c === 'string' && /^\d{1,2}:\d{2}$/.test(c.trim())) continue; // HH:MM display
      const d = new Date(c);
      if (!Number.isNaN(d.getTime()) && d.getTime() > 946684800000) return d.toISOString();
    }
    return null;
  }

  async function sendDMMessage(fromUsername, toUsername, text, opts) {
    fromUsername = norm(fromUsername);
    toUsername   = norm(toUsername);
    const key = await getDMKey(fromUsername, toUsername);
    _cacheInvalidatePrefix('dm:' + key);
    const now = new Date();
    // Use the caller's pre-generated id if provided. Lets the caller
    // emit Socket.IO with the same id BEFORE awaiting this insert, so
    // receivers see the message instantly instead of waiting for the
    // Supabase round-trip (root cause of the 10s delivery delay).
    const msgId = (opts && opts.id) || (Date.now().toString(36) + Math.random().toString(36).slice(2));
    // senderName lets a built-in bot (e.g. FortGified) post INTO the
    // fromUsername↔toUsername thread while the row's `from` shows the bot.
    // The dm_key above is always derived from the two human participants.
    const senderName = (opts && opts.senderName) ? norm(opts.senderName) : fromUsername;
    const msg = {
      id:        msgId,
      from:      senderName,
      text,
      time:      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString()
    };

    const row = { dm_key: key, id: msg.id, from: msg.from, text: msg.text, time: msg.time, timestamp: msg.timestamp };
    if (opts?.forwarded) { row.forwarded = true; row.forwarded_by = opts.forwardedBy || fromUsername; msg.forwarded = true; msg.forwardedBy = row.forwarded_by; }
    if (Array.isArray(opts?.flags) && opts.flags.length) { row.flags = opts.flags; msg.flags = opts.flags; }
    // Persist reply target so the preview survives reload (requires a
    // `reply_to JSONB` column on dms — see migration SQL).
    if (opts?.replyTo && typeof opts.replyTo === 'object') {
      row.reply_to = { id: opts.replyTo.id || null, from: opts.replyTo.from || null, text: (opts.replyTo.text || '').slice(0, 200) };
      msg.replyTo = row.reply_to;
    }

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
      const key = await getDMKey(opts.user1, opts.user2);
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
      const key = await getDMKey(opts.user1, opts.user2);
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
    const _limit = Math.min(limit || 500, 1000);
    const _offset = offset || 0;
    if (!_offset) {
      const cacheKey = 'bm:' + bastionId + ':' + channelId;
      const cached = _cacheGet(cacheKey);
      if (cached !== undefined) return cached;
    }
    const { data } = await sb.from('bastion_msgs')
      .select('id,from,text,time,timestamp,edited,reactions,reply_to')
      .eq('bastion_id', bastionId)
      .eq('channel_id', channelId)
      .order('timestamp', { ascending: false })
      .range(_offset, _offset + _limit - 1);
    const result = (data || []).map(r => ({
      id: r.id, from: r.from, text: r.text, time: r.time,
      timestamp: _pickTimestamp(r.timestamp, r.created_at, r.inserted_at, _tsFromId(r.id)),
      edited: r.edited || false,
      reactions: r.reactions || undefined,
      replyTo: _parseJSONIsh(r.reply_to),
    }));
    result.sort((a, b) => {
      const ta = a.timestamp ? +new Date(a.timestamp) : 0;
      const tb = b.timestamp ? +new Date(b.timestamp) : 0;
      if (ta !== tb) return ta - tb;
      return String(a.id||'').localeCompare(String(b.id||''));
    });
    if (!_offset) _cacheSet('bm:' + bastionId + ':' + channelId, result, _CACHE_TTL.bastionMsgs);
    return result;
  }

  async function sendBastionChannelMessage(bastionId, channelId, fromUsername, text, opts) {
    const now = new Date();
    const id = (opts && opts.id) || (Date.now().toString(36) + Math.random().toString(36).slice(2));
    const msg = {
      id,
      from: norm(fromUsername),
      text,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString()
    };
    const row = {
      bastion_id: bastionId, channel_id: channelId,
      id: msg.id, from: msg.from, text: msg.text,
      time: msg.time, timestamp: msg.timestamp,
    };
    if (opts?.replyTo && typeof opts.replyTo === 'object') {
      row.reply_to = { id: opts.replyTo.id || null, from: opts.replyTo.from || null, text: (opts.replyTo.text || '').slice(0, 200) };
      msg.replyTo = row.reply_to;
    }
    await sb.from('bastion_msgs').insert(row);
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
      console.debug('[addReaction] Reaction toggled:', { msgId, emoji, username, users: arr });
      return { users: arr };
    } catch(e) {
      console.error('[addReaction] Failed:', e.message);
      return null;
    }
  }

  async function toggleReaction(msgId, emoji, context, username) {
    username = norm(username);
    try {
      let reactions = {};
      let updateSuccess = false;

      if (context === 'dm') {
        // DMs — the reaction lives in the top-level `reactions` column
        // (that's what getDMMessages reads: r.reactions). The old code
        // wrote it into the `data` JSON blob instead, so the toggle
        // succeeded but the read never saw it — reactions silently did
        // nothing in DMs. Read + write the `reactions` column, like GC.
        const { data, error: err1 } = await sb.from('dms')
          .select('reactions')
          .eq('id', msgId)
          .maybeSingle();

        if (err1 || !data) throw new Error('Message not found');

        reactions = data.reactions || {};
        const arr = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
        const idx = arr.indexOf(username);
        if (idx !== -1) arr.splice(idx, 1);
        else arr.push(username);
        if (arr.length) reactions[emoji] = arr;
        else delete reactions[emoji];

        const { error: err2 } = await sb.from('dms')
          .update({ reactions: Object.keys(reactions).length ? reactions : null })
          .eq('id', msgId);

        if (err2) throw new Error(`Update failed: ${err2.message}`);
        updateSuccess = true;
      } else if (context === 'gc') {
        // Group chats — GC messages are read through the firebase-compat
        // shim, which surfaces reactions from the `data` JSON blob
        // (…, ...r.data), NOT the `reactions` column. The old code wrote
        // the column, so GC reactions were invisible (same failure as
        // DMs). Read + write data.reactions to match the read path.
        const { data, error: err1 } = await sb.from('group_chat_messages')
          .select('data')
          .eq('id', msgId)
          .maybeSingle();

        if (err1 || !data) throw new Error('Message not found');

        const msgData = (data.data && typeof data.data === 'object') ? { ...data.data } : {};
        reactions = msgData.reactions || {};
        const arr = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
        const idx = arr.indexOf(username);
        if (idx !== -1) arr.splice(idx, 1);
        else arr.push(username);
        if (arr.length) reactions[emoji] = arr;
        else delete reactions[emoji];

        msgData.reactions = Object.keys(reactions).length ? reactions : undefined;
        const { error: err2 } = await sb.from('group_chat_messages')
          .update({ data: msgData })
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
    // Broadcast so every viewer of this bastion refreshes name/icon/banner/
    // desc/emblem/channels/emoji/etc. onBastionUpdate on the client refetches
    // and re-renders. Rate-limited on the socket layer if hot-spammed.
    try { socketEmit('bastion:update', { bastionId: id, field: 'save' }); } catch(_) {}
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
    // Stamp a "member since" date on the global bastion (idempotent — a
    // re-join never overwrites the original). No join dates existed
    // before this; existing members simply have none until they rejoin.
    try {
      const b = await getGlobalBastion(bastionId);
      if (b) {
        const joins = { ...(b.memberJoins || {}) };
        if (!joins[u]) {
          joins[u] = new Date().toISOString();
          b.memberJoins = joins;
          await saveGlobalBastion(bastionId, b);
        }
      }
    } catch (_) {}
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
      // Server may forward as 'reaction:update', 'reaction:updated', or
      // re-emit the client's original 'reaction:toggle' verbatim. Listen
      // for all three so real-time sync works regardless of which the
      // server-side handler picks. Belt and suspenders.
      ['reaction:update', 'reaction:updated', 'reaction:toggle'].forEach(ev => {
        _socket.on(ev, function(data) {
          if (_socketCallbacks.onReaction) _socketCallbacks.onReaction(data);
        });
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
  function isConnected() { return !!(_socket && _socketReady); }

  // Client-side rate limiting for Socket.IO events
  var _emitLastTime = {};
  var _emitCooldowns = { 'status:set': 2000, 'typing:start': 1000, 'typing:stop': 1000, 'activity:set': 3000, 'activity:update': 3000, 'profile:update': 500, 'bastion:update': 500 };
  // Events whose id1/id2 are ROOM ids. Room JOINs are always lowercased
  // (server roomKey does no case folding), so these must match — otherwise a
  // bastion channel with an uppercase name (or any mixed-case id) is
  // broadcast to a room nobody joined and the message is silently dropped
  // for every recipient (only the 2s poller saves it). Normalise here, in one
  // place, so every call site is covered.
  var _roomEvents = { 'message:send': 1, 'message:edit': 1, 'message:delete': 1, 'reaction:toggle': 1, 'typing:start': 1, 'typing:stop': 1 };
  function socketEmit(event, data) {
    try {
      if (!_socket || !_socketReady) return false;
      if (_roomEvents[event] && data && typeof data === 'object') {
        var _d = {};
        for (var k in data) _d[k] = data[k];
        if (typeof _d.id1 === 'string') _d.id1 = _d.id1.toLowerCase();
        if (typeof _d.id2 === 'string') _d.id2 = _d.id2.toLowerCase();
        data = _d;
      }
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
        // Fetch the last 50 messages. Wider window ensures no messages
        // are missed during brief disconnects, even when socket.io hiccups.
        const { data, error } = await sb.from('dms')
          .select('id,from,text,time,timestamp,edited,reactions')
          .eq('dm_key', dmKey)
          .order('timestamp', { ascending: false })
          .limit(50);

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
    }, 2000); // Poll every 2s for quicker real-time feel

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
          .limit(50);

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
    }, 2000); // Poll every 2s for quicker real-time feel

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

  // ── Group-chat polling (safety net for group chats) ──
  // Group chats were the ONLY open-chat surface with no polling fallback:
  // DMs (startDMPolling) and bastion channels (startChannelPolling) each
  // poll every 2s, but GCs relied entirely on Socket.IO push + the
  // firebase-compat shim's postgres_changes subscription. When the socket
  // hiccups (or Supabase Realtime is disabled for the project) GC messages
  // never appeared until a manual refresh. This mirrors the DM poller.
  // GC rows differ from dms/bastion_msgs: the full message payload lives in
  // the `data` JSON blob (reactions/replyTo/flags/attachments), with flat
  // id/from/text/time/timestamp/edited columns alongside for cheap diffing.
  let _gcPollingIntervals = new Map(); // gcId -> interval
  let _lastGCTimestamp = new Map();    // gcId -> newest seen timestamp (ms)

  async function startGCPolling(gcId) {
    if (!gcId || _gcPollingIntervals.has(gcId)) return;

    const pollInterval = setInterval(async () => {
      if (_tabHidden()) return;
      try {
        const { data, error } = await sb.from('group_chat_messages')
          .select('id,from,text,time,timestamp,edited,data')
          .eq('gc_id', gcId)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (error || !data) return;

        const room = 'gc:' + gcId;
        const cb = _socketCallbacks.onMessage || _callbacks.onMessage;
        const editCb = _socketCallbacks.onMessageEdited;
        const deleteCb = _socketCallbacks.onMessageDeleted;
        for (const row of data.reverse()) {
          // Prefer the full stored payload; fall back to flat columns.
          const full = (row.data && typeof row.data === 'object') ? { ...row.data } : {};
          full.id = full.id || row.id;
          full.from = full.from || row.from;
          full.timestamp = full.timestamp || row.timestamp;
          full.time = full.time || row.time;
          if (full.text === undefined) full.text = row.text;
          if (full.edited === undefined) full.edited = row.edited;

          const msgTime = new Date(row.timestamp).getTime();
          const lastTime = _lastGCTimestamp.get(gcId) || 0;
          if (msgTime > lastTime) {
            // onMessage de-dupes against the DOM, so re-seeing rendered
            // history on the first poll is harmless.
            if (cb) cb(room, full);
          }
          const prevText = _lastMsgTexts.get(row.id);
          if (prevText !== undefined && prevText !== (row.text || '') && editCb) {
            editCb({ messageId: row.id, newText: row.text, editedBy: row.from });
          }
          _lastMsgTexts.set(row.id, row.text || '');
        }
        const currentIds = new Set(data.map(r => r.id));
        const prevIds = _lastPollIds.get('gc:' + gcId);
        if (prevIds && deleteCb) {
          prevIds.forEach(id => { if (!currentIds.has(id)) deleteCb({ messageId: id, deletedBy: '' }); });
        }
        _lastPollIds.set('gc:' + gcId, currentIds);
        if (data.length > 0) _lastGCTimestamp.set(gcId, new Date(data[data.length - 1].timestamp).getTime());
      } catch (e) { /* silently skip */ }
    }, 2000); // Poll every 2s for quicker real-time feel (matches DM/channel)

    _gcPollingIntervals.set(gcId, pollInterval);
  }

  function stopGCPolling(gcId) {
    const interval = _gcPollingIntervals.get(gcId);
    if (interval) {
      clearInterval(interval);
      _gcPollingIntervals.delete(gcId);
      _lastGCTimestamp.delete(gcId);
      console.log('[GCPolling] Stopped polling for:', gcId);
    }
  }

  // ── Friend / relationship polling ──
  // The 15s safety net under the socket events: watches the WHOLE
  // relationship state (friends + both request lists), not just request
  // counts — so a lost friend:accepted / friend:removed packet can delay
  // convergence by at most one poll, never forever. Membership is
  // compared by content, not length: an accept that swaps a request for
  // a friendship leaves counts unchanged but must still fire.
  let _friendRequestPollingInterval = null;
  let _lastFriendState = null;

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
          .select('friends,friend_requests_sent,friend_requests_received')
          .eq('username', username)
          .maybeSingle();

        if (error) {
          console.error('[FriendRequestPolling] Query error:', error.message);
          return;
        }

        if (data) {
          const snapshot = JSON.stringify([
            (data.friends || []).slice().sort(),
            (data.friend_requests_sent || []).slice().sort(),
            (data.friend_requests_received || []).slice().sort(),
          ]);
          if (snapshot !== _lastFriendState) {
            const first = _lastFriendState === null;
            _lastFriendState = snapshot;
            if (!first) console.log('[FriendRequestPolling] 🔔 relationship state changed');
            if (_callbacks.onFriendRequestsUpdate) {
              _callbacks.onFriendRequestsUpdate({
                friends: data.friends || [],
                sent: data.friend_requests_sent || [],
                received: data.friend_requests_received || [],
                initial: first,
              });
            }
          }
        }
      } catch (e) {
        console.error('[FriendRequestPolling] Error:', e?.message);
      }
    }, 15000); // Poll every 15s (socket events handle the instant path)
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
  let _voiceSchemaBroken = false;

  async function startVoiceRoomPolling(username) {
    if (_voiceRoomPollingInterval) {
      console.log('[VoiceRoomPolling] Already polling');
      return;
    }
    if (_voiceSchemaBroken) {
      console.log('[VoiceRoomPolling] Skipped — voice_channels column missing from this project');
      return;
    }

    username = norm(username);
    console.log('[VoiceRoomPolling] ✓ Starting polling for:', username);

    _voiceRoomPollingInterval = setInterval(async () => {
      if (_tabHidden()) return;
      if (_voiceSchemaBroken) { stopVoiceRoomPolling(); return; }
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
        for (const rawBastion of bastions) {
          // `bastions` may be an array of strings (legacy) or objects ({id,name,...}).
          // Coerce to the canonical string id so the Supabase filter doesn't URL-encode
          // the whole object as "[object Object]" and 400.
          const bastionId = typeof rawBastion === 'string' ? rawBastion : (rawBastion?.id || rawBastion?.globalId || rawBastion?.name);
          if (!bastionId || typeof bastionId !== 'string') continue;
          const { data: bastionData, error: bastionErr } = await sb.from('global_bastions')
            .select('voice_channels')
            .eq('id', bastionId)
            .maybeSingle();

          if (bastionErr) {
            // If the column doesn't exist in this project, stop polling entirely
            // — otherwise we 400 every 12s forever for each bastion.
            if (/column .* does not exist/i.test(bastionErr.message || '')) {
              _voiceSchemaBroken = true;
              console.debug('[VoiceRoomPolling] voice_channels column missing — disabling polling for this session');
              stopVoiceRoomPolling();
              return;
            }
            continue;
          }
          if (!bastionData || !bastionData.voice_channels) {
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
    _gcPollingIntervals.forEach((interval) => { try { clearInterval(interval); } catch(_){} });
    _gcPollingIntervals.clear();
    _lastGCTimestamp.clear();
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

  // -- Game reviews (shared across all users) --
  // Table shape: `game_reviews` with columns:
  //   id text PK, game_key text, data jsonb
  // game_key is the lower-cased game name so we can range-query by game
  // without parsing JSONB. Reviews land in `data` as the full review
  // object (id, game, vote, text, user, displayName, pfp, at).
  //
  // Both methods swallow Supabase errors silently so the localStorage
  // fallback path keeps working if the table doesn't exist yet —
  // letting the schema be added on the backend without breaking the
  // client.
  async function getGameReviews(gameName) {
    const key = norm(gameName);
    if (!key) return [];
    try {
      const { data, error } = await sb.from('game_reviews')
        .select('id,data')
        .eq('game_key', key)
        .order('id', { ascending: false })
        .limit(200);
      if (error) {
        // Surface the underlying error so the table-missing case is
        // visible (instead of silently returning [] which looked like
        // "everyone has no reviews"). Only log once per session so we
        // don't spam the console.
        if (!getGameReviews._loggedError) {
          getGameReviews._loggedError = true;
          console.warn('[FortizedSocial] getGameReviews failed:', error.message || error);
          console.warn('[FortizedSocial] Create the table with:\n  create table if not exists game_reviews (id text primary key, game_key text, data jsonb);\n  create index if not exists game_reviews_key_idx on game_reviews (game_key);');
        }
        return [];
      }
      return (data || []).map(r => r.data || r).filter(Boolean);
    } catch (_) { return []; }
  }
  async function saveGameReview(review) {
    if (!review?.id || !review?.game) return { ok: false };
    try {
      const { error } = await sb.from('game_reviews').upsert({
        id: review.id,
        game_key: norm(review.game),
        data: review,
      }, { onConflict: 'id' });
      if (error) return { ok: false, msg: error.message };
      return { ok: true };
    } catch (e) { return { ok: false, msg: e?.message }; }
  }
  async function deleteGameReview(reviewId) {
    if (!reviewId) return;
    try { await sb.from('game_reviews').delete().eq('id', reviewId); } catch (_) {}
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
    // Also lift any AUTOMOD chat-suspension. chatSuspendedUntil rides on the
    // user object (raw JSONB), separate from the formal suspension columns, so
    // the column-level update above won't clear it. Round-trip the user object
    // the same way applyFortizedSafetyChatSuspension set it so staff "Unsuspend"
    // (and the console unpunish path) fully frees the account.
    try {
      const u = await getUserByName(username);
      if (u && (u.chatSuspendedUntil || u.chatSuspendedReason)) {
        u.chatSuspendedUntil = null;
        u.chatSuspendedReason = null;
        await saveUserObject(u);
      }
    } catch (_) {}
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

  // -- Delete a message by id across the message tables (best-effort; used by
  //    the AI report triage when it removes an offending message). --
  async function adminDeleteMessage(msgId) {
    if (!msgId) return false;
    let ok = false;
    for (const t of ['bastion_msgs', 'dms', 'group_chat_messages']) {
      try {
        const { error, count } = await sb.from(t).delete({ count: 'exact' }).eq('id', msgId);
        if (!error && count) ok = true;
      } catch (_) {}
    }
    return ok;
  }

  // -- Appeals Queue (lightweight pointers to pending appeals; no user scans) --
  async function adminGetAppealsQueue() {
    _cacheDel('akv:appeals_queue');
    return (await _adminKVGet('appeals_queue')) || [];
  }
  async function adminSaveAppealsQueue(queue) {
    await _adminKVSet('appeals_queue', Array.isArray(queue) ? queue.slice(-500) : []);
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
  // Append a single ticket into the support_tickets map keyed by id. This is
  // the ONE write path from user-facing "Send feedback" / "Contact support"
  // flows — previously the client used `FortizedSocial.adminSubmitSupportTicket`
  // which didn't exist, so the code always fell into a localStorage-only
  // fallback and the admin console never saw the tickets.
  async function adminSubmitSupportTicket(ticket) {
    if (!ticket || !ticket.id) throw new Error('Ticket requires an id');
    _cacheDel('akv:support_tickets');
    const current = (await _adminKVGet('support_tickets')) || {};
    current[ticket.id] = ticket;
    await _adminKVSet('support_tickets', current);
    return ticket;
  }

  // -- "A place where…" homepage feedback --
  async function getPlaceFeedback() {
    return (await _adminKVGet('place_feedback')) || [];
  }
  async function submitPlaceFeedback(entry) {
    if (!entry || !entry.id) throw new Error('Feedback requires an id');
    _cacheDel('akv:place_feedback');
    const list = (await _adminKVGet('place_feedback')) || [];
    list.push(entry);
    // Keep the last 500; homepage feedback is high-volume, low-retention.
    await _adminKVSet('place_feedback', list.slice(-500));
    return entry;
  }
  async function archivePlaceFeedback(id) {
    if (!id) return;
    _cacheDel('akv:place_feedback');
    const list = (await _adminKVGet('place_feedback')) || [];
    const next = list.map(it => (it.id === id ? { ...it, status: 'archived' } : it));
    await _adminKVSet('place_feedback', next);
  }

  // -- Onboarding interest stats --
  // Aggregate: { total: N, counts: { interest_id: N, … }, perUser: { username: [ids] } }
  // perUser lets us re-aggregate later if interest IDs ever get renamed, and
  // lets the admin console show who picked what without touching user rows.
  async function getOnboardingInterestStats() {
    return (await _adminKVGet('onboarding_stats')) || { total: 0, counts: {}, perUser: {} };
  }
  async function submitOnboardingInterests(username, interests) {
    _cacheDel('akv:onboarding_stats');
    const stats = (await _adminKVGet('onboarding_stats')) || { total: 0, counts: {}, perUser: {} };
    const key = (username || 'anon_' + Date.now()).toString().toLowerCase();
    const prev = Array.isArray(stats.perUser[key]) ? stats.perUser[key] : null;
    // If the user already submitted, subtract their previous picks before
    // applying the new ones so counts reflect current picks, not lifetime clicks.
    if (prev) {
      for (const id of prev) {
        if (stats.counts[id] > 0) stats.counts[id] -= 1;
      }
    } else {
      stats.total = (stats.total || 0) + 1;
    }
    const picked = Array.isArray(interests) ? interests.filter(Boolean) : [];
    for (const id of picked) {
      stats.counts[id] = (stats.counts[id] || 0) + 1;
    }
    stats.perUser[key] = picked;
    await _adminKVSet('onboarding_stats', stats);
    return stats;
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
  async function adminGetDashboardStats() {
    const cached = _cacheGet('dashStats');
    if (cached !== undefined) return cached;
    try {
      const now = new Date().toISOString();
      const [totalRes, onlineRes, awayRes, dndRes, radianceRes, topOnyxRes, newestRes] = await Promise.all([
        sb.from('users').select('*', { count: 'exact', head: true }),
        sb.from('users').select('*', { count: 'exact', head: true }).eq('status', 'online'),
        sb.from('users').select('*', { count: 'exact', head: true }).in('status', ['away', 'idle']),
        sb.from('users').select('*', { count: 'exact', head: true }).eq('status', 'dnd'),
        sb.from('users').select('*', { count: 'exact', head: true }).gte('radiance_until', Date.now()),
        sb.from('users').select('username,display_name,pfp,onyx').order('onyx', { ascending: false }).limit(5),
        sb.from('users').select('username,display_name,pfp,created_at').order('created_at', { ascending: false }).limit(5),
      ]);
      const result = {
        totalUsers: totalRes.count || 0,
        onlineCount: onlineRes.count || 0,
        awayCount: awayRes.count || 0,
        dndCount: dndRes.count || 0,
        radianceCount: radianceRes.count || 0,
        topOnyx: (topOnyxRes.data || []).map(r => ({ username: r.username, display_name: r.display_name, pfp: r.pfp, onyx: r.onyx })),
        newestUsers: (newestRes.data || []).map(r => ({ username: r.username, display_name: r.display_name, pfp: r.pfp, createdAt: r.created_at })),
      };
      _cacheSet('dashStats', result, _CACHE_TTL.user);
      return result;
    } catch (e) { console.warn('[adminGetDashboardStats]', e); return null; }
  }

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
    _cacheDel('akv:place_feedback');
    _cacheDel('akv:onboarding_stats');
    _cacheDel('dashStats');
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

  // ── Voice presence for the bastion rail (who's in party channels) ─────
  // Deliberately LEAN (egress): selects only bastion_id/channel_name/username
  // — NOT the `data` blob, which holds each participant's pfp data URL. The
  // rail resolves avatars from its own pfp cache, so who + where is enough.
  // Returns [] on any error / missing table so the caller silently shows no
  // voice indicator instead of throwing.
  let _voiceTableBroken = false;
  async function getVoicePresence(bastionIds) {
    if (_voiceTableBroken) return [];
    try {
      const ids = (bastionIds || []).filter(id => typeof id === 'string' && id);
      if (!ids.length || !sb?.from) return [];
      const { data, error } = await sb.from('voice_channels')
        .select('bastion_id,channel_name,username')
        .in('bastion_id', ids);
      if (error) {
        // Missing table/columns in this project — stop trying for the session.
        if (/relation .* does not exist|column .* does not exist/i.test(error.message || '')) _voiceTableBroken = true;
        return [];
      }
      return data || [];
    } catch (_) { return []; }
  }

  // ── Ads API ──────────────────────────────────────────
  // Returns every ad with status='active'. Expiry filtering is done
  // client-side via _isAdLive() so superadmin-owned ads stay in
  // rotation regardless of expiresAt (per spec: superadmin ads never
  // disappear). The role list lives on the client, so the server
  // query intentionally doesn't try to apply it.
  async function getGlobalAds() {
    try {
      const { data } = await sb.from('global_ads').select('*').eq('status', 'active');
      return (data||[]).map(r => {
        try { return typeof r.data === 'string' ? JSON.parse(r.data) : r.data; } catch { return r; }
      }).filter(a => !!a);
    } catch(e) { console.warn('[Ads] getGlobalAds failed:', e?.message); return []; }
  }
  // Return EVERY ad owned by a user, regardless of status or expiry. Used by
  // the Creator panel so the user can always see their full ad history
  // (active, expired, cancelled, taken_down) across devices.
  async function getAdsByOwner(username) {
    if (!username) return [];
    try {
      const { data } = await sb.from('global_ads').select('*').eq('owner', username);
      return (data||[]).map(r => {
        try { return typeof r.data === 'string' ? JSON.parse(r.data) : r.data; } catch { return r; }
      }).filter(Boolean);
    } catch(e) { console.warn('[Ads] getAdsByOwner failed:', e?.message); return []; }
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
      let payload = { ...thread };
      for (let i = 0; i < 5; i++) {
        const { data, error } = await sb.from('forum_threads').insert(payload);
        if (!error) return data;
        const msg = (error.message || '') + '';
        const m = msg.match(/column\s+"?(\w+)"?\s+of\s+relation|Could not find the '(\w+)' column/i);
        const unknown = m && (m[1] || m[2]);
        if (unknown && (unknown in payload)) {
          console.warn('[Forum] createForumThread: column "' + unknown + '" missing, retrying without it. Run supabase-schema.sql to enable.');
          delete payload[unknown];
          continue;
        }
        throw error;
      }
      return null;
    } catch(e) { console.warn('[Forum] createForumThread failed:', e?.message); throw e; }
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
      let payload = { ...post };
      for (let i = 0; i < 5; i++) {
        const { data, error } = await sb.from('forum_posts').insert(payload);
        if (!error) return data;
        const msg = (error.message || '') + '';
        const m = msg.match(/column\s+"?(\w+)"?\s+of\s+relation|Could not find the '(\w+)' column/i);
        const unknown = m && (m[1] || m[2]);
        if (unknown && (unknown in payload)) {
          console.warn('[Forum] createForumPost: column "' + unknown + '" missing, retrying without it. Run supabase-schema.sql to enable.');
          delete payload[unknown];
          continue;
        }
        throw error;
      }
      return null;
    } catch(e) { console.warn('[Forum] createForumPost failed:', e?.message); throw e; }
  }
  async function getForumPostsForThreads(threadIds) {
    if (!Array.isArray(threadIds) || !threadIds.length) return {};
    try {
      const { data } = await sb.from('forum_posts').select('*').in('thread_id', threadIds);
      const grouped = {};
      (data || []).forEach(p => { (grouped[p.thread_id] = grouped[p.thread_id] || []).push(p); });
      return grouped;
    } catch(e) { console.warn('[Forum] getForumPostsForThreads failed:', e?.message); return {}; }
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

  // Direct single-column write for active_decoration. Bypasses the full
  // saveUserObject pipeline (no _userToRow round-trip, no protected-row
  // merge against the existing DB row, no risk of an in-flight CU save
  // racing this one). Used by equipDecoration so a deco change can't be
  // dropped by an unrelated cosmetic save that happens to fire at the
  // same time. RLS-friendly: we only update the row matching the caller.
  async function saveActiveDecoration(username, decoId) {
    if (!username) return false;
    const value = decoId || null;
    console.log('[DECO][direct] UPDATE active_decoration =', JSON.stringify(value), 'for', username);
    try {
      const { data, error } = await sb
        .from('users')
        .update({ active_decoration: value })
        .eq('username', norm(username))
        .select('username, active_decoration')
        .maybeSingle();
      if (error) {
        console.error('[DECO][direct] UPDATE failed:', error.message, error.code);
        return false;
      }
      console.log('[DECO][direct] UPDATE ok — row now has active_decoration =', JSON.stringify(data?.active_decoration));
      // Evict both cache layers so the next getUserByName re-reads the
      // fresh value instead of serving the pre-update row.
      _cacheDel('user:' + norm(username));
      _cacheDel('userEnf:' + norm(username));
      return true;
    } catch (e) {
      console.error('[DECO][direct] UPDATE threw:', e?.message);
      return false;
    }
  }

  async function deleteAccount(username) {
    if (!username) return { ok: false, msg: 'No username provided' };
    try {
      const normUsername = norm(username);
      // Generate unique deletion ID to prevent username reuse
      const deletedId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      const deletedUsername = `deleted_user_${deletedId}`;

      // Delete status record first (foreign key constraint must be satisfied)
      const { error: statusError } = await sb
        .from('statuses')
        .delete()
        .eq('username', normUsername);

      if (statusError) {
        console.warn('[deleteAccount] Status deletion warning:', statusError.message);
        // Continue anyway — status might not exist
      }

      // Fetch existing row first to preserve extras under `raw` JSONB
      const { data: existing } = await sb
        .from('users')
        .select('raw')
        .eq('username', normUsername)
        .maybeSingle();

      // Mark deletion metadata in the raw JSONB column (extensible, no schema change)
      const newRaw = {
        ...(existing?.raw || {}),
        deleted: true,
        deletedAt: new Date().toISOString(),
        originalUsername: normUsername,
      };

      // Update user record: anonymize all personal data using snake_case DB columns
      const { error: updateError } = await sb
        .from('users')
        .update({
          username: deletedUsername,
          display_name: deletedUsername,
          bio: '',
          pfp: null,
          banner: null,
          email: '',
          password: '',
          status: 'offline',
          custom_status: null,
          game_activity: null,
          profile_theme: null,
          active_decoration: null,
          raw: newRaw,
        })
        .eq('username', normUsername);

      if (updateError) {
        console.error('[deleteAccount] User update failed:', updateError.message);
        return { ok: false, msg: 'Failed to delete account: ' + updateError.message };
      }

      // Clear cache for this user
      _cacheDel('user:' + normUsername);
      _cacheDel('userEnf:' + normUsername);

      console.log('[deleteAccount] Account deleted:', { original: normUsername, deleted: deletedUsername });
      return { ok: true, msg: 'Account successfully deleted' };
    } catch(e) {
      console.error('[deleteAccount] Exception:', e.message);
      return { ok: false, msg: 'Account deletion failed: ' + e.message };
    }
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
    getUserByName, getUserByPublicId, resolveUsername, getUserPublicId, ensureUserPublicId, getDMKey, saveUserObject, saveActiveDecoration, deleteAccount, invalidateUserCache,
    getStatus, setStatus,
    getNotifications, addNotification, markNotificationsRead, markNotificationReadBySource, getUnreadCount, getUnreadSummary, pruneNotifications, getStoredFieldLength, notifyMention,
    sendFriendRequest, acceptFriendRequest, acceptFriend, declineFriendRequest, cancelFriendRequest, removeFriend, syncRelationship,
    getDMMessages, sendDMMessage, editMessage, deleteMessage, getRecentDMPartners,
    getBastionChannelMessages, sendBastionChannelMessage, addReaction, toggleReaction,
    getGlobalBastions, saveGlobalBastion, getGlobalBastion, deleteGlobalBastion, clearBastionCache,
    getGlobalAds, getAdsByOwner, upsertGlobalAd, removeGlobalAd, getTakenDownAdIds,
    getAnnouncements, saveAnnouncements,
    getBastionMembers, addBastionMember, removeBastionMember,
    getInvite, saveInvite, incrementInviteUses,
    submitReport,
    // Admin API
    adminGetReports, adminSaveReport,
    getGameReviews, saveGameReview, deleteGameReview,
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
    adminGetSupportTickets, adminSaveSupportTickets, adminSubmitSupportTicket,
    getPlaceFeedback, submitPlaceFeedback, archivePlaceFeedback,
    getOnboardingInterestStats, submitOnboardingInterests,
    adminGetScheduledActions, adminSaveScheduledActions,
    adminPushNsfwAIFeedback, adminSaveNsfwSafeHash,
    adminSetSignal, adminGetSignal,
    adminGetFeedback, adminPushFeedback,
    adminInvalidateCache,
    adminGetDashboardStats,
    getForumThreads, getForumThread, createForumThread, updateForumThread, deleteForumThread,
    getForumPosts, getForumPostsForThreads, createForumPost, updateForumPost, deleteForumPost, searchForumThreads,
    uploadFile, getVoicePresence,
    startPolling, stopPolling, listenBastionChannel, listenDM,
    startDMPolling, stopDMPolling, startChannelPolling, stopChannelPolling,
    startGCPolling, stopGCPolling,
    adminGetAppealsQueue, adminSaveAppealsQueue, adminDeleteMessage,
    startFriendRequestPolling, stopFriendRequestPolling, startVoiceRoomPolling, stopVoiceRoomPolling,
    initSocket, getSocket, isSocketReady, isConnected, socketEmit,
    joinRoom, leaveRoom, queryPresence, disconnectSocket,
    playNotificationSound,
    _sb: sb,
  };

})();
