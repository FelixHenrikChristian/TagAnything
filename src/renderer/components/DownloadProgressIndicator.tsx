import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    LinearProgress,
    IconButton,
    Button,
    Collapse,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

interface DownloadProgressIndicatorProps {
    downloading: boolean;
    downloaded: boolean;
    progress: number;
    onInstall: () => void;
    onDismiss: () => void;
    version?: string;
    downloadDetails?: {
        transferred: number;
        total: number;
        bytesPerSecond: number;
    } | null;
    fileIndex?: number;
}

// 格式化文件大小
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// 格式化速度
const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
};

// 获取文件描述
const getFileDescription = (fileIndex: number, total: number): string => {
    if (total > 100 * 1024 * 1024) { // > 100MB 是安装包
        return '安装包';
    } else if (total > 0) {
        return '校验文件';
    }
    return `文件 ${fileIndex}`;
};

const DownloadProgressIndicator: React.FC<DownloadProgressIndicatorProps> = ({
    downloading,
    downloaded,
    progress,
    onInstall,
    onDismiss,
    version,
    downloadDetails,
    fileIndex = 1,
}) => {
    const [minimized, setMinimized] = useState(false);

    // 只在下载中或已下载完成时显示
    if (!downloading && !downloaded) {
        return null;
    }

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                width: minimized ? 'auto' : 320,
                zIndex: 9999,
                borderRadius: 1.5, // 更小的圆角
                overflow: 'hidden',
                // 磨砂玻璃效果
                bgcolor: 'rgba(30, 30, 30, 0.75)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1,
                    // 使用与 snackbar 通知相同的颜色
                    bgcolor: downloaded
                        ? 'rgba(46, 125, 50, 0.65)'  // 成功绿色 - 与 snackbar success 一致
                        : 'rgba(2, 136, 209, 0.65)', // 信息蓝色 - 与 snackbar info 一致
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'white',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {downloaded ? (
                        <CheckCircleIcon fontSize="small" />
                    ) : (
                        <DownloadIcon fontSize="small" />
                    )}
                    <Typography variant="subtitle2" fontWeight="bold">
                        {downloaded ? '下载完成' : '正在下载更新'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        size="small"
                        onClick={() => setMinimized(!minimized)}
                        sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 0.5, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}
                    >
                        {minimized ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                    {downloaded && (
                        <IconButton
                            size="small"
                            onClick={onDismiss}
                            sx={{ color: 'rgba(255, 255, 255, 0.7)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </Box>

            {/* Content */}
            <Collapse in={!minimized}>
                <Box sx={{ p: 2 }}>
                    {downloading && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    {version ? `v${version}` : '更新'} - {getFileDescription(fileIndex, downloadDetails?.total || 0)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 'bold' }}>
                                    {Math.round(progress)}%
                                </Typography>
                            </Box>
                            {downloadDetails && downloadDetails.total > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                        {formatBytes(downloadDetails.transferred)} / {formatBytes(downloadDetails.total)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                        {formatSpeed(downloadDetails.bytesPerSecond)}
                                    </Typography>
                                </Box>
                            )}
                            <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                        bgcolor: 'rgba(100, 180, 255, 0.8)',
                                    },
                                }}
                            />
                        </>
                    )}

                    {downloaded && (
                        <>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                                {version ? `v${version} 已准备就绪` : '更新已准备就绪'}，点击下方按钮安装并重启应用。
                            </Typography>
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={onInstall}
                                startIcon={<CheckCircleIcon />}
                                sx={{
                                    bgcolor: 'rgba(46, 125, 50, 0.65)',
                                    border: '1px solid rgba(100, 180, 100, 0.25)',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'rgba(46, 125, 50, 0.85)',
                                    },
                                }}
                            >
                                安装更新
                            </Button>
                        </>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
};

export default DownloadProgressIndicator;
