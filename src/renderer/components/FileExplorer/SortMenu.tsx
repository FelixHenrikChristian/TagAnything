import React from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Box,
} from '@mui/material';
import {
    TextFields as TextFieldsIcon,
    CalendarToday as CalendarIcon,
    Category as CategoryIcon,
    Storage as StorageIcon,
    FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { SortType, SortDirection } from './types';

interface SortMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    sortType: SortType;
    sortDirection: SortDirection;
    onSortChange: (type: SortType, direction: SortDirection) => void;
}

interface SortOption {
    type: SortType;
    label: string;
    icon: React.ReactElement;
}

const sortOptions: SortOption[] = [
    { type: 'name', label: '名称', icon: <TextFieldsIcon fontSize="small" /> },
    { type: 'size', label: '大小', icon: <StorageIcon fontSize="small" /> },
    { type: 'type', label: '类型', icon: <CategoryIcon fontSize="small" /> },
    { type: 'modified', label: '修改日期', icon: <CalendarIcon fontSize="small" /> },
];

export const SortMenu: React.FC<SortMenuProps> = ({
    anchorEl,
    open,
    onClose,
    sortType,
    sortDirection,
    onSortChange,
}) => {
    const handleSortTypeClick = (type: SortType) => {
        if (type === sortType) {
            // Toggle direction if clicking current sort type
            const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            onSortChange(type, newDirection);
        } else {
            // Use ascending by default for new sort type
            onSortChange(type, 'asc');
        }
    };

    const handleDirectionClick = (direction: SortDirection) => {
        onSortChange(sortType, direction);
    };

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            PaperProps={{
                sx: {
                    minWidth: 180,
                    '& .MuiMenuItem-root': {
                        fontSize: '0.875rem',
                        py: 0.75,
                    },
                },
            }}
        >
            {/* Sort Type Options */}
            {sortOptions.map((option) => (
                <MenuItem
                    key={option.type}
                    onClick={() => handleSortTypeClick(option.type)}
                    selected={sortType === option.type}
                >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        {sortType === option.type ? (
                            <DotIcon fontSize="small" sx={{ fontSize: 8 }} />
                        ) : (
                            <Box sx={{ width: 8 }} />
                        )}
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        {option.icon}
                    </ListItemIcon>
                    <ListItemText>{option.label}</ListItemText>
                </MenuItem>
            ))}

            <Divider sx={{ my: 0.5 }} />

            {/* Direction Options */}
            <MenuItem
                onClick={() => handleDirectionClick('asc')}
                selected={sortDirection === 'asc'}
            >
                <ListItemIcon sx={{ minWidth: 32 }}>
                    {sortDirection === 'asc' ? (
                        <DotIcon fontSize="small" sx={{ fontSize: 8 }} />
                    ) : (
                        <Box sx={{ width: 8 }} />
                    )}
                </ListItemIcon>
                <ListItemText>递增</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={() => handleDirectionClick('desc')}
                selected={sortDirection === 'desc'}
            >
                <ListItemIcon sx={{ minWidth: 32 }}>
                    {sortDirection === 'desc' ? (
                        <DotIcon fontSize="small" sx={{ fontSize: 8 }} />
                    ) : (
                        <Box sx={{ width: 8 }} />
                    )}
                </ListItemIcon>
                <ListItemText>递减</ListItemText>
            </MenuItem>
        </Menu>
    );
};
