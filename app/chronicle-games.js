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
  playerStats: { joy: 85, fortCoins: 0, hammer: 0 },
  globalStats: { totalPlayers: 1247, battleWins: 3458 },
  currentGame: null,
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
  dashboard.style.cssText = `position: fixed; inset: 0; background: linear-gradient(135deg, #f5ead6 0%, #ede4d3 100%); z-index: 9999; display: flex; flex-direction: column; font-family: ${CHRONICLE.FONT}; overflow: hidden;`;

  // TOP BAR
  const topbar = document.createElement('div');
  topbar.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; background: rgba(0,0,0,0.05); border-bottom: 2px solid rgba(0,0,0,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.08);`;

  const title = document.createElement('div');
  title.style.cssText = `font-size: 20px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #2c2416;`;
  title.textContent = '⚔ The Fortized Grand Chronicle';
  topbar.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `width: 40px; height: 40px; background: #8b4513; color: #fff; border: none; border-radius: 6px; font-size: 24px; cursor: pointer; font-weight: 700; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.15);`;
  closeBtn.textContent = '✕';
  closeBtn.onmouseover = () => { closeBtn.style.background = '#6d3410'; closeBtn.style.transform = 'scale(1.05)'; };
  closeBtn.onmouseout = () => { closeBtn.style.background = '#8b4513'; closeBtn.style.transform = 'scale(1)'; };
  closeBtn.onclick = () => { pauseBgMusic(); dashboard.remove(); CHRONICLE.sessionStarted = false; };
  topbar.appendChild(closeBtn);
  dashboard.appendChild(topbar);

  const main = document.createElement('div');
  main.style.cssText = `display: flex; flex: 1; gap: 20px; padding: 20px; overflow: hidden;`;

  // LEFT PANEL - Events
  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = `width: 160px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 8px;`;
  leftPanel.style.scrollBehavior = 'smooth';

  const eventsTitle = document.createElement('div');
  eventsTitle.style.cssText = `font-size: 12px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #5d4e37; margin-bottom: 5px; padding: 0 10px;`;
  eventsTitle.textContent = 'Events';
  leftPanel.appendChild(eventsTitle);

  CHRONICLE.events.forEach((evt) => {
    const btn = document.createElement('button');
    btn.style.cssText = `position: relative; padding: 14px; background: #fff; border: 2px solid #d4a574; border-radius: 8px; cursor: ${evt.unlocked ? 'pointer' : 'default'}; font-family: ${CHRONICLE.FONT}; font-size: 13px; font-weight: 700; text-align: center; transition: all 0.2s; color: #2c2416; box-shadow: 0 2px 6px rgba(0,0,0,0.08); opacity: ${evt.unlocked ? '1' : '0.6'};`;

    if (evt.completed) {
      btn.textContent = `✓ ${evt.title}`;
      btn.style.background = '#d4f1d4';
      btn.style.borderColor = '#7cb342';
      btn.style.color = '#33691e';
    } else if (evt.unlocked) {
      btn.textContent = evt.title;
      btn.onmouseover = () => { btn.style.background = '#fef5e7'; btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; };
      btn.onmouseout = () => { btn.style.background = '#fff'; btn.style.transform = 'translateY(0)'; btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)'; };
      btn.onclick = () => launchEvent(evt.id);
    } else {
      btn.textContent = `🔒 Locked`;
      btn.style.color = '#999';
    }

    leftPanel.appendChild(btn);
  });

  main.appendChild(leftPanel);

  // CENTER PANEL - Game area
  const centerPanel = document.createElement('div');
  centerPanel.id = 'game-area';
  centerPanel.style.cssText = `flex: 1; background: linear-gradient(135deg, #e8dcc8 0%, #d9cebc 100%); position: relative; overflow: hidden; border-radius: 10px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.1);`;

  const mapImg = document.createElement('img');
  mapImg.src = `${CHRONICLE.ASSET_PATH}IRL Human World Map 1452.png`;
  mapImg.style.cssText = `width: 100%; height: 100%; object-fit: cover; opacity: 0.25;`;
  centerPanel.appendChild(mapImg);

  main.appendChild(centerPanel);

  // RIGHT PANEL - Stats
  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `width: 180px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; padding-left: 8px;`;

  function createCard(title, content, icon = null) {
    const card = document.createElement('div');
    card.style.cssText = `background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 2px solid #e5d5c0;`;

    const cardTitle = document.createElement('div');
    cardTitle.style.cssText = `font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #5d4e37; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #d4a574;`;
    cardTitle.textContent = title;
    card.appendChild(cardTitle);

    card.appendChild(content);
    return card;
  }

  // Player stats card
  const playerContent = document.createElement('div');
  playerContent.style.cssText = `display: flex; flex-direction: column; gap: 8px;`;
  [
    { icon: 'IconJesterHat.png', label: 'Joy', value: `${CHRONICLE.playerStats.joy}%` },
    { icon: 'IconCoin.png', label: 'FortCoin', value: CHRONICLE.playerStats.fortCoins },
    { icon: 'IconHammer.png', label: 'Hammer', value: CHRONICLE.playerStats.hammer }
  ].forEach(stat => {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #2c2416;`;
    const icon = document.createElement('img');
    icon.src = `${CHRONICLE.ASSET_PATH}${stat.icon}`;
    icon.style.cssText = `width: 18px; height: 18px; object-fit: contain;`;
    row.appendChild(icon);
    const label = document.createElement('span');
    label.textContent = stat.label;
    label.style.flex = '1';
    row.appendChild(label);
    const value = document.createElement('span');
    value.textContent = stat.value;
    value.style.fontWeight = '900';
    value.style.color = '#8b4513';
    row.appendChild(value);
    playerContent.appendChild(row);
  });
  rightPanel.appendChild(createCard('Player Stats', playerContent));

  // Global stats card
  const globalContent = document.createElement('div');
  globalContent.style.cssText = `display: flex; flex-direction: column; gap: 8px;`;
  [
    { icon: 'IconKnight.png', label: 'Players', value: CHRONICLE.globalStats.totalPlayers },
    { icon: 'IconSword.png', label: 'Victories', value: CHRONICLE.globalStats.battleWins }
  ].forEach(stat => {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #2c2416;`;
    const icon = document.createElement('img');
    icon.src = `${CHRONICLE.ASSET_PATH}${stat.icon}`;
    icon.style.cssText = `width: 18px; height: 18px; object-fit: contain;`;
    row.appendChild(icon);
    const label = document.createElement('span');
    label.textContent = stat.label;
    label.style.flex = '1';
    row.appendChild(label);
    const value = document.createElement('span');
    value.textContent = stat.value.toLocaleString();
    value.style.fontWeight = '900';
    value.style.color = '#8b4513';
    row.appendChild(value);
    globalContent.appendChild(row);
  });
  rightPanel.appendChild(createCard('Global', globalContent));

  // Battle Timer card
  const battleContent = document.createElement('div');
  battleContent.style.cssText = `text-align: center;`;
  const battleTime = document.createElement('div');
  battleTime.style.cssText = `font-size: 28px; font-weight: 900; color: #8b4513; margin-bottom: 6px;`;
  battleTime.textContent = '0:37';
  battleContent.appendChild(battleTime);
  const battleLabel = document.createElement('div');
  battleLabel.style.cssText = `font-size: 10px; color: #999;`;
  battleLabel.textContent = 'Next Battle';
  battleContent.appendChild(battleLabel);
  rightPanel.appendChild(createCard('⚔ Battle', battleContent));

  main.appendChild(rightPanel);
  dashboard.appendChild(main);

  // BOTTOM - Chapter info
  const bottom = document.createElement('div');
  bottom.style.cssText = `padding: 18px 30px; background: rgba(0,0,0,0.05); border-top: 2px solid rgba(0,0,0,0.1);`;

  const chapterLabel = document.createElement('div');
  chapterLabel.style.cssText = `font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #8b4513; margin-bottom: 6px;`;
  chapterLabel.textContent = '📖 CHAPTER I: The War of the Shattered Pact';
  bottom.appendChild(chapterLabel);

  const chapterDesc = document.createElement('div');
  chapterDesc.style.cssText = `font-size: 12px; line-height: 1.6; color: #5d4e37; margin-bottom: 12px;`;
  chapterDesc.textContent = 'The Treaty of the Silver Stream lies broken. Vastilly\'s banners march east — and you, a knight of the realm, are called to serve.';
  bottom.appendChild(chapterDesc);

  const progressBar = document.createElement('div');
  progressBar.style.cssText = `width: 100%; height: 20px; background: #fff; border: 2px solid #d4a574; border-radius: 6px; overflow: hidden; margin-bottom: 8px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);`;
  const progressFill = document.createElement('div');
  progressFill.style.cssText = `height: 100%; background: linear-gradient(90deg, #7cb342 0%, #558b2f 100%); width: 8%;`;
  progressBar.appendChild(progressFill);
  bottom.appendChild(progressBar);

  const progressText = document.createElement('div');
  progressText.style.cssText = `font-size: 11px; font-weight: 700; color: #8b4513;`;
  progressText.textContent = '1 / 13 Events Complete';
  bottom.appendChild(progressText);

  dashboard.appendChild(bottom);
  document.body.appendChild(dashboard);
}

