// ════════════════════════════════════════════════════════════════
// FORTIZED 2026 FEATURES — All new features & enhancements
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════
// 1. MESSAGE THREADS (sub-conversations)
// ════════════════════════════════════════════
let _activeThread = null;
let _threadListener = null;

function openThread(msgId, parentText, parentFrom, context) {
  if (!msgId) return;
  _closeThread();
  _activeThread = { msgId, parentText, parentFrom, context };
  const b = CU?.bastions?.[curBastion];
  const bid = b?.globalId || b?.name;
  const chName = b?.channels?.[curChannel]?.name || 'general';

  const panel = document.createElement('div');
  panel.id = 'thread-panel';
  panel.className = 'thread-panel';
  panel.innerHTML = `
    <div class="tp-header">
      <div style="flex:1;">
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#fff;">Thread</div>
        <div style="font-size:11px;color:var(--muted);">Replying to ${escapeHTML(parentFrom)}</div>
      </div>
      <button onclick="_closeThread()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:4px;">✕</button>
    </div>
    <div class="tp-original">
      <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px;">${escapeHTML(parentFrom)}</div>
      <div style="font-size:12.5px;color:var(--muted-light);line-height:1.45;">${escapeHTML((parentText||'').slice(0,300))}</div>
    </div>
    <div class="tp-msgs" id="thread-msgs">
      <div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;">No replies yet. Start the conversation!</div>
    </div>
    <div class="tp-input-bar">
      <textarea id="thread-input" placeholder="Reply in thread..." rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendThreadMsg();}"></textarea>
    </div>`;
  document.body.appendChild(panel);
  _loadThreadMessages(bid, chName, msgId);
}

function _closeThread() {
  _activeThread = null;
  if (_threadListener) { try { _threadListener(); } catch {} _threadListener = null; }
  document.getElementById('thread-panel')?.remove();
}

