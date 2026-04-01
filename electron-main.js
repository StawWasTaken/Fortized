// ════════════════════════════════════════════════════
// FORTIZED — Electron Main Process (v3.0.0)
// ════════════════════════════════════════════════════
// Desktop app with game detection, system info, audio status,
// and real-time communication with the web app.

const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const io = require('socket.io-client');

let mainWindow = null;
let tray = null;
let gameDetectionInterval = null;
let activitySyncInterval = null;
let socket = null;
const APP_VERSION = '3.0.0';
const APP_ID = process.env.FORTIZED_APP_ID || 'fortized-desktop-' + Date.now();

// ── Known games database for process matching ──────
// Maps executable names (lowercase) to display info
const KNOWN_GAMES = {
  // Popular Games
  'minecraft.exe': { name: 'Minecraft', icon: '⛏️' },
  'javaw.exe': { name: 'Minecraft (Java)', icon: '⛏️' },
  'robloxplayerbeta.exe': { name: 'Roblox', icon: '🎮' },
  'fortnitelauncherclient.exe': { name: 'Fortnite', icon: '🎯' },
  'fortniteclient-win64-shipping.exe': { name: 'Fortnite', icon: '🎯' },
  'valorant.exe': { name: 'Valorant', icon: '🔫' },
  'valorant-win64-shipping.exe': { name: 'Valorant', icon: '🔫' },
  'leagueclient.exe': { name: 'League of Legends', icon: '⚔️' },
  'league of legends.exe': { name: 'League of Legends', icon: '⚔️' },
  'rocketleague.exe': { name: 'Rocket League', icon: '🚀' },
  'among us.exe': { name: 'Among Us', icon: '🚀' },
  'r5apex.exe': { name: 'Apex Legends', icon: '🔫' },
  'genshinimpact.exe': { name: 'Genshin Impact', icon: '⚡' },
  'yuanshen.exe': { name: 'Genshin Impact', icon: '⚡' },
  'overwatch.exe': { name: 'Overwatch 2', icon: '🎯' },
  'csgo.exe': { name: 'Counter-Strike', icon: '🔫' },
  'cs2.exe': { name: 'Counter-Strike 2', icon: '🔫' },
  'dota2.exe': { name: 'Dota 2', icon: '⚔️' },
  'terraria.exe': { name: 'Terraria', icon: '⛏️' },
  'starfield.exe': { name: 'Starfield', icon: '🚀' },
  'baldursgate3.exe': { name: "Baldur's Gate 3", icon: '⚔️' },
  'bg3.exe': { name: "Baldur's Gate 3", icon: '⚔️' },
  'eldenring.exe': { name: 'Elden Ring', icon: '⚔️' },
  'gtav.exe': { name: 'Grand Theft Auto V', icon: '🚗' },
  'gta5.exe': { name: 'Grand Theft Auto V', icon: '🚗' },
  'deadbydaylight-win64-shipping.exe': { name: 'Dead by Daylight', icon: '🔪' },
  'phasmophobia.exe': { name: 'Phasmophobia', icon: '👻' },
  'lethalcompany.exe': { name: 'Lethal Company', icon: '👻' },
  'palworld-win64-shipping.exe': { name: 'Palworld', icon: '🎮' },
  'helldivers2.exe': { name: 'Helldivers 2', icon: '🔫' },
  'hogwartslegacy.exe': { name: 'Hogwarts Legacy', icon: '🧙' },
  'destiny2.exe': { name: 'Destiny 2', icon: '🔫' },
  'warframe.x64.exe': { name: 'Warframe', icon: '⚔️' },
  'tf2_win64.exe': { name: 'Team Fortress 2', icon: '🔫' },
  'hl2.exe': { name: 'Half-Life 2', icon: '🔫' },
  'stardewvalley.exe': { name: 'Stardew Valley', icon: '🌾' },
  'hollow_knight.exe': { name: 'Hollow Knight', icon: '⚔️' },
  'celeste.exe': { name: 'Celeste', icon: '🏔️' },
  'hades.exe': { name: 'Hades', icon: '⚔️' },
  'subnautica.exe': { name: 'Subnautica', icon: '🌊' },
  'cyberpunk2077.exe': { name: 'Cyberpunk 2077', icon: '🤖' },
  'witcher3.exe': { name: 'The Witcher 3', icon: '⚔️' },
  'skyrim.exe': { name: 'Skyrim', icon: '⚔️' },
  'skyrimse.exe': { name: 'Skyrim Special Edition', icon: '⚔️' },
  'fallout4.exe': { name: 'Fallout 4', icon: '☢️' },
  'sekiro.exe': { name: 'Sekiro', icon: '⚔️' },
  'persona5r.exe': { name: 'Persona 5 Royal', icon: '🎭' },
  'nierautomata.exe': { name: 'NieR: Automata', icon: '🤖' },
  'darksoulsiii.exe': { name: 'Dark Souls III', icon: '⚔️' },
  // Platforms/Launchers
  'steam.exe': { name: 'Steam', icon: '🎮', isLauncher: true },
  'epicgameslauncher.exe': { name: 'Epic Games', icon: '🎮', isLauncher: true },
  'battle.net.exe': { name: 'Battle.net', icon: '🎮', isLauncher: true },
  'origin.exe': { name: 'EA App', icon: '🎮', isLauncher: true },
  // Creative/Productivity
  'spotify.exe': { name: 'Spotify', icon: '🎵' },
  'code.exe': { name: 'Visual Studio Code', icon: '💻' },
  'obs64.exe': { name: 'OBS Studio', icon: '🎥' },
  'blender.exe': { name: 'Blender', icon: '🎨' },
  'unity.exe': { name: 'Unity', icon: '🕹️' },
  'unrealEditor.exe': { name: 'Unreal Engine', icon: '🕹️' },
  'godot.exe': { name: 'Godot Engine', icon: '🕹️' },
  'photoshop.exe': { name: 'Photoshop', icon: '🖼️' },
  'afterfx.exe': { name: 'After Effects', icon: '✨' },
  'premiere pro.exe': { name: 'Premiere Pro', icon: '🎬' },
  'figma.exe': { name: 'Figma', icon: '🎨' },
  'clip studio paint.exe': { name: 'Clip Studio Paint', icon: '🎨' },
};

