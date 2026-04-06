/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - PROPER IMPLEMENTATION
 * UIBox images used correctly + Games play in-dashboard
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CHRONICLE = {
  ASSET_PATH: '/app/Chronicle/chapter1/assets/',
  FONT: "'MedievalSharp', cursive",
  bgMusic: null,
  sessionStarted: false,
  introPlayed: false,
  playerStats: {
    joy: 100,
    fortCoins: 0,
    level: 1,
    xp: 0,
    upgrades: 0,
    isResting: false,
    restEndTime: null
  },
  globalStats: { totalPlayers: 1247, victories: 3458 },
  currentGame: null,
  events: [
    { id: 1, title: 'Breaking Treaty', unlocked: true, completed: false, location: 'Council Chamber' },
    { id: 2, title: 'Raid Silver Stream', unlocked: false, completed: false, location: 'Silver Stream' },
    { id: 3, title: 'Burning Elowen', unlocked: false, completed: false, location: 'Elowen' },
    { id: 4, title: 'Timber Roads', unlocked: false, completed: false, location: 'Timber Roads' },
    { id: 5, title: 'Defense Vastilly', unlocked: false, completed: false, location: 'Vastilly' },
    { id: 6, title: 'Fenwick Canal', unlocked: false, completed: false, location: 'Fenwick' },
    { id: 7, title: 'Ironstall', unlocked: false, completed: false, location: 'Ironstall' },
    { id: 8, title: 'Glassport Blockade', unlocked: false, completed: false, location: 'Glassport' },
    { id: 9, title: 'Port-Crest Siege', unlocked: false, completed: false, location: 'Port-Crest' },
    { id: 10, title: '14-Day Bombardment', unlocked: false, completed: false, location: 'Mainland' },
    { id: 11, title: 'Harbour Wrecks', unlocked: false, completed: false, location: 'Harbour' },
    { id: 12, title: 'Push Oakhaven', unlocked: false, completed: false, location: 'Oakhaven' },
    { id: 13, title: 'Fall of Elowen', unlocked: false, completed: false, location: 'Elowen' }
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

// Alias for compatibility with button onclick handler
function openChronicle() {
  openGrandChronicle();
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
  dashboard.style.cssText = `position: fixed; inset: 0; background: #fff; z-index: 9999; display: flex; flex-direction: column; font-family: ${CHRONICLE.FONT}; overflow: hidden;`;

  // TOP BAR with Chap1Title image
  const topbar = document.createElement('div');
  topbar.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #000; border-bottom: 3px solid #000;`;

  const titleImg = document.createElement('img');
  titleImg.src = `${CHRONICLE.ASSET_PATH}Chap1Title.png`;
  titleImg.style.cssText = `height: 50px; width: auto;`;
  topbar.appendChild(titleImg);

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `width: 36px; height: 36px; background: #fff; color: #000; border: 2px solid #000; border-radius: 2px; font-size: 20px; cursor: pointer; font-weight: 700;`;
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => { pauseBgMusic(); dashboard.remove(); CHRONICLE.sessionStarted = false; };
  topbar.appendChild(closeBtn);
  dashboard.appendChild(topbar);

  const main = document.createElement('div');
  main.style.cssText = `display: flex; flex: 1; overflow: hidden;`;

  // LEFT PANEL - Player Stats with UIBox
  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = `width: 220px; background: #f5f5f5; border-right: 3px solid #000; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;`;

  // Level circle
  const levelCircle = document.createElement('div');
  levelCircle.style.cssText = `width: 70px; height: 70px; border-radius: 50%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; margin: 0 auto; border: 3px solid #fff;`;
  levelCircle.id = 'level-display';
  levelCircle.textContent = `${CHRONICLE.playerStats.level}`;
  leftPanel.appendChild(levelCircle);

  // XP Bar
  const xpContainer = document.createElement('div');
  const xpLabel = document.createElement('div');
  xpLabel.style.cssText = `font-size: 10px; font-weight: 700; color: #000; margin-bottom: 4px;`;
  xpLabel.id = 'xp-label';
  xpLabel.textContent = `XP: ${CHRONICLE.playerStats.xp}/100`;
  xpContainer.appendChild(xpLabel);

  const xpBar = document.createElement('div');
  xpBar.style.cssText = `width: 100%; height: 12px; background: #ddd; border: 2px solid #000; border-radius: 2px; overflow: hidden;`;
  const xpFill = document.createElement('div');
  xpFill.id = 'xp-fill';
  xpFill.style.cssText = `height: 100%; background: #000; width: ${CHRONICLE.playerStats.xp}%;`;
  xpBar.appendChild(xpFill);
  xpContainer.appendChild(xpBar);
  leftPanel.appendChild(xpContainer);

  // UIBox wrapper for stat boxes
  [
    { icon: 'IconJesterHat.png', label: 'Joy', id: 'joy-stat', value: `${CHRONICLE.playerStats.joy}%`, key: 'joy' },
    { icon: 'IconCoin.png', label: 'FortCoins', id: 'coins-stat', value: CHRONICLE.playerStats.fortCoins, key: 'fortCoins' },
    { icon: 'IconHammer.png', label: 'Upgrades', id: 'upgrades-stat', value: CHRONICLE.playerStats.upgrades, key: 'upgrades' }
  ].forEach(stat => {
    const statBox = document.createElement('div');
    statBox.style.cssText = `position: relative; height: 70px;`;

    const uiboxImg = document.createElement('img');
    uiboxImg.src = `${CHRONICLE.ASSET_PATH}UIBox.png`;
    uiboxImg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: stretch; pointer-events: none;`;
    statBox.appendChild(uiboxImg);

    const content = document.createElement('div');
    content.style.cssText = `position: absolute; inset: 0; padding: 8px; display: flex; align-items: center; gap: 8px;`;

    const icon = document.createElement('img');
    icon.src = `${CHRONICLE.ASSET_PATH}${stat.icon}`;
    icon.style.cssText = `width: 28px; height: 28px; object-fit: contain;`;
    content.appendChild(icon);

    const info = document.createElement('div');
    info.style.cssText = `flex: 1;`;
    const label = document.createElement('div');
    label.style.cssText = `font-size: 9px; font-weight: 700; color: #666;`;
    label.textContent = stat.label;
    info.appendChild(label);
    const value = document.createElement('div');
    value.style.cssText = `font-size: 13px; font-weight: 900; color: #000;`;
    value.id = stat.id;
    value.textContent = stat.value;
    info.appendChild(value);
    content.appendChild(info);

    statBox.appendChild(content);
    leftPanel.appendChild(statBox);
  });

  main.appendChild(leftPanel);

  // CENTER PANEL - Map
  const centerPanel = document.createElement('div');
  centerPanel.style.cssText = `flex: 1; background: #fff; border-right: 3px solid #000; display: flex; flex-direction: column; overflow: hidden; position: relative;`;

  // Map background
  const mapContainer = document.createElement('div');
  mapContainer.style.cssText = `flex: 1; position: relative; overflow: hidden;`;
  const mapImg = document.createElement('img');
  mapImg.src = `${CHRONICLE.ASSET_PATH}IRL Human World Map 1452.png`;
  mapImg.style.cssText = `width: 100%; height: 100%; object-fit: cover;`;
  mapContainer.appendChild(mapImg);
  centerPanel.appendChild(mapContainer);

  // Event Details Box
  const detailsBox = document.createElement('div');
  detailsBox.style.cssText = `padding: 16px; background: #f5f5f5; border-top: 3px solid #000; min-height: 120px;`;

  const selectedEvent = CHRONICLE.events.find(e => e.unlocked && !e.completed) || CHRONICLE.events[0];

  const eventName = document.createElement('div');
  eventName.style.cssText = `font-size: 14px; font-weight: 900; color: #000; margin-bottom: 4px;`;
  eventName.textContent = selectedEvent.title;
  detailsBox.appendChild(eventName);

  const eventLocation = document.createElement('div');
  eventLocation.style.cssText = `font-size: 11px; font-weight: 700; color: #666; margin-bottom: 8px;`;
  eventLocation.textContent = `📍 ${selectedEvent.location}`;
  detailsBox.appendChild(eventLocation);

  const playBtn = document.createElement('button');
  playBtn.style.cssText = `padding: 10px 25px; background: #000; color: #fff; border: 2px solid #000; border-radius: 3px; font-family: ${CHRONICLE.FONT}; font-weight: 900; font-size: 12px; cursor: pointer; text-transform: uppercase;`;
  playBtn.textContent = '▶ Play';
  playBtn.disabled = !selectedEvent.unlocked || CHRONICLE.playerStats.joy < 20;
  playBtn.style.opacity = playBtn.disabled ? '0.5' : '1';
  playBtn.style.cursor = playBtn.disabled ? 'not-allowed' : 'pointer';
  playBtn.onclick = () => launchEvent(selectedEvent.id);
  detailsBox.appendChild(playBtn);

  centerPanel.appendChild(detailsBox);
  main.appendChild(centerPanel);

  // RIGHT PANEL - War Orders with UIBox2
  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `width: 160px; background: #f5f5f5; border-left: 3px solid #000; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;`;

  const ordersTitle = document.createElement('div');
  ordersTitle.style.cssText = `font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #000; border-bottom: 2px solid #000; padding-bottom: 6px;`;
  ordersTitle.textContent = 'War Orders';
  rightPanel.appendChild(ordersTitle);

  // Global stats
  const globalBox = document.createElement('div');
  globalBox.style.cssText = `position: relative; height: 50px; margin-bottom: 4px;`;

  const globalUibox = document.createElement('img');
  globalUibox.src = `${CHRONICLE.ASSET_PATH}UIBox2.png`;
  globalUibox.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: stretch; pointer-events: none;`;
  globalBox.appendChild(globalUibox);

  const globalContent = document.createElement('div');
  globalContent.style.cssText = `position: absolute; inset: 0; padding: 4px; font-size: 9px; font-weight: 700; display: flex; flex-direction: column; justify-content: center;`;
  globalContent.textContent = `${CHRONICLE.globalStats.totalPlayers} 👥 | ${CHRONICLE.globalStats.victories} ⚔`;
  globalBox.appendChild(globalContent);
  rightPanel.appendChild(globalBox);

  // Event buttons with UIBox2
  CHRONICLE.events.forEach((evt) => {
    const btnWrapper = document.createElement('div');
    btnWrapper.style.cssText = `position: relative; height: 45px;`;

    const uiboxImg = document.createElement('img');
    uiboxImg.src = `${CHRONICLE.ASSET_PATH}UIBox2.png`;
    uiboxImg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: stretch; pointer-events: none;`;
    btnWrapper.appendChild(uiboxImg);

    const btn = document.createElement('button');
    btn.style.cssText = `position: absolute; inset: 0; background: transparent; border: none; cursor: ${evt.unlocked ? 'pointer' : 'default'}; font-family: ${CHRONICLE.FONT}; font-size: 10px; font-weight: 700; text-align: center; transition: all 0.2s; color: #000;`;

    if (evt.completed) {
      btn.textContent = `✓ E${evt.id}`;
    } else if (evt.unlocked) {
      btn.textContent = `E${evt.id}`;
      btn.onmouseover = () => { btn.style.transform = 'scale(1.08)'; };
      btn.onmouseout = () => { btn.style.transform = 'scale(1)'; };
      btn.onclick = () => launchEvent(evt.id);
    } else {
      btn.textContent = `🔒`;
      btn.style.opacity = '0.4';
    }

    btnWrapper.appendChild(btn);
    rightPanel.appendChild(btnWrapper);
  });

  main.appendChild(rightPanel);
  dashboard.appendChild(main);

  document.body.appendChild(dashboard);
}

