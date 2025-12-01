import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    LinearProgress,
    CircularProgress,
} from '@mui/material';
import {
    SystemUpdate as UpdateIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';

interface UpdateDialogProps {
    open: boolean;
    onClose: () => void;
    updateInfo: any;
    updateDownloading: boolean;
    updateProgress: number;
    onDownload: () => void;
    onInstall: () => void; // Not used in this dialog usually, but maybe for "Install and Restart" if we want to reuse it? 
    // Actually the original code has "Download" and "Open External". 
    // And "Install" button is in the Settings page usually, or replaces Download button?
    // Original code (lines 1151-1272) has "Manual Download" (external), "Download Update" (internal).
    // It doesn't seem to have "Install" button in the popup, only "Download". 
    // Wait, line 986 in Settings has "Install".
    // The popup (1262) calls `handleDownloadUpdate`.
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({
    open,
    onClose,
    updateInfo,
    updateDownloading,
    updateProgress,
    onDownload,
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UpdateIcon color="primary" />
                    发现新版本
                </Box>
            </DialogTitle>
            <DialogContent>
                {updateInfo && (
                    <Box>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            有新版本可用，是否要下载并安装？
                        </Typography>
                        <Box sx={{
                            bgcolor: 'background.default',
                            border: '1px solid',
                            borderColor: 'divider',
                            p: 2,
                            borderRadius: 1,
                            mb: 2
                        }}>
                            <Typography variant="body2" color="text.primary">
                                <strong>当前版本:</strong> {updateInfo.currentVersion}
                            </Typography>
                            <Typography variant="body2" color="text.primary">
                                <strong>最新版本:</strong> {updateInfo.version}
                            </Typography>
                            {updateInfo.releaseDate && (
                                <Typography variant="body2" color="text.primary">
                                    <strong>发布日期:</strong> {new Date(updateInfo.releaseDate).toLocaleDateString('zh-CN')}
                                </Typography>
                            )}
                        </Box>
                        {updateInfo.releaseNotes && (
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                    更新内容:
                                </Typography>
                                <Box
                                    sx={{
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 2,
                                        maxHeight: 300,
                                        overflow: 'auto',
                                        '& h2': {
                                            fontSize: '1.1rem',
                                            fontWeight: 'bold',
                                            margin: '0.5rem 0',
                                            color: 'primary.main'
                                        },
                                        '& h3': {
                                            fontSize: '1rem',
                                            fontWeight: 'bold',
                                            margin: '0.4rem 0',
                                            color: 'text.primary'
                                        },
                                        '& ul': {
                                            margin: '0.5rem 0',
                                            paddingLeft: '1.5rem'
                                        },
                                        '& li': {
                                            margin: '0.2rem 0',
                                            color: 'text.secondary'
                                        },
                                        '& strong': {
                                            color: 'text.primary',
                                            fontWeight: 'bold'
                                        },
                                        '& p': {
                                            margin: '0.5rem 0',
                                            color: 'text.secondary'
                                        },
                                        '& hr': {
                                            margin: '1rem 0',
                                            border: 'none',
                                            borderTop: '1px solid',
                                            borderColor: 'divider'
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
                                />
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    稍后提醒
                </Button>
                <Button
                    onClick={() => {
                        onClose();
                        // 打开外部链接到GitHub releases页面
                        if (updateInfo?.downloadUrl) {
                            window.electron.openExternal(updateInfo.downloadUrl);
                        }
                    }}
                    color="primary"
                >
                    手动下载
                </Button>
                <Button
                    onClick={() => {
                        // Don't close immediately if we want to show progress?
                        // Original code closed it: `setUpdateDialogOpen(false); handleDownloadUpdate();`
                        // So the progress is shown in Settings?
                        // Line 1263: setUpdateDialogOpen(false);
                        // Line 1264: handleDownloadUpdate();
                        // So yes, the popup closes and presumably the user can go to settings to see progress?
                        // Or maybe the progress is not shown in the popup?
                        // Wait, line 999 in Settings shows progress.
                        // But if the popup closes, where does the user see "Downloading..."?
                        // Maybe they don't, unless they open settings.
                        // That seems like a UX flaw in the original code, but I will replicate it for now to avoid changing behavior too much.
                        onClose();
                        onDownload();
                    }}
                    color="primary"
                    variant="contained"
                >
                    立即更新
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UpdateDialog;
