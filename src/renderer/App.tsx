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
  
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  useEffect(() => {
    setDarkMode(prefersDarkMode);
  }, [prefersDarkMode]);

  const theme = createAppTheme(darkMode ? 'dark' : 'light');

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
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

            <IconButton color="inherit">
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
              <FileExplorer />
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
      </Box>
    </ThemeProvider>
  );
};

export default App;