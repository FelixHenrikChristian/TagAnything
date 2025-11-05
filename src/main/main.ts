import { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { resolveHtmlPath } from './util';
import fluentFfmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { autoUpdater } from 'electron-updater';
import { version as appVersionFromPackage } from '../../package.json';
const Store = require('electron-store');

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

  // 从缓存中获取窗口大小，如果没有则使用默认值
  const getWindowSize = () => {
    try {
      const store = new Store();
      const savedSize = store.get('windowSize');
      if (savedSize && typeof savedSize === 'object' && savedSize.width && savedSize.height) {
        return {
          width: Math.max(800, savedSize.width), // 最小宽度800
          height: Math.max(600, savedSize.height) // 最小高度600
        };
      }
    } catch (error) {
      console.log('Failed to load window size from cache:', error);
    }
    return { width: 1280, height: 960 }; // 默认大小
  };

  const windowSize = getWindowSize();

  mainWindow = new BrowserWindow({
    show: false,
    width: windowSize.width,
    height: windowSize.height,
    minWidth: 800,
    minHeight: 600,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  if (mainWindow) {
    try {
      mainWindow.removeMenu();
      mainWindow.setMenuBarVisibility(false);
    } catch (e) {
      console.warn('Failed to remove menu bar:', e);
    }
  }

  // 监听窗口大小变化并保存到缓存
  let saveTimeout: NodeJS.Timeout;
  mainWindow.on('resize', () => {
    // 使用防抖，避免频繁保存
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const [width, height] = mainWindow.getSize();
        try {
          const store = new Store();
          store.set('windowSize', { width, height });
        } catch (error) {
          console.log('Failed to save window size:', error);
        }
      }
    }, 500); // 500ms 防抖
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  // 根据环境变量选择是否自动打开 DevTools（不影响生产发布）
  if (process.env.OPEN_DEVTOOLS === 'true') {
    try {
      // 使用右侧内嵌模式，而不是独立窗口
      mainWindow.webContents.openDevTools({ mode: 'right' });
    } catch (e) {
      console.warn('Failed to open DevTools:', e);
    }
  }

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
    // 始终注册全局快捷键以打开/关闭右侧内嵌 DevTools（不再依赖环境变量）
    try {
      const toggleEmbeddedDevtools = () => {
        const win = BrowserWindow.getFocusedWindow() || mainWindow;
        if (!win) return;
        const wc = win.webContents;
        if (wc.isDevToolsOpened()) {
          wc.closeDevTools();
        } else {
          // 强制以右侧内嵌方式打开
          wc.openDevTools({ mode: 'right' });
        }
      };

      globalShortcut.register('CommandOrControl+Shift+I', toggleEmbeddedDevtools);
      globalShortcut.register('F12', toggleEmbeddedDevtools);
    } catch (e) {
      console.warn('Failed to register DevTools shortcuts:', e);
    }

    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

// 退出时清理所有注册的快捷键
app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (e) {
    // ignore
  }
});

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



// 检查是否为视频文件
ipcMain.handle('is-video-file', async (event, filePath: string) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v'];
  const ext = path.extname(filePath).toLowerCase();
  return videoExtensions.includes(ext);
});

// 重置窗口大小到默认值
ipcMain.handle('reset-window-size', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const defaultWidth = 1280;
    const defaultHeight = 960;
    
    // 重置窗口大小
    mainWindow.setSize(defaultWidth, defaultHeight);
    
    // 清除缓存中的窗口大小
    try {
      const store = new Store();
      store.delete('windowSize');
    } catch (error) {
      console.log('Failed to clear window size cache:', error);
    }
    
    return { width: defaultWidth, height: defaultHeight };
  }
  return null;
});

