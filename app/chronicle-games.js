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
    5: game_vastillyDefense,
    6: game_fenwckCanal,
    7: game_ironstall,
    8: game_glassportBlockade,
    9: game_portCrestSiege,
    10: game_bombardment,
    11: game_harbourWrecks,
    12: game_pushOakhaven,
    13: game_fallElowen
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
  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed;
    inset: 0;
    background: white;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 60px;
    font-family: ${FONT};
    overflow: hidden;
  `;

  // Load all assets in parallel
  const [title, caravan, joyLogo] = await Promise.all([
    preloadImage('Chap1Title.png'),
    preloadImage('Caravan.png'),
    preloadImage('Grand Joy Games.png')
  ]);

  // LEFT SIDE: Content
  const content = document.createElement('div');
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 30px;
    align-items: flex-start;
    max-width: 50%;
    z-index: 10;
  `;

  // Logo
  if (joyLogo) {
    const logo = document.createElement('img');
    logo.src = `${ASSET_PATH}Grand Joy Games.png`;
    logo.style.cssText = `
      height: 60px;
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
      height: 120px;
      width: auto;
      max-width: 100%;
      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
    `;
    content.appendChild(titleImg);
  }

  // Continue button
  const continueBtn = document.createElement('button');
  continueBtn.style.cssText = `
    background: #000;
    color: white;
    border: 3px solid #000;
    padding: 18px 45px;
    font-family: ${FONT};
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-radius: 4px;
    transition: all 0.15s;
    box-shadow: 4px 4px 0px rgba(0,0,0,0.3);
  `;
  continueBtn.textContent = 'Continue Game';
  continueBtn.onmouseover = () => {
    continueBtn.style.transform = 'translate(-2px, -2px)';
    continueBtn.style.boxShadow = '6px 6px 0px rgba(0,0,0,0.3)';
  };
  continueBtn.onmouseout = () => {
    continueBtn.style.transform = 'translate(0, 0)';
    continueBtn.style.boxShadow = '4px 4px 0px rgba(0,0,0,0.3)';
  };
  continueBtn.onclick = async () => {
    playSound('SoundUiSelect.mp3');
    menu.remove();
    stopBackgroundMusic();
    await showIntroVideo();
    playBackgroundMusic();

    // Mark session as started, then open chronicle view
    _sessionStarted = true;
    if (typeof openChronicle === 'function') {
      openChronicle();
    }
  };
  content.appendChild(continueBtn);

  menu.appendChild(content);

  // RIGHT SIDE: Caravan image
  if (caravan) {
    const bgImg = document.createElement('img');
    bgImg.src = `${ASSET_PATH}Caravan.png`;
    bgImg.style.cssText = `
      height: 80%;
      width: auto;
      object-fit: contain;
      opacity: 0.9;
    `;
    menu.appendChild(bgImg);
  }

  document.body.appendChild(menu);
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
// GAME SCREEN - SIMPLE (No persistent UI)
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


// ════════════════════════════════════════════════════════════════════════════
// EVENT 1: BREAKING TREATY - DIALOGUE RPG STYLE
// ════════════════════════════════════════════════════════════════════════════

