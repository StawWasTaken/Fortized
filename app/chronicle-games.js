/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - COMPLETE PROFESSIONAL REDESIGN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ASSET_PATH = '/app/Chronicle/chapter1/assets/';
const FONT = "'MedievalSharp', cursive";
let _backgroundMusic = null;
let _gameMenuShown = false;

// ════════════════════════════════════════════════════════════════════════════
// IMAGE PRELOADER - CRITICAL FIX
// ════════════════════════════════════════════════════════════════════════════

const imageCache = {};

async function preloadImage(filename) {
  return new Promise((resolve) => {
    if (imageCache[filename]) {
      resolve(imageCache[filename]);
      return;
    }

    const img = new Image();
    const fullPath = `${ASSET_PATH}${filename}`;

    img.onload = () => {
      imageCache[filename] = img;
      resolve(img);
    };

    img.onerror = () => {
      console.error(`❌ Failed to load: ${fullPath}`);
      resolve(null);
    };

    img.src = fullPath;
  });
}

// ════════════════════════════════════════════════════════════════════════════
// AUDIO SYSTEM
// ════════════════════════════════════════════════════════════════════════════

let audioCache = {};

function playSound(filename) {
  if (!audioCache[filename]) {
    audioCache[filename] = new Audio(`${ASSET_PATH}${filename}`);
    audioCache[filename].volume = 0.4;
  }
  audioCache[filename].currentTime = 0;
  audioCache[filename].play().catch(() => {});
}

function playBackgroundMusic() {
  if (!_backgroundMusic) {
    _backgroundMusic = new Audio(`${ASSET_PATH}Chapter 1 Theme Song.mp3`);
    _backgroundMusic.loop = true;
    _backgroundMusic.volume = 0.25;
  }
  _backgroundMusic.play().catch(() => {});
}

