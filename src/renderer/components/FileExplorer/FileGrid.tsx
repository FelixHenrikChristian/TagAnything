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
import { getDisplayName, getFileTypeColor, formatFileSize, getFileExtension, formatModifiedDate } from '../../utils/fileTagParser';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper function
const toFileUrl = (path: string) => {
    return 'file://' + path.replace(/\\/g, '/');
};

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
    handleTagDrop: (file: FileItem, tag: Tag) => void;
    reorderTagWithinFile: (file: FileItem, oldIndex: number, newIndex: number) => void;
}

const SortableTag = ({ tag, file, tagDisplayStyle, onContextMenu, index }: { tag: Tag, file: FileItem, tagDisplayStyle: 'original' | 'library', onContextMenu: (event: React.MouseEvent, tag: Tag, file: FileItem) => void, index: number }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `${file.path}-${tag.id}`, data: { type: 'FILE_TAG', tag, filePath: file.path, index } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
    };

    const getTagStyle = (t: Tag, styleType: 'original' | 'library') => {
        if (t.groupId === 'temporary') {
            return {
                variant: 'filled' as const,
                backgroundColor: t.color + '40',
                borderColor: t.color,
                color: '#fff',
                border: '1px dashed ' + t.color,
            };
        }
        if (styleType === 'library') {
            return {
                variant: 'filled' as const,
                backgroundColor: t.color,
                color: t.textcolor || '#fff',
                borderColor: t.color,
            };
        } else {
            return {
                variant: 'outlined' as const,
                backgroundColor: t.color + '20',
                borderColor: t.color,
                color: t.color,
            };
        }
    };

    const chipStyle = getTagStyle(tag, tagDisplayStyle);

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <Chip
                label={tag.name}
                size="small"
                variant={chipStyle.variant}
                onContextMenu={(e) => onContextMenu(e, tag, file)}
                sx={{
                    backgroundColor: chipStyle.backgroundColor,
                    borderColor: chipStyle.borderColor,
                    color: chipStyle.color,
                    border: chipStyle.border,
                    height: '18px',
                    fontSize: '0.6rem',
                    '& .MuiChip-label': { px: 0.5 },
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

    const { active, over } = useDndContext();

    // Calculate optimistic tags for "Squeeze" effect
    const optimisticTags = React.useMemo(() => {
        if (!active || active.data.current?.type !== 'LIBRARY_TAG') {
            return fileTags;
        }

        // Check if we are dragging over this file or one of its tags
        const isOverFile = over?.id === file.path;
        const isOverTag = over?.data.current?.type === 'FILE_TAG' && over?.data.current?.filePath === file.path;

        if (!isOverFile && !isOverTag) {
            return fileTags;
        }

        const draggedTag = active.data.current.tag;
        // Avoid duplicates if the file already has this tag
        if (fileTags.some(t => t.id === draggedTag.id)) {
            return fileTags;
        }

        const newTags = [...fileTags];
        let insertIndex = newTags.length; // Default to end

        if (isOverTag) {
            const overTagId = over?.data.current?.tag.id;

            // Check if we are over the placeholder itself
            if (overTagId === draggedTag.id) {
                // Keep the placeholder where it was
                if (typeof over?.data.current?.index === 'number') {
                    insertIndex = over.data.current.index;
                }
            } else {
                const overIndex = newTags.findIndex(t => t.id === overTagId);
                if (overIndex !== -1) {
                    insertIndex = overIndex;
                }
            }
        }

        // Create a temporary tag object for display
        const tempTag = { ...draggedTag, id: draggedTag.id, groupId: 'temporary' };

        newTags.splice(insertIndex, 0, tempTag);
        return newTags;
    }, [active, over, fileTags, file.path]);


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
                border: 'none',
                transform: 'none',
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
            {!file.isDirectory && (optimisticTags.length > 0) && (
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
                        items={optimisticTags.map(t => `${file.path}-${t.id}`)}
                        strategy={rectSortingStrategy}
                    >
                        {optimisticTags.map((tag, index) => (
                            <SortableTag
                                key={`${file.path}-${tag.id}`}
                                tag={tag}
                                file={file}
                                tagDisplayStyle={tagDisplayStyle}
                                onContextMenu={handleTagContextMenu}
                                index={index}
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