function launchEvent(eventId) {
  playSound('SoundPlay.mp3', 0.6);
  const gameArea = document.getElementById('game-area');
  if (!gameArea) return;

  // Clear game area
  gameArea.innerHTML = '';

  // Create game screen in game area
  const gameScreen = document.createElement('div');
  gameScreen.style.cssText = `position: absolute; inset: 0; background: linear-gradient(135deg, #1a3a52 0%, #2c5282 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff;`;

  const title = document.createElement('div');
  title.style.cssText = `font-size: 20px; font-weight: 700; margin-bottom: 20px; font-family: ${CHRONICLE.FONT}; text-transform: uppercase;`;
  title.textContent = `Event ${eventId}: ${CHRONICLE.events[eventId - 1].title}`;
  gameScreen.appendChild(title);

  const content = document.createElement('div');
  content.id = `game-content-${eventId}`;
  content.style.cssText = `flex: 1; display: flex; align-items: center; justify-content: center; width: 100%;`;
  gameScreen.appendChild(content);

  const returnBtn = document.createElement('button');
  returnBtn.style.cssText = `padding: 12px 30px; background: #4ade80; color: #000; border: 3px solid #fff; font-family: ${CHRONICLE.FONT}; font-weight: 700; font-size: 12px; cursor: pointer; border-radius: 4px; margin-bottom: 20px;`;
  returnBtn.textContent = '← Return';
  returnBtn.onclick = () => {
    CHRONICLE.currentGame = null;
    gameArea.innerHTML = '';
    const mapImg = document.createElement('img');
    mapImg.src = `${CHRONICLE.ASSET_PATH}IRL Human World Map 1452.png`;
    mapImg.style.cssText = `width: 100%; height: 100%; object-fit: cover; opacity: 0.35;`;
    gameArea.appendChild(mapImg);
  };
  gameScreen.appendChild(returnBtn);

  gameArea.appendChild(gameScreen);
  CHRONICLE.currentGame = eventId;

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
  let dialogueIndex = 0;
  const dialogues = [
    { char: 'Cardinal Wealthplace', text: 'The Treaty of the Silver Stream is shattered...', img: 'Wealthplace.png' },
    { char: 'Cardinal Wealthplace', text: 'What counsel do you offer, noble knight?', img: 'Wealthplace.png' },
    { char: 'Cardinal Wealthplace', text: 'Our fate rests in your hands.', img: 'Wealthplace.png' }
  ];

  function render() {
    container.innerHTML = '';

    if (dialogueIndex >= dialogues.length) {
      container.innerHTML = '<div style="color: #fff; font-family: ' + CHRONICLE.FONT + '; text-align: center;"><div style="font-size: 32px; font-weight: 900; margin-bottom: 10px;">✓ Event Complete!</div></div>';
      CHRONICLE.events[0].completed = true;
      playSound('SoundWin.mp3', 0.6);
      return;
    }

    const d = dialogues[dialogueIndex];
    const box = document.createElement('div');
    box.style.cssText = `display: flex; gap: 15px; align-items: center; background: rgba(0,0,0,0.6); padding: 20px; border-radius: 4px; border: 2px solid #fff; width: 80%; max-width: 600px;`;

    const portrait = document.createElement('img');
    portrait.src = `${CHRONICLE.ASSET_PATH}${d.img}`;
    portrait.style.cssText = `height: 120px; width: auto; border: 2px solid #fff;`;
    box.appendChild(portrait);

    const textBox = document.createElement('div');
    textBox.style.cssText = `color: #fff; flex: 1;`;
    const charName = document.createElement('div');
    charName.style.cssText = `font-weight: 700; color: #FFD700; margin-bottom: 8px; font-family: ${CHRONICLE.FONT}; text-transform: uppercase;`;
    charName.textContent = d.char;
    textBox.appendChild(charName);

    const dialogue = document.createElement('div');
    dialogue.style.cssText = `font-size: 14px; line-height: 1.6; font-family: ${CHRONICLE.FONT};`;
    dialogue.textContent = d.text;
    textBox.appendChild(dialogue);

    const continueBtn = document.createElement('button');
    continueBtn.style.cssText = `margin-top: 10px; padding: 8px 16px; background: #FFD700; color: #000; border: 2px solid #000; border-radius: 2px; font-family: ${CHRONICLE.FONT}; font-weight: 700; cursor: pointer; font-size: 11px;`;
    continueBtn.textContent = 'Continue →';
    continueBtn.onclick = () => { dialogueIndex++; render(); };
    textBox.appendChild(continueBtn);

    box.appendChild(textBox);
    container.appendChild(box);
  }

  render();
}

