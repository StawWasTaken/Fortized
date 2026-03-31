/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - PHASER.JS MINIGAMES SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * Epic, story-driven 2D games using Phaser 3
 * Each mission follows the narrative arc of the Hycay Gulf War
 */

// Load Phaser from CDN if not already loaded
if (typeof Phaser === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.js';
  document.head.appendChild(script);
}

const CHRONICLE_GAMES = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT 1: The Breaking of the Treaty - Diplomatic Negotiation
  // ═══════════════════════════════════════════════════════════════════════════════
  event1: function() {
    return {
      name: "The Breaking of the Treaty",
      description: "Navigate diplomatic tensions in Vastilly. Choose your words carefully—they will determine the fate of the treaty.",
      create() {
        const container = document.createElement('div');
        container.id = 'game-container-1';
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #0f1419 0%, #1a2a3a 100%);
          z-index: 9999; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 20px;
          font-family: 'DM Sans', sans-serif;
          color: white;
          overflow: auto;
        `;

        const gameDiv = document.createElement('div');
        gameDiv.style.cssText = `
          width: 100%;
          max-width: 1000px;
          background: rgba(12,20,35,.95);
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0,0,0,.5);
        `;

        gameDiv.innerHTML = `
          <div style="margin-bottom: 30px;">
            <h1 style="margin: 0 0 10px 0; color: #fff93e; font-size: 32px;">⚔️ The Breaking of the Treaty</h1>
            <p style="margin: 0; color: rgba(255,255,255,.7); font-size: 15px;">Vastilly, 1452 — The diplomatic crisis unfolds</p>
          </div>

          <div style="background: rgba(255,249,62,.06); border: 1px solid rgba(255,249,62,.2); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <p style="margin: 0 0 15px 0; color: rgba(255,255,255,.9); font-size: 15px; line-height: 1.7;">
              <strong style="color: #fff93e;">The council meets in secret.</strong> Accusations fly about Oakhaven's violation of the Silver Stream Treaty.
              Your words will determine whether Fortized chooses diplomacy or war. Three council members watch your every move.
            </p>
            <div id="dialogue-box" style="
              background: rgba(0,0,0,.3);
              border-left: 4px solid #ff6b6b;
              padding: 15px;
              border-radius: 8px;
              margin-top: 15px;
              font-style: italic;
              color: rgba(255,255,255,.8);
              min-height: 60px;
            "></div>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; color: rgba(255,255,255,.6); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
              Support Level: <span id="support-level" style="color: #fff93e;">50%</span>
            </p>
            <div style="height: 12px; background: rgba(255,255,255,.1); border-radius: 6px; overflow: hidden;">
              <div id="support-bar" style="height: 100%; background: linear-gradient(90deg, #ef4444, #fff93e, #4ade80); width: 50%; transition: width 0.3s;"></div>
            </div>
          </div>

          <div id="choices" style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
          "></div>

          <div style="display: flex; gap: 10px;">
            <button id="quit-btn" style="
              flex: 1;
              padding: 12px;
              background: rgba(255,255,255,.1);
              border: 1px solid rgba(255,255,255,.2);
              color: rgba(255,255,255,.7);
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              transition: all 0.2s;
            ">Retreat from Council</button>
          </div>

          <div id="status-message" style="
            margin-top: 20px;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            display: none;
          "></div>
        `;

        container.appendChild(gameDiv);
        document.body.appendChild(container);

        this.container = container;
        this.gameDiv = gameDiv;
        this.supportLevel = 50;
        this.round = 0;
        this.maxRounds = 5;
        this.councilors = [
          { name: "Lord Marchant (Trade Master)", trait: "economics" },
          { name: "Lady Vesper (Military Commander)", trait: "military" },
          { name: "Magistrate Kolin (Elder Council)", trait: "wisdom" }
        ];

        this.dialogues = {
          start: "The council gathers in tense silence. Accusations of Oakhaven's treaty violations hang in the air.",
          economics: "Lord Marchant leans forward. 'Their trade barriers cost us thousands each season. We cannot afford patience.'",
          military: "Lady Vesper's hand rests on her sword hilt. 'If we show weakness now, they will strike our borders.'",
          wisdom: "Magistrate Kolin strokes his beard thoughtfully. 'Many remember when peace kept the Hycay Gulf prosperous for all.'"
        };

        this.displayDialogue(this.dialogues.start);
        this.createChoices();

        document.getElementById('quit-btn').onclick = () => this.quit();
      },

      displayDialogue(text) {
        document.getElementById('dialogue-box').textContent = text;
      },

      createChoices() {
        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';

        const choices = [
          { text: "🗣️ Demand immediate reparations", impact: 15, consequence: "military" },
          { text: "💼 Propose new trade agreements", impact: 10, consequence: "economics" },
          { text: "🕊️ Suggest peaceful arbitration", impact: 5, consequence: "wisdom" },
          { text: "⚔️ Call for military mobilization", impact: 20, consequence: "military" }
        ];

        choices.forEach(choice => {
          const btn = document.createElement('button');
          btn.style.cssText = `
            padding: 15px;
            background: rgba(255,249,62,.1);
            border: 1px solid rgba(255,249,62,.3);
            color: rgba(255,255,255,.9);
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            text-align: left;
            font-weight: 500;
          `;
          btn.innerHTML = choice.text;
          btn.onmouseover = () => btn.style.background = 'rgba(255,249,62,.2)';
          btn.onmouseout = () => btn.style.background = 'rgba(255,249,62,.1)';
          btn.onclick = () => this.makeChoice(choice.impact, choice.consequence);
          choicesDiv.appendChild(btn);
        });
      },

      makeChoice(impact, consequence) {
        this.round++;
        this.supportLevel += impact + (Math.random() * 20 - 10);
        this.supportLevel = Math.max(0, Math.min(100, this.supportLevel));

        document.getElementById('support-level').textContent = Math.round(this.supportLevel) + '%';
        document.getElementById('support-bar').style.width = this.supportLevel + '%';

        const councilor = this.councilors.find(c => c.trait === consequence) || this.councilors[0];
        this.displayDialogue(this.dialogues[consequence] || this.dialogues.start);

        if (this.round >= this.maxRounds) {
          this.endGame();
        } else {
          this.createChoices();
        }
      },

      endGame() {
        let result = '';
        let success = false;

        if (this.supportLevel > 75) {
          result = '✓ WAR DECLARED — The council votes unanimously for mobilization. Fortized marches toward destiny.';
          success = true;
        } else if (this.supportLevel > 50) {
          result = '⚠ DIVIDED COUNCIL — The vote is split. Fortized mobilizes, but with hesitation and internal conflict.';
          success = true;
        } else {
          result = '✗ TREATY HOLDS — The council rejects war. Fortized remains bound to a crumbling peace.';
          success = false;
        }

        const statusMsg = document.getElementById('status-message');
        statusMsg.style.display = 'block';
        statusMsg.style.background = success ? 'rgba(74, 222, 128, .1)' : 'rgba(239, 68, 68, .1)';
        statusMsg.style.borderLeft = success ? '4px solid #4ade80' : '4px solid #ef4444';
        statusMsg.style.color = success ? '#4ade80' : '#ef4444';
        statusMsg.innerHTML = result;

        document.getElementById('quit-btn').textContent = 'Exit Mission';
        document.getElementById('choices').innerHTML = '';

        document.getElementById('quit-btn').onclick = () => this.quit();
      },

      quit() {
        this.container.remove();
        const msg = this.round >= this.maxRounds ? 'Mission complete!' : 'Mission abandoned.';
        toast(msg, 'info');
      }
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT 2: Raid on the Silver Stream - Real-time Strategy/Stealth
  // ═══════════════════════════════════════════════════════════════════════════════
  event2: function() {
    return {
      name: "Raid on the Silver Stream",
      description: "A strategic strike on Oakhaven's trade routes. Command your raid forces—infiltrate, disrupt, and extract before reinforcements arrive.",
      create() {
        const container = document.createElement('div');
        container.id = 'game-container-2';
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0a0f1a;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        const gameDiv = document.createElement('div');
        gameDiv.style.cssText = `
          width: 95%;
          max-width: 1200px;
          height: 95vh;
          background: rgba(0,0,0,.8);
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
        `;

        gameDiv.innerHTML = `
          <div style="margin-bottom: 15px;">
            <h2 style="margin: 0; color: #fff93e; font-size: 28px;">⚡ Raid on the Silver Stream</h2>
            <p style="margin: 5px 0 0 0; color: rgba(255,255,255,.6); font-size: 13px;">Oakhaven Trade Route — 1452</p>
          </div>

          <canvas id="raid-canvas" style="
            border: 1px solid rgba(255,249,62,.2);
            border-radius: 8px;
            background: linear-gradient(180deg, #1a3a52 0%, #0a1a2a 100%);
            flex: 1;
            margin-bottom: 15px;
          "></canvas>

          <div style="
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            font-size: 12px;
          ">
            <div style="background: rgba(255,249,62,.08); border: 1px solid rgba(255,249,62,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Units</div>
              <div id="units-count" style="color: #fff93e; font-weight: 600; font-size: 14px;">12/12</div>
            </div>
            <div style="background: rgba(100,200,100,.08); border: 1px solid rgba(100,200,100,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Supplies Stolen</div>
              <div id="supplies-count" style="color: #4ade80; font-weight: 600; font-size: 14px;">0/500</div>
            </div>
            <div style="background: rgba(200,100,100,.08); border: 1px solid rgba(200,100,100,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Alert Level</div>
              <div id="alert-level" style="color: #ff6b6b; font-weight: 600; font-size: 14px;">0%</div>
            </div>
            <div style="background: rgba(100,150,255,.08); border: 1px solid rgba(100,150,255,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Time Remaining</div>
              <div id="time-remaining" style="color: #64b5f6; font-weight: 600; font-size: 14px;">10:00</div>
            </div>
          </div>

          <div style="margin-top: 15px; text-align: center;">
            <button id="raid-quit-btn" style="
              padding: 10px 20px;
              background: rgba(255,255,255,.1);
              border: 1px solid rgba(255,255,255,.2);
              color: rgba(255,255,255,.6);
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
            ">Abort Raid</button>
          </div>
        `;

        container.appendChild(gameDiv);
        document.body.appendChild(container);

        const canvas = gameDiv.querySelector('#raid-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        this.container = container;
        this.canvas = canvas;
        this.ctx = ctx;

        // Game state
        this.units = 12;
        this.maxUnits = 12;
        this.supplies = 0;
        this.maxSupplies = 500;
        this.alertLevel = 0;
        this.timeRemaining = 600; // 10 minutes
        this.startTime = Date.now();
        this.gameActive = true;

        // Raiding parties and targets
        this.raiders = [
          { x: 100, y: canvas.height / 2, vx: 2, vy: 0, active: true, id: 0 },
          { x: 150, y: canvas.height / 2 + 40, vx: 2, vy: 0, active: true, id: 1 }
        ];

        this.supplies_to_steal = [
          { x: canvas.width * 0.4, y: canvas.height * 0.3, size: 20, amount: 100 },
          { x: canvas.width * 0.5, y: canvas.height * 0.5, size: 20, amount: 100 },
          { x: canvas.width * 0.6, y: canvas.height * 0.7, size: 20, amount: 100 },
          { x: canvas.width * 0.65, y: canvas.height * 0.4, size: 20, amount: 100 },
          { x: canvas.width * 0.7, y: canvas.height * 0.6, size: 20, amount: 100 }
        ];

        this.guards = [
          { x: canvas.width * 0.45, y: canvas.height * 0.35, vx: -1, vy: 0, range: 60, id: 0 },
          { x: canvas.width * 0.55, y: canvas.height * 0.55, vx: 1, vy: 0, range: 60, id: 1 },
          { x: canvas.width * 0.65, y: canvas.height * 0.45, vx: -1.5, vy: 0.5, range: 60, id: 2 }
        ];

        this.render();
        document.getElementById('raid-quit-btn').onclick = () => this.quit();
      },

      render() {
        const { ctx, canvas } = this;
        const elapsed = (Date.now() - this.startTime) / 1000;

        // Clear with gradient
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, 'rgba(26,58,82,.4)');
        grad.addColorStop(1, 'rgba(10,26,42,.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Water effect
        ctx.strokeStyle = 'rgba(100,180,255,.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height * 0.5 + Math.sin(elapsed * 2 + i) * 50, 60 + i * 30, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw supplies to steal
        this.supplies_to_steal.forEach((s, i) => {
          ctx.fillStyle = s.active ? '#fff93e' : 'rgba(200,200,200,.3)';
          ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
          ctx.fillStyle = '#000';
          ctx.font = 'bold 12px Arial';
          ctx.fillText('📦', s.x - 5, s.y + 4);
        });

        // Draw guards
        this.guards.forEach(g => {
          g.x += g.vx;
          g.y += g.vy;
          if (g.x < 0 || g.x > canvas.width) g.vx *= -1;
          if (g.y < 0 || g.y > canvas.height) g.vy *= -1;

          // Draw detection radius
          ctx.strokeStyle = 'rgba(255,100,100,.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.range, 0, Math.PI * 2);
          ctx.stroke();

          // Draw guard
          ctx.fillStyle = '#ff6b6b';
          ctx.beginPath();
          ctx.arc(g.x, g.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('⚔', g.x - 5, g.y + 4);

          // Check detection
          this.raiders.forEach(r => {
            if (r.active) {
              const dist = Math.hypot(r.x - g.x, r.y - g.y);
              if (dist < g.range) {
                this.alertLevel = Math.min(100, this.alertLevel + 2);
              }
            }
          });
        });

        // Draw raiders
        this.raiders.forEach(r => {
          if (r.active) {
            r.x += r.vx;
            if (r.x > canvas.width) {
              r.active = false;
              this.units--;
            }

            // Steal supplies
            this.supplies_to_steal.forEach(s => {
              if (s.active && Math.hypot(r.x - s.x, r.y - s.y) < 25) {
                this.supplies += s.amount;
                s.active = false;
              }
            });

            ctx.fillStyle = r.active ? '#4ade80' : 'rgba(74,222,128,.3)';
            ctx.beginPath();
            ctx.arc(r.x, r.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText('R', r.x - 3, r.y + 3);
          }
        });

        // Draw escape zone
        ctx.strokeStyle = 'rgba(74,222,128,.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - 60, canvas.height / 2 - 100, 50, 200);
        ctx.fillStyle = 'rgba(74,222,128,.1)';
        ctx.fillRect(canvas.width - 60, canvas.height / 2 - 100, 50, 200);

        // Update UI
        this.timeRemaining = 600 - elapsed;
        document.getElementById('units-count').textContent = this.units + '/' + this.maxUnits;
        document.getElementById('supplies-count').textContent = Math.round(this.supplies) + '/' + this.maxSupplies;
        document.getElementById('alert-level').textContent = Math.round(this.alertLevel) + '%';

        const mins = Math.floor(this.timeRemaining / 60);
        const secs = Math.floor(this.timeRemaining % 60);
        document.getElementById('time-remaining').textContent = mins + ':' + String(secs).padStart(2, '0');

        // Alert level increases danger
        if (this.alertLevel > 75) {
          ctx.fillStyle = 'rgba(255,68,68,.2)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Check victory/defeat
        if (this.timeRemaining <= 0) {
          this.endRaid();
          return;
        }

        if (this.units <= 0 && this.alertLevel < 100) {
          this.alertLevel = 100;
        }

        if (this.gameActive) {
          requestAnimationFrame(() => this.render());
        }
      },

      endRaid() {
        this.gameActive = false;
        let result = '';
        let success = false;

        if (this.supplies >= this.maxSupplies * 0.7) {
          result = `✓ RAID SUCCESSFUL\nStole ${Math.round(this.supplies)} supplies\n${this.units} units escaped safely`;
          success = true;
        } else if (this.supplies >= this.maxSupplies * 0.4) {
          result = `⚠ PARTIAL SUCCESS\nStole ${Math.round(this.supplies)} supplies\nOnly ${this.units} units escaped`;
          success = true;
        } else {
          result = `✗ RAID FAILED\nInsufficient supplies stolen\nMission objective not met`;
          success = false;
        }

        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,.95);
          border: 2px solid ${success ? '#4ade80' : '#ff6b6b'};
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          color: white;
          z-index: 10000;
          max-width: 400px;
        `;
        statusDiv.innerHTML = `
          <h3 style="margin: 0 0 15px 0; color: ${success ? '#4ade80' : '#ff6b6b'}; font-size: 22px;">${result}</h3>
          <button onclick="this.parentElement.remove()" style="
            padding: 10px 20px;
            background: ${success ? 'rgba(74,222,128,.2)' : 'rgba(255,107,107,.2)'};
            border: 1px solid ${success ? '#4ade80' : '#ff6b6b'};
            color: white;
            border-radius: 6px;
            cursor: pointer;
          ">Continue</button>
        `;

        this.container.appendChild(statusDiv);

        setTimeout(() => this.quit(), 4000);
      },

      quit() {
        this.gameActive = false;
        if (this.container) this.container.remove();
        toast('Raid complete', 'info');
      }
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT 3: Battle of Timber Roads - Real-Time Tactical Combat
  // ═══════════════════════════════════════════════════════════════════════════════
  event3: function() {
    return {
      name: "Battle of the Timber Roads",
      description: "Dense forests, ambushes, and brutal combat. Command your forces in a real-time battle for control of critical supply routes.",
      create() {
        const container = document.createElement('div');
        container.id = 'game-container-3';
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #0a1929;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        `;

        const gameDiv = document.createElement('div');
        gameDiv.style.cssText = `
          width: 100%;
          max-width: 1200px;
          height: 95vh;
          background: rgba(0,0,0,.8);
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
          font-family: 'DM Sans', sans-serif;
          color: white;
        `;

        gameDiv.innerHTML = `
          <div style="margin-bottom: 15px;">
            <h2 style="margin: 0; color: #fff93e; font-size: 28px;">🌲 Battle of the Timber Roads</h2>
            <p style="margin: 5px 0 0 0; color: rgba(255,255,255,.6); font-size: 13px;">Mountain Pass — Dense Forests — 1452</p>
          </div>

          <canvas id="battle-canvas" style="
            border: 1px solid rgba(255,249,62,.2);
            border-radius: 8px;
            background: linear-gradient(180deg, #1a3a2e 0%, #0a1a1a 100%);
            flex: 1;
            margin-bottom: 15px;
            cursor: crosshair;
          "></canvas>

          <div style="
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            font-size: 12px;
          ">
            <div style="background: rgba(100,200,100,.08); border: 1px solid rgba(100,200,100,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Your Forces</div>
              <div id="friendly-count" style="color: #4ade80; font-weight: 600; font-size: 14px;">50/50</div>
            </div>
            <div style="background: rgba(255,100,100,.08); border: 1px solid rgba(255,100,100,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Enemy Forces</div>
              <div id="enemy-count" style="color: #ff6b6b; font-weight: 600; font-size: 14px;">45/45</div>
            </div>
            <div style="background: rgba(255,249,62,.08); border: 1px solid rgba(255,249,62,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Morale</div>
              <div id="morale-level" style="color: #fff93e; font-weight: 600; font-size: 14px;">100%</div>
            </div>
            <div style="background: rgba(100,150,255,.08); border: 1px solid rgba(100,150,255,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Objectives</div>
              <div id="objectives-count" style="color: #64b5f6; font-weight: 600; font-size: 14px;">0/3</div>
            </div>
            <div style="background: rgba(200,100,100,.08); border: 1px solid rgba(200,100,100,.2); padding: 10px; border-radius: 6px;">
              <div style="color: rgba(255,255,255,.6); margin-bottom: 3px;">Battle Time</div>
              <div id="battle-time" style="color: #ff8c42; font-weight: 600; font-size: 14px;">0:00</div>
            </div>
          </div>

          <div style="margin-top: 15px; text-align: center;">
            <button id="battle-quit-btn" style="
              padding: 10px 20px;
              background: rgba(255,255,255,.1);
              border: 1px solid rgba(255,255,255,.2);
              color: rgba(255,255,255,.6);
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
            ">Retreat</button>
          </div>
        `;

        container.appendChild(gameDiv);
        document.body.appendChild(container);

        const canvas = gameDiv.querySelector('#battle-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        this.container = container;
        this.canvas = canvas;
        this.ctx = ctx;

        // Game state
        this.friendly = [];
        this.enemies = [];
        this.objectives = [
          { x: canvas.width * 0.25, y: canvas.height * 0.3, captured: false, capturePoints: 0, captureNeeded: 100 },
          { x: canvas.width * 0.5, y: canvas.height * 0.5, captured: false, capturePoints: 0, captureNeeded: 100 },
          { x: canvas.width * 0.75, y: canvas.height * 0.3, captured: false, capturePoints: 0, captureNeeded: 100 }
        ];
        this.morale = 100;
        this.battleStartTime = Date.now();
        this.gameActive = true;
        this.wave = 1;

        // Create initial units
        for (let i = 0; i < 50; i++) {
          this.friendly.push({
            x: 50 + Math.random() * 100,
            y: canvas.height / 2 + (Math.random() - 0.5) * 200,
            vx: 1 + Math.random() * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            health: 10,
            maxHealth: 10,
            side: 'friendly'
          });
        }

        for (let i = 0; i < 45; i++) {
          this.enemies.push({
            x: canvas.width - 150 + Math.random() * 100,
            y: canvas.height / 2 + (Math.random() - 0.5) * 200,
            vx: -1 - Math.random() * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            health: 10,
            maxHealth: 10,
            side: 'enemy'
          });
        }

        this.render();
        document.getElementById('battle-quit-btn').onclick = () => this.quit();
      },

      render() {
        const { ctx, canvas } = this;
        const elapsed = (Date.now() - this.battleStartTime) / 1000;

        // Clear with forest theme
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, 'rgba(26,58,46,.4)');
        grad.addColorStop(1, 'rgba(10,25,20,.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw trees (forest)
        ctx.fillStyle = 'rgba(60,120,60,.15)';
        for (let i = 0; i < 10; i++) {
          ctx.beginPath();
          ctx.arc(Math.sin(i) * canvas.width * 0.5 + canvas.width * 0.5, i * canvas.height * 0.1, 80, 0, Math.PI * 2);
          ctx.fill();
        }

        // Update units
        const updateUnits = (units) => {
          return units.filter(u => {
            u.x += u.vx;
            u.y += u.vy;

            // Bounds
            if (u.x < 0) u.vx = Math.abs(u.vx);
            if (u.x > canvas.width) u.vx = -Math.abs(u.vx);
            if (u.y < 0) u.vy = Math.abs(u.vy);
            if (u.y > canvas.height) u.vy = -Math.abs(u.vy);

            return u.health > 0;
          });
        };

        this.friendly = updateUnits(this.friendly);
        this.enemies = updateUnits(this.enemies);

        // Combat
        this.friendly.forEach(f => {
          this.enemies.forEach(e => {
            if (Math.hypot(f.x - e.x, f.y - e.y) < 40) {
              if (Math.random() < 0.02) e.health--;
              if (Math.random() < 0.015) f.health--;
            }
          });
        });

        // Draw objectives
        this.objectives.forEach((obj, i) => {
          const captured = obj.capturePoints / obj.captureNeeded;
          ctx.fillStyle = `rgba(255,249,62,${captured * 0.3})`;
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, 40, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#fff93e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, 40, 0, Math.PI * 2);
          ctx.stroke();

          // Check if friendly units are on objective
          this.friendly.forEach(f => {
            if (Math.hypot(f.x - obj.x, f.y - obj.y) < 40) {
              obj.capturePoints += 0.5;
            }
          });

          if (obj.capturePoints >= obj.captureNeeded) {
            obj.captured = true;
          }
        });

        // Draw friendly units
        ctx.fillStyle = '#4ade80';
        this.friendly.forEach(f => {
          ctx.beginPath();
          ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw enemies
        ctx.fillStyle = '#ff6b6b';
        this.enemies.forEach(e => {
          ctx.beginPath();
          ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });

        // Update morale
        const enemyRatio = this.enemies.length / 45;
        this.morale = Math.max(0, Math.min(100, 100 * (this.friendly.length / 50) * (1 - enemyRatio * 0.5)));

        // Update UI
        document.getElementById('friendly-count').textContent = this.friendly.length + '/50';
        document.getElementById('enemy-count').textContent = this.enemies.length + '/45';
        document.getElementById('morale-level').textContent = Math.round(this.morale) + '%';
        document.getElementById('objectives-count').textContent = this.objectives.filter(o => o.captured).length + '/3';

        const battleMins = Math.floor(elapsed / 60);
        const battleSecs = Math.floor(elapsed % 60);
        document.getElementById('battle-time').textContent = battleMins + ':' + String(battleSecs).padStart(2, '0');

        // Check win/loss conditions
        if (this.friendly.length <= 0) {
          this.endBattle(false);
          return;
        }

        if (this.enemies.length <= 0 || this.objectives.filter(o => o.captured).length >= 2) {
          this.endBattle(true);
          return;
        }

        if (elapsed > 600) {
          const capturedCount = this.objectives.filter(o => o.captured).length;
          this.endBattle(capturedCount >= 2);
          return;
        }

        if (this.gameActive) {
          requestAnimationFrame(() => this.render());
        }
      },

      endBattle(victory) {
        this.gameActive = false;
        const message = victory
          ? `✓ VICTORY!\nTimbered Roads secured\n${this.friendly.length} units survived`
          : `✗ DEFEAT\nForces overwhelmed\nRetreat ordered`;

        toast(message, victory ? 'success' : 'error');
        setTimeout(() => this.quit(), 2000);
      },

      quit() {
        this.gameActive = false;
        if (this.container) this.container.remove();
      }
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // Generic template for remaining events
  // ═══════════════════════════════════════════════════════════════════════════════
  createGenericGame: function(eventId, name, description) {
    return {
      name,
      description,
      create() {
        const container = document.createElement('div');
        container.id = `game-container-${eventId}`;
        container.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #0a1929 0%, #1a3a52 100%);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'DM Sans', sans-serif;
        `;

        const gameDiv = document.createElement('div');
        gameDiv.style.cssText = `
          width: 100%;
          max-width: 1000px;
          background: rgba(12,20,35,.95);
          border: 2px solid rgba(255,249,62,.3);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          color: white;
          box-shadow: 0 8px 32px rgba(0,0,0,.5);
        `;

        gameDiv.innerHTML = `
          <h1 style="margin: 0 0 15px 0; color: #fff93e; font-size: 32px;">Event ${eventId}</h1>
          <h2 style="margin: 0 0 20px 0; font-size: 24px; color: rgba(255,255,255,.9);">${name}</h2>
          <p style="margin: 0 0 30px 0; color: rgba(255,255,255,.7); font-size: 15px; line-height: 1.7;">${description}</p>

          <div style="
            background: rgba(255,249,62,.08);
            border: 1px solid rgba(255,249,62,.2);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
          ">
            <p id="challenge-text" style="margin: 0; font-size: 16px; color: rgba(255,255,255,.9); min-height: 60px;"></p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <button id="strategy-btn" style="
              padding: 15px;
              background: rgba(100,200,100,.1);
              border: 1px solid rgba(100,200,100,.3);
              color: #4ade80;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s;
            ">Execute Strategy</button>
            <button id="aggressive-btn" style="
              padding: 15px;
              background: rgba(255,100,100,.1);
              border: 1px solid rgba(255,100,100,.3);
              color: #ff6b6b;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s;
            ">Take Risk</button>
          </div>

          <div id="progress-display" style="
            background: rgba(255,255,255,.05);
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 13px;
          ">
            <p style="margin: 0; color: rgba(255,255,255,.6);">Mission Progress</p>
            <div style="height: 8px; background: rgba(255,255,255,.1); border-radius: 4px; overflow: hidden; margin-top: 8px;">
              <div id="progress-bar" style="height: 100%; background: linear-gradient(90deg, #fff93e, #4ade80); width: 0%; transition: width 0.5s;"></div>
            </div>
            <p id="progress-text" style="margin: 5px 0 0 0; color: rgba(255,255,255,.7);">0 / 5 Objectives Complete</p>
          </div>

          <button id="generic-quit-btn" style="
            padding: 10px 20px;
            background: rgba(255,255,255,.1);
            border: 1px solid rgba(255,255,255,.2);
            color: rgba(255,255,255,.6);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
          ">Abort Mission</button>
        `;

        container.appendChild(gameDiv);
        document.body.appendChild(container);

        this.container = container;
        this.progress = 0;
        this.maxProgress = 5;
        this.completed = false;

        const challenges = [
          `Command the assault on ${name}. Choose your approach wisely.`,
          `Secure the strategic position. Enemy resistance is mounting.`,
          `Hold your ground. Reinforcements are inbound.`,
          `Advance your position. The victory is within grasp.`,
          `Complete the objective. History will remember this moment.`
        ];

        document.getElementById('challenge-text').textContent = challenges[0];
        document.getElementById('strategy-btn').onclick = () => this.executeAction('strategy');
        document.getElementById('aggressive-btn').onclick = () => this.executeAction('aggressive');
        document.getElementById('generic-quit-btn').onclick = () => this.quit();
      },

      executeAction(action) {
        if (this.completed) return;

        const success = action === 'strategy' ? Math.random() > 0.2 : Math.random() > 0.4;

        if (success) {
          this.progress++;
          const message = action === 'strategy'
            ? 'Strategic approach succeeded! +1 Objective'
            : 'Aggressive push succeeded! +1 Objective (risky)';
          toast(message, 'success');
        } else {
          toast('Approach failed. Regrouping...', 'warning');
        }

        document.getElementById('progress-bar').style.width = (this.progress / this.maxProgress) * 100 + '%';
        document.getElementById('progress-text').textContent = this.progress + ' / ' + this.maxProgress + ' Objectives Complete';

        if (this.progress >= this.maxProgress) {
          this.completed = true;
          toast(`✓ Mission Complete! Event ${this.eventId} conquered!`, 'success');
          setTimeout(() => this.quit(), 2000);
        }
      },

      quit() {
        if (this.container) this.container.remove();
      }
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER LAUNCHER
// ═══════════════════════════════════════════════════════════════════════════════
function launchChronicleMinigame(eventId) {
  const games = {
    1: () => CHRONICLE_GAMES.event1().create(),
    2: () => CHRONICLE_GAMES.event2().create(),
    3: () => CHRONICLE_GAMES.event3().create(),
    4: () => CHRONICLE_GAMES.createGenericGame(4, 'Defense of Vastilly Outer Walls', 'Repel the Oakhaven counter-assault. Fortify your defenses and break their siege.').create(),
    5: () => CHRONICLE_GAMES.createGenericGame(5, 'Fenwick Canal Skirmishes', 'Control the inland waterways. Secure transport routes and cut enemy supply lines.').create(),
    6: () => CHRONICLE_GAMES.createGenericGame(6, 'Ironstall Contracts', 'Recruit mercenaries and secure weapons. Strengthen your forces for the coming conflict.').create(),
    7: () => CHRONICLE_GAMES.createGenericGame(7, 'The March Through Vane', 'Navigate mountain passes. Outmaneuver enemy defenses through harsh terrain.').create(),
    8: () => CHRONICLE_GAMES.createGenericGame(8, 'The Glassport Blockade', 'Cut off sea trade. Isolate Oakhaven from the Hycay Gulf.').create(),
    9: () => CHRONICLE_GAMES.createGenericGame(9, 'The Siege of Port-Crest', 'A decisive naval assault. This is the turning point of the war.').create(),
    10: () => CHRONICLE_GAMES.createGenericGame(10, 'The 14-Day Bombardment', 'Withstand relentless bombardment. Hold the harbor against all odds.').create(),
    11: () => CHRONICLE_GAMES.createGenericGame(11, 'The Harbour of Wrecks', 'Salvage from the wreckage. Recover lost ships and supplies.').create(),
    12: () => CHRONICLE_GAMES.createGenericGame(12, 'The Push into Oakhaven', 'The final offensive. March toward the enemy capital.').create(),
    13: () => CHRONICLE_GAMES.createGenericGame(13, 'The Fall of Elowen', 'The siege of the capital. Total victory awaits.').create()
  };

  if (games[eventId]) {
    try {
      games[eventId]();
    } catch (e) {
      console.error('Game launch error:', e);
      toast(`Failed to launch event ${eventId}`, 'error');
    }
  }
}
