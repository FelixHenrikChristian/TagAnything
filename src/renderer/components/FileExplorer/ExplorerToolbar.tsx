import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    FormControl,
    Select,
    MenuItem,
    Slider,
    ToggleButton,
    ToggleButtonGroup,
    Chip,
    Tooltip,
    TextField,
    InputAdornment,
    Popover,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Sort as SortIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    GridView as GridViewIcon,
    ViewList as ListViewIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    TravelExplore as TravelExploreIcon,
    Clear as ClearIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowUpward as ArrowUpwardIcon,
} from '@mui/icons-material';
import { Location, TagGroup } from '../../types';
import { SortType, SortDirection, FilterState, TagFilter } from './types';
import { SortMenu } from './SortMenu';
import { FileBreadcrumbs } from './FileBreadcrumbs';

interface ExplorerToolbarProps {
    locations: Location[];
    currentLocation: Location | null;
    currentPath: string;
    handleLocationSelect: (location: Location) => void;
    handleRefresh: () => void;
    handleNavigate: (path: string) => void;
    goBack: () => void;
    goForward: () => void;
    goUp: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    canGoUp: boolean;
    viewMode: 'list' | 'grid';
    setViewMode: (mode: 'list' | 'grid') => void;
    gridSize: number;
    setGridSize: (size: number) => void;
    sortType: SortType;
    setSortType: (type: SortType) => void;
    sortDirection: SortDirection;
    setSortDirection: (direction: SortDirection) => void;
    filterState: FilterState;
    handleMultiTagFilter: (filter: { tagIds: string[], tagNames?: string[] }) => void;
    handleFilenameSearch: (query: string) => void;
    clearFilter: (opts?: { notify?: boolean }) => void;
    clearTagFilter: () => void;
    tagGroups: TagGroup[];
    setRecursiveMode: (isRecursive: boolean) => void;
}

const GRID_CONFIG = {
    MAX_GRID_SIZE: 17,
};

