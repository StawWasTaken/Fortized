/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - GAMES (Hand-drawn White/Black Style)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Discord-style narrative games with sketch aesthetic
 */

const ASSET_PATH = '/app/Chronicle/chapter1/assets/';

function launchChronicleMinigame(eventId) {
  console.log('🎮 Game launch:', eventId);

  if (typeof canPlayGame === 'function' && !canPlayGame()) {
    return;
  }

  switch(eventId) {
    case 1: return game_breakingTreaty();
    case 2: return game_raidSilverStream();
    case 3: return game_burningElowen();
    case 4: return game_timberRoads();
    case 5: return game_defenseVastilly();
    case 6: return game_fenwckCanal();
    case 7: return game_ironstall();
    case 8: return game_glassportBlockade();
    default: return game_generic(eventId);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED UI UTILITIES
// ════════════════════════════════════════════════════════════════════════════

function createGameContainer() {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, #f5f5f0 0%, #fafaf8 100%);
    z-index: 9999; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: 'Comic Sans MS', 'Trebuchet MS', sans-serif;
    overflow: hidden;
  `;
  return container;
}

function createGameBox(title, content) {
  const box = document.createElement('div');
  box.style.cssText = `
    background: white;
    border: 4px solid #000;
    border-radius: 8px;
    padding: 30px;
    max-width: 600px;
    width: 90%;
    box-shadow: 6px 6px 0px rgba(0,0,0,0.15);
    position: relative;
  `;

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = `
      margin: -40px 0 20px 0;
      font-size: 28px;
      font-weight: 900;
      text-align: center;
      color: #000;
      font-style: italic;
      text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
      letter-spacing: 2px;
    `;
    titleEl.textContent = title;
    box.appendChild(titleEl);
  }

  if (content) {
    box.appendChild(content);
  }

  return box;
}

function createButton(text, onClick) {
  const btn = document.createElement('button');
  btn.style.cssText = `
    background: #000;
    color: white;
    border: 3px solid #000;
    padding: 12px 24px;
    margin: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    border-radius: 4px;
    transition: all 0.1s;
    transform: skewX(-10deg);
    font-family: 'Comic Sans MS', sans-serif;
  `;
  btn.textContent = text;
  btn.onmouseover = () => {
    btn.style.background = '#333';
    btn.style.transform = 'skewX(-10deg) scale(1.05)';
  };
  btn.onmouseout = () => {
    btn.style.background = '#000';
    btn.style.transform = 'skewX(-10deg)';
  };
  btn.onclick = onClick;
  return btn;
}

function createDialogueBox(npcName, text) {
  const box = document.createElement('div');
  box.style.cssText = `
    background: white;
    border: 3px solid #000;
    border-radius: 6px;
    padding: 16px;
    margin: 12px 0;
    position: relative;
  `;

  if (npcName) {
    const name = document.createElement('div');
    name.style.cssText = `
      font-weight: 700;
      color: #000;
      font-size: 14px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    name.textContent = npcName;
    box.appendChild(name);
  }

  const textEl = document.createElement('div');
  textEl.style.cssText = `
    color: #333;
    font-size: 14px;
    line-height: 1.5;
    font-family: 'Comic Sans MS', sans-serif;
  `;
  textEl.textContent = text;
  box.appendChild(textEl);

  return box;
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 1: BREAKING OF THE TREATY - Dialogue/Choice Game
// ════════════════════════════════════════════════════════════════════════════
function game_breakingTreaty() {
  const container = createGameContainer();
  document.body.appendChild(container);

  const game = {
    persuasion: 50,
    round: 0,
    maxRounds: 3,
    dialogues: [
      { npc: 'Cardinal Wealthplace', text: 'The Treaty of Silver Stream is broken! What counsel do you offer, Knight?' },
      { npc: 'Lady Vesper', text: 'Oakhaven tests our resolve. Do we show strength or restraint?' },
      { npc: 'Magistrate Kolin', text: 'The people await our decision. What is your word?' }
    ],
    choices: [
      { text: 'Demand reparations', impact: 10 },
      { text: 'New trade deals', impact: 5 },
      { text: 'Prepare for war', impact: 20 },
      { text: 'Seek peace', impact: 3 }
    ]
  };

  function updateDialogue() {
    container.innerHTML = '';

    if (game.round >= game.maxRounds) {
      endGame();
      return;
    }

    const curr = game.dialogues[game.round];
    const content = document.createElement('div');

    // Dialogue
    content.appendChild(createDialogueBox(curr.npc, curr.text));

    // Persuasion meter
    const meterBox = document.createElement('div');
    meterBox.style.cssText = `
      background: #f0f0f0;
      border: 2px solid #000;
      padding: 12px;
      margin: 16px 0;
      border-radius: 4px;
    `;

    const meterLabel = document.createElement('div');
    meterLabel.style.cssText = 'font-size: 12px; font-weight: 700; margin-bottom: 6px;';
    meterLabel.textContent = `PERSUASION: ${Math.round(game.persuasion)}%`;
    meterBox.appendChild(meterLabel);

    const meterBar = document.createElement('div');
    meterBar.style.cssText = `
      height: 12px;
      background: #ddd;
      border: 1px solid #000;
      border-radius: 2px;
      overflow: hidden;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      height: 100%;
      background: #000;
      width: ${Math.min(100, game.persuasion)}%;
      transition: width 0.3s;
    `;
    meterBar.appendChild(fill);
    meterBox.appendChild(meterBar);
    content.appendChild(meterBox);

    // Choices
    const choicesBox = document.createElement('div');
    choicesBox.style.cssText = 'margin-top: 12px;';
    game.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        display: block;
        width: 100%;
        background: white;
        border: 2px solid #000;
        padding: 12px;
        margin: 6px 0;
        cursor: pointer;
        text-align: left;
        font-size: 13px;
        border-radius: 4px;
        transition: all 0.1s;
        font-family: 'Comic Sans MS', sans-serif;
      `;
      btn.textContent = choice.text;
      btn.onmouseover = () => btn.style.background = '#f0f0f0';
      btn.onmouseout = () => btn.style.background = 'white';
      btn.onclick = () => makeChoice(choice.impact);
      choicesBox.appendChild(btn);
    });
    content.appendChild(choicesBox);

    const gameBox = createGameBox('COUNCIL CHAMBER', content);
    container.appendChild(gameBox);
  }

  function makeChoice(impact) {
    game.persuasion += impact + (Math.random() * 20 - 10);
    game.persuasion = Math.max(0, Math.min(100, game.persuasion));
    game.round++;
    updateDialogue();
  }

  function endGame() {
    const success = game.persuasion > 60;
    container.remove();
    if (success) {
      markEventComplete(1);
      toast('✓ The council declares war!', 'success');
    } else {
      toast('✗ The council remains divided.', 'error');
    }
  }

  updateDialogue();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 2: RAID ON SILVER STREAM - Catch Falling Objects
// ════════════════════════════════════════════════════════════════════════════
function game_raidSilverStream() {
  const container = createGameContainer();
  document.body.appendChild(container);

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  canvas.style.cssText = `
    border: 4px solid #000;
    background: white;
    display: block;
    max-width: 90vw;
    image-rendering: crisp-edges;
  `;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    player: { x: w / 2, y: h - 50, w: 40, h: 40, collected: 0 },
    items: [],
    time: 30,
    gameActive: true
  };

  // Spawn initial items
  for (let i = 0; i < 3; i++) {
    game.items.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.5),
      w: 20,
      h: 20,
      vy: 1.5 + Math.random(),
      type: Math.random() > 0.3 ? 'gold' : 'danger'
    });
  }

  document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    game.player.x = e.clientX - rect.left - game.player.w / 2;
    game.player.x = Math.max(0, Math.min(w - game.player.w, game.player.x));
  });

  function update() {
    if (!game.gameActive) return;

    // Update items
    game.items = game.items.filter(item => {
      item.y += item.vy;

      // Check collision
      if (item.y + item.h > game.player.y &&
          item.y < game.player.y + game.player.h &&
          item.x + item.w > game.player.x &&
          item.x < game.player.x + game.player.w) {
        if (item.type === 'gold') {
          game.player.collected += 10;
        }
        return false;
      }

      return item.y < h;
    });

    // Spawn new items
    if (Math.random() < 0.02) {
      game.items.push({
        x: Math.random() * w,
        y: -20,
        w: 20,
        h: 20,
        vy: 1.5 + Math.random(),
        type: Math.random() > 0.3 ? 'gold' : 'danger'
      });
    }

    game.time -= 1 / 60;
    if (game.time <= 0) {
      endGame();
      return;
    }

    draw();
    requestAnimationFrame(update);
  }

  function draw() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    // Player
    ctx.fillStyle = '#000';
    ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(game.player.x, game.player.y, game.player.w, game.player.h);

    // Items
    game.items.forEach(item => {
      ctx.fillStyle = item.type === 'gold' ? '#FFD700' : '#FF6B6B';
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(item.x, item.y, item.w, item.h);
    });

    // UI
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Comic Sans MS';
    ctx.fillText(`Gold: ${game.player.collected}`, 10, 20);
    ctx.fillText(`Time: ${Math.ceil(game.time)}s`, w - 100, 20);
  }

  function endGame() {
    game.gameActive = false;
    container.remove();
    if (game.player.collected >= 150) {
      markEventComplete(2);
      toast('✓ Raid successful! Gold secured!', 'success');
    } else {
      toast('✗ Raid failed. Not enough gold collected.', 'error');
    }
  }

  draw();
  requestAnimationFrame(update);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 3: BURNING ELOWEN - Clicker Game
// ════════════════════════════════════════════════════════════════════════════
function game_burningElowen() {
  const container = createGameContainer();
  document.body.appendChild(container);

  const game = {
    depots: [
      { name: 'North Depot', clicked: 0, needed: 3 },
      { name: 'East Depot', clicked: 0, needed: 3 },
      { name: 'South Depot', clicked: 0, needed: 3 },
      { name: 'West Depot', clicked: 0, needed: 3 },
      { name: 'Center Depot', clicked: 0, needed: 3 }
    ],
    completed: 0
  };

  function renderGame() {
    container.innerHTML = '';

    const content = document.createElement('div');

    const progressBox = document.createElement('div');
    progressBox.style.cssText = `
      background: #f0f0f0;
      border: 2px solid #000;
      padding: 12px;
      margin-bottom: 16px;
      text-align: center;
      border-radius: 4px;
    `;
    progressBox.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 6px;">DEPOTS DESTROYED: ${game.completed}/5</div>
      <div style="height: 16px; background: white; border: 1px solid #000; border-radius: 2px; overflow: hidden;">
        <div style="height: 100%; background: #000; width: ${(game.completed / 5) * 100}%;"></div>
      </div>
    `;
    content.appendChild(progressBox);

    game.depots.forEach((depot, idx) => {
      const depotBtn = document.createElement('button');
      depotBtn.style.cssText = `
        display: block;
        width: 100%;
        background: white;
        border: 2px solid #000;
        padding: 12px;
        margin: 6px 0;
        cursor: pointer;
        text-align: left;
        font-size: 13px;
        border-radius: 4px;
        transition: all 0.1s;
        font-weight: 700;
        font-family: 'Comic Sans MS', sans-serif;
      `;
      depotBtn.textContent = `${depot.name}: ${depot.clicked}/${depot.needed}`;

      if (depot.clicked >= depot.needed) {
        depotBtn.style.background = '#000';
        depotBtn.style.color = 'white';
        depotBtn.disabled = true;
      }

      depotBtn.onmouseover = () => {
        if (depot.clicked < depot.needed) {
          depotBtn.style.background = '#f0f0f0';
        }
      };
      depotBtn.onmouseout = () => {
        if (depot.clicked < depot.needed) {
          depotBtn.style.background = 'white';
        }
      };

      depotBtn.onclick = () => {
        if (depot.clicked < depot.needed) {
          depot.clicked++;
          if (depot.clicked >= depot.needed) {
            game.completed++;
            if (game.completed >= 5) {
              endGame();
              return;
            }
          }
          renderGame();
        }
      };

      content.appendChild(depotBtn);
    });

    const gameBox = createGameBox('BURNING ELOWEN', content);
    container.appendChild(gameBox);
  }

  function endGame() {
    container.remove();
    markEventComplete(3);
    toast('✓ Elowen is burning! Mission complete!', 'success');
  }

  renderGame();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 4: TIMBER ROADS - Arrow Sequence
// ════════════════════════════════════════════════════════════════════════════
function game_timberRoads() {
  const container = createGameContainer();
  document.body.appendChild(container);

  const game = {
    sequence: [],
    playerSequence: [],
    round: 0,
    maxRounds: 4
  };

  const arrows = ['↑', '→', '↓', '←'];

  function generateSequence() {
    game.sequence.push(arrows[Math.floor(Math.random() * 4)]);
  }

  function renderGame() {
    container.innerHTML = '';

    const content = document.createElement('div');

    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      background: #f0f0f0;
      border: 2px solid #000;
      padding: 12px;
      margin-bottom: 16px;
      text-align: center;
      border-radius: 4px;
      font-size: 12px;
    `;
    instructions.innerHTML = `Remember the arrow sequence!<br>Round ${game.round + 1} of ${game.maxRounds}`;
    content.appendChild(instructions);

    // Sequence display
    const seqDisplay = document.createElement('div');
    seqDisplay.style.cssText = `
      background: white;
      border: 2px solid #000;
      padding: 16px;
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
      border-radius: 4px;
      letter-spacing: 8px;
      min-height: 50px;
    `;
    seqDisplay.textContent = game.sequence.join(' ');
    content.appendChild(seqDisplay);

    // Arrow buttons
    const buttonBox = document.createElement('div');
    buttonBox.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;';

    arrows.forEach((arrow, idx) => {
      const btn = createButton(arrow, () => playerInput(arrow));
      btn.style.cssText = `
        background: white;
        color: #000;
        border: 2px solid #000;
        padding: 20px;
        font-size: 24px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.1s;
        font-family: 'Comic Sans MS', sans-serif;
      `;
      btn.onmouseover = () => btn.style.background = '#f0f0f0';
      btn.onmouseout = () => btn.style.background = 'white';
      buttonBox.appendChild(btn);
    });
    content.appendChild(buttonBox);

    const gameBox = createGameBox('TIMBER ROADS', content);
    container.appendChild(gameBox);
  }

  function playerInput(arrow) {
    game.playerSequence.push(arrow);

    if (arrow !== game.sequence[game.playerSequence.length - 1]) {
      endGame(false);
      return;
    }

    if (game.playerSequence.length === game.sequence.length) {
      game.round++;
      if (game.round >= game.maxRounds) {
        endGame(true);
        return;
      }

      generateSequence();
      game.playerSequence = [];
      setTimeout(renderGame, 500);
    }
  }

  function endGame(success) {
    container.remove();
    if (success) {
      markEventComplete(4);
      toast('✓ You navigated the Timber Roads!', 'success');
    } else {
      toast('✗ You lost the path. Try again.', 'error');
    }
  }

  generateSequence();
  renderGame();
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT 5: DEFENSE OF VASTILLY - Shield Movement
// ════════════════════════════════════════════════════════════════════════════
function game_defenseVastilly() {
  const container = createGameContainer();
  document.body.appendChild(container);

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  canvas.style.cssText = `
    border: 4px solid #000;
    background: white;
    display: block;
    max-width: 90vw;
    image-rendering: crisp-edges;
  `;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const game = {
    shield: { x: w / 2 - 20, y: h - 50, w: 40, h: 40, blocked: 0 },
    projectiles: [],
    time: 45,
    gameActive: true
  };

  document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    game.shield.x = e.clientX - rect.left - game.shield.w / 2;
    game.shield.x = Math.max(0, Math.min(w - game.shield.w, game.shield.x));
  });

  function update() {
    if (!game.gameActive) return;

    // Spawn projectiles
    if (Math.random() < 0.03) {
      game.projectiles.push({
        x: Math.random() * w,
        y: -20,
        w: 15,
        h: 15,
        vy: 2 + Math.random()
      });
    }

    // Update projectiles
    game.projectiles = game.projectiles.filter(proj => {
      proj.y += proj.vy;

      // Check collision with shield
      if (proj.y + proj.h > game.shield.y &&
          proj.y < game.shield.y + game.shield.h &&
          proj.x + proj.w > game.shield.x &&
          proj.x < game.shield.x + game.shield.w) {
        game.shield.blocked++;
        return false;
      }

      return proj.y < h;
    });

    game.time -= 1 / 60;
    if (game.time <= 0 || game.shield.blocked >= 10) {
      endGame();
      return;
    }

    draw();
    requestAnimationFrame(update);
  }

  function draw() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    // Shield
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(game.shield.x + game.shield.w / 2, game.shield.y);
    ctx.lineTo(game.shield.x + game.shield.w, game.shield.y + game.shield.h);
    ctx.lineTo(game.shield.x, game.shield.y + game.shield.h);
    ctx.closePath();
    ctx.fill();

    // Projectiles
    game.projectiles.forEach(proj => {
      ctx.fillStyle = '#000';
      ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
    });

    // UI
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Comic Sans MS';
    ctx.fillText(`Blocked: ${game.shield.blocked}/10`, 10, 20);
    ctx.fillText(`Time: ${Math.ceil(game.time)}s`, w - 100, 20);
  }

  function endGame() {
    game.gameActive = false;
    container.remove();
    if (game.shield.blocked >= 10) {
      markEventComplete(5);
      toast('✓ Vastilly is defended!', 'success');
    } else {
      toast('✗ Defense failed. The city falls.', 'error');
    }
  }

  draw();
  requestAnimationFrame(update);
}

// ════════════════════════════════════════════════════════════════════════════
// SIMPLE CLICKER TEMPLATE (Events 6-8)
// ════════════════════════════════════════════════════════════════════════════

function createSimpleClicker(eventId, eventName, clicksNeeded) {
  const container = createGameContainer();
  document.body.appendChild(container);

  const game = { clicks: 0, needed: clicksNeeded };

  function renderGame() {
    container.innerHTML = '';

    const content = document.createElement('div');

    const progressBox = document.createElement('div');
    progressBox.style.cssText = `
      background: #f0f0f0;
      border: 2px solid #000;
      padding: 16px;
      margin-bottom: 20px;
      text-align: center;
      border-radius: 4px;
    `;
    progressBox.innerHTML = `
      <div style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">${game.clicks}/${game.needed}</div>
      <div style="height: 20px; background: white; border: 2px solid #000; border-radius: 2px; overflow: hidden;">
        <div style="height: 100%; background: #000; width: ${(game.clicks / game.needed) * 100}%;"></div>
      </div>
    `;
    content.appendChild(progressBox);

    const clickBtn = document.createElement('button');
    clickBtn.style.cssText = `
      width: 100%;
      background: white;
      border: 3px solid #000;
      padding: 40px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.1s;
      font-family: 'Comic Sans MS', sans-serif;
    `;
    clickBtn.textContent = 'CLICK!';
    clickBtn.onmouseover = () => clickBtn.style.background = '#f0f0f0';
    clickBtn.onmouseout = () => clickBtn.style.background = 'white';
    clickBtn.onmousedown = () => clickBtn.style.transform = 'scale(0.95)';
    clickBtn.onmouseup = () => clickBtn.style.transform = 'scale(1)';
    clickBtn.onclick = () => {
      game.clicks++;
      if (game.clicks >= game.needed) {
        endGame();
        return;
      }
      renderGame();
    };
    content.appendChild(clickBtn);

    const gameBox = createGameBox(eventName, content);
    container.appendChild(gameBox);
  }

  function endGame() {
    container.remove();
    markEventComplete(eventId);
    toast(`✓ ${eventName} complete!`, 'success');
  }

  renderGame();
}

function game_fenwckCanal() {
  createSimpleClicker(6, 'FENWCK CANAL', 75);
}

function game_ironstall() {
  createSimpleClicker(7, 'IRONSTALL', 50);
}

function game_glassportBlockade() {
  createSimpleClicker(8, 'GLASSPORT BLOCKADE', 60);
}

// ════════════════════════════════════════════════════════════════════════════
// GENERIC GAME FOR EVENTS 9-14
// ════════════════════════════════════════════════════════════════════════════

function game_generic(eventId) {
  const container = createGameContainer();
  document.body.appendChild(container);

  const eventNames = {
    9: 'EVENT 9',
    10: 'EVENT 10',
    11: 'EVENT 11',
    12: 'EVENT 12',
    13: 'EVENT 13',
    14: 'EVENT 14'
  };

  const content = document.createElement('div');
  content.style.cssText = 'text-align: center;';

  const message = document.createElement('p');
  message.style.cssText = `
    color: #000;
    font-size: 14px;
    line-height: 1.6;
    margin: 16px 0;
  `;
  message.textContent = 'This event is coming soon...';
  content.appendChild(message);

  const skipBtn = createButton('Continue', () => {
    container.remove();
    toast('Event passed', 'info');
  });
  content.appendChild(skipBtn);

  const gameBox = createGameBox(eventNames[eventId] || `EVENT ${eventId}`, content);
  container.appendChild(gameBox);
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT COMPLETION HANDLER
// ════════════════════════════════════════════════════════════════════════════

function markEventComplete(eventId) {
  if (typeof decayAfterGame === 'function') {
    decayAfterGame();
  }

  _chronicleProgress[eventId] = true;

  if (typeof renderChronicleEvents === 'function') renderChronicleEvents();
  if (typeof renderChronicleMapPins === 'function') renderChronicleMapPins();
  if (typeof updateChronicleProgress === 'function') updateChronicleProgress();
}
