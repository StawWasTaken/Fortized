/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - REAL PHASER.JS COMBAT GAMES
 * ═══════════════════════════════════════════════════════════════════════════════
 * Play as a Fortized Knight. Real sword combat, blood, enemy AI, mission objectives.
 */

function launchChronicleMinigame(eventId) {
  console.log('Launching event:', eventId);
  if (eventId === 1) {
    createEvent1Game();
  } else if (eventId === 2) {
    createEvent2Game();
  } else {
    createGenericCombatGame(eventId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT 1: The Breaking of the Treaty
// ═══════════════════════════════════════════════════════════════════════════════
function createEvent1Game() {
  const container = document.createElement('div');
  container.id = 'game-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #000;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  document.body.appendChild(container);

  // Show intro first
  const intro = document.createElement('div');
  intro.style.cssText = `
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #0a1419 0%, #1a2a3a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: 'DM Sans', sans-serif;
    padding: 40px;
    text-align: center;
  `;

  intro.innerHTML = `
    <h1 style="font-size: 48px; margin: 0 0 20px 0; color: #fff93e; font-family: 'Syne', sans-serif;">⚔️ THE BREAKING OF THE TREATY</h1>
    <p style="font-size: 16px; margin: 0 0 40px 0; color: rgba(255,255,255,.8); max-width: 800px; line-height: 1.8;">
      <strong style="color: #fff93e;">Vastilly, 1452</strong><br><br>
      The Royal Court trembles. The Treaty is shattered. War is declared.<br><br>
      <strong>You are a Knight of Vastilly.</strong> Lead the first strike against Oakhaven forces.
    </p>
    <div style="background: rgba(255,249,62,.1); border: 2px solid rgba(255,249,62,.3); border-radius: 12px; padding: 20px; margin-bottom: 30px; max-width: 700px;">
      <p style="margin: 0; font-size: 14px;">DEFEAT 15 SOLDIERS • DESTROY THE DEPOT</p>
    </div>
  `;

  const btn = document.createElement('button');
  btn.style.cssText = `
    padding: 15px 40px;
    background: linear-gradient(135deg, #fff93e 0%, #ffd700 100%);
    color: #0a1419;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
  `;
  btn.textContent = 'BEGIN MISSION';
  btn.id = 'begin-event1';
  intro.appendChild(btn);
  container.appendChild(intro);

  setTimeout(() => {
    const button = document.getElementById('begin-event1');
    if (button) {
      button.addEventListener('click', () => {
        intro.remove();
        startCombatGame(container, 15, 'EVENT 1');
      });
    }
  }, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT 2: Raid on the Silver Stream
// ═══════════════════════════════════════════════════════════════════════════════
function createEvent2Game() {
  const container = document.createElement('div');
  container.id = 'game-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #000;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  document.body.appendChild(container);

  const intro = document.createElement('div');
  intro.style.cssText = `
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #0f3a3a 0%, #1a2a3a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: 'DM Sans', sans-serif;
    padding: 40px;
    text-align: center;
  `;

  intro.innerHTML = `
    <h1 style="font-size: 48px; margin: 0 0 20px 0; color: #4ade80; font-family: 'Syne', sans-serif;">⚡ RAID ON THE SILVER STREAM</h1>
    <p style="font-size: 16px; margin: 0 0 40px 0; color: rgba(255,255,255,.8); max-width: 800px; line-height: 1.8;">
      Night falls on Oakhaven's trade route. Ambush the caravans. Steal their gold. Escape before guards catch you.
    </p>
    <div style="background: rgba(100,200,100,.1); border: 2px solid rgba(100,200,100,.3); border-radius: 12px; padding: 20px; margin-bottom: 30px; max-width: 700px;">
      <p style="margin: 0; font-size: 14px;">STEALTH MISSION • COLLECT 300 GOLD • ESCAPE</p>
    </div>
  `;

  const btn = document.createElement('button');
  btn.style.cssText = `
    padding: 15px 40px;
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    color: #000;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
  `;
  btn.textContent = 'START RAID';
  btn.id = 'begin-event2';
  intro.appendChild(btn);
  container.appendChild(intro);

  setTimeout(() => {
    const button = document.getElementById('begin-event2');
    if (button) {
      button.addEventListener('click', () => {
        intro.remove();
        startStealthGame(container);
      });
    }
  }, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT 3-13: Generic Combat Missions
// ═══════════════════════════════════════════════════════════════════════════════
function createGenericCombatGame(eventId) {
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
  container.id = 'game-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #000;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  document.body.appendChild(container);

  const intro = document.createElement('div');
  intro.style.cssText = `
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #0a1419 0%, #1a3a4a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: 'DM Sans', sans-serif;
    padding: 40px;
    text-align: center;
  `;

  intro.innerHTML = `
    <h1 style="font-size: 48px; margin: 0 0 20px 0; color: #fff93e; font-family: 'Syne', sans-serif;">⚔️ EVENT ${eventId}</h1>
    <h2 style="font-size: 28px; margin: 0 0 30px 0; color: rgba(255,255,255,.9);">${titles[eventId]}</h2>
    <p style="font-size: 16px; margin: 0 0 40px 0; color: rgba(255,255,255,.8); max-width: 800px; line-height: 1.8;">
      War escalates. New battle awaits. Draw your sword and claim victory for Fortized.
    </p>
    <div style="background: rgba(255,249,62,.1); border: 2px solid rgba(255,249,62,.3); border-radius: 12px; padding: 20px; margin-bottom: 30px; max-width: 700px;">
      <p style="margin: 0; font-size: 14px;">DEFEAT ALL ENEMIES • SURVIVE THE ASSAULT</p>
    </div>
  `;

  const btn = document.createElement('button');
  btn.style.cssText = `
    padding: 15px 40px;
    background: linear-gradient(135deg, #fff93e 0%, #ffd700 100%);
    color: #0a1419;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
  `;
  btn.textContent = 'ENTER BATTLE';
  btn.id = `begin-event${eventId}`;
  intro.appendChild(btn);
  container.appendChild(intro);

  setTimeout(() => {
    const button = document.getElementById(`begin-event${eventId}`);
    if (button) {
      button.addEventListener('click', () => {
        intro.remove();
        startCombatGame(container, 20 + eventId * 2, `EVENT ${eventId}`);
      });
    }
  }, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBAT GAME ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
function startCombatGame(container, enemyCount, title) {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    display: block;
    width: 100%;
    height: 100%;
  `;
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width = window.innerWidth - 40;
  const h = canvas.height = window.innerHeight - 40;

  // Game state
  const game = {
    player: { x: 100, y: h - 100, w: 25, h: 40, health: 100, maxHealth: 100, vx: 0, vy: 0 },
    enemies: [],
    particles: [],
    gameActive: true,
    swordSwing: null,
    keys: {}
  };

  // Spawn enemies
  for (let i = 0; i < enemyCount; i++) {
    game.enemies.push({
      x: w - 200 - Math.random() * 400,
      y: 50 + Math.random() * (h - 150),
      w: 20,
      h: 35,
      health: 20,
      maxHealth: 20,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 50,
      attackCd: 0
    });
  }

  // Input
  window.addEventListener('keydown', (e) => {
    game.keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (e) => {
    game.keys[e.key.toLowerCase()] = false;
  });
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    swingSword(game, x, y);
  });

  // UI
  const uiDiv = document.createElement('div');
  uiDiv.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,.8);
    border: 2px solid rgba(255,249,62,.3);
    border-radius: 12px;
    padding: 15px 30px;
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    display: flex;
    gap: 30px;
    z-index: 1001;
  `;
  uiDiv.innerHTML = `
    <div>🛡️ Health: <span id="player-hp">100</span>/100</div>
    <div>⚔️ Enemies: <span id="enemy-count">${enemyCount}</span></div>
    <div style="color: rgba(255,255,255,.6); font-size: 12px;">Click to attack | WASD to move</div>
  `;
  document.body.appendChild(uiDiv);

  // Game loop
  function update() {
    // Player movement
    let vx = 0, vy = 0;
    if (game.keys['w'] || game.keys['arrowup']) vy -= 150;
    if (game.keys['s'] || game.keys['arrowdown']) vy += 150;
    if (game.keys['a'] || game.keys['arrowleft']) vx -= 150;
    if (game.keys['d'] || game.keys['arrowright']) vx += 150;

    game.player.vx = vx;
    game.player.vy = vy;
    game.player.x += game.player.vx * 0.016;
    game.player.y += game.player.vy * 0.016;

    // Bounds
    game.player.x = Math.max(0, Math.min(w, game.player.x));
    game.player.y = Math.max(0, Math.min(h, game.player.y));

    // Update enemies
    game.enemies = game.enemies.filter(e => {
      e.x += e.vx * 0.016;
      e.y += e.vy * 0.016;

      const dist = Math.hypot(e.x - game.player.x, e.y - game.player.y);

      // AI: chase player
      if (dist < 250) {
        const angle = Math.atan2(game.player.y - e.y, game.player.x - e.x);
        e.vx = Math.cos(angle) * 80;
        e.vy = Math.sin(angle) * 80;
      }

      // Bounds
      if (e.x < 0 || e.x > w) e.vx *= -1;
      if (e.y < 0 || e.y > h) e.vy *= -1;

      // Attack player
      e.attackCd--;
      if (dist < 50 && e.attackCd < 0) {
        game.player.health -= 3;
        e.attackCd = 30;
      }

      // Sword collision
      if (game.swordSwing) {
        const sx = game.player.x + Math.cos(game.swordSwing.angle) * 40;
        const sy = game.player.y + Math.sin(game.swordSwing.angle) * 40;
        const sdist = Math.hypot(e.x - sx, e.y - sy);
        if (sdist < 40) {
          e.health -= 25;
          if (e.health <= 0) {
            // Particle effect
            for (let i = 0; i < 8; i++) {
              game.particles.push({
                x: e.x,
                y: e.y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                life: 0.5,
                color: '#ff0000'
              });
            }
            return false;
          }
        }
      }

      return e.health > 0;
    });

    // Update particles
    game.particles = game.particles.filter(p => {
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.life -= 0.016;
      p.vy += 100 * 0.016; // gravity
      return p.life > 0;
    });

    // Sword swing animation
    if (game.swordSwing) {
      game.swordSwing.time -= 0.016;
      if (game.swordSwing.time <= 0) {
        game.swordSwing = null;
      }
    }

    // Render
    ctx.fillStyle = '#0f3a2e';
    ctx.fillRect(0, 0, w, h);

    // Draw player (green)
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(game.player.x - game.player.w / 2, game.player.y - game.player.h / 2, game.player.w, game.player.h);

    // Draw sword swing
    if (game.swordSwing) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 8;
      ctx.beginPath();
      const sx = game.player.x + Math.cos(game.swordSwing.angle) * 40;
      const sy = game.player.y + Math.sin(game.swordSwing.angle) * 40;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - Math.cos(game.swordSwing.angle) * 50, sy - Math.sin(game.swordSwing.angle) * 50);
      ctx.stroke();
    }

    // Draw enemies (red)
    ctx.fillStyle = '#ff6b6b';
    game.enemies.forEach(e => {
      ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
    });

    // Draw particles (blood)
    game.particles.forEach(p => {
      ctx.fillStyle = `rgba(255, 0, 0, ${p.life})`;
      ctx.fillRect(p.x, p.y, 3, 3);
    });

    // Health bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(20, 20, 150 * (game.player.health / game.player.maxHealth), 20);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 20);

    // UI update
    document.getElementById('player-hp').textContent = Math.round(game.player.health);
    document.getElementById('enemy-count').textContent = game.enemies.length;

    // Win/lose
    if (game.player.health <= 0) {
      endGame(false);
      return;
    }

    if (game.enemies.length === 0) {
      endGame(true);
      return;
    }

    requestAnimationFrame(update);
  }

  function swingSword(game, x, y) {
    const angle = Math.atan2(y - game.player.y, x - game.player.x);
    game.swordSwing = { angle, time: 0.2 };
  }

  function endGame(victory) {
    game.gameActive = false;
    uiDiv.remove();
    if (container) container.remove();
    toast(victory ? '✓ VICTORY!' : '✗ DEFEAT!', victory ? 'success' : 'error');
  }

  update();
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEALTH GAME
// ═══════════════════════════════════════════════════════════════════════════════
function startStealthGame(container) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    display: block;
    width: 100%;
    height: 100%;
  `;
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width = window.innerWidth - 40;
  const h = canvas.height = window.innerHeight - 40;

  const game = {
    player: { x: 50, y: h / 2, w: 18, h: 30, vx: 0, vy: 0, gold: 0 },
    caravans: [
      { x: w * 0.25, y: h * 0.3, gold: 80 },
      { x: w * 0.4, y: h * 0.6, gold: 80 },
      { x: w * 0.55, y: h * 0.35, gold: 80 },
      { x: w * 0.7, y: h * 0.65, gold: 80 }
    ],
    guards: [
      { x: w * 0.2, y: h * 0.4, range: 100, awareness: 0, vx: 50 },
      { x: w * 0.5, y: h * 0.5, range: 100, awareness: 0, vx: -50 },
      { x: w * 0.75, y: h * 0.3, range: 100, awareness: 0, vx: 50 }
    ],
    gameActive: true,
    keys: {}
  };

  window.addEventListener('keydown', (e) => game.keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', (e) => game.keys[e.key.toLowerCase()] = false);

  const uiDiv = document.createElement('div');
  uiDiv.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,.8);
    border: 2px solid rgba(74,222,128,.3);
    border-radius: 12px;
    padding: 15px 30px;
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    display: flex;
    gap: 30px;
    z-index: 1001;
  `;
  uiDiv.innerHTML = `
    <div>💰 Gold: <span id="gold-count">0</span>/300</div>
    <div>👁️ Awareness: <span id="awareness">0</span>%</div>
  `;
  document.body.appendChild(uiDiv);

  function update() {
    // Player movement
    let vx = 0, vy = 0;
    if (game.keys['w']) vy -= 150;
    if (game.keys['s']) vy += 150;
    if (game.keys['a']) vx -= 150;
    if (game.keys['d']) vx += 150;

    game.player.x += vx * 0.016;
    game.player.y += vy * 0.016;
    game.player.x = Math.max(0, Math.min(w, game.player.x));
    game.player.y = Math.max(0, Math.min(h, game.player.y));

    // Steal from caravans
    game.caravans = game.caravans.filter(c => {
      const d = Math.hypot(game.player.x - c.x, game.player.y - c.y);
      if (d < 30 && c.gold > 0) {
        game.player.gold += 2;
        c.gold -= 2;
      }
      return c.gold > 0;
    });

    // Update guards
    let maxAwareness = 0;
    game.guards.forEach(g => {
      g.x += g.vx * 0.016;
      if (g.x < 0 || g.x > w) g.vx *= -1;

      const d = Math.hypot(game.player.x - g.x, game.player.y - g.y);
      if (d < g.range) {
        g.awareness = Math.min(100, g.awareness + 1.5);
      } else {
        g.awareness = Math.max(0, g.awareness - 0.5);
      }
      maxAwareness = Math.max(maxAwareness, g.awareness);

      // Chase if aware
      if (g.awareness > 40) {
        const angle = Math.atan2(game.player.y - g.y, game.player.x - g.x);
        g.vx = Math.cos(angle) * 120;
      }
    });

    // Check escape
    if (game.player.x > w - 60 && game.player.gold >= 300) {
      endGame(true);
      return;
    }

    // Render
    ctx.fillStyle = '#0f3a3a';
    ctx.fillRect(0, 0, w, h);

    // Water waves
    ctx.strokeStyle = 'rgba(100,180,255,.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.5, 80 + i * 40, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw caravans (gold boxes)
    ctx.fillStyle = '#ff8c42';
    game.caravans.forEach(c => {
      ctx.fillRect(c.x - 20, c.y - 15, 40, 30);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('📦', c.x - 7, c.y + 5);
      ctx.fillStyle = '#ff8c42';
    });

    // Draw escape zone
    ctx.strokeStyle = 'rgba(74,222,128,.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 60, h / 2 - 80, 50, 160);

    // Draw guards with vision range
    ctx.strokeStyle = 'rgba(255,100,100,.2)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ff6b6b';
    game.guards.forEach(g => {
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(g.x - 10, g.y - 15, 20, 30);
    });

    // Draw player (green)
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(game.player.x - game.player.w / 2, game.player.y - game.player.h / 2, game.player.w, game.player.h);

    // UI update
    document.getElementById('gold-count').textContent = Math.round(game.player.gold);
    document.getElementById('awareness').textContent = Math.round(maxAwareness);

    // Game over alert (if full awareness)
    if (maxAwareness > 95) {
      endGame(false);
      return;
    }

    requestAnimationFrame(update);
  }

  function endGame(victory) {
    game.gameActive = false;
    uiDiv.remove();
    if (container) container.remove();
    toast(victory ? `✓ RAID SUCCESSFUL! Stole ${Math.round(game.player.gold)} gold!` : '✗ CAUGHT! Mission failed.', victory ? 'success' : 'error');
  }

  update();
}