function stopBackgroundMusic() {
  if (_backgroundMusic) {
    _backgroundMusic.pause();
    _backgroundMusic.currentTime = 0;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN LAUNCHER
// ════════════════════════════════════════════════════════════════════════════

async function launchChronicleMinigame(eventId) {
  console.log('🎮 Launching event:', eventId);

  if (!_gameMenuShown) {
    await showGameMenu(eventId);
    return;
  }

  if (typeof canPlayGame === 'function' && !canPlayGame()) {
    return;
  }

  playSound('SoundPlay.mp3');
  playBackgroundMusic();

  const games = {
    1: game_breakingTreaty,
    2: game_raidSilverStream,
    3: game_burningElowen,
    4: game_timberRoads,
    5: game_combatBattle,
    6: game_fenwckCanal,
    7: game_ironstall,
    8: game_glassportBlockade,
  };

  const game = games[eventId] || game_generic;
  await game(eventId);
}

// ════════════════════════════════════════════════════════════════════════════
// GAME MENU - PROFESSIONAL DESIGN
// ════════════════════════════════════════════════════════════════════════════

async function showGameMenu(eventId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: white;
    z-index: 10000; display: flex; align-items: center;
    justify-content: center; font-family: ${FONT};
    overflow: hidden;
  `;

  // Load assets in parallel
  const [title, caravan, joyLogo] = await Promise.all([
    preloadImage('Chap1Title.png'),
    preloadImage('Caravan.png'),
    preloadImage('Grand Joy Games.png')
  ]);

  // Background caravan (right side)
  if (caravan) {
    const bgImg = document.createElement('img');
    bgImg.src = `${ASSET_PATH}Caravan.png`;
    bgImg.style.cssText = `
      position: absolute; right: 0; bottom: 0;
      height: 80%; width: auto; object-fit: contain;
      opacity: 0.9;
    `;
    overlay.appendChild(bgImg);
  }

  // Content container (left side)
  const content = document.createElement('div');
  content.style.cssText = `
    position: relative; z-index: 10; max-width: 50%;
    display: flex; flex-direction: column; gap: 30px;
    align-items: flex-start; justify-content: center;
  `;

  // Logo
  if (joyLogo) {
    const logo = document.createElement('img');
    logo.src = `${ASSET_PATH}Grand Joy Games.png`;
    logo.style.cssText = `height: 80px; width: auto;`;
    content.appendChild(logo);
  }

  // Title
  if (title) {
    const titleImg = document.createElement('img');
    titleImg.src = `${ASSET_PATH}Chap1Title.png`;
    titleImg.style.cssText = `height: 150px; width: auto; max-width: 100%;`;
    content.appendChild(titleImg);
  }

  // Start button
  const startBtn = document.createElement('button');
  startBtn.style.cssText = `
    background: #000; color: white; border: 3px solid #000;
    padding: 18px 50px; font-family: ${FONT};
    font-size: 20px; font-weight: 700; cursor: pointer;
    text-transform: uppercase; letter-spacing: 2px;
    border-radius: 2px; transition: all 0.2s;
    box-shadow: 4px 4px 0px rgba(0,0,0,0.3);
  `;
  startBtn.textContent = 'Begin Your Journey';
  startBtn.onmouseover = () => {
    startBtn.style.transform = 'translate(-2px, -2px)';
    startBtn.style.boxShadow = '6px 6px 0px rgba(0,0,0,0.3)';
  };
  startBtn.onmouseout = () => {
    startBtn.style.transform = 'translate(0, 0)';
    startBtn.style.boxShadow = '4px 4px 0px rgba(0,0,0,0.3)';
  };
  startBtn.onclick = async () => {
    playSound('SoundUiSelect.mp3');
    overlay.remove();
    _gameMenuShown = true;
    await showIntroVideo();
    launchChronicleMinigame(eventId);
  };
  content.appendChild(startBtn);

  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

// ════════════════════════════════════════════════════════════════════════════
// INTRO VIDEO
// ════════════════════════════════════════════════════════════════════════════

async function showIntroVideo() {
  return new Promise((resolve) => {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: fixed; inset: 0; background: #000;
      z-index: 10000; display: flex; align-items: center;
      justify-content: center;
    `;

    const video = document.createElement('video');
    video.src = `${ASSET_PATH}FTZchap1-Intro.mp4`;
    video.style.cssText = `width: 100%; height: 100%; object-fit: cover;`;
    video.autoplay = true;
    video.onended = () => {
      screen.remove();
      resolve();
    };

    const skipBtn = document.createElement('button');
    skipBtn.style.cssText = `
      position: absolute; top: 20px; right: 20px;
      background: white; color: #000; border: 2px solid #000;
      padding: 10px 20px; font-family: ${FONT};
      font-weight: 700; cursor: pointer; z-index: 10;
      font-size: 12px; text-transform: uppercase;
    `;
    skipBtn.textContent = 'SKIP INTRO';
    skipBtn.onclick = () => {
      video.pause();
      screen.remove();
      resolve();
    };

    screen.appendChild(video);
    screen.appendChild(skipBtn);
    document.body.appendChild(screen);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// GAME SCREEN BUILDER
// ════════════════════════════════════════════════════════════════════════════

function createGameScreen() {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: white; font-family: ${FONT};
    display: flex; flex-direction: column;
  `;
  return screen;
}

function createGameBox(title) {
  const box = document.createElement('div');
  box.style.cssText = `
    background: white; border: 4px solid #000;
    padding: 30px; border-radius: 0;
    box-shadow: 6px 6px 0px rgba(0,0,0,0.2);
    position: relative;
  `;

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = `
      margin: -50px 0 20px 0; font-size: 28px;
      font-weight: 900; color: #000; font-family: ${FONT};
      text-transform: uppercase; letter-spacing: 2px;
      text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
    `;
    titleEl.textContent = title;
    box.appendChild(titleEl);
  }

  return box;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 1: BREAKING TREATY - DIALOGUE
// ════════════════════════════════════════════════════════════════════════════

async function game_breakingTreaty(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const [bgImg, npcImg] = await Promise.all([
    preloadImage('CouncilChamber.png'),
    preloadImage('Wealthplace.png')
  ]);

  const dialogues = [
    { text: 'The Treaty of the Silver Stream is shattered...' },
    { text: 'What counsel do you offer, noble knight?' },
    { text: 'Our fate rests in your hands.' }
  ];

  let dialogueIndex = 0;

  function render() {
    screen.innerHTML = '';

    // Background with overlay
    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = `${ASSET_PATH}CouncilChamber.png`;
      bg.style.cssText = `
        position: absolute; inset: 0; width: 100%;
        height: 100%; object-fit: cover; opacity: 0.5;
      `;
      screen.appendChild(bg);
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute; inset: 0; background: rgba(0,0,0,0.4);
    `;
    screen.appendChild(overlay);

    if (dialogueIndex >= dialogues.length) {
      endGame();
      return;
    }

    // Dialogue box
    const dialogueBox = document.createElement('div');
    dialogueBox.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0;
      background: #000; color: white; padding: 40px;
      display: flex; gap: 20px; z-index: 10;
      border-top: 4px solid #000;
    `;

    if (npcImg) {
      const npc = document.createElement('img');
      npc.src = `${ASSET_PATH}Wealthplace.png`;
      npc.style.cssText = `
        height: 180px; width: auto; object-fit: contain;
        border: 2px solid white;
      `;
      dialogueBox.appendChild(npc);
    }

    const textBox = document.createElement('div');
    textBox.style.cssText = `
      flex: 1; display: flex; flex-direction: column;
      justify-content: center;
    `;

    const speaker = document.createElement('div');
    speaker.style.cssText = `
      font-weight: 700; font-size: 14px; text-transform: uppercase;
      letter-spacing: 1px; margin-bottom: 12px; color: #fff;
    `;
    speaker.textContent = 'Cardinal Wealthplace';
    textBox.appendChild(speaker);

    const text = document.createElement('div');
    text.style.cssText = `
      font-size: 16px; line-height: 1.7; color: white;
      font-family: ${FONT};
    `;
    text.textContent = dialogues[dialogueIndex].text;
    textBox.appendChild(text);

    dialogueBox.appendChild(textBox);
    screen.appendChild(dialogueBox);

    // Continue button
    const btn = document.createElement('button');
    btn.style.cssText = `
      position: absolute; bottom: 30px; right: 30px;
      background: white; color: #000; border: 2px solid #000;
      padding: 12px 24px; font-family: ${FONT};
      font-weight: 700; cursor: pointer; z-index: 10;
      text-transform: uppercase; letter-spacing: 1px;
      transition: all 0.2s;
    `;
    btn.textContent = 'CONTINUE →';
    btn.onmouseover = () => btn.style.opacity = '0.8';
    btn.onmouseout = () => btn.style.opacity = '1';
    btn.onclick = () => {
      playSound('SoundUiSelect.mp3');
      dialogueIndex++;
      render();
    };
    screen.appendChild(btn);
  }

  function endGame() {
    playSound('SoundWin.mp3');
    screen.remove();
    stopBackgroundMusic();
    markEventComplete(eventId, 30);
    toast('✓ Treaty negotiations complete!', 'success');
  }

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 2: RAID - CATCHING GAME
// ════════════════════════════════════════════════════════════════════════════

async function game_raidSilverStream(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await preloadImage('SilverStream.png');

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Draw background
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, w, h);
  }

  const game = {
    player: { x: w / 2, y: h - 60, w: 50, h: 50, gold: 0 },
    items: [],
    time: 30,
    active: true
  };

  for (let i = 0; i < 3; i++) {
    game.items.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.4),
      w: 30,
      h: 30,
      vy: 2 + Math.random(),
      type: Math.random() > 0.3 ? 'gold' : 'danger'
    });
  }

  document.addEventListener('mousemove', (e) => {
    game.player.x = Math.max(0, Math.min(w - game.player.w, e.clientX - game.player.w / 2));
  });

  function update() {
    if (!game.active) return;

    // Draw background
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, w, h);
    }

    // Update items
    game.items = game.items.filter(item => {
      item.y += item.vy;

      if (item.y + item.h > game.player.y &&
          item.y < game.player.y + game.player.h &&
          item.x + item.w > game.player.x &&
          item.x < game.player.x + game.player.w) {
        if (item.type === 'gold') {
          game.gold += 10;
          playSound('SoundCoin.mp3');
        }
        return false;
      }

      return item.y < h;
    });

    // Spawn new items
    if (Math.random() < 0.02) {
      game.items.push({
        x: Math.random() * w,
        y: -30,
        w: 30,
        h: 30,
        vy: 2 + Math.random(),
        type: Math.random() > 0.3 ? 'gold' : 'danger'
      });
    }

    // Draw player
    ctx.fillStyle = '#000';
    ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(game.player.x, game.player.y, game.player.w, game.player.h);

    // Draw items
    game.items.forEach(item => {
      ctx.fillStyle = item.type === 'gold' ? '#FFD700' : '#FF4444';
      ctx.fillRect(item.x, item.y, item.w, item.h);
    });

    // UI
    ctx.fillStyle = '#000';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`GOLD: ${game.gold}`, 30, 50);
    ctx.fillText(`TIME: ${Math.ceil(game.time)}s`, w - 200, 50);

    game.time -= 1 / 60;
    if (game.time <= 0) endGame();
    else requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    stopBackgroundMusic();
    if (game.gold >= 100) {
      playSound('SoundWin.mp3');
      markEventComplete(eventId, game.gold);
      toast('✓ Raid successful!', 'success');
    } else {
      playSound('SoundLose.mp3');
      toast('✗ Insufficient gold collected.', 'error');
    }
  }

  update();
}

// ════════════════════════════════════════════════════════════════════════════
// CLICKER GAMES (3-8) - SIMPLE TEMPLATE
// ════════════════════════════════════════════════════════════════════════════

async function createClickerGame(eventId, name, clicks, bgImage) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = bgImage ? await preloadImage(bgImage) : null;

  if (bgImg) {
    const bg = document.createElement('img');
    bg.src = `${ASSET_PATH}${bgImage}`;
    bg.style.cssText = `
      position: absolute; inset: 0; width: 100%;
      height: 100%; object-fit: cover; opacity: 0.4;
    `;
    screen.appendChild(bg);
  }

  const game = { clicks: 0, needed: clicks };

  function render() {
    const content = document.createElement('div');
    content.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%); z-index: 10;
      background: white; border: 4px solid #000;
      padding: 50px; max-width: 500px; width: 90%;
      box-shadow: 8px 8px 0px rgba(0,0,0,0.25);
    `;

    const title = document.createElement('h2');
    title.style.cssText = `
      margin: 0 0 30px 0; font-size: 32px;
      font-weight: 900; color: #000; font-family: ${FONT};
      text-transform: uppercase; letter-spacing: 2px;
    `;
    title.textContent = name;
    content.appendChild(title);

    const progress = document.createElement('div');
    progress.style.cssText = `
      background: #f0f0f0; border: 3px solid #000;
      padding: 20px; margin-bottom: 30px; border-radius: 0;
    `;

    const counter = document.createElement('div');
    counter.style.cssText = `
      font-size: 28px; font-weight: 700;
      color: #000; text-align: center; margin-bottom: 12px;
    `;
    counter.textContent = `${game.clicks} / ${game.needed}`;
    progress.appendChild(counter);

    const bar = document.createElement('div');
    bar.style.cssText = `
      height: 20px; background: white; border: 2px solid #000;
      border-radius: 0; overflow: hidden;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      height: 100%; background: #000;
      width: ${(game.clicks / game.needed) * 100}%;
    `;
    bar.appendChild(fill);
    progress.appendChild(bar);

    content.appendChild(progress);

    const btn = document.createElement('button');
    btn.style.cssText = `
      width: 100%; padding: 40px; background: white;
      border: 3px solid #000; font-family: ${FONT};
      font-size: 20px; font-weight: 700; cursor: pointer;
      text-transform: uppercase; letter-spacing: 2px;
      transition: all 0.15s;
    `;
    btn.textContent = 'CLICK!';
    btn.onmouseover = () => btn.style.opacity = '0.85';
    btn.onmouseout = () => btn.style.opacity = '1';
    btn.onclick = () => {
      game.clicks++;
      playSound('SoundCoin.mp3');
      if (game.clicks >= game.needed) {
        screen.remove();
        stopBackgroundMusic();
        playSound('SoundWin.mp3');
        markEventComplete(eventId, Math.floor(clicks * 1.5));
        toast(`✓ ${name} complete!`, 'success');
      } else {
        screen.innerHTML = '';
        render();
      }
    };
    content.appendChild(btn);

    screen.appendChild(content);
  }

  render();
}

// Game wrappers
async function game_burningElowen(eventId) { await createClickerGame(eventId, 'BURNING ELOWEN', 20, 'Battlefield.png'); }
async function game_timberRoads(eventId) { await createClickerGame(eventId, 'TIMBER ROADS', 25, 'TheCanals.png'); }
async function game_combatBattle(eventId) { await createClickerGame(eventId, 'COMBAT BATTLE', 30, 'Battlefield.png'); }
async function game_fenwckCanal(eventId) { await createClickerGame(eventId, 'FENWCK CANAL', 75, 'TheCanals.png'); }
async function game_ironstall(eventId) { await createClickerGame(eventId, 'IRONSTALL', 50, 'GlassportHarbour.png'); }
async function game_glassportBlockade(eventId) { await createClickerGame(eventId, 'GLASSPORT BLOCKADE', 60, 'GlassportHarbour.png'); }

// ════════════════════════════════════════════════════════════════════════════
// GENERIC PLACEHOLDER
// ════════════════════════════════════════════════════════════════════════════

async function game_generic(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; inset: 0; background: rgba(0,0,0,0.3);
  `;
  screen.appendChild(overlay);

  const content = document.createElement('div');
  content.style.cssText = `
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%); z-index: 10;
    background: white; border: 4px solid #000;
    padding: 40px; text-align: center;
    box-shadow: 8px 8px 0px rgba(0,0,0,0.25);
  `;

  const title = document.createElement('h2');
  title.style.cssText = `margin: 0 0 20px 0; font-size: 24px; color: #000; font-family: ${FONT};`;
  title.textContent = `EVENT ${eventId} - COMING SOON`;
  content.appendChild(title);

  const msg = document.createElement('p');
  msg.style.cssText = `margin: 0 0 20px 0; color: #333; font-size: 14px;`;
  msg.textContent = 'This event is being prepared...';
  content.appendChild(msg);

  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #000; color: white; border: 2px solid #000;
    padding: 12px 24px; font-family: ${FONT};
    font-weight: 700; cursor: pointer; text-transform: uppercase;
    letter-spacing: 1px; transition: all 0.2s;
  `;
  btn.textContent = 'CONTINUE';
  btn.onmouseover = () => btn.style.opacity = '0.8';
  btn.onmouseout = () => btn.style.opacity = '1';
  btn.onclick = () => {
    playSound('SoundUiSelect.mp3');
    screen.remove();
    stopBackgroundMusic();
  };
  content.appendChild(btn);

  screen.appendChild(content);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT COMPLETION
// ════════════════════════════════════════════════════════════════════════════

function markEventComplete(eventId, fortCoins = 0) {
  if (typeof decayAfterGame === 'function') {
    decayAfterGame();
  }

  const isFirstCompletion = !_chronicleProgress[eventId];
  _chronicleProgress[eventId] = true;

  if (isFirstCompletion && fortCoins > 0) {
    const onyxGain = Math.floor(fortCoins / 2);
    if (onyxGain > 0) {
      if (typeof _playerOnyx === 'undefined') {
        window._playerOnyx = 0;
      }
      _playerOnyx += onyxGain;
      const onyxDisplay = document.getElementById('player-onyx-count');
      if (onyxDisplay) {
        onyxDisplay.textContent = _playerOnyx;
      }
    }
  }

  if (typeof renderChronicleEvents === 'function') renderChronicleEvents();
  if (typeof renderChronicleMapPins === 'function') renderChronicleMapPins();
  if (typeof updateChronicleProgress === 'function') updateChronicleProgress();
}
