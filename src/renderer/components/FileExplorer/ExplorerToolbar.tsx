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
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    GridView as GridViewIcon,
    ViewList as ListViewIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { Location, TagGroup } from '../../types';
import { SortType, SortDirection, FilterState, MultiTagFilter } from './types';

interface ExplorerToolbarProps {
    locations: Location[];
    currentLocation: Location | null;
    handleLocationSelect: (location: Location) => void;
    handleRefresh: () => void;
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
    handleLocationSelect,
    handleRefresh,
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

    const handleClearSearch = () => {
        handleFilenameSearch('');
    };

    const handleClearAllFilters = () => {
        clearFilter();
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                {/* Left Side: Active Filters */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1 }}>
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
                            label={`多标签筛选 (${filterState.multiTagFilter.tagIds.length})`}
                            onDelete={handleClearAllFilters}
                            color="primary"
                            size="small"
                            icon={<FilterListIcon />}
                        />
                    )}
                    {filterState.nameFilterQuery && (
                        <Chip
                            label={`搜索: ${filterState.nameFilterQuery}`}
                            onDelete={handleClearSearch}
                            color="default"
                            size="small"
                        />
                    )}
                </Box>

                {/* Right Side: View Controls & Refresh */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Refresh */}
                    <IconButton onClick={handleRefresh} title="刷新" size="small">
                        <RefreshIcon fontSize="small" />
                    </IconButton>



                    {/* Sort */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                                value={sortType}
                                onChange={(e) => setSortType(e.target.value as SortType)}
                                sx={{ fontSize: '0.875rem' }}
                            >
                                <MenuItem value="name">名称</MenuItem>
                                <MenuItem value="modified">修改时间</MenuItem>
                                <MenuItem value="size">大小</MenuItem>
                                <MenuItem value="type">类型</MenuItem>
                            </Select>
                        </FormControl>
                        <IconButton
                            size="small"
                            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                        >
                            {sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                        </IconButton>
                    </Box>

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
        </Box>
    );
};