export const ExplorerToolbar: React.FC<ExplorerToolbarProps> = ({
    locations,
    currentLocation,
    currentPath,
    handleLocationSelect,
    handleRefresh,
    handleNavigate,
    goBack,
    goForward,
    goUp,
    canGoBack,
    canGoForward,
    canGoUp,
    viewMode,
    setViewMode,
    gridSize,
    setGridSize,
    sortType,
    setSortType,
    sortDirection,
    setSortDirection,
    filterState,
    handleMultiTagFilter,
    handleFilenameSearch,
    clearFilter,
    clearTagFilter,
    tagGroups,
    setRecursiveMode,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [sortAnchorEl, setSortAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isComposing, setIsComposing] = useState(false);

    // Sync search query with filter state
    useEffect(() => {
        setSearchQuery(filterState.nameFilterQuery || '');
    }, [filterState.nameFilterQuery]);

    // Sync selected tags with filter state (tagFilter now handles both single and multi)
    useEffect(() => {
        if (filterState.tagFilter) {
            setSelectedTagIds(filterState.tagFilter.tagIds);
        } else {
            setSelectedTagIds([]);
        }
    }, [filterState.tagFilter]);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (!isComposing) {
            handleFilenameSearch(value);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        handleFilenameSearch('');
    };

    const handleClearAllFilters = () => {
        setSearchQuery('');
        clearFilter();
    };

    const handleOpenFilterPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
        setFilterAnchorEl(event.currentTarget);
        // Initialize with current filter
        if (filterState.tagFilter) {
            setSelectedTagIds(filterState.tagFilter.tagIds);
        }
    };

    const handleCloseFilterPopover = () => {
        setFilterAnchorEl(null);
    };

    const filterPopoverOpen = Boolean(filterAnchorEl);
    const sortMenuOpen = Boolean(sortAnchorEl);

    const handleOpenSortMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setSortAnchorEl(event.currentTarget);
    };

    const handleCloseSortMenu = () => {
        setSortAnchorEl(null);
    };

    const handleSortChange = (type: SortType, direction: SortDirection) => {
        setSortType(type);
        setSortDirection(direction);
        handleCloseSortMenu();
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1, borderBottom: 1, borderColor: 'divider' }}>
            {/* Row 1: Navigation & Address Bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Navigation Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" onClick={goBack} disabled={!canGoBack} title="后退">
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={goForward} disabled={!canGoForward} title="前进">
                        <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={goUp} disabled={!canGoUp} title="上级目录">
                        <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleRefresh} title="刷新">
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Address Bar (Breadcrumbs) */}
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1, px: 1, height: 32 }}>
                    <FileBreadcrumbs
                        currentPath={currentPath}
                        locations={locations}
                        handleNavigate={handleNavigate}
                    />
                </Box>
            </Box>

            {/* Row 2: Search, Filter, Sort, View */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                {/* Left Side: Search and Active Filters */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Unified Search/Filter Input */}
                    <TextField
                        size="small"
                        placeholder="搜索文件..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={(e) => {
                            setIsComposing(false);
                            handleFilenameSearch((e.target as HTMLInputElement).value);
                        }}
                        sx={{
                            width: 350,
                            '& .MuiOutlinedInput-root': {
                                paddingLeft: 0.5,
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start" sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                    {/* Recursive Mode Toggle (Search Icon) */}
                                    <Tooltip title={filterState.isRecursive ? "递归查询（包含子目录）" : "普通查询（仅当前目录）"}>
                                        <IconButton
                                            size="small"
                                            onClick={() => setRecursiveMode(!filterState.isRecursive)}
                                            sx={{
                                                p: 0.5,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                },
                                            }}
                                        >
                                            {filterState.isRecursive ? <TravelExploreIcon fontSize="small" /> : <SearchIcon fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>

                                    {/* Vertical Divider */}
                                    <Box sx={{
                                        width: '1px',
                                        height: 24,
                                        bgcolor: 'text.disabled',
                                        mx: 0.75,
                                        opacity: 0.6,
                                    }} />

                                    {/* Filter Button */}
                                    <Tooltip title="标签筛选">
                                        <IconButton
                                            size="small"
                                            onClick={handleOpenFilterPopover}
                                            color={filterState.tagFilter ? 'primary' : 'default'}
                                            sx={{
                                                p: 0.5,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                },
                                            }}
                                        >
                                            <FilterListIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>

                                    {/* Selected Tags Display (when filtering) */}
                                    {filterState.tagFilter && filterState.tagFilter.tagIds.length > 0 && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                                            {filterState.tagFilter.tagIds.length === 1 ? (
                                                <Chip
                                                    label={filterState.tagFilter.tagNames?.[0] || filterState.tagFilter.tagIds[0]}
                                                    onDelete={() => clearTagFilter()}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
                                                        '& .MuiChip-deleteIcon': { fontSize: '1rem' },
                                                    }}
                                                />
                                            ) : (
                                                <Chip
                                                    label={`${filterState.tagFilter.tagIds.length}个标签`}
                                                    onDelete={() => clearTagFilter()}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
                                                        '& .MuiChip-deleteIcon': { fontSize: '1rem' },
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    )}
                                </InputAdornment>
                            ),
                            endAdornment: (searchQuery || filterState.tagFilter) && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={handleClearAllFilters}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {/* Right Side: View Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Sort */}
                    <Tooltip title="排序">
                        <IconButton onClick={handleOpenSortMenu} size="small">
                            <SortIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {/* Grid Size */}
                    {viewMode === 'grid' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, width: 200 }}>
                            <IconButton
                                size="small"
                                onClick={() => setGridSize(Math.min(GRID_CONFIG.MAX_GRID_SIZE, gridSize + 1))}
                                title="缩小"
                                sx={{ p: 0.5 }}
                            >
                                <ZoomOutIcon fontSize="small" />
                            </IconButton>
                            <Slider
                                value={GRID_CONFIG.MAX_GRID_SIZE + 1 - gridSize}
                                onChange={(_, v) => setGridSize(GRID_CONFIG.MAX_GRID_SIZE + 1 - (v as number))}
                                min={1}
                                max={GRID_CONFIG.MAX_GRID_SIZE}
                                step={1}
                                size="small"
                                sx={{
                                    '& .MuiSlider-thumb': {
                                        transition: 'left 0.1s',
                                    },
                                    '& .MuiSlider-track': {
                                        transition: 'width 0.1s',
                                    }
                                }}
                            />
                            <IconButton
                                size="small"
                                onClick={() => setGridSize(Math.max(1, gridSize - 1))}
                                title="放大"
                                sx={{ p: 0.5 }}
                            >
                                <ZoomInIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    )}

                    {/* View Mode */}
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, m) => m && setViewMode(m)}
                        size="small"
                    >
                        <ToggleButton value="grid">
                            <GridViewIcon fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="list">
                            <ListViewIcon fontSize="small" />
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>

            {/* Multi-Tag Filter Popover */}
            <Popover
                open={filterPopoverOpen}
                anchorEl={filterAnchorEl}
                onClose={handleCloseFilterPopover}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ p: 2, width: 300, maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        {tagGroups.map(group => (
                            <Box key={group.id} sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {group.name}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {group.tags.map(tag => {
                                        const isSelected = selectedTagIds.includes(tag.id);
                                        return (
                                            <Chip
                                                key={tag.id}
                                                label={tag.name}
                                                size="small"
                                                onClick={() => {
                                                    const newSelectedIds = isSelected
                                                        ? selectedTagIds.filter(id => id !== tag.id)
                                                        : [...selectedTagIds, tag.id];

                                                    setSelectedTagIds(newSelectedIds);

                                                    if (newSelectedIds.length > 0) {
                                                        // Get tag names for the selected IDs
                                                        const newSelectedNames = newSelectedIds.map(id => {
                                                            for (const g of tagGroups) {
                                                                const t = g.tags.find(t => t.id === id);
                                                                if (t) return t.name;
                                                            }
                                                            return id;
                                                        });
                                                        handleMultiTagFilter({
                                                            tagIds: newSelectedIds,
                                                            tagNames: newSelectedNames,
                                                        });
                                                    } else {
                                                        clearTagFilter();
                                                    }
                                                }}
                                                sx={{
                                                    bgcolor: tag.color,
                                                    color: tag.textcolor || 'white',
                                                    height: 24,
                                                    fontSize: '0.75rem',
                                                    opacity: isSelected ? 1 : 0.3,
                                                    filter: isSelected ? 'none' : 'grayscale(50%)',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        opacity: isSelected ? 1 : 0.7,
                                                        filter: isSelected ? 'none' : 'grayscale(0%)',
                                                    }
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Popover>

            {/* Sort Menu */}
            <SortMenu
                anchorEl={sortAnchorEl}
                open={sortMenuOpen}
                onClose={handleCloseSortMenu}
                sortType={sortType}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
            />
        </Box>
    );
};
