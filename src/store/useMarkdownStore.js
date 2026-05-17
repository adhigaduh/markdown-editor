import { create } from 'zustand';

export const useMarkdownStore = create((set, get) => ({
  currentFile: null,
  content: '',
  files: [],
  isPreviewOpen: true,
  isDarkMode: false,
  fontSize: 16,
  fontFamily: 'system-ui',
  cloudProvider: 'dropbox',
  cloudToken: null,
  isCloudConnected: false,
  cloudFiles: [],
  lastSyncTime: null,
  
  actions: {
    openFile: (file) => {
      set({
        currentFile: file,
        content: file.content || ''
      });
    },
    
    updateContent: (content) => {
      set({ content });
    },
    
    saveFile: async () => {
      const savedFile = await get().currentFile?.save();
      if (savedFile) {
        set({
          currentFile: savedFile,
          isDirty: false
        });
      }
    },
    
    openFileFromFolder: () => {
      return new Promise((resolve, reject) => {
        window.showOpenDialog({
          filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }]
        })
          .then(selectedFiles => {
            if (selectedFiles && selectedFiles.length > 0) {
              const file = selectedFiles[0];
              fetch(`http://localhost:5173/api/files?path=${encodeURIComponent(file.path)}`)
                .then(res => res.text())
                .then(content => {
                  set({
                    currentFile: {
                      path: resolvedPath(file.path),
                      name: file.name,
                      folder: get().currentFile?.folder
                    },
                    content,
                    isDirty: false
                  });
                  resolve();
                });
            }
          })
          .catch(reject);
      });
    },
    
    updateTheme: (theme) => {
      set(prev => ({ ...prev, isDarkMode: theme === 'dark' }));
    },
    
    connectCloud: async () => {
      if (get().cloudProvider === 'dropbox') {
        try {
          // Dropbox OAuth flow would go here
          const isConnected = true;
          
          set({
            cloudToken: token,
            isCloudConnected: isConnected,
            lastSyncTime: new Date()
          });
        } catch (error) {
          console.error('Failed to connect to Dropbox:', error);
        }
      }
    },
    
    disconnectCloud: () => {
      set({
        cloudToken: null,
        isCloudConnected: false,
        cloudFiles: []
      });
    }
  }
}));

function resolvedPath(path) {
  // Handle different path formats
  return path;
}
