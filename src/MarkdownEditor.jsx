import { useEffect } from 'react';
import './styles.css';
import Toolbar from './components/Toolbar';
import FileBrowser from './components/FileBrowser';
import MarkdownView from './components/MarkdownView';
import { useMarkdownStore } from './store/useMarkdownStore';

export default function MarkdownEditor() {
  const isDarkMode = useMarkdownStore((s) => s.isDarkMode);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <Toolbar />
      <div className="editor-container">
        <FileBrowser />
        <MarkdownView />
      </div>
    </div>
  );
}
