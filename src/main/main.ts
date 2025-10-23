import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { resolveHtmlPath } from './util';
import fluentFfmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

let mainWindow: BrowserWindow | null = null;

const isMacOS = process.platform === 'darwin';
const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async (): Promise<void> => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0];
});

ipcMain.handle('get-files', async (event, folderPath: string) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const items = fs.readdirSync(folderPath);
    const files = [];
    
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      const stats = fs.statSync(fullPath);
      
      files.push({
        name: item,
        path: fullPath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
      });
    }
    
    return files;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

// 递归获取所有文件（包括子目录中的文件）
ipcMain.handle('get-all-files', async (event, folderPath: string) => {
  const fs = require('fs');
  const path = require('path');
  
  const getAllFiles = (dirPath: string): any[] => {
    const files: any[] = [];
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);
        
        const fileItem = {
          name: item,
          path: fullPath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
        };
        
        files.push(fileItem);
        
        // 如果是目录，递归获取子目录中的文件
        if (stats.isDirectory()) {
          const subFiles = getAllFiles(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
    
    return files;
  };
  
  try {
    return getAllFiles(folderPath);
  } catch (error) {
    console.error('Error getting all files:', error);
    return [];
  }
});

ipcMain.handle('open-file', async (event, filePath: string) => {
  shell.openPath(filePath);
});

// 生成视频缩略图 - 使用FFmpeg
ipcMain.handle('generate-video-thumbnail', async (event, videoPath: string) => {
  try {
    const thumbnailsDir = path.join(app.getPath('userData'), 'thumbnails');
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    const videoName = path.basename(videoPath, path.extname(videoPath));
    const thumbnailPath = path.join(thumbnailsDir, `${videoName}.jpg`);

    if (fs.existsSync(thumbnailPath)) {
      return thumbnailPath;
    }

    await new Promise<void>((resolve, reject) => {
      fluentFfmpeg(videoPath)
        .on('error', (err: any) => {
          console.error('FFmpeg thumbnail error:', err);
          reject(err);
        })
        .on('end', () => resolve())
        .screenshots({
          count: 1,
          folder: thumbnailsDir,
          filename: `${videoName}.jpg`,
          timestamps: ['10%'],
          size: '200x?'
        });
    });

    return thumbnailPath;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
});

// 保存缩略图文件
ipcMain.handle('save-thumbnail', async (event, thumbnailPath: string, imageData: string) => {
  try {
    // 将base64数据转换为buffer并保存
    const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(thumbnailPath, buffer);
    return thumbnailPath;
  } catch (error) {
    console.error('Error saving thumbnail:', error);
    throw error;
  }
});

// 检查是否为视频文件
ipcMain.handle('is-video-file', async (event, filePath: string) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v'];
  const ext = path.extname(filePath).toLowerCase();
  return videoExtensions.includes(ext);
});
fluentFfmpeg.setFfmpegPath(ffmpegInstaller.path);
fluentFfmpeg.setFfprobePath(ffprobeInstaller.path);