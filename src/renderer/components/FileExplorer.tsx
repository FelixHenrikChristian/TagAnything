import React, { useState, useEffect } from 'react';
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
  const [gridSize, setGridSize] = useState<number>(3); // 1=大, 2=中, 3=小, 4=超小
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

  // 使用Canvas生成视频缩略图
  const generateCanvasThumbnail = async (videoPath: string, thumbnailPath: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';
        
        // 设置超时机制
        const timeout = setTimeout(() => {
          console.warn('Video thumbnail generation timeout for:', videoPath);
          resolve(null);
        }, 10000); // 10秒超时
        
        video.onloadedmetadata = () => {
          try {
            // 设置到视频10%的位置，但不超过30秒
            const seekTime = Math.min(video.duration * 0.1, 30);
            video.currentTime = seekTime;
          } catch (error) {
            console.error('Error setting video time:', error);
            clearTimeout(timeout);
            resolve(null);
          }
        };
        
        video.onseeked = async () => {
          try {
            clearTimeout(timeout);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              resolve(null);
              return;
            }
            
            // 设置缩略图尺寸，保持宽高比
            const aspectRatio = video.videoWidth / video.videoHeight;
            canvas.width = 200;
            canvas.height = Math.round(200 / aspectRatio);
            
            // 绘制视频帧到canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 转换为base64并保存
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            
            try {
              await window.electron.saveThumbnail(thumbnailPath, imageData);
              resolve(thumbnailPath);
            } catch (saveError) {
              console.error('Error saving thumbnail:', saveError);
              resolve(null);
            }
          } catch (error) {
            console.error('Canvas thumbnail generation error:', error);
            clearTimeout(timeout);
            resolve(null);
          }
        };
        
        video.onerror = (error) => {
          console.error('Video loading error for:', videoPath, error);
          clearTimeout(timeout);
          resolve(null);
        };
        
        video.onabort = () => {
          console.warn('Video loading aborted for:', videoPath);
          clearTimeout(timeout);
          resolve(null);
        };
        
        // 加载视频 - 使用file://协议
        const fileUrl = videoPath.startsWith('file://') ? videoPath : `file:///${videoPath.replace(/\\/g, '/')}`;
        video.src = fileUrl;
        video.load();
      } catch (error) {
        console.error('Error in generateCanvasThumbnail:', error);
        resolve(null);
      }
    });
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

  // 移除重复的formatFileSize函数，使用导入的版本
  const getGridItemSize = () => {
    switch (gridSize) {
      case 1: return { xs: 12, sm: 6, md: 3, lg: 2 }; // 超大
      case 2: return { xs: 12, sm: 6, md: 4, lg: 3 }; // 大
      case 3: return { xs: 12, sm: 6, md: 4, lg: 4 }; // 中 (默认)
      case 4: return { xs: 6, sm: 4, md: 3, lg: 3 }; // 小
      case 5: return { xs: 6, sm: 3, md: 2, lg: 2 }; // 超小
      default: return { xs: 12, sm: 6, md: 4, lg: 4 };
    }
  };

  const getIconSize = () => {
    switch (gridSize) {
      case 1: return 80; // 超大
      case 2: return 64; // 大
      case 3: return 48; // 中 (默认)
      case 4: return 36; // 小
      case 5: return 28; // 超小
      default: return 48;
    }
  };

  const renderGridView = () => {
    const gridItemSize = getGridItemSize();
    const iconSize = getIconSize();
    
    return (
      <Grid container spacing={2}>
        {files.map((file) => (
          <Grid item {...gridItemSize} key={file.path}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
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
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Box sx={{ mb: 1 }}>
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
                          width: iconSize,
                          height: iconSize,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      />
                    ) : (
                      <FileIcon sx={{ fontSize: iconSize, color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
                    )
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getDisplayName(file.name)}
                </Typography>
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
                           fontSize: '0.65rem',
                           height: '18px',
                           border: tagStyle.border,
                           '& .MuiChip-label': {
                             px: 0.5
                           }
                         }}
                       />
                     );
                   })}
                 </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
              <IconButton
                size="small"
                onClick={() => setGridSize(Math.min(5, gridSize + 1))}
                disabled={gridSize >= 5}
                sx={{ p: 0.5 }}
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <Slider
                value={6 - gridSize} // 反转值：1变成5，5变成1
                onChange={(_, newValue) => setGridSize(6 - (newValue as number))} // 反转回来
                min={1}
                max={5}
                step={1}
                size="small"
                sx={{ width: 80 }}
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