function gameEvent2(container) {
  let caught = 0;
  const needed = 5;

  container.innerHTML = `<div style="color: #fff; text-align: center; font-family: ${CHRONICLE.FONT};"><div style="font-size: 14px; margin-bottom: 15px;">Click to catch falling items!</div><div style="font-size: 12px; margin-bottom: 20px;">Caught: <span id="caught-count">0</span>/${needed}</div></div>`;

  const btn = document.createElement('button');
  btn.style.cssText = `width: 100px; height: 100px; background: #FFD700; border: 3px solid #fff; border-radius: 50%; font-size: 32px; cursor: pointer; transition: all 0.1s;`;
  btn.textContent = '💰';

  btn.onclick = () => {
    caught++;
    btn.style.transform = 'scale(0.9)';
    playSound('SoundCoin.mp3', 0.4);
    setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);

    document.getElementById('caught-count').textContent = caught;

    if (caught >= needed) {
      btn.disabled = true;
      container.innerHTML = '<div style="color: #fff; font-family: ' + CHRONICLE.FONT + '; text-align: center;"><div style="font-size: 32px; font-weight: 900; margin-bottom: 10px;">✓ Raid Successful!</div></div>';
      CHRONICLE.events[1].completed = true;
      playSound('SoundWin.mp3', 0.6);
    }
  };

  container.appendChild(btn);
}

