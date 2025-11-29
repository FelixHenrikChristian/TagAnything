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
import { DragState } from './types';
import { getDisplayName, getFileTypeColor, formatFileSize } from '../../utils/fileTagParser';

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
    dragState: DragState;
    setDragState: React.Dispatch<React.SetStateAction<DragState>>;
    handleTagDrop: (file: FileItem, draggedTag: Tag, event: React.DragEvent) => void;
    handleTagDropWithPosition: (file: FileItem, draggedTag: Tag, insertPosition: number) => void;
    reorderTagWithinFile: (file: FileItem, sourceIndex: number, targetIndex: number) => void;
}

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
    dragState,
    setDragState,
    handleTagDrop,
    handleTagDropWithPosition,
    reorderTagWithinFile,
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
                <Card
                    key={file.path}
                    draggable={false}
                    sx={{
                        height: thumbnailHeight + fileInfoHeight,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'transform 0.1s, box-shadow 0.1s', // Restore hover animation
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
                    onDragStart={(e) => {
                        const target = e.target as HTMLElement | null;
                        const isChip = !!target?.closest('.MuiChip-root');
                        if (!isChip) {
                            e.preventDefault();
                        }
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const isTagDragging = e.dataTransfer.types.includes('application/json') || (!!dragState.isDragging && !!dragState.draggedTag);
                        if (isTagDragging) {
                            if (file.isDirectory) return; // Disable tagging for folders
                            e.dataTransfer.dropEffect = 'copy';
                            setDragState(prev => ({
                                ...prev,
                                targetFile: file,
                                insertPosition: -1,
                            }));
                        }
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        try {
                            if (file.isDirectory) return; // Disable tagging for folders
                            const data = e.dataTransfer.getData('application/json');
                            if (data) {
                                const draggedData = JSON.parse(data);
                                if (draggedData.type === 'tag' && draggedData.tag) {
                                    handleTagDrop(file, draggedData.tag, e);
                                    return;
                                }
                            }
                            if (dragState.draggedTag) {
                                handleTagDrop(file, dragState.draggedTag, e);
                            }
                        } catch (error) {
                            console.error('处理拖拽数据失败:', error);
                        }
                    }}
                >
                    {/* Tag Overlay */}
                    {!file.isDirectory && (getFileTags(file).length > 0 || (dragState.targetFile?.path === file.path && dragState.isDragging)) && (
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
                                minHeight: dragState.targetFile?.path === file.path && dragState.isDragging ? '18px' : 'auto',
                                justifyContent: 'flex-start',
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const isTagDragging = e.dataTransfer.types.includes('application/json') || (!!dragState.isDragging && !!dragState.draggedTag);
                                if (isTagDragging) {
                                    if (dragState.sourceFilePath && dragState.sourceFilePath === file.path) {
                                        e.dataTransfer.dropEffect = 'move';
                                    } else {
                                        e.dataTransfer.dropEffect = 'copy';
                                    }

                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;

                                    const tagNodeList = e.currentTarget.querySelectorAll('.MuiChip-root:not(.drag-preview)');
                                    const tagElements = Array.from(tagNodeList) as HTMLElement[];
                                    let insertPosition = -1;

                                    if (tagElements.length > 0) {
                                        const thresholdY = 8;
                                        const rows: { startIndex: number; endIndex: number; top: number; bottom: number }[] = [];

                                        for (let i = 0; i < tagElements.length; i++) {
                                            const tagRect = tagElements[i].getBoundingClientRect();
                                            const top = tagRect.top - rect.top;
                                            const bottom = tagRect.bottom - rect.top;

                                            if (rows.length === 0) {
                                                rows.push({ startIndex: i, endIndex: i, top, bottom });
                                            } else {
                                                const last = rows[rows.length - 1];
                                                if (Math.abs(top - last.top) <= thresholdY) {
                                                    last.endIndex = i;
                                                    last.top = Math.min(last.top, top);
                                                    last.bottom = Math.max(last.bottom, bottom);
                                                } else {
                                                    rows.push({ startIndex: i, endIndex: i, top, bottom });
                                                }
                                            }
                                        }

                                        let targetRowIndex = -1;
                                        for (let r = 0; r < rows.length; r++) {
                                            const row = rows[r];
                                            if (y >= row.top - thresholdY && y <= row.bottom + thresholdY) {
                                                targetRowIndex = r;
                                                break;
                                            }
                                        }
                                        if (targetRowIndex === -1) {
                                            let minDelta = Infinity;
                                            for (let r = 0; r < rows.length; r++) {
                                                const row = rows[r];
                                                const midY = (row.top + row.bottom) / 2;
                                                const delta = Math.abs(y - midY);
                                                if (delta < minDelta) {
                                                    minDelta = delta;
                                                    targetRowIndex = r;
                                                }
                                            }
                                        }

                                        const targetRow = rows[targetRowIndex];
                                        let positioned = false;
                                        for (let i = targetRow.startIndex; i <= targetRow.endIndex; i++) {
                                            const tagRect = tagElements[i].getBoundingClientRect();
                                            const tagCenterX = (tagRect.left - rect.left) + tagRect.width / 2;
                                            if (x < tagCenterX) {
                                                insertPosition = i;
                                                positioned = true;
                                                break;
                                            }
                                        }
                                        if (!positioned) {
                                            insertPosition = targetRow.endIndex + 1;
                                        }
                                    }

                                    setDragState(prev => ({
                                        ...prev,
                                        targetFile: file,
                                        insertPosition,
                                        previewPosition: { x: e.clientX, y: e.clientY },
                                    }));

                                    e.currentTarget.setAttribute('data-insert-position', insertPosition.toString());
                                }
                            }}
                            onDragLeave={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX;
                                const y = e.clientY;

                                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                    setDragState(prev => ({
                                        ...prev,
                                        targetFile: null,
                                        insertPosition: -1,
                                        previewPosition: null,
                                    }));
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const insertPosition = parseInt(e.currentTarget.getAttribute('data-insert-position') || '-1');

                                try {
                                    const data = e.dataTransfer.getData('application/json');
                                    if (data) {
                                        const draggedData = JSON.parse(data);
                                        if (draggedData.type === 'fileTag' && draggedData.tag) {
                                            const sourcePath = draggedData.sourceFilePath as string | undefined;
                                            const sourceIndex = draggedData.sourceIndex as number | undefined;
                                            if (sourcePath && sourceIndex !== undefined) {
                                                if (sourcePath === file.path) {
                                                    reorderTagWithinFile(file, sourceIndex, insertPosition);
                                                } else {
                                                    handleTagDropWithPosition(file, draggedData.tag, insertPosition);
                                                }
                                            }
                                            return;
                                        } else if (draggedData.type === 'tag' && draggedData.tag) {
                                            handleTagDropWithPosition(file, draggedData.tag, insertPosition);
                                            return;
                                        }
                                    }
                                    if (dragState.draggedTag) {
                                        const isSameFile = dragState.sourceFilePath && dragState.sourceFilePath === file.path;
                                        if (isSameFile && dragState.sourceIndex !== null && dragState.sourceIndex !== undefined) {
                                            reorderTagWithinFile(file, dragState.sourceIndex, insertPosition);
                                        } else {
                                            handleTagDropWithPosition(file, dragState.draggedTag, insertPosition);
                                        }
                                    }
                                } catch (error) {
                                    console.error('处理标签拖拽数据失败:', error);
                                }

                                setDragState(prev => ({
                                    ...prev,
                                    targetFile: null,
                                    insertPosition: -1,
                                    previewPosition: null,
                                    sourceFilePath: null,
                                    sourceIndex: null,
                                }));
                            }}
                        >
                            {getFileTags(file).map((tag, index) => {
                                const tagStyle = getTagStyle(tag);
                                const isTargetFile = dragState.targetFile?.path === file.path;
                                const shouldShowPreview = isTargetFile && dragState.isDragging && dragState.draggedTag;
                                const insertPos = dragState.insertPosition;
                                const showPreviewBefore = shouldShowPreview && insertPos === index;

                                return (
                                    <React.Fragment key={index}>
                                        {showPreviewBefore && dragState.draggedTag && (
                                            <Chip
                                                size="small"
                                                label={dragState.draggedTag.name}
                                                className="drag-preview"
                                                sx={{
                                                    backgroundColor: dragState.draggedTag.color || '#1976d2',
                                                    color: 'white',
                                                    fontSize: '0.6rem',
                                                    height: '18px',
                                                    borderRadius: '4px',
                                                    opacity: 0.6,
                                                    animation: 'fadeIn 0.2s ease-in-out',
                                                    transform: 'scale(0.95)',
                                                    border: '2px dashed rgba(255,255,255,0.8)',
                                                    '& .MuiChip-label': { px: 0.4 },
                                                    '@keyframes fadeIn': {
                                                        from: { opacity: 0, transform: 'scale(0.8)' },
                                                        to: { opacity: 0.6, transform: 'scale(0.95)' }
                                                    }
                                                }}
                                            />
                                        )}

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
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease-in-out',
                                                transform: shouldShowPreview && insertPos <= index ? 'translateX(4px)' : 'translateX(0)',
                                                '&:hover': {
                                                    opacity: 1,
                                                    transform: 'scale(1.05)',
                                                },
                                                '& .MuiChip-label': { px: 0.4 }
                                            }}
                                            draggable
                                            onDragStart={(e) => {
                                                e.stopPropagation();
                                                e.dataTransfer.setData('application/json', JSON.stringify({
                                                    type: 'fileTag',
                                                    tag,
                                                    sourceFilePath: file.path,
                                                    sourceIndex: index,
                                                }));
                                                e.dataTransfer.effectAllowed = 'move';

                                                const dragImage = document.createElement('div');
                                                dragImage.style.cssText = `
                          position: absolute;
                          top: -1000px;
                          left: -1000px;
                          background: ${tag.color || '#1976d2'};
                          color: ${tag.textcolor || '#fff'};
                          padding: 4px 8px;
                          border-radius: 4px;
                          font-size: 12px;
                          font-weight: 500;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                          z-index: 9999;
                        `;
                                                dragImage.textContent = tag.name;
                                                document.body.appendChild(dragImage);
                                                e.dataTransfer.setDragImage(dragImage, 0, 0);

                                                window.dispatchEvent(new CustomEvent('tagDragStart', {
                                                    detail: { tag, sourceFilePath: file.path, sourceIndex: index }
                                                }));

                                                setTimeout(() => {
                                                    try { document.body.removeChild(dragImage); } catch { }
                                                }, 0);
                                            }}
                                            onDragEnd={() => {
                                                window.dispatchEvent(new CustomEvent('tagDragEnd'));
                                            }}
                                            onClick={(e) => handleTagContextMenu(e, tag, file)}
                                        />
                                    </React.Fragment>
                                );
                            })}

                            {dragState.targetFile?.path === file.path &&
                                dragState.isDragging &&
                                dragState.draggedTag &&
                                (dragState.insertPosition === -1 || dragState.insertPosition >= getFileTags(file).length) && (
                                    <Chip
                                        size="small"
                                        label={dragState.draggedTag.name}
                                        className="drag-preview"
                                        sx={{
                                            backgroundColor: dragState.draggedTag.color || '#1976d2',
                                            color: 'white',
                                            fontSize: '0.6rem',
                                            height: '18px',
                                            borderRadius: '4px',
                                            opacity: 0.6,
                                            animation: 'fadeIn 0.2s ease-in-out',
                                            transform: 'scale(0.95)',
                                            border: '2px dashed rgba(255,255,255,0.8)',
                                            '& .MuiChip-label': { px: 0.4 },
                                            '@keyframes fadeIn': {
                                                from: { opacity: 0, transform: 'scale(0.8)' },
                                                to: { opacity: 0.6, transform: 'scale(0.95)' }
                                            }
                                        }}
                                    />
                                )}
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
            ))}
        </Box>
    );
};
