/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - COMPLETE REWORK (Discord/RPG Style)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Inspired by "Last Meadow Online" - Professional medieval aesthetic
 * White/Black with shadows, MedievalSharp font, Discord-style card interface
 */

const ASSET_PATH = '/app/Chronicle/chapter1/assets/';
const FONT = "'MedievalSharp', cursive";

// ════════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════════════════════════════════════════

let _backgroundMusic = null;
let _gameState = {
  currentEvent: null,
  isPlaying: false,
  stats: {
    joy: 85,
    fortCoins: 0,
    hammer: 0,
    globalPlayers: 0,
    globalBattlesWon: 0
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ASSET SYSTEM - PRELOADER & CACHE
// ════════════════════════════════════════════════════════════════════════════

const assetCache = {
  images: {},
  audio: {}
};

async function preloadImage(filename) {
  return new Promise((resolve) => {
    if (assetCache.images[filename]) {
      resolve(assetCache.images[filename]);
      return;
    }

    const img = new Image();
    const fullPath = `${ASSET_PATH}${filename}`;

    img.onload = () => {
      assetCache.images[filename] = img;
      resolve(img);
    };

    img.onerror = () => {
      console.warn(`⚠️ Image not found: ${fullPath}`);
      resolve(null);
    };

    img.src = fullPath;
  });
}

function playSound(filename, volume = 0.4) {
  if (!assetCache.audio[filename]) {
    assetCache.audio[filename] = new Audio(`${ASSET_PATH}${filename}`);
    assetCache.audio[filename].volume = volume;
  }
  const audio = assetCache.audio[filename];
  audio.currentTime = 0;
  audio.play().catch(() => {});
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
// DISCORD/RPG STYLE CARD COMPONENT
// ════════════════════════════════════════════════════════════════════════════

function createCardContainer(options = {}) {
  const card = document.createElement('div');
  const {
    title,
    width = '500px',
    backgroundColor = '#ffffff',
    borderColor = '#000000',
    shadow = true
  } = options;

  card.style.cssText = `
    background: ${backgroundColor};
    border: 4px solid ${borderColor};
    border-radius: 8px;
    padding: 30px;
    max-width: ${width};
    width: 90%;
    ${shadow ? `box-shadow: 0 8px 0 rgba(0, 0, 0, 0.25);` : ''}
    font-family: ${FONT};
  `;

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 28px;
      font-weight: 900;
      color: ${borderColor};
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.15);
    `;
    titleEl.textContent = title;
    card.appendChild(titleEl);
  }

  return card;
}

function createStatBar(label, current, max, icon = null) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 15px;
    padding: 12px;
    background: #f5f5f5;
    border: 2px solid #000;
    border-radius: 4px;
  `;

  if (icon) {
    const iconEl = document.createElement('img');
    iconEl.src = `${ASSET_PATH}${icon}`;
    iconEl.style.cssText = `
      width: 32px;
      height: 32px;
      object-fit: contain;
    `;
    container.appendChild(iconEl);
  }

  const labelEl = document.createElement('div');
  labelEl.style.cssText = `
    min-width: 100px;
    font-weight: 700;
    color: #000;
  `;
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const barContainer = document.createElement('div');
  barContainer.style.cssText = `
    flex: 1;
    height: 20px;
    background: white;
    border: 2px solid #000;
    border-radius: 2px;
    overflow: hidden;
  `;

  const fill = document.createElement('div');
  fill.style.cssText = `
    height: 100%;
    background: #000;
    width: ${(current / max) * 100}%;
    transition: width 0.3s ease;
  `;
  barContainer.appendChild(fill);
  container.appendChild(barContainer);

  const valueEl = document.createElement('div');
  valueEl.style.cssText = `
    min-width: 50px;
    text-align: right;
    font-weight: 700;
    color: #000;
  `;
  valueEl.textContent = `${current}/${max}`;
  container.appendChild(valueEl);

  return container;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN LAUNCHER
// ════════════════════════════════════════════════════════════════════════════

let _menuShown = false;

async function launchChronicleMinigame(eventId) {
  console.log('🎮 Launching Chronicle Event:', eventId);

  // Show menu if first time
  if (!_menuShown) {
    await showChronicleMenu(eventId);
    _menuShown = true;
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
    8: game_glassportBlockade
  };

  _gameState.currentEvent = eventId;
  _gameState.isPlaying = true;

  const game = games[eventId];
  if (game) {
    await game(eventId);
  }

  _gameState.isPlaying = false;
}

// ════════════════════════════════════════════════════════════════════════════
// GAME MENU - DISCORD/RPG STYLE
// ════════════════════════════════════════════════════════════════════════════

async function showChronicleMenu(eventId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: white;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: ${FONT};
    overflow: hidden;
  `;

  // Load all assets in parallel
  const [title, caravan, joyLogo, uiBox] = await Promise.all([
    preloadImage('Chap1Title.png'),
    preloadImage('Caravan.png'),
    preloadImage('Grand Joy Games.png'),
    preloadImage('UIBox.png')
  ]);

  // Background caravan (decorative)
  if (caravan) {
    const bgImg = document.createElement('img');
    bgImg.src = `${ASSET_PATH}Caravan.png`;
    bgImg.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 0;
      height: 75%;
      width: auto;
      object-fit: contain;
      opacity: 0.85;
      z-index: 1;
    `;
    overlay.appendChild(bgImg);
  }

  // Content wrapper
  const content = document.createElement('div');
  content.style.cssText = `
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 40px;
    align-items: flex-start;
    max-width: 45%;
  `;

  // Logo
  if (joyLogo) {
    const logo = document.createElement('img');
    logo.src = `${ASSET_PATH}Grand Joy Games.png`;
    logo.style.cssText = `
      height: 70px;
      width: auto;
      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
    `;
    content.appendChild(logo);
  }

  // Title
  if (title) {
    const titleImg = document.createElement('img');
    titleImg.src = `${ASSET_PATH}Chap1Title.png`;
    titleImg.style.cssText = `
      height: 140px;
      width: auto;
      max-width: 100%;
      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
    `;
    content.appendChild(titleImg);
  }

  // Start button
  const startBtn = document.createElement('button');
  startBtn.style.cssText = `
    background: #000;
    color: white;
    border: 3px solid #000;
    padding: 20px 50px;
    font-family: ${FONT};
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-radius: 4px;
    transition: all 0.15s;
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
      position: fixed;
      inset: 0;
      background: #000;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const video = document.createElement('video');
    video.src = `${ASSET_PATH}FTZchap1-Intro.mp4`;
    video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    video.autoplay = true;
    video.onended = () => {
      screen.remove();
      resolve();
    };

    const skipBtn = document.createElement('button');
    skipBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: white;
      color: #000;
      border: 2px solid white;
      padding: 10px 20px;
      font-family: ${FONT};
      font-weight: 700;
      cursor: pointer;
      z-index: 10;
      font-size: 12px;
      text-transform: uppercase;
      border-radius: 2px;
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
// GAME SCREEN - BASE STRUCTURE
// ════════════════════════════════════════════════════════════════════════════

function createGameScreen() {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: white;
    font-family: ${FONT};
    display: flex;
    flex-direction: column;
  `;
  return screen;
}

function createGameHeader() {
  const header = document.createElement('div');
  header.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 15px;
    padding: 20px;
    background: #f5f5f5;
    border-bottom: 3px solid #000;
  `;

  // Joy Bar
  const joyContainer = document.createElement('div');
  joyContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  const joyLabel = document.createElement('div');
  joyLabel.style.cssText = `
    font-weight: 700;
    font-size: 12px;
    color: #000;
  `;
  joyLabel.textContent = 'JOY';
  const joyBar = document.createElement('div');
  joyBar.style.cssText = `
    flex: 1;
    height: 16px;
    background: white;
    border: 2px solid #000;
    border-radius: 2px;
    overflow: hidden;
  `;
  const joyFill = document.createElement('div');
  joyFill.style.cssText = `
    height: 100%;
    background: #FFD700;
    width: 85%;
  `;
  joyBar.appendChild(joyFill);
  joyContainer.appendChild(joyLabel);
  joyContainer.appendChild(joyBar);
  header.appendChild(joyContainer);

  // FortCoins
  const coinsContainer = document.createElement('div');
  coinsContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
  `;
  const coinsIcon = document.createElement('img');
  coinsIcon.src = `${ASSET_PATH}IconCoin.png`;
  coinsIcon.style.cssText = `
    width: 24px;
    height: 24px;
    object-fit: contain;
  `;
  const coinsText = document.createElement('div');
  coinsText.style.cssText = `
    font-weight: 700;
    font-size: 14px;
    color: #000;
  `;
  coinsText.textContent = '0';
  coinsContainer.appendChild(coinsIcon);
  coinsContainer.appendChild(coinsText);
  header.appendChild(coinsContainer);

  // Hammer (Health/Armor)
  const hammerContainer = document.createElement('div');
  hammerContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-end;
  `;
  const hammerLabel = document.createElement('div');
  hammerLabel.style.cssText = `
    font-weight: 700;
    font-size: 12px;
    color: #000;
  `;
  hammerLabel.textContent = 'ARMOR';
  const hammerIcon = document.createElement('img');
  hammerIcon.src = `${ASSET_PATH}IconHammer.png`;
  hammerIcon.style.cssText = `
    width: 24px;
    height: 24px;
    object-fit: contain;
  `;
  hammerContainer.appendChild(hammerLabel);
  hammerContainer.appendChild(hammerIcon);
  header.appendChild(hammerContainer);

  return header;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 1: BREAKING TREATY - DIALOGUE RPG STYLE
// ════════════════════════════════════════════════════════════════════════════

async function game_breakingTreaty(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const header = createGameHeader();
  screen.appendChild(header);

  const [bgImg, npcImg] = await Promise.all([
    preloadImage('CouncilChamber.png'),
    preloadImage('Wealthplace.png')
  ]);

  const dialogues = [
    {
      character: 'Cardinal Wealthplace',
      text: 'The Treaty of the Silver Stream is shattered...',
      image: 'Wealthplace.png'
    },
    {
      character: 'Cardinal Wealthplace',
      text: 'What counsel do you offer, noble knight?',
      image: 'Wealthplace.png'
    },
    {
      character: 'Cardinal Wealthplace',
      text: 'Our fate rests in your hands.',
      image: 'Wealthplace.png'
    }
  ];

  let dialogueIndex = 0;

  function render() {
    // Clear content area (keep header)
    const content = screen.querySelector('[data-content]');
    if (content) content.remove();

    if (dialogueIndex >= dialogues.length) {
      endGame();
      return;
    }

    const contentArea = document.createElement('div');
    contentArea.setAttribute('data-content', 'true');
    contentArea.style.cssText = `
      flex: 1;
      position: relative;
      overflow: hidden;
    `;

    // Background image
    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = `${ASSET_PATH}CouncilChamber.png`;
      bg.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.4;
      `;
      contentArea.appendChild(bg);
    }

    // Dark overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
    `;
    contentArea.appendChild(overlay);

    // Dialogue box - Discord/RPG card style
    const dialogueBox = document.createElement('div');
    dialogueBox.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: #000;
      border-top: 4px solid #000;
      padding: 30px;
      display: flex;
      gap: 20px;
      z-index: 10;
    `;

    // Character portrait
    if (bgImg) {
      const portrait = document.createElement('img');
      portrait.src = `${ASSET_PATH}${dialogues[dialogueIndex].image}`;
      portrait.style.cssText = `
        height: 200px;
        width: auto;
        object-fit: contain;
        border: 3px solid white;
        border-radius: 4px;
        flex-shrink: 0;
      `;
      dialogueBox.appendChild(portrait);
    }

    // Text content
    const textBox = document.createElement('div');
    textBox.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      color: white;
    `;

    const characterName = document.createElement('div');
    characterName.style.cssText = `
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 12px;
      color: #FFD700;
    `;
    characterName.textContent = dialogues[dialogueIndex].character;
    textBox.appendChild(characterName);

    const dialogueText = document.createElement('div');
    dialogueText.style.cssText = `
      font-size: 16px;
      line-height: 1.8;
      color: white;
    `;
    dialogueText.textContent = dialogues[dialogueIndex].text;
    textBox.appendChild(dialogueText);

    dialogueBox.appendChild(textBox);
    contentArea.appendChild(dialogueBox);

    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.style.cssText = `
      position: absolute;
      bottom: 30px;
      right: 30px;
      background: white;
      color: #000;
      border: 3px solid #000;
      padding: 12px 24px;
      font-family: ${FONT};
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 2px;
      transition: all 0.15s;
      box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.2);
    `;
    continueBtn.textContent = 'Continue →';
    continueBtn.onmouseover = () => {
      continueBtn.style.transform = 'translate(-2px, -2px)';
      continueBtn.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.2)';
    };
    continueBtn.onmouseout = () => {
      continueBtn.style.transform = 'translate(0, 0)';
      continueBtn.style.boxShadow = '2px 2px 0px rgba(0, 0, 0, 0.2)';
    };
    continueBtn.onclick = () => {
      playSound('SoundUiSelect.mp3');
      dialogueIndex++;
      render();
    };
    contentArea.appendChild(continueBtn);

    screen.appendChild(contentArea);
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
// EVENT 2: RAID - CATCHING GAME (Things Fall from Sky)
// ════════════════════════════════════════════════════════════════════════════

async function game_raidSilverStream(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const header = createGameHeader();
  screen.appendChild(header);

  const bgImg = await preloadImage('SilverStream.png');

  const gameArea = document.createElement('div');
  gameArea.style.cssText = `
    flex: 1;
    position: relative;
    overflow: hidden;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 100;
  gameArea.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    player: { x: w / 2, y: h - 80, w: 60, h: 60, gold: 0 },
    items: [],
    time: 30,
    active: true
  };

  // Spawn initial items
  for (let i = 0; i < 5; i++) {
    game.items.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.3),
      w: 40,
      h: 40,
      vy: 1.5 + Math.random() * 1.5,
      type: Math.random() > 0.25 ? 'gold' : 'danger'
    });
  }

  // Keyboard controls
  const keys = {};
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (['arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
  });
  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function update() {
    if (!game.active) return;

    // Draw background
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(0, 0, w, h);
    }

    // Player movement
    const speed = 8;
    if (keys['arrowleft'] || keys['a']) game.player.x = Math.max(0, game.player.x - speed);
    if (keys['arrowright'] || keys['d']) game.player.x = Math.min(w - game.player.w, game.player.x + speed);

    // Draw player bucket
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(game.player.x, game.player.y, game.player.w, game.player.h);

    // Update items
    game.items = game.items.filter(item => {
      item.y += item.vy;

      // Collision detection
      if (item.y + item.h > game.player.y &&
          item.y < game.player.y + game.player.h &&
          item.x + item.w > game.player.x &&
          item.x < game.player.x + game.player.w) {
        if (item.type === 'gold') {
          game.gold += 10;
          playSound('SoundCoin.mp3', 0.5);
        }
        return false;
      }

      return item.y < h;
    });

    // Spawn new items
    if (Math.random() < 0.03) {
      game.items.push({
        x: Math.random() * w,
        y: -40,
        w: 40,
        h: 40,
        vy: 1.5 + Math.random() * 2,
        type: Math.random() > 0.25 ? 'gold' : 'danger'
      });
    }

    // Draw items
    game.items.forEach(item => {
      if (item.type === 'gold') {
        ctx.fillStyle = '#FFD700';
        ctx.drawImage(assetCache.images['GoldBag.png'] || null, item.x, item.y, item.w, item.h);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(item.x, item.y, item.w, item.h);
      } else {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(item.x, item.y, item.w, item.h);
      }
    });

    // UI Text
    ctx.fillStyle = '#000';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`Gold: ${game.gold}`, 30, 40);
    ctx.fillText(`Time: ${Math.ceil(game.time)}s`, w - 200, 40);

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
      toast(`✓ Raid successful! Collected ${game.gold} gold!`, 'success');
    } else {
      playSound('SoundLose.mp3');
      toast(`✗ Insufficient gold collected. Need 100, got ${game.gold}.`, 'error');
    }
  }

  screen.appendChild(gameArea);
  document.removeEventListener('keydown', null);
  document.removeEventListener('keyup', null);
  update();
}