async function _loadThreadMessages(bid, chName, parentId) {
  const msgsEl = document.getElementById('thread-msgs');
  if (!msgsEl) return;
  try {
    const path = `threads/${bid}/${chName}/${parentId}`;
    const snap = await firebase.database().ref(path).get();
    const msgs = snap.exists() ? Object.values(snap.val()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];
    if (msgs.length === 0) {
      msgsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;">No replies yet. Start the conversation!</div>';
    } else {
      msgsEl.innerHTML = msgs.map(m => `
        <div style="padding:8px 16px;display:flex;gap:10px;" data-msgid="${escapeHTML(m.id||'')}">
          <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;overflow:hidden;">${buildAvatarHTML(null, m.from, 28)}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
              <span style="font-size:12px;font-weight:700;color:var(--text);">${escapeHTML(m.from||'')}</span>
              <span style="font-size:10px;color:var(--muted);">${m.time || ''}</span>
            </div>
            <div style="font-size:13px;color:var(--muted-light);line-height:1.45;word-break:break-word;">${typeof parseMD === 'function' ? parseMD(escapeHTML(m.text||'')) : escapeHTML(m.text||'')}</div>
          </div>
        </div>`).join('');
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    // Async load avatars
    msgs.forEach(async m => {
      try {
        const u = await FortizedSocial.getUserByName(m.from);
        if (u?.pfp) {
          const el = msgsEl.querySelector(`[data-msgid="${CSS.escape(m.id||'')}"] div:first-child`);
          if (el) el.innerHTML = buildAvatarHTML(u.pfp, m.from, 28);
        }
      } catch {}
    });
    // Live listener
    if (_threadListener) try { _threadListener(); } catch {}
    const ref = firebase.database().ref(path);
    const handler = ref.on('child_added', snap => {
      const msg = snap.val();
      if (!msg || msgsEl.querySelector(`[data-msgid="${CSS.escape(msg.id||'')}"]`)) return;
      const div = document.createElement('div');
      div.style.cssText = 'padding:8px 16px;display:flex;gap:10px;';
      div.dataset.msgid = msg.id || '';
      div.innerHTML = `
        <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;overflow:hidden;">${buildAvatarHTML(null, msg.from, 28)}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:12px;font-weight:700;color:var(--text);">${escapeHTML(msg.from||'')}</span>
            <span style="font-size:10px;color:var(--muted);">${msg.time || ''}</span>
          </div>
          <div style="font-size:13px;color:var(--muted-light);line-height:1.45;word-break:break-word;">${typeof parseMD === 'function' ? parseMD(escapeHTML(msg.text||'')) : escapeHTML(msg.text||'')}</div>
        </div>`;
      msgsEl.appendChild(div);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    });
    _threadListener = () => ref.off('child_added', handler);
  } catch (e) { console.warn('Thread load error:', e); }
}

async function sendThreadMsg() {
  if (!_activeThread) return;
  const inp = document.getElementById('thread-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  const b = CU?.bastions?.[curBastion];
  const bid = b?.globalId || b?.name;
  const chName = b?.channels?.[curChannel]?.name || 'general';
  const now = new Date();
  const msg = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    from: CU.username,
    text,
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: now.toISOString()
  };
  try {
    await firebase.database().ref(`threads/${bid}/${chName}/${_activeThread.msgId}/${msg.id}`).set(msg);
    // Update thread count on parent message
    firebase.database().ref(`bastionMsgs/${bid}/${chName}/${_activeThread.msgId}/threadCount`).transaction(n => (n || 0) + 1);
  } catch (e) { console.warn('Send thread error:', e); }
}

function renderThreadIndicator(msgId, threadCount) {
  if (!threadCount || threadCount < 1) return '';
  return `<div class="thread-indicator" onclick="event.stopPropagation();_openThreadFromMsg('${escapeHTML(msgId)}')">
    <div class="thread-line"></div>
    <div class="thread-info">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      ${threadCount} ${threadCount === 1 ? 'reply' : 'replies'}
      <span class="thread-count">View Thread</span>
    </div>
  </div>`;
}

function _openThreadFromMsg(msgId) {
  const row = document.querySelector(`[data-msgid="${CSS.escape(msgId)}"]`);
  const text = row?.dataset?.text || '';
  const from = row?.dataset?.from || '';
  openThread(msgId, text, from, curDM ? 'dm' : 'ch');
}


// ════════════════════════════════════════════
// 2. TYPING INDICATORS (channel)
// ════════════════════════════════════════════
let _chTypingTimeout = null;
let _chIsTyping = false;
let _chTypingListenerOff = null;

function _chTypingPath(bastionId, channelName) {
  return 'chTyping/' + bastionId + '/' + channelName;
}

function broadcastChannelTyping() {
  if (!CU?.username || curBastion === null || curChannel === null) return;
  const b = CU.bastions?.[curBastion];
  if (!b) return;
  const bid = b.globalId || b.name;
  const chName = b.channels?.[curChannel]?.name || 'general';
  const ref = firebase.database().ref(_chTypingPath(bid, chName) + '/' + CU.username);
  if (!_chIsTyping) {
    _chIsTyping = true;
    ref.set({ ts: Date.now(), username: CU.username });
    ref.onDisconnect().remove();
  }
  clearTimeout(_chTypingTimeout);
  _chTypingTimeout = setTimeout(() => {
    _chIsTyping = false;
    ref.remove().catch(() => {});
  }, 2500);
}

function _stopChannelTypingBroadcast() {
  _chIsTyping = false;
  clearTimeout(_chTypingTimeout);
  if (CU?.username && curBastion !== null && curChannel !== null) {
    const b = CU.bastions?.[curBastion];
    if (b) {
      const bid = b.globalId || b.name;
      const chName = b.channels?.[curChannel]?.name || 'general';
      firebase.database().ref(_chTypingPath(bid, chName) + '/' + CU.username).remove().catch(() => {});
    }
  }
}

function _listenChannelTyping(bastionId, channelName) {
  if (_chTypingListenerOff) { try { _chTypingListenerOff(); } catch {} _chTypingListenerOff = null; }
  const ref = firebase.database().ref(_chTypingPath(bastionId, channelName));
  const handler = ref.on('value', snap => {
    const data = snap.val() || {};
    const others = Object.values(data).filter(v => v && v.username && v.username !== CU.username && (Date.now() - (v.ts || 0)) < 5000);
    const bar = document.getElementById('ch-typing-bar');
    const txt = document.getElementById('ch-typing-text');
    if (!bar || !txt) return;
    if (others.length > 0) {
      const names = others.map(v => v.username).slice(0, 3);
      const label = names.length === 1 ? `<strong style="color:rgba(255,255,255,.5);">${escapeHTML(names[0])}</strong> is typing...`
        : names.length === 2 ? `<strong style="color:rgba(255,255,255,.5);">${escapeHTML(names[0])}</strong> and <strong style="color:rgba(255,255,255,.5);">${escapeHTML(names[1])}</strong> are typing...`
        : `<strong style="color:rgba(255,255,255,.5);">${escapeHTML(names[0])}</strong> and ${names.length - 1} others are typing...`;
      txt.innerHTML = label;
      bar.style.opacity = '1';
    } else {
      bar.style.opacity = '0';
    }
  });
  _chTypingListenerOff = () => ref.off('value', handler);
}


// ════════════════════════════════════════════
// 3. ADVANCED SEARCH
// ════════════════════════════════════════════
let _searchFilters = { user: '', hasImage: false, hasLink: false, inChannel: '' };

function openAdvancedSearch() {
  document.getElementById('ftz-search-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'ftz-search-modal';
  modal.className = 'search-modal';
  modal.onclick = e => { if (e.target === modal) closeAdvancedSearch(); };
  _searchFilters = { user: '', hasImage: false, hasLink: false, inChannel: '' };
  modal.innerHTML = `
    <div class="sm-box">
      <div class="sm-input-row">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="adv-search-inp" placeholder="Search messages..." autofocus oninput="_debounceSearch(this.value)" onkeydown="if(event.key==='Escape')closeAdvancedSearch()">
        <button onclick="closeAdvancedSearch()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;">✕</button>
      </div>
      <div class="sm-filters" id="adv-search-filters">
        <div class="sm-filter-chip" onclick="_toggleSearchFilter(this,'hasImage')">has:image</div>
        <div class="sm-filter-chip" onclick="_toggleSearchFilter(this,'hasLink')">has:link</div>
        <input id="adv-search-user" class="sm-filter-chip" style="width:100px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.04);color:var(--text);font-size:11px;padding:4px 10px;outline:none;" placeholder="from:user" oninput="_searchFilters.user=this.value.replace('from:','');_debounceSearch(document.getElementById('adv-search-inp')?.value)">
      </div>
      <div class="sm-results" id="adv-search-results">
        <div class="sm-empty">Type to search across all your messages and channels</div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('adv-search-inp')?.focus(), 50);
}

function closeAdvancedSearch() {
  document.getElementById('ftz-search-modal')?.remove();
}

function _toggleSearchFilter(el, key) {
  _searchFilters[key] = !_searchFilters[key];
  el.classList.toggle('active');
  _debounceSearch(document.getElementById('adv-search-inp')?.value);
}

let _searchTimer = null;
function _debounceSearch(q) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => _performSearch(q), 300);
}

async function _performSearch(query) {
  const results = document.getElementById('adv-search-results');
  if (!results) return;
  if (!query || query.length < 2) {
    results.innerHTML = '<div class="sm-empty">Type at least 2 characters to search</div>';
    return;
  }
  results.innerHTML = '<div class="sm-empty" style="display:flex;align-items:center;gap:8px;justify-content:center;"><div class="load-spinner" style="width:16px;height:16px;border-width:2px;"></div> Searching...</div>';

  const q = query.toLowerCase();
  const found = [];

  // Search DM messages
  const partners = await FortizedSocial.getRecentDMPartners(CU.username);
  for (const partner of (partners || []).slice(0, 10)) {
    try {
      const msgs = await FortizedSocial.getDMMessages(CU.username, partner);
      for (const m of (msgs || [])) {
        if (_matchesSearch(m, q)) {
          found.push({ ...m, context: 'DM with ' + partner, contextType: 'dm', partner });
        }
      }
    } catch {}
  }

  // Search bastion channel messages
  for (const b of (CU.bastions || [])) {
    const bid = b.globalId || b.name;
    for (const ch of (b.channels || [])) {
      if (ch.type === 'voice') continue;
      if (_searchFilters.inChannel && ch.name.toLowerCase() !== _searchFilters.inChannel.toLowerCase()) continue;
      try {
        const msgs = await FortizedSocial.getBastionChannelMessages(bid, ch.name);
        for (const m of (msgs || [])) {
          if (_matchesSearch(m, q)) {
            found.push({ ...m, context: b.name + ' #' + ch.name, contextType: 'ch', bastionName: b.name, channelName: ch.name });
          }
        }
      } catch {}
    }
  }

  // Sort by timestamp descending
  found.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (found.length === 0) {
    results.innerHTML = '<div class="sm-empty">No messages found matching your search.</div>';
    return;
  }

  results.innerHTML = found.slice(0, 50).map(m => {
    const highlighted = escapeHTML(m.text || '').replace(new RegExp('(' + escapeHTML(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    return `<div class="sm-result" onclick="_jumpToSearchResult(${JSON.stringify(m.contextType).replace(/"/g, '&quot;')}, '${escapeHTML(m.partner || '')}', '${escapeHTML(m.bastionName || '')}', '${escapeHTML(m.channelName || '')}')">
      <div class="sm-r-av">${buildAvatarHTML(null, m.from, 32)}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <span style="font-size:12px;font-weight:700;color:var(--text);">${escapeHTML(m.from || '')}</span>
          <span style="font-size:10px;color:var(--muted);">${escapeHTML(m.context || '')}</span>
        </div>
        <div class="sm-r-text">${highlighted.slice(0, 200)}</div>
      </div>
      <div class="sm-r-meta">${m.timestamp ? formatTimeAgo(m.timestamp) : ''}</div>
    </div>`;
  }).join('');
}

function _matchesSearch(msg, query) {
  const text = (msg.text || '').toLowerCase();
  if (!text.includes(query)) return false;
  if (_searchFilters.user && (msg.from || '').toLowerCase() !== _searchFilters.user.toLowerCase()) return false;
  if (_searchFilters.hasImage && !/(https?:\/\/\S+\.(jpg|jpeg|png|gif|webp))/i.test(msg.text)) return false;
  if (_searchFilters.hasLink && !/(https?:\/\/)/i.test(msg.text)) return false;
  return true;
}

function _jumpToSearchResult(type, partner, bastionName, channelName) {
  closeAdvancedSearch();
  if (type === 'dm' && partner) {
    openDMView(partner);
  } else if (type === 'ch' && bastionName && channelName) {
    const bIdx = (CU.bastions || []).findIndex(b => b.name === bastionName);
    if (bIdx >= 0) {
      openBastion(bIdx);
      const chIdx = (CU.bastions[bIdx].channels || []).findIndex(c => c.name === channelName);
      if (chIdx >= 0) setTimeout(() => selectChannel(chIdx), 200);
    }
  }
}


// ════════════════════════════════════════════
// 4. KEYBOARD SHORTCUTS (PC only)
// ════════════════════════════════════════════
const _shortcuts = [
  { keys: ['Ctrl', 'K'], label: 'Quick Search', action: () => openAdvancedSearch() },
  { keys: ['Ctrl', '/'], label: 'Show Shortcuts', action: () => showKeyboardShortcuts() },
  { keys: ['Ctrl', 'Shift', 'M'], label: 'Toggle Mute', action: () => { if (typeof toggleMic === 'function') toggleMic(); } },
  { keys: ['Escape'], label: 'Close Panel / Modal', action: () => {
    closeAdvancedSearch(); _closeThread();
    document.querySelector('.kb-modal')?.remove();
    document.getElementById('pins-panel')?.remove();
    document.getElementById('ftz-search-modal')?.remove();
  }},
  { keys: ['Ctrl', 'Shift', 'N'], label: 'New DM', action: () => { if (typeof openModal === 'function') { openModal('modal-new-dm'); if (typeof switchNewDMTab === 'function') switchNewDMTab('dm'); } } },
  { keys: ['Alt', '1'], label: 'Go Home', action: () => showView('home') },
  { keys: ['Alt', '2'], label: 'Direct Messages', action: () => showView('dms') },
  { keys: ['Alt', '3'], label: 'Discover', action: () => showView('discover') },
];

function _initKeyboardShortcuts() {
  // Only on desktop
  if (window.innerWidth <= 768) return;
  document.addEventListener('keydown', e => {
    for (const sc of _shortcuts) {
      const needCtrl = sc.keys.includes('Ctrl');
      const needShift = sc.keys.includes('Shift');
      const needAlt = sc.keys.includes('Alt');
      const key = sc.keys.filter(k => !['Ctrl', 'Shift', 'Alt'].includes(k))[0];
      if (needCtrl !== (e.ctrlKey || e.metaKey)) continue;
      if (needShift !== e.shiftKey) continue;
      if (needAlt !== e.altKey) continue;
      if (key && e.key !== key && e.key.toLowerCase() !== key.toLowerCase()) continue;
      // Don't fire if typing in input
      if (!needCtrl && !needAlt && document.activeElement?.tagName === 'TEXTAREA') continue;
      if (!needCtrl && !needAlt && document.activeElement?.tagName === 'INPUT') continue;
      e.preventDefault();
      sc.action();
      return;
    }
  });
}

function showKeyboardShortcuts() {
  document.querySelector('.kb-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'kb-modal';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  const groups = {
    'Navigation': _shortcuts.filter(s => s.keys.some(k => k === 'Alt') || s.label.includes('Home') || s.label.includes('DM') || s.label.includes('Discover')),
    'Actions': _shortcuts.filter(s => !s.keys.some(k => k === 'Alt') && !s.label.includes('Close')),
    'General': _shortcuts.filter(s => s.label.includes('Close')),
  };
  modal.innerHTML = `
    <div class="kb-box">
      <div class="kb-header">
        <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#fff;">Keyboard Shortcuts</div>
        <button onclick="this.closest('.kb-modal').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;">✕</button>
      </div>
      <div class="kb-list">
        <div style="font-size:11px;color:var(--muted);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          PC Keyboard Shortcuts Only
        </div>
        ${Object.entries(groups).map(([name, items]) => `
          <div class="kb-group">
            <div class="kb-group-title">${name}</div>
            ${items.map(sc => `
              <div class="kb-item">
                <span class="kb-label">${sc.label}</span>
                <div class="kb-keys">${sc.keys.map(k => `<span class="kb-key">${k}</span>`).join('')}</div>
              </div>`).join('')}
          </div>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(modal);
}


// ════════════════════════════════════════════
// 5. ENHANCED SERVER BOOSTING
// ════════════════════════════════════════════
async function boostBastionEnhanced(level, cost) {
  if ((CU.onyx || 0) < cost) { toast('Not enough Onyx! You need ' + cost + ' Onyx.', 'error'); return; }
  const tierNames = ['', 'Reinforced', 'Fortified', 'Sovereign'];
  showCustomConfirm(`Boost to Level ${level} (${tierNames[level]}) for ${cost} Onyx?`, async () => {
    CU.onyx = (CU.onyx || 0) - cost;
    CU.bastions[curBastion].boostLevel = level;
    CU.bastions[curBastion].boostHistory = CU.bastions[curBastion].boostHistory || [];
    CU.bastions[curBastion].boostHistory.push({ level, by: CU.username, at: new Date().toISOString(), cost });
    await saveUser();
    updateOnyxDisplay();
    renderBSettingsMain('boost');
    awardBoostRep(CU.bastions[curBastion].globalId || CU.bastions[curBastion].name, CU.username);
    toast(`⚡ Boosted to Level ${level} — ${tierNames[level]}!`, 'success');
  });
}


// ════════════════════════════════════════════
// 6. ENHANCED PINNED MESSAGES (Firebase-backed)
// ════════════════════════════════════════════
function pinMessageEnhanced(msgId, text) {
  const ctx = curDM ? 'dm' : 'ch';
  const pins = getPinnedMessages(ctx);
  if (pins.find(p => p.id === msgId)) { toast('Already pinned', 'info'); return; }
  const row = document.querySelector(`[data-msgid="${CSS.escape(msgId)}"]`);
  const from = row?.dataset.from || '';
  const pin = { id: msgId, text: (text || '').slice(0, 300), from, pinned: new Date().toISOString(), pinnedBy: CU.username };
  pins.unshift(pin);
  savePinnedMessages(ctx, pins);
  // Also save to Firebase for persistence
  if (!curDM && curBastion !== null) {
    const b = CU.bastions?.[curBastion];
    const bid = b?.globalId || b?.name;
    const chName = b?.channels?.[curChannel]?.name || 'general';
    try { firebase.database().ref(`pinnedMsgs/${bid}/${chName}/${msgId}`).set(pin); } catch {}
  }
  toast('Message pinned!', 'success');
  if (document.getElementById('pins-panel') || document.getElementById('pins-panel-2')) showPinnedMessagesEnhanced();
}

function showPinnedMessagesEnhanced() {
  const ctx = curDM ? 'dm' : 'ch';
  const pins = getPinnedMessages(ctx);
  document.getElementById('pins-panel')?.remove();
  document.getElementById('pins-panel-2')?.remove();
  const panel = document.createElement('div');
  panel.id = 'pins-panel-2';
  panel.className = 'pins-panel-2';
  panel.innerHTML = `
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
      <div style="flex:1;font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#fff;">Pinned Messages</div>
      <span style="font-size:11px;color:var(--muted);">${pins.length} pins</span>
      <button onclick="document.getElementById('pins-panel-2')?.remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:4px;">✕</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:12px;">
      ${pins.length ? pins.map((p, i) => `
        <div class="pin-card" onclick="scrollToMsg('${CSS.escape(p.id)}')">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span class="pin-from">${escapeHTML(p.from || '')}</span>
            <button onclick="event.stopPropagation();unpinMessageEnhanced('${CSS.escape(p.id)}',${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;padding:2px 5px;" title="Unpin">✕</button>
          </div>
          <div class="pin-text">${escapeHTML(p.text || '')}</div>
          <div class="pin-time">${p.pinned ? formatTimeAgo(p.pinned) : ''} · pinned by ${escapeHTML(p.pinnedBy || 'someone')}</div>
        </div>`).join('')
      : '<div style="text-align:center;padding:40px 20px;color:var(--muted);"><div style="font-size:32px;margin-bottom:12px;">📌</div><div style="font-size:13px;">No pinned messages yet.</div><div style="font-size:11px;color:var(--muted);margin-top:4px;">Right-click a message to pin it.</div></div>'}
    </div>`;
  document.body.appendChild(panel);
}

function unpinMessageEnhanced(msgId, idx) {
  const ctx = curDM ? 'dm' : 'ch';
  const pins = getPinnedMessages(ctx).filter((p, i) => i !== idx);
  savePinnedMessages(ctx, pins);
  if (!curDM && curBastion !== null) {
    const b = CU.bastions?.[curBastion];
    const bid = b?.globalId || b?.name;
    const chName = b?.channels?.[curChannel]?.name || 'general';
    try { firebase.database().ref(`pinnedMsgs/${bid}/${chName}/${msgId}`).remove(); } catch {}
  }
  showPinnedMessagesEnhanced();
  toast('Message unpinned', 'info');
}


// ════════════════════════════════════════════
// 7. CUSTOM SOUNDBOARD
// ════════════════════════════════════════════
let _soundboardOpen = false;
const _defaultSounds = [
  { name: 'Airhorn', emoji: '📯', url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=' },
  { name: 'Drum Roll', emoji: '🥁' },
  { name: 'Rimshot', emoji: '🎵' },
  { name: 'Sad Trombone', emoji: '🎺' },
  { name: 'Applause', emoji: '👏' },
  { name: 'Cricket', emoji: '🦗' },
  { name: 'Boing', emoji: '🏀' },
  { name: 'Ding', emoji: '🔔' },
  { name: 'Quack', emoji: '🦆' },
];

function toggleSoundboard() {
  if (_soundboardOpen) { closeSoundboard(); return; }
  const hasRadiance = CU?.radianceUntil && new Date(CU.radianceUntil) > new Date();
  if (!hasRadiance) { toast('Soundboard requires Basic Radiance or Radiance+', 'error'); return; }
  _soundboardOpen = true;
  const custom = JSON.parse(localStorage.getItem('ftz_soundboard_' + CU.username) || '[]');
  const allSounds = [..._defaultSounds, ...custom];
  const panel = document.createElement('div');
  panel.id = 'soundboard-panel';
  panel.className = 'soundboard-panel';
  panel.innerHTML = `
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">
      <span style="font-size:16px;">🎵</span>
      <div style="flex:1;font-family:'Syne',sans-serif;font-size:13px;font-weight:800;">Soundboard</div>
      <button onclick="addSoundboardClip()" style="background:rgba(255,249,62,.08);border:1px solid rgba(255,249,62,.15);color:var(--accent);padding:3px 10px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;">+ Add</button>
      <button onclick="closeSoundboard()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;">✕</button>
    </div>
    <div class="sb-grid">
      ${allSounds.map((s, i) => `
        <div class="sb-clip" id="sb-clip-${i}" onclick="playSoundClip(${i})">
          <span>${s.emoji || '🔊'}</span>
          <span class="sb-name">${escapeHTML(s.name || 'Sound')}</span>
        </div>`).join('')}
    </div>`;
  document.body.appendChild(panel);
}

function closeSoundboard() {
  _soundboardOpen = false;
  document.getElementById('soundboard-panel')?.remove();
}

function playSoundClip(idx) {
  const custom = JSON.parse(localStorage.getItem('ftz_soundboard_' + CU.username) || '[]');
  const allSounds = [..._defaultSounds, ...custom];
  const sound = allSounds[idx];
  if (!sound) return;
  const el = document.getElementById('sb-clip-' + idx);
  if (el) { el.classList.add('playing'); setTimeout(() => el.classList.remove('playing'), 500); }
  // Play a simple tone for default sounds (no actual audio file)
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = ['sine', 'square', 'sawtooth', 'triangle'][idx % 4];
    osc.frequency.setValueAtTime(220 + idx * 80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440 + idx * 60, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function addSoundboardClip() {
  showCustomInput('Sound Name', 'Name your sound clip:', name => {
    if (!name) return;
    showCustomInput('Emoji', 'Pick an emoji for this clip:', emoji => {
      const custom = JSON.parse(localStorage.getItem('ftz_soundboard_' + CU.username) || '[]');
      if (custom.length >= 12) { toast('Maximum 12 custom sounds', 'error'); return; }
      custom.push({ name, emoji: emoji || '🔊', custom: true });
      localStorage.setItem('ftz_soundboard_' + CU.username, JSON.stringify(custom));
      closeSoundboard();
      toggleSoundboard();
      toast('Sound added!', 'success');
    });
  });
}


// ════════════════════════════════════════════
// 8. EVENTS / CALENDAR
// ════════════════════════════════════════════
function openEventsPanel() {
  if (curBastion === null) return;
  const b = CU.bastions?.[curBastion];
  if (!b) return;
  const events = b.events || [];
  const bid = b.globalId || b.name;
  const isOwner = b.owner === CU.username;
  const canManage = isOwner || ((b.memberRoles || {})[CU.username] || []).some(rid => (b.roles || []).find(r => r.id === rid)?.permissions?.includes('manage_events'));

  const wrap = document.getElementById('bastion-chat-wrap');
  if (!wrap) return;

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = events.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date));

  wrap.innerHTML = `
    <div style="padding:24px;overflow-y:auto;flex:1;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#fff;">Events</div>
          <div style="font-size:12px;color:var(--muted);">Bastion events with RSVPs and reminders</div>
        </div>
        ${canManage ? '<button class="btn-a" onclick="createEventModal()" style="padding:8px 16px;font-size:13px;">+ Create Event</button>' : ''}
      </div>
      ${upcoming.length ? `
        <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;">Upcoming</div>
        ${upcoming.map((e, i) => _renderEventCard(e, events.indexOf(e), bid)).join('')}` : ''}
      ${!upcoming.length && !past.length ? '<div style="text-align:center;padding:60px 20px;color:var(--muted);"><div style="font-size:48px;margin-bottom:12px;">📅</div><div style="font-family:Syne,sans-serif;font-size:16px;font-weight:800;margin-bottom:8px;">No Events Yet</div><div style="font-size:12px;">Create an event to get started!</div></div>' : ''}
      ${past.length ? `
        <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:20px 0 10px;">Past Events</div>
        ${past.slice(0, 5).map((e, i) => _renderEventCard(e, events.indexOf(e), bid, true)).join('')}` : ''}
    </div>`;
}

function _renderEventCard(ev, idx, bid, isPast) {
  const d = new Date(ev.date);
  const rsvps = ev.rsvps || [];
  const isRsvped = rsvps.includes(CU.username);
  const countdown = _getCountdown(d);
  return `<div class="event-card${isPast ? ' past' : ''}" style="${isPast ? 'opacity:.5;' : ''}">
    <div class="ev-date">${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    <div class="ev-title">${escapeHTML(ev.title || 'Untitled Event')}</div>
    ${ev.description ? `<div class="ev-desc">${escapeHTML(ev.description)}</div>` : ''}
    <div class="ev-footer">
      <span>👥 ${rsvps.length} interested</span>
      ${!isPast && countdown ? `<span class="event-countdown">${countdown}</span>` : ''}
      ${!isPast ? `<div class="ev-rsvp" style="margin-left:auto;">
        <button class="ev-rsvp-btn ${isRsvped ? 'rsvped' : ''}" onclick="toggleEventRSVP(${idx})">${isRsvped ? '✓ Going' : 'Interested'}</button>
      </div>` : ''}
    </div>
  </div>`;
}

function _getCountdown(date) {
  const now = new Date();
  const diff = date - now;
  if (diff < 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `in ${hours}h ${mins}m` : `in ${mins}m`;
}

async function toggleEventRSVP(idx) {
  const b = CU.bastions?.[curBastion]; if (!b) return;
  b.events = b.events || [];
  const ev = b.events[idx]; if (!ev) return;
  ev.rsvps = ev.rsvps || [];
  const i = ev.rsvps.indexOf(CU.username);
  if (i >= 0) ev.rsvps.splice(i, 1);
  else ev.rsvps.push(CU.username);
  await saveUser();
  _syncBastionToGlobal(curBastion);
  openEventsPanel();
}

function createEventModal() {
  showCustomInput('Event Title', 'What\'s the event?', title => {
    if (!title) return;
    showCustomInput('Date & Time', 'YYYY-MM-DD HH:MM', dateStr => {
      if (!dateStr) return;
      showCustomInput('Description', 'Optional description:', desc => {
        const b = CU.bastions?.[curBastion]; if (!b) return;
        b.events = b.events || [];
        b.events.push({ title, date: new Date(dateStr).toISOString(), description: desc || '', rsvps: [CU.username], createdBy: CU.username });
        saveUser();
        _syncBastionToGlobal(curBastion);
        openEventsPanel();
        toast('Event created!', 'success');
      });
    });
  });
}


// ════════════════════════════════════════════
// 9. POLLS 2.0 (inline enhanced polls)
// ════════════════════════════════════════════
function createInlinePoll(channelContext) {
  showCustomInput('Poll Question', 'What do you want to ask?', question => {
    if (!question) return;
    showCustomInput('Options', 'Enter options separated by commas (e.g., Yes, No, Maybe):', optStr => {
      if (!optStr) return;
      const options = optStr.split(',').map(o => o.trim()).filter(Boolean);
      if (options.length < 2) { toast('Need at least 2 options', 'error'); return; }
      showCustomInput('Expiration', 'Minutes until poll closes (0 = never):', minutes => {
        const expiresIn = parseInt(minutes) || 0;
        const poll = {
          question,
          options: options.map(o => ({ label: o, votes: [] })),
          anonymous: false,
          createdBy: CU.username,
          createdAt: new Date().toISOString(),
          expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 60000).toISOString() : null,
        };
        // Send as a special message
        const pollText = `[POLL] ${question}\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;
        if (curDM) {
          // DMs - store poll data in message
          const inp = document.getElementById('dm-input');
          if (inp) { inp.value = pollText; }
        } else {
          // Channel
          const b = CU.bastions?.[curBastion];
          const bid = b?.globalId || b?.name;
          const chName = b?.channels?.[curChannel]?.name || 'general';
          const pollKey = Date.now().toString(36);
          firebase.database().ref(`polls/${bid}/${chName}/${pollKey}`).set(poll);
          const inp = document.getElementById('ch-input');
          if (inp) { inp.value = `📊 **Poll:** ${question} — Vote below!`; }
        }
        toast('Poll created!', 'success');
      });
    });
  });
}


