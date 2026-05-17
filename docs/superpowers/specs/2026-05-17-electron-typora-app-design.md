# Markdown Editor — Typora-style Electron App

**Date:** 2026-05-17
**Status:** Approved
**Scope:** Windows desktop application wrapping the existing React/Vite markdown editor using Electron, redesigned to match Typora's WYSIWYG editing experience.
**Follow-on:** Revise the web version (`src/`) to use the same Typora-style layout after this ships.

---

## Overview

Package the existing markdown editor as a native Windows `.exe` using Electron. Replace the split textarea+preview UI with a Typora-style WYSIWYG editor (Milkdown/ProseMirror) — a single centered document column where markdown renders as you type and clicking any element reveals its raw syntax inline.

---

## Architecture

### Process model

**Main process** (`electron/main.js`)
Node.js process. Owns all OS-level concerns:
- Browser window creation and lifecycle
- Native file dialogs (`dialog.showOpenDialog`, `dialog.showSaveDialog`)
- File system operations (`fs.readFile`, `fs.writeFile`)
- Native menu bar construction
- System tray
- Auto-updater (`electron-updater`)
- Jump list (`app.setJumpList`)
- All IPC handlers (`ipcMain.handle`)
- Settings persistence to `app.getPath('userData')/settings.json`
- Recent files persistence to `app.getPath('userData')/recent-files.json`

Never touches the DOM or imports renderer code.

**Renderer process** (`src/`)
The existing React/Vite app, revised. Runs inside Electron's Chromium. Communicates with main exclusively through the preload bridge. Must not import `electron` directly.

**Preload bridge** (`electron/preload.js`)
Exposes a narrow `window.electronAPI` surface via `contextBridge.exposeInMainWorld`. Only these methods are available to the renderer:

```js
window.electronAPI = {
  openFile: ()                    → Promise<{ path, name, content } | null>
  saveFile: (path, content)       → Promise<void>
  saveFileAs: (content)           → Promise<{ path, name } | null>
  getRecentFiles: ()              → Promise<Array<{ path, name }>>
  onMenuEvent: (callback)         → unsubscribe fn   // 'file:new', 'file:open', 'file:save', etc.
  windowMinimize: ()              → void
  windowMaximize: ()              → void
  windowClose: ()                 → void
  isMaximized: ()                 → Promise<boolean>
  onMaximizeChange: (callback)    → unsubscribe fn
}
```

**Web compatibility**
Every `window.electronAPI.*` call is guarded:
```js
const isElectron = typeof window.electronAPI !== 'undefined';
```
`npm run dev` continues to work in a regular browser, falling back to the current `<input type="file">` / Blob-download behaviour.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  [M] readme.md                            ─   □   ✕     │  TitleBar (frameless)
├────────────┬────────────────────────────────────────────┤
│  FILES     │                                            │
│            │        # Hello World                       │
│  readme.md │                                            │
│  notes.md  │        This is editing **in place**.       │  Editor (Milkdown WYSIWYG)
│  ideas.md  │        Click any text to edit it.          │  max-width: 740px, centered
│            │                                            │
│ ─────────  │        ## Section Two                      │
│  OUTLINE   │                                            │
│            │        - [ ] Task one                      │
│  # Hello   │        - [x] Task two                      │
│   ## Sect  │                                            │
├────────────┴────────────────────────────────────────────┤
│  247 words · 1,432 chars                 Ln 12  UTF-8   │  StatusBar
└─────────────────────────────────────────────────────────┘
```

### TitleBar (`src/components/TitleBar.jsx`)
- Frameless window: `new BrowserWindow({ frame: false })`
- Shows: app icon (16×16 SVG) + current filename (or "Markdown Editor" if no file open)
- Unsaved indicator: dot before filename when `isDirty` is true
- Window controls: Minimize, Maximize/Restore, Close — each calls `window.electronAPI.window*`
- Maximize button icon toggles based on `onMaximizeChange` event
- Drag region: full title bar has `-webkit-app-region: drag`; buttons have `-webkit-app-region: no-drag`
- Height: 32px

### Sidebar (`src/components/Sidebar.jsx`)
- Width: 220px default, user-resizable (drag handle, min 160px, max 400px), persisted to settings
- Two panels toggled by icon buttons at top: **Files** and **Outline**
- Collapsible: clicking the active icon collapses the sidebar entirely
- **Files panel**: lists all files opened in the current session. Clicking opens the file. Active file highlighted. Shows file icon + name.
- **Outline panel**: headings extracted live from the Milkdown editor state (h1–h3). Clicking a heading scrolls the editor to that node. Indented by level.
- Toggle shortcut: Ctrl+Shift+L (matches Typora)

### Editor (`src/components/Editor.jsx`)
- Milkdown WYSIWYG, full details in the Editor section below
- Content column: max-width 740px, centered horizontally, `padding: 40px 60px`
- Scrollable independently of sidebar
- No split pane

### StatusBar (`src/components/StatusBar.jsx`)
- Height: 22px, pinned to bottom
- Left: word count, character count (updates on every keystroke, debounced 200ms)
- Right: current line number, file encoding (UTF-8), line endings (LF/CRLF)
- Encoding and EOL detected on file open, shown as clickable labels (click to change)

---

## WYSIWYG Editor (Milkdown)

### Libraries
```
@milkdown/core
@milkdown/react
@milkdown/preset-commonmark
@milkdown/plugin-gfm
@milkdown/plugin-history
@milkdown/plugin-clipboard
```

### Behaviour
- Document stored as ProseMirror AST internally; serialised to markdown string on save and on every content change (stored in Zustand)
- Clicking any rendered element puts cursor into that node; raw markdown syntax appears inline for that node only
- All other nodes remain rendered
- Escape or clicking elsewhere re-renders the active node
- Renders: headings, bold, italic, strikethrough, inline code, code blocks (with language label), blockquotes, ordered/unordered lists, task lists (checkboxes), tables, horizontal rules, images, links, autolinks

### Slash menu
Triggered by `/` at start of a blank line. Options:
`/heading 1–3`, `/bullet list`, `/ordered list`, `/task list`, `/code block`, `/quote`, `/table`, `/divider`

### Selection toolbar
Floating toolbar appears 8px above any text selection. Buttons: Bold (Ctrl+B), Italic (Ctrl+I), Inline Code (Ctrl+`), Link (Ctrl+K), Strikethrough.

