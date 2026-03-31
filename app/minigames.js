/**
 * ═══════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - MINIGAMES SYSTEM
 * ═══════════════════════════════════════════════════════════
 * Playable 2D minigames for each event in Chapter 1
 * Each game lasts ~10 minutes and is fully interactive
 */

const FTZ_MINIGAMES = {
  // ═══════════════════════════════════════════════════════════
  // EVENT 1: The Breaking of the Treaty - Negotiation/Persuasion Game
  // ═══════════════════════════════════════════════════════════
  breakingOfTreaty: function() {
    return {
      name: "The Breaking of the Treaty",
      duration: 600000, // 10 minutes
      create() {
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #0a1929 0%, #1a3a52 100%);
          z-index: 9999; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: white; font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        `;

        const gameDiv = document.createElement('div');
        gameDiv.style.cssText = `
          width: 90%; max-width: 900px; height: 90vh;
          background: rgba(12,15,22,.95);
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 20px;
          padding: 40px;
          display: flex; flex-direction: column;
          overflow-y: auto;
        `;

        // Header
        const header = document.createElement('div');
        header.innerHTML = `
          <h2 style="font-size: 28px; margin: 0 0 10px 0; color: #fff93e;">The Breaking of the Treaty</h2>
          <p style="color: rgba(255,255,255,.6); margin: 0; font-size: 14px;">Negotiate with the Council of Vastilly - Persuade them to your side</p>
          <div style="margin-top: 20px; height: 8px; background: rgba(255,255,255,.1); border-radius: 4px; overflow: hidden;">
            <div id="timeBar" style="height: 100%; background: linear-gradient(90deg, #4ade80, #fff93e); width: 100%; transition: width 0.1s;"></div>
          </div>
        `;
        gameDiv.appendChild(header);

        // Current councilor and dialogue
        const councilDiv = document.createElement('div');
        councilDiv.style.cssText = `
          margin-top: 30px;
          padding: 20px;
          background: rgba(255,249,62,.05);
          border: 1px solid rgba(255,249,62,.2);
          border-radius: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
        `;

        const councilName = document.createElement('div');
        councilName.id = 'councilName';
        councilName.style.cssText = `
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #fff93e;
        `;

        const dialogue = document.createElement('div');
        dialogue.id = 'dialogue';
        dialogue.style.cssText = `
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
          color: rgba(255,255,255,.9);
          flex: 1;
          font-style: italic;
        `;

        const persuasionMeter = document.createElement('div');
        persuasionMeter.style.cssText = `
          margin: 15px 0;
          font-size: 12px;
          color: rgba(255,255,255,.6);
        `;
        persuasionMeter.innerHTML = `
          Persuasion Level: <span id="persuasion">50</span>%
          <div style="height: 6px; background: rgba(255,255,255,.1); border-radius: 3px; margin-top: 8px; overflow: hidden;">
            <div id="persuasionBar" style="height: 100%; background: linear-gradient(90deg, #ef4444, #fff93e, #4ade80); width: 50%;"></div>
          </div>
        `;

        councilDiv.appendChild(councilName);
        councilDiv.appendChild(dialogue);
        councilDiv.appendChild(persuasionMeter);
        gameDiv.appendChild(councilDiv);

        // Choice buttons
        const choicesDiv = document.createElement('div');
        choicesDiv.id = 'choices';
        choicesDiv.style.cssText = `
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 20px;
        `;
        gameDiv.appendChild(choicesDiv);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
          margin-top: 20px;
          padding: 12px 24px;
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.2);
          color: rgba(255,255,255,.6);
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        `;
        closeBtn.innerHTML = 'Quit';
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,.15)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,.1)';
        closeBtn.onclick = () => this.stop();
        gameDiv.appendChild(closeBtn);

        container.appendChild(gameDiv);
        document.body.appendChild(container);
        this.container = container;

        // Game state
        this.startTime = Date.now();
        this.timeLimit = 600000;
        this.persuasion = 50;
        this.councilors = [
          { name: "Lord Marchant", intro: "The trade envoy eyes you skeptically. 'Why should we abandon the Silver Stream Treaty?'" },
          { name: "Lady Vesper", intro: "The military commander crosses her arms. 'What assurances can you offer us?'" },
          { name: "Magistrate Kolin", intro: "The elder leans forward. 'The people fear the unknown. How will you keep them safe?'" }
        ];
        this.currentCouncilor = 0;
        this.roundsWon = 0;

        this.updateDisplay();
        this.startTimer();
      },

      updateDisplay() {
        document.getElementById('councilName').textContent = this.councilors[this.currentCouncilor].name;
        document.getElementById('dialogue').textContent = this.councilors[this.currentCouncilor].intro;
        document.getElementById('persuasion').textContent = Math.round(this.persuasion);
        document.getElementById('persuasionBar').style.width = Math.min(100, Math.max(0, this.persuasion)) + '%';

        const choices = [
          { text: "Appeal to honor & tradition", effect: 8 },
          { text: "Emphasize economic benefits", effect: 12 },
          { text: "Stress military advantage", effect: 15 },
          { text: "Warn of consequences of inaction", effect: 10 }
        ];

        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';
        choices.forEach((choice, i) => {
          const btn = document.createElement('button');
          btn.style.cssText = `
            padding: 12px;
            background: rgba(255,249,62,.1);
            border: 1px solid rgba(255,249,62,.3);
            color: rgba(255,255,255,.9);
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
          `;
          btn.innerHTML = choice.text;
          btn.onmouseover = () => btn.style.background = 'rgba(255,249,62,.2)';
          btn.onmouseout = () => btn.style.background = 'rgba(255,249,62,.1)';
          btn.onclick = () => this.makeChoice(choice.effect);
          choicesDiv.appendChild(btn);
        });
      },

      makeChoice(effect) {
        this.persuasion += (Math.random() * effect - effect * 0.25);
        this.persuasion = Math.min(100, Math.max(0, this.persuasion));

        if (this.persuasion > 75) {
          this.roundsWon++;
          this.currentCouncilor = (this.currentCouncilor + 1) % this.councilors.length;
          this.persuasion = 50;

          if (this.roundsWon >= 3) {
            this.end(true);
          }
        }
        this.updateDisplay();
      },

      startTimer() {
        this.timer = setInterval(() => {
          const elapsed = Date.now() - this.startTime;
          const remaining = Math.max(0, this.timeLimit - elapsed);
          const percent = (remaining / this.timeLimit) * 100;
          const timeBar = document.getElementById('timeBar');
          if (timeBar) timeBar.style.width = percent + '%';

          if (remaining === 0) {
            clearInterval(this.timer);
            this.end(this.roundsWon >= 3);
          }
        }, 100);
      },

      end(success) {
        clearInterval(this.timer);
        const message = success
          ? `✓ Treaty broken! You persuaded the Council with ${this.roundsWon} alliances.`
          : `✗ The Council remained unmoved. The treaty stands.`;
        toast(message, success ? 'success' : 'warning');
        this.stop();
      },

      stop() {
        if (this.timer) clearInterval(this.timer);
        if (this.container) this.container.remove();
      }
    };
  },

  // ═══════════════════════════════════════════════════════════
  // EVENT 2: Raid on the Silver Stream - Stealth Action Game
  // ═══════════════════════════════════════════════════════════
  raidSilverStream: function() {
    return {
      name: "Raid on the Silver Stream",
      create() {
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0a1929;
          z-index: 9999; display: flex; align-items: center; justify-content: center;
        `;

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1000, window.innerWidth - 40);
        canvas.height = Math.min(700, window.innerHeight - 40);
        canvas.style.cssText = `
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 8px;
          background: linear-gradient(180deg, #1a3a52 0%, #0a1929 100%);
          display: block;
        `;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          position: relative;
          background: rgba(0,0,0,.8);
          padding: 20px;
          border-radius: 20px;
          width: 90%;
          max-width: 1000px;
        `;
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        document.body.appendChild(container);

        const ctx = canvas.getContext('2d');
        this.canvas = canvas;
        this.ctx = ctx;
        this.container = container;

        // Game state
        this.player = { x: 50, y: canvas.height - 100, size: 20, health: 100 };
        this.goal = { x: canvas.width - 50, y: 100, size: 15 };
        this.guards = [
          { x: 200, y: 150, vx: 2, vy: 0, size: 15, range: 100 },
          { x: 400, y: 300, vx: -1.5, vy: 1, size: 15, range: 100 },
          { x: 600, y: 200, vx: 1, vy: 2, size: 15, range: 100 }
        ];
        this.obstacles = [
          { x: 300, y: 250, w: 80, h: 100 },
          { x: 700, y: 150, w: 100, h: 150 }
        ];
        this.startTime = Date.now();
        this.detected = false;
        this.won = false;
        this.keys = {};

        // Input
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        canvas.addEventListener('click', (e) => this.handleClick(e));

        // Draw instructions
        const info = document.createElement('div');
        info.style.cssText = `
          color: rgba(255,255,255,.7);
          font-size: 12px;
          margin-top: 10px;
          text-align: center;
        `;
        info.innerHTML = `
          <strong style="color: #fff93e;">Arrow Keys</strong> to move | Avoid guards | Reach the treasure (yellow)
          <br><span id="status" style="color: #4ade80;">STEALTH MODE</span> | Health: <span id="health">100</span>%
        `;
        wrapper.appendChild(info);

        this.render();
      },

      render() {
        const { ctx, canvas } = this;
        const elapsed = (Date.now() - this.startTime) / 1000;

        // Clear
        ctx.fillStyle = 'rgba(26,58,82,.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Water background
        ctx.strokeStyle = 'rgba(100,180,255,.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < elapsed * 50; i += 40) {
          ctx.beginPath();
          ctx.arc(canvas.width / 2 + Math.sin(i * 0.1) * 100, 300, 40, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Obstacles
        ctx.fillStyle = 'rgba(100,100,100,.3)';
        this.obstacles.forEach(obs => ctx.fillRect(obs.x, obs.y, obs.w, obs.h));

        // Guards
        this.guards.forEach((g, i) => {
          g.x += g.vx;
          g.y += g.vy;
          if (g.x < 0 || g.x > canvas.width) g.vx *= -1;
          if (g.y < 0 || g.y > canvas.height) g.vy *= -1;

          const dist = Math.hypot(g.x - this.player.x, g.y - this.player.y);
          if (dist < g.range) {
            ctx.strokeStyle = this.detected ? '#ff4444' : 'rgba(255,100,100,.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.range, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (dist < g.size + this.player.size + 5) {
            this.detected = true;
            this.player.health -= 2;
          }

          ctx.fillStyle = this.detected ? '#ff4444' : '#ff6b6b';
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.fillText('G', g.x - 4, g.y + 4);
        });

        // Player
        const moveSpeed = 3;
        if (this.keys['arrowup'] || this.keys['w']) this.player.y -= moveSpeed;
        if (this.keys['arrowdown'] || this.keys['s']) this.player.y += moveSpeed;
        if (this.keys['arrowleft'] || this.keys['a']) this.player.x -= moveSpeed;
        if (this.keys['arrowright'] || this.keys['d']) this.player.x += moveSpeed;

        // Collision with obstacles
        this.obstacles.forEach(obs => {
          if (this.player.x > obs.x && this.player.x < obs.x + obs.w &&
              this.player.y > obs.y && this.player.y < obs.y + obs.h) {
            this.player.x = Math.max(this.player.x - moveSpeed, obs.x - 20);
          }
        });

        // Bounds
        this.player.x = Math.max(0, Math.min(canvas.width, this.player.x));
        this.player.y = Math.max(0, Math.min(canvas.height, this.player.y));

        ctx.fillStyle = this.detected ? '#ff4444' : '#4ade80';
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.size, 0, Math.PI * 2);
        ctx.fill();

        // Goal
        ctx.fillStyle = '#fff93e';
        ctx.beginPath();
        ctx.arc(this.goal.x, this.goal.y, this.goal.size, 0, Math.PI * 2);
        ctx.fill();

        // Check goal
        if (Math.hypot(this.player.x - this.goal.x, this.player.y - this.goal.y) < this.player.size + this.goal.size) {
          this.won = true;
        }

        // Update UI
        document.getElementById('health').textContent = Math.round(this.player.health);
        document.getElementById('status').textContent = this.detected ? '⚠ DETECTED' : '✓ STEALTH';
        document.getElementById('status').style.color = this.detected ? '#ff4444' : '#4ade80';

        if (this.player.health <= 0) {
          toast('✗ Mission failed - captured!', 'error');
          this.stop();
          return;
        }

        if (this.won) {
          toast('✓ Treasure secured! Silver Stream raided successfully!', 'success');
          this.stop();
          return;
        }

        requestAnimationFrame(() => this.render());
      },

      handleClick(e) {},

      stop() {
        this.container.remove();
        window.removeEventListener('keydown', (e) => {});
        window.removeEventListener('keyup', (e) => {});
      }
    };
  },

  // ═══════════════════════════════════════════════════════════
  // EVENT 3: The Burning of Elowen's Outskirts - Action Combat Game
  // ═══════════════════════════════════════════════════════════
  burningElowen: function() {
    return {
      name: "The Burning of Elowen's Outskirts",
      create() {
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0a1929;
          z-index: 9999; display: flex; align-items: center; justify-content: center;
        `;

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1000, window.innerWidth - 40);
        canvas.height = Math.min(700, window.innerHeight - 40);
        canvas.style.cssText = `
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 8px;
          background: linear-gradient(180deg, #4a1616 0%, #1a0a0a 100%);
          display: block;
        `;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          position: relative;
          background: rgba(0,0,0,.8);
          padding: 20px;
          border-radius: 20px;
          width: 90%;
          max-width: 1000px;
        `;
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        document.body.appendChild(container);

        const ctx = canvas.getContext('2d');
        this.canvas = canvas;
        this.ctx = ctx;
        this.container = container;

        // Game state
        this.player = { x: canvas.width / 2, y: canvas.height - 80, w: 30, h: 40, health: 100, mana: 100, combo: 0 };
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.score = 0;
        this.wave = 1;
        this.enemiesDefeated = 0;
        this.startTime = Date.now();
        this.lastSpawn = 0;
        this.keys = {};

        // Spawn initial enemies
        for (let i = 0; i < 3; i++) {
          this.spawnEnemy();
        }

        // Input
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        canvas.addEventListener('click', (e) => this.attack(e));

        const info = document.createElement('div');
        info.style.cssText = `
          color: rgba(255,255,255,.7);
          font-size: 12px;
          margin-top: 10px;
          text-align: center;
        `;
        info.innerHTML = `
          <strong style="color: #fff93e;">Arrow Keys</strong> to move | <strong>Click</strong> to attack | Defeat all enemies!
          <br>Health: <span id="health">100</span>% | Mana: <span id="mana">100</span>% | Score: <span id="score">0</span>
        `;
        wrapper.appendChild(info);

        this.render();
      },

      spawnEnemy() {
        this.enemies.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * (this.canvas.height - 200),
          w: 25,
          h: 35,
          health: 30,
          speed: 1 + Math.random() * 1.5,
          shootTimer: 0
        });
      },

      attack(e) {
        if (this.player.mana < 20) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.projectiles.push({
          x: this.player.x,
          y: this.player.y,
          vx: (x - this.player.x) * 0.01,
          vy: (y - this.player.y) * 0.01,
          life: 1
        });
        this.player.mana -= 20;
      },

      render() {
        const { ctx, canvas } = this;
        const elapsed = (Date.now() - this.startTime) / 1000;

        // Clear with fire effect
        ctx.fillStyle = 'rgba(74,22,22,.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Flames background
        ctx.fillStyle = 'rgba(255,80,0,.1)';
        for (let i = 0; i < 5; i++) {
          const x = (i * canvas.width / 5 + Math.sin(elapsed * 2 + i) * 50);
          const y = -50 + Math.cos(elapsed * 1.5 + i) * 100;
          ctx.fillRect(x, y, 100, 150);
        }

        // Update and draw enemies
        this.enemies = this.enemies.filter(e => {
          // Move toward player
          const dx = this.player.x - e.x;
          const dy = this.player.y - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            e.x += (dx / dist) * e.speed;
            e.y += (dy / dist) * e.speed;
          }

          // Draw enemy
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
          ctx.fillStyle = '#000';
          ctx.font = '16px Arial';
          ctx.fillText('✕', e.x - 6, e.y + 6);

          return e.health > 0 && e.y < canvas.height + 50;
        });

        // Update and draw projectiles
        this.projectiles = this.projectiles.filter(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;

          // Check collisions with enemies
          this.enemies.forEach(e => {
            if (p.x > e.x - e.w / 2 && p.x < e.x + e.w / 2 &&
                p.y > e.y - e.h / 2 && p.y < e.y + e.h / 2) {
              e.health -= 15;
              p.life = 0;
              this.score += 10;
              this.player.combo++;

              // Particles
              for (let i = 0; i < 5; i++) {
                this.particles.push({
                  x: e.x, y: e.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 1,
                  color: Math.random() > 0.5 ? '#ff4444' : '#fff93e'
                });
              }

              if (e.health <= 0) {
                this.enemiesDefeated++;
                if (this.enemiesDefeated % 5 === 0) {
                  this.wave++;
                  for (let i = 0; i < 2; i++) this.spawnEnemy();
                }
              }
            }
          });

          // Draw projectile
          ctx.fillStyle = '#fff93e';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();

          return p.life > 0 && p.x > -50 && p.x < canvas.width + 50 && p.y > -50 && p.y < canvas.height + 50;
        });

        // Update and draw particles
        this.particles = this.particles.filter(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.05;
          ctx.fillStyle = p.color + Math.round(p.life * 255).toString(16).padStart(2, '0');
          ctx.fillRect(p.x, p.y, 3, 3);
          return p.life > 0;
        });

        // Player movement
        const moveSpeed = 4;
        if (this.keys['arrowleft'] || this.keys['a']) this.player.x -= moveSpeed;
        if (this.keys['arrowright'] || this.keys['d']) this.player.x += moveSpeed;
        if (this.keys['arrowup'] || this.keys['w']) this.player.y -= moveSpeed;
        if (this.keys['arrowdown'] || this.keys['s']) this.player.y += moveSpeed;

        this.player.x = Math.max(20, Math.min(canvas.width - 20, this.player.x));
        this.player.y = Math.max(20, Math.min(canvas.height - 20, this.player.y));

        // Regenerate mana
        this.player.mana = Math.min(100, this.player.mana + 0.5);

        // Check collisions with enemies
        this.enemies.forEach(e => {
          if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < 30) {
            this.player.health -= 1;
          }
        });

        // Draw player
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(this.player.x - this.player.w / 2, this.player.y - this.player.h / 2, this.player.w, this.player.h);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('⚔', this.player.x - 8, this.player.y + 8);

        // UI
        document.getElementById('health').textContent = Math.round(this.player.health);
        document.getElementById('mana').textContent = Math.round(this.player.mana);
        document.getElementById('score').textContent = this.score;

        if (this.player.health <= 0) {
          toast('✗ Defeated! Elowen has fallen.', 'error');
          this.stop();
          return;
        }

        if (this.wave > 3 && this.enemies.length === 0) {
          toast(`✓ Outskirts defended! Wave ${this.wave} victory!`, 'success');
          this.stop();
          return;
        }

        requestAnimationFrame(() => this.render());
      },

      stop() {
        this.container.remove();
      }
    };
  },

  // ═══════════════════════════════════════════════════════════
  // EVENT 4: Battle of Timber Roads - Tower Defense Strategy
  // ═══════════════════════════════════════════════════════════
  battleTimberRoads: function() {
    return {
      name: "Battle of Timber Roads",
      create() {
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0a1929;
          z-index: 9999; display: flex; align-items: center; justify-content: center;
          overflow: auto;
        `;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          background: rgba(0,0,0,.9);
          padding: 20px;
          border-radius: 20px;
          width: 90%;
          max-width: 1100px;
          color: white;
          font-family: 'DM Sans', sans-serif;
        `;

        const title = document.createElement('h2');
        title.style.cssText = `
          margin: 0 0 15px 0;
          color: #fff93e;
          font-size: 24px;
        `;
        title.textContent = 'Battle of Timber Roads';
        wrapper.appendChild(title);

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1000, window.innerWidth - 60);
        canvas.height = 450;
        canvas.style.cssText = `
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 8px;
          background: linear-gradient(180deg, #1a4d2e 0%, #0a1929 100%);
          display: block;
          margin-bottom: 15px;
        `;

        wrapper.appendChild(canvas);

        const info = document.createElement('div');
        info.style.cssText = `
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 10px;
          font-size: 13px;
          margin-bottom: 15px;
          color: rgba(255,255,255,.8);
        `;
        info.innerHTML = `
          <div style="background: rgba(255,249,62,.1); padding: 10px; border-radius: 6px; border-left: 3px solid #fff93e;">
            <span style="color: #fff93e;">🛡️ Troops:</span> <span id="troops">100</span>/100
          </div>
          <div style="background: rgba(100,200,100,.1); padding: 10px; border-radius: 6px; border-left: 3px solid #4ade80;">
            <span style="color: #4ade80;">💰 Gold:</span> <span id="gold">500</span>
          </div>
          <div style="background: rgba(200,100,100,.1); padding: 10px; border-radius: 6px; border-left: 3px solid #ff6b6b;">
            <span style="color: #ff6b6b;">⚡ Enemy:</span> <span id="enemyHealth">500</span>
          </div>
          <div style="background: rgba(100,150,255,.1); padding: 10px; border-radius: 6px; border-left: 3px solid #64b5f6;">
            <span style="color: #64b5f6;">📊 Wave:</span> <span id="wave">1</span>/5
          </div>
        `;
        wrapper.appendChild(info);

        const controls = document.createElement('div');
        controls.style.cssText = `
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        `;

        const towers = [
          { name: 'Archer', cost: 100, damage: 20, range: 150, color: '#fff93e' },
          { name: 'Mage', cost: 150, damage: 30, range: 200, color: '#64b5f6' },
          { name: 'Knight', cost: 200, damage: 50, range: 80, color: '#ff6b6b' }
        ];

        towers.forEach(t => {
          const btn = document.createElement('button');
          btn.style.cssText = `
            padding: 10px 16px;
            background: rgba(255,249,62,.1);
            border: 1px solid ${t.color};
            color: ${t.color};
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
          `;
          btn.innerHTML = `${t.name} (${t.cost}g)`;
          btn.onmouseover = () => btn.style.background = 'rgba(255,249,62,.2)';
          btn.onmouseout = () => btn.style.background = 'rgba(255,249,62,.1)';
          btn.onclick = () => {
            if (this.gold >= t.cost) {
              this.selectedTower = t;
            }
          };
          controls.appendChild(btn);
        });

        wrapper.appendChild(controls);

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
          padding: 10px 20px;
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.2);
          color: rgba(255,255,255,.6);
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        `;
        closeBtn.textContent = 'Quit';
        closeBtn.onclick = () => this.stop();
        wrapper.appendChild(closeBtn);

        container.appendChild(wrapper);
        document.body.appendChild(container);

        const ctx = canvas.getContext('2d');
        this.canvas = canvas;
        this.ctx = ctx;
        this.container = container;

        // Game state
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.troops = 100;
        this.maxTroops = 100;
        this.gold = 500;
        this.enemyHealth = 500;
        this.maxEnemyHealth = 500;
        this.wave = 1;
        this.waveProgress = 0;
        this.selectedTower = null;
        this.startTime = Date.now();

        this.generateEnemies();
        this.render();

        canvas.addEventListener('click', (e) => this.placeHandler(e));
      },

      generateEnemies() {
        const count = 10 + this.wave * 3;
        this.enemies = [];
        for (let i = 0; i < count; i++) {
          this.enemies.push({
            x: -i * 40,
            y: 50,
            health: 30 + this.wave * 10,
            speed: 1 + this.wave * 0.2,
            size: 12
          });
        }
      },

      placeHandler(e) {
        if (!this.selectedTower) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (this.gold >= this.selectedTower.cost && this.troops > 0) {
          this.towers.push({ ...this.selectedTower, x, y, cooldown: 0 });
          this.gold -= this.selectedTower.cost;
          this.troops -= 5;
        }
      },

      render() {
        const { ctx, canvas } = this;
        const elapsed = (Date.now() - this.startTime) / 1000;

        // Clear
        ctx.fillStyle = 'rgba(26,77,46,.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Path
        ctx.strokeStyle = 'rgba(100,100,100,.3)';
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.moveTo(-50, 50);
        ctx.lineTo(canvas.width / 3, 50);
        ctx.lineTo(canvas.width / 2, 150);
        ctx.lineTo(canvas.width, 150);
        ctx.stroke();

        // Update and draw enemies
        this.enemies = this.enemies.filter(e => {
          e.x += e.speed;
          if (e.x > 300 && e.x < 400) e.y = 50 + (e.x - 300) / 3;
          if (e.x > 400 && e.x < 600) e.y = 50 + 100 + (e.x - 400) / 10;

          ctx.fillStyle = e.health < 10 ? '#ff4444' : '#ff8c42';
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
          ctx.fill();

          return e.x < canvas.width && e.health > 0;
        });

        // Draw and update towers
        this.towers.forEach(t => {
          ctx.fillStyle = t.color;
          ctx.fillRect(t.x - 12, t.y - 12, 24, 24);
          ctx.strokeStyle = t.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
          ctx.stroke();

          t.cooldown--;

          // Target and shoot
          const target = this.enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) < t.range);
          if (target && t.cooldown < 0) {
            this.projectiles.push({
              x: t.x, y: t.y,
              tx: target.x, ty: target.y,
              damage: t.damage,
              speed: 4
            });
            t.cooldown = 20;
          }
        });

        // Update and draw projectiles
        this.projectiles = this.projectiles.filter(p => {
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < p.speed) {
            // Hit!
            const target = this.enemies.find(e => e.x === p.tx && e.y === p.ty);
            if (target) {
              target.health -= p.damage;
              if (target.health <= 0) {
                this.gold += 20;
              }
            }
            return false;
          }

          p.x += (dx / dist) * p.speed;
          p.y += (dy / dist) * p.speed;

          ctx.strokeStyle = '#fff93e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (dx / dist) * 10, p.y - (dy / dist) * 10);
          ctx.stroke();

          return dist > 0;
        });

        // Wave progress
        this.waveProgress += 0.02;
        if (this.waveProgress > 1 && this.enemies.length === 0) {
          this.wave++;
          this.waveProgress = 0;
          if (this.wave <= 5) {
            this.generateEnemies();
            this.gold += 200;
          }
        }

        // Regenerate troops
        this.troops = Math.min(this.maxTroops, this.troops + 0.1);

        // UI
        document.getElementById('troops').textContent = Math.round(this.troops);
        document.getElementById('gold').textContent = this.gold;
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('enemyHealth').textContent = this.enemies.length;

        if (this.wave > 5 && this.enemies.length === 0) {
          toast('✓ Timber Roads secured! Victory!', 'success');
          this.stop();
          return;
        }

        requestAnimationFrame(() => this.render());
      },

      stop() {
        this.container.remove();
      }
    };
  },

  // ═══════════════════════════════════════════════════════════
  // EVENT 5: Defense of Vastilly Outer Walls - Tower Defense
  // ═══════════════════════════════════════════════════════════
  defenseVastilly: function() {
    return {
      name: "Defense of Vastilly Outer Walls",
      create() {
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
          z-index: 9999; display: flex; align-items: center; justify-content: center;
        `;

        const gameDiv = document.createElement('div');
        gameDiv.style.cssText = `
          background: rgba(0,0,0,.9);
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 20px;
          padding: 20px;
          width: 95%;
          max-width: 1200px;
          max-height: 95vh;
          display: flex;
          flex-direction: column;
          color: white;
          font-family: 'DM Sans', sans-serif;
          overflow-y: auto;
        `;

        const title = document.createElement('h2');
        title.style.cssText = `
          margin: 0 0 15px 0;
          color: #fff93e;
          font-size: 26px;
        `;
        title.textContent = '🏰 Defense of Vastilly Outer Walls';
        gameDiv.appendChild(title);

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1100, window.innerWidth - 60);
        canvas.height = 500;
        canvas.style.cssText = `
          border: 2px solid rgba(255,249,62,.2);
          border-radius: 12px;
          background: linear-gradient(180deg, #2a2a4a 0%, #0a1a2a 100%);
          display: block;
          margin-bottom: 15px;
        `;

        gameDiv.appendChild(canvas);

        // Status bars
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 15px;
        `;

        statusDiv.innerHTML = `
          <div style="background: rgba(255,249,62,.08); border: 1px solid rgba(255,249,62,.3); padding: 12px; border-radius: 8px;">
            <div style="color: rgba(255,255,255,.6); font-size: 12px; margin-bottom: 5px;">Wall Health</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="flex: 1; height: 8px; background: rgba(255,255,255,.1); border-radius: 4px; overflow: hidden;">
                <div id="wallBar" style="height: 100%; background: linear-gradient(90deg, #ff4444, #fff93e); width: 100%;"></div>
              </div>
              <span id="wallHealth" style="font-size: 14px; font-weight: 600;">100%</span>
            </div>
          </div>
          <div style="background: rgba(100,200,100,.08); border: 1px solid rgba(100,200,100,.3); padding: 12px; border-radius: 8px;">
            <div style="color: rgba(255,255,255,.6); font-size: 12px; margin-bottom: 5px;">Resources</div>
            <div style="font-size: 14px; font-weight: 600;"><span id="gold">1000</span> Gold</div>
          </div>
          <div style="background: rgba(100,150,255,.08); border: 1px solid rgba(100,150,255,.3); padding: 12px; border-radius: 8px;">
            <div style="color: rgba(255,255,255,.6); font-size: 12px; margin-bottom: 5px;">Wave</div>
            <div style="font-size: 14px; font-weight: 600;"><span id="wave">1</span> / 7</div>
          </div>
          <div style="background: rgba(200,100,100,.08); border: 1px solid rgba(200,100,100,.3); padding: 12px; border-radius: 8px;">
            <div style="color: rgba(255,255,255,.6); font-size: 12px; margin-bottom: 5px;">Enemies</div>
            <div style="font-size: 14px; font-weight: 600;"><span id="enemies">0</span> incoming</div>
          </div>
        `;
        gameDiv.appendChild(statusDiv);

        // Tower selector
        const towersDiv = document.createElement('div');
        towersDiv.style.cssText = `
          margin-bottom: 15px;
        `;
        towersDiv.innerHTML = '<div style="color: rgba(255,255,255,.6); font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Build Tower</div>';

        const towerTypes = [
          { name: 'Archer Tower', cost: 150, dps: 20, range: 200, icon: '🏹' },
          { name: 'Cannon', cost: 300, dps: 50, range: 250, icon: '🔫' },
          { name: 'Magic Tower', cost: 200, dps: 35, range: 280, icon: '✨' },
          { name: 'Wall Upgrade', cost: 100, dps: 0, range: 0, icon: '🛡️', repair: true }
        ];

        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        `;

        towerTypes.forEach(t => {
          const btn = document.createElement('button');
          btn.style.cssText = `
            padding: 12px;
            background: rgba(255,249,62,.08);
            border: 1px solid rgba(255,249,62,.2);
            color: rgba(255,255,255,.9);
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
          `;
          btn.innerHTML = `${t.icon} ${t.name}<br><span style="font-size: 11px; opacity: 0.7;">${t.cost}g</span>`;
          btn.onmouseover = () => btn.style.background = 'rgba(255,249,62,.15)';
          btn.onmouseout = () => btn.style.background = 'rgba(255,249,62,.08)';
          btn.onclick = () => {
            if (this.gold >= t.cost) {
              this.selectedTower = t;
              btn.style.border = '2px solid #fff93e';
              document.querySelectorAll('[data-tower-btn]').forEach(b => {
                if (b !== btn) b.style.border = '1px solid rgba(255,249,62,.2)';
              });
            } else {
              btn.style.opacity = '0.5';
            }
          };
          btn.setAttribute('data-tower-btn', '1');
          buttonsDiv.appendChild(btn);
        });

        towersDiv.appendChild(buttonsDiv);
        gameDiv.appendChild(towersDiv);

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
          align-self: flex-start;
          padding: 10px 20px;
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.2);
          color: rgba(255,255,255,.6);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        `;
        closeBtn.textContent = 'Retreat';
        closeBtn.onclick = () => this.stop();
        gameDiv.appendChild(closeBtn);

        container.appendChild(gameDiv);
        document.body.appendChild(container);

        const ctx = canvas.getContext('2d');
        this.canvas = canvas;
        this.ctx = ctx;
        this.container = container;

        // Game state
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.wallHealth = 100;
        this.gold = 1000;
        this.wave = 1;
        this.waveStartTime = Date.now();
        this.selectedTower = null;
        this.gameStartTime = Date.now();

        this.startWave();
        this.render();

        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
      },

      startWave() {
        const count = 8 + this.wave * 4;
        this.enemies = [];
        for (let i = 0; i < count; i++) {
          setTimeout(() => {
            if (this.enemies) {
              this.enemies.push({
                x: -30 - i * 25,
                y: this.canvas.height / 2,
                health: 30 + this.wave * 10,
                speed: 1.2 + this.wave * 0.1,
                size: 12
              });
            }
          }, i * 300);
        }
      },

      handleCanvasClick(e) {
        if (!this.selectedTower) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.selectedTower.repair) {
          this.wallHealth = Math.min(100, this.wallHealth + 50);
          this.gold -= this.selectedTower.cost;
        } else {
          this.towers.push({ ...this.selectedTower, x, y, cooldown: 0 });
          this.gold -= this.selectedTower.cost;
        }
      },

      render() {
        const { ctx, canvas } = this;
        ctx.fillStyle = 'rgba(42,42,74,.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw wall
        ctx.fillStyle = this.wallHealth > 50 ? '#4ade80' : this.wallHealth > 25 ? '#fff93e' : '#ff4444';
        ctx.fillRect(canvas.width - 40, 0, 40, canvas.height);

        // Update enemies
        this.enemies = this.enemies.filter(e => {
          e.x += e.speed;

          // Damage wall on contact
          if (e.x > canvas.width - 60) {
            this.wallHealth -= 1;
            return false;
          }

          ctx.fillStyle = e.health > 15 ? '#ff6b6b' : '#ff4444';
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
          ctx.fill();

          return e.x < canvas.width && e.health > 0;
        });

        // Draw and update towers
        this.towers.forEach(t => {
          ctx.fillStyle = t.icon === '🏹' ? '#fff93e' : t.icon === '🔫' ? '#ff6b6b' : '#64b5f6';
          ctx.fillRect(t.x - 10, t.y - 10, 20, 20);
          ctx.font = '16px Arial';
          ctx.fillText(t.icon, t.x - 8, t.y + 6);

          ctx.strokeStyle = t.icon === '🏹' ? 'rgba(255,249,62,.2)' : t.icon === '🔫' ? 'rgba(255,107,107,.2)' : 'rgba(100,181,246,.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
          ctx.stroke();

          t.cooldown--;

          const target = this.enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) < t.range);
          if (target && t.cooldown < 0) {
            this.projectiles.push({
              x: t.x, y: t.y,
              tx: target.x, ty: target.y,
              damage: t.dps,
              speed: 5
            });
            t.cooldown = 25;
          }
        });

        // Projectiles
        this.projectiles = this.projectiles.filter(p => {
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < p.speed) {
            const target = this.enemies.find(e => e.x >= p.tx - 20 && e.x <= p.tx + 20);
            if (target) {
              target.health -= p.damage;
              if (target.health <= 0) {
                this.gold += 50;
              }
            }
            return false;
          }

          p.x += (dx / dist) * p.speed;
          p.y += (dy / dist) * p.speed;

          ctx.fillStyle = '#fff93e';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();

          return true;
        });

        // Check wave completion
        if (this.enemies.length === 0 && Date.now() - this.waveStartTime > 2000) {
          this.wave++;
          this.waveStartTime = Date.now();
          if (this.wave <= 7) {
            this.gold += 300;
            this.startWave();
          }
        }

        // UI Update
        document.getElementById('wallHealth').textContent = Math.round(this.wallHealth) + '%';
        document.getElementById('wallBar').style.width = this.wallHealth + '%';
        document.getElementById('gold').textContent = Math.round(this.gold);
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('enemies').textContent = this.enemies.length;

        if (this.wallHealth <= 0) {
          toast('✗ Wall breached! Vastilly falls!', 'error');
          this.stop();
          return;
        }

        if (this.wave > 7 && this.enemies.length === 0) {
          toast('✓ Walls held! Vastilly is safe!', 'success');
          this.stop();
          return;
        }

        requestAnimationFrame(() => this.render());
      },

      stop() {
        if (this.container) this.container.remove();
      }
    };
  },

  // ═══════════════════════════════════════════════════════════
  // ECONOMY GAME TEMPLATE (reusable for Events 6-13)
  // ═══════════════════════════════════════════════════════════
  genericMiniGame: function(eventName, gameType) {
    return {
      name: eventName,
      create() {
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #0a1929 0%, #1a3a52 100%);
          z-index: 9999; display: flex; align-items: center; justify-content: center;
        `;

        const gameDiv = document.createElement('div');
        gameDiv.style.cssText = `
          background: rgba(12,15,22,.95);
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 20px;
          padding: 40px;
          width: 90%;
          max-width: 900px;
          text-align: center;
          color: white;
          font-family: 'DM Sans', sans-serif;
        `;

        gameDiv.innerHTML = `
          <h2 style="margin: 0 0 15px 0; color: #fff93e; font-size: 28px;">${eventName}</h2>
          <p style="color: rgba(255,255,255,.7); margin: 0 0 30px 0;">Strategic gameplay challenge</p>

          <div style="background: rgba(255,249,62,.05); border: 1px solid rgba(255,249,62,.2); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <div id="gameContent" style="font-size: 16px; line-height: 1.8; min-height: 200px;"></div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="actionBtn" style="padding: 12px 24px; background: #fff93e; color: #0a1929; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">Take Action</button>
            <button id="quitBtn" style="padding: 12px 24px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.6); border: 1px solid rgba(255,255,255,.2); border-radius: 8px; cursor: pointer; font-size: 14px;">Quit</button>
          </div>
        `;

        container.appendChild(gameDiv);
        document.body.appendChild(container);
        this.container = container;

        // Create game content based on type
        const content = document.getElementById('gameContent');
        const actionBtn = document.getElementById('actionBtn');
        const quitBtn = document.getElementById('quitBtn');

        this.score = 0;
        this.round = 1;
        this.timeRemaining = 600;

        const updateDisplay = () => {
          content.innerHTML = `
            <div style="margin-bottom: 20px;">
              <p style="font-size: 14px; color: rgba(255,255,255,.6);">Round ${this.round} of 10</p>
              <div style="height: 8px; background: rgba(255,255,255,.1); border-radius: 4px; overflow: hidden; margin: 10px 0;">
                <div style="height: 100%; background: linear-gradient(90deg, #fff93e, #4ade80); width: ${(this.round / 10) * 100}%;"></div>
              </div>
            </div>
            <p style="font-size: 18px; margin: 20px 0; color: #fff93e;">Score: ${this.score}</p>
            <p style="font-size: 15px; color: rgba(255,255,255,.8);">${this.getGameMessage()}</p>
          `;
        };

        this.getGameMessage = () => {
          const messages = [
            "Make a strategic decision to advance!",
            "Choose the path to victory!",
            "What is your move?",
            "Time to prove your tactical skill!",
            "Success depends on your choices!",
            "Lead your forces to glory!",
            "The moment of truth approaches!",
            "Your reputation is on the line!",
            "One final push needed!",
            "Victory is within reach!"
          ];
          return messages[Math.min(this.round - 1, messages.length - 1)];
        };

        actionBtn.onclick = () => {
          this.score += Math.floor(Math.random() * 100 + 50);
          this.round++;
          if (this.round > 10) {
            toast(`✓ ${eventName} succeeded! Final Score: ${this.score}`, 'success');
            this.stop();
          } else {
            updateDisplay();
          }
        };

        quitBtn.onclick = () => this.stop();

        updateDisplay();
      },

      stop() {
        if (this.container) this.container.remove();
      }
    };
  }
};