// ════════════════════════════════════════════
// 10. USER NOTES (private, per-user)
// ════════════════════════════════════════════
function getUserNote(targetUsername) {
  const notes = JSON.parse(localStorage.getItem('ftz_user_notes_' + (CU?.username || '')) || '{}');
  return notes[targetUsername] || '';
}

function setUserNote(targetUsername, note) {
  const notes = JSON.parse(localStorage.getItem('ftz_user_notes_' + (CU?.username || '')) || '{}');
  if (note) notes[targetUsername] = note;
  else delete notes[targetUsername];
  localStorage.setItem('ftz_user_notes_' + (CU?.username || ''), JSON.stringify(notes));
}

function renderUserNoteSection(targetUsername) {
  const note = getUserNote(targetUsername);
  return `<div class="user-note-section">
    <div class="note-label">Note</div>
    <textarea placeholder="Add a private note about this user..." onblur="setUserNote('${escapeHTML(targetUsername)}',this.value)">${escapeHTML(note)}</textarea>
  </div>`;
}


// ════════════════════════════════════════════
// 11. SLOW MODE PER CHANNEL
// ════════════════════════════════════════════
let _slowModeCooldowns = {};

function getSlowModeSeconds(channelObj) {
  return channelObj?.slowMode || 0;
}

function setSlowMode(chIdx, seconds) {
  const b = CU.bastions?.[curBastion]; if (!b) return;
  const ch = b.channels?.[chIdx]; if (!ch) return;
  ch.slowMode = seconds;
  saveUser();
  _syncBastionToGlobal(curBastion);
  toast(seconds > 0 ? `Slow mode: ${seconds}s cooldown` : 'Slow mode disabled', 'success');
}