### Keyboard shortcuts
All standard Milkdown shortcuts plus:
- `Ctrl+S` → save (via IPC)
- `Ctrl+Shift+S` → save as (via IPC)
- `Ctrl+O` → open file (via IPC)
- `Ctrl+Z` / `Ctrl+Y` → undo/redo (Milkdown history plugin)

### Source mode
`Ctrl+/` or View → Source Mode toggles between WYSIWYG and a plain `<textarea>` showing raw markdown. The two are kept in sync via the store's `content` string. Source mode uses a monospace font with no syntax highlighting in v1.

---

## Windows-Native Features

### Native file dialogs
`dialog.showOpenDialog` in main process, invoked via `ipcMain.handle('file:open')`. Returns file path + content. `dialog.showSaveDialog` for Save As. Direct `fs.writeFile` for Save (no dialog, uses current path). Replaces the existing `<input type="file">` and Blob-download workarounds entirely when running in Electron.

### Native menu bar
Defined in `electron/menu.js`, set via `Menu.setApplicationMenu()`. Menu is hidden from the window chrome (since title bar is custom) but active for keyboard shortcuts. Structure:

- **File**: New File (Ctrl+N), Open… (Ctrl+O), ─, Save (Ctrl+S), Save As… (Ctrl+Shift+S), ─, Recent Files ▶ (submenu, last 10), ─, Exit (Alt+F4)
- **Edit**: Undo (Ctrl+Z), Redo (Ctrl+Y), ─, Cut, Copy, Paste, Select All
- **View**: Toggle Sidebar (Ctrl+Shift+L), Source Mode (Ctrl+/), ─, Focus Mode (F8), ─, Theme ▶ (Night / GitHub), ─, Zoom In (Ctrl+=), Zoom Out (Ctrl+-), Reset Zoom (Ctrl+0)
- **Help**: About, Check for Updates

Menu actions that affect the renderer are sent via `win.webContents.send('menu:event', eventName)`, received in preload's `onMenuEvent` and forwarded to the store.

### System tray (`electron/tray.js`)
- Icon: 16×16 template icon (visible in both light and dark taskbar)
- Behaviour on window close: if "Minimize to tray" is enabled in settings, hide window instead of quitting; show balloon tip on first minimise
- Right-click context menu: Show Window, ─, Recent Files ▶, ─, Quit
- Double-click: show and focus window
- "Minimize to tray" toggle: View menu + Settings panel

### Auto-updater
`electron-updater` package. Update feed points to the GitHub Releases page of the repo (`adhigaduh/markdown-editor`). Behaviour:
- Checks for update silently on app startup (after 3s delay)
- If update found: shows a non-intrusive toast notification ("Update available — installs on next restart"). User can dismiss.
- If dismissed: re-checks on next launch
- Download happens in background after notification shown
- Installs on quit (`autoUpdater.quitAndInstall()` bound to a "Restart now" button in the toast)

