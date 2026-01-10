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

// GPU acceleration for better rendering performance (glassmorphism, backdrop-filter, etc.)
app.commandLine.appendSwitch('use-angle', 'gl');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

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

ipcMain.handle('select-file', async (event, filters?: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: filters // Allow passing filters
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

// Helper functions for search
function parseTagsFromFilename(filename: string): string[] {
  const tagMatch = filename.match(/^\[([^\]]+)\]/);
  if (!tagMatch) return [];
  return tagMatch[1].split(/\s+/).filter(tag => tag.trim().length > 0);
}

function getDefaultTagColor(tagName: string): string {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7',
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
  ];
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface LocalTag {
  id: string;
  name: string;
  color: string;
  textcolor?: string;
  groupId?: string;
}

interface LocalTagGroup {
  id: string;
  name: string;
  tags: LocalTag[];
}

// 搜索文件处理函数
// 简繁转换器（lazy初始化）
let s2tConverter: any = null;
let t2sConverter: any = null;
function getChineseConverters() {
  if (!s2tConverter) {
    const OpenCC = require('opencc-js');
    s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });
  }
  return { s2tConverter, t2sConverter };
}

ipcMain.handle('search-files', async (event, params: {
  rootPath: string;
  tagGroups: LocalTagGroup[];
  tagIds?: string[];
  query?: string;
  matchAllTags?: boolean;
  enableSimplifiedTraditionalSearch?: boolean;
}) => {
  const { rootPath, tagGroups, tagIds, query, matchAllTags = true, enableSimplifiedTraditionalSearch = false } = params;
  const fs = require('fs').promises;
  const path = require('path');

  const results: any[] = [];
  const fileTagsMap: Record<string, LocalTag[]> = {};

  const lowerQuery = query ? query.toLowerCase() : null;
  // 准备简繁转换后的查询字符串
  let traditionalQuery: string | null = null;
  let simplifiedQuery: string | null = null;
  if (lowerQuery && enableSimplifiedTraditionalSearch) {
    const { s2tConverter, t2sConverter } = getChineseConverters();
    traditionalQuery = s2tConverter(lowerQuery);
    simplifiedQuery = t2sConverter(lowerQuery);
    // 如果转换结果与原始相同，设为null避免重复匹配
    if (traditionalQuery === lowerQuery) traditionalQuery = null;
    if (simplifiedQuery === lowerQuery) simplifiedQuery = null;
  }
  const hasTagFilter = tagIds && tagIds.length > 0;

  // 预先构建标签查找表，优化搜索速度 (O(M) -> O(1))
  const tagLookup = new Map<string, LocalTag>();
  if (tagGroups) {
    for (const g of tagGroups) {
      // 检查 g.tags 是否存在，避免潜在的 undefined 错误
      if (Array.isArray(g.tags)) {
        for (const t of g.tags) {
          tagLookup.set(t.name.toLowerCase(), t);
        }
      }
    }
  }

  // 使用栈进行非递归遍历
  const stack = [rootPath];
  let loops = 0;

  try {
    while (stack.length > 0) {
      const currentDir = stack.pop()!;

      loops++;
      if (loops % 100 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }

      try {
        // 关键优化：withFileTypes: true 返回 Dirent 对象，包含文件类型信息
        // 从而避免了对每个文件都调用 stat (昂贵的系统调用)
        const dirents = await fs.readdir(currentDir, { withFileTypes: true });

        for (const dirent of dirents) {
          const name = dirent.name;
          const fullPath = path.join(currentDir, name);
          const isDirectory = dirent.isDirectory();

          // 1. Filename Filter
          let nameMatch = true;
          if (lowerQuery) {
            const lowerName = name.toLowerCase();
            nameMatch = lowerName.includes(lowerQuery) ||
              (traditionalQuery !== null && lowerName.includes(traditionalQuery)) ||
              (simplifiedQuery !== null && lowerName.includes(simplifiedQuery));
          }

          if (isDirectory) {
            // 如果是目录
            // 在没有标签筛选且名字匹配时加入结果
            if (!hasTagFilter && nameMatch) {
              // 只有确认为结果时才调用 stat 获取详情
              try {
                const stats = await fs.stat(fullPath);
                results.push({
                  name,
                  path: fullPath,
                  isDirectory: true,
                  size: stats.size,
                  modified: stats.mtime,
                });
              } catch { }
            }
            // 继续递归
            stack.push(fullPath);
            continue;
          }

          // 是文件：先进行名字筛选
          if (!nameMatch) continue;

          // 2. Tag Filter
          const rawTagNames = parseTagsFromFilename(name);
          if (hasTagFilter && rawTagNames.length === 0) continue;

          // 解析标签 (使用优化后的查找表)
          const matchedTags: LocalTag[] = [];
          const unmatchedTags: string[] = [];

          rawTagNames.forEach(tagName => {
            const lowerName = tagName.toLowerCase();
            const found = tagLookup.get(lowerName);
            if (found) matchedTags.push(found);
            else unmatchedTags.push(tagName);
          });

          const tempTags = unmatchedTags.map(tagName => ({
            id: `temp_${Date.now()}_${Math.random()}`,
            name: tagName,
            color: getDefaultTagColor(tagName),
            textcolor: '#ffffff',
            groupId: 'temporary'
          }));

          const allTags = [...matchedTags, ...tempTags];

          if (hasTagFilter) {
            const fileTagIds = allTags.map(t => t.id);
            let tagMatch = false;
            // 优化：检查逻辑应该简单快速
            if (matchAllTags) {
              tagMatch = tagIds!.every(id => fileTagIds.includes(id));
            } else {
              tagMatch = tagIds!.some(id => fileTagIds.includes(id));
            }

            if (!tagMatch) continue;
          }

          // 匹配成功！现在才调用 stat 获取文件详情
          try {
            // 只有通过了所有过滤器的文件才会执行这一步，大幅减少 syscall
            const stats = await fs.stat(fullPath);
            results.push({
              name,
              path: fullPath,
              isDirectory: false,
              size: stats.size,
              modified: stats.mtime,
            });
            if (allTags.length > 0) {
              fileTagsMap[fullPath] = allTags;
            }
          } catch (e) {
            // stat 失败则忽略该文件
          }
        }
      } catch (e) {
        // ignore dir read error
      }
    }
  } catch (e) {
    console.error('Search failed:', e);
    return { files: [], fileTags: {} };
  }

  return { files: results, fileTags: fileTagsMap };
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

// 创建新文件夹（避免重名，使用“新建文件夹 (n)”命名）
ipcMain.handle('create-folder', async (event, parentPath: string, name: string) => {
  try {
    const baseName = name || '新建文件夹';
    let targetPath = path.join(parentPath, baseName);
    let counter = 1;
    // 如果已存在，则追加递增编号
    while (fs.existsSync(targetPath)) {
      targetPath = path.join(parentPath, `${baseName} (${counter})`);
      counter += 1;
    }
    await fsPromises.mkdir(targetPath, { recursive: false });
    return { success: true, path: targetPath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '创建文件夹失败' };
  }
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

// 生成唯一文件名的辅助函数（类似 Windows 11 的命名规则）
async function generateUniqueFileName(targetPath: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);

  let targetFilePath = path.join(targetPath, fileName);

  // 如果文件不存在，直接返回原名
  try {
    await fsPromises.access(targetFilePath);
  } catch {
    return targetFilePath;
  }

  // 文件存在，尝试生成唯一名称
  // Windows 11 风格: "文件 - 副本.ext", "文件 - 副本 (2).ext", "文件 - 副本 (3).ext"
  let counter = 1;
  let newFileName: string;

  // 先尝试 "文件 - 副本.ext"
  newFileName = `${baseName} - 副本${ext}`;
  targetFilePath = path.join(targetPath, newFileName);

  try {
    await fsPromises.access(targetFilePath);
  } catch {
    return targetFilePath;
  }

  // 如果 "文件 - 副本.ext" 也存在，尝试 "文件 - 副本 (n).ext"
  counter = 2;
  while (counter < 1000) { // 防止无限循环
    newFileName = `${baseName} - 副本 (${counter})${ext}`;
    targetFilePath = path.join(targetPath, newFileName);

    try {
      await fsPromises.access(targetFilePath);
      counter++;
    } catch {
      return targetFilePath;
    }
  }

  // 如果超过 1000 个副本，使用时间戳
  newFileName = `${baseName} - 副本 (${Date.now()})${ext}`;
  return path.join(targetPath, newFileName);
}

// 文件操作处理器（移动/复制文件）
ipcMain.handle('perform-file-operation', async (event, request: {
  operation: 'move' | 'copy';
  files: string[];
  targetPath: string;
  operationId?: string;
  autoRename?: boolean; // 新增：是否自动重命名同名文件
}) => {
  const { operation, files, targetPath, operationId, autoRename = false } = request;
  const processedFiles: string[] = [];
  const resultPaths: string[] = []; // 新增：记录实际目标路径（可能被重命名）
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
        let targetFilePath = path.join(targetPath, fileName);

        // 检查目标文件是否已存在
        try {
          await fsPromises.access(targetFilePath);
          // 目标文件存在
          if (autoRename) {
            // 自动重命名
            targetFilePath = await generateUniqueFileName(targetPath, fileName);
          } else {
            // 不自动重命名，报错
            failedFiles.push({
              path: filePath,
              error: '目标位置已存在同名文件'
            });
            continue;
          }
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
        resultPaths.push(targetFilePath);

        // Send progress update
        if (operationId && mainWindow) {
          mainWindow.webContents.send('file-operation-progress', {
            operationId,
            currentFile: path.basename(targetFilePath),
            processedCount: processedFiles.length,
            totalCount: files.length,
            processedSize: 0, // TODO: Add size tracking if needed
            totalSize: 0
          });
        }
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
      resultPaths, // 新增：返回实际的目标路径
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

// 在文件资源管理器中显示并选中文件
ipcMain.handle('show-item-in-folder', async (event, filePath: string) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '在资源管理器中打开失败'
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

// 清除所有缓存数据（包括磁盘上的所有应用数据）
ipcMain.handle('clear-all-cache', async () => {
  try {
    const results = {
      userDataCleared: false,
      storeCleared: false,
      clearedItems: [] as string[],
      errors: [] as string[],
    };

    const userDataPath = app.getPath('userData');
    console.log('Clearing cache in userData path:', userDataPath);

    // 1. 清除 electron-store 设置（在删除文件之前先清除）
    try {
      const store = new Store();
      store.clear();
      results.storeCleared = true;
      console.log('Electron store cleared');
    } catch (error) {
      const errMsg = `清除设置失败: ${error instanceof Error ? error.message : '未知错误'}`;
      results.errors.push(errMsg);
      console.error(errMsg);
    }

    // 2. 清除 userData 目录下的所有应用数据
    // 需要保留的系统目录（Electron 自动管理的）
    const preserveList = ['Crashpad', 'blob_storage', 'Code Cache', 'DawnCache', 'DawnWebGPUCache'];

    if (fs.existsSync(userDataPath)) {
      try {
        const items = await fsPromises.readdir(userDataPath);

        for (const item of items) {
          // 跳过需要保留的系统目录
          if (preserveList.includes(item)) {
            continue;
          }

          const itemPath = path.join(userDataPath, item);
          try {
            const stats = await fsPromises.stat(itemPath);
            if (stats.isDirectory()) {
              await fsPromises.rm(itemPath, { recursive: true, force: true });
            } else {
              await fsPromises.unlink(itemPath);
            }
            results.clearedItems.push(item);
            console.log('Cleared:', item);
          } catch (itemError) {
            const errMsg = `清除 ${item} 失败: ${itemError instanceof Error ? itemError.message : '未知错误'}`;
            results.errors.push(errMsg);
            console.error(errMsg);
          }
        }

        results.userDataCleared = results.clearedItems.length > 0 || items.length === 0;
      } catch (error) {
        const errMsg = `读取目录失败: ${error instanceof Error ? error.message : '未知错误'}`;
        results.errors.push(errMsg);
        console.error(errMsg);
      }
    } else {
      results.userDataCleared = true;
    }

    return {
      success: results.errors.length === 0,
      userDataPath,
      ...results,
    };
  } catch (error) {
    console.error('Clear cache error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '清除缓存时发生错误',
    };
  }
});

// 自动更新配置
if (app.isPackaged) {
  autoUpdater.autoDownload = false;
  // 禁止退出时自动安装更新，只在用户明确点击"安装更新"时才安装
  autoUpdater.autoInstallOnAppQuit = false;

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

// 删除文件/目录：支持移动至回收站或永久删除
ipcMain.handle('delete-files', async (event, request: {
  mode: 'trash' | 'permanent';
  files: string[];
}) => {
  const { mode, files } = request;
  const processedFiles: string[] = [];
  const failedFiles: { path: string; error: string }[] = [];

  try {
    for (const filePath of files) {
      try {
        // 检查文件是否存在
        try {
          await fsPromises.access(filePath);
        } catch {
          failedFiles.push({ path: filePath, error: '文件不存在' });
          continue;
        }

        if (mode === 'trash') {
          // 移动到系统回收站
          await shell.trashItem(filePath);
        } else {
          // 永久删除（文件或目录）
          const stats = await fsPromises.stat(filePath);
          if (stats.isDirectory()) {
            await fsPromises.rm(filePath, { recursive: true, force: true });
          } else {
            await fsPromises.unlink(filePath);
          }
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
      failedFiles
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除操作失败'
    };
  }
});