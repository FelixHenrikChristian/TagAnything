import { useState, useEffect, useRef, useCallback } from 'react';
import { FileItem, Tag, TagGroup, Location } from '../../types';
import {
    SortType,
    SortDirection,
    TagFilter,
    MultiTagFilter,
    FilenameSearchFilter,
} from '../../components/FileExplorer/types';
import {
    parseTagsFromFilename,
    createTagsFromNames,
    createTemporaryTags,
    getDisplayName,
} from '../../utils/fileTagParser';

export const useFileFilter = (
    files: FileItem[],
    currentPath: string,
    getEffectiveTagGroups: () => TagGroup[],
    setFileTags: React.Dispatch<React.SetStateAction<Map<string, Tag[]>>>,
    generateVideoThumbnails: (files: FileItem[]) => Promise<void>,
    fileTags: Map<string, Tag[]>
) => {
    const [sortType, setSortType] = useState<SortType>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const [tagFilter, setTagFilter] = useState<TagFilter | null>(null);
    const [multiTagFilter, setMultiTagFilter] = useState<MultiTagFilter | null>(null);
    const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
    const [isFiltering, setIsFiltering] = useState<boolean>(false);
    const [nameFilterQuery, setNameFilterQuery] = useState<string | null>(null);

    const tagFilterRef = useRef<TagFilter | null>(null);
    const multiTagFilterRef = useRef<MultiTagFilter | null>(null);
    const nameFilterQueryRef = useRef<string | null>(null);
    const filenameSearchDebounceRef = useRef<number | null>(null);
    const FILENAME_SEARCH_DEBOUNCE_MS = 200;

    useEffect(() => { tagFilterRef.current = tagFilter; }, [tagFilter]);
    useEffect(() => { multiTagFilterRef.current = multiTagFilter; }, [multiTagFilter]);
    useEffect(() => { nameFilterQueryRef.current = nameFilterQuery; }, [nameFilterQuery]);

    useEffect(() => {
        return () => {
            if (filenameSearchDebounceRef.current) {
                window.clearTimeout(filenameSearchDebounceRef.current);
                filenameSearchDebounceRef.current = null;
            }
        };
    }, []);

    const performTagFilter = useCallback(async (filter: TagFilter) => {
        try {
            console.log(`🔍 开始搜索标签: ${filter.tagName} (ID: ${filter.tagId})`);
            let foundFiles: FileItem[] = [];
            const targetPath = filter.currentPath || currentPath;
            const effectiveGroups = getEffectiveTagGroups();

            if (targetPath) {
                if (filter.origin === 'fileExplorer') {
                    try {
                        const entries = await window.electron.getFiles(targetPath);
                        for (const file of entries) {
                            if (!file.isDirectory) {
                                const tagNames = parseTagsFromFilename(file.name);
                                if (tagNames.length > 0) {
                                    const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                                    const temporaryTags = createTemporaryTags(unmatchedTags);
                                    const allTags = [...matchedTags, ...temporaryTags];
                                    const hasTargetTag = allTags.some(tag => tag.id === filter.tagId);
                                    if (hasTargetTag) {
                                        foundFiles.push(file);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('❌ 非递归搜索当前目录时出错:', error);
                    }
                } else {
                    try {
                        const allFiles = await window.electron.getAllFiles(targetPath);
                        for (const file of allFiles) {
                            if (!file.isDirectory) {
                                const tagNames = parseTagsFromFilename(file.name);
                                if (tagNames.length > 0) {
                                    const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                                    const temporaryTags = createTemporaryTags(unmatchedTags);
                                    const allTags = [...matchedTags, ...temporaryTags];
                                    const hasTargetTag = allTags.some(tag => tag.id === filter.tagId);
                                    if (hasTargetTag) {
                                        foundFiles.push(file);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('❌ 递归搜索当前目录时出错:', error);
                    }
                }
            } else {
                const savedLocations = localStorage.getItem('tagAnything_locations');
                const availableLocations: Location[] = savedLocations ? JSON.parse(savedLocations) : [];

                if (availableLocations.length === 0) {
                    setFilteredFiles([]);
                    return;
                }

                for (const location of availableLocations) {
                    try {
                        const allFiles = await window.electron.getAllFiles(location.path);
                        for (const file of allFiles) {
                            if (!file.isDirectory) {
                                const tagNames = parseTagsFromFilename(file.name);
                                if (tagNames.length > 0) {
                                    const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                                    const temporaryTags = createTemporaryTags(unmatchedTags);
                                    const allTags = [...matchedTags, ...temporaryTags];
                                    const hasTargetTag = allTags.some(tag => tag.id === filter.tagId);
                                    if (hasTargetTag) {
                                        foundFiles.push(file);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`❌ 搜索位置 ${location.name} 时出错:`, error);
                    }
                }
            }

            try {
                const q = (nameFilterQueryRef.current || '').trim().toLowerCase();
                if (q) {
                    foundFiles = foundFiles.filter(file => {
                        const displayName = getDisplayName(file.name).toLowerCase();
                        return displayName.includes(q);
                    });
                }
            } catch (e) {
                console.warn('⚠️ 在标签筛选结果上应用文件名搜索失败:', e);
            }

            try {
                const activeMulti = multiTagFilterRef.current;
                if (activeMulti && activeMulti.tagIds && activeMulti.tagIds.length > 0) {
                    const requiredIds = new Set(activeMulti.tagIds);
                    foundFiles = foundFiles.filter(file => {
                        const tagNames = parseTagsFromFilename(file.name);
                        if (tagNames.length === 0) return false;
                        const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                        const temporaryTags = createTemporaryTags(unmatchedTags);
                        const allTags = [...matchedTags, ...temporaryTags];
                        for (const id of requiredIds) {
                            if (!allTags.some(t => t.id === id)) return false;
                        }
                        return true;
                    });
                }
            } catch (e) {
                console.warn('⚠️ 在标签筛选结果上应用多标签筛选失败:', e);
            }

            try {
                const updatedFileTags = new Map(fileTags);
                for (const file of foundFiles) {
                    if (!file.isDirectory) {
                        const tagNames = parseTagsFromFilename(file.name);
                        if (tagNames.length > 0) {
                            const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                            const temporaryTags = createTemporaryTags(unmatchedTags);
                            const allTags = [...matchedTags, ...temporaryTags];
                            updatedFileTags.set(file.path, allTags);
                        }
                    }
                }
                setFileTags(updatedFileTags);
            } catch (e) {
                console.warn('⚠️ 更新筛选结果标签缓存失败:', e);
            }

            try {
                await generateVideoThumbnails(foundFiles);
            } catch (e) {
                console.warn('⚠️ 为筛选结果生成缩略图失败:', e);
            }

            setFilteredFiles(foundFiles);
        } catch (error) {
            console.error('❌ 执行标签筛选时出错:', error);
            setFilteredFiles([]);
        }
    }, [currentPath, getEffectiveTagGroups, fileTags, setFileTags, generateVideoThumbnails]);

    const performMultiTagFilter = useCallback(async (filter: MultiTagFilter) => {
        try {
            console.log('🔍 开始多标签筛选:', filter.tagIds);
            let foundFiles: FileItem[] = [];
            const targetPath = filter.currentPath || currentPath;
            const effectiveGroups = getEffectiveTagGroups();

            const matchAllTags = (file: FileItem) => {
                const tagNames = parseTagsFromFilename(file.name);
                if (tagNames.length === 0) return false;
                const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                const temporaryTags = createTemporaryTags(unmatchedTags);
                const allTags = [...matchedTags, ...temporaryTags];
                for (const id of filter.tagIds) {
                    if (!allTags.some(t => t.id === id)) return false;
                }
                return true;
            };

            if (targetPath) {
                if (filter.origin === 'fileExplorer') {
                    try {
                        const entries = await window.electron.getFiles(targetPath);
                        for (const file of entries) {
                            if (!file.isDirectory && matchAllTags(file)) {
                                foundFiles.push(file);
                            }
                        }
                    } catch (e) {
                        console.error('❌ 非递归多标签筛选出错:', e);
                    }
                } else {
                    try {
                        const allFiles = await window.electron.getAllFiles(targetPath);
                        for (const file of allFiles) {
                            if (!file.isDirectory && matchAllTags(file)) {
                                foundFiles.push(file);
                            }
                        }
                    } catch (e) {
                        console.error('❌ 递归多标签筛选出错:', e);
                    }
                }
            } else {
                const savedLocations = localStorage.getItem('tagAnything_locations');
                const availableLocations: Location[] = savedLocations ? JSON.parse(savedLocations) : [];
                for (const location of availableLocations) {
                    try {
                        const allFiles = await window.electron.getAllFiles(location.path);
                        for (const file of allFiles) {
                            if (!file.isDirectory && matchAllTags(file)) {
                                foundFiles.push(file);
                            }
                        }
                    } catch (e) {
                        console.error(`❌ 搜索位置 ${location.name} 时出错:`, e);
                    }
                }
            }

            try {
                const q = (nameFilterQueryRef.current || '').trim().toLowerCase();
                if (q) {
                    foundFiles = foundFiles.filter(file => {
                        const displayName = getDisplayName(file.name).toLowerCase();
                        return displayName.includes(q);
                    });
                }
            } catch (e) {
                console.warn('⚠️ 在多标签筛选结果上应用文件名搜索失败:', e);
            }

            try {
                const updatedFileTags = new Map(fileTags);
                for (const file of foundFiles) {
                    if (!file.isDirectory) {
                        const tagNames = parseTagsFromFilename(file.name);
                        if (tagNames.length > 0) {
                            const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                            const temporaryTags = createTemporaryTags(unmatchedTags);
                            const allTags = [...matchedTags, ...temporaryTags];
                            updatedFileTags.set(file.path, allTags);
                        }
                    }
                }
                setFileTags(updatedFileTags);
            } catch (e) {
                console.warn('⚠️ 更新多标签筛选结果标签缓存失败:', e);
            }

            try {
                await generateVideoThumbnails(foundFiles);
            } catch (e) {
                console.warn('⚠️ 为多标签筛选结果生成缩略图失败:', e);
            }

            setFilteredFiles(foundFiles);
        } catch (error) {
            console.error('❌ 执行多标签筛选时出错:', error);
            setFilteredFiles([]);
        }
    }, [currentPath, getEffectiveTagGroups, fileTags, setFileTags, generateVideoThumbnails]);

    const performFilenameSearch = useCallback(async (query: string, fromPath?: string) => {
        try {
            const q = (query || '').trim().toLowerCase();
            if (!q) {
                setNameFilterQuery(null);
                if (tagFilterRef.current) {
                    await performTagFilter(tagFilterRef.current);
                    setIsFiltering(true);
                } else if (multiTagFilterRef.current) {
                    await performMultiTagFilter(multiTagFilterRef.current);
                    setIsFiltering(true);
                } else {
                    setFilteredFiles([]);
                    setIsFiltering(false);
                }
                return;
            }

            const targetPath = fromPath || currentPath;
            if (!targetPath) {
                setFilteredFiles([]);
                return;
            }

            let foundFiles: FileItem[] = [];
            try {
                const allEntries = await window.electron.getAllFiles(targetPath);
                for (const entry of allEntries) {
                    const displayName = getDisplayName(entry.name).toLowerCase();
                    if (displayName.includes(q)) {
                        foundFiles.push(entry);
                    }
                }
            } catch (error) {
                console.error('❌ 递归获取文件列表时出错:', error);
            }

            try {
                const activeTagFilter = tagFilterRef.current;
                if (activeTagFilter) {
                    const effectiveGroups = getEffectiveTagGroups();
                    foundFiles = foundFiles.filter(file => {
                        const tagNames = parseTagsFromFilename(file.name);
                        if (tagNames.length === 0) return false;
                        const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                        const temporaryTags = createTemporaryTags(unmatchedTags);
                        const allTags = [...matchedTags, ...temporaryTags];
                        return allTags.some(tag => tag.id === activeTagFilter.tagId);
                    });
                }
            } catch (e) {
                console.warn('⚠️ 在搜索结果上应用标签筛选失败:', e);
            }

            try {
                const activeMulti = multiTagFilterRef.current;
                if (activeMulti && activeMulti.tagIds && activeMulti.tagIds.length > 0) {
                    const requiredIds = new Set(activeMulti.tagIds);
                    const effectiveGroups = getEffectiveTagGroups();
                    foundFiles = foundFiles.filter(file => {
                        const tagNames = parseTagsFromFilename(file.name);
                        if (tagNames.length === 0) return false;
                        const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                        const temporaryTags = createTemporaryTags(unmatchedTags);
                        const allTags = [...matchedTags, ...temporaryTags];
                        for (const id of requiredIds) {
                            if (!allTags.some(t => t.id === id)) return false;
                        }
                        return true;
                    });
                }
            } catch (e) {
                console.warn('⚠️ 在搜索结果上应用多标签筛选失败:', e);
            }

            try {
                await generateVideoThumbnails(foundFiles);
            } catch (e) {
                console.warn('⚠️ 为搜索结果生成缩略图失败:', e);
            }

            try {
                const effectiveGroups = getEffectiveTagGroups();
                const updatedFileTags = new Map(fileTags);
                for (const file of foundFiles) {
                    if (!file.isDirectory) {
                        const tagNames = parseTagsFromFilename(file.name);
                        if (tagNames.length > 0) {
                            const { matchedTags, unmatchedTags } = createTagsFromNames(tagNames, effectiveGroups);
                            const temporaryTags = createTemporaryTags(unmatchedTags);
                            const allTags = [...matchedTags, ...temporaryTags];
                            updatedFileTags.set(file.path, allTags);
                        }
                    }
                }
                setFileTags(updatedFileTags);
            } catch (e) {
                console.warn('⚠️ 更新搜索结果标签缓存失败:', e);
            }

            setFilteredFiles(foundFiles);
            setIsFiltering(true);
        } catch (error) {
            console.error('❌ 执行文件名搜索时出错:', error);
            setFilteredFiles([]);
        }
    }, [currentPath, getEffectiveTagGroups, fileTags, setFileTags, generateVideoThumbnails, performTagFilter, performMultiTagFilter]);

    const clearFilter = useCallback((opts?: { notify?: boolean }) => {
        setTagFilter(null);
        setMultiTagFilter(null);
        setIsFiltering(false);
        setFilteredFiles([]);
        setNameFilterQuery(null);
        if (filenameSearchDebounceRef.current) {
            try { window.clearTimeout(filenameSearchDebounceRef.current); } catch { }
            filenameSearchDebounceRef.current = null;
        }
        try {
            localStorage.removeItem('tagAnything_filter');
            localStorage.removeItem('tagAnything_multiFilter');
        } catch { }
        if (opts?.notify !== false) {
            try {
                const currentPathInfo = currentPath;
                const detail = {
                    type: 'filename',
                    query: '',
                    timestamp: Date.now(),
                    origin: 'fileExplorer' as const,
                    currentPath: currentPathInfo,
                    clearAll: true,
                } as any;
                window.dispatchEvent(new CustomEvent('filenameSearch', { detail }));
            } catch { }
        }
    }, [currentPath]);

    // Event Listeners
    useEffect(() => {
        const handleTagFilterEvent = (event: CustomEvent) => {
            const filterData = event.detail;
            setMultiTagFilter(null);
            try { localStorage.removeItem('tagAnything_multiFilter'); } catch { }
            setTagFilter(filterData);
            setIsFiltering(true);
            performTagFilter(filterData);
        };

        const handleMultiTagFilterEvent = (event: CustomEvent) => {
            const filterData: MultiTagFilter = event.detail;
            setTagFilter(null);
            try { localStorage.removeItem('tagAnything_filter'); } catch { }
            setMultiTagFilter(filterData);
            setIsFiltering(true);
            performMultiTagFilter(filterData);
        };

        const handleFilenameSearchEvent = (event: CustomEvent) => {
            const detail: FilenameSearchFilter = event.detail;
            const query = detail?.query || '';
            if (detail?.origin === 'fileExplorer') return;
            if (detail?.clearAll) {
                clearFilter({ notify: false });
                return;
            }
            setNameFilterQuery(query);
            setIsFiltering(!!query || !!tagFilterRef.current || !!multiTagFilterRef.current);
            if (filenameSearchDebounceRef.current) {
                window.clearTimeout(filenameSearchDebounceRef.current);
                filenameSearchDebounceRef.current = null;
            }
            if (detail?.immediate) {
                performFilenameSearch(query, detail?.currentPath);
                return;
            }
            filenameSearchDebounceRef.current = window.setTimeout(() => {
                performFilenameSearch(query, detail?.currentPath);
                filenameSearchDebounceRef.current = null;
            }, FILENAME_SEARCH_DEBOUNCE_MS);
        };

        window.addEventListener('tagFilter', handleTagFilterEvent as EventListener);
        window.addEventListener('multiTagFilter', handleMultiTagFilterEvent as EventListener);
        window.addEventListener('filenameSearch', handleFilenameSearchEvent as EventListener);

        return () => {
            window.removeEventListener('tagFilter', handleTagFilterEvent as EventListener);
            window.removeEventListener('multiTagFilter', handleMultiTagFilterEvent as EventListener);
            window.removeEventListener('filenameSearch', handleFilenameSearchEvent as EventListener);
        };
    }, [performTagFilter, performMultiTagFilter, performFilenameSearch, clearFilter]);

    return {
        sortType,
        setSortType,
        sortDirection,
        setSortDirection,
        tagFilter,
        multiTagFilter,
        filteredFiles,
        isFiltering,
        nameFilterQuery,
        clearFilter,
        filterState: {
            tagFilter,
            multiTagFilter,
            nameFilterQuery,
        },
        handleFilterByTag: (tag: Tag) => {
            const filter: TagFilter = {
                type: 'tag',
                tagId: tag.id,
                tagName: tag.name,
                origin: 'fileExplorer' as const,
                currentPath,
                timestamp: Date.now(),
            };
            setTagFilter(filter);
            setIsFiltering(true);
            performTagFilter(filter);
        },
        handleMultiTagFilter: (filter: MultiTagFilter) => {
            setMultiTagFilter(filter);
            setIsFiltering(true);
            performMultiTagFilter(filter);
        },
        handleFilenameSearch: (query: string) => {
            setNameFilterQuery(query);
            setIsFiltering(!!query || !!tagFilter || !!multiTagFilter);
            performFilenameSearch(query);
        },
    };
};
