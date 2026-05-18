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
