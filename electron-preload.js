// ════════════════════════════════════════════════════
// FORTIZED — Electron Preload Script
// ════════════════════════════════════════════════════
// Exposes safe, sandboxed APIs to the renderer process
// via contextBridge. The renderer (web app) can access
// these through `window.fortizedDesktop`.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fortizedDesktop', {
  // ── Platform info ──
  isDesktopApp: true,
  platform: process.platform, // 'win32', 'darwin', 'linux'

  // ── Game Detection ──
  detectGames: () => ipcRenderer.invoke('detect-games'),
  startGameDetection: () => ipcRenderer.send('game-detection:start'),
  stopGameDetection: () => ipcRenderer.send('game-detection:stop'),
  onGameDetectionUpdate: (callback) => {
    ipcRenderer.on('game-detection:update', (_event, games) => callback(games));
  },

  // ── Window Controls ──
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
});
