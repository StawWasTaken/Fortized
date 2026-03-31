/**
 * FORTIZED GRAND CHRONICLE - REAL CANVAS GAMES
 * Play as a Knight. Click to attack. WASD to move.
 */

function launchChronicleMinigame(eventId) {
  console.log('🎮 Game launch:', eventId);

  if (eventId === 1) {
    showEvent1Intro();
  } else if (eventId === 2) {
    showEvent2Intro();
  } else {
    showGenericIntro(eventId);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 1: Combat vs 15 enemies
// ════════════════════════════════════════════════════════════════════════════
function showEvent1Intro() {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, #0a1419 0%, #1a2a3a 100%);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif; color: white; padding: 40px;
  `;

  const content = document.createElement('div');
  content.style.cssText = `text-align: center; max-width: 800px;`;
  content.innerHTML = `
    <h1 style="font-size: 48px; margin: 0 0 20px 0; color: #fff93e; font-family: 'Syne';">⚔️ THE BREAKING OF THE TREATY</h1>
    <p style="font-size: 16px; margin: 0 0 30px 0; color: rgba(255,255,255,.8); line-height: 1.8;">
      Vastilly, 1452. The treaty is shattered. War is declared. You are a Knight of Fortized.<br><br>
      Lead the first strike against Oakhaven forces gathering at the Silver Stream.
    </p>
    <div style="background: rgba(255,249,62,.1); border: 2px solid rgba(255,249,62,.3); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
      <p style="margin: 0; font-size: 14px;">Defeat 15 Oakhaven soldiers and destroy the supply depot</p>
    </div>
  `;

  const btn = document.createElement('button');
  btn.style.cssText = `
    padding: 15px 40px; background: linear-gradient(135deg, #fff93e 0%, #ffd700 100%);
    color: #0a1419; border: none; border-radius: 8px; font-size: 16px; font-weight: 700;
    cursor: pointer; transition: all 0.3s;
  `;
  btn.textContent = 'BEGIN MISSION';
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';

  // DIRECT onclick - no setTimeout needed
  btn.onclick = function(e) {
    e.preventDefault();
    console.log('Button clicked - starting game');
    container.remove();
    startCombatGame(1, 15);
  };

  content.appendChild(btn);
  container.appendChild(content);
  document.body.appendChild(container);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 2: Stealth Raid
// ════════════════════════════════════════════════════════════════════════════
function showEvent2Intro() {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, #0f3a3a 0%, #1a2a3a 100%);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif; color: white; padding: 40px;
  `;

  const content = document.createElement('div');
  content.style.cssText = `text-align: center; max-width: 800px;`;
  content.innerHTML = `
    <h1 style="font-size: 48px; margin: 0 0 20px 0; color: #4ade80; font-family: 'Syne';">⚡ RAID ON THE SILVER STREAM</h1>
    <p style="font-size: 16px; margin: 0 0 30px 0; color: rgba(255,255,255,.8); line-height: 1.8;">
      Night falls. Enemy caravans cross the stream. Ambush, steal their supplies, and escape.<br><br>
      Avoid guards. Collect 300 gold and reach the escape zone.
    </p>
    <div style="background: rgba(100,200,100,.1); border: 2px solid rgba(100,200,100,.3); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
      <p style="margin: 0; font-size: 14px;">Stealth mission • Collect 300 gold • Escape</p>
    </div>
  `;

  const btn = document.createElement('button');
  btn.style.cssText = `
    padding: 15px 40px; background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    color: #000; border: none; border-radius: 8px; font-size: 16px; font-weight: 700;
    cursor: pointer; transition: all 0.3s;
  `;
  btn.textContent = 'START RAID';
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';

  btn.onclick = function(e) {
    e.preventDefault();
    console.log('Button clicked - starting stealth game');
    container.remove();
    startStealthGame();
  };

  content.appendChild(btn);
  container.appendChild(content);
  document.body.appendChild(container);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENTS 3-13: Generic Combat
// ════════════════════════════════════════════════════════════════════════════
function showGenericIntro(eventId) {
  const titles = {
    3: "The Burning of Elowen's Outskirts",
    4: "Battle of the Timber Roads",
    5: "Defense of Vastilly Outer Walls",
    6: "The Fenwick Canal Skirmishes",
    7: "The Ironstall Contracts",
    8: "The Glassport Blockade",
    9: "The Siege of Port-Crest",
    10: "The 14-Day Bombardment",
    11: "The Harbour of Wrecks",
    12: "The Push into Oakhaven",
    13: "The Fall of Elowen"
  };

  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, #0a1419 0%, #1a3a4a 100%);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif; color: white; padding: 40px;
  `;

  const content = document.createElement('div');
  content.style.cssText = `text-align: center; max-width: 800px;`;
  content.innerHTML = `
    <h1 style="font-size: 48px; margin: 0 0 10px 0; color: #fff93e; font-family: 'Syne';">⚔️ EVENT ${eventId}</h1>
    <h2 style="font-size: 24px; margin: 0 0 30px 0; color: rgba(255,255,255,.9);">${titles[eventId]}</h2>
    <p style="font-size: 16px; margin: 0 0 30px 0; color: rgba(255,255,255,.8); line-height: 1.8;">
      War escalates. Draw your sword and claim victory for Fortized.
    </p>
    <div style="background: rgba(255,249,62,.1); border: 2px solid rgba(255,249,62,.3); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
      <p style="margin: 0; font-size: 14px;">Defeat all enemies • Survive the assault</p>
    </div>
  `;

  const btn = document.createElement('button');
  btn.style.cssText = `
    padding: 15px 40px; background: linear-gradient(135deg, #fff93e 0%, #ffd700 100%);
    color: #0a1419; border: none; border-radius: 8px; font-size: 16px; font-weight: 700;
    cursor: pointer; transition: all 0.3s;
  `;
  btn.textContent = 'ENTER BATTLE';
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';

  btn.onclick = function(e) {
    e.preventDefault();
    console.log('Button clicked - starting event', eventId);
    container.remove();
    startCombatGame(eventId, 20 + eventId * 2);
  };

  content.appendChild(btn);
  container.appendChild(content);
  document.body.appendChild(container);
}

// ════════════════════════════════════════════════════════════════════════════
// COMBAT GAME
// ════════════════════════════════════════════════════════════════════════════
function startCombatGame(eventId, enemyCount) {
  console.log('Starting combat game - Event', eventId, 'with', enemyCount, 'enemies');

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    display: block; z-index: 9999;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Game state
  const player = { x: 100, y: h - 100, w: 25, h: 40, health: 100, maxHealth: 100 };
  const enemies = [];
  const particles = [];
  let swordSwing = null;
  let gameActive = true;
  const keys = {};

  // Spawn enemies
  for (let i = 0; i < enemyCount; i++) {
    enemies.push({
      x: w - 200 - Math.random() * 400,
      y: 50 + Math.random() * (h - 150),
      w: 20, h: 35,
      health: 20,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 50,
      attackCd: 0
    });
  }

  // Input
  window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
  canvas.addEventListener('click', (e) => {
    const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
    swordSwing = { angle, time: 0.2 };
  });

  // UI
  const uiDiv = document.createElement('div');
  uiDiv.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,.8); border: 2px solid rgba(255,249,62,.3);
    border-radius: 12px; padding: 15px 30px; color: white; font-family: 'DM Sans';
    font-size: 14px; display: flex; gap: 30px; z-index: 10000;
  `;
  uiDiv.innerHTML = `
    <div>🛡️ Health: <span id="hp">100</span>/100</div>
    <div>⚔️ Enemies: <span id="ec">${enemyCount}</span></div>
    <div style="color: rgba(255,255,255,.6); font-size: 12px;">Click to attack | WASD to move</div>
  `;
  document.body.appendChild(uiDiv);

  // Game loop
  function update() {
    // Player movement
    let vx = 0, vy = 0;
    if (keys['w'] || keys['arrowup']) vy -= 150;
    if (keys['s'] || keys['arrowdown']) vy += 150;
    if (keys['a'] || keys['arrowleft']) vx -= 150;
    if (keys['d'] || keys['arrowright']) vx += 150;

    player.x += vx * 0.016;
    player.y += vy * 0.016;
    player.x = Math.max(0, Math.min(w, player.x));
    player.y = Math.max(0, Math.min(h, player.y));

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx * 0.016;
      e.y += e.vy * 0.016;

      const dist = Math.hypot(e.x - player.x, e.y - player.y);

      if (dist < 250) {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.vx = Math.cos(angle) * 80;
        e.vy = Math.sin(angle) * 80;
      }

      if (e.x < 0 || e.x > w) e.vx *= -1;
      if (e.y < 0 || e.y > h) e.vy *= -1;

      e.attackCd--;
      if (dist < 50 && e.attackCd < 0) {
        player.health -= 3;
        e.attackCd = 30;
      }

      // Sword collision
      if (swordSwing) {
        const sx = player.x + Math.cos(swordSwing.angle) * 40;
        const sy = player.y + Math.sin(swordSwing.angle) * 40;
        const sdist = Math.hypot(e.x - sx, e.y - sy);
        if (sdist < 40) {
          e.health -= 25;
          if (e.health <= 0) {
            for (let j = 0; j < 8; j++) {
              particles.push({
                x: e.x, y: e.y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                life: 0.5
              });
            }
            enemies.splice(i, 1);
          }
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.life -= 0.016;
      p.vy += 100 * 0.016;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Sword swing
    if (swordSwing) {
      swordSwing.time -= 0.016;
      if (swordSwing.time <= 0) swordSwing = null;
    }

    // Render
    ctx.fillStyle = '#0f3a2e';
    ctx.fillRect(0, 0, w, h);

    // Draw player
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h);

    // Draw sword
    if (swordSwing) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 8;
      ctx.beginPath();
      const sx = player.x + Math.cos(swordSwing.angle) * 40;
      const sy = player.y + Math.sin(swordSwing.angle) * 40;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - Math.cos(swordSwing.angle) * 50, sy - Math.sin(swordSwing.angle) * 50);
      ctx.stroke();
    }

    // Draw enemies
    ctx.fillStyle = '#ff6b6b';
    enemies.forEach(e => ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h));

    // Draw particles
    particles.forEach(p => {
      ctx.fillStyle = `rgba(255, 0, 0, ${p.life})`;
      ctx.fillRect(p.x, p.y, 3, 3);
    });

    // Health bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(20, 20, 150 * (player.health / player.maxHealth), 20);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 20);

    // UI
    document.getElementById('hp').textContent = Math.round(player.health);
    document.getElementById('ec').textContent = enemies.length;

    // Check end
    if (player.health <= 0) {
      endGame(false);
      return;
    }

    if (enemies.length === 0) {
      endGame(true);
      return;
    }

    if (gameActive) requestAnimationFrame(update);
  }

  function endGame(victory) {
    gameActive = false;
    canvas.remove();
    uiDiv.remove();

    if (victory) {
      // Mark this event as completed
      if (typeof _chronicleProgress !== 'undefined') {
        _chronicleProgress[eventId] = true;
        console.log('Event', eventId, 'marked as complete');
        if (typeof updateChronicleProgress === 'function') {
          updateChronicleProgress();
        }
      }
      toast('✓ VICTORY! Event unlocked!', 'success');
    } else {
      toast('✗ DEFEAT! Try again.', 'error');
    }
  }

  update();
}

// ════════════════════════════════════════════════════════════════════════════
// STEALTH GAME
// ════════════════════════════════════════════════════════════════════════════
function startStealthGame() {
  console.log('Starting stealth game');

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    display: block; z-index: 9999;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const player = { x: 50, y: h / 2, gold: 0 };
  const caravans = [
    { x: w * 0.25, y: h * 0.3, gold: 80 },
    { x: w * 0.4, y: h * 0.6, gold: 80 },
    { x: w * 0.55, y: h * 0.35, gold: 80 },
    { x: w * 0.7, y: h * 0.65, gold: 80 }
  ];
  const guards = [
    { x: w * 0.2, y: h * 0.4, range: 100, awareness: 0 },
    { x: w * 0.5, y: h * 0.5, range: 100, awareness: 0 },
    { x: w * 0.75, y: h * 0.3, range: 100, awareness: 0 }
  ];
  let gameActive = true;
  const keys = {};

  window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

  const uiDiv = document.createElement('div');
  uiDiv.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,.8); border: 2px solid rgba(74,222,128,.3);
    border-radius: 12px; padding: 15px 30px; color: white; font-family: 'DM Sans';
    font-size: 14px; display: flex; gap: 30px; z-index: 10000;
  `;
  uiDiv.innerHTML = `
    <div>💰 Gold: <span id="gold">0</span>/300</div>
    <div>👁️ Awareness: <span id="aware">0</span>%</div>
  `;
  document.body.appendChild(uiDiv);

  function update() {
    // Movement
    let vx = 0, vy = 0;
    if (keys['w']) vy -= 150;
    if (keys['s']) vy += 150;
    if (keys['a']) vx -= 150;
    if (keys['d']) vx += 150;

    player.x += vx * 0.016;
    player.y += vy * 0.016;
    player.x = Math.max(0, Math.min(w, player.x));
    player.y = Math.max(0, Math.min(h, player.y));

    // Steal
    caravans.forEach(c => {
      if (Math.hypot(player.x - c.x, player.y - c.y) < 30 && c.gold > 0) {
        player.gold += 2;
        c.gold -= 2;
      }
    });

    // Guards
    let maxAware = 0;
    guards.forEach(g => {
      const d = Math.hypot(player.x - g.x, player.y - g.y);
      if (d < g.range) {
        g.awareness = Math.min(100, g.awareness + 1.5);
      } else {
        g.awareness = Math.max(0, g.awareness - 0.5);
      }
      maxAware = Math.max(maxAware, g.awareness);
    });

    // Check escape
    if (player.x > w - 60 && player.gold >= 300) {
      endGame(true);
      return;
    }

    // Render
    ctx.fillStyle = '#0f3a3a';
    ctx.fillRect(0, 0, w, h);

    // Caravans
    ctx.fillStyle = '#ff8c42';
    caravans.forEach(c => {
      if (c.gold > 0) {
        ctx.fillRect(c.x - 20, c.y - 15, 40, 30);
      }
    });

    // Escape zone
    ctx.strokeStyle = 'rgba(74,222,128,.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 60, h / 2 - 80, 50, 160);

    // Guards
    ctx.fillStyle = '#ff6b6b';
    guards.forEach(g => {
      ctx.strokeStyle = 'rgba(255,100,100,.2)';
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(g.x - 10, g.y - 15, 20, 30);
    });

    // Player
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(player.x - 9, player.y - 15, 18, 30);

    // UI
    document.getElementById('gold').textContent = Math.round(player.gold);
    document.getElementById('aware').textContent = Math.round(maxAware);

    if (maxAware > 95) {
      endGame(false);
      return;
    }

    if (gameActive) requestAnimationFrame(update);
  }

  function endGame(victory) {
    gameActive = false;
    canvas.remove();
    uiDiv.remove();

    if (victory) {
      // Mark Event 2 as completed
      if (typeof _chronicleProgress !== 'undefined') {
        _chronicleProgress[2] = true;
        console.log('Event 2 marked as complete');
        if (typeof updateChronicleProgress === 'function') {
          updateChronicleProgress();
        }
      }
      toast(`✓ RAID SUCCESSFUL! Gold: ${Math.round(player.gold)}. Event unlocked!`, 'success');
    } else {
      toast('✗ CAUGHT! Mission failed.', 'error');
    }
  }

  update();
}
