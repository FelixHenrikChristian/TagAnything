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
  IconButton,
  InputAdornment,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  LocalOffer as LocalOfferIcon,
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';
import { Tag, TagGroup } from '../types';

const predefinedColors = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39',
  '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TagManager: React.FC = () => {
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 标签组相关状态
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupDefaultColor, setGroupDefaultColor] = useState('#2196f3');
  
  // 标签相关状态
  const [openTagDialog, setOpenTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#2196f3');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  // 菜单状态
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<TagGroup | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [menuType, setMenuType] = useState<'group' | 'tag' | 'main'>('group');
  const [mainMenuAnchorEl, setMainMenuAnchorEl] = useState<null | HTMLElement>(null);

  // 加载保存的数据
  useEffect(() => {
    const savedTagGroups = localStorage.getItem('tagAnything_tagGroups');
    if (savedTagGroups) {
      setTagGroups(JSON.parse(savedTagGroups));
    } else {
      // 创建默认标签组
      const defaultGroup: TagGroup = {
        id: 'default',
        name: '默认标签组',
        defaultColor: '#2196f3',
        description: '系统默认标签组',
        tags: []
      };
      setTagGroups([defaultGroup]);
    }
  }, []);

  // 保存数据到localStorage
  useEffect(() => {
    localStorage.setItem('tagAnything_tagGroups', JSON.stringify(tagGroups));
  }, [tagGroups]);

  // 标签组管理函数
  const handleAddGroup = () => {
    if (groupName.trim()) {
      const newGroup: TagGroup = {
        id: Date.now().toString(),
        name: groupName.trim(),
        defaultColor: groupDefaultColor,
        description: groupDescription.trim(),
        tags: [],
      };
      setTagGroups(prev => [...prev, newGroup]);
      setOpenGroupDialog(false);
      resetGroupForm();
    }
  };

  const handleEditGroup = (group: TagGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setGroupDefaultColor(group.defaultColor);
    setOpenGroupDialog(true);
  };

  const handleSaveGroupEdit = () => {
    if (editingGroup && groupName.trim()) {
      setTagGroups(prev =>
        prev.map(group =>
          group.id === editingGroup.id
            ? { 
                ...group, 
                name: groupName.trim(), 
                defaultColor: groupDefaultColor,
                description: groupDescription.trim()
              }
            : group
        )
      );
      setEditingGroup(null);
      setOpenGroupDialog(false);
      resetGroupForm();
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (groupId === 'default') {
      alert('默认标签组不能删除');
      return;
    }
    setTagGroups(prev => prev.filter(group => group.id !== groupId));
    handleCloseMenu();
  };

  const resetGroupForm = () => {
    setGroupName('');
    setGroupDescription('');
    setGroupDefaultColor('#2196f3');
  };

  // 标签管理函数
  const handleAddTag = () => {
    if (tagName.trim() && selectedGroupId) {
      const newTag: Tag = {
        id: Date.now().toString(),
        name: tagName.trim(),
        color: tagColor,
        groupId: selectedGroupId,
      };
      
      setTagGroups(prev =>
        prev.map(group =>
          group.id === selectedGroupId
            ? { ...group, tags: [...group.tags, newTag] }
            : group
        )
      );
      
      setOpenTagDialog(false);
      resetTagForm();
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setSelectedGroupId(tag.groupId || '');
    setOpenTagDialog(true);
  };

  const handleSaveTagEdit = () => {
    if (editingTag && tagName.trim()) {
      setTagGroups(prev =>
        prev.map(group => ({
          ...group,
          tags: group.tags.map(tag =>
            tag.id === editingTag.id
              ? { ...tag, name: tagName.trim(), color: tagColor, groupId: selectedGroupId }
              : tag
          )
        }))
      );
      setEditingTag(null);
      setOpenTagDialog(false);
      resetTagForm();
    }
  };

  const handleDeleteTag = (tagId: string) => {
    setTagGroups(prev =>
      prev.map(group => ({
        ...group,
        tags: group.tags.filter(tag => tag.id !== tagId)
      }))
    );
    handleCloseMenu();
  };

  const resetTagForm = () => {
    setTagName('');
    setTagColor('#2196f3');
    setSelectedGroupId('');
  };

  // 菜单处理函数
  const handleOpenGroupMenu = (event: React.MouseEvent<HTMLElement>, group: TagGroup) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
    setMenuType('group');
  };

  const handleOpenTagMenu = (event: React.MouseEvent<HTMLElement>, tag: Tag) => {
    setAnchorEl(event.currentTarget);
    setSelectedTag(tag);
    setMenuType('tag');
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
    setSelectedTag(null);
  };

  const handleCloseMainMenu = () => {
    setMainMenuAnchorEl(null);
  };

  // 导入导出功能
  const handleExportTagLibrary = () => {
    const dataStr = JSON.stringify(tagGroups, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `标签库_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    handleCloseMainMenu();
  };

  const handleImportTagLibrary = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target?.result as string);
            if (Array.isArray(importedData)) {
              setTagGroups(importedData);
              alert('标签库导入成功！');
            } else {
              alert('文件格式不正确，请选择有效的标签库文件。');
            }
          } catch (error) {
            alert('文件解析失败，请检查文件格式。');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    handleCloseMainMenu();
  };

  // 对话框处理函数
  const handleOpenGroupDialog = () => {
    setEditingGroup(null);
    resetGroupForm();
    setOpenGroupDialog(true);
  };

  const handleOpenTagDialog = (groupId?: string) => {
    setEditingTag(null);
    resetTagForm();
    if (groupId) {
      setSelectedGroupId(groupId);
      const group = tagGroups.find(g => g.id === groupId);
      if (group) {
        setTagColor(group.defaultColor);
      }
    }
    setOpenTagDialog(true);
  };

  const handleCloseGroupDialog = () => {
    setOpenGroupDialog(false);
    setEditingGroup(null);
    resetGroupForm();
  };

  const handleCloseTagDialog = () => {
    setOpenTagDialog(false);
    setEditingTag(null);
    resetTagForm();
  };

  // 过滤函数
  const filteredGroups = tagGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.tags.some(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const allTags = tagGroups.flatMap(group => group.tags);
  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          标签管理
        </Typography>
        <IconButton
          onClick={(e) => setMainMenuAnchorEl(e.currentTarget)}
          sx={{ 
            bgcolor: 'action.hover',
            '&:hover': {
              bgcolor: 'action.selected',
            },
          }}
        >
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Description */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        创建和管理您的标签组和标签，为文件添加有意义的分类和标识。
      </Typography>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="搜索标签组或标签..."
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

      {/* 标签组视图 - 直接显示，不需要Tab */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredGroups.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm ? '没有找到匹配的标签组' : '还没有创建任何标签组'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm 
                ? '尝试使用不同的关键词搜索'
                : '点击右上角的三个点按钮来创建您的第一个标签组'
              }
            </Typography>
            {!searchTerm && (
              <Button
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={handleOpenGroupDialog}
              >
                创建第一个标签组
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredGroups.map((group) => (
              <Accordion key={group.id} defaultExpanded>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                      {group.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenGroupMenu(e, group);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {group.tags.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <LocalOfferIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          该标签组还没有标签
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {group.tags.map((tag) => (
                          <Box key={tag.id} sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <Chip
                              label={tag.name}
                              onClick={() => handleEditTag(tag)}
                              sx={{
                                bgcolor: tag.color,
                                color: 'white',
                                fontWeight: 500,
                                borderRadius: 2,
                                pr: 0.5,
                                '&:hover': {
                                  bgcolor: tag.color,
                                  opacity: 0.8,
                                },
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTagMenu(e, tag);
                              }}
                              sx={{
                                position: 'absolute',
                                right: 4,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 16,
                                height: 16,
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': {
                                  color: 'white',
                                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                                },
                              }}
                            >
                              <MoreVertIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
      </Box>

      {/* 标签组对话框 */}
      <Dialog
        open={openGroupDialog}
        onClose={handleCloseGroupDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          {editingGroup ? '编辑标签组' : '创建新标签组'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="标签组名称"
            fullWidth
            variant="outlined"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="输入标签组名称"
            sx={{ mt: 2, mb: 2 }}
          />

          <TextField
            margin="dense"
            label="描述（可选）"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder="输入标签组描述"
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            选择默认颜色
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
                  border: groupDefaultColor === color ? '3px solid #000' : '2px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
                onClick={() => setGroupDefaultColor(color)}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Typography variant="body2">预览:</Typography>
            <Chip
              icon={<FolderIcon />}
              label={groupName || '标签组名称'}
              sx={{
                bgcolor: groupDefaultColor,
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseGroupDialog}>
            取消
          </Button>
          <Button
            onClick={editingGroup ? handleSaveGroupEdit : handleAddGroup}
            variant="contained"
            disabled={!groupName.trim()}
            sx={{ borderRadius: 2 }}
          >
            {editingGroup ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 标签对话框 */}
      <Dialog
        open={openTagDialog}
        onClose={handleCloseTagDialog}
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

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>选择标签组</InputLabel>
            <Select
              value={selectedGroupId}
              label="选择标签组"
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                const group = tagGroups.find(g => g.id === e.target.value);
                if (group && !editingTag) {
                  setTagColor(group.defaultColor);
                }
              }}
            >
              {tagGroups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        bgcolor: group.defaultColor,
                        mr: 1,
                        width: 24,
                        height: 24,
                      }}
                    >
                      <FolderIcon sx={{ color: 'white', fontSize: 14 }} />
                    </Avatar>
                    {group.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
          <Button onClick={handleCloseTagDialog}>
            取消
          </Button>
          <Button
            onClick={editingTag ? handleSaveTagEdit : handleAddTag}
            variant="contained"
            disabled={!tagName.trim() || !selectedGroupId}
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
        {menuType === 'group' && selectedGroup && (
          [
            <MenuItem key="addTag" onClick={() => {
              handleOpenTagDialog(selectedGroup.id);
              handleCloseMenu();
            }}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText>添加标签</ListItemText>
            </MenuItem>,
            <MenuItem key="edit" onClick={() => {
              handleEditGroup(selectedGroup);
              handleCloseMenu();
            }}>
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText>编辑标签组</ListItemText>
            </MenuItem>,
            <MenuItem key="delete" onClick={() => handleDeleteGroup(selectedGroup.id)}>
              <ListItemIcon>
                <DeleteIcon color="error" />
              </ListItemIcon>
              <ListItemText>删除标签组</ListItemText>
            </MenuItem>
          ]
        )}
        {menuType === 'tag' && selectedTag && (
          [
            <MenuItem key="edit" onClick={() => {
              handleEditTag(selectedTag);
              handleCloseMenu();
            }}>
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText>编辑标签</ListItemText>
            </MenuItem>,
            <MenuItem key="delete" onClick={() => handleDeleteTag(selectedTag.id)}>
              <ListItemIcon>
                <DeleteIcon color="error" />
              </ListItemIcon>
              <ListItemText>删除标签</ListItemText>
            </MenuItem>
          ]
        )}
      </Menu>

      {/* Main Menu */}
      <Menu
        anchorEl={mainMenuAnchorEl}
        open={Boolean(mainMenuAnchorEl)}
        onClose={handleCloseMainMenu}
      >
        <MenuItem onClick={() => {
          handleOpenGroupDialog();
          handleCloseMainMenu();
        }}>
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText>创建标签组</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleImportTagLibrary}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText>导入标签库</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportTagLibrary}>
          <ListItemIcon>
            <LocalOfferIcon />
          </ListItemIcon>
          <ListItemText>导出标签库</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TagManager;