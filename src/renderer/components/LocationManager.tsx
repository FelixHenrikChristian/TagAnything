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

  // 加载保存的数据
  useEffect(() => {
    const savedLocations = localStorage.getItem('tagAnything_locations');
    if (savedLocations) {
      setLocations(JSON.parse(savedLocations));
    }
  }, []);

  // 保存数据到localStorage
  useEffect(() => {
    localStorage.setItem('tagAnything_locations', JSON.stringify(locations));
  }, [locations]);

  const handleAddLocation = async () => {
    try {
      const folderPath = await window.electron.selectFolder();
      if (folderPath) {
        const defaultName = folderPath.split(/[/\\]/).pop() || 'Unknown';
        const newLocation: Location = {
          id: Date.now().toString(),
          name: locationName || defaultName,
          path: folderPath,
        };
        setLocations(prev => [...prev, newLocation]);
        setOpenDialog(false);
        setLocationName('');
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
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

  const handleOpenDialog = () => {
    setEditingLocation(null);
    setLocationName('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLocation(null);
    setLocationName('');
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
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {locations.map((location) => (
              <Card
                key={location.id}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'transparent',
                        mr: 2,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {getLocationIcon(location.path)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
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

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      size="small"
                      icon={<FolderIcon />}
                      label="文件夹"
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label="活跃"
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>

                <Divider />

                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="编辑位置">
                      <IconButton
                        size="small"
                        onClick={() => handleEditLocation(location)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除位置">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteLocation(location.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Button
                    size="small"
                    startIcon={<FolderOpenIcon />}
                    onClick={() => window.electron.openFile(location.path)}
                  >
                    打开
                  </Button>
                </CardActions>
              </Card>
            ))}
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {editingLocation
              ? '修改位置的显示名称'
              : '选择文件夹后，您可以自定义位置的显示名称'
            }
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog}>
            取消
          </Button>
          <Button
            onClick={editingLocation ? handleSaveEdit : handleAddLocation}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            {editingLocation ? '保存' : '选择文件夹'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add location"
        onClick={handleOpenDialog}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default LocationManager;