// ════════════════════════════════════════════════════════════════════════════
// CLICKER GAMES (Events 3-8)
// ════════════════════════════════════════════════════════════════════════════

async function createClickerGame(eventId, name, requiredClicks, bgImage) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const header = createGameHeader();
  screen.appendChild(header);

  const contentArea = document.createElement('div');
  contentArea.style.cssText = `
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 40px;
  `;

  const bgImg = bgImage ? await preloadImage(bgImage) : null;

  if (bgImg) {
    const bg = document.createElement('img');
    bg.src = `${ASSET_PATH}${bgImage}`;
    bg.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.35;
    `;
    contentArea.appendChild(bg);
  }

  const game = {
    clicks: 0,
    needed: requiredClicks,
    cooldown: 0
  };

  function render() {
    // Remove old content
    const oldCard = contentArea.querySelector('[data-card]');
    if (oldCard) oldCard.remove();

    const card = document.createElement('div');
    card.setAttribute('data-card', 'true');
    card.style.cssText = `
      position: relative;
      z-index: 10;
      background: white;
      border: 4px solid #000;
      border-radius: 8px;
      padding: 50px;
      max-width: 600px;
      width: 90%;
      box-shadow: 0 8px 0 rgba(0, 0, 0, 0.25);
    `;

    const title = document.createElement('h2');
    title.style.cssText = `
      margin: 0 0 40px 0;
      font-size: 32px;
      font-weight: 900;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-align: center;
    `;
    title.textContent = name;
    card.appendChild(title);

    // Progress display
    const progress = document.createElement('div');
    progress.style.cssText = `
      margin-bottom: 40px;
      text-align: center;
    `;

    const counter = document.createElement('div');
    counter.style.cssText = `
      font-size: 36px;
      font-weight: 900;
      color: #000;
      margin-bottom: 20px;
    `;
    counter.textContent = `${game.clicks} / ${game.needed}`;
    progress.appendChild(counter);

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      height: 30px;
      background: #f0f0f0;
      border: 3px solid #000;
      border-radius: 4px;
      overflow: hidden;
    `;

    const fill = document.createElement('div');
    fill.style.cssText = `
      height: 100%;
      background: #000;
      width: ${(game.clicks / game.needed) * 100}%;
      transition: width 0.2s ease;
    `;
    progressBar.appendChild(fill);
    progress.appendChild(progressBar);
    card.appendChild(progress);

    // Click button
    const clickBtn = document.createElement('button');
    clickBtn.style.cssText = `
      width: 100%;
      padding: 50px;
      background: white;
      border: 4px solid #000;
      font-family: ${FONT};
      font-size: 24px;
      font-weight: 900;
      cursor: ${game.cooldown > 0 ? 'not-allowed' : 'pointer'};
      text-transform: uppercase;
      letter-spacing: 2px;
      border-radius: 4px;
      transition: all 0.1s;
      opacity: ${game.cooldown > 0 ? '0.6' : '1'};
    `;
    clickBtn.textContent = game.cooldown > 0 ? `COOLDOWN ${Math.ceil(game.cooldown)}` : 'CLICK!';
    clickBtn.disabled = game.cooldown > 0;

    clickBtn.onmouseover = () => {
      if (game.cooldown <= 0) {
        clickBtn.style.transform = 'scale(1.05)';
        clickBtn.style.boxShadow = '0 4px 0 rgba(0, 0, 0, 0.3)';
      }
    };
    clickBtn.onmouseout = () => {
      clickBtn.style.transform = 'scale(1)';
      clickBtn.style.boxShadow = 'none';
    };

    clickBtn.onclick = () => {
      if (game.cooldown <= 0) {
        game.clicks++;
        game.cooldown = 0.3; // 300ms cooldown
        playSound('SoundCoin.mp3', 0.5);

        if (game.clicks >= game.needed) {
          screen.remove();
          stopBackgroundMusic();
          playSound('SoundWin.mp3');
          markEventComplete(eventId, Math.floor(requiredClicks * 2));
          toast(`✓ ${name} complete!`, 'success');
        } else {
          render();
        }
      }
    };

    card.appendChild(clickBtn);
    contentArea.appendChild(card);

    // Update cooldown
    if (game.cooldown > 0) {
      game.cooldown -= 0.016;
      setTimeout(render, 16);
    }
  }

  screen.appendChild(contentArea);
  render();
}

