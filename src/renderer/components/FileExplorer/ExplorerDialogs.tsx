import React, { useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Alert,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    Chip,
    CircularProgress,
    LinearProgress,
    IconButton,
    Tooltip,
    Card,
    CardActionArea,
    InputAdornment,
} from '@mui/material';
import {
    ArrowUpward as ArrowUpwardIcon,
    Folder as FolderIcon,
    ArrowBack as BackIcon,
    Delete as DeleteIcon,
    InsertDriveFile as FileIcon,
    FolderOpen as FolderOpenIcon,
    ContentCopy as CopyIcon,
    ViewList as ViewListIcon,
    ViewModule as ViewModuleIcon,
    ChevronRight as ChevronRightIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { useAppTheme } from '../../context/ThemeContext';
import { FileItem, Tag, TagGroup, DraggedFile } from '../../types';
import {
    FileOperationDialogState,
    FileOperationStatus,
    RenameDialogState,
    AddTagDialogState,
    DeleteTagDialogState,
    DetailsDialogState,
    DirectOperationDialogState,
    DeleteConfirmDialogState,
    NewFolderDialogState,
} from './types';
import { formatFileSize } from '../../utils/fileTagParser';
import { matchWithChineseVariants } from '../../utils/chineseConverter';


interface ExplorerDialogsProps {
    // Dialog States
    fileOperationDialog: FileOperationDialogState;
    setFileOperationDialog: React.Dispatch<React.SetStateAction<FileOperationDialogState>>;
    operationStatuses: FileOperationStatus[];
    renameDialog: RenameDialogState;
    setRenameDialog: React.Dispatch<React.SetStateAction<RenameDialogState>>;
    addTagDialog: AddTagDialogState;
    setAddTagDialog: React.Dispatch<React.SetStateAction<AddTagDialogState>>;
    deleteTagDialog: DeleteTagDialogState;
    setDeleteTagDialog: React.Dispatch<React.SetStateAction<DeleteTagDialogState>>;
    detailsDialog: DetailsDialogState;
    directOperationDialog: DirectOperationDialogState;
    setDirectOperationDialog: React.Dispatch<React.SetStateAction<DirectOperationDialogState>>;
    newFolderDialog: NewFolderDialogState;
    setNewFolderDialog: React.Dispatch<React.SetStateAction<NewFolderDialogState>>;
    deleteDialog: DeleteConfirmDialogState;

    // Handlers
    handleFileOperation: (operation: 'move' | 'copy', files: DraggedFile[], targetPath: string) => void;
    handleSelectTargetPath: () => void;
    handlePickerNavigateTo: (path: string) => void;
    handlePickerNavigateUp: () => void;
    handleConfirmPickerPath: () => void;
    closeNewFolderDialog: () => void;
    confirmCreateFolder: () => void;
    closeDirectOperationDialog: () => void;
    confirmDirectOperation: () => void;
    navigatePickerUp: () => void;
    navigatePickerTo: (path: string) => void;
    closeDeleteConfirmDialog: () => void;
    doDeleteFiles: (mode: 'trash' | 'permanent') => void;
    closeRenameDialog: () => void;
    confirmRename: () => void;
    closeAddTagDialog: () => void;
    confirmAddTags: () => void;
    toggleAddSelection: (tagId: string) => void;
    closeDeleteTagDialog: () => void;
    confirmDeleteTags: () => void;
    toggleDeleteSelection: (tagId: string) => void;
    closeDetailsDialog: () => void;

    // Data
    pickerDirectories: FileItem[];  // For DirectOperationDialog
    pickerLoading: boolean;         // For DirectOperationDialog
    pickerError: string | null;     // For DirectOperationDialog
    pickerDirs: FileItem[];         // For FileOperationDialog picker
    pickerDirsLoading: boolean;     // For FileOperationDialog picker
    pickerDirsError: string | null; // For FileOperationDialog picker
    getEffectiveTagGroups: () => TagGroup[];
    getFileTags: (file: FileItem) => Tag[];

    // Rename Conflict Dialog
    renameConflictDialog: {
        open: boolean;
        oldPath: string;
        newPath: string;
        suggestedPath: string;
    };
    closeRenameConflictDialog: () => void;
    confirmRenameWithAutoRename: () => void;
}

export const ExplorerDialogs: React.FC<ExplorerDialogsProps> = ({
    fileOperationDialog,
    setFileOperationDialog,
    operationStatuses,
    renameDialog,
    setRenameDialog,
    addTagDialog,
    setAddTagDialog,
    deleteTagDialog,
    setDeleteTagDialog,
    detailsDialog,
    directOperationDialog,
    setDirectOperationDialog,
    newFolderDialog,
    setNewFolderDialog,
    deleteDialog,

    handleFileOperation,
    handleSelectTargetPath,
    handlePickerNavigateTo,
    handlePickerNavigateUp,
    handleConfirmPickerPath,
    closeNewFolderDialog,
    confirmCreateFolder,
    closeDirectOperationDialog,
    confirmDirectOperation,
    navigatePickerUp,
    navigatePickerTo,
    closeDeleteConfirmDialog,
    doDeleteFiles,
    closeRenameDialog,
    confirmRename,
    closeAddTagDialog,
    confirmAddTags,
    toggleAddSelection,
    closeDeleteTagDialog,
    confirmDeleteTags,
    toggleDeleteSelection,
    closeDetailsDialog,

    pickerDirectories,
    pickerLoading,
    pickerError,
    pickerDirs,
    pickerDirsLoading,
    pickerDirsError,
    getEffectiveTagGroups,
    getFileTags,
    renameConflictDialog,
    closeRenameConflictDialog,
    confirmRenameWithAutoRename,
}) => {
    // Get theme context for neon-glass styling and display settings
    const { currentTheme, neonGlassSettings, displaySettings } = useAppTheme();

    // Filter picker directories based on search query (FileOperationDialog)
    const filteredPickerDirs = useMemo(() => {
        const query = fileOperationDialog.pickerSearchQuery?.trim();
        if (!query) return pickerDirs;
        return pickerDirs.filter(dir =>
            matchWithChineseVariants(dir.name, query, displaySettings.enableSimplifiedTraditionalSearch)
        );
    }, [pickerDirs, fileOperationDialog.pickerSearchQuery, displaySettings.enableSimplifiedTraditionalSearch]);

    // Filter picker directories based on search query (DirectOperationDialog)
    const filteredPickerDirectories = useMemo(() => {
        const query = directOperationDialog.searchQuery?.trim();
        if (!query) return pickerDirectories;
        return pickerDirectories.filter(dir =>
            matchWithChineseVariants(dir.name, query, displaySettings.enableSimplifiedTraditionalSearch)
        );
    }, [pickerDirectories, directOperationDialog.searchQuery, displaySettings.enableSimplifiedTraditionalSearch]);

    return (
        <>
            {/* File Operation Dialog (Drag & Drop) */}
            <Dialog
                open={fileOperationDialog.open}
                onClose={() => setFileOperationDialog(prev => ({ ...prev, open: false }))}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileIcon color="primary" />
                        <Typography variant="h6">文件操作确认</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {!fileOperationDialog.pickerMode ? (
                        // Simple mode: Just show target path
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                目标路径：
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    backgroundColor: 'background.paper',
                                    border: 1,
                                    borderColor: 'divider',
                                    p: 1,
                                    borderRadius: 1,
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all'
                                }}
                            >
                                {fileOperationDialog.targetPath}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                                <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={handleSelectTargetPath}>
                                    选择目标目录
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        // Picker mode: Show directory picker
                        <Box sx={{ mb: 3 }}>
                            {/* 导航栏 */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<BackIcon />}
                                    onClick={handlePickerNavigateUp}
                                    disabled={fileOperationDialog.pickerBrowsePath === fileOperationDialog.pickerRoot}
                                >
                                    返回上级
                                </Button>
                                <Chip
                                    icon={<FolderOpenIcon />}
                                    label={fileOperationDialog.pickerBrowsePath}
                                    sx={{
                                        maxWidth: 'calc(100% - 200px)',
                                        '& .MuiChip-label': {
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem',
                                        }
                                    }}
                                />
                                <Box sx={{ flex: 1 }} />
                                {/* 视图切换 */}
                                <Tooltip title="列表视图">
                                    <IconButton
                                        size="small"
                                        color={fileOperationDialog.pickerViewMode !== 'grid' ? 'primary' : 'default'}
                                        onClick={() => setFileOperationDialog(prev => ({ ...prev, pickerViewMode: 'list' }))}
                                    >
                                        <ViewListIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="网格视图">
                                    <IconButton
                                        size="small"
                                        color={fileOperationDialog.pickerViewMode === 'grid' ? 'primary' : 'default'}
                                        onClick={() => setFileOperationDialog(prev => ({ ...prev, pickerViewMode: 'grid' }))}
                                    >
                                        <ViewModuleIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            {/* 搜索框 */}
                            <TextField
                                size="small"
                                placeholder="搜索文件夹..."
                                value={fileOperationDialog.pickerSearchQuery || ''}
                                onChange={(e) => setFileOperationDialog(prev => ({ ...prev, pickerSearchQuery: e.target.value }))}
                                sx={{ mb: 2 }}
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: fileOperationDialog.pickerSearchQuery ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => setFileOperationDialog(prev => ({ ...prev, pickerSearchQuery: '' }))}
                                            >
                                                <ClearIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                }}
                            />
                            {pickerDirsError && (
                                <Alert severity="error" sx={{ mb: 2 }}>{pickerDirsError}</Alert>
                            )}
                            <Box sx={{ position: 'relative', height: 300, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                                {pickerDirsLoading && (
                                    <Box sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'transparent',
                                        zIndex: 1
                                    }}>
                                        <CircularProgress />
                                    </Box>
                                )}
                                {fileOperationDialog.pickerViewMode === 'grid' ? (
                                    /* Grid 视图 */
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                        gap: 1.5,
                                        height: '100%',
                                        overflowY: 'auto',
                                        p: 1,
                                    }}>
                                        {filteredPickerDirs.length === 0 && !pickerDirsLoading ? (
                                            <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                                <Typography variant="body2">此目录下没有子文件夹</Typography>
                                                <Typography variant="caption">你可以选择当前目录作为目标</Typography>
                                            </Box>
                                        ) : (
                                            filteredPickerDirs.map(dir => (
                                                <Card
                                                    key={dir.path}
                                                    variant="outlined"
                                                    sx={{
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                            borderColor: 'primary.main',
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: 2,
                                                        }
                                                    }}
                                                >
                                                    <CardActionArea
                                                        onClick={() => handlePickerNavigateTo(dir.path)}
                                                        sx={{ p: 1.5, textAlign: 'center' }}
                                                    >
                                                        <FolderIcon sx={{ fontSize: 40, color: 'warning.main', mb: 0.5 }} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {dir.name}
                                                        </Typography>
                                                    </CardActionArea>
                                                </Card>
                                            ))
                                        )}
                                    </Box>
                                ) : (
                                    /* List 视图 */
                                    <List dense sx={{ height: '100%', overflowY: 'auto' }}>
                                        {filteredPickerDirs.length === 0 && !pickerDirsLoading && (
                                            <ListItem>
                                                <ListItemText primary="此目录下没有子文件夹" secondary="你可以选择当前目录作为目标" />
                                            </ListItem>
                                        )}
                                        {filteredPickerDirs.map(dir => (
                                            <ListItem
                                                key={dir.path}
                                                button
                                                onClick={() => handlePickerNavigateTo(dir.path)}
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: 'action.hover',
                                                    },
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 40 }}>
                                                    <FolderIcon sx={{ color: 'warning.main' }} />
                                                </ListItemIcon>
                                                <ListItemText primary={dir.name} />
                                                <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <Button variant="contained" onClick={handleConfirmPickerPath}>
                                    选择此目录
                                </Button>
                            </Box>
                        </Box>
                    )}

                    <Typography variant="subtitle1" gutterBottom>
                        要操作的文件 ({fileOperationDialog.files.length} 个)：
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>文件名</TableCell>
                                    <TableCell>大小</TableCell>
                                    <TableCell>原路径</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {fileOperationDialog.files.map((file, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <FileIcon fontSize="small" />
                                                <Typography variant="body2">{file.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatFileSize(file.size)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.75rem',
                                                    wordBreak: 'break-all'
                                                }}
                                            >
                                                {file.path}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => setFileOperationDialog(prev => ({ ...prev, open: false }))}
                        variant="outlined"
                    >
                        取消
                    </Button>
                    <Button
                        onClick={() => handleFileOperation('copy', fileOperationDialog.files, fileOperationDialog.targetPath)}
                        variant="contained"
                        color="primary"
                        startIcon={<CopyIcon />}
                    >
                        复制
                    </Button>
                    <Button
                        onClick={() => handleFileOperation('move', fileOperationDialog.files, fileOperationDialog.targetPath)}
                        variant="contained"
                        color="primary"
                        startIcon={<ArrowUpwardIcon />}
                    >
                        移动
                    </Button>
                </DialogActions>
            </Dialog>

            {/* New Folder Dialog */}
            <Dialog open={newFolderDialog.open} onClose={closeNewFolderDialog} maxWidth="sm" fullWidth>
                <DialogTitle>新建文件夹</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        label="文件夹名称"
                        placeholder="新建文件夹"
                        InputLabelProps={{ shrink: true }}
                        margin="dense"
                        size="small"
                        value={newFolderDialog.inputName}
                        onChange={(e) => setNewFolderDialog(prev => ({ ...prev, inputName: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmCreateFolder(); } }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        名称不能包含以下字符：&lt;&gt;:"/\|?*
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeNewFolderDialog}>取消</Button>
                    <Button onClick={confirmCreateFolder} variant="contained">创建</Button>
                </DialogActions>
            </Dialog>

            {/* Direct Operation Dialog (Move/Copy with Picker) */}
            <Dialog open={directOperationDialog.open} onClose={closeDirectOperationDialog} maxWidth="md" fullWidth>
                <DialogTitle>{directOperationDialog.operation === 'move' ? '移动到' : '复制到'}</DialogTitle>
                <DialogContent>
                    {/* 导航栏 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<BackIcon />}
                            onClick={navigatePickerUp}
                            disabled={directOperationDialog.browsePath === directOperationDialog.rootPath}
                        >
                            返回上级
                        </Button>
                        <Chip
                            icon={<FolderOpenIcon />}
                            label={directOperationDialog.browsePath}
                            sx={{
                                maxWidth: 'calc(100% - 200px)',
                                '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                }
                            }}
                        />
                        <Box sx={{ flex: 1 }} />
                        {/* 视图切换 */}
                        <Tooltip title="列表视图">
                            <IconButton
                                size="small"
                                color={directOperationDialog.viewMode !== 'grid' ? 'primary' : 'default'}
                                onClick={() => setDirectOperationDialog(prev => ({ ...prev, viewMode: 'list' }))}
                            >
                                <ViewListIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="网格视图">
                            <IconButton
                                size="small"
                                color={directOperationDialog.viewMode === 'grid' ? 'primary' : 'default'}
                                onClick={() => setDirectOperationDialog(prev => ({ ...prev, viewMode: 'grid' }))}
                            >
                                <ViewModuleIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {/* 搜索框 */}
                    <TextField
                        size="small"
                        placeholder="搜索文件夹..."
                        value={directOperationDialog.searchQuery || ''}
                        onChange={(e) => setDirectOperationDialog(prev => ({ ...prev, searchQuery: e.target.value }))}
                        sx={{ mb: 2 }}
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                </InputAdornment>
                            ),
                            endAdornment: directOperationDialog.searchQuery ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setDirectOperationDialog(prev => ({ ...prev, searchQuery: '' }))}
                                    >
                                        <ClearIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                    {pickerError && (
                        <Alert severity="error" sx={{ mb: 2 }}>{pickerError}</Alert>
                    )}
                    {pickerLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : directOperationDialog.viewMode === 'grid' ? (
                        /* Grid 视图 */
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: 1.5,
                            minHeight: 200,
                            maxHeight: 300,
                            overflowY: 'auto',
                            p: 1,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                        }}>
                            {filteredPickerDirectories.length === 0 ? (
                                <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                    <Typography variant="body2">此目录下没有子文件夹</Typography>
                                    <Typography variant="caption">你可以选择当前目录作为目标</Typography>
                                </Box>
                            ) : (
                                filteredPickerDirectories.map(dir => (
                                    <Card
                                        key={dir.path}
                                        variant="outlined"
                                        sx={{
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                borderColor: 'primary.main',
                                                transform: 'translateY(-2px)',
                                                boxShadow: 2,
                                            }
                                        }}
                                    >
                                        <CardActionArea
                                            onClick={() => navigatePickerTo(dir.path)}
                                            sx={{ p: 1.5, textAlign: 'center' }}
                                        >
                                            <FolderIcon sx={{ fontSize: 40, color: 'warning.main', mb: 0.5 }} />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {dir.name}
                                            </Typography>
                                        </CardActionArea>
                                    </Card>
                                ))
                            )}
                        </Box>
                    ) : (
                        /* List 视图 */
                        <Box sx={{
                            minHeight: 200,
                            maxHeight: 300,
                            overflowY: 'auto',
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                        }}>
                            <List dense disablePadding>
                                {filteredPickerDirectories.length === 0 ? (
                                    <ListItem>
                                        <ListItemText
                                            primary="此目录下没有子文件夹"
                                            secondary="你可以选择当前目录作为目标"
                                        />
                                    </ListItem>
                                ) : (
                                    filteredPickerDirectories.map(dir => (
                                        <ListItem
                                            key={dir.path}
                                            button
                                            onClick={() => navigatePickerTo(dir.path)}
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: 'action.hover',
                                                },
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 40 }}>
                                                <FolderIcon sx={{ color: 'warning.main' }} />
                                            </ListItemIcon>
                                            <ListItemText primary={dir.name} />
                                            <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </Box>
                    )}
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">待{directOperationDialog.operation === 'move' ? '移动' : '复制'}文件：</Typography>
                        <TableContainer component={Paper} sx={{ mt: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>文件名</TableCell>
                                        <TableCell>原路径</TableCell>
                                        <TableCell align="right">大小</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {directOperationDialog.files.map((f, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{f.name}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{f.path}</TableCell>
                                            <TableCell align="right">{formatFileSize(f.size || 0)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDirectOperationDialog}>取消</Button>
                    <Button variant="contained" onClick={confirmDirectOperation}>{directOperationDialog.operation === 'move' ? '移动到此目录' : '复制到此目录'}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={deleteDialog.open} onClose={closeDeleteConfirmDialog} maxWidth="sm" fullWidth>
                <DialogTitle>删除确认</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        此操作不可撤销。你可以选择将项目移动到回收站，或彻底删除。
                    </Alert>
                    <TableContainer component={Paper} sx={{ mt: 1 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>名称</TableCell>
                                    <TableCell>路径</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deleteDialog.files.map((f, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{f.name}</TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{f.path}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteConfirmDialog}>取消</Button>
                    <Button variant="outlined" color="warning" startIcon={<DeleteIcon />} onClick={() => doDeleteFiles('trash')}>移动至回收站</Button>
                    <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => doDeleteFiles('permanent')}>彻底删除</Button>
                </DialogActions>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={renameDialog.open} onClose={closeRenameDialog} maxWidth="sm" fullWidth>
                <DialogTitle>重命名</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        仅修改显示名称，标签保持不变（文件）。
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        label="新名称"
                        value={renameDialog.inputName}
                        onChange={(e) => setRenameDialog(prev => ({ ...prev, inputName: e.target.value }))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRenameDialog}>取消</Button>
                    <Button onClick={confirmRename} variant="contained">确定</Button>
                </DialogActions>
            </Dialog>

            {/* Add Tag Dialog */}
            <Dialog open={addTagDialog.open} onClose={closeAddTagDialog} maxWidth="sm" fullWidth>
                <DialogTitle>添加标签</DialogTitle>
                <DialogContent>
                    {addTagDialog.file ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                从标签库中选择要添加到文件的标签（可多选）。已存在的标签不可选。
                            </Typography>
                            {getEffectiveTagGroups().length === 0 ? (
                                <Alert severity="info">尚未创建任何标签。请到标签管理中添加标签组与标签。</Alert>
                            ) : (
                                getEffectiveTagGroups().map(group => (
                                    <Box key={group.id}>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>{group.name}</Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {group.tags.map(tag => {
                                                const alreadyHas = getFileTags(addTagDialog.file!).some(t => t.name.toLowerCase() === tag.name.toLowerCase());
                                                const selected = addTagDialog.selectedTagIds.includes(tag.id);
                                                return (
                                                    <Chip
                                                        key={tag.id}
                                                        label={tag.name}
                                                        variant={selected ? 'filled' : 'outlined'}
                                                        color={selected ? 'primary' : 'default'}
                                                        disabled={alreadyHas}
                                                        onClick={() => !alreadyHas && toggleAddSelection(tag.id)}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                ))
                            )}
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeAddTagDialog}>取消</Button>
                    <Button onClick={confirmAddTags} variant="contained" disabled={addTagDialog.selectedTagIds.length === 0}>添加所选</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Tag Dialog */}
            <Dialog open={deleteTagDialog.open} onClose={closeDeleteTagDialog} maxWidth="sm" fullWidth>
                <DialogTitle>删除标签</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {deleteTagDialog.file && getFileTags(deleteTagDialog.file).map(tag => (
                            <Chip
                                key={tag.id}
                                label={tag.name}
                                variant={deleteTagDialog.selectedTagIds.includes(tag.id) ? 'filled' : 'outlined'}
                                color={deleteTagDialog.selectedTagIds.includes(tag.id) ? 'primary' : 'default'}
                                onClick={() => toggleDeleteSelection(tag.id)}
                            />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteTagDialog}>取消</Button>
                    <Button onClick={confirmDeleteTags} variant="contained" color="error">删除所选</Button>
                </DialogActions>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={detailsDialog.open} onClose={closeDetailsDialog} maxWidth="sm" fullWidth>
                <DialogTitle>文件详情</DialogTitle>
                <DialogContent>
                    {detailsDialog.file && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, columnGap: 2 }}>
                            <Typography color="text.secondary">名称</Typography>
                            <Typography>{detailsDialog.file.name}</Typography>
                            <Typography color="text.secondary">路径</Typography>
                            <Typography sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{detailsDialog.file.path}</Typography>
                            <Typography color="text.secondary">类型</Typography>
                            <Typography>{detailsDialog.file.isDirectory ? '文件夹' : '文件'}</Typography>
                            {!detailsDialog.file.isDirectory && (
                                <>
                                    <Typography color="text.secondary">大小</Typography>
                                    <Typography>{formatFileSize(detailsDialog.file.size || 0)}</Typography>
                                </>
                            )}
                            <Typography color="text.secondary">修改时间</Typography>
                            <Typography>{new Date(detailsDialog.file.modified).toLocaleString()}</Typography>
                            {!detailsDialog.file.isDirectory && (
                                <>
                                    <Typography color="text.secondary">标签</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {getFileTags(detailsDialog.file).map(tag => (
                                            <Chip key={tag.id} label={tag.name} />
                                        ))}
                                    </Box>
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDetailsDialog}>关闭</Button>
                </DialogActions>
            </Dialog>

            {/* Operation Status Stack */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 16,
                    right: 16,
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    alignItems: 'flex-end',
                }}
            >
                {operationStatuses.map((status) => (
                    <Box
                        key={status.id}
                        sx={{
                            backgroundColor: currentTheme === 'neon-glass'
                                ? 'rgba(30, 30, 30, 0.8)'
                                : 'background.paper',
                            borderRadius: currentTheme === 'neon-glass' ? 2 : 2,
                            p: 2,
                            boxShadow: currentTheme === 'neon-glass'
                                ? `0 4px 30px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.02)`
                                : 3,
                            minWidth: 320,
                            border: currentTheme === 'neon-glass'
                                ? '1px solid rgba(255, 255, 255, 0.15)'
                                : 1,
                            borderColor: currentTheme === 'neon-glass'
                                ? undefined
                                : 'divider',
                            backdropFilter: currentTheme === 'neon-glass'
                                ? 'blur(20px)'
                                : undefined,
                            opacity: status.isOperating ? 1 : 0,
                            transition: 'all 0.3s ease',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CircularProgress
                                size={20}
                                sx={currentTheme === 'neon-glass' ? {
                                    color: `hsl(${neonGlassSettings.hue}, 100%, 50%)`,
                                    filter: `drop-shadow(0 0 4px hsl(${neonGlassSettings.hue}, 100%, 50%))`,
                                } : undefined}
                            />
                            <Typography variant="body2" fontWeight="medium">
                                正在{status.operation === 'move' ? '移动' : '复制'}文件...
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            {status.completedFiles} / {status.totalFiles} 个文件
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={(status.completedFiles / status.totalFiles) * 100}
                            sx={{
                                mt: 1,
                                ...(currentTheme === 'neon-glass' && {
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 3,
                                        backgroundColor: `hsl(${neonGlassSettings.hue}, 100%, 50%)`,
                                        boxShadow: `0 0 10px hsl(${neonGlassSettings.hue}, 100%, 50%)`,
                                    },
                                }),
                            }}
                        />
                    </Box>
                ))}
            </Box>

            {/* Rename Conflict Dialog */}
            <Dialog open={renameConflictDialog.open} onClose={closeRenameConflictDialog} maxWidth="sm" fullWidth>
                <DialogTitle>文件名冲突</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        目标位置已存在同名文件。你可以选择自动重命名，或者取消操作。
                    </Alert>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        原文件：
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily: 'monospace',
                            backgroundColor: 'action.hover',
                            p: 1,
                            borderRadius: 1,
                            wordBreak: 'break-all',
                            mb: 2,
                        }}
                    >
                        {renameConflictDialog.oldPath.split(/[\\/]/).pop()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        建议的新名称：
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily: 'monospace',
                            backgroundColor: 'action.hover',
                            p: 1,
                            borderRadius: 1,
                            wordBreak: 'break-all',
                            color: 'primary.main',
                        }}
                    >
                        {renameConflictDialog.suggestedPath.split(/[\\/]/).pop()}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRenameConflictDialog}>取消</Button>
                    <Button onClick={confirmRenameWithAutoRename} variant="contained" color="primary">
                        使用自动重命名
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
