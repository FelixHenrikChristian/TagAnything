import { FileItem, DraggedFile, Tag } from '../../types';

// 排序类型枚举
export type SortType = 'name' | 'modified' | 'type' | 'size';
export type SortDirection = 'asc' | 'desc';

// 搜索范围类型
export type SearchScope = 'current' | 'recursive';
// 标签匹配模式
export type TagMatchMode = 'all' | 'any';

// 统一的标签筛选接口（合并了单标签和多标签筛选）
export interface TagFilter {
    type: 'tag';
    tagIds: string[];           // 单标签时为 [id]，多标签时为 [id1, id2, ...]
    tagNames?: string[];        // 用于显示
    matchMode: TagMatchMode;    // 'all' = AND逻辑, 'any' = OR逻辑
    timestamp: number;
    currentPath?: string;
}

// 保留 MultiTagFilter 类型别名以兼容旧代码
/** @deprecated Use TagFilter with tagIds array instead */
export type MultiTagFilter = TagFilter;

// 文件名搜索筛选
export interface FilenameSearchFilter {
    type: 'filename';
    query: string;
    timestamp: number;
    currentPath?: string;
    // 是否要求立即执行（用于输入法组合结束时）
    immediate?: boolean;
    // 是否清除所有筛选与搜索（用于地址栏点击/切换目录/清除按钮）
    clearAll?: boolean;
}

// 简化的筛选状态（统一了单标签和多标签筛选）
export interface FilterState {
    tagFilter: TagFilter | null;
    nameFilterQuery: string | null;
    isRecursive: boolean;  // 是否递归搜索（适用于标签和文件名筛选）
}

// 历史记录条目，用于后退/前进功能
export interface HistoryEntry {
    path: string;
    filterState: FilterState;
    timestamp: number;
}

export interface FileOperationDialogState {
    open: boolean;
    files: DraggedFile[];
    targetPath: string;
    pickerMode?: boolean;        // 是否显示内置目录选择器
    pickerRoot?: string;         // 选择器根路径（位置根目录）
    pickerBrowsePath?: string;   // 选择器当前浏览路径
    pickerViewMode?: 'list' | 'grid'; // 选择器视图模式
    pickerSearchQuery?: string;  // 目录搜索关键词
}

// 添加文件操作状态接口
export interface FileOperationStatus {
    id: string; // Unique ID for the operation
    isOperating: boolean;
    operation: 'copy' | 'move' | null;
    progress: number;
    currentFile: string;
    totalFiles: number;
    completedFiles: number;
}



// 重命名对话框状态
export interface RenameDialogState {
    open: boolean;
    file: FileItem | null;
    inputName: string;
}

// 添加标签对话框状态
export interface AddTagDialogState {
    open: boolean;
    file: FileItem | null;
    selectedTagIds: string[];
}

// 删除标签对话框状态
export interface DeleteTagDialogState {
    open: boolean;
    file: FileItem | null;
    selectedTagIds: string[];
}

// 文件详情对话框状态
export interface DetailsDialogState {
    open: boolean;
    file: FileItem | null;
}

// 直接操作对话框（用于右键的移动/复制），内置目录选择器，限制在当前位置根目录下
export interface DirectOperationDialogState {
    open: boolean;
    operation: 'move' | 'copy';
    files: DraggedFile[];
    rootPath: string; // 限制范围（currentLocation.path）
    browsePath: string; // 当前浏览目录
    viewMode?: 'list' | 'grid'; // 视图模式
    searchQuery?: string;  // 目录搜索关键词
}

export interface DeleteConfirmDialogState {
    open: boolean;
    files: DraggedFile[];
}

export interface NewFolderDialogState {
    open: boolean;
    inputName: string;
}

export interface DragState {
    isDragging: boolean;
    draggedTag: Tag | null;
    sourceFilePath: string | null;
    sourceIndex: number | null;
    targetFile: FileItem | null;
    insertPosition: number;
    previewPosition: { x: number; y: number } | null;
}
