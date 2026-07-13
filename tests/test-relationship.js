// Relationship-engine harness: loads the REAL FortizedSocial-supabase.js
// against an in-memory Supabase mock with failure injection, then walks
// every friend-op scenario incl. half-applied-write repair.
'use strict';
const fs = require('fs');
const path = require('path');

// ── In-memory Supabase mock ────────────────────────────
const db = { users: [], notifications: [] };
const failures = []; // {op:'update'|'select', table, match:username, times}

function _shouldFail(op, table, row) {
  for (let i = 0; i < failures.length; i++) {
    const f = failures[i];
    if (f.op === op && f.table === table && (!f.match || (row && row.username === f.match))) {
      if (--f.times <= 0) failures.splice(i, 1);
      return true;
    }
  }
  return false;
}

function _clone(x) { return JSON.parse(JSON.stringify(x)); }

function mockFrom(table) {
  const rows = () => (db[table] = db[table] || []);
  return {
    select(cols) {
      const chain = {
        _filters: [],
        eq(col, val) { this._filters.push(r => r[col] === val); return this; },
        in(col, vals) { this._filters.push(r => vals.includes(r[col])); return this; },
        contains(col, obj) {
          this._filters.push(r => Object.entries(obj).every(([k, v]) => r[col] && r[col][k] === v));
          return this;
        },
        order() { return this; }, limit() { return this; }, range() { return this; },
        gt() { return this; }, gte() { return this; }, lt() { return this; }, lte() { return this; }, neq() { return this; }, or() { return this; }, ilike() { return this; },
        _run() {
          let out = rows().filter(r => this._filters.every(f => f(r)));
          if (cols && cols !== '*') {
            const wanted = cols.split(',').map(s => s.trim());
            out = out.map(r => { const o = {}; for (const c of wanted) o[c] = _clone(r[c] ?? null); return o; });
          } else out = _clone(out);
          return out;
        },
        maybeSingle() { const out = this._run(); return Promise.resolve({ data: out[0] || null, error: null }); },
        single() { const out = this._run(); return Promise.resolve({ data: out[0] || null, error: out[0] ? null : { message: 'no rows' } }); },
        then(res, rej) { return Promise.resolve({ data: this._run(), error: null }).then(res, rej); },
      };
      return chain;
    },
    update(patch) {
      return {
        eq(col, val) {
          const targets = rows().filter(r => r[col] === val);
          for (const t of targets) {
            if (_shouldFail('update', table, t)) return Promise.resolve({ data: null, error: { message: 'injected failure', code: 'MOCK' } });
            Object.assign(t, _clone(patch));
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    insert(row) {
      if (_shouldFail('insert', table, row)) return Promise.resolve({ data: null, error: { message: 'injected failure' } });
      rows().push(_clone(row));
      return Promise.resolve({ data: null, error: null });
    },
    upsert(row, opts) {
      const key = (opts && opts.onConflict) || 'username';
      const hit = rows().find(r => r[key] === row[key]);
      if (hit) Object.assign(hit, _clone(row)); else rows().push(_clone(row));
      return Promise.resolve({ data: null, error: null });
    },
    delete() { return { eq(col, val) { db[table] = rows().filter(r => r[col] !== val); return Promise.resolve({ data: null, error: null }); } }; },
  };
}

const mockSb = { from: mockFrom, rpc: () => Promise.resolve({ data: Math.floor(Math.random() * 100000), error: null }) };

// ── Browser globals the module expects ────────────────
const _lsStore = {};
global.localStorage = {
  getItem: k => (k in _lsStore ? _lsStore[k] : null),
  setItem: (k, v) => { _lsStore[k] = String(v); },
  removeItem: k => { delete _lsStore[k]; },
  key: i => Object.keys(_lsStore)[i] || null,
  get length() { return Object.keys(_lsStore).length; },
};
global.window = { addEventListener() {}, location: { hostname: 'test', href: '' }, navigator: { onLine: true } };
global.document = { addEventListener() {}, hidden: false, createElement: () => ({ style: {}, play() {} }), visibilityState: 'visible' };
Object.defineProperty(global, 'navigator', { value: { onLine: true }, configurable: true });
global.supabase = { createClient: () => mockSb };
global.io = undefined; // socket.io absent — socketEmit must degrade silently
global.Audio = function () { return { play: () => Promise.resolve() }; };

// ── Load the real module ───────────────────────────────
const src = fs.readFileSync(path.join(__dirname, '..', 'FortizedSocial-supabase.js'), 'utf8');
eval(src + '\nglobal.FortizedSocial = FortizedSocial;');
const FS = global.FortizedSocial;

// ── Test helpers ───────────────────────────────────────
function seedUser(username, extra) {
  db.users.push(Object.assign({
    username, display_name: username, pfp: '', banner: '', bio: '',
    friends: [], friend_requests_sent: [], friend_requests_received: [],
    blocked_users: [], ignored_users: [], group_chats: [], bastions: [],
    onyx: 0, status: 'offline', raw: { id: 'ftz-u' + Math.floor(Math.random() * 99999) },
    created_at: new Date().toISOString(),
  }, extra || {}));
}
function row(u) { return db.users.find(r => r.username === u); }
function resetDb() { db.users.length = 0; db.notifications.length = 0; failures.length = 0; }

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}
function eqSet(a, b) { return JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort()); }

(async () => {
  // ── 1. send → symmetric pending ──────────────────────
  console.log('\n[1] sendFriendRequest writes both halves');
  resetDb(); seedUser('alice'); seedUser('bob');
  let r = await FS.sendFriendRequest('alice', 'bob');
  ok(r.ok === true, 'send ok');
  ok(eqSet(row('alice').friend_requests_sent, ['bob']), 'alice.sent = [bob]');
  ok(eqSet(row('bob').friend_requests_received, ['alice']), 'bob.received = [alice]');
  ok(db.notifications.some(n => n.username === 'bob' && n.type === 'friend_request'), 'bob notified');

  // duplicate send refused
  r = await FS.sendFriendRequest('alice', 'bob');
  ok(r.ok === false && /already sent/i.test(r.msg), 'duplicate send refused');

  // ── 2. accept → symmetric friends ────────────────────
  console.log('\n[2] acceptFriendRequest converges both rows');
  r = await FS.acceptFriendRequest('bob', 'alice');
  ok(r.ok === true, 'accept ok');
  ok(eqSet(row('alice').friends, ['bob']) && eqSet(row('bob').friends, ['alice']), 'both rows say friends');
  ok(eqSet(row('alice').friend_requests_sent, []) && eqSet(row('bob').friend_requests_received, []), 'requests cleared both sides');
  ok(!!(row('alice').raw.friendsSince || {}).bob && !!(row('bob').raw.friendsSince || {}).alice, 'friendsSince stamped both sides');

  // ── 3. remove → symmetric none ───────────────────────
  console.log('\n[3] removeFriend clears both rows');
  r = await FS.removeFriend('alice', 'bob');
  ok(r.ok === true, 'remove ok');
  ok(eqSet(row('alice').friends, []) && eqSet(row('bob').friends, []), 'both rows cleared');

  // ── 4. HALF-ACCEPT legacy damage → syncRelationship repairs to friends ──
  console.log('\n[4] syncRelationship completes a half-applied accept');
  resetDb(); seedUser('alice', { friend_requests_sent: ['bob'] }); seedUser('bob', { friends: ['alice'] });
  r = await FS.syncRelationship('alice', 'bob');
  ok(r.ok === true && r.state === 'friends', 'sync → friends');
  ok(eqSet(row('alice').friends, ['bob']) && eqSet(row('bob').friends, ['alice']), 'both rows friends after repair');
  ok(eqSet(row('alice').friend_requests_sent, []), 'stale sent-half cleared');

  // ── 5. HALF-REMOVE legacy damage → repairs to none ───
  console.log('\n[5] syncRelationship completes a half-applied remove');
  resetDb(); seedUser('alice', { friends: ['bob'] }); seedUser('bob');
  r = await FS.syncRelationship('alice', 'bob');
  ok(r.ok === true && r.state === 'none', 'sync → none');
  ok(eqSet(row('alice').friends, []), 'dangling friendship removed');

  // ── 6. accept with the accepter's own row write failing once → retry heals ──
  console.log('\n[6] accept retries through a one-shot write failure');
  resetDb(); seedUser('alice', { friend_requests_sent: ['bob'] }); seedUser('bob', { friend_requests_received: ['alice'] });
  failures.push({ op: 'update', table: 'users', match: 'bob', times: 1 });
  r = await FS.acceptFriendRequest('bob', 'alice');
  ok(r.ok === true, 'accept ok despite one failure');
  ok(eqSet(row('alice').friends, ['bob']) && eqSet(row('bob').friends, ['alice']), 'symmetric after retry');

  // ── 7. accept with persistent failure → honest ok:false, requester row intact first ──
  console.log('\n[7] persistent failure reports ok:false and leaves a completable state');
  resetDb(); seedUser('alice', { friend_requests_sent: ['bob'] }); seedUser('bob', { friend_requests_received: ['alice'] });
  failures.push({ op: 'update', table: 'users', match: 'bob', times: 99 });
  r = await FS.acceptFriendRequest('bob', 'alice');
  ok(r.ok === false, 'reports failure honestly');
  ok(eqSet(row('alice').friends, ['bob']), "requester's row written first (completable)");
  ok(eqSet(row('bob').friend_requests_received, ['alice']), "accepter keeps the incoming request → retry affordance");
  failures.length = 0;
  // …and the next sync self-heals the half-accept
  r = await FS.syncRelationship('alice', 'bob');
  ok(r.ok && r.state === 'friends' && eqSet(row('bob').friends, ['alice']), 'later sync completes the accept');

  // ── 8. decline is silent + receiver-authoritative; crossed outgoing survives ──
  console.log('\n[8] decline clears the pair; crossed outgoing survives');
  resetDb();
  seedUser('alice', { friend_requests_sent: ['bob'], friend_requests_received: ['bob'] });
  seedUser('bob', { friend_requests_sent: ['alice'], friend_requests_received: ['alice'] });
  // bob declines alice's request; bob's own outgoing to alice must survive
  const notifsBefore = db.notifications.length;
  r = await FS.declineFriendRequest('bob', 'alice');
  ok(r.ok === true, 'decline ok');
  ok(eqSet(row('bob').friend_requests_received, []), "alice's request gone from bob");
  ok(eqSet(row('alice').friend_requests_sent, []), "alice's sent-half cleared");
  ok(eqSet(row('bob').friend_requests_sent, ['alice']) && eqSet(row('alice').friend_requests_received, ['bob']), "bob's own outgoing survives");
  ok(db.notifications.length === notifsBefore, 'decline sent NO notification');

  // ── 9. cancel clears own outgoing; their crossed outgoing survives ──
  console.log('\n[9] cancel clears own outgoing only');
  resetDb();
  seedUser('alice', { friend_requests_sent: ['bob'], friend_requests_received: ['bob'] });
  seedUser('bob', { friend_requests_sent: ['alice'], friend_requests_received: ['alice'] });
  r = await FS.cancelFriendRequest('alice', 'bob');
  ok(r.ok === true, 'cancel ok');
  ok(eqSet(row('alice').friend_requests_sent, []) && eqSet(row('bob').friend_requests_received, []), 'my outgoing gone both sides');
  ok(eqSet(row('bob').friend_requests_sent, ['alice']) && eqSet(row('alice').friend_requests_received, ['bob']), "their outgoing intact");

  // ── 10. mutual pending auto-accepts on send ──────────
  console.log('\n[10] crossed requests auto-accept');
  resetDb(); seedUser('alice'); seedUser('bob', { friend_requests_sent: ['alice'] });
  // seed the receiver half for receiver-authoritative pending
  row('alice').friend_requests_received = ['bob'];
  r = await FS.sendFriendRequest('alice', 'bob');
  ok(r.ok === true && r.accepted === true, 'send reports instant accept');
  ok(eqSet(row('alice').friends, ['bob']) && eqSet(row('bob').friends, ['alice']), 'both rows friends');
  ok(eqSet(row('alice').friend_requests_received, []) && eqSet(row('bob').friend_requests_sent, []), 'pendings consumed');

  // ── 11. blocks: refuse send both directions, vague msg for blocked sender ──
  console.log('\n[11] block guards');
  resetDb(); seedUser('alice'); seedUser('bob', { blocked_users: ['alice'] });
  r = await FS.sendFriendRequest('alice', 'bob');
  ok(r.ok === false && !/block/i.test(r.msg), 'blocked sender gets vague refusal');
  r = await FS.sendFriendRequest('bob', 'alice');
  ok(r.ok === false && /unblock/i.test(r.msg), 'blocker told to unblock first');
  // block dissolves an existing friendship on sync
  resetDb(); seedUser('alice', { friends: ['bob'] }); seedUser('bob', { friends: ['alice'], blocked_users: ['alice'] });
  r = await FS.syncRelationship('alice', 'bob');
  ok(r.state === 'none' && eqSet(row('alice').friends, []) && eqSet(row('bob').friends, []), 'sync dissolves friendship under block');

  // ── 12. ignore stays silent: sender-half leftovers never resurrect ──
  console.log('\n[12] receiver-authoritative pendings (silent ignore)');
  resetDb();
  seedUser('alice', { friend_requests_sent: ['bob'] }); // leftover sender half, receiver already ignored
  seedUser('bob');
  r = await FS.syncRelationship('alice', 'bob');
  ok(r.state === 'none' && eqSet(row('alice').friend_requests_sent, []), 'leftover sender-half cleaned, not resurrected');

  // ── 13. implicit saveUserObject can NEVER write relationship columns ──
  console.log('\n[13] delta-save mask on relationship columns');
  resetDb(); seedUser('alice', { friends: ['bob'], friend_requests_received: ['carol'] }); seedUser('bob', { friends: ['alice'] });
  const cu = await FS.getUserByName('alice', { noCache: true }); // establishes baseline
  cu.friends = [];                       // stale/garbage CU state
  cu.friendRequestsSent = ['zombie'];
  cu.friendRequestsReceived = [];
  cu.bio = 'new bio';                    // legit change rides along
  await FS.saveUserObject(cu);
  ok(eqSet(row('alice').friends, ['bob']), 'friends untouched by implicit save');
  ok(eqSet(row('alice').friend_requests_sent, []), 'sent untouched (no zombie)');
  ok(eqSet(row('alice').friend_requests_received, ['carol']), 'received untouched');
  ok(row('alice').bio === 'new bio', 'non-relationship change still saved');

  // ── 14. explicit-field save still may write them (admin tools) ──
  console.log('\n[14] explicit-field save bypasses the mask');
  const cu2 = await FS.getUserByName('alice', { noCache: true });
  cu2.friends = ['bob', 'dave'];
  await FS.saveUserObject(cu2, { fields: ['friends'] });
  ok(eqSet(row('alice').friends, ['bob', 'dave']), 'explicit friends write lands');

  console.log('\n════════════════════════════');
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH:', e); process.exit(2); });
