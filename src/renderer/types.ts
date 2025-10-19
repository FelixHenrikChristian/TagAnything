export interface Location {
  id: string;
  name: string;
  path: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
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

declare global {
  interface Window {
    electron: {
      selectFolder: () => Promise<string>;
      getFiles: (folderPath: string) => Promise<FileItem[]>;
      openFile: (filePath: string) => Promise<void>;
    };
  }
}