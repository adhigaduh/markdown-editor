import { useRef } from 'react';
import { useMarkdownStore } from '../store/useMarkdownStore';

export default function Toolbar() {
  const { newFile, saveFile, toggleDarkMode, theme, isDirty, openFile, addFile, currentFile } = useMarkdownStore();
  const fileInputRef = useRef(null);

  const handleFileOpen = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileObj = { name: file.name, path: file.name, content: ev.target.result };
      addFile(fileObj);
      openFile(fileObj);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="toolbar">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        style={{ display: 'none' }}
        onChange={handleFileOpen}
      />
      <div className="toolbar-group">
        <button className="toolbar-button" onClick={newFile}>
          📄 New
        </button>
        <button className="toolbar-button" onClick={() => fileInputRef.current?.click()}>
          📂 Open
        </button>
      </div>
      <div className="toolbar-group">
        <button className="toolbar-button" onClick={saveFile} disabled={!currentFile}>
          💾 Save{isDirty ? ' *' : ''}
        </button>
      </div>
      <div className="toolbar-group">
        <button className="toolbar-button" onClick={toggleDarkMode}>
          🌗 {theme === 'night' ? 'Light' : 'Dark'}
        </button>
      </div>
    </div>
  );
}
