import { useMarkdownStore } from '../store/useMarkdownStore';

export default function FileBrowser() {
  const { files, currentFile, openFile } = useMarkdownStore();

  return (
    <aside className="sidebar">
      <div className="file-tree">
        {files.length === 0 ? (
          <p className="empty-message">Open a file to get started</p>
        ) : (
          files.map((file) => (
            <div
              key={file.path}
              className={`file-item${currentFile?.path === file.path ? ' active' : ''}`}
              onClick={() => openFile(file)}
            >
              <span>📄</span>
              <span>{file.name}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
