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
const fs = require('fs');

// ── Icon URLs for verified apps (from CDNs) ──
const APP_ICONS = {
  'minecraft.exe': 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/minecraft.svg',
  'robloxplayerbeta.exe': 'https://www.roblox.com/favicon.ico',
  'robloxplayer.exe': 'https://www.roblox.com/favicon.ico',
  'roblox.exe': 'https://www.roblox.com/favicon.ico',
  'fortnitelauncherclient.exe': 'https://cdn2.unrealengine.com/en-US-Fortnite-Site-5CF9C7C71D2C4D70B8F7A09A0A0A0A0A.ico',
  'fortniteclient-win64-shipping.exe': 'https://cdn2.unrealengine.com/en-US-Fortnite-Site-5CF9C7C71D2C4D70B8F7A09A0A0A0A0A.ico',
  'valorant.exe': 'https://valorant.com/favicon.ico',
  'valorant-win64-shipping.exe': 'https://valorant.com/favicon.ico',
  'leagueclient.exe': 'https://raw.githubusercontent.com/leagueoflegends/lol-wiki-static/main/img/favicon.ico',
  'league of legends.exe': 'https://raw.githubusercontent.com/leagueoflegends/lol-wiki-static/main/img/favicon.ico',
  'discord.exe': 'https://discord.com/favicon.ico',
  'spotify.exe': 'https://www.spotify.com/favicon.ico',
  'code.exe': 'https://code.visualstudio.com/favicon.ico',
  'obs64.exe': 'https://obsproject.com/favicon.ico',
  'blender.exe': 'https://www.blender.org/favicon.ico',
  'chrome.exe': 'https://www.google.com/favicon.ico',
  'firefox.exe': 'https://www.mozilla.org/favicon.ico',
  'msedge.exe': 'https://www.microsoft.com/favicon.ico',
};

let mainWindow = null;
let tray = null;
let gameDetectionInterval = null;
let activitySyncInterval = null;
let socket = null;
const APP_VERSION = '3.0.0';
const APP_ID = process.env.FORTIZED_APP_ID || 'fortized-desktop-' + Date.now();

