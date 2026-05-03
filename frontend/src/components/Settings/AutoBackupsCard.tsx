import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Chip,
    CircularProgress,
    useTheme,
    alpha,
    Stack,
    Button,
} from '@mui/material';
import {
    HistoryRounded,
    DownloadRounded,
    RestoreRounded,
    RefreshRounded,
    EventRounded,
} from '@mui/icons-material';
import { backupService, type AutoBackupItem } from '../../services/backupService';
import { useNotification } from '../../contexts/NotificationContext';
import RestoreBackupDialog from './RestoreBackupDialog';

const TAG_LABELS: Record<string, { label: string; color: string }> = {
    daily: { label: 'يومي', color: '#10B981' },
    'pre-reset': { label: 'قبل إعادة التعيين', color: '#EF4444' },
    'pre-restore': { label: 'قبل الاستعادة', color: '#F59E0B' },
    manual: { label: 'يدوي', color: '#4F46E5' },
};

function formatBytes(n: number) {
    if (n < 1024) return `${n} بايت`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ك.ب`;
    return `${(n / 1024 / 1024).toFixed(2)} م.ب`;
}

export default function AutoBackupsCard() {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const { showNotification } = useNotification();

    const [items, setItems] = useState<AutoBackupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [snapshotting, setSnapshotting] = useState(false);
    const [directory, setDirectory] = useState<string>('');
    const [kept, setKept] = useState<number>(7);
    const [restoreTarget, setRestoreTarget] = useState<AutoBackupItem | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await backupService.listAuto();
            setItems(res.items);
            setKept(res.kept);
            setDirectory(res.directory);
        } catch {
            // network/backend issue — leave empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const handleManualSnapshot = async () => {
        setSnapshotting(true);
        try {
            await backupService.takeManualSnapshot();
            showNotification('تم إنشاء نسخة احتياطية فورية', 'success');
            await refresh();
        } catch {
            showNotification('تعذّر إنشاء النسخة', 'error');
        } finally {
            setSnapshotting(false);
        }
    };

    const downloadAuto = (filename: string) => {
        const url = backupService.autoDownloadUrl(filename);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    justifyContent: 'space-between',
                    bgcolor: alpha(theme.palette.primary.main, isLight ? 0.04 : 0.1),
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryRounded sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={800}>
                        النسخ التلقائية
                    </Typography>
                    <Chip
                        size="small"
                        label={`الاحتفاظ بآخر ${kept}`}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="إنشاء نسخة الآن">
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleManualSnapshot}
                                disabled={snapshotting}
                            >
                                {snapshotting ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <EventRounded fontSize="small" />
                                )}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="تحديث">
                        <IconButton size="small" onClick={refresh} disabled={loading}>
                            <RefreshRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Box sx={{ p: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : items.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            لا توجد نسخ احتياطية تلقائية بعد.
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            يتم إنشاؤها تلقائياً مرة في اليوم وقبل أي إعادة تعيين أو استعادة.
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 2, borderRadius: 2 }}
                            onClick={handleManualSnapshot}
                            disabled={snapshotting}
                        >
                            إنشاء نسخة الآن
                        </Button>
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {items.map((item) => {
                            const tagInfo = item.tag ? TAG_LABELS[item.tag] : null;
                            const dt = new Date(item.modified);
                            const friendly =
                                isNaN(dt.getTime())
                                    ? item.filename
                                    : dt.toLocaleString('ar-DZ', {
                                          dateStyle: 'medium',
                                          timeStyle: 'short',
                                      });
                            return (
                                <Box
                                    key={item.filename}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        py: 1,
                                        px: 1.5,
                                        borderRadius: 2,
                                        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, isLight ? 0.04 : 0.08),
                                        },
                                    }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography variant="body2" fontWeight={700}>
                                                {friendly}
                                            </Typography>
                                            {tagInfo && (
                                                <Chip
                                                    size="small"
                                                    label={tagInfo.label}
                                                    sx={{
                                                        height: 18,
                                                        fontSize: '0.65rem',
                                                        bgcolor: alpha(tagInfo.color, 0.15),
                                                        color: tagInfo.color,
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                display: 'block',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {item.filename} · {formatBytes(item.size)}
                                        </Typography>
                                    </Box>
                                    <Tooltip title="تنزيل">
                                        <IconButton
                                            size="small"
                                            onClick={() => downloadAuto(item.filename)}
                                        >
                                            <DownloadRounded fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="استعادة">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => setRestoreTarget(item)}
                                        >
                                            <RestoreRounded fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            );
                        })}
                        {directory && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 1, textAlign: 'center' }}
                            >
                                المجلد: {directory}
                            </Typography>
                        )}
                    </Stack>
                )}
            </Box>

            <RestoreBackupDialog
                open={!!restoreTarget}
                onClose={() => setRestoreTarget(null)}
                autoFilename={restoreTarget?.filename ?? null}
                autoLabel={
                    restoreTarget
                        ? `${new Date(restoreTarget.modified).toLocaleString('ar-DZ')} (${restoreTarget.filename})`
                        : null
                }
            />
        </Paper>
    );
}
