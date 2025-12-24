import { useState, useEffect } from 'react';

interface UpdateInfo {
    version: string;
    releaseDate?: string;
    releaseNotes?: string;
    currentVersion: string;
    downloadUrl: string;
}

interface UseAppUpdateProps {
    showSnackbar: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useAppUpdate = ({ showSnackbar }: UseAppUpdateProps) => {
    const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [updateDownloading, setUpdateDownloading] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [updateProgress, setUpdateProgress] = useState(0);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [checkingForUpdates, setCheckingForUpdates] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    useEffect(() => {
        // 监听自动更新事件
        const unsubscribeChecking = window.electron.onUpdateChecking(() => {
            setCheckingForUpdates(true);
            setUpdateError(null);
        });

        const unsubscribeAvailable = window.electron.onUpdateAvailable((info: any) => {
            setCheckingForUpdates(false);
            setUpdateAvailable(true);
            setUpdateInfo({
                ...info,
                currentVersion: require('../../../package.json').version,
                downloadUrl: `https://github.com/FelixChristian011226/TagAnything/releases/tag/v${info.version}`
            });
            // 如果启用了自动更新，显示更新对话框
            if (autoUpdateEnabled) {
                setUpdateDialogOpen(true);
            }
        });

        const unsubscribeNotAvailable = window.electron.onUpdateNotAvailable(() => {
            setCheckingForUpdates(false);
            setUpdateAvailable(false);
            showSnackbar('当前已是最新版本！', 'info');
        });

        const unsubscribeError = window.electron.onUpdateError((error: string) => {
            setCheckingForUpdates(false);
            setUpdateError(error);
            showSnackbar(`检查更新失败: ${error}`, 'error');
        });

        const unsubscribeProgress = window.electron.onUpdateDownloadProgress((progress: any) => {
            setUpdateProgress(progress.percent || 0);
        });

        const unsubscribeDownloaded = window.electron.onUpdateDownloaded(() => {
            setUpdateDownloading(false);
            setUpdateDownloaded(true);
        });

        // 加载自动更新设置
        const initializeAutoUpdate = async () => {
            try {
                // 优先从 electron-store 读取设置
                const storedSetting = await window.electron.getSetting('autoUpdateEnabled', false);
                setAutoUpdateEnabled(storedSetting);

                // 同步到 localStorage 以保持一致性
                localStorage.setItem('autoUpdateEnabled', JSON.stringify(storedSetting));
            } catch (error) {
                // 如果读取失败，从 localStorage 读取
                console.warn('从 electron-store 读取设置失败，使用 localStorage:', error);
                const savedAutoUpdate = localStorage.getItem('autoUpdateEnabled');
                const autoUpdateEnabledValue = savedAutoUpdate !== null ? JSON.parse(savedAutoUpdate) : false;
                setAutoUpdateEnabled(autoUpdateEnabledValue);
            }
        };

        initializeAutoUpdate();

        return () => {
            unsubscribeChecking();
            unsubscribeAvailable();
            unsubscribeNotAvailable();
            unsubscribeError();
            unsubscribeProgress();
            unsubscribeDownloaded();
        };
    }, [autoUpdateEnabled, showSnackbar]);

    // 手动检查更新
    const handleCheckForUpdates = async () => {
        setCheckingForUpdates(true);
        setUpdateError(null);

        try {
            const result = await window.electron.checkForUpdates();
            if (!result.success) {
                setUpdateError(result.error || '检查更新失败');
                showSnackbar(`检查更新失败: ${result.error || '未知错误'}`, 'error');
            }
        } catch (error) {
            setUpdateError('检查更新时发生未知错误');
            showSnackbar('检查更新时发生未知错误', 'error');
        } finally {
            setCheckingForUpdates(false);
        }
    };

    // 下载更新
    const handleDownloadUpdate = async () => {
        setUpdateDownloading(true);
        setUpdateProgress(0);

        try {
            const result = await window.electron.downloadUpdate();
            if (!result.success) {
                setUpdateError(result.error || '下载更新失败');
                showSnackbar(`下载更新失败: ${result.error || '未知错误'}`, 'error');
                setUpdateDownloading(false);
            }
        } catch (error) {
            setUpdateError('下载更新时发生未知错误');
            showSnackbar('下载更新时发生未知错误', 'error');
            setUpdateDownloading(false);
        }
    };

    // 安装更新
    const handleInstallUpdate = async () => {
        try {
            await window.electron.installUpdate();
        } catch (error) {
            showSnackbar('安装更新失败，请手动下载安装包', 'error');
        }
    };

    // 切换自动更新设置
    const handleAutoUpdateToggle = async (enabled: boolean) => {
        setAutoUpdateEnabled(enabled);
        // 同时保存到 localStorage 和 electron-store
        localStorage.setItem('autoUpdateEnabled', JSON.stringify(enabled));
        try {
            await window.electron.setSetting('autoUpdateEnabled', enabled);
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    };

    return {
        state: {
            autoUpdateEnabled,
            updateAvailable,
            updateInfo,
            updateDownloading,
            updateDownloaded,
            updateProgress,
            updateDialogOpen,
            checkingForUpdates,
            updateError,
        },
        actions: {
            setUpdateDialogOpen,
            handleCheckForUpdates,
            handleDownloadUpdate,
            handleInstallUpdate,
            handleAutoUpdateToggle,
        },
    };
};
