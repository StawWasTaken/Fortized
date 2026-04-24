// Mist & Cards — Fortized's first activity
// A 15th-century wager game against The Stranger in the Mist.
// Year: 1452. Higher card wins. Joyster is a wildcard. Bets in Onyx.
// Contains 4 subtle hints toward a future werewolf-themed event.
// ────────────────────────────────────────────────────────────────
// This file is loaded as a separate script so each activity lives
// in its own module. Do not put app-level logic here.

// ════════════════════════════════════════════════════════════════
// MIST & CARDS — Fortized's first activity
// A 15th-century wager game against The Stranger in the Mist.
// Higher card wins. Joyster is a wildcard. Bets are in Onyx.
// Contains 4 subtle hints toward a future werewolf-themed event.
// ════════════════════════════════════════════════════════════════
const MC_SUITS = {
  hearts:   { color: 'yellow', name: 'Hearts',   svg: '<path d="M12 21.5s-7-4.5-9.5-9.5C1 9 2.5 5 6 5c2 0 3.5 1.2 4.5 2.5C11.5 6.2 13 5 15 5c3.5 0 5 4 3.5 7-2.5 5-9.5 9.5-9.5 9.5z" fill="currentColor"/>' },
  spades:   { color: 'yellow', name: 'Spades',   svg: '<path d="M12 2C8 6 3 10 3 14.5c0 3 2.2 5 5 5 1.3 0 2.3-.4 3-1l-1 4h4l-1-4c.7.6 1.7 1 3 1 2.8 0 5-2 5-5C21 10 16 6 12 2z" fill="currentColor"/>' },
  clubs:    { color: 'black',  name: 'Clubs',    svg: '<g fill="currentColor"><circle cx="12" cy="7" r="3.8"/><circle cx="7.3" cy="13.5" r="3.8"/><circle cx="16.7" cy="13.5" r="3.8"/><path d="M10.2 14.5l1.2 5.5-2 2.5h5.2l-2-2.5 1.2-5.5z"/></g>' },
  losanges: { color: 'black',  name: 'Losanges', svg: '<path d="M12 1.5 C 15 6, 20 11.5, 22 16 C 20 20.5, 15 26, 12 30.5 C 9 26, 4 20.5, 2 16 C 4 11.5, 9 6, 12 1.5 Z" fill="currentColor" transform="scale(1, 0.75) translate(0, 2.5)"/>' },
};
const MC_RANK_ORDER = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
// Joyster (jester) has its own slot at the top of the rank order (wildcard)
const MC_PIP_LAYOUTS = {
  1:  [ {c:2,r:4} ],
  2:  [ {c:2,r:1}, {c:2,r:7,flip:true} ],
  3:  [ {c:2,r:1}, {c:2,r:4}, {c:2,r:7,flip:true} ],
  4:  [ {c:1,r:1}, {c:3,r:1}, {c:1,r:7,flip:true}, {c:3,r:7,flip:true} ],
  5:  [ {c:1,r:1}, {c:3,r:1}, {c:2,r:4}, {c:1,r:7,flip:true}, {c:3,r:7,flip:true} ],
  6:  [ {c:1,r:1}, {c:3,r:1}, {c:1,r:4}, {c:3,r:4}, {c:1,r:7,flip:true}, {c:3,r:7,flip:true} ],
  7:  [ {c:1,r:1}, {c:3,r:1}, {c:2,r:2}, {c:1,r:4}, {c:3,r:4}, {c:1,r:7,flip:true}, {c:3,r:7,flip:true} ],
  8:  [ {c:1,r:1}, {c:3,r:1}, {c:2,r:2}, {c:1,r:4}, {c:3,r:4}, {c:2,r:6,flip:true}, {c:1,r:7,flip:true}, {c:3,r:7,flip:true} ],
  9:  [ {c:1,r:1}, {c:3,r:1}, {c:1,r:3}, {c:3,r:3}, {c:2,r:4}, {c:1,r:5,flip:true}, {c:3,r:5,flip:true}, {c:1,r:7,flip:true}, {c:3,r:7,flip:true} ],
  10: [ {c:1,r:1}, {c:3,r:1}, {c:2,r:2}, {c:1,r:3}, {c:3,r:3}, {c:1,r:5,flip:true}, {c:3,r:5,flip:true}, {c:2,r:6,flip:true}, {c:1,r:7,flip:true}, {c:3,r:7,flip:true} ],
};

// Werewolf-event foreshadowing lines — shown rarely as "whispers"
const MC_WHISPERS = [
  'A howl drifts from the tree line. Far off. For now.',
  'The Stranger glances at the moon — nearly full.',
  'You smell wet fur on the wind. No one is there.',
  '"The pack stirs," the Stranger murmurs. "Soon enough."',
];