function checkSlowMode() {
  if (curBastion === null || curChannel === null) return true;
  const b = CU.bastions?.[curBastion]; if (!b) return true;
  const ch = b.channels?.[curChannel]; if (!ch) return true;
  const sm = ch.slowMode || 0;
  if (sm <= 0) return true;
  // Owner/admins bypass
  if (b.owner === CU.username) return true;
  const roles = (b.memberRoles || {})[CU.username] || [];
  const isAdmin = roles.some(rid => (b.roles || []).find(r => r.id === rid)?.permissions?.includes('administrator'));
  if (isAdmin) return true;
  const key = curBastion + '_' + curChannel;
  const lastSent = _slowModeCooldowns[key] || 0;
  const remaining = Math.ceil((lastSent + sm * 1000 - Date.now()) / 1000);
  if (remaining > 0) {
    toast(`Slow mode: wait ${remaining}s`, 'info');
    return false;
  }
  return true;
}

function markSlowModeSent() {
  if (curBastion === null || curChannel === null) return;
  _slowModeCooldowns[curBastion + '_' + curChannel] = Date.now();
}


// ════════════════════════════════════════════
// 12. FRIEND LIST SORTING
// ════════════════════════════════════════════
let _friendSortMode = 'online';

function setFriendSortMode(mode, el) {
  _friendSortMode = mode;
  localStorage.setItem('ftz_friend_sort', mode);
  document.querySelectorAll('.friend-sort-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderDMFriendsHome();
}

function getSortedFriends(friends) {
  const mode = _friendSortMode || localStorage.getItem('ftz_friend_sort') || 'online';
  const arr = [...(friends || [])];
  // Default: return as-is; actual sorting happens async after status fetch
  return arr;
}

function renderFriendSortChips() {
  const mode = _friendSortMode || 'online';
  return `<div class="friend-sort-chips" style="margin-bottom:8px;">
    <div class="friend-sort-chip ${mode === 'online' ? 'active' : ''}" onclick="setFriendSortMode('online',this)">Online First</div>
    <div class="friend-sort-chip ${mode === 'alpha' ? 'active' : ''}" onclick="setFriendSortMode('alpha',this)">A-Z</div>
    <div class="friend-sort-chip ${mode === 'recent' ? 'active' : ''}" onclick="setFriendSortMode('recent',this)">Recently Active</div>
    <div class="friend-sort-chip ${mode === 'added' ? 'active' : ''}" onclick="setFriendSortMode('added',this)">Recently Added</div>
  </div>`;
}


// ════════════════════════════════════════════
// 13. FAVOURITES / QUICK ACCESS
// ════════════════════════════════════════════
function getFavourites() {
  return JSON.parse(localStorage.getItem('ftz_favs_' + (CU?.username || '')) || '[]');
}

function setFavourites(arr) {
  localStorage.setItem('ftz_favs_' + (CU?.username || ''), JSON.stringify(arr));
}

function toggleFavourite(type, id, label) {
  const favs = getFavourites();
  const idx = favs.findIndex(f => f.type === type && f.id === id);
  if (idx >= 0) {
    favs.splice(idx, 1);
    toast('Removed from favourites', 'info');
  } else {
    favs.unshift({ type, id, label: label || id });
    toast('Added to favourites!', 'success');
  }
  setFavourites(favs);
}

function isFavourite(type, id) {
  return getFavourites().some(f => f.type === type && f.id === id);
}

function renderFavouritesSection() {
  const favs = getFavourites();
  if (!favs.length) return '';
  return `<div class="fav-section">
    <div class="fav-label">★ FAVOURITES</div>
    ${favs.slice(0, 8).map(f => {
      const icon = f.type === 'dm' ? '💬' : f.type === 'channel' ? '#' : '🏰';
      const onclick = f.type === 'dm' ? `openDMView('${escapeHTML(f.id)}')`
        : f.type === 'channel' ? `_openFavChannel('${escapeHTML(f.id)}')`
        : `_openFavBastion('${escapeHTML(f.id)}')`;
      return `<div class="fav-item" onclick="${onclick}">
        <span style="font-size:14px;opacity:.5;">${icon}</span>
        <span style="font-size:12.5px;font-weight:600;">${escapeHTML(f.label || f.id)}</span>
        <span class="fav-star">★</span>
      </div>`;
    }).join('')}
  </div><div class="rail-sep" style="margin:6px 12px;"></div>`;
}

function _openFavChannel(id) {
  const parts = id.split('/');
  if (parts.length >= 2) {
    const bIdx = (CU.bastions || []).findIndex(b => (b.globalId || b.name) === parts[0]);
    if (bIdx >= 0) {
      openBastion(bIdx);
      const chIdx = (CU.bastions[bIdx].channels || []).findIndex(c => c.name === parts[1]);
      if (chIdx >= 0) setTimeout(() => selectChannel(chIdx), 200);
    }
  }
}

function _openFavBastion(id) {
  const bIdx = (CU.bastions || []).findIndex(b => (b.globalId || b.name) === id);
  if (bIdx >= 0) openBastion(bIdx);
}


// ════════════════════════════════════════════
// 14. NOTIFICATION SETTINGS PER CHANNEL
// ════════════════════════════════════════════
function getChannelNotifSetting(bastionId, channelName) {
  const settings = JSON.parse(localStorage.getItem('ftz_ch_notif_' + (CU?.username || '')) || '{}');
  return settings[bastionId + '/' + channelName] || 'all';
}

function setChannelNotifSetting(bastionId, channelName, setting) {
  const settings = JSON.parse(localStorage.getItem('ftz_ch_notif_' + (CU?.username || '')) || '{}');
  settings[bastionId + '/' + channelName] = setting;
  localStorage.setItem('ftz_ch_notif_' + (CU?.username || ''), JSON.stringify(settings));
  toast(`Channel notifications: ${setting}`, 'success');
}

function showChannelNotifSettings(bastionId, channelName, anchorEl) {
  document.querySelector('.notif-settings-dd')?.remove();
  const current = getChannelNotifSetting(bastionId, channelName);
  const dd = document.createElement('div');
  dd.className = 'notif-settings-dd';
  dd.innerHTML = [
    { val: 'all', icon: '🔔', label: 'All Messages' },
    { val: 'mentions', icon: '📢', label: 'Mentions Only' },
    { val: 'muted', icon: '🔇', label: 'Muted' },
  ].map(o => `<div class="nsd-item ${current === o.val ? 'active' : ''}" onclick="setChannelNotifSetting('${escapeHTML(bastionId)}','${escapeHTML(channelName)}','${o.val}');this.closest('.notif-settings-dd').remove()">
    <span>${o.icon}</span> ${o.label}
  </div>`).join('');
  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    dd.style.position = 'fixed';
    dd.style.top = rect.bottom + 4 + 'px';
    dd.style.left = rect.left + 'px';
  }
  document.body.appendChild(dd);
  setTimeout(() => document.addEventListener('click', function _close(e) {
    if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', _close); }
  }), 10);
}