function launchEvent(eventId) {
  // Check if joy is too low
  if (CHRONICLE.playerStats.joy < 20) {
    alert('Joy too low! Rest to recover.');
    return;
  }

  playSound('SoundPlay.mp3', 0.6);
  pauseBgMusic();

  // Create fullscreen game overlay
  const gameOverlay = document.createElement('div');
  gameOverlay.id = 'game-overlay';
  gameOverlay.style.cssText = `position: fixed; inset: 0; background: #000; z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: ${CHRONICLE.FONT};`;

  const title = document.createElement('div');
  title.style.cssText = `font-size: 28px; font-weight: 900; color: #fff; margin-bottom: 30px; text-transform: uppercase; text-align: center;`;
  title.textContent = `${CHRONICLE.events[eventId - 1].title}`;
  gameOverlay.appendChild(title);

  const content = document.createElement('div');
  content.id = `game-content-${eventId}`;
  content.style.cssText = `flex: 1; display: flex; align-items: center; justify-content: center; width: 100%;`;
  gameOverlay.appendChild(content);

  const returnBtn = document.createElement('button');
  returnBtn.style.cssText = `padding: 14px 35px; background: #fff; color: #000; border: 3px solid #fff; font-family: ${CHRONICLE.FONT}; font-weight: 900; font-size: 14px; cursor: pointer; border-radius: 4px; margin-bottom: 30px; text-transform: uppercase; transition: all 0.2s;`;
  returnBtn.textContent = '← Return to Dashboard';
  returnBtn.onmouseover = () => { returnBtn.style.background = '#f0f0f0'; };
  returnBtn.onmouseout = () => { returnBtn.style.background = '#fff'; };
  returnBtn.onclick = () => {
    gameOverlay.remove();
    resumeBgMusic();
    CHRONICLE.currentGame = null;
  };
  gameOverlay.appendChild(returnBtn);

  document.body.appendChild(gameOverlay);
  CHRONICLE.currentGame = eventId;

  // Deduct joy when starting game
  CHRONICLE.playerStats.joy = Math.max(0, CHRONICLE.playerStats.joy - 15);
  const joyEl = document.getElementById('stat-joy');
  if (joyEl) joyEl.textContent = `${CHRONICLE.playerStats.joy}%`;

  // Load game
  loadGame(eventId, content);
}

