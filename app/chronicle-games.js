/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - DISCORD-STYLE NARRATIVE GAMES
 * ═══════════════════════════════════════════════════════════════════════════════
 * Clean card-based UI with sketch artwork and proper character integration
 */

const ASSET = '/app/Chronicle/chapter1/assets/';
const FONT = "'MedievalSharp', cursive";

let bgMusic = null;
let menuShown = false;

// ════════════════════════════════════════════════════════════════════════════
// AUDIO SYSTEM
// ════════════════════════════════════════════════════════════════════════════

function sound(file) {
  const audio = new Audio(ASSET + file);
  audio.volume = 0.4;
  audio.play().catch(() => {});
}

function bgMusicStart() {
  if (!bgMusic) {
    bgMusic = new Audio(ASSET + 'Chapter 1 Theme Song.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
  }
  bgMusic.play().catch(() => {});
}

function bgMusicStop() {
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GAME LAUNCHER
// ════════════════════════════════════════════════════════════════════════════

async function launchChronicleMinigame(eventId) {
  if (!menuShown) {
    await showGameMenu(eventId);
    return;
  }

  if (typeof canPlayGame === 'function' && !canPlayGame()) return;

  sound('SoundPlay.mp3');
  bgMusicStart();

  const games = {
    1: () => gameDialogue(eventId, 'BREAKING TREATY', 'Wealthplace.png', [
      'The treaty is shattered...',
      'What is your counsel, knight?',
      'Our fate awaits your decision.'
    ], 30),
    2: () => gameCatch(eventId),
    3: () => gameClicker(eventId, 'BURNING ELOWEN', 20),
    4: () => gameClicker(eventId, 'TIMBER ROADS', 25),
    5: () => gameClicker(eventId, 'COMBAT', 30),
    6: () => gameClicker(eventId, 'FENWCK CANAL', 75),
    7: () => gameClicker(eventId, 'IRONSTALL', 50),
    8: () => gameClicker(eventId, 'GLASSPORT', 60),
  };

  const game = games[eventId] || (() => gamePlaceholder(eventId));
  await game();
}

// ════════════════════════════════════════════════════════════════════════════
// GAME MENU - DISCORD CARD STYLE
// ════════════════════════════════════════════════════════════════════════════

async function showGameMenu(eventId) {
  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed; inset: 0; background: #f5f5f5;
    z-index: 10000; display: flex; align-items: center;
    justify-content: center; font-family: ${FONT};
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: white; border: 2px solid #000;
    border-radius: 12px; padding: 40px; max-width: 600px;
    width: 90%; box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    display: flex; flex-direction: column; gap: 20px;
  `;

  // Logo
  const logo = document.createElement('img');
  logo.src = ASSET + 'Grand Joy Games.png';
  logo.style.cssText = `height: 60px; width: auto; align-self: center;`;
  card.appendChild(logo);

  // Title
  const title = document.createElement('img');
  title.src = ASSET + 'Chap1Title.png';
  title.style.cssText = `height: 100px; width: auto; align-self: center;`;
  card.appendChild(title);

  // Description
  const desc = document.createElement('p');
  desc.style.cssText = `
    margin: 0; color: #333; text-align: center;
    font-size: 14px; line-height: 1.6;
  `;
  desc.textContent = 'The kingdom awaits your courage. Begin your journey through dangerous lands.';
  card.appendChild(desc);

  // Button
  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #000; color: white; border: none;
    padding: 14px 32px; border-radius: 6px; font-family: ${FONT};
    font-size: 16px; font-weight: 700; cursor: pointer;
    text-transform: uppercase; letter-spacing: 1px;
    transition: all 0.2s; align-self: center;
  `;
  btn.textContent = 'Begin Game';
  btn.onmouseover = () => btn.style.opacity = '0.9';
  btn.onmouseout = () => btn.style.opacity = '1';
  btn.onclick = async () => {
    sound('SoundUiSelect.mp3');
    menu.remove();
    menuShown = true;
    await showIntro();
    launchChronicleMinigame(eventId);
  };
  card.appendChild(btn);

  menu.appendChild(card);
  document.body.appendChild(menu);
}

// ════════════════════════════════════════════════════════════════════════════
// INTRO VIDEO
// ════════════════════════════════════════════════════════════════════════════

async function showIntro() {
  return new Promise((resolve) => {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: fixed; inset: 0; background: #000;
      z-index: 10000; display: flex; align-items: center;
      justify-content: center;
    `;

    const video = document.createElement('video');
    video.src = ASSET + 'FTZchap1-Intro.mp4';
    video.style.cssText = `width: 100%; height: 100%; object-fit: cover;`;
    video.autoplay = true;
    video.onended = () => {
      screen.remove();
      resolve();
    };

    const skip = document.createElement('button');
    skip.style.cssText = `
      position: absolute; top: 20px; right: 20px;
      background: white; color: #000; border: none;
      padding: 8px 16px; border-radius: 6px; font-family: ${FONT};
      font-weight: 700; cursor: pointer; z-index: 10;
      font-size: 12px; text-transform: uppercase;
    `;
    skip.textContent = 'SKIP';
    skip.onclick = () => {
      video.pause();
      screen.remove();
      resolve();
    };

    screen.appendChild(video);
    screen.appendChild(skip);
    document.body.appendChild(screen);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// DIALOGUE GAME
// ════════════════════════════════════════════════════════════════════════════

async function gameDialogue(eventId, title, npcImage, dialogues, reward) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    font-family: ${FONT}; padding: 20px;
  `;

  let idx = 0;

  function render() {
    screen.innerHTML = '';

    if (idx >= dialogues.length) {
      screen.remove();
      bgMusicStop();
      sound('SoundWin.mp3');
      markEventComplete(eventId, reward);
      toast('✓ Dialogue complete!', 'success');
      return;
    }

    const card = document.createElement('div');
    card.style.cssText = `
      background: white; border: 2px solid #000;
      border-radius: 12px; padding: 30px; max-width: 700px;
      width: 90%; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      display: flex; gap: 20px;
    `;

    // NPC Image
    const npc = document.createElement('img');
    npc.src = ASSET + npcImage;
    npc.style.cssText = `height: 200px; width: auto; flex-shrink: 0;`;
    card.appendChild(npc);

    // Text content
    const content = document.createElement('div');
    content.style.cssText = `flex: 1; display: flex; flex-direction: column; justify-content: space-between;`;

    const speaker = document.createElement('h3');
    speaker.style.cssText = `
      margin: 0 0 10px 0; color: #000; font-size: 14px;
      text-transform: uppercase; letter-spacing: 1px;
    `;
    speaker.textContent = 'Cardinal Wealthplace';
    content.appendChild(speaker);

    const text = document.createElement('p');
    text.style.cssText = `
      margin: 0 0 20px 0; color: #333; font-size: 15px;
      line-height: 1.6;
    `;
    text.textContent = dialogues[idx];
    content.appendChild(text);

    const btn = document.createElement('button');
    btn.style.cssText = `
      background: #000; color: white; border: none;
      padding: 10px 20px; border-radius: 6px; font-family: ${FONT};
      font-weight: 700; cursor: pointer; align-self: flex-start;
      text-transform: uppercase; font-size: 12px;
      transition: all 0.2s;
    `;
    btn.textContent = idx === dialogues.length - 1 ? 'FINISH' : 'NEXT';
    btn.onmouseover = () => btn.style.opacity = '0.9';
    btn.onmouseout = () => btn.style.opacity = '1';
    btn.onclick = () => {
      sound('SoundUiSelect.mp3');
      idx++;
      render();
    };
    content.appendChild(btn);

    card.appendChild(content);
    screen.appendChild(card);
  }

  render();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// CATCH GAME
// ════════════════════════════════════════════════════════════════════════════

async function gameCatch(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: white;
    z-index: 9999; display: flex; flex-direction: column;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    player: { x: w / 2, y: h - 60, w: 40, h: 40, gold: 0 },
    items: [],
    time: 30,
    active: true
  };

  for (let i = 0; i < 3; i++) {
    game.items.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.4),
      w: 25,
      h: 25,
      vy: 2 + Math.random(),
      type: Math.random() > 0.3 ? 'gold' : 'danger'
    });
  }

  document.addEventListener('mousemove', (e) => {
    game.player.x = Math.max(0, Math.min(w - game.player.w, e.clientX - game.player.w / 2));
  });

  function update() {
    if (!game.active) return;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, w, h);

    game.items = game.items.filter(item => {
      item.y += item.vy;
      if (item.y + item.h > game.player.y &&
          item.y < game.player.y + game.player.h &&
          item.x + item.w > game.player.x &&
          item.x < game.player.x + game.player.w) {
        if (item.type === 'gold') {
          game.gold += 10;
          sound('SoundCoin.mp3');
        }
        return false;
      }
      return item.y < h;
    });

    if (Math.random() < 0.02) {
      game.items.push({
        x: Math.random() * w,
        y: -25,
        w: 25,
        h: 25,
        vy: 2 + Math.random(),
        type: Math.random() > 0.3 ? 'gold' : 'danger'
      });
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);

    game.items.forEach(item => {
      ctx.fillStyle = item.type === 'gold' ? '#FFD700' : '#FF6B6B';
      ctx.fillRect(item.x, item.y, item.w, item.h);
    });

    ctx.fillStyle = '#000';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`GOLD: ${game.gold}`, 20, 30);
    ctx.fillText(`TIME: ${Math.ceil(game.time)}s`, w - 150, 30);

    game.time -= 1 / 60;
    if (game.time <= 0) endGame();
    else requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    bgMusicStop();
    if (game.gold >= 100) {
      sound('SoundWin.mp3');
      markEventComplete(eventId, game.gold);
      toast('✓ Raid successful!', 'success');
    } else {
      sound('SoundLose.mp3');
      toast('✗ Not enough gold.', 'error');
    }
  }

  update();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// CLICKER GAME
