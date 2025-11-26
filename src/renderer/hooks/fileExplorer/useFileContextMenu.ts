import { useState, useCallback } from 'react';
import { FileItem, Tag } from '../../types';

export interface FileContextMenuState {
    mouseX: number;
    mouseY: number;
    file: FileItem;
}

export interface FolderContextMenuState {
    mouseX: number;
    mouseY: number;
    file: FileItem;
}

export interface BlankContextMenuState {
    mouseX: number;
    mouseY: number;
}

export interface TagContextMenuState {
    mouseX: number;
    mouseY: number;
    tag: Tag | null;
    file: FileItem | null;
}

export const useFileContextMenu = () => {
    const [fileContextMenu, setFileContextMenu] = useState<FileContextMenuState | null>(null);

    const [folderContextMenu, setFolderContextMenu] = useState<FolderContextMenuState | null>(null);

    const [blankContextMenu, setBlankContextMenu] = useState<BlankContextMenuState | null>(null);

    const [tagContextMenu, setTagContextMenu] = useState<TagContextMenuState | null>(null);

    const [ignoreContextMenuUntil, setIgnoreContextMenuUntil] = useState<number>(0);

    const handleCloseContextMenu = useCallback(() => {
        setFileContextMenu(null);
        setFolderContextMenu(null);
        setBlankContextMenu(null);
        setTagContextMenu(null);
        setIgnoreContextMenuUntil(Date.now() + 100);
    }, []);

    const handleFileContextMenu = useCallback((event: React.MouseEvent, file: FileItem) => {
        event.preventDefault();
        event.stopPropagation();
        if (Date.now() < ignoreContextMenuUntil) return;

        handleCloseContextMenu(); // Close others first

        if (file.isDirectory) {
            setFolderContextMenu({
                mouseX: event.clientX - 2,
                mouseY: event.clientY - 4,
                file,
            });
        } else {
            setFileContextMenu({
                mouseX: event.clientX - 2,
                mouseY: event.clientY - 4,
                file,
            });
        }
    }, [ignoreContextMenuUntil, handleCloseContextMenu]);

    const handleBlankContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        if (Date.now() < ignoreContextMenuUntil) return;

        handleCloseContextMenu();

        setBlankContextMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
        });
    }, [ignoreContextMenuUntil, handleCloseContextMenu]);

    const handleTagContextMenu = useCallback((event: React.MouseEvent, tag: Tag, file: FileItem) => {
        event.preventDefault();
        event.stopPropagation();
        if (Date.now() < ignoreContextMenuUntil) return;

        handleCloseContextMenu();

        setTagContextMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            tag,
            file,
        });
    }, [ignoreContextMenuUntil, handleCloseContextMenu]);

    return {
        fileContextMenu,
        setFileContextMenu,
        folderContextMenu,
        setFolderContextMenu,
        blankContextMenu,
        setBlankContextMenu,
        tagContextMenu,
        setTagContextMenu,
        handleCloseContextMenu,
        handleFileContextMenu,
        handleBlankContextMenu,
        handleTagContextMenu,
    };
};
