// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

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
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  generateVideoThumbnail: (videoPath: string) => ipcRenderer.invoke('generate-video-thumbnail', videoPath),
  isVideoFile: (filePath: string) => ipcRenderer.invoke('is-video-file', filePath),
};

const electronHandlerWithThumbnail = {
  ...electronHandler,
  saveThumbnail: (thumbnailPath: string, imageData: string) => ipcRenderer.invoke('save-thumbnail', thumbnailPath, imageData),
};

contextBridge.exposeInMainWorld('electron', electronHandlerWithThumbnail);

export type ElectronHandler = typeof electronHandler;