import { useState } from 'react';
import { useMarkdownStore } from '../store/useMarkdownStore';

export default function FileBrowser() {
  const { files, currentFile } = useMarkdownStore();

  const handleFileSelect = (file) => {
    useMarkdownStore.getState().openFile(file);
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ToolbarButton onClick={createNewFile}>
          <div className="icon">+</div>
          New
        </ToolbarButton>
        <ToolbarButton onClick={saveCurrentFile}>
          <div className="icon">✓</div>
          Save
        </ToolbarButton>
      </nav>

      <div className="file-tree">
        {files.length === 0 ? (
          <div className="empty-message">No files in current folder</div>
        ) : (
          files.map(({ name, path }) => (
            <div key={path} className="folder-item">
              <div className="folder-name">{name}</div>
              <div className="folder-content">
                {currentFile === null ? (
                  files.flat()?.map((file) => (
                    <FileItem key={file.path} file={file} />
                  ))
                ) : (
                  <div className="inline-file">
                    <FileIcon />
                    {currentFile.name}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function FileItem({ file }) {
  return (
    <div className="file-item" onClick={() => handleFileSelect(file)}>
      <FileIcon />
      <span>{file.name}</span>
    </div>
  );
}

function FileIcon() {
  return <div className="file-icon">📄</div>;
}

export { FileBrowser, FileItem };
