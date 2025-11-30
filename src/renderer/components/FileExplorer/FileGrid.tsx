import React, { useRef, useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Tooltip,
} from '@mui/material';
import {
    Folder as FolderIcon,
    InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { FileItem, Tag } from '../../types';
import { getDisplayName, getFileTypeColor, formatFileSize } from '../../utils/fileTagParser';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FileGridProps {
    files: FileItem[];
    handleNavigate: (path: string) => void;
    handleFileOpen: (file: FileItem) => void;
    handleContextMenu: (event: React.MouseEvent, file: FileItem) => void;
    handleTagContextMenu: (event: React.MouseEvent, tag: Tag, file: FileItem) => void;
    videoThumbnails: Map<string, string>;
    getFileTags: (file: FileItem) => Tag[];
    tagDisplayStyle: 'original' | 'library';
    gridSize: number;
    handleTagDrop: (file: FileItem, draggedTag: Tag) => void;
    reorderTagWithinFile: (file: FileItem, sourceIndex: number, targetIndex: number) => void;
}

const toFileUrl = (p: string) => 'file:///' + p.replace(/\\/g, '/');

const getTagStyle = (tag: Tag, tagDisplayStyle: 'original' | 'library') => {
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

const getFileExtension = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext ? ext.toUpperCase() : '';
};

const formatModifiedDate = (date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '今天';
    if (diffDays === 2) return '昨天';
    if (diffDays <= 7) return `${diffDays}天前`;

    return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
    });
};

const SortableTag = ({ tag, file, tagDisplayStyle, onContextMenu }: { tag: Tag; file: FileItem; tagDisplayStyle: 'original' | 'library'; onContextMenu: (e: React.MouseEvent, tag: Tag, file: FileItem) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `${file.path}-${tag.id}`,
        data: {
            type: 'FILE_TAG',
            tag,
            filePath: file.path,
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const tagStyle = getTagStyle(tag, tagDisplayStyle);

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <Chip
                size="small"
                label={tag.name}
                variant={tagStyle.variant}
                sx={{
                    backgroundColor: tagStyle.backgroundColor,
                    borderColor: tagStyle.borderColor,
                    color: tagStyle.color,
                    fontSize: '0.6rem',
                    height: '18px',
                    border: tagStyle.border,
                    opacity: 0.9,
                    backdropFilter: 'blur(4px)',
                    borderRadius: '4px',
                    cursor: 'grab',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        opacity: 1,
                        transform: 'scale(1.05)',
                    },
                    '&:active': {
                        cursor: 'grabbing',
                    },
                    '& .MuiChip-label': { px: 0.4 }
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    // Prevent context menu from triggering drag
                }}
                onContextMenu={(e) => {
                    // Prevent drag start on right click
                    e.stopPropagation();
                    onContextMenu(e, tag, file);
                }}
            />
        </div>
    );
};

