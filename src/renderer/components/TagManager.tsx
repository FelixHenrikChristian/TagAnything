import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Fab,
  InputAdornment,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Label as LabelIcon,
  Palette as PaletteIcon,
  MoreVert as MoreVertIcon,
  LocalOffer as LocalOfferIcon,
} from '@mui/icons-material';
import { Tag } from '../types';

const predefinedColors = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39',
  '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
];

const TagManager: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#2196f3');
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  // 加载保存的数据
  useEffect(() => {
    const savedTags = localStorage.getItem('tagAnything_tags');
    if (savedTags) {
      setTags(JSON.parse(savedTags));
    }
  }, []);

  // 保存数据到localStorage
  useEffect(() => {
    localStorage.setItem('tagAnything_tags', JSON.stringify(tags));
  }, [tags]);

  const handleAddTag = () => {
    if (tagName.trim()) {
      const newTag: Tag = {
        id: Date.now().toString(),
        name: tagName.trim(),
        color: tagColor,
      };
      setTags(prev => [...prev, newTag]);
      setOpenDialog(false);
      setTagName('');
      setTagColor('#2196f3');
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setOpenDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingTag && tagName.trim()) {
      setTags(prev =>
        prev.map(tag =>
          tag.id === editingTag.id
            ? { ...tag, name: tagName.trim(), color: tagColor }
            : tag
        )
      );
      setEditingTag(null);
      setOpenDialog(false);
      setTagName('');
      setTagColor('#2196f3');
    }
  };

  const handleDeleteTag = (tagId: string) => {
    setTags(prev => prev.filter(tag => tag.id !== tagId));
    handleCloseMenu();
  };

  const handleOpenDialog = () => {
    setEditingTag(null);
    setTagName('');
    setTagColor('#2196f3');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTag(null);
    setTagName('');
    setTagColor('#2196f3');
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, tag: Tag) => {
    setAnchorEl(event.currentTarget);
    setSelectedTag(tag);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedTag(null);
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          标签管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{ borderRadius: 2 }}
        >
          创建标签
        </Button>
      </Box>

      {/* Description */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        创建和管理您的标签，为文件添加有意义的分类和标识。
      </Typography>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="搜索标签..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Tags Grid */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredTags.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <LocalOfferIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm ? '没有找到匹配的标签' : '还没有创建任何标签'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm 
                ? '尝试使用不同的关键词搜索'
                : '点击上方的"创建标签"按钮来创建您的第一个标签'
              }
            </Typography>
            {!searchTerm && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
              >
                创建第一个标签
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredTags.map((tag) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={tag.id}>
                <Card
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: tag.color,
                          mr: 2,
                          width: 40,
                          height: 40,
                        }}
                      >
                        <LabelIcon sx={{ color: 'white' }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tag.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          标签颜色: {tag.color}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, tag)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      <Chip
                        label={tag.name}
                        sx={{
                          bgcolor: tag.color,
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </CardContent>

                  <Divider />

                  <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                    <Tooltip title="编辑标签">
                      <IconButton
                        size="small"
                        onClick={() => handleEditTag(tag)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="删除标签">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTag(tag.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
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
          {editingTag ? '编辑标签' : '创建新标签'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="标签名称"
            fullWidth
            variant="outlined"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="输入标签名称"
            sx={{ mt: 2, mb: 3 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            选择标签颜色
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {predefinedColors.map((color) => (
              <Box
                key={color}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: color,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: tagColor === color ? '3px solid #000' : '2px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
                onClick={() => setTagColor(color)}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Typography variant="body2">预览:</Typography>
            <Chip
              label={tagName || '标签名称'}
              sx={{
                bgcolor: tagColor,
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog}>
            取消
          </Button>
          <Button
            onClick={editingTag ? handleSaveEdit : handleAddTag}
            variant="contained"
            disabled={!tagName.trim()}
            sx={{ borderRadius: 2 }}
          >
            {editingTag ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => selectedTag && handleEditTag(selectedTag)}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>编辑标签</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedTag && handleDeleteTag(selectedTag.id)}>
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText>删除标签</ListItemText>
        </MenuItem>
      </Menu>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add tag"
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

export default TagManager;