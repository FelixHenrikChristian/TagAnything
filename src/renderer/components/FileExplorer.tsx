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
} from '@mui/icons-material';
import { Location, FileItem } from '../types';

interface FileExplorerProps {}

const FileExplorer: React.FC<FileExplorerProps> = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
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

  const renderGridView = () => (
    <Grid container spacing={2}>
      {files.map((file) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={file.path}>
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
                {getFileIcon(file)}
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

      {/* File Grid */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {files.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              此文件夹为空
            </Typography>
          </Box>
        ) : (
          renderGridView()
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