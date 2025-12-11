export interface Location {
    id: string;
    name: string;
    path: string;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    textcolor?: string; // 标签文字颜色
    groupId?: string; // 标签所属的组ID
}

export interface TagGroup {
    id: string;
    name: string;
    defaultColor: string; // 标签组的默认颜色
    defaultTextColor?: string; // 标签组的默认文字颜色
    description?: string; // 标签组描述
    tags: Tag[];
}

export interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modified: Date;
    tags?: string[];
}

// 文件操作相关类型
export interface DraggedFile {
    name: string;
    path: string;
    size: number;
}

export interface FileOperationRequest {
    operation: 'move' | 'copy';
    files: string[]; // 源文件路径数组
    targetPath: string; // 目标目录路径
}

export interface FileOperationResult {
    success: boolean;
    error?: string;
    processedFiles?: string[]; // 成功处理的文件路径
    failedFiles?: { path: string; error: string }[]; // 失败的文件及错误信息
}

declare global {
    interface Window {
        electron: {
            selectFolder: () => Promise<string>;
            getFiles: (folderPath: string) => Promise<FileItem[]>;
            getAllFiles: (folderPath: string) => Promise<FileItem[]>;
            searchFiles: (params: {
                rootPath: string;
                tagGroups: TagGroup[];
                tagIds?: string[];
                query?: string;
                matchAllTags?: boolean;
            }) => Promise<{ files: FileItem[]; fileTags?: { [path: string]: Tag[] } }>;
            openFile: (filePath: string) => Promise<void>;
            createFolder: (parentPath: string, name: string) => Promise<{ success: boolean; path?: string; error?: string }>;
            showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
            generateVideoThumbnail: (videoPath: string) => Promise<string>;
            isVideoFile: (filePath: string) => Promise<boolean>;
            resetWindowSize: () => Promise<{ width: number; height: number } | null>;
            performFileOperation: (request: FileOperationRequest) => Promise<FileOperationResult>;
            deleteFiles: (request: { mode: 'trash' | 'permanent'; files: string[] }) => Promise<{
                success: boolean;
                processedFiles?: string[];
                failedFiles?: { path: string; error: string }[];
                error?: string;
            }>;
            renameFile: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
            openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
            getVersion: () => Promise<string>;
            // 设置相关 API
            getSetting: (key: string, defaultValue?: any) => Promise<any>;
            setSetting: (key: string, value: any) => Promise<void>;
            // 自动更新 API
            checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
            downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
            installUpdate: () => Promise<{ success: boolean; error?: string }>;
            // 缓存管理 API
            clearAllCache: () => Promise<{
                success: boolean;
                userDataPath?: string;
                userDataCleared?: boolean;
                storeCleared?: boolean;
                clearedItems?: string[];
                errors?: string[];
                error?: string;
            }>;
            // 自动更新事件监听
            onUpdateChecking: (callback: () => void) => () => void;
            onUpdateAvailable: (callback: (info: any) => void) => () => void;
            onUpdateNotAvailable: (callback: (info: any) => void) => () => void;
            onUpdateError: (callback: (error: string) => void) => () => void;
            onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void;
            onUpdateDownloaded: (callback: (info: any) => void) => () => void;
        };
    }
}