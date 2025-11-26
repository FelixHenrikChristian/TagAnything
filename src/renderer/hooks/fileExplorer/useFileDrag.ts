import { useState, useEffect } from 'react';
import { Tag, FileItem } from '../../types';
import { DragState } from '../../components/FileExplorer/types';

export const useFileDrag = () => {
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        draggedTag: null,
        sourceFilePath: null,
        sourceIndex: null,
        targetFile: null,
        insertPosition: -1,
        previewPosition: null
    });

    useEffect(() => {
        const handleTagDragStart = (e: CustomEvent) => {
            setDragState(prev => ({
                ...prev,
                isDragging: true,
                draggedTag: e.detail.tag,
                sourceFilePath: e.detail.sourceFilePath,
                sourceIndex: e.detail.sourceIndex,
            }));
        };

        const handleTagDragEnd = () => {
            setDragState(prev => ({
                ...prev,
                isDragging: false,
                draggedTag: null,
                sourceFilePath: null,
                sourceIndex: null,
                targetFile: null,
                insertPosition: -1,
                previewPosition: null,
            }));
        };

        window.addEventListener('tagDragStart', handleTagDragStart as EventListener);
        window.addEventListener('tagDragEnd', handleTagDragEnd as EventListener);
        return () => {
            window.removeEventListener('tagDragStart', handleTagDragStart as EventListener);
            window.removeEventListener('tagDragEnd', handleTagDragEnd as EventListener);
        };
    }, []);

    return {
        dragState,
        setDragState
    };
};