// ════════════════════════════════════════════════════════════════════════════

async function gameClicker(eventId, name, clicks) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    font-family: ${FONT}; padding: 20px;
  `;

  const game = { clicks: 0, needed: clicks };

  function render() {
    screen.innerHTML = '';

    const card = document.createElement('div');
    card.style.cssText = `
      background: white; border: 2px solid #000;
      border-radius: 12px; padding: 40px; max-width: 500px;
      width: 100%; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      text-align: center;
    `;

    const title = document.createElement('h2');
    title.style.cssText = `
      margin: 0 0 20px 0; font-size: 28px; color: #000;
      text-transform: uppercase; letter-spacing: 2px;
    `;
    title.textContent = name;
    card.appendChild(title);

    const progress = document.createElement('div');
    progress.style.cssText = `
      margin: 0 0 20px 0; font-size: 20px; color: #000;
      font-weight: 700;
    `;
    progress.textContent = `${game.clicks} / ${game.needed}`;
    card.appendChild(progress);

    const bar = document.createElement('div');
    bar.style.cssText = `
      height: 16px; background: #e8e8e8; border: 2px solid #000;
      border-radius: 8px; overflow: hidden; margin-bottom: 30px;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      height: 100%; background: #000;
      width: ${(game.clicks / game.needed) * 100}%;
    `;
    bar.appendChild(fill);
    card.appendChild(bar);

    const btn = document.createElement('button');
    btn.style.cssText = `
      background: #000; color: white; border: none;
      padding: 16px 48px; border-radius: 6px; font-family: ${FONT};
      font-size: 18px; font-weight: 700; cursor: pointer;
      text-transform: uppercase; letter-spacing: 1px;
      transition: all 0.2s; width: 100%;
    `;
    btn.textContent = 'CLICK!';
    btn.onmouseover = () => btn.style.opacity = '0.9';
    btn.onmouseout = () => btn.style.opacity = '1';
    btn.onclick = () => {
      game.clicks++;
      sound('SoundCoin.mp3');
      if (game.clicks >= game.needed) {
        screen.remove();
        bgMusicStop();
        sound('SoundWin.mp3');
        markEventComplete(eventId, Math.floor(clicks * 1.5));
        toast(`✓ ${name} complete!`, 'success');
      } else {
        render();
      }
    };
    card.appendChild(btn);

    screen.appendChild(card);
  }

  render();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER
// ════════════════════════════════════════════════════════════════════════════

async function gamePlaceholder(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    font-family: ${FONT}; padding: 20px;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: white; border: 2px solid #000;
    border-radius: 12px; padding: 40px; max-width: 400px;
    width: 100%; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    text-align: center;
  `;

  const title = document.createElement('h2');
  title.style.cssText = `margin: 0 0 20px 0; font-size: 24px; color: #000;`;
  title.textContent = `Event ${eventId}`;
  card.appendChild(title);

  const msg = document.createElement('p');
  msg.style.cssText = `margin: 0 0 20px 0; color: #666; font-size: 14px;`;
  msg.textContent = 'Coming soon...';
  card.appendChild(msg);

  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #000; color: white; border: none;
    padding: 12px 24px; border-radius: 6px; font-family: ${FONT};
    font-weight: 700; cursor: pointer; text-transform: uppercase;
    font-size: 12px;
  `;
  btn.textContent = 'OK';
  btn.onclick = () => {
    sound('SoundUiSelect.mp3');
    screen.remove();
    bgMusicStop();
  };
  card.appendChild(btn);

  screen.appendChild(card);
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// COMPLETION
// ════════════════════════════════════════════════════════════════════════════

function markEventComplete(eventId, fortCoins = 0) {
  if (typeof decayAfterGame === 'function') decayAfterGame();

  const isFirst = !_chronicleProgress[eventId];
  _chronicleProgress[eventId] = true;

  if (isFirst && fortCoins > 0) {
    const onyx = Math.floor(fortCoins / 2);
    if (onyx > 0) {
      if (typeof _playerOnyx === 'undefined') window._playerOnyx = 0;
      _playerOnyx += onyx;
      const display = document.getElementById('player-onyx-count');
      if (display) display.textContent = _playerOnyx;
    }
  }

  if (typeof renderChronicleEvents === 'function') renderChronicleEvents();
  if (typeof renderChronicleMapPins === 'function') renderChronicleMapPins();
  if (typeof updateChronicleProgress === 'function') updateChronicleProgress();
}