// Game event wrappers
async function game_burningElowen(eventId) { await createClickerGame(eventId, 'BURNING ELOWEN', 20, 'Battlefield.png'); }
async function game_timberRoads(eventId) { await createClickerGame(eventId, 'TIMBER ROADS', 25, 'TheCanals.png'); }
async function game_combatBattle(eventId) { await createClickerGame(eventId, 'COMBAT BATTLE', 30, 'Battlefield.png'); }
async function game_fenwckCanal(eventId) { await createClickerGame(eventId, 'FENWCK CANAL', 75, 'TheCanals.png'); }
async function game_ironstall(eventId) { await createClickerGame(eventId, 'IRONSTALL', 50, 'GlassportHarbour.png'); }
async function game_glassportBlockade(eventId) { await createClickerGame(eventId, 'GLASSPORT BLOCKADE', 60, 'GlassportHarbour.png'); }

// ════════════════════════════════════════════════════════════════════════════
// EVENT COMPLETION & REWARDS
// ════════════════════════════════════════════════════════════════════════════

function markEventComplete(eventId, fortCoins = 0) {
  if (typeof decayAfterGame === 'function') {
    decayAfterGame();
  }

  const isFirstCompletion = !_chronicleProgress[eventId];
  _chronicleProgress[eventId] = true;

  // Award Onyx to player
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

  // Re-render chronicle UI
  if (typeof renderChronicleEvents === 'function') renderChronicleEvents();
  if (typeof renderChronicleMapPins === 'function') renderChronicleMapPins();
  if (typeof updateChronicleProgress === 'function') updateChronicleProgress();
}
