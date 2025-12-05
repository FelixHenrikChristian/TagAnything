import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileItem } from '../../types';

interface UseKeyboardNavigationOptions {
    files: FileItem[];
    gridContainerRef: React.RefObject<HTMLElement>;
    goBack: () => void;
    handleRefresh: () => Promise<void>;
    handleNavigate: (path: string) => void;
    handleFileOpen: (file: FileItem) => void;
    enabled?: boolean;
}

interface UseKeyboardNavigationResult {
    selectedIndex: number | null;
    selectedFile: FileItem | null;
    setSelectedIndex: (index: number | null) => void;
    clearSelection: () => void;
}

/**
 * Custom hook for keyboard navigation in file explorer.
 * Supports Windows 11-style navigation:
 * - Arrow keys: Navigate between files in grid
 * - ESC: Clear selection
 * - Backspace: Go back to parent folder
 * - F5: Refresh current folder
 * - Enter: Open selected file/folder
 */
export const useKeyboardNavigation = ({
    files,
    gridContainerRef,
    goBack,
    handleRefresh,
    handleNavigate,
    handleFileOpen,
    enabled = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationResult => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Calculate the selected file based on index
    const selectedFile = useMemo(() => {
        if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= files.length) {
            return null;
        }
        return files[selectedIndex];
    }, [selectedIndex, files]);

    // Clear selection when files change (e.g., navigating to new folder)
    useEffect(() => {
        setSelectedIndex(null);
    }, [files]);

    const clearSelection = useCallback(() => {
        setSelectedIndex(null);
    }, []);

    // Auto-scroll to keep selected item visible
    useEffect(() => {
        if (selectedFile === null || !gridContainerRef.current) return;

        // Find the selected card element by file path
        const container = gridContainerRef.current;
        const cards = container.querySelectorAll('[data-file-path]');

        for (const card of cards) {
            if (card.getAttribute('data-file-path') === selectedFile.path) {
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
    }, [selectedFile, gridContainerRef]);

    // Calculate number of columns in the grid
    const getColumnsCount = useCallback((): number => {
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
    }, [gridContainerRef]);

    // Handle keyboard events
    useEffect(() => {
        if (!enabled || files.length === 0) return;

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

            switch (event.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight': {
                    event.preventDefault();
                    const columnsCount = getColumnsCount();

                    setSelectedIndex(prevIndex => {
                        // Default to first item if nothing selected
                        if (prevIndex === null) {
                            return 0;
                        }

                        let newIndex = prevIndex;

                        switch (event.key) {
                            case 'ArrowUp':
                                newIndex = prevIndex - columnsCount;
                                break;
                            case 'ArrowDown':
                                newIndex = prevIndex + columnsCount;
                                break;
                            case 'ArrowLeft':
                                newIndex = prevIndex - 1;
                                break;
                            case 'ArrowRight':
                                newIndex = prevIndex + 1;
                                break;
                        }

                        // Clamp to valid range
                        if (newIndex < 0) {
                            return prevIndex; // Stay at current position
                        }
                        if (newIndex >= files.length) {
                            return prevIndex; // Stay at current position
                        }

                        return newIndex;
                    });
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
                    if (selectedFile) {
                        event.preventDefault();
                        if (selectedFile.isDirectory) {
                            handleNavigate(selectedFile.path);
                        } else {
                            handleFileOpen(selectedFile);
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
        selectedFile,
        getColumnsCount,
        clearSelection,
        goBack,
        handleRefresh,
        handleNavigate,
        handleFileOpen,
    ]);

    return {
        selectedIndex,
        selectedFile,
        setSelectedIndex,
        clearSelection,
    };
};
