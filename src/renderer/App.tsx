import React, { useState, useEffect } from 'react';
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
import LocationManager from './components/LocationManager';
import TagManager from './components/TagManager';
import FileExplorer from './components/FileExplorer';

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
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isLight ? '#f8f9fa' : '#1a1a1a',
            borderRight: `1px solid ${isLight ? '#e0e0e0' : '#333'}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? '#ffffff' : '#1e1e1e',
            color: isLight ? '#333' : '#fff',
            boxShadow: `0 1px 3px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'}`,
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 8px',
            '&:hover': {
              backgroundColor: isLight ? 'rgba(29, 209, 159, 0.08)' : 'rgba(59, 200, 255, 0.08)',
            },
            '&.Mui-selected': {
              backgroundColor: isLight ? 'rgba(29, 209, 159, 0.12)' : 'rgba(59, 200, 255, 0.12)',
              '&:hover': {
                backgroundColor: isLight ? 'rgba(29, 209, 159, 0.16)' : 'rgba(59, 200, 255, 0.16)',
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            // 自定义滚动条样式
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: isLight ? '#f1f1f1' : '#2a2a2a',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isLight ? '#c1c1c1' : '#555',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: isLight ? '#a8a8a8' : '#777',
              },
              '&:active': {
                backgroundColor: isLight ? '#999' : '#888',
              },
            },
            '&::-webkit-scrollbar-corner': {
              backgroundColor: isLight ? '#f1f1f1' : '#2a2a2a',
            },
          },
          // 为特定容器添加更精细的滚动条样式
          '.MuiBox-root': {
            '&::-webkit-scrollbar': {
              width: '6px',
              height: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
              },
            },
          },
          // 为Drawer添加特殊的滚动条样式
          '.MuiDrawer-paper': {
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isLight ? 'rgba(29, 209, 159, 0.3)' : 'rgba(59, 200, 255, 0.3)',
              borderRadius: '2px',
              '&:hover': {
                backgroundColor: isLight ? 'rgba(29, 209, 159, 0.5)' : 'rgba(59, 200, 255, 0.5)',
              },
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
  const [activeTagFilter, setActiveTagFilter] = useState<TagFilterInfo | null>(null);
  const [tagDisplayStyle, setTagDisplayStyle] = useState<'original' | 'library'>('original');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearCacheConfirmOpen, setClearCacheConfirmOpen] = useState(false);
  
  const handleClearSearchAndFilter = () => {
    try {
      localStorage.removeItem('tagAnything_filter');
    } catch {}
    setActiveTagFilter(null);
    setSearchQuery('');
    const currentPath = localStorage.getItem('tagAnything_currentPath') || '';
    const detail = {
      type: 'filename',
      query: '',
      timestamp: Date.now(),
      origin: 'appBar' as const,
      currentPath,
    } as any;
    window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));
  };
  
  // 自动更新相关状态
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [appVersion, setAppVersion] = useState<string>('1.0.1');
  
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
      }
    };
    const onFilenameSearch = () => {
      // 如果本地没有筛选信息，则清除显示
      const saved = localStorage.getItem('tagAnything_filter');
      if (!saved) {
        setActiveTagFilter(null);
      }
    };
    window.addEventListener('tagFilter', onTagFilter as EventListener);
    window.addEventListener('filenameSearch', onFilenameSearch as EventListener);
    return () => {
      window.removeEventListener('tagFilter', onTagFilter as EventListener);
      window.removeEventListener('filenameSearch', onFilenameSearch as EventListener);
    };
  }, []);

  // 获取应用版本号
  useEffect(() => {
    const getAppVersion = async () => {
      try {
        const version = await window.electron.getVersion();
        setAppVersion(version);
      } catch (error) {
        console.error('Failed to get app version:', error);
      }
    };
    getAppVersion();
  }, []);

  // 自动更新事件监听器
  useEffect(() => {
    // 监听自动更新事件
    const unsubscribeChecking = window.electron.onUpdateChecking(() => {
      setCheckingForUpdates(true);
      setUpdateError(null);
    });

    const unsubscribeAvailable = window.electron.onUpdateAvailable((info: any) => {
      setCheckingForUpdates(false);
      setUpdateAvailable(true);
      setUpdateInfo({
        ...info,
        currentVersion: require('../../package.json').version,
        downloadUrl: `https://github.com/FelixChristian011226/TagAnything/releases/tag/v${info.version}`
      });
      // 如果启用了自动更新，显示更新对话框
      if (autoUpdateEnabled) {
        setUpdateDialogOpen(true);
      }
    });

    const unsubscribeNotAvailable = window.electron.onUpdateNotAvailable(() => {
      setCheckingForUpdates(false);
      setUpdateAvailable(false);
      setSnackbarMessage('当前已是最新版本！');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    });

    const unsubscribeError = window.electron.onUpdateError((error: string) => {
      setCheckingForUpdates(false);
      setUpdateError(error);
      setSnackbarMessage(`检查更新失败: ${error}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    });

    const unsubscribeProgress = window.electron.onUpdateDownloadProgress((progress: any) => {
      setUpdateProgress(progress.percent || 0);
    });

    const unsubscribeDownloaded = window.electron.onUpdateDownloaded(() => {
      setUpdateDownloading(false);
      setUpdateDownloaded(true);
      setSnackbarMessage('更新已下载完成，可以安装了！');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    });

    // 加载自动更新设置
    const initializeAutoUpdate = async () => {
      try {
        // 优先从 electron-store 读取设置
        const storedSetting = await window.electron.getSetting('autoUpdateEnabled', false);
        setAutoUpdateEnabled(storedSetting);
        
        // 同步到 localStorage 以保持一致性
        localStorage.setItem('autoUpdateEnabled', JSON.stringify(storedSetting));
      } catch (error) {
        // 如果读取失败，从 localStorage 读取
        console.warn('从 electron-store 读取设置失败，使用 localStorage:', error);
        const savedAutoUpdate = localStorage.getItem('autoUpdateEnabled');
        const autoUpdateEnabledValue = savedAutoUpdate !== null ? JSON.parse(savedAutoUpdate) : false;
        setAutoUpdateEnabled(autoUpdateEnabledValue);
      }
      
    };

    initializeAutoUpdate();

    return () => {
      unsubscribeChecking();
      unsubscribeAvailable();
      unsubscribeNotAvailable();
      unsubscribeError();
      unsubscribeProgress();
      unsubscribeDownloaded();
    };
  }, []); // 移除autoUpdateEnabled依赖，避免循环

  // 手动检查更新
  const handleCheckForUpdates = async () => {
    setCheckingForUpdates(true);
    setUpdateError(null);
    
    try {
      const result = await window.electron.checkForUpdates();
      if (!result.success) {
        setUpdateError(result.error || '检查更新失败');
        setSnackbarMessage(`检查更新失败: ${result.error || '未知错误'}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setUpdateError('检查更新时发生未知错误');
      setSnackbarMessage('检查更新时发生未知错误');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setCheckingForUpdates(false);
    }
  };

  // 下载更新
  const handleDownloadUpdate = async () => {
    setUpdateDownloading(true);
    setUpdateProgress(0);
    
    try {
      const result = await window.electron.downloadUpdate();
      if (!result.success) {
        setUpdateError(result.error || '下载更新失败');
        setSnackbarMessage(`下载更新失败: ${result.error || '未知错误'}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setUpdateDownloading(false);
      }
    } catch (error) {
      setUpdateError('下载更新时发生未知错误');
      setSnackbarMessage('下载更新时发生未知错误');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setUpdateDownloading(false);
    }
  };

  // 安装更新
  const handleInstallUpdate = async () => {
    try {
      await window.electron.installUpdate();
    } catch (error) {
      setSnackbarMessage('安装更新失败，请手动下载安装包');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // 切换自动更新设置
  const handleAutoUpdateToggle = async (enabled: boolean) => {
    setAutoUpdateEnabled(enabled);
    // 同时保存到 localStorage 和 electron-store
    localStorage.setItem('autoUpdateEnabled', JSON.stringify(enabled));
    try {
      await window.electron.setSetting('autoUpdateEnabled', enabled);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  const theme = createAppTheme(darkMode ? 'dark' : 'light');

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  // 清除所有缓存的函数
  const handleClearCache = () => {
    try {
      // 清除所有 localStorage 中的应用数据
      const keysToRemove = [
        'tagAnything_locations',
        'tagAnything_selectedLocation', 
        'tagAnything_tagGroups',
        'tagAnything_videoThumbnails',
        'tagAnything_filter',
        '·w'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // 清除 sessionStorage
      sessionStorage.clear();
      
      // 显示成功消息并关闭对话框
      setSnackbarMessage('缓存已成功清除！应用将在下次启动时重置为默认状态。');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setClearCacheConfirmOpen(false);
      setSettingsOpen(false);
      
      // 延迟重新加载页面，让用户看到成功消息
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('清除缓存时出错:', error);
      setSnackbarMessage('清除缓存时出现错误，请重试。');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // 处理Snackbar关闭
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    // 只阻止点击外部区域关闭，但允许自动隐藏和手动关闭
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // 处理重置窗口大小
  const handleResetWindowSize = async () => {
    try {
      const result = await window.electron.resetWindowSize();
      if (result) {
        // 同步重置文件浏览器的缩放等级
        window.dispatchEvent(new CustomEvent('ta:reset-grid-zoom'));
        setSnackbarMessage(`窗口大小与缩放等级已重置为默认值 (${result.width} × ${result.height})`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('重置窗口大小失败，请重试。');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('重置窗口大小时出错:', error);
      setSnackbarMessage('重置窗口大小时出现错误，请重试。');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
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
        return <TagManager />;
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
            
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 0, mr: 3 }}>
              TagAnything
            </Typography>

            {/* Search Bar */}
            <TextField
              size="small"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const currentPath = localStorage.getItem('tagAnything_currentPath') || undefined;
                  const detail = {
                    query: searchQuery,
                    timestamp: Date.now(),
                    origin: 'appBar' as const,
                    currentPath,
                  };
                  const evt = new CustomEvent('filenameSearch', { detail });
                  window.dispatchEvent(evt);
                }
              }}
              sx={{
                flexGrow: 1,
                maxWidth: 400,
                mr: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                      {activeTagFilter && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.75, py: 0.25, bgcolor: 'primary.light', borderRadius: 1 }}>
                          <FilterListIcon fontSize="small" sx={{ color: 'primary.contrastText' }} />
                          <Typography variant="caption" sx={{ color: 'primary.contrastText' }}>
                            {activeTagFilter.tagName}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </InputAdornment>
                ),
                endAdornment: ((searchQuery.trim().length > 0) || !!activeTagFilter ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="清除搜索与筛选"
                      onClick={handleClearSearchAndFilter}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ) : undefined),
              }}
            />

            <Box sx={{ flexGrow: 1 }} />

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
              <FileExplorer tagDisplayStyle={tagDisplayStyle} />
            </Paper>
          </Box>
        </Box>

        {/* Removed unused floating action button to clean up UI */}

        {/* Settings Dialog */}
        <Dialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>设置</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Window Settings */}
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 3, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 2, 
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    color: 'primary.main', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    🪟 窗口设置
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    默认窗口大小: 1280 × 960 像素
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    窗口大小会自动保存，下次启动时恢复
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleResetWindowSize}
                    sx={{ textTransform: 'none' }}
                  >
                    重置窗口大小
                  </Button>
                </Box>
              </Grid>

              {/* Cache Management */}
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 3, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 2, 
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    color: 'warning.main', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    🗂️ 缓存管理
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    清除所有应用缓存数据，包括位置信息、标签组、视频缩略图等
                  </Typography>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => setClearCacheConfirmOpen(true)}
                    sx={{ textTransform: 'none' }}
                  >
                    清除所有缓存
                  </Button>
                </Box>
              </Grid>

              {/* Auto Update Settings */}
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 3, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 2, 
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    color: 'success.main', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    🔄 自动更新
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.primary">
                        启动时自动检查更新
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        应用启动时自动检查是否有新版本可用
                      </Typography>
                    </Box>
                    <Switch
                      checked={autoUpdateEnabled}
                      onChange={(e) => handleAutoUpdateToggle(e.target.checked)}
                      color="primary"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleCheckForUpdates}
                      disabled={checkingForUpdates}
                      sx={{ textTransform: 'none' }}
                    >
                      {checkingForUpdates ? '检查中...' : '手动检查更新'}
                    </Button>
                    
                    {updateAvailable && !updateDownloaded && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleDownloadUpdate}
                        disabled={updateDownloading}
                        startIcon={updateDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                        sx={{ textTransform: 'none' }}
                      >
                        {updateDownloading ? `下载中 ${Math.round(updateProgress)}%` : '下载更新'}
                      </Button>
                    )}
                    
                    {updateDownloaded && (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleInstallUpdate}
                        startIcon={<UpdateIcon />}
                        sx={{ textTransform: 'none' }}
                      >
                        安装并重启
                      </Button>
                    )}
                  </Box>
                  
                  {updateDownloading && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        下载进度: {Math.round(updateProgress)}%
                      </Typography>
                      <LinearProgress variant="determinate" value={updateProgress} />
                    </Box>
                  )}
                  
                  {updateError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {updateError}
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* About */}
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 3, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 2, 
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    color: 'info.main', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    ℹ️ 关于
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" color="text.primary">
                      <strong>TagAnything</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                       版本: {appVersion}
                     </Typography>
                    <Typography variant="body2" color="text.secondary">
                      一个功能强大的标签管理工具
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSettingsOpen(false)} color="primary">
              关闭
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clear Cache Confirmation Dialog */}
        <Dialog
          open={clearCacheConfirmOpen}
          onClose={() => setClearCacheConfirmOpen(false)}
          aria-labelledby="clear-cache-dialog-title"
        >
          <DialogTitle id="clear-cache-dialog-title">
            确认清除缓存
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              您确定要清除所有缓存数据吗？
            </Typography>
            <Typography variant="body2" color="text.secondary">
              此操作将清除以下数据：
            </Typography>
            <Typography variant="body2" color="text.secondary" component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>所有位置信息</li>
              <li>标签组设置</li>
              <li>视频缩略图缓存</li>
              <li>过滤器设置</li>
              <li>其他应用设置</li>
            </Typography>
            <Typography variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 'bold' }}>
              此操作无法撤销，应用将重新加载。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearCacheConfirmOpen(false)} color="primary">
              取消
            </Button>
            <Button onClick={handleClearCache} color="warning" variant="contained">
              确认清除
            </Button>
          </DialogActions>
        </Dialog>

        {/* Update Notification Dialog */}
        <Dialog
          open={updateDialogOpen}
          onClose={() => setUpdateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UpdateIcon color="primary" />
              发现新版本
            </Box>
          </DialogTitle>
          <DialogContent>
            {updateInfo && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  有新版本可用，是否要下载并安装？
                </Typography>
                <Box sx={{ 
                  bgcolor: 'background.default', 
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 2, 
                  borderRadius: 1, 
                  mb: 2 
                }}>
                  <Typography variant="body2" color="text.primary">
                    <strong>当前版本:</strong> {updateInfo.currentVersion}
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    <strong>最新版本:</strong> {updateInfo.version}
                  </Typography>
                  {updateInfo.releaseDate && (
                    <Typography variant="body2" color="text.primary">
                      <strong>发布日期:</strong> {new Date(updateInfo.releaseDate).toLocaleDateString('zh-CN')}
                    </Typography>
                  )}
                </Box>
                {updateInfo.releaseNotes && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      更新内容:
                    </Typography>
                    <Box 
                      sx={{ 
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        maxHeight: 300,
                        overflow: 'auto',
                        '& h2': {
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          margin: '0.5rem 0',
                          color: 'primary.main'
                        },
                        '& h3': {
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          margin: '0.4rem 0',
                          color: 'text.primary'
                        },
                        '& ul': {
                          margin: '0.5rem 0',
                          paddingLeft: '1.5rem'
                        },
                        '& li': {
                          margin: '0.2rem 0',
                          color: 'text.secondary'
                        },
                        '& strong': {
                          color: 'text.primary',
                          fontWeight: 'bold'
                        },
                        '& p': {
                          margin: '0.5rem 0',
                          color: 'text.secondary'
                        },
                        '& hr': {
                          margin: '1rem 0',
                          border: 'none',
                          borderTop: '1px solid',
                          borderColor: 'divider'
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpdateDialogOpen(false)} color="inherit">
              稍后提醒
            </Button>
            <Button 
              onClick={() => {
                setUpdateDialogOpen(false);
                // 打开外部链接到GitHub releases页面
                if (updateInfo?.downloadUrl) {
                  window.electron.openExternal(updateInfo.downloadUrl);
                }
              }} 
              color="primary"
            >
              手动下载
            </Button>
            <Button 
              onClick={() => {
                setUpdateDialogOpen(false);
                handleDownloadUpdate();
              }} 
              color="primary" 
              variant="contained"
            >
              立即更新
            </Button>
          </DialogActions>
        </Dialog>

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
    </ThemeProvider>
  );
};

export default App;