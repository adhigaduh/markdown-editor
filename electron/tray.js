const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');

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
