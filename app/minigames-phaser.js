/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - PHASER.JS REAL COMBAT GAMES
 * ═══════════════════════════════════════════════════════════════════════════════
 * Play as a Fortized Knight. Real sword combat, blood, enemy AI, mission objectives.
 */

// Load Phaser from CDN
if (typeof Phaser === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.js';
  script.onload = () => console.log('Phaser loaded');
  document.head.appendChild(script);
}

const CHRONICLE_PHASER_GAMES = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT 1: The Breaking of the Treaty - Cinematic Intro + First Combat
  // ═══════════════════════════════════════════════════════════════════════════════
  event1: function() {
    return {
      name: "The Breaking of the Treaty",
      create() {
        const container = document.createElement('div');
        container.id = 'game-phaser-1';
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #000;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        document.body.appendChild(container);

        // Cinematic intro sequence
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
          overflow: auto;
        `;

        intro.innerHTML = `
          <h1 style="font-size: 48px; margin: 0 0 20px 0; color: #fff93e; font-family: 'Syne', sans-serif;">⚔️ THE BREAKING OF THE TREATY</h1>
          <p style="font-size: 18px; margin: 0 0 40px 0; color: rgba(255,255,255,.8); max-width: 800px; line-height: 1.8;">
            <strong style="color: #fff93e;">Vastilly, 1452</strong><br><br>
            The Royal Court of Fortized trembles with rage. For decades, the Treaty of the Silver Stream kept two kingdoms at a fragile peace.
            But Oakhaven's greed has shattered it. Their ships blockade your trade routes. Their soldiers test your borders.
            <br><br>
            <em>The King has spoken. War is declared.</em>
            <br><br>
            You are summoned as a Knight of Vastilly. Your orders are clear:
            <strong>Lead the first strike against Oakhaven forces gathering at the Silver Stream.</strong>
          </p>

          <div style="background: rgba(255,249,62,.1); border: 2px solid rgba(255,249,62,.3); border-radius: 12px; padding: 20px; margin-bottom: 30px; max-width: 700px;">
            <p style="margin: 0; color: rgba(255,255,255,.9); font-size: 15px;">
              <strong>MISSION OBJECTIVE:</strong><br>
              Defeat 15 Oakhaven soldiers and destroy the supply depot before reinforcements arrive.
            </p>
          </div>

          <button id="start-event1-btn" style="
            padding: 15px 40px;
            background: linear-gradient(135deg, #fff93e 0%, #ffd700 100%);
            color: #0a1419;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
          ">BEGIN MISSION</button>
        `;

        container.appendChild(intro);

        document.getElementById('start-event1-btn').onclick = () => {
          intro.remove();
          this.startCombat();
        };

        this.container = container;
      },

      startCombat() {
        // Create Phaser game instance
        const config = {
          type: Phaser.AUTO,
          width: Math.min(1200, window.innerWidth - 40),
          height: Math.min(700, window.innerHeight - 40),
          parent: this.container,
          physics: {
            default: 'arcade',
            arcade: { gravity: { y: 0 }, debug: false }
          },
          scene: {
            preload: () => this.preload(),
            create: (scene) => this.createScene(scene),
            update: (scene) => this.updateScene(scene)
          }
        };

        this.game = new Phaser.Game(config);
      },

      preload() {
        // Graphics will be drawn, no image preload needed
      },

      createScene(scene) {
        this.scene = scene;

        // Background
        scene.add.rectangle(scene.sys.canvas.width / 2, scene.sys.canvas.height / 2,
          scene.sys.canvas.width, scene.sys.canvas.height, 0x0f3a2e);

        // Draw terrain
        for (let i = 0; i < 5; i++) {
          scene.add.rectangle(
            i * (scene.sys.canvas.width / 5),
            scene.sys.canvas.height * 0.7,
            scene.sys.canvas.width / 5 + 20,
            scene.sys.canvas.height * 0.3,
            0x1a5a4e,
            0.3
          );
        }

        // Player knight
        this.player = scene.add.rectangle(100, scene.sys.canvas.height - 100, 25, 40, 0x4ade80);
        this.player.health = 100;
        this.player.maxHealth = 100;
        scene.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        // Enemy group
        this.enemies = scene.physics.add.group();
        this.spawnEnemies(scene, 15);

        // Supply depot (objective)
        this.depot = scene.add.rectangle(scene.sys.canvas.width - 80, 150, 60, 80, 0xff8c42);
        this.depot.health = 50;
        this.depot.maxHealth = 50;
        scene.physics.add.existing(this.depot);

        // Blood particles
        this.bloodParticles = scene.add.particles(0xff0000);
        this.bloodParticles.createEmitter({
          speed: { min: -200, max: 200 },
          angle: { min: 240, max: 300 },
          scale: { start: 1, end: 0 },
          lifespan: 400,
          emitting: false
        });

        // Sword attack
        this.sword = null;
        this.swordCooldown = 0;

        // UI
        this.createUI(scene);

        // Input
        this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE');
        scene.input.on('pointerdown', (pointer) => this.attackAt(scene, pointer.x, pointer.y));
      },

      spawnEnemies(scene, count) {
        for (let i = 0; i < count; i++) {
          const enemy = scene.add.rectangle(
            scene.sys.canvas.width - 150 - Math.random() * 300,
            100 + Math.random() * 300,
            20, 35,
            0xff6b6b
          );
          enemy.health = 20;
          enemy.maxHealth = 20;
          enemy.vx = (Math.random() - 0.5) * 100;
          enemy.vy = (Math.random() - 0.5) * 50;
          enemy.attackCooldown = Math.random() * 60;

          scene.physics.add.existing(enemy);
          enemy.body.setCollideWorldBounds(true);
          enemy.body.setBounce(0.8);
          this.enemies.add(enemy);
        }
      },

      updateScene(scene) {
        // Player movement
        const moveSpeed = 150;
        let vx = 0, vy = 0;
        if (this.keys.W.isDown || this.keys.UP.isDown) vy -= moveSpeed;
        if (this.keys.S.isDown || this.keys.DOWN.isDown) vy += moveSpeed;
        if (this.keys.A.isDown || this.keys.LEFT.isDown) vx -= moveSpeed;
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx += moveSpeed;

        this.player.body.setVelocity(vx, vy);

        // Sword cooldown
        if (this.swordCooldown > 0) this.swordCooldown--;

        // Update enemies
        this.enemies.children.entries.forEach(enemy => {
          enemy.body.setVelocity(enemy.vx, enemy.vy);

          // Enemy AI - move toward player
          const dist = Phaser.Math.Distance.Between(
            enemy.x, enemy.y,
            this.player.x, this.player.y
          );

          if (dist < 200) {
            const angle = Phaser.Math.Angle.Between(
              enemy.x, enemy.y,
              this.player.x, this.player.y
            );
            enemy.vx = Math.cos(angle) * 80;
            enemy.vy = Math.sin(angle) * 80;
          }

          // Enemy attack player
          enemy.attackCooldown--;
          if (dist < 40 && enemy.attackCooldown < 0) {
            this.player.health -= 5;
            enemy.attackCooldown = 60;
          }

          // Collision with player sword
          if (this.sword && Phaser.Geom.Rectangle.Overlaps(
            this.sword.getBounds(),
            enemy.getBounds()
          )) {
            enemy.health -= 30;
            if (enemy.health <= 0) {
              // Blood effect
              this.bloodParticles.emitParticleAt(enemy.x, enemy.y, 10);
              enemy.destroy();
            }
          }
        });

        // Sword update
        if (this.sword) {
          if (!this.sword.active) {
            this.sword.destroy();
            this.sword = null;
          }
        }

        // Depot collision with enemies
        this.enemies.children.entries.forEach(enemy => {
          if (Phaser.Geom.Rectangle.Overlaps(
            enemy.getBounds(),
            this.depot.getBounds()
          )) {
            enemy.x = this.depot.x + 100;
            enemy.y = this.depot.y;
          }
        });

        // Update UI
        document.getElementById('player-health').textContent = Math.max(0, Math.round(this.player.health));
        document.getElementById('enemies-remaining').textContent = this.enemies.children.entries.length;
        document.getElementById('depot-health').textContent = Math.max(0, Math.round(this.depot.health));

        // Health bars
        const w = scene.sys.canvas.width;
        const h = scene.sys.canvas.height;

        // Player health bar
        scene.graphics.clear();
        scene.graphics.fillStyle(0xff0000, 1);
        scene.graphics.fillRect(20, 20, 150 * (this.player.health / this.player.maxHealth), 20);
        scene.graphics.lineStyle(2, 0xffffff);
        scene.graphics.strokeRect(20, 20, 150, 20);

        // Depot health bar
        scene.graphics.fillStyle(0xff8c42, 1);
        scene.graphics.fillRect(w - 170, 20, 150 * (this.depot.health / this.depot.maxHealth), 20);
        scene.graphics.lineStyle(2, 0xffffff);
        scene.graphics.strokeRect(w - 170, 20, 150, 20);

        // Check win/loss
        if (this.player.health <= 0) {
          this.endGame(false);
          return;
        }

        if (this.enemies.children.entries.length === 0 && this.depot.health <= 0) {
          this.endGame(true);
          return;
        }
      },

      attackAt(scene, x, y) {
        if (this.swordCooldown > 0) return;

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y);
        this.sword = scene.add.rectangle(
          this.player.x + Math.cos(angle) * 40,
          this.player.y + Math.sin(angle) * 40,
          50, 15,
          0xffd700
        );

        this.sword.rotation = angle;
        scene.physics.add.existing(this.sword);

        this.swordCooldown = 30;

        setTimeout(() => {
          if (this.sword && this.sword.active) {
            this.sword.destroy();
            this.sword = null;
          }
        }, 200);
      },

      createUI(scene) {
        // Create graphics object for health bars
        this.scene.graphics = scene.add.graphics();

        const uiDiv = document.createElement('div');
        uiDiv.style.cssText = `
          position: absolute;
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
          z-index: 1000;
        `;

        uiDiv.innerHTML = `
          <div>🛡️ Health: <span id="player-health">100</span>/100</div>
          <div>⚔️ Enemies: <span id="enemies-remaining">15</span></div>
          <div>📦 Depot: <span id="depot-health">50</span>/50</div>
          <div style="color: rgba(255,255,255,.6); font-size: 12px;">Click to attack | WASD to move</div>
        `;

        scene.sys.canvas.parentElement.appendChild(uiDiv);
        this.uiDiv = uiDiv;
      },

      endGame(victory) {
        if (this.game) this.game.destroy();
        if (this.uiDiv) this.uiDiv.remove();

        const msg = victory
          ? '✓ VICTORY! Treaty broken. War has begun.'
          : '✗ DEFEAT! Your forces were overwhelmed.';

        toast(msg, victory ? 'success' : 'error');
        setTimeout(() => {
          this.container.remove();
        }, 2000);
      }
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT 2: Raid on the Silver Stream - Stealth + Combat Hybrid
  // ═══════════════════════════════════════════════════════════════════════════════
  event2: function() {
    return {
      name: "Raid on the Silver Stream",
      create() {
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #000;
          z-index: 9999;
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
          <p style="font-size: 16px; margin: 0 0 30px 0; color: rgba(255,255,255,.8); max-width: 800px; line-height: 1.8;">
            <strong>Oakhaven Trade Route, Night Fall</strong><br><br>
            Enemy supply caravans cross the Silver Stream daily. This is your chance to strike from the shadows.
            Ambush merchants, steal supplies, and vanish before guards reinforce the area.
            <br><br>
            <strong style="color: #4ade80;">MISSION: Steal 300 gold worth of supplies. Avoid detection until you escape.</strong>
          </p>

          <button id="start-event2-btn" style="
            padding: 15px 40px;
            background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
            color: #000;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
          ">START RAID</button>
        `;

        container.appendChild(intro);
        document.getElementById('start-event2-btn').onclick = () => {
          intro.remove();
          this.startRaid();
        };

        this.container = container;
      },

      startRaid() {
        const config = {
          type: Phaser.AUTO,
          width: Math.min(1200, window.innerWidth - 40),
          height: Math.min(700, window.innerHeight - 40),
          parent: this.container,
          physics: { default: 'arcade', arcade: { debug: false } },
          scene: {
            create: (scene) => this.createScene(scene),
            update: (scene) => this.updateScene(scene)
          }
        };

        this.game = new Phaser.Game(config);
      },

      createScene(scene) {
        this.scene = scene;
        const w = scene.sys.canvas.width;
        const h = scene.sys.canvas.height;

        // Background river
        scene.add.rectangle(w / 2, h / 2, w, h, 0x0f3a3a);

        // Water effect
        for (let i = 0; i < 5; i++) {
          scene.add.rectangle(w / 2, h * 0.5, w, 40, 0x1a5a6e, 0.2);
        }

        // Player
        this.player = scene.add.rectangle(50, h - 100, 20, 35, 0x4ade80);
        this.player.health = 100;
        this.stolen = 0;
        scene.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        // Caravans to raid
        this.caravans = [];
        for (let i = 0; i < 4; i++) {
          const caravan = scene.add.rectangle(
            w * 0.3 + i * 150,
            h * 0.4 + Math.random() * 100,
            50, 35,
            0xff8c42
          );
          caravan.value = 100;
          caravan.maxValue = 100;
          scene.physics.add.existing(caravan);
          this.caravans.push(caravan);
        }

        // Guards
        this.guards = [];
        for (let i = 0; i < 3; i++) {
          const guard = scene.add.rectangle(
            w * 0.2 + i * 250,
            h * 0.35,
            18, 30,
            0xff6b6b
          );
          guard.health = 40;
          guard.range = 120;
          guard.awareness = 0;
          guard.vx = (Math.random() - 0.5) * 50;
          scene.physics.add.existing(guard);
          this.guards.push(guard);
        }

        // Escape zone
        this.escape = scene.add.rectangle(w - 50, h / 2, 40, 200, 0x4ade80, 0.3);
        scene.physics.add.existing(this.escape);

        this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE');
        this.graphics = scene.add.graphics();
        this.createUI(scene);
      },

      updateScene(scene) {
        const w = scene.sys.canvas.width;
        const h = scene.sys.canvas.height;

        // Player movement
        let vx = 0, vy = 0;
        if (this.keys.W.isDown) vy -= 150;
        if (this.keys.S.isDown) vy += 150;
        if (this.keys.A.isDown) vx -= 150;
        if (this.keys.D.isDown) vx += 150;
        this.player.body.setVelocity(vx, vy);

        // Steal from caravans
        this.caravans.forEach(c => {
          if (Phaser.Geom.Rectangle.Overlaps(c.getBounds(), this.player.getBounds())) {
            if (this.stolen < 300) {
              c.value -= 2;
              this.stolen += 2;
              if (c.value <= 0) c.value = 0;
            }
          }
        });

        // Guard AI and awareness
        this.guards.forEach(g => {
          g.body.setVelocity(g.vx, g.vy);
          const distToPlayer = Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y);

          if (distToPlayer < g.range) {
            g.awareness = Math.min(100, g.awareness + 2);
            // Red overlay when guard sees you
            if (g.awareness > 50) {
              const angle = Phaser.Math.Angle.Between(g.x, g.y, this.player.x, this.player.y);
              g.vx = Math.cos(angle) * 120;
              g.vy = Math.sin(angle) * 120;

              // Attack
              if (distToPlayer < 35) {
                this.player.health -= 1;
              }
            }
          } else {
            g.awareness = Math.max(0, g.awareness - 0.5);
          }

          // Bounds
          if (g.x < 0 || g.x > w) g.vx *= -1;
          if (g.y < 0 || g.y > h) g.vy *= -1;
        });

        // Draw
        this.graphics.clear();

        // Guard detection ranges
        this.guards.forEach(g => {
          this.graphics.lineStyle(1, g.awareness > 50 ? 0xff6b6b : 0xff6b6b, g.awareness > 50 ? 0.4 : 0.15);
          this.graphics.beginPath();
          this.graphics.arc(g.x, g.y, g.range, 0, Math.PI * 2);
          this.graphics.strokePath();
        });

        // Check escape
        if (Phaser.Geom.Rectangle.Overlaps(this.escape.getBounds(), this.player.getBounds())) {
          this.endRaid(this.stolen >= 300);
          return;
        }

        if (this.player.health <= 0) {
          this.endRaid(false);
          return;
        }

        // UI
        document.getElementById('raid-stolen').textContent = Math.round(this.stolen) + '/300';
        document.getElementById('raid-health').textContent = Math.round(this.player.health);

        const awarenessMax = Math.max(...this.guards.map(g => g.awareness));
        document.getElementById('raid-awareness').textContent = Math.round(awarenessMax);
      },

      createUI(scene) {
        const uiDiv = document.createElement('div');
        uiDiv.style.cssText = `
          position: absolute;
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
          z-index: 1000;
        `;

        uiDiv.innerHTML = `
          <div>💰 Stolen: <span id="raid-stolen">0/300</span></div>
          <div>🛡️ Health: <span id="raid-health">100</span></div>
          <div>👁️ Guard Awareness: <span id="raid-awareness">0</span>%</div>
        `;

        scene.sys.canvas.parentElement.appendChild(uiDiv);
        this.uiDiv = uiDiv;
      },

      endRaid(success) {
        if (this.game) this.game.destroy();
        if (this.uiDiv) this.uiDiv.remove();

        const msg = success
          ? `✓ RAID SUCCESS! Stole ${Math.round(this.stolen)} gold worth of supplies.`
          : '✗ RAID FAILED! Caught or defeated.';

        toast(msg, success ? 'success' : 'error');
        setTimeout(() => this.container.remove(), 2000);
      }
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERIC COMBAT MISSION TEMPLATE (Events 3-13)
  // ═══════════════════════════════════════════════════════════════════════════════
  createCombatMission: function(eventId, title, description, objectives) {
    return {
      name: title,
      create() {
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #000;
          z-index: 9999;
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
          <h2 style="font-size: 28px; margin: 0 0 30px 0; color: rgba(255,255,255,.9);">${title}</h2>
          <p style="font-size: 16px; margin: 0 0 30px 0; color: rgba(255,255,255,.8); max-width: 800px; line-height: 1.8;">${description}</p>

          <div style="background: rgba(255,249,62,.1); border: 2px solid rgba(255,249,62,.3); border-radius: 12px; padding: 20px; margin-bottom: 30px; max-width: 700px;">
            <p style="margin: 0; color: rgba(255,255,255,.9); font-size: 14px;">
              <strong>MISSION OBJECTIVES:</strong><br>${objectives.map(o => `• ${o}`).join('<br>')}
            </p>
          </div>

          <button id="start-mission-btn" style="
            padding: 15px 40px;
            background: linear-gradient(135deg, #fff93e 0%, #ffd700 100%);
            color: #0a1419;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
          ">ENTER BATTLE</button>
        `;

        container.appendChild(intro);
        document.getElementById('start-mission-btn').onclick = () => {
          intro.remove();
          this.startCombat();
        };

        this.container = container;
      },

      startCombat() {
        const config = {
          type: Phaser.AUTO,
          width: Math.min(1200, window.innerWidth - 40),
          height: Math.min(700, window.innerHeight - 40),
          parent: this.container,
          physics: { default: 'arcade', arcade: { debug: false } },
          scene: {
            create: (scene) => this.createScene(scene),
            update: (scene) => this.updateScene(scene)
          }
        };

        this.game = new Phaser.Game(config);
      },

      createScene(scene) {
        this.scene = scene;
        const w = scene.sys.canvas.width;
        const h = scene.sys.canvas.height;

        scene.add.rectangle(w / 2, h / 2, w, h, 0x0a1419);

        // Player
        this.player = scene.add.rectangle(100, h - 100, 25, 40, 0x4ade80);
        this.player.health = 100;
        scene.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        // Enemies
        this.enemies = scene.physics.add.group();
        for (let i = 0; i < 20; i++) {
          const e = scene.add.rectangle(
            w - 150 - Math.random() * 300,
            50 + Math.random() * (h - 200),
            20, 35,
            0xff6b6b
          );
          e.health = 20;
          scene.physics.add.existing(e);
          this.enemies.add(e);
        }

        this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE');
        this.swordCooldown = 0;
        this.graphics = scene.add.graphics();

        scene.input.on('pointerdown', (p) => this.attackAt(scene, p.x, p.y));
        this.createUI(scene);
      },

      updateScene(scene) {
        const w = scene.sys.canvas.width;
        const h = scene.sys.canvas.height;

        // Player movement
        let vx = 0, vy = 0;
        if (this.keys.W.isDown) vy -= 150;
        if (this.keys.S.isDown) vy += 150;
        if (this.keys.A.isDown) vx -= 150;
        if (this.keys.D.isDown) vx += 150;
        this.player.body.setVelocity(vx, vy);

        // Enemy AI
        this.enemies.children.entries.forEach(e => {
          const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
          if (d < 150) {
            const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
            e.body.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);

            if (d < 35) this.player.health -= 0.5;
          } else {
            e.body.setVelocity((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50);
          }
        });

        if (this.swordCooldown > 0) this.swordCooldown--;

        document.getElementById('combat-health').textContent = Math.round(this.player.health);
        document.getElementById('combat-enemies').textContent = this.enemies.children.entries.length;

        if (this.player.health <= 0) {
          this.endMission(false);
          return;
        }

        if (this.enemies.children.entries.length === 0) {
          this.endMission(true);
          return;
        }
      },

      attackAt(scene, x, y) {
        if (this.swordCooldown > 0) return;

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y);
        const sword = scene.add.rectangle(
          this.player.x + Math.cos(angle) * 35,
          this.player.y + Math.sin(angle) * 35,
          45, 12,
          0xffd700
        );

        this.enemies.children.entries.forEach(e => {
          if (Phaser.Geom.Rectangle.Overlaps(sword.getBounds(), e.getBounds())) {
            e.health -= 30;
            if (e.health <= 0) e.destroy();
          }
        });

        this.swordCooldown = 25;
        setTimeout(() => sword.destroy(), 150);
      },

      createUI(scene) {
        const uiDiv = document.createElement('div');
        uiDiv.style.cssText = `
          position: absolute;
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
          z-index: 1000;
        `;

        uiDiv.innerHTML = `
          <div>🛡️ Health: <span id="combat-health">100</span>/100</div>
          <div>⚔️ Enemies: <span id="combat-enemies">20</span></div>
        `;

        scene.sys.canvas.parentElement.appendChild(uiDiv);
        this.uiDiv = uiDiv;
      },

      endMission(victory) {
        if (this.game) this.game.destroy();
        if (this.uiDiv) this.uiDiv.remove();

        toast(victory ? `✓ VICTORY!` : `✗ DEFEAT!`, victory ? 'success' : 'error');
        setTimeout(() => this.container.remove(), 2000);
      }
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER LAUNCHER
// ═══════════════════════════════════════════════════════════════════════════════
function launchChronicleMinigame(eventId) {
  const games = {
    1: () => CHRONICLE_PHASER_GAMES.event1().create(),
    2: () => CHRONICLE_PHASER_GAMES.event2().create(),
    3: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      3,
      "The Burning of Elowen's Outskirts",
      "Strike fast. Elowen's supply depots must burn before reinforcements arrive.",
      ["Destroy 5 supply caches", "Defeat 25+ enemy soldiers", "Escape the perimeter"]
    ).create(),
    4: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      4,
      "Battle of the Timber Roads",
      "Dense forests become a battlefield. Navigate the terrain. Defeat the ambush.",
      ["Hold the forest position", "Defeat 30+ Oakhaven fighters", "Secure the northern passage"]
    ).create(),
    5: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      5,
      "Defense of Vastilly Outer Walls",
      "Enemy forces assault your walls. Stand firm. Hold the line.",
      ["Repel 3 waves of attackers", "Defeat 40+ enemies", "Defend all 3 wall sections"]
    ).create(),
    6: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      6,
      "The Fenwick Canal Skirmishes",
      "Control the waterways. Use terrain against your enemies.",
      ["Secure 3 canal control points", "Defeat 25+ enemies", "Prevent supply boats escape"]
    ).create(),
    7: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      7,
      "The Ironstall Contracts",
      "Defend the forges. Mercenaries test your strength.",
      ["Protect the forge", "Defeat 20+ mercenary fighters", "Secure the weapon stockpiles"]
    ).create(),
    8: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      8,
      "The Glassport Blockade",
      "Naval warfare. Enemy ships approach. Hold the harbor.",
      ["Defend the harbor", "Sink 15+ enemy ship crews", "Prevent supply reinforcements"]
    ).create(),
    9: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      9,
      "The Siege of Port-Crest",
      "The defining battle. Four phases of combat. Destiny awaits.",
      ["Phase 1: Deploy sea traps", "Phase 2: Defend against boarding", "Phase 3: Survive the onslaught"]
    ).create(),
    10: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      10,
      "The 14-Day Bombardment",
      "Relentless artillery. Survive. Endure. Hold position.",
      ["Survive 14 days of bombardment", "Maintain defensive positions", "Keep morale above 50%"]
    ).create(),
    11: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      11,
      "The Harbour of Wrecks",
      "Graveyard of ships. Salvage what remains. Secure the harbor.",
      ["Navigate wreckage", "Defeat remaining enemies", "Secure final harbor control"]
    ).create(),
    12: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      12,
      "The Push into Oakhaven",
      "The final offensive. March toward the enemy capital.",
      ["Advance through enemy lines", "Defeat 50+ enemies", "Reach the capital gates"]
    ).create(),
    13: () => CHRONICLE_PHASER_GAMES.createCombatMission(
      13,
      "The Fall of Elowen",
      "Final siege. Storm the capital. Victory awaits.",
      ["Breach the city gates", "Defeat 60+ defenders", "Claim Elowen for Fortized"]
    ).create()
  };

  if (games[eventId]) {
    try {
      games[eventId]();
    } catch (e) {
      console.error('Game error:', e);
      toast(`Failed to launch event ${eventId}`, 'error');
    }
  }
}