// ═══════════════════════════════════════════════════════════
// EVENT LAUNCHER SYSTEM
// ═══════════════════════════════════════════════════════════
function launchChronicleMinigame(eventId) {
  const games = {
    1: () => FTZ_MINIGAMES.breakingOfTreaty().create(),
    2: () => FTZ_MINIGAMES.raidSilverStream().create(),
    3: () => FTZ_MINIGAMES.burningElowen().create(),
    4: () => FTZ_MINIGAMES.battleTimberRoads().create(),
    5: () => FTZ_MINIGAMES.defenseVastilly().create(),
    6: () => FTZ_MINIGAMES.genericMiniGame('The Fenwick Canal Skirmishes', 'water').create(),
    7: () => FTZ_MINIGAMES.genericMiniGame('The Ironstall Contracts', 'economy').create(),
    8: () => FTZ_MINIGAMES.genericMiniGame('The Glassport Blockade', 'naval').create(),
    9: () => FTZ_MINIGAMES.genericMiniGame('The Siege of Port-Crest', 'siege').create(),
    10: () => FTZ_MINIGAMES.genericMiniGame('The 14-Day Bombardment', 'defense').create(),
    11: () => FTZ_MINIGAMES.genericMiniGame('The Harbour of Wrecks', 'salvage').create(),
    12: () => FTZ_MINIGAMES.genericMiniGame('The Push into Oakhaven', 'combat').create(),
    13: () => FTZ_MINIGAMES.genericMiniGame('The Fall of Elowen', 'final').create()
  };

  if (games[eventId]) {
    games[eventId]();
  } else {
    toast(`Event ${eventId} not found`, 'error');
  }
}
