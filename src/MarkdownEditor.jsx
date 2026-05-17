import { useMarkdownStore } from './store/useMarkdownStore';
import Toolbar from './components/Toolbar';
import './styles.css';

export default function MarkdownEditor() {
  const { currentFile, isCloudConnected } = useMarkdownStore();

  return (
    <div className="app">
      <header className="header">
        <div className="logo"><h1 style={{ margin: 0 }}>MD Editor</h1></div>
        <Toolbar />
      </header>

      <main className="main">
        {!currentFile ? (
          <div className="welcome-screen">
            <h2>Welcome to MD Editor</h2>
            <p>Open a markdown file to start editing. Files auto-sync to cloud.</p>
            {isCloudConnected && (
              <div className="cloud-status">
                <strong>Connected to Dropbox</strong>
                <p>Your files are synced automatically</p>
              </div>
            )}
          </div>
        ) : (
          <div className="editor-container">
            <main className="editor">
              <Toolbar onSave={() => useMarkdownStore.getState().saveFile()} />

              <section className="preview-section">
                <article className="preview">
                  {currentFile.content ? (
                    <div dangerouslySetInnerHTML={{ __html: currentFile.content }} />
                  ) : (
                    <div className="empty-preview">
                      <p>Start typing to see preview...</p>
                    </div>
                  )}
                </article>
              </section>
            </main>
          </div>
        )}
      </main>
    </div>
  );
}
