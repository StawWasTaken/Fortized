/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORTIZED GRAND CHRONICLE - JOY SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * Player Joy management - affects gameplay availability
 */

// Global Joy State
let _playerJoy = 85; // 0-100
let _joyDecayTimer = null;
let _joyWaitingForRecovery = false;
let _lastGameStartTime = 0;
const JOY_DECAY_RATES = {
  aboveEightyPercent: 0, // No decay
  seventyToEighty: 0.1, // Slow decay
  fiftyToSeventy: 0.3, // Medium decay
  thirtyToFifty: 0.6, // Fast decay
  belowThirty: 1.0 // Very fast decay
};

function getJoyDecayRate() {
  if (_playerJoy >= 80) return JOY_DECAY_RATES.aboveEightyPercent;
  if (_playerJoy >= 70) return JOY_DECAY_RATES.seventyToEighty;
  if (_playerJoy >= 50) return JOY_DECAY_RATES.fiftyToSeventy;
  if (_playerJoy >= 30) return JOY_DECAY_RATES.thirtyToFifty;
  return JOY_DECAY_RATES.belowThirty;
}

function startJoyDecay() {
  if (_joyDecayTimer) clearInterval(_joyDecayTimer);

  _joyDecayTimer = setInterval(() => {
    const rate = getJoyDecayRate();
    if (rate > 0) {
      _playerJoy = Math.max(0, _playerJoy - rate);
      updateJoyBar();

      if (_playerJoy <= 0) {
        _playerJoy = 0;
        _joyWaitingForRecovery = true;
        clearInterval(_joyDecayTimer);
        showJoyLocked();
      }
    }
  }, 1000); // Decay per second
}

function increaseJoy(amount = 2) {
  _playerJoy = Math.min(85, _playerJoy + amount);
  updateJoyBar();
}

function decayAfterGame() {
  // Rapid gameplay causes faster decay
  _playerJoy = Math.max(0, _playerJoy - 15); // -15% per game
  updateJoyBar();

  if (_playerJoy <= 0) {
    _playerJoy = 0;
    _joyWaitingForRecovery = true;
    showJoyLocked();
  }
}

function updateJoyBar() {
  const joyBar = document.getElementById('chronicle-joy-bar');
  const joyPercent = document.getElementById('chronicle-joy-percent');

  if (joyBar) {
    joyBar.style.width = Math.max(0, _playerJoy) + '%';
    if (joyPercent) joyPercent.textContent = Math.round(_playerJoy);

    // Color change based on level
    if (_playerJoy > 60) {
      joyBar.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
    } else if (_playerJoy > 30) {
      joyBar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
    } else {
      joyBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
  }
}

function showJoyLocked() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,.85); z-index: 5000;
    display: flex; align-items: center; justify-content: center;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: rgba(12,15,22,.95); border: 2px solid #ef4444;
    border-radius: 20px; padding: 40px; text-align: center;
    color: white; font-family: 'DM Sans', sans-serif; max-width: 600px;
  `;

  content.innerHTML = `
    <h1 style="font-size: 32px; margin: 0 0 20px 0; color: #ef4444;">🎭 Joy Depleted</h1>
    <p style="font-size: 16px; margin: 0 0 20px 0; color: rgba(255,255,255,.8);">
      Your character is exhausted! They need a 10-minute break to recover.
    </p>
    <div style="background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <p id="joy-recovery-timer" style="margin: 0; font-size: 18px; color: #ef4444; font-weight: 600;">
        Recovery in: 10:00
      </p>
    </div>
    <p style="font-size: 13px; color: rgba(255,255,255,.6); margin: 0;">
      Come back later when your character has rested. You'll be able to play again soon!
    </p>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // 10 minute recovery timer
  let secondsLeft = 600;
  const recoveryInterval = setInterval(() => {
    secondsLeft--;
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timerEl = document.getElementById('joy-recovery-timer');
    if (timerEl) {
      timerEl.textContent = `Recovery in: ${mins}:${String(secs).padStart(2, '0')}`;
    }

    if (secondsLeft <= 0) {
      clearInterval(recoveryInterval);
      _playerJoy = 85;
      _joyWaitingForRecovery = false;
      overlay.remove();
      updateJoyBar();
      startJoyDecay();
      toast('✓ Your character has recovered!', 'success');
    }
  }, 1000);
}

function canPlayGame() {
  if (_playerJoy < 20 || _joyWaitingForRecovery) {
    toast('❌ Joy too low. Rest your character.', 'error');
    return false;
  }
  return true;
}

// Click to increase joy
function setupJoyClicker() {
  const joyBar = document.getElementById('chronicle-joy-bar');
  if (joyBar) {
    joyBar.style.cursor = 'pointer';
    joyBar.addEventListener('click', (e) => {
      e.stopPropagation();
      increaseJoy(3); // +3% per click
    });
  }
}

// Auto-recovery when not playing (3 minutes for +20%)
function startAutoRecovery() {
  setInterval(() => {
    if (!_joyWaitingForRecovery && _playerJoy < 85) {
      increaseJoy(5); // +5% every 3 minutes
    }
  }, 180000); // 3 minutes
}

// Initialize on page load
function initializeJoySystem() {
  startJoyDecay();
  setupJoyClicker();
  startAutoRecovery();
  updateJoyBar();
}
