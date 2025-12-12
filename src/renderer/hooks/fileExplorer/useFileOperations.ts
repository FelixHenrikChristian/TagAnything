import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { FileItem, DraggedFile, Tag, TagGroup, Location } from '../../types';
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
} from '../../components/FileExplorer/types';
import { getDisplayName, parseTagsFromFilename } from '../../utils/fileTagParser';

export const useFileOperations = (
    currentPath: string,
    currentLocation: Location | null,
    handleRefresh: (silent?: boolean) => Promise<void>,
    getEffectiveTagGroups: () => TagGroup[],
    getFileTags: (file: FileItem) => Tag[],
    onOperationSuccess?: (targetPaths: string[]) => void
) => {
    const { enqueueSnackbar } = useSnackbar();

    // Dialog States
    const [fileOperationDialog, setFileOperationDialog] = useState<FileOperationDialogState>({
        open: false,
        files: [],
        targetPath: ''
    });
    const [operationStatuses, setOperationStatuses] = useState<FileOperationStatus[]>([]);

    // Notification state removed in favor of notistack

    const [renameDialog, setRenameDialog] = useState<RenameDialogState>({ open: false, file: null, inputName: '' });
    const [addTagDialog, setAddTagDialog] = useState<AddTagDialogState>({ open: false, file: null, selectedTagIds: [] });
    const [deleteTagDialog, setDeleteTagDialog] = useState<DeleteTagDialogState>({ open: false, file: null, selectedTagIds: [] });
    const [detailsDialog, setDetailsDialog] = useState<DetailsDialogState>({ open: false, file: null });

    const openDetailsDialog = useCallback((file: FileItem) => {
        setDetailsDialog({ open: true, file });
    }, []);

    const closeDetailsDialog = useCallback(() => {
        setDetailsDialog({ open: false, file: null });
    }, []);
    const [directOperationDialog, setDirectOperationDialog] = useState<DirectOperationDialogState>({
        open: false,
        operation: 'move',
        files: [],
        rootPath: '',
        browsePath: ''
    });
    const [newFolderDialog, setNewFolderDialog] = useState<NewFolderDialogState>({ open: false, inputName: '' });
    const [deleteDialog, setDeleteDialog] = useState<DeleteConfirmDialogState>({ open: false, files: [] });

    const [pickerDirectories, setPickerDirectories] = useState<FileItem[]>([]);
    const [pickerLoading, setPickerLoading] = useState<boolean>(false);
    const [pickerError, setPickerError] = useState<string | null>(null);

    // Notification Helper
    const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
        enqueueSnackbar(message, { variant: severity });
    }, [enqueueSnackbar]);

    // closeNotification removed

    // File Operations
    const handleFileOpen = useCallback(async (file: FileItem) => {
        try {
            await window.electron.openFile(file.path);
        } catch (error) {
            console.error('Error opening file:', error);
        }
    }, []);

    const handleOpenInExplorer = useCallback(async (file: FileItem) => {
        try {
            if (file.isDirectory) {
                await window.electron.openFile(file.path);
            } else {
                const res = await window.electron.showItemInFolder(file.path);
                if (!res.success) {
                    showNotification(`打开资源管理器失败：${res.error || '未知错误'}`, 'error');
                }
            }
        } catch (e) {
            showNotification(`打开资源管理器失败：${e instanceof Error ? e.message : String(e)}`, 'error');
        }
    }, [showNotification]);

    const handleOpenCurrentFolderInExplorer = useCallback(async () => {
        try {
            if (currentPath) {
                await window.electron.openFile(currentPath);
            }
        } catch (e) {
            showNotification(`打开资源管理器失败：${e instanceof Error ? e.message : String(e)}`, 'error');
        }
    }, [currentPath, showNotification]);

    // Create Folder
    const handleCreateFolder = useCallback(() => {
        setNewFolderDialog({ open: true, inputName: '' });
    }, []);

    const closeNewFolderDialog = useCallback(() => setNewFolderDialog({ open: false, inputName: '' }), []);

    const confirmCreateFolder = useCallback(async () => {
        try {
            if (!currentPath) { closeNewFolderDialog(); return; }
            let name = (newFolderDialog.inputName || '').trim();
            if (!name) {
                name = '新建文件夹';
            }
            if (/[<>:"\/\\|?*]/.test(name)) {
                showNotification('文件夹名称无效，不能包含特殊字符：<>:"/\\|?*', 'error');
                return;
            }
            const res = await window.electron.createFolder(currentPath, name);
            if (!res.success) {
                showNotification(`创建文件夹失败：${res.error || '未知错误'}`, 'error');
            } else {
                closeNewFolderDialog(); // Close dialog immediately on success
                showNotification(`已创建：${res.path}`, 'success');
                await handleRefresh(true);

                // Select the new folder
                if (onOperationSuccess && res.path) {
                    onOperationSuccess([res.path]);
                }
            }
        } catch (e) {
            showNotification(`创建文件夹失败：${e instanceof Error ? e.message : String(e)}`, 'error');
            closeNewFolderDialog();
        }
    }, [currentPath, newFolderDialog.inputName, handleRefresh, showNotification, closeNewFolderDialog, onOperationSuccess]);

    // Rename
    const openRenameDialog = useCallback((file: FileItem) => {
        const defaultName = getDisplayName(file.name);
        setRenameDialog({ open: true, file, inputName: defaultName });
    }, []);

    const closeRenameDialog = useCallback(() => setRenameDialog({ open: false, file: null, inputName: '' }), []);

    const confirmRename = useCallback(async () => {
        const file = renameDialog.file;
        const input = renameDialog.inputName.trim();
        if (!file || !input) { closeRenameDialog(); return; }
        try {
            let newFileName = input;
            if (!file.isDirectory) {
                const tagNames = parseTagsFromFilename(file.name);
                if (tagNames.length > 0) {
                    newFileName = `[${tagNames.join(' ')}] ${input}`;
                }
            }
            const separator = file.path.includes('\\') ? '\\' : '/';
            const lastSepIndex = file.path.lastIndexOf(separator);
            const dir = file.path.substring(0, lastSepIndex);
            const newPath = `${dir}${separator}${newFileName}`;

            const res = await window.electron.renameFile(file.path, newPath);
            if (res.success) {
                closeRenameDialog(); // Close immediately
                showNotification('重命名成功', 'success');
                await handleRefresh();
            } else {
                showNotification(`重命名失败：${res.error}`, 'error');
                // Keep dialog open on failure to allow user to edit
            }
        } catch (e) {
            showNotification(`重命名失败：${e instanceof Error ? e.message : String(e)}`, 'error');
            closeRenameDialog(); // Close on exception? Or keeps open?
            // If it's a critical error, maybe close. If it is validation, keep open.
            // For now, let's follow the pattern of closing if we can't recover easily.
            // But usually we want to let user retry. 
            // Original code had `closeRenameDialog()` in finally, so it ALWAYS closed.
            // I will maintain the "Always Close" behavior for now to be safe, 
            // BUT for success case, it is closed earlier.
        } finally {
            // If we closed it earlier, this is redundant but harmless.
            // But if we want it to ONLY close on success, we shouldn't have it here.
            // Wait, user wants better responsiveness. Closing on error is also responsive?
            // Generally, you want to keep dialog open on error.
            // BUT, the original code decided to CLOSE IT ALL THE TIME.
            // I should probably respect the original intent to close it, but just do it FASTER on success.
            if (renameDialog.open) closeRenameDialog();
        }
    }, [renameDialog, handleRefresh, showNotification, closeRenameDialog]);

    // Delete
    const openDeleteConfirmDialog = useCallback((files: DraggedFile[]) => {
        setDeleteDialog({ open: true, files });
    }, []);

    const closeDeleteConfirmDialog = useCallback(() => {
        setDeleteDialog({ open: false, files: [] });
    }, []);

    const doDeleteFiles = useCallback(async (mode: 'trash' | 'permanent') => {
        const files = deleteDialog.files;
        closeDeleteConfirmDialog();

        if (files.length === 0) return;

        showNotification(`开始${mode === 'trash' ? '移动至回收站' : '永久删除'} ${files.length} 个项目...`, 'info');

        try {
            const result = await window.electron.deleteFiles({ mode, files: files.map(f => f.path) });
            if (result.success) {
                await handleRefresh();
                showNotification(`${files.length} 个项目已${mode === 'trash' ? '移动至回收站' : '永久删除'}。`, 'success');
            } else {
                const failedCount = (result.failedFiles?.length) || 1;
                showNotification(`删除失败（${failedCount} 项）。`, 'error');
            }
        } catch (e) {
            showNotification(`删除失败：${e instanceof Error ? e.message : String(e)}`, 'error');
        }
    }, [deleteDialog.files, closeDeleteConfirmDialog, handleRefresh, showNotification]);

    // Direct Operation (Move/Copy)
    const openDirectOperationDialog = useCallback((operation: 'move' | 'copy', files: DraggedFile[]) => {
        if (!currentLocation || !currentPath) return;
        const root = currentLocation.path;
        setDirectOperationDialog({ open: true, operation, files, rootPath: root, browsePath: currentPath });
    }, [currentLocation, currentPath]);

    const closeDirectOperationDialog = useCallback(() => {
        setDirectOperationDialog(prev => ({ ...prev, open: false }));
    }, []);

    const loadPickerDirs = useCallback(async (path: string) => {
        try {
            setPickerLoading(true);
            setPickerError(null);
            const list = await window.electron.getFiles(path);
            setPickerDirectories(list.filter(item => item.isDirectory));
        } catch (e) {
            setPickerError(e instanceof Error ? e.message : String(e));
            setPickerDirectories([]);
        } finally {
            setPickerLoading(false);
        }
    }, []);

    useEffect(() => {
        if (directOperationDialog.open && directOperationDialog.browsePath) {
            const norm = (p: string) => p.replace(/\\/g, '/');
            const root = norm(directOperationDialog.rootPath);
            const browse = norm(directOperationDialog.browsePath);
            if (!browse.startsWith(root)) {
                setDirectOperationDialog(prev => ({ ...prev, browsePath: prev.rootPath }));
                loadPickerDirs(directOperationDialog.rootPath);
            } else {
                loadPickerDirs(directOperationDialog.browsePath);
            }
        }
    }, [directOperationDialog.open, directOperationDialog.browsePath, directOperationDialog.rootPath, loadPickerDirs]);

    const navigatePickerTo = useCallback((path: string) => {
        const norm = (p: string) => p.replace(/\\/g, '/');
        const root = norm(directOperationDialog.rootPath);
        const next = norm(path);
        if (next.startsWith(root)) {
            setDirectOperationDialog(prev => ({ ...prev, browsePath: path }));
        }
    }, [directOperationDialog.rootPath]);

    const navigatePickerUp = useCallback(() => {
        const current = directOperationDialog.browsePath;
        const root = directOperationDialog.rootPath;
        const normalize = (p: string) => p.replace(/\\/g, '/');
        const curr = normalize(current);
        const rt = normalize(root);
        if (curr === rt) return;
        const parent = current.replace(/[\\/][^\\/]+$/, '');
        const parentNorm = normalize(parent);
        if (parentNorm.startsWith(rt)) {
            setDirectOperationDialog(prev => ({ ...prev, browsePath: parent }));
        } else {
            setDirectOperationDialog(prev => ({ ...prev, browsePath: prev.rootPath }));
        }
    }, [directOperationDialog.browsePath, directOperationDialog.rootPath]);

    const handleFileOperation = useCallback(async (operation: 'move' | 'copy', files: DraggedFile[], targetPath: string) => {
        const operationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        // 立即关闭对话框
        setFileOperationDialog(prev => ({ ...prev, open: false }));

        setOperationStatuses(prev => [...prev, {
            id: operationId,
            isOperating: true,
            operation,
            progress: 0,
            currentFile: '准备中...',
            totalFiles: files.length,
            completedFiles: 0
        }]);

        showNotification(`开始${operation === 'move' ? '移动' : '复制'} ${files.length} 个文件...`, 'info');

        try {
            // 异步执行文件操作
            setTimeout(async () => {
                try {
                    // Update current file status
                    setOperationStatuses(prev => prev.map(s =>
                        s.id === operationId
                            ? { ...s, currentFile: '正在处理...' }
                            : s
                    ));

                    // Listen for progress
                    const cleanup = window.electron.onFileOperationProgress((progress) => {
                        if (progress.operationId === operationId) {
                            setOperationStatuses(prev => prev.map(s =>
                                s.id === operationId
                                    ? {
                                        ...s,
                                        currentFile: progress.currentFile,
                                        progress: Math.round((progress.processedCount / progress.totalCount) * 100),
                                        completedFiles: progress.processedCount
                                    }
                                    : s
                            ));
                        }
                    });

                    const result = await window.electron.performFileOperation({
                        operation,
                        files: files.map(f => f.path),
                        targetPath,
                        operationId
                    });

                    cleanup();

                    if (result.success) {
                        await handleRefresh(true);
                        showNotification(`${files.length} 个文件${operation === 'move' ? '移动' : '复制'}成功！`, 'success');

                        // Call success callback with destination paths
                        if (onOperationSuccess && files.length > 0) {
                            const separator = targetPath.includes('\\') ? '\\' : '/';
                            const cleanTarget = targetPath.replace(/[\\/]$/, '');

                            const expectedPaths = files.map(file => `${cleanTarget}${separator}${file.name}`);
                            onOperationSuccess(expectedPaths);
                        }
                    } else {
                        showNotification(`文件${operation === 'move' ? '移动' : '复制'}失败: ${result.error}`, 'error');
                    }
                } catch (error) {
                    showNotification(`文件${operation === 'move' ? '移动' : '复制'}操作出错: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
                } finally {
                    setOperationStatuses(prev => prev.filter(s => s.id !== operationId));
                }
            }, 100);

        } catch (error) {
            showNotification(`启动文件操作失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
            setOperationStatuses(prev => prev.filter(s => s.id !== operationId));
        }
    }, [handleRefresh, showNotification]);

    // Picker functions for File Operation Dialog
    const handleSelectTargetPath = useCallback(() => {
        if (!currentLocation) return;

        setFileOperationDialog(prev => ({
            ...prev,
            pickerMode: true,
            pickerRoot: currentLocation.path,
            pickerBrowsePath: prev.targetPath || currentLocation.path
        }));
    }, [currentLocation]);

    const handlePickerNavigateTo = useCallback((path: string) => {
        const normalize = (p: string) => p.replace(/\\/g, '/');
        const root = normalize(fileOperationDialog.pickerRoot || '');
        const next = normalize(path);

        if (next.startsWith(root)) {
            setFileOperationDialog(prev => ({ ...prev, pickerBrowsePath: path }));
        }
    }, [fileOperationDialog.pickerRoot]);

    const handlePickerNavigateUp = useCallback(() => {
        const current = fileOperationDialog.pickerBrowsePath || '';
        const root = fileOperationDialog.pickerRoot || '';
        const normalize = (p: string) => p.replace(/\\/g, '/');
        const curr = normalize(current);
        const rt = normalize(root);

        if (curr === rt) return;

        const parent = current.replace(/[\\/][^\\/]+$/, '');
        const parentNorm = normalize(parent);

        if (parentNorm.startsWith(rt)) {
            setFileOperationDialog(prev => ({ ...prev, pickerBrowsePath: parent }));
        } else {
            setFileOperationDialog(prev => ({ ...prev, pickerBrowsePath: prev.pickerRoot }));
        }
    }, [fileOperationDialog.pickerBrowsePath, fileOperationDialog.pickerRoot]);

    const handleConfirmPickerPath = useCallback(() => {
        setFileOperationDialog(prev => ({
            ...prev,
            targetPath: prev.pickerBrowsePath || prev.targetPath,
            pickerMode: false
        }));
    }, []);

    const [pickerDirs, setPickerDirs] = useState<FileItem[]>([]);
    const [pickerDirsLoading, setPickerDirsLoading] = useState<boolean>(false);
    const [pickerDirsError, setPickerDirsError] = useState<string | null>(null);

    const loadPickerDirsForFileOp = useCallback(async (path: string) => {
        try {
            setPickerDirsLoading(true);
            setPickerDirsError(null);
            const list = await window.electron.getFiles(path);
            setPickerDirs(list.filter(item => item.isDirectory));
        } catch (e) {
            setPickerDirsError(e instanceof Error ? e.message : String(e));
            setPickerDirs([]);
        } finally {
            setPickerDirsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (fileOperationDialog.pickerMode && fileOperationDialog.pickerBrowsePath) {
            const norm = (p: string) => p.replace(/\\/g, '/');
            const root = norm(fileOperationDialog.pickerRoot || '');
            const browse = norm(fileOperationDialog.pickerBrowsePath);

            if (!browse.startsWith(root)) {
                setFileOperationDialog(prev => ({ ...prev, pickerBrowsePath: prev.pickerRoot }));
                if (fileOperationDialog.pickerRoot) {
                    loadPickerDirsForFileOp(fileOperationDialog.pickerRoot);
                }
            } else {
                loadPickerDirsForFileOp(fileOperationDialog.pickerBrowsePath);
            }
        }
    }, [fileOperationDialog.pickerMode, fileOperationDialog.pickerBrowsePath, fileOperationDialog.pickerRoot, loadPickerDirsForFileOp]);

    const confirmDirectOperation = useCallback(async () => {
        const { operation, files, browsePath } = directOperationDialog;
        if (!browsePath || files.length === 0) { closeDirectOperationDialog(); return; }
        await handleFileOperation(operation, files, browsePath);
        closeDirectOperationDialog();
    }, [directOperationDialog, handleFileOperation, closeDirectOperationDialog]);

    // Tag Operations
    const updateFileWithTags = useCallback(async (file: FileItem, newTags: Tag[]) => {
        try {
            const displayName = getDisplayName(file.name);
            const tagNames = newTags.map(tag => tag.name);
            const newFileName = tagNames.length > 0
                ? `[${tagNames.join(' ')}] ${displayName}`
                : displayName;

            const directory = file.path.substring(0, file.path.lastIndexOf('\\'));
            const newFilePath = `${directory}\\${newFileName}`;

            if (file.path === newFilePath) return;

            const result = await window.electron.renameFile(file.path, newFilePath);

            if (!result.success) {
                throw new Error(result.error || '文件重命名失败');
            }

            await handleRefresh(true);
            console.log('✅ 文件标签更新成功:', { oldPath: file.path, newPath: newFilePath, tags: tagNames });
        } catch (error) {
            console.error('❌ 更新文件标签失败:', error);
            throw error;
        }
    }, [handleRefresh]);

    // Tag Dialog Handlers
    const closeAddTagDialog = useCallback(() => {
        setAddTagDialog({ open: false, file: null, selectedTagIds: [] });
    }, []);

    const confirmAddTags = useCallback(async () => {
        const { file, selectedTagIds } = addTagDialog;
        if (!file || selectedTagIds.length === 0) {
            closeAddTagDialog();
            return;
        }
        try {
            const currentTags = getFileTags(file);
            const effectiveGroups = getEffectiveTagGroups();
            const newTagsToAdd: Tag[] = [];
            effectiveGroups.forEach(g => {
                g.tags.forEach(t => {
                    if (selectedTagIds.includes(t.id)) {
                        newTagsToAdd.push(t);
                    }
                });
            });

            const mergedTags = [...currentTags];
            newTagsToAdd.forEach(t => {
                if (!mergedTags.some(existing => existing.id === t.id)) {
                    mergedTags.push(t);
                }
            });

            await updateFileWithTags(file, mergedTags);
            closeAddTagDialog(); // Close immediately after update request succeeds (updateFileWithTags throws if fails)
            showNotification(`已添加 ${newTagsToAdd.length} 个标签`, 'success');
        } catch (e) {
            showNotification(`添加标签失败: ${e instanceof Error ? e.message : String(e)}`, 'error');
            closeAddTagDialog();
        } finally {
            // closeAddTagDialog();
        }
    }, [addTagDialog, getFileTags, getEffectiveTagGroups, updateFileWithTags, showNotification, closeAddTagDialog]);

    const toggleAddSelection = useCallback((tagId: string) => {
        setAddTagDialog(prev => {
            const current = prev.selectedTagIds;
            if (current.includes(tagId)) {
                return { ...prev, selectedTagIds: current.filter(id => id !== tagId) };
            } else {
                return { ...prev, selectedTagIds: [...current, tagId] };
            }
        });
    }, []);

    const closeDeleteTagDialog = useCallback(() => {
        setDeleteTagDialog({ open: false, file: null, selectedTagIds: [] });
    }, []);

    const confirmDeleteTags = useCallback(async () => {
        const { file, selectedTagIds } = deleteTagDialog;
        if (!file || selectedTagIds.length === 0) {
            closeDeleteTagDialog();
            return;
        }
        try {
            const currentTags = getFileTags(file);
            const remainingTags = currentTags.filter(t => !selectedTagIds.includes(t.id));
            await updateFileWithTags(file, remainingTags);
            closeDeleteTagDialog(); // Close immediately
            showNotification(`已删除 ${selectedTagIds.length} 个标签`, 'success');
        } catch (e) {
            showNotification(`删除标签失败: ${e instanceof Error ? e.message : String(e)}`, 'error');
            closeDeleteTagDialog();
        } finally {
            // closeDeleteTagDialog();
        }
    }, [deleteTagDialog, getFileTags, updateFileWithTags, showNotification, closeDeleteTagDialog]);

    const toggleDeleteSelection = useCallback((tagId: string) => {
        setDeleteTagDialog(prev => {
            const current = prev.selectedTagIds;
            if (current.includes(tagId)) {
                return { ...prev, selectedTagIds: current.filter(id => id !== tagId) };
            } else {
                return { ...prev, selectedTagIds: [...current, tagId] };
            }
        });
    }, []);

    // Tag Operations


    const handleRemoveTagFromFile = useCallback(async (tag: Tag, file: FileItem) => {
        try {
            const currentTags = getFileTags(file);
            const remainingTags = currentTags.filter(t => t.id !== tag.id);
            await updateFileWithTags(file, remainingTags);
            showNotification(`已从文件 "${getDisplayName(file.name)}" 中删除标签 "${tag.name}"`, 'success');
        } catch (error) {
            showNotification(`删除标签失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    }, [getFileTags, updateFileWithTags, showNotification]);

    const handleTagDrop = useCallback(async (file: FileItem, draggedTag: Tag) => {
        try {
            const currentTags = getFileTags(file);
            const tagExists = currentTags.some(tag => tag.id === draggedTag.id);
            if (tagExists) {
                showNotification(`文件 "${file.name}" 已经包含标签 "${draggedTag.name}"`, 'info');
                return;
            }
            const newTags = [...currentTags, draggedTag];
            await updateFileWithTags(file, newTags);
            showNotification(`成功为文件 "${file.name}" 添加标签 "${draggedTag.name}"`, 'success');
        } catch (error) {
            showNotification(`添加标签失败: ${error}`, 'error');
        }
    }, [getFileTags, updateFileWithTags, showNotification]);

    const handleTagDropWithPosition = useCallback(async (file: FileItem, draggedTag: Tag, insertPosition: number) => {
        try {
            const currentTags = getFileTags(file);
            const tagExists = currentTags.some(tag => tag.id === draggedTag.id);
            if (tagExists) {
                showNotification(`文件 "${file.name}" 已经包含标签 "${draggedTag.name}"`, 'info');
                return;
            }

            let newTags: Tag[];
            if (insertPosition === -1 || insertPosition >= currentTags.length) {
                newTags = [...currentTags, draggedTag];
            } else {
                newTags = [
                    ...currentTags.slice(0, insertPosition),
                    draggedTag,
                    ...currentTags.slice(insertPosition)
                ];
            }

            await updateFileWithTags(file, newTags);
            showNotification(`成功为文件 "${file.name}" 添加标签 "${draggedTag.name}"`, 'success');
        } catch (error) {
            showNotification(`添加标签失败: ${error}`, 'error');
        }
    }, [getFileTags, updateFileWithTags, showNotification]);

    const reorderTagWithinFile = useCallback(async (file: FileItem, sourceIndex: number, targetIndex: number) => {
        try {
            const currentTags = getFileTags(file);
            if (!currentTags || currentTags.length === 0) return;

            const tagToMove = currentTags[sourceIndex];
            if (!tagToMove) return;

            const newTags = [...currentTags];
            const [removed] = newTags.splice(sourceIndex, 1);
            newTags.splice(targetIndex, 0, removed);

            await updateFileWithTags(file, newTags);
            showNotification(`已重排文件 "${getDisplayName(file.name)}" 的标签`, 'success');
        } catch (error) {
            showNotification(`重排标签失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
        }
    }, [getFileTags, updateFileWithTags, showNotification]);

    return {
        fileOperationDialog,
        setFileOperationDialog,
        operationStatuses,
        showNotification,
        renameDialog,
        setRenameDialog,
        openRenameDialog,
        closeRenameDialog,
        confirmRename,
        addTagDialog,
        setAddTagDialog,
        deleteTagDialog,
        setDeleteTagDialog,
        detailsDialog,
        setDetailsDialog,
        openDetailsDialog,
        closeDetailsDialog,
        closeAddTagDialog,
        confirmAddTags,
        toggleAddSelection,
        closeDeleteTagDialog,
        confirmDeleteTags,
        toggleDeleteSelection,
        directOperationDialog,
        setDirectOperationDialog,
        openDirectOperationDialog,
        closeDirectOperationDialog,
        confirmDirectOperation,
        pickerDirectories,
        pickerLoading,
        pickerError,
        navigatePickerTo,
        navigatePickerUp,
        newFolderDialog,
        setNewFolderDialog,
        handleCreateFolder,
        closeNewFolderDialog,
        confirmCreateFolder,
        deleteDialog,
        setDeleteDialog,
        openDeleteConfirmDialog,
        closeDeleteConfirmDialog,
        doDeleteFiles,
        handleFileOpen,
        handleOpenInExplorer,
        handleOpenCurrentFolderInExplorer,
        handleFileOperation,
        handleRemoveTagFromFile,
        handleTagDrop,
        handleTagDropWithPosition,
        reorderTagWithinFile,
        handleSelectTargetPath,
        handlePickerNavigateTo,
        handlePickerNavigateUp,
        handleConfirmPickerPath,
        pickerDirs,
        pickerDirsLoading,
        pickerDirsError,
    };
};
