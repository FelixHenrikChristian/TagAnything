import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  Slider,
  FormControl,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ArrowBack as BackIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  MoreVert as MoreIcon,
  Sort as SortIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Label as LabelIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Archive as ArchiveIcon,
  Code as CodeIcon,
  AudioFile as AudioIcon,
  VideoFile as VideoIcon,
} from '@mui/icons-material';
import { Location, FileItem, Tag, TagGroup, DraggedFile, FileOperationRequest, FileOperationResult } from '../types';
import { 
  parseTagsFromFilename, 
  createTagsFromNames, 
  createTemporaryTags,
  getDisplayName, 
  getFileTypeColor, 
  formatFileSize 
} from '../utils/fileTagParser';

interface FileExplorerProps {
  tagDisplayStyle?: 'original' | 'library';
}

// 排序类型枚举
type SortType = 'name' | 'modified' | 'type' | 'size';
  type SortDirection = 'asc' | 'desc';

// 筛选类型接口
  interface TagFilter {
    type: 'tag';
    tagId: string;
    tagName: string;
    timestamp: number;
    origin?: 'fileExplorer' | 'tagManager';
    currentPath?: string;
  }

  interface FilenameSearchFilter {
    type: 'filename';
    query: string;
    timestamp: number;
    origin?: 'appBar' | 'fileExplorer';
    currentPath?: string;
    // 是否要求立即执行（用于输入法组合结束时）
    immediate?: boolean;
    // 是否清除所有筛选与搜索（用于地址栏点击/切换目录/清除按钮）
    clearAll?: boolean;
  }

interface FileOperationDialog {
  open: boolean;
  files: DraggedFile[];
  targetPath: string;
}

// 添加文件操作状态接口
interface FileOperationStatus {
  isOperating: boolean;
  operation: 'copy' | 'move' | null;
  progress: number;
  currentFile: string;
  totalFiles: number;
  completedFiles: number;
}

