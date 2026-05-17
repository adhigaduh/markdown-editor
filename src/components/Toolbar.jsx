const Toolbar = () => (
  <div className="toolbar">
    <div className="toolbar-group">
      <button className="toolbar-button" onClick={() => {}}>
        📂 Open
      </button>
    </div>
    <div className="toolbar-group">
      <button className="toolbar-button" onClick={() => console.log('save clicked')}>
        💾 Save
      </button>
    </div>
    <div className="toolbar-group">
      <button className="toolbar-button">
        🌗 Light/Dark
      </button>
    </div>
    <div className="toolbar-group">
      <button className="toolbar-button">
        ⚙️ Settings
      </button>
    </div>
  </div>
);

export default Toolbar;
