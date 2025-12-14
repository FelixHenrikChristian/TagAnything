
import { ThemeOptions } from '@mui/material/styles';
import { NeonGlassSettings, DEFAULT_NEON_GLASS_SETTINGS } from '../types';

// Helper function to convert HSL hue to CSS color values
const hslColor = (hue: number, saturation: number, lightness: number, alpha?: number): string => {
    if (alpha !== undefined) {
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    }
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Create dynamic theme based on user settings
export const createNeonGlassTheme = (settings: NeonGlassSettings = DEFAULT_NEON_GLASS_SETTINGS): ThemeOptions => {
    const { hue } = settings;

    // Primary color based on hue (neon effect with high saturation)
    const primaryMain = hslColor(hue, 100, 50);
    const primaryLight = hslColor(hue, 100, 75);
    const primaryDark = hslColor(hue, 100, 40);

    // Secondary color is complementary (offset by 180 degrees for contrast, or magenta-ish)
    const secondaryHue = (hue + 180) % 360;
    const secondaryMain = hslColor(secondaryHue, 100, 50);

    // Accent colors for UI elements
    const accentAlpha15 = hslColor(hue, 100, 50, 0.15);

    return {
        palette: {
            mode: 'dark',
            primary: {
                main: primaryMain,
                light: primaryLight,
                dark: primaryDark,
            },
            secondary: {
                main: secondaryMain,
            },
            background: {
                default: 'transparent',
                paper: 'rgba(30, 30, 30, 0.4)',
            },
            text: {
                primary: '#ffffff',
                secondary: 'rgba(255, 255, 255, 0.7)',
            },
            divider: 'rgba(255, 255, 255, 0.1)',
            action: {
                hover: 'rgba(255, 255, 255, 0.08)',
                selected: accentAlpha15,
            },
        },
        typography: {
            fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
            h6: {
                fontWeight: 600,
                letterSpacing: '0.5px',
            },
        },
        shape: {
            borderRadius: 16,
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                        '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                            width: '8px',
                            height: '8px',
                        },
                        '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                            borderRadius: 8,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            minHeight: 24,
                        },
                        '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
                            backgroundColor: 'rgba(255,255,255,0.4)',
                        },
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        // Default styles - will be overridden by dynamic inline styles
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: 'none',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        // Default styles - will be overridden by dynamic inline styles
                        backgroundColor: 'rgba(10, 10, 10, 0.3)',
                        backdropFilter: 'blur(25px)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        backgroundColor: 'rgba(30, 30, 30, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        // Disable blur on cards to prevent flickering with many items
                        backdropFilter: 'none',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        textTransform: 'none',
                        fontWeight: 600,
                    },
                    contained: {
                        boxShadow: `0 0 10px ${hslColor(hue, 100, 50, 0.3)}`,
                    },
                },
            },
            // Snackbar and Alert glassmorphism styling
            MuiSnackbarContent: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'rgba(30, 30, 30, 0.8)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 12,
                        boxShadow: `0 4px 30px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.02)`,
                    },
                },
            },
            MuiAlert: {
                styleOverrides: {
                    root: {
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 12,
                        boxShadow: `0 4px 30px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.02)`,
                    },
                    standardSuccess: {
                        backgroundColor: 'rgba(46, 125, 50, 0.85)',
                        color: '#ffffff',
                    },
                    standardError: {
                        backgroundColor: 'rgba(211, 47, 47, 0.85)',
                        color: '#ffffff',
                    },
                    standardWarning: {
                        backgroundColor: 'rgba(237, 108, 2, 0.85)',
                        color: '#ffffff',
                    },
                    standardInfo: {
                        backgroundColor: 'rgba(2, 136, 209, 0.85)',
                        color: '#ffffff',
                    },
                    filledSuccess: {
                        backgroundColor: 'rgba(46, 125, 50, 0.9)',
                        backdropFilter: 'blur(20px)',
                    },
                    filledError: {
                        backgroundColor: 'rgba(211, 47, 47, 0.9)',
                        backdropFilter: 'blur(20px)',
                    },
                    filledWarning: {
                        backgroundColor: 'rgba(237, 108, 2, 0.9)',
                        backdropFilter: 'blur(20px)',
                    },
                    filledInfo: {
                        backgroundColor: 'rgba(2, 136, 209, 0.9)',
                        backdropFilter: 'blur(20px)',
                    },
                },
            },
            // LinearProgress with neon glow
            MuiLinearProgress: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 4,
                    },
                    bar: {
                        borderRadius: 4,
                        boxShadow: `0 0 8px ${hslColor(hue, 100, 50, 0.5)}`,
                    },
                },
            },
        },
    };
};

// Legacy export for backward compatibility
export const neonGlassTheme: ThemeOptions = createNeonGlassTheme();