### Recent files / Jump List
- Stored in `app.getPath('userData')/recent-files.json` (max 20 entries, newest first)
- Updated on every file open or save-as
- Exposed to renderer via `ipcMain.handle('files:recent')`
- Surfaced in: File menu (last 10), tray context menu (last 5), Sidebar files panel (last 10)
- Jump list updated via `app.setJumpList()` on every change (last 10, grouped as "Recent")
- Files that no longer exist are silently removed on next load

### Windows installer (`electron-builder.yml`)
```yaml
appId: com.adhigaduh.markdown-editor
productName: Markdown Editor
win:
  target: nsis
  icon: build/icon.ico
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Markdown Editor
fileAssociations:
  - ext: md
    name: Markdown File
    description: Open with Markdown Editor
  - ext: markdown
    name: Markdown File
    description: Open with Markdown Editor
publish:
  provider: github
  owner: adhigaduh
  repo: markdown-editor
```

---

## Themes

Implemented as a CSS class on `<html>`: `theme-night` (default) or `theme-github`. Persisted to `settings.json`. Applied on startup before first paint to prevent flash.

### Night (dark)
- Background: `#1e1e1e`, secondary: `#191919`, sidebar: `#161616`
- Text: `#e0e0e0`, secondary text: `#888`
- Editor font: Georgia, 'Charter', serif, 16px
- Accent: `#1976d2`
- Code background: `#2a2a2a`

### GitHub (light)
- Background: `#ffffff`, secondary: `#f6f8fa`, sidebar: `#f0f0f0`
- Text: `#24292e`, secondary text: `#57606a`
- Editor font: system-ui, -apple-system, sans-serif, 16px
- Accent: `#0969da`
- Code background: `#f6f8fa`

### Focus mode
Toggled via F8 or View → Focus Mode. Adds `.focus-mode` to `<html>`. All editor paragraphs/nodes except the one containing the cursor are set to `opacity: 0.2`. The active node animates to full opacity. Cursor movement updates the active node.

---

## State Management

`useMarkdownStore.js` updated:

```js
{
  // File state
  currentFile: null,  // { path, name, content }
  content: '',
  files: [],          // recently opened (persisted via IPC)
  isDirty: false,

  // UI state
  theme: 'night',         // 'night' | 'github'
  isSidebarOpen: true,
  sidebarWidth: 220,
  activeSidebarPanel: 'files',  // 'files' | 'outline'
  isFocusMode: false,
  isSourceMode: false,
  fontSize: 16,

  // Tray
  minimizeToTray: false,
}
```

Actions:
- `openFile(path?)` — calls `window.electronAPI.openFile()` in Electron, `<input type="file">` in browser
- `saveFile()` — calls `window.electronAPI.saveFile(path, content)` if path known, else `saveFileAs`
- `saveFileAs()` — calls `window.electronAPI.saveFileAs(content)`
- `setContent(content)` — updates content + `isDirty: true`
- `toggleTheme()`, `toggleFocusMode()`, `toggleSourceMode()`, `toggleSidebar()`

---

## New Files Summary

| File | Purpose |
|---|---|
| `electron/main.js` | Main process: window, IPC, app lifecycle |
| `electron/preload.js` | contextBridge API surface |
| `electron/menu.js` | Native menu builder |
| `electron/tray.js` | System tray |
| `electron-builder.yml` | Build & installer config |
| `build/icon.ico` | App icon (Windows) |
| `src/components/TitleBar.jsx` | Custom frameless title bar |
| `src/components/Sidebar.jsx` | Files + Outline panels |
| `src/components/Editor.jsx` | Milkdown WYSIWYG wrapper |
| `src/components/StatusBar.jsx` | Word count, line, encoding |

### Modified Files

| File | Change |
|---|---|
| `src/MarkdownEditor.jsx` | New layout: TitleBar + (Sidebar + Editor) + StatusBar |
| `src/store/useMarkdownStore.js` | New state shape, electronAPI-aware actions |
| `src/components/Toolbar.jsx` | Repurposed as floating selection toolbar |
| `src/styles.css` | Theme variables, Milkdown overrides, focus mode |
| `package.json` | Add electron, electron-builder, milkdown packages |

---

## Out of Scope (v1)

- Math / KaTeX rendering
- Mermaid diagrams
- Custom themes beyond Night and GitHub
- Cross-platform builds (macOS, Linux)
- Cloud sync (Dropbox) — exists in code but not activated
- Collaborative editing
- Vim/Emacs keybindings
- PDF export