// macOS / Linux process names
// Start with .exe-stripped Windows names, then add platform-specific overrides
const KNOWN_GAMES_UNIX = {};
Object.entries(KNOWN_GAMES).forEach(([key, val]) => {
  KNOWN_GAMES_UNIX[key.replace('.exe', '')] = val;
});
// macOS-specific process names (often different from Windows)
Object.assign(KNOWN_GAMES_UNIX, {
  'robloxplayer':       { name: 'Roblox', icon: '🎮' },
  'java':              { name: 'Minecraft (Java)', icon: '⛏️' },
  'riot client':       { name: 'Valorant', icon: '🔫' },
  'leagueoflegends':   { name: 'League of Legends', icon: '⚔️' },
  'genshinimpact':     { name: 'Genshin Impact', icon: '⚡' },
  'spotify':           { name: 'Spotify', icon: '🎵' },
  'electron':          { name: 'Electron App', icon: '💻', isLauncher: true },
  'code helper':       { name: 'Visual Studio Code', icon: '💻' },
  'code helper (renderer)': { name: 'Visual Studio Code', icon: '💻' },
  'obs':               { name: 'OBS Studio', icon: '🎥' },
  'figma':             { name: 'Figma', icon: '🎨' },
  'blender':           { name: 'Blender', icon: '🎨' },
  'godot':             { name: 'Godot Engine', icon: '🕹️' },
  'steam_osx':         { name: 'Steam', icon: '🎮', isLauncher: true },
  'steamwebhelper':    { name: 'Steam', icon: '🎮', isLauncher: true },
  'subnautica.x86_64': { name: 'Subnautica', icon: '🌊' },
  'terraria.bin.x86_64': { name: 'Terraria', icon: '⛏️' },
  'stardewvalley.bin.x86_64': { name: 'Stardew Valley', icon: '🌾' },
  'hollowknight.x86_64': { name: 'Hollow Knight', icon: '⚔️' },
  'celeste.bin.x86_64': { name: 'Celeste', icon: '🏔️' },
  'hades.x86_64':      { name: 'Hades', icon: '⚔️' },
});

