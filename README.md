# MD Editor - Open Source Markdown Editor

A Typora-like Markdown editor with cloud sync (Dropbox integration). Built with React and Zustand.

![Markdown Editor Screenshot](./screenshots/preview.png)

## Features

- ✨ Live markdown preview (Typora-style)
- ☁️ Dropbox cloud sync (optional)
- 🌙 Dark/Light themes
- 📁 File browser with Dropbox integration
- 💾 Auto-save support
- 📤 Export to PDF, HTML formats

## Tech Stack

- **Framework:** React 18
- **State Management:** Zustand
- **Build Tool:** Vite
- **Cloud:** Dropbox API
- **Styling:** CSS (minimal dependencies)

## Development

```bash
# Install dependencies
npm install

# Start development server (browser)
npm run dev

# Start with Electron
npm run dev:electron

# Build for production
npm run build

# Preview built app
npm run preview
```

## Building the Windows Installer

```bash
npm run dist
```

Produces `release/Markdown Editor Setup 1.0.0.exe` — an NSIS installer that:
- Adds the app to Start Menu and Desktop
- Registers `.md` and `.markdown` as default-open with this app
- Supports pinning to the taskbar

> **Note:** The installer is unsigned. Windows SmartScreen will show a warning on first run — click **More info → Run anyway**.

### Required patch after `npm install`

`electron-builder` downloads a signing toolchain (`winCodeSign`) that contains macOS symlinks. On Windows without Developer Mode enabled, 7-Zip fails to create those symlinks (exit code 2) and aborts the build.

**Fix:** after every `npm install`, open `node_modules/builder-util/out/util.js` and find the `handleProcess` callback inside `runCommand` (search for `error.alreadyLogged = true`). Replace it:

```js
// BEFORE
handleProcess("close", childProcess, command, resolve, error => {
    if (error instanceof ExecError && error.exitCode === 2) {
        error.alreadyLogged = true;
    }
    reject(error);
});

// AFTER
handleProcess("close", childProcess, command, resolve, error => {
    if (error instanceof ExecError && error.exitCode === 2) {
        resolve(undefined); // macOS symlink failures are non-fatal on Windows
        return;
    }
    reject(error);
});
```

**Alternative:** Enable **Windows Developer Mode** (Settings → System → For Developers → Developer Mode) — this grants symlink creation rights and the patch is no longer needed.

## Project Structure

```
markdown-editor/
├── src/
│   ├── components/
│   │   ├── Toolbar.jsx      # Main toolbar component
│   │   └── FileBrowser.jsx  # File explorer
│   ├── store/
│   │   └── useMarkdownStore.js  # Zustand store
│   ├── styles.css           # Global styles
│   ├── MarkdownEditor.jsx   # Main component
│   └── main.jsx             # App entry
├── index.html
├── vite.config.js           # Vite configuration
├── package.json             # Dependencies
└── README.md                # This file
```

## Configuration

Add environment variables for Dropbox integration:

```env
DROPBOX_CLIENT_ID=your_client_id
DROPBOX_CLIENT_SECRET=your_client_secret
```

## License

MIT License - Free and open source

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

If you have questions or feature requests, please open an issue.

---

Built with ❤️ for Markdown lovers
