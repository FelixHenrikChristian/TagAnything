import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Location, FileItem, Tag, TagGroup } from '../../types';
import {
    parseTagsFromFilename,
    createTagsFromNames,
    createTemporaryTags,
} from '../../utils/fileTagParser';
import { HistoryEntry, FilterState } from '../../components/FileExplorer/types';

// 历史记录最大条目数
const MAX_HISTORY_SIZE = 50;

export const useFileExplorerState = (tagDisplayStyle: 'original' | 'library' = 'original') => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [gridSize, setGridSize] = useState<number>(6);
    const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
    const [fileTags, setFileTags] = useState<Map<string, Tag[]>>(new Map());
    const [videoThumbnails, setVideoThumbnails] = useState<Map<string, string>>(new Map());

    // History State - now stores full HistoryEntry with filter state
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    // Flag to prevent creating history entry during history navigation
    const isNavigatingHistory = useRef<boolean>(false);

    // Load/Save Grid Size
    useEffect(() => {
        const savedGridSize = localStorage.getItem('tagAnything_gridSize');
        if (savedGridSize) {
            const parsed = parseFloat(savedGridSize);
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

    // 统一的缩略图生成函数，同时处理视频和图像文件
    const generateThumbnailsImpl = useCallback(async (fileList: FileItem[]) => {
        const mediaFiles = fileList.filter(file => !file.isDirectory);

        for (const file of mediaFiles) {
            // 使用 ref 获取最新的 thumbnails 状态，避免闭包陷阱
            if (videoThumbnailsRef.current.has(file.path)) continue;

            try {
                // 检查是否为视频文件
                const isVideo = await window.electron.isVideoFile(file.path);
                if (isVideo) {
                    const thumbnailPath = await window.electron.generateVideoThumbnail(file.path);
                    if (thumbnailPath) {
                        // 每生成一张缩略图就立即更新状态，实现渐进式加载
                        setVideoThumbnails(prev => {
                            const updated = new Map(prev);
                            updated.set(file.path, thumbnailPath);
                            saveThumbnailsToCache(updated);
                            return updated;
                        });
                    }
                    continue;
                }

                // 检查是否为图像文件
                const isImage = await window.electron.isImageFile(file.path);
                if (isImage) {
                    const thumbnailPath = await window.electron.generateImageThumbnail(file.path);
                    if (thumbnailPath) {
                        setVideoThumbnails(prev => {
                            const updated = new Map(prev);
                            updated.set(file.path, thumbnailPath);
                            saveThumbnailsToCache(updated);
                            return updated;
                        });
                    }
                }
            } catch (error) {
                console.error(`Error generating thumbnail for ${file.path}:`, error);
            }
        }
    }, [saveThumbnailsToCache]);

    // 保持向后兼容的别名
    const generateVideoThumbnailsImpl = generateThumbnailsImpl;

    const loadFiles = useCallback(async (path: string, groups?: TagGroup[], silent: boolean = false) => {
        try {
            if (!silent) setIsLoading(true);
            const fileList = await window.electron.getFiles(path);
            setFiles(fileList);
            if (!silent) setIsLoading(false);

            // Defer heavy processing to next tick to allow UI to render files first
            setTimeout(() => {
                parseFileTagsAndUpdateSystem(fileList, groups);
                generateVideoThumbnailsImpl(fileList);
            }, 0);
        } catch (error) {
            console.error('Error loading files:', error);
            setFiles([]);
            if (!silent) setIsLoading(false);
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

    const handleLocationSelect = useCallback(async (location: Location | null) => {
        if (!location) {
            // 取消选中，清空状态
            setCurrentLocation(null);
            setCurrentPath('');
            setFiles([]);
            // 重置为默认标签组或保持当前？建议重置为Effective
            const effectiveGroups = getEffectiveTagGroups();
            setTagGroups(effectiveGroups);
            return;
        }

        const effectiveGroups = getEffectiveTagGroups();
        setTagGroups(effectiveGroups);

        setCurrentLocation(location);
        setCurrentPath(location.path);
        // Note: clearFilter is not here, it should be handled by the consumer or another hook
        await loadFiles(location.path, effectiveGroups);
        await scanAllFilesForTags(location.path, effectiveGroups);
    }, [getEffectiveTagGroups, loadFiles, scanAllFilesForTags]);

    const handleHistoryNavigate = useCallback(async (entry: HistoryEntry) => {
        isNavigatingHistory.current = true;
        setCurrentPath(entry.path);
        await loadFiles(entry.path);
        isNavigatingHistory.current = false;
    }, [loadFiles]);

    // Push a new history entry (used when filter state changes)
    const pushHistory = useCallback((path: string, filterState: FilterState) => {
        // Don't push if we're navigating through history
        if (isNavigatingHistory.current) return;

        const entry: HistoryEntry = {
            path,
            filterState,
            timestamp: Date.now(),
        };

        setHistory(prev => {
            // Truncate future entries if we're in the middle of history
            let newHistory = prev.slice(0, historyIndex + 1);

            // Check if this is essentially the same state as current
            const current = newHistory[newHistory.length - 1];
            if (current &&
                current.path === path &&
                JSON.stringify(current.filterState) === JSON.stringify(filterState)) {
                return prev; // No change needed
            }

            newHistory.push(entry);

            // Limit history size
            if (newHistory.length > MAX_HISTORY_SIZE) {
                newHistory = newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
            }
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    }, [historyIndex]);

    const handleNavigate = useCallback(async (path: string, filterState?: FilterState) => {
        // If path is same as current, do nothing
        if (path === currentPath) return;

        const defaultFilterState: FilterState = filterState || {
            tagFilter: null,
            multiTagFilter: null,
            nameFilterQuery: null,
            isGlobalSearch: false,
        };

        const entry: HistoryEntry = {
            path,
            filterState: defaultFilterState,
            timestamp: Date.now(),
        };

        setHistory(prev => {
            let newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(entry);
            if (newHistory.length > MAX_HISTORY_SIZE) {
                newHistory = newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
            }
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));

        setCurrentPath(path);
        await loadFiles(path);
    }, [currentPath, historyIndex, loadFiles]);

    // Returns the entry to navigate to, caller is responsible for restoring filter state
    const goBack = useCallback((): HistoryEntry | null => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const entry = history[newIndex];
            setHistoryIndex(newIndex);
            handleHistoryNavigate(entry);
            return entry;
        }
        return null;
    }, [history, historyIndex, handleHistoryNavigate]);

    // Returns the entry to navigate to, caller is responsible for restoring filter state
    const goForward = useCallback((): HistoryEntry | null => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const entry = history[newIndex];
            setHistoryIndex(newIndex);
            handleHistoryNavigate(entry);
            return entry;
        }
        return null;
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

    const handleRefresh = useCallback(async (isFiltering: boolean, filteredFiles: FileItem[], silent: boolean = false) => {
        if (currentLocation) {
            const effectiveGroups = getEffectiveTagGroups();
            setTagGroups(effectiveGroups);

            await loadFiles(currentPath, effectiveGroups, silent);
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

        // Listen for locations updated event
        const handleLocationsUpdated = () => {
            const savedLocations = localStorage.getItem('tagAnything_locations');
            if (savedLocations) {
                setLocations(JSON.parse(savedLocations));
            }
        };

        // Listen for tags updated event (from TagManager)
        const handleTagsUpdated = () => {
            const savedTagGroups = localStorage.getItem('tagAnything_tagGroups');
            if (savedTagGroups) {
                setTagGroups(JSON.parse(savedTagGroups));
            }
        };

        window.addEventListener('locationSelected', handleLocationSelectedEvent as EventListener);
        window.addEventListener('ta:locations-updated', handleLocationsUpdated);
        window.addEventListener('ta:tags-updated', handleTagsUpdated);
        return () => {
            window.removeEventListener('locationSelected', handleLocationSelectedEvent as EventListener);
            window.removeEventListener('ta:locations-updated', handleLocationsUpdated);
            window.removeEventListener('ta:tags-updated', handleTagsUpdated);
        };
    }, []);

    // Initialize history with first path
    useEffect(() => {
        if (currentPath && history.length === 0) {
            const initialEntry: HistoryEntry = {
                path: currentPath,
                filterState: {
                    tagFilter: null,
                    multiTagFilter: null,
                    nameFilterQuery: null,
                    isGlobalSearch: false,
                },
                timestamp: Date.now(),
            };
            setHistory([initialEntry]);
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
        isLoading,
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
        pushHistory,
        goBack,
        goForward,
        goUp,
        canGoBack: historyIndex > 0,
        canGoForward: historyIndex < history.length - 1,
        canGoUp,
        isNavigatingHistory,
    };
};
