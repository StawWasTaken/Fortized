#!/usr/bin/env node
// ════════════════════════════════════════════════════
// FORTIZED — Firebase → Supabase Migration Script
// ════════════════════════════════════════════════════
// Reads ALL data from Firebase RTDB and inserts it into
// Supabase tables. Run this ONCE after setting up the
// Supabase schema (supabase-schema.sql).
//
// Usage:
//   1. Run supabase-schema.sql in your Supabase SQL editor first
//   2. npm install @supabase/supabase-js firebase-admin  (or firebase)
//   3. node migrate-firebase-to-supabase.js
//
// This script uses the Firebase REST API to avoid needing
// firebase-admin credentials. It reads via the public
// database URL since Fortized RTDB rules appear to be open.

const FIREBASE_DB_URL = 'https://fortized-5ffcf-default-rtdb.europe-west1.firebasedatabase.app';
const SUPABASE_URL    = 'https://ufnjjddqnicbzyjfawrb.supabase.co';
const SUPABASE_KEY    = 'sb_publishable__Iy5M2qrRBe0uT9mItaw_w_PBW-wHZT';

async function main() {
  // Dynamic import for ESM-only @supabase/supabase-js
  let createClient;
  try {
    const mod = await import('@supabase/supabase-js');
    createClient = mod.createClient;
  } catch {
    console.error('Install @supabase/supabase-js: npm install @supabase/supabase-js');
    process.exit(1);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── Fetch from Firebase REST API ──
  async function fbGet(path) {
    const url = `${FIREBASE_DB_URL}/${path}.json`;
    console.log(`  Fetching firebase: ${path}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Warning: Firebase GET ${path} returned ${res.status}`);
      return null;
    }
    return res.json();
  }

  // ── Batch upsert helper ──
  async function batchUpsert(table, rows, batchSize = 500) {
    if (!rows.length) { console.log(`  ${table}: 0 rows`); return; }
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await sb.from(table).upsert(batch, { onConflict: undefined, ignoreDuplicates: true });
      if (error) console.error(`  Error in ${table} batch ${i}:`, error.message);
    }
    console.log(`  ${table}: ${rows.length} rows migrated`);
  }

  console.log('═══════════════════════════════════════');
  console.log(' FORTIZED Firebase → Supabase Migration');
  console.log('═══════════════════════════════════════\n');

  // ── 1. Users ──
  console.log('[1/20] Migrating users...');
  const users = await fbGet('users');
  if (users) {
    const rows = Object.entries(users).map(([username, u]) => ({
      username,
      password: u.password || '',
      email: u.email || '',
      display_name: u.displayName || username,
      pfp: u.pfp || null,
      banner: u.banner || null,
      onyx: u.onyx ?? 25,
      status: u.status || 'offline',
      custom_status: u.customStatus || null,
      friends: u.friends || [],
      friend_requests_sent: u.friendRequestsSent || [],
      friend_requests_received: u.friendRequestsReceived || [],
      bastions: u.bastions || [],
      radiance_until: u.radianceUntil || null,
      radiance_plus: u.radiancePlus || null,
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
      raw: (() => {
        const known = new Set(['username','password','email','displayName','pfp','banner','onyx','status','customStatus','friends','friendRequestsSent','friendRequestsReceived','bastions','notifications','radianceUntil','radiancePlus','lastDaily','blockedUsers','ignoredUsers','groupChats','suspension','suspendedUntil','activeWarning','gameActivity','lastSeen','profileTheme','activeDecoration','bio','badges','connections','banned','banReason','createdAt']);
        const extra = {};
        for (const k of Object.keys(u)) { if (!known.has(k)) extra[k] = u[k]; }
        return Object.keys(extra).length ? extra : null;
      })(),
    }));
    await batchUpsert('users', rows);
  }

  // ── 2. Statuses ──
  console.log('[2/20] Migrating statuses...');
  const statuses = await fbGet('statuses');
  if (statuses) {
    const rows = Object.entries(statuses).map(([username, status]) => ({ username, status: status || 'offline' }));
    await batchUpsert('statuses', rows);
  }

  // ── 3. Notifications ──
  console.log('[3/20] Migrating notifications...');
  const notifications = await fbGet('notifications');
  if (notifications) {
    const rows = [];
    for (const [username, notifs] of Object.entries(notifications)) {
      if (!notifs || typeof notifs !== 'object') continue;
      for (const [id, n] of Object.entries(notifs)) {
        rows.push({
          id, username,
          type: n.type || null,
          from: n.from || null,
          time: n.time || null,
          read: n.read || false,
          data: n,
        });
      }
    }
    await batchUpsert('notifications', rows);
  }

  // ── 4. DM Index ──
  console.log('[4/20] Migrating DM index...');
  const dmIndex = await fbGet('dmIndex');
  if (dmIndex) {
    const rows = Object.entries(dmIndex).map(([username, partners]) => ({
      username,
      partners: Array.isArray(partners) ? partners : Object.values(partners || {}),
    }));
    await batchUpsert('dm_index', rows);
  }

  // ── 5. DMs ──
  console.log('[5/20] Migrating DMs...');
  const dms = await fbGet('dms');
  if (dms) {
    const rows = [];
    for (const [dmKey, messages] of Object.entries(dms)) {
      if (!messages || typeof messages !== 'object') continue;
      for (const [id, m] of Object.entries(messages)) {
        rows.push({
          dm_key: dmKey, id,
          from: m.from || null,
          text: m.text || '',
          time: m.time || null,
          timestamp: m.timestamp || null,
          edited: m.edited || false,
          new_text: m.newText || null,
          reactions: m.reactions || null,
        });
      }
    }
    await batchUpsert('dms', rows);
  }

  // ── 6. Global Bastions ──
  console.log('[6/20] Migrating global bastions...');
  const globalBastions = await fbGet('globalBastions');
  if (globalBastions) {
    const rows = Object.entries(globalBastions).map(([id, data]) => ({ id, data }));
    await batchUpsert('global_bastions', rows);
  }

  // ── 7. Bastion Members ──
  console.log('[7/20] Migrating bastion members...');
  const bastionMembers = await fbGet('bastionMembers');
  if (bastionMembers) {
    const rows = Object.entries(bastionMembers).map(([bastion_id, members]) => ({
      bastion_id,
      members: Array.isArray(members) ? members : Object.values(members || {}),
    }));
    await batchUpsert('bastion_members', rows);
  }

  // ── 8. Bastion Messages ──
  console.log('[8/20] Migrating bastion messages...');
  const bastionMsgs = await fbGet('bastionMsgs');
  if (bastionMsgs) {
    const rows = [];
    for (const [bastionId, channels] of Object.entries(bastionMsgs)) {
      if (!channels || typeof channels !== 'object') continue;
      for (const [channelId, messages] of Object.entries(channels)) {
        if (!messages || typeof messages !== 'object') continue;
        for (const [id, m] of Object.entries(messages)) {
          rows.push({
            bastion_id: bastionId, channel_id: channelId, id,
            from: m.from || null,
            text: m.text || '',
            time: m.time || null,
            timestamp: m.timestamp || null,
            edited: m.edited || false,
            reactions: m.reactions || null,
          });
        }
      }
    }
    await batchUpsert('bastion_msgs', rows);
  }

  // ── 9. Invites ──
  console.log('[9/20] Migrating invites...');
  const invites = await fbGet('invites');
  if (invites) {
    const rows = Object.entries(invites).map(([code, data]) => ({ code, data }));
    await batchUpsert('invites', rows);
  }

  // ── 10. Bastion Templates ──
  console.log('[10/20] Migrating bastion templates...');
  const templates = await fbGet('bastionTemplates');
  if (templates) {
    const rows = Object.entries(templates).map(([id, data]) => ({ id, data }));
    await batchUpsert('bastion_templates', rows);
  }

  // ── 11. Group Chats ──
  console.log('[11/20] Migrating group chats...');
  const groupChats = await fbGet('groupChats');
  if (groupChats) {
    const metaRows = [];
    const msgRows = [];
    for (const [gcId, gc] of Object.entries(groupChats)) {
      if (gc.meta) metaRows.push({ id: gcId, data: gc.meta });
      if (gc.messages && typeof gc.messages === 'object') {
        for (const [id, m] of Object.entries(gc.messages)) {
          msgRows.push({
            gc_id: gcId, id,
            from: m.from || null,
            text: m.text || '',
            time: m.time || null,
            timestamp: m.timestamp || null,
            edited: m.edited || false,
            data: m,
          });
        }
      }
    }
    await batchUpsert('group_chat_meta', metaRows);
    await batchUpsert('group_chat_messages', msgRows);
  }

  // ── 12. Admin: Bans ──
  console.log('[12/20] Migrating admin bans...');
  const bans = await fbGet('admin/bans');
  if (bans) {
    const rows = Object.entries(bans).map(([username, data]) => ({ username, data }));
    await batchUpsert('admin_bans', rows);
  }

  // ── 13. Admin: Staff ──
  console.log('[13/20] Migrating admin staff...');
  const staff = await fbGet('admin/staff');
  if (staff) {
    await sb.from('admin_staff').upsert({ id: 1, data: staff });
    console.log('  admin_staff: migrated');
  }

  // ── 14. Admin: Global Settings ──
  console.log('[14/20] Migrating admin global settings...');
  const gs = await fbGet('admin/global_settings');
  if (gs) {
    await sb.from('admin_global_settings').upsert({ id: 1, data: gs });
    console.log('  admin_global_settings: migrated');
  }

  // ── 15. Admin: Audit Log ──
  console.log('[15/20] Migrating admin audit log...');
  const auditLog = await fbGet('admin/audit_log');
  if (auditLog) {
    const rows = Object.entries(auditLog).map(([id, data]) => ({ id, data }));
    await batchUpsert('admin_audit_log', rows);
  }

  // ── 16. Reports ──
  console.log('[16/20] Migrating reports...');
  const reports = await fbGet('reports');
  if (reports) {
    const rows = Object.entries(reports).map(([id, data]) => ({ id, data }));
    await batchUpsert('reports', rows);
  }

  // ── 17. Support Tickets ──
  console.log('[17/20] Migrating support tickets...');
  const tickets = await fbGet('support/tickets');
  if (tickets) {
    const rows = Object.entries(tickets).map(([id, data]) => ({ id, username: data.username || null, data }));
    await batchUpsert('support_tickets', rows);
  }

  // ── 18. Feedback ──
  console.log('[18/20] Migrating feedback...');
  const feedback = await fbGet('feedback');
  if (feedback) {
    const rows = Object.entries(feedback).map(([id, data]) => ({ id: id.toString(), data }));
    await batchUpsert('feedback', rows);
  }

  // ── 19. NSFW Data ──
  console.log('[19/20] Migrating NSFW data...');
  const nsfwQueue = await fbGet('admin/nsfw_queue');
  if (nsfwQueue) {
    const rows = Object.entries(nsfwQueue).map(([id, data]) => ({ id, data }));
    await batchUpsert('admin_nsfw_queue', rows);
  }
  const nsfwHashes = await fbGet('admin/nsfw_banned_hashes');
  if (nsfwHashes) {
    await sb.from('admin_nsfw_banned_hashes').upsert({ id: 1, data: nsfwHashes });
    console.log('  admin_nsfw_banned_hashes: migrated');
  }

  // ── 20. Scheduled Actions ──
  console.log('[20/20] Migrating scheduled actions...');
  const scheduled = await fbGet('admin/scheduled_actions');
  if (scheduled) {
    const rows = Object.entries(scheduled).map(([id, data]) => ({ id, data }));
    await batchUpsert('admin_scheduled_actions', rows);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(' Migration complete!');
  console.log('═══════════════════════════════════════');
  console.log('\nNext steps:');
  console.log('1. Verify data in Supabase dashboard');
  console.log('2. Deploy the updated Fortized app');
  console.log('3. Test login, messaging, bastions');
  console.log('4. Once confirmed working, remove Firebase SDK references');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
