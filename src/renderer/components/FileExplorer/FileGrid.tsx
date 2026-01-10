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
import { getDisplayName, getDisplayNameWithoutExtension, getFileTypeColor, formatFileSize, getFileExtension, formatModifiedDate } from '../../utils/fileTagParser';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppTheme } from '../../context/ThemeContext';

// Helper function
const toFileUrl = (path: string) => {
    return 'file://' + path.replace(/\\/g, '/');
};

interface FileGridProps {
    files: FileItem[];
    handleNavigate: (path: string) => void;
    handleFileOpen: (file: FileItem) => void;
    handleContextMenu: (event: React.MouseEvent, file: FileItem, index: number) => void;
    handleTagContextMenu: (event: React.MouseEvent, tag: Tag, file: FileItem) => void;
    videoThumbnails: Map<string, string>;
    getFileTags: (file: FileItem) => Tag[];
    tagDisplayStyle: 'original' | 'library';
    gridSize: number;
    handleTagDrop: (file: FileItem, tag: Tag) => void;
    reorderTagWithinFile: (file: FileItem, oldIndex: number, newIndex: number) => void;
    selectedPaths?: Set<string>;
    onFileClick?: (event: React.MouseEvent, file: FileItem, index: number) => void;
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
                border: '1px solid ' + t.color,
            };
        } else {
            return {
                variant: 'outlined' as const,
                backgroundColor: t.color + '20',
                borderColor: t.color,
                color: t.color,
                border: '1px solid ' + t.color,
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
                onClick={(e) => {
                    e.stopPropagation();
                    onContextMenu(e, tag, file);
                }}
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
    isSelected = false,
    index,
    onFileClick,
    showFolderNameInIcon,
    showFileExtension,
    currentTheme,
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
    isSelected?: boolean;
    index: number;
    onFileClick?: (event: React.MouseEvent, file: FileItem, index: number) => void;
    showFolderNameInIcon?: boolean;
    showFileExtension?: boolean;
    currentTheme?: string;
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

    // Track image load error
    const [imageError, setImageError] = React.useState(false);

    // Track previous optimistic tags to prevent flickering
    const prevOptimisticTagsRef = React.useRef<Tag[]>(fileTags);

    // Calculate optimistic tags for "Squeeze" effect
    const optimisticTags = React.useMemo(() => {
        if (!active || active.data.current?.type !== 'LIBRARY_TAG') {
            const result = fileTags;
            prevOptimisticTagsRef.current = result;
            return result;
        }

        // Check if we are dragging over this file or one of its tags
        const isOverFile = over?.id === file.path;
        const isOverTag = over?.data.current?.type === 'FILE_TAG' && over?.data.current?.filePath === file.path;

        if (!isOverFile && !isOverTag) {
            const result = fileTags;
            prevOptimisticTagsRef.current = result;
            return result;
        }

        const draggedTag = active.data.current.tag;

        // If we're hovering over the placeholder itself, return previous state to prevent flickering
        if (isOverTag && over?.data.current?.tag.groupId === 'temporary') {
            return prevOptimisticTagsRef.current;
        }

        // Avoid duplicates if the file already has this tag
        if (fileTags.some(t => t.id === draggedTag.id)) {
            const result = fileTags;
            prevOptimisticTagsRef.current = result;
            return result;
        }

        const newTags = [...fileTags];
        let insertIndex = newTags.length; // Default to end

        if (isOverTag) {
            const overTagId = over?.data.current?.tag.id;
            const overIndex = newTags.findIndex(t => t.id === overTagId);
            if (overIndex !== -1) {
                insertIndex = overIndex;
            }
        }

        // Create a temporary tag object for display
        const tempTag = { ...draggedTag, id: draggedTag.id, groupId: 'temporary' };

        newTags.splice(insertIndex, 0, tempTag);
        prevOptimisticTagsRef.current = newTags;
        return newTags;
    }, [active, over, fileTags, file.path]);


    return (
        <Card
            ref={setNodeRef}
            data-file-path={file.path}
            key={file.path}
            draggable={false}
            sx={{
                height: thumbnailHeight + fileInfoHeight,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.1s, box-shadow 0.1s, border-color 0.1s',
                border: isSelected ? '2px solid #2196f3' : '2px solid transparent',
                transform: 'none',
                outline: isSelected ? '2px solid rgba(33, 150, 243, 0.3)' : 'none',
                outlineOffset: '1px',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                },
            }}
            onClick={(e) => {
                onFileClick?.(e, file, index);
            }}
            onDoubleClick={() => {
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
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FolderIcon sx={{ fontSize: iconSize, color: '#ffa726' }} />
                        {showFolderNameInIcon && (
                            <Typography
                                sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -35%)',
                                    fontSize: Math.max(10, iconSize * 0.18),
                                    fontWeight: 600,
                                    maxWidth: iconSize * 0.7,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center',
                                    pointerEvents: 'none',
                                    userSelect: 'none',
                                    ...(currentTheme === 'neon-glass' ? {
                                        color: '#fff',
                                        textShadow: '0 0 8px rgba(255, 166, 38, 0.8), 0 0 4px rgba(255, 166, 38, 0.5)',
                                    } : {
                                        color: 'rgba(120, 70, 0, 0.9)',
                                    }),
                                }}
                            >
                                {file.name}
                            </Typography>
                        )}
                    </Box>
                ) : (() => {
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'];
                    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                    const isImageFile = imageExtensions.includes(ext);
                    // 视频或图像都可以有缩略图
                    const hasThumbnail = videoThumbnails.has(file.path);

                    if (hasThumbnail) {
                        // 优先使用缩略图（无论是视频还是图像）
                        return (
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
                        );
                    } else if (isImageFile && !imageError) {
                        // 缩略图还未生成时，显示原始图像（可能会卡顿，但缩略图生成后会自动更新）
                        return (
                            <Box
                                component="img"
                                src={toFileUrl(file.path)}
                                alt={file.name}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                                onError={() => setImageError(true)}
                            />
                        );
                    } else {
                        return (
                            <FileIcon sx={{ fontSize: iconSize, color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
                        );
                    }
                })()}
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
                            {file.isDirectory ? file.name : (showFileExtension ? getDisplayName(file.name) : getDisplayNameWithoutExtension(file.name))}
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
    selectedPaths,
    onFileClick,
}) => {
    const { displaySettings, currentTheme } = useAppTheme();

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
    const tagOverlayHeight = `${thumbnailHeight - 8}px`;

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
            {files.map((file, index) => (
                <FileCard
                    key={file.path}
                    file={file}
                    handleNavigate={handleNavigate}
                    handleFileOpen={handleFileOpen}
                    handleContextMenu={(e, f) => handleContextMenu(e, f, index)}
                    handleTagContextMenu={handleTagContextMenu}
                    videoThumbnails={videoThumbnails}
                    fileTags={getFileTags(file)}
                    tagDisplayStyle={tagDisplayStyle}
                    gridItemWidth={gridItemWidth}
                    thumbnailHeight={thumbnailHeight}
                    fileInfoHeight={fileInfoHeight}
                    tagOverlayHeight={tagOverlayHeight}
                    iconSize={iconSize}
                    isSelected={selectedPaths?.has(file.path)}
                    index={index}
                    onFileClick={onFileClick}
                    showFolderNameInIcon={displaySettings.showFolderNameInIcon}
                    showFileExtension={!displaySettings.hideFileExtension}
                    currentTheme={currentTheme}
                />
            ))}
        </Box>
    );
};
