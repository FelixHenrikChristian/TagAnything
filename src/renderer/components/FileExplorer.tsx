import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Box } from '@mui/material';
import { DragEndEvent } from '@dnd-kit/core';
import { useFileExplorerState } from '../hooks/fileExplorer/useFileExplorerState';
import { useFileFilter } from '../hooks/fileExplorer/useFileFilter';
import { useFileOperations } from '../hooks/fileExplorer/useFileOperations';
import { useFileContextMenu } from '../hooks/fileExplorer/useFileContextMenu';
import { useFileDrag } from '../hooks/fileExplorer/useFileDrag';

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
    reorderTagWithinFile,
    closeNotification,
    closeAddTagDialog,
    confirmAddTags,
    toggleAddSelection,
    closeDeleteTagDialog,
    confirmDeleteTags,
    toggleDeleteSelection,
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

  // 7. Handlers Wrapper
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
        if (over.data.current?.type === 'FILE') {
          targetFile = over.data.current.file;
        } else if (over.data.current?.type === 'FILE_TAG') {
          // If dropped on a tag, find the file it belongs to
          const filePath = over.data.current.filePath;
          targetFile = files.find(f => f.path === filePath);
        }

        if (targetFile) {
          const tag = active.data.current.tag;
          handleTagDrop(targetFile, tag);
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
          position: 'relative' // For absolute positioning of overlays if needed
        }}
        onContextMenu={handleBlankContextMenu}
        onClick={handleCloseContextMenu}
      >
        {/* File View */}
        {viewMode === 'list' ? (
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