// 文件操作处理器（移动/复制文件）
ipcMain.handle('perform-file-operation', async (event, request: {
  operation: 'move' | 'copy';
  files: string[];
  targetPath: string;
}) => {
  const { operation, files, targetPath } = request;
  const processedFiles: string[] = [];
  const failedFiles: { path: string; error: string }[] = [];

  try {
    // 检查目标路径是否存在
    try {
      await fsPromises.access(targetPath);
    } catch {
      return {
        success: false,
        error: `目标路径不存在: ${targetPath}`
      };
    }

    // 检查目标路径是否为目录
    const targetStats = await fsPromises.stat(targetPath);
    if (!targetStats.isDirectory()) {
      return {
        success: false,
        error: `目标路径不是一个目录: ${targetPath}`
      };
    }

    for (const filePath of files) {
      try {
        // 检查源文件是否存在
        try {
          await fsPromises.access(filePath);
        } catch {
          failedFiles.push({
            path: filePath,
            error: '源文件不存在'
          });
          continue;
        }

        const fileName = path.basename(filePath);
        const targetFilePath = path.join(targetPath, fileName);

        // 检查目标文件是否已存在
        try {
          await fsPromises.access(targetFilePath);
          failedFiles.push({
            path: filePath,
            error: '目标位置已存在同名文件'
          });
          continue;
        } catch {
          // 目标文件不存在，可以继续操作
        }

        if (operation === 'copy') {
          // 复制文件或目录
          await copyFileOrDirectory(filePath, targetFilePath);
        } else if (operation === 'move') {
          // 移动文件或目录（跨分区回退为复制+删除）
          await moveFileOrDirectory(filePath, targetFilePath);
        }

        processedFiles.push(filePath);
      } catch (error) {
        failedFiles.push({
          path: filePath,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return {
      success: failedFiles.length === 0,
      processedFiles,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
      error: failedFiles.length > 0 ? `${failedFiles.length} 个文件操作失败` : undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '文件操作失败'
    };
  }
});

// 添加文件重命名处理器
ipcMain.handle('rename-file', async (event, oldPath: string, newPath: string) => {
  try {
    await fsPromises.rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '文件重命名失败'
    };
  }
});

// 递归复制文件或目录的辅助函数
async function copyFileOrDirectory(src: string, dest: string): Promise<void> {
  const stats = await fsPromises.stat(src);
  
  if (stats.isDirectory()) {
    // 创建目标目录
    await fsPromises.mkdir(dest, { recursive: true });
    
    // 递归复制目录内容
    const items = await fsPromises.readdir(src);
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      await copyFileOrDirectory(srcPath, destPath);
    }
  } else {
    // 复制文件
    await fsPromises.copyFile(src, dest);
  }
}

// 安全移动文件或目录：优先使用 rename，跨分区等情况回退到复制+删除
async function moveFileOrDirectory(src: string, dest: string): Promise<void> {
  try {
    await fsPromises.rename(src, dest);
  } catch (error: any) {
    const code = error?.code;
    // EXDEV: 跨设备移动不允许；EPERM/EACCES：权限问题（有时复制+删除可行）
    if (code === 'EXDEV' || code === 'EPERM' || code === 'EACCES') {
      // 先复制，再删除源文件/目录
      await copyFileOrDirectory(src, dest);
      const stats = await fsPromises.stat(src);
      if (stats.isDirectory()) {
        await fsPromises.rm(src, { recursive: true, force: true });
      } else {
        await fsPromises.unlink(src);
      }
    } else {
      throw error;
    }
  }
}

// 在打包环境下，@ffmpeg-installer/@ffprobe-installer 的路径位于 app.asar，
// 实际可执行文件被解压到 app.asar.unpacked。需要替换路径避免 ENOENT。
const ffmpegPathRaw = ffmpegInstaller.path;
const ffprobePathRaw = ffprobeInstaller.path;
const ffmpegPathResolved = app.isPackaged
  ? ffmpegPathRaw.replace('app.asar', 'app.asar.unpacked')
  : ffmpegPathRaw;
const ffprobePathResolved = app.isPackaged
  ? ffprobePathRaw.replace('app.asar', 'app.asar.unpacked')
  : ffprobePathRaw;

fluentFfmpeg.setFfmpegPath(ffmpegPathResolved);
fluentFfmpeg.setFfprobePath(ffprobePathResolved);

// 打开外部链接
ipcMain.handle('open-external', async (event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '打开链接失败'
    };
  }
});

// 获取应用版本号
ipcMain.handle('get-version', async () => {
  try {
    // 优先从根目录的 package.json 读取版本号，确保与项目版本一致
    return appVersionFromPackage ?? app.getVersion();
  } catch (e) {
    // 兜底返回 Electron 的版本，避免抛错
    return app.getVersion();
  }
});

// 设置相关的 IPC 处理器
ipcMain.handle('get-setting', async (event, key: string, defaultValue?: any) => {
  const store = new Store();
  return store.get(key, defaultValue);
});

ipcMain.handle('set-setting', async (event, key: string, value: any) => {
  const store = new Store();
  store.set(key, value);
});

// 自动更新配置
if (app.isPackaged) {
  autoUpdater.autoDownload = false;
  
  // 配置更新服务器
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'FelixChristian011226',
    repo: 'TagAnything'
  });
  
  // 检查设置中是否启用了启动时自动检查更新
  const store = new Store();
  const autoUpdateEnabled = store.get('autoUpdateEnabled', false);
  
  if (autoUpdateEnabled) {
    autoUpdater.checkForUpdates();
  }
}

// 自动更新 IPC 处理器
ipcMain.handle('check-for-updates', async () => {
  try {
    const updateCheckResult = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: updateCheckResult?.updateInfo || null
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '检查更新失败'
    };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '下载更新失败'
    };
  }
});

ipcMain.handle('install-update', async () => {
  try {
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '安装更新失败'
    };
  }
});

// 自动更新事件监听
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  if (mainWindow) {
    mainWindow.webContents.send('update-checking');
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', progressObj);
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});