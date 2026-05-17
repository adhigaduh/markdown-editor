# Electron Typora-style App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the existing React/Vite markdown editor as a Typora-style Windows desktop app using Electron, replacing the split textarea+preview with a WYSIWYG Milkdown editor and adding all Windows-native features.

**Architecture:** Electron main process handles all OS-level concerns (file I/O, dialogs, tray, menus, auto-updater) and communicates with the React renderer exclusively through a narrow contextBridge preload API. The renderer's Vite dev server runs on port 5173 in development; production loads from `dist/index.html`. The existing React app is restructured around a Typora-style layout: custom frameless title bar, collapsible sidebar (files + outline), full-width Milkdown WYSIWYG editor, and a status bar.

**Tech Stack:** Electron 33, electron-builder (NSIS installer), Milkdown v7 (@milkdown/core, @milkdown/react, @milkdown/preset-commonmark, @milkdown/plugin-gfm, @milkdown/plugin-history, @milkdown/plugin-listener, @milkdown/plugin-clipboard), Zustand 5, Vite 6, React 18, Vitest (unit tests)

---

## File Map

**New files:**
| File | Responsibility |
|---|---|
| `electron/main.js` | Window creation, IPC handlers, file I/O, app lifecycle |
| `electron/preload.js` | contextBridge API surface — only bridge between main and renderer |
| `electron/menu.js` | Native menu builder (File/Edit/View/Help) |
| `electron/tray.js` | System tray icon + context menu |
| `electron-builder.yml` | Build/installer config, NSIS, file associations |
| `src/components/TitleBar.jsx` | Custom frameless title bar with window controls |
| `src/components/Sidebar.jsx` | Collapsible files + outline panel |
| `src/components/Editor.jsx` | Milkdown WYSIWYG wrapper + source mode fallback |
| `src/components/StatusBar.jsx` | Word count, char count, line, encoding |
| `src/utils/wordCount.js` | Pure function: count words in a string |
| `src/utils/outline.js` | Pure function: extract headings from markdown |
| `src/test/wordCount.test.js` | Vitest unit tests for wordCount |
| `src/test/outline.test.js` | Vitest unit tests for outline |

**Modified files:**
| File | Change |
|---|---|
| `package.json` | Add electron, electron-builder, milkdown, concurrently, vitest; update scripts |
| `vite.config.js` | Add `base: './'`, vitest config block |
| `src/store/useMarkdownStore.js` | Complete rewrite: new state shape, electronAPI-aware actions |
| `src/styles.css` | Complete rewrite: Night/GitHub themes, Milkdown styles, focus mode, new layout |
| `src/MarkdownEditor.jsx` | New Typora layout: TitleBar + Sidebar + Editor + StatusBar |

---

## Task 1: Install Dependencies and Update Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Electron and build tooling**

```bash
npm install --save-dev electron@33 electron-builder concurrently wait-on cross-env
```

- [ ] **Step 2: Install Milkdown packages**

```bash
npm install @milkdown/core @milkdown/react @milkdown/preset-commonmark @milkdown/plugin-gfm @milkdown/plugin-history @milkdown/plugin-listener @milkdown/plugin-clipboard
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Update package.json scripts and add `main` entry**

Replace `package.json` with:

```json
{
  "name": "markdown-editor",
  "version": "1.0.0",
  "description": "Open-source Markdown Editor with Dropbox sync (Typora-like)",
  "main": "electron/main.js",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:electron": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\"",
    "build": "vite build",
    "dist": "npm run build && electron-builder",
    "dist:dir": "npm run build && electron-builder --dir",
    "preview": "vite preview",
    "test": "vitest run",
    "test:ui": "vitest --ui"
  },
  "keywords": ["markdown", "editor", "dropbox"],
  "author": "Open Source",
  "license": "MIT",
  "dependencies": {
    "@milkdown/core": "^7.5.0",
    "@milkdown/plugin-clipboard": "^7.5.0",
    "@milkdown/plugin-gfm": "^7.5.0",
    "@milkdown/plugin-history": "^7.5.0",
    "@milkdown/plugin-listener": "^7.5.0",
    "@milkdown/preset-commonmark": "^7.5.0",
    "@milkdown/react": "^7.5.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@vitejs/plugin-react": "^4.7.0",
    "@vitest/ui": "^3.1.4",
    "concurrently": "^9.1.2",
    "cross-env": "^7.0.3",
    "electron": "^33.4.1",
    "electron-builder": "^25.1.8",
    "electron-updater": "^6.3.9",
    "jsdom": "^26.1.0",
    "vite": "^6.0.0",
    "vitest": "^3.1.4",
    "wait-on": "^8.0.3"
  }
}
```

- [ ] **Step 5: Run install to resolve all packages**

```bash
npm install
```

Expected: no errors, `node_modules/electron/` and `node_modules/@milkdown/` present.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add electron, milkdown, and vitest dependencies"
```

