/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - GAMES v2 (White/Black Aesthetic + Image Assets)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ASSET_PATH = '/app/Chronicle/chapter1/assets/';

// FortCoin System
let _fortCoinsEarned = 0;

// Audio system
const audioCache = {};
function playSound(filename) {
  if (!audioCache[filename]) {
    const audio = new Audio(`${ASSET_PATH}${filename}`);
    audio.volume = 0.3;
    audioCache[filename] = audio;
  }
  audioCache[filename].currentTime = 0;
  audioCache[filename].play().catch(() => {});
}

// Image preloader
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
    img.onerror = () => resolve(null);
    img.src = `${ASSET_PATH}${filename}`;
  });
}

function launchChronicleMinigame(eventId) {
  console.log('🎮 Game launch:', eventId);
  playSound('SoundPlay.mp3');

  if (typeof canPlayGame === 'function' && !canPlayGame()) {
    return;
  }

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
// SHARED UI & STYLING
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

function createNPCDialogue(npcImage, npcName, text) {
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute; bottom: 0; left: 0; right: 0;
    background: #000; color: white; padding: 20px; border-top: 3px solid #000;
    min-height: 120px; display: flex; gap: 20px;
  `;

  if (npcImage) {
    const imgEl = document.createElement('img');
    imgEl.src = `${ASSET_PATH}${npcImage}`;
    imgEl.style.cssText = `
      height: 120px; width: auto; image-rendering: crisp-edges;
      border: 2px solid white;
    `;
    container.appendChild(imgEl);
  }

  const textBox = document.createElement('div');
  textBox.style.cssText = `flex: 1;`;

  if (npcName) {
    const name = document.createElement('div');
    name.style.cssText = `
      font-weight: 700; font-size: 14px; margin-bottom: 8px; text-transform: uppercase;
    `;
    name.textContent = npcName;
    textBox.appendChild(name);
  }

  const dialogue = document.createElement('div');
  dialogue.style.cssText = `
    font-size: 13px; line-height: 1.5; color: #fff;
  `;
  dialogue.textContent = text;
  textBox.appendChild(dialogue);

  container.appendChild(textBox);
  return container;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 1: BREAKING OF THE TREATY - RPG Dialogue
// ════════════════════════════════════════════════════════════════════════════
async function game_breakingTreaty() {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await loadImage('CouncilChamber.png');
  const dialogues = [
    { npc: 'Wealthplace.png', name: 'Cardinal Wealthplace', text: 'The treaty is broken. We must act decisively.' },
    { npc: 'Wealthplace.png', name: 'Cardinal Wealthplace', text: 'Your honor as a knight will determine our fate.' }
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
        object-fit: cover; opacity: 0.7;
      `;
      screen.appendChild(bg);
    }

    // Dark overlay
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

    const curr = dialogues[dialogueIndex];
    const dialogue = createNPCDialogue(curr.npc, curr.name, curr.text);
    screen.appendChild(dialogue);

    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.style.cssText = `
      position: absolute; bottom: 150px; right: 20px;
      background: #000; color: white; border: 2px solid white;
      padding: 10px 20px; cursor: pointer; font-weight: 700;
      font-family: 'Comic Sans MS', sans-serif; font-size: 12px;
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
    const fortCoins = 30; // Fixed reward for dialogue completion
    markEventComplete(1, fortCoins);
    toast('✓ Treaty dialogue complete!', 'success');
  }

  showDialogue();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 2: RAID ON SILVER STREAM - Catch/Dodge Falling Objects
// ════════════════════════════════════════════════════════════════════════════
async function game_raidSilverStream() {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await loadImage('SilverStream.png');
  const canvas = document.createElement('canvas');
  canvas.width = screen.clientWidth;
  canvas.height = screen.clientHeight;
  canvas.style.cssText = `position: absolute; top: 0; left: 0;`;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Draw background
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

    // Clear and redraw background
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, w, h);
    }

    // Update objects
    game.objects = game.objects.filter(obj => {
      obj.y += obj.vy;

      // Collision
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

    // Spawn new
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
    if (game.player.collected >= 100) {
      playSound('SoundWin.mp3');
      markEventComplete(2, game.player.collected);
      toast('✓ Raid successful!', 'success');
    } else {
      playSound('SoundLose.mp3');
      toast('✗ Not enough gold.', 'error');
    }
  }

  update();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 3: BURNING ELOWEN - Clicker with Cooldown
// ════════════════════════════════════════════════════════════════════════════
async function game_burningElowen() {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await loadImage('Battlefield.png');
  if (bgImg) {
    const bg = document.createElement('img');
    bg.src = bgImg.src;
    bg.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      object-fit: cover; opacity: 0.6;
    `;
    screen.appendChild(bg);
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4);
  `;
  screen.appendChild(overlay);

  const game = {
    clicks: 0,
    needed: 20,
    cooldown: 0,
    maxCooldown: 30
  };

  function render() {
    const content = document.createElement('div');
    content.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; border: 4px solid #000; padding: 40px;
      text-align: center; max-width: 400px; z-index: 10;
    `;

    const title = document.createElement('h2');
    title.style.cssText = 'margin: 0 0 20px 0; font-size: 24px;';
    title.textContent = 'BURN THE DEPOT';
    content.appendChild(title);

    const progress = document.createElement('div');
    progress.style.cssText = `
      background: #f0f0f0; border: 2px solid #000; padding: 15px;
      margin-bottom: 20px; border-radius: 4px;
    `;
    progress.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 8px;">${game.clicks}/${game.needed}</div>
      <div style="height: 16px; background: white; border: 1px solid #000; border-radius: 2px; overflow: hidden;">
        <div style="height: 100%; background: #000; width: ${(game.clicks / game.needed) * 100}%;"></div>
      </div>
    `;
    content.appendChild(progress);

    const clickBtn = document.createElement('button');
    clickBtn.style.cssText = `
      width: 100%; padding: 30px; background: white; border: 3px solid #000;
      font-size: 18px; font-weight: 700; cursor: pointer; border-radius: 4px;
      font-family: 'Comic Sans MS', sans-serif;
      ${game.cooldown > 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
    `;
    clickBtn.textContent = game.cooldown > 0 ? `WAIT ${Math.ceil(game.cooldown / 10)}...` : 'CLICK!';
    clickBtn.disabled = game.cooldown > 0;
    clickBtn.onclick = () => {
      if (game.cooldown <= 0) {
        game.clicks++;
        game.cooldown = game.maxCooldown;
        playSound('SoundCoin.mp3');
        if (game.clicks >= game.needed) {
          endGame();
          return;
        }
        render();
      }
    };
    content.appendChild(clickBtn);

    screen.appendChild(content);

    if (game.cooldown > 0) {
      game.cooldown--;
      setTimeout(render, 50);
    }
  }

  function endGame() {
    playSound('SoundWin.mp3');
    screen.remove();
    const fortCoins = game.clicks * 2; // 2 coins per click
    markEventComplete(3, fortCoins);
    toast('✓ Elowen burns!', 'success');
  }

  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 4: TIMBER ROADS - Arrow Sequence
// ════════════════════════════════════════════════════════════════════════════
async function game_timberRoads() {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await loadImage('TheCanals.png');
  if (bgImg) {
    const bg = document.createElement('img');
    bg.src = bgImg.src;
    bg.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      object-fit: cover; opacity: 0.5;
    `;
    screen.appendChild(bg);
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3);
  `;
  screen.appendChild(overlay);

  const game = {
    sequence: [],
    playerInput: [],
    round: 0,
    maxRounds: 5
  };

  const arrows = [
    { key: 'ArrowUp', symbol: '↑', code: 38 },
    { key: 'ArrowRight', symbol: '→', code: 39 },
    { key: 'ArrowDown', symbol: '↓', code: 40 },
    { key: 'ArrowLeft', symbol: '←', code: 37 }
  ];

  function generateSequence() {
    game.sequence.push(arrows[Math.floor(Math.random() * 4)]);
  }

  function render() {
    screen.innerHTML = '';
    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = bgImg.src;
      bg.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        object-fit: cover; opacity: 0.5;
      `;
      screen.appendChild(bg);
    }
    screen.appendChild(overlay.cloneNode());

    const content = document.createElement('div');
    content.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; border: 4px solid #000; padding: 40px;
      text-align: center; max-width: 500px; z-index: 10;
    `;

    const title = document.createElement('h2');
    title.textContent = `TIMBER ROADS - Round ${game.round + 1}/${game.maxRounds}`;
    title.style.cssText = 'margin: 0 0 20px 0;';
    content.appendChild(title);

    const seqDisplay = document.createElement('div');
    seqDisplay.style.cssText = `
      background: #000; color: white; padding: 20px; border: 2px solid #000;
      font-size: 28px; font-weight: 700; letter-spacing: 10px; margin-bottom: 20px;
      border-radius: 4px; min-height: 60px;
    `;
    seqDisplay.textContent = game.sequence.map(a => a.symbol).join(' ') || '...';
    content.appendChild(seqDisplay);

    const hint = document.createElement('p');
    hint.textContent = 'Press arrow keys in order!';
    hint.style.cssText = 'margin: 0 0 20px 0; font-weight: 700;';
    content.appendChild(hint);

    screen.appendChild(content);
  }

  function handleKeypress(e) {
    const arrow = arrows.find(a => a.key === e.key);
    if (!arrow) return;

    e.preventDefault();
    const expected = game.sequence[game.playerInput.length];

    if (arrow.key !== expected.key) {
      endGame(false);
      return;
    }

    playSound('SoundUiSelect.mp3');
    game.playerInput.push(arrow);

    if (game.playerInput.length === game.sequence.length) {
      game.round++;
      if (game.round >= game.maxRounds) {
        endGame(true);
        return;
      }
      generateSequence();
      game.playerInput = [];
      setTimeout(render, 500);
    }
  }

  function endGame(success) {
    document.removeEventListener('keydown', handleKeypress);
    screen.remove();
    if (success) {
      playSound('SoundWin.mp3');
      const fortCoins = 50; // Fixed reward for completing all rounds
      markEventComplete(4, fortCoins);
      toast('✓ You navigated safely!', 'success');
    } else {
      playSound('SoundLose.mp3');
      toast('✗ Lost the path!', 'error');
    }
  }

  document.addEventListener('keydown', handleKeypress);
  generateSequence();
  render();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 5: COMBAT - Click to attack, Arrows to dodge
// ════════════════════════════════════════════════════════════════════════════
async function game_combatBattle() {
  const screen = createGameScreen();
  document.body.appendChild(screen);

  const bgImg = await loadImage('Battlefield.png');
  if (bgImg) {
    const bg = document.createElement('img');
    bg.src = bgImg.src;
    bg.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      object-fit: cover; opacity: 0.6;
    `;
    screen.appendChild(bg);
  }

  const canvas = document.createElement('canvas');
  canvas.width = screen.clientWidth;
  canvas.height = screen.clientHeight;
  canvas.style.cssText = `position: absolute; top: 0; left: 0;`;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    player: { x: w / 2, y: h - 80, hp: 100, maxHp: 100 },
    enemy: { x: w / 2, y: 100, hp: 100, maxHp: 100 },
    attacks: [],
    dodging: false,
    dodgeDir: null,
    time: 60
  };

  document.addEventListener('click', () => {
    playSound('SoundCoin.mp3');
    game.enemy.hp -= 10;
  });

  document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      game.dodging = true;
      game.dodgeDir = e.key === 'ArrowLeft' ? -1 : 1;
    }
  });

  document.addEventListener('keyup', () => {
    game.dodging = false;
  });

  function update() {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, 0, w, h);

    // Enemy attacks
    if (Math.random() < 0.02) {
      game.attacks.push({
        x: game.enemy.x,
        y: game.enemy.y + 50,
        vy: 3
      });
    }

    // Update attacks
    game.attacks = game.attacks.filter(atk => {
      atk.y += atk.vy;
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(atk.x - 10, atk.y, 20, 20);

      // Hit detection
      if (atk.y > game.player.y - 40 && atk.y < game.player.y + 40) {
        if (!game.dodging || (game.dodging && Math.random() > 0.5)) {
          game.player.hp -= 5;
          playSound('SoundLose.mp3');
        }
        return false;
      }

      return atk.y < h;
    });

    // Draw player
    ctx.fillStyle = '#000';
    ctx.fillRect(game.player.x - 20, game.player.y, 40, 50);
    if (game.dodging) {
      game.player.x += 5 * game.dodgeDir;
    }

    // Draw enemy
    ctx.fillStyle = '#333';
    ctx.fillRect(game.enemy.x - 20, game.enemy.y, 40, 50);

    // HP bars
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Comic Sans MS';
    ctx.fillText(`Your HP: ${game.player.hp}/${game.player.maxHp}`, 20, 30);
    ctx.fillText(`Enemy HP: ${game.enemy.hp}/${game.enemy.maxHp}`, 20, 50);
    ctx.fillText('Click to attack | Arrows to dodge', 20, 70);
    ctx.fillText(`Time: ${Math.ceil(game.time)}s`, w - 150, 30);

    game.time -= 1 / 60;

    if (game.player.hp <= 0 || game.enemy.hp <= 0 || game.time <= 0) {
      endGame();
      return;
    }

    requestAnimationFrame(update);
  }

  function endGame() {
    const victory = game.enemy.hp <= 0;
    screen.remove();
    if (victory) {
      playSound('SoundWin.mp3');
      const fortCoins = Math.max(30, game.player.hp); // Bonus based on remaining HP
      markEventComplete(5, fortCoins);
      toast('✓ Enemy defeated!', 'success');
    } else {
      playSound('SoundLose.mp3');
      toast('✗ You were defeated.', 'error');
    }
  }

  update();
}

