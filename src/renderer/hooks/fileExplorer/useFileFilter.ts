import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FileItem, Tag, TagGroup, DisplaySettings } from '../../types';
import {
    parseTagsFromFilename,
    createTagsFromNames,
    createTemporaryTags,
} from '../../utils/fileTagParser';
import { matchWithChineseVariants } from '../../utils/chineseConverter';
import {
    SortType,
    SortDirection,
    FilterState,
    TagFilter,
    FilenameSearchFilter,
    SearchScope,
} from '../../components/FileExplorer/types';

/**
 * useFileFilter Hook
 * 
 * Manages all file filtering, searching, and sorting logic for the file explorer.
 * 
 * Features:
 * - Real-time filename search with debouncing (300ms)
 * - Tag filtering (single or multiple tags)
 * - Recursive search for tag library filters
 * - Current directory only search for file card tag filters
 * - File sorting by name, date, size, type
 * - Filter state management
 */
export const useFileFilter = (
    files: FileItem[],
    currentPath: string,
    getEffectiveTagGroups: () => TagGroup[],
    setFileTags: React.Dispatch<React.SetStateAction<Map<string, Tag[]>>>,
    generateVideoThumbnails: (files: FileItem[]) => Promise<void>,
    fileTags: Map<string, Tag[]>,
    displaySettings: DisplaySettings
) => {
    // filterResultFiles stores the result when a filter is actively being applied
    const [filterResultFiles, setFilterResultFiles] = useState<FileItem[]>([]);
    const [isFiltering, setIsFiltering] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [filterState, setFilterState] = useState<FilterState>({
        tagFilter: null,
        nameFilterQuery: null,
        isRecursive: false,
    });

    // Sorting state
    const [sortType, setSortType] = useState<SortType>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Debounce timer ref
    const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Ref to track the latest filter request ID to prevent race conditions
    const filterRequestRef = useRef<number>(0);

    // Ref to track if we're currently processing
    const isProcessing = useRef(false);

    /**
     * Extract filename without tags for sorting
     * Example: "[A B] name.png" -> "name.png"
     */
    const getNameWithoutTags = useCallback((filename: string): string => {
        // Match pattern: [tags] filename or filename
        const match = filename.match(/^(?:\[.*?\]\s*)*(.+)$/);
        return match ? match[1] : filename;
    }, []);

    /**
     * Sort files based on current sort type and direction
     */
    const sortFiles = useCallback((filesToSort: FileItem[]): FileItem[] => {
        const sorted = [...filesToSort];

        sorted.sort((a, b) => {
            // Always put directories first
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }

            let comparison = 0;

            switch (sortType) {
                case 'name':
                    // Sort by filename without tags
                    const nameA = getNameWithoutTags(a.name);
                    const nameB = getNameWithoutTags(b.name);
                    comparison = nameA.localeCompare(nameB, 'zh-CN');
                    break;
                case 'modified':
                    const aTime = a.modified ? new Date(a.modified).getTime() : 0;
                    const bTime = b.modified ? new Date(b.modified).getTime() : 0;
                    comparison = aTime - bTime;
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'type':
                    const extA = a.name.split('.').pop() || '';
                    const extB = b.name.split('.').pop() || '';
                    comparison = extA.localeCompare(extB);
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [sortType, sortDirection, getNameWithoutTags]);

    /**
     * Filter files by filename search query
     */
    const filterByFilename = useCallback((filesToFilter: FileItem[], query: string): FileItem[] => {
        if (!query || query.trim() === '') {
            return filesToFilter;
        }

        return filesToFilter.filter(file =>
            matchWithChineseVariants(
                file.name,
                query,
                displaySettings.enableSimplifiedTraditionalSearch
            )
        );
    }, [displaySettings.enableSimplifiedTraditionalSearch]);

    /**
     * Filter files by tag(s)
     * Supports both single tag and multiple tags filtering
     */
    const filterByTags = useCallback((filesToFilter: FileItem[], tagIds: string[], matchAll: boolean = true): FileItem[] => {
        if (tagIds.length === 0) {
            return filesToFilter;
        }

        return filesToFilter.filter(file => {
            if (file.isDirectory) return false;

            const tags = fileTags.get(file.path);
            if (!tags || tags.length === 0) return false;

            const fileTagIds = tags.map(t => t.id);

            if (matchAll) {
                // AND logic: file must have ALL specified tags
                return tagIds.every(tagId => fileTagIds.includes(tagId));
            } else {
                // OR logic: file must have AT LEAST ONE of the specified tags
                return tagIds.some(tagId => fileTagIds.includes(tagId));
            }
        });
    }, [fileTags]);

    /**
     * Perform recursive file search with tag filtering
     */
    const performRecursiveSearch = useCallback(async (tagIds: string[], rootPath: string, requestId: number) => {
        try {
            if (requestId !== filterRequestRef.current) {
                console.log('🚫 忽略过期的搜索请求:', requestId);
                return;
            }

            isProcessing.current = true;
            setIsFiltering(true);
            setIsSearching(true);

            console.log('🔍 开始递归搜索 (IPC):', { tagIds, rootPath, requestId });

            // Call Main Process to search
            // Pass current name filter query to optimize search
            const { files: resultFiles, fileTags: resultTags } = await window.electron.searchFiles({
                rootPath,
                tagGroups: getEffectiveTagGroups(),
                tagIds,
                query: filterState.nameFilterQuery || undefined,
                matchAllTags: true,
                enableSimplifiedTraditionalSearch: displaySettings.enableSimplifiedTraditionalSearch
            });

            // Check again after await
            if (requestId !== filterRequestRef.current) {
                console.log('🚫 忽略过期的搜索请求 (await后):', requestId);
                return;
            }

            console.log(`✅ IPC搜索完成, 找到 ${resultFiles.length} 个文件`);

            // Update file tags map from results
            if (resultTags) {
                setFileTags((prevTags: Map<string, Tag[]>) => {
                    const updated = new Map(prevTags);
                    Object.entries(resultTags).forEach(([path, tags]) => {
                        updated.set(path, tags as Tag[]);
                    });
                    return updated;
                });
            }

            // Wait a bit just to be safe with state updates if needed (optional)
            // await new Promise(resolve => setTimeout(resolve, 50)); 

            // resultFiles is already filtered by tag AND filename (if passed)
            // But we should double check if we need client side sorting.
            // Main process does NOT sort. 

            const sorted = sortFiles(resultFiles);
            setFilterResultFiles(sorted);

            // Generate thumbnails for video files
            // Optimized: only generate for visible ones? existing logic does all.
            // Leaving as is.
            generateVideoThumbnails(sorted);

        } catch (error) {
            if (requestId === filterRequestRef.current) {
                console.error('❌ 递归搜索失败:', error);
                setFilterResultFiles([]);
            }
        } finally {
            if (requestId === filterRequestRef.current) {
                isProcessing.current = false;
                setIsSearching(false);
            }
        }
    }, [filterState.nameFilterQuery, getEffectiveTagGroups, setFileTags, sortFiles, generateVideoThumbnails]);

    /**
     * Perform current directory only search
     */
    const performCurrentDirectorySearch = useCallback((tagIds: string[], requestId: number) => {
        try {
            if (requestId !== filterRequestRef.current) return;

            isProcessing.current = true;
            setIsFiltering(true);

            console.log('🔍 当前目录搜索:', { tagIds, fileCount: files.length });

            // Filter files in current directory only
            let result = filterByTags(files, tagIds, true);

            // Apply filename filter if exists
            if (filterState.nameFilterQuery) {
                result = filterByFilename(result, filterState.nameFilterQuery);
            }

            // Sort and update
            const sorted = sortFiles(result);
            setFilterResultFiles(sorted);

            console.log(`✅ 当前目录筛选出 ${sorted.length} 个文件`);

        } catch (error) {
            console.error('❌ 当前目录搜索失败:', error);
            setFilterResultFiles([]);
        } finally {
            isProcessing.current = false;
        }
    }, [files, filterState.nameFilterQuery, filterByTags, filterByFilename, sortFiles]);

    /**
     * Perform global filename search (recursive)
     */
    const performGlobalFilenameSearch = useCallback(async (query: string, requestId: number) => {
        try {
            if (requestId !== filterRequestRef.current) return;
            if (!query || query.trim() === '') {
                setIsFiltering(false);
                setFilterResultFiles([]);
                return;
            }

            isProcessing.current = true;
            setIsFiltering(true);
            setIsSearching(true);

            console.log('🌐 开始全局文件名搜索 (IPC):', { query, requestId });

            // Get search root from current location
            const savedLocation = localStorage.getItem('tagAnything_selectedLocation');
            let searchRoot = currentPath;
            if (savedLocation) {
                try {
                    const location = JSON.parse(savedLocation);
                    searchRoot = location.path;
                } catch (e) {
                    console.warn('Failed to parse location:', e);
                }
            }

            // Perform IPC search
            const { files: resultFiles, fileTags: resultTags } = await window.electron.searchFiles({
                rootPath: searchRoot,
                tagGroups: getEffectiveTagGroups(),
                query: query,
                enableSimplifiedTraditionalSearch: displaySettings.enableSimplifiedTraditionalSearch
                // No tagIds -> matches folders and files just by name
            });

            // Check again after await
            if (requestId !== filterRequestRef.current) {
                console.log('🚫 忽略过期的全局搜索请求:', requestId);
                return;
            }

            console.log(`✅ IPC全局搜索匹配到 ${resultFiles.length} 个文件/文件夹`);

            // Update file tags map from results (in case they have tags)
            if (resultTags) {
                setFileTags((prevTags: Map<string, Tag[]>) => {
                    const updated = new Map(prevTags);
                    Object.entries(resultTags).forEach(([path, tags]) => {
                        updated.set(path, tags as Tag[]);
                    });
                    return updated;
                });
            }

            // Sort and update
            const sorted = sortFiles(resultFiles);
            setFilterResultFiles(sorted);

            // Generate thumbnails for video files
            await generateVideoThumbnails(sorted);

        } catch (error) {
            if (requestId === filterRequestRef.current) {
                console.error('❌ 全局文件名搜索失败:', error);
                setFilterResultFiles([]);
            }
        } finally {
            if (requestId === filterRequestRef.current) {
                isProcessing.current = false;
                setIsSearching(false);
            }
        }
    }, [currentPath, sortFiles, generateVideoThumbnails, getEffectiveTagGroups, setFileTags]);

    /**
     * 获取搜索根目录
     */
    const getSearchRoot = useCallback(() => {
        const savedLocation = localStorage.getItem('tagAnything_selectedLocation');
        if (savedLocation) {
            try {
                const location = JSON.parse(savedLocation);
                return location.path;
            } catch (e) {
                console.warn('Failed to parse location:', e);
            }
        }
        return currentPath;
    }, [currentPath]);

    /**
     * 统一的标签筛选处理函数
     */
    const handleTagFilter = useCallback((filter: TagFilter) => {
        console.log('🏷️ 标签筛选:', filter);

        // 更新筛选状态
        setFilterState(prev => ({
            tagFilter: filter,
            nameFilterQuery: null,
            isRecursive: prev.isRecursive,
        }));

        // 保存到 localStorage
        localStorage.setItem('tagAnything_filter', JSON.stringify(filter));

        // 派发事件供 AppBar 同步
        window.dispatchEvent(new CustomEvent('tagFilter', { detail: filter }));

        // 生成新的请求ID
        const requestId = Date.now();
        filterRequestRef.current = requestId;

        // 根据 isRecursive 执行搜索（使用当前目录作为根目录）
        if (filterState.isRecursive) {
            performRecursiveSearch(filter.tagIds, currentPath, requestId);
        } else {
            performCurrentDirectorySearch(filter.tagIds, requestId);
        }
    }, [currentPath, filterState.isRecursive, performRecursiveSearch, performCurrentDirectorySearch]);

    /**
     * 单标签筛选
     */
    const handleFilterByTag = useCallback((tag: Tag) => {
        handleTagFilter({
            type: 'tag',
            tagIds: [tag.id],
            tagNames: [tag.name],
            matchMode: 'all',
            timestamp: Date.now(),
            currentPath,
        });
    }, [currentPath, handleTagFilter]);

    /**
     * 多标签筛选
     */
    const handleMultiTagFilter = useCallback((legacyFilter: { tagIds: string[], tagNames?: string[] }) => {
        handleTagFilter({
            type: 'tag',
            tagIds: legacyFilter.tagIds,
            tagNames: legacyFilter.tagNames,
            matchMode: 'all',
            timestamp: Date.now(),
            currentPath,
        });
    }, [currentPath, handleTagFilter]);

    /**
     * Handle filename search with debouncing
     */
    const handleFilenameSearch = useCallback((query: string) => {
        console.log('🔍 文件名搜索:', query, filterState.isRecursive ? '(递归)' : '(当前目录)');

        // Clear existing timer
        if (searchDebounceTimer.current) {
            clearTimeout(searchDebounceTimer.current);
        }

        // Debounce search
        searchDebounceTimer.current = setTimeout(() => {
            setFilterState(prev => ({
                ...prev,
                nameFilterQuery: query || null,
            }));

            const detail: FilenameSearchFilter = {
                type: 'filename',
                query,
                timestamp: Date.now(),
                currentPath,
            };

            // Dispatch event for AppBar sync
            window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));

            // Generate new request ID
            const requestId = Date.now();
            filterRequestRef.current = requestId;

            // If there's an active tag filter, re-apply it with new search query
            if (filterState.tagFilter) {
                if (filterState.isRecursive) {
                    performRecursiveSearch(filterState.tagFilter.tagIds, currentPath, requestId);
                } else {
                    performCurrentDirectorySearch(filterState.tagFilter.tagIds, requestId);
                }
            } else if (filterState.isRecursive) {
                // Recursive filename search
                performGlobalFilenameSearch(query, requestId);
            } else {
                // Local filename search
                setIsFiltering(query.trim().length > 0);
                const result = filterByFilename(files, query);
                const sorted = sortFiles(result);
                setFilterResultFiles(sorted);
            }
        }, 300); // 300ms debounce
    }, [currentPath, filterState, files, filterByFilename, sortFiles, performRecursiveSearch, performCurrentDirectorySearch, performGlobalFilenameSearch]);

    /**
     * Toggle recursive search mode
     */
    const setRecursiveMode = useCallback((isRecursive: boolean) => {
        console.log('🔄 切换递归搜索模式:', isRecursive);
        setFilterState(prev => ({
            ...prev,
            isRecursive,
        }));

        // If there's an active filter, re-execute with new mode
        const requestId = Date.now();
        filterRequestRef.current = requestId;

        if (filterState.tagFilter) {
            if (isRecursive) {
                performRecursiveSearch(filterState.tagFilter.tagIds, currentPath, requestId);
            } else {
                performCurrentDirectorySearch(filterState.tagFilter.tagIds, requestId);
            }
        } else if (filterState.nameFilterQuery) {
            if (isRecursive) {
                performGlobalFilenameSearch(filterState.nameFilterQuery, requestId);
            } else {
                setIsFiltering(filterState.nameFilterQuery.trim().length > 0);
                const result = filterByFilename(files, filterState.nameFilterQuery);
                const sorted = sortFiles(result);
                setFilterResultFiles(sorted);
            }
        }
    }, [currentPath, filterState, files, filterByFilename, sortFiles, performRecursiveSearch, performCurrentDirectorySearch, performGlobalFilenameSearch]);

    /**
     * Clear all filters
     */
    const clearFilter = useCallback((opts?: { notify?: boolean }) => {
        console.log('🧹 清除所有筛选');

        // Clear timers
        if (searchDebounceTimer.current) {
            clearTimeout(searchDebounceTimer.current);
        }
        if (filterDebounceTimer.current) {
            clearTimeout(filterDebounceTimer.current);
        }

        // Invalidate any pending requests
        filterRequestRef.current = Date.now();

        setFilterState(prev => ({
            tagFilter: null,
            nameFilterQuery: null,
            isRecursive: prev.isRecursive,
        }));

        setIsFiltering(false);
        setIsSearching(false);
        setFilterResultFiles([]);

        // Clear localStorage
        localStorage.removeItem('tagAnything_filter');

        // Notify AppBar if requested
        if (opts?.notify !== false) {
            const detail: FilenameSearchFilter = {
                type: 'filename',
                query: '',
                timestamp: Date.now(),
                currentPath,
                clearAll: true,
            };
            window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));
        }
    }, [files, currentPath]);

    /**
     * Restore filter state from a history entry.
     * Used when navigating back/forward in history.
     */
    const restoreFilterState = useCallback((state: FilterState) => {
        console.log('🔄 恢复筛选状态:', state);

        // Clear timers first
        if (searchDebounceTimer.current) {
            clearTimeout(searchDebounceTimer.current);
        }
        if (filterDebounceTimer.current) {
            clearTimeout(filterDebounceTimer.current);
        }

        // Generate new request ID
        const requestId = Date.now();
        filterRequestRef.current = requestId;

        // Set the state first
        setFilterState(state);

        // Now execute the appropriate search based on the restored state
        if (state.tagFilter) {
            setIsFiltering(true);
            if (state.isRecursive) {
                performRecursiveSearch(state.tagFilter.tagIds, currentPath, requestId);
            } else {
                performCurrentDirectorySearch(state.tagFilter.tagIds, requestId);
            }

            // Dispatch event for AppBar sync
            window.dispatchEvent(new CustomEvent('tagFilter', { detail: state.tagFilter }));

        } else if (state.nameFilterQuery) {
            if (state.isRecursive) {
                setIsFiltering(true);
                performGlobalFilenameSearch(state.nameFilterQuery, requestId);
            } else {
                setIsFiltering(true);
                const result = filterByFilename(files, state.nameFilterQuery);
                const sorted = sortFiles(result);
                setFilterResultFiles(sorted);
            }

            // Dispatch event for AppBar sync
            const detail: FilenameSearchFilter = {
                type: 'filename',
                query: state.nameFilterQuery,
                timestamp: Date.now(),
                currentPath,
            };
            window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));

        } else {
            // No filters - clear everything
            setIsFiltering(false);
            setIsSearching(false);
            setFilterResultFiles([]);

            // Dispatch clear event
            const detail: FilenameSearchFilter = {
                type: 'filename',
                query: '',
                timestamp: Date.now(),
                currentPath,
                clearAll: true,
            };
            window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));
        }
    }, [currentPath, files, filterByFilename, sortFiles, performRecursiveSearch, performCurrentDirectorySearch, performGlobalFilenameSearch]);

    /**
     * Listen to external filter events (from TagManager, AppBar)
     */
    useEffect(() => {
        const handleTagFilterEvent = (event: Event) => {
            const detail = (event as CustomEvent).detail;

            // Handle unified TagFilter format (new)
            if (detail && detail.tagIds && Array.isArray(detail.tagIds)) {
                handleTagFilter(detail as TagFilter);
                return;
            }

            // Handle legacy single tag format (backward compatibility)
            if (detail && detail.tagId && detail.tagName) {
                const tag: Tag = {
                    id: detail.tagId,
                    name: detail.tagName,
                    color: '#2196f3',
                };
                const origin = detail.origin || 'tagManager';
                handleFilterByTag(tag);
            }
        };

        const handleMultiTagFilterEvent = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail && Array.isArray(detail.tagIds)) {
                handleMultiTagFilter(detail);
            }
        };

        const handleFilenameSearchEvent = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail?.clearAll) {
                clearFilter({ notify: false });
            }
        };

        window.addEventListener('tagFilter', handleTagFilterEvent);
        window.addEventListener('multiTagFilter', handleMultiTagFilterEvent);
        window.addEventListener('filenameSearch', handleFilenameSearchEvent);

        return () => {
            window.removeEventListener('tagFilter', handleTagFilterEvent);
            window.removeEventListener('multiTagFilter', handleMultiTagFilterEvent);
            window.removeEventListener('filenameSearch', handleFilenameSearchEvent);
        };
    }, [handleFilterByTag, handleMultiTagFilter, handleTagFilter, clearFilter]);

    /**
     * Refresh the current active filter.
     * Use this when file operations (move/rename/delete) might affect search results.
     */
    const refreshCurrentFilter = useCallback(async () => {
        if (!isFiltering) return;

        const requestId = Date.now();
        filterRequestRef.current = requestId;

        console.log('🔄 刷新当前筛选...', filterState);

        if (filterState.tagFilter) {
            if (filterState.isRecursive) {
                await performRecursiveSearch(filterState.tagFilter.tagIds, currentPath, requestId);
            } else {
                performCurrentDirectorySearch(filterState.tagFilter.tagIds, requestId);
            }
        } else if (filterState.nameFilterQuery && filterState.isRecursive) {
            await performGlobalFilenameSearch(filterState.nameFilterQuery, requestId);
        } else {
            // Local filter - usually re-evaluates automatically when 'files' prop updates
            if (filterState.nameFilterQuery) {
                const result = filterByFilename(files, filterState.nameFilterQuery);
                const sorted = sortFiles(result);
                setFilterResultFiles(sorted);
            }
        }
    }, [isFiltering, filterState, files, currentPath, performRecursiveSearch, performCurrentDirectorySearch, performGlobalFilenameSearch, filterByFilename, sortFiles]);

    /**
     * Synchronously compute sorted files for non-filtering case using useMemo.
     * This prevents UI flicker when navigating between folders.
     */
    const sortedBaseFiles = useMemo(() => {
        return sortFiles(files);
    }, [files, sortFiles]);

    /**
     * Re-apply sorting when sort type or direction changes for filtered results.
     * This ensures sorting works even when filters are active.
     */
    useEffect(() => {
        if (isFiltering || filterState.tagFilter || filterState.nameFilterQuery) {
            // Re-sort the current filtered files when sort changes
            const sorted = sortFiles(filterResultFiles);
            setFilterResultFiles(sorted);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortType, sortDirection]);

    /**
     * Compute final filtered files:
     * - When filtering is active, return filterResultFiles
     * - When not filtering, return sortedBaseFiles (synchronously computed)
     */
    const filteredFiles = useMemo(() => {
        if (isFiltering || filterState.tagFilter || filterState.nameFilterQuery) {
            return filterResultFiles;
        }
        return sortedBaseFiles;
    }, [isFiltering, filterState, filterResultFiles, sortedBaseFiles]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            if (searchDebounceTimer.current) {
                clearTimeout(searchDebounceTimer.current);
            }
            if (filterDebounceTimer.current) {
                clearTimeout(filterDebounceTimer.current);
            }
        };
    }, []);

    return {
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
        setRecursiveMode,
        refreshCurrentFilter,
        isSearching,
    };
};
