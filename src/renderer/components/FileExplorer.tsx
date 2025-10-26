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
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ArrowBack as BackIcon,
  Home as HomeIcon,
  ViewList as ListViewIcon,
  ViewModule as GridViewIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Label as LabelIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Location, FileItem, Tag, TagGroup } from '../types';
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

const FileExplorer: React.FC<FileExplorerProps> = ({ tagDisplayStyle = 'original' }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [gridSize, setGridSize] = useState<number>(3); // 1=最大，递增越小
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    file: FileItem | null;
  } | null>(null);
  
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

    window.addEventListener('locationSelected', handleLocationSelectedEvent as EventListener);

    return () => {
      window.removeEventListener('locationSelected', handleLocationSelectedEvent as EventListener);
    };
  }, []);

  // 读取最新标签库（优先localStorage）
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
    await loadFiles(location.path, effectiveGroups);
    // 递归扫描所有文件以解析标签
    await scanAllFilesForTags(location.path, effectiveGroups);
  };

  const handleNavigate = async (path: string) => {
    setCurrentPath(path);
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

  const handleBack = () => {
    if (currentPath && currentLocation) {
      const parentPath = currentPath.split(/[/\\]/).slice(0, -1).join('/');
      if (parentPath && parentPath !== currentLocation.path.slice(0, -1)) {
        handleNavigate(parentPath);
      } else {
        handleNavigate(currentLocation.path);
      }
    }
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

    const pathParts = currentPath.replace(currentLocation.path, '').split(/[/\\]/).filter(Boolean);

    return (
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => handleNavigate(currentLocation.path)}
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
              onClick={() => handleNavigate(partPath)}
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
        {files.map((file) => (
          <Card
            key={file.path}
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
          >
            {/* 标签覆盖层 - 位于顶部 */}
            {getFileTags(file).length > 0 && (
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
                }}
              >
                {getFileTags(file).slice(0, 2).map((tag, index) => {
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
                        fontSize: '0.6rem',
                        height: '18px',
                        border: tagStyle.border,
                        opacity: 0.9,
                        backdropFilter: 'blur(4px)',
                        '& .MuiChip-label': {
                          px: 0.4
                        }
                      }}
                    />
                  );
                })}
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
                    src={`file://${videoThumbnails.get(file.path)}`}
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
                      '& .MuiChip-label': {
                        px: 0.4
                      }
                    }}
                  />
                )}
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
                  }}
                >
                  {getDisplayName(file.name)}
                </Typography>
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
      {files.map((file) => (
        <ListItem
          key={file.path}
          button
          onClick={() => {
            if (file.isDirectory) {
              handleNavigate(file.path);
            } else {
              handleFileOpen(file);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, file)}
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
                    src={`file://${videoThumbnails.get(file.path)}`}
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
            primary={getDisplayName(file.name)}
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
                          '& .MuiChip-label': {
                            px: 0.5
                          }
                        }}
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            title="刷新文件和标签"
            size="small"
          >
            <RefreshIcon />
          </IconButton>

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
        <Chip
          icon={<FolderIcon />}
          label={`${files.filter(f => f.isDirectory).length} 个文件夹`}
          variant="outlined"
          size="small"
        />
        <Chip
          icon={<FileIcon />}
          label={`${files.filter(f => !f.isDirectory).length} 个文件`}
          variant="outlined"
          size="small"
        />
      </Box>

      {/* File Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {files.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              此文件夹为空
            </Typography>
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
    </Box>
  );
};

export default FileExplorer;