function loadGame(eventId, container) {
  const games = {
    1: gameEvent1,
    2: gameEvent2,
    3: () => simpleGame(container, eventId, 'Burning Elowen', 10),
    4: () => simpleGame(container, eventId, 'Timber Roads', 15),
    5: () => simpleGame(container, eventId, 'Defense Vastilly', 20),
    6: () => simpleGame(container, eventId, 'Fenwick Canal', 12),
    7: () => simpleGame(container, eventId, 'Ironstall', 8),
    8: () => simpleGame(container, eventId, 'Glassport Blockade', 18),
    9: () => simpleGame(container, eventId, 'Port-Crest Siege', 25),
    10: () => simpleGame(container, eventId, '14-Day Bombardment', 30),
    11: () => simpleGame(container, eventId, 'Harbour Wrecks', 16),
    12: () => simpleGame(container, eventId, 'Push Oakhaven', 22),
    13: () => simpleGame(container, eventId, 'Fall of Elowen', 35)
  };

  if (games[eventId]) {
    games[eventId](container);
  }
}

function gameEvent1(container) {
  // Dialogue game with CouncilChamber background
  container.innerHTML = '';
  const bg = document.createElement('img');
  bg.src = `${CHRONICLE.ASSET_PATH}CouncilChamber.png`;
  bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`;
  container.parentElement.style.position = 'relative';
  container.parentElement.appendChild(bg);

  let dialogueIndex = 0;
  const dialogues = [
    { text: 'The Treaty of the Silver Stream is shattered...', img: 'Wealthplace.png' },
    { text: 'What counsel do you offer, noble knight?', img: 'Wealthplace.png' },
    { text: 'Our fate rests in your hands.', img: 'Wealthplace.png' }
  ];

  function render() {
    const existingBox = container.querySelector('[id="dialogue-box"]');
    if (existingBox) existingBox.remove();

    if (dialogueIndex >= dialogues.length) {
      completeEvent(1, 50, 25);
      return;
    }

    const d = dialogues[dialogueIndex];
    const box = document.createElement('div');
    box.id = 'dialogue-box';
    box.style.cssText = `position: relative; display: flex; gap: 15px; align-items: center; background: rgba(0,0,0,0.8); padding: 20px; border-radius: 4px; border: 3px solid #FFD700; width: 70%; max-width: 500px; z-index: 10;`;

    const portrait = document.createElement('img');
    portrait.src = `${CHRONICLE.ASSET_PATH}${d.img}`;
    portrait.style.cssText = `height: 100px; width: auto; border: 2px solid #FFD700;`;
    box.appendChild(portrait);

    const textBox = document.createElement('div');
    textBox.style.cssText = `color: #fff; flex: 1;`;
    const text = document.createElement('div');
    text.style.cssText = `font-size: 14px; line-height: 1.6; font-family: ${CHRONICLE.FONT}; margin-bottom: 10px;`;
    text.textContent = d.text;
    textBox.appendChild(text);

    const continueBtn = document.createElement('button');
    continueBtn.style.cssText = `padding: 8px 16px; background: #FFD700; color: #000; border: 2px solid #FFD700; border-radius: 2px; font-family: ${CHRONICLE.FONT}; font-weight: 700; cursor: pointer; font-size: 12px;`;
    continueBtn.textContent = dialogueIndex === dialogues.length - 1 ? 'Complete' : 'Continue →';
    continueBtn.onclick = () => { dialogueIndex++; render(); };
    textBox.appendChild(continueBtn);

    box.appendChild(textBox);
    container.appendChild(box);
  }

  render();
}