// ════════════════════════════════════════════════════════════════════════════
// CLICKER GAMES (Events 6-8)
// ════════════════════════════════════════════════════════════════════════════

function createClickerGame(eventId, name, goalClicks, bgImage) {
  return async () => {
    const screen = createGameScreen();
    document.body.appendChild(screen);

    const bgImg = bgImage ? await loadImage(bgImage) : null;
    if (bgImg) {
      const bg = document.createElement('img');
      bg.src = bgImg.src;
      bg.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        object-fit: cover; opacity: 0.6;
      `;
      screen.appendChild(bg);
    }

    const game = { clicks: 0 };

    function render() {
      const content = document.createElement('div');
      content.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; border: 4px solid #000; padding: 40px;
        text-align: center; max-width: 400px; z-index: 10;
      `;

      const title = document.createElement('h2');
      title.textContent = name;
      title.style.cssText = 'margin: 0 0 20px 0;';
      content.appendChild(title);

      const progress = document.createElement('div');
      progress.style.cssText = `
        background: #f0f0f0; border: 2px solid #000; padding: 15px;
        margin-bottom: 20px; border-radius: 4px;
      `;
      progress.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px;">${game.clicks}/${goalClicks}</div>
        <div style="height: 16px; background: white; border: 1px solid #000; border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; background: #000; width: ${(game.clicks / goalClicks) * 100}%;"></div>
        </div>
      `;
      content.appendChild(progress);

      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%; padding: 30px; background: white; border: 3px solid #000;
        font-size: 18px; font-weight: 700; cursor: pointer; border-radius: 4px;
        font-family: 'Comic Sans MS', sans-serif;
      `;
      btn.textContent = 'CLICK!';
      btn.onclick = () => {
        game.clicks++;
        playSound('SoundCoin.mp3');
        if (game.clicks >= goalClicks) {
          screen.remove();
          playSound('SoundWin.mp3');
          const fortCoins = Math.floor(goalClicks * 1.5); // Reward proportional to difficulty
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

const game_fenwckCanal = createClickerGame(6, 'FENWCK CANAL', 75, 'TheCanals.png');
const game_ironstall = createClickerGame(7, 'IRONSTALL', 50, 'GlassportHarbour.png');
const game_glassportBlockade = createClickerGame(8, 'GLASSPORT BLOCKADE', 60, 'GlassportHarbour.png');

// ════════════════════════════════════════════════════════════════════════════
// GENERIC PLACEHOLDER
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
  content.appendChild(title);

  const msg = document.createElement('p');
  msg.textContent = 'Coming soon...';
  content.appendChild(msg);

  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #000; color: white; border: 2px solid #000;
    padding: 10px 20px; cursor: pointer; font-weight: 700;
    font-family: 'Comic Sans MS', sans-serif;
  `;
  btn.textContent = 'CONTINUE';
  btn.onclick = () => {
    playSound('SoundUiSelect.mp3');
    screen.remove();
  };
  content.appendChild(btn);

  screen.appendChild(content);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT COMPLETION & COIN CONVERSION
// ════════════════════════════════════════════════════════════════════════════

function markEventComplete(eventId, fortCoins = 0) {
  if (typeof decayAfterGame === 'function') {
    decayAfterGame();
  }

  // Track if this is a first-time completion
  const isFirstCompletion = !_chronicleProgress[eventId];

  _chronicleProgress[eventId] = true;

  // Convert FortCoins to Onyx on first completion only
  if (isFirstCompletion && fortCoins > 0) {
    const onyxGain = Math.floor(fortCoins / 2); // 1 FortCoin = 0.5 Onyx, but only full Onyx

    if (onyxGain > 0) {
      // Add Onyx to player's inventory
      if (typeof _playerOnyx === 'undefined') {
        window._playerOnyx = 0;
      }
      _playerOnyx += onyxGain;

      console.log(`💎 Earned ${onyxGain} Onyx from ${fortCoins} FortCoins!`);
      toast(`💎 +${onyxGain} Onyx!`, 'success');

      // Update Onyx display if it exists
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
