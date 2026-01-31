import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileItem } from '../../types';

// Clipboard state for cut/copy operations
interface ClipboardState {
    files: FileItem[];
    operation: 'copy' | 'cut';
}

interface UseKeyboardNavigationOptions {
    files: FileItem[];
    gridContainerRef: React.RefObject<HTMLElement>;
    goBack: () => void;
    handleRefresh: () => Promise<void>;
    handleNavigate: (path: string) => void;
    handleFileOpen: (file: FileItem) => void;
    onPaste?: (files: FileItem[], operation: 'copy' | 'cut') => void;
    onDelete?: (files: FileItem[]) => void;
    showNotification?: (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;
    enabled?: boolean;
    // Callback to scroll to a specific index (for virtualized lists)
    scrollToIndex?: (index: number) => void;
    // Callback to get the number of columns in the grid (for virtualized lists)
    getColumnsCount?: () => number;
}

interface UseKeyboardNavigationResult {
    selectedIndices: Set<number>;
    selectedFiles: FileItem[];
    setSelectedIndices: (indices: Set<number>) => void;
    clearSelection: () => void;
    clipboardState: ClipboardState | null;
    hasClipboard: boolean;
}

/**
 * Custom hook for keyboard navigation in file explorer.
 * Supports Windows 11-style navigation:
 * - Arrow keys: Navigate between files in grid (single select)
 * - ESC: Clear selection
 * - Backspace: Go back to parent folder
 * - F5: Refresh current folder
 * - Enter: Open selected file/folder (opens first selected)
 */
export const useKeyboardNavigation = ({
    files,
    gridContainerRef,
    goBack,
    handleRefresh,
    handleNavigate,
    handleFileOpen,
    onPaste,
    onDelete,
    showNotification,
    enabled = true,
    scrollToIndex,
    getColumnsCount: getColumnsCountExternal,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationResult => {
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [clipboardState, setClipboardState] = useState<ClipboardState | null>(null);

    // Calculate the selected files based on indices
    const selectedFiles = useMemo(() => {
        const result: FileItem[] = [];
        selectedIndices.forEach(index => {
            if (index >= 0 && index < files.length) {
                result.push(files[index]);
            }
        });
        return result;
    }, [selectedIndices, files]);

    // Clear selection when files change (e.g., navigating to new folder)
    useEffect(() => {
        setSelectedIndices(new Set());
        setFocusedIndex(null);
    }, [files]);

    const clearSelection = useCallback(() => {
        setSelectedIndices(new Set());
        setFocusedIndex(null);
    }, []);

    // Auto-scroll to keep focused item visible
    useEffect(() => {
        if (focusedIndex === null || focusedIndex < 0 || focusedIndex >= files.length) return;

        // If scrollToIndex callback is provided (for virtualized lists), use it
        if (scrollToIndex) {
            scrollToIndex(focusedIndex);
            return;
        }

        // Fallback: DOM-based scrolling for non-virtualized lists
        if (!gridContainerRef.current) return;

        const focusedFile = files[focusedIndex];
        // Find the selected card element by file path
        const container = gridContainerRef.current;
        const cards = container.querySelectorAll('[data-file-path]');

        for (const card of cards) {
            if (card.getAttribute('data-file-path') === focusedFile.path) {
                const cardRect = card.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const padding = 20; // Extra padding to ensure card is fully visible

                // Check if card is above visible area
                if (cardRect.top < containerRect.top + padding) {
                    const scrollAmount = cardRect.top - containerRect.top - padding;
                    container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
                // Check if card is below visible area
                else if (cardRect.bottom > containerRect.bottom - padding) {
                    const scrollAmount = cardRect.bottom - containerRect.bottom + padding;
                    container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
                break;
            }
        }
    }, [focusedIndex, files, gridContainerRef, scrollToIndex]);

    // Calculate number of columns in the grid
    const getColumnsCount = useCallback((): number => {
        // If external callback is provided (for virtualized lists), use it
        if (getColumnsCountExternal) {
            return getColumnsCountExternal();
        }

        // Fallback: DOM-based calculation for non-virtualized lists
        const container = gridContainerRef.current;
        if (!container) return 1;

        // Find the grid element (first child of container that has grid layout)
        const gridElement = container.querySelector('[style*="grid"]') || container.firstElementChild;
        if (!gridElement) return 1;

        const computedStyle = window.getComputedStyle(gridElement);
        const gridTemplateColumns = computedStyle.getPropertyValue('grid-template-columns');

        if (gridTemplateColumns) {
            // Count the number of column tracks
            const columns = gridTemplateColumns.split(' ').filter(col => col && col !== 'none').length;
            return Math.max(1, columns);
        }

        return 1;
    }, [gridContainerRef, getColumnsCountExternal]);

    // Handle keyboard events
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if focus is on input elements
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Ctrl+A: Select all (only if there are files)
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
                if (files.length > 0) {
                    event.preventDefault();
                    const allIndices = new Set<number>();
                    for (let i = 0; i < files.length; i++) {
                        allIndices.add(i);
                    }
                    setSelectedIndices(allIndices);
                    setFocusedIndex(0);
                }
                return;
            }

            // Ctrl+C: Copy
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
                if (selectedFiles.length > 0) {
                    event.preventDefault();
                    setClipboardState({ files: [...selectedFiles], operation: 'copy' });
                    showNotification?.(`已复制 ${selectedFiles.length} 个文件`, 'info');
                }
                return;
            }

            // Ctrl+X: Cut
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') {
                if (selectedFiles.length > 0) {
                    event.preventDefault();
                    setClipboardState({ files: [...selectedFiles], operation: 'cut' });
                    showNotification?.(`已剪切 ${selectedFiles.length} 个文件`, 'info');
                }
                return;
            }

            // Ctrl+V: Paste (works even in empty directories)
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
                if (clipboardState && clipboardState.files.length > 0 && onPaste) {
                    event.preventDefault();
                    onPaste(clipboardState.files, clipboardState.operation);
                    // Clear clipboard after cut operation
                    if (clipboardState.operation === 'cut') {
                        setClipboardState(null);
                    }
                }
                return;
            }

            // Delete: Delete selected files
            if (event.key === 'Delete') {
                if (selectedFiles.length > 0 && onDelete) {
                    event.preventDefault();
                    onDelete(selectedFiles);
                }
                return;
            }

            // The following operations require files to be present
            if (files.length === 0) return;

            switch (event.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight': {
                    event.preventDefault();
                    const columnsCount = getColumnsCount();

                    let newIndex = focusedIndex ?? 0;
                    if (focusedIndex === null) {
                        // If no focus, start at 0
                        newIndex = 0;
                    } else {
                        switch (event.key) {
                            case 'ArrowUp':
                                newIndex = focusedIndex - columnsCount;
                                break;
                            case 'ArrowDown':
                                newIndex = focusedIndex + columnsCount;
                                break;
                            case 'ArrowLeft':
                                newIndex = focusedIndex - 1;
                                break;
                            case 'ArrowRight':
                                newIndex = focusedIndex + 1;
                                break;
                        }
                    }

                    // Clamp to valid range
                    if (newIndex < 0) newIndex = focusedIndex ?? 0;
                    if (newIndex >= files.length) newIndex = focusedIndex ?? 0;

                    // Update focus and single selection (mimic standard navigation without Shift)
                    setFocusedIndex(newIndex);
                    setSelectedIndices(new Set([newIndex]));
                    break;
                }

                case 'Escape':
                    event.preventDefault();
                    clearSelection();
                    break;

                case 'Backspace':
                    event.preventDefault();
                    goBack();
                    break;

                case 'F5':
                    event.preventDefault();
                    handleRefresh();
                    break;

                case 'Enter':
                    if (selectedFiles.length > 0) {
                        event.preventDefault();
                        const primaryFile = selectedFiles[0];
                        if (primaryFile.isDirectory) {
                            handleNavigate(primaryFile.path);
                        } else {
                            // If multiple files selected, maybe open all? For now, open first.
                            handleFileOpen(primaryFile);
                        }
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        enabled,
        files,
        focusedIndex,
        selectedFiles,
        getColumnsCount,
        clearSelection,
        goBack,
        handleRefresh,
        handleNavigate,
        handleFileOpen,
        clipboardState,
        onPaste,
        onDelete,
        showNotification,
    ]);

    return {
        selectedIndices,
        selectedFiles,
        setSelectedIndices: (indices) => {
            setSelectedIndices(indices);
            // If explicit selection set, move focus to the first item (arbitrary choice)
            if (indices.size > 0) {
                // Try to keep focus if it's in the set, otherwise move to first of set
                if (focusedIndex === null || !indices.has(focusedIndex)) {
                    const nextVal = indices.values().next().value;
                    setFocusedIndex(nextVal !== undefined ? nextVal : null);
                }
            } else {
                setFocusedIndex(null);
            }
        },
        clearSelection,
        clipboardState,
        hasClipboard: clipboardState !== null && clipboardState.files.length > 0,
    };
};
