import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from '@mui/icons-material';
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
    // Helper to normalize paths for comparison (handling Windows backslashes)
    const normalizePath = (path: string) => path.replace(/\\/g, '/').toLowerCase();

    // Find the location that matches the start of the current path
    // We sort by length descending to match the most specific location (e.g., if we have C:/ and C:/Users, and path is C:/Users/me, we want C:/Users)
    const matchedLocation = locations
        .sort((a, b) => b.path.length - a.path.length)
        .find(loc => normalizePath(currentPath).startsWith(normalizePath(loc.path)));

    if (!matchedLocation) {
        // Fallback: just show the full path if no location matches
        return (
            <Box sx={{ mb: 2, px: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    {currentPath}
                </Typography>
            </Box>
        );
    }

    // Calculate relative path
    // e.g. Location: C:/Users/Video, Current: C:/Users/Video/Folder/Sub
    // Relative: /Folder/Sub
    const locationPathNormalized = normalizePath(matchedLocation.path);
    const currentPathNormalized = normalizePath(currentPath);

    // Get the part of the path after the location path
    // We use the original currentPath to preserve case for display, but use lengths from normalized
    let relativePart = currentPath.slice(matchedLocation.path.length);

    // Remove leading slash/backslash if present
    if (relativePart.startsWith('\\') || relativePart.startsWith('/')) {
        relativePart = relativePart.slice(1);
    }

    // Split into segments
    const segments = relativePart ? relativePart.split(/[/\\]/) : [];

    return (
        <Box>
            <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
            >
                {/* Root Location Node */}
                {segments.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <HomeIcon fontSize="small" color="action" />
                        <Typography color="text.primary" fontWeight="bold">
                            {matchedLocation.name}
                        </Typography>
                    </Box>
                ) : (
                    <Link
                        underline="hover"
                        color="inherit"
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigate(matchedLocation.path);
                        }}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                        <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
                        {matchedLocation.name}
                    </Link>
                )}

                {/* Path Segments */}
                {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1;

                    // Reconstruct the path for this segment
                    // We need to be careful to use the correct separator or just append to the location path
                    // A safer way is to take the substring of currentPath up to the end of this segment
                    // But we need to find the correct index in the original string.

                    // Alternative: Accumulate segments.
                    // Since we split by / or \, we can just join them back with the system separator (or just / for now as it usually works)
                    // But to be safe with Windows, let's try to grab the substring.

                    // Let's use the accumulated path approach
                    const segmentPath = matchedLocation.path + (matchedLocation.path.endsWith('\\') || matchedLocation.path.endsWith('/') ? '' : '\\') + segments.slice(0, index + 1).join('\\');

                    return isLast ? (
                        <Typography key={index} color="text.primary">
                            {segment}
                        </Typography>
                    ) : (
                        <Link
                            key={index}
                            underline="hover"
                            color="inherit"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                handleNavigate(segmentPath);
                            }}
                        >
                            {segment}
                        </Link>
                    );
                })}
            </Breadcrumbs>
        </Box>
    );
};
