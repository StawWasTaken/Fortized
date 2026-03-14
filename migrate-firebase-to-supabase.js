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
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbmpqZGRxbmljYnp5amZhd3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTkzMjgsImV4cCI6MjA4ODIzNTMyOH0.5Sfc_wQO6T3mQT6lqsPTAntqyxhDZJqTrZ3GNkyQSEk';

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

  // ── Track migration stats ──
  const stats = { total: 0, success: 0, failed: 0, errors: [] };

  // ── Fetch from Firebase REST API with retry ──
  async function fbGet(path, retries = 3) {
    const url = `${FIREBASE_DB_URL}/${path}.json`;
    console.log(`  Fetching firebase: ${path}`);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`  Warning: Firebase GET ${path} returned ${res.status} (attempt ${attempt}/${retries})`);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
            continue;
          }
          return null;
        }
        return res.json();
      } catch (err) {
        console.warn(`  Network error fetching ${path} (attempt ${attempt}/${retries}):`, err.message);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }
    }
    return null;
  }

  // ── Batch upsert helper with proper conflict handling ──
  async function batchUpsert(table, rows, options = {}) {
    const { batchSize = 500, conflictColumn } = options;
    if (!rows.length) { console.log(`  ${table}: 0 rows — skipped`); return 0; }

    let migrated = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const upsertOpts = {};
      if (conflictColumn) upsertOpts.onConflict = conflictColumn;

      // Try upsert first, fall back to individual inserts on error
      const { error } = await sb.from(table).upsert(batch, upsertOpts);
      if (error) {
        console.warn(`  Batch upsert error in ${table} (batch ${i}–${i + batch.length}): ${error.message}`);
        console.log(`  Retrying ${table} batch row-by-row...`);

        // Insert one by one to save as many rows as possible
        for (const row of batch) {
          const { error: rowErr } = await sb.from(table).upsert(row, upsertOpts);
          if (rowErr) {
            stats.errors.push(`${table}: ${rowErr.message} (row: ${JSON.stringify(row).slice(0, 100)})`);
            stats.failed++;
          } else {
            migrated++;
          }
        }
      } else {
        migrated += batch.length;
      }
    }
    stats.total += rows.length;
    stats.success += migrated;
    console.log(`  ${table}: ${migrated}/${rows.length} rows migrated`);
    return migrated;
  }

  // ── Verify row counts ──
  async function verifyCount(table, expected) {
    const { count } = await sb.from(table).select('*', { count: 'exact', head: true });
    const actual = count || 0;
    const status = actual >= expected ? '✓' : '✗ MISMATCH';
    console.log(`  Verify ${table}: ${actual} rows in Supabase (expected ${expected}) ${status}`);
    return actual;
  }

  console.log('═══════════════════════════════════════');
  console.log(' FORTIZED Firebase → Supabase Migration');
  console.log('═══════════════════════════════════════\n');

  // ── 1. Users ──
  console.log('[1/23] Migrating users...');
  const users = await fbGet('users');
  let userCount = 0;
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
    userCount = rows.length;
    await batchUpsert('users', rows, { conflictColumn: 'username' });
  }

  // ── 2. Statuses ──
  console.log('[2/23] Migrating statuses...');
  const statuses = await fbGet('statuses');
  if (statuses) {
    const rows = Object.entries(statuses).map(([username, status]) => ({ username, status: status || 'offline' }));
    await batchUpsert('statuses', rows, { conflictColumn: 'username' });
  }

  // ── 3. Notifications ──
  console.log('[3/23] Migrating notifications...');
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
    await batchUpsert('notifications', rows, { conflictColumn: 'username,id' });
  }

  // ── 4. DM Index ──
  console.log('[4/23] Migrating DM index...');
  const dmIndex = await fbGet('dmIndex');
  if (dmIndex) {
    const rows = Object.entries(dmIndex).map(([username, partners]) => ({
      username,
      partners: Array.isArray(partners) ? partners : Object.values(partners || {}),
    }));
    await batchUpsert('dm_index', rows, { conflictColumn: 'username' });
  }

  // ── 5. DMs ──
  console.log('[5/23] Migrating DMs...');
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
    await batchUpsert('dms', rows, { conflictColumn: 'dm_key,id' });
  }

  // ── 6. Global Bastions ──
  console.log('[6/23] Migrating global bastions...');
  const globalBastions = await fbGet('globalBastions');
  if (globalBastions) {
    const rows = Object.entries(globalBastions).map(([id, data]) => ({ id, data }));
    await batchUpsert('global_bastions', rows, { conflictColumn: 'id' });
  }

  // ── 7. Bastions (separate from globalBastions) ──
  console.log('[7/23] Migrating bastions...');
  const bastions = await fbGet('bastions');
  if (bastions) {
    const rows = Object.entries(bastions).map(([id, data]) => ({ id, data }));
    await batchUpsert('bastions', rows, { conflictColumn: 'id' });
  }

  // ── 8. Bastion Members ──
  console.log('[8/23] Migrating bastion members...');
  const bastionMembers = await fbGet('bastionMembers');
  if (bastionMembers) {
    const rows = Object.entries(bastionMembers).map(([bastion_id, members]) => ({
      bastion_id,
      members: Array.isArray(members) ? members : Object.values(members || {}),
    }));
    await batchUpsert('bastion_members', rows, { conflictColumn: 'bastion_id' });
  }

  // ── 9. Bastion Messages ──
  console.log('[9/23] Migrating bastion messages...');
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
    await batchUpsert('bastion_msgs', rows, { conflictColumn: 'bastion_id,channel_id,id' });
  }

  // ── 10. Bastion Polls ──
  console.log('[10/23] Migrating bastion polls...');
  const bastionPolls = await fbGet('bastionPolls');
  if (bastionPolls) {
    const rows = [];
    for (const [bastionId, channels] of Object.entries(bastionPolls)) {
      if (!channels || typeof channels !== 'object') continue;
      for (const [channelName, polls] of Object.entries(channels)) {
        if (!polls || typeof polls !== 'object') continue;
        for (const [id, pollData] of Object.entries(polls)) {
          rows.push({
            bastion_id: bastionId,
            channel_name: channelName,
            id,
            data: pollData,
          });
        }
      }
    }
    await batchUpsert('polls', rows, { conflictColumn: 'bastion_id,channel_name,id' });
  }

  // ── 11. Invites ──
  console.log('[11/23] Migrating invites...');
  const invites = await fbGet('invites');
  if (invites) {
    const rows = Object.entries(invites).map(([code, data]) => ({ code, data }));
    await batchUpsert('invites', rows, { conflictColumn: 'code' });
  }

  // ── 12. Bastion Templates ──
  console.log('[12/23] Migrating bastion templates...');
  const templates = await fbGet('bastionTemplates');
  if (templates) {
    const rows = Object.entries(templates).map(([id, data]) => ({ id, data }));
    await batchUpsert('bastion_templates', rows, { conflictColumn: 'id' });
  }

  // ── 13. Group Chats ──
  console.log('[13/23] Migrating group chats...');
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
    await batchUpsert('group_chat_meta', metaRows, { conflictColumn: 'id' });
    await batchUpsert('group_chat_messages', msgRows, { conflictColumn: 'gc_id,id' });
  }

  // ── 14. VC Signal ──
  console.log('[14/23] Migrating VC signal data...');
  const vcSignal = await fbGet('vcSignal');
  if (vcSignal) {
    const rows = [];
    // vcSignal can be nested — flatten to path→data pairs
    function flattenVcSignal(obj, prefix = '') {
      for (const [key, val] of Object.entries(obj)) {
        const path = prefix ? `${prefix}/${key}` : key;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          // Check if this is a leaf node with signal data (has type/sdp/candidate)
          if (val.type || val.sdp || val.candidate || val.candidates) {
            rows.push({ path, data: val });
          } else {
            flattenVcSignal(val, path);
          }
        } else {
          rows.push({ path, data: { value: val } });
        }
      }
    }
    flattenVcSignal(vcSignal);
    if (rows.length) {
      await batchUpsert('vc_signal', rows, { conflictColumn: 'path' });
    } else {
      // Store the whole thing as a single entry if structure is unclear
      await batchUpsert('vc_signal', [{ path: '_root', data: vcSignal }], { conflictColumn: 'path' });
    }
  }

  // ── 15. Admin: Bans ──
  console.log('[15/23] Migrating admin bans...');
  const bans = await fbGet('admin/bans');
  if (bans) {
    const rows = Object.entries(bans).map(([username, data]) => ({ username, data }));
    await batchUpsert('admin_bans', rows, { conflictColumn: 'username' });
  }

  // ── 16. Admin: Staff ──
  console.log('[16/23] Migrating admin staff...');
  const staff = await fbGet('admin/staff');
  if (staff) {
    const { error } = await sb.from('admin_staff').upsert({ id: 1, data: staff }, { onConflict: 'id' });
    if (error) {
      console.error('  Error migrating admin_staff:', error.message);
      stats.failed++;
    } else {
      stats.success++;
      console.log('  admin_staff: migrated');
    }
    stats.total++;
  }

  // ── 17. Admin: Global Settings ──
  console.log('[17/23] Migrating admin global settings...');
  const gs = await fbGet('admin/global_settings');
  if (gs) {
    const { error } = await sb.from('admin_global_settings').upsert({ id: 1, data: gs }, { onConflict: 'id' });
    if (error) {
      console.error('  Error migrating admin_global_settings:', error.message);
      stats.failed++;
    } else {
      stats.success++;
      console.log('  admin_global_settings: migrated');
    }
    stats.total++;
  }

  // ── 18. Admin: Audit Log ──
  console.log('[18/23] Migrating admin audit log...');
  const auditLog = await fbGet('admin/audit_log');
  if (auditLog) {
    const rows = Object.entries(auditLog).map(([id, data]) => ({ id, data }));
    await batchUpsert('admin_audit_log', rows, { conflictColumn: 'id' });
  }

  // ── 19. Reports ──
  console.log('[19/23] Migrating reports...');
  const reports = await fbGet('reports');
  if (reports) {
    const rows = Object.entries(reports).map(([id, data]) => ({ id, data }));
    await batchUpsert('reports', rows, { conflictColumn: 'id' });
  }

  // ── 20. Support Tickets ──
  console.log('[20/23] Migrating support tickets...');
  const tickets = await fbGet('support/tickets');
  if (tickets) {
    const rows = Object.entries(tickets).map(([id, data]) => ({ id, username: data.username || null, data }));
    await batchUpsert('support_tickets', rows, { conflictColumn: 'id' });
  }

  // ── 21. Feedback ──
  console.log('[21/23] Migrating feedback...');
  const feedback = await fbGet('feedback');
  if (feedback) {
    const rows = Object.entries(feedback).map(([id, data]) => ({ id: id.toString(), data }));
    await batchUpsert('feedback', rows, { conflictColumn: 'id' });
  }

  // ── 22. NSFW Data ──
  console.log('[22/23] Migrating NSFW data...');
  const nsfwQueue = await fbGet('admin/nsfw_queue');
  if (nsfwQueue) {
    const rows = Object.entries(nsfwQueue).map(([id, data]) => ({ id, data }));
    await batchUpsert('admin_nsfw_queue', rows, { conflictColumn: 'id' });
  }
  const nsfwHashes = await fbGet('admin/nsfw_banned_hashes');
  if (nsfwHashes) {
    const { error } = await sb.from('admin_nsfw_banned_hashes').upsert({ id: 1, data: nsfwHashes }, { onConflict: 'id' });
    if (error) console.error('  Error migrating nsfw hashes:', error.message);
    else console.log('  admin_nsfw_banned_hashes: migrated');
  }

  // ── 23. Scheduled Actions ──
  console.log('[23/23] Migrating scheduled actions...');
  const scheduled = await fbGet('admin/scheduled_actions');
  if (scheduled) {
    const rows = Object.entries(scheduled).map(([id, data]) => ({ id, data }));
    await batchUpsert('admin_scheduled_actions', rows, { conflictColumn: 'id' });
  }

  // ══════════════════════════════════════════════════
  // VERIFICATION
  // ══════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════');
  console.log(' Verifying migration...');
  console.log('═══════════════════════════════════════\n');

  if (users)           await verifyCount('users',           Object.keys(users).length);
  if (statuses)        await verifyCount('statuses',        Object.keys(statuses).length);
  if (dmIndex)         await verifyCount('dm_index',        Object.keys(dmIndex).length);
  if (globalBastions)  await verifyCount('global_bastions', Object.keys(globalBastions).length);
  if (bastions)        await verifyCount('bastions',        Object.keys(bastions).length);
  if (invites)         await verifyCount('invites',         Object.keys(invites).length);

  // Count DM messages
  if (dms) {
    let dmMsgCount = 0;
    for (const msgs of Object.values(dms)) {
      if (msgs && typeof msgs === 'object') dmMsgCount += Object.keys(msgs).length;
    }
    await verifyCount('dms', dmMsgCount);
  }

  // Count bastion messages
  if (bastionMsgs) {
    let bMsgCount = 0;
    for (const channels of Object.values(bastionMsgs)) {
      if (!channels || typeof channels !== 'object') continue;
      for (const msgs of Object.values(channels)) {
        if (msgs && typeof msgs === 'object') bMsgCount += Object.keys(msgs).length;
      }
    }
    await verifyCount('bastion_msgs', bMsgCount);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(' Migration complete!');
  console.log(`  Total items:  ${stats.total}`);
  console.log(`  Succeeded:    ${stats.success}`);
  console.log(`  Failed:       ${stats.failed}`);
  if (stats.errors.length) {
    console.log(`\n  Errors (first 20):`);
    stats.errors.slice(0, 20).forEach(e => console.log(`    - ${e}`));
  }
  console.log('═══════════════════════════════════════');
  console.log('\nNext steps:');
  console.log('1. Review the verification counts above');
  console.log('2. Run the "bastions" table CREATE in Supabase SQL editor if not already done');
  console.log('3. Deploy the updated Fortized app');
  console.log('4. Test login, messaging, bastions');
  console.log('5. Once confirmed working, remove Firebase SDK references');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
