import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface ExplorerStatusBarProps {
    count: number;
}

export const ExplorerStatusBar: React.FC<ExplorerStatusBarProps> = ({ count }) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                height: '32px',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                px: 2,
                // Removed borderTop to create an "invisible boundary" effect
                // borderTop: `1px solid ${theme.palette.divider}`, 
                // Use transparent background to blend with the theme, or use a specific color if needed.
                // Windows 11 status bar often blends with the window background.
                backgroundColor: 'transparent',
                userSelect: 'none',
                // Ensure it sits above if there's any z-index play, but in flex it's fine.
                zIndex: 1,
            }}
        >
            <Typography variant="caption" color="text.secondary">
                {count} 个项目
            </Typography>
        </Box>
    );
};
