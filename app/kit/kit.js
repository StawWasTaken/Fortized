/* ═══════════════════════════════════════════════════════════════════════════
   THE COMPONENT KIT
   ───────────────────────────────────────────────────────────────────────────
   One catalogue of every component Fortized is allowed to build out of, in
   every state, rendered against the REAL app/styles.css by the REAL helper
   functions out of app.js.

   Why it runs the real helpers instead of holding copies of their markup:
   a kit that carries its own copy of a component drifts from the app within
   a week, and then it is worse than no kit — it says the design is fine while
   the app looks different. So the helpers are pulled out of app.js at load
   time. If one is renamed or deleted, its card turns red and says so, which is
   exactly the signal we want.

   ⚠️ This file must never define a component style. Its own chrome lives in
   kit.html under .kit-*. If a component looks wrong here, styles.css is wrong.
   ═══════════════════════════════════════════════════════════════════════════ */

// ── 1. Pull the real helpers out of app.js ────────────────────────────────
// Brace-matched extraction: find the declaration, walk to its matching close.
// Crude, but it depends on nothing and cannot silently return the wrong thing —
// a missing declaration throws by name.
function _kitExtract(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) throw new Error(decl);
  const tail = decl.trim().slice(-1);
  // A one-liner (a const string, a number) has no block to match — take the
  // rest of its line. Anything else opens a brace or a bracket we walk.
  if (tail !== '{' && tail !== '[' && tail !== '(') {
    const nl = src.indexOf('\n', i);
    return src.slice(i, nl < 0 ? src.length : nl);
  }
  const openCh = decl.trim().endsWith('[') ? '[' : '{';
  const closeCh = openCh === '[' ? ']' : '}';
  const open = src.indexOf(openCh, i + decl.length - 2);
  let depth = 0, j = open;
  for (; j < src.length; j++) {
    if (src[j] === openCh) depth++;
    else if (src[j] === closeCh) { depth--; if (!depth) break; }
  }
  return src.slice(i, j + 1);
}

// Everything the catalogue below needs. Order matters only in that a helper
// may reference another in this same list.
const KIT_HELPERS = [
  'const _FA_ICON_PATHS = {',
  'function _faIcon(',
  'function _ftzTickHTML(',
  'function _ftzCheckHTML(',
  'function _ftzColorFieldHTML(',
  'function _ftzColorPop(',
  'function _ftzSelectHTML(',
  'function _ftzSelectToggle(',
  'function _ftzSelectPick(',
  'function _stfStep(',
  'function _stfStepBy(',
  'function _stfStepKey(',
  'function _stfPill(',
  'function _ftzNotFound(',
  'function _ftzCharSrc(',
  'const _FTZ_NOT_FOUND_LINES = [',
  'const _FTZ_CHARS = {',
  "const _FTZ_CHAR_DIR = '",
];

const KIT = { helpers: {}, missing: [], registry: [] };

// The identifier out of a declaration line. ⚠️ Capture it — do not try to strip
// the tail off. `const _FA_ICON_PATHS = {` trimmed of its trailing brace leaves
// `_FA_ICON_PATHS =`, which lands in the return object as `_FA_ICON_PATHS =,`
// and takes the whole bag down with one "Unexpected token ,".
function _kitDeclName(decl) {
  const m = /^(?:function|const|let|var)\s+([A-Za-z0-9_$]+)/.exec(decl.trim());
  return m ? m[1] : decl.trim();
}

