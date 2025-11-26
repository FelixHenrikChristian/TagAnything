import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { Location } from '../../types';

interface FileBreadcrumbsProps {
    currentPath: string;
    locations: Location[];
    handleNavigate: (path: string) => void;
}

export const FileBreadcrumbs: React.FC<FileBreadcrumbsProps> = ({
    currentPath,
    locations,
    handleNavigate,
}) => {
    const getPathParts = (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);
        // If windows drive letter, keep it
        if (path.includes(':')) {
            // Handle windows paths specifically if needed, but split usually works
            // e.g. "C:/Users/Name" -> ["C:", "Users", "Name"]
        }
        return parts;
    };

    const pathParts = getPathParts(currentPath);

    return (
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <Link
                underline="hover"
                color="inherit"
                onClick={() => handleNavigate(locations[0]?.path || '')}
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                首页
            </Link>
            {pathParts.map((part, index) => {
                const isLast = index === pathParts.length - 1;
                const path = pathParts.slice(0, index + 1).join('/');
                // We need to reconstruct the path correctly.
                // If original path had backslashes, we should probably respect that or normalize.
                // But `handleNavigate` expects a path.
                // Let's assume `currentPath` format.

                // Actually, constructing path from parts might be tricky with drive letters on Windows.
                // "C:", "Users" -> "C:/Users" works.

                // Let's use a simpler approach:
                // We can't easily reconstruct the absolute path just from parts without knowing the root.
                // But `currentPath` is absolute.
                // We can find the index of the part in the string? No, duplicates.

                // Better approach:
                // Accumulate parts.

                // Wait, if I split "C:\Users\Name", I get ["C:", "Users", "Name"].
                // Join with "/" -> "C:/Users/Name". This is valid in Electron usually.

                const fullPath = pathParts.slice(0, index + 1).join('/');
                // On Windows, we might need to append "/" if it's just drive letter? No.

                return isLast ? (
                    <Typography key={index} color="text.primary">
                        {part}
                    </Typography>
                ) : (
                    <Link
                        key={index}
                        underline="hover"
                        color="inherit"
                        onClick={() => handleNavigate(fullPath)}
                        sx={{ cursor: 'pointer' }}
                    >
                        {part}
                    </Link>
                );
            })}
        </Breadcrumbs>
    );
};
