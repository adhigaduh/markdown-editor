import { useRef } from 'react';
import { useMarkdownStore } from '../store/useMarkdownStore';

export default function Toolbar() {
  const { saveFile, toggleDarkMode, isDarkMode, isDirty, openFile, addFile, currentFile, closeFile } = useMarkdownStore();
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
        <button className="toolbar-button" onClick={() => fileInputRef.current?.click()}>
          📂 Open
        </button>
      </div>
      <div className="toolbar-group">
        <button className="toolbar-button" onClick={saveFile} disabled={!currentFile}>
          💾 Save{isDirty ? ' *' : ''}
        </button>
        {currentFile && (
          <button className="toolbar-button" onClick={closeFile}>
            ✕ Close
          </button>
        )}
      </div>
      <div className="toolbar-group">
        <button className="toolbar-button" onClick={toggleDarkMode}>
          🌗 {isDarkMode ? 'Light' : 'Dark'}
        </button>
      </div>
      <div className="toolbar-group">
        <button className="toolbar-button">
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
}