// ── Known apps database (games & apps with verification) ─
// Maps executable names (lowercase) to display info
// 'verified' = true means it has an official badge (games/apps we recognize)
const KNOWN_APPS = {
  // ── VERIFIED GAMES ──
  'minecraft.exe': { name: 'Minecraft', verified: true, category: 'game' },
  'javaw.exe': { name: 'Minecraft (Java)', verified: true, category: 'game' },
  'robloxplayerbeta.exe': { name: 'Roblox', verified: true, category: 'game' },
  'robloxplayer.exe': { name: 'Roblox', verified: true, category: 'game' },
  'roblox.exe': { name: 'Roblox', verified: true, category: 'game' },
  'fortnitelauncherclient.exe': { name: 'Fortnite', verified: true, category: 'game' },
  'fortniteclient-win64-shipping.exe': { name: 'Fortnite', verified: true, category: 'game' },
  'valorant.exe': { name: 'Valorant', verified: true, category: 'game' },
  'valorant-win64-shipping.exe': { name: 'Valorant', verified: true, category: 'game' },
  'leagueclient.exe': { name: 'League of Legends', verified: true, category: 'game' },
  'league of legends.exe': { name: 'League of Legends', verified: true, category: 'game' },
  'rocketleague.exe': { name: 'Rocket League', verified: true, category: 'game' },
  'among us.exe': { name: 'Among Us', verified: true, category: 'game' },
  'r5apex.exe': { name: 'Apex Legends', verified: true, category: 'game' },
  'genshinimpact.exe': { name: 'Genshin Impact', verified: true, category: 'game' },
  'yuanshen.exe': { name: 'Genshin Impact', verified: true, category: 'game' },
  'overwatch.exe': { name: 'Overwatch 2', verified: true, category: 'game' },
  'csgo.exe': { name: 'Counter-Strike', verified: true, category: 'game' },
  'cs2.exe': { name: 'Counter-Strike 2', verified: true, category: 'game' },
  'dota2.exe': { name: 'Dota 2', verified: true, category: 'game' },
  'terraria.exe': { name: 'Terraria', verified: true, category: 'game' },
  'starfield.exe': { name: 'Starfield', verified: true, category: 'game' },
  'baldursgate3.exe': { name: "Baldur's Gate 3", verified: true, category: 'game' },
  'bg3.exe': { name: "Baldur's Gate 3", verified: true, category: 'game' },
  'eldenring.exe': { name: 'Elden Ring', verified: true, category: 'game' },
  'gtav.exe': { name: 'Grand Theft Auto V', verified: true, category: 'game' },
  'gta5.exe': { name: 'Grand Theft Auto V', verified: true, category: 'game' },
  'deadbydaylight-win64-shipping.exe': { name: 'Dead by Daylight', verified: true, category: 'game' },
  'phasmophobia.exe': { name: 'Phasmophobia', verified: true, category: 'game' },
  'lethalcompany.exe': { name: 'Lethal Company', verified: true, category: 'game' },
  'palworld-win64-shipping.exe': { name: 'Palworld', verified: true, category: 'game' },
  'helldivers2.exe': { name: 'Helldivers 2', verified: true, category: 'game' },
  'hogwartslegacy.exe': { name: 'Hogwarts Legacy', verified: true, category: 'game' },
  'destiny2.exe': { name: 'Destiny 2', verified: true, category: 'game' },
  'warframe.x64.exe': { name: 'Warframe', verified: true, category: 'game' },
  'tf2_win64.exe': { name: 'Team Fortress 2', verified: true, category: 'game' },
  'hl2.exe': { name: 'Half-Life 2', verified: true, category: 'game' },
  'stardewvalley.exe': { name: 'Stardew Valley', verified: true, category: 'game' },
  'hollow_knight.exe': { name: 'Hollow Knight', verified: true, category: 'game' },
  'celeste.exe': { name: 'Celeste', verified: true, category: 'game' },
  'hades.exe': { name: 'Hades', verified: true, category: 'game' },
  'subnautica.exe': { name: 'Subnautica', verified: true, category: 'game' },
  'cyberpunk2077.exe': { name: 'Cyberpunk 2077', verified: true, category: 'game' },
  'witcher3.exe': { name: 'The Witcher 3', verified: true, category: 'game' },
  'skyrim.exe': { name: 'Skyrim', verified: true, category: 'game' },
  'skyrimse.exe': { name: 'Skyrim Special Edition', verified: true, category: 'game' },
  'fallout4.exe': { name: 'Fallout 4', verified: true, category: 'game' },
  'sekiro.exe': { name: 'Sekiro', verified: true, category: 'game' },
  'persona5r.exe': { name: 'Persona 5 Royal', verified: true, category: 'game' },
  'nierautomata.exe': { name: 'NieR: Automata', verified: true, category: 'game' },
  'darksoulsiii.exe': { name: 'Dark Souls III', verified: true, category: 'game' },
  // ── VERIFIED APPS ──
  'spotify.exe': { name: 'Spotify', verified: true, category: 'app' },
  'discord.exe': { name: 'Discord', verified: true, category: 'app' },
  'code.exe': { name: 'Visual Studio Code', verified: true, category: 'app' },
  'obs64.exe': { name: 'OBS Studio', verified: true, category: 'app' },
  'blender.exe': { name: 'Blender', verified: true, category: 'app' },
  'unity.exe': { name: 'Unity', verified: true, category: 'app' },
  'unrealEditor.exe': { name: 'Unreal Engine', verified: true, category: 'app' },
  'godot.exe': { name: 'Godot Engine', verified: true, category: 'app' },
  'photoshop.exe': { name: 'Photoshop', verified: true, category: 'app' },
  'afterfx.exe': { name: 'After Effects', verified: true, category: 'app' },
  'premiere pro.exe': { name: 'Premiere Pro', verified: true, category: 'app' },
  'figma.exe': { name: 'Figma', verified: true, category: 'app' },
  'clip studio paint.exe': { name: 'Clip Studio Paint', verified: true, category: 'app' },
  'chrome.exe': { name: 'Google Chrome', verified: true, category: 'app' },
  'firefox.exe': { name: 'Firefox', verified: true, category: 'app' },
  'msedge.exe': { name: 'Microsoft Edge', verified: true, category: 'app' },
  // ── LAUNCHERS (hidden) ──
  'steam.exe': { name: 'Steam', verified: true, category: 'launcher', hidden: true },
  'epicgameslauncher.exe': { name: 'Epic Games', verified: true, category: 'launcher', hidden: true },
  'battle.net.exe': { name: 'Battle.net', verified: true, category: 'launcher', hidden: true },
  'origin.exe': { name: 'EA App', verified: true, category: 'launcher', hidden: true },
};

// macOS / Linux process names
const KNOWN_APPS_UNIX = {};
Object.entries(KNOWN_APPS).forEach(([key, val]) => {
  KNOWN_APPS_UNIX[key.replace('.exe', '')] = val;
});
Object.assign(KNOWN_APPS_UNIX, {
  'robloxplayer': { name: 'Roblox', verified: true, category: 'game' },
  'java': { name: 'Minecraft (Java)', verified: true, category: 'game' },
  'riot client': { name: 'Valorant', verified: true, category: 'game' },
  'leagueoflegends': { name: 'League of Legends', verified: true, category: 'game' },
  'genshinimpact': { name: 'Genshin Impact', verified: true, category: 'game' },
  'spotify': { name: 'Spotify', verified: true, category: 'app' },
  'discord': { name: 'Discord', verified: true, category: 'app' },
  'code helper': { name: 'Visual Studio Code', verified: true, category: 'app' },
  'obs': { name: 'OBS Studio', verified: true, category: 'app' },
  'figma': { name: 'Figma', verified: true, category: 'app' },
  'blender': { name: 'Blender', verified: true, category: 'app' },
  'godot': { name: 'Godot Engine', verified: true, category: 'app' },
  'steam_osx': { name: 'Steam', verified: true, category: 'launcher', hidden: true },
  'steamwebhelper': { name: 'Steam', verified: true, category: 'launcher', hidden: true },
});

