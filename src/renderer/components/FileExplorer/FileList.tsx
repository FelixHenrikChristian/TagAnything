import React from 'react';
import {
    List,
    ListItem,
    Box,
    Typography,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Folder as FolderIcon,
    InsertDriveFile as FileIcon,
    MoreVert as MoreIcon,
} from '@mui/icons-material';
import { FileItem, Tag } from '../../types';
import { getDisplayName, getDisplayNameWithoutExtension, getFileTypeColor, formatFileSize, getFileExtension, formatModifiedDate } from '../../utils/fileTagParser';
import { useAppTheme } from '../../context/ThemeContext';

interface FileListProps {
    files: FileItem[];
    handleNavigate: (path: string) => void;
    handleFileOpen: (file: FileItem) => void;
    handleContextMenu: (event: React.MouseEvent, file: FileItem, index: number) => void;
    handleTagContextMenu: (event: React.MouseEvent, tag: Tag, file: FileItem) => void;
    videoThumbnails: Map<string, string>;
    getFileTags: (file: FileItem) => Tag[];
    tagDisplayStyle: 'original' | 'library';
    selectedPaths?: Set<string>;
    onFileClick?: (event: React.MouseEvent, file: FileItem, index: number) => void;
    isRecursiveMode?: boolean;
    currentPath?: string;
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
    selectedPaths,
    onFileClick,
    isRecursiveMode,
    currentPath,
}) => {
    const { displaySettings, currentTheme } = useAppTheme();
    const toFileUrl = (p: string) => 'file:///' + p.replace(/\\/g, '/');
    
    // Helper to get relative parent folder path
    const getRelativeParentPath = (filePath: string): { relativePath: string; fullPath: string } | null => {
        const fileDirPath = filePath.replace(/[/\\][^/\\]+$/, '');
        const relativePath = currentPath && fileDirPath.startsWith(currentPath)
            ? fileDirPath.substring(currentPath.length).replace(/^[/\\]/, '')
            : fileDirPath.split(/[/\\]/).slice(-2, -1).join('') || fileDirPath.split(/[/\\]/).pop() || '';
        
        return relativePath ? { relativePath, fullPath: fileDirPath } : null;
    };

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

    // 检查是否是图片文件
    const isImageFile = (filename: string) => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return imageExtensions.includes(ext);
    };

    return (
        <List sx={{ px: 1, py: 0.5 }}>
            {files.map((file, index) => {
                const isSelected = selectedPaths?.has(file.path);
                const hasThumbnail = videoThumbnails.has(file.path) || (!file.isDirectory && isImageFile(file.name));
                const thumbnailSrc = videoThumbnails.has(file.path)
                    ? toFileUrl(videoThumbnails.get(file.path) as string)
                    : toFileUrl(file.path);

                return (
                    <ListItem
                        key={file.path}
                        data-file-path={file.path}
                        button
                        selected={isSelected}
                        draggable={false}
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
                        onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, file, index); }}
                        onDragStart={(e) => e.preventDefault()}
                        sx={{
                            borderRadius: 2,
                            mb: 0.5,
                            py: 1,
                            px: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: isSelected ? '1px solid' : '1px solid transparent',
                            borderColor: isSelected ? 'primary.main' : 'transparent',
                            backgroundColor: isSelected ? 'action.selected' : 'transparent',
                            '&:hover': {
                                backgroundColor: 'action.hover',
                                transform: 'translateX(4px)',
                                '& .more-icon': {
                                    opacity: 1,
                                },
                            },
                            '&.Mui-selected': {
                                backgroundColor: 'action.selected',
                            },
                        }}
                    >
                        {/* 缩略图/图标区域 */}
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                flexShrink: 0,
                                borderRadius: 1.5,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: file.isDirectory ? 'transparent' : 'action.hover',
                                boxShadow: hasThumbnail && !file.isDirectory ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                                transition: 'box-shadow 0.2s, transform 0.2s',
                                '&:hover': {
                                    boxShadow: hasThumbnail && !file.isDirectory ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
                                },
                            }}
                        >
                            {file.isDirectory ? (
                                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FolderIcon sx={{ fontSize: 36, color: '#ffa726' }} />
                                    {displaySettings.showFolderNameInIcon && (
                                        <Typography
                                            sx={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -30%)',
                                                fontSize: 9,
                                                fontWeight: 700,
                                                maxWidth: 22,
                                                overflow: 'hidden',
                                                textOverflow: 'clip',
                                                whiteSpace: 'nowrap',
                                                textAlign: 'center',
                                                pointerEvents: 'none',
                                                userSelect: 'none',
                                                ...(currentTheme === 'neon-glass' ? {
                                                    color: '#fff',
                                                    textShadow: '0 0 4px rgba(255, 166, 38, 0.8)',
                                                } : {
                                                    color: 'rgba(120, 70, 0, 0.9)',
                                                }),
                                            }}
                                        >
                                            {file.name.substring(0, 2)}
                                        </Typography>
                                    )}
                                </Box>
                            ) : hasThumbnail ? (
                                <Box
                                    component="img"
                                    src={thumbnailSrc}
                                    alt={file.name}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                    onError={(e) => {
                                        // 图片加载失败时隐藏
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <FileIcon sx={{ fontSize: 28, color: getFileTypeColor(file.name.split('.').pop()?.toLowerCase()) }} />
                            )}
                        </Box>

                        {/* 文件信息区域 */}
                        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {/* 文件名 */}
                            <Tooltip title={file.name} placement="top" arrow enterDelay={500}>
                                <Typography
                                    sx={{
                                        fontWeight: 500,
                                        fontSize: '0.9rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer',
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {file.isDirectory ? file.name : (displaySettings.hideFileExtension ? getDisplayNameWithoutExtension(file.name) : getDisplayName(file.name))}
                                </Typography>
                            </Tooltip>

                            {/* 父文件夹路径（递归模式） */}
                            {isRecursiveMode && displaySettings.showParentFolderInRecursiveSearch !== false && !file.isDirectory && (() => {
                                const parentInfo = getRelativeParentPath(file.path);
                                return parentInfo ? (
                                    <Tooltip title={parentInfo.fullPath} placement="top" arrow>
                                        <Typography
                                            sx={{
                                                fontSize: '0.75rem',
                                                color: 'text.secondary',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                                lineHeight: 1.2,
                                                opacity: 0.8,
                                                '&:hover': {
                                                    color: 'primary.main',
                                                    opacity: 1,
                                                }
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNavigate(parentInfo.fullPath);
                                            }}
                                        >
                                            📁 {parentInfo.relativePath}
                                        </Typography>
                                    </Tooltip>
                                ) : null;
                            })()}

                            {/* 元信息行：扩展名、大小、修改时间 */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                {!file.isDirectory && getFileExtension(file.name) && (
                                    <Chip
                                        size="small"
                                        label={getFileExtension(file.name)}
                                        sx={{
                                            height: '18px',
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            backgroundColor: 'primary.main',
                                            color: 'primary.contrastText',
                                            borderRadius: '4px',
                                            '& .MuiChip-label': { px: 0.6 }
                                        }}
                                    />
                                )}
                                {!file.isDirectory && (
                                    <>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                            {formatFileSize(file.size || 0)}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                            •
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                            {formatModifiedDate(new Date(file.modified))}
                                        </Typography>
                                    </>
                                )}
                            </Box>

                            {/* 标签区域 */}
                            {getFileTags(file).length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                                    {getFileTags(file).map((tag, tagIndex) => {
                                        const tagStyle = getTagStyle(tag);
                                        return (
                                            <Chip
                                                key={tagIndex}
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
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    '&:hover': {
                                                        opacity: 0.85,
                                                        transform: 'scale(1.05)',
                                                    },
                                                    '& .MuiChip-label': {
                                                        px: 0.75
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTagContextMenu(e, tag, file);
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>

                        {/* 更多操作按钮 */}
                        <IconButton
                            className="more-icon"
                            size="small"
                            edge="end"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, file, index);
                            }}
                            sx={{
                                opacity: 0.5,
                                transition: 'opacity 0.2s',
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                },
                            }}
                        >
                            <MoreIcon fontSize="small" />
                        </IconButton>
                    </ListItem>
                );
            })}
        </List>
    );
};
