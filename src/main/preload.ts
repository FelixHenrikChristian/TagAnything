// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example' | 'update-checking' | 'update-available' | 'update-not-available' | 'update-error' | 'update-download-progress' | 'update-downloaded';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getFiles: (folderPath: string) => ipcRenderer.invoke('get-files', folderPath),
  getAllFiles: (folderPath: string) => ipcRenderer.invoke('get-all-files', folderPath),
  searchFiles: (params: any) => ipcRenderer.invoke('search-files', params),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  createFolder: (parentPath: string, name: string) => ipcRenderer.invoke('create-folder', parentPath, name),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath),
  generateVideoThumbnail: (videoPath: string) => ipcRenderer.invoke('generate-video-thumbnail', videoPath),
  isVideoFile: (filePath: string) => ipcRenderer.invoke('is-video-file', filePath),
  resetWindowSize: () => ipcRenderer.invoke('reset-window-size'),
  performFileOperation: (request: any) => ipcRenderer.invoke('perform-file-operation', request),
  deleteFiles: (request: { mode: 'trash' | 'permanent'; files: string[] }) => ipcRenderer.invoke('delete-files', request),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getVersion: () => ipcRenderer.invoke('get-version'),
  // 设置相关 API
  getSetting: (key: string, defaultValue?: any) => ipcRenderer.invoke('get-setting', key, defaultValue),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value),
  // 自动更新 API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  // 缓存管理 API
  clearAllCache: () => ipcRenderer.invoke('clear-all-cache'),
  // 自动更新事件监听
  onUpdateChecking: (callback: () => void) => {
    const unsubscribe = electronHandler.ipcRenderer.on('update-checking', (...args: unknown[]) => {
      callback();
    });
    return unsubscribe;
  },
  onUpdateAvailable: (callback: (info: any) => void) => {
    const unsubscribe = electronHandler.ipcRenderer.on('update-available', (...args: unknown[]) => {
      callback(args[0]);
    });
    return unsubscribe;
  },
  onUpdateNotAvailable: (callback: (info: any) => void) => {
    const unsubscribe = electronHandler.ipcRenderer.on('update-not-available', (...args: unknown[]) => {
      callback(args[0]);
    });
    return unsubscribe;
  },
  onUpdateError: (callback: (error: string) => void) => {
    const unsubscribe = electronHandler.ipcRenderer.on('update-error', (...args: unknown[]) => {
      callback(args[0] as string);
    });
    return unsubscribe;
  },
  onUpdateDownloadProgress: (callback: (progress: any) => void) => {
    const unsubscribe = electronHandler.ipcRenderer.on('update-download-progress', (...args: unknown[]) => {
      callback(args[0]);
    });
    return unsubscribe;
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const unsubscribe = electronHandler.ipcRenderer.on('update-downloaded', (...args: unknown[]) => {
      callback(args[0]);
    });
    return unsubscribe;
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;