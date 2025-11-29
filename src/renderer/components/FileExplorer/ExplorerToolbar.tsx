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
    Divider,
    TextField,
    InputAdornment,
    Popover,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    Button,
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
    Clear as ClearIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowUpward as ArrowUpwardIcon,
} from '@mui/icons-material';
import { Location, TagGroup } from '../../types';
import { SortType, SortDirection, FilterState, MultiTagFilter } from './types';
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
    handleMultiTagFilter: (filter: MultiTagFilter) => void;
    handleFilenameSearch: (query: string) => void;
    clearFilter: (opts?: { notify?: boolean }) => void;
    tagGroups: TagGroup[];
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
    tagGroups,
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

    // Sync selected tags with filter state
    useEffect(() => {
        if (filterState.multiTagFilter) {
            setSelectedTagIds(filterState.multiTagFilter.tagIds);
        } else {
            setSelectedTagIds([]);
        }
    }, [filterState.multiTagFilter]);

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
        if (filterState.multiTagFilter) {
            setSelectedTagIds(filterState.multiTagFilter.tagIds);
        }
    };

    const handleCloseFilterPopover = () => {
        setFilterAnchorEl(null);
    };

    const handleToggleTag = (tagId: string) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const handleApplyFilter = () => {
        if (selectedTagIds.length > 0) {
            const currentPath = localStorage.getItem('tagAnything_currentPath') || '';
            const filter: MultiTagFilter = {
                type: 'multiTag',
                tagIds: selectedTagIds,
                timestamp: Date.now(),
                origin: 'fileExplorer',
                currentPath,
            };
            handleMultiTagFilter(filter);
        }
        handleCloseFilterPopover();
    };

    const handleClearFilterSelection = () => {
        setSelectedTagIds([]);
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
                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1, px: 1, height: 32 }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 300 }}>
                    {/* Search Input */}
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
                        sx={{ flex: 1, minWidth: 200 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={handleClearSearch}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Multi-Tag Filter Button */}
                    <Tooltip title="多标签筛选">
                        <IconButton
                            size="small"
                            onClick={handleOpenFilterPopover}
                            color={filterState.multiTagFilter ? 'primary' : 'default'}
                        >
                            <FilterListIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {/* Active Filter Chips */}
                    {filterState.tagFilter && (
                        <Chip
                            label={`标签: ${filterState.tagFilter.tagName}`}
                            onDelete={handleClearAllFilters}
                            color="primary"
                            size="small"
                            icon={<FilterListIcon />}
                        />
                    )}
                    {filterState.multiTagFilter && (
                        <Chip
                            label={`多标签 (${filterState.multiTagFilter.tagIds.length})`}
                            onDelete={handleClearAllFilters}
                            color="primary"
                            size="small"
                            icon={<FilterListIcon />}
                        />
                    )}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 120 }}>
                            <ZoomOutIcon fontSize="small" color="action" />
                            <Slider
                                value={GRID_CONFIG.MAX_GRID_SIZE + 1 - gridSize}
                                onChange={(_, v) => setGridSize(GRID_CONFIG.MAX_GRID_SIZE + 1 - (v as number))}
                                min={1}
                                max={GRID_CONFIG.MAX_GRID_SIZE}
                                step={1}
                                size="small"
                            />
                            <ZoomInIcon fontSize="small" color="action" />
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
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        选择标签进行筛选
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        选中的标签将使用AND逻辑筛选文件
                    </Typography>

                    <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
                        {tagGroups.map(group => (
                            <Box key={group.id} sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                                    {group.name}
                                </Typography>
                                <List dense disablePadding>
                                    {group.tags.map(tag => (
                                        <ListItem
                                            key={tag.id}
                                            dense
                                            disablePadding
                                            sx={{
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                borderRadius: 1,
                                            }}
                                            onClick={() => handleToggleTag(tag.id)}
                                        >
                                            <Checkbox
                                                edge="start"
                                                checked={selectedTagIds.includes(tag.id)}
                                                tabIndex={-1}
                                                disableRipple
                                                size="small"
                                            />
                                            <Chip
                                                label={tag.name}
                                                size="small"
                                                sx={{
                                                    bgcolor: tag.color,
                                                    color: tag.textcolor || 'white',
                                                    height: 20,
                                                    fontSize: '0.75rem',
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        ))}
                    </Box>

                    <Divider sx={{ mb: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Button size="small" onClick={handleClearFilterSelection}>
                            清除
                        </Button>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={handleCloseFilterPopover}>
                                取消
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={handleApplyFilter}
                                disabled={selectedTagIds.length === 0}
                            >
                                应用 ({selectedTagIds.length})
                            </Button>
                        </Box>
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