// ── System Info Detection ──────────────────────────
function getSystemInfo() {
  return {
    appVersion: APP_VERSION,
    appId: APP_ID,
    platform: process.platform,
    osVersion: os.release(),
    arch: process.arch,
    cpuCount: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

// ── Audio Status Detection (Windows) ───────────────
function detectAudioStatus() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ isPlaying: false, devices: [] });
      return;
    }
    // Simple check: see if any audio-related processes are running
    const audioProcesses = ['spotify.exe', 'itunes.exe', 'vlc.exe', 'winamp.exe', 'musicbee.exe', 'foobar2000.exe'];
    exec('tasklist /FO CSV /NH', { maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
      if (err) {
        resolve({ isPlaying: false, devices: [] });
        return;
      }
      const processes = new Set();
      stdout.split('\n').forEach(line => {
        const match = line.match(/^"([^"]+)"/);
        if (match) processes.add(match[1].toLowerCase());
      });

      const activeAudioApps = audioProcesses.filter(ap => processes.has(ap));
      resolve({
        isPlaying: activeAudioApps.length > 0,
        devices: activeAudioApps,
        timestamp: new Date().toISOString(),
      });
    });
  });
}

// ── Process Detection ──────────────────────────────
function getRunningProcesses() {
  return new Promise((resolve) => {
    const platform = process.platform;
    let cmd;
    if (platform === 'win32') {
      cmd = 'tasklist /FO CSV /NH';
    } else if (platform === 'darwin') {
      cmd = 'ps -eo comm=';
    } else {
      cmd = 'ps -eo comm=';
    }

    exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
      if (err) { resolve([]); return; }
      const processes = new Set();
      if (platform === 'win32') {
        stdout.split('\n').forEach(line => {
          const match = line.match(/^"([^"]+)"/);
          if (match) processes.add(match[1].toLowerCase());
        });
      } else {
        stdout.split('\n').forEach(line => {
          const name = line.trim().split('/').pop();
          if (name) processes.add(name.toLowerCase());
        });
      }
      resolve([...processes]);
    });
  });
}