---

## Task 2: Update Vite Config

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Rewrite vite.config.js**

The `base: './'` is critical — without it, Electron's `file://` protocol can't resolve absolute asset paths in the production build.

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          markdown: ['react-markdown', 'remark-gfm'],
          milkdown: [
            '@milkdown/core',
            '@milkdown/react',
            '@milkdown/preset-commonmark',
            '@milkdown/plugin-gfm',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
```

- [ ] **Step 2: Create test setup file**

Create `src/test/setup.js`:

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Verify vite still starts**

```bash
npm run dev
```

Expected: dev server starts on http://localhost:5173, no errors. Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add vite.config.js src/test/setup.js
git commit -m "feat: configure vite base path for electron and add vitest"
```

---

## Task 3: Utility Functions + Tests

**Files:**
- Create: `src/utils/wordCount.js`
- Create: `src/utils/outline.js`
- Create: `src/test/wordCount.test.js`
- Create: `src/test/outline.test.js`

- [ ] **Step 1: Write failing test for wordCount**

Create `src/test/wordCount.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { countWords } from '../utils/wordCount';

describe('countWords', () => {
  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \n  \t  ')).toBe(0);
  });

  it('counts single word', () => {
    expect(countWords('hello')).toBe(1);
  });

  it('counts multiple words', () => {
    expect(countWords('hello world foo')).toBe(3);
  });

  it('ignores extra whitespace between words', () => {
    expect(countWords('hello   world')).toBe(2);
  });

  it('counts words across newlines', () => {
    expect(countWords('hello\nworld\nfoo')).toBe(3);
  });

  it('counts markdown syntax as words', () => {
    expect(countWords('# Hello **world**')).toBe(3);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../utils/wordCount'`

- [ ] **Step 3: Create src/utils/wordCount.js**

```js
export function countWords(text) {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm test
```

Expected: all 7 wordCount tests pass.

- [ ] **Step 5: Write failing test for outline**

Create `src/test/outline.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { extractOutline } from '../utils/outline';

describe('extractOutline', () => {
  it('returns empty array for empty string', () => {
    expect(extractOutline('')).toEqual([]);
  });

  it('returns empty array when no headings', () => {
    expect(extractOutline('Hello world\nNo headings here')).toEqual([]);
  });

  it('extracts h1', () => {
    expect(extractOutline('# Title')).toEqual([{ level: 1, text: 'Title' }]);
  });

  it('extracts h2 and h3', () => {
    const result = extractOutline('## Section\n### Subsection');
    expect(result).toEqual([
      { level: 2, text: 'Section' },
      { level: 3, text: 'Subsection' },
    ]);
  });

  it('ignores h4 and deeper', () => {
    expect(extractOutline('#### Deep heading')).toEqual([]);
  });

  it('handles mixed content', () => {
    const md = `# Title\n\nSome text.\n\n## Section\n\nMore text.\n\n### Sub`;
    expect(extractOutline(md)).toEqual([
      { level: 1, text: 'Title' },
      { level: 2, text: 'Section' },
      { level: 3, text: 'Sub' },
    ]);
  });

  it('ignores # that is not at line start', () => {
    expect(extractOutline('Text with # symbol')).toEqual([]);
  });
});
```

- [ ] **Step 6: Run test — expect failure**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../utils/outline'`

- [ ] **Step 7: Create src/utils/outline.js**

```js
export function extractOutline(content) {
  return content
    .split('\n')
    .filter((line) => /^#{1,3}\s/.test(line))
    .map((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      return { level: match[1].length, text: match[2].trim() };
    });
}
```

- [ ] **Step 8: Run all tests — expect pass**

```bash
npm test
```

Expected: all 14 tests pass (7 wordCount + 7 outline).

- [ ] **Step 9: Commit**

```bash
git add src/utils/wordCount.js src/utils/outline.js src/test/wordCount.test.js src/test/outline.test.js src/test/setup.js
git commit -m "feat: add wordCount and extractOutline utils with tests"
```

---

## Task 4: Electron Preload Bridge

**Files:**
- Create: `electron/preload.js`

The preload runs in a special context with access to Node.js APIs. `contextBridge` exposes a safe, explicit API surface to the renderer — nothing else from Node is reachable.

- [ ] **Step 1: Create electron/ directory and preload.js**

```bash
mkdir electron
```

