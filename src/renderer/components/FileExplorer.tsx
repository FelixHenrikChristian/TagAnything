import React, { useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { FolderOpen as FolderOpenIcon } from '@mui/icons-material';
import { DragEndEvent } from '@dnd-kit/core';
import { useFileExplorerState } from '../hooks/fileExplorer/useFileExplorerState';
import { useFileFilter } from '../hooks/fileExplorer/useFileFilter';
import { useFileOperations } from '../hooks/fileExplorer/useFileOperations';
import { useFileContextMenu } from '../hooks/fileExplorer/useFileContextMenu';
import { useFileDrag } from '../hooks/fileExplorer/useFileDrag';
import { useKeyboardNavigation } from '../hooks/fileExplorer/useKeyboardNavigation';

import { ExplorerToolbar } from './FileExplorer/ExplorerToolbar';
import { ExplorerStatusBar } from './FileExplorer/ExplorerStatusBar';
import { FileList } from './FileExplorer/FileList';
import { FileGrid } from './FileExplorer/FileGrid';
import { ExplorerDialogs } from './FileExplorer/ExplorerDialogs';
import { ExplorerContextMenus } from './FileExplorer/ExplorerContextMenus';
import { FileItem, Tag, TagGroup } from '../types';
import { useAppTheme } from '../context/ThemeContext';

interface FileExplorerProps {
  tagDisplayStyle?: 'original' | 'library';
}

export interface FileExplorerHandle {
  handleDragEnd: (event: DragEndEvent) => void;
}

const FileExplorer = forwardRef<FileExplorerHandle, FileExplorerProps>(({ tagDisplayStyle = 'original' }, ref) => {
  // 1. Core State
  const {
    locations,
    currentLocation,
    currentPath,
    files,
    isLoading,
    viewMode,
    setViewMode,
    gridSize,
    setGridSize,
    tagGroups,
    fileTags,
    videoThumbnails,
    handleLocationSelect,
    handleNavigate,
    handleRefresh: refreshCore,
    getFileTags,
    getEffectiveTagGroups,
    setFileTags,
    generateVideoThumbnails,
    pushHistory,
    goBack,
    goForward,
    goUp,
    canGoBack,
    canGoForward,
    canGoUp,
    isNavigatingHistory,
  } = useFileExplorerState(tagDisplayStyle);

  // Get display settings for simplified-traditional search
  const { displaySettings } = useAppTheme();

  // 2. Filter Logic
  const {
    filteredFiles,
    isFiltering,
    filterState,
    handleFilterByTag,
    handleMultiTagFilter,
    handleFilenameSearch,
    clearFilter,
    restoreFilterState,
    sortType,
    setSortType,
    sortDirection,
    setSortDirection,
    setGlobalSearchMode,
    refreshCurrentFilter,
    isSearching
  } = useFileFilter(
    files,
    currentPath,
    getEffectiveTagGroups,
    setFileTags,
    generateVideoThumbnails,
    fileTags,
    displaySettings
  );

  // Track previous filter state for history management
  const prevFilterStateRef = useRef(filterState);

  // Push history entry when filter state changes (not during history navigation)
  useEffect(() => {
    // Skip if we're navigating through history
    if (isNavigatingHistory.current) return;

    const prevState = prevFilterStateRef.current;
    const hasFilterChanged =
      JSON.stringify(prevState) !== JSON.stringify(filterState);

    if (hasFilterChanged && currentPath) {
      pushHistory(currentPath, filterState);
      prevFilterStateRef.current = filterState;
    }
  }, [filterState, currentPath, pushHistory, isNavigatingHistory]);

  // Wrapper for back navigation that also restores filter state
  const handleGoBack = useCallback(() => {
    const entry = goBack();
    if (entry) {
      restoreFilterState(entry.filterState);
    }
  }, [goBack, restoreFilterState]);

  // Wrapper for forward navigation that also restores filter state
  const handleGoForward = useCallback(() => {
    const entry = goForward();
    if (entry) {
      restoreFilterState(entry.filterState);
    }
  }, [goForward, restoreFilterState]);



  // 3. Operations & Dialogs
  const {
    fileOperationDialog,
    setFileOperationDialog,
    operationStatuses,
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
    closeAddTagDialog,
    confirmAddTags,
    toggleAddSelection,
    closeDeleteTagDialog,
    confirmDeleteTags,
    toggleDeleteSelection,
    handleSelectTargetPath,
    handlePickerNavigateTo,
    handlePickerNavigateUp,
    handleConfirmPickerPath,
    pickerDirs,
    pickerDirsLoading,
    pickerDirsError,
    showNotification,
  } = useFileOperations(
    currentPath,
    currentLocation,
    async (silent?: boolean) => {
      await refreshCore(isFiltering, filteredFiles, silent);
      if (isFiltering) {
        await refreshCurrentFilter();
      }
    },
    getEffectiveTagGroups,
    getFileTags,
    (targetPaths) => {
      if (displaySettings.navigateToTargetAfterOperation && targetPaths.length > 0) {
        // Extract target directory from the first target path
        const targetDir = targetPaths[0].replace(/[/\\][^/\\]+$/, '');
        // Clear filters and navigate to target directory
        clearFilter();
        handleNavigate(targetDir);
      }
      // Set pending selection so files get selected after navigation
      setPendingSelection(targetPaths);
    }
  );

  // 4. Context Menus
  const {
    fileContextMenu,
    folderContextMenu,
    blankContextMenu,
    tagContextMenu,
    handleCloseContextMenu,
    handleFileContextMenu,
    handleBlankContextMenu,
    handleTagContextMenu,
  } = useFileContextMenu();

  // Wrapper for context menu to handle selection logic
  const handleContextMenuWrapper = (event: React.MouseEvent, file: FileItem, index: number) => {
    // If the right-clicked file is NOT in the current selection, select it exclusively
    if (!selectedPaths.has(file.path)) {
      setSelectedIndices(new Set([index]));
    }
    // If it IS in the selection, do nothing to selection (preserve multi-selection)

    handleFileContextMenu(event, file);
  };



  // 5. Drag State
  const { dragState, setDragState } = useFileDrag();

  // 6. Layout Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // 7. Keyboard Navigation
  const { selectedFiles, clearSelection, setSelectedIndices } = useKeyboardNavigation({
    files: filteredFiles,
    gridContainerRef: containerRef,
    goBack: handleGoBack,
    handleRefresh: async () => { await refreshCore(isFiltering, filteredFiles); },
    handleNavigate: (path: string) => { clearFilter(); handleNavigate(path); },
    handleFileOpen,
    onPaste: (files, operation) => {
      if (currentPath) {
        handleFileOperation(
          operation === 'cut' ? 'move' : 'copy',
          files.map(f => ({ name: f.name, path: f.path, size: f.size })),
          currentPath
        );
      }
    },
    onDelete: (files) => {
      openDeleteConfirmDialog(files.map(f => ({ name: f.name, path: f.path, size: f.size })));
    },
    showNotification,
    enabled: !!currentLocation,
  });

  // Calculate selected paths for rendering
  const selectedPaths = useMemo(() => new Set(selectedFiles.map(f => f.path)), [selectedFiles]);

  // Scroll/Select Logic (Refactored to use Selection)
  // When an operation completes, we want to select the new file.
  // The useKeyboardNavigation hook will automatically scroll to the selected file.
  // Scroll/Select Logic (Refactored to use Selection)
  const [pendingSelection, setPendingSelection] = React.useState<string[] | null>(null);

  useEffect(() => {
    if (pendingSelection && pendingSelection.length > 0 && filteredFiles.length > 0) {
      // Find the indices of the files we want to select
      const indices = new Set<number>();
      pendingSelection.forEach(path => {
        const index = filteredFiles.findIndex(f => f.path === path);
        if (index !== -1) {
          indices.add(index);
        }
      });

      if (indices.size > 0) {
        setSelectedIndices(indices);
        setPendingSelection(null);
      }
    }
  }, [filteredFiles, pendingSelection, setSelectedIndices]);

  const handleFileClick = useCallback((event: React.MouseEvent, file: FileItem, index: number) => {
    // If it's a right click, we generally don't change selection unless the clicked item is not in the current selection
    if (event.button === 2) {
      if (!selectedPaths.has(file.path)) {
        setSelectedIndices(new Set([index]));
      }
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      const newIndices = new Set(selectedFiles.reduce((acc, f) => {
        const idx = filteredFiles.findIndex(fi => fi.path === f.path);
        if (idx !== -1) acc.push(idx);
        return acc;
      }, [] as number[]));

      if (newIndices.has(index)) {
        newIndices.delete(index);
      } else {
        newIndices.add(index);
      }
      setSelectedIndices(newIndices);
    } else if (event.shiftKey && selectedFiles.length > 0) {
      // Range selection
      // Find the "anchor" - let's assume it's the last selected item's index
      // In a real OS, there's a concept of 'anchor' which might differ from 'focused'.
      // For simplicity, we'll use the last item in the current selection list as the anchor.
      // Or better, finding the index of the first selected item?
      // Actually, useKeyboardNavigation usually tracks focus. Let's see if we can use focusedIndex from it if we exposed it.
      // Since we don't expose focusedIndex, let's just pick the last selected file as anchor.
      const lastSelectedPath = selectedFiles[selectedFiles.length - 1].path;
      const lastSelectedIndex = filteredFiles.findIndex(f => f.path === lastSelectedPath);

      if (lastSelectedIndex !== -1) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const newIndices = new Set<number>();
        // Keep existing non-range selection? Windows usually replaces.
        // Let's replace.
        for (let i = start; i <= end; i++) {
          newIndices.add(i);
        }
        setSelectedIndices(newIndices);
      } else {
        setSelectedIndices(new Set([index]));
      }

    } else {
      // Single select
      setSelectedIndices(new Set([index]));
    }
  }, [filteredFiles, selectedFiles, selectedPaths, setSelectedIndices]);


  // 8. Handlers Wrapper
  const onNavigate = (path: string) => {
    clearFilter();
    handleNavigate(path);
  };

  const onLocationSelect = (location: any) => {
    clearFilter();
    handleLocationSelect(location);
  };

  const onRefresh = async () => {
    await refreshCore(isFiltering, filteredFiles);
  };

  useImperativeHandle(ref, () => ({
    handleDragEnd: (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) return;

      // 1. Dragging from Library to File
      if (active.data.current?.type === 'LIBRARY_TAG') {
        let targetFile = null;
        let insertIndex = -1;

        if (over.data.current?.type === 'FILE') {
          targetFile = over.data.current.file;
        } else if (over.data.current?.type === 'FILE_TAG') {
          // If dropped on a tag, find the file it belongs to
          const filePath = over.data.current.filePath;
          targetFile = files.find(f => f.path === filePath);

          // Get insertion index if available
          if (typeof over.data.current.index === 'number') {
            insertIndex = over.data.current.index;
          }
        }

        if (targetFile) {
          const tag = active.data.current.tag;
          if (insertIndex !== -1) {
            handleTagDropWithPosition(targetFile, tag, insertIndex);
          } else {
            handleTagDrop(targetFile, tag);
          }
        }
      }

      // 2. Reordering within File
      if (active.data.current?.type === 'FILE_TAG' && over.data.current?.type === 'FILE_TAG') {
        const activeTag = active.data.current.tag;
        const overTag = over.data.current.tag;
        const activeFilePath = active.data.current.filePath;
        const overFilePath = over.data.current.filePath;

        if (activeFilePath === overFilePath) {
          const file = files.find(f => f.path === activeFilePath);
          if (file) {
            const tags = getFileTags(file);
            const oldIndex = tags.findIndex(t => t.id === activeTag.id);
            const newIndex = tags.findIndex(t => t.id === overTag.id);
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
              reorderTagWithinFile(file, oldIndex, newIndex);
            }
          }
        }
      }
    }
  }));

  // 9. Native Drag & Drop
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const dragCounter = useRef(0);

  const handleNativeDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragCounter.current += 1;
      if (dragCounter.current === 1) {
        setIsDraggingOver(true);
      }
    }
  };

  const handleNativeDragLeave = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDraggingOver(false);
      }
    }
  };

  const handleNativeDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleNativeDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDraggingOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files).map((f: any) => ({
        name: f.name,
        path: f.path,
        size: f.size
      }));

      if (droppedFiles.length > 0 && currentPath) {
        setFileOperationDialog({
          open: true,
          files: droppedFiles,
          targetPath: currentPath
        });
      }
    }
  };

  // 10. Ctrl + Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      // gridSize 越小 = 卡片越大 = 放大
      // deltaY < 0: scroll up (zoom in = decrease gridSize)
      // deltaY > 0: scroll down (zoom out = increase gridSize)
      const zoomStep = 1;
      const minSize = 1;
      const maxSize = 17;

      setGridSize(prev => {
        const newSize = e.deltaY < 0 ? prev - zoomStep : prev + zoomStep;
        return Math.max(minSize, Math.min(maxSize, newSize));
      });
    }
  };

  // 8. Render
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <ExplorerToolbar
        locations={locations}
        currentLocation={currentLocation}
        currentPath={currentPath}
        handleLocationSelect={onLocationSelect}
        handleRefresh={onRefresh}
        handleNavigate={onNavigate}
        goBack={handleGoBack}
        goForward={handleGoForward}
        goUp={goUp}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        canGoUp={canGoUp}
        viewMode={viewMode}
        setViewMode={setViewMode}
        gridSize={gridSize}
        setGridSize={setGridSize}
        filterState={filterState}
        handleMultiTagFilter={handleMultiTagFilter}
        handleFilenameSearch={handleFilenameSearch}
        clearFilter={clearFilter}
        tagGroups={tagGroups}
        sortType={sortType}
        setSortType={setSortType}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        setGlobalSearchMode={setGlobalSearchMode}
      />

      {/* Main Content Area */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          pb: 2,
          pt: 0,
          backgroundColor: 'transparent',
          position: 'relative', // For absolute positioning of overlays if needed
          border: isDraggingOver ? '2px dashed #2196f3' : '2px solid transparent',
          transition: 'border 0.2s ease-in-out',
          borderRadius: 2,
          margin: 1
        }}
        onContextMenu={handleBlankContextMenu}
        onClick={handleCloseContextMenu}
        onDragEnter={handleNativeDragEnter}
        onDragLeave={handleNativeDragLeave}
        onDragOver={handleNativeDragOver}
        onDrop={handleNativeDrop}
        onWheel={handleWheel}
      >
        {/* File View */}
        {isLoading || isSearching ? (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%'
          }}>
            <CircularProgress />
          </Box>
        ) : !currentLocation ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            py: 8
          }}>
            <FolderOpenIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3, opacity: 0.5 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
              未选择位置
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
              请先在位置管理中选择一个位置，或添加新的位置来开始管理文件
            </Typography>
          </Box>
        ) : viewMode === 'list' ? (
          <FileList
            files={filteredFiles}
            handleNavigate={onNavigate}
            handleFileOpen={handleFileOpen}
            handleContextMenu={handleContextMenuWrapper}
            handleTagContextMenu={handleTagContextMenu}
            videoThumbnails={videoThumbnails}
            getFileTags={getFileTags}
            tagDisplayStyle={tagDisplayStyle}
            selectedPaths={selectedPaths}
            onFileClick={handleFileClick}
          />
        ) : (
          <FileGrid
            files={filteredFiles}
            handleNavigate={onNavigate}
            handleFileOpen={handleFileOpen}
            handleContextMenu={handleContextMenuWrapper}
            handleTagContextMenu={handleTagContextMenu}
            videoThumbnails={videoThumbnails}
            getFileTags={getFileTags}
            tagDisplayStyle={tagDisplayStyle}
            gridSize={gridSize}
            handleTagDrop={handleTagDrop}
            reorderTagWithinFile={reorderTagWithinFile}
            selectedPaths={selectedPaths}
            onFileClick={handleFileClick}
          />
        )}
      </Box>

      {/* Status Bar */}
      <ExplorerStatusBar count={isFiltering ? filteredFiles.length : files.length} />

      {/* Dialogs */}
      <ExplorerDialogs
        fileOperationDialog={fileOperationDialog}
        setFileOperationDialog={setFileOperationDialog}
        operationStatuses={operationStatuses}
        renameDialog={renameDialog}
        setRenameDialog={setRenameDialog}
        addTagDialog={addTagDialog}
        setAddTagDialog={setAddTagDialog}
        deleteTagDialog={deleteTagDialog}
        setDeleteTagDialog={setDeleteTagDialog}
        detailsDialog={detailsDialog}
        directOperationDialog={directOperationDialog}
        setDirectOperationDialog={setDirectOperationDialog}
        newFolderDialog={newFolderDialog}
        setNewFolderDialog={setNewFolderDialog}
        deleteDialog={deleteDialog}

        handleFileOperation={handleFileOperation}
        handleSelectTargetPath={handleSelectTargetPath}
        handlePickerNavigateTo={handlePickerNavigateTo}
        handlePickerNavigateUp={handlePickerNavigateUp}
        handleConfirmPickerPath={handleConfirmPickerPath}
        closeNewFolderDialog={closeNewFolderDialog}
        confirmCreateFolder={confirmCreateFolder}
        closeDirectOperationDialog={closeDirectOperationDialog}
        confirmDirectOperation={confirmDirectOperation}
        navigatePickerUp={navigatePickerUp}
        navigatePickerTo={navigatePickerTo}
        closeDeleteConfirmDialog={closeDeleteConfirmDialog}
        doDeleteFiles={doDeleteFiles}
        closeRenameDialog={closeRenameDialog}
        confirmRename={confirmRename}
        closeAddTagDialog={closeAddTagDialog}
        confirmAddTags={confirmAddTags}
        toggleAddSelection={toggleAddSelection}
        closeDeleteTagDialog={closeDeleteTagDialog}
        confirmDeleteTags={confirmDeleteTags}
        toggleDeleteSelection={toggleDeleteSelection}
        closeDetailsDialog={closeDetailsDialog}

        pickerDirectories={pickerDirectories}
        pickerLoading={pickerLoading}
        pickerError={pickerError}
        pickerDirs={pickerDirs}
        pickerDirsLoading={pickerDirsLoading}
        pickerDirsError={pickerDirsError}
        getEffectiveTagGroups={getEffectiveTagGroups}
        getFileTags={getFileTags}
      />

      {/* Context Menus */}
      <ExplorerContextMenus
        fileContextMenu={fileContextMenu}
        folderContextMenu={folderContextMenu}
        blankContextMenu={blankContextMenu}
        tagContextMenu={tagContextMenu}
        filterState={filterState}

        handleCloseContextMenu={handleCloseContextMenu}
        handleCloseBlankContextMenu={() => handleCloseContextMenu()} // Reusing generic close
        handleCloseTagContextMenu={() => handleCloseContextMenu()}

        handleOpenInExplorer={handleOpenInExplorer}
        openRenameDialog={openRenameDialog}
        openDirectOperationDialog={openDirectOperationDialog}
        openDeleteConfirmDialog={openDeleteConfirmDialog}
        openDetailsDialog={openDetailsDialog}

        handleOpenCurrentFolderInExplorer={handleOpenCurrentFolderInExplorer}
        handleCreateFolder={handleCreateFolder}

        handleFilterByTag={handleFilterByTag}
        handleRemoveTagFromFile={handleRemoveTagFromFile}
        handleNavigateToDirectory={(file) => {
          // Extract parent directory from file path
          const parentDir = file.path.replace(/[/\\][^/\\]+$/, '');
          // Set pending selection so it gets selected after navigation
          setPendingSelection([file.path]);
          // Clear filters and navigate to the parent directory
          clearFilter();
          handleNavigate(parentDir);
        }}
        selectedFiles={selectedFiles}
      />
    </Box>
  );
});

export default FileExplorer;