// ════════════════════════════════════════════════════
// FORTIZED — Electron Preload Script
// ════════════════════════════════════════════════════
// Exposes safe, sandboxed APIs to the renderer process.
// Supports both contextIsolation: true (via contextBridge)
// and contextIsolation: false (direct window assignment).

const { ipcRenderer } = require('electron');

// ── Desktop bridge API ────────────────────────────────
const fortizedDesktopAPI = {
  // Platform info
  isDesktopApp: true,
  platform: process.platform, // 'win32', 'darwin', 'linux'

  // Game Detection
  detectGames: () => ipcRenderer.invoke('detect-games'),
  getProcesses: () => ipcRenderer.invoke('get-processes'),
  startGameDetection: () => ipcRenderer.send('game-detection:start'),
  stopGameDetection: () => ipcRenderer.send('game-detection:stop'),
  onGameDetectionUpdate: (callback) => {
    ipcRenderer.on('game-detection:update', (_event, games) => callback(games));
  },

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
};

// ── Expose API ────────────────────────────────────────
// Try contextBridge first (contextIsolation: true), fall back to direct assignment
try {
  const { contextBridge } = require('electron');
  contextBridge.exposeInMainWorld('fortizedDesktop', fortizedDesktopAPI);
} catch {
  // contextIsolation is false — assign directly to window
  window.fortizedDesktop = fortizedDesktopAPI;
}

// If contextIsolation is false, also set directly (belt and suspenders)
if (typeof window !== 'undefined') {
  try { window.fortizedDesktop = fortizedDesktopAPI; } catch {}
}

// ── Notification patch ────────────────────────────────
(function patchNotification() {
  const OriginalNotification = global.Notification;
  if (!OriginalNotification) return;
  class FortizedNotification extends OriginalNotification {
    constructor(title, options) {
      super(title, options);
      try {
        ipcRenderer.send("fortized-notification", { title });
      } catch {
        // Ignore IPC errors
      }
    }
    static requestPermission(callback) {
      return OriginalNotification.requestPermission(callback);
    }
    static get permission() {
      return OriginalNotification.permission;
    }
  }
  global.Notification = FortizedNotification;
})();

// ── Top bar injection ─────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  try {
    if (document.getElementById("fortized-desktop-titlebar")) return;
    const BAR_HEIGHT    = "43px";
    const CORNER_RADIUS = "10px";
    const ICON_COLOR    = "#b3b2b4";
    const BTN_WIDTH     = 46;
    const style = document.createElement("style");
    style.textContent = `
      html, body {
        border-radius: ${CORNER_RADIUS};
        overflow: hidden;
      }
      #fortized-desktop-titlebar {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: ${BAR_HEIGHT};
        background: transparent;
        pointer-events: none;
        z-index: 2147483647;
        border-radius: ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0;
      }
      #fortized-desktop-titlebar .ftb-controls {
        position: absolute; top: 0; right: 0; height: 100%;
        display: flex; align-items: stretch;
        pointer-events: auto;
        -webkit-app-region: no-drag;
      }
      #fortized-desktop-titlebar .ftb-btn {
        width: ${BTN_WIDTH}px; height: 100%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; color: ${ICON_COLOR};
        background: transparent;
        transition: background 110ms ease, color 110ms ease;
        flex-shrink: 0; border: none; outline: none;
        padding: 0; margin: 0; box-sizing: border-box; border-radius: 0;
      }
      #fortized-desktop-titlebar .ftb-btn:hover {
        background: rgba(255, 255, 255, 0.06); color: #ffffff;
      }
      #fortized-desktop-titlebar .ftb-btn:active {
        background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.6);
      }
      #fortized-desktop-titlebar .ftb-btn svg {
        display: block; pointer-events: none;
      }
      #fortized-desktop-titlebar .ftb-btn.ftb-close {
        border-radius: 0 ${CORNER_RADIUS} 0 0;
      }
      #fortized-desktop-titlebar .ftb-btn.ftb-close:hover {
        background: #ef4444; color: #ffffff;
      }
      #fortized-desktop-titlebar .ftb-btn.ftb-close:active {
        background: #c73333;
      }
    `;
    document.head.appendChild(style);

    const ICONS = {
      minimize: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/></svg>`,
      maximize: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>`,
      restore:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4" y="1.5" width="8.5" height="8.5" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="1.5" y="4" width="8.5" height="8.5" fill="#111318" stroke="currentColor" stroke-width="1.2"/></svg>`,
      close:    `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/></svg>`
    };

    const bar = document.createElement("div");
    bar.id = "fortized-desktop-titlebar";
    const controls = document.createElement("div");
    controls.className = "ftb-controls";

    function makeBtn(iconKey, label, ipcAction, extraClass) {
      const btn = document.createElement("div");
      btn.className = `ftb-btn${extraClass ? " " + extraClass : ""}`;
      btn.setAttribute("aria-label", label);
      btn.title = label;
      btn.innerHTML = ICONS[iconKey];
      btn.addEventListener("click", () => ipcRenderer.send("fortized-window", ipcAction));
      return btn;
    }

    const btnMin   = makeBtn("minimize", "Minimize", "minimize");
    const btnMax   = makeBtn("maximize", "Maximize", "maximize");
    const btnClose = makeBtn("close",    "Close",    "close", "ftb-close");

    function syncMaxIcon() {
      const isMax = window.outerWidth >= window.screen.availWidth && window.outerHeight >= window.screen.availHeight;
      btnMax.innerHTML = isMax ? ICONS.restore : ICONS.maximize;
      btnMax.title     = isMax ? "Restore Down" : "Maximize";
    }
    window.addEventListener("resize", syncMaxIcon);

    controls.appendChild(btnMin);
    controls.appendChild(btnMax);
    controls.appendChild(btnClose);
    bar.appendChild(controls);
    document.body.appendChild(bar);
  } catch {
    // Never let topbar injection crash the app
  }
});
