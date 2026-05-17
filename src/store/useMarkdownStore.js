import { create } from 'zustand';

export const useMarkdownStore = create((set, get) => ({
  currentFile: null,
  content: '',
  files: [],
  isPreviewOpen: true,
  isDarkMode: true,
  isDirty: false,
  isSynced: false,
  fontSize: 16,
  fontFamily: 'system-ui',
  cloudProvider: 'dropbox',
  cloudToken: null,
  isCloudConnected: false,
  cloudFiles: [],
  lastSyncTime: null,

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
    set({ content, isDirty: true, isSynced: false });
  },

  saveFile: () => {
    const { currentFile, content } = get();
    if (!currentFile) return;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    a.click();
    URL.revokeObjectURL(url);
    set({ isDirty: false });
  },

  togglePreview: () => {
    set((state) => ({ isPreviewOpen: !state.isPreviewOpen }));
  },

  toggleDarkMode: () => {
    set((state) => ({ isDarkMode: !state.isDarkMode }));
  },

  connectCloud: () => {
    console.log('Dropbox OAuth not yet implemented');
  },

  disconnectCloud: () => {
    set({ cloudToken: null, isCloudConnected: false, cloudFiles: [] });
  },
}));