// ════════════════════════════════════════════
// 15. UNDO DELETE (5-second toast)
// ════════════════════════════════════════════
let _undoDeleteTimer = null;
let _undoDeleteData = null;

function deleteMsgWithUndo(msgId, context) {
  const _curDM = curDM;
  const _curGC = typeof curGC !== 'undefined' ? curGC : null;
  const _curBastion = curBastion;
  const _curChannel = curChannel;
  const row = document.querySelector(`[data-msgid="${CSS.escape(msgId)}"]`);
  if (!row) return;

  // Store data for undo
  const msgData = {
    id: msgId,
    text: row.dataset.text || '',
    from: row.dataset.from || '',
    context: context || (_curDM ? 'dm' : _curGC ? 'gc' : 'ch'),
    curDM: _curDM,
    curGC: _curGC,
    curBastion: _curBastion,
    curChannel: _curChannel,
    html: row.outerHTML,
    nextSibling: row.nextSibling,
    parent: row.parentElement,
  };

  // Animate out
  row.style.transition = 'opacity .2s ease, transform .2s ease, max-height .25s ease';
  row.style.opacity = '0';
  row.style.transform = 'translateX(-12px)';
  row.style.maxHeight = row.offsetHeight + 'px';
  row.style.overflow = 'hidden';
  setTimeout(() => { row.style.maxHeight = '0'; row.style.padding = '0'; row.style.margin = '0'; }, 80);
  setTimeout(() => row.remove(), 300);

  _undoDeleteData = msgData;
  _showUndoToast(msgData);
}

