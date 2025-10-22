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
} from '@mui/icons-material';
import { Location, FileItem } from '../types';

interface FileExplorerProps {}

const FileExplorer: React.FC<FileExplorerProps> = () => {
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

  // 加载保存的数据
  useEffect(() => {
    const savedLocations = localStorage.getItem('tagAnything_locations');
    if (savedLocations) {
      const parsedLocations = JSON.parse(savedLocations);
      setLocations(parsedLocations);
      
      // 检查是否有选中的位置
      const selectedLocation = localStorage.getItem('tagAnything_selectedLocation');
      if (selectedLocation) {
        const parsedSelectedLocation = JSON.parse(selectedLocation);
        handleLocationSelect(parsedSelectedLocation);
      } else if (parsedLocations.length > 0) {
        handleLocationSelect(parsedLocations[0]);
      }
    }

    // 监听位置选择事件
    const handleLocationSelectedEvent = (event: CustomEvent) => {
      const selectedLocation = event.detail;
      handleLocationSelect(selectedLocation);
    };

    window.addEventListener('locationSelected', handleLocationSelectedEvent as EventListener);

    return () => {
      window.removeEventListener('locationSelected', handleLocationSelectedEvent as EventListener);
    };
  }, []);

  const handleLocationSelect = async (location: Location) => {
    setCurrentLocation(location);
    setCurrentPath(location.path);
    await loadFiles(location.path);
  };

  const handleNavigate = async (path: string) => {
    setCurrentPath(path);
    await loadFiles(path);
  };

  const loadFiles = async (path: string) => {
    try {
      const fileList = await window.electron.getFiles(path);
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
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

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) {
      return <FolderIcon sx={{ fontSize: 48, color: '#ffa726' }} />;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const iconColor = getFileTypeColor(ext);
    
    return <FileIcon sx={{ fontSize: 48, color: iconColor }} />;
  };

  const getFileTypeColor = (extension?: string) => {
    const colorMap: { [key: string]: string } = {
      'pdf': '#f44336',
      'doc': '#2196f3',
      'docx': '#2196f3',
      'txt': '#757575',
      'jpg': '#4caf50',
      'jpeg': '#4caf50',
      'png': '#4caf50',
      'gif': '#4caf50',
      'mp4': '#9c27b0',
      'avi': '#9c27b0',
      'mp3': '#ff9800',
      'wav': '#ff9800',
    };
    
    return colorMap[extension || ''] || '#607d8b';
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
                    <FileIcon sx={{ fontSize: iconSize, color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
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
                  {file.name}
                </Typography>
                {!file.isDirectory && (
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size || 0)}
                  </Typography>
                )}
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip size="small" label="标签1" variant="outlined" />
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
                <FileIcon sx={{ color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
              )}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={file.name}
            secondary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {!file.isDirectory && (
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size || 0)}
                  </Typography>
                )}
                <Chip size="small" label="标签1" variant="outlined" />
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