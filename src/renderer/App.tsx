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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Folder as FolderIcon,
  Label as LabelIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Home as HomeIcon,
  Style as StyleIcon,
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

const App: React.FC = () => {
  const [sidebarView, setSidebarView] = useState<'locations' | 'tags' | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagDisplayStyle, setTagDisplayStyle] = useState<'original' | 'library'>('original');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearCacheConfirmOpen, setClearCacheConfirmOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  
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
              placeholder="搜索文件和标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                    <SearchIcon />
                  </InputAdornment>
                ),
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

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: theme.zIndex.speedDial,
          }}
        >
          <AddIcon />
        </Fab>

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
                <FormControl component="fieldset">
                  <FormLabel component="legend">窗口设置</FormLabel>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      默认窗口大小: 1200 × 800 像素
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
                </FormControl>
              </Grid>

              {/* Cache Management */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">缓存管理</FormLabel>
                  <Box sx={{ mt: 1 }}>
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
                </FormControl>
              </Grid>

              {/* About */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">关于</FormLabel>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    TagAnything - 文件标签管理工具
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    版本: 1.0.0
                  </Typography>
                </FormControl>
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

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleSnackbarClose}
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