async function detectRunningGames() {
  const processes = await getRunningProcesses();
  const detected = [];
  const seenNames = new Set();
  const platform = process.platform;
  const knownDB = platform === 'win32' ? KNOWN_GAMES : KNOWN_GAMES_UNIX;

  for (const proc of processes) {
    const match = knownDB[proc];
    if (match && !match.isLauncher && !seenNames.has(match.name)) {
      seenNames.add(match.name);
      detected.push({
        name: match.name,
        icon: match.icon,
        processName: proc,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return detected;
}

// ── Window Creation ────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Fortized',
    icon: path.join(__dirname, 'Fortized icon.png'),
    frame: false,
    backgroundColor: '#0c0f16',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Append "FortizedApp" to the User-Agent so the web app can detect the desktop client.
  // We spoof a mainstream browser UA to avoid site compatibility issues, but KEEP
  // "FortizedApp" and "Electron" markers so the web app can identify the desktop wrapper.
  const defaultUA = mainWindow.webContents.getUserAgent();
  const fortizedUA = defaultUA + ' FortizedApp';
  mainWindow.webContents.setUserAgent(fortizedUA);

  // Load the web app — use production URL, or localhost in dev
  const appUrl = process.env.FORTIZED_URL || (process.env.NODE_ENV === 'development'
    ? `http://localhost:${process.env.PORT || 3000}/app`
    : 'https://fortized.com/app');
  mainWindow.loadURL(appUrl);

  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    if (tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── System Tray ────────────────────────────────────
function createTray() {
  try {
    tray = new Tray(path.join(__dirname, 'Fortized icon.png'));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Fortized', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => { tray = null; app.quit(); } },
    ]);
    tray.setToolTip('Fortized');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow?.show());
  } catch (e) {
    console.warn('[Tray] Could not create tray:', e.message);
  }
}

// ── Socket.IO Connection & Activity Sync ──────────
function initializeSocketIO() {
  const socketUrl = process.env.FORTIZED_SOCKET_URL || (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://fortized.com');

  socket = io(socketUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
    extraHeaders: { 'X-Fortized-App': APP_VERSION, 'X-App-ID': APP_ID },
  });

  socket.on('connect', () => {
    console.log('[Socket.IO] Connected to server');
    // Notify the web app that desktop app is connected
    if (mainWindow) {
      mainWindow.webContents.send('desktop-app:connected', { appVersion: APP_VERSION });
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Disconnected from server');
  });

  socket.on('error', (err) => {
    console.error('[Socket.IO] Error:', err);
  });
}

async function startActivitySync() {
  // Stop any existing interval
  if (activitySyncInterval) clearInterval(activitySyncInterval);

  // Send activity status to web app every 10 seconds
  activitySyncInterval = setInterval(async () => {
    if (!mainWindow) return;

    const games = await detectRunningGames();
    const audioStatus = await detectAudioStatus();
    const systemInfo = getSystemInfo();

    const activityData = {
      appVersion: APP_VERSION,
      appId: APP_ID,
      games: games,
      audio: audioStatus,
      system: systemInfo,
      timestamp: new Date().toISOString(),
    };

    // Send to web app via IPC
    mainWindow.webContents.send('desktop-app:activity', activityData);

    // Send to server via Socket.IO if connected and user is authenticated
    if (socket?.connected && mainWindow) {
      mainWindow.webContents.evaluateJavaScript('CU?.username')
        .then(username => {
          if (username) {
            socket.emit('desktop-app:activity', {
              username,
              ...activityData,
            });
          }
        })
        .catch(() => {});
    }
  }, 10000); // Every 10 seconds
}

// ── IPC Handlers ───────────────────────────────────
function setupIPC() {
  // Game detection: return currently running games
  ipcMain.handle('detect-games', async () => {
    return await detectRunningGames();
  });

  // System info
  ipcMain.handle('get-system-info', async () => {
    return getSystemInfo();
  });

  // Audio status
  ipcMain.handle('get-audio-status', async () => {
    return await detectAudioStatus();
  });

  // Window controls (from window:* events)
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Window controls from titlebar buttons (fortized-window events)
  ipcMain.on('fortized-window', (event, action) => {
    if (!mainWindow) return;
    switch (action) {
      case 'minimize': mainWindow.minimize(); break;
      case 'maximize':
        if (mainWindow.isMaximized()) mainWindow.restore();
        else mainWindow.maximize();
        break;
      case 'close': mainWindow.close(); break;
    }
  });

  // Notification badge from preload
  ipcMain.on('fortized-notification', () => {
    // Could implement badge/tray notification count here
  });

  // Get raw process list (for renderer-side matching)
  ipcMain.handle('get-processes', async () => {
    return await getRunningProcesses();
  });

  // Start periodic game detection and activity sync
  ipcMain.on('game-detection:start', () => {
    if (gameDetectionInterval) clearInterval(gameDetectionInterval);
    startActivitySync(); // Start the full activity sync
    gameDetectionInterval = setInterval(async () => {
      const games = await detectRunningGames();
      mainWindow?.webContents.send('game-detection:update', games);
    }, 15000); // Check every 15 seconds
  });

  ipcMain.on('game-detection:stop', () => {
    if (gameDetectionInterval) {
      clearInterval(gameDetectionInterval);
      gameDetectionInterval = null;
    }
    if (activitySyncInterval) {
      clearInterval(activitySyncInterval);
      activitySyncInterval = null;
    }
  });
}

// ── App Lifecycle ──────────────────────────────────
app.whenReady().then(() => {
  console.log(`[Fortized] Initializing Desktop App v${APP_VERSION}`);
  setupIPC();
  initializeSocketIO();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (gameDetectionInterval) clearInterval(gameDetectionInterval);
    app.quit();
  }
});