Create `electron/preload.js`:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () =>
    ipcRenderer.invoke('file:open'),

  openFileByPath: (filePath) =>
    ipcRenderer.invoke('file:open-by-path', filePath),

  saveFile: (filePath, content) =>
    ipcRenderer.invoke('file:save', { path: filePath, content }),

  saveFileAs: (content) =>
    ipcRenderer.invoke('file:save-as', { content }),

  getRecentFiles: () =>
    ipcRenderer.invoke('files:recent'),

  // Menu events from main process → renderer
  onMenuEvent: (callback) => {
    const listener = (_, eventName) => callback(eventName);
    ipcRenderer.on('menu:event', listener);
    return () => ipcRenderer.removeListener('menu:event', listener);
  },

  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  onMaximizeChange: (callback) => {
    const listener = (_, value) => callback(value);
    ipcRenderer.on('window:maximize-change', listener);
    return () => ipcRenderer.removeListener('window:maximize-change', listener);
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add electron/preload.js
git commit -m "feat: add electron preload contextBridge API"
```

---

## Task 5: Native Menu

**Files:**
- Create: `electron/menu.js`

The application menu is hidden from window chrome (frameless window) but registered so all keyboard shortcuts work globally.

- [ ] **Step 1: Create electron/menu.js**

```js
const { Menu } = require('electron');

function buildMenu(win, getRecentFiles) {
  const send = (event) => win.webContents.send('menu:event', event);

  const recentFilesSubmenu = () => {
    const recent = getRecentFiles();
    if (recent.length === 0) {
      return [{ label: 'No recent files', enabled: false }];
    }
    return recent.slice(0, 10).map((f) => ({
      label: f.name,
      click: () => send(`file:open-recent:${f.path}`),
    }));
  };

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => send('file:new'),
        },
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => send('file:open'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => send('file:save'),
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => send('file:save-as'),
        },
        { type: 'separator' },
        {
          label: 'Recent Files',
          get submenu() {
            return recentFilesSubmenu();
          },
        },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => send('view:toggle-sidebar'),
        },
        {
          label: 'Source Mode',
          accelerator: 'CmdOrCtrl+/',
          click: () => send('view:source-mode'),
        },
        { type: 'separator' },
        {
          label: 'Focus Mode',
          accelerator: 'F8',
          click: () => send('view:focus-mode'),
        },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            { label: 'Night', click: () => send('theme:night') },
            { label: 'GitHub', click: () => send('theme:github') },
          ],
        },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About', click: () => send('help:about') },
        {
          label: 'Check for Updates',
          click: () => {
            try {
              require('electron-updater').autoUpdater.checkForUpdatesAndNotify();
            } catch {
              // electron-updater not available in dev without signing
            }
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
```

- [ ] **Step 2: Commit**

```bash
git add electron/menu.js
git commit -m "feat: add native application menu with keyboard shortcuts"
```

---

## Task 6: System Tray

**Files:**
- Create: `electron/tray.js`

- [ ] **Step 1: Create electron/tray.js**

```js
const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');

// Minimal 1x1 blue PNG — placeholder until a real icon is provided in build/tray-icon.png
const PLACEHOLDER_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function getTrayIcon() {
  const iconPath = path.join(__dirname, '../build/tray-icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  }
  return nativeImage
    .createFromBuffer(Buffer.from(PLACEHOLDER_ICON_BASE64, 'base64'))
    .resize({ width: 16, height: 16 });
}

function createTray(win, getRecentFiles) {
  const tray = new Tray(getTrayIcon());
  tray.setToolTip('Markdown Editor');

  let hasShownNotice = false;

  function updateContextMenu() {
    const recent = getRecentFiles().slice(0, 5);
    const recentItems =
      recent.length > 0
        ? recent.map((f) => ({
            label: f.name,
            click: () => {
              win.show();
              win.focus();
              win.webContents.send('menu:event', `file:open-recent:${f.path}`);
            },
          }))
        : [{ label: 'No recent files', enabled: false }];

    const menu = Menu.buildFromTemplate([
      {
        label: 'Show Window',
        click: () => {
          win.show();
          win.focus();
        },
      },
      { type: 'separator' },
      { label: 'Recent Files', submenu: recentItems },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
  }

  updateContextMenu();

  tray.on('double-click', () => {
    win.show();
    win.focus();
  });

  return {
    tray,
    updateContextMenu,
    showMinimizeNotice: () => {
      if (!hasShownNotice) {
        tray.displayBalloon({
          title: 'Markdown Editor',
          content: 'App is minimized to tray. Double-click to restore.',
        });
        hasShownNotice = true;
      }
    },
  };
}

module.exports = { createTray };
```

- [ ] **Step 2: Create build/ directory (for future icon)**

```bash
mkdir -p build
```

Create `build/.gitkeep`:
```bash
touch build/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add electron/tray.js build/.gitkeep
git commit -m "feat: add system tray with context menu and minimize-to-tray support"
```

---

## Task 7: Electron Main Process

**Files:**
- Create: `electron/main.js`

This is the largest file — owns window lifecycle, all IPC, file I/O, recent files, settings, auto-updater, and wires menu + tray together.

- [ ] **Step 1: Create electron/main.js**

```js
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
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

  const menu = buildMenu(mainWindow, loadRecentFiles);
  require('electron').Menu.setApplicationMenu(menu);
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

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    registerIpcHandlers();
    setupAutoUpdater();
    trayObj = createTray(mainWindow, loadRecentFiles);

    // Load initial recent files into jump list
    updateJumpList(loadRecentFiles());
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/main.js
git commit -m "feat: add electron main process with IPC, file I/O, and app lifecycle"
```

---

## Task 8: electron-builder Config

**Files:**
- Create: `electron-builder.yml`

- [ ] **Step 1: Create electron-builder.yml**

```yaml
appId: com.adhigaduh.markdown-editor
productName: Markdown Editor
copyright: Copyright © 2026

directories:
  output: release

files:
  - dist/**/*
  - electron/**/*
  - package.json
  - node_modules/**/*

win:
  target:
    - target: nsis
      arch:
        - x64
  artifactName: MarkdownEditor-Setup-${version}.exe

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Markdown Editor
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico

fileAssociations:
  - ext: md
    name: Markdown File
    description: Open with Markdown Editor
    role: Editor
  - ext: markdown
    name: Markdown File
    description: Open with Markdown Editor
    role: Editor

publish:
  provider: github
  owner: adhigaduh
  repo: markdown-editor
```

- [ ] **Step 2: Add `release/` to .gitignore**

Append to `.gitignore`:

```
release/
```

- [ ] **Step 3: Commit**

```bash
git add electron-builder.yml .gitignore
git commit -m "feat: add electron-builder config with NSIS installer and .md file association"
```

---

## Task 9: TitleBar Component

**Files:**
- Create: `src/components/TitleBar.jsx`

- [ ] **Step 1: Create src/components/TitleBar.jsx**

```jsx
import { useState, useEffect } from 'react';
import { useMarkdownStore } from '../store/useMarkdownStore';

const isElectron = typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

export default function TitleBar() {
  const currentFile = useMarkdownStore((s) => s.currentFile);
  const isDirty = useMarkdownStore((s) => s.isDirty);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.isMaximized().then(setIsMaximized);
    const unsub = window.electronAPI.onMaximizeChange(setIsMaximized);
    return unsub;
  }, []);

  const filename = currentFile?.name ?? 'Markdown Editor';
  const title = isDirty ? `· ${filename}` : filename;

  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        <div className="title-bar-icon">M</div>
        <span className="title-bar-title">{title}</span>
      </div>
      {isElectron && (
        <div className="title-bar-controls">
          <button
            className="title-bar-btn"
            onClick={() => window.electronAPI.windowMinimize()}
            title="Minimize"
          >
            ─
          </button>
          <button
            className="title-bar-btn"
            onClick={() => window.electronAPI.windowMaximize()}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? '❐' : '□'}
          </button>
          <button
            className="title-bar-btn title-bar-btn-close"
            onClick={() => window.electronAPI.windowClose()}
            title="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TitleBar.jsx
git commit -m "feat: add custom frameless title bar with window controls"
```

---

## Task 10: StatusBar Component

**Files:**
- Create: `src/components/StatusBar.jsx`

- [ ] **Step 1: Create src/components/StatusBar.jsx**

```jsx
import { useMemo } from 'react';
import { useMarkdownStore } from '../store/useMarkdownStore';
import { countWords } from '../utils/wordCount';

export default function StatusBar() {
  const content = useMarkdownStore((s) => s.content);

  const stats = useMemo(
    () => ({ words: countWords(content), chars: content.length }),
    [content]
  );

  return (
    <div className="status-bar">
      <span className="status-item">
        {stats.words} words · {stats.chars} chars
      </span>
      <span className="status-item">UTF-8</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/StatusBar.jsx
git commit -m "feat: add status bar with live word and char count"
```

---

## Task 11: Milkdown WYSIWYG Editor Component

**Files:**
- Create: `src/components/Editor.jsx`

- [ ] **Step 1: Create src/components/Editor.jsx**

The `key` prop in the parent (added in Task 15) ensures this component remounts for each new file, giving Milkdown a fresh `defaultValue`.

```jsx
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/plugin-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { clipboard } from '@milkdown/plugin-clipboard';
import { useMarkdownStore } from '../store/useMarkdownStore';

function MilkdownEditor({ defaultValue, onChange }) {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValue);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          onChange(markdown);
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(clipboard)
  );

  return <Milkdown />;
}

export default function EditorComponent({ initialContent = '' }) {
  const { content, updateContent, isSourceMode } = useMarkdownStore();

  if (isSourceMode) {
    return (
      <div className="editor-wysiwyg">
        <div className="editor-content-wrapper">
          <textarea
            className="source-editor"
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="editor-wysiwyg">
      <div className="editor-content-wrapper">
        <MilkdownProvider>
          <MilkdownEditor defaultValue={initialContent} onChange={updateContent} />
        </MilkdownProvider>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Editor.jsx
git commit -m "feat: add Milkdown WYSIWYG editor with GFM support and source mode fallback"
```

---

## Task 12: Sidebar Component

**Files:**
- Create: `src/components/Sidebar.jsx`

- [ ] **Step 1: Create src/components/Sidebar.jsx**

```jsx
import { useMemo } from 'react';
import { useMarkdownStore } from '../store/useMarkdownStore';
import { extractOutline } from '../utils/outline';

export default function Sidebar() {
  const files = useMarkdownStore((s) => s.files);
  const currentFile = useMarkdownStore((s) => s.currentFile);
  const content = useMarkdownStore((s) => s.content);
  const isSidebarOpen = useMarkdownStore((s) => s.isSidebarOpen);
  const activeSidebarPanel = useMarkdownStore((s) => s.activeSidebarPanel);
  const openFile = useMarkdownStore((s) => s.openFile);
  const setSidebarPanel = useMarkdownStore((s) => s.setSidebarPanel);

  const outline = useMemo(() => extractOutline(content), [content]);

  if (!isSidebarOpen) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab${activeSidebarPanel === 'files' ? ' active' : ''}`}
          onClick={() => setSidebarPanel('files')}
        >
          Files
        </button>
        <button
          className={`sidebar-tab${activeSidebarPanel === 'outline' ? ' active' : ''}`}
          onClick={() => setSidebarPanel('outline')}
        >
          Outline
        </button>
      </div>

      <div className="sidebar-panel">
        {activeSidebarPanel === 'files' ? (
          files.length === 0 ? (
            <p className="sidebar-empty">No files open yet</p>
          ) : (
            files.map((file) => (
              <div
                key={file.path}
                className={`sidebar-file-item${currentFile?.path === file.path ? ' active' : ''}`}
                onClick={() => openFile(file)}
              >
                <span className="sidebar-file-icon">📄</span>
                <span className="sidebar-file-name">{file.name}</span>
              </div>
            ))
          )
        ) : outline.length === 0 ? (
          <p className="sidebar-empty">No headings</p>
        ) : (
          outline.map((heading, i) => (
            <div
              key={i}
              className="sidebar-outline-item"
              style={{ paddingLeft: `${(heading.level - 1) * 14 + 8}px` }}
            >
              {heading.text}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.jsx
git commit -m "feat: add sidebar with files and live outline panels"
```

---

## Task 13: Update Zustand Store

**Files:**
- Modify: `src/store/useMarkdownStore.js`

- [ ] **Step 1: Rewrite src/store/useMarkdownStore.js**

```js
import { create } from 'zustand';

const isElectron =
  typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

export const useMarkdownStore = create((set, get) => ({
  // File state
  currentFile: null,
  content: '',
  files: [],
  isDirty: false,

  // UI state
  theme: 'night',
  isSidebarOpen: true,
  activeSidebarPanel: 'files',
  isFocusMode: false,
  isSourceMode: false,

  openFile: (file) => {
    set({ currentFile: file, content: file.content || '', isDirty: false });
  },

  addFile: (file) => {
    set((state) => ({
      files: state.files.some((f) => f.path === file.path)
        ? state.files
        : [...state.files, file],
    }));
  },

  updateContent: (content) => {
    set({ content, isDirty: true });
  },

  saveFile: async () => {
    const { currentFile, content } = get();
    if (!currentFile) return;
    if (isElectron) {
      await window.electronAPI.saveFile(currentFile.path, content);
      set({ isDirty: false });
    } else {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.name;
      a.click();
      URL.revokeObjectURL(url);
      set({ isDirty: false });
    }
  },

  saveFileAs: async () => {
    const { content, addFile, openFile } = get();
    if (isElectron) {
      const result = await window.electronAPI.saveFileAs(content);
      if (result) {
        const fileWithContent = { ...result, content };
        addFile(fileWithContent);
        set({ currentFile: result, isDirty: false });
      }
    } else {
      get().saveFile();
    }
  },

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
  toggleSourceMode: () => set((s) => ({ isSourceMode: !s.isSourceMode })),
  setTheme: (theme) => set({ theme }),
  setSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),

  // Legacy compat — used by Toolbar.jsx
  toggleDarkMode: () =>
    set((s) => ({ theme: s.theme === 'night' ? 'github' : 'night' })),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/store/useMarkdownStore.js
git commit -m "feat: update store with Typora UI state and electron-aware file actions"
```

---

## Task 14: Styles — Typora Themes + Layout

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Rewrite src/styles.css**

```css
/* ── Themes ──────────────────────────────────────────────────────────────── */
html.theme-night {
  --bg-app:      #1e1e1e;
  --bg-sidebar:  #191919;
  --bg-tabs:     #161616;
  --bg-status:   #1a1a1a;
  --bg-editor:   #1e1e1e;
  --bg-code:     #2a2a2a;
  --text-primary: #e0e0e0;
  --text-secondary: #888;
  --text-faint:   #555;
  --border:       #2d2d2d;
  --accent:       #1976d2;
  --editor-font:  Georgia, 'Charter', 'Times New Roman', serif;
  --editor-size:  16px;
  --title-bg:     #1a1a1a;
  --title-text:   #aaa;
}

html.theme-github {
  --bg-app:      #ffffff;
  --bg-sidebar:  #f6f8fa;
  --bg-tabs:     #eaeef2;
  --bg-status:   #f6f8fa;
  --bg-editor:   #ffffff;
  --bg-code:     #f6f8fa;
  --text-primary: #24292e;
  --text-secondary: #57606a;
  --text-faint:   #aaa;
  --border:       #d0d7de;
  --accent:       #0969da;
  --editor-font:  system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --editor-size:  16px;
  --title-bg:     #f6f8fa;
  --title-text:   #555;
}

/* ── Reset ───────────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: var(--editor-font);
  font-size: var(--editor-size);
  line-height: 1.6;
  overflow: hidden;
  user-select: none;
}

/* ── App Shell ───────────────────────────────────────────────────────────── */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-app);
  color: var(--text-primary);
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Title Bar ───────────────────────────────────────────────────────────── */
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  background: var(--title-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.title-bar-drag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  flex: 1;
  -webkit-app-region: drag;
  min-width: 0;
}

.title-bar-icon {
  width: 16px;
  height: 16px;
  background: var(--accent);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  font-family: system-ui;
  flex-shrink: 0;
}

.title-bar-title {
  font-size: 12px;
  color: var(--title-text);
  font-family: system-ui;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.title-bar-btn {
  width: 46px;
  height: 32px;
  background: transparent;
  border: none;
  color: var(--title-text);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
  font-family: system-ui;
}

.title-bar-btn:hover { background: rgba(128, 128, 128, 0.2); }
.title-bar-btn-close:hover { background: #e81123; color: #fff; }

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.sidebar {
  width: 220px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-tabs {
  display: flex;
  background: var(--bg-tabs);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sidebar-tab {
  flex: 1;
  padding: 7px 0;
  font-size: 12px;
  font-family: system-ui;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.sidebar-tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.sidebar-tab:hover:not(.active) { color: var(--text-primary); }

.sidebar-panel {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.sidebar-file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: system-ui;
  color: var(--text-secondary);
  user-select: none;
}

.sidebar-file-item:hover { background: var(--border); color: var(--text-primary); }
.sidebar-file-item.active { background: var(--accent); color: #fff; }

.sidebar-file-icon { font-size: 13px; flex-shrink: 0; }
.sidebar-file-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.sidebar-outline-item {
  padding: 4px 8px;
  font-size: 12px;
  font-family: system-ui;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-outline-item:hover { background: var(--border); color: var(--text-primary); }
.sidebar-empty { font-size: 12px; color: var(--text-faint); font-family: system-ui; padding: 12px 8px; }

/* ── Editor Main ─────────────────────────────────────────────────────────── */
.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-editor);
}

.editor-wysiwyg {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.editor-content-wrapper {
  max-width: 740px;
  width: 100%;
  margin: 0 auto;
  padding: 40px 60px 80px;
  flex: 1;
}

/* ── Milkdown / ProseMirror overrides ────────────────────────────────────── */
.milkdown {
  outline: none;
  user-select: text;
}

.milkdown .editor {
  outline: none;
  user-select: text;
}

.ProseMirror {
  outline: none;
  user-select: text;
  color: var(--text-primary);
  font-family: var(--editor-font);
  font-size: var(--editor-size);
  line-height: 1.7;
}

.ProseMirror h1 {
  font-size: 1.9em;
  font-weight: 700;
  margin: 0 0 16px;
  line-height: 1.25;
}

.ProseMirror h2 {
  font-size: 1.45em;
  font-weight: 600;
  margin: 28px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.ProseMirror h3 {
  font-size: 1.15em;
  font-weight: 600;
  margin: 20px 0 8px;
}

.ProseMirror p { margin: 0 0 12px; }

.ProseMirror strong { font-weight: 700; }
.ProseMirror em { font-style: italic; }

.ProseMirror code {
  background: var(--bg-code);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 0.88em;
  color: var(--text-primary);
}

.ProseMirror pre {
  background: var(--bg-code);
  padding: 14px 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid var(--border);
}

.ProseMirror pre code { background: transparent; padding: 0; font-size: 0.88em; }

.ProseMirror blockquote {
  border-left: 3px solid var(--accent);
  margin: 12px 0;
  padding-left: 16px;
  color: var(--text-secondary);
}

.ProseMirror ul, .ProseMirror ol { padding-left: 24px; margin: 8px 0; }
.ProseMirror li { margin: 3px 0; }

.ProseMirror table { border-collapse: collapse; width: 100%; margin: 12px 0; }
.ProseMirror th, .ProseMirror td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}
.ProseMirror th { background: var(--bg-code); font-weight: 600; }

.ProseMirror hr { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

.ProseMirror a { color: var(--accent); text-decoration: none; }
.ProseMirror a:hover { text-decoration: underline; }

.ProseMirror img { max-width: 100%; border-radius: 6px; }

/* ── Source Editor ───────────────────────────────────────────────────────── */
.source-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  background: var(--bg-editor);
  color: var(--text-primary);
  border: none;
  padding: 40px 60px;
  font-size: 14px;
  font-family: 'Consolas', 'Courier New', monospace;
  line-height: 1.6;
  resize: none;
  outline: none;
  user-select: text;
}

/* ── Focus Mode ──────────────────────────────────────────────────────────── */
html.focus-mode .ProseMirror > *:not(:focus-within) {
  opacity: 0.2;
  transition: opacity 0.2s;
}

html.focus-mode .ProseMirror > *:focus-within {
  opacity: 1;
}

/* ── Status Bar ──────────────────────────────────────────────────────────── */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
  padding: 0 14px;
  background: var(--bg-status);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.status-item {
  font-size: 11px;
  font-family: system-ui;
  color: var(--text-faint);
  user-select: none;
}

/* ── Welcome Screen ──────────────────────────────────────────────────────── */
.welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-family: system-ui;
  gap: 8px;
}

.welcome-screen h2 { font-size: 20px; font-weight: 500; color: var(--text-primary); }
.welcome-screen p { font-size: 13px; }

/* ── Toolbar (legacy, used by Toolbar.jsx in browser mode) ───────────────── */
.toolbar {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  gap: 4px;
  flex-shrink: 0;
}

.toolbar-group {
  display: flex;
  gap: 4px;
  padding-left: 8px;
  border-left: 1px solid var(--border);
}

.toolbar-group:first-child { padding-left: 0; border-left: none; }

.toolbar-button {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  font-family: system-ui;
  transition: background 0.15s;
}

.toolbar-button:hover { background: var(--accent); border-color: var(--accent); color: #fff; }

/* ── File item (used by FileBrowser.jsx legacy) ──────────────────────────── */
.file-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 13px; color: var(--text-secondary); }
.file-item:hover { background: var(--bg-sidebar); color: var(--text-primary); }
.file-item.active { background: var(--accent); color: #fff; }
.empty-message { font-size: 12px; color: var(--text-faint); padding: 12px 8px; }
```

- [ ] **Step 2: Remove `src/style.css` (duplicate, now unused)**

```bash
rm src/style.css
```

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git rm src/style.css
git commit -m "feat: rewrite styles with Night/GitHub themes, Milkdown overrides, and focus mode"
```

---

## Task 15: Update MarkdownEditor Layout

**Files:**
- Modify: `src/MarkdownEditor.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1: Rewrite src/MarkdownEditor.jsx**

```jsx
import { useEffect } from 'react';
import './styles.css';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import EditorComponent from './components/Editor';
import StatusBar from './components/StatusBar';
import Toolbar from './components/Toolbar';
import { useMarkdownStore } from './store/useMarkdownStore';

const isElectron =
  typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

export default function MarkdownEditor() {
  const theme = useMarkdownStore((s) => s.theme);
  const isFocusMode = useMarkdownStore((s) => s.isFocusMode);
  const currentFile = useMarkdownStore((s) => s.currentFile);
  const content = useMarkdownStore((s) => s.content);
  const {
    openFile,
    addFile,
    saveFile,
    saveFileAs,
    toggleSidebar,
    toggleFocusMode,
    toggleSourceMode,
    setTheme,
  } = useMarkdownStore();

  // Apply theme and focus mode to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.className = `theme-${theme}${isFocusMode ? ' focus-mode' : ''}`;
  }, [theme, isFocusMode]);

  // Handle Ctrl+S / Ctrl+O shortcuts in browser mode
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleSourceMode();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [saveFile, toggleSourceMode]);

  // Handle Electron menu events
  useEffect(() => {
    if (!isElectron) return;
    const unsub = window.electronAPI.onMenuEvent(async (event) => {
      if (event === 'file:open') {
        const file = await window.electronAPI.openFile();
        if (file) { addFile(file); openFile(file); }
      } else if (event === 'file:save') {
        saveFile();
      } else if (event === 'file:save-as') {
        saveFileAs();
      } else if (event === 'view:toggle-sidebar') {
        toggleSidebar();
      } else if (event === 'view:focus-mode') {
        toggleFocusMode();
      } else if (event === 'view:source-mode') {
        toggleSourceMode();
      } else if (event === 'theme:night') {
        setTheme('night');
      } else if (event === 'theme:github') {
        setTheme('github');
      } else if (event.startsWith('file:open-recent:')) {
        const filePath = event.slice('file:open-recent:'.length);
        const file = await window.electronAPI.openFileByPath(filePath);
        if (file) { addFile(file); openFile(file); }
      }
    });
    return unsub;
  }, [addFile, openFile, saveFile, saveFileAs, toggleSidebar, toggleFocusMode, toggleSourceMode, setTheme]);

  return (
    <div className="app">
      <TitleBar />
      {!isElectron && <Toolbar />}
      <div className="app-body">
        <Sidebar />
        <main className="editor-main">
          {currentFile ? (
            <EditorComponent
              key={currentFile.path}
              initialContent={content}
            />
          ) : (
            <div className="welcome-screen">
              <h2>Markdown Editor</h2>
              <p>Open a .md file to start editing</p>
            </div>
          )}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
```

- [ ] **Step 2: Update src/main.jsx — remove index.css import (styles.css is now the single source)**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MarkdownEditor from './MarkdownEditor'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MarkdownEditor />
  </StrictMode>,
)
```

- [ ] **Step 3: Commit**

```bash
git add src/MarkdownEditor.jsx src/main.jsx
git commit -m "feat: compose Typora-style layout — TitleBar, Sidebar, Editor, StatusBar"
```

---

## Task 16: Dev Mode Smoke Test

- [ ] **Step 1: Verify tests still pass**

```bash
npm test
```

Expected: all 14 tests pass.

- [ ] **Step 2: Verify browser dev mode still works**

```bash
npm run dev
```

Open http://localhost:5173. Expected:
- Dark background, no errors in console
- Welcome screen ("Open a .md file to start editing")
- Sidebar visible on left
- Status bar at bottom
- Toolbar visible (since not in Electron)

Ctrl+C to stop.

- [ ] **Step 3: Launch in Electron dev mode**

```bash
npm run dev:electron
```

Expected:
- Vite starts on port 5173
- Electron window opens with frameless custom title bar
- Title shows "Markdown Editor"
- Sidebar on left (Files / Outline tabs)
- Welcome screen in editor area
- Status bar at bottom
- Toolbar NOT visible (Electron mode)
- Window min/max/close buttons work

- [ ] **Step 4: Open a file**

Click 📂 Open in the Toolbar (browser) or use File → Open… menu (Electron). Open any `.md` file.

Expected:
- File appears in Sidebar → Files panel
- WYSIWYG content renders (headings styled, bold/italic rendered)
- Title bar shows filename
- Status bar shows word count

- [ ] **Step 5: Edit content**

Click into the editor and type. Expected:
- Typing appears as formatted WYSIWYG
- Title bar shows `·` dirty indicator
- Word count updates in status bar

- [ ] **Step 6: Save file (Ctrl+S)**

Expected:
- In Electron: file saved to disk (no dialog), dirty indicator clears
- In browser: file downloads

- [ ] **Step 7: Toggle source mode (Ctrl+/)**

Expected: WYSIWYG editor replaced with raw markdown textarea. Toggle back: WYSIWYG re-renders.

- [ ] **Step 8: Toggle theme (View → Theme → GitHub)**

Expected: light theme applied immediately across all UI elements.

- [ ] **Step 9: Check system tray**

Expected: tray icon visible in taskbar notification area. Right-click shows "Show Window / Recent Files / Quit".

---

## Task 17: Build Windows Installer

- [ ] **Step 1: Run the production build**

```bash
npm run dist
```

Expected: completes without error. Check:
- `dist/` contains `index.html` and assets
- `release/` contains `MarkdownEditor-Setup-1.0.0.exe`

- [ ] **Step 2: Install and run the .exe**

Double-click `release/MarkdownEditor-Setup-1.0.0.exe`. Expected:
- NSIS installer wizard opens
- Installs to chosen directory
- Adds Start Menu shortcut
- Adds desktop shortcut

- [ ] **Step 3: Verify file association**

Create a test `.md` file on the desktop, double-click it. Expected: Markdown Editor opens with that file loaded.

- [ ] **Step 4: Verify app opens correctly from Start Menu**

Expected: app launches, frameless window appears, title bar visible.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Typora-style Electron app — all features implemented"
git push origin master
```

---

## Self-Review Notes

- All `window.electronAPI.*` calls match the preload bridge exactly
- `countWords` and `extractOutline` are exported from utility files and imported in their respective components
- `key={currentFile.path}` on `EditorComponent` in MarkdownEditor.jsx ensures Milkdown remounts on file switch
- `electron/main.js` uses CommonJS (`require`) — not ESM — because Electron's main process loads it directly, not through Vite
- `package.json` has `"main": "electron/main.js"` pointing Electron to the right entry
- `base: './'` in vite.config.js is required for Electron's `file://` protocol
- Theme is applied to `<html>` (not `<body>`) because Milkdown's ProseMirror inherits from the document root
- Focus mode CSS uses `:focus-within` — this works because ProseMirror adds focus to the active block element
