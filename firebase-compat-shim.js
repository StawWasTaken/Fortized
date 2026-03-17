// ════════════════════════════════════════════════════
// FORTIZED — Firebase-to-Supabase Compatibility Shim
// ════════════════════════════════════════════════════
// Provides a firebase.database().ref() compatible API that
// routes all reads/writes through Supabase. This lets the
// 160+ direct firebase calls in app/index.html keep working
// without rewriting each one individually.
//
// Loaded AFTER FortizedSocial-supabase.js so sb client exists.

(function() {
  'use strict';

  if (typeof FortizedSocial === 'undefined') {
    console.warn('[Fortized] FortizedSocial not available — firebase shim running in stub mode');
    // Install a minimal firebase stub so app code doesn't crash
    window.firebase = window.firebase || {};
    window.firebase.apps = window.firebase.apps || [{ name: 'offline-stub' }];
    window.firebase.initializeApp = window.firebase.initializeApp || function() {};
    window.firebase.database = function() {
      return { ref: function() {
        var noop = function() { return Promise.resolve({ exists: function(){return false;}, val: function(){return null;} }); };
        var stub = { get: noop, set: noop, update: noop, remove: noop, push: function(){return stub;}, once: function(e,cb){if(cb)cb({exists:function(){return false;},val:function(){return null;}});return noop();}, on: function(){}, off: function(){}, onDisconnect: function(){return {set:noop,remove:noop};}, child: function(){return stub;}, orderByChild: function(){return stub;}, equalTo: function(){return stub;}, limitToLast: function(){return stub;}, limitToFirst: function(){return stub;} };
        return stub;
      }};
    };
    console.log('[Fortized] Firebase offline stub installed');
    return;
  }

  const sb = FortizedSocial.sb;

  // ── Path → table/key mapping ────────────────────────
  // Firebase paths like "users/staw" → { table: 'users', pk: 'staw' }
  function parsePath(path) {
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    return parts;
  }

  // ── Supabase table routing ──────────────────────────
  // Maps Firebase RTDB paths to Supabase tables + operations

  // Helper: get a value from nested object by path segments
  function getNestedValue(obj, keys) {
    let current = obj;
    for (const k of keys) {
      if (current == null) return undefined;
      current = current[k];
    }
    return current;
  }

  // Helper: set a value in nested object by path segments
  function setNestedValue(obj, keys, val) {
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] == null) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = val;
    return obj;
  }

  // ── Core: read from Supabase based on Firebase path ──
  async function supaGet(pathStr) {
    const parts = parsePath(pathStr);

    // users/{username}
    if (parts[0] === 'users' && parts.length >= 2) {
      const { data } = await sb.from('users').select('*').eq('username', parts[1]).maybeSingle();
      if (!data) return null;
      const user = FortizedSocial._userFromRow(data);
      if (parts.length === 2) return user;
      return getNestedValue(user, parts.slice(2));
    }

    // statuses or statuses/{username}
    if (parts[0] === 'statuses') {
      if (parts.length === 1) {
        const { data } = await sb.from('statuses').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.username] = r.status; });
        return result;
      }
      const { data } = await sb.from('statuses').select('status').eq('username', parts[1]).maybeSingle();
      return data?.status || null;
    }

    // notifications/{username}
    if (parts[0] === 'notifications' && parts.length >= 2) {
      const { data } = await sb.from('notifications').select('*').eq('username', parts[1]);
      if (!data || !data.length) return null;
      const result = {};
      data.forEach(r => {
        result[r.id] = { ...(r.data || {}), id: r.id, type: r.type, from: r.from, time: r.time, read: r.read };
      });
      if (parts.length > 2) return getNestedValue(result, parts.slice(2));
      return result;
    }

    // dms/{key} or dms/{key}/{msgId}
    if (parts[0] === 'dms') {
      if (parts.length >= 2) {
        const { data } = await sb.from('dms').select('*').eq('dm_key', parts[1]).order('timestamp', { ascending: true });
        const result = {};
        (data || []).forEach(r => { result[r.id] = { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, edited: r.edited, reactions: r.reactions, forwarded: r.forwarded || false, forwardedBy: r.forwarded_by || undefined }; });
        if (parts.length > 2) return getNestedValue(result, parts.slice(2));
        return result;
      }
      return null;
    }

    // dmIndex/{username}
    if (parts[0] === 'dmIndex') {
      const { data } = await sb.from('dm_index').select('partners').eq('username', parts[1]).maybeSingle();
      return data?.partners || null;
    }

    // bastionMsgs/{bastionId}/{channelId} or deeper
    if (parts[0] === 'bastionMsgs') {
      if (parts.length >= 3) {
        const { data } = await sb.from('bastion_msgs').select('*')
          .eq('bastion_id', parts[1]).eq('channel_id', parts[2])
          .order('timestamp', { ascending: true });
        const result = {};
        (data || []).forEach(r => { result[r.id] = { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, edited: r.edited, reactions: r.reactions }; });
        if (parts.length > 3) return getNestedValue(result, parts.slice(3));
        return result;
      }
      return null;
    }

    // bastionMembers/{bastionId}
    if (parts[0] === 'bastionMembers') {
      const { data } = await sb.from('bastion_members').select('members').eq('bastion_id', parts[1]).maybeSingle();
      return data?.members || null;
    }

    // globalBastions or globalBastions/{id}
    if (parts[0] === 'globalBastions') {
      if (parts.length === 1) {
        const { data } = await sb.from('global_bastions').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
      const { data } = await sb.from('global_bastions').select('data').eq('id', parts[1]).maybeSingle();
      const bastion = data?.data || null;
      if (parts.length > 2 && bastion) return getNestedValue(bastion, parts.slice(2));
      return bastion;
    }

    // invites or invites/{code}
    if (parts[0] === 'invites') {
      if (parts.length === 1) {
        const { data } = await sb.from('invites').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.code] = r.data; });
        return result;
      }
      const { data } = await sb.from('invites').select('data').eq('code', parts[1]).maybeSingle();
      return data?.data || null;
    }

    // bastionTemplates or bastionTemplates/{id}
    if (parts[0] === 'bastionTemplates') {
      if (parts.length === 1) {
        const { data } = await sb.from('bastion_templates').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
      const { data } = await sb.from('bastion_templates').select('data').eq('id', parts[1]).maybeSingle();
      return data?.data || null;
    }

    // groupChats/{gcId}/meta
    if (parts[0] === 'groupChats' && parts.length >= 2) {
      if (parts.length >= 3 && parts[2] === 'meta') {
        const { data } = await sb.from('group_chat_meta').select('data').eq('id', parts[1]).maybeSingle();
        const meta = data?.data || null;
        if (parts.length > 3 && meta) return getNestedValue(meta, parts.slice(3));
        return meta;
      }
      if (parts.length >= 3 && parts[2] === 'messages') {
        const { data } = await sb.from('group_chat_messages').select('*').eq('gc_id', parts[1]).order('timestamp', { ascending: true });
        const result = {};
        (data || []).forEach(r => { result[r.id] = { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, edited: r.edited, ...(r.data || {}) }; });
        if (parts.length > 3) return getNestedValue(result, parts.slice(3));
        return result;
      }
      if (parts.length >= 3 && parts[2] === 'typing') {
        const tPath = parts.slice(0, 3).join('/');
        const { data } = await sb.from('typing').select('*').eq('path', tPath);
        const result = {};
        (data || []).forEach(r => { result[r.username] = r.ts; });
        if (parts.length > 3) return getNestedValue(result, parts.slice(3));
        return result;
      }
      return null;
    }

    // admin/bans, admin/bans/{username}
    if (parts[0] === 'admin') {
      if (parts[1] === 'bans') {
        if (parts.length === 2) {
          const { data } = await sb.from('admin_bans').select('*');
          const result = {};
          (data || []).forEach(r => { result[r.username] = r.data; });
          return result;
        }
        const { data } = await sb.from('admin_bans').select('data').eq('username', parts[2]).maybeSingle();
        return data?.data || null;
      }
      if (parts[1] === 'staff') {
        const { data } = await sb.from('admin_staff').select('data').eq('id', 1).maybeSingle();
        return data?.data || [];
      }
      if (parts[1] === 'global_settings') {
        const { data } = await sb.from('admin_global_settings').select('data').eq('id', 1).maybeSingle();
        const gs = data?.data || {};
        if (parts.length > 2) return getNestedValue(gs, parts.slice(2));
        return gs;
      }
      if (parts[1] === 'audit_log') {
        const { data } = await sb.from('admin_audit_log').select('*').order('created_at', { ascending: false });
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
      if (parts[1] === 'nsfw_queue') {
        if (parts.length > 2) {
          const { data } = await sb.from('admin_nsfw_queue').select('data').eq('id', parts[2]).maybeSingle();
          return data?.data || null;
        }
        const { data } = await sb.from('admin_nsfw_queue').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
      if (parts[1] === 'nsfw_banned_hashes') {
        const { data } = await sb.from('admin_nsfw_banned_hashes').select('data').eq('id', 1).maybeSingle();
        return data?.data || {};
      }
      if (parts[1] === 'nsfw_safe_hashes') {
        if (parts.length > 2) {
          const { data } = await sb.from('admin_nsfw_safe_hashes').select('data').eq('hash', parts[2]).maybeSingle();
          return data?.data || null;
        }
        return {};
      }
      if (parts[1] === 'nsfw_ai_feedback') {
        const { data } = await sb.from('admin_nsfw_ai_feedback').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
      if (parts[1] === 'scheduled_actions') {
        if (parts.length > 2) {
          const { data } = await sb.from('admin_scheduled_actions').select('data').eq('id', parts[2]).maybeSingle();
          return data?.data || null;
        }
        const { data } = await sb.from('admin_scheduled_actions').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
      if (parts[1] === 'staff_revoked') {
        if (parts.length > 2) {
          const { data } = await sb.from('admin_staff_revoked').select('revoked_at').eq('username', parts[2]).maybeSingle();
          return data?.revoked_at || null;
        }
        return null;
      }
      if (parts[1] === 'force_refresh') {
        const { data } = await sb.from('admin_force_refresh').select('ts').eq('id', 1).maybeSingle();
        return data?.ts || null;
      }
      if (parts[1] === 'clear_sessions') {
        const { data } = await sb.from('admin_clear_sessions').select('ts').eq('id', 1).maybeSingle();
        return data?.ts || null;
      }
      if (parts[1] === 'trial_links') {
        if (parts.length > 2) {
          const { data } = await sb.from('admin_trial_links').select('data').eq('code', parts[2]).maybeSingle();
          return data?.data || null;
        }
        return null;
      }
      if (parts[1] === 'reports') {
        // legacy path admin/reports
        const { data } = await sb.from('reports').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
    }

    // reports/{id}
    if (parts[0] === 'reports') {
      if (parts.length === 1) {
        const { data } = await sb.from('reports').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
      const { data } = await sb.from('reports').select('data').eq('id', parts[1]).maybeSingle();
      return data?.data || null;
    }

    // support/tickets
    if (parts[0] === 'support' && parts[1] === 'tickets') {
      if (parts.length > 2) {
        const { data } = await sb.from('support_tickets').select('data').eq('id', parts[2]).maybeSingle();
        const ticket = data?.data || null;
        if (parts.length > 3 && ticket) return getNestedValue(ticket, parts.slice(3));
        return ticket;
      }
      const { data } = await sb.from('support_tickets').select('*');
      const result = {};
      (data || []).forEach(r => { result[r.id] = r.data; });
      return result;
    }

    // feedback
    if (parts[0] === 'feedback') {
      if (parts.length > 1) {
        const { data } = await sb.from('feedback').select('data').eq('id', parts[1]).maybeSingle();
        return data?.data || null;
      }
      const { data } = await sb.from('feedback').select('*').order('id', { ascending: false }).limit(50);
      const result = {};
      (data || []).forEach(r => { result[r.id] = r.data; });
      return result;
    }

    // voiceChannels/{bastionId}/{chName}/participants or deeper
    if (parts[0] === 'voiceChannels') {
      if (parts.length >= 3) {
        const { data } = await sb.from('voice_channels').select('*')
          .eq('bastion_id', parts[1]).eq('channel_name', parts[2]);
        const result = { participants: {} };
        (data || []).forEach(r => { result.participants[r.username] = r.data; });
        if (parts.length > 3) return getNestedValue(result, parts.slice(3));
        return result;
      }
      return null;
    }

    // vcSignal or vcSignal/{path} or deeper
    if (parts[0] === 'vcSignal') {
      if (parts.length === 1) {
        const { data } = await sb.from('vc_signal').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.path] = r.data; });
        return result;
      }
      const sigPath = parts.slice(1).join('/');
      // Try exact match first
      const { data } = await sb.from('vc_signal').select('data').eq('path', sigPath).maybeSingle();
      if (data?.data) {
        return data.data;
      }
      // Try prefix match for nested paths
      const { data: prefixData } = await sb.from('vc_signal').select('*').like('path', sigPath + '%');
      if (prefixData && prefixData.length) {
        const root = {};
        prefixData.forEach(r => {
          const subPath = r.path.replace(sigPath, '').replace(/^\//, '');
          if (!subPath) Object.assign(root, r.data);
          else setNestedValue(root, subPath.split('/'), r.data);
        });
        return Object.keys(root).length ? root : null;
      }
      return null;
    }

    // typing/{path}
    if (parts[0] === 'typing') {
      const tPath = parts.join('/');
      const { data } = await sb.from('typing').select('*').eq('path', tPath);
      if (!data || !data.length) return null;
      const result = {};
      data.forEach(r => { result[r.username] = r.ts; });
      return result;
    }

    // polls: bastionPolls/{bastionId}/{chName}
    if (parts[0] === 'bastionPolls') {
      const { data } = await sb.from('polls').select('*')
        .eq('bastion_id', parts[1]).eq('channel_name', parts[2] || '')
        .order('created_at', { ascending: true });
      const result = {};
      (data || []).forEach(r => { result[r.id] = r.data; });
      if (parts.length > 3) return getNestedValue(result, parts.slice(3));
      return result;
    }

    // threads/{bid}/{chName}/{msgId}
    if (parts[0] === 'threads') {
      if (parts.length >= 4) {
        const { data } = await sb.from('threads').select('*')
          .eq('bastion_id', parts[1]).eq('channel_name', parts[2]).eq('message_id', parts[3]);
        const result = {};
        (data || []).forEach(r => { result[r.reply_id] = r.data; });
        return result;
      }
      return null;
    }

    // threadCounts/{bid}/{chName}/{msgId}
    if (parts[0] === 'threadCounts') {
      if (parts.length >= 4) {
        const { data } = await sb.from('thread_counts').select('count')
          .eq('bastion_id', parts[1]).eq('channel_name', parts[2]).eq('message_id', parts[3]).maybeSingle();
        return data?.count || 0;
      }
      return 0;
    }

    // bastionSettings/{bastionId}/slowmode/{chName}
    if (parts[0] === 'bastionSettings') {
      const key = parts.slice(2).join('/');
      const { data } = await sb.from('bastion_settings').select('data')
        .eq('bastion_id', parts[1]).eq('key', key).maybeSingle();
      return data?.data ?? null;
    }

    // events/{bastionId}
    if (parts[0] === 'events') {
      if (parts.length > 2) {
        const { data } = await sb.from('events').select('data')
          .eq('bastion_id', parts[1]).eq('id', parts[2]).maybeSingle();
        return data?.data || null;
      }
      const { data } = await sb.from('events').select('*').eq('bastion_id', parts[1]);
      const result = {};
      (data || []).forEach(r => { result[r.id] = r.data; });
      return result;
    }

    // groupDMs
    if (parts[0] === 'groupDMs') {
      // Reuse group_chat_meta
      const { data } = await sb.from('group_chat_meta').select('*');
      const result = {};
      (data || []).forEach(r => { result[r.id] = r.data; });
      if (parts.length > 1) return getNestedValue(result, parts.slice(1));
      return result;
    }

    // bastions/{id} (separate from globalBastions)
    if (parts[0] === 'bastions') {
      if (parts.length === 1) {
        const { data } = await sb.from('bastions').select('*');
        const result = {};
        (data || []).forEach(r => { result[r.id] = r.data; });
        return result;
      }
      const { data } = await sb.from('bastions').select('data').eq('id', parts[1]).maybeSingle();
      const bastion = data?.data || null;
      if (parts.length > 2 && bastion) return getNestedValue(bastion, parts.slice(2));
      return bastion;
    }

    // .info/connected — always return true for Supabase
    if (parts[0] === '.info' && parts[1] === 'connected') {
      return true;
    }

    console.warn('[FTZ Shim] Unknown path for GET:', pathStr);
    return null;
  }

  // ── Core: write to Supabase based on Firebase path ──
  async function supaSet(pathStr, val) {
    const parts = parsePath(pathStr);

    // users/{username} or users/{username}/field
    if (parts[0] === 'users' && parts.length >= 2) {
      if (parts.length === 2) {
        // Full user object set
        if (val && typeof val === 'object') {
          val.username = val.username || parts[1];
          await FortizedSocial.saveUserObject(val);
        }
        return;
      }
      // Partial field update: users/{username}/fieldName or deeper
      const user = await FortizedSocial.getUserByName(parts[1]) || { username: parts[1] };
      setNestedValue(user, _mapUserField(parts.slice(2)), val);
      await FortizedSocial.saveUserObject(user);
      return;
    }

    // statuses/{username}
    if (parts[0] === 'statuses') {
      if (parts.length === 1) {
        // Bulk set — rare, used by admin reset
        if (val === null) {
          await sb.from('statuses').delete().neq('username', '');
          return;
        }
        return;
      }
      await sb.from('statuses').upsert({ username: parts[1], status: val || 'offline' }, { onConflict: 'username' });
      return;
    }

    // notifications/{username}/{notifId}
    if (parts[0] === 'notifications') {
      if (parts.length >= 3 && val) {
        await sb.from('notifications').upsert({
          id: parts[2],
          username: parts[1],
          type: val.type || null,
          from: val.from || null,
          time: val.time || null,
          read: val.read || false,
          data: val,
        }, { onConflict: 'username,id' });
      }
      return;
    }

    // dmIndex/{username}
    if (parts[0] === 'dmIndex') {
      const arr = Array.isArray(val) ? val : [];
      await sb.from('dm_index').upsert({ username: parts[1], partners: arr }, { onConflict: 'username' });
      return;
    }

    // dms/{key}/{msgId}/reactions/{emoji} — set reaction users for a specific emoji
    if (parts[0] === 'dms' && parts.length >= 5 && parts[3] === 'reactions') {
      const dmKey = parts[1], msgId = parts[2], emoji = parts[4];
      const { data: row } = await sb.from('dms').select('reactions').eq('dm_key', dmKey).eq('id', msgId).maybeSingle();
      const reactions = row?.reactions || {};
      if (val === null || (Array.isArray(val) && val.length === 0)) { delete reactions[emoji]; }
      else { reactions[emoji] = val; }
      await sb.from('dms').update({ reactions: Object.keys(reactions).length ? reactions : null }).eq('dm_key', dmKey).eq('id', msgId);
      return;
    }

    // dms/{key}/{msgId}
    if (parts[0] === 'dms') {
      if (parts.length >= 3 && val) {
        await sb.from('dms').upsert({
          dm_key: parts[1], id: parts[2] || val.id,
          from: val.from || null, text: val.text || '',
          time: val.time || null, timestamp: val.timestamp || null,
          edited: val.edited || false, new_text: val.newText || null,
          reactions: val.reactions || null,
        }, { onConflict: 'dm_key,id' });
      }
      return;
    }

    // bastionMsgs/{bid}/{ch}/{msgId}/reactions/{emoji} — set reaction users
    if (parts[0] === 'bastionMsgs' && parts.length >= 6 && parts[4] === 'reactions') {
      const bid = parts[1], ch = parts[2], msgId = parts[3], emoji = parts[5];
      const { data: row } = await sb.from('bastion_msgs').select('reactions').eq('bastion_id', bid).eq('channel_id', ch).eq('id', msgId).maybeSingle();
      const reactions = row?.reactions || {};
      if (val === null || (Array.isArray(val) && val.length === 0)) { delete reactions[emoji]; }
      else { reactions[emoji] = val; }
      await sb.from('bastion_msgs').update({ reactions: Object.keys(reactions).length ? reactions : null }).eq('bastion_id', bid).eq('channel_id', ch).eq('id', msgId);
      return;
    }

    // bastionMsgs/{bastionId}/{channelId}/{msgId}
    if (parts[0] === 'bastionMsgs') {
      if (parts.length >= 4 && val) {
        await sb.from('bastion_msgs').upsert({
          bastion_id: parts[1], channel_id: parts[2], id: parts[3],
          from: val.from || null, text: val.text || '',
          time: val.time || null, timestamp: val.timestamp || null,
          edited: val.edited || false, reactions: val.reactions || null,
        }, { onConflict: 'bastion_id,channel_id,id' });
      }
      return;
    }

    // globalBastions/{id} or deeper
    if (parts[0] === 'globalBastions') {
      if (parts.length === 2) {
        await sb.from('global_bastions').upsert({ id: parts[1], data: val }, { onConflict: 'id' });
        return;
      }
      if (parts.length > 2) {
        // Update nested field in bastion data
        const { data: existing } = await sb.from('global_bastions').select('data').eq('id', parts[1]).maybeSingle();
        const bastion = existing?.data || {};
        setNestedValue(bastion, parts.slice(2), val);
        await sb.from('global_bastions').upsert({ id: parts[1], data: bastion }, { onConflict: 'id' });
        return;
      }
      return;
    }

    // bastionMembers/{bastionId}
    if (parts[0] === 'bastionMembers') {
      await sb.from('bastion_members').upsert({ bastion_id: parts[1], members: val || [] }, { onConflict: 'bastion_id' });
      return;
    }

    // invites/{code}
    if (parts[0] === 'invites') {
      if (parts.length >= 2) {
        await sb.from('invites').upsert({ code: parts[1], data: val }, { onConflict: 'code' });
      }
      return;
    }

    // bastionTemplates/{id}
    if (parts[0] === 'bastionTemplates') {
      if (parts.length >= 2) {
        await sb.from('bastion_templates').upsert({ id: parts[1], data: val }, { onConflict: 'id' });
      }
      return;
    }

    // groupChats/{gcId}/meta or groupChats/{gcId}/messages or deeper
    if (parts[0] === 'groupChats') {
      if (parts[2] === 'meta') {
        if (parts.length === 3) {
          await sb.from('group_chat_meta').upsert({ id: parts[1], data: val }, { onConflict: 'id' });
        } else {
          // Update nested meta field
          const { data: existing } = await sb.from('group_chat_meta').select('data').eq('id', parts[1]).maybeSingle();
          const meta = existing?.data || {};
          setNestedValue(meta, parts.slice(3), val);
          await sb.from('group_chat_meta').upsert({ id: parts[1], data: meta }, { onConflict: 'id' });
        }
        return;
      }
      // groupChats/{gcId}/messages/{msgId}/reactions/{emoji} — reaction on GC message
      if (parts[2] === 'messages' && parts.length >= 6 && parts[4] === 'reactions') {
        const gcId = parts[1], msgId = parts[3], emoji = parts[5];
        const { data: row } = await sb.from('group_chat_messages').select('data').eq('gc_id', gcId).eq('id', msgId).maybeSingle();
        const msgData = row?.data || {};
        if (!msgData.reactions) msgData.reactions = {};
        if (val === null || (Array.isArray(val) && val.length === 0)) { delete msgData.reactions[emoji]; }
        else { msgData.reactions[emoji] = val; }
        await sb.from('group_chat_messages').update({ data: msgData }).eq('gc_id', gcId).eq('id', msgId);
        return;
      }
      if (parts[2] === 'messages' && parts.length === 4) {
        if (val && typeof val === 'object') {
          await sb.from('group_chat_messages').upsert({
            gc_id: parts[1], id: parts[3] || val.id,
            from: val.from || null, text: val.text || '',
            time: val.time || null, timestamp: val.timestamp || null,
            edited: val.edited || false, data: val,
          }, { onConflict: 'gc_id,id' });
        }
        return;
      }
      if (parts[2] === 'typing') {
        const tPath = parts.slice(0, 3).join('/');
        if (parts.length >= 4) {
          await sb.from('typing').upsert({ path: tPath, username: parts[3], ts: val || Date.now() }, { onConflict: 'path,username' });
        }
        return;
      }
      return;
    }

    // admin paths
    if (parts[0] === 'admin') {
      if (parts[1] === 'bans') {
        if (parts.length === 2) {
          // Bulk set all bans
          await sb.from('admin_bans').delete().neq('username', '');
          if (val && typeof val === 'object') {
            const rows = Object.entries(val).map(([k, v]) => ({ username: k, data: v }));
            if (rows.length) await sb.from('admin_bans').insert(rows);
          }
          return;
        }
        await sb.from('admin_bans').upsert({ username: parts[2], data: val }, { onConflict: 'username' });
        return;
      }
      if (parts[1] === 'staff') {
        await sb.from('admin_staff').upsert({ id: 1, data: val }, { onConflict: 'id' });
        return;
      }
      if (parts[1] === 'global_settings') {
        if (parts.length === 2) {
          await sb.from('admin_global_settings').upsert({ id: 1, data: val }, { onConflict: 'id' });
        } else {
          const gs = await supaGet('admin/global_settings') || {};
          setNestedValue(gs, parts.slice(2), val);
          await sb.from('admin_global_settings').upsert({ id: 1, data: gs }, { onConflict: 'id' });
        }
        return;
      }
      if (parts[1] === 'audit_log') {
        // Push — val is the entry
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        await sb.from('admin_audit_log').insert({ id, data: val });
        return;
      }
      if (parts[1] === 'nsfw_queue') {
        if (parts.length > 2) {
          await sb.from('admin_nsfw_queue').upsert({ id: parts[2], data: val }, { onConflict: 'id' });
        } else {
          // Bulk set
          await sb.from('admin_nsfw_queue').delete().neq('id', '');
          if (val && typeof val === 'object') {
            const rows = Object.entries(val).map(([k, v]) => ({ id: k, data: v }));
            if (rows.length) await sb.from('admin_nsfw_queue').insert(rows);
          }
        }
        return;
      }
      if (parts[1] === 'nsfw_banned_hashes') {
        await sb.from('admin_nsfw_banned_hashes').upsert({ id: 1, data: val }, { onConflict: 'id' });
        return;
      }
      if (parts[1] === 'nsfw_safe_hashes' && parts.length > 2) {
        await sb.from('admin_nsfw_safe_hashes').upsert({ hash: parts[2], data: val }, { onConflict: 'hash' });
        return;
      }
      if (parts[1] === 'nsfw_ai_feedback') {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        await sb.from('admin_nsfw_ai_feedback').insert({ id, data: val });
        return;
      }
      if (parts[1] === 'scheduled_actions') {
        if (parts.length > 2) {
          await sb.from('admin_scheduled_actions').upsert({ id: parts[2], data: val }, { onConflict: 'id' });
        } else {
          // Push
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
          await sb.from('admin_scheduled_actions').insert({ id, data: val });
        }
        return;
      }
      if (parts[1] === 'staff_revoked' && parts.length > 2) {
        await sb.from('admin_staff_revoked').upsert({ username: parts[2], revoked_at: val }, { onConflict: 'username' });
        return;
      }
      if (parts[1] === 'force_refresh') {
        await sb.from('admin_force_refresh').upsert({ id: 1, ts: val }, { onConflict: 'id' });
        return;
      }
      if (parts[1] === 'clear_sessions') {
        await sb.from('admin_clear_sessions').upsert({ id: 1, ts: val }, { onConflict: 'id' });
        return;
      }
      if (parts[1] === 'trial_links' && parts.length > 2) {
        await sb.from('admin_trial_links').upsert({ code: parts[2], data: val }, { onConflict: 'code' });
        return;
      }
      if (parts[1] === 'reports') {
        // Legacy admin/reports path
        if (parts.length > 2) {
          await sb.from('reports').upsert({ id: parts[2], data: val }, { onConflict: 'id' });
        }
        return;
      }
    }

    // reports/{id}
    if (parts[0] === 'reports') {
      if (parts.length >= 2) {
        await sb.from('reports').upsert({ id: parts[1], data: val }, { onConflict: 'id' });
      }
      return;
    }

    // support/tickets/{id} or deeper
    if (parts[0] === 'support' && parts[1] === 'tickets') {
      if (parts.length >= 3) {
        if (parts.length === 3) {
          const ticketData = val || {};
          await sb.from('support_tickets').upsert({ id: parts[2], username: ticketData.username || null, data: ticketData }, { onConflict: 'id' });
        } else {
          // Nested update: support/tickets/{id}/status etc
          const { data: existing } = await sb.from('support_tickets').select('data').eq('id', parts[2]).maybeSingle();
          const ticket = existing?.data || {};
          setNestedValue(ticket, parts.slice(3), val);
          await sb.from('support_tickets').upsert({ id: parts[2], username: ticket.username || null, data: ticket }, { onConflict: 'id' });
        }
      }
      return;
    }

    // feedback/{id}
    if (parts[0] === 'feedback') {
      if (parts.length >= 2) {
        await sb.from('feedback').upsert({ id: parts[1], data: val }, { onConflict: 'id' });
      }
      return;
    }

    // voiceChannels/{bastionId}/{chName}/participants/{username}
    if (parts[0] === 'voiceChannels') {
      if (parts.length >= 5 && parts[3] === 'participants') {
        await sb.from('voice_channels').upsert({
          bastion_id: parts[1], channel_name: parts[2], username: parts[4], data: val,
        }, { onConflict: 'bastion_id,channel_name,username' });
      }
      return;
    }

    // vcSignal/{path} or deeper
    if (parts[0] === 'vcSignal') {
      const sigPath = parts.slice(1).join('/');
      if (parts.length >= 2) {
        await sb.from('vc_signal').upsert({ path: sigPath, data: val }, { onConflict: 'path' });
      }
      return;
    }

    // typing/{path}/{username}
    if (parts[0] === 'typing') {
      if (parts.length >= 3) {
        const tPath = parts.slice(0, parts.length - 1).join('/');
        const uname = parts[parts.length - 1];
        await sb.from('typing').upsert({ path: tPath, username: uname, ts: val || Date.now() }, { onConflict: 'path,username' });
      }
      return;
    }

    // bastionPolls / polls
    if (parts[0] === 'bastionPolls') {
      if (parts.length >= 4) {
        await sb.from('polls').upsert({
          bastion_id: parts[1], channel_name: parts[2], id: parts[3], data: val,
        }, { onConflict: 'bastion_id,channel_name,id' });
      }
      return;
    }

    // threads/{bid}/{chName}/{msgId}/{replyId}
    if (parts[0] === 'threads') {
      if (parts.length >= 5) {
        await sb.from('threads').upsert({
          bastion_id: parts[1], channel_name: parts[2], message_id: parts[3], reply_id: parts[4], data: val,
        }, { onConflict: 'bastion_id,channel_name,message_id,reply_id' });
      }
      return;
    }

    // threadCounts/{bid}/{chName}/{msgId}
    if (parts[0] === 'threadCounts') {
      if (parts.length >= 4) {
        await sb.from('thread_counts').upsert({
          bastion_id: parts[1], channel_name: parts[2], message_id: parts[3], count: val || 0,
        }, { onConflict: 'bastion_id,channel_name,message_id' });
      }
      return;
    }

    // bastionSettings/{bastionId}/slowmode/{chName}
    if (parts[0] === 'bastionSettings') {
      const key = parts.slice(2).join('/');
      await sb.from('bastion_settings').upsert({ bastion_id: parts[1], key, data: val }, { onConflict: 'bastion_id,key' });
      return;
    }

    // events/{bastionId}/{eventId}
    if (parts[0] === 'events') {
      if (parts.length >= 3) {
        await sb.from('events').upsert({ bastion_id: parts[1], id: parts[2], data: val }, { onConflict: 'bastion_id,id' });
      }
      return;
    }

    // bastions/{id} (separate table)
    if (parts[0] === 'bastions') {
      if (parts.length === 2) {
        await sb.from('bastions').upsert({ id: parts[1], data: val }, { onConflict: 'id' });
        return;
      }
      if (parts.length > 2) {
        const { data: existing } = await sb.from('bastions').select('data').eq('id', parts[1]).maybeSingle();
        const bastion = existing?.data || {};
        setNestedValue(bastion, parts.slice(2), val);
        await sb.from('bastions').upsert({ id: parts[1], data: bastion }, { onConflict: 'id' });
        return;
      }
      return;
    }

    console.warn('[FTZ Shim] Unknown path for SET:', pathStr, val);
  }

  // ── Remove ──────────────────────────────────────────
  async function supaRemove(pathStr) {
    const parts = parsePath(pathStr);

    if (parts[0] === 'users' && parts.length > 2) {
      // Remove nested field — set to null
      return supaSet(pathStr, null);
    }
    if (parts[0] === 'statuses' && parts.length === 1) {
      await sb.from('statuses').delete().neq('username', '');
      return;
    }
    if (parts[0] === 'admin' && parts[1] === 'bans' && parts.length >= 3) {
      await sb.from('admin_bans').delete().eq('username', parts[2]);
      return;
    }
    if (parts[0] === 'admin' && parts[1] === 'global_settings' && parts.length > 2) {
      return supaSet(pathStr, null);
    }
    if (parts[0] === 'admin' && parts[1] === 'nsfw_queue' && parts.length > 2) {
      await sb.from('admin_nsfw_queue').delete().eq('id', parts[2]);
      return;
    }
    if (parts[0] === 'admin' && parts[1] === 'scheduled_actions' && parts.length > 2) {
      await sb.from('admin_scheduled_actions').delete().eq('id', parts[2]);
      return;
    }
    if (parts[0] === 'globalBastions' && parts.length >= 2) {
      if (parts.length === 2) {
        await sb.from('global_bastions').delete().eq('id', parts[1]);
        return;
      }
      return supaSet(pathStr, null);
    }
    if (parts[0] === 'bastions' && parts.length >= 2) {
      if (parts.length === 2) {
        await sb.from('bastions').delete().eq('id', parts[1]);
        return;
      }
      return supaSet(pathStr, null);
    }
    if (parts[0] === 'bastionTemplates' && parts.length >= 2) {
      await sb.from('bastion_templates').delete().eq('id', parts[1]);
      return;
    }
    // dms/{key}/{msgId}/reactions/{emoji} — remove a specific reaction emoji
    if (parts[0] === 'dms' && parts.length >= 5 && parts[3] === 'reactions') {
      return supaSet(pathStr, null);
    }
    // dms/{key}/{msgId} — delete single DM message
    if (parts[0] === 'dms' && parts.length === 3) {
      const { error } = await sb.from('dms').delete().eq('dm_key', parts[1]).eq('id', parts[2]);
      if (error) throw new Error('[supaRemove] Delete DM failed: ' + error.message);
      return;
    }
    if (parts[0] === 'groupChats' && parts.length >= 2) {
      if (parts.length === 2) {
        // Delete entire group chat
        await sb.from('group_chat_meta').delete().eq('id', parts[1]);
        await sb.from('group_chat_messages').delete().eq('gc_id', parts[1]);
        return;
      }
      // groupChats/{gcId}/messages/{msgId}/reactions/{emoji} — remove reaction
      if (parts[2] === 'messages' && parts.length >= 6 && parts[4] === 'reactions') {
        return supaSet(pathStr, null);
      }
      // groupChats/{gcId}/messages/{msgId} — delete single GC message
      if (parts[2] === 'messages' && parts.length === 4) {
        const { error } = await sb.from('group_chat_messages').delete().eq('gc_id', parts[1]).eq('id', parts[3]);
        if (error) throw new Error('Delete GC message failed: ' + error.message);
        return;
      }
      if (parts[2] === 'typing' && parts.length >= 4) {
        const tPath = parts.slice(0, 3).join('/');
        await sb.from('typing').delete().eq('path', tPath).eq('username', parts[3]);
        return;
      }
    }
    // bastionMsgs/{bid}/{ch}/{msgId}/reactions/{emoji} — remove a specific reaction emoji
    if (parts[0] === 'bastionMsgs' && parts.length >= 6 && parts[4] === 'reactions') {
      return supaSet(pathStr, null);
    }
    // bastionMsgs/{bastionId}/{channelId}/{msgId} — delete single bastion message
    if (parts[0] === 'bastionMsgs' && parts.length === 4) {
      const { error } = await sb.from('bastion_msgs').delete()
        .eq('bastion_id', parts[1]).eq('channel_id', parts[2]).eq('id', parts[3]);
      if (error) throw new Error('Delete bastion message failed: ' + error.message);
      return;
    }
    if (parts[0] === 'reports' && parts.length >= 2) {
      await sb.from('reports').delete().eq('id', parts[1]);
      return;
    }
    if (parts[0] === 'support' && parts[1] === 'tickets' && parts.length >= 3) {
      await sb.from('support_tickets').delete().eq('id', parts[2]);
      return;
    }
    if (parts[0] === 'voiceChannels' && parts.length >= 5 && parts[3] === 'participants') {
      await sb.from('voice_channels').delete()
        .eq('bastion_id', parts[1]).eq('channel_name', parts[2]).eq('username', parts[4]);
      return;
    }
    if (parts[0] === 'vcSignal') {
      const sigPath = parts.slice(1).join('/');
      await sb.from('vc_signal').delete().eq('path', sigPath);
      // Also try prefix delete for nested
      await sb.from('vc_signal').delete().like('path', sigPath + '/%');
      return;
    }
    if (parts[0] === 'typing') {
      if (parts.length >= 3) {
        const tPath = parts.slice(0, parts.length - 1).join('/');
        const uname = parts[parts.length - 1];
        await sb.from('typing').delete().eq('path', tPath).eq('username', uname);
      }
      return;
    }
    if (parts[0] === 'bastionPolls') {
      if (parts.length >= 4) {
        await sb.from('polls').delete()
          .eq('bastion_id', parts[1]).eq('channel_name', parts[2]).eq('id', parts[3]);
      }
      return;
    }
    if (parts[0] === 'events' && parts.length >= 3) {
      await sb.from('events').delete().eq('bastion_id', parts[1]).eq('id', parts[2]);
      return;
    }

    console.warn('[FTZ Shim] Unknown path for REMOVE:', pathStr);
  }

  // ── Update (merge) ──────────────────────────────────
  async function supaUpdate(pathStr, updates) {
    const parts = parsePath(pathStr);

    // users/{username} — partial update
    if (parts[0] === 'users' && parts.length === 2 && typeof updates === 'object') {
      const user = await FortizedSocial.getUserByName(parts[1]) || { username: parts[1] };
      Object.assign(user, updates);
      await FortizedSocial.saveUserObject(user);
      return;
    }

    // dms/{key}/{msgId} — message edit
    if (parts[0] === 'dms' && parts.length >= 3) {
      const upd = {};
      if ('text' in updates) upd.text = updates.text;
      if ('edited' in updates) upd.edited = updates.edited;
      if ('newText' in updates) upd.new_text = updates.newText;
      if ('reactions' in updates) upd.reactions = updates.reactions;
      if (Object.keys(upd).length) {
        await sb.from('dms').update(upd).eq('dm_key', parts[1]).eq('id', parts[2]);
      }
      return;
    }

    // bastionMsgs/{bid}/{ch}/{msgId}
    if (parts[0] === 'bastionMsgs' && parts.length >= 4) {
      const upd = {};
      if ('text' in updates) upd.text = updates.text;
      if ('edited' in updates) upd.edited = updates.edited;
      if ('reactions' in updates) upd.reactions = updates.reactions;
      if (Object.keys(upd).length) {
        await sb.from('bastion_msgs').update(upd)
          .eq('bastion_id', parts[1]).eq('channel_id', parts[2]).eq('id', parts[3]);
      }
      return;
    }

    // globalBastions/{id} — partial update
    if (parts[0] === 'globalBastions' && parts.length === 2) {
      const { data: existing } = await sb.from('global_bastions').select('data').eq('id', parts[1]).maybeSingle();
      const bastion = existing?.data || {};
      Object.assign(bastion, updates);
      await sb.from('global_bastions').upsert({ id: parts[1], data: bastion }, { onConflict: 'id' });
      return;
    }

    // vcSignal/{path} — merge update
    if (parts[0] === 'vcSignal') {
      const sigPath = parts.slice(1).join('/');
      const { data: existing } = await sb.from('vc_signal').select('data').eq('path', sigPath).maybeSingle();
      const merged = { ...(existing?.data || {}), ...updates };
      await sb.from('vc_signal').upsert({ path: sigPath, data: merged }, { onConflict: 'path' });
      return;
    }

    // notifications/{username}/{notifId} — update a specific notification
    if (parts[0] === 'notifications' && parts.length === 3) {
      const updateObj = {};
      if ('read' in updates) updateObj.read = updates.read;
      if ('seen' in updates) {
        // 'seen' is stored in the data JSONB column
        const { data: existing } = await sb.from('notifications').select('data').eq('username', parts[1]).eq('id', parts[2]).maybeSingle();
        updateObj.data = { ...(existing?.data || {}), seen: updates.seen };
      }
      if (Object.keys(updateObj).length) {
        await sb.from('notifications').update(updateObj).eq('username', parts[1]).eq('id', parts[2]);
      }
      return;
    }

    // notifications/{username} — partial updates (mark read)
    if (parts[0] === 'notifications' && parts.length === 2) {
      // Updates like { "notifId/read": true }
      for (const [key, val] of Object.entries(updates)) {
        const kparts = key.split('/');
        if (kparts.length === 2 && kparts[1] === 'read') {
          await sb.from('notifications').update({ read: val }).eq('username', parts[1]).eq('id', kparts[0]);
        }
      }
      return;
    }

    // Fallback: treat as set for each key
    for (const [key, val] of Object.entries(updates)) {
      await supaSet(pathStr + '/' + key, val);
    }
  }

  // ── Push (auto-generate key) ────────────────────────
  async function supaPush(pathStr, val) {
    const key = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const parts = parsePath(pathStr);

    // groupChats/{gcId}/messages
    if (parts[0] === 'groupChats' && parts[2] === 'messages') {
      const msg = val || {};
      msg.id = msg.id || key;
      await sb.from('group_chat_messages').insert({
        gc_id: parts[1], id: msg.id,
        from: msg.from || null, text: msg.text || '',
        time: msg.time || null, timestamp: msg.timestamp || null,
        edited: msg.edited || false, data: msg,
      });
      return { key: msg.id };
    }

    // bastionMsgs/{bid}/{chId}
    if (parts[0] === 'bastionMsgs' && parts.length >= 3) {
      const msg = val || {};
      msg.id = msg.id || key;
      await sb.from('bastion_msgs').insert({
        bastion_id: parts[1], channel_id: parts[2], id: msg.id,
        from: msg.from || null, text: msg.text || '',
        time: msg.time || null, timestamp: msg.timestamp || null,
        edited: false, reactions: null,
      });
      return { key: msg.id };
    }

    // dms/{key}
    if (parts[0] === 'dms' && parts.length >= 2) {
      const msg = val || {};
      msg.id = msg.id || key;
      const row = {
        dm_key: parts[1], id: msg.id,
        from: msg.from || null, text: msg.text || '',
        time: msg.time || null, timestamp: msg.timestamp || null,
        edited: false,
      };
      if (msg.forwarded) { row.forwarded = true; row.forwarded_by = msg.forwardedBy || msg.from || null; }
      await sb.from('dms').insert(row);
      return { key: msg.id };
    }

    // admin/audit_log
    if (parts[0] === 'admin' && parts[1] === 'audit_log') {
      await sb.from('admin_audit_log').insert({ id: key, data: val });
      return { key };
    }

    // admin/nsfw_ai_feedback
    if (parts[0] === 'admin' && parts[1] === 'nsfw_ai_feedback') {
      await sb.from('admin_nsfw_ai_feedback').insert({ id: key, data: val });
      return { key };
    }

    // admin/scheduled_actions
    if (parts[0] === 'admin' && parts[1] === 'scheduled_actions') {
      await sb.from('admin_scheduled_actions').insert({ id: key, data: val });
      return { key };
    }

    // threads/{bid}/{chName}/{msgId}
    if (parts[0] === 'threads' && parts.length >= 4) {
      const reply = val || {};
      reply.id = reply.id || key;
      await sb.from('threads').insert({
        bastion_id: parts[1], channel_name: parts[2], message_id: parts[3],
        reply_id: reply.id, data: reply,
      });
      return { key: reply.id };
    }

    // notifications/{username}
    if (parts[0] === 'notifications' && parts.length >= 2) {
      const notif = val || {};
      notif.id = notif.id || key;
      await sb.from('notifications').insert({
        id: notif.id, username: parts[1],
        type: notif.type || null, from: notif.from || null,
        time: notif.time || null, read: notif.read || false,
        data: notif,
      });
      return { key: notif.id };
    }

    // bastionPolls/{bid}/{chName}
    if (parts[0] === 'bastionPolls' && parts.length >= 3) {
      const poll = val || {};
      await sb.from('polls').insert({
        bastion_id: parts[1], channel_name: parts[2], id: key, data: poll,
      });
      return { key };
    }

    // vcSignal/{path}/ice/{username}
    if (parts[0] === 'vcSignal') {
      const sigPath = parts.slice(1).join('/') + '/' + key;
      await sb.from('vc_signal').upsert({ path: sigPath, data: val }, { onConflict: 'path' });
      return { key };
    }

    // Fallback
    await supaSet(pathStr + '/' + key, val);
    return { key };
  }

  // ── Map camelCase user fields to snake_case ─────────
  function _mapUserField(fieldParts) {
    const map = {
      'customStatus': 'customStatus',
      'displayName': 'displayName',
      'friendRequestsSent': 'friendRequestsSent',
      'friendRequestsReceived': 'friendRequestsReceived',
      'radianceUntil': 'radianceUntil',
      'radiancePlus': 'radiancePlus',
      'lastDaily': 'lastDaily',
      'blockedUsers': 'blockedUsers',
      'ignoredUsers': 'ignoredUsers',
      'groupChats': 'groupChats',
      'suspendedUntil': 'suspendedUntil',
      'activeWarning': 'activeWarning',
      'gameActivity': 'gameActivity',
      'lastSeen': 'lastSeen',
      'profileTheme': 'profileTheme',
      'activeDecoration': 'activeDecoration',
      'banReason': 'banReason',
      'createdAt': 'createdAt',
    };
    // Keep field names as-is for the app user object (camelCase)
    return fieldParts;
  }

  // ── Realtime subscriptions map ──────────────────────
  const _realtimeSubs = new Map();

  // ── Build firebase.database().ref() compatible API ──
  function createRef(pathStr) {
    pathStr = (pathStr || '').replace(/^\/+|\/+$/g, '');
    const parts = parsePath(pathStr);

    const ref = {
      _path: pathStr,

      // .get() → returns snap-like object
      get: async () => {
        const val = await supaGet(pathStr);
        return _makeSnap(val, null, pathStr);
      },

      // .once('value', cb) → one-time read
      once: async (eventType, cb) => {
        const val = await supaGet(pathStr);
        const snap = _makeSnap(val, null, pathStr);
        if (cb) cb(snap);
        return snap;
      },

      // .set(val) → write
      set: (val) => supaSet(pathStr, val),

      // .update(updates) → merge
      update: (updates) => supaUpdate(pathStr, updates),

      // .push(val) → auto-key insert
      push: (val) => {
        if (val !== undefined) {
          // Immediate push with value
          const p = supaPush(pathStr, val);
          // Return ref-like with .key (need to resolve)
          const fakeRef = {
            _path: pathStr + '/__pending__',
            key: null,
            set: async (v) => {
              const result = await p;
              fakeRef.key = result.key;
              fakeRef._path = pathStr + '/' + result.key;
              if (v !== undefined) await supaSet(fakeRef._path, v);
            },
            then: (resolve) => p.then(r => { fakeRef.key = r.key; fakeRef._path = pathStr + '/' + r.key; resolve(fakeRef); }),
          };
          // Resolve key
          p.then(r => { fakeRef.key = r.key; fakeRef._path = pathStr + '/' + r.key; });
          return fakeRef;
        }
        // Push without value — return ref with .key that can be .set() later
        const key = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const childPath = pathStr + '/' + key;
        return {
          key,
          _path: childPath,
          set: (v) => supaSet(childPath, v),
          update: (v) => supaUpdate(childPath, v),
        };
      },

      // .remove() → delete
      remove: () => supaRemove(pathStr),

      // .transaction(fn) → read-modify-write
      transaction: async (fn) => {
        const current = await supaGet(pathStr);
        const newVal = fn(current);
        if (newVal === undefined) return; // abort
        await supaSet(pathStr, newVal);
        return { committed: true, snapshot: _makeSnap(newVal, null, pathStr) };
      },

      // .on(event, callback) → realtime listener
      on: (event, callback) => {
        // First, do an initial fetch for 'value' events
        if (event === 'value') {
          supaGet(pathStr).then(val => callback?.(_makeSnap(val, null, pathStr)));
        }

        // Set up Supabase realtime subscription
        const table = _pathToTable(parts);
        if (table) {
          const channelName = 'shim-' + pathStr.replace(/[^a-zA-Z0-9]/g, '_') + '-' + Math.random().toString(36).slice(2, 6);
          const filter = _pathToFilter(parts, table);
          const subConfig = {
            event: event === 'child_added' ? 'INSERT' : event === 'child_changed' ? 'UPDATE' : event === 'child_removed' ? 'DELETE' : '*',
            schema: 'public',
            table: table,
          };
          if (filter) subConfig.filter = filter;

          const channel = sb.channel(channelName)
            .on('postgres_changes', subConfig, payload => {
              if (event === 'value') {
                // Re-fetch the full value
                supaGet(pathStr).then(val => callback?.(_makeSnap(val, null, pathStr)));
              } else {
                const row = payload.new || payload.old;
                const snapVal = _rowToSnapVal(table, row, parts);
                const rowKey = row?.id || row?.username;
                callback?.(_makeSnap(snapVal, rowKey, pathStr));
              }
            })
            .subscribe();

          const subKey = pathStr + ':' + event;
          if (!_realtimeSubs.has(subKey)) _realtimeSubs.set(subKey, []);
          _realtimeSubs.get(subKey).push({ channel, callback });
        }

        return callback; // Firebase returns the callback for .off()
      },

      // .off(event, callback) → remove listener
      off: (event, callback) => {
        const subKey = pathStr + ':' + event;
        const subs = _realtimeSubs.get(subKey) || [];
        const remaining = [];
        for (const sub of subs) {
          if (!callback || sub.callback === callback) {
            try { sb.removeChannel(sub.channel); } catch(_) {}
          } else {
            remaining.push(sub);
          }
        }
        _realtimeSubs.set(subKey, remaining);
      },

      // .onDisconnect() → cleanup on disconnect
      onDisconnect: () => ({
        set: (val) => {
          // Use beforeunload to simulate onDisconnect
          const handler = () => {
            // Fire-and-forget — navigator.sendBeacon can't do Supabase calls
            // Use synchronous XHR as last resort
            try {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', SUPABASE_URL + '/rest/v1/rpc/noop', false); // no-op
              // Actually set the value async — best effort
              supaSet(pathStr, val);
            } catch(_) {}
          };
          window.addEventListener('beforeunload', handler);
          return { cancel: () => window.removeEventListener('beforeunload', handler) };
        },
        remove: () => {
          const handler = () => {
            try { supaRemove(pathStr); } catch(_) {}
          };
          window.addEventListener('beforeunload', handler);
          return { cancel: () => window.removeEventListener('beforeunload', handler) };
        },
      }),

      // .child(childPath) → child ref
      child: (childPath) => createRef(pathStr + '/' + childPath),

      // Chaining methods for queries (simplified — returns same ref)
      orderByChild: () => ref,
      orderByKey: () => ref,
      equalTo: (val) => {
        // For support tickets query by username
        const queryRef = { ...ref };
        queryRef._equalTo = val;
        queryRef.once = async (eventType, cb) => {
          let result = null;
          if (parts[0] === 'support' && parts[1] === 'tickets') {
            const { data } = await sb.from('support_tickets').select('*').eq('username', val);
            const obj = {};
            (data || []).forEach(r => { obj[r.id] = r.data; });
            result = obj;
          } else if (parts[0] === 'users') {
            // Generic user query
            result = await supaGet(pathStr);
          } else {
            result = await supaGet(pathStr);
          }
          const snap = _makeSnap(result, null, pathStr);
          if (cb) cb(snap);
          return snap;
        };
        queryRef.get = queryRef.once.bind(null, 'value', null);
        return queryRef;
      },
      limitToLast: (n) => {
        const queryRef = { ...ref };
        queryRef._limit = n;
        queryRef.get = async () => {
          // For messages, fetch with limit
          if (parts[0] === 'dms' && parts.length >= 2) {
            const { data } = await sb.from('dms').select('*').eq('dm_key', parts[1]).order('timestamp', { ascending: false }).limit(n);
            const result = {};
            (data || []).reverse().forEach(r => { result[r.id] = { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, edited: r.edited, reactions: r.reactions, forwarded: r.forwarded || false, forwardedBy: r.forwarded_by || undefined }; });
            return _makeSnap(Object.keys(result).length ? result : null, null, pathStr);
          }
          if (parts[0] === 'bastionMsgs' && parts.length >= 3) {
            const { data } = await sb.from('bastion_msgs').select('*')
              .eq('bastion_id', parts[1]).eq('channel_id', parts[2])
              .order('timestamp', { ascending: false }).limit(n);
            const result = {};
            (data || []).reverse().forEach(r => { result[r.id] = { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, edited: r.edited, reactions: r.reactions }; });
            return _makeSnap(Object.keys(result).length ? result : null, null, pathStr);
          }
          if (parts[0] === 'groupChats' && parts[2] === 'messages') {
            const { data } = await sb.from('group_chat_messages').select('*').eq('gc_id', parts[1]).order('timestamp', { ascending: false }).limit(n);
            const result = {};
            (data || []).reverse().forEach(r => { result[r.id] = { id: r.id, from: r.from, text: r.text, time: r.time, timestamp: r.timestamp, edited: r.edited, ...(r.data || {}) }; });
            return _makeSnap(Object.keys(result).length ? result : null, null, pathStr);
          }
          if (parts[0] === 'feedback') {
            const { data } = await sb.from('feedback').select('*').order('id', { ascending: false }).limit(n);
            const result = {};
            (data || []).forEach(r => { result[r.id] = r.data; });
            return _makeSnap(Object.keys(result).length ? result : null, null, pathStr);
          }
          // Fallback
          return ref.get();
        };
        return queryRef;
      },
      startAt: () => ref,
      endAt: () => ref,
      limitToFirst: () => ref,

      // Key (for push refs)
      get key() {
        const p = pathStr.split('/');
        return p[p.length - 1] || null;
      },
    };

    return ref;
  }

  // ── Snapshot helper ─────────────────────────────────
  function _makeSnap(val, key, parentPath) {
    const snapPath = parentPath ? (key ? parentPath + '/' + key : parentPath) : (key || '');
    const snap = {
      val: () => val,
      exists: () => val !== null && val !== undefined,
      key: key || null,
      // Provide ref so snap.ref.update() works (used by initNotifToasts)
      ref: snapPath ? createRef(snapPath) : {
        update: async () => {},
        set: async () => {},
        remove: async () => {},
      },
      forEach: (cb) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          for (const [k, v] of Object.entries(val)) {
            cb(_makeSnap(v, k, snapPath));
          }
        }
      },
      numChildren: () => {
        if (val && typeof val === 'object' && !Array.isArray(val)) return Object.keys(val).length;
        return 0;
      },
    };
    return snap;
  }

  // ── Map path to Supabase table for realtime ─────────
  function _pathToTable(parts) {
    const map = {
      'users': 'users',
      'statuses': 'statuses',
      'notifications': 'notifications',
      'dms': 'dms',
      'dmIndex': 'dm_index',
      'bastionMsgs': 'bastion_msgs',
      'globalBastions': 'global_bastions',
      'bastionMembers': 'bastion_members',
      'bastionPolls': 'polls',
      'groupChats': null, // depends on subpath
      'groupDMs': 'group_chat_meta',
      'admin': null, // depends on subpath
      'reports': 'reports',
      'invites': 'invites',
      'voiceChannels': 'voice_channels',
      'vcSignal': 'vc_signal',
      'typing': 'typing',
      'threads': 'threads',
      'events': 'events',
      'bastionSettings': 'bastion_settings',
      'bastionTemplates': 'bastion_templates',
      'feedback': 'feedback',
    };
    if (parts[0] === 'groupChats') {
      if (parts.length >= 3 && parts[2] === 'messages') return 'group_chat_messages';
      if (parts.length >= 3 && parts[2] === 'meta') return 'group_chat_meta';
      if (parts.length >= 3 && parts[2] === 'typing') return 'typing';
    }
    if (parts[0] === 'admin') {
      const adminMap = {
        'bans': 'admin_bans',
        'staff': 'admin_staff',
        'global_settings': 'admin_global_settings',
        'force_refresh': 'admin_force_refresh',
        'clear_sessions': 'admin_clear_sessions',
        'staff_revoked': 'admin_staff_revoked',
        'audit_log': 'admin_audit_log',
        'nsfw_queue': 'admin_nsfw_queue',
        'scheduled_actions': 'admin_scheduled_actions',
      };
      return adminMap[parts[1]] || null;
    }
    return map[parts[0]] || null;
  }

  function _pathToFilter(parts, table) {
    if (table === 'notifications' && parts.length >= 2) return 'username=eq.' + parts[1];
    if (table === 'dms' && parts.length >= 2) return 'dm_key=eq.' + parts[1];
    if (table === 'bastion_msgs' && parts.length >= 2) return 'bastion_id=eq.' + parts[1];
    if (table === 'statuses' && parts.length >= 2) return 'username=eq.' + parts[1];
    if (table === 'admin_bans' && parts.length >= 3) return 'username=eq.' + parts[2];
    if (table === 'admin_staff_revoked' && parts.length >= 3) return 'username=eq.' + parts[2];
    if (table === 'group_chat_messages' && parts.length >= 2) return 'gc_id=eq.' + parts[1];
    if (table === 'voice_channels' && parts.length >= 2) return 'bastion_id=eq.' + parts[1];
    if (table === 'users' && parts.length >= 2) return 'username=eq.' + parts[1];
    if (table === 'polls' && parts.length >= 2) return 'bastion_id=eq.' + parts[1];
    if (table === 'global_bastions' && parts.length >= 2) return 'id=eq.' + parts[1];
    if (table === 'bastion_members' && parts.length >= 2) return 'bastion_id=eq.' + parts[1];
    if (table === 'group_chat_meta' && parts.length >= 2) return 'id=eq.' + parts[1];
    if (table === 'threads' && parts.length >= 2) return 'bastion_id=eq.' + parts[1];
    if (table === 'events' && parts.length >= 2) return 'bastion_id=eq.' + parts[1];
    if (table === 'bastion_settings' && parts.length >= 2) return 'bastion_id=eq.' + parts[1];
    if (table === 'invites' && parts.length >= 2) return 'code=eq.' + parts[1];
    return null;
  }

  function _rowToSnapVal(table, row, parts) {
    if (!row) return null;
    if (table === 'notifications') return { id: row.id, type: row.type, from: row.from, time: row.time, read: row.read, ...(row.data || {}) };
    if (table === 'dms') return { id: row.id, from: row.from, text: row.text, time: row.time, timestamp: row.timestamp, edited: row.edited };
    if (table === 'bastion_msgs') return { id: row.id, from: row.from, text: row.text, time: row.time, timestamp: row.timestamp, edited: row.edited, reactions: row.reactions };
    if (table === 'group_chat_messages') return { id: row.id, from: row.from, text: row.text, time: row.time, timestamp: row.timestamp, ...(row.data || {}) };
    if (table === 'polls') return row.data || row;
    if (table === 'statuses') return row.status;
    if (table === 'users') return FortizedSocial._userFromRow(row);
    if (table === 'global_bastions') return row.data || row;
    if (table === 'invites') return row.data || row;
    if (table === 'events') return row.data || row;
    return row.data || row;
  }

  // ── Install the firebase.database() shim ────────────
  window.firebase = window.firebase || {};
  window.firebase.apps = window.firebase.apps || [{ name: 'supabase-shim' }];
  window.firebase.initializeApp = window.firebase.initializeApp || function() {};
  window.firebase.database = function() {
    return {
      ref: function(path) {
        return createRef(path || '');
      },
    };
  };

  console.log('[Fortized] Firebase-to-Supabase compatibility shim loaded');

})();