function gameEvent2(container) {
  // Catching game with SilverStream background
  container.innerHTML = '';
  const bg = document.createElement('img');
  bg.src = `${CHRONICLE.ASSET_PATH}SilverStream.png`;
  bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`;
  container.parentElement.style.position = 'relative';
  container.parentElement.appendChild(bg);

  let caught = 0;
  const needed = 5;

  const gameUI = document.createElement('div');
  gameUI.style.cssText = `position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; z-index: 10;`;

  const label = document.createElement('div');
  label.style.cssText = `color: #fff; font-size: 14px; font-family: ${CHRONICLE.FONT}; background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 4px;`;
  label.textContent = `Caught: ${caught}/${needed}`;
  gameUI.appendChild(label);

  const btn = document.createElement('button');
  btn.style.cssText = `width: 100px; height: 100px; background: #FFD700; border: 3px solid #000; border-radius: 50%; font-size: 32px; cursor: pointer; transition: all 0.1s; box-shadow: 0 0 20px rgba(255, 215, 0, 0.7);`;
  btn.textContent = '💰';

  btn.onclick = () => {
    caught++;
    btn.style.transform = 'scale(0.9)';
    playSound('SoundCoin.mp3', 0.4);
    setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);

    label.textContent = `Caught: ${caught}/${needed}`;

    if (caught >= needed) {
      btn.disabled = true;
      completeEvent(2, 75, 30);
    }
  };

  gameUI.appendChild(btn);
  container.appendChild(gameUI);
}

