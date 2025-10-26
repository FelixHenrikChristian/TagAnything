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
      openFile: (filePath: string) => Promise<void>;
      generateVideoThumbnail: (videoPath: string) => Promise<string>;
      isVideoFile: (filePath: string) => Promise<boolean>;
      resetWindowSize: () => Promise<{ width: number; height: number } | null>;
      performFileOperation: (request: FileOperationRequest) => Promise<FileOperationResult>;
    };
  }
}