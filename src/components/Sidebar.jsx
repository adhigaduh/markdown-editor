import { useMemo } from 'react';
import { useMarkdownStore } from '../store/useMarkdownStore';
import { extractOutline } from '../utils/outline';

export default function Sidebar() {
  const files = useMarkdownStore((s) => s.files);
  const currentFile = useMarkdownStore((s) => s.currentFile);
  const content = useMarkdownStore((s) => s.content);
  const isSidebarOpen = useMarkdownStore((s) => s.isSidebarOpen);
  const activeSidebarPanel = useMarkdownStore((s) => s.activeSidebarPanel);
  const openFile = useMarkdownStore((s) => s.openFile);
  const setSidebarPanel = useMarkdownStore((s) => s.setSidebarPanel);

  const outline = useMemo(() => extractOutline(content), [content]);

  if (!isSidebarOpen) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab${activeSidebarPanel === 'files' ? ' active' : ''}`}
          onClick={() => setSidebarPanel('files')}
        >
          Files
        </button>
        <button
          className={`sidebar-tab${activeSidebarPanel === 'outline' ? ' active' : ''}`}
          onClick={() => setSidebarPanel('outline')}
        >
          Outline
        </button>
      </div>

      <div className="sidebar-panel">
        {activeSidebarPanel === 'files' ? (
          files.length === 0 ? (
            <p className="sidebar-empty">No files open yet</p>
          ) : (
            files.map((file) => (
              <div
                key={file.path}
                className={`sidebar-file-item${currentFile?.path === file.path ? ' active' : ''}`}
                onClick={() => openFile(file)}
              >
                <span className="sidebar-file-icon">📄</span>
                <span className="sidebar-file-name">{file.name}</span>
              </div>
            ))
          )
        ) : outline.length === 0 ? (
          <p className="sidebar-empty">No headings</p>
        ) : (
          outline.map((heading, i) => (
            <div
              key={i}
              className="sidebar-outline-item"
              style={{ paddingLeft: `${(heading.level - 1) * 14 + 8}px` }}
            >
              {heading.text}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
