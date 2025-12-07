import React from 'react';
import {
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    Box,
    ListItemText,
    Typography,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Folder as FolderIcon,
    InsertDriveFile as FileIcon,
    MoreVert as MoreIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { FileItem, Tag } from '../../types';
import { getDisplayName, getFileTypeColor, formatFileSize } from '../../utils/fileTagParser';

interface FileListProps {
    files: FileItem[];
    handleNavigate: (path: string) => void;
    handleFileOpen: (file: FileItem) => void;
    handleContextMenu: (event: React.MouseEvent, file: FileItem) => void;
    handleTagContextMenu: (event: React.MouseEvent, tag: Tag, file: FileItem) => void;
    videoThumbnails: Map<string, string>;
    getFileTags: (file: FileItem) => Tag[];
    tagDisplayStyle: 'original' | 'library';
}

export const FileList: React.FC<FileListProps> = ({
    files,
    handleNavigate,
    handleFileOpen,
    handleContextMenu,
    handleTagContextMenu,
    videoThumbnails,
    getFileTags,
    tagDisplayStyle,
}) => {
    const toFileUrl = (p: string) => 'file:///' + p.replace(/\\/g, '/');

    const getTagStyle = (tag: Tag) => {
        if (tag.groupId === 'temporary') {
            return {
                variant: 'filled' as const,
                backgroundColor: tag.color + '40',
                borderColor: tag.color,
                color: '#fff',
                border: '1px dashed ' + tag.color,
            };
        }

        if (tagDisplayStyle === 'library') {
            return {
                variant: 'filled' as const,
                backgroundColor: tag.color,
                color: tag.textcolor || '#fff',
                borderColor: tag.color,
            };
        } else {
            return {
                variant: 'outlined' as const,
                backgroundColor: tag.color + '20',
                borderColor: tag.color,
                color: tag.color,
            };
        }
    };

    return (
        <List>
            {files.map((file) => (
                <ListItem
                    key={file.path}
                    data-file-path={file.path}
                    button
                    draggable={false}
                    onClick={() => {
                        if (file.isDirectory) {
                            handleNavigate(file.path);
                        } else {
                            handleFileOpen(file);
                        }
                    }}
                    onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, file); }}
                    onDragStart={(e) => e.preventDefault()}
                    sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        '&:hover': {
                            backgroundColor: 'action.hover',
                        },
                    }}
                >
                    <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'transparent' }}>
                            {file.isDirectory ? (
                                <FolderIcon sx={{ color: '#ffa726' }} />
                            ) : (
                                videoThumbnails.has(file.path) ? (
                                    <Box
                                        component="img"
                                        src={toFileUrl(videoThumbnails.get(file.path) as string)}
                                        alt={file.name}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            objectFit: 'cover',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}
                                    />
                                ) : (
                                    <FileIcon sx={{ color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
                                )
                            )}
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        primary={
                            <Tooltip title={file.name} placement="top" arrow>
                                <Typography
                                    sx={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {getDisplayName(file.name)}
                                </Typography>
                            </Tooltip>
                        }
                        secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                {!file.isDirectory && (
                                    <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(file.size || 0)}
                                    </Typography>
                                )}
                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                    {getFileTags(file).map((tag, index) => {
                                        const tagStyle = getTagStyle(tag);
                                        return (
                                            <Chip
                                                key={index}
                                                size="small"
                                                label={tag.name}
                                                variant={tagStyle.variant}
                                                sx={{
                                                    backgroundColor: tagStyle.backgroundColor,
                                                    borderColor: tagStyle.borderColor,
                                                    color: tagStyle.color,
                                                    fontSize: '0.7rem',
                                                    height: '20px',
                                                    border: tagStyle.border,
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        opacity: 0.8,
                                                        transform: 'scale(1.05)',
                                                    },
                                                    '& .MuiChip-label': {
                                                        px: 0.5
                                                    }
                                                }}
                                                onClick={(e) => handleTagContextMenu(e, tag, file)}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        }
                    />
                    <IconButton
                        edge="end"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, file);
                        }}
                    >
                        <MoreIcon />
                    </IconButton>
                </ListItem>
            ))}
        </List>
    );
};
