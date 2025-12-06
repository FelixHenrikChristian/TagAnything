import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Fab,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Grid,
  Snackbar,
  Alert,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Folder as FolderIcon,
  Label as LabelIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Home as HomeIcon,
  Style as StyleIcon,
  SystemUpdate as UpdateIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  MouseSensor,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';

import LocationManager from './components/LocationManager';
import TagManager, { TagManagerHandle } from './components/TagManager';
import FileExplorer, { FileExplorerHandle } from './components/FileExplorer';
import SettingsDialog from './components/SettingsDialog';
import UpdateDialog from './components/UpdateDialog';
import { useAppUpdate } from './hooks/useAppUpdate';

const DRAWER_WIDTH = 280;

// TagSpaces inspired themes
const createAppTheme = (mode: 'light' | 'dark') => {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        light: isLight ? '#a6def4' : '#a6def4',
        main: isLight ? '#1dd19f' : '#3bc8ff',
        dark: isLight ? '#1dd19f' : '#3bc8ff',
      },
      secondary: {
        main: isLight ? '#777' : '#bbb',
      },
      background: {
        default: isLight ? '#fafafa' : '#121212',
        paper: isLight ? '#ffffff' : '#1e1e1e',
      },
      divider: isLight ? '#e0e0e0' : '#333',
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h6: {
        fontWeight: 600,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isLight ? '#ccc transparent' : '#555 transparent',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: isLight ? '#ccc' : '#555',
              minHeight: 24,
            },
            '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
              backgroundColor: isLight ? '#999' : '#777',
            },
            '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
              backgroundColor: isLight ? '#999' : '#777',
            },
            '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
              backgroundColor: isLight ? '#999' : '#777',
            },
            '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
    },
  });
};

interface TagFilterInfo {
  tagId: string;
  tagName: string;
}

