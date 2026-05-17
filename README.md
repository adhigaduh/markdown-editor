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

# Start development server
npm run dev

# Build for production
npm run build

# Preview built app
npm run preview
```

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