async function game_breakingTreaty(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

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
    // Clear screen
    screen.innerHTML = '';

    if (dialogueIndex >= dialogues.length) {
      endGame();
      return;
    }

    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
      position: absolute;
      inset: 0;
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

  const bgImg = await preloadImage('SilverStream.png');

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  screen.appendChild(canvas);

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
  const handleKeyDown = (e) => {
    keys[e.key.toLowerCase()] = true;
    if (['arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
  };
  const handleKeyUp = (e) => {
    keys[e.key.toLowerCase()] = false;
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

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

  // Cleanup on game end
  const endGameOriginal = endGame;
  endGame = () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    endGameOriginal();
  };

  update();
}

// ════════════════════════════════════════════════════════════════════════════
// CLICKER GAMES (Events 3-8)
// ════════════════════════════════════════════════════════════════════════════

async function createClickerGame(eventId, name, requiredClicks, bgImage) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

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
      z-index: 1;
    `;
    screen.appendChild(bg);
  }

  const game = {
    clicks: 0,
    needed: requiredClicks,
    cooldown: 0
  };

  // Create wrapper for card
  const cardWrapper = document.createElement('div');
  cardWrapper.style.cssText = `
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  `;
  screen.appendChild(cardWrapper);

  function render() {
    // Remove old content
    const oldCard = cardWrapper.querySelector('[data-card]');
    if (oldCard) oldCard.remove();

    const card = document.createElement('div');
    card.setAttribute('data-card', 'true');
    card.style.cssText = `
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
    cardWrapper.appendChild(card);

    // Update cooldown
    if (game.cooldown > 0) {
      game.cooldown -= 0.016;
      setTimeout(render, 16);
    }
  }

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 3: BURNING ELOWEN - DESTRUCTION RUSH
// ════════════════════════════════════════════════════════════════════════════

async function game_burningElowen(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await preloadImage('Battlefield.png');

  const game = {
    depots: [
      { x: window.innerWidth * 0.2, y: window.innerHeight * 0.3, health: 100, maxHealth: 100, destroyed: false },
      { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, health: 100, maxHealth: 100, destroyed: false },
      { x: window.innerWidth * 0.8, y: window.innerHeight * 0.35, health: 100, maxHealth: 100, destroyed: false }
    ],
    time: 45,
    destroyed_count: 0,
    active: true
  };

  function render() {
    screen.innerHTML = '';

    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = `${ASSET_PATH}Battlefield.png`;
      bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.3;`;
      screen.appendChild(bg);
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `position: absolute; inset: 0; background: rgba(0,0,0,0.4);`;
    screen.appendChild(overlay);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
    `;
    header.innerHTML = `
      <div style="color: white; font-family: ${FONT}; font-size: 24px; font-weight: 700;">🔥 BURNING ELOWEN</div>
      <div style="color: #FFD700; font-family: ${FONT}; font-size: 20px; font-weight: 700;">⏱ ${game.time}s</div>
    `;
    screen.appendChild(header);

    // Depots
    game.depots.forEach((depot, idx) => {
      if (!depot.destroyed) {
        const depotEl = document.createElement('div');
        depotEl.style.cssText = `
          position: absolute;
          left: ${depot.x}px;
          top: ${depot.y}px;
          width: 80px;
          height: 80px;
          background: rgba(255, 100, 50, 0.8);
          border: 3px solid #FF6B35;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transform: translate(-50%, -50%);
          z-index: 100;
          transition: all 0.2s;
          box-shadow: 0 0 20px rgba(255, 100, 50, 0.6);
        `;
        depotEl.innerHTML = `
          <div style="font-size: 32px;">📦</div>
          <div style="color: white; font-size: 12px; font-weight: 700; margin-top: 4px;">${Math.ceil(depot.health)}%</div>
        `;

        depotEl.onmouseover = () => {
          depotEl.style.transform = 'translate(-50%, -50%) scale(1.1)';
          depotEl.style.boxShadow = '0 0 30px rgba(255, 100, 50, 0.9)';
        };
        depotEl.onmouseout = () => {
          depotEl.style.transform = 'translate(-50%, -50%)';
          depotEl.style.boxShadow = '0 0 20px rgba(255, 100, 50, 0.6)';
        };

        depotEl.onclick = () => {
          playSound('SoundUiSelect.mp3');
          depot.health -= 25;
          if (depot.health <= 0) {
            depot.destroyed = true;
            game.destroyed_count++;
            playSound('SoundWin.mp3');
          }
          render();
        };

        screen.appendChild(depotEl);
      }
    });

    // Center message
    const message = document.createElement('div');
    message.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: white;
      font-family: ${FONT};
      z-index: 5;
    `;

    if (game.destroyed_count === 3) {
      message.innerHTML = `
        <div style="font-size: 48px; font-weight: 900; color: #FFD700; text-shadow: 2px 2px 4px #000;">VICTORY!</div>
        <div style="font-size: 16px; margin-top: 10px;">All depots destroyed!</div>
      `;
    } else {
      message.innerHTML = `
        <div style="font-size: 20px;">🔥 Destroyed: ${game.destroyed_count}/3</div>
      `;
    }
    screen.appendChild(message);
  }

  // Game loop
  const timerInterval = setInterval(() => {
    if (!game.active) {
      clearInterval(timerInterval);
      return;
    }

    game.time--;
    render();

    if (game.time <= 0) {
      game.active = false;
      clearInterval(timerInterval);

      if (game.destroyed_count >= 3) {
        playSound('SoundWin.mp3');
        screen.remove();
        markEventComplete(eventId, 50);
        toast('✓ All depots burned!', 'success');
      } else {
        playSound('SoundFail.mp3');
        screen.remove();
        toast('✗ Time expired', 'error');
      }
    }
  }, 1000);

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 4: TIMBER ROADS - TACTICAL AMBUSH
// ════════════════════════════════════════════════════════════════════════════

async function game_timberRoads(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await preloadImage('TheCanals.png');

  const game = {
    round: 0,
    maxRounds: 5,
    successCount: 0,
    morale: 100,
    active: true
  };

  function render() {
    screen.innerHTML = '';

    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = `${ASSET_PATH}TheCanals.png`;
      bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.2;`;
      screen.appendChild(bg);
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `position: absolute; inset: 0; background: rgba(0,0,0,0.5);`;
    screen.appendChild(overlay);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 30px;
      left: 0;
      right: 0;
      text-align: center;
      color: white;
      font-family: ${FONT};
      z-index: 10;
    `;
    header.innerHTML = `
      <div style="font-size: 28px; font-weight: 700;">⚔ TIMBER ROADS AMBUSH</div>
      <div style="font-size: 14px; margin-top: 5px; color: rgba(255,255,255,0.8);">Round ${game.round + 1} of ${game.maxRounds}</div>
    `;
    screen.appendChild(header);

    // Stats
    const stats = document.createElement('div');
    stats.style.cssText = `
      position: absolute;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      z-index: 10;
    `;
    stats.innerHTML = `
      <div style="background: rgba(0,0,0,0.6); border: 2px solid #FFD700; padding: 10px 15px; border-radius: 4px; color: #FFD700; font-family: ${FONT}; font-weight: 700;">
        Hits: ${game.successCount}/3
      </div>
      <div style="background: rgba(0,0,0,0.6); border: 2px solid #FFD700; padding: 10px 15px; border-radius: 4px; color: #FFD700; font-family: ${FONT}; font-weight: 700;">
        Morale: ${game.morale}%
      </div>
    `;
    screen.appendChild(stats);

    // Choice UI
    const choiceArea = document.createElement('div');
    choiceArea.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 10;
    `;

    const prompt = document.createElement('div');
    prompt.style.cssText = `
      color: white;
      font-family: ${FONT};
      font-size: 18px;
      margin-bottom: 30px;
    `;
    prompt.textContent = 'Enemy position: ?';
    choiceArea.appendChild(prompt);

    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      max-width: 600px;
    `;

    const positions = ['Left', 'Center', 'Right'];
    const correctPos = Math.floor(Math.random() * 3);

    positions.forEach((pos, idx) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        padding: 20px;
        background: ${idx === 0 ? '#FF6B35' : idx === 1 ? '#4ade80' : '#2563eb'};
        color: white;
        border: 3px solid white;
        border-radius: 8px;
        font-family: ${FONT};
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      `;
      btn.textContent = pos;

      btn.onmouseover = () => {
        btn.style.transform = 'scale(1.05)';
      };
      btn.onmouseout = () => {
        btn.style.transform = 'scale(1)';
      };

      btn.onclick = () => {
        playSound('SoundUiSelect.mp3');
        game.round++;

        if (idx === correctPos) {
          game.successCount++;
          playSound('SoundWin.mp3');
        } else {
          game.morale -= 20;
          playSound('SoundFail.mp3');
        }

        if (game.round >= game.maxRounds) {
          game.active = false;
          endGame();
        } else {
          render();
        }
      };

      buttons.appendChild(btn);
    });

    choiceArea.appendChild(buttons);
    screen.appendChild(choiceArea);
  }

  function endGame() {
    playSound('SoundWin.mp3');
    screen.remove();

    if (game.successCount >= 3) {
      markEventComplete(eventId, 50);
      toast('✓ Ambush successful!', 'success');
    } else {
      toast('✗ Ambush failed', 'error');
    }
  }

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 5: DEFENSE OF VASTILLY - TOWER DEFENSE
// ════════════════════════════════════════════════════════════════════════════