let _mcState = null;
let _mcEl = null;

function _mcGetBalance() { return Math.max(0, +CU?.onyx || 0); }

function _mcMount(container) {
  _mcState = {
    phase: 'lore',             // lore | betting | dealing | reveal | outcome
    bet: 0,
    playerCard: null,
    botCard: null,
    playerWon: null,            // true | false | null (push)
    handsPlayed: +localStorage.getItem('mc_hands_played') || 0,
    sessionWhispers: [],
  };
  _mcEl = container;
  container.innerHTML = `
    <div class="mc-stage" id="mc-stage">
      <div class="mc-mist"></div>
      <div class="mc-whisper" id="mc-whisper"></div>
      <div class="mc-topbar">
        <div class="mc-brand">
          <div>
            <div class="mc-brand-title">Mist &amp; Cards</div>
            <div class="mc-brand-sub">Anno Domini 1452</div>
          </div>
        </div>
        <div class="mc-pot" id="mc-pot">${_onyxImg(14)} <span id="mc-pot-val">${_mcGetBalance().toLocaleString()}</span></div>
      </div>
      <div class="mc-body" id="mc-body"></div>
    </div>`;
  _mcRender();
}

function _mcRender() {
  if (!_mcEl) return;
  const body = _mcEl.querySelector('#mc-body');
  const potVal = _mcEl.querySelector('#mc-pot-val');
  if (potVal) potVal.textContent = _mcGetBalance().toLocaleString();
  if (!body) return;
  const s = _mcState;
  if (s.phase === 'lore')     body.innerHTML = _mcRenderLore();
  else if (s.phase === 'betting') body.innerHTML = _mcRenderBetting();
  else if (s.phase === 'dealing' || s.phase === 'reveal' || s.phase === 'outcome') body.innerHTML = _mcRenderDuel();
}

function _mcRenderLore() {
  return `
    <div class="mc-lore">
      <div class="mc-lore-crest">
        <svg width="44" height="44" viewBox="0 0 24 32" fill="currentColor"><path d="M12 1 C 15 6, 20 12, 22 16 C 20 20, 15 26, 12 31 C 9 26, 4 20, 2 16 C 4 12, 9 6, 12 1 Z"/></svg>
      </div>
      <h1 class="mc-lore-title">Mist &amp; Cards</h1>
      <div class="mc-lore-sub">A Wager in the Dark</div>
      <p class="mc-lore-text">
        The Stranger waits where the <em>mists</em> have not lifted in seven days. Across the fire, they deal a single card and ask one thing of you:
        <em>how much of your Onyx do you trust to fate?</em>
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="mc-cta" onclick="_mcBegin()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          Approach the Fire
        </button>
        <button class="mc-cta secondary" onclick="_mcShowRules()">How It's Played</button>
      </div>
    </div>`;
}

