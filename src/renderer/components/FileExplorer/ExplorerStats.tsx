import React from 'react';
import { Box, Chip } from '@mui/material';
import { Folder as FolderIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import { FileItem } from '../../types';

interface ExplorerStatsProps {
    files: FileItem[];
    filteredFiles: FileItem[];
    isFiltering: boolean;
}

export const ExplorerStats: React.FC<ExplorerStatsProps> = ({
    files,
    filteredFiles,
    isFiltering,
}) => {
    const displayFiles = isFiltering ? filteredFiles : files;
    const folderCount = files.filter(f => f.isDirectory).length;
    const fileCount = displayFiles.filter(f => !f.isDirectory).length;

    return (
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            {!isFiltering && (
                <Chip
                    icon={<FolderIcon />}
                    label={`${folderCount} 个文件夹`}
                    variant="outlined"
                    size="small"
                />
            )}
            <Chip
                icon={<FileIcon />}
                label={`${fileCount} 个文件`}
                variant="outlined"
                size="small"
            />
        </Box>
    );
};