async function game_vastillyDefense(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await preloadImage('Battlefield.png');
  const w = window.innerWidth;
  const h = window.innerHeight;

  const game = {
    towers: [],
    enemies: [],
    wave: 1,
    maxWaves: 5,
    gold: 200,
    health: 100,
    active: true,
    waveActive: false,
    time: 0
  };

  // Tower positions
  const towerSpots = [
    { x: w * 0.2, y: h * 0.3 },
    { x: w * 0.5, y: h * 0.2 },
    { x: w * 0.8, y: h * 0.3 },
    { x: w * 0.3, y: h * 0.6 },
    { x: w * 0.7, y: h * 0.6 }
  ];

  function render() {
    screen.innerHTML = '';

    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = `${ASSET_PATH}Battlefield.png`;
      bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.2;`;
      screen.appendChild(bg);
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `position: absolute; inset: 0; background: rgba(0,0,0,0.5);`;
    screen.appendChild(overlay);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      z-index: 10;
      font-family: ${FONT};
      color: white;
    `;
    header.innerHTML = `
      <div><div style="font-size: 18px;">🏰 VASTILLY DEFENSE</div><div style="font-size: 12px; color: #FFD700;">Wave ${game.wave}/${game.maxWaves}</div></div>
      <div><div style="font-size: 14px;">❤ Health: ${game.health}</div><div style="font-size: 14px;">💰 Gold: ${game.gold}</div></div>
    `;
    screen.appendChild(header);

    // Tower spots
    towerSpots.forEach((spot, idx) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        position: absolute;
        left: ${spot.x}px;
        top: ${spot.y}px;
        width: 50px;
        height: 50px;
        transform: translate(-50%, -50%);
        background: ${game.towers[idx] ? '#FFD700' : 'rgba(255,255,255,0.2)'};
        border: 2px solid white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 24px;
        transition: all 0.2s;
        z-index: 100;
      `;
      btn.textContent = game.towers[idx] ? '🏹' : '+';

      if (!game.towers[idx] && game.gold >= 100) {
        btn.onclick = () => {
          playSound('SoundUiSelect.mp3');
          game.towers[idx] = true;
          game.gold -= 100;
          render();
        };
        btn.onmouseover = () => btn.style.background = 'rgba(255,215,0,0.5)';
        btn.onmouseout = () => btn.style.background = 'rgba(255,255,255,0.2)';
      }

      screen.appendChild(btn);
    });

    // Start wave button
    if (!game.waveActive && game.active) {
      const startBtn = document.createElement('button');
      startBtn.style.cssText = `
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 40px;
        background: #4ade80;
        color: black;
        border: 3px solid black;
        border-radius: 4px;
        font-family: ${FONT};
        font-weight: 700;
        cursor: pointer;
        z-index: 10;
      `;
      startBtn.textContent = `START WAVE ${game.wave}`;
      startBtn.onclick = () => {
        playSound('SoundPlay.mp3');
        game.waveActive = true;
        startWave();
      };
      screen.appendChild(startBtn);
    }
  }

  function startWave() {
    playSound('SoundPlay.mp3');

    const waveInterval = setInterval(() => {
      game.time++;

      if (game.time > 8) {
        clearInterval(waveInterval);
        game.waveActive = false;
        game.wave++;

        if (game.wave > game.maxWaves) {
          game.active = false;
          playSound('SoundWin.mp3');
          screen.remove();
          markEventComplete(eventId, 60);
          toast('✓ Vastilly defended!', 'success');
        } else {
          game.time = 0;
          render();
        }
      }
    }, 1000);
  }

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 6: FENWICK CANAL - WATER PUZZLE
// ════════════════════════════════════════════════════════════════════════════

async function game_fenwckCanal(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await preloadImage('TheCanals.png');

  const game = {
    gates: [
      { x: 0, y: 0, open: false },
      { x: 1, y: 0, open: false },
      { x: 2, y: 0, open: false },
      { x: 0, y: 1, open: false },
      { x: 1, y: 1, open: false },
      { x: 2, y: 1, open: false }
    ],
    enemies_destroyed: 0,
    max_enemies: 6,
    time: 60,
    active: true
  };

  function render() {
    screen.innerHTML = '';

    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = `${ASSET_PATH}TheCanals.png`;
      bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.3;`;
      screen.appendChild(bg);
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `position: absolute; inset: 0; background: rgba(0,0,0,0.5);`;
    screen.appendChild(overlay);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 30px;
      left: 0;
      right: 0;
      text-align: center;
      font-family: ${FONT};
      color: white;
      z-index: 10;
    `;
    header.innerHTML = `
      <div style="font-size: 24px; font-weight: 700;">💧 FENWICK CANAL</div>
      <div style="font-size: 14px; margin-top: 5px;">Destroyed: ${game.enemies_destroyed}/${game.max_enemies} | Time: ${game.time}s</div>
    `;
    screen.appendChild(header);

    // Grid of gates
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: grid;
      grid-template-columns: repeat(3, 100px);
      gap: 15px;
      z-index: 10;
    `;

    game.gates.forEach((gate, idx) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100px;
        height: 100px;
        background: ${gate.open ? '#4ade80' : '#FF6B35'};
        border: 3px solid white;
        border-radius: 8px;
        font-size: 32px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      `;
      btn.textContent = gate.open ? '💧' : '🚪';

      btn.onmouseover = () => {
        btn.style.transform = 'scale(1.05)';
      };
      btn.onmouseout = () => {
        btn.style.transform = 'scale(1)';
      };

      btn.onclick = () => {
        playSound('SoundUiSelect.mp3');
        gate.open = !gate.open;
        if (gate.open) {
          game.enemies_destroyed++;
          playSound('SoundWin.mp3');
        }
        render();
      };

      gridContainer.appendChild(btn);
    });

    screen.appendChild(gridContainer);
  }

  const timerInterval = setInterval(() => {
    if (!game.active) {
      clearInterval(timerInterval);
      return;
    }

    game.time--;
    render();

    if (game.time <= 0 || game.enemies_destroyed >= game.max_enemies) {
      game.active = false;
      clearInterval(timerInterval);

      if (game.enemies_destroyed >= game.max_enemies) {
        playSound('SoundWin.mp3');
        screen.remove();
        markEventComplete(eventId, 55);
        toast('✓ Canal flooded successfully!', 'success');
      } else {
        playSound('SoundFail.mp3');
        screen.remove();
        toast('✗ Time expired', 'error');
      }
    }
  }, 1000);

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 7: IRONSTALL - NEGOTIATIONS
// ════════════════════════════════════════════════════════════════════════════

async function game_ironstall(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const dialogues = [
    {
      character: 'Master Blacksmith Ironhearth',
      text: 'Welcome to Ironstall, warrior. The forges burn hot with the fires of war. What brings you to my forge?',
      image: 'Wealthplace.png'
    },
    {
      character: 'Master Blacksmith Ironhearth',
      text: 'I can furnish your army with the finest weapons and armor... if you\'ve the coin and conviction.',
      image: 'Wealthplace.png'
    },
    {
      character: 'Master Blacksmith Ironhearth',
      text: 'Choose wisely, knight. These contracts will shape the course of war.',
      image: 'Wealthplace.png'
    }
  ];

  let dialogueIndex = 0;
  let success = false;

  function render() {
    screen.innerHTML = '';

    if (dialogueIndex >= dialogues.length) {
      endGame();
      return;
    }

    const contentArea = document.createElement('div');
    contentArea.style.cssText = `position: absolute; inset: 0; overflow: hidden;`;

    const bg = document.createElement('img');
    bg.src = `${ASSET_PATH}CouncilChamber.png`;
    bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.4;`;
    contentArea.appendChild(bg);

    const overlay = document.createElement('div');
    overlay.style.cssText = `position: absolute; inset: 0; background: rgba(0, 0, 0, 0.3);`;
    contentArea.appendChild(overlay);

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
      font-family: ${FONT};
    `;
    characterName.textContent = dialogues[dialogueIndex].character;
    textBox.appendChild(characterName);

    const dialogueText = document.createElement('div');
    dialogueText.style.cssText = `
      font-size: 16px;
      line-height: 1.8;
      color: white;
      animation: fadeIn 0.5s ease-in;
      font-family: ${FONT};
    `;
    dialogueText.textContent = dialogues[dialogueIndex].text;
    textBox.appendChild(dialogueText);

    dialogueBox.appendChild(textBox);
    contentArea.appendChild(dialogueBox);

    // Choices on last dialogue
    if (dialogueIndex === 2) {
      const choicesContainer = document.createElement('div');
      choicesContainer.style.cssText = `
        position: absolute;
        bottom: 250px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 15px;
        z-index: 10;
      `;

      const aggressiveBtn = document.createElement('button');
      aggressiveBtn.style.cssText = `
        padding: 12px 24px;
        background: #FF6B35;
        color: white;
        border: 3px solid white;
        border-radius: 4px;
        font-family: ${FONT};
        font-weight: 700;
        cursor: pointer;
      `;
      aggressiveBtn.textContent = 'Aggressive Deal';
      aggressiveBtn.onclick = () => {
        playSound('SoundUiSelect.mp3');
        success = true;
        dialogueIndex++;
        render();
      };
      choicesContainer.appendChild(aggressiveBtn);

      const diplomaticBtn = document.createElement('button');
      diplomaticBtn.style.cssText = `
        padding: 12px 24px;
        background: #4ade80;
        color: black;
        border: 3px solid white;
        border-radius: 4px;
        font-family: ${FONT};
        font-weight: 700;
        cursor: pointer;
      `;
      diplomaticBtn.textContent = 'Diplomatic Deal';
      diplomaticBtn.onclick = () => {
        playSound('SoundUiSelect.mp3');
        success = true;
        dialogueIndex++;
        render();
      };
      choicesContainer.appendChild(diplomaticBtn);

      contentArea.appendChild(choicesContainer);
    } else {
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
        z-index: 10;
      `;
      continueBtn.textContent = 'Continue →';
      continueBtn.onclick = () => {
        playSound('SoundUiSelect.mp3');
        dialogueIndex++;
        render();
      };
      contentArea.appendChild(continueBtn);
    }

    screen.appendChild(contentArea);
  }

  function endGame() {
    playSound('SoundWin.mp3');
    screen.remove();
    if (success) {
      markEventComplete(eventId, 60);
      toast('✓ Contract signed!', 'success');
    }
  }

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 8: GLASSPORT BLOCKADE - NAVAL INTERCEPTION
// ════════════════════════════════════════════════════════════════════════════

async function game_glassportBlockade(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await preloadImage('GlassportHarbour.png');
  const w = window.innerWidth;
  const h = window.innerHeight;

  const game = {
    shipY: h / 2,
    enemies: [],
    intercepted: 0,
    maxEnemies: 8,
    time: 45,
    active: true
  };

  // Spawn enemies
  for (let i = 0; i < 8; i++) {
    game.enemies.push({
      x: Math.random() * (w - 100),
      y: Math.random() * (h - 100),
      escaped: false
    });
  }

  function render() {
    screen.innerHTML = '';

    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = `${ASSET_PATH}GlassportHarbour.png`;
      bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.2;`;
      screen.appendChild(bg);
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `position: absolute; inset: 0; background: rgba(0,0,0,0.5);`;
    screen.appendChild(overlay);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      font-family: ${FONT};
      color: white;
      z-index: 10;
    `;
    header.innerHTML = `
      <div style="font-size: 20px; font-weight: 700;">⚓ GLASSPORT BLOCKADE</div>
      <div>
        <div style="font-size: 14px;">🚢 Intercepted: ${game.intercepted}/${game.maxEnemies}</div>
        <div style="font-size: 14px; margin-top: 5px;">⏱ ${game.time}s</div>
      </div>
    `;
    screen.appendChild(header);

    // Enemy ships
    game.enemies.forEach((enemy, idx) => {
      if (!enemy.escaped) {
        const shipBtn = document.createElement('button');
        shipBtn.style.cssText = `
          position: absolute;
          left: ${enemy.x}px;
          top: ${enemy.y}px;
          width: 60px;
          height: 40px;
          background: #FF6B35;
          border: 2px solid white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 24px;
          transition: all 0.2s;
          z-index: 100;
        `;
        shipBtn.textContent = '🚢';

        shipBtn.onmouseover = () => {
          shipBtn.style.background = '#FF8C5A';
          shipBtn.style.transform = 'scale(1.1)';
        };
        shipBtn.onmouseout = () => {
          shipBtn.style.background = '#FF6B35';
          shipBtn.style.transform = 'scale(1)';
        };

        shipBtn.onclick = () => {
          playSound('SoundUiSelect.mp3');
          enemy.escaped = true;
          game.intercepted++;
          render();
        };

        screen.appendChild(shipBtn);
      }
    });
  }

  const timerInterval = setInterval(() => {
    if (!game.active) {
      clearInterval(timerInterval);
      return;
    }

    game.time--;
    render();

    if (game.time <= 0 || game.intercepted >= game.maxEnemies) {
      game.active = false;
      clearInterval(timerInterval);

      if (game.intercepted >= 6) {
        playSound('SoundWin.mp3');
        screen.remove();
        markEventComplete(eventId, 55);
        toast('✓ Blockade successful!', 'success');
      } else {
        playSound('SoundFail.mp3');
        screen.remove();
        toast('✗ Blockade failed', 'error');
      }
    }
  }, 1000);

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 9: PORT-CREST SIEGE - FOUR-PHASE MEGA BATTLE
// ════════════════════════════════════════════════════════════════════════════

async function game_portCrestSiege(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  let currentPhase = 0;

  async function runPhase(phase) {
    return new Promise(async (resolve) => {
      if (phase === 0) {
        // Phase 1: Deploy Sea-Spikes (timing puzzle)
        const phaseScreen = createGameScreen();
        document.body.appendChild(phaseScreen);

        const phaseScreen2 = document.createElement('div');
        phaseScreen2.style.cssText = `position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10000;`;
        phaseScreen2.innerHTML = `
          <div style="text-align: center; color: white; font-family: ${FONT}; z-index: 10001;">
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 20px;">⚓ PHASE 1: The Snare</div>
            <div style="font-size: 16px; margin-bottom: 20px; max-width: 600px;">Deploy hidden sea-spikes beneath the harbor. Watch the tide...</div>
            <div id="spike-zone" style="
              width: 300px;
              height: 200px;
              border: 3px solid white;
              background: rgba(0, 100, 150, 0.5);
              margin-bottom: 20px;
              position: relative;
              border-radius: 4px;
            "></div>
            <button id="place-spike" style="
              padding: 12px 24px;
              background: #4ade80;
              color: black;
              border: 3px solid black;
              border-radius: 4px;
              font-family: ${FONT};
              font-weight: 700;
              cursor: pointer;
            ">PLACE SPIKES</button>
          </div>
        `;
        document.body.appendChild(phaseScreen2);

        let spikesPlaced = 0;
        document.getElementById('place-spike').onclick = () => {
          playSound('SoundUiSelect.mp3');
          spikesPlaced++;
          if (spikesPlaced >= 3) {
            phaseScreen2.remove();
            phaseScreen.remove();
            resolve();
          }
        };
      } else if (phase === 1) {
        // Phase 2: Watch ships run aground
        const phaseScreen2 = document.createElement('div');
        phaseScreen2.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10001;`;
        phaseScreen2.innerHTML = `
          <div style="text-align: center; color: white; font-family: ${FONT};">
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 20px;">💥 PHASE 2: The Trap</div>
            <div style="font-size: 18px; margin-bottom: 20px;">Enemy ships run aground on your spikes...</div>
            <div style="font-size: 48px; margin-bottom: 20px;">🚢 ⚓ 💥</div>
            <button id="next-phase" style="
              padding: 12px 24px;
              background: #FFD700;
              color: black;
              border: 3px solid black;
              border-radius: 4px;
              font-family: ${FONT};
              font-weight: 700;
              cursor: pointer;
            ">CONTINUE</button>
          </div>
        `;
        document.body.appendChild(phaseScreen2);

        document.getElementById('next-phase').onclick = () => {
          playSound('SoundUiSelect.mp3');
          phaseScreen2.remove();
          resolve();
        };
      } else if (phase === 2) {
        // Phase 3: Cannon barrage (rhythm clicking)
        const phaseScreen2 = document.createElement('div');
        phaseScreen2.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10001;`;
        phaseScreen2.innerHTML = `
          <div style="text-align: center; color: white; font-family: ${FONT};">
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 20px;">🔥 PHASE 3: The Kill-Zone</div>
            <div style="font-size: 14px; margin-bottom: 20px; max-width: 600px;">Click when the cannons are ready to fire!</div>
            <div id="cannon-bar" style="
              width: 300px;
              height: 30px;
              background: rgba(255,255,255,0.2);
              border: 2px solid white;
              border-radius: 4px;
              margin-bottom: 20px;
              overflow: hidden;
            ">
              <div id="cannon-fill" style="
                height: 100%;
                background: #FF6B35;
                width: 0%;
                transition: width 0.3s;
              "></div>
            </div>
            <button id="fire-cannon" style="
              padding: 12px 24px;
              background: #FF6B35;
              color: white;
              border: 3px solid white;
              border-radius: 4px;
              font-family: ${FONT};
              font-weight: 700;
              cursor: pointer;
            ">FIRE!</button>
          </div>
        `;
        document.body.appendChild(phaseScreen2);

        let hits = 0;
        let cannonReady = false;
        const barEl = document.getElementById('cannon-fill');
        const fireBtn = document.getElementById('fire-cannon');

        const barInterval = setInterval(() => {
          let width = parseInt(barEl.style.width);
          width += 5;
          if (width > 100) {
            width = 0;
            cannonReady = !cannonReady;
          }
          barEl.style.width = width + '%';
        }, 100);

        fireBtn.onclick = () => {
          if (cannonReady) {
            hits++;
            playSound('SoundWin.mp3');
            if (hits >= 3) {
              clearInterval(barInterval);
              phaseScreen2.remove();
              resolve();
            }
          } else {
            playSound('SoundFail.mp3');
          }
        };
      } else if (phase === 3) {
        // Phase 4: Boarding defense
        const phaseScreen2 = document.createElement('div');
        phaseScreen2.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10001;`;
        phaseScreen2.innerHTML = `
          <div style="text-align: center; color: white; font-family: ${FONT};">
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 20px;">⚔ PHASE 4: Boarding Defense</div>
            <div style="font-size: 14px; margin-bottom: 20px;">Defend against boarding parties! Click to parry attacks.</div>
            <div id="boarding-health" style="font-size: 16px; margin-bottom: 20px; color: #FFD700;">Health: 100</div>
            <button id="defend-btn" style="
              padding: 15px 30px;
              background: #4ade80;
              color: black;
              border: 3px solid black;
              border-radius: 4px;
              font-family: ${FONT};
              font-weight: 700;
              cursor: pointer;
              font-size: 16px;
            ">⚔ PARRY!</button>
            <button id="victory-btn" style="
              padding: 12px 24px;
              background: #FFD700;
              color: black;
              border: 3px solid black;
              border-radius: 4px;
              font-family: ${FONT};
              font-weight: 700;
              cursor: pointer;
              margin-top: 20px;
              display: none;
            ">VICTORY!</button>
          </div>
        `;
        document.body.appendChild(phaseScreen2);

        let boardingHealth = 100;
        let waves = 0;
        const defendBtn = document.getElementById('defend-btn');
        const victoryBtn = document.getElementById('victory-btn');
        const healthEl = document.getElementById('boarding-health');

        const waveInterval = setInterval(() => {
          boardingHealth -= 10;
          healthEl.innerHTML = `Health: ${Math.max(0, boardingHealth)}`;

          if (boardingHealth <= 0) {
            clearInterval(waveInterval);
            defendBtn.style.display = 'none';
            victoryBtn.style.display = 'block';
          }
        }, 1500);

        defendBtn.onclick = () => {
          playSound('SoundWin.mp3');
          boardingHealth += 5;
          healthEl.innerHTML = `Health: ${Math.min(100, boardingHealth)}`;
        };

        victoryBtn.onclick = () => {
          clearInterval(waveInterval);
          phaseScreen2.remove();
          resolve();
        };
      }
    });
  }

  // Run all phases sequentially
  await runPhase(0);
  await runPhase(1);
  await runPhase(2);
  await runPhase(3);

  screen.remove();
  playSound('SoundWin.mp3');
  markEventComplete(eventId, 100);
  toast('✓ Port-Crest conquered!', 'success');
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 10: 14-DAY BOMBARDMENT - SURVIVAL MODE
// ════════════════════════════════════════════════════════════════════════════

async function game_bombardment(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const w = window.innerWidth;
  const h = window.innerHeight;

  const game = {
    time: 90,
    hits_taken: 0,
    dodges: 0,
    maxHits: 3,
    projectiles: [],
    active: true
  };

  function spawnProjectile() {
    if (!game.active) return;
    game.projectiles.push({
      x: Math.random() * (w - 100),
      y: -50,
      health: 100
    });
  }

  function render() {
    screen.innerHTML = '';

    const bg = document.createElement('div');
    bg.style.cssText = `position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(100,0,0,0.2) 100%);`;
    screen.appendChild(bg);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      font-family: ${FONT};
      color: white;
      z-index: 10;
    `;
    header.innerHTML = `
      <div style="font-size: 20px; font-weight: 700;">💥 14-DAY BOMBARDMENT</div>
      <div>
        <div style="font-size: 14px;">❤ Health: ${Math.max(0, game.maxHits - game.hits_taken)}/3</div>
        <div style="font-size: 14px;">⏱ ${game.time}s</div>
      </div>
    `;
    screen.appendChild(header);

    // Projectiles
    game.projectiles.forEach((proj, idx) => {
      const projEl = document.createElement('div');
      projEl.style.cssText = `
        position: absolute;
        left: ${proj.x}px;
        top: ${proj.y}px;
        width: 40px;
        height: 40px;
        background: #FF4444;
        border: 2px solid white;
        border-radius: 50%;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 100;
      `;
      projEl.textContent = '💣';

      projEl.onclick = (e) => {
        e.stopPropagation();
        playSound('SoundWin.mp3');
        game.projectiles.splice(idx, 1);
        game.dodges++;
        render();
      };

      screen.appendChild(projEl);

      proj.y += 5;
      if (proj.y > h) {
        game.projectiles.splice(idx, 1);
        game.hits_taken++;
      }
    });
  }

  const spawnInterval = setInterval(() => {
    spawnProjectile();
  }, 800);

  const timerInterval = setInterval(() => {
    if (!game.active) {
      clearInterval(timerInterval);
      clearInterval(spawnInterval);
      return;
    }

    game.time--;
    render();

    if (game.hits_taken >= game.maxHits) {
      game.active = false;
      clearInterval(timerInterval);
      clearInterval(spawnInterval);

      playSound('SoundFail.mp3');
      screen.remove();
      toast('✗ Bombardment destroyed you', 'error');
    } else if (game.time <= 0) {
      game.active = false;
      clearInterval(timerInterval);
      clearInterval(spawnInterval);

      playSound('SoundWin.mp3');
      screen.remove();
      markEventComplete(eventId, 70);
      toast('✓ Survived the bombardment!', 'success');
    }
  }, 1000);

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 11: HARBOUR OF WRECKS - SALVAGE RUSH
// ════════════════════════════════════════════════════════════════════════════

async function game_harbourWrecks(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const w = window.innerWidth;
  const h = window.innerHeight;

  const game = {
    wreckage: [],
    collected: 0,
    maxCollect: 10,
    time: 60,
    active: true
  };

  // Spawn wreckage
  for (let i = 0; i < 15; i++) {
    game.wreckage.push({
      x: Math.random() * (w - 60),
      y: Math.random() * (h - 60),
      collected: false
    });
  }

  function render() {
    screen.innerHTML = '';

    const bg = document.createElement('div');
    bg.style.cssText = `position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,50,100,0.5) 0%, rgba(50,100,150,0.3) 100%);`;
    screen.appendChild(bg);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      font-family: ${FONT};
      color: white;
      z-index: 10;
    `;
    header.innerHTML = `
      <div style="font-size: 20px; font-weight: 700;">🪵 HARBOUR OF WRECKS</div>
      <div>
        <div style="font-size: 14px;">Salvaged: ${game.collected}/${game.maxCollect}</div>
        <div style="font-size: 14px;">⏱ ${game.time}s</div>
      </div>
    `;
    screen.appendChild(header);

    // Wreckage pieces
    game.wreckage.forEach((wreck, idx) => {
      if (!wreck.collected) {
        const wreckEl = document.createElement('button');
        wreckEl.style.cssText = `
          position: absolute;
          left: ${wreck.x}px;
          top: ${wreck.y}px;
          width: 50px;
          height: 50px;
          background: #8B7355;
          border: 2px solid #654321;
          border-radius: 4px;
          font-size: 20px;
          cursor: pointer;
          z-index: 100;
          transition: all 0.2s;
        `;
        wreckEl.textContent = '🪵';

        wreckEl.onmouseover = () => {
          wreckEl.style.transform = 'scale(1.1)';
        };
        wreckEl.onmouseout = () => {
          wreckEl.style.transform = 'scale(1)';
        };

        wreckEl.onclick = () => {
          playSound('SoundUiSelect.mp3');
          wreck.collected = true;
          game.collected++;
          render();
        };

        screen.appendChild(wreckEl);
      }
    });
  }

  const timerInterval = setInterval(() => {
    if (!game.active) {
      clearInterval(timerInterval);
      return;
    }

    game.time--;
    render();

    if (game.time <= 0 || game.collected >= game.maxCollect) {
      game.active = false;
      clearInterval(timerInterval);

      if (game.collected >= game.maxCollect) {
        playSound('SoundWin.mp3');
        screen.remove();
        markEventComplete(eventId, 65);
        toast('✓ Harbour salvaged!', 'success');
      } else {
        playSound('SoundFail.mp3');
        screen.remove();
        toast('✗ Time expired', 'error');
      }
    }
  }, 1000);

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 12: PUSH INTO OAKHAVEN - RTS LITE
// ════════════════════════════════════════════════════════════════════════════

async function game_pushOakhaven(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const w = window.innerWidth;
  const h = window.innerHeight;

  const game = {
    units: [
      { x: w * 0.1, y: h * 0.5, selected: false },
      { x: w * 0.2, y: h * 0.4, selected: false },
      { x: w * 0.15, y: h * 0.6, selected: false }
    ],
    objectives: [
      { x: w * 0.7, y: h * 0.3, captured: false },
      { x: w * 0.8, y: h * 0.6, captured: false },
      { x: w * 0.85, y: h * 0.45, captured: false }
    ],
    time: 120,
    active: true
  };

  function render() {
    screen.innerHTML = '';

    const bg = document.createElement('div');
    bg.style.cssText = `position: absolute; inset: 0; background: linear-gradient(135deg, rgba(34,139,34,0.3) 0%, rgba(139,69,19,0.3) 100%);`;
    screen.appendChild(bg);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      font-family: ${FONT};
      color: white;
      z-index: 10;
    `;
    header.innerHTML = `
      <div style="font-size: 20px; font-weight: 700;">🗺 PUSH INTO OAKHAVEN</div>
      <div>
        <div style="font-size: 14px;">Captured: ${game.objectives.filter(o => o.captured).length}/3</div>
        <div style="font-size: 14px;">⏱ ${game.time}s</div>
      </div>
    `;
    screen.appendChild(header);

    // Units
    game.units.forEach((unit, idx) => {
      const unitEl = document.createElement('button');
      unitEl.style.cssText = `
        position: absolute;
        left: ${unit.x}px;
        top: ${unit.y}px;
        width: 40px;
        height: 40px;
        background: ${unit.selected ? '#4ade80' : '#2563eb'};
        border: 2px solid white;
        border-radius: 4px;
        font-size: 18px;
        cursor: pointer;
        z-index: 100;
      `;
      unitEl.textContent = '🛡';

      unitEl.onclick = () => {
        playSound('SoundUiSelect.mp3');
        unit.selected = !unit.selected;
        render();
      };

      screen.appendChild(unitEl);
    });

    // Objectives
    game.objectives.forEach((obj, idx) => {
      const objEl = document.createElement('button');
      objEl.style.cssText = `
        position: absolute;
        left: ${obj.x}px;
        top: ${obj.y}px;
        width: 50px;
        height: 50px;
        background: ${obj.captured ? '#4ade80' : '#FF6B35'};
        border: 3px solid white;
        border-radius: 4px;
        font-size: 20px;
        cursor: pointer;
        z-index: 99;
      `;
      objEl.textContent = obj.captured ? '✓' : '⚔';

      objEl.onclick = () => {
        playSound('SoundUiSelect.mp3');
        const hasUnits = game.units.some(u => u.selected);
        if (hasUnits) {
          obj.captured = true;
          game.units.forEach(u => u.selected = false);
          render();
        }
      };

      screen.appendChild(objEl);
    });
  }

  const timerInterval = setInterval(() => {
    if (!game.active) {
      clearInterval(timerInterval);
      return;
    }

    game.time--;
    render();

    if (game.objectives.every(o => o.captured)) {
      game.active = false;
      clearInterval(timerInterval);

      playSound('SoundWin.mp3');
      screen.remove();
      markEventComplete(eventId, 80);
      toast('✓ Oakhaven territory claimed!', 'success');
    } else if (game.time <= 0) {
      game.active = false;
      clearInterval(timerInterval);

      playSound('SoundFail.mp3');
      screen.remove();
      toast('✗ Time expired', 'error');
    }
  }, 1000);

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 13: FALL OF ELOWEN - SIEGE FINALE
// ════════════════════════════════════════════════════════════════════════════

async function game_fallElowen(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const w = window.innerWidth;
  const h = window.innerHeight;

  const game = {
    wallHealth: 100,
    breached: false,
    zones: [
      { captured: false, health: 50 },
      { captured: false, health: 50 },
      { captured: false, health: 50 },
      { captured: false, health: 50 },
      { captured: false, health: 50 }
    ],
    time: 180,
    active: true,
    phase: 'breach'
  };

  function render() {
    screen.innerHTML = '';

    const bg = document.createElement('div');
    bg.style.cssText = `position: absolute; inset: 0; background: linear-gradient(135deg, rgba(100,50,0,0.4) 0%, rgba(50,25,0,0.4) 100%);`;
    screen.appendChild(bg);

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      font-family: ${FONT};
      color: white;
      z-index: 10;
    `;

    if (game.phase === 'breach') {
      header.innerHTML = `
        <div style="font-size: 20px; font-weight: 700;">🏰 FALL OF ELOWEN - BREACH WALLS</div>
        <div>
          <div style="font-size: 14px;">Wall Health: ${game.wallHealth}/100</div>
          <div style="font-size: 14px;">⏱ ${game.time}s</div>
        </div>
      `;
    } else {
      header.innerHTML = `
        <div style="font-size: 20px; font-weight: 700;">🏰 FALL OF ELOWEN - CONQUER CITY</div>
        <div>
          <div style="font-size: 14px;">Zones: ${game.zones.filter(z => z.captured).length}/5</div>
          <div style="font-size: 14px;">⏱ ${game.time}s</div>
        </div>
      `;
    }
    screen.appendChild(header);

    if (game.phase === 'breach') {
      // Wall with weak points
      const wallEl = document.createElement('div');
      wallEl.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 300px;
        height: 150px;
        background: #8B7355;
        border: 5px solid #654321;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5;
      `;

      for (let i = 0; i < 3; i++) {
        const weakPoint = document.createElement('button');
        weakPoint.style.cssText = `
          width: 60px;
          height: 60px;
          background: #FF6B35;
          border: 2px solid white;
          border-radius: 4px;
          margin: 10px;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.2s;
        `;
        weakPoint.textContent = '⚒';

        weakPoint.onclick = () => {
          playSound('SoundUiSelect.mp3');
          game.wallHealth -= 30;
          if (game.wallHealth <= 0) {
            game.phase = 'conquer';
            playSound('SoundWin.mp3');
            render();
          } else {
            render();
          }
        };

        wallEl.appendChild(weakPoint);
      }

      screen.appendChild(wallEl);
    } else {
      // City zones to conquer
      const zonesContainer = document.createElement('div');
      zonesContainer.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: grid;
        grid-template-columns: repeat(5, 80px);
        gap: 10px;
        z-index: 10;
      `;

      game.zones.forEach((zone, idx) => {
        const zoneEl = document.createElement('button');
        zoneEl.style.cssText = `
          width: 80px;
          height: 80px;
          background: ${zone.captured ? '#4ade80' : '#FF8C5A'};
          border: 3px solid white;
          border-radius: 4px;
          font-size: 32px;
          cursor: pointer;
          transition: all 0.2s;
        `;
        zoneEl.textContent = zone.captured ? '✓' : '🏙';

        zoneEl.onmouseover = () => {
          zoneEl.style.transform = 'scale(1.05)';
        };
        zoneEl.onmouseout = () => {
          zoneEl.style.transform = 'scale(1)';
        };

        zoneEl.onclick = () => {
          playSound('SoundUiSelect.mp3');
          zone.captured = true;
          render();
        };

        zonesContainer.appendChild(zoneEl);
      });

      screen.appendChild(zonesContainer);
    }
  }

  const timerInterval = setInterval(() => {
    if (!game.active) {
      clearInterval(timerInterval);
      return;
    }

    game.time--;
    render();

    if (game.phase === 'conquer' && game.zones.every(z => z.captured)) {
      game.active = false;
      clearInterval(timerInterval);

      playSound('SoundWin.mp3');
      screen.remove();
      markEventComplete(eventId, 150);
      toast('✓ ELOWEN FALLS! Chapter 1 Complete!', 'success');
    } else if (game.time <= 0) {
      game.active = false;
      clearInterval(timerInterval);

      playSound('SoundFail.mp3');
      screen.remove();
      toast('✗ Mission failed', 'error');
    }
  }, 1000);

  render();
}

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