function _showUndoToast(data) {
  document.querySelector('.undo-toast')?.remove();
  clearTimeout(_undoDeleteTimer);

  const toast_el = document.createElement('div');
  toast_el.className = 'undo-toast';
  toast_el.innerHTML = `
    <span class="undo-text">Message deleted</span>
    <button class="undo-btn" onclick="_undoDelete()">Undo</button>
    <div class="undo-timer"><div class="undo-timer-fill" id="undo-timer-fill" style="width:100%"></div></div>`;
  document.body.appendChild(toast_el);

  // Animate timer
  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed += 100;
    const fill = document.getElementById('undo-timer-fill');
    if (fill) fill.style.width = Math.max(0, 100 - (elapsed / 5000) * 100) + '%';
    if (elapsed >= 5000) { clearInterval(interval); }
  }, 100);

  _undoDeleteTimer = setTimeout(() => {
    toast_el.remove();
    _confirmDelete(data);
    _undoDeleteData = null;
  }, 5000);
}

function _undoDelete() {
  clearTimeout(_undoDeleteTimer);
  document.querySelector('.undo-toast')?.remove();
  if (!_undoDeleteData) return;
  const data = _undoDeleteData;
  _undoDeleteData = null;
  // Re-insert the message row
  if (data.parent && data.html) {
    const temp = document.createElement('div');
    temp.innerHTML = data.html;
    const restored = temp.firstChild;
    if (restored) {
      restored.style.cssText = '';
      if (data.nextSibling && data.parent.contains(data.nextSibling)) {
        data.parent.insertBefore(restored, data.nextSibling);
      } else {
        data.parent.appendChild(restored);
      }
    }
  }
  toast('Message restored!', 'success');
}

function _confirmDelete(data) {
  if (!data || data.id.startsWith('local-')) return;
  let ref = null;
  try {
    if (data.context === 'dm' && data.curDM) {
      ref = firebase.database().ref(`dms/${[CU.username, data.curDM].sort().join('__')}/${data.id}`);
    } else if (data.context === 'gc' && data.curGC) {
      ref = firebase.database().ref(`groupChats/${data.curGC}/messages/${data.id}`);
    } else {
      const b = CU.bastions?.[data.curBastion];
      const ch = b?.channels?.[data.curChannel];
      const bid = b?.globalId || b?.name;
      const chName = ch?.name || 'general';
      if (bid && chName) ref = firebase.database().ref(`bastionMsgs/${bid}/${chName}/${data.id}`);
    }
    if (ref) ref.remove().catch(e => console.warn('Delete error:', e));
  } catch (e) { console.error('Delete confirm error:', e); }
}


// ════════════════════════════════════════════
// 16. BASTION MANAGEMENT 2.0
// ════════════════════════════════════════════
function renderBastionManagement2() {
  const b = CU.bastions?.[curBastion]; if (!b) return '';
  const bid = b.globalId || b.name;
  const memberCount = b.memberCount || 1;
  const channelCount = (b.channels || []).length;
  const boostLv = b.boostLevel || 0;
  const emojiCount = (b.customEmojis || []).length;
  const roleCount = (b.roles || []).length;
  const eventCount = (b.events || []).length;

  return `
    <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:8px;">🏰 Bastion Dashboard</div>
    <div style="font-size:12px;color:var(--muted-light);margin-bottom:20px;">Overview and quick management for ${escapeHTML(b.name)}</div>

    <div class="bm2-dashboard">
      <div class="bm2-stat-card">
        <div class="bm2-stat-val">${memberCount}</div>
        <div class="bm2-stat-label">Members</div>
      </div>
      <div class="bm2-stat-card">
        <div class="bm2-stat-val">${channelCount}</div>
        <div class="bm2-stat-label">Channels</div>
      </div>
      <div class="bm2-stat-card">
        <div class="bm2-stat-val">Lv.${boostLv}</div>
        <div class="bm2-stat-label">Boost Level</div>
      </div>
      <div class="bm2-stat-card">
        <div class="bm2-stat-val">${roleCount}</div>
        <div class="bm2-stat-label">Roles</div>
      </div>
    </div>

    <div class="bm2-quick-actions">
      <div class="bm2-quick-btn" onclick="openBastionSettings('channels')">
        <span class="bm2-qicon">📝</span>Manage Channels
      </div>
      <div class="bm2-quick-btn" onclick="openBastionSettings('roles')">
        <span class="bm2-qicon">🛡️</span>Manage Roles
      </div>
      <div class="bm2-quick-btn" onclick="openBastionSettings('emojis')">
        <span class="bm2-qicon">😊</span>Custom Emojis
      </div>
      <div class="bm2-quick-btn" onclick="openBastionSettings('invites')">
        <span class="bm2-qicon">🔗</span>Invites
      </div>
      <div class="bm2-quick-btn" onclick="openEventsPanel()">
        <span class="bm2-qicon">📅</span>Events (${eventCount})
      </div>
      <div class="bm2-quick-btn" onclick="openBastionSettings('boost')">
        <span class="bm2-qicon">⚡</span>Boost
      </div>
      <div class="bm2-quick-btn" onclick="openBastionSettings('automod')">
        <span class="bm2-qicon">🛡️</span>AutoMod
      </div>
      <div class="bm2-quick-btn" onclick="openBastionSettings('members')">
        <span class="bm2-qicon">👥</span>Members
      </div>
      <div class="bm2-quick-btn" onclick="openBastionSettings('mood')">
        <span class="bm2-qicon">🏰</span>Mood
      </div>
    </div>

    <div style="padding:16px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:14px;">
      <div style="font-weight:700;margin-bottom:10px;">Quick Settings</div>
      <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
        <input type="checkbox" ${b.public !== false ? 'checked' : ''} onchange="CU.bastions[curBastion].public=this.checked;saveUser();_syncBastionToGlobal(curBastion);toast(this.checked?'Bastion is now public':'Bastion is now private','success');">
        <span style="font-size:13px;">Public (visible in Discover)</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
        <input type="checkbox" ${b.automod?.antiSpam ? 'checked' : ''} onchange="CU.bastions[curBastion].automod=CU.bastions[curBastion].automod||{};CU.bastions[curBastion].automod.antiSpam=this.checked;saveUser();toast('Anti-spam '+(this.checked?'enabled':'disabled'),'success');">
        <span style="font-size:13px;">Anti-Spam Protection</span>
      </label>
    </div>`;
}


// ════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════
function _initFortized2026Features() {
  _initKeyboardShortcuts();
  _friendSortMode = localStorage.getItem('ftz_friend_sort') || 'online';
  console.log('[Fortized] 2026 features initialized');
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initFortized2026Features);
} else {
  setTimeout(_initFortized2026Features, 500);
}