const FileCard = ({
    file,
    handleNavigate,
    handleFileOpen,
    handleContextMenu,
    handleTagContextMenu,
    videoThumbnails,
    fileTags,
    tagDisplayStyle,
    gridItemWidth,
    thumbnailHeight,
    fileInfoHeight,
    tagOverlayHeight,
    iconSize,
}: {
    file: FileItem;
    handleNavigate: (path: string) => void;
    handleFileOpen: (file: FileItem) => void;
    handleContextMenu: (event: React.MouseEvent, file: FileItem) => void;
    handleTagContextMenu: (event: React.MouseEvent, tag: Tag, file: FileItem) => void;
    videoThumbnails: Map<string, string>;
    fileTags: Tag[];
    tagDisplayStyle: 'original' | 'library';
    gridItemWidth: number;
    thumbnailHeight: number;
    fileInfoHeight: number;
    tagOverlayHeight: string;
    iconSize: number;
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: file.path,
        data: {
            type: 'FILE',
            file,
        },
        disabled: file.isDirectory,
    });

    return (
        <Card
            ref={setNodeRef}
            key={file.path}
            draggable={false}
            sx={{
                height: thumbnailHeight + fileInfoHeight,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.1s, box-shadow 0.1s',
                border: isOver ? '2px solid #1dd19f' : 'none',
                transform: isOver ? 'scale(1.02)' : 'none',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                },
            }}
            onClick={() => {
                if (file.isDirectory) {
                    handleNavigate(file.path);
                } else {
                    handleFileOpen(file);
                }
            }}
            onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, file); }}
        >
            {/* Tag Overlay */}
            {!file.isDirectory && fileTags.length > 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        right: 4,
                        zIndex: 2,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.25,
                        maxHeight: tagOverlayHeight,
                        overflow: 'hidden',
                        justifyContent: 'flex-start',
                    }}
                >
                    <SortableContext
                        items={fileTags.map(t => `${file.path}-${t.id}`)}
                        strategy={rectSortingStrategy}
                    >
                        {fileTags.map((tag) => (
                            <SortableTag
                                key={`${file.path}-${tag.id}`}
                                tag={tag}
                                file={file}
                                tagDisplayStyle={tagDisplayStyle}
                                onContextMenu={handleTagContextMenu}
                            />
                        ))}
                    </SortableContext>
                </Box>
            )}

            {/* Thumbnail */}
            <Box
                sx={{
                    height: thumbnailHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: file.isDirectory ? 'transparent' : 'grey.50',
                    position: 'relative',
                    mb: 0,
                }}
            >
                {file.isDirectory ? (
                    <FolderIcon sx={{ fontSize: iconSize, color: '#ffa726' }} />
                ) : (
                    videoThumbnails.has(file.path) ? (
                        <Box
                            component="img"
                            src={toFileUrl(videoThumbnails.get(file.path) as string)}
                            alt={file.name}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    ) : (
                        <FileIcon sx={{ fontSize: iconSize, color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
                    )
                )}
            </Box>

            {/* File Info */}
            <CardContent
                sx={{
                    height: fileInfoHeight,
                    p: 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    '&:last-child': { pb: 0.5 }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0, width: '100%', mt: file.isDirectory ? 'auto' : 0 }}>

                    <Tooltip title={file.name} placement="top" arrow>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.75rem',
                                lineHeight: 1.2,
                                flex: 1,
                                cursor: 'pointer',
                            }}
                        >
                            {getDisplayName(file.name)}
                        </Typography>
                    </Tooltip>
                </Box>

                {!file.isDirectory && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 0,
                        width: '100%',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flexShrink: 1, overflow: 'hidden' }}>
                            {getFileExtension(file.name) && (
                                <Chip
                                    size="small"
                                    label={getFileExtension(file.name)}
                                    sx={{
                                        height: '16px',
                                        fontSize: '0.6rem',
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        '& .MuiChip-label': { px: 0.4 }
                                    }}
                                />
                            )}
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                                {formatFileSize(file.size || 0)}
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem', lineHeight: 1, ml: 1, flexShrink: 0 }}>
                            {formatModifiedDate(new Date(file.modified))}
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export const FileGrid: React.FC<FileGridProps> = ({
    files,
    handleNavigate,
    handleFileOpen,
    handleContextMenu,
    handleTagContextMenu,
    videoThumbnails,
    getFileTags,
    tagDisplayStyle,
    gridSize,
    handleTagDrop,
    reorderTagWithinFile,
}) => {
    // Grid Layout Calculations
    const GRID_CONFIG = {
        MAX_GRID_SIZE: 17,
        MIN_WIDTH: 80,
        MAX_WIDTH: 260,
    };

    const getGridItemSize = () => {
        const { MAX_GRID_SIZE, MIN_WIDTH, MAX_WIDTH } = GRID_CONFIG;
        const step = (MAX_WIDTH - MIN_WIDTH) / (MAX_GRID_SIZE - 1);
        // Allow float gridSize
        const clamped = Math.min(MAX_GRID_SIZE, Math.max(1, gridSize));
        return Math.round(MAX_WIDTH - (clamped - 1) * step);
    };

    const getIconSize = () => {
        const width = getGridItemSize();
        return Math.round(Math.max(48, Math.min(120, width * 0.6)));
    };

    const gridItemWidth = getGridItemSize();
    const iconSize = getIconSize();
    const thumbnailHeight = Math.floor(gridItemWidth * 0.6);
    const fileInfoHeight = 40;
    const tagOverlayHeight = 'calc(100% - 8px)';

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${gridItemWidth}px, 1fr))`,
                gap: 1,
                width: '100%',
                p: 1,
            }}
        >
            {files.map((file) => (
                <FileCard
                    key={file.path}
                    file={file}
                    handleNavigate={handleNavigate}
                    handleFileOpen={handleFileOpen}
                    handleContextMenu={handleContextMenu}
                    handleTagContextMenu={handleTagContextMenu}
                    videoThumbnails={videoThumbnails}
                    fileTags={getFileTags(file)}
                    tagDisplayStyle={tagDisplayStyle}
                    gridItemWidth={gridItemWidth}
                    thumbnailHeight={thumbnailHeight}
                    fileInfoHeight={fileInfoHeight}
                    tagOverlayHeight={tagOverlayHeight}
                    iconSize={iconSize}
                />
            ))}
        </Box>
    );
};