function simpleGame(container, eventId, title, clicks) {
  // Simple clicking game using location images
  container.innerHTML = '';
  const locations = ['Battlefield', 'SupplyBox', 'TheCanals'];
  const bgImage = locations[eventId % locations.length];

  const bg = document.createElement('img');
  bg.src = `${CHRONICLE.ASSET_PATH}${bgImage}.png`;
  bg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`;
  container.parentElement.style.position = 'relative';
  container.parentElement.appendChild(bg);

  let clicked = 0;

  const gameUI = document.createElement('div');
  gameUI.style.cssText = `position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; z-index: 10;`;

  const progress = document.createElement('div');
  progress.style.cssText = `color: #fff; font-family: ${CHRONICLE.FONT}; font-size: 14px; background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 4px;`;
  progress.textContent = `${clicked}/${clicks}`;
  gameUI.appendChild(progress);

  const btn = document.createElement('button');
  btn.style.cssText = `width: 120px; height: 120px; background: #FFD700; border: 4px solid #000; border-radius: 50%; font-size: 36px; cursor: pointer; transition: all 0.1s; box-shadow: 0 0 20px rgba(255, 215, 0, 0.7);`;
  btn.textContent = '⚔';

  btn.onclick = () => {
    clicked++;
    btn.style.transform = 'scale(0.9)';
    playSound('SoundCoin.mp3', 0.4);
    setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);

    progress.textContent = `${clicked}/${clicks}`;

    if (clicked >= clicks) {
      btn.disabled = true;
      const coins = Math.floor(50 + (clicks * 5));
      const xp = Math.floor(20 + clicks);
      completeEvent(eventId, coins, xp);
    }
  };

  gameUI.appendChild(btn);
  container.appendChild(gameUI);
}

function completeEvent(eventId, coins, xp) {
  // Award coins and XP
  CHRONICLE.playerStats.fortCoins += coins;
  CHRONICLE.playerStats.xp += xp;

  if (CHRONICLE.playerStats.xp >= 100) {
    CHRONICLE.playerStats.level++;
    CHRONICLE.playerStats.xp -= 100;
  }

  CHRONICLE.events[eventId - 1].completed = true;
  if (eventId < 13) {
    CHRONICLE.events[eventId].unlocked = true;
  }

  // Show completion screen
  const overlay = document.getElementById('game-overlay');
  if (overlay) {
    const content = overlay.querySelector(`[id="game-content-${eventId}"]`);
    if (content) {
      content.innerHTML = `<div style="color: #fff; font-family: ${CHRONICLE.FONT}; text-align: center; background: rgba(0,0,0,0.8); padding: 40px; border-radius: 8px;">
        <div style="font-size: 48px; font-weight: 900; margin-bottom: 20px;">✓</div>
        <div style="font-size: 28px; font-weight: 900; margin-bottom: 20px;">Event Complete!</div>
        <div style="font-size: 18px; margin: 10px 0;">+${coins} FortCoins</div>
        <div style="font-size: 18px;">+${xp} XP</div>
      </div>`;
    }
  }

  playSound('SoundWin.mp3', 0.6);

  setTimeout(() => {
    const overlay = document.getElementById('game-overlay');
    if (overlay) overlay.remove();
    resumeBgMusic();
    CHRONICLE.currentGame = null;
    // Refresh dashboard
    const dashboard = document.getElementById('chronicle-dashboard');
    if (dashboard) dashboard.remove();
    showChronicleDashboard();
  }, 2000);
}
