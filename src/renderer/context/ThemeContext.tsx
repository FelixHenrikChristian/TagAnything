
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeOptions, Theme } from '@mui/material/styles';
import { ThemeName, ColorMode, NeonGlassSettings, DEFAULT_NEON_GLASS_SETTINGS, DisplaySettings, DEFAULT_DISPLAY_SETTINGS } from '../types';
import { createNeonGlassTheme } from '../themes/neonGlass';

interface ThemeContextType {
    currentTheme: ThemeName;
    setTheme: (theme: ThemeName) => void;
    colorMode: ColorMode;
    setColorMode: (mode: ColorMode) => void;
    backgroundImage: string | null;
    setBackgroundImage: (path: string | null) => void;
    muiTheme: Theme;
    // Neon Glass customization
    neonGlassSettings: NeonGlassSettings;
    setNeonGlassSettings: (settings: NeonGlassSettings) => void;
    updateNeonGlassSetting: <K extends keyof NeonGlassSettings>(key: K, value: NeonGlassSettings[K]) => void;
    // Display settings
    displaySettings: DisplaySettings;
    setDisplaySettings: (settings: DisplaySettings) => void;
    updateDisplaySetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useAppTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used within a AppThemeProvider');
    }
    return context;
};

// Base light/dark themes (extracted from App.tsx original logic)
const createBaseTheme = (mode: 'light' | 'dark'): ThemeOptions => ({
    palette: {
        mode,
        primary: {
            light: mode === 'light' ? '#a6def4' : '#a6def4',
            main: mode === 'light' ? '#1dd19f' : '#3bc8ff',
            dark: mode === 'light' ? '#1dd19f' : '#3bc8ff',
        },
        secondary: {
            main: mode === 'light' ? '#777' : '#bbb',
        },
        background: {
            default: mode === 'light' ? '#fafafa' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
        },
        divider: mode === 'light' ? '#e0e0e0' : '#333',
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
                    scrollbarColor: mode === 'light' ? '#ccc transparent' : '#555 transparent',
                    '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                        borderRadius: 8,
                        backgroundColor: mode === 'light' ? '#ccc' : '#555',
                        minHeight: 24,
                    },
                    '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
                        backgroundColor: mode === 'light' ? '#999' : '#777',
                    },
                    '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
                        backgroundColor: mode === 'light' ? '#999' : '#777',
                    },
                    '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: mode === 'light' ? '#999' : '#777',
                    },
                    '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
                        backgroundColor: 'transparent',
                    },
                },
            },
        },
    },
});

const NEON_GLASS_SETTINGS_KEY = 'app_neon_glass_settings';
const THEME_KEY = 'app_theme';
const COLOR_MODE_KEY = 'app_color_mode';
const DISPLAY_SETTINGS_KEY = 'app_display_settings';

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<ThemeName>('classic');
    const [colorMode, setColorModeState] = useState<ColorMode>('light');
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [neonGlassSettings, setNeonGlassSettingsState] = useState<NeonGlassSettings>(DEFAULT_NEON_GLASS_SETTINGS);
    const [displaySettings, setDisplaySettingsState] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

    // Initial Load
    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_KEY) as ThemeName;
        if (savedTheme === 'classic' || savedTheme === 'neon-glass') {
            setCurrentTheme(savedTheme);
        } else {
            // 处理旧版本的 'light' | 'dark' 值：迁移到新的主题系统
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setCurrentTheme('classic');
                setColorModeState(savedTheme as ColorMode);
                localStorage.setItem(THEME_KEY, 'classic');
                localStorage.setItem(COLOR_MODE_KEY, savedTheme);
            } else {
                setCurrentTheme('classic');
            }
        }

        const savedColorMode = localStorage.getItem(COLOR_MODE_KEY) as ColorMode;
        if (savedColorMode === 'light' || savedColorMode === 'dark') {
            setColorModeState(savedColorMode);
        } else {
            // Default to system preference if no saved color mode
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setColorModeState(prefersDark ? 'dark' : 'light');
        }

        const savedBg = localStorage.getItem('app_background_image');
        if (savedBg) {
            setBackgroundImage(savedBg);
        }

        // Load neon glass settings
        const savedNeonSettings = localStorage.getItem(NEON_GLASS_SETTINGS_KEY);
        if (savedNeonSettings) {
            try {
                const parsed = JSON.parse(savedNeonSettings);
                setNeonGlassSettingsState({ ...DEFAULT_NEON_GLASS_SETTINGS, ...parsed });
            } catch (e) {
                console.error('Failed to parse neon glass settings:', e);
            }
        }

        // Load display settings
        const savedDisplaySettings = localStorage.getItem(DISPLAY_SETTINGS_KEY);
        if (savedDisplaySettings) {
            try {
                const parsed = JSON.parse(savedDisplaySettings);
                setDisplaySettingsState({ ...DEFAULT_DISPLAY_SETTINGS, ...parsed });
            } catch (e) {
                console.error('Failed to parse display settings:', e);
            }
        }
    }, []);

    const handleSetTheme = (theme: ThemeName) => {
        setCurrentTheme(theme);
        localStorage.setItem(THEME_KEY, theme);
    };

    const handleSetColorMode = (mode: ColorMode) => {
        setColorModeState(mode);
        localStorage.setItem(COLOR_MODE_KEY, mode);
    };

    const handleSetBackgroundImage = (path: string | null) => {
        setBackgroundImage(path);
        if (path) {
            localStorage.setItem('app_background_image', path);
        } else {
            localStorage.removeItem('app_background_image');
        }
    };

    const handleSetNeonGlassSettings = (settings: NeonGlassSettings) => {
        setNeonGlassSettingsState(settings);
        localStorage.setItem(NEON_GLASS_SETTINGS_KEY, JSON.stringify(settings));
    };

    const handleUpdateNeonGlassSetting = <K extends keyof NeonGlassSettings>(key: K, value: NeonGlassSettings[K]) => {
        setNeonGlassSettingsState(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem(NEON_GLASS_SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const handleSetDisplaySettings = (settings: DisplaySettings) => {
        setDisplaySettingsState(settings);
        localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(settings));
    };

    const handleUpdateDisplaySetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
        setDisplaySettingsState(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    };

    // Construct MUI theme object - memoized to avoid unnecessary recalculations
    const muiTheme = useMemo(() => {
        if (currentTheme === 'neon-glass') {
            return createTheme(createNeonGlassTheme(neonGlassSettings));
        }
        // For classic theme, use colorMode
        return createTheme(createBaseTheme(colorMode));
    }, [currentTheme, colorMode, neonGlassSettings]);

    const value = {
        currentTheme,
        setTheme: handleSetTheme,
        colorMode,
        setColorMode: handleSetColorMode,
        backgroundImage,
        setBackgroundImage: handleSetBackgroundImage,
        muiTheme,
        neonGlassSettings,
        setNeonGlassSettings: handleSetNeonGlassSettings,
        updateNeonGlassSetting: handleUpdateNeonGlassSetting,
        displaySettings,
        setDisplaySettings: handleSetDisplaySettings,
        updateDisplaySetting: handleUpdateDisplaySetting,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
