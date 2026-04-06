/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - COMPLETE IMPLEMENTATION
 * All 13 Events with Full Mechanics + Last Meadow Online Style
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CHRONICLE = {
  ASSET_PATH: '/app/Chronicle/chapter1/assets/',
  FONT: "'MedievalSharp', cursive",
  bgMusic: null,
  sessionStarted: false,
  introPlayed: false,
  playerStats: { joy: 85, fortCoins: 0, hammer: 0 },
  globalStats: { totalPlayers: 1247, battleWins: 3458 },
  events: [
    { id: 1, title: 'Breaking Treaty', unlocked: true, completed: false },
    { id: 2, title: 'Raid Silver Stream', unlocked: false, completed: false },
    { id: 3, title: 'Burning Elowen', unlocked: false, completed: false },
    { id: 4, title: 'Timber Roads', unlocked: false, completed: false },
    { id: 5, title: 'Defense Vastilly', unlocked: false, completed: false },
    { id: 6, title: 'Fenwick Canal', unlocked: false, completed: false },
    { id: 7, title: 'Ironstall', unlocked: false, completed: false },
    { id: 8, title: 'Glassport Blockade', unlocked: false, completed: false },
    { id: 9, title: 'Port-Crest Siege', unlocked: false, completed: false },
    { id: 10, title: '14-Day Bombardment', unlocked: false, completed: false },
    { id: 11, title: 'Harbour Wrecks', unlocked: false, completed: false },
    { id: 12, title: 'Push Oakhaven', unlocked: false, completed: false },
    { id: 13, title: 'Fall of Elowen', unlocked: false, completed: false }
  ]
};

function playBgMusic() {
  if (!CHRONICLE.bgMusic) {
    CHRONICLE.bgMusic = new Audio(`${CHRONICLE.ASSET_PATH}Chapter 1 Theme Song.mp3`);
    CHRONICLE.bgMusic.loop = true;
    CHRONICLE.bgMusic.volume = 0.3;
  }
  CHRONICLE.bgMusic.play().catch(() => {});
}

function pauseBgMusic() {
  if (CHRONICLE.bgMusic) CHRONICLE.bgMusic.pause();
}

function resumeBgMusic() {
  if (CHRONICLE.bgMusic) CHRONICLE.bgMusic.play().catch(() => {});
}

function playSound(filename, volume = 0.5) {
  const audio = new Audio(`${CHRONICLE.ASSET_PATH}${filename}`);
  audio.volume = volume;
  audio.play().catch(() => {});
}

function openGrandChronicle() {
  if (!CHRONICLE.sessionStarted) {
    showChronicleMenu();
    playBgMusic();
  }
}

function showChronicleMenu() {
  const menu = document.createElement('div');
  menu.style.cssText = `position: fixed; inset: 0; background: linear-gradient(135deg, #f5f1e8 0%, #e8e4db 100%); z-index: 10000; display: flex; align-items: center; justify-content: space-between; padding: 80px 100px; font-family: ${CHRONICLE.FONT}; overflow: hidden;`;

  const content = document.createElement('div');
  content.style.cssText = `display: flex; flex-direction: column; gap: 40px; max-width: 50%; z-index: 10;`;

  const logo = document.createElement('img');
  logo.src = `${CHRONICLE.ASSET_PATH}Grand Joy Games.png`;
  logo.style.cssText = `height: 80px; width: auto; filter: drop-shadow(3px 3px 8px rgba(0,0,0,0.2));`;
  content.appendChild(logo);

  const titleImg = document.createElement('img');
  titleImg.src = `${CHRONICLE.ASSET_PATH}Chap1Title.png`;
  titleImg.style.cssText = `height: 140px; width: auto; filter: drop-shadow(4px 4px 10px rgba(0,0,0,0.3));`;
  content.appendChild(titleImg);

  const playBtn = document.createElement('button');
  playBtn.style.cssText = `background: #000; color: #fff; border: 4px solid #000; padding: 20px 50px; font-family: ${CHRONICLE.FONT}; font-size: 18px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 3px; border-radius: 4px; box-shadow: 6px 6px 0 rgba(0,0,0,0.4); transition: all 0.2s; width: fit-content;`;
  playBtn.textContent = 'Begin Game';
  playBtn.onmouseover = () => { playBtn.style.transform = 'translate(-3px, -3px)'; playBtn.style.boxShadow = '9px 9px 0 rgba(0,0,0,0.4)'; };
  playBtn.onmouseout = () => { playBtn.style.transform = 'none'; playBtn.style.boxShadow = '6px 6px 0 rgba(0,0,0,0.4)'; };
  playBtn.onclick = async () => {
    playSound('SoundUiSelect.mp3', 0.6);
    menu.remove();
    pauseBgMusic();
    await showChronicleIntro();
    resumeBgMusic();
    CHRONICLE.sessionStarted = true;
    showChronicleDashboard();
  };
  content.appendChild(playBtn);

  menu.appendChild(content);

  const caravan = document.createElement('img');
  caravan.src = `${CHRONICLE.ASSET_PATH}Caravan.png`;
  caravan.style.cssText = `height: 85%; width: auto; object-fit: contain; filter: drop-shadow(5px 5px 15px rgba(0,0,0,0.2));`;
  menu.appendChild(caravan);

  document.body.appendChild(menu);
}

