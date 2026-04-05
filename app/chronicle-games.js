/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - STEP BY STEP REBUILD
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CHRONICLE = {
  ASSET_PATH: '/app/Chronicle/chapter1/assets/',
  sessionStarted: false,
  introPlayed: false
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

function openGrandChronicle() {
  if (!CHRONICLE.sessionStarted) {
    showChronicleMenu();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MENU SCREEN
// ════════════════════════════════════════════════════════════════════════════

function showChronicleMenu() {
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
    font-family: 'MedievalSharp', cursive;
    overflow: hidden;
  `;

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
  const logo = document.createElement('img');
  logo.src = `${CHRONICLE.ASSET_PATH}Grand Joy Games.png`;
  logo.style.cssText = `
    height: 60px;
    width: auto;
    filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
  `;
  content.appendChild(logo);

  // Title
  const titleImg = document.createElement('img');
  titleImg.src = `${CHRONICLE.ASSET_PATH}Chap1Title.png`;
  titleImg.style.cssText = `
    height: 120px;
    width: auto;
    max-width: 100%;
    filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
  `;
  content.appendChild(titleImg);

  // Continue button
  const continueBtn = document.createElement('button');
  continueBtn.style.cssText = `
    background: #000;
    color: white;
    border: 3px solid #000;
    padding: 18px 45px;
    font-family: 'MedievalSharp', cursive;
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
    menu.remove();
    CHRONICLE.sessionStarted = true;
    await showChronicleIntro();
    showChronicleDashboard();
  };
  content.appendChild(continueBtn);

  menu.appendChild(content);

  // RIGHT SIDE: Caravan image
  const caravan = document.createElement('img');
  caravan.src = `${CHRONICLE.ASSET_PATH}Caravan.png`;
  caravan.style.cssText = `
    height: 80%;
    width: auto;
    object-fit: contain;
    opacity: 0.9;
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
      top: 20px;
      right: 20px;
      background: white;
      color: #000;
      border: 2px solid white;
      padding: 10px 20px;
      font-family: 'MedievalSharp', cursive;
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
  const dashboard = document.createElement('div');
  dashboard.id = 'chronicle-dashboard';
  dashboard.style.cssText = `
    position: fixed;
    inset: 0;
    background: white;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    font-family: 'MedievalSharp', cursive;
    overflow: hidden;
  `;

  // Top bar
  const topbar = document.createElement('div');
  topbar.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 3px solid #000;
    background: #f5f5f5;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 2px;
  `;
  title.textContent = 'THE FORTIZED GRAND CHRONICLE';
  topbar.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    width: 40px;
    height: 40px;
    background: #000;
    color: white;
    border: 2px solid #000;
    border-radius: 4px;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `;
  closeBtn.textContent = '✕';
  closeBtn.onmouseover = () => closeBtn.style.background = '#333';
  closeBtn.onmouseout = () => closeBtn.style.background = '#000';
  closeBtn.onclick = () => dashboard.remove();
  topbar.appendChild(closeBtn);

  dashboard.appendChild(topbar);

  // Main content area
  const mainContent = document.createElement('div');
  mainContent.style.cssText = `
    display: flex;
    flex: 1;
    gap: 20px;
    padding: 20px;
    overflow: hidden;
  `;

  // LEFT SIDEBAR - Map/Events
  const leftSidebar = document.createElement('div');
  leftSidebar.style.cssText = `
    width: 150px;
    border: 3px solid #000;
    border-radius: 4px;
    background: #f5f5f5;
    overflow-y: auto;
    padding: 10px;
  `;

  // Add placeholder event boxes
  for (let i = 0; i < 6; i++) {
    const eventBox = document.createElement('div');
    eventBox.style.cssText = `
      height: 80px;
      border: 2px solid #000;
      background: white;
      margin-bottom: 10px;
      border-radius: 2px;
    `;
    leftSidebar.appendChild(eventBox);
  }

  mainContent.appendChild(leftSidebar);

  // CENTER - Main map area
  const centerArea = document.createElement('div');
  centerArea.style.cssText = `
    flex: 1;
    border: 3px solid #000;
    border-radius: 4px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  `;

  const mapImg = document.createElement('img');
  mapImg.src = `${CHRONICLE.ASSET_PATH}IRL Human World Map 1452.png`;
  mapImg.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.3;
  `;
  centerArea.appendChild(mapImg);

  mainContent.appendChild(centerArea);

  // RIGHT SIDEBAR - War Orders & Events
  const rightSidebar = document.createElement('div');
  rightSidebar.style.cssText = `
    width: 180px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  `;

  // War Orders box
  const warOrdersBox = document.createElement('div');
  warOrdersBox.style.cssText = `
    border: 2px solid #000;
    padding: 10px;
    border-radius: 4px;
    background: white;
  `;
  const warOrdersTitle = document.createElement('div');
  warOrdersTitle.style.cssText = `
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  `;
  warOrdersTitle.textContent = '📋 War Orders';
  warOrdersBox.appendChild(warOrdersTitle);
  rightSidebar.appendChild(warOrdersBox);

  // Battle box
  const battleBox = document.createElement('div');
  battleBox.style.cssText = `
    border: 2px solid #000;
    padding: 10px;
    border-radius: 4px;
    background: white;
  `;
  const battleTitle = document.createElement('div');
  battleTitle.style.cssText = `
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
  `;
  battleTitle.textContent = '⚔ Battle';
  const battleTimer = document.createElement('div');
  battleTimer.style.cssText = `
    font-size: 24px;
    font-weight: 700;
    color: #000;
    text-align: center;
  `;
  battleTimer.textContent = '0:37';
  battleBox.appendChild(battleTitle);
  battleBox.appendChild(battleTimer);
  rightSidebar.appendChild(battleBox);

  // Event cards
  for (let i = 0; i < 5; i++) {
    const eventCard = document.createElement('div');
    eventCard.style.cssText = `
      border: 2px solid #ccc;
      padding: 8px;
      border-radius: 2px;
      background: #f9f9f9;
      min-height: 60px;
    `;
    rightSidebar.appendChild(eventCard);
  }

  mainContent.appendChild(rightSidebar);

  dashboard.appendChild(mainContent);

  // Bottom info section
  const bottomSection = document.createElement('div');
  bottomSection.style.cssText = `
    border-top: 3px solid #000;
    padding: 15px;
    background: #f5f5f5;
  `;

  const chapterLabel = document.createElement('div');
  chapterLabel.style.cssText = `
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #666;
    margin-bottom: 5px;
  `;
  chapterLabel.textContent = 'CHAPTER I';
  bottomSection.appendChild(chapterLabel);

  const chapterTitle = document.createElement('div');
  chapterTitle.style.cssText = `
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
  `;
  chapterTitle.textContent = 'The War of the Shattered Pact';
  bottomSection.appendChild(chapterTitle);

  const chapterDesc = document.createElement('div');
  chapterDesc.style.cssText = `
    font-size: 12px;
    line-height: 1.5;
    color: #333;
    margin-bottom: 10px;
  `;
  chapterDesc.textContent = 'The Treaty of the Silver Stream lies broken. Vastilly\'s banners march east — and you, a knight of the realm, are called to serve.';
  bottomSection.appendChild(chapterDesc);

  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    width: 100%;
    height: 20px;
    border: 2px solid #000;
    background: white;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 5px;
  `;
  const progressFill = document.createElement('div');
  progressFill.style.cssText = `
    height: 100%;
    background: #000;
    width: 0%;
  `;
  progressBar.appendChild(progressFill);
  bottomSection.appendChild(progressBar);

  const progressText = document.createElement('div');
  progressText.style.cssText = `
    font-size: 11px;
    font-weight: 700;
    color: #666;
  `;
  progressText.textContent = '0 / 13 Events Complete';
  bottomSection.appendChild(progressText);

  dashboard.appendChild(bottomSection);

  document.body.appendChild(dashboard);
}
