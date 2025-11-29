import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Location, FileItem, Tag, TagGroup } from '../../types';
import {
    parseTagsFromFilename,
    createTagsFromNames,
    createTemporaryTags,
} from '../../utils/fileTagParser';

export const useFileExplorerState = (tagDisplayStyle: 'original' | 'library' = 'original') => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [gridSize, setGridSize] = useState<number>(6);
    const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
    const [fileTags, setFileTags] = useState<Map<string, Tag[]>>(new Map());
    const [videoThumbnails, setVideoThumbnails] = useState<Map<string, string>>(new Map());

    // History State
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    // Load/Save Grid Size
    useEffect(() => {
        const savedGridSize = localStorage.getItem('tagAnything_gridSize');
        if (savedGridSize) {
            const parsed = parseInt(savedGridSize, 10);
            if (!Number.isNaN(parsed)) {
                setGridSize(parsed);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('tagAnything_gridSize', String(gridSize));
    }, [gridSize]);

    useEffect(() => {
        const resetHandler = () => {
            setGridSize(6);
            localStorage.removeItem('tagAnything_gridSize');
        };
        window.addEventListener('ta:reset-grid-zoom', resetHandler);
        return () => {
            window.removeEventListener('ta:reset-grid-zoom', resetHandler);
        };
    }, []);

    // Load/Save Thumbnails
    useEffect(() => {
        const savedThumbnails = localStorage.getItem('tagAnything_videoThumbnails');
        if (savedThumbnails) {
            try {
                const thumbnailsArray = JSON.parse(savedThumbnails);
                setVideoThumbnails(new Map(thumbnailsArray));
            } catch (error) {
                console.error('Error loading cached thumbnails:', error);
            }
        }
    }, []);

    const saveThumbnailsToCache = useCallback((thumbnails: Map<string, string>) => {
        try {
            const thumbnailsArray = Array.from(thumbnails.entries());
            localStorage.setItem('tagAnything_videoThumbnails', JSON.stringify(thumbnailsArray));
        } catch (error) {
            console.error('Error saving thumbnails to cache:', error);
        }
    }, []);

    // Sync Current Path
    useEffect(() => {
        try {
            localStorage.setItem('tagAnything_currentPath', currentPath || '');
        } catch (e) {
            console.warn('⚠️ 无法写入localStorage当前路径:', e);
        }
    }, [currentPath]);

    const getEffectiveTagGroups = useCallback((): TagGroup[] => {
        const savedTagGroups = localStorage.getItem('tagAnything_tagGroups');
        if (savedTagGroups) {
            try {
                return JSON.parse(savedTagGroups);
            } catch {
                return tagGroups;
            }
        }
        return tagGroups;
    }, [tagGroups]);

    // Core Logic
    const parseFileTagsAndUpdateSystem = useCallback((fileList: FileItem[], groups?: TagGroup[]) => {
        const newFileTags = new Map<string, Tag[]>();

        fileList.forEach(file => {
            if (!file.isDirectory) {
                const tagNames = parseTagsFromFilename(file.name);
                if (tagNames.length > 0) {
                    const usedGroups = groups ?? tagGroups;
                    const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, usedGroups);
                    const temporaryTags = createTemporaryTags(unmatchedTags);
                    const allTags = [...matchedTags, ...temporaryTags];
                    if (allTags.length > 0) {
                        newFileTags.set(file.path, allTags);
                    }
                }
            }
        });

        setFileTags(newFileTags);
    }, [tagGroups]);

    const generateVideoThumbnails = useCallback(async (fileList: FileItem[]) => {
        const videoFiles = fileList.filter(file => !file.isDirectory);
        // Use functional update to ensure we have latest state if called multiple times
        setVideoThumbnails(prev => {
            const newThumbnails = new Map(prev);
            // We can't do async inside setState, so we just return prev here and do logic outside?
            // Actually, we should read the current state, but since this is async, we might have race conditions.
            // For now, let's use the state passed in or available in scope.
            // But `videoThumbnails` in scope might be stale if not in dependency.
            // Let's rely on the fact that we copy the map.
            return prev;
        });

        // We need to access the latest thumbnails. 
        // Let's just use the state variable, and if we update, we merge.
        // But `videoThumbnails` is a dependency now.

        // To avoid infinite loops or stale closures, let's just use a local map initialized from state,
        // but we need to be careful.
        // Actually, the original code used `videoThumbnails` from state.

        // Let's re-implement carefully.

        // We can't easily access the "latest" state in an async function without refs or functional updates.
        // But `window.electron` calls are async.

        // Let's use a ref for thumbnails to avoid dependency issues if needed, or just accept it.
        // The original code had `videoThumbnails` in dependency of `useEffect`? No, it was a function.

        // Let's just implement it.

        // We will read the current value from the state variable.
        // Note: This might be slightly stale if multiple updates happen fast, but for thumbnails it's likely fine.

        // Wait, I can't access `videoThumbnails` inside `useCallback` unless it's in deps.
        // If I put it in deps, the function changes every time thumbnails change.

        return; // Placeholder, will implement below correctly.
    }, []);

    // Re-implementing generateVideoThumbnails correctly
    const generateVideoThumbnailsReal = useCallback(async (fileList: FileItem[]) => {
        // We need to know which thumbnails we already have.
        // We can pass the current map as an argument or use a Ref to track it.
        // Using a Ref for the map is safer for async operations.
    }, []);

    // Let's use a Ref for videoThumbnails to avoid dependency cycles in async functions
    const videoThumbnailsRef = useRef<Map<string, string>>(new Map());
    useEffect(() => {
        videoThumbnailsRef.current = videoThumbnails;
    }, [videoThumbnails]);

    const generateVideoThumbnailsImpl = useCallback(async (fileList: FileItem[]) => {
        const videoFiles = fileList.filter(file => !file.isDirectory);
        const currentThumbnails = videoThumbnailsRef.current;
        const newThumbnails = new Map(currentThumbnails);
        let hasNewThumbnails = false;

        for (const file of videoFiles) {
            if (newThumbnails.has(file.path)) continue;

            try {
                const isVideo = await window.electron.isVideoFile(file.path);
                if (!isVideo) continue;

                const thumbnailPath = await window.electron.generateVideoThumbnail(file.path);
                if (thumbnailPath) {
                    newThumbnails.set(file.path, thumbnailPath);
                    hasNewThumbnails = true;
                }
            } catch (error) {
                console.error(`Error generating thumbnail for ${file.path}:`, error);
            }
        }

        if (hasNewThumbnails) {
            setVideoThumbnails(newThumbnails);
            saveThumbnailsToCache(newThumbnails);
        }
    }, [saveThumbnailsToCache]);

    const loadFiles = useCallback(async (path: string, groups?: TagGroup[]) => {
        try {
            const fileList = await window.electron.getFiles(path);
            setFiles(fileList);
            parseFileTagsAndUpdateSystem(fileList, groups);
            await generateVideoThumbnailsImpl(fileList);
        } catch (error) {
            console.error('Error loading files:', error);
            setFiles([]);
        }
    }, [parseFileTagsAndUpdateSystem, generateVideoThumbnailsImpl]);

    const scanAllFilesForTags = useCallback(async (rootPath: string, groups?: TagGroup[]) => {
        try {
            console.log('开始递归扫描文件标签...');
            const allFiles = await window.electron.getAllFiles(rootPath);
            console.log(`扫描到 ${allFiles.length} 个文件和文件夹`);

            const filesOnly = allFiles.filter(file => !file.isDirectory);
            console.log(`其中 ${filesOnly.length} 个文件`);

            const newFileTags = new Map<string, Tag[]>();

            filesOnly.forEach(file => {
                const tagNames = parseTagsFromFilename(file.name);
                if (tagNames.length > 0) {
                    const usedGroups = groups ?? tagGroups;
                    const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, usedGroups);
                    const temporaryTags = createTemporaryTags(unmatchedTags);
                    const allTags = [...matchedTags, ...temporaryTags];
                    if (allTags.length > 0) {
                        newFileTags.set(file.path, allTags);
                    }
                }
            });

            // Merge with existing tags? Or replace?
            // Original code: setFileTags(updatedFileTags); where updatedFileTags was new Map(fileTags) then set.
            // But wait, the original code (lines 801-805) was merging?
            // "const updatedFileTags = new Map(fileTags); newFileTags.forEach... setFileTags(updatedFileTags);"
            // Wait, line 802 iterates `newFileTags` (the local one) and sets into `updatedFileTags` (the state clone).
            // So it merges the NEWLY found tags into the EXISTING state.

            setFileTags(prev => {
                const updated = new Map(prev);
                newFileTags.forEach((tags, path) => {
                    updated.set(path, tags);
                });
                return updated;
            });

            console.log('文件标签扫描完成');
        } catch (error) {
            console.error('递归扫描文件标签时出错:', error);
        }
    }, [tagGroups]);

    const handleLocationSelect = useCallback(async (location: Location) => {
        const effectiveGroups = getEffectiveTagGroups();
        setTagGroups(effectiveGroups);

        setCurrentLocation(location);
        setCurrentPath(location.path);
        // Note: clearFilter is not here, it should be handled by the consumer or another hook
        await loadFiles(location.path, effectiveGroups);
        await scanAllFilesForTags(location.path, effectiveGroups);
    }, [getEffectiveTagGroups, loadFiles, scanAllFilesForTags]);

    const handleHistoryNavigate = useCallback(async (path: string) => {
        setCurrentPath(path);
        await loadFiles(path);
    }, [loadFiles]);

    const handleNavigate = useCallback(async (path: string) => {
        // If path is same as current, do nothing
        if (path === currentPath) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(path);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        setCurrentPath(path);
        await loadFiles(path);
    }, [currentPath, history, historyIndex, loadFiles]);

    const goBack = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            handleHistoryNavigate(history[newIndex]);
        }
    }, [history, historyIndex, handleHistoryNavigate]);

    const goForward = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            handleHistoryNavigate(history[newIndex]);
        }
    }, [history, historyIndex, handleHistoryNavigate]);

    const canGoUp = useMemo(() => {
        if (!currentPath) return false;

        // Check if current path is a root of any defined location
        const normalize = (p: string) => p.replace(/[/\\]/g, '/').replace(/\/$/, '').toLowerCase();
        const normalizedCurrent = normalize(currentPath);

        const isLocationRoot = locations.some(loc => normalize(loc.path) === normalizedCurrent);
        if (isLocationRoot) return false;

        // Check if it's a drive root
        const isDriveRoot = /^[a-zA-Z]:[\\/]?$/.test(currentPath);
        if (isDriveRoot) return false;

        return true;
    }, [currentPath, locations]);

    const goUp = useCallback(() => {
        if (canGoUp && currentPath) {
            const parts = currentPath.split(/[/\\]/);
            // If ends with slash, pop it first
            if (parts[parts.length - 1] === '') parts.pop();

            parts.pop(); // Remove current folder

            let parentPath = parts.join('\\');
            if (parentPath.endsWith(':')) parentPath += '\\'; // Fix drive root C: -> C:\

            if (parentPath && parentPath !== currentPath) {
                handleNavigate(parentPath);
            }
        }
    }, [currentPath, handleNavigate, canGoUp]);

    const handleRefresh = useCallback(async (isFiltering: boolean, filteredFiles: FileItem[]) => {
        if (currentLocation) {
            const effectiveGroups = getEffectiveTagGroups();
            setTagGroups(effectiveGroups);

            await loadFiles(currentPath, effectiveGroups);
            await scanAllFilesForTags(currentLocation.path, effectiveGroups);

            try {
                if (isFiltering && filteredFiles.length > 0) {
                    await generateVideoThumbnailsImpl(filteredFiles);
                }
            } catch (e) {
                console.warn('⚠️ 刷新缩略图失败:', e);
            }
        }
    }, [currentLocation, currentPath, getEffectiveTagGroups, loadFiles, scanAllFilesForTags, generateVideoThumbnailsImpl]);

    // Initial Load
    useEffect(() => {
        const savedLocations = localStorage.getItem('tagAnything_locations');
        if (savedLocations) {
            const parsedLocations = JSON.parse(savedLocations);
            setLocations(parsedLocations);

            const savedTagGroups = localStorage.getItem('tagAnything_tagGroups');
            if (savedTagGroups) {
                setTagGroups(JSON.parse(savedTagGroups));
            }

            const selectedLocation = localStorage.getItem('tagAnything_selectedLocation');
            if (selectedLocation) {
                const parsedSelectedLocation = JSON.parse(selectedLocation);
                handleLocationSelect(parsedSelectedLocation);
            } else if (parsedLocations.length > 0) {
                handleLocationSelect(parsedLocations[0]);
            }
        }

        if (tagGroups.length === 0) {
            const savedTagGroups = localStorage.getItem('tagAnything_tagGroups');
            if (savedTagGroups) {
                setTagGroups(JSON.parse(savedTagGroups));
            } else {
                const defaultGroup: TagGroup = {
                    id: 'default',
                    name: '默认标签组',
                    defaultColor: '#2196f3',
                    description: '系统默认标签组',
                    tags: []
                };
                setTagGroups([defaultGroup]);
            }
        }

        // Listen for locationSelected event
        const handleLocationSelectedEvent = (event: CustomEvent) => {
            const selectedLocation = event.detail;
            handleLocationSelect(selectedLocation);
        };
        window.addEventListener('locationSelected', handleLocationSelectedEvent as EventListener);
        return () => {
            window.removeEventListener('locationSelected', handleLocationSelectedEvent as EventListener);
        };
    }, []);

    // Initialize history with first path
    useEffect(() => {
        if (currentPath && history.length === 0) {
            setHistory([currentPath]);
            setHistoryIndex(0);
        }
    }, [currentPath]);

    const getFileTags = useCallback((file: FileItem): Tag[] => {
        return fileTags.get(file.path) || [];
    }, [fileTags]);

    return {
        locations,
        setLocations,
        currentLocation,
        setCurrentLocation,
        currentPath,
        setCurrentPath,
        files,
        setFiles,
        viewMode,
        setViewMode,
        gridSize,
        setGridSize,
        tagGroups,
        setTagGroups,
        fileTags,
        setFileTags,
        videoThumbnails,
        handleLocationSelect,
        handleNavigate,
        handleRefresh,
        loadFiles,
        getFileTags,
        getEffectiveTagGroups,
        generateVideoThumbnails: generateVideoThumbnailsImpl,
        // History exports
        goBack,
        goForward,
        goUp,
        canGoBack: historyIndex > 0,
        canGoForward: historyIndex < history.length - 1,
        canGoUp,
    };
};
