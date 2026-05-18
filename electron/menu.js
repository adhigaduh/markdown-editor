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
        {
          label: 'Close File',
          accelerator: 'CmdOrCtrl+W',
          click: () => send('file:close'),
        },
        { type: 'separator' },
        {
          label: 'Recent Files',
          submenu: recentFilesSubmenu(),
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
