/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - COMPLETE REBUILD
 * Inspired by Discord's "Last Meadow Online" + Medieval RPG aesthetic
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CHRONICLE = {
  ASSET_PATH: '/app/Chronicle/chapter1/assets/',
  FONT: "'MedievalSharp', cursive",

  // Audio management
  bgMusic: null,
  soundEffects: {},

  // Game state
  sessionStarted: false,
  introPlayed: false,
  currentDashboard: null,

  // Player stats (should connect to database later)
  playerStats: {
    joy: 85,
    fortCoins: 0,
    hammer: 0
  },

  // Global stats (from database)
  globalStats: {
    totalPlayers: 1247,
    battleWins: 3458
  },

  // Events data
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

// ════════════════════════════════════════════════════════════════════════════
// AUDIO MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

function playBgMusic() {
  if (!CHRONICLE.bgMusic) {
    CHRONICLE.bgMusic = new Audio(`${CHRONICLE.ASSET_PATH}Chapter 1 Theme Song.mp3`);
    CHRONICLE.bgMusic.loop = true;
    CHRONICLE.bgMusic.volume = 0.3;
  }
  CHRONICLE.bgMusic.play().catch(() => {});
}

function pauseBgMusic() {
  if (CHRONICLE.bgMusic) {
    CHRONICLE.bgMusic.pause();
  }
}

function resumeBgMusic() {
  if (CHRONICLE.bgMusic) {
    CHRONICLE.bgMusic.play().catch(() => {});
  }
}

function playSound(filename, volume = 0.5) {
  const audio = new Audio(`${CHRONICLE.ASSET_PATH}${filename}`);
  audio.volume = volume;
  audio.play().catch(() => {});
}

// ════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

function openGrandChronicle() {
  if (!CHRONICLE.sessionStarted) {
    showChronicleMenu();
    playBgMusic();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MENU SCREEN (Discord Last Meadow Online style)
// ════════════════════════════════════════════════════════════════════════════

function showChronicleMenu() {
  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #f5f1e8 0%, #e8e4db 100%);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 80px 100px;
    font-family: ${CHRONICLE.FONT};
    overflow: hidden;
  `;

  // LEFT: Content
  const content = document.createElement('div');
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 40px;
    max-width: 50%;
    z-index: 10;
  `;

  // Grand Joy Games Logo
  const logo = document.createElement('img');
  logo.src = `${CHRONICLE.ASSET_PATH}Grand Joy Games.png`;
  logo.style.cssText = `
    height: 80px;
    width: auto;
    filter: drop-shadow(3px 3px 8px rgba(0,0,0,0.2));
  `;
  content.appendChild(logo);

  // Chapter Title
  const titleImg = document.createElement('img');
  titleImg.src = `${CHRONICLE.ASSET_PATH}Chap1Title.png`;
  titleImg.style.cssText = `
    height: 140px;
    width: auto;
    filter: drop-shadow(4px 4px 10px rgba(0,0,0,0.3));
  `;
  content.appendChild(titleImg);

  // Begin/Continue Button
  const playBtn = document.createElement('button');
  playBtn.style.cssText = `
    background: #000;
    color: #fff;
    border: 4px solid #000;
    padding: 20px 50px;
    font-family: ${CHRONICLE.FONT};
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 3px;
    border-radius: 4px;
    box-shadow: 6px 6px 0 rgba(0,0,0,0.4);
    transition: all 0.2s;
    width: fit-content;
  `;
  playBtn.textContent = 'Begin Game';
  playBtn.onmouseover = () => {
    playBtn.style.transform = 'translate(-3px, -3px)';
    playBtn.style.boxShadow = '9px 9px 0 rgba(0,0,0,0.4)';
  };
  playBtn.onmouseout = () => {
    playBtn.style.transform = 'none';
    playBtn.style.boxShadow = '6px 6px 0 rgba(0,0,0,0.4)';
  };
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

  // RIGHT: Caravan illustration
  const caravan = document.createElement('img');
  caravan.src = `${CHRONICLE.ASSET_PATH}Caravan.png`;
  caravan.style.cssText = `
    height: 85%;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(5px 5px 15px rgba(0,0,0,0.2));
  `;
  menu.appendChild(caravan);

  document.body.appendChild(menu);
}

// ════════════════════════════════════════════════════════════════════════════
// INTRO VIDEO
// ════════════════════════════════════════════════════════════════════════════

async function showChronicleIntro() {
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
    video.src = `${CHRONICLE.ASSET_PATH}FTZchap1-Intro.mp4`;
    video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    video.autoplay = true;
    video.onended = () => {
      screen.remove();
      CHRONICLE.introPlayed = true;
      resolve();
    };

    const skipBtn = document.createElement('button');
    skipBtn.style.cssText = `
      position: absolute;
      top: 30px;
      right: 30px;
      background: #fff;
      color: #000;
      border: 3px solid #fff;
      padding: 12px 25px;
      font-family: ${CHRONICLE.FONT};
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 3px;
      box-shadow: 3px 3px 8px rgba(0,0,0,0.4);
      z-index: 10;
    `;
    skipBtn.textContent = 'SKIP';
    skipBtn.onclick = () => {
      video.pause();
      screen.remove();
      CHRONICLE.introPlayed = true;
      resolve();
    };

    screen.appendChild(video);
    screen.appendChild(skipBtn);
    document.body.appendChild(screen);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

function showChronicleDashboard() {
  // Remove old dashboard if exists
  const oldDash = document.getElementById('chronicle-dashboard');
  if (oldDash) oldDash.remove();

  const dashboard = document.createElement('div');
  dashboard.id = 'chronicle-dashboard';
  dashboard.style.cssText = `
    position: fixed;
    inset: 0;
    background: white;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    font-family: ${CHRONICLE.FONT};
    overflow: hidden;
  `;

  // ─ TOP BAR
  const topbar = document.createElement('div');
  topbar.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 25px;
    border-bottom: 3px solid #000;
    background: #f9f9f9;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
  `;
  title.textContent = 'The Fortized Grand Chronicle';
  topbar.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    width: 38px;
    height: 38px;
    background: #000;
    color: #fff;
    border: 3px solid #000;
    border-radius: 2px;
    font-size: 20px;
    cursor: pointer;
    font-weight: 700;
    box-shadow: 3px 3px 0 rgba(0,0,0,0.3);
    transition: all 0.2s;
  `;
  closeBtn.textContent = '✕';
  closeBtn.onmouseover = () => {
    closeBtn.style.transform = 'translate(-2px, -2px)';
    closeBtn.style.boxShadow = '5px 5px 0 rgba(0,0,0,0.3)';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.transform = 'none';
    closeBtn.style.boxShadow = '3px 3px 0 rgba(0,0,0,0.3)';
  };
  closeBtn.onclick = () => {
    pauseBgMusic();
    dashboard.remove();
    CHRONICLE.sessionStarted = false;
  };
  topbar.appendChild(closeBtn);
  dashboard.appendChild(topbar);

  // ─ MAIN CONTENT
  const main = document.createElement('div');
  main.style.cssText = `
    display: flex;
    flex: 1;
    gap: 20px;
    padding: 20px;
    overflow: hidden;
  `;

  // LEFT: Events list
  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = `
    width: 140px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  `;

  CHRONICLE.events.forEach((evt) => {
    const eventBtn = createEventButton(evt);
    leftPanel.appendChild(eventBtn);
  });

  main.appendChild(leftPanel);

  // CENTER: Map area
  const centerPanel = document.createElement('div');
  centerPanel.style.cssText = `
    flex: 1;
    border: 4px solid #000;
    border-radius: 3px;
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 0 30px rgba(0,0,0,0.15);
  `;

  const mapImg = document.createElement('img');
  mapImg.src = `${CHRONICLE.ASSET_PATH}IRL Human World Map 1452.png`;
  mapImg.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.35;
  `;
  centerPanel.appendChild(mapImg);

  main.appendChild(centerPanel);

  // RIGHT: Stats & info
  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `
    width: 160px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    overflow-y: auto;
  `;

  // Player stats
  rightPanel.appendChild(createStatBox('Player Stats', [
    { icon: 'IconJesterHat.png', label: 'Joy', value: `${CHRONICLE.playerStats.joy}%` },
    { icon: 'IconCoin.png', label: 'FortCoins', value: CHRONICLE.playerStats.fortCoins },
    { icon: 'IconHammer.png', label: 'Hammer', value: CHRONICLE.playerStats.hammer }
  ]));

  // Global stats
  rightPanel.appendChild(createStatBox('Global Stats', [
    { icon: 'IconKnight.png', label: 'Players', value: CHRONICLE.globalStats.totalPlayers },
    { icon: 'IconSword.png', label: 'Battles Won', value: CHRONICLE.globalStats.battleWins }
  ]));

  // Battle timer
  const battleBox = document.createElement('div');
  battleBox.style.cssText = `
    border: 3px solid #000;
    background: white;
    padding: 12px;
    text-align: center;
    border-radius: 3px;
    box-shadow: 3px 3px 8px rgba(0,0,0,0.15);
  `;
  const battleLabel = document.createElement('div');
  battleLabel.style.cssText = `
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  `;
  battleLabel.textContent = '⚔ Battle';
  const battleTimer = document.createElement('div');
  battleTimer.style.cssText = `
    font-size: 26px;
    font-weight: 700;
  `;
  battleTimer.textContent = '0:37';
  battleBox.appendChild(battleLabel);
  battleBox.appendChild(battleTimer);
  rightPanel.appendChild(battleBox);

  main.appendChild(rightPanel);
  dashboard.appendChild(main);

  // ─ BOTTOM: Chapter info
  const bottom = document.createElement('div');
  bottom.style.cssText = `
    border-top: 3px solid #000;
    padding: 18px 20px;
    background: linear-gradient(135deg, #f5f1e8 0%, #e8e4db 100%);
  `;

  const chapterLabel = document.createElement('div');
  chapterLabel.style.cssText = `
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #666;
    margin-bottom: 4px;
  `;
  chapterLabel.textContent = 'CHAPTER I';
  bottom.appendChild(chapterLabel);

  const chapterTitle = document.createElement('div');
  chapterTitle.style.cssText = `
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 8px;
  `;
  chapterTitle.textContent = 'The War of the Shattered Pact';
  bottom.appendChild(chapterTitle);

  const chapterDesc = document.createElement('div');
  chapterDesc.style.cssText = `
    font-size: 11px;
    line-height: 1.5;
    color: #444;
    margin-bottom: 10px;
  `;
  chapterDesc.textContent = 'The Treaty of the Silver Stream lies broken. Vastilly\'s banners march east — and you, a knight of the realm, are called to serve.';
  bottom.appendChild(chapterDesc);

  const progressContainer = document.createElement('div');
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    width: 100%;
    height: 16px;
    border: 2px solid #000;
    background: white;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 6px;
  `;
  const progressFill = document.createElement('div');
  progressFill.style.cssText = `
    height: 100%;
    background: #000;
    width: 0%;
  `;
  progressBar.appendChild(progressFill);
  progressContainer.appendChild(progressBar);

  const progressText = document.createElement('div');
  progressText.style.cssText = `
    font-size: 10px;
    font-weight: 700;
    color: #666;
  `;
  progressText.textContent = '0 / 13 Events Complete';
  progressContainer.appendChild(progressText);
  bottom.appendChild(progressContainer);

  dashboard.appendChild(bottom);
  document.body.appendChild(dashboard);
  CHRONICLE.currentDashboard = dashboard;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Create Event Button
// ════════════════════════════════════════════════════════════════════════════

function createEventButton(evt) {
  const btn = document.createElement('button');
  btn.style.cssText = `
    padding: 12px;
    border: 2px solid #000;
    border-radius: 3px;
    background: ${evt.completed ? '#d0d0d0' : evt.unlocked ? '#fff' : '#e0e0e0'};
    cursor: ${evt.unlocked ? 'pointer' : 'default'};
    font-family: ${CHRONICLE.FONT};
    font-size: 10px;
    font-weight: 700;
    text-align: center;
    transition: all 0.2s;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
  `;
  btn.textContent = evt.completed ? '✓' : evt.unlocked ? `E${evt.id}` : '🔒';

  if (evt.unlocked && !evt.completed) {
    btn.onmouseover = () => {
      btn.style.background = '#f0f0f0';
      btn.style.transform = 'scale(1.05)';
    };
    btn.onmouseout = () => {
      btn.style.background = '#fff';
      btn.style.transform = 'scale(1)';
    };
    btn.onclick = () => launchEvent(evt.id);
  }

  return btn;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Create Stat Box
// ════════════════════════════════════════════════════════════════════════════

function createStatBox(title, stats) {
  const box = document.createElement('div');
  box.style.cssText = `
    border: 3px solid #000;
    background: white;
    padding: 12px;
    border-radius: 3px;
    box-shadow: 3px 3px 8px rgba(0,0,0,0.15);
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 2px solid #000;
  `;
  titleEl.textContent = title;
  box.appendChild(titleEl);

  stats.forEach((stat) => {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 9px;
      font-weight: 700;
    `;

    const icon = document.createElement('img');
    icon.src = `${CHRONICLE.ASSET_PATH}${stat.icon}`;
    icon.style.cssText = `
      width: 16px;
      height: 16px;
      object-fit: contain;
    `;
    row.appendChild(icon);

    const text = document.createElement('div');
    text.textContent = `${stat.label}: ${stat.value}`;
    row.appendChild(text);

    box.appendChild(row);
  });

  return box;
}

// ════════════════════════════════════════════════════════════════════════════
// LAUNCH EVENT
// ════════════════════════════════════════════════════════════════════════════

function launchEvent(eventId) {
  playSound('SoundPlay.mp3', 0.6);
  // Music continues playing during gameplay
  // Game screen will be full-screen overlay
  console.log(`Launching event ${eventId}...`);
  // Game mechanics will be implemented here
}