function _mcShowRules() {
  const existing = document.getElementById('mc-rules-modal');
  if (existing) existing.remove();
  const m = document.createElement('div');
  m.id = 'mc-rules-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(10px);';
  m.innerHTML = `
    <div style="background:#14141a;border:1px solid rgba(236,230,217,.12);border-radius:18px;padding:28px;max-width:420px;width:90%;font-family:'Fraunces',serif;color:#ece6d9;box-shadow:0 24px 80px rgba(0,0,0,.6);">
      <div style="font-family:'Syne',serif;font-size:20px;font-weight:700;margin-bottom:4px;">The Rules</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.3em;color:rgba(236,230,217,.4);text-transform:uppercase;margin-bottom:18px;">a single draw · a single outcome</div>
      <ol style="padding-left:18px;line-height:1.7;font-size:13.5px;color:rgba(236,230,217,.75);margin:0 0 18px;">
        <li>Stake your Onyx — 5, 10, 25, or 50 pieces.</li>
        <li>You and the Stranger each draw one card.</li>
        <li>Higher rank wins. Joyster is a wildcard; on reveal it takes a rank of fortune.</li>
        <li>Win: you receive <strong>twice</strong> your stake. Lose: your stake is gone.</li>
        <li>A draw returns your stake to you.</li>
      </ol>
      <div style="font-size:11.5px;color:rgba(236,230,217,.42);font-style:italic;margin-bottom:18px;line-height:1.5;">
        Hearts &amp; Spades bear the gold. Clubs &amp; Losanges wear the dark. The four suits watch and do not speak.
      </div>
      <button onclick="document.getElementById('mc-rules-modal').remove()" class="mc-cta" style="width:100%;">Close</button>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

function _mcBegin() {
  _mcState.phase = 'betting';
  _mcRender();
}

function _mcRenderBetting() {
  const bal = _mcGetBalance();
  const chips = [5, 10, 25, 50];
  return `
    <div class="mc-bet-stage">
      <div class="mc-bet-prompt">Place your stake</div>
      <div class="mc-bet-sub">Choose your wager</div>
      <div class="mc-chips">
        ${chips.map(c => `<button class="mc-chip" ${bal<c?'disabled':''} onclick="_mcPlaceBet(${c})"><span class="mc-chip-amt">${c}</span><span class="mc-chip-lbl">Onyx</span></button>`).join('')}
      </div>
      <div class="mc-balance">${_onyxImg(11)} <span>${bal.toLocaleString()} available</span></div>
      ${bal < 5 ? `<div style="margin-top:18px;font-size:12px;color:rgba(248,113,113,.7);font-family:'Fraunces',serif;font-style:italic;">Your purse is too light. Earn Onyx and return.</div>` : ''}
    </div>`;
}

function _mcPlaceBet(amount) {
  if (_mcGetBalance() < amount) return;
  _mcState.bet = amount;
  _mcState.phase = 'dealing';
  // Deduct the stake up front
  CU.onyx = Math.max(0, (+CU.onyx||0) - amount);
  if (typeof saveUser === 'function') saveUser();
  if (typeof updateOnyxDisplay === 'function') updateOnyxDisplay();
  _mcRender();
  // Deal after a brief "dealing" pause
  setTimeout(() => _mcDeal(), 700);
}

function _mcDrawRandomCard() {
  // 1 in 25 chance: Joyster (wildcard)
  if (Math.random() < 0.04) {
    return { rank: 'JOY', suit: 'joyster', color: 'yellow', isJoyster: true };
  }
  const suitKeys = Object.keys(MC_SUITS);
  const suit = suitKeys[Math.floor(Math.random() * suitKeys.length)];
  const rank = MC_RANK_ORDER[Math.floor(Math.random() * MC_RANK_ORDER.length)];
  return { rank, suit, color: MC_SUITS[suit].color, isJoyster: false };
}

function _mcRankValue(card) {
  if (card.isJoyster) {
    // Joyster resolves as a random rank at reveal — stored on card
    return card.resolvedValue;
  }
  return MC_RANK_ORDER.indexOf(card.rank) + 1;
}

function _mcDeal() {
  const s = _mcState;
  s.playerCard = _mcDrawRandomCard();
  s.botCard = _mcDrawRandomCard();
  // Resolve Joyster values immediately so reveals are deterministic
  if (s.playerCard.isJoyster) s.playerCard.resolvedValue = 1 + Math.floor(Math.random() * 13);
  if (s.botCard.isJoyster)    s.botCard.resolvedValue    = 1 + Math.floor(Math.random() * 13);
  s.phase = 'reveal';
  _mcRender();
}

function _mcRevealCards() {
  const s = _mcState;
  if (s.phase !== 'reveal') return;
  const pEl = document.querySelector('#mc-player-card');
  const bEl = document.querySelector('#mc-bot-card');
  if (pEl) pEl.classList.add('flipped');
  if (bEl) setTimeout(() => bEl.classList.add('flipped'), 500);
  setTimeout(() => _mcResolve(), 1400);
}

function _mcResolve() {
  const s = _mcState;
  const pv = _mcRankValue(s.playerCard);
  const bv = _mcRankValue(s.botCard);
  let delta = 0;
  if (pv > bv)      { s.playerWon = true;  delta = s.bet; }        // win: return stake + match
  else if (pv < bv) { s.playerWon = false; delta = 0; }             // loss: stake already gone
  else              { s.playerWon = null;  delta = 0; }             // push: will refund

  if (s.playerWon === true) {
    CU.onyx = (+CU.onyx||0) + (s.bet * 2);   // refund stake + winnings
  } else if (s.playerWon === null) {
    CU.onyx = (+CU.onyx||0) + s.bet;          // push — refund stake
  }
  if (typeof saveUser === 'function') saveUser();
  if (typeof updateOnyxDisplay === 'function') updateOnyxDisplay();

  // Visual glow on winner card
  const pWrap = document.querySelector('#mc-player-card-wrap');
  const bWrap = document.querySelector('#mc-bot-card-wrap');
  if (s.playerWon === true) { pWrap?.classList.add('is-winner'); bWrap?.classList.add('is-loser'); }
  else if (s.playerWon === false) { pWrap?.classList.add('is-loser'); bWrap?.classList.add('is-winner'); }

  s.phase = 'outcome';
  s.handsPlayed = (s.handsPlayed||0) + 1;
  localStorage.setItem('mc_hands_played', String(s.handsPlayed));
  _mcUpdateOutcome();
  _mcMaybeWhisper();
}

function _mcUpdateOutcome() {
  const potVal = _mcEl?.querySelector('#mc-pot-val');
  if (potVal) potVal.textContent = _mcGetBalance().toLocaleString();
  const area = _mcEl?.querySelector('#mc-actions-area');
  if (!area) return;
  const s = _mcState;
  let label, amt, cls;
  if (s.playerWon === true)      { label = 'You win';     amt = '+' + s.bet;          cls = 'is-win';  }
  else if (s.playerWon === false){ label = 'You lose';    amt = '−' + s.bet;          cls = 'is-loss'; }
  else                            { label = 'A tie — stake returned'; amt = '±0';     cls = 'is-push'; }
  area.innerHTML = `
    <div class="mc-outcome ${cls}">
      <div class="mc-outcome-label">${label}</div>
      <div class="mc-outcome-amt">${amt} ${_onyxImg(20)}</div>
    </div>
    <div class="mc-msg">${_mcOutcomeLine()}</div>
    <div class="mc-actions">
      <button class="mc-cta" onclick="_mcNextHand()">Deal Again</button>
      <button class="mc-cta secondary" onclick="_mcBackToLore()">Rise from the Fire</button>
    </div>`;
}

function _mcOutcomeLine() {
  const s = _mcState;
  const WIN = [
    'The Stranger tips their hood, approving.',
    '"Fortune walks with you tonight."',
    'The flames lean toward you, hungry.',
  ];
  const LOSE = [
    'The Stranger says nothing. The mist closes in.',
    '"Again, friend?" they ask softly.',
    'You hear a distant howl. The night is long.',
  ];
  const PUSH = [
    'A stalemate. The cards agree on nothing.',
    'The Stranger almost smiles. Almost.',
  ];
  const pool = s.playerWon === true ? WIN : s.playerWon === false ? LOSE : PUSH;
  return pool[Math.floor(Math.random() * pool.length)];
}

function _mcNextHand() {
  const s = _mcState;
  s.bet = 0; s.playerCard = null; s.botCard = null; s.playerWon = null;
  s.phase = 'betting';
  _mcRender();
}

function _mcBackToLore() {
  _mcState.phase = 'lore';
  _mcRender();
}

function _mcRenderDuel() {
  const s = _mcState;
  const faceDown = s.phase === 'dealing';
  return `
    <div class="mc-duel">
      <div class="mc-seat">
        <div class="mc-seat-label">The Stranger</div>
        <div class="mc-avatar is-stranger">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(236,230,217,.55)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 C 8 4, 6 8, 6 13 L 6 20 C 6 21, 7 22, 8 22 L 16 22 C 17 22, 18 21, 18 20 L 18 13 C 18 8, 16 4, 12 2 Z"/><path d="M9 14 L 10.5 16 L 9 18"/><path d="M15 14 L 13.5 16 L 15 18"/></svg>
        </div>
        <div class="mc-card-wrap" id="mc-bot-card-wrap">${_mcCardHTML(s.botCard, !faceDown && s.phase !== 'reveal', 'mc-bot-card')}</div>
      </div>
      <div class="mc-versus">— vs —</div>
      <div class="mc-seat">
        <div class="mc-seat-label">You</div>
        <div class="mc-avatar">
          ${CU?.pfp ? `<img src="${escapeHTML(CU.pfp)}" alt="">` : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,249,62,.7)" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>`}
        </div>
        <div class="mc-card-wrap" id="mc-player-card-wrap">${_mcCardHTML(s.playerCard, !faceDown && s.phase !== 'reveal', 'mc-player-card')}</div>
      </div>
    </div>
    <div id="mc-actions-area" style="margin-top:20px;display:flex;flex-direction:column;align-items:center;gap:8px;">
      ${s.phase === 'reveal' ? `
        <div class="mc-msg" id="mc-reveal-msg">Your stake: <em>${s.bet} Onyx</em>. The cards wait.</div>
        <div class="mc-actions">
          <button class="mc-cta" onclick="_mcRevealCards()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Turn the Cards
          </button>
        </div>` : ''}
      ${s.phase === 'dealing' ? `<div class="mc-msg">The Stranger deals…</div>` : ''}
    </div>`;
}

function _mcCardHTML(card, flipped, id) {
  // Always render the two faces; toggle .flipped class to reveal
  const initFlipped = !!(card && flipped);
  const cls = initFlipped ? 'flipped' : '';
  if (!card) {
    return `<div class="mc-card ${cls}" id="${id}"><div class="mc-card-back">${_mcCardBackCrest()}</div><div class="mc-card-face"></div></div>`;
  }
  const suitMeta = card.isJoyster ? { color: 'yellow' } : MC_SUITS[card.suit];
  const faceInner = _mcCardFaceInner(card);
  return `<div class="mc-card ${cls}" id="${id}" data-color="${suitMeta.color}">
    <div class="mc-card-back">${_mcCardBackCrest()}</div>
    <div class="mc-card-face">
      ${faceInner}
    </div>
  </div>`;
}

function _mcCardBackCrest() {
  return `<div class="mc-card-back-crest">
    <svg width="54" height="72" viewBox="0 0 24 32" fill="currentColor"><path d="M12 1 C 15 6, 20 12, 22 16 C 20 20, 15 26, 12 31 C 9 26, 4 20, 2 16 C 4 12, 9 6, 12 1 Z"/></svg>
  </div>`;
}

function _mcCardFaceInner(card) {
  if (card.isJoyster) {
    return `
      <div class="mc-corner mc-corner-tl"><span class="mc-rank" style="font-size:11px;letter-spacing:.15em;">JOY</span></div>
      <div class="mc-jest-art">
        <div class="mc-jest-glyph">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3 L 9 7 L 5 6 L 7 10 L 4 13 L 8 14 L 8 18 L 12 16 L 16 18 L 16 14 L 20 13 L 17 10 L 19 6 L 15 7 Z"/>
            <circle cx="12" cy="12" r="1.4" fill="currentColor"/>
          </svg>
        </div>
        <div style="position:absolute;bottom:6px;left:0;right:0;text-align:center;font-family:'JetBrains Mono',monospace;font-size:7px;letter-spacing:.3em;color:rgba(255,249,62,.4);text-transform:uppercase;">Joyster · Wild</div>
      </div>
      <div class="mc-corner mc-corner-br"><span class="mc-rank" style="font-size:11px;letter-spacing:.15em;">JOY</span></div>`;
  }
  const suit = MC_SUITS[card.suit];
  const rankLabel = card.rank;
  const isCourt = ['J','Q','K'].includes(card.rank);
  const pipMini = `<svg class="mc-pip-mini" viewBox="0 0 24 32">${suit.svg}</svg>`;
  let center;
  if (isCourt) {
    center = `
      <div class="mc-court">
        <svg class="mc-seal top" viewBox="0 0 24 32">${suit.svg}</svg>
        <div class="mc-monogram">${card.rank}</div>
        <svg class="mc-seal bot" viewBox="0 0 24 32">${suit.svg}</svg>
        <div class="mc-ornaments"></div>
      </div>`;
  } else {
    const n = card.rank === 'A' ? 1 : parseInt(card.rank, 10);
    const layout = MC_PIP_LAYOUTS[n];
    if (n === 1) {
      center = `<div class="mc-pip-field" style="grid-template-rows:1fr;">
        <svg viewBox="0 0 24 32" style="width:56%;height:auto;grid-column:2;">${suit.svg}</svg>
      </div>`;
    } else {
      center = `<div class="mc-pip-field">${layout.map(p =>
        `<div style="grid-column:${p.c};grid-row:${p.r};" class="${p.flip ? 'flip' : ''}"><svg viewBox="0 0 24 32">${suit.svg}</svg></div>`
      ).join('')}</div>`;
    }
  }
  return `
    <div class="mc-corner mc-corner-tl"><span class="mc-rank">${rankLabel}</span>${pipMini}</div>
    ${center}
    <div class="mc-corner mc-corner-br"><span class="mc-rank">${rankLabel}</span>${pipMini}</div>`;
}

function _mcMaybeWhisper() {
  const s = _mcState;
  // Show a werewolf whisper: rarely on early hands, more often after 3+ hands
  const chance = s.handsPlayed >= 3 ? 0.28 : 0.12;
  // Don't repeat in the same session
  const pool = MC_WHISPERS.filter(w => !s.sessionWhispers.includes(w));
  if (!pool.length || Math.random() >= chance) return;
  const line = pool[Math.floor(Math.random() * pool.length)];
  s.sessionWhispers.push(line);
  const w = _mcEl?.querySelector('#mc-whisper');
  if (!w) return;
  w.innerHTML = `<span class="mc-whisper-mark">✦</span> ${line}`;
  setTimeout(() => w.classList.add('is-show'), 900);
  setTimeout(() => w.classList.remove('is-show'), 6400);
}
