
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
    const { hue, saturation = 120 } = settings;

    // Primary color based on hue (neon effect with high saturation)
    const primaryMain = hslColor(hue, 100, 60); // Brighter main
    const primaryLight = hslColor(hue, 100, 80);
    const primaryDark = hslColor(hue, 100, 45);

    // Secondary color is complementary (offset by 180 degrees for contrast, or magenta-ish)
    const secondaryHue = (hue + 180) % 360;
    const secondaryMain = hslColor(secondaryHue, 100, 60);

    // Glass effect helpers
    const glassBorder = `1px solid ${hslColor(hue, 80, 70, 0.3)}`;
    const glassShadow = `0 8px 32px 0 rgba(0, 0, 0, 0.3)`;
    const textGlow = `0 0 10px ${hslColor(hue, 100, 50, 0.5)}`;

    // Accent colors for UI elements
    const accentAlpha15 = hslColor(hue, 100, 60, 0.15);
    const accentAlpha30 = hslColor(hue, 100, 60, 0.30);

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
                paper: 'rgba(20, 20, 25, 0.6)', // Slightly darker base
            },
            text: {
                primary: '#ffffff',
                secondary: 'rgba(255, 255, 255, 0.85)',
            },
            divider: 'rgba(255, 255, 255, 0.15)',
            action: {
                hover: 'rgba(255, 255, 255, 0.1)',
                selected: accentAlpha15,
                focus: accentAlpha15,
            },
        },
        typography: {
            fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
            h6: {
                fontWeight: 600,
                letterSpacing: '0.5px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            },
            button: {
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
                            width: '6px',
                            height: '6px',
                        },
                        '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                            borderRadius: 6,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            minHeight: 24,
                            border: '1px solid rgba(255,255,255,0.1)',
                        },
                        '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
                            backgroundColor: primaryMain,
                            boxShadow: `0 0 8px ${primaryMain}`,
                        },
                        '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
                            backgroundColor: 'rgba(255,255,255,0.4)',
                        },
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backdropFilter: `blur(20px) saturate(${saturation}%)`,
                        border: glassBorder,
                        boxShadow: glassShadow,
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        // Default styles - will be overridden by dynamic inline styles
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: `blur(20px) saturate(${saturation}%)`,
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
                        borderBottom: glassBorder,
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        // Default styles - will be overridden by dynamic inline styles
                        backgroundColor: 'rgba(10, 10, 15, 0.7)',
                        backdropFilter: `blur(25px) saturate(${saturation}%)`,
                        borderRight: glassBorder,
                        boxShadow: '5px 0 30px rgba(0,0,0,0.3)',
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        backgroundColor: 'rgba(30, 30, 40, 0.75)',
                        backdropFilter: `blur(40px) saturate(${saturation}%)`,
                        border: `1px solid ${hslColor(hue, 100, 70, 0.4)}`, // Brighter border for dialogs
                        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 20px ${hslColor(hue, 100, 50, 0.1)}`,
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        backdropFilter: 'none', // Performance optimization retained
                        backgroundColor: 'rgba(40, 40, 50, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 12px 30px rgba(0, 0, 0, 0.4), 0 0 15px ${hslColor(hue, 100, 50, 0.2)}`,
                            borderColor: primaryMain,
                        }
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        textTransform: 'none',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                    },
                    contained: {
                        backgroundImage: `linear-gradient(45deg, ${hslColor(hue, 100, 40)} 30%, ${hslColor(hue, 100, 60)} 90%)`,
                        boxShadow: `0 4px 15px ${hslColor(hue, 100, 50, 0.4)}`,
                        border: '1px solid rgba(255,255,255,0.2)',
                        '&:hover': {
                            boxShadow: `0 6px 20px ${hslColor(hue, 100, 60, 0.6)}`,
                            transform: 'scale(1.02)',
                        }
                    },
                    outlined: {
                        borderColor: primaryMain,
                        color: primaryLight,
                        '&:hover': {
                            borderColor: primaryLight,
                            backgroundColor: accentAlpha15,
                            boxShadow: `0 0 10px ${accentAlpha30}`,
                        }
                    },
                    text: {
                        color: primaryLight,
                        '&:hover': {
                            backgroundColor: accentAlpha15,
                        }
                    }
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: 'rgba(255,255,255,0.8)',
                        transition: 'all 0.2s',
                        '&:hover': {
                            backgroundColor: accentAlpha15,
                            color: '#ffffff',
                            transform: 'scale(1.1)',
                            boxShadow: `0 0 10px ${accentAlpha30}`,
                        }
                    }
                }
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        backdropFilter: 'blur(5px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                    filled: {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                    outlined: {
                        borderColor: 'rgba(255,255,255,0.3)',
                    }
                }
            },
            // Snackbar and Alert glassmorphism styling
            MuiSnackbarContent: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'rgba(20, 20, 30, 0.75)',
                        backdropFilter: `blur(20px) saturate(${saturation}%)`,
                        border: glassBorder,
                        borderRadius: 12,
                        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.05)`,
                    },
                },
            },
            MuiAlert: {
                styleOverrides: {
                    root: {
                        backdropFilter: `blur(20px) saturate(${saturation}%)`,
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 12,
                        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3)`,
                    },
                    standardSuccess: {
                        backgroundColor: 'rgba(46, 125, 50, 0.6)',
                        color: '#b9f6ca',
                        border: '1px solid rgba(46, 125, 50, 0.5)',
                    },
                    standardError: {
                        backgroundColor: 'rgba(211, 47, 47, 0.6)',
                        color: '#ffcdd2',
                        border: '1px solid rgba(211, 47, 47, 0.5)',
                    },
                    standardWarning: {
                        backgroundColor: 'rgba(237, 108, 2, 0.6)',
                        color: '#ffe0b2',
                        border: '1px solid rgba(237, 108, 2, 0.5)',
                    },
                    standardInfo: {
                        backgroundColor: 'rgba(2, 136, 209, 0.6)',
                        color: '#b3e5fc',
                        border: '1px solid rgba(2, 136, 209, 0.5)',
                    },
                    filledSuccess: {
                        backgroundColor: 'rgba(46, 125, 50, 0.85)',
                        boxShadow: '0 4px 15px rgba(46, 125, 50, 0.4)',
                    },
                    filledError: {
                        backgroundColor: 'rgba(211, 47, 47, 0.85)',
                        boxShadow: '0 4px 15px rgba(211, 47, 47, 0.4)',
                    },
                    filledWarning: {
                        backgroundColor: 'rgba(237, 108, 2, 0.85)',
                        boxShadow: '0 4px 15px rgba(237, 108, 2, 0.4)',
                    },
                    filledInfo: {
                        backgroundColor: 'rgba(2, 136, 209, 0.85)',
                        boxShadow: '0 4px 15px rgba(2, 136, 209, 0.4)',
                    },
                },
            },
            // LinearProgress with neon glow
            MuiLinearProgress: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 4,
                        height: 6,
                    },
                    bar: {
                        borderRadius: 4,
                        boxShadow: `0 0 10px ${hslColor(hue, 100, 50, 0.8)}`,
                        backgroundImage: `linear-gradient(90deg, ${hslColor(hue, 100, 50)}, ${hslColor(hue, 100, 80)})`,
                    },
                },
            },
            // Menu/Popover styling
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        backgroundColor: 'rgba(25, 25, 35, 0.85) !important',
                        backdropFilter: `blur(20px) saturate(${saturation}%) !important`,
                        border: glassBorder,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    }
                }
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        transition: 'all 0.2s',
                        margin: '2px 6px', // Increased horizontal margin slightly for better look
                        borderRadius: 8,
                        '&:hover': {
                            backgroundColor: accentAlpha15,
                            // transform removed to fix asymmetry
                        },
                        '&.Mui-selected': {
                            backgroundColor: accentAlpha30,
                            border: `1px solid ${hslColor(hue, 100, 50, 0.3)}`,
                            '&:hover': {
                                backgroundColor: accentAlpha30,
                            }
                        }
                    }
                }
            },
        },
    };
};

// Legacy export for backward compatibility
export const neonGlassTheme: ThemeOptions = createNeonGlassTheme();
