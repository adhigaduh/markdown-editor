import { useMarkdownStore } from '../store/useMarkdownStore';
import { Edit, Eye } from 'lucide-react';

export default function MarkdownView() {
  const { currentFile, isPreviewOpen, isDarkMode, fontSize, fontFamily } = useMarkdownStore();
  const { isSynced } = useMarkdownStore();

  if (!currentFile) return null;

  return (
    <>
      <div className={`markdown-editor ${isDarkMode ? 'dark' : 'light'}`, [
        { '--font-size': fontSize },
        { '--font-family': fontFamily },
      ]}>
        <Toolbar
          onSave={() => {
            currentFile.save();
            useMarkdownStore.getState().isSynced;
          }}
          isConnected={useMarkdownStore.getState().isCloudConnected}
          showCloudFiles={useMarkdownStore.getState().cloudFiles}
        />
        
        <Sidebar>
          <FileBrowser
            onSelect={currentFile}
            onAddFile={() => window.showNewFileDialog()}
          />
        </Sidebar>

        {isPreviewOpen && (
          <Preview
            preview={currentFile}
            isEditable={true}
          />
        )}
      </div>

      {isSynced && typeof window !== 'undefined' && (
        <Toast>File synced to Dropbox</Toast>
      )}
    </>
  );
}

function Sidebar({ children }) {
  return <aside className="sidebar">{children}</aside>;
}

function FileBrowser({ onSelect, onAddFile }) {
  const { currentFile, files } = useMarkdownStore();
  
  const handleFileSelect = (file) => {
    window.showOpenDialog({ filePath: file.path });
  };

  return (
    <aside className="file-browser">
      <h3>Files</h3>
      <ul className="file-list">
        <li className="file-item" onClick={onAddFile}>
          + New
        </li>
        {files.map((file) => (
          <li
            key={file.path}
            className={`file-item ${currentFile === file ? 'active' : ''}`}
            onClick={() => handleFileSelect(file)}
          >
            <FileIcon type={file.type === 'directory' ? 'folder' : 'file'} />
            {file.name}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Preview({ preview }) {
  const { currentFile, updatePreview } = useMarkdownStore();

  return (
    <section className="preview">
      <PreviewToolbar />
      <iframe
        srcDoc={currentFile}
        title="preview"
      />
    </section>
  );
}

function PreviewToolbar() {
  return (
    <nav className="preview-toolbar">
      <ToolbarButton onClick={window.updatePreview}>
        <Eye size={18} />
      </ToolbarButton>
    </nav>
  );
}