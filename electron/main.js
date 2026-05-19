const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { buildMenu } = require('./menu');
const { createTray } = require('./tray');

const isDev =
  process.env.NODE_ENV === 'development' || !app.isPackaged;


const RECENT_FILES_PATH = path.join(
  app.getPath('userData'),
  'recent-files.json'
);
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

let mainWindow = null;
let trayObj = null;
let menu = null;
let startupFilePath = null;

function getFileFromArgs(argv) {
  // In packaged app argv[0] is the exe; in dev argv[0] is node, argv[1] is script.
  const args = argv.slice(isDev ? 2 : 1);
  return args.find((a) => /\.(md|markdown|txt)$/i.test(a) && !a.startsWith('-')) || null;
}

// ── Recent files ──────────────────────────────────────────────────────────

function loadRecentFiles() {
  try {
    if (fs.existsSync(RECENT_FILES_PATH)) {
      return JSON.parse(fs.readFileSync(RECENT_FILES_PATH, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveRecentFiles(files) {
  fs.writeFileSync(RECENT_FILES_PATH, JSON.stringify(files, null, 2));
}

function addRecentFile(file) {
  let recent = loadRecentFiles().filter((f) => f.path !== file.path);
  recent.unshift(file);
  recent = recent.slice(0, 20);
  saveRecentFiles(recent);
  updateJumpList(recent);
  if (trayObj) trayObj.updateContextMenu();
}

function updateJumpList(recent) {
  try {
    app.setJumpList([
      {
        type: 'custom',
        name: 'Recent Files',
        items: recent.slice(0, 10).map((f) => ({
          type: 'file',
          path: f.path,
        })),
      },
    ]);
  } catch {
    // Jump list not supported on all Windows configurations
  }
}

// ── Settings ──────────────────────────────────────────────────────────────

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    }
  } catch {}
  return { minimizeToTray: false };
}

// ── Window ────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    backgroundColor: '#1e1e1e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () =>
    mainWindow.webContents.send('window:maximize-change', true)
  );
  mainWindow.on('unmaximize', () =>
    mainWindow.webContents.send('window:maximize-change', false)
  );

  mainWindow.on('close', (event) => {
    if (app.isQuitting) return;
    const settings = loadSettings();
    if (settings.minimizeToTray && trayObj) {
      event.preventDefault();
      mainWindow.hide();
      trayObj.showMinimizeNotice();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  menu = buildMenu(mainWindow, loadRecentFiles);
  Menu.setApplicationMenu(menu);
}

// ── IPC handlers ──────────────────────────────────────────────────────────

function registerIpcHandlers() {
  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown'] },
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = path.basename(filePath);
    addRecentFile({ path: filePath, name });
    return { path: filePath, name, content };
  });

  ipcMain.handle('file:open-by-path', async (_, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const name = path.basename(filePath);
      addRecentFile({ path: filePath, name });
      return { path: filePath, name, content };
    } catch {
      return null;
    }
  });

  ipcMain.handle('file:save', async (_, { path: filePath, content }) => {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('file:save-as', async (_, { content }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'Markdown Files', extensions: ['md'] }],
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, content, 'utf-8');
    const name = path.basename(result.filePath);
    addRecentFile({ path: result.filePath, name });
    return { path: result.filePath, name };
  });

  ipcMain.handle('files:recent', () => loadRecentFiles());

  ipcMain.handle('file:get-startup-file', () => {
    const f = startupFilePath;
    startupFilePath = null; // consume once
    return f;
  });

  ipcMain.on('menu:popup', () => menu.popup({ window: mainWindow }));

  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow.close());
  ipcMain.handle('window:is-maximized', () => mainWindow.isMaximized());
}

// ── Auto-updater ──────────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
    autoUpdater.on('update-available', () =>
      mainWindow.webContents.send('menu:event', 'update:available')
    );
    autoUpdater.on('update-downloaded', () =>
      mainWindow.webContents.send('menu:event', 'update:ready')
    );
  } catch {
    // electron-updater optional in dev
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────

// macOS: fired when the OS asks the app to open a file (double-click, "Open With", etc.)
// Must be registered before app.whenReady() to catch files opened at launch.
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('file:open-argv', filePath);
  } else {
    // Window was closed (app still running) or app just launched — open a new window
    startupFilePath = filePath;
    if (app.isReady()) createWindow();
  }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      const filePath = getFileFromArgs(commandLine);
      if (filePath) mainWindow.webContents.send('file:open-argv', filePath);
    }
  });

  app.whenReady().then(() => {
    // open-file may have already set startupFilePath before ready; don't overwrite it
    if (!startupFilePath) startupFilePath = getFileFromArgs(process.argv);
    createWindow();
    registerIpcHandlers();
    setupAutoUpdater();
    trayObj = createTray(mainWindow, loadRecentFiles);
    updateJumpList(loadRecentFiles());
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  // macOS: re-open window when clicking dock icon with no windows open
  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });
}
