import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMarkdownStore } from '../store/useMarkdownStore';

export default function MarkdownView() {
  const { currentFile, content, updateContent, isPreviewOpen, togglePreview } = useMarkdownStore();

  if (!currentFile) {
    return (
      <div className="editor-area" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <h2>Welcome to Markdown Editor</h2>
          <p>Click <strong>📂 Open</strong> in the toolbar to open a .md file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-area">
      <div className="editor-panel">
        <div className="editor-panel-header">
          <span className="file-title">{currentFile.name}</span>
          <button className="toolbar-button preview-toggle" onClick={togglePreview}>
            {isPreviewOpen ? '✏️ Hide Preview' : '👁 Show Preview'}
          </button>
        </div>
        <textarea
          className="editor-textarea"
          value={content}
          onChange={(e) => updateContent(e.target.value)}
          placeholder="Start writing Markdown..."
          spellCheck={false}
        />
      </div>
      {isPreviewOpen && (
        <div className="preview markdown-editor">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || '*Nothing to preview yet.*'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
