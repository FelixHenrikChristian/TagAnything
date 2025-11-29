import { useState, useEffect, useCallback, useRef } from 'react';
import { FileItem, Tag, TagGroup } from '../../types';
import {
    parseTagsFromFilename,
    createTagsFromNames,
    createTemporaryTags,
} from '../../utils/fileTagParser';
import {
    SortType,
    SortDirection,
    FilterState,
    TagFilter,
    MultiTagFilter,
    FilenameSearchFilter,
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
    fileTags: Map<string, Tag[]>
) => {
    const [filteredFiles, setFilteredFiles] = useState<FileItem[]>(files);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filterState, setFilterState] = useState<FilterState>({
        tagFilter: null,
        multiTagFilter: null,
        nameFilterQuery: null,
    });

    // Sorting state
    const [sortType, setSortType] = useState<SortType>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Debounce timer ref
    const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Ref to track if we're currently processing
    const isProcessing = useRef(false);

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
                    comparison = a.name.localeCompare(b.name, 'zh-CN');
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
    }, [sortType, sortDirection]);

    /**
     * Filter files by filename search query
     */
    const filterByFilename = useCallback((filesToFilter: FileItem[], query: string): FileItem[] => {
        if (!query || query.trim() === '') {
            return filesToFilter;
        }

        const lowerQuery = query.toLowerCase();
        return filesToFilter.filter(file =>
            file.name.toLowerCase().includes(lowerQuery)
        );
    }, []);

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
    const performRecursiveSearch = useCallback(async (tagIds: string[], rootPath: string) => {
        try {
            isProcessing.current = true;
            setIsFiltering(true);

            console.log('🔍 开始递归搜索:', { tagIds, rootPath });

            // Get all files recursively
            const allFiles = await window.electron.getAllFiles(rootPath);
            console.log(`📁 递归扫描到 ${allFiles.length} 个文件`);

            // Parse tags for all files
            const groups = getEffectiveTagGroups();
            const newFileTags = new Map<string, Tag[]>();

            allFiles.forEach(file => {
                if (!file.isDirectory) {
                    const tagNames = parseTagsFromFilename(file.name);
                    if (tagNames.length > 0) {
                        const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, groups);
                        const temporaryTags = createTemporaryTags(unmatchedTags);
                        const allTags = [...matchedTags, ...temporaryTags];
                        if (allTags.length > 0) {
                            newFileTags.set(file.path, allTags);
                        }
                    }
                }
            });

            // Update file tags map
            setFileTags((prevTags: Map<string, Tag[]>) => {
                const updated = new Map(prevTags);
                newFileTags.forEach((tags, path) => {
                    updated.set(path, tags);
                });
                return updated;
            });

            // Wait a bit for fileTags state to update
            await new Promise(resolve => setTimeout(resolve, 50));

            // Filter by tags using the new map
            const tagFilteredFiles = allFiles.filter(file => {
                if (file.isDirectory) return false;
                const tags = newFileTags.get(file.path);
                if (!tags || tags.length === 0) return false;
                const fileTagIds = tags.map(t => t.id);
                return tagIds.every(tagId => fileTagIds.includes(tagId));
            });

            console.log(`✅ 筛选出 ${tagFilteredFiles.length} 个匹配文件`);

            // Apply filename filter if exists
            let result = tagFilteredFiles;
            if (filterState.nameFilterQuery) {
                result = filterByFilename(result, filterState.nameFilterQuery);
            }

            // Sort and update
            const sorted = sortFiles(result);
            setFilteredFiles(sorted);

            // Generate thumbnails for video files
            await generateVideoThumbnails(sorted);

        } catch (error) {
            console.error('❌ 递归搜索失败:', error);
            setFilteredFiles([]);
        } finally {
            isProcessing.current = false;
        }
    }, [filterState.nameFilterQuery, getEffectiveTagGroups, setFileTags, sortFiles, filterByFilename, generateVideoThumbnails]);

    /**
     * Perform current directory only search
     */
    const performCurrentDirectorySearch = useCallback((tagIds: string[]) => {
        try {
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
            setFilteredFiles(sorted);

            console.log(`✅ 当前目录筛选出 ${sorted.length} 个文件`);

        } catch (error) {
            console.error('❌ 当前目录搜索失败:', error);
            setFilteredFiles([]);
        } finally {
            isProcessing.current = false;
        }
    }, [files, filterState.nameFilterQuery, filterByTags, filterByFilename, sortFiles]);

    /**
     * Handle single tag filter
     */
    const handleFilterByTag = useCallback((tag: Tag, origin: 'tagManager' | 'fileExplorer' = 'fileExplorer') => {
        console.log('🏷️ 单标签筛选:', { tag, origin });

        const filter: TagFilter = {
            type: 'tag',
            tagId: tag.id,
            tagName: tag.name,
            timestamp: Date.now(),
            origin,
            currentPath,
        };

        // Clear other filters
        setFilterState({
            tagFilter: filter,
            multiTagFilter: null,
            nameFilterQuery: null,
        });

        // Save to localStorage
        localStorage.setItem('tagAnything_filter', JSON.stringify(filter));
        localStorage.removeItem('tagAnything_multiFilter');

        // Dispatch event for AppBar sync
        window.dispatchEvent(new CustomEvent('tagFilter', { detail: filter }));

        // Perform search based on origin
        if (origin === 'tagManager') {
            // Recursive search from location root
            const locationRoot = localStorage.getItem('tagAnything_currentPath') || currentPath;
            const rootPath = locationRoot.split(/[/\\]/)[0] + '\\'; // Get drive root or location root
            // Actually, we should use the current location's root path
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
            performRecursiveSearch([tag.id], searchRoot);
        } else {
            // Current directory only
            performCurrentDirectorySearch([tag.id]);
        }
    }, [currentPath, performRecursiveSearch, performCurrentDirectorySearch]);

    /**
     * Handle multi-tag filter
     */
    const handleMultiTagFilter = useCallback((filter: MultiTagFilter) => {
        console.log('🏷️ 多标签筛选:', filter);

        setFilterState({
            tagFilter: null,
            multiTagFilter: filter,
            nameFilterQuery: null,
        });

        // Save to localStorage
        localStorage.setItem('tagAnything_multiFilter', JSON.stringify(filter));
        localStorage.removeItem('tagAnything_filter');

        // Dispatch event for AppBar sync
        window.dispatchEvent(new CustomEvent('multiTagFilter', { detail: filter }));

        // Always use recursive search for multi-tag filter
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

        performRecursiveSearch(filter.tagIds, searchRoot);
    }, [currentPath, performRecursiveSearch]);

    /**
     * Handle filename search with debouncing
     */
    const handleFilenameSearch = useCallback((query: string) => {
        console.log('🔍 文件名搜索:', query);

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
                origin: 'fileExplorer',
                currentPath,
            };

            // Dispatch event for AppBar sync
            window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));

            // If there's an active tag filter, re-apply it with new search query
            if (filterState.tagFilter) {
                const origin = filterState.tagFilter.origin || 'fileExplorer';
                if (origin === 'tagManager') {
                    const savedLocation = localStorage.getItem('tagAnything_selectedLocation');
                    let searchRoot = currentPath;
                    if (savedLocation) {
                        try {
                            const location = JSON.parse(savedLocation);
                            searchRoot = location.path;
                        } catch (e) { }
                    }
                    performRecursiveSearch([filterState.tagFilter.tagId], searchRoot);
                } else {
                    performCurrentDirectorySearch([filterState.tagFilter.tagId]);
                }
            } else if (filterState.multiTagFilter) {
                const savedLocation = localStorage.getItem('tagAnything_selectedLocation');
                let searchRoot = currentPath;
                if (savedLocation) {
                    try {
                        const location = JSON.parse(savedLocation);
                        searchRoot = location.path;
                    } catch (e) { }
                }
                performRecursiveSearch(filterState.multiTagFilter.tagIds, searchRoot);
            } else {
                // Just filename search, no tags
                setIsFiltering(query.trim().length > 0);
                const result = filterByFilename(files, query);
                const sorted = sortFiles(result);
                setFilteredFiles(sorted);
            }
        }, 300); // 300ms debounce
    }, [currentPath, filterState, files, filterByFilename, sortFiles, performRecursiveSearch, performCurrentDirectorySearch]);

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

        setFilterState({
            tagFilter: null,
            multiTagFilter: null,
            nameFilterQuery: null,
        });

        setIsFiltering(false);
        setFilteredFiles(files);

        // Clear localStorage
        localStorage.removeItem('tagAnything_filter');
        localStorage.removeItem('tagAnything_multiFilter');

        // Notify AppBar if requested
        if (opts?.notify !== false) {
            const detail: FilenameSearchFilter = {
                type: 'filename',
                query: '',
                timestamp: Date.now(),
                origin: 'fileExplorer',
                currentPath,
                clearAll: true,
            };
            window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));
        }
    }, [files, currentPath]);

    /**
     * Listen to external filter events (from TagManager, AppBar)
     */
    useEffect(() => {
        const handleTagFilterEvent = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail && detail.tagId && detail.tagName) {
                const tag: Tag = {
                    id: detail.tagId,
                    name: detail.tagName,
                    color: '#2196f3',
                };
                const origin = detail.origin || 'tagManager';
                handleFilterByTag(tag, origin);
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
    }, [handleFilterByTag, handleMultiTagFilter, clearFilter]);

    /**
     * Update filtered files when source files or sorting changes
     */
    useEffect(() => {
        if (!isFiltering && !filterState.tagFilter && !filterState.multiTagFilter && !filterState.nameFilterQuery) {
            // No filters active, just sort the files
            const sorted = sortFiles(files);
            setFilteredFiles(sorted);
        }
    }, [files, sortType, sortDirection, isFiltering, filterState, sortFiles]);

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
        sortType,
        setSortType,
        sortDirection,
        setSortDirection,
    };
};
