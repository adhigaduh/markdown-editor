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
    newFile,
    openFile,
    addFile,
    saveFile,
    saveFileAs,
    closeFile,
    toggleSidebar,
    toggleFocusMode,
    toggleSourceMode,
    setTheme,
  } = useMarkdownStore();

  // Expose store for Playwright testing in dev mode
  useEffect(() => {
    if (import.meta.env.DEV) window.__store = useMarkdownStore;
  }, []);

  // Apply theme and focus mode to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.className = `theme-${theme}${isFocusMode ? ' focus-mode' : ''}`;
  }, [theme, isFocusMode]);

  // Keyboard shortcuts (browser mode — Electron uses native menu)
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        newFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        const cur = useMarkdownStore.getState().currentFile;
        if (cur) closeFile(cur.path);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleSourceMode();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [saveFile, toggleSourceMode]);

  // Open file passed via argv (double-click .md in Explorer) or second-instance
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.getStartupFile().then(async (filePath) => {
      if (!filePath) return;
      const file = await window.electronAPI.openFileByPath(filePath);
      if (file) { addFile(file); openFile(file); }
    });
    const unsub = window.electronAPI.onOpenFile(async (filePath) => {
      const file = await window.electronAPI.openFileByPath(filePath);
      if (file) { addFile(file); openFile(file); }
    });
    return unsub;
  }, [addFile, openFile]);

  // Electron menu event handler
  useEffect(() => {
    if (!isElectron) return;
    const unsub = window.electronAPI.onMenuEvent(async (event) => {
      if (event === 'file:new') {
        newFile();
      } else if (event === 'file:open') {
        const file = await window.electronAPI.openFile();
        if (file) { addFile(file); openFile(file); }
      } else if (event === 'file:close') {
        const cur = useMarkdownStore.getState().currentFile;
        if (cur) closeFile(cur.path);
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
