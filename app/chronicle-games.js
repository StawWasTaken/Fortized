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
let _sessionStarted = false;

async function launchChronicleMinigame(eventId) {
  console.log('🎮 Launching Chronicle Event:', eventId);

  // Show menu only on first event of the session
  if (!_sessionStarted) {
    await showChronicleMenu(eventId);
    _sessionStarted = true;
    return;
  }

  if (typeof canPlayGame === 'function' && !canPlayGame()) {
    return;
  }

  // Start the actual game
  await launchChronicleGame(eventId);
}

async function launchChronicleGame(eventId) {
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

// Reset session when Chronicle view closes
function resetChronicleSession() {
  _sessionStarted = false;
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
    await launchChronicleGame(eventId);
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
    grid-template-columns: 2fr 1fr 2fr 1fr 2fr;
    gap: 15px;
    padding: 20px;
    background: #f5f5f5;
    border-bottom: 3px solid #000;
    align-items: center;
  `;

  // ===== PLAYER STATS (Left Side) =====

  // Joy Bar
  const joyContainer = document.createElement('div');
  joyContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  const joyLabel = document.createElement('div');
  joyLabel.style.cssText = `
    font-weight: 700;
    font-size: 11px;
    color: #000;
    min-width: 35px;
  `;
  joyLabel.textContent = 'JOY';
  const joyBar = document.createElement('div');
  joyBar.style.cssText = `
    flex: 1;
    height: 14px;
    background: white;
    border: 2px solid #000;
    border-radius: 2px;
    overflow: hidden;
  `;
  const joyFill = document.createElement('div');
  joyFill.style.cssText = `
    height: 100%;
    background: linear-gradient(90deg, #FFD700, #FFA500);
    width: ${(typeof _playerJoy !== 'undefined' ? _playerJoy : 85)}%;
  `;
  joyBar.appendChild(joyFill);
  joyContainer.appendChild(joyLabel);
  joyContainer.appendChild(joyBar);
  header.appendChild(joyContainer);

  // Divider
  const div1 = document.createElement('div');
  div1.style.cssText = `
    height: 40px;
    border-left: 2px solid #ccc;
  `;
  header.appendChild(div1);

  // FortCoins & Hammer
  const playerStatsContainer = document.createElement('div');
  playerStatsContainer.style.cssText = `
    display: flex;
    gap: 15px;
    align-items: center;
    justify-content: center;
  `;

  const coinsContainer = document.createElement('div');
  coinsContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  const coinsIcon = document.createElement('img');
  coinsIcon.src = `${ASSET_PATH}IconCoin.png`;
  coinsIcon.style.cssText = `
    width: 22px;
    height: 22px;
    object-fit: contain;
  `;
  const coinsText = document.createElement('div');
  coinsText.style.cssText = `
    font-weight: 700;
    font-size: 13px;
    color: #000;
    min-width: 30px;
  `;
  coinsText.textContent = typeof _playerOnyx !== 'undefined' ? _playerOnyx : '0';
  coinsContainer.appendChild(coinsIcon);
  coinsContainer.appendChild(coinsText);
  playerStatsContainer.appendChild(coinsContainer);

  const hammerContainer = document.createElement('div');
  hammerContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  const hammerIcon = document.createElement('img');
  hammerIcon.src = `${ASSET_PATH}IconHammer.png`;
  hammerIcon.style.cssText = `
    width: 22px;
    height: 22px;
    object-fit: contain;
  `;
  const hammerText = document.createElement('div');
  hammerText.style.cssText = `
    font-weight: 700;
    font-size: 13px;
    color: #000;
    min-width: 30px;
  `;
  hammerText.textContent = '0';
  hammerContainer.appendChild(hammerIcon);
  hammerContainer.appendChild(hammerText);
  playerStatsContainer.appendChild(hammerContainer);

  header.appendChild(playerStatsContainer);

  // Divider
  const div2 = document.createElement('div');
  div2.style.cssText = `
    height: 40px;
    border-left: 2px solid #ccc;
  `;
  header.appendChild(div2);

  // ===== GLOBAL STATS (Right Side) =====
  const globalStatsContainer = document.createElement('div');
  globalStatsContainer.style.cssText = `
    display: flex;
    gap: 15px;
    align-items: center;
    justify-content: flex-end;
  `;

  const knightContainer = document.createElement('div');
  knightContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    flex-direction: column;
  `;
  const knightIcon = document.createElement('img');
  knightIcon.src = `${ASSET_PATH}IconKnight.png`;
  knightIcon.style.cssText = `
    width: 20px;
    height: 20px;
    object-fit: contain;
  `;
  const knightLabel = document.createElement('div');
  knightLabel.style.cssText = `
    font-weight: 700;
    font-size: 10px;
    color: #666;
    text-align: center;
  `;
  knightLabel.textContent = 'Players';
  const knightCount = document.createElement('div');
  knightCount.style.cssText = `
    font-weight: 700;
    font-size: 12px;
    color: #000;
  `;
  knightCount.textContent = '1,248';
  knightContainer.appendChild(knightIcon);
  knightContainer.appendChild(knightLabel);
  knightContainer.appendChild(knightCount);
  globalStatsContainer.appendChild(knightContainer);

  const swordContainer = document.createElement('div');
  swordContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    flex-direction: column;
  `;
  const swordIcon = document.createElement('img');
  swordIcon.src = `${ASSET_PATH}IconSword.png`;
  swordIcon.style.cssText = `
    width: 20px;
    height: 20px;
    object-fit: contain;
  `;
  const swordLabel = document.createElement('div');
  swordLabel.style.cssText = `
    font-weight: 700;
    font-size: 10px;
    color: #666;
    text-align: center;
  `;
  swordLabel.textContent = 'Won';
  const swordCount = document.createElement('div');
  swordCount.style.cssText = `
    font-weight: 700;
    font-size: 12px;
    color: #000;
  `;
  swordCount.textContent = '3,847';
  swordContainer.appendChild(swordIcon);
  swordContainer.appendChild(swordLabel);
  swordContainer.appendChild(swordCount);
  globalStatsContainer.appendChild(swordContainer);

  header.appendChild(globalStatsContainer);

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
      border-top: 4px solid #fff;
      padding: 30px;
      display: flex;
      gap: 20px;
      z-index: 10;
      animation: slideUp 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement('style');
    if (!document.getElementById('dialogue-animation')) {
      style.id = 'dialogue-animation';
      style.textContent = `
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Character portrait with animation
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
        animation: bounce 0.8s ease-in-out infinite;
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
      animation: fadeIn 0.5s ease-in;
    `;
    dialogueText.textContent = dialogues[dialogueIndex].text;

    // Add style for text fade-in
    if (!document.getElementById('text-animation')) {
      const textStyle = document.createElement('style');
      textStyle.id = 'text-animation';
      textStyle.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(textStyle);
    }

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

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, w, h);

    // Player movement
    const speed = 8;
    if (keys['arrowleft'] || keys['a']) game.player.x = Math.max(0, game.player.x - speed);
    if (keys['arrowright'] || keys['d']) game.player.x = Math.min(w - game.player.w, game.player.x + speed);

    // Draw player bucket with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(game.player.x, game.player.y, game.player.w, game.player.h);

    // Reset shadow
    ctx.shadowColor = 'transparent';

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

    // Draw items with better visuals
    game.items.forEach(item => {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      if (item.type === 'gold') {
        // Draw gold coin
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(item.x + item.w/2, item.y + item.h/2, item.w/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Draw danger item
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(item.x, item.y, item.w, item.h);
        ctx.strokeStyle = '#CC0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x, item.y, item.w, item.h);
      }

      ctx.shadowColor = 'transparent';
    });

    // Draw UI Panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(0, 0, w, 60);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, 60);

    // UI Text with better styling
    ctx.fillStyle = '#000';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`Gold Collected: ${game.gold}`, 30, 40);

    ctx.fillStyle = game.time <= 10 ? '#FF6B6B' : '#000';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`Time: ${Math.ceil(game.time)}s`, w - 250, 40);

    // Progress indicator
    const progressWidth = (w - 60) * 0.5;
    const progressX = w / 2 - progressWidth / 2;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(progressX, 8, progressWidth, 20);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(progressX, 8, (game.gold / 150) * progressWidth, 20);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(progressX, 8, progressWidth, 20);

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

        // Visual feedback - button press effect
        clickBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          clickBtn.style.transform = 'scale(1)';
        }, 100);

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

  // Reset game state
  _gameState.isPlaying = false;
  _gameState.currentEvent = null;

  // Re-render chronicle UI
  if (typeof renderChronicleEvents === 'function') renderChronicleEvents();
  if (typeof renderChronicleMapPins === 'function') renderChronicleMapPins();
  if (typeof updateChronicleProgress === 'function') updateChronicleProgress();
}

// ════════════════════════════════════════════════════════════════════════════
// CLEANUP & UTILITIES
// ════════════════════════════════════════════════════════════════════════════

function cleanupGame() {
  stopBackgroundMusic();
  _gameState.isPlaying = false;
  _gameState.currentEvent = null;

  // Clean up event listeners
  document.removeEventListener('keydown', null);
  document.removeEventListener('keyup', null);
}