async function kitLoadHelpers() {
  const src = await (await fetch('/app/app.js?kit=' + Date.now())).text();
  const parts = [];
  for (const decl of KIT_HELPERS) {
    try { parts.push(_kitExtract(src, decl)); }
    catch (e) { KIT.missing.push(_kitDeclName(decl)); }
  }
  // A couple of app-wide utilities the helpers assume exist. Shimmed rather
  // than extracted because they are trivial and stable.
  const shim = `
    function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
    function markSettingsDirty(){}
    function updateProfilePreview(){}
  `;
  const names = KIT_HELPERS.map(_kitDeclName).filter(n => !KIT.missing.includes(n));
  // eslint-disable-next-line no-new-func
  const bag = new Function(shim + '\n' + parts.join('\n\n') + '\nreturn {' + names.join(',') + '};')();
  Object.assign(KIT.helpers, bag);
  // The kit's inline onclick attributes need these on window, same as the app.
  Object.keys(bag).forEach(k => { window[k] = bag[k]; });
  window.escapeHTML = window.escapeHTML || ((s) => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
}

// ── 2. The catalogue ──────────────────────────────────────────────────────
// group  · which family it belongs to, and the rail order
// name   · what we call it in conversation
// cls    · the class (or helper) that IS the component
// note   · when to use it, and what not to do with it
// vars   · every state it can be in. If a state is missing here it is
//          undefined behaviour, and the next person will invent one.
function kitRegistry(H) {
  const fa = (n, s) => (H._faIcon ? H._faIcon(n, s) : '');

  return [
  // ─────────────────────────────────────────────── BUTTONS
  { group: 'Buttons', name: '3D button', cls: '.fs-btn',
    note: 'The one button recipe. Rest 0 4px 0 0 var(--ink) · hover translateY(-1px) + 0 5px · press translateY(3px) + 0 1px · border 2px solid var(--ink) · radius pinned across every state so a press can never square it off. Variants change the FILL ONLY, never the geometry.',
    vars: [
      { label: 'Default', html: '<button class="fs-btn">Save changes</button>' },
      { label: 'Primary', html: '<button class="fs-btn fs-btn--primary">Buy for 250</button>' },
      { label: 'Light', html: '<button class="fs-btn fs-btn--light">Later</button>' },
      { label: 'Danger', html: '<button class="fs-btn stf-btn--danger">Delete bastion</button>' },
      { label: 'Good', html: '<button class="fs-btn stf-btn--good">Accept</button>' },
      { label: 'Small', html: '<button class="fs-btn stf-btn--sm">Edit</button>' },
      { label: 'Disabled', html: '<button class="fs-btn fs-btn--primary" disabled>Not enough Onyx</button>' },
      { label: 'With an icon', html: '<button class="fs-btn fs-btn--primary" style="display:inline-flex;align-items:center;gap:8px;">' + fa('plus', 13) + 'New channel</button>' },
    ] },
  { group: 'Buttons', name: 'Round icon control', cls: '.fr-act',
    note: 'A round control for a single action beside a row: accept, decline, more. Stays a circle in every state — do not let a hover or press rewrite border-radius.',
    vars: [
      { label: 'Neutral', html: '<div class="fr-actions"><button class="fr-act">' + fa('pen', 14) + '</button></div>' },
      { label: 'Accept', html: '<div class="fr-actions"><button class="fr-act fr-act--accept">' + fa('check', 14) + '</button></div>' },
      { label: 'Danger', html: '<div class="fr-actions"><button class="fr-act fr-act--danger">' + fa('xmark', 14) + '</button></div>' },
    ] },
  { group: 'Buttons', name: 'Close button', cls: '.ftz-close-btn.ftz-ac-x',
    note: 'SMALL cards close with this. BIG cards close with .settings-close. The glyph is an inline FA xmark, never <i class="fa-…"> — the one control that must never fail to draw cannot depend on a CDN.',
    vars: [
      { label: 'On a card', html: '<div style="position:relative;height:64px;border:2px solid var(--border);border-radius:var(--radius-lg);background:var(--panel);"><button class="ftz-close-btn ftz-ac-x">' + fa('xmark', 15) + '</button></div>' },
    ] },

  // ─────────────────────────────────────────────── CONTROLS
  { group: 'Controls', name: 'Checkbox', cls: '_ftzCheckHTML() · .ftz-chk',
    note: 'THE checkmark. Circular, accent fill, the tick pops in — the one from the Gift Radiance card. Every checkbox in the platform is this one, including bare <input type="checkbox"> which is skinned at element level so old markup gets it for free.',
    vars: H._ftzCheckHTML ? [
      { label: 'On / off', html: H._ftzCheckHTML('k1', 'Community Stats', { checked: true }) + '<div style="height:10px"></div>' + H._ftzCheckHTML('k2', 'Channels Quick-Access', {}) },
      { label: 'With a description', html: H._ftzCheckHTML('k3', 'Latest Announcements', { checked: true, desc: 'Shown at the top of the overview card.' }) },
      { label: 'Disabled', html: H._ftzCheckHTML('k4', 'Requires a Tier 3 bastion', { disabled: true }) },
      { label: 'Card', html: H._ftzCheckHTML('k5', 'I accept the Terms of Service as they apply to a community I run.', { card: true, checked: true }) },
      { label: 'Card, danger', html: H._ftzCheckHTML('k6', 'I understand this cannot be undone for 30 days.', { card: true, danger: true, checked: true }) },
      { label: 'Bare input (legacy markup)', html: '<label style="display:flex;gap:10px;align-items:center;font-size:13px;color:var(--muted-light)"><input type="checkbox" checked> still ours, no markup change</label>' },
    ] : [] },
  { group: 'Controls', name: 'Stepper', cls: '_stfStep() · .stf-step',
    note: 'Numbers. Our arrows, not the browser spinner. Refuses any non-digit keystroke, allowing a minus only when min<0 and a dot only when step<1. There is no reason left to write <input type="number">.',
    vars: H._stfStep ? [
      { label: 'Days', html: H._stfStep('n1', 7, { min: 1, max: 365 }) },
      { label: 'Onyx', html: H._stfStep('n2', 250, { min: 0, max: 50000, step: 50 }) },
      { label: 'At its floor', html: H._stfStep('n3', 0, { min: 0, max: 10 }) },
    ] : [] },
  { group: 'Controls', name: 'Colour picker', cls: '_ftzColorFieldHTML() · _ftzColorPop()',
    note: 'HSV square, hue track, hex field, eyedropper, presets, and a live preview chip that updates on EVERY drag frame — a 6px crosshair is not a preview. Auto-flips if it would open off-screen. Replaces <input type="color"> everywhere; the OS dialog is not our design.',
    vars: H._ftzColorFieldHTML ? [
      { label: 'Closed', html: H._ftzColorFieldHTML('cp1', '#fbbf24', "_kitColorPop(this)", 'Pick your own') },
    ] : [] },
  { group: 'Controls', name: 'Dropdown', cls: '_ftzSelectHTML() · .ftz-select',
    note: 'Ours: a button plus our own popover, with a tick on the chosen row. ⚠️ The handler is _fn(__VALUE__) and never _fn(\'__VALUE__\') — _ftzSelectPick substitutes a JSON string, quotes included. The chosen value lives in a hidden input with the same id, so getElementById(id).value still works.',
    vars: H._ftzSelectHTML ? [
      { label: 'Closed', html: '<div style="max-width:240px">' + H._ftzSelectHTML('s1', 'members', [
        { value: 'members', label: 'Most members' }, { value: 'new', label: 'Newest' }, { value: 'boost', label: 'Most boosted' }], 'void 0') + '</div>' },
    ] : [] },
  { group: 'Controls', name: 'Text field', cls: '.settings-input',
    note: 'The app-standard field: Display Name, Pronouns, and every field built since. ⚠️ It must STAY ROUND on focus — three global rules fight over a focused input and none of them pinned the radius, which is why fields used to go square when clicked.',
    vars: [
      { label: 'Empty', html: '<input class="settings-input" placeholder="Type or paste your code">' },
      { label: 'Filled', html: '<input class="settings-input" value="Bastion of the North">' },
      { label: 'Textarea', html: '<textarea class="settings-input" rows="3">What this bastion is for.</textarea>' },
      { label: 'Disabled', html: '<input class="settings-input" value="fortized" disabled>' },
    ] },
  { group: 'Controls', name: 'Toggle', cls: '.toggle',
    note: 'For a setting that takes effect immediately. A checkbox is for something you then Save. ⚠️ No glow: .toggle.on used to carry an accent halo and it is overridden to none.',
    vars: [
      { label: 'Off', html: '<div class="toggle"><div class="toggle-knob"></div></div>' },
      { label: 'On', html: '<div class="toggle on"><div class="toggle-knob"></div></div>' },
    ] },

  // ─────────────────────────────────────────────── SURFACES
  { group: 'Surfaces', name: 'Panel', cls: '.fs-tb-panel',
    note: 'The default block of content. 2px var(--border) on var(--panel). ⚠️ Thick strokes are var(--border) — var(--ink) is the 3D BUTTON edge and nothing else.',
    vars: [
      { label: 'Plain', html: '<div class="fs-tb-panel" style="padding:16px;">A panel holds one idea. If it holds two, it is two panels.</div>' },
    ] },
  { group: 'Surfaces', name: 'Section head', cls: '.qst-group',
    note: 'Separates stacked sections inside a page. Uppercase, tracked, muted. Not a page title — that belongs in the topbar.',
    vars: [
      { label: 'Plain', html: '<div class="qst-group"><span class="qst-group-t">Featured</span></div>' },
      { label: 'With a note', html: '<div class="qst-group"><span class="qst-group-t">Rising</span><span class="qst-group-note">Measured over the last 7 days</span></div>' },
    ] },
  { group: 'Surfaces', name: 'Page topbar', cls: '.disc-subnav',
    note: 'Every page wears this: mark, title, separator, then icon-less tabs, then actions pushed right. Discover, Fortshop, Quests, Radiance, Friends and the staff console all use it, which is why they read as one app.',
    vars: [
      { label: 'Tabs + an action', html:
        '<div class="disc-subnav" style="position:static">' +
        '<span class="disc-subnav-icon">' + fa('gamepad', 20) + '</span>' +
        '<span class="disc-subnav-title">Discover</span>' +
        '<span class="disc-subnav-sep"></span>' +
        '<button class="disc-subnav-btn active">Bastions</button>' +
        '<button class="disc-subnav-btn">Games</button>' +
        '<button class="disc-subnav-btn">Activities</button>' +
        '<span class="disc-subnav-spacer"></span>' +
        '<button class="fs-btn">I have an invite</button>' +
        '</div>' },
    ] },
  { group: 'Surfaces', name: 'Card footer', cls: '.ftz-modal-foot',
    note: 'The action row at the bottom of a card. Cancel left of confirm, confirm carries the weight.',
    vars: [
      { label: 'Two actions', html: '<div style="border:2px solid var(--border);border-radius:var(--radius-lg);background:var(--panel);overflow:hidden;"><div style="padding:18px;font-size:13px;color:var(--muted-light)">Card body</div><div class="ftz-modal-foot"><button class="fs-btn fs-btn--light">Cancel</button><button class="fs-btn fs-btn--primary">Confirm</button></div></div>' },
    ] },

  // ─────────────────────────────────────────────── STATUS
  { group: 'Status', name: 'Pill', cls: '_stfPill() · .stf-pill',
    note: 'A one-word state on a row: a tier, a verdict, a status. Not a button — a pill is never clickable.',
    vars: H._stfPill ? [
      { label: 'Every tone', html: '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        H._stfPill('Verified', 'good') + H._stfPill('Suspended', 'danger') + H._stfPill('Pending', 'warn') +
        H._stfPill('Community', 'info') + H._stfPill('Tier 3', 'gold') + H._stfPill('Neutral') + '</div>' },
    ] : [] },
  { group: 'Status', name: 'Empty state', cls: '_ftzNotFound() · .ftz-nf',
    note: 'Heroic Search. Every empty surface uses it and every one says the REAL reason — "hide joined emptied this shelf" is not the same as "this shelf is empty". ⚠️ Not every empty state is a failure: inbox zero and a clean record are WINS and take the celebrate art, not the defeated knight.',
    vars: H._ftzNotFound ? [
      { label: 'Nothing found', html: H._ftzNotFound('No bastions match that', 'Try a different word, or clear the filters.') },
      { label: 'A win', html: H._ftzNotFound('Clean record', 'No warnings, no bans, nothing on file.', { art: 'celebrate' }) },
      { label: 'Not started yet', html: H._ftzNotFound('No trades yet', 'Offers you send and receive land here.', { art: 'battle' }) },
      { label: 'Compact', html: H._ftzNotFound('No results', 'Nothing matched.', { compact: true }) },
    ] : [] },

  // ─────────────────────────────────────────────── FOUNDATION
  { group: 'Foundation', name: 'Colour tokens', cls: ':root',
    note: 'Every colour in the platform comes from here. A hardcoded hex in a component is a bug: the appearance system rewrites these tokens at runtime, so anything hardcoded simply stops recolouring.',
    swatches: ['--bg', '--bg2', '--rail', '--sidebar', '--channel', '--panel', '--panel2', '--panel3',
      '--border', '--text', '--muted', '--muted-light', '--accent', '--ink', '--green', '--red',
      '--yellow', '--blue', '--purple', '--gold'] },
  { group: 'Foundation', name: 'Radii, type and motion', cls: 'var(--radius-*) · var(--font-*) · var(--ease-out)',
    note: 'Radii 8 / 12 / 16 / 22 / pill. Syne for anything titled at weight ≤700 — never 800, the codebase is full of legacy 800s and they get dialled down whenever a component is touched. One easing curve, --ease-out.',
    vars: [
      { label: 'Radii', html: '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        ['sm', 'md', 'lg', 'xl', 'pill'].map(r => `<div style="width:82px;height:56px;background:var(--panel2);border:2px solid var(--border);border-radius:var(--radius-${r});display:grid;place-items:center;font-family:var(--font-display);font-size:11px;color:var(--muted-light)">${r}</div>`).join('') + '</div>' },
      { label: 'Syne', html: '<div style="font-family:var(--font-display)">' +
        [400, 500, 600, 700].map(w => `<div style="font-weight:${w};font-size:19px;line-height:1.5">Build your fortress · ${w}</div>`).join('') +
        '<div style="font-weight:800;font-size:19px;line-height:1.5;color:var(--red)">Never 800 · legacy only</div></div>' },
      { label: 'Body', html: '<div style="font-family:var(--font-ui);font-size:13.5px;line-height:1.65;color:var(--muted-light);max-width:56ch">Prose uses DM Sans. Copy carries no em dashes — the user finds them AI-ish, so a middot does that job instead.</div>' },
    ] },
  { group: 'Foundation', name: 'Icons', cls: '_faIcon() · _FA_ICON_PATHS',
    note: 'Filled FontAwesome solid paths, INLINED. Never <i class="fa-…">: FontAwesome is a CDN dependency and an icon that fails to draw is a broken control. Never an OS emoji as an icon. The registry below is everything currently inlined — see docs/design-system.md for the conversion backlog.',
    icons: H._FA_ICON_PATHS ? Object.keys(H._FA_ICON_PATHS) : [] },
  ];
}

// The kit's own colour-field handler, so the picker is genuinely exercised.
function _kitColorPop(btn) {
  KIT.helpers._ftzColorPop(btn, {
    value: '#fbbf24', label: 'Role colour',
    presets: ['#fbbf24', '#60a5fa', '#fb0335', '#3ecf6e', '#a78bfa'],
    onPick(hex) {
      btn.querySelector('.ftz-cpf-sw').style.background = hex;
      btn.querySelector('.ftz-cpf-tx').textContent = hex.toUpperCase();
    }
  });
}
window._kitColorPop = _kitColorPop;

// ── 3. Draw it ────────────────────────────────────────────────────────────
function kitRender() {
  const body = document.getElementById('kit-body');
  const nav = document.getElementById('kit-nav');
  const groups = [];
  KIT.registry.forEach(c => {
    let g = groups.find(x => x.name === c.group);
    if (!g) groups.push(g = { name: c.group, items: [] });
    g.items.push(c);
  });

  nav.innerHTML = groups.map(g =>
    `<div class="kit-navg">${g.name}</div>` +
    g.items.map(c => `<a href="#kit-${kitSlug(c.name)}">${c.name}</a>`).join('')
  ).join('');

  body.innerHTML = groups.map(g =>
    `<div class="kit-group-t">${g.name}</div>` + g.items.map(kitCard).join('')
  ).join('');

  const total = KIT.registry.reduce((n, c) => n + (c.vars ? c.vars.length : 0), 0);

  // The self-check. Every rule the kit is supposed to enforce, asserted against
  // what the components actually rendered — scoped to .kit-c-b so the page's
  // own chrome and prose can never register as a violation.
  const q = (sel) => document.querySelectorAll('.kit-c-b ' + sel).length;
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  KIT.selfCheck = {
    faClassIcons: q('i[class*="fa-"]'),
    nativeNumber: q('input[type=number]'),
    nativeColor: q('input[type=color]'),
    nativeCheckboxUnskinned: [...document.querySelectorAll('.kit-c-b input[type=checkbox]')]
      .filter(el => getComputedStyle(el).appearance !== 'none' && !el.closest('.ftz-chk')).length,
    emojiAsIcon: [...document.querySelectorAll('.kit-c-b *')]
      .filter(el => [...el.childNodes].some(n => n.nodeType === 3 && EMOJI.test(n.nodeValue))).length,
    missingHelpers: KIT.missing.length,
  };
  const bad = Object.entries(KIT.selfCheck).filter(([, v]) => v > 0);
  const stat = document.getElementById('kit-stat');
  stat.textContent = `${KIT.registry.length} components · ${total} states · ` +
    (bad.length ? bad.map(([k, v]) => `${k}: ${v}`).join(' · ') : 'self-check clean');
  stat.style.color = bad.length ? 'var(--red)' : 'var(--green)';
}

function kitSlug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

function kitEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function kitCard(c) {
  // ⚠️ The notes are PROSE and must be escaped. They talk about markup — one of
  // them says "never <i class='fa-…'>" — so injecting them raw put 113 real
  // <i class="fa-"> elements and a native colour input on the page, which is
  // precisely what the self-check below is looking for. The kit found its own
  // first bug here.
  const head = `<div class="kit-c-h">
      <span class="kit-c-n">${kitEsc(c.name)}</span>
      <span class="kit-c-cls">${kitEsc(c.cls)}</span>
      <span class="kit-c-note">${kitEsc(c.note)}</span>
    </div>`;

  // A component whose helper vanished. Loud on purpose: a silent kit is a lie.
  if (c.vars && !c.vars.length && !c.swatches && !c.icons) {
    return `<section class="kit-c kit-miss" id="kit-${kitSlug(c.name)}">${head}
      <div class="kit-miss-b">This component's helper could not be found in app.js.
      It was renamed or deleted. Either restore it or remove it from the kit — a component
      that exists only in the catalogue is exactly the drift this page exists to catch.</div>
    </section>`;
  }

  let inner = '';
  if (c.swatches) {
    inner = `<div class="kit-tok">${c.swatches.map(t =>
      `<div class="kit-tokc"><i style="background:var(${t})"></i><b>${t}</b></div>`).join('')}</div>`;
  } else if (c.icons) {
    inner = `<div style="display:flex;flex-wrap:wrap;gap:9px">${c.icons.map(n =>
      `<span title="${n}" style="display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border:2px solid var(--border);border-radius:var(--radius-md);background:var(--bg2);font-size:11.5px;color:var(--muted-light);font-family:var(--font-display);font-weight:600">${KIT.helpers._faIcon(n, 14)}${n}</span>`).join('')}</div>`;
  } else {
    inner = c.vars.map(v =>
      `<div class="kit-v"><div class="kit-v-l">${v.label}</div><div class="kit-v-s">${v.html}</div></div>`).join('');
  }
  return `<section class="kit-c" id="kit-${kitSlug(c.name)}">${head}<div class="kit-c-b">${inner}</div></section>`;
}

// ── 4. Appearance switcher ────────────────────────────────────────────────
// The kit is only useful if it can be checked under every appearance — the
// whole reason hardcoded colours are a bug is that they survive a theme change.
// These override the same tokens applyAppearance() rewrites at runtime.
const KIT_APPEARANCES = {
  'Default (dark)': null,
  'Onyx Pure': { '--bg': '#010102', '--bg2': '#000', '--rail': '#000', '--sidebar': '#08080a',
    '--channel': '#050506', '--panel': '#0c0c10', '--panel2': '#121218', '--panel3': '#191920',
    '--border': '#1e1e28' },
  'Midnight Citadel': { '--bg': '#10111c', '--bg2': '#0b0c16', '--rail': '#0b0c16', '--sidebar': '#161829',
    '--channel': '#131424', '--panel': '#1a1c2e', '--panel2': '#212339', '--panel3': '#282b45',
    '--border': '#2b2f4d' },
  'Light (stress test)': { '--bg': '#f4f5f7', '--bg2': '#e9ebef', '--rail': '#e4e6eb', '--sidebar': '#eceef2',
    '--channel': '#f0f1f4', '--panel': '#fff', '--panel2': '#f4f5f7', '--panel3': '#e9ebef',
    '--border': '#d6d9e0', '--text': '#13161d', '--muted': '#8a93a5', '--muted-light': '#5b6577' },
};

function kitApplyAppearance(name) {
  const root = document.documentElement;
  Object.values(KIT_APPEARANCES).forEach(set => {
    if (set) Object.keys(set).forEach(k => root.style.removeProperty(k));
  });
  const set = KIT_APPEARANCES[name];
  if (set) Object.entries(set).forEach(([k, v]) => root.style.setProperty(k, v));
  try { localStorage.setItem('ftz_kit_appearance', name); } catch (_) {}
}

// ── 5. Boot ───────────────────────────────────────────────────────────────
(async function kitBoot() {
  const sel = document.getElementById('kit-appearance');
  sel.innerHTML = Object.keys(KIT_APPEARANCES).map(n => `<option>${n}</option>`).join('');
  sel.onchange = () => kitApplyAppearance(sel.value);
  let saved = null;
  try { saved = localStorage.getItem('ftz_kit_appearance'); } catch (_) {}
  if (saved && KIT_APPEARANCES[saved] !== undefined) { sel.value = saved; kitApplyAppearance(saved); }

  try {
    await kitLoadHelpers();
  } catch (e) {
    document.getElementById('kit-body').innerHTML =
      `<div class="kit-c kit-miss"><div class="kit-miss-b">Could not read app.js: ${String(e)}</div></div>`;
    return;
  }
  KIT.registry = kitRegistry(KIT.helpers);
  kitRender();
  window.__KIT = KIT;
  document.body.dataset.kitReady = '1';
})();
