import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  Tooltip,
  Fab,
  Divider,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FolderOpen as FolderOpenIcon,
  Storage as StorageIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import { Location } from '../types';

const LocationManager: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationName, setLocationName] = useState('');
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // 加载保存的数据
  useEffect(() => {
    const savedLocations = localStorage.getItem('tagAnything_locations');
    if (savedLocations) {
      setLocations(JSON.parse(savedLocations));
    }
    
    // 加载选中的位置
    const savedSelectedLocation = localStorage.getItem('tagAnything_selectedLocation');
    if (savedSelectedLocation) {
      const parsedLocation = JSON.parse(savedSelectedLocation);
      setSelectedLocationId(parsedLocation.id);
    }
  }, []);

  // 保存数据到localStorage
  useEffect(() => {
    localStorage.setItem('tagAnything_locations', JSON.stringify(locations));
  }, [locations]);

  const handleSelectFolder = async () => {
    try {
      const folderPath = await window.electron.selectFolder();
      
      if (folderPath) {
        const defaultName = folderPath.split(/[/\\]/).pop() || 'Unknown';
        setLocationName(defaultName);
        setSelectedFolderPath(folderPath);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const handleAddLocation = () => {
    if (selectedFolderPath && locationName.trim()) {
      const newLocation: Location = {
        id: Date.now().toString(),
        name: locationName.trim(),
        path: selectedFolderPath,
      };
      setLocations(prev => [...prev, newLocation]);
      setOpenDialog(false);
      setLocationName('');
      setSelectedFolderPath('');
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationName(location.name);
    setOpenDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingLocation) {
      setLocations(prev =>
        prev.map(loc =>
          loc.id === editingLocation.id
            ? { ...loc, name: locationName }
            : loc
        )
      );
      setEditingLocation(null);
      setOpenDialog(false);
      setLocationName('');
    }
  };

  const handleDeleteLocation = (locationId: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  const handleSelectLocation = (location: Location) => {
    // 设置选中的位置到localStorage，供FileExplorer使用
    localStorage.setItem('tagAnything_selectedLocation', JSON.stringify(location));
    
    // 更新本地选中状态
    setSelectedLocationId(location.id);
    
    // 触发自定义事件通知FileExplorer更新
    window.dispatchEvent(new CustomEvent('locationSelected', { 
      detail: location 
    }));
  };

  const handleOpenDialog = () => {
    setEditingLocation(null);
    setLocationName('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLocation(null);
    setLocationName('');
    setSelectedFolderPath('');
  };

  const getLocationIcon = (path: string) => {
    if (path.match(/^[A-Z]:\\/)) {
      return <StorageIcon sx={{ color: '#2196f3' }} />;
    }
    return <FolderIcon sx={{ color: '#ffa726' }} />;
  };

  const getLocationStats = async (location: Location) => {
    try {
      const files = await window.electron.getFiles(location.path);
      return {
        folders: files.filter(f => f.isDirectory).length,
        files: files.filter(f => !f.isDirectory).length,
      };
    } catch {
      return { folders: 0, files: 0 };
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          位置管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{ borderRadius: 2 }}
        >
          添加位置
        </Button>
      </Box>

      {/* Description */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        管理您的文件位置，添加常用的文件夹以便快速访问和标签管理。
      </Typography>

      {/* Locations Grid */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {locations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ComputerIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              还没有添加任何位置
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              点击上方的"添加位置"按钮来添加您的第一个文件夹
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              添加第一个位置
            </Button>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr', // 小屏幕单列
              sm: 'repeat(auto-fit, minmax(160px, 1fr))', // 中等屏幕自适应
              md: 'repeat(auto-fit, minmax(200px, 1fr))', // 大屏幕自适应
            },
            gap: 2,
            width: '100%',
            maxWidth: '100%'
          }}>
            {locations.map((location) => {
              const isSelected = selectedLocationId === location.id;
              return (
                <Card
                  key={location.id}
                  sx={{
                    transition: 'all 0.2s',
                    width: '100%',
                    minWidth: 0,
                    cursor: 'pointer',
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.50' : 'background.paper',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                      bgcolor: isSelected ? 'primary.100' : 'action.hover',
                    },
                  }}
                  onClick={() => handleSelectLocation(location)}
                >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'transparent',
                        mr: 2,
                        width: 48,
                        height: 48,
                        flexShrink: 0, // 防止头像被压缩
                      }}
                    >
                      {getLocationIcon(location.path)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {location.name}
                      </Typography>
                      <Tooltip title={location.path}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {location.path}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>

                <Divider />

                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="编辑位置">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLocation(location);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除位置">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLocation(location.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Button
                    size="small"
                    startIcon={<FolderOpenIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.electron.openFile(location.path);
                    }}
                  >
                    打开
                  </Button>
                </CardActions>
              </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          {editingLocation ? '编辑位置' : '添加新位置'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="位置名称"
            fullWidth
            variant="outlined"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="输入位置的自定义名称"
            sx={{ mt: 2 }}
          />
          {!editingLocation && selectedFolderPath && (
            <Typography variant="body2" color="primary" sx={{ mt: 1, fontSize: '0.875rem' }}>
              已选择: {selectedFolderPath}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {editingLocation
              ? '修改位置的显示名称'
              : selectedFolderPath 
                ? '您可以自定义位置的显示名称，然后点击"添加"按钮'
                : '请先点击"选择文件夹"按钮选择要管理的文件夹'
            }
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog}>
            取消
          </Button>
          {!editingLocation && (
            <Button
              onClick={handleSelectFolder}
              variant="outlined"
              startIcon={<FolderIcon />}
              sx={{ borderRadius: 2 }}
            >
              选择文件夹
            </Button>
          )}
          <Button
            onClick={editingLocation ? handleSaveEdit : handleAddLocation}
            variant="contained"
            disabled={!editingLocation && (!selectedFolderPath || !locationName.trim())}
            sx={{ borderRadius: 2 }}
          >
            {editingLocation ? '保存' : '添加'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default LocationManager;