// 添加通知状态接口
interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const FileExplorer: React.FC<FileExplorerProps> = ({ tagDisplayStyle = 'original' }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [gridSize, setGridSize] = useState<number>(6); // 1=最大，递增越小，默认下调一级

  // 加载已缓存的缩放等级
  useEffect(() => {
    const savedGridSize = localStorage.getItem('tagAnything_gridSize');
    if (savedGridSize) {
      const parsed = parseInt(savedGridSize, 10);
      if (!Number.isNaN(parsed)) {
        setGridSize(parsed);
      }
    }
  }, []);

  // 缓存缩放等级到本地
  useEffect(() => {
    localStorage.setItem('tagAnything_gridSize', String(gridSize));
  }, [gridSize]);

  // 监听重置事件，重置缩放等级并清除缓存
  useEffect(() => {
    const resetHandler = () => {
      setGridSize(6); // 重置时也使用下调一级的默认值
      localStorage.removeItem('tagAnything_gridSize');
    };
    window.addEventListener('ta:reset-grid-zoom', resetHandler);
    return () => {
      window.removeEventListener('ta:reset-grid-zoom', resetHandler);
    };
  }, []);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    file: FileItem | null;
  } | null>(null);
  
  // 标签菜单相关状态
  const [tagContextMenu, setTagContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    tag: Tag | null;
    file: FileItem | null;
  } | null>(null);
  
  // 排序相关状态
  const [sortType, setSortType] = useState<SortType>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // 筛选相关状态
  const [tagFilter, setTagFilter] = useState<TagFilter | null>(null);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [nameFilterQuery, setNameFilterQuery] = useState<string | null>(null);
  // 记录最新的筛选与搜索条件，避免事件监听闭包导致读取旧值
  const tagFilterRef = useRef<TagFilter | null>(null);
  const nameFilterQueryRef = useRef<string | null>(null);
  useEffect(() => { tagFilterRef.current = tagFilter; }, [tagFilter]);
  useEffect(() => { nameFilterQueryRef.current = nameFilterQuery; }, [nameFilterQuery]);
  // 文件名搜索防抖
  const filenameSearchDebounceRef = useRef<number | null>(null);
  const FILENAME_SEARCH_DEBOUNCE_MS = 200;
  useEffect(() => {
    return () => {
      if (filenameSearchDebounceRef.current) {
        window.clearTimeout(filenameSearchDebounceRef.current);
        filenameSearchDebounceRef.current = null;
      }
    };
  }, []);
  
  // 拖拽文件操作状态
  const [fileOperationDialog, setFileOperationDialog] = useState<FileOperationDialog>({
    open: false,
    files: [],
    targetPath: ''
  });
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  // 外部文件拖拽激活状态（用于让覆盖层响应拖拽事件）
  const [isExternalDragActive, setIsExternalDragActive] = useState<boolean>(false);
  // 绑定到组件根容器，便于查找父级 Paper
  const rootRef = useRef<HTMLDivElement | null>(null);
  // 记录在 Paper 上的拖拽深度，避免在内部元素之间移动导致误判离开
  const [paperDragDepth, setPaperDragDepth] = useState<number>(0);
  
  // 添加文件操作状态管理
  const [operationStatus, setOperationStatus] = useState<FileOperationStatus>({
    isOperating: false,
    operation: null,
    progress: 0,
    currentFile: '',
    totalFiles: 0,
    completedFiles: 0
  });
  
  // 添加通知状态管理
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // 拖拽状态管理
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedTag: Tag | null;
    targetFile: FileItem | null;
    insertPosition: number;
    previewPosition: { x: number; y: number } | null;
    sourceFilePath: string | null;
    sourceIndex: number | null;
  }>({
    isDragging: false,
    draggedTag: null,
    targetFile: null,
    insertPosition: -1,
    previewPosition: null,
    sourceFilePath: null,
    sourceIndex: null,
  });

  // 标签相关状态
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [fileTags, setFileTags] = useState<Map<string, Tag[]>>(new Map());
  
  // 视频缩略图缓存
  const [videoThumbnails, setVideoThumbnails] = useState<Map<string, string>>(new Map());
  
  // 容器宽度测量（用于精确计算列间距，避免换行）
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerClientWidth, setContainerClientWidth] = useState<number>(0);
  useLayoutEffect(() => {
     const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const style = window.getComputedStyle(containerRef.current);
      const paddingLeft = parseFloat(style.paddingLeft || '0');
      const paddingRight = parseFloat(style.paddingRight || '0');
      setContainerClientWidth(rect.width - paddingLeft - paddingRight);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [currentLocation, files, viewMode]);
  
  // 从 localStorage 加载缓存的缩略图
  useEffect(() => {
    const savedThumbnails = localStorage.getItem('tagAnything_videoThumbnails');
    if (savedThumbnails) {
      try {
        const thumbnailsArray = JSON.parse(savedThumbnails);
        setVideoThumbnails(new Map(thumbnailsArray));
      } catch (error) {
        console.error('Error loading cached thumbnails:', error);
      }
    }
  }, []);
  
  // 保存缩略图缓存到 localStorage
  const saveThumbnailsToCache = (thumbnails: Map<string, string>) => {
    try {
      const thumbnailsArray = Array.from(thumbnails.entries());
      localStorage.setItem('tagAnything_videoThumbnails', JSON.stringify(thumbnailsArray));
    } catch (error) {
      console.error('Error saving thumbnails to cache:', error);
    }
  };

  // 加载保存的数据
  useEffect(() => {
    const savedLocations = localStorage.getItem('tagAnything_locations');
    if (savedLocations) {
      const parsedLocations = JSON.parse(savedLocations);
      setLocations(parsedLocations);

      // 先尝试加载标签组，避免后续解析时为空
      const savedTagGroups = localStorage.getItem('tagAnything_tagGroups');
      if (savedTagGroups) {
        setTagGroups(JSON.parse(savedTagGroups));
      }
      
      // 检查是否有选中的位置
      const selectedLocation = localStorage.getItem('tagAnything_selectedLocation');
      if (selectedLocation) {
        const parsedSelectedLocation = JSON.parse(selectedLocation);
        handleLocationSelect(parsedSelectedLocation);
      } else if (parsedLocations.length > 0) {
        handleLocationSelect(parsedLocations[0]);
      }
    }

    // 如果没有标签组，创建默认标签组
    if (tagGroups.length === 0) {
      const savedTagGroups = localStorage.getItem('tagAnything_tagGroups');
      if (savedTagGroups) {
        setTagGroups(JSON.parse(savedTagGroups));
      } else {
        const defaultGroup: TagGroup = {
          id: 'default',
          name: '默认标签组',
          defaultColor: '#2196f3',
          description: '系统默认标签组',
          tags: []
        };
        setTagGroups([defaultGroup]);
      }
    }

    const handleLocationSelectedEvent = (event: CustomEvent) => {
      const selectedLocation = event.detail;
      handleLocationSelect(selectedLocation);
    };

    // 标签筛选事件监听器
  const handleTagFilterEvent = (event: CustomEvent) => {
    const filterData = event.detail;
    console.log('🔍 FileExplorer收到筛选事件:', filterData);
    console.log('🔍 当前路径:', currentPath);
    console.log('🔍 当前文件数量:', files.length);
    setTagFilter(filterData);
    setIsFiltering(true);
    // 触发筛选逻辑
    performTagFilter(filterData);
  };

  // 文件名搜索事件监听器
  const handleFilenameSearchEvent = (event: CustomEvent) => {
    const detail: FilenameSearchFilter = event.detail;
    const query = detail?.query || '';
    console.log('🔎 FileExplorer收到文件名搜索事件:', detail);
    // 防止处理自身派发的事件，避免递归
    if (detail?.origin === 'fileExplorer') {
      return;
    }
    // 若为全量清除，内部重置但不再派发事件（避免循环）
    if (detail?.clearAll) {
      clearFilter({ notify: false });
      return;
    }
    setNameFilterQuery(query);
    setIsFiltering(!!query || !!tagFilterRef.current);
    // 清除上一次防抖定时器
    if (filenameSearchDebounceRef.current) {
      window.clearTimeout(filenameSearchDebounceRef.current);
      filenameSearchDebounceRef.current = null;
    }
    // 立即执行（用于输入法组合结束场景）
    if (detail?.immediate) {
      performFilenameSearch(query, detail?.currentPath);
      return;
    }
    // 防抖执行
    filenameSearchDebounceRef.current = window.setTimeout(() => {
      performFilenameSearch(query, detail?.currentPath);
      filenameSearchDebounceRef.current = null;
    }, FILENAME_SEARCH_DEBOUNCE_MS);
  };

    window.addEventListener('locationSelected', handleLocationSelectedEvent as EventListener);
    window.addEventListener('tagFilter', handleTagFilterEvent as EventListener);
    window.addEventListener('filenameSearch', handleFilenameSearchEvent as EventListener);

    return () => {
      window.removeEventListener('locationSelected', handleLocationSelectedEvent as EventListener);
      window.removeEventListener('tagFilter', handleTagFilterEvent as EventListener);
      window.removeEventListener('filenameSearch', handleFilenameSearchEvent as EventListener);
    };
  }, []);

  // 读取最新标签库（优先localStorage）

  // 监听全局拖拽事件
  useEffect(() => {
    const handleGlobalDragStart = (event: CustomEvent) => {
      const { tag, sourceFilePath = null, sourceIndex = null } = event.detail || {};
      if (tag) {
        setDragState(prev => ({
          ...prev,
          isDragging: true,
          draggedTag: tag,
          sourceFilePath,
          sourceIndex,
        }));
      }
    };

    const handleGlobalDragEnd = () => {
      setDragState(prev => ({
        ...prev,
        isDragging: false,
        draggedTag: null,
        targetFile: null,
        insertPosition: -1,
        previewPosition: null,
        sourceFilePath: null,
        sourceIndex: null,
      }));
    };

    window.addEventListener('tagDragStart', handleGlobalDragStart as EventListener);
    window.addEventListener('tagDragEnd', handleGlobalDragEnd as EventListener);

    return () => {
      window.removeEventListener('tagDragStart', handleGlobalDragStart as EventListener);
      window.removeEventListener('tagDragEnd', handleGlobalDragEnd as EventListener);
    };
  }, []);

  // 监听窗口级外部文件拖拽，激活覆盖层以捕获更大范围的拖拽事件
  useEffect(() => {
    const onWindowDragEnter = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsExternalDragActive(true);
        // 允许页面上的投放
        e.preventDefault();
      }
    };

    const onWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsExternalDragActive(true);
        // 允许页面上的投放
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
      }
    };

    const deactivate = () => {
      setIsExternalDragActive(false);
    };

    window.addEventListener('dragenter', onWindowDragEnter);
    window.addEventListener('dragover', onWindowDragOver);
    window.addEventListener('dragleave', deactivate);
    window.addEventListener('drop', deactivate);

    return () => {
      window.removeEventListener('dragenter', onWindowDragEnter);
      window.removeEventListener('dragover', onWindowDragOver);
      window.removeEventListener('dragleave', deactivate);
      window.removeEventListener('drop', deactivate);
    };
  }, []);

  // 在父级 Paper 节点上扩展拖拽可投放区域
  useEffect(() => {
    const paperEl = rootRef.current?.closest('.MuiPaper-root') as HTMLElement | null;
    if (!paperEl) return;

    const handleNativeDragEnter = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        setPaperDragDepth((d) => d + 1);
        setIsDragOver(true);
      }
    };

    const handleNativeDragOver = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
        setIsDragOver(true);
      }
    };

    const handleNativeDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 使用深度计数避免在 Paper 内部移动被误判为离开
      setPaperDragDepth((d) => {
        const next = Math.max(0, d - 1);
        if (next === 0) {
          setIsDragOver(false);
        }
        return next;
      });
    };

    const handleNativeDrop = (e: DragEvent) => {
      // 仅处理外部文件投放，避免拦截内部标签的投放
      const isExternalFiles = e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
      if (!isExternalFiles) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setPaperDragDepth(0);

      const files = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
      if (files.length === 0) return;

      const draggedFiles: DraggedFile[] = files.map((file) => ({
        name: file.name,
        path: (file as any).path || file.name,
        size: file.size,
      }));

      // 打开确认对话框
      setFileOperationDialog({
        open: true,
        files: draggedFiles,
        targetPath: currentPath,
      });
    };

    paperEl.addEventListener('dragenter', handleNativeDragEnter);
    paperEl.addEventListener('dragover', handleNativeDragOver);
    paperEl.addEventListener('dragleave', handleNativeDragLeave);
    paperEl.addEventListener('drop', handleNativeDrop);

    return () => {
      paperEl.removeEventListener('dragenter', handleNativeDragEnter);
      paperEl.removeEventListener('dragover', handleNativeDragOver);
      paperEl.removeEventListener('dragleave', handleNativeDragLeave);
      paperEl.removeEventListener('drop', handleNativeDrop);
    };
  }, [currentPath]);

  // 同步当前路径到localStorage，供其他组件使用
  useEffect(() => {
    try {
      localStorage.setItem('tagAnything_currentPath', currentPath || '');
    } catch (e) {
      console.warn('⚠️ 无法写入localStorage当前路径:', e);
    }
  }, [currentPath]);
  const getEffectiveTagGroups = (): TagGroup[] => {
    const savedTagGroups = localStorage.getItem('tagAnything_tagGroups');
    if (savedTagGroups) {
      try {
        return JSON.parse(savedTagGroups);
      } catch {
        return tagGroups;
      }
    }
    return tagGroups;
  };

  const handleLocationSelect = async (location: Location) => {
    // 确保使用最新标签库
    const effectiveGroups = getEffectiveTagGroups();
    setTagGroups(effectiveGroups);

    setCurrentLocation(location);
    setCurrentPath(location.path);
    // 切换目录时清空筛选与搜索
    clearFilter();
    await loadFiles(location.path, effectiveGroups);
    // 递归扫描所有文件以解析标签
    await scanAllFilesForTags(location.path, effectiveGroups);
  };

  const handleNavigate = async (path: string) => {
    setCurrentPath(path);
    // 目录导航时清空筛选与搜索
    clearFilter();
    await loadFiles(path);
  };

  const loadFiles = async (path: string, groups?: TagGroup[]) => {
    try {
      const fileList = await window.electron.getFiles(path);
      setFiles(fileList);
      // 解析文件标签并更新标签系统（使用传入的标签库或当前状态）
      parseFileTagsAndUpdateSystem(fileList, groups);
      
      // 为视频文件生成缩略图
      await generateVideoThumbnails(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    }
  };

  // 将本地文件路径转换为跨平台的 file URL（Windows 支持）
  const toFileUrl = (p: string) => 'file:///' + p.replace(/\\/g, '/');

  // 生成视频缩略图 - 使用FFmpeg主进程
  const generateVideoThumbnails = async (fileList: FileItem[]) => {
    const videoFiles = fileList.filter(file => !file.isDirectory);
    const newThumbnails = new Map(videoThumbnails);
    let hasNewThumbnails = false;

    for (const file of videoFiles) {
      // 检查是否已有缓存的缩略图
      if (newThumbnails.has(file.path)) continue;

      try {
        // 检查是否为视频文件
        const isVideo = await window.electron.isVideoFile(file.path);
        if (!isVideo) continue;

        // 使用主进程FFmpeg生成缩略图
        const thumbnailPath = await window.electron.generateVideoThumbnail(file.path);
        if (thumbnailPath) {
          newThumbnails.set(file.path, thumbnailPath);
          hasNewThumbnails = true;
        }
      } catch (error) {
        console.error(`Error generating thumbnail for ${file.path}:`, error);
      }
    }

    if (hasNewThumbnails) {
      setVideoThumbnails(newThumbnails);
      saveThumbnailsToCache(newThumbnails);
    }
  };



  // 递归扫描所有文件以解析标签
  const scanAllFilesForTags = async (rootPath: string, groups?: TagGroup[]) => {
    try {
      console.log('开始递归扫描文件标签...');
      const allFiles = await window.electron.getAllFiles(rootPath);
      console.log(`扫描到 ${allFiles.length} 个文件和文件夹`);

      const filesOnly = allFiles.filter(file => !file.isDirectory);
      console.log(`其中 ${filesOnly.length} 个文件`);

      const newFileTags = new Map<string, Tag[]>();

      filesOnly.forEach(file => {
        const tagNames = parseTagsFromFilename(file.name);
        if (tagNames.length > 0) {
          const usedGroups = groups ?? tagGroups;
          const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, usedGroups);
          const temporaryTags = createTemporaryTags(unmatchedTags);
          const allTags = [...matchedTags, ...temporaryTags];
          if (allTags.length > 0) {
            newFileTags.set(file.path, allTags);
          }
        }
      });

      const updatedFileTags = new Map(fileTags);
      newFileTags.forEach((tags, path) => {
        updatedFileTags.set(path, tags);
      });
      setFileTags(updatedFileTags);

      console.log('文件标签扫描完成');
    } catch (error) {
      console.error('递归扫描文件标签时出错:', error);
    }
  };

  // 解析文件标签，只匹配现有标签库，不修改标签库
  const parseFileTagsAndUpdateSystem = (fileList: FileItem[], groups?: TagGroup[]) => {
    const newFileTags = new Map<string, Tag[]>();

    fileList.forEach(file => {
      if (!file.isDirectory) {
        const tagNames = parseTagsFromFilename(file.name);
        if (tagNames.length > 0) {
          const usedGroups = groups ?? tagGroups;
          const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, usedGroups);
          const temporaryTags = createTemporaryTags(unmatchedTags);
          const allTags = [...matchedTags, ...temporaryTags];
          if (allTags.length > 0) {
            newFileTags.set(file.path, allTags);
          }
        }
      }
    });

    setFileTags(newFileTags);
  };

  // 刷新当前目录的文件和标签
  const handleRefresh = async () => {
    if (currentLocation) {
      const effectiveGroups = getEffectiveTagGroups();
      setTagGroups(effectiveGroups);

      // 重新加载当前路径的文件，而不是重置到根位置
      await loadFiles(currentPath, effectiveGroups);
      // 重新扫描当前位置的所有文件以解析标签
      await scanAllFilesForTags(currentLocation.path, effectiveGroups);

      // 如果当前处于筛选状态，也刷新当前显示文件的缩略图
      try {
        if (isFiltering && filteredFiles.length > 0) {
          await generateVideoThumbnails(filteredFiles);
        }
      } catch (e) {
        console.warn('⚠️ 刷新缩略图失败:', e);
      }
    }
  };

  // 重复的旧版 loadFiles 已移除，保留支持 groups 的实现

  // 递归扫描所有文件以解析标签
  // 重复的旧版 scanAllFilesForTags 已移除，保留支持 groups 的实现

  // 解析文件标签，只匹配现有标签库，不修改标签库
  // 重复的旧版 parseFileTagsAndUpdateSystem 已移除，保留支持 groups 的实现

  // 获取文件的标签
  const getFileTags = (file: FileItem): Tag[] => {
    return fileTags.get(file.path) || [];
  };

  // 递归搜索带指定标签的文件
  const searchFilesByTag = async (dirPath: string, targetTagId: string): Promise<FileItem[]> => {
    const foundFiles: FileItem[] = [];
    
    // 首先找到目标标签的名称
    const effectiveGroups = getEffectiveTagGroups();
    let targetTagName = '';
    for (const group of effectiveGroups) {
      const tag = group.tags.find(t => t.id === targetTagId);
      if (tag) {
        targetTagName = tag.name;
        break;
      }
    }
    
    if (!targetTagName) {
      console.error(`未找到ID为 ${targetTagId} 的标签`);
      return foundFiles;
    }
    
    try {
      const files = await window.electron.getFiles(dirPath);
      
      for (const file of files) {
        if (file.isDirectory) {
          // 递归搜索子目录
          const subFiles = await searchFilesByTag(file.path, targetTagId);
          foundFiles.push(...subFiles);
        } else {
          // 检查文件是否包含目标标签
          const tagNames = parseTagsFromFilename(file.name);
          if (tagNames.length > 0) {
            // 直接按标签名称匹配，不依赖ID
            const hasTargetTag = tagNames.some(tagName => 
              tagName.toLowerCase() === targetTagName.toLowerCase()
            );
            if (hasTargetTag) {
              foundFiles.push(file);
            }
          }
        }
      }
    } catch (error) {
      console.error(`搜索目录 ${dirPath} 时出错:`, error);
    }
    
    return foundFiles;
  };

  // 执行标签筛选
  const performTagFilter = async (filter: TagFilter) => {
    try {
      console.log(`🔍 开始搜索标签: ${filter.tagName} (ID: ${filter.tagId})`);
      console.log('🔍 筛选来源:', filter.origin || '未知');
      console.log('🔍 当前路径(state):', currentPath);
      console.log('🔍 当前路径(event):', filter.currentPath);
      console.log('🔍 当前文件数量:', files.length);
      
      let foundFiles: FileItem[] = [];
      const targetPath = filter.currentPath || currentPath;
      const effectiveGroups = getEffectiveTagGroups();
      
      if (targetPath) {
        if (filter.origin === 'fileExplorer') {
          // 仅在当前目录非递归搜索
          console.log('🔍 在当前目录非递归搜索...', targetPath);
          try {
            const entries = await window.electron.getFiles(targetPath);
            for (const file of entries) {
              if (!file.isDirectory) {
                const tagNames = parseTagsFromFilename(file.name);
                if (tagNames.length > 0) {
                  const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                  const temporaryTags = createTemporaryTags(unmatchedTags);
                  const allTags = [...matchedTags, ...temporaryTags];
                  const hasTargetTag = allTags.some(tag => tag.id === filter.tagId);
                  if (hasTargetTag) {
                    foundFiles.push(file);
                    console.log(`✅ 非递归匹配文件: ${file.name}`);
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ 非递归搜索当前目录时出错:', error);
          }
        } else {
          // 默认递归搜索（例如来源于TagManager）
          console.log('🔍 在当前目录递归搜索...', targetPath);
          try {
            const allFiles = await window.electron.getAllFiles(targetPath);
            console.log(`🔍 在目录 ${targetPath} 中递归找到 ${allFiles.length} 个文件/夹`);
            for (const file of allFiles) {
              if (!file.isDirectory) {
                const tagNames = parseTagsFromFilename(file.name);
                if (tagNames.length > 0) {
                  const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                  const temporaryTags = createTemporaryTags(unmatchedTags);
                  const allTags = [...matchedTags, ...temporaryTags];
                  const hasTargetTag = allTags.some(tag => tag.id === filter.tagId);
                  if (hasTargetTag) {
                    foundFiles.push(file);
                    console.log(`✅ 找到匹配文件: ${file.name}`);
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ 递归搜索当前目录时出错:', error);
          }
        }
      } else {
        // 如果没有当前路径，进行全局搜索（递归）
        console.log('🔍 进行全局搜索...');
        const savedLocations = localStorage.getItem('tagAnything_locations');
        const availableLocations: Location[] = savedLocations ? JSON.parse(savedLocations) : [];
        console.log('🔍 可用位置:', availableLocations.map((l: Location) => ({ name: l.name, path: l.path })));
        
        if (availableLocations.length === 0) {
          console.log('⚠️ 没有找到任何已添加的位置，请先在位置管理中添加文件夹');
          setFilteredFiles([]);
          return;
        }
        
        for (const location of availableLocations) {
          console.log(`🔍 搜索位置: ${location.name} (${location.path})`);
          try {
            const allFiles = await window.electron.getAllFiles(location.path);
            console.log(`🔍 在位置 ${location.name} 中找到 ${allFiles.length} 个文件`);
            for (const file of allFiles) {
              if (!file.isDirectory) {
                const tagNames = parseTagsFromFilename(file.name);
                if (tagNames.length > 0) {
                  const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                  const temporaryTags = createTemporaryTags(unmatchedTags);
                  const allTags = [...matchedTags, ...temporaryTags];
                  const hasTargetTag = allTags.some(tag => tag.id === filter.tagId);
                  if (hasTargetTag) {
                    foundFiles.push(file);
                    console.log(`✅ 找到匹配文件: ${file.name} (位置: ${location.name})`);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`❌ 搜索位置 ${location.name} 时出错:`, error);
          }
        }
      }
      
      // 若存在文件名搜索，取交集
      try {
        const q = (nameFilterQueryRef.current || '').trim().toLowerCase();
        if (q) {
          foundFiles = foundFiles.filter(file => {
            const displayName = getDisplayName(file.name).toLowerCase();
            return displayName.includes(q);
          });
        }
      } catch (e) {
        console.warn('⚠️ 在标签筛选结果上应用文件名搜索失败:', e);
      }

      // 根据筛选结果更新文件标签缓存
      try {
        const updatedFileTags = new Map(fileTags);
        for (const file of foundFiles) {
          if (!file.isDirectory) {
            const tagNames = parseTagsFromFilename(file.name);
            if (tagNames.length > 0) {
              const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
              const temporaryTags = createTemporaryTags(unmatchedTags);
              const allTags = [...matchedTags, ...temporaryTags];
              updatedFileTags.set(file.path, allTags);
            }
          }
        }
        setFileTags(updatedFileTags);
      } catch (e) {
        console.warn('⚠️ 更新筛选结果标签缓存失败:', e);
      }

      // 为筛选结果生成视频缩略图
      try {
        await generateVideoThumbnails(foundFiles);
      } catch (e) {
        console.warn('⚠️ 为筛选结果生成缩略图失败:', e);
      }

      setFilteredFiles(foundFiles);
      console.log(`🔍 筛选完成，找到 ${foundFiles.length} 个包含标签 "${filter.tagName}" 的文件`);
      console.log('🔍 筛选结果:', foundFiles.map(f => ({ name: f.name, path: f.path })));
    } catch (error) {
      console.error('❌ 执行标签筛选时出错:', error);
      setFilteredFiles([]);
    }
  };

  // 执行文件名搜索（仅当前目录及其子目录）
  const performFilenameSearch = async (query: string, fromPath?: string) => {
    try {
      const q = (query || '').trim().toLowerCase();
      if (!q) {
        setNameFilterQuery(null);
        // 如果仍有标签筛选，使其生效并保持筛选状态
        if (tagFilterRef.current) {
          await performTagFilter(tagFilterRef.current);
          setIsFiltering(true);
        } else {
          setFilteredFiles([]);
          setIsFiltering(false);
        }
        return;
      }

      const targetPath = fromPath || currentPath;
      if (!targetPath) {
        console.log('⚠️ 文件名搜索未指定当前路径，已忽略');
        setFilteredFiles([]);
        return;
      }

      console.log('🔎 开始文件名搜索（递归）:', { query: q, targetPath });
      let foundFiles: FileItem[] = [];
      try {
        const allEntries = await window.electron.getAllFiles(targetPath);
        for (const entry of allEntries) {
          if (!entry.isDirectory) {
            const displayName = getDisplayName(entry.name).toLowerCase();
            if (displayName.includes(q)) {
              foundFiles.push(entry);
            }
          }
        }
      } catch (error) {
        console.error('❌ 递归获取文件列表时出错:', error);
      }

      // 若存在标签筛选，取二者交集
      try {
        const activeTagFilter = tagFilterRef.current;
        if (activeTagFilter) {
          const effectiveGroups = getEffectiveTagGroups();
          foundFiles = foundFiles.filter(file => {
            const tagNames = parseTagsFromFilename(file.name);
            if (tagNames.length === 0) return false;
            const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
            const temporaryTags = createTemporaryTags(unmatchedTags);
            const allTags = [...matchedTags, ...temporaryTags];
            return allTags.some(tag => tag.id === activeTagFilter.tagId);
          });
        }
      } catch (e) {
        console.warn('⚠️ 在搜索结果上应用标签筛选失败:', e);
      }

      // 为搜索结果生成视频缩略图
      try {
        await generateVideoThumbnails(foundFiles);
      } catch (e) {
        console.warn('⚠️ 为搜索结果生成缩略图失败:', e);
      }

      setFilteredFiles(foundFiles);
      setIsFiltering(true);
      console.log(`🔎 文件名搜索完成，找到 ${foundFiles.length} 个匹配文件`);
    } catch (error) {
      console.error('❌ 执行文件名搜索时出错:', error);
      setFilteredFiles([]);
    }
  };

  // 清除筛选
  const clearFilter = (opts?: { notify?: boolean }) => {
    setTagFilter(null);
    setIsFiltering(false);
    setFilteredFiles([]);
    setNameFilterQuery(null);
    // 清理可能存在的搜索防抖定时器
    if (filenameSearchDebounceRef.current) {
      try { window.clearTimeout(filenameSearchDebounceRef.current); } catch {}
      filenameSearchDebounceRef.current = null;
    }
    try {
      localStorage.removeItem('tagAnything_filter');
    } catch {}
    // 通知上层（AppBar）也清空搜索框与筛选提示
    if (opts?.notify !== false) {
      try {
        const currentPathInfo = currentPath;
        const detail = {
          type: 'filename',
          query: '',
          timestamp: Date.now(),
          origin: 'fileExplorer' as const,
          currentPath: currentPathInfo,
          clearAll: true,
        } as any;
        window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));
      } catch {}
    }
  };

  // 获取标签样式
  const getTagStyle = (tag: Tag) => {
    if (tag.groupId === 'temporary') {
      // 临时标签始终使用虚线边框样式
      return {
        variant: 'filled' as const,
        backgroundColor: tag.color + '40',
        borderColor: tag.color,
        color: '#fff',
        border: '1px dashed ' + tag.color,
      };
    }

    if (tagDisplayStyle === 'library') {
      // 标签库样式：使用标签的背景色和文字色
      return {
        variant: 'filled' as const,
        backgroundColor: tag.color,
        color: tag.textcolor || '#fff',
        borderColor: tag.color,
      };
    } else {
      // 原始样式：浅色背景，彩色边框和文字
      return {
        variant: 'outlined' as const,
        backgroundColor: tag.color + '20',
        borderColor: tag.color,
        color: tag.color,
      };
    }
  };

  const handleFileOpen = async (file: FileItem) => {
    try {
      await window.electron.openFile(file.path);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const handleBack = async () => {
    if (isFiltering) {
      clearFilter();
    }
    if (currentPath && currentLocation) {
      // 统一分隔符并计算父路径，避免因路径分隔符不一致导致错误
      const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
      const curr = normalize(currentPath);
      const root = normalize(currentLocation.path);
      const parent = curr.split('/').slice(0, -1).join('/');

      // 若父路径仍在根路径下且不等于根，则导航到父路径；否则回到根
      const target = parent.startsWith(root) && parent !== root ? parent : currentLocation.path;
      await handleNavigate(target);

      // 返回后补齐当前目录的视频缩略图（使用刚刚导航到的路径，而不是依赖state）
      try {
        const fileList = await window.electron.getFiles(target);
        await generateVideoThumbnails(fileList);
      } catch (e) {
        console.warn('⚠️ 返回后刷新缩略图失败:', e);
      }
    }
  };

  // 面包屑点击：在筛选状态下先退出筛选再导航
  const handleBreadcrumbNavigate = async (path: string) => {
    if (isFiltering) {
      clearFilter();
    }
    await handleNavigate(path);
  };

  const handleContextMenu = (event: React.MouseEvent, file: FileItem) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      file,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // 标签菜单处理函数
  const handleTagContextMenu = (event: React.MouseEvent, tag: Tag, file: FileItem) => {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡到文件卡片
    setTagContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      tag,
      file,
    });
  };

  const handleCloseTagContextMenu = () => {
    setTagContextMenu(null);
  };

  // 处理标签筛选
  const handleFilterByTag = (tag: Tag) => {
    console.log('🏷️ FileExplorer卡片标签点击筛选:', tag);
    const filterInfo = {
      type: 'tag' as const,
      tagId: tag.id,
      tagName: tag.name,
      timestamp: Date.now(),
      origin: 'fileExplorer' as const,
    };
    
    console.log('🏷️ FileExplorer创建筛选信息:', filterInfo);
    try {
      localStorage.setItem('tagAnything_filter', JSON.stringify(filterInfo));
    } catch {}
    setTagFilter(filterInfo);
    setIsFiltering(true);
    performTagFilter(filterInfo);
    handleCloseTagContextMenu();
  };

  // 从文件中删除标签
  const handleRemoveTagFromFile = async (tag: Tag, file: FileItem) => {
    try {
      console.log('🗑️ 从文件中删除标签:', { file: file.name, tag: tag.name });
      
      // 获取当前文件的所有标签
      const currentTags = getFileTags(file);
      
      // 过滤掉要删除的标签
      const remainingTags = currentTags.filter(t => t.id !== tag.id);
      
      // 生成新的文件名
      const displayName = getDisplayName(file.name);
      
      let newFileName: string;
      if (remainingTags.length > 0) {
        const tagNames = remainingTags.map(t => t.name);
        newFileName = `[${tagNames.join(' ')}]${displayName}`;
      } else {
        // 如果没有剩余标签，直接使用显示名称
        newFileName = displayName;
      }
      
      // 如果文件名没有变化，不需要重命名
      if (newFileName === file.name) {
        console.log('文件名没有变化，无需重命名');
        handleCloseTagContextMenu();
        return;
      }
      
      const oldPath = file.path;
      const newPath = oldPath.replace(file.name, newFileName);
      
      console.log('重命名文件:', { oldPath, newPath });
      
      // 调用重命名API
      const result = await window.electron.renameFile(oldPath, newPath);
      
      if (result.success) {
        console.log('✅ 标签删除成功');
        
        // 显示成功通知
        setNotification({
          open: true,
          message: `已从文件 "${displayName}" 中删除标签 "${tag.name}"`,
          severity: 'success'
        });
        
        // 刷新文件列表
        await loadFiles(currentPath);
      } else {
        console.error('❌ 标签删除失败:', result.error);
        
        // 显示错误通知
        setNotification({
          open: true,
          message: `删除标签失败: ${result.error}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('删除标签时发生错误:', error);
      
      // 显示错误通知
      setNotification({
        open: true,
        message: `删除标签时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        severity: 'error'
      });
    } finally {
      handleCloseTagContextMenu();
    }
  };

  // 处理标签拖拽到文件
  const handleTagDrop = async (file: FileItem, draggedTag: Tag, event: React.DragEvent) => {
    try {
      console.log('🏷️ 标签拖拽到文件:', { file: file.name, tag: draggedTag.name });
      
      // 获取当前文件的标签
      const currentTags = getFileTags(file);
      
      // 检查标签是否已存在
      const tagExists = currentTags.some(tag => tag.id === draggedTag.id);
      if (tagExists) {
        setNotification({
          open: true,
          message: `文件 "${file.name}" 已经包含标签 "${draggedTag.name}"`,
          severity: 'info'
        });
        return;
      }
      
      // 添加标签到末尾
      const newTags = [...currentTags, draggedTag];
      await updateFileWithTags(file, newTags);
      
      setNotification({
        open: true,
        message: `成功为文件 "${file.name}" 添加标签 "${draggedTag.name}"`,
        severity: 'success'
      });
    } catch (error) {
      console.error('处理标签拖拽失败:', error);
      setNotification({
        open: true,
        message: `添加标签失败: ${error}`,
        severity: 'error'
      });
    }
  };

  // 处理标签拖拽到特定位置
  const handleTagDropWithPosition = async (file: FileItem, draggedTag: Tag, insertPosition: number) => {
    try {
      console.log('🏷️ 标签拖拽到特定位置:', { 
        file: file.name, 
        tag: draggedTag.name, 
        position: insertPosition 
      });
      
      // 获取当前文件的标签
      const currentTags = getFileTags(file);
      
      // 检查标签是否已存在
      const tagExists = currentTags.some(tag => tag.id === draggedTag.id);
      if (tagExists) {
        setNotification({
          open: true,
          message: `文件 "${file.name}" 已经包含标签 "${draggedTag.name}"`,
          severity: 'info'
        });
        return;
      }
      
      // 根据插入位置创建新的标签数组
      let newTags: Tag[];
      if (insertPosition === -1 || insertPosition >= currentTags.length) {
        // 插入到末尾
        newTags = [...currentTags, draggedTag];
      } else {
        // 插入到指定位置
        newTags = [
          ...currentTags.slice(0, insertPosition),
          draggedTag,
          ...currentTags.slice(insertPosition)
        ];
      }
      
      await updateFileWithTags(file, newTags);
      
      setNotification({
        open: true,
        message: `成功为文件 "${file.name}" 添加标签 "${draggedTag.name}"`,
        severity: 'success'
      });
    } catch (error) {
      console.error('处理标签拖拽到特定位置失败:', error);
      setNotification({
        open: true,
        message: `添加标签失败: ${error}`,
        severity: 'error'
      });
    }
  };

  // 同文件内标签重排
  const reorderTagWithinFile = async (file: FileItem, sourceIndex: number, targetIndex: number) => {
    try {
      const currentTags = getFileTags(file);
      if (!currentTags || currentTags.length === 0) return;

      // 拿到待移动标签
      const tagToMove = currentTags[sourceIndex];
      if (!tagToMove) return;

      // 先移除原位置
      const withoutTag = currentTags.filter((_, idx) => idx !== sourceIndex);

      // 计算插入位置（-1 或超出则插入末尾；若移至后方，需 -1 调整）
      let adjustedIndex: number;
      if (targetIndex === -1 || targetIndex >= currentTags.length) {
        adjustedIndex = withoutTag.length;
      } else {
        adjustedIndex = targetIndex;
        if (sourceIndex < targetIndex) {
          adjustedIndex = Math.max(0, targetIndex - 1);
        }
      }

      const newTags = [
        ...withoutTag.slice(0, adjustedIndex),
        tagToMove,
        ...withoutTag.slice(adjustedIndex),
      ];

      await updateFileWithTags(file, newTags);

      setNotification({
        open: true,
        message: `已重排文件 "${getDisplayName(file.name)}" 的标签`,
        severity: 'success'
      });
    } catch (error) {
      console.error('处理文件标签重排失败:', error);
      setNotification({
        open: true,
        message: `重排标签失败: ${error instanceof Error ? error.message : '未知错误'}`,
        severity: 'error'
      });
    }
  };

  // 更新文件标签（重命名文件）
  const updateFileWithTags = async (file: FileItem, newTags: Tag[]) => {
    try {
      // 获取文件的显示名称（不包含标签）
      const displayName = getDisplayName(file.name);
      
      // 构建新的文件名
      const tagNames = newTags.map(tag => tag.name);
      const newFileName = tagNames.length > 0 
        ? `[${tagNames.join(' ')}] ${displayName}`
        : displayName;
      
      // 构建新的文件路径
      const directory = file.path.substring(0, file.path.lastIndexOf('\\'));
      const newFilePath = `${directory}\\${newFileName}`;
      
      // 如果文件名没有变化，直接返回
      if (file.path === newFilePath) {
        return;
      }
      
      // 重命名文件
      const result = await window.electron.renameFile(file.path, newFilePath);
      
      if (!result.success) {
        throw new Error(result.error || '文件重命名失败');
      }
      
      // 更新本地状态
      const updatedFileTags = new Map(fileTags);
      updatedFileTags.delete(file.path); // 删除旧路径的标签
      updatedFileTags.set(newFilePath, newTags); // 添加新路径的标签
      setFileTags(updatedFileTags);
      
      // 重新加载当前目录
      if (currentPath) {
        await loadFiles(currentPath);
      }
      
      console.log('✅ 文件标签更新成功:', { oldPath: file.path, newPath: newFilePath, tags: tagNames });
    } catch (error) {
      console.error('❌ 更新文件标签失败:', error);
      throw error;
    }
  };

  // 拖拽事件处理函数
  const handleDragOver = (event: React.DragEvent) => {
    // 仅当拖拽的是外部文件时，才处理
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragEnter = (event: React.DragEvent) => {
    // 仅当拖拽的是外部文件时，才处理
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    // 仅当拖拽的是外部文件时，才处理
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      event.stopPropagation();
      // 只有当鼠标离开整个容器时才设置为false
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    // 仅当拖拽的是外部文件时，才处理
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    // 转换为DraggedFile格式
    const draggedFiles: DraggedFile[] = files.map(file => ({
      name: file.name,
      path: (file as any).path || file.name, // Electron环境下file.path包含完整路径
      size: file.size
    }));

    console.log('拖拽的文件:', draggedFiles);

    // 打开确认对话框
    setFileOperationDialog({
      open: true,
      files: draggedFiles,
      targetPath: currentPath
    });
  };

  // 关闭文件操作对话框
  const handleCloseFileOperationDialog = () => {
    setFileOperationDialog({
      open: false,
      files: [],
      targetPath: ''
    });
  };

  // 执行文件操作
  const handleFileOperation = async (operation: 'move' | 'copy') => {
    const { files, targetPath } = fileOperationDialog;
    
    // 立即关闭对话框
    handleCloseFileOperationDialog();
    
    // 设置操作状态
    setOperationStatus({
      isOperating: true,
      operation,
      progress: 0,
      currentFile: '',
      totalFiles: files.length,
      completedFiles: 0
    });
    
    // 显示开始操作的通知
    setNotification({
      open: true,
      message: `开始${operation === 'move' ? '移动' : '复制'} ${files.length} 个文件...`,
      severity: 'info'
    });
    
    try {
      // 异步执行文件操作
      setTimeout(async () => {
        try {
          const result = await window.electron.performFileOperation({
            operation,
            files: files.map(f => f.path),
            targetPath
          });

          if (result.success) {
            // 刷新文件列表
            await loadFiles(currentPath);
            
            // 显示成功通知
            setNotification({
              open: true,
              message: `${files.length} 个文件${operation === 'move' ? '移动' : '复制'}成功！`,
              severity: 'success'
            });
            
            console.log(`✅ 文件${operation === 'move' ? '移动' : '复制'}成功`);
          } else {
            // 显示错误通知
            setNotification({
              open: true,
              message: `文件${operation === 'move' ? '移动' : '复制'}失败: ${result.error}`,
              severity: 'error'
            });
            
            console.error(`❌ 文件${operation === 'move' ? '移动' : '复制'}失败:`, result.error);
          }
        } catch (error) {
          // 显示错误通知
          setNotification({
            open: true,
            message: `文件${operation === 'move' ? '移动' : '复制'}操作出错: ${error instanceof Error ? error.message : '未知错误'}`,
            severity: 'error'
          });
          
          console.error(`❌ 文件${operation === 'move' ? '移动' : '复制'}操作出错:`, error);
        } finally {
          // 重置操作状态
          setOperationStatus({
            isOperating: false,
            operation: null,
            progress: 0,
            currentFile: '',
            totalFiles: 0,
            completedFiles: 0
          });
        }
      }, 100); // 短暂延迟确保UI更新
      
    } catch (error) {
      // 立即错误处理
      setNotification({
        open: true,
        message: `启动文件操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
        severity: 'error'
      });
      
      setOperationStatus({
        isOperating: false,
        operation: null,
        progress: 0,
        currentFile: '',
        totalFiles: 0,
        completedFiles: 0
      });
    }
  };

  // 关闭通知
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // 移除重复的getFileTypeColor函数，使用导入的版本
  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) {
      return <FolderIcon sx={{ fontSize: 48, color: '#ffa726' }} />;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const iconColor = getFileTypeColor(ext);
    
    return <FileIcon sx={{ fontSize: 48, color: iconColor }} />;
  };
  const renderBreadcrumbs = () => {
    if (!currentLocation || !currentPath) return null;

    // 统一分隔符并计算相对路径，避免 Windows 路径分隔符导致替换失败
    const normalizePath = (p: string) => p.replace(/\\/g, '/');
    const root = normalizePath(currentLocation.path).replace(/\/+$/, '');
    const curr = normalizePath(currentPath).replace(/\/+$/, '');
    const relative = curr.startsWith(root) ? curr.slice(root.length) : curr;
    const pathParts = relative.split('/').filter(Boolean);

    return (
      <Breadcrumbs 
        aria-label="breadcrumb" 
        sx={{ mb: 3 }}
        onClick={() => {
          // 点击地址栏时自动清除（不改变当前目录）
          if (isFiltering || (nameFilterQueryRef.current && nameFilterQueryRef.current.trim().length > 0)) {
            clearFilter();
          }
        }}
      >
        <Link
          component="button"
          variant="body2"
          onClick={() => handleBreadcrumbNavigate(currentLocation.path)}
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {currentLocation.name}
        </Link>
        {pathParts.map((part, index) => {
          const isLast = index === pathParts.length - 1;
          const partPath = currentLocation.path + '/' + pathParts.slice(0, index + 1).join('/');
          
          return isLast ? (
            <Typography key={index} color="text.primary" variant="body2">
              {part}
            </Typography>
          ) : (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={() => handleBreadcrumbNavigate(partPath)}
              sx={{ 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              {part}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  // 缩放配置常量
  const GRID_CONFIG = {
    MAX_GRID_SIZE: 17,
    MIN_WIDTH: 80,
    MAX_WIDTH: 260,
  };

  // 移除重复的formatFileSize函数，使用导入的版本
  const getGridItemSize = () => {
    // 扩展为17级缩放：1最大，17最小，线性插值宽度
    const { MAX_GRID_SIZE, MIN_WIDTH, MAX_WIDTH } = GRID_CONFIG;
    const step = (MAX_WIDTH - MIN_WIDTH) / (MAX_GRID_SIZE - 1);
    const clamped = Math.min(MAX_GRID_SIZE, Math.max(1, gridSize));
    return Math.round(MAX_WIDTH - (clamped - 1) * step);
  };

  const getIconSize = () => {
    // 图标大小与卡片宽度成比例（约0.6），并限制上下界
    const width = getGridItemSize();
    return Math.round(Math.max(48, Math.min(120, width * 0.6)));
  };

  // 获取卡片总高度（近似值）
  const getCardHeight = () => {
    const width = getGridItemSize();
    const thumbnail = Math.floor(width * 0.6);
    const info = 52; // 与renderGridView中保持一致
    return thumbnail + info + 8;
  };

  // 排序函数
  const sortFiles = (files: FileItem[], sortType: SortType, sortDirection: SortDirection): FileItem[] => {
    const sortedFiles = [...files];
    
    // 分离文件夹和文件
    const directories = sortedFiles.filter(f => f.isDirectory);
    const regularFiles = sortedFiles.filter(f => !f.isDirectory);
    
    // 排序函数
    const getSortValue = (file: FileItem) => {
      switch (sortType) {
        case 'name':
          // 使用去掉标签后的文件名进行排序
          return getDisplayName(file.name).toLowerCase();
        case 'modified':
          return file.modified.getTime();
        case 'type':
          // 按文件扩展名排序
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          return ext;
        case 'size':
          return file.size || 0;
        default:
          return file.name.toLowerCase();
      }
    };
    
    // 排序比较函数
    const compareFunction = (a: FileItem, b: FileItem) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);
      
      let result = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        result = aValue.localeCompare(bValue, 'zh-CN', { numeric: true });
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      }
      
      return sortDirection === 'asc' ? result : -result;
    };
    
    // 分别排序文件夹和文件
    directories.sort(compareFunction);
    regularFiles.sort(compareFunction);
    
    // 文件夹始终在前面
    return [...directories, ...regularFiles];
  };
  
  // 获取排序后的文件列表
  const sortedFiles = sortFiles(isFiltering ? filteredFiles : files, sortType, sortDirection);

  const renderGridView = () => {
    const gridItemWidth = getGridItemSize();
    const iconSize = getIconSize();
    const cardHeight = getCardHeight();

    const thumbnailHeight = Math.floor(gridItemWidth * 0.6);
    const fileInfoHeight = 52; // 进一步缩短文件信息区域高度
    const tagOverlayHeight = 24;

    // 固定纵向间距，单位px
    const rowGapPx = '6px';

    const MIN_GAP = 8; // 最小间距8px

    // 使用容器的实际可用宽度（减去左右padding），避免换行误差
    const availableWidth = Math.max(0, containerClientWidth || window.innerWidth - 48);

    // 以最小间距估算当前行可容纳的卡片数量，确保不溢出
    const maxItemsWithMinGap = Math.floor((availableWidth + MIN_GAP) / (gridItemWidth + MIN_GAP));
    const itemsPerRow = Math.max(1, maxItemsWithMinGap);

    // 计算在 itemsPerRow 下的剩余空间，并用整数像素分配列间距
    const totalItemWidth = itemsPerRow * gridItemWidth;
    const remainingSpace = availableWidth - totalItemWidth;
    const gapFit = itemsPerRow > 1 ? Math.floor(remainingSpace / (itemsPerRow - 1)) : 0;
    const calculatedGap = itemsPerRow > 1 ? Math.max(MIN_GAP, gapFit) : 0;

    // 为最后一行添加占位元素以保持间距一致
    const totalFiles = files.length;
    const lastRowItems = totalFiles % itemsPerRow;
    const needPlaceholders = lastRowItems > 0 && lastRowItems < itemsPerRow;
    const placeholderCount = needPlaceholders ? itemsPerRow - lastRowItems : 0;

    // 获取文件扩展名
    const getFileExtension = (fileName: string): string => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      return ext ? ext.toUpperCase() : '';
    };
    
    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };
    
    // 格式化修改日期
    const formatModifiedDate = (date: Date): string => {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '今天';
      if (diffDays === 2) return '昨天';
      if (diffDays <= 7) return `${diffDays}天前`;
      
      return date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    return (
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          rowGap: rowGapPx,
          columnGap: `${calculatedGap}px`,
          width: '100%',
        }}
      >
        {sortedFiles.map((file) => (
          <Card
            key={file.path}
            draggable={false} // 明确禁用拖拽
            sx={{
              width: gridItemWidth,
              height: thumbnailHeight + fileInfoHeight + 8,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
            }}
            onClick={() => {
              if (file.isDirectory) {
                handleNavigate(file.path);
              } else {
                handleFileOpen(file);
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, file)}
            onDragStart={(e) => {
              // 仅阻止卡片自身的拖拽，不影响子元素（如标签芯片）的拖拽
              const target = e.target as HTMLElement | null;
              const isChip = !!target?.closest('.MuiChip-root');
              if (!isChip) {
                e.preventDefault();
              }
            }} // 仅阻止卡片本身的拖拽
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // 检查是否是标签拖拽：兼容 dataTransfer 不包含自定义类型的情况
              const isTagDragging = e.dataTransfer.types.includes('application/json') || (!!dragState.isDragging && !!dragState.draggedTag);
              if (isTagDragging) {
                e.dataTransfer.dropEffect = 'copy';

                // 当文件没有标签时，卡片本身需要声明为拖拽目标，
                // 以便展示顶部标签覆盖层与预览。否则仅有覆盖层的 onDragOver 会生效，
                // 导致空标签文件无法出现预览。
                setDragState(prev => ({
                  ...prev,
                  targetFile: file,
                  // 默认插入到末尾（-1），覆盖层会在后续更精确计算具体位置
                  insertPosition: -1,
                }));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              try {
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                  const draggedData = JSON.parse(data);
                  if (draggedData.type === 'tag' && draggedData.tag) {
                    handleTagDrop(file, draggedData.tag, e);
                    return;
                  }
                }
                // 兼容回退：使用全局拖拽状态
                if (dragState.draggedTag) {
                  handleTagDrop(file, dragState.draggedTag, e);
                }
              } catch (error) {
                console.error('处理拖拽数据失败:', error);
              }
            }}
          >
            {/* 标签覆盖层 - 位于顶部 */}
            {(getFileTags(file).length > 0 || (dragState.targetFile?.path === file.path && dragState.isDragging)) && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  right: 4,
                  zIndex: 2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.25,
                  maxHeight: tagOverlayHeight,
                  overflow: 'hidden',
                  minHeight: dragState.targetFile?.path === file.path && dragState.isDragging ? '18px' : 'auto',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // 检查是否是标签拖拽：兼容 dataTransfer 不包含自定义类型的情况
                  const isTagDragging = e.dataTransfer.types.includes('application/json') || (!!dragState.isDragging && !!dragState.draggedTag);
                  if (isTagDragging) {
                    // 同文件内重排使用 move，其他情况保持 copy
                    if (dragState.sourceFilePath && dragState.sourceFilePath === file.path) {
                      e.dataTransfer.dropEffect = 'move';
                    } else {
                      e.dataTransfer.dropEffect = 'copy';
                    }
                    
                    // 计算插入位置（按行分组 + 顺序比较中心点）
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const tagNodeList = e.currentTarget.querySelectorAll('.MuiChip-root:not(.drag-preview)');
                    const tagElements = Array.from(tagNodeList) as HTMLElement[];
                    let insertPosition = -1; // -1表示末尾
                    
                    if (tagElements.length > 0) {
                      // 将标签按行分组（flex-wrap情况下按top近似分组）
                      const thresholdY = 8; // 行判定阈值（像素）
                      const rows: { startIndex: number; endIndex: number; top: number; bottom: number }[] = [];
                      
                      for (let i = 0; i < tagElements.length; i++) {
                        const tagRect = tagElements[i].getBoundingClientRect();
                        const top = tagRect.top - rect.top;
                        const bottom = tagRect.bottom - rect.top;
                        
                        if (rows.length === 0) {
                          rows.push({ startIndex: i, endIndex: i, top, bottom });
                        } else {
                          const last = rows[rows.length - 1];
                          // 同一行：top接近上一行的top
                          if (Math.abs(top - last.top) <= thresholdY) {
                            last.endIndex = i;
                            // 行的top、bottom取当前和已有的范围
                            last.top = Math.min(last.top, top);
                            last.bottom = Math.max(last.bottom, bottom);
                          } else {
                            rows.push({ startIndex: i, endIndex: i, top, bottom });
                          }
                        }
                      }
                      
                      // 找到与鼠标y最匹配的行
                      let targetRowIndex = -1;
                      for (let r = 0; r < rows.length; r++) {
                        const row = rows[r];
                        if (y >= row.top - thresholdY && y <= row.bottom + thresholdY) {
                          targetRowIndex = r;
                          break;
                        }
                      }
                      // 若没有直接命中行，选择垂直距离最近的行
                      if (targetRowIndex === -1) {
                        let minDelta = Infinity;
                        for (let r = 0; r < rows.length; r++) {
                          const row = rows[r];
                          const midY = (row.top + row.bottom) / 2;
                          const delta = Math.abs(y - midY);
                          if (delta < minDelta) {
                            minDelta = delta;
                            targetRowIndex = r;
                          }
                        }
                      }
                      
                      const targetRow = rows[targetRowIndex];
                      // 在目标行中根据x相对于centerX顺序插入
                      let positioned = false;
                      for (let i = targetRow.startIndex; i <= targetRow.endIndex; i++) {
                        const tagRect = tagElements[i].getBoundingClientRect();
                        const tagCenterX = (tagRect.left - rect.left) + tagRect.width / 2;
                        if (x < tagCenterX) {
                          insertPosition = i; // 插入到该标签前
                          positioned = true;
                          break;
                        }
                      }
                      if (!positioned) {
                        // 鼠标在该行最后一个标签右半部分之后
                        insertPosition = targetRow.endIndex + 1;
                      }
                    }
                    
                    // 更新拖拽状态
                    setDragState(prev => ({
                      ...prev,
                      targetFile: file,
                      insertPosition,
                      previewPosition: { x: e.clientX, y: e.clientY },
                    }));
                    
                    // 存储插入位置信息
                    e.currentTarget.setAttribute('data-insert-position', insertPosition.toString());
                  }
                }}
                onDragLeave={(e) => {
                  // 检查是否真正离开了标签区域
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  
                  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    setDragState(prev => ({
                      ...prev,
                      targetFile: null,
                      insertPosition: -1,
                      previewPosition: null,
                    }));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const insertPosition = parseInt(e.currentTarget.getAttribute('data-insert-position') || '-1');
                  
                  try {
                    const data = e.dataTransfer.getData('application/json');
                    if (data) {
                      const draggedData = JSON.parse(data);
                      if (draggedData.type === 'fileTag' && draggedData.tag) {
                        const sourcePath = draggedData.sourceFilePath as string | undefined;
                        const sourceIndex = draggedData.sourceIndex as number | undefined;
                        if (sourcePath && sourceIndex !== undefined) {
                          if (sourcePath === file.path) {
                            // 同文件内重排
                            reorderTagWithinFile(file, sourceIndex, insertPosition);
                          } else {
                            // 不同文件：复制到目标文件（不移除源文件标签）
                            handleTagDropWithPosition(file, draggedData.tag, insertPosition);
                          }
                        }
                        return;
                      } else if (draggedData.type === 'tag' && draggedData.tag) {
                        // 从标签库拖拽
                        handleTagDropWithPosition(file, draggedData.tag, insertPosition);
                        return;
                      }
                    }
                    // 兼容回退：使用全局拖拽状态
                    if (dragState.draggedTag) {
                      const isSameFile = dragState.sourceFilePath && dragState.sourceFilePath === file.path;
                      if (isSameFile && dragState.sourceIndex !== null && dragState.sourceIndex !== undefined) {
                        reorderTagWithinFile(file, dragState.sourceIndex, insertPosition);
                      } else {
                        handleTagDropWithPosition(file, dragState.draggedTag, insertPosition);
                      }
                    }
                  } catch (error) {
                    console.error('处理标签拖拽数据失败:', error);
                  }
                  
                  // 清除拖拽状态
                  setDragState(prev => ({
                    ...prev,
                    targetFile: null,
                    insertPosition: -1,
                    previewPosition: null,
                    sourceFilePath: null,
                    sourceIndex: null,
                  }));
                }}
              >
                {getFileTags(file).map((tag, index) => {
                  const tagStyle = getTagStyle(tag);
                  const isTargetFile = dragState.targetFile?.path === file.path;
                  const shouldShowPreview = isTargetFile && dragState.isDragging && dragState.draggedTag;
                  const insertPos = dragState.insertPosition;
                  
                  // 如果需要在当前位置插入预览标签
                  const showPreviewBefore = shouldShowPreview && insertPos === index;
                  
                  return (
                    <React.Fragment key={index}>
                      {/* 预览标签 - 在当前标签之前 */}
                      {showPreviewBefore && dragState.draggedTag && (
                        <Chip
                          size="small"
                          label={dragState.draggedTag.name}
                          className="drag-preview"
                          sx={{
                            backgroundColor: dragState.draggedTag.color || '#1976d2',
                            color: 'white',
                            fontSize: '0.6rem',
                            height: '18px',
                            borderRadius: '4px',
                            opacity: 0.6,
                            animation: 'fadeIn 0.2s ease-in-out',
                            transform: 'scale(0.95)',
                            border: '2px dashed rgba(255,255,255,0.8)',
                            '& .MuiChip-label': {
                              px: 0.4
                            },
                            '@keyframes fadeIn': {
                              from: { opacity: 0, transform: 'scale(0.8)' },
                              to: { opacity: 0.6, transform: 'scale(0.95)' }
                            }
                          }}
                        />
                      )}
                      
                      {/* 原有标签（支持拖拽重排） */}
                      <Chip
                        size="small"
                        label={tag.name}
                        variant={tagStyle.variant}
                        sx={{
                          backgroundColor: tagStyle.backgroundColor,
                          borderColor: tagStyle.borderColor,
                          color: tagStyle.color,
                          fontSize: '0.6rem',
                          height: '18px',
                          border: tagStyle.border,
                          opacity: 0.9,
                          backdropFilter: 'blur(4px)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          transform: shouldShowPreview && insertPos <= index ? 'translateX(4px)' : 'translateX(0)',
                          '&:hover': {
                            opacity: 1,
                            transform: 'scale(1.05)',
                          },
                          '& .MuiChip-label': {
                            px: 0.4
                          }
                        }}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          // 设置拖拽数据（标记为来自文件的标签）
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            type: 'fileTag',
                            tag,
                            sourceFilePath: file.path,
                            sourceIndex: index,
                          }));
                          e.dataTransfer.effectAllowed = 'move';

                          // 创建拖拽预览
                          const dragImage = document.createElement('div');
                          dragImage.style.cssText = `
                            position: absolute;
                            top: -1000px;
                            left: -1000px;
                            background: ${tag.color || '#1976d2'};
                            color: ${tag.textcolor || '#fff'};
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: 500;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                            z-index: 9999;
                          `;
                          dragImage.textContent = tag.name;
                          document.body.appendChild(dragImage);
                          e.dataTransfer.setDragImage(dragImage, 0, 0);

                          // 发送全局拖拽开始事件（包含来源信息）
                          window.dispatchEvent(new CustomEvent('tagDragStart', {
                            detail: { tag, sourceFilePath: file.path, sourceIndex: index }
                          }));

                          // 清理拖拽预览元素
                          setTimeout(() => {
                            try { document.body.removeChild(dragImage); } catch {}
                          }, 0);
                        }}
                        onDragEnd={() => {
                          // 发送全局拖拽结束事件
                          window.dispatchEvent(new CustomEvent('tagDragEnd'));
                        }}
                        onClick={(e) => handleTagContextMenu(e, tag, file)}
                      />
                    </React.Fragment>
                  );
                })}
                
                {/* 预览标签 - 在末尾或没有标签时显示 */}
                {dragState.targetFile?.path === file.path && 
                 dragState.isDragging && 
                 dragState.draggedTag && 
                 (dragState.insertPosition === -1 || dragState.insertPosition >= getFileTags(file).length) && (
                  <Chip
                    size="small"
                    label={dragState.draggedTag.name}
                    className="drag-preview"
                    sx={{
                      backgroundColor: dragState.draggedTag.color || '#1976d2',
                      color: 'white',
                      fontSize: '0.6rem',
                      height: '18px',
                      borderRadius: '4px',
                      opacity: 0.6,
                      animation: 'fadeIn 0.2s ease-in-out',
                      transform: 'scale(0.95)',
                      border: '2px dashed rgba(255,255,255,0.8)',
                      '& .MuiChip-label': {
                        px: 0.4
                      },
                      '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'scale(0.8)' },
                        to: { opacity: 0.6, transform: 'scale(0.95)' }
                      }
                    }}
                  />
                )}
              </Box>
            )}
            
            {/* 缩略图/图标区域 - 固定高度 */}
            <Box 
              sx={{ 
                height: thumbnailHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // 移除文件夹图标的背景色，使其更自然
                backgroundColor: file.isDirectory ? 'transparent' : 'grey.50',
                position: 'relative',
              }}
            >
              {file.isDirectory ? (
                <FolderIcon sx={{ fontSize: iconSize, color: '#ffa726' }} />
              ) : (
                // 检查是否有视频缩略图
                videoThumbnails.has(file.path) ? (
                  <Box
                    component="img"
                    src={toFileUrl(videoThumbnails.get(file.path) as string)}
                    alt={file.name}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover', // 保持比例，填充容器
                    }}
                  />
                ) : (
                  <FileIcon sx={{ fontSize: iconSize, color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
                )
              )}
            </Box>
            
            {/* 文件信息区域 - 减少高度 */}
            <CardContent 
              sx={{ 
                height: fileInfoHeight,
                p: 0.5, // 进一步减少内边距
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                '&:last-child': { pb: 0.5 }
              }}
            >
              {/* 文件名和类型标签行 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0 }}>
                {!file.isDirectory && getFileExtension(file.name) && (
                  <Chip
                    size="small"
                    label={getFileExtension(file.name)}
                    sx={{
                      height: '16px',
                      fontSize: '0.6rem',
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      '& .MuiChip-label': {
                        px: 0.4
                      }
                    }}
                  />
                )}
                <Tooltip title={file.name} placement="top" arrow>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem',
                      lineHeight: 1.2,
                      flex: 1,
                      cursor: 'pointer',
                    }}
                  >
                    {getDisplayName(file.name)}
                  </Typography>
                </Tooltip>
              </Box>

              {/* 文件元数据行 */}
              {!file.isDirectory && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '0.65rem', lineHeight: 1 }}
                  >
                    {formatModifiedDate(new Date(file.modified))}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '0.65rem', lineHeight: 1 }}
                  >
                    {formatFileSize(file.size || 0)}
                  </Typography>
                </Box>
              )}

              {/* 目录信息 */}
              {file.isDirectory && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.65rem', lineHeight: 1, mt: 'auto' }}
                >
                  {formatModifiedDate(new Date(file.modified))}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
        

      </Box>
    );
  };

  const renderListView = () => (
    <List>
      {sortedFiles.map((file) => (
        <ListItem
          key={file.path}
          button
          draggable={false} // 明确禁用拖拽
          onClick={() => {
            if (file.isDirectory) {
              handleNavigate(file.path);
            } else {
              handleFileOpen(file);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, file)}
          onDragStart={(e) => e.preventDefault()} // 阻止任何拖拽开始事件
          sx={{
            borderRadius: 1,
            mb: 0.5,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'transparent' }}>
              {file.isDirectory ? (
                <FolderIcon sx={{ color: '#ffa726' }} />
              ) : (
                // 检查是否有视频缩略图
                videoThumbnails.has(file.path) ? (
                  <Box
                    component="img"
                    src={toFileUrl(videoThumbnails.get(file.path) as string)}
                    alt={file.name}
                    sx={{
                      width: 40,
                      height: 40,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  />
                ) : (
                  <FileIcon sx={{ color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
                )
              )}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Tooltip title={file.name} placement="top" arrow>
                <Typography
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {getDisplayName(file.name)}
                </Typography>
              </Tooltip>
            }
            secondary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {!file.isDirectory && (
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size || 0)}
                  </Typography>
                )}
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                  {getFileTags(file).map((tag, index) => {
                    const tagStyle = getTagStyle(tag);
                    return (
                      <Chip
                        key={index}
                        size="small"
                        label={tag.name}
                        variant={tagStyle.variant}
                        sx={{
                          backgroundColor: tagStyle.backgroundColor,
                          borderColor: tagStyle.borderColor,
                          color: tagStyle.color,
                          fontSize: '0.7rem',
                          height: '20px',
                          border: tagStyle.border,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8,
                            transform: 'scale(1.05)',
                          },
                          '& .MuiChip-label': {
                            px: 0.5
                          }
                        }}
                        onClick={(e) => handleTagContextMenu(e, tag, file)}
                      />
                    );
                  })}
                </Box>
              </Box>
            }
          />
          <IconButton
            edge="end"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, file);
            }}
          >
            <MoreIcon />
          </IconButton>
        </ListItem>
      ))}
    </List>
  );

  if (!currentLocation) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          请选择一个位置开始浏览文件
        </Typography>
        <Typography variant="body2" color="text.secondary">
          在左侧边栏的位置管理中添加文件夹
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      ref={rootRef}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        // 由覆盖层统一渲染拖拽视觉反馈，根容器保持透明
        backgroundColor: 'transparent',
        borderRadius: 1,
        position: 'relative',
        transition: 'all 0.2s ease-in-out'
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽边框覆盖整个 Paper（含内边距） */}
      <Box
        sx={{
          position: 'absolute',
          top: (theme) => `-${theme.spacing(3)}`,
          left: (theme) => `-${theme.spacing(3)}`,
          right: (theme) => `-${theme.spacing(3)}`,
          bottom: (theme) => `-${theme.spacing(3)}`,
          border: isDragOver ? '2px dashed' : '0',
          borderColor: isDragOver ? 'primary.main' : 'transparent',
          // 统一在覆盖层上显示变灰效果，确保包含 Paper 的内边距
          backgroundColor: isDragOver ? 'action.hover' : 'transparent',
          borderRadius: 2,
          pointerEvents: isExternalDragActive ? 'auto' : 'none',
          zIndex: 1000,
          transition: 'all 0.2s ease-in-out'
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={handleBack} 
            disabled={currentPath === currentLocation.path}
            sx={{ mr: 1 }}
          >
            <BackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            文件浏览器
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          
          

          {/* Refresh Button */}
          <IconButton 
            onClick={handleRefresh}
            title="刷新文件、标签和缩略图"
            size="small"
          >
            <RefreshIcon />
          </IconButton>

          {/* Sort Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
                displayEmpty
                sx={{ fontSize: '0.875rem' }}
              >
                <MenuItem value="name">文件名</MenuItem>
                <MenuItem value="modified">修改日期</MenuItem>
                <MenuItem value="type">文件类型</MenuItem>
                <MenuItem value="size">文件大小</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              size="small"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              title={sortDirection === 'asc' ? '升序' : '降序'}
            >
              {sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
            </IconButton>
          </Box>

          {/* Grid Size Slider (only show in grid view) */}
          {viewMode === 'grid' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
              <IconButton
                size="small"
                onClick={() => setGridSize(Math.min(GRID_CONFIG.MAX_GRID_SIZE, gridSize + 1))}
                disabled={gridSize >= GRID_CONFIG.MAX_GRID_SIZE}
                sx={{ p: 0.5 }}
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <Slider
                value={GRID_CONFIG.MAX_GRID_SIZE + 1 - gridSize} // 反转值：1最大→MAX_GRID_SIZE最小
                onChange={(_, newValue) => setGridSize(GRID_CONFIG.MAX_GRID_SIZE + 1 - (newValue as number))}
                min={1}
                max={GRID_CONFIG.MAX_GRID_SIZE}
                step={1}
                size="small"
                sx={{ width: 100 }}
              />
              <IconButton
                size="small"
                onClick={() => setGridSize(Math.max(1, gridSize - 1))}
                disabled={gridSize <= 1}
                sx={{ p: 0.5 }}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="grid">
              <GridViewIcon />
            </ToggleButton>
            <ToggleButton value="list">
              <ListViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* File Stats */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        {!isFiltering && (
          <Chip
            icon={<FolderIcon />}
            label={`${files.filter(f => f.isDirectory).length} 个文件夹`}
            variant="outlined"
            size="small"
          />
        )}
        <Chip
          icon={<FileIcon />}
          label={`${(isFiltering ? filteredFiles : files).filter(f => !f.isDirectory).length} 个文件`}
          variant="outlined"
          size="small"
        />
      </Box>

      {/* File Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {(isFiltering ? filteredFiles : files).length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {isFiltering ? '没有匹配的文件' : '此文件夹为空'}
            </Typography>
            {isFiltering && (
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => clearFilter()}
                startIcon={<ClearIcon />}
              >
                清除筛选/搜索
              </Button>
            )}
          </Box>
        ) : (
          viewMode === 'grid' ? renderGridView() : renderListView()
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleCloseContextMenu}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>重命名</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCloseContextMenu}>
          <ListItemIcon>
            <LabelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>添加标签</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCloseContextMenu}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>复制</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCloseContextMenu}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>删除</ListItemText>
        </MenuItem>
      </Menu>

      {/* Tag Context Menu */}
      <Menu
        open={tagContextMenu !== null}
        onClose={handleCloseTagContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          tagContextMenu !== null
            ? { top: tagContextMenu.mouseY, left: tagContextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => tagContextMenu?.tag && handleFilterByTag(tagContextMenu.tag)}>
          <ListItemIcon>
            <FilterListIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>显示此标签的文件</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => tagContextMenu?.tag && tagContextMenu?.file && handleRemoveTagFromFile(tagContextMenu.tag, tagContextMenu.file)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>从文件中删除标签</ListItemText>
        </MenuItem>
      </Menu>

      {/* 文件操作确认对话框 */}
      <Dialog
        open={fileOperationDialog.open}
        onClose={handleCloseFileOperationDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileIcon color="primary" />
            <Typography variant="h6">文件操作确认</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              目标路径：
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                backgroundColor: 'background.paper', 
                border: 1,
                borderColor: 'divider',
                p: 1, 
                borderRadius: 1,
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}
            >
              {fileOperationDialog.targetPath}
            </Typography>
          </Box>

          <Typography variant="subtitle1" gutterBottom>
            要操作的文件 ({fileOperationDialog.files.length} 个)：
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>文件名</TableCell>
                  <TableCell>大小</TableCell>
                  <TableCell>原路径</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fileOperationDialog.files.map((file, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileIcon fontSize="small" />
                        <Typography variant="body2">{file.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          wordBreak: 'break-all'
                        }}
                      >
                        {file.path}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={handleCloseFileOperationDialog}
            variant="outlined"
          >
            取消
          </Button>
          <Button 
            onClick={() => handleFileOperation('copy')}
            variant="contained"
            color="primary"
            startIcon={<CopyIcon />}
          >
            复制
          </Button>
          <Button 
            onClick={() => handleFileOperation('move')}
            variant="contained"
            color="primary"
            startIcon={<ArrowUpwardIcon />}
          >
            移动
          </Button>
        </DialogActions>
      </Dialog>

      {/* 操作进度指示器 */}
      {operationStatus.isOperating && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            p: 2,
            boxShadow: 3,
            minWidth: 300,
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" fontWeight="medium">
              正在{operationStatus.operation === 'move' ? '移动' : '复制'}文件...
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {operationStatus.completedFiles} / {operationStatus.totalFiles} 个文件
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={(operationStatus.completedFiles / operationStatus.totalFiles) * 100}
            sx={{ mt: 1 }}
          />
        </Box>
      )}

      {/* 通知组件 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FileExplorer;