const App: React.FC = () => {
  const [sidebarView, setSidebarView] = useState<'locations' | 'tags' | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<TagFilterInfo | null>(null);
  // 多标签筛选相关状态（仅用于 AppBar 展示与弹窗）
  const [activeMultiTagIds, setActiveMultiTagIds] = useState<string[]>([]);
  const [multiTagDialogOpen, setMultiTagDialogOpen] = useState(false);
  const [multiTagSelectedIds, setMultiTagSelectedIds] = useState<string[]>([]);
  const [tagDisplayStyle, setTagDisplayStyle] = useState<'original' | 'library'>('original');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Drag and Drop State
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const fileExplorerRef = useRef<FileExplorerHandle>(null);
  const tagManagerRef = useRef<TagManagerHandle>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(MouseSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragItem(active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active } = event;

    if (active.data.current?.type === 'TAG_GROUP') {
      if (tagManagerRef.current) {
        tagManagerRef.current.handleDragEnd(event);
      }
      return;
    }

    if (fileExplorerRef.current) {
      fileExplorerRef.current.handleDragEnd(event);
    }
  };

  // 监听来自 FileExplorer 的全量清除事件，确保 AppBar 搜索框与筛选提示同步清空
  useEffect(() => {
    const handleGlobalFilenameSearch = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const detail = ce.detail || {};
      if (detail?.clearAll) {
        try { localStorage.removeItem('tagAnything_filter'); } catch { }
        setActiveTagFilter(null);
        setSearchQuery('');
        setIsComposing(false);
      }
    };
    window.addEventListener('filenameSearch', handleGlobalFilenameSearch as EventListener);
    return () => window.removeEventListener('filenameSearch', handleGlobalFilenameSearch as EventListener);
  }, []);

  const handleClearSearchAndFilter = () => {
    try {
      localStorage.removeItem('tagAnything_filter');
      localStorage.removeItem('tagAnything_multiFilter');
    } catch { }
    setActiveTagFilter(null);
    setActiveMultiTagIds([]);
    setSearchQuery('');
    const currentPath = localStorage.getItem('tagAnything_currentPath') || '';
    const detail = {
      type: 'filename',
      query: '',
      timestamp: Date.now(),
      origin: 'appBar' as const,
      currentPath,
      clearAll: true,
    } as any;
    window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));
  };

  // 自动更新相关状态
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const update = useAppUpdate({ showSnackbar });
  const {
    state: updateState,
    actions: updateActions,
  } = update;
  const {
    updateDialogOpen,
    updateInfo,
    updateDownloading,
    updateProgress,
  } = updateState;
  const {
    setUpdateDialogOpen,
    handleDownloadUpdate,
    handleInstallUpdate,
  } = updateActions;

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    setDarkMode(prefersDarkMode);
  }, [prefersDarkMode]);

  // Load tag display style from localStorage
  useEffect(() => {
    const savedStyle = localStorage.getItem('tagDisplayStyle') as 'original' | 'library' | null;
    if (savedStyle) {
      setTagDisplayStyle(savedStyle);
    }
  }, []);

  // Save tag display style to localStorage
  const handleTagDisplayStyleToggle = () => {
    const newStyle = tagDisplayStyle === 'original' ? 'library' : 'original';
    setTagDisplayStyle(newStyle);
    localStorage.setItem('tagDisplayStyle', newStyle);
  };

  // 监听标签筛选以在搜索框左侧展示
  useEffect(() => {
    const init = () => {
      try {
        const saved = localStorage.getItem('tagAnything_filter');
        if (saved) {
          const data = JSON.parse(saved);
          if (data && data.tagId && data.tagName) {
            setActiveTagFilter({ tagId: data.tagId, tagName: data.tagName });
          }
        } else {
          setActiveTagFilter(null);
        }
        const savedMulti = localStorage.getItem('tagAnything_multiFilter');
        if (savedMulti) {
          const d = JSON.parse(savedMulti);
          if (Array.isArray(d?.tagIds)) {
            setActiveMultiTagIds(d.tagIds);
          }
        } else {
          setActiveMultiTagIds([]);
        }
      } catch {
        // ignore
      }
    };
    init();

    const onTagFilter = (e: Event) => {
      const ce = e as CustomEvent;
      const d: any = ce.detail;
      if (d && d.tagId && d.tagName) {
        setActiveTagFilter({ tagId: d.tagId, tagName: d.tagName });
        // 与多标签筛选互斥：清除多标签状态与存储
        setActiveMultiTagIds([]);
        try { localStorage.removeItem('tagAnything_multiFilter'); } catch { }
      }
    };
    const onMultiTagFilter = (e: Event) => {
      const ce = e as CustomEvent;
      const d: any = ce.detail;
      if (Array.isArray(d?.tagIds)) {
        setActiveMultiTagIds(d.tagIds);
        try { localStorage.setItem('tagAnything_multiFilter', JSON.stringify({ tagIds: d.tagIds })); } catch { }
        // 与单标签筛选互斥：清除单标签状态与存储
        setActiveTagFilter(null);
        try { localStorage.removeItem('tagAnything_filter'); } catch { }
      }
    };
    const onFilenameSearch = () => {
      // 如果本地没有筛选信息，则清除显示
      const saved = localStorage.getItem('tagAnything_filter');
      if (!saved) {
        setActiveTagFilter(null);
      }
      const savedMulti = localStorage.getItem('tagAnything_multiFilter');
      if (!savedMulti) {
        setActiveMultiTagIds([]);
      }
    };
    window.addEventListener('tagFilter', onTagFilter as EventListener);
    window.addEventListener('multiTagFilter', onMultiTagFilter as EventListener);
    window.addEventListener('filenameSearch', onFilenameSearch as EventListener);
    return () => {
      window.removeEventListener('tagFilter', onTagFilter as EventListener);
      window.removeEventListener('multiTagFilter', onMultiTagFilter as EventListener);
      window.removeEventListener('filenameSearch', onFilenameSearch as EventListener);
    };
  }, []);

  // 多标签筛选弹窗：读取标签库
  const getTagGroupsFromStorage = (): Array<{ id: string; name: string; tags: Array<{ id: string; name: string; color?: string; textcolor?: string }> }> => {
    try {
      const raw = localStorage.getItem('tagAnything_tagGroups');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((g: any) => ({ id: g.id, name: g.name, tags: Array.isArray(g.tags) ? g.tags : [] }));
    } catch {
      return [];
    }
  };

  const getTagNameById = (id: string): string => {
    const groups = getTagGroupsFromStorage();
    for (const g of groups) {
      const t = g.tags.find(x => x.id === id);
      if (t) return t.name;
    }
    return id;
  };

  // 通过 id 获取标签元信息（名称与颜色），用于顶栏显示彩色徽标
  const getTagMetaById = (id: string): { id: string; name: string; color?: string; textcolor?: string } => {
    const groups = getTagGroupsFromStorage();
    for (const g of groups) {
      const t = g.tags.find(x => x.id === id);
      if (t) return { id: t.id, name: t.name, color: t.color, textcolor: t.textcolor };
    }
    return { id, name: id };
  };

  const handleOpenMultiTagDialog = () => {
    // 初始选中为当前已激活的多标签
    setMultiTagSelectedIds(activeMultiTagIds);
    setMultiTagDialogOpen(true);
  };

  const toggleSelectMultiTag = (id: string) => {
    setMultiTagSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirmMultiTagFilter = () => {
    const tagIds = [...multiTagSelectedIds];
    setActiveMultiTagIds(tagIds);
    try { localStorage.setItem('tagAnything_multiFilter', JSON.stringify({ tagIds })); } catch { }
    // 应用多标签时清除单标签状态（互斥）
    setActiveTagFilter(null);
    try { localStorage.removeItem('tagAnything_filter'); } catch { }
    const currentPath = localStorage.getItem('tagAnything_currentPath') || '';
    const detail = { tagIds, timestamp: Date.now(), origin: 'appBar' as const, currentPath } as any;
    window.dispatchEvent(new CustomEvent('multiTagFilter', { detail }));
    setMultiTagDialogOpen(false);
  };

  const handleCloseMultiTagDialog = () => {
    setMultiTagDialogOpen(false);
  };

  const theme = createAppTheme(darkMode ? 'dark' : 'light');

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  // 处理Snackbar关闭
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    // 只阻止点击外部区域关闭，但允许自动隐藏和手动关闭
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const menuItems = [
    { id: 'locations', label: '位置管理', icon: <HomeIcon />, view: 'locations' as const },
    { id: 'tags', label: '标签管理', icon: <LabelIcon />, view: 'tags' as const },
  ];

  const renderSidebarContent = () => {
    switch (sidebarView) {
      case 'locations':
        return <LocationManager />;
      case 'tags':
        return <TagManager ref={tagManagerRef} />;
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box sx={{ display: 'flex', height: '100vh' }}>
          {/* App Bar */}
          <AppBar
            position="fixed"
            sx={{
              zIndex: theme.zIndex.drawer + 1,
              transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="toggle drawer"
                onClick={handleDrawerToggle}
                edge="start"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>

              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, mr: 3 }}>
                TagAnything
              </Typography>

              <IconButton color="inherit" onClick={handleThemeToggle}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>

              <IconButton
                color="inherit"
                onClick={handleTagDisplayStyleToggle}
                title={`标签样式: ${tagDisplayStyle === 'original' ? '原始' : '标签库'}`}
              >
                <StyleIcon />
              </IconButton>

              <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          {/* Sidebar Drawer */}
          <Drawer
            variant="persistent"
            anchor="left"
            open={drawerOpen}
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
              },
            }}
          >
            <Toolbar />
            <Box sx={{ overflow: 'auto', p: 1 }}>
              <List>
                {menuItems.map((item) => (
                  <ListItem
                    key={item.id}
                    button
                    selected={sidebarView === item.view}
                    onClick={() => setSidebarView(sidebarView === item.view ? null : item.view)}
                  >
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: sidebarView === item.view ? 600 : 400,
                      }}
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Sidebar Content */}
              <Box sx={{ p: 1 }}>
                {renderSidebarContent()}
              </Box>
            </Box>
          </Drawer>

          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              marginLeft: drawerOpen ? 0 : `-${DRAWER_WIDTH}px`,
            }}
          >
            <Toolbar />
            <Box sx={{ p: 3, height: 'calc(100vh - 64px)', overflow: 'auto' }}>
              <Paper
                elevation={1}
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <FileExplorer ref={fileExplorerRef} tagDisplayStyle={tagDisplayStyle} />
              </Paper>
            </Box>
          </Box>

          {/* Settings Dialog */}
          <SettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            updateState={updateState}
            updateActions={updateActions}
            onShowSnackbar={showSnackbar}
          />

          {/* Multi-Tag Filter Dialog */}
          <Dialog
            open={multiTagDialogOpen}
            onClose={handleCloseMultiTagDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              选择多个标签进行筛选
            </DialogTitle>
            <DialogContent>
              {(() => {
                const groups = getTagGroupsFromStorage();
                if (!groups.length) {
                  return (
                    <Typography variant="body2" color="text.secondary">
                      暂无标签，请先在「标签管理」中创建标签。
                    </Typography>
                  );
                }
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {groups.map((g) => (
                      <Box key={g.id}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          {g.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {g.tags.map((t) => {
                            const selected = multiTagSelectedIds.includes(t.id);
                            return (
                              <Chip
                                key={t.id}
                                label={t.name}
                                onClick={() => toggleSelectMultiTag(t.id)}
                                color={selected ? 'primary' : 'default'}
                                variant={selected ? 'filled' : 'outlined'}
                                sx={{ cursor: 'pointer' }}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                );
              })()}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseMultiTagDialog}>取消</Button>
              <Button onClick={() => setMultiTagSelectedIds([])}>清空选择</Button>
              <Button variant="contained" onClick={handleConfirmMultiTagFilter}>应用</Button>
            </DialogActions>
          </Dialog>

          {/* Update Notification Dialog */}
          <UpdateDialog
            open={updateDialogOpen}
            onClose={() => setUpdateDialogOpen(false)}
            updateInfo={updateInfo}
            updateDownloading={updateDownloading}
            updateProgress={updateProgress}
            onDownload={handleDownloadUpdate}
            onInstall={handleInstallUpdate}
          />


          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              severity={snackbarSeverity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
        <DragOverlay>
          {activeDragItem ? (
            (() => {
              if (activeDragItem.type === 'TAG_GROUP') {
                const group = activeDragItem.group;
                return (
                  <Chip
                    label={group.name}
                    sx={{
                      height: 40,
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      bgcolor: 'background.paper',
                      boxShadow: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      '& .MuiChip-label': { px: 2 },
                      transform: 'scale(1.05)',
                      cursor: 'grabbing',
                    }}
                  />
                );
              }

              const tag = activeDragItem.tag;
              // Unified Tag Style for both Library and File tags (Compact)
              const getTagStyle = (t: any, style: 'original' | 'library') => {
                if (t.groupId === 'temporary') {
                  return {
                    variant: 'filled' as const,
                    backgroundColor: t.color + '40',
                    borderColor: t.color,
                    color: '#fff',
                    border: '1px dashed ' + t.color,
                  };
                }
                if (style === 'library') {
                  return {
                    variant: 'filled' as const,
                    backgroundColor: t.color,
                    color: t.textcolor || '#fff',
                    borderColor: t.color,
                  };
                } else {
                  return {
                    variant: 'outlined' as const,
                    backgroundColor: t.color + '20',
                    borderColor: t.color,
                    color: t.color,
                  };
                }
              };

              const style = getTagStyle(tag, tagDisplayStyle);

              return (
                <Chip
                  size="small"
                  label={tag.name}
                  variant={style.variant}
                  sx={{
                    backgroundColor: style.backgroundColor,
                    borderColor: style.borderColor,
                    color: style.color,
                    fontSize: '0.6rem',
                    height: '18px',
                    border: style.border,
                    opacity: 0.9,
                    backdropFilter: 'blur(4px)',
                    borderRadius: '4px',
                    cursor: 'grabbing',
                    '& .MuiChip-label': { px: 0.4 },
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transform: 'scale(1.05)',
                    pointerEvents: 'none',
                  }}
                />
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>
    </ThemeProvider>
  );
};

export default App;