/* ═══════════════════════════════════════════════════════════════════════════
   THE CHAT TRANSPORT, UNDER TEST          node tests/test-chat-transport.mjs
   ───────────────────────────────────────────────────────────────────────────
   Pulls the REAL sendMessage() and the three conversation builders out of
   app.js and runs every branch against stubs. Nothing is reimplemented here:
   rename a function and this fails to find it rather than quietly testing a
   copy that no longer resembles the app.

   It exists because the send path is the hottest code in the product and the
   sandbox cannot boot the logged-in app. A refactor of chat that is only
   eyeballed is a refactor that ships a broken chat.
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'app', 'app.js'), 'utf8');

function extract(decl) {
  const i = SRC.indexOf(decl);
  if (i < 0) throw new Error('not found: ' + decl);
  const open = SRC.indexOf('{', i + decl.length - 1);
  let d = 0, j = open;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '{') d++;
    else if (SRC[j] === '}') { d--; if (!d) break; }
  }
  return SRC.slice(i, j + 1);
}

const WANT = ['function _chatMsgId()', 'function _convDM(peer)', 'function _convGC(gcId)',
  'function _convChannel(idx)', 'function _convFor(context, chIdx)',
  'function _chatKind(ctx)', 'function _currentChatKind()', 'function _isBastionChat(ctx)',
  'function _canModerateChat(ctx)',
  'function _reEscape(s)', 'function _mentionScan(text, b)', 'function _mentionsMe(text, b)',
  'function _bastionAt(bIdx)', 'function _bstRolesOf(b, user)',
  'function _notifyMentionsInText(text, ctx, b)',
  'async function sendMessage(conv)', 'async function sendDM()',
  'async function sendGCMessage()', 'async function sendChannelMsg(idx)'];
const code = WANT.map(extract).join('\n\n');

// ── The world ─────────────────────────────────────────────────────────────
let L, S;                                // the log and the chat state for one scenario
const reset = () => { L = { toasts: [], persisted: [], emitted: [], queued: [], quest: 0,
  mentions: [], failed: [], appended: [], confirmed: [], ratecard: 0, bots: [], warned: [] }; };

// ⚠️ new Function passes its arguments BY VALUE, so the mutable chat globals
// (CU, curDM, curGC, curBastion, curChannel, replyingTo, _outlineMode) cannot
// be injected that way — they would freeze at whatever they held when the
// function was built, and every scenario would silently run against nulls.
// They are declared INSIDE the generated scope and set through _set().
const MUTABLE = ['CU', 'curDM', 'curGC', 'curBastion', 'curChannel', 'replyingTo', '_outlineMode'];

const env = {
  window: {}, console,
  CSS: { escape: s => String(s) },

  isViewerChatSuspended: () => !!S.CU?.chatSuspendedUntil,
  isFortizedOfficialAccount: n => n === 'fortized',
  isSuperAdmin: () => S.CU?.username === 'staw',
  isUserBlocked: n => env.blockedList?.includes(n),
  // mention_everyone is asked separately from send_messages, so the two are
  // controlled separately here — a member who may post is not thereby a
  // member who may ping the whole bastion.
  _bstCan: (b, u, perm, ch) => perm === 'mention_everyone' ? env.canMassMention === true : env.canSend !== false,
  hasPerm: () => env.canModerate === true,
  autoModCheck: (t, b) => env.bastionAutomodBlocks === true && (L.toasts.push(['Links are disabled in this bastion','error']), true),

  toast: (m, t) => L.toasts.push([m, t]),
  _showRateLimitPopup: () => L.ratecard++,
  showContentWarning: w => L.warned.push(w),
  contentSafetyCheck: () => env.safety || null,
  runAutomod: () => env.automod || {},
  _recentAutomodContext: () => [],

  _readChatInput: () => env.draft,
  preprocessMessageText: t => t,
  clearChatInput: () => { env.draft = ''; },
  _stopTypingBroadcast: () => {}, _stopGCTypingBroadcast: () => {}, _stopChannelTypingBroadcast: () => {},
  cancelReply: () => { S.replyingTo = null; },
  _removeNewMsgBar: () => {},
  _getCurrentChatKey: () => env.chatKey,

  document: { getElementById: id => id.endsWith('-input') || id.endsWith('-msgs') || id.startsWith('ch-msgs')
    ? { value: '', querySelectorAll: () => [], querySelector: () => ({ dataset: {} }) } : null },

  appendMessage: (el, msg) => L.appended.push(msg),
  scrollBottom: () => {},
  _registerPendingSend: (k) => L.confirmed.push('pending:' + k),
  _confirmOptimisticSend: (k, m) => L.confirmed.push('confirm:' + k),
  _markMessageFailed: (el, id, payload) => L.failed.push(payload),
  _enqueueOfflineMessage: e => L.queued.push(e),
  _isOnlineForSend: () => env.online !== false,
  _sendWithAutoRetry: fn => fn(),
  _trackSendMsgQuest: () => { L.quest++; },
  _processBotCommands: (t) => L.bots.push(t),

  FortizedSocial: {
    sendDMMessage: (...a) => { if (env.sendThrows) throw new Error('boom'); L.persisted.push(['dm', ...a]); return null; },
    sendBastionChannelMessage: (...a) => { if (env.sendThrows) throw new Error('boom'); L.persisted.push(['ch', ...a]); return null; },
    socketEmit: (ev, p) => L.emitted.push(p),
    notifyMention: (from, to, ctx) => { L.mentions.push({ from, to, ctx }); },
  },
  firebase: { database: () => ({ ref: p => ({ set: v => { if (env.sendThrows) throw new Error('boom'); L.persisted.push(['gc', p, v]); } }) }) },
};

const names = Object.keys(env);
const run = new Function(...names,
  'var ' + MUTABLE.join(', ') + ';\n' + code +
  '\n; return { sendDM, sendGCMessage, sendChannelMsg,' +
  '  _chatKind, _currentChatKind, _isBastionChat, _canModerateChat,' +
  '  _mentionScan, _mentionsMe,' +
  '  _set: s => { ' + MUTABLE.map(m => m + ' = s.' + m + ';').join(' ') + ' },' +
  '  _get: () => ({ ' + MUTABLE.join(', ') + ' }) };'
)(...names.map(n => env[n]));

// ── Scenarios ─────────────────────────────────────────────────────────────
const results = [];
const check = (name, cond, detail) => results.push({ name, ok: !!cond, detail: cond ? '' : detail });

function base() {
  reset();
  S = {
    CU: { username: 'staw', bastions: [{ name: 'Keep', globalId: 'g1', channels: [{ name: 'general' }] }] },
    curDM: null, curGC: null, curBastion: 0, curChannel: 0,
    replyingTo: null, _outlineMode: false,
  };
  Object.assign(env, {
    draft: 'hello there', chatKey: null, blockedList: [], canSend: true, canMassMention: false,
    bastionAutomodBlocks: false, safety: null, automod: {}, online: true, sendThrows: false,
  });
}
// Push the scenario's chat state into the generated scope, then run.
const go = async (fn, ...a) => { run._set(S); return run[fn](...a); };

// 1 · The bug this phase exists to fix: the rate limit never ran in channels.
base(); env.safety = 'WHOA_EASY';
await go('sendChannelMsg', 0);
check('channel: spam rate limit blocks the send', L.ratecard === 1 && L.persisted.length === 0,
  `ratecard=${L.ratecard} persisted=${L.persisted.length}`);

base(); S.curDM = 'leafen'; env.safety = 'WHOA_EASY';
await go('sendDM');
check('dm: spam rate limit still blocks (unchanged)', L.ratecard === 1 && L.persisted.length === 0, '');

// 2 · Automod flags now reach a channel message.
base(); env.automod = { isRephrased: true, rephrased: 'hello there!', threat: { isThreat: true } };
await go('sendChannelMsg', 0);
check('channel: rephrased + threat flags ride along',
  L.appended[0]?.flags?.join() === 'rephrased,threat' && L.appended[0].text === 'hello there!',
  JSON.stringify(L.appended[0]));

// 3 · Permission is enforced at the mutation, not one caller up.
base(); env.canSend = false;
await go('sendChannelMsg', 0);
check('channel: no send_messages permission refuses at the mutation',
  L.persisted.length === 0 && /permission/.test(L.toasts[0]?.[0] || ''), JSON.stringify(L.toasts));

// 4 · A failed send must not pay the quest.
base(); env.sendThrows = true;
await go('sendChannelMsg', 0);
check('failed send does not count toward the quest', L.quest === 0 && L.failed.length === 1,
  `quest=${L.quest} failed=${L.failed.length}`);

base();
await go('sendChannelMsg', 0);
check('successful send counts once', L.quest === 1, `quest=${L.quest}`);

// 5 · Mentions: GC and channel notify, a DM deliberately does not.
base(); env.draft = 'hey @leafen';
await go('sendChannelMsg', 0);
check('channel: mentions notify with bastion context',
  L.mentions[0]?.to === 'leafen' && L.mentions[0]?.ctx?.channel === 'general', JSON.stringify(L.mentions));

base(); S.curGC = 'gc7'; env.draft = 'hey @leafen';
await go('sendGCMessage');
check('gc: mentions notify with gc context',
  L.mentions[0]?.to === 'leafen' && L.mentions[0]?.ctx?.gc === 'gc7', JSON.stringify(L.mentions));

base(); S.curDM = 'leafen'; env.draft = 'hey @someoneelse';
await go('sendDM');
check('dm: does NOT notify a third party', L.mentions.length === 0, JSON.stringify(L.mentions));

// 6 · DM guards survive.
base(); S.curDM = 'fortized'; S.CU.username = 'bob';
await go('sendDM');
check('dm: official account is broadcast-only', L.persisted.length === 0 && /official/.test(L.toasts[0]?.[0] || ''), '');

base(); S.curDM = 'leafen'; env.blockedList = ['leafen'];
await go('sendDM');
check('dm: blocked peer refuses', L.persisted.length === 0 && /blocked/i.test(L.toasts[0]?.[0] || ''), '');

// 7 · Offline queues instead of failing, with the right shape per surface.
base(); env.online = false;
await go('sendChannelMsg', 0);
check('channel: offline queues with bastion+channel', L.queued[0]?.kind === 'ch' && L.queued[0].bastion === 'g1'
  && L.queued[0].channel === 'general' && L.persisted.length === 0, JSON.stringify(L.queued));

base(); S.curDM = 'leafen'; env.online = false;
await go('sendDM');
check('dm: offline queues with target', L.queued[0]?.kind === 'dm' && L.queued[0].target === 'leafen', JSON.stringify(L.queued));

base(); S.curGC = 'gc7'; env.online = false;
await go('sendGCMessage');
check('gc: offline queues with target', L.queued[0]?.kind === 'gc' && L.queued[0].target === 'gc7', JSON.stringify(L.queued));

// 8 · Reply scoping: a reply staged in another chat must not bleed through.
base(); S.replyingTo = { id: 'm1', chatKey: 'dm:someoneelse' }; env.chatKey = 'ch:g1:general';
await go('sendChannelMsg', 0);
check('a reply staged elsewhere is dropped', L.appended[0]?.replyTo === undefined, JSON.stringify(L.appended[0]));

base(); S.replyingTo = { id: 'm1', chatKey: 'ch:g1:general' }; env.chatKey = 'ch:g1:general';
await go('sendChannelMsg', 0);
check('a reply staged here is carried', L.appended[0]?.replyTo?.id === 'm1', JSON.stringify(L.appended[0]));

// 9 · GC now writes by explicit key, at the path the offline drain rebuilds.
base(); S.curGC = 'gc7';
await go('sendGCMessage');
check('gc: persists at groupChats/<id>/messages/<msgid>',
  L.persisted[0]?.[1] === 'groupChats/gc7/messages/' + L.appended[0].id, JSON.stringify(L.persisted[0]?.[1]));
check('gc: no redundant `time` field', L.persisted[0]?.[2]?.time === undefined, JSON.stringify(L.persisted[0]?.[2]));

// 10 · Outline mode now works in a group chat too, and is consumed once.
base(); S.curGC = 'gc7'; S._outlineMode = true;
await go('sendGCMessage');
check('gc: outline mode is honoured', L.appended[0]?.outline === true, JSON.stringify(L.appended[0]));

// 11 · Bot commands still fire, including offline.
base(); env.draft = '!roll 20'; env.online = false;
await go('sendChannelMsg', 0);
check('channel: bot command fires even offline', L.bots[0] === '!roll 20', JSON.stringify(L.bots));

base(); S.curDM = 'leafen'; env.draft = '!roll 20';
await go('sendDM');
check('dm: no bot commands', L.bots.length === 0, JSON.stringify(L.bots));

// 12 · An empty draft never sends.
base(); env.draft = '   ' && '';
await go('sendChannelMsg', 0);
check('empty draft sends nothing', L.appended.length === 0 && L.persisted.length === 0, '');

// 13 · The bastion's own automod still blocks.
base(); env.bastionAutomodBlocks = true;
await go('sendChannelMsg', 0);
check('channel: bastion automod blocks', L.persisted.length === 0 && L.appended.length === 0, '');

// 14 · Phase 1b: one spelling for the surface kind, one moderation question.
base();
run._set(S);
check('kind: every legacy spelling of a channel normalises to ch',
  ['ch', 'channel', 'bastion'].every(k => run._chatKind(k) === 'ch')
  && run._chatKind('dm') === 'dm' && run._chatKind('gc') === 'gc',
  ['ch','channel','bastion','dm','gc'].map(k => k + '->' + run._chatKind(k)).join(' '));

check('kind: a Conversation resolves the same as its legacy string',
  run._chatKind({ kind: 'channel' }) === 'ch' && run._chatKind({ kind: 'dm' }) === 'dm', '');

check('bastion chat: only a channel has roles and badges',
  run._isBastionChat('ch') && run._isBastionChat('channel')
  && !run._isBastionChat('dm') && !run._isBastionChat('gc'), '');

// ⚠️ manage_messages is per-bastion, so a moderator in one bastion must not be
// able to moderate a DM or a group chat.
base(); env.canModerate = true; run._set(S);
check('moderation: a moderator may moderate a channel', run._canModerateChat('ch') === true, '');
check('moderation: NOT a DM, however much power they hold',
  run._canModerateChat('dm') === false && run._canModerateChat('gc') === false, '');
base(); env.canModerate = false; run._set(S);
check('moderation: a plain member may not moderate a channel', run._canModerateChat('ch') === false, '');

base(); S.curDM = 'leafen'; run._set(S);
check('current kind: a DM reads as dm', run._currentChatKind() === 'dm', run._currentChatKind());
base(); S.curGC = 'gc7'; run._set(S);
check('current kind: a group chat reads as gc', run._currentChatKind() === 'gc', run._currentChatKind());
base(); run._set(S);
check('current kind: neither open reads as ch', run._currentChatKind() === 'ch', run._currentChatKind());

// 15 · Phase 1e: one mention resolver.
// A bastion with a role ladder, so roles and role-holders can be told apart.
const RB = {
  name: 'Keep', globalId: 'g1', channels: [{ name: 'general' }],
  roles: [
    { id: 'r1', name: 'Mod', color: '#f00' },
    { id: 'r2', name: 'Mod Team', color: '#0f0', mentionable: true },
    { id: 'r3', name: 'Head Moderator', color: '#00f' },
  ],
  memberRoles: { staw: ['r2'] },
};
const scan = (t, b) => { run._set(S); return run._mentionScan(t, b); };
const mine = (t, b) => { run._set(S); return run._mentionsMe(t, b); };

base();
check('scan: @everyone and @here are recognised',
  scan('hey @everyone and @here').everyone === true && scan('hey @everyone and @here').here === true, '');

// ⚠️ The old parseMD matched a bare /@everyone/ with no boundary at all.
check('scan: @everyonelse is NOT a mass mention',
  scan('@everyonelse').everyone === false && scan('an@everyone').everyone === false,
  JSON.stringify(scan('@everyonelse')));

check('scan: usernames come back lowercased and deduped',
  scan('@Leafen @leafen @joyster').users.join() === 'leafen,joyster',
  JSON.stringify(scan('@Leafen @leafen @joyster').users));

// The headline defect: a role called 'Mod' must not swallow '@Mod Team', and
// '@Head Moderator' must not read as a mention of a member called 'Head'.
check('scan: the longest role name wins',
  scan('ping @Mod Team now', RB).roles.map(r => r.id).join() === 'r2',
  JSON.stringify(scan('ping @Mod Team now', RB).roles.map(r => r.name)));
check('scan: a multi-word role is not read as a user',
  scan('@Head Moderator help', RB).roles.map(r => r.id).join() === 'r3'
  && scan('@Head Moderator help', RB).users.length === 0,
  JSON.stringify(scan('@Head Moderator help', RB)));
check('scan: a role name outranks a same-named user',
  scan('@Mod please', RB).roles.map(r => r.id).join() === 'r1'
  && scan('@Mod please', RB).users.length === 0, '');
check('scan: with no bastion a role name is only a user',
  scan('@Mod please').users.join() === 'mod' && scan('@Mod please').roles.length === 0, '');

// _mentionsMe — the four substring tests it replaces.
base();
check('mentionsMe: @staw inside @stawwastaken does NOT ping staw',
  mine('hello @stawwastaken', RB) === false, 'the case-sensitive substring bug is back');
check('mentionsMe: case does not matter', mine('hey @STAW', RB) === true, '');
check('mentionsMe: a plain other name does not ping', mine('hey @leafen', RB) === false, '');
check('mentionsMe: @everyone and @here ping everybody',
  mine('@everyone', RB) === true && mine('@here', RB) === true, '');
check('mentionsMe: a role I hold pings me', mine('@Mod Team up', RB) === true, '');
check('mentionsMe: a role I do NOT hold does not', mine('@Head Moderator up', RB) === false, '');

// The permission, enforced at the mutation.
base(); S.CU.bastions = [RB]; env.draft = 'listen up @everyone';
await go('sendChannelMsg', 0);
check('mass mention without mention_everyone is refused at the mutation',
  L.persisted.length === 0 && /permission/.test(L.toasts[0]?.[0] || ''), JSON.stringify(L.toasts));

base(); S.CU.bastions = [RB]; env.draft = 'listen up @everyone'; env.canMassMention = true;
await go('sendChannelMsg', 0);
check('mass mention with the permission goes through', L.persisted.length === 1, JSON.stringify(L.toasts));

base(); S.CU.bastions = [RB]; env.draft = 'ping @Head Moderator';
await go('sendChannelMsg', 0);
check('a role that is not open to mentions is refused',
  L.persisted.length === 0 && /not open to mentions/.test(L.toasts[0]?.[0] || ''), JSON.stringify(L.toasts));

base(); S.CU.bastions = [RB]; env.draft = 'ping @Mod Team';
await go('sendChannelMsg', 0);
check('a role marked "let anyone mention it" needs no permission', L.persisted.length === 1, JSON.stringify(L.toasts));

// ⚠️ The egress rule: a mass mention must not fan out one write per member.
base(); S.CU.bastions = [RB]; env.draft = 'hi @everyone'; env.canMassMention = true;
await go('sendChannelMsg', 0);
check('@everyone writes NO per-member notifications', L.mentions.length === 0, JSON.stringify(L.mentions));

base(); env.draft = '@a1 @b2 @c3 @d4 @e5 @f6 @g7';
await go('sendChannelMsg', 0);
check('direct mentions stay capped at 5 a message', L.mentions.length === 5, String(L.mentions.length));

base(); env.draft = 'me: @staw and @leafen';
await go('sendChannelMsg', 0);
check('mentioning yourself notifies nobody but the other person',
  L.mentions.length === 1 && L.mentions[0].to === 'leafen', JSON.stringify(L.mentions));

// ── Report ────────────────────────────────────────────────────────────────
let pass = 0;
for (const r of results) {
  console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.name + (r.ok ? '' : '   ' + r.detail));
  if (r.ok) pass++;
}
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
