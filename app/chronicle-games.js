/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - DISCORD-STYLE NARRATIVE GAMES
 * ═══════════════════════════════════════════════════════════════════════════════
 * Clean card-based UI with sketch artwork and proper character integration
 */

const ASSET = '/app/Chronicle/chapter1/assets/';
const FONT = "'MedievalSharp', cursive";

let bgMusic = null;
let menuShown = false;

// ════════════════════════════════════════════════════════════════════════════
// AUDIO SYSTEM
// ════════════════════════════════════════════════════════════════════════════

function sound(file) {
  const audio = new Audio(ASSET + file);
  audio.volume = 0.4;
  audio.play().catch(() => {});
}

function bgMusicStart() {
  if (!bgMusic) {
    bgMusic = new Audio(ASSET + 'Chapter 1 Theme Song.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
  }
  bgMusic.play().catch(() => {});
}

function bgMusicStop() {
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GAME LAUNCHER
// ════════════════════════════════════════════════════════════════════════════

async function launchChronicleMinigame(eventId) {
  if (!menuShown) {
    await showGameMenu(eventId);
    return;
  }

  if (typeof canPlayGame === 'function' && !canPlayGame()) return;

  sound('SoundPlay.mp3');
  bgMusicStart();

  const games = {
    1: () => gameDialogue(eventId, 'BREAKING TREATY', 'Wealthplace.png', [
      'The treaty is shattered...',
      'What is your counsel, knight?',
      'Our fate awaits your decision.'
    ], 30),
    2: () => gameCatch(eventId),
    3: () => gameInferno(eventId),
    4: () => gameLumber(eventId),
    5: () => gameDuel(eventId),
    6: () => gameBoat(eventId),
    7: () => gameTrade(eventId),
    8: () => gameSiege(eventId),
  };

  const game = games[eventId] || (() => gamePlaceholder(eventId));
  await game();
}

// ════════════════════════════════════════════════════════════════════════════
// GAME MENU - DISCORD CARD STYLE
// ════════════════════════════════════════════════════════════════════════════

async function showGameMenu(eventId) {
  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed; inset: 0; background: #f5f5f5;
    z-index: 10000; display: flex; align-items: center;
    justify-content: center; font-family: ${FONT};
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: white; border: 2px solid #000;
    border-radius: 12px; padding: 40px; max-width: 600px;
    width: 90%; box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    display: flex; flex-direction: column; gap: 20px;
  `;

  // Logo
  const logo = document.createElement('img');
  logo.src = ASSET + 'Grand Joy Games.png';
  logo.style.cssText = `height: 60px; width: auto; align-self: center;`;
  card.appendChild(logo);

  // Title
  const title = document.createElement('img');
  title.src = ASSET + 'Chap1Title.png';
  title.style.cssText = `height: 100px; width: auto; align-self: center;`;
  card.appendChild(title);

  // Description
  const desc = document.createElement('p');
  desc.style.cssText = `
    margin: 0; color: #333; text-align: center;
    font-size: 14px; line-height: 1.6;
  `;
  desc.textContent = 'The kingdom awaits your courage. Begin your journey through dangerous lands.';
  card.appendChild(desc);

  // Button
  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #000; color: white; border: none;
    padding: 14px 32px; border-radius: 6px; font-family: ${FONT};
    font-size: 16px; font-weight: 700; cursor: pointer;
    text-transform: uppercase; letter-spacing: 1px;
    transition: all 0.2s; align-self: center;
  `;
  btn.textContent = 'Begin Game';
  btn.onmouseover = () => btn.style.opacity = '0.9';
  btn.onmouseout = () => btn.style.opacity = '1';
  btn.onclick = async () => {
    sound('SoundUiSelect.mp3');
    menu.remove();
    menuShown = true;
    await showIntro();
    launchChronicleMinigame(eventId);
  };
  card.appendChild(btn);

  menu.appendChild(card);
  document.body.appendChild(menu);
}

// ════════════════════════════════════════════════════════════════════════════
// INTRO VIDEO
// ════════════════════════════════════════════════════════════════════════════

async function showIntro() {
  return new Promise((resolve) => {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: fixed; inset: 0; background: #000;
      z-index: 10000; display: flex; align-items: center;
      justify-content: center;
    `;

    const video = document.createElement('video');
    video.src = ASSET + 'FTZchap1-Intro.mp4';
    video.style.cssText = `width: 100%; height: 100%; object-fit: cover;`;
    video.autoplay = true;
    video.onended = () => {
      screen.remove();
      resolve();
    };

    const skip = document.createElement('button');
    skip.style.cssText = `
      position: absolute; top: 20px; right: 20px;
      background: white; color: #000; border: none;
      padding: 8px 16px; border-radius: 6px; font-family: ${FONT};
      font-weight: 700; cursor: pointer; z-index: 10;
      font-size: 12px; text-transform: uppercase;
    `;
    skip.textContent = 'SKIP';
    skip.onclick = () => {
      video.pause();
      screen.remove();
      resolve();
    };

    screen.appendChild(video);
    screen.appendChild(skip);
    document.body.appendChild(screen);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// DIALOGUE GAME - ENHANCED WITH ANIMATIONS & CHARACTER PERSONALITY
// ════════════════════════════════════════════════════════════════════════════

async function gameDialogue(eventId, title, npcImage, dialogues, reward) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    font-family: ${FONT}; padding: 20px; backdrop-filter:none;
  `;

  let idx = 0;

  function render() {
    screen.innerHTML = '';

    if (idx >= dialogues.length) {
      const endScreen = document.createElement('div');
      endScreen.style.cssText = `
        position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
        z-index: 10001; display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.5s ease-out;
      `;

      const endCard = document.createElement('div');
      endCard.style.cssText = `
        background: white; border: 3px solid #FFD700;
        border-radius: 16px; padding: 50px; max-width: 500px;
        width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        text-align: center; animation: slideUp 0.6s ease-out;
      `;

      const endTitle = document.createElement('h2');
      endTitle.style.cssText = `
        margin: 0 0 20px 0; font-size: 32px; color: #000;
        text-transform: uppercase; letter-spacing: 2px;
      `;
      endTitle.textContent = 'COUNSEL ACCEPTED';
      endCard.appendChild(endTitle);

      const endMsg = document.createElement('p');
      endMsg.style.cssText = `
        margin: 0 0 30px 0; color: #333; font-size: 16px;
        line-height: 1.8;
      `;
      endMsg.textContent = 'Your wisdom guides the realm forward.';
      endCard.appendChild(endMsg);

      const rewardDisplay = document.createElement('div');
      rewardDisplay.style.cssText = `
        background: #FFF8DC; border: 2px solid #FFD700;
        border-radius: 8px; padding: 15px; margin-bottom: 20px;
        font-size: 18px; font-weight: 700; color: #FFD700;
      `;
      rewardDisplay.textContent = `+${reward} FortCoins`;
      endCard.appendChild(rewardDisplay);

      endScreen.appendChild(endCard);
      document.body.appendChild(endScreen);

      setTimeout(() => {
        screen.remove();
        endScreen.remove();
        bgMusicStop();
        sound('SoundWin.mp3');
        markEventComplete(eventId, reward);
        toast('✓ Dialogue complete!', 'success');
      }, 2000);
      return;
    }

    const card = document.createElement('div');
    card.style.cssText = `
      background: white; border: 3px solid #FFD700;
      border-radius: 16px; padding: 30px; max-width: 800px;
      width: 95%; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: flex; gap: 25px; animation: slideUp 0.5s ease-out;
    `;

    // Character container
    const charContainer = document.createElement('div');
    charContainer.style.cssText = `
      flex-shrink: 0; position: relative; width: 220px;
    `;

    // Character portrait background
    const portraitBg = document.createElement('div');
    portraitBg.style.cssText = `
      width: 220px; height: 220px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      border-radius: 12px; padding: 3px; box-shadow: inset 0 0 15px rgba(0,0,0,0.1);
    `;

    const npc = document.createElement('img');
    npc.src = ASSET + npcImage;
    npc.style.cssText = `
      height: 100%; width: 100%; object-fit: cover; border-radius: 10px;
      display: block; background: #f5f5f5;
    `;
    portraitBg.appendChild(npc);
    charContainer.appendChild(portraitBg);

    // Character name badge
    const nameBadge = document.createElement('div');
    nameBadge.style.cssText = `
      background: #000; color: #FFD700; padding: 8px 12px;
      border-radius: 6px; text-align: center; margin-top: 12px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px;
    `;
    nameBadge.textContent = 'Cardinal Wealthplace';
    charContainer.appendChild(nameBadge);

    card.appendChild(charContainer);

    // Text content
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1; display: flex; flex-direction: column; justify-content: space-between;
    `;

    // Progress indicator
    const progress = document.createElement('div');
    progress.style.cssText = `
      display: flex; gap: 6px; margin-bottom: 15px;
    `;
    for (let i = 0; i < dialogues.length; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 8px; height: 8px; border-radius: 50%;
        background: ${i <= idx ? '#000' : '#ddd'};
        transition: all 0.3s;
      `;
      progress.appendChild(dot);
    }
    content.appendChild(progress);

    // Dialogue text with animation
    const text = document.createElement('p');
    text.style.cssText = `
      margin: 0 0 25px 0; color: #333; font-size: 16px;
      line-height: 1.8; min-height: 60px; animation: fadeIn 0.6s ease-out;
    `;
    text.textContent = dialogues[idx];
    content.appendChild(text);

    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex; gap: 10px;
    `;

    const btn = document.createElement('button');
    btn.style.cssText = `
      background: #000; color: #FFD700; border: 2px solid #FFD700;
      padding: 12px 28px; border-radius: 8px; font-family: ${FONT};
      font-weight: 700; cursor: pointer; text-transform: uppercase;
      font-size: 12px; letter-spacing: 1px; transition: all 0.3s;
      flex: 1;
    `;
    btn.textContent = idx === dialogues.length - 1 ? '✓ FINISH' : '→ CONTINUE';
    btn.onmouseover = () => {
      btn.style.background = '#FFD700';
      btn.style.color = '#000';
      btn.style.transform = 'scale(1.05)';
    };
    btn.onmouseout = () => {
      btn.style.background = '#000';
      btn.style.color = '#FFD700';
      btn.style.transform = 'scale(1)';
    };
    btn.onclick = () => {
      sound('SoundUiSelect.mp3');
      idx++;
      render();
    };
    btnContainer.appendChild(btn);

    // Skip button
    if (idx < dialogues.length - 1) {
      const skipBtn = document.createElement('button');
      skipBtn.style.cssText = `
        background: transparent; color: #666; border: 2px solid #ddd;
        padding: 12px 20px; border-radius: 8px; font-family: ${FONT};
        font-weight: 700; cursor: pointer; text-transform: uppercase;
        font-size: 11px; transition: all 0.3s;
      `;
      skipBtn.textContent = 'SKIP';
      skipBtn.onmouseover = () => {
        skipBtn.style.borderColor = '#000';
        skipBtn.style.color = '#000';
      };
      skipBtn.onmouseout = () => {
        skipBtn.style.borderColor = '#ddd';
        skipBtn.style.color = '#666';
      };
      skipBtn.onclick = () => {
        sound('SoundUiSelect.mp3');
        idx = dialogues.length;
        render();
      };
      btnContainer.appendChild(skipBtn);
    }

    content.appendChild(btnContainer);

    // Add style animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    card.appendChild(content);
    screen.appendChild(card);
  }

  render();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// CATCH GAME
// ════════════════════════════════════════════════════════════════════════════

async function gameCatch(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: white;
    z-index: 9999; display: flex; flex-direction: column;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    player: { x: w / 2, y: h - 60, w: 40, h: 40, gold: 0 },
    items: [],
    time: 30,
    active: true
  };

  for (let i = 0; i < 3; i++) {
    game.items.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.4),
      w: 25,
      h: 25,
      vy: 2 + Math.random(),
      type: Math.random() > 0.3 ? 'gold' : 'danger'
    });
  }

  document.addEventListener('mousemove', (e) => {
    game.player.x = Math.max(0, Math.min(w - game.player.w, e.clientX - game.player.w / 2));
  });

  function update() {
    if (!game.active) return;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, w, h);

    game.items = game.items.filter(item => {
      item.y += item.vy;
      if (item.y + item.h > game.player.y &&
          item.y < game.player.y + game.player.h &&
          item.x + item.w > game.player.x &&
          item.x < game.player.x + game.player.w) {
        if (item.type === 'gold') {
          game.gold += 10;
          sound('SoundCoin.mp3');
        }
        return false;
      }
      return item.y < h;
    });

    if (Math.random() < 0.02) {
      game.items.push({
        x: Math.random() * w,
        y: -25,
        w: 25,
        h: 25,
        vy: 2 + Math.random(),
        type: Math.random() > 0.3 ? 'gold' : 'danger'
      });
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);

    game.items.forEach(item => {
      ctx.fillStyle = item.type === 'gold' ? '#FFD700' : '#FF6B6B';
      ctx.fillRect(item.x, item.y, item.w, item.h);
    });

    ctx.fillStyle = '#000';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`GOLD: ${game.gold}`, 20, 30);
    ctx.fillText(`TIME: ${Math.ceil(game.time)}s`, w - 150, 30);

    game.time -= 1 / 60;
    if (game.time <= 0) endGame();
    else requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    bgMusicStop();
    if (game.gold >= 100) {
      sound('SoundWin.mp3');
      markEventComplete(eventId, game.gold);
      toast('✓ Raid successful!', 'success');
    } else {
      sound('SoundLose.mp3');
      toast('✗ Not enough gold.', 'error');
    }
  }

  update();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 3: BURNING ELOWEN - DODGE & COLLECT
// ════════════════════════════════════════════════════════════════════════════

async function gameInferno(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: #1a1a1a;
    z-index: 9999; display: flex; flex-direction: column;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    knight: { x: w / 2, y: h - 60, w: 40, h: 50, lives: 3 },
    enemies: [],
    time: 40,
    score: 0,
    active: true
  };

  for (let i = 0; i < 2; i++) {
    game.enemies.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.4),
      w: 30,
      h: 30,
      vy: 2 + Math.random(),
      type: 'fire'
    });
  }

  document.addEventListener('mousemove', (e) => {
    game.knight.x = Math.max(0, Math.min(w - game.knight.w, e.clientX - game.knight.w / 2));
  });

  function update() {
    if (!game.active) return;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Fire gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255, 100, 0, 0.1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Update enemies
    game.enemies = game.enemies.filter(enemy => {
      enemy.y += enemy.vy;

      if (enemy.y + enemy.h > game.knight.y &&
          enemy.y < game.knight.y + game.knight.h &&
          enemy.x + enemy.w > game.knight.x &&
          enemy.x < game.knight.x + game.knight.w) {
        game.knight.lives--;
        sound('SoundLose.mp3');
        if (game.knight.lives <= 0) {
          endGame();
          return false;
        }
        return false;
      }
      return enemy.y < h;
    });

    if (Math.random() < 0.04) {
      game.enemies.push({
        x: Math.random() * w,
        y: -30,
        w: 30,
        h: 30,
        vy: 3 + Math.random() * 2,
        type: 'fire'
      });
    }

    // Draw knight
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(game.knight.x, game.knight.y, game.knight.w, game.knight.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(game.knight.x, game.knight.y, game.knight.w, game.knight.h);

    // Draw enemies (fire)
    game.enemies.forEach(enemy => {
      ctx.fillStyle = '#FF6347';
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.w - 10, enemy.h - 10);
    });

    // UI
    ctx.fillStyle = '#FFF';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`LIVES: ${game.knight.lives}`, 20, 30);
    ctx.fillText(`TIME: ${Math.ceil(game.time)}s`, w - 150, 30);

    game.time -= 1 / 60;
    if (game.time <= 0) endGame();
    else requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    bgMusicStop();
    if (game.knight.lives > 0) {
      sound('SoundWin.mp3');
      markEventComplete(eventId, 40);
      toast('✓ Escaped the inferno!', 'success');
    } else {
      sound('SoundLose.mp3');
      toast('✗ Consumed by flames.', 'error');
    }
  }

  update();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 4: TIMBER ROADS - COLLECT & NAVIGATE
// ════════════════════════════════════════════════════════════════════════════

async function gameLumber(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: #8B7355;
    z-index: 9999; display: flex; flex-direction: column;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    cart: { x: w / 2, y: h - 60, w: 50, h: 40, wood: 0 },
    trees: [],
    obstacles: [],
    time: 35,
    active: true
  };

  for (let i = 0; i < 5; i++) {
    game.trees.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.6),
      w: 30,
      h: 40,
      collected: false
    });
  }

  for (let i = 0; i < 3; i++) {
    game.obstacles.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.5),
      w: 40,
      h: 20,
      vy: 1 + Math.random()
    });
  }

  document.addEventListener('mousemove', (e) => {
    game.cart.x = Math.max(0, Math.min(w - game.cart.w, e.clientX - game.cart.w / 2));
  });

  function update() {
    if (!game.active) return;

    // Background
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(0, 0, w, h);

    // Grass
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, h - 80, w, 80);

    // Collect trees
    game.trees = game.trees.filter(tree => {
      if (!tree.collected &&
          tree.x + tree.w > game.cart.x &&
          tree.x < game.cart.x + game.cart.w &&
          tree.y + tree.h > game.cart.y) {
        game.cart.wood += 15;
        sound('SoundCoin.mp3');
        return false;
      }
      return true;
    });

    // Move obstacles
    game.obstacles.forEach(obs => {
      obs.y += obs.vy;
      if (obs.y + obs.h > game.cart.y &&
          obs.y < game.cart.y + game.cart.h &&
          obs.x + obs.w > game.cart.x &&
          obs.x < game.cart.x + game.cart.w) {
        game.cart.wood -= 10;
        if (game.cart.wood < 0) game.cart.wood = 0;
        sound('SoundLose.mp3');
      }
    });

    game.obstacles = game.obstacles.filter(obs => obs.y < h);

    if (Math.random() < 0.03) {
      game.obstacles.push({
        x: Math.random() * w,
        y: -20,
        w: 40,
        h: 20,
        vy: 2 + Math.random()
      });
    }

    // Draw cart
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(game.cart.x, game.cart.y, game.cart.w, game.cart.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(game.cart.x, game.cart.y, game.cart.w, game.cart.h);

    // Draw trees
    game.trees.forEach(tree => {
      ctx.fillStyle = '#228B22';
      ctx.fillRect(tree.x, tree.y, tree.w, tree.h);
      ctx.fillStyle = '#32CD32';
      ctx.fillRect(tree.x + 5, tree.y + 5, tree.w - 10, tree.h - 10);
    });

    // Draw obstacles (rocks)
    game.obstacles.forEach(obs => {
      ctx.fillStyle = '#696969';
      ctx.beginPath();
      ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // UI
    ctx.fillStyle = '#000';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`WOOD: ${game.cart.wood}`, 20, 30);
    ctx.fillText(`TIME: ${Math.ceil(game.time)}s`, w - 150, 30);

    game.time -= 1 / 60;
    if (game.time <= 0) endGame();
    else requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    bgMusicStop();
    if (game.cart.wood >= 50) {
      sound('SoundWin.mp3');
      markEventComplete(eventId, Math.floor(game.cart.wood * 0.8));
      toast('✓ Lumber collected!', 'success');
    } else {
      sound('SoundLose.mp3');
      toast('✗ Not enough timber.', 'error');
    }
  }

  update();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 5: COMBAT - SWORD DUEL
// ════════════════════════════════════════════════════════════════════════════

async function gameDuel(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: #2C2C2C;
    z-index: 9999; display: flex; flex-direction: column;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    knight: { x: w / 3, y: h / 2, hp: 5, attacking: false, combo: 0 },
    enemy: { x: (w * 2) / 3, y: h / 2, hp: 5, attacking: false },
    time: 45,
    active: true
  };

  document.addEventListener('click', () => {
    if (game.active && !game.knight.attacking) {
      game.knight.attacking = true;
      game.knight.combo++;
      if (Math.random() > 0.4) {
        game.enemy.hp -= game.knight.combo;
        sound('SoundCoin.mp3');
      }
      setTimeout(() => { game.knight.attacking = false; }, 300);
    }
  });

  function update() {
    if (!game.active) return;

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    // Enemy AI
    if (Math.random() < 0.02 && !game.enemy.attacking) {
      game.enemy.attacking = true;
      if (Math.random() > 0.5) {
        game.knight.hp--;
        sound('SoundLose.mp3');
      }
      setTimeout(() => { game.enemy.attacking = false; }, 400);
    }

    if (game.enemy.hp <= 0 || game.knight.hp <= 0) {
      endGame();
      return;
    }

    // Draw knight
    ctx.fillStyle = game.knight.attacking ? '#FFD700' : '#FFB6C1';
    ctx.fillRect(game.knight.x - 20, game.knight.y - 30, 40, 60);
    ctx.fillStyle = '#000';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText('YOU', game.knight.x - 15, game.knight.y + 50);

    // Draw enemy
    ctx.fillStyle = game.enemy.attacking ? '#FF6B6B' : '#DC143C';
    ctx.fillRect(game.enemy.x - 20, game.enemy.y - 30, 40, 60);
    ctx.fillStyle = '#000';
    ctx.fillText('FOE', game.enemy.x - 15, game.enemy.y + 50);

    // Health bars
    ctx.fillStyle = '#00AA00';
    ctx.fillRect(20, 20, 150, 20);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(20, 20, (game.knight.hp / 5) * 150, 20);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 20);
    ctx.fillStyle = '#000';
    ctx.fillText(`HP: ${game.knight.hp}`, 25, 37);

    ctx.fillStyle = '#00AA00';
    ctx.fillRect(w - 170, 20, 150, 20);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(w - 170, 20, (game.enemy.hp / 5) * 150, 20);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 170, 20, 150, 20);
    ctx.fillStyle = '#000';
    ctx.fillText(`ENEMY: ${game.enemy.hp}`, w - 165, 37);

    // Combo display
    if (game.knight.combo > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold 32px ${FONT}`;
      ctx.fillText(`COMBO x${game.knight.combo}`, w / 2 - 80, 60);
    }

    game.time -= 1 / 60;
    if (game.time <= 0) {
      if (game.enemy.hp > 0) game.knight.hp = 0;
      endGame();
    }
    else requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    bgMusicStop();
    if (game.knight.hp > 0) {
      sound('SoundWin.mp3');
      markEventComplete(eventId, 50 + game.knight.combo * 5);
      toast(`✓ Victory! Combo x${game.knight.combo}`, 'success');
    } else {
      sound('SoundLose.mp3');
      toast('✗ Defeated in combat.', 'error');
    }
  }

  update();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 6: FENWCK CANAL - BOAT NAVIGATION
// ════════════════════════════════════════════════════════════════════════════

async function gameBoat(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: #1a3a52;
    z-index: 9999; display: flex; flex-direction: column;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    boat: { x: w / 2, y: h - 80, w: 60, h: 40, health: 3 },
    rocks: [],
    gems: [],
    time: 50,
    score: 0,
    active: true
  };

  for (let i = 0; i < 3; i++) {
    game.gems.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.5),
      w: 20,
      h: 20,
      vy: 1 + Math.random() * 0.5
    });
  }

  document.addEventListener('mousemove', (e) => {
    game.boat.x = Math.max(0, Math.min(w - game.boat.w, e.clientX - game.boat.w / 2));
  });

  function update() {
    if (!game.active) return;

    // Water background
    ctx.fillStyle = '#0d1e2d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a3a52';
    for (let i = 0; i < h; i += 30) {
      ctx.fillRect(0, i, w, 15);
    }

    // Collect gems
    game.gems = game.gems.filter(gem => {
      gem.y += gem.vy;
      if (gem.y + gem.h > game.boat.y &&
          gem.y < game.boat.y + game.boat.h &&
          gem.x + gem.w > game.boat.x &&
          gem.x < game.boat.x + game.boat.w) {
        game.score += 20;
        sound('SoundCoin.mp3');
        return false;
      }
      return gem.y < h;
    });

    // Rock obstacles
    game.rocks.forEach(rock => {
      rock.y += rock.vy;
      if (rock.y + rock.h > game.boat.y &&
          rock.y < game.boat.y + game.boat.h &&
          rock.x + rock.w > game.boat.x &&
          rock.x < game.boat.x + game.boat.w) {
        game.boat.health--;
        sound('SoundLose.mp3');
        if (game.boat.health <= 0) {
          endGame();
          return;
        }
      }
    });

    game.rocks = game.rocks.filter(rock => rock.y < h);

    if (Math.random() < 0.05) {
      game.gems.push({
        x: Math.random() * w,
        y: -20,
        w: 20,
        h: 20,
        vy: 2 + Math.random()
      });
    }

    if (Math.random() < 0.03) {
      game.rocks.push({
        x: Math.random() * w,
        y: -30,
        w: 50,
        h: 30,
        vy: 3 + Math.random() * 2
      });
    }

    // Draw boat
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(game.boat.x, game.boat.y, game.boat.w, game.boat.h);
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(game.boat.x + 10, game.boat.y + 5, game.boat.w - 20, 15);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(game.boat.x, game.boat.y, game.boat.w, game.boat.h);

    // Draw gems
    game.gems.forEach(gem => {
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(gem.x, gem.y, gem.w, gem.h);
      ctx.fillStyle = '#00AA00';
      ctx.fillRect(gem.x + 3, gem.y + 3, gem.w - 6, gem.h - 6);
    });

    // Draw rocks
    game.rocks.forEach(rock => {
      ctx.fillStyle = '#696969';
      ctx.beginPath();
      ctx.arc(rock.x + rock.w / 2, rock.y + rock.h / 2, rock.w / 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // UI
    ctx.fillStyle = '#FFF';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`HEALTH: ${game.boat.health}`, 20, 30);
    ctx.fillText(`GEMS: ${game.score}`, w / 2 - 50, 30);
    ctx.fillText(`TIME: ${Math.ceil(game.time)}s`, w - 150, 30);

    game.time -= 1 / 60;
    if (game.time <= 0) endGame();
    else requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    bgMusicStop();
    if (game.boat.health > 0) {
      sound('SoundWin.mp3');
      markEventComplete(eventId, game.score);
      toast('✓ Sailed through safely!', 'success');
    } else {
      sound('SoundLose.mp3');
      toast('✗ Ship wrecked.', 'error');
    }
  }

  update();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 7: IRONSTALL - MERCHANT TRADING
// ════════════════════════════════════════════════════════════════════════════

async function gameTrade(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: #f5f5f5;
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    font-family: ${FONT}; padding: 20px;
  `;

  const game = {
    gold: 100,
    items: [
      { name: 'Iron Ore', cost: 20, value: 35, qty: 0 },
      { name: 'Steel Bar', cost: 40, value: 65, qty: 0 },
      { name: 'War Axe', cost: 80, value: 150, qty: 0 }
    ],
    time: 30
  };

  function render() {
    screen.innerHTML = '';

    const card = document.createElement('div');
    card.style.cssText = `
      background: white; border: 2px solid #000;
      border-radius: 12px; padding: 30px; max-width: 600px;
      width: 100%; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    `;

    const title = document.createElement('h2');
    title.style.cssText = `margin: 0 0 20px 0; font-size: 24px; color: #000;`;
    title.textContent = 'MERCHANT\'S STALL';
    card.appendChild(title);

    const gold = document.createElement('p');
    gold.style.cssText = `
      margin: 0 0 20px 0; font-size: 18px; color: #FFD700;
      font-weight: 700;
    `;
    gold.textContent = `Gold: ${game.gold}`;
    card.appendChild(gold);

    const itemsDiv = document.createElement('div');
    itemsDiv.style.cssText = `margin-bottom: 20px;`;

    game.items.forEach((item, i) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; gap: 10px; margin-bottom: 10px;
        align-items: center; padding: 10px; border: 1px solid #ddd;
        border-radius: 6px;
      `;

      const label = document.createElement('span');
      label.style.cssText = `flex: 1; font-weight: 700;`;
      label.textContent = `${item.name} (Buy: ${item.cost}g / Sell: ${item.value}g) x${item.qty}`;
      row.appendChild(label);

      const buyBtn = document.createElement('button');
      buyBtn.style.cssText = `
        background: #000; color: white; border: none;
        padding: 6px 12px; border-radius: 4px; font-family: ${FONT};
        font-weight: 700; cursor: pointer; font-size: 12px;
      `;
      buyBtn.textContent = 'BUY';
      buyBtn.onclick = () => {
        if (game.gold >= item.cost) {
          game.gold -= item.cost;
          item.qty++;
          sound('SoundCoin.mp3');
          render();
        }
      };
      row.appendChild(buyBtn);

      const sellBtn = document.createElement('button');
      sellBtn.style.cssText = `
        background: #666; color: white; border: none;
        padding: 6px 12px; border-radius: 4px; font-family: ${FONT};
        font-weight: 700; cursor: pointer; font-size: 12px;
      `;
      sellBtn.textContent = 'SELL';
      sellBtn.onclick = () => {
        if (item.qty > 0) {
          game.gold += item.value;
          item.qty--;
          sound('SoundCoin.mp3');
          render();
        }
      };
      row.appendChild(sellBtn);

      itemsDiv.appendChild(row);
    });

    card.appendChild(itemsDiv);

    const done = document.createElement('button');
    done.style.cssText = `
      background: #000; color: white; border: none;
      padding: 12px 24px; border-radius: 6px; font-family: ${FONT};
      font-weight: 700; cursor: pointer; width: 100%;
      text-transform: uppercase; font-size: 14px;
    `;
    done.textContent = 'DONE TRADING';
    done.onclick = () => {
      screen.remove();
      bgMusicStop();
      sound('SoundWin.mp3');
      const profit = Math.max(0, game.gold - 100);
      markEventComplete(eventId, 30 + profit);
      toast(`✓ Profit: ${profit}g!`, 'success');
    };
    card.appendChild(done);

    screen.appendChild(card);
  }

  render();
  document.body.appendChild(screen);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 8: GLASSPORT - SIEGE DEFENSE
// ════════════════════════════════════════════════════════════════════════════

async function gameSiege(eventId) {
  const screen = document.createElement('div');
  screen.style.cssText = `
    position: fixed; inset: 0; background: #4a4a4a;
    z-index: 9999; display: flex; flex-direction: column;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    castle: { x: w / 2 - 40, y: 100, w: 80, h: 60, health: 5 },
    enemies: [],
    arrows: [],
    time: 60,
    kills: 0,
    active: true
  };

  document.addEventListener('click', (e) => {
    if (game.active) {
      game.arrows.push({
        x: game.castle.x + 40,
        y: game.castle.y,
        vx: (e.clientX - (game.castle.x + 40)) / 10,
        vy: (e.clientY - game.castle.y) / 10,
        traveled: 0
      });
      sound('SoundPlay.mp3');
    }
  });

  function update() {
    if (!game.active) return;

    // Background (sky & ground)
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, h / 2, w, h / 2);

    // Draw castle
    ctx.fillStyle = '#696969';
    ctx.fillRect(game.castle.x, game.castle.y, game.castle.w, game.castle.h);
    ctx.fillStyle = game.castle.health > 0 ? '#FFD700' : '#FF6B6B';
    for (let i = 0; i < game.castle.health; i++) {
      ctx.fillRect(game.castle.x + i * 15, game.castle.y - 15, 12, 12);
    }

    // Spawn enemies
    if (Math.random() < 0.03 && game.enemies.length < 5) {
      game.enemies.push({
        x: Math.random() * w,
        y: 50,
        w: 25,
        h: 30,
        vx: (game.castle.x + 40 - (Math.random() * w)) / 100,
        vy: 2 + Math.random(),
        health: 1
      });
    }

    // Move arrows
    game.arrows = game.arrows.filter(arrow => {
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;
      arrow.traveled++;

      let hit = false;
      game.enemies.forEach(enemy => {
        if (arrow.x > enemy.x && arrow.x < enemy.x + enemy.w &&
            arrow.y > enemy.y && arrow.y < enemy.y + enemy.h) {
          enemy.health--;
          hit = true;
          sound('SoundCoin.mp3');
          if (enemy.health <= 0) game.kills++;
        }
      });

      return !hit && arrow.traveled < 200;
    });

    // Move enemies
    game.enemies = game.enemies.filter(enemy => {
      enemy.y += enemy.vy;
      enemy.x += enemy.vx;

      if (enemy.y > game.castle.y && enemy.x > game.castle.x - 50 && enemy.x < game.castle.x + game.castle.w + 50) {
        game.castle.health--;
        sound('SoundLose.mp3');
        if (game.castle.health <= 0) {
          endGame();
          return false;
        }
        return false;
      }
      return enemy.y < h;
    });

    // Draw enemies
    game.enemies.forEach(enemy => {
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = '#000';
      ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.w - 10, 10);
    });

    // Draw arrows
    game.arrows.forEach(arrow => {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(arrow.x - arrow.vx, arrow.y - arrow.vy);
      ctx.lineTo(arrow.x, arrow.y);
      ctx.stroke();
    });

    // UI
    ctx.fillStyle = '#000';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`WALLS: ${game.castle.health}`, 20, 30);
    ctx.fillText(`KILLS: ${game.kills}`, w / 2 - 50, 30);
    ctx.fillText(`TIME: ${Math.ceil(game.time)}s`, w - 150, 30);

    game.time -= 1 / 60;
    if (game.time <= 0) endGame();
    else requestAnimationFrame(update);
  }

  function endGame() {
    game.active = false;
    screen.remove();
    bgMusicStop();
    if (game.castle.health > 0) {
      sound('SoundWin.mp3');
      markEventComplete(eventId, 60 + game.kills * 10);
      toast(`✓ Castle defended! ${game.kills} enemies slain`, 'success');
    } else {
      sound('SoundLose.mp3');
      toast('✗ Castle fell.', 'error');
    }
  }

  update();
  document.body.appendChild(screen);
}


// ════════════════════════════════════════════════════════════════════════════
// COMPLETION
// ════════════════════════════════════════════════════════════════════════════

function markEventComplete(eventId, fortCoins = 0) {
  if (typeof decayAfterGame === 'function') decayAfterGame();

  const isFirst = !_chronicleProgress[eventId];
  _chronicleProgress[eventId] = true;

  if (isFirst && fortCoins > 0) {
    const onyx = Math.floor(fortCoins / 2);
    if (onyx > 0) {
      if (typeof _playerOnyx === 'undefined') window._playerOnyx = 0;
      _playerOnyx += onyx;
      const display = document.getElementById('player-onyx-count');
      if (display) display.textContent = _playerOnyx;
    }
  }

  if (typeof renderChronicleEvents === 'function') renderChronicleEvents();
  if (typeof renderChronicleMapPins === 'function') renderChronicleMapPins();
  if (typeof updateChronicleProgress === 'function') updateChronicleProgress();
}
