import { create } from 'zustand';

const isElectron =
  typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

export const useMarkdownStore = create((set, get) => ({
  // File state
  currentFile: null,
  content: '',
  files: [],
  isDirty: false,

  // UI state
  theme: 'night',
  isSidebarOpen: true,
  activeSidebarPanel: 'files',
  isFocusMode: false,
  isSourceMode: false,

  newFile: () => {
    const { files } = get();
    const existing = new Set(files.map((f) => f.name));
    let name = 'Untitled.md';
    let i = 2;
    while (existing.has(name)) name = `Untitled-${i++}.md`;
    const file = { path: `__new__/${name}`, name, content: '' };
    set((s) => ({ files: [...s.files, file], currentFile: file, content: '', isDirty: false }));
  },

  openFile: (file) => {
    set({ currentFile: file, content: file.content || '', isDirty: false });
  },

  addFile: (file) => {
    set((state) => ({
      files: state.files.some((f) => f.path === file.path)
        ? state.files
        : [...state.files, file],
    }));
  },

  updateContent: (content) => {
    set({ content, isDirty: true });
  },

  saveFile: async () => {
    const { currentFile, content } = get();
    if (!currentFile) return;
    if (currentFile.path.startsWith('__new__/')) return get().saveFileAs();
    if (isElectron) {
      await window.electronAPI.saveFile(currentFile.path, content);
      set({ isDirty: false });
    } else {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.name;
      a.click();
      URL.revokeObjectURL(url);
      set({ isDirty: false });
    }
  },

  saveFileAs: async () => {
    const { content, addFile } = get();
    if (isElectron) {
      const result = await window.electronAPI.saveFileAs(content);
      if (result) {
        const fileWithContent = { ...result, content };
        addFile(fileWithContent);
        set({ currentFile: result, isDirty: false });
      }
    } else {
      get().saveFile();
    }
  },

  closeFile: (filePath) => {
    const { files, currentFile } = get();
    const idx = files.findIndex((f) => f.path === filePath);
    if (idx === -1) return;
    const newFiles = files.filter((f) => f.path !== filePath);
    if (currentFile?.path === filePath) {
      const next = newFiles[idx] ?? newFiles[idx - 1] ?? null;
      set({
        files: newFiles,
        currentFile: next,
        content: next?.content ?? '',
        isDirty: false,
      });
    } else {
      set({ files: newFiles });
    }
  },

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
  toggleSourceMode: () => set((s) => ({ isSourceMode: !s.isSourceMode })),
  setTheme: (theme) => set({ theme }),
  setSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),

  // Legacy compat — used by Toolbar.jsx in browser mode
  toggleDarkMode: () =>
    set((s) => ({ theme: s.theme === 'night' ? 'github' : 'night' })),
}));