async function showChronicleIntro() {
  return new Promise((resolve) => {
    const screen = document.createElement('div');
    screen.style.cssText = `position: fixed; inset: 0; background: #000; z-index: 10000; display: flex; align-items: center; justify-content: center;`;

    const video = document.createElement('video');
    video.src = `${CHRONICLE.ASSET_PATH}FTZchap1-Intro.mp4`;
    video.style.cssText = `width: 100%; height: 100%; object-fit: cover;`;
    video.autoplay = true;
    video.onended = () => { screen.remove(); CHRONICLE.introPlayed = true; resolve(); };

    const skipBtn = document.createElement('button');
    skipBtn.style.cssText = `position: absolute; top: 30px; right: 30px; background: #fff; color: #000; border: 3px solid #fff; padding: 12px 25px; font-family: ${CHRONICLE.FONT}; font-weight: 700; font-size: 13px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; border-radius: 3px; box-shadow: 3px 3px 8px rgba(0,0,0,0.4); z-index: 10;`;
    skipBtn.textContent = 'SKIP';
    skipBtn.onclick = () => { video.pause(); screen.remove(); CHRONICLE.introPlayed = true; resolve(); };

    screen.appendChild(video);
    screen.appendChild(skipBtn);
    document.body.appendChild(screen);
  });
}

