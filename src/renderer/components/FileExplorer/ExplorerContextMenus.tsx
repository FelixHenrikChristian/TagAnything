import React from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    Edit as EditIcon,
    ArrowUpward as ArrowUpwardIcon,
    ContentCopy as CopyIcon,
    Delete as DeleteIcon,
    Info as InfoIcon,
    CreateNewFolder as CreateNewFolderIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { FileItem, Tag, DraggedFile } from '../../types';
import {
    FileContextMenuState,
    FolderContextMenuState,
    BlankContextMenuState,
    TagContextMenuState,
} from '../../hooks/fileExplorer/useFileContextMenu';

interface ExplorerContextMenusProps {
    // Context Menu States
    fileContextMenu: FileContextMenuState | null;
    folderContextMenu: FolderContextMenuState | null;
    blankContextMenu: BlankContextMenuState | null;
    tagContextMenu: TagContextMenuState | null;

    // Handlers
    handleCloseContextMenu: () => void;
    handleCloseBlankContextMenu: () => void;
    handleCloseTagContextMenu: () => void;

    handleOpenInExplorer: (file: FileItem) => void;
    openRenameDialog: (file: FileItem) => void;
    openDirectOperationDialog: (operation: 'move' | 'copy', files: DraggedFile[]) => void;
    openDeleteConfirmDialog: (files: DraggedFile[]) => void;
    openDetailsDialog: (file: FileItem) => void;

    handleOpenCurrentFolderInExplorer: () => void;
    handleCreateFolder: () => void;

    handleFilterByTag: (tag: Tag) => void;
    handleRemoveTagFromFile: (tag: Tag, file: FileItem) => void;
}

export const ExplorerContextMenus: React.FC<ExplorerContextMenusProps> = ({
    fileContextMenu,
    folderContextMenu,
    blankContextMenu,
    tagContextMenu,

    handleCloseContextMenu,
    handleCloseBlankContextMenu,
    handleCloseTagContextMenu,

    handleOpenInExplorer,
    openRenameDialog,
    openDirectOperationDialog,
    openDeleteConfirmDialog,
    openDetailsDialog,

    handleOpenCurrentFolderInExplorer,
    handleCreateFolder,

    handleFilterByTag,
    handleRemoveTagFromFile,
}) => {
    return (
        <>
            {/* File Context Menu */}
            <Menu
                open={fileContextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    fileContextMenu !== null
                        ? { top: fileContextMenu.mouseY, left: fileContextMenu.mouseX }
                        : undefined
                }
            >
                {/* Open in Explorer */}
                {fileContextMenu?.file && (
                    <MenuItem onClick={() => handleOpenInExplorer(fileContextMenu.file)}>
                        <ListItemIcon>
                            <FolderOpenIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>在资源管理器中打开</ListItemText>
                    </MenuItem>
                )}
                <Divider />
                {/* File Operations */}
                {fileContextMenu?.file && (
                    <>
                        <MenuItem onClick={() => { const f = fileContextMenu.file; handleCloseContextMenu(); openRenameDialog(f); }}>
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>重命名</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = fileContextMenu.file; handleCloseContextMenu(); openDirectOperationDialog('move', [{ name: f.name, path: f.path, size: f.size }]); }}>
                            <ListItemIcon>
                                <ArrowUpwardIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>移动</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = fileContextMenu.file; handleCloseContextMenu(); openDirectOperationDialog('copy', [{ name: f.name, path: f.path, size: f.size }]); }}>
                            <ListItemIcon>
                                <CopyIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>复制</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = fileContextMenu.file; handleCloseContextMenu(); openDeleteConfirmDialog([{ name: f.name, path: f.path, size: f.size }]); }}>
                            <ListItemIcon>
                                <DeleteIcon fontSize="small" color="error" />
                            </ListItemIcon>
                            <ListItemText>删除</ListItemText>
                        </MenuItem>
                        <Divider />
                    </>
                )}
                {/* Details */}
                {fileContextMenu?.file && (
                    <MenuItem onClick={() => { const f = fileContextMenu.file; handleCloseContextMenu(); openDetailsDialog(f); }}>
                        <ListItemIcon>
                            <InfoIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>属性</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* Folder Context Menu */}
            <Menu
                open={folderContextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    folderContextMenu !== null
                        ? { top: folderContextMenu.mouseY, left: folderContextMenu.mouseX }
                        : undefined
                }
            >
                {/* Open in Explorer */}
                {folderContextMenu?.file && (
                    <MenuItem onClick={() => handleOpenInExplorer(folderContextMenu.file)}>
                        <ListItemIcon>
                            <FolderOpenIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>在资源管理器中打开</ListItemText>
                    </MenuItem>
                )}
                <Divider />
                {/* Folder Operations */}
                {folderContextMenu?.file && (
                    <>
                        <MenuItem onClick={() => { const f = folderContextMenu.file; handleCloseContextMenu(); openRenameDialog(f); }}>
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>重命名</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = folderContextMenu.file; handleCloseContextMenu(); openDirectOperationDialog('move', [{ name: f.name, path: f.path, size: f.size }]); }}>
                            <ListItemIcon>
                                <ArrowUpwardIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>移动</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = folderContextMenu.file; handleCloseContextMenu(); openDirectOperationDialog('copy', [{ name: f.name, path: f.path, size: f.size }]); }}>
                            <ListItemIcon>
                                <CopyIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>复制</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = folderContextMenu.file; handleCloseContextMenu(); openDeleteConfirmDialog([{ name: f.name, path: f.path, size: f.size }]); }}>
                            <ListItemIcon>
                                <DeleteIcon fontSize="small" color="error" />
                            </ListItemIcon>
                            <ListItemText>删除</ListItemText>
                        </MenuItem>
                        <Divider />
                    </>
                )}
                {/* Details */}
                {folderContextMenu?.file && (
                    <MenuItem onClick={() => { const f = folderContextMenu.file; handleCloseContextMenu(); openDetailsDialog(f); }}>
                        <ListItemIcon>
                            <InfoIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>文件夹详情</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* Blank Context Menu */}
            <Menu
                open={blankContextMenu !== null}
                onClose={handleCloseBlankContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    blankContextMenu !== null
                        ? { top: blankContextMenu.mouseY, left: blankContextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={handleOpenCurrentFolderInExplorer}>
                    <ListItemIcon>
                        <FolderOpenIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>在文件资源管理器中打开</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleCreateFolder}>
                    <ListItemIcon>
                        <CreateNewFolderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>新建文件夹</ListItemText>
                </MenuItem>
            </Menu>

            {/* Tag Context Menu */}
            <Menu
                open={tagContextMenu !== null}
                onClose={handleCloseTagContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    tagContextMenu !== null
                        ? { top: tagContextMenu.mouseY, left: tagContextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={() => tagContextMenu?.tag && handleFilterByTag(tagContextMenu.tag)}>
                    <ListItemIcon>
                        <FilterListIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>显示此标签的文件</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => tagContextMenu?.tag && tagContextMenu?.file && handleRemoveTagFromFile(tagContextMenu.tag, tagContextMenu.file)}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>从文件中删除标签</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};