function simpleGame(container, eventId, title, clicks) {
  let clicked = 0;
  const btn = document.createElement('button');
  btn.style.cssText = `width: 120px; height: 120px; background: #FFD700; border: 4px solid #fff; border-radius: 50%; font-size: 36px; cursor: pointer; transition: all 0.1s; box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);`;
  btn.textContent = '⚔';

  const progress = document.createElement('div');
  progress.style.cssText = `color: #fff; font-family: ${CHRONICLE.FONT}; font-size: 14px; margin-top: 15px;`;
  progress.textContent = `${clicked}/${clicks}`;

  btn.onclick = () => {
    clicked++;
    btn.style.transform = 'scale(0.9)';
    playSound('SoundCoin.mp3', 0.4);
    setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);

    progress.textContent = `${clicked}/${clicks}`;

    if (clicked >= clicks) {
      btn.disabled = true;
      container.innerHTML = '<div style="color: #fff; font-family: ' + CHRONICLE.FONT + '; text-align: center;"><div style="font-size: 32px; font-weight: 900; margin-bottom: 10px;">✓ Complete!</div></div>';
      CHRONICLE.events[eventId - 1].completed = true;
      playSound('SoundWin.mp3', 0.6);
    }
  };

  container.appendChild(btn);
  container.appendChild(progress);
}