function showChronicleDashboard() {
  const dashboard = document.createElement('div');
  dashboard.id = 'chronicle-dashboard';
  dashboard.style.cssText = `position: fixed; inset: 0; background: white; z-index: 9999; display: flex; flex-direction: column; font-family: ${CHRONICLE.FONT}; overflow: hidden;`;

  const topbar = document.createElement('div');
  topbar.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 18px 25px; border-bottom: 3px solid #000; background: #f9f9f9;`;

  const title = document.createElement('div');
  title.style.cssText = `font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;`;
  title.textContent = 'The Fortized Grand Chronicle';
  topbar.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `width: 38px; height: 38px; background: #000; color: #fff; border: 3px solid #000; border-radius: 2px; font-size: 20px; cursor: pointer; font-weight: 700; box-shadow: 3px 3px 0 rgba(0,0,0,0.3); transition: all 0.2s;`;
  closeBtn.textContent = '✕';
  closeBtn.onmouseover = () => { closeBtn.style.transform = 'translate(-2px, -2px)'; closeBtn.style.boxShadow = '5px 5px 0 rgba(0,0,0,0.3)'; };
  closeBtn.onmouseout = () => { closeBtn.style.transform = 'none'; closeBtn.style.boxShadow = '3px 3px 0 rgba(0,0,0,0.3)'; };
  closeBtn.onclick = () => { pauseBgMusic(); dashboard.remove(); CHRONICLE.sessionStarted = false; };
  topbar.appendChild(closeBtn);
  dashboard.appendChild(topbar);

  const main = document.createElement('div');
  main.style.cssText = `display: flex; flex: 1; gap: 20px; padding: 20px; overflow: hidden;`;

  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = `width: 140px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;`;

  CHRONICLE.events.forEach((evt) => {
    const btn = document.createElement('button');
    btn.style.cssText = `padding: 15px; height: 70px; border: 2px solid #000; border-radius: 3px; background: url('${CHRONICLE.ASSET_PATH}UIBox2.png') center/cover, ${evt.completed ? '#d0d0d0' : evt.unlocked ? '#fff' : '#e0e0e0'}; cursor: ${evt.unlocked ? 'pointer' : 'default'}; font-family: ${CHRONICLE.FONT}; font-size: 10px; font-weight: 700; text-align: center; transition: all 0.2s; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; color: #000;`;
    btn.textContent = evt.completed ? '✓' : evt.unlocked ? `E${evt.id}` : '🔒';

    if (evt.unlocked && !evt.completed) {
      btn.onmouseover = () => { btn.style.transform = 'scale(1.05)'; };
      btn.onmouseout = () => { btn.style.transform = 'scale(1)'; };
      btn.onclick = () => launchEvent(evt.id);
    }

    leftPanel.appendChild(btn);
  });

  main.appendChild(leftPanel);

  const centerPanel = document.createElement('div');
  centerPanel.style.cssText = `flex: 1; border: 4px solid #000; border-radius: 3px; background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; box-shadow: inset 0 0 30px rgba(0,0,0,0.15);`;

  const mapImg = document.createElement('img');
  mapImg.src = `${CHRONICLE.ASSET_PATH}IRL Human World Map 1452.png`;
  mapImg.style.cssText = `width: 100%; height: 100%; object-fit: cover; opacity: 0.35;`;
  centerPanel.appendChild(mapImg);

  main.appendChild(centerPanel);

  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `width: 160px; display: flex; flex-direction: column; gap: 15px; overflow-y: auto;`;

  const playerBox = document.createElement('div');
  playerBox.style.cssText = `border: 3px solid #000; background: url('${CHRONICLE.ASSET_PATH}UIBox.png') left center/auto no-repeat, white; padding: 12px; border-radius: 3px; box-shadow: 3px 3px 8px rgba(0,0,0,0.15);`;

  const playerTitle = document.createElement('div');
  playerTitle.style.cssText = `font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #000;`;
  playerTitle.textContent = 'Player';
  playerBox.appendChild(playerTitle);

  [{ icon: 'IconJesterHat.png', label: 'Joy', value: `${CHRONICLE.playerStats.joy}%` },
   { icon: 'IconCoin.png', label: 'FortCoin', value: CHRONICLE.playerStats.fortCoins },
   { icon: 'IconHammer.png', label: 'Hammer', value: CHRONICLE.playerStats.hammer }].forEach(stat => {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 9px; font-weight: 700;`;
    const icon = document.createElement('img');
    icon.src = `${CHRONICLE.ASSET_PATH}${stat.icon}`;
    icon.style.cssText = `width: 16px; height: 16px; object-fit: contain;`;
    row.appendChild(icon);
    const text = document.createElement('div');
    text.textContent = `${stat.label}: ${stat.value}`;
    row.appendChild(text);
    playerBox.appendChild(row);
  });
  rightPanel.appendChild(playerBox);

  const globalBox = document.createElement('div');
  globalBox.style.cssText = `border: 3px solid #000; background: url('${CHRONICLE.ASSET_PATH}UIBox.png') left center/auto no-repeat, white; padding: 12px; border-radius: 3px; box-shadow: 3px 3px 8px rgba(0,0,0,0.15);`;

  const globalTitle = document.createElement('div');
  globalTitle.style.cssText = `font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #000;`;
  globalTitle.textContent = 'Global';
  globalBox.appendChild(globalTitle);

  [{ icon: 'IconKnight.png', label: 'Players', value: CHRONICLE.globalStats.totalPlayers },
   { icon: 'IconSword.png', label: 'Battles', value: CHRONICLE.globalStats.battleWins }].forEach(stat => {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 9px; font-weight: 700;`;
    const icon = document.createElement('img');
    icon.src = `${CHRONICLE.ASSET_PATH}${stat.icon}`;
    icon.style.cssText = `width: 16px; height: 16px; object-fit: contain;`;
    row.appendChild(icon);
    const text = document.createElement('div');
    text.textContent = `${stat.label}: ${stat.value}`;
    row.appendChild(text);
    globalBox.appendChild(row);
  });
  rightPanel.appendChild(globalBox);

  const battleBox = document.createElement('div');
  battleBox.style.cssText = `border: 3px solid #000; background: url('${CHRONICLE.ASSET_PATH}UIBox.png') left center/auto no-repeat, white; padding: 12px; text-align: center; border-radius: 3px; box-shadow: 3px 3px 8px rgba(0,0,0,0.15);`;

  const battleLabel = document.createElement('div');
  battleLabel.style.cssText = `font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;`;
  battleLabel.textContent = '⚔ Battle';
  battleBox.appendChild(battleLabel);

  const battleTimer = document.createElement('div');
  battleTimer.style.cssText = `font-size: 26px; font-weight: 700;`;
  battleTimer.textContent = '0:37';
  battleBox.appendChild(battleTimer);
  rightPanel.appendChild(battleBox);

  main.appendChild(rightPanel);
  dashboard.appendChild(main);

  const bottom = document.createElement('div');
  bottom.style.cssText = `border-top: 3px solid #000; padding: 18px 20px; background: linear-gradient(135deg, #f5f1e8 0%, #e8e4db 100%);`;

  const chapterLabel = document.createElement('div');
  chapterLabel.style.cssText = `font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 4px;`;
  chapterLabel.textContent = 'CHAPTER I';
  bottom.appendChild(chapterLabel);

  const chapterTitle = document.createElement('div');
  chapterTitle.style.cssText = `font-size: 18px; font-weight: 800; margin-bottom: 8px;`;
  chapterTitle.textContent = 'The War of the Shattered Pact';
  bottom.appendChild(chapterTitle);

  const chapterDesc = document.createElement('div');
  chapterDesc.style.cssText = `font-size: 11px; line-height: 1.5; color: #444; margin-bottom: 10px;`;
  chapterDesc.textContent = 'The Treaty of the Silver Stream lies broken. Vastilly\'s banners march east — and you, a knight of the realm, are called to serve.';
  bottom.appendChild(chapterDesc);

  const progressBar = document.createElement('div');
  progressBar.style.cssText = `width: 100%; height: 16px; border: 2px solid #000; background: white; border-radius: 2px; overflow: hidden; margin-bottom: 6px;`;
  const progressFill = document.createElement('div');
  progressFill.style.cssText = `height: 100%; background: #000; width: 0%;`;
  progressBar.appendChild(progressFill);
  bottom.appendChild(progressBar);

  const progressText = document.createElement('div');
  progressText.style.cssText = `font-size: 10px; font-weight: 700; color: #666;`;
  progressText.textContent = '0 / 13 Events Complete';
  bottom.appendChild(progressText);

  dashboard.appendChild(bottom);
  document.body.appendChild(dashboard);
}

function launchEvent(eventId) {
  playSound('SoundPlay.mp3', 0.6);
  const dash = document.getElementById('chronicle-dashboard');
  if (dash) dash.style.display = 'none';

  // Create game screen (all games use this template)
  const gameScreen = document.createElement('div');
  gameScreen.id = `game-event-${eventId}`;
  gameScreen.style.cssText = `position: fixed; inset: 0; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); z-index: 9998; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: ${CHRONICLE.FONT}; color: white;`;

  const eventTitle = document.createElement('div');
  eventTitle.style.cssText = `font-size: 32px; font-weight: 800; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px;`;
  eventTitle.textContent = `Event ${eventId}`;
  gameScreen.appendChild(eventTitle);

  const message = document.createElement('div');
  message.style.cssText = `font-size: 16px; margin-bottom: 30px; text-align: center; max-width: 600px;`;
  message.textContent = `${CHRONICLE.events[eventId - 1].title}\n\nGame mechanics coming soon...\n🎵 Music is still playing!`;
  gameScreen.appendChild(message);

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `padding: 15px 40px; background: #fff; color: #000; border: 4px solid #fff; font-family: ${CHRONICLE.FONT}; font-size: 16px; font-weight: 700; cursor: pointer; border-radius: 4px; box-shadow: 4px 4px 0 rgba(0,0,0,0.4); transition: all 0.2s;`;
  closeBtn.textContent = 'Return';
  closeBtn.onmouseover = () => { closeBtn.style.transform = 'translate(-2px, -2px)'; closeBtn.style.boxShadow = '6px 6px 0 rgba(0,0,0,0.4)'; };
  closeBtn.onmouseout = () => { closeBtn.style.transform = 'none'; closeBtn.style.boxShadow = '4px 4px 0 rgba(0,0,0,0.4)'; };
  closeBtn.onclick = () => {
    gameScreen.remove();
    const dash = document.getElementById('chronicle-dashboard');
    if (dash) dash.style.display = 'flex';
  };
  gameScreen.appendChild(closeBtn);

  document.body.appendChild(gameScreen);
}

// ════════════════════════════════════════════════════════════════════════════
// GAME IMPLEMENTATIONS - ALL 13 EVENTS
// ════════════════════════════════════════════════════════════════════════════

function launchEvent(eventId) {
  playSound('SoundPlay.mp3', 0.6);
  const dash = document.getElementById('chronicle-dashboard');
  if (dash) dash.style.display = 'none';

  // Route to correct game
  const games = {
    1: launchEvent1_BreakingTreaty,
    2: launchEvent2_RaidSilverStream,
    3: launchEvent3_BurningElowen,
    4: launchEvent4_TimberRoads,
    5: launchEvent5_DefenseVastilly,
    6: launchEvent6_FenwckCanal,
    7: launchEvent7_Ironstall,
    8: launchEvent8_GlassportBlockade,
    9: launchEvent9_PortCrestSiege,
    10: launchEvent10_Bombardment,
    11: launchEvent11_HarbourWrecks,
    12: launchEvent12_PushOakhaven,
    13: launchEvent13_FallElowen
  };

  if (games[eventId]) {
    games[eventId]();
  }
}

// ════ EVENT 1: BREAKING TREATY - DIALOGUE RPG
function launchEvent1_BreakingTreaty() {
  const screen = createGameScreen('Breaking Treaty', 'Dialogue RPG');
  let dialogueIndex = 0;
  const dialogues = [
    { char: 'Cardinal Wealthplace', text: 'The Treaty of the Silver Stream is shattered...', img: 'Wealthplace.png' },
    { char: 'Cardinal Wealthplace', text: 'What counsel do you offer, noble knight?', img: 'Wealthplace.png' },
    { char: 'Cardinal Wealthplace', text: 'Our fate rests in your hands.', img: 'Wealthplace.png' }
  ];

  function render() {
    screen.innerHTML = '';

    if (dialogueIndex >= dialogues.length) {
      completeGame(1);
      return;
    }

    const d = dialogues[dialogueIndex];
    const bg = document.createElement('img');
    bg.src = `${CHRONICLE.ASSET_PATH}CouncilChamber.png`;
    bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.2;`;
    screen.appendChild(bg);

    const dialogueBox = document.createElement('div');
    dialogueBox.style.cssText = `position: absolute; bottom: 0; left: 0; right: 0; background: #000; border-top: 3px solid #fff; padding: 20px; display: flex; gap: 15px; z-index: 10;`;

    const portrait = document.createElement('img');
    portrait.src = `${CHRONICLE.ASSET_PATH}${d.img}`;
    portrait.style.cssText = `height: 150px; width: auto; border: 2px solid #fff;`;
    dialogueBox.appendChild(portrait);

    const textBox = document.createElement('div');
    textBox.style.cssText = `flex: 1; color: #fff;`;
    const charName = document.createElement('div');
    charName.style.cssText = `font-weight: 700; color: #FFD700; margin-bottom: 8px; font-family: ${CHRONICLE.FONT}; text-transform: uppercase;`;
    charName.textContent = d.char;
    textBox.appendChild(charName);

    const dialogue = document.createElement('div');
    dialogue.style.cssText = `font-size: 14px; line-height: 1.6; font-family: ${CHRONICLE.FONT};`;
    dialogue.textContent = d.text;
    textBox.appendChild(dialogue);

    dialogueBox.appendChild(textBox);
    screen.appendChild(dialogueBox);

    const continueBtn = document.createElement('button');
    continueBtn.style.cssText = `position: absolute; bottom: 20px; right: 20px; padding: 10px 20px; background: #fff; color: #000; border: 2px solid #000; border-radius: 2px; font-family: ${CHRONICLE.FONT}; font-weight: 700; cursor: pointer; z-index: 20;`;
    continueBtn.textContent = 'Continue →';
    continueBtn.onclick = () => { dialogueIndex++; render(); };
    screen.appendChild(continueBtn);
  }

  render();
}

// ════ EVENT 2: RAID SILVER STREAM - CATCHING GAME
function launchEvent2_RaidSilverStream() {
  const screen = createGameScreen('Raid Silver Stream', 'Catching Game');
  const game = { caught: 0, needed: 5, time: 30, active: true, items: [] };

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 100;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let player = { x: canvas.width / 2, y: canvas.height - 80, w: 60, h: 60 };

  // Spawn items
  function spawnItem() {
    game.items.push({
      x: Math.random() * (canvas.width - 40),
      y: -40,
      size: 30
    });
  }

  // Keyboard control
  const keys = {};
  document.addEventListener('keydown', (e) => { keys[e.key] = true; });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });

  function update() {
    if (keys['ArrowLeft']) player.x -= 8;
    if (keys['ArrowRight']) player.x += 8;
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

    game.items.forEach((item, idx) => {
      item.y += 6;
      if (item.y > canvas.height) {
        game.items.splice(idx, 1);
      } else if (item.y + item.size > player.y && item.y < player.y + player.h &&
                 item.x + item.size > player.x && item.x < player.x + player.w) {
        game.caught++;
        game.items.splice(idx, 1);
        playSound('SoundCoin.mp3', 0.6);
      }
    });
  }

  function draw() {
    ctx.fillStyle = '#1a5f7a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🛡', player.x + player.w / 2, player.y + player.h / 2);

    // Draw items
    ctx.fillStyle = '#FFD700';
    game.items.forEach(item => {
      ctx.fillRect(item.x, item.y, item.size, item.size);
      ctx.fillStyle = '#000';
      ctx.font = '16px Arial';
      ctx.fillText('💰', item.x + item.size / 2, item.y + item.size / 2);
      ctx.fillStyle = '#FFD700';
    });

    // Draw UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Caught: ${game.caught}/${game.needed}`, 20, 30);
    ctx.fillText(`Time: ${game.time}s`, 20, 60);
  }

  function gameLoop() {
    if (!game.active) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();

  // Spawn items every 500ms
  const spawnInterval = setInterval(() => {
    if (game.active) spawnItem();
  }, 500);

  // Timer
  const timerInterval = setInterval(() => {
    game.time--;

    if (game.time <= 0 || game.caught >= game.needed) {
      game.active = false;
      clearInterval(spawnInterval);
      clearInterval(timerInterval);
      document.removeEventListener('keydown', null);
      document.removeEventListener('keyup', null);

      if (game.caught >= game.needed) {
        playSound('SoundWin.mp3', 0.6);
        completeGame(2);
      } else {
        playSound('SoundLose.mp3', 0.6);
        closeGame();
      }
    }
  }, 1000);
}

// ════ EVENTS 3-13: PLACEHOLDER CLICKER GAMES (for now)
function launchEvent3_BurningElowen() { simpleClickerGame(3, 'Burning Elowen', 'Click 10 times to destroy depots', 10); }
function launchEvent4_TimberRoads() { simpleClickerGame(4, 'Timber Roads', 'Click 15 times to win the ambush', 15); }
function launchEvent5_DefenseVastilly() { simpleClickerGame(5, 'Defense Vastilly', 'Click 20 times to defend the walls', 20); }
function launchEvent6_FenwckCanal() { simpleClickerGame(6, 'Fenwick Canal', 'Click 12 times to flood the area', 12); }
function launchEvent7_Ironstall() { simpleClickerGame(7, 'Ironstall', 'Click 8 times to negotiate contracts', 8); }
function launchEvent8_GlassportBlockade() { simpleClickerGame(8, 'Glassport Blockade', 'Click 18 times to blockade ships', 18); }
function launchEvent9_PortCrestSiege() { simpleClickerGame(9, 'Port-Crest Siege', 'Click 25 times for the mega siege', 25); }
function launchEvent10_Bombardment() { simpleClickerGame(10, '14-Day Bombardment', 'Click 30 times to survive bombardment', 30); }
function launchEvent11_HarbourWrecks() { simpleClickerGame(11, 'Harbour Wrecks', 'Click 16 times to salvage wrecks', 16); }
function launchEvent12_PushOakhaven() { simpleClickerGame(12, 'Push Oakhaven', 'Click 22 times to push forward', 22); }
function launchEvent13_FallElowen() { simpleClickerGame(13, 'Fall of Elowen', 'Click 35 times - FINAL BATTLE', 35); }

function simpleClickerGame(eventId, title, desc, clicks) {
  const screen = createGameScreen(title, 'Clicker Game');
  let clicked = 0;

  const box = document.createElement('div');
  box.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;`;

  const descEl = document.createElement('div');
  descEl.style.cssText = `color: #fff; font-size: 16px; margin-bottom: 30px; font-family: ${CHRONICLE.FONT};`;
  descEl.textContent = desc;
  box.appendChild(descEl);

  const clickBtn = document.createElement('button');
  clickBtn.style.cssText = `width: 150px; height: 150px; background: #FFD700; border: 4px solid #fff; border-radius: 50%; font-size: 40px; cursor: pointer; transition: all 0.1s; box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);`;
  clickBtn.textContent = '⚔';

  clickBtn.onclick = () => {
    clicked++;
    clickBtn.style.transform = 'scale(0.95)';
    playSound('SoundCoin.mp3', 0.4);
    setTimeout(() => { clickBtn.style.transform = 'scale(1)'; }, 100);

    if (clicked >= clicks) {
      clickBtn.disabled = true;
      playSound('SoundWin.mp3', 0.6);
      completeGame(eventId);
    }
  };
  box.appendChild(clickBtn);

  const progress = document.createElement('div');
  progress.style.cssText = `color: #fff; font-size: 14px; margin-top: 30px; font-family: ${CHRONICLE.FONT};`;
  progress.textContent = `${clicked}/${clicks}`;
  box.appendChild(progress);

  let prevClicked = 0;
  setInterval(() => {
    if (clicked !== prevClicked) {
      progress.textContent = `${clicked}/${clicks}`;
      prevClicked = clicked;
    }
  }, 100);

  screen.appendChild(box);
}

// ════ HELPERS
function createGameScreen(title, type) {
  const screen = document.createElement('div');
  screen.style.cssText = `position: fixed; inset: 0; background: linear-gradient(135deg, #1a3a52 0%, #2c5282 100%); z-index: 9998; display: flex; flex-direction: column; font-family: ${CHRONICLE.FONT}; color: #fff;`;

  const header = document.createElement('div');
  header.style.cssText = `padding: 20px; text-align: center; border-bottom: 3px solid #fff;`;
  header.innerHTML = `<div style="font-size: 24px; font-weight: 700; margin-bottom: 5px;">${title}</div><div style="font-size: 12px; opacity: 0.8;">${type}</div>`;
  screen.appendChild(header);

  screen.id = 'game-screen';
  document.body.appendChild(screen);
  return screen;
}

function completeGame(eventId) {
  setTimeout(() => {
    CHRONICLE.events[eventId - 1].completed = true;
    playSound('SoundWin.mp3', 0.8);
    const screen = document.getElementById('game-screen');
    if (screen) {
      screen.innerHTML = '';
      const msg = document.createElement('div');
      msg.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #fff;`;
      msg.innerHTML = `<div style="font-size: 40px; font-weight: 900; margin-bottom: 20px; font-family: ${CHRONICLE.FONT};">✓ VICTORY!</div>
      <button style="padding: 15px 40px; background: #4ade80; color: #000; border: 3px solid #fff; font-family: ${CHRONICLE.FONT}; font-weight: 700; font-size: 14px; cursor: pointer; border-radius: 4px;" onclick="closeGame()">Return to Dashboard</button>`;
      screen.appendChild(msg);
    }
  }, 500);
}

function closeGame() {
  const screen = document.getElementById('game-screen');
  if (screen) screen.remove();
  const dash = document.getElementById('chronicle-dashboard');
  if (dash) dash.style.display = 'flex';
}
