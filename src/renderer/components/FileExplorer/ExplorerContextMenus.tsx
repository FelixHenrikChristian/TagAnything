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
    MyLocation as MyLocationIcon,
} from '@mui/icons-material';
import { FileItem, Tag, DraggedFile } from '../../types';
import {
    FileContextMenuState,
    FolderContextMenuState,
    BlankContextMenuState,
    TagContextMenuState,
} from '../../hooks/fileExplorer/useFileContextMenu';
import { FilterState } from './types';

interface ExplorerContextMenusProps {
    // Context Menu States
    fileContextMenu: FileContextMenuState | null;
    folderContextMenu: FolderContextMenuState | null;
    blankContextMenu: BlankContextMenuState | null;
    tagContextMenu: TagContextMenuState | null;

    // Filter state for conditional menu items
    filterState: FilterState;

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

    handleFilterByTag: (tag: Tag, origin?: 'tagManager' | 'fileExplorer') => void;
    handleRemoveTagFromFile: (tag: Tag, file: FileItem) => void;

    handleNavigateToDirectory: (file: FileItem) => void;
    selectedFiles: FileItem[];
}

export const ExplorerContextMenus: React.FC<ExplorerContextMenusProps> = ({
    fileContextMenu,
    folderContextMenu,
    blankContextMenu,
    tagContextMenu,
    filterState,

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
    handleNavigateToDirectory,
    selectedFiles,
}) => {
    // Helper to get files for operation
    const getFilesForOperation = (targetFile: FileItem) => {
        const isTargetSelected = selectedFiles.some(f => f.path === targetFile.path);
        if (isTargetSelected) {
            return selectedFiles.map(f => ({ name: f.name, path: f.path, size: f.size }));
        }
        return [{ name: targetFile.name, path: targetFile.path, size: targetFile.size }];
    };

    // Local state to control tag menu visibility without clearing tagContextMenu immediately
    const [tagMenuOpen, setTagMenuOpen] = React.useState(false);
    // Local state to control file menu visibility
    const [fileMenuOpen, setFileMenuOpen] = React.useState(false);
    // Local state to control folder menu visibility
    const [folderMenuOpen, setFolderMenuOpen] = React.useState(false);

    // Update local state when tagContextMenu changes
    React.useEffect(() => {
        setTagMenuOpen(tagContextMenu !== null);
    }, [tagContextMenu]);

    // Update local state when fileContextMenu changes
    React.useEffect(() => {
        setFileMenuOpen(fileContextMenu !== null);
    }, [fileContextMenu]);

    // Update local state when folderContextMenu changes
    React.useEffect(() => {
        setFolderMenuOpen(folderContextMenu !== null);
    }, [folderContextMenu]);
    return (
        <>
            {/* File Context Menu */}
            <Menu
                open={fileMenuOpen}
                onClose={() => setFileMenuOpen(false)}
                anchorReference="anchorPosition"
                anchorPosition={
                    fileContextMenu !== null
                        ? { top: fileContextMenu.mouseY, left: fileContextMenu.mouseX }
                        : undefined
                }
                TransitionProps={{
                    onExited: handleCloseContextMenu
                }}
            >
                {/* Open in Explorer */}
                {fileContextMenu?.file && (
                    <MenuItem onClick={() => { setFileMenuOpen(false); handleOpenInExplorer(fileContextMenu.file); }}>
                        <ListItemIcon>
                            <FolderOpenIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>在资源管理器中打开</ListItemText>
                    </MenuItem>
                )}
                {/* Navigate to file directory - only show in global search or multi-tag filter */}
                {fileContextMenu?.file && (
                    filterState.multiTagFilter !== null ||
                    (filterState.isGlobalSearch && filterState.nameFilterQuery)
                ) && (
                        <MenuItem onClick={() => { setFileMenuOpen(false); handleNavigateToDirectory(fileContextMenu.file); }}>
                            <ListItemIcon>
                                <MyLocationIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>导航到所在目录</ListItemText>
                        </MenuItem>
                    )}
                <Divider />
                {/* File Operations */}
                {fileContextMenu?.file && (
                    <>
                        <MenuItem onClick={() => { const f = fileContextMenu.file; setFileMenuOpen(false); openRenameDialog(f); }}>
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>重命名</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = fileContextMenu.file; setFileMenuOpen(false); openDirectOperationDialog('move', getFilesForOperation(f)); }}>
                            <ListItemIcon>
                                <ArrowUpwardIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>移动</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = fileContextMenu.file; setFileMenuOpen(false); openDirectOperationDialog('copy', getFilesForOperation(f)); }}>
                            <ListItemIcon>
                                <CopyIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>复制</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = fileContextMenu.file; setFileMenuOpen(false); openDeleteConfirmDialog(getFilesForOperation(f)); }}>
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
                    <MenuItem onClick={() => { const f = fileContextMenu.file; setFileMenuOpen(false); openDetailsDialog(f); }}>
                        <ListItemIcon>
                            <InfoIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>属性</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* Folder Context Menu */}
            <Menu
                open={folderMenuOpen}
                onClose={() => setFolderMenuOpen(false)}
                anchorReference="anchorPosition"
                anchorPosition={
                    folderContextMenu !== null
                        ? { top: folderContextMenu.mouseY, left: folderContextMenu.mouseX }
                        : undefined
                }
                TransitionProps={{
                    onExited: handleCloseContextMenu
                }}
            >
                {/* Open in Explorer */}
                {folderContextMenu?.file && (
                    <MenuItem onClick={() => { setFolderMenuOpen(false); handleOpenInExplorer(folderContextMenu.file); }}>
                        <ListItemIcon>
                            <FolderOpenIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>在资源管理器中打开</ListItemText>
                    </MenuItem>
                )}
                {/* Navigate to folder's parent directory - only show in global search or multi-tag filter */}
                {folderContextMenu?.file && (
                    filterState.multiTagFilter !== null ||
                    (filterState.isGlobalSearch && filterState.nameFilterQuery)
                ) && (
                        <MenuItem onClick={() => { setFolderMenuOpen(false); handleNavigateToDirectory(folderContextMenu.file); }}>
                            <ListItemIcon>
                                <MyLocationIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>导航到所在目录</ListItemText>
                        </MenuItem>
                    )}
                <Divider />
                {/* Folder Operations */}
                {folderContextMenu?.file && (
                    <>
                        <MenuItem onClick={() => { const f = folderContextMenu.file; setFolderMenuOpen(false); openRenameDialog(f); }}>
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>重命名</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = folderContextMenu.file; setFolderMenuOpen(false); openDirectOperationDialog('move', getFilesForOperation(f)); }}>
                            <ListItemIcon>
                                <ArrowUpwardIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>移动</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = folderContextMenu.file; setFolderMenuOpen(false); openDirectOperationDialog('copy', getFilesForOperation(f)); }}>
                            <ListItemIcon>
                                <CopyIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>复制</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { const f = folderContextMenu.file; setFolderMenuOpen(false); openDeleteConfirmDialog(getFilesForOperation(f)); }}>
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
                    <MenuItem onClick={() => { const f = folderContextMenu.file; setFolderMenuOpen(false); openDetailsDialog(f); }}>
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
                <MenuItem onClick={() => { handleCloseBlankContextMenu(); handleOpenCurrentFolderInExplorer(); }}>
                    <ListItemIcon>
                        <FolderOpenIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>在文件资源管理器中打开</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleCloseBlankContextMenu(); handleCreateFolder(); }}>
                    <ListItemIcon>
                        <CreateNewFolderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>新建文件夹</ListItemText>
                </MenuItem>
            </Menu>

            {/* Tag Context Menu */}
            <Menu
                open={tagMenuOpen}
                onClose={() => setTagMenuOpen(false)}
                anchorReference="anchorPosition"
                anchorPosition={
                    tagContextMenu !== null
                        ? { top: tagContextMenu.mouseY, left: tagContextMenu.mouseX }
                        : undefined
                }
                TransitionProps={{
                    onExited: handleCloseTagContextMenu
                }}
            >
                <MenuItem onClick={() => {
                    if (tagContextMenu?.tag) {
                        // If file is present, it's from a file card (current directory only)
                        // If file is null, it's from the tag library (recursive search)
                        const origin = tagContextMenu.file ? 'fileExplorer' : 'tagManager';
                        handleFilterByTag(tagContextMenu.tag, origin);
                        setTagMenuOpen(false);
                    }
                }}>
                    <ListItemIcon>
                        <FilterListIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{tagContextMenu?.file ? '显示此标签文件' : '显示所有此标签文件'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    if (tagContextMenu?.tag && tagContextMenu?.file) {
                        handleRemoveTagFromFile(tagContextMenu.tag, tagContextMenu.file);
                        setTagMenuOpen(false);
                    }
                }}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>删除文件中标签</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};
