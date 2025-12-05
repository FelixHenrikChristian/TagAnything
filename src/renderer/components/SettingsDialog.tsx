import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Box,
    Typography,
    Switch,
    LinearProgress,
    CircularProgress,
} from '@mui/material';
import {
    Download as DownloadIcon,
    SystemUpdate as UpdateIcon,
} from '@mui/icons-material';

interface UpdateState {
    autoUpdateEnabled: boolean;
    updateAvailable: boolean;
    updateInfo: any;
    updateDownloading: boolean;
    updateDownloaded: boolean;
    updateProgress: number;
    checkingForUpdates: boolean;
    updateError: string | null;
}

interface UpdateActions {
    handleCheckForUpdates: () => Promise<void>;
    handleDownloadUpdate: () => Promise<void>;
    handleInstallUpdate: () => Promise<void>;
    handleAutoUpdateToggle: (enabled: boolean) => Promise<void>;
}

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
    updateState: UpdateState;
    updateActions: UpdateActions;
    onShowSnackbar: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
    open,
    onClose,
    updateState,
    updateActions,
    onShowSnackbar,
}) => {
    const [clearCacheConfirmOpen, setClearCacheConfirmOpen] = useState(false);
    const [appVersion, setAppVersion] = useState<string>('1.0.0');

    const {
        autoUpdateEnabled,
        updateAvailable,
        updateInfo,
        updateDownloading,
        updateDownloaded,
        updateProgress,
        checkingForUpdates,
        updateError,
    } = updateState;

    const {
        handleCheckForUpdates,
        handleDownloadUpdate,
        handleInstallUpdate,
        handleAutoUpdateToggle,
    } = updateActions;

    // 获取应用版本号
    useEffect(() => {
        const getAppVersion = async () => {
            try {
                const version = await window.electron.getVersion();
                setAppVersion(version);
            } catch (error) {
                console.error('Failed to get app version:', error);
            }
        };
        if (open) {
            getAppVersion();
        }
    }, [open]);

    // 处理重置窗口大小
    const handleResetWindowSize = async () => {
        try {
            const result = await window.electron.resetWindowSize();
            if (result) {
                // 同步重置文件浏览器的缩放等级
                window.dispatchEvent(new CustomEvent('ta:reset-grid-zoom'));
                onShowSnackbar(`窗口大小与缩放等级已重置为默认值 (${result.width} × ${result.height})`, 'success');
            } else {
                onShowSnackbar('重置窗口大小失败，请重试。', 'error');
            }
        } catch (error) {
            console.error('重置窗口大小时出错:', error);
            onShowSnackbar('重置窗口大小时出现错误，请重试。', 'error');
        }
    };

    // 清除所有缓存的函数
    const handleClearCache = async () => {
        try {
            // 1. 首先调用主进程清除磁盘缓存（缩略图和 electron-store）
            const result = await window.electron.clearAllCache();
            if (!result.success) {
                console.error('主进程缓存清除失败:', result.errors || result.error);
            }

            // 2. 清除所有 localStorage 中的应用数据
            const keysToRemove = [
                'tagAnything_locations',
                'tagAnything_selectedLocation',
                'tagAnything_tagGroups',
                'tagAnything_videoThumbnails',
                'tagAnything_filter',
                'tagAnything_multiFilter',
                'tagAnything_currentPath',
                'tagAnything_gridSize',
                'autoUpdateEnabled',
            ];

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            // 清除 sessionStorage
            sessionStorage.clear();

            // 显示成功消息并关闭对话框
            onShowSnackbar('缓存已成功清除！应用将在下次启动时重置为默认状态。', 'success');
            setClearCacheConfirmOpen(false);
            onClose();

            // 延迟重新加载页面，让用户看到成功消息
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('清除缓存时出错:', error);
            onShowSnackbar('清除缓存时出现错误，请重试。', 'error');
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>设置</DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {/* Window Settings */}
                        <Grid item xs={12}>
                            <Box sx={{
                                p: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <Typography variant="h6" sx={{
                                    mb: 2,
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    🪟 窗口设置
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    默认窗口大小: 1280 × 960 像素
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    窗口大小会自动保存，下次启动时恢复
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={handleResetWindowSize}
                                    sx={{ textTransform: 'none' }}
                                >
                                    重置窗口大小
                                </Button>
                            </Box>
                        </Grid>

                        {/* Cache Management */}
                        <Grid item xs={12}>
                            <Box sx={{
                                p: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <Typography variant="h6" sx={{
                                    mb: 2,
                                    color: 'warning.main',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    🗂️ 缓存管理
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    清除所有应用缓存数据，包括视频缩略图、浏览器缓存、应用设置等
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    onClick={() => setClearCacheConfirmOpen(true)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    清除所有缓存
                                </Button>
                            </Box>
                        </Grid>

                        {/* Auto Update Settings */}
                        <Grid item xs={12}>
                            <Box sx={{
                                p: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <Typography variant="h6" sx={{
                                    mb: 2,
                                    color: 'success.main',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    🔄 自动更新
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.primary">
                                            启动时自动检查更新
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                            应用启动时自动检查是否有新版本可用
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={autoUpdateEnabled}
                                        onChange={(e) => handleAutoUpdateToggle(e.target.checked)}
                                        color="primary"
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={handleCheckForUpdates}
                                        disabled={checkingForUpdates}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {checkingForUpdates ? '检查中...' : '手动检查更新'}
                                    </Button>

                                    {updateAvailable && !updateDownloaded && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleDownloadUpdate}
                                            disabled={updateDownloading}
                                            startIcon={updateDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            {updateDownloading ? `下载中 ${Math.round(updateProgress)}%` : '下载更新'}
                                        </Button>
                                    )}

                                    {updateDownloaded && (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            onClick={handleInstallUpdate}
                                            startIcon={<UpdateIcon />}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            安装并重启
                                        </Button>
                                    )}
                                </Box>

                                {updateDownloading && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            下载进度: {Math.round(updateProgress)}%
                                        </Typography>
                                        <LinearProgress variant="determinate" value={updateProgress} />
                                    </Box>
                                )}

                                {updateError && (
                                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                        {updateError}
                                    </Typography>
                                )}
                            </Box>
                        </Grid>

                        {/* About */}
                        <Grid item xs={12}>
                            <Box sx={{
                                p: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <Typography variant="h6" sx={{
                                    mb: 2,
                                    color: 'info.main',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    ℹ️ 关于
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" color="text.primary">
                                        <strong>TagAnything</strong>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        版本: {appVersion}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        一个功能强大的标签管理工具
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="primary">
                        关闭
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Clear Cache Confirmation Dialog */}
            <Dialog
                open={clearCacheConfirmOpen}
                onClose={() => setClearCacheConfirmOpen(false)}
                aria-labelledby="clear-cache-dialog-title"
            >
                <DialogTitle id="clear-cache-dialog-title">
                    确认清除缓存
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        您确定要清除所有缓存数据吗？
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        此操作将清除以下数据：
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="ul" sx={{ mt: 1, pl: 2 }}>
                        <li>位置信息与标签组设置</li>
                        <li>视频缩略图缓存</li>
                        <li>浏览器缓存（Local Storage、Session Storage 等）</li>
                        <li>窗口状态与应用设置</li>
                        <li>其他用户数据</li>
                    </Typography>
                    <Typography variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 'bold' }}>
                        此操作无法撤销，应用将重新加载。
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearCacheConfirmOpen(false)} color="primary">
                        取消
                    </Button>
                    <Button onClick={handleClearCache} color="warning" variant="contained">
                        确认清除
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SettingsDialog;