// ── Get icon URL for verified apps ──
function getAppIconUrl(processName) {
  return APP_ICONS[processName] || null;
}

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
      if (err) {
        console.error('[Process] tasklist error:', err.message);
        resolve([]);
        return;
      }
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
      console.log(`[Process] Detected ${processes.size} processes`);
      resolve([...processes]);
    });
  });
}

// ── Detect ALL running apps (verified + unverified) ──
async function detectRunningApps() {
  console.log('[Detection] Starting app detection...');
  const processes = await getRunningProcesses();
  const detected = [];
  const seenNames = new Set();
  const platform = process.platform;
  const knownDB = platform === 'win32' ? KNOWN_APPS : KNOWN_APPS_UNIX;

  console.log(`[Detection] Found ${processes.length} total processes`);

  // Step 1: Add verified apps (known to us)
  for (const proc of processes) {
    const match = knownDB[proc];
    if (match && !match.hidden && !seenNames.has(match.name)) {
      seenNames.add(match.name);

      const appData = {
        name: match.name,
        processName: proc,
        verified: true,
        category: match.category || 'app',
        icon: getAppIconUrl(proc),
        detectedAt: new Date().toISOString(),
      };

      detected.push(appData);
      console.log(`[Detection] ✓ Found verified: ${match.name} (${proc})`);
    }
  }

  // Step 2: Add unknown apps (everything else, with limit)
  const ignoredProcesses = new Set([
    'explorer.exe', 'svchost.exe', 'csrss.exe', 'services.exe', 'lsass.exe',
    'dwm.exe', 'userinit.exe', 'spoolsv.exe', 'winlogon.exe', 'smss.exe',
    'system', 'systemd', 'kernel', 'launchd', 'loginwindow', 'wininit.exe',
    'rundll32.exe', 'conhost.exe', 'dllhost.exe', 'taskhost.exe', 'searchindexer.exe',
    'nvcontainer.exe', 'nvidia-smi.exe', 'msedgewebview2.exe'
  ]);

  for (const proc of processes) {
    const cleanName = proc.replace('.exe', '');
    if (!knownDB[proc] && !ignoredProcesses.has(proc) && !ignoredProcesses.has(cleanName) && !seenNames.has(proc)) {
      const displayName = proc
        .replace('.exe', '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[\s-_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      if (!seenNames.has(displayName) && detected.length < 100) {
        seenNames.add(displayName);

        const appData = {
          name: displayName,
          processName: proc,
          verified: false,
          category: 'unknown',
          icon: getAppIconUrl(proc),
          detectedAt: new Date().toISOString(),
        };

        detected.push(appData);
        console.log(`[Detection] Found unknown: ${displayName} (${proc})`);
      }
    }
  }

  console.log(`[Detection] Complete - ${detected.length} apps detected`);
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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const defaultUA = mainWindow.webContents.getUserAgent();
  const fortizedUA = defaultUA + ' FortizedApp';
  mainWindow.webContents.setUserAgent(fortizedUA);

  const appUrl = process.env.FORTIZED_URL || (process.env.NODE_ENV === 'development'
    ? `http://localhost:${process.env.PORT || 3000}/app`
    : 'https://fortized.com/app');
  mainWindow.loadURL(appUrl);

  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.on('close', (e) => {
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
  if (activitySyncInterval) clearInterval(activitySyncInterval);

  activitySyncInterval = setInterval(async () => {
    if (!mainWindow) return;

    const apps = await detectRunningApps();
    const audioStatus = await detectAudioStatus();
    const systemInfo = getSystemInfo();

    const activityData = {
      appVersion: APP_VERSION,
      appId: APP_ID,
      apps: apps,
      audio: audioStatus,
      system: systemInfo,
      timestamp: new Date().toISOString(),
    };

    mainWindow.webContents.send('desktop-app:activity', activityData);

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
  }, 10000);
}

// ── IPC Handlers ───────────────────────────────────
function setupIPC() {
  ipcMain.handle('detect-games', async () => {
    return await detectRunningApps();
  });

  ipcMain.handle('get-system-info', async () => {
    return getSystemInfo();
  });

  ipcMain.handle('get-audio-status', async () => {
    return await detectAudioStatus();
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

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

  ipcMain.on('fortized-notification', () => {
    // Badge/tray notification count here
  });

  ipcMain.handle('get-processes', async () => {
    return await getRunningProcesses();
  });

  ipcMain.on('game-detection:start', () => {
    if (gameDetectionInterval) clearInterval(gameDetectionInterval);
    startActivitySync();
    gameDetectionInterval = setInterval(async () => {
      const apps = await detectRunningApps();
      mainWindow?.webContents.send('game-detection:update', apps);
    }, 15000);
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
