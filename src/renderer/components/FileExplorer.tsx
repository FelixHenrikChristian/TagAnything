import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography } from '@mui/material';
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
    goBack,
    goForward,
    goUp,
    canGoBack,
    canGoForward,
    canGoUp,
  } = useFileExplorerState(tagDisplayStyle);

  // 2. Filter Logic
  const {
    filteredFiles,
    isFiltering,
    filterState,
    handleFilterByTag,
    handleMultiTagFilter,
    handleFilenameSearch,
    clearFilter,
    sortType,
    setSortType,
    sortDirection,
    setSortDirection,
  } = useFileFilter(
    files,
    currentPath,
    getEffectiveTagGroups,
    setFileTags,
    generateVideoThumbnails,
    fileTags
  );

  // 3. Operations & Dialogs
  const {
    fileOperationDialog,
    setFileOperationDialog,
    operationStatus,
    notification,
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
    closeNotification,
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
  } = useFileOperations(
    currentPath,
    currentLocation,
    async () => { await refreshCore(isFiltering, filteredFiles); },
    getEffectiveTagGroups,
    getFileTags
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

  // 5. Drag State
  const { dragState, setDragState } = useFileDrag();

  // 6. Layout Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // 7. Keyboard Navigation
  const { selectedFile, clearSelection } = useKeyboardNavigation({
    files: filteredFiles,
    gridContainerRef: containerRef,
    goBack,
    handleRefresh: async () => { await refreshCore(isFiltering, filteredFiles); },
    handleNavigate: (path: string) => { clearFilter(); handleNavigate(path); },
    handleFileOpen,
    enabled: !!currentLocation,
  });

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
        goBack={goBack}
        goForward={goForward}
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
      >
        {/* File View */}
        {!currentLocation ? (
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
            handleContextMenu={handleFileContextMenu}
            handleTagContextMenu={handleTagContextMenu}
            videoThumbnails={videoThumbnails}
            getFileTags={getFileTags}
            tagDisplayStyle={tagDisplayStyle}
          />
        ) : (
          <FileGrid
            files={filteredFiles}
            handleNavigate={onNavigate}
            handleFileOpen={handleFileOpen}
            handleContextMenu={handleFileContextMenu}
            handleTagContextMenu={handleTagContextMenu}
            videoThumbnails={videoThumbnails}
            getFileTags={getFileTags}
            tagDisplayStyle={tagDisplayStyle}
            gridSize={gridSize}
            handleTagDrop={handleTagDrop}
            reorderTagWithinFile={reorderTagWithinFile}
            selectedFilePath={selectedFile?.path}
          />
        )}
      </Box>

      {/* Status Bar */}
      <ExplorerStatusBar count={isFiltering ? filteredFiles.length : files.length} />

      {/* Dialogs */}
      <ExplorerDialogs
        fileOperationDialog={fileOperationDialog}
        setFileOperationDialog={setFileOperationDialog}
        operationStatus={operationStatus}
        notification={notification}
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
        closeNotification={closeNotification}

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
      />
    </Box>
  );
});

export default FileExplorer;