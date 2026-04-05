/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - COMPLETE GAME SYSTEM v3
 * ═══════════════════════════════════════════════════════════════════════════════
 * Proper asset loading, menu system, audio, and dialogues
 */

const ASSET_PATH = '/app/Chronicle/chapter1/assets/';
let _backgroundMusic = null;
let _gameMenuShown = false;

// ════════════════════════════════════════════════════════════════════════════
// BACKGROUND MUSIC SYSTEM
// ════════════════════════════════════════════════════════════════════════════

function initBackgroundMusic() {
  if (_backgroundMusic) return;
  _backgroundMusic = new Audio(`${ASSET_PATH}Chapter 1 Theme Song.mp3`);
  _backgroundMusic.loop = true;
  _backgroundMusic.volume = 0.3;
}

function playBackgroundMusic() {
  initBackgroundMusic();
  _backgroundMusic.play().catch(() => {});
}

function stopBackgroundMusic() {
  if (_backgroundMusic) {
    _backgroundMusic.pause();
    _backgroundMusic.currentTime = 0;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// AUDIO SYSTEM
// ════════════════════════════════════════════════════════════════════════════

const audioCache = {};
function playSound(filename) {
  if (!audioCache[filename]) {
    const audio = new Audio(`${ASSET_PATH}${filename}`);
    audio.volume = 0.4;
    audioCache[filename] = audio;
  }
  audioCache[filename].currentTime = 0;
  audioCache[filename].play().catch(() => {});
}

// ════════════════════════════════════════════════════════════════════════════
// IMAGE PRELOADER
// ════════════════════════════════════════════════════════════════════════════

const imageCache = {};
function loadImage(filename) {
  return new Promise((resolve) => {
    if (imageCache[filename]) {
      resolve(imageCache[filename]);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageCache[filename] = img;
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to load image: ${filename}`);
      resolve(null);
    };
    img.src = `${ASSET_PATH}${filename}`;
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN GAME LAUNCHER
// ════════════════════════════════════════════════════════════════════════════

function launchChronicleMinigame(eventId) {
  console.log('🎮 Game launch:', eventId);

  if (!_gameMenuShown) {
    showGameMenu(eventId);
    return;
  }

  if (typeof canPlayGame === 'function' && !canPlayGame()) {
    return;
  }

  playSound('SoundPlay.mp3');
  playBackgroundMusic();

  switch(eventId) {
    case 1: return game_breakingTreaty();
    case 2: return game_raidSilverStream();
    case 3: return game_burningElowen();
    case 4: return game_timberRoads();
    case 5: return game_combatBattle();
    case 6: return game_fenwckCanal();
    case 7: return game_ironstall();
    case 8: return game_glassportBlockade();
    default: return game_generic(eventId);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GAME MENU SCREEN
// ════════════════════════════════════════════════════════════════════════════

async function showGameMenu(nextEventId) {
  playBackgroundMusic();

  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: white; z-index: 10000; display: flex;
    flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Comic Sans MS', sans-serif; overflow: hidden;
    border: 4px solid #000;
  `;

  // Load assets
  const [titleImg, caravanImg, joyImg] = await Promise.all([
    loadImage('Chap1Title.png'),
    loadImage('Caravan.png'),
    loadImage('Grand Joy Games.png')
  ]);

  // Background caravan illustration
  if (caravanImg) {
    const bgImg = document.createElement('img');
    bgImg.src = caravanImg.src;
    bgImg.style.cssText = `
      position: absolute; bottom: 0; right: 0; height: 60%;
      object-fit: contain; opacity: 0.7;
    `;
    menu.appendChild(bgImg);
  }

  // Content container
  const content = document.createElement('div');
  content.style.cssText = `
    position: relative; z-index: 10; text-align: center;
    display: flex; flex-direction: column; gap: 30px; align-items: center;
  `;

  // Logo
  if (joyImg) {
    const logo = document.createElement('img');
    logo.src = joyImg.src;
    logo.style.cssText = `height: 80px; width: auto; margin-bottom: 20px;`;
    content.appendChild(logo);
  }

  // Title
  if (titleImg) {
    const title = document.createElement('img');
    title.src = titleImg.src;
    title.style.cssText = `height: 120px; width: auto; max-width: 90vw;`;
    content.appendChild(title);
  } else {
    const title = document.createElement('h1');
    title.textContent = 'CHAPTER 1: ASHES OF THE SILVER TREATY';
    title.style.cssText = `
      font-size: 32px; font-weight: 900; margin: 0;
      text-transform: uppercase; letter-spacing: 2px; color: #000;
    `;
    content.appendChild(title);
  }

  // Continue button
  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #000; color: white; border: 3px solid #000;
    padding: 16px 48px; font-size: 18px; font-weight: 700;
    cursor: pointer; font-family: 'Comic Sans MS', sans-serif;
    border-radius: 0; text-transform: uppercase; letter-spacing: 1px;
    transition: all 0.2s;
  `;
  btn.textContent = 'Continue Game';
  btn.onmouseover = () => btn.style.background = '#333';
  btn.onmouseout = () => btn.style.background = '#000';
  btn.onclick = async () => {
    playSound('SoundUiSelect.mp3');
    menu.remove();
    _gameMenuShown = true;

    // Show intro video
    await showIntroVideo();

    // Launch the actual game
    launchChronicleMinigame(nextEventId);
  };
  content.appendChild(btn);

  menu.appendChild(content);
  document.body.appendChild(menu);
}

// ════════════════════════════════════════════════════════════════════════════
// INTRO VIDEO
// ════════════════════════════════════════════════════════════════════════════

async function showIntroVideo() {
  return new Promise((resolve) => {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: #000; z-index: 10000; display: flex;
      align-items: center; justify-content: center;
    `;

    const video = document.createElement('video');
    video.src = `${ASSET_PATH}FTZchap1-Intro.mp4`;
    video.style.cssText = `
      width: 100%; height: 100%; object-fit: cover;
    `;
    video.autoplay = true;
    video.onended = () => {
      screen.remove();
      resolve();
    };

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.style.cssText = `
      position: absolute; top: 20px; right: 20px;
      background: white; color: #000; border: 2px solid white;
      padding: 10px 20px; font-weight: 700; cursor: pointer;
      font-family: 'Comic Sans MS', sans-serif; z-index: 10001;
      border-radius: 0;
    `;
    skipBtn.textContent = 'SKIP';
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
// SHARED UI UTILITIES
// ════════════════════════════════════════════════════════════════════════════

function createGameScreen() {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: white; z-index: 9999; font-family: 'Comic Sans MS', sans-serif;
    overflow: hidden; border: 4px solid #000;
  `;
  return screen;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 1: BREAKING OF THE TREATY - Dialogue
// ════════════════════════════════════════════════════════════════════════════

async function game_breakingTreaty() {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await loadImage('CouncilChamber.png');
  const npcImg = await loadImage('Wealthplace.png');

  const dialogues = [
    { text: 'The treaty is broken. We must act decisively.' },
    { text: 'Your honor as a knight will determine our fate.' },
    { text: 'What will you do?' }
  ];

  let dialogueIndex = 0;

  function showDialogue() {
    screen.innerHTML = '';

    // Background
    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = bgImg.src;
      bg.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        object-fit: cover; opacity: 0.6;
      `;
      screen.appendChild(bg);
    }

    // Overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
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
      background: #000; color: white; padding: 30px;
      display: flex; gap: 20px; z-index: 10;
      border-top: 3px solid #000;
      min-height: 140px;
    `;

    // NPC image
    if (npcImg) {
      const npcEl = document.createElement('img');
      npcEl.src = npcImg.src;
      npcEl.style.cssText = `
        height: 140px; width: auto; image-rendering: crisp-edges;
        border: 2px solid white;
      `;
      dialogueBox.appendChild(npcEl);
    }

    // Text
    const textBox = document.createElement('div');
    textBox.style.cssText = `flex: 1; display: flex; flex-direction: column; justify-content: center;`;

    const speaker = document.createElement('div');
    speaker.style.cssText = `font-weight: 700; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;`;
    speaker.textContent = 'Cardinal Wealthplace';
    textBox.appendChild(speaker);

    const text = document.createElement('div');
    text.style.cssText = `font-size: 15px; line-height: 1.6; color: #fff;`;
    text.textContent = dialogues[dialogueIndex].text;
    textBox.appendChild(text);

    dialogueBox.appendChild(textBox);
    screen.appendChild(dialogueBox);

    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.style.cssText = `
      position: absolute; bottom: 20px; right: 20px;
      background: white; color: #000; border: 2px solid white;
      padding: 12px 24px; font-weight: 700; cursor: pointer;
      font-family: 'Comic Sans MS', sans-serif; z-index: 10;
      font-size: 13px;
    `;
    continueBtn.textContent = '→ CONTINUE';
    continueBtn.onclick = () => {
      playSound('SoundUiSelect.mp3');
      dialogueIndex++;
      showDialogue();
    };
    screen.appendChild(continueBtn);
  }

  function endGame() {
    playSound('SoundWin.mp3');
    screen.remove();
    stopBackgroundMusic();
    markEventComplete(1, 30);
    toast('✓ Treaty dialogue complete!', 'success');
  }

  showDialogue();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 2: RAID ON SILVER STREAM - Catch Objects
// ════════════════════════════════════════════════════════════════════════════

async function game_raidSilverStream() {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await loadImage('SilverStream.png');
  const canvas = document.createElement('canvas');
  canvas.width = screen.clientWidth;
  canvas.height = screen.clientHeight;
  canvas.style.cssText = `position: absolute; top: 0; left: 0; display: block;`;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, w, h);
  }

  const game = {
    player: { x: w / 2, y: h - 60, w: 40, h: 50, collected: 0 },
    objects: [],
    time: 30,
    active: true
  };

  for (let i = 0; i < 3; i++) {
    game.objects.push({
      x: Math.random() * w,
      y: -30,
      w: 25,
      h: 25,
      vy: 2 + Math.random(),
      type: Math.random() > 0.3 ? 'catch' : 'dodge'
    });
  }

  document.addEventListener('mousemove', (e) => {
    game.player.x = e.clientX - game.player.w / 2;
    game.player.x = Math.max(0, Math.min(w - game.player.w, game.player.x));
  });

  function update() {
    if (!game.active) return;

    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, w, h);
    }

    game.objects = game.objects.filter(obj => {
      obj.y += obj.vy;

      if (obj.y + obj.h > game.player.y &&
          obj.y < game.player.y + game.player.h &&
          obj.x + obj.w > game.player.x &&
          obj.x < game.player.x + game.player.w) {
        if (obj.type === 'catch') {
          game.collected += 10;
          playSound('SoundCoin.mp3');
        }
        return false;
      }

      return obj.y < h;
    });

    if (Math.random() < 0.03) {
      game.objects.push({
        x: Math.random() * w,
        y: -30,
        w: 25,
        h: 25,
        vy: 2 + Math.random(),
        type: Math.random() > 0.3 ? 'catch' : 'dodge'
      });
    }

    // Draw player
    ctx.fillStyle = '#000';
    ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);

    // Draw objects
    game.objects.forEach(obj => {
      ctx.fillStyle = obj.type === 'catch' ? '#FFD700' : '#FF4444';
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    });

    // UI
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Comic Sans MS';
    ctx.fillText(`Gold: ${game.collected}`, 20, 30);
    ctx.fillText(`Time: ${Math.ceil(game.time)}s`, w - 150, 30);

    game.time -= 1 / 60;
    if (game.time <= 0) {
      endGame();
      return;
    }

    requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    stopBackgroundMusic();
    if (game.collected >= 100) {
      playSound('SoundWin.mp3');
      markEventComplete(2, game.collected);
      toast('✓ Raid successful!', 'success');
    } else {
      playSound('SoundLose.mp3');
      toast('✗ Not enough gold.', 'error');
    }
  }

  update();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 3-8: CLICKER GAMES
// ════════════════════════════════════════════════════════════════════════════

function createClickerGame(eventId, name, clicks, bgImage) {
  return async () => {
    const screen = createGameScreen();
    document.body.appendChild(screen);

    const bgImg = bgImage ? await loadImage(bgImage) : null;
    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = bgImg.src;
      bg.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        object-fit: cover; opacity: 0.5;
      `;
      screen.appendChild(bg);
    }

    const game = { clicks: 0, needed: clicks };

    function render() {
      const content = document.createElement('div');
      content.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; border: 4px solid #000; padding: 40px;
        text-align: center; max-width: 400px; z-index: 10;
        box-shadow: 6px 6px 0px rgba(0,0,0,0.2);
      `;

      const title = document.createElement('h2');
      title.style.cssText = `margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #000;`;
      title.textContent = name.toUpperCase();
      content.appendChild(title);

      const progress = document.createElement('div');
      progress.style.cssText = `
        background: #f0f0f0; border: 2px solid #000; padding: 15px;
        margin-bottom: 20px; border-radius: 0;
      `;
      progress.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px; color: #000;">${game.clicks}/${game.needed}</div>
        <div style="height: 16px; background: white; border: 1px solid #000; border-radius: 0; overflow: hidden;">
          <div style="height: 100%; background: #000; width: ${(game.clicks / game.needed) * 100}%;"></div>
        </div>
      `;
      content.appendChild(progress);

      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%; padding: 30px; background: white; border: 3px solid #000;
        font-size: 18px; font-weight: 700; cursor: pointer; border-radius: 0;
        font-family: 'Comic Sans MS', sans-serif; color: #000;
      `;
      btn.textContent = 'CLICK!';
      btn.onclick = () => {
        game.clicks++;
        playSound('SoundCoin.mp3');
        if (game.clicks >= game.needed) {
          screen.remove();
          stopBackgroundMusic();
          playSound('SoundWin.mp3');
          const fortCoins = Math.floor(clicks * 1.5);
          markEventComplete(eventId, fortCoins);
          toast(`✓ ${name} complete!`, 'success');
        } else {
          render();
        }
      };
      content.appendChild(btn);

      screen.appendChild(content);
    }

    render();
  };
}

const game_burningElowen = createClickerGame(3, 'Burning Elowen', 20, 'Battlefield.png');
const game_timberRoads = createClickerGame(4, 'Timber Roads', 25, 'TheCanals.png');
const game_combatBattle = createClickerGame(5, 'Combat', 30, 'Battlefield.png');
const game_fenwckCanal = createClickerGame(6, 'Fenwck Canal', 75, 'TheCanals.png');
const game_ironstall = createClickerGame(7, 'Ironstall', 50, 'GlassportHarbour.png');
const game_glassportBlockade = createClickerGame(8, 'Glassport Blockade', 60, 'GlassportHarbour.png');

// ════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER
// ════════════════════════════════════════════════════════════════════════════

async function game_generic(eventId) {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const content = document.createElement('div');
  content.style.cssText = `
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: white; border: 4px solid #000; padding: 40px;
    text-align: center; max-width: 400px; z-index: 10;
  `;

  const title = document.createElement('h2');
  title.textContent = `EVENT ${eventId}`;
  title.style.cssText = `color: #000; margin: 0 0 20px 0;`;
  content.appendChild(title);

  const msg = document.createElement('p');
  msg.textContent = 'Coming soon...';
  msg.style.cssText = `color: #333; margin: 0 0 20px 0;`;
  content.appendChild(msg);

  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #000; color: white; border: 2px solid #000;
    padding: 12px 24px; cursor: pointer; font-weight: 700;
    font-family: 'Comic Sans MS', sans-serif;
  `;
  btn.textContent = 'CONTINUE';
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
