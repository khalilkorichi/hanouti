import { useCallback, useEffect, useMemo, useState } from 'react';
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
    Switch,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Divider,
} from '@mui/material';
import {
    HistoryRounded,
    DownloadRounded,
    RestoreRounded,
    RefreshRounded,
    AddPhotoAlternateOutlined,
    ScheduleRounded,
    BookmarkAddOutlined,
} from '@mui/icons-material';
import {
    backupService,
    type AutoBackupItem,
    type AutoBackupSchedule,
} from '../../services/backupService';
import { useNotification } from '../../contexts/NotificationContext';
import RestoreBackupDialog from './RestoreBackupDialog';

const TAG_LABELS: Record<string, { label: string; color: string }> = {
    daily: { label: 'يومي', color: '#10B981' },
    scheduled: { label: 'مجدول', color: '#10B981' },
    'pre-reset': { label: 'قبل إعادة التعيين', color: '#EF4444' },
    'pre-restore': { label: 'قبل الاستعادة', color: '#F59E0B' },
    manual: { label: 'يدوي', color: '#4F46E5' },
};

// Schedule presets the user can pick from. We keep these conservative — most
// shops don't want sub-hour snapshots — but allow 5min for power users.
const INTERVAL_OPTIONS: Array<{ value: number; label: string }> = [
    { value: 5, label: 'كل 5 دقائق' },
    { value: 15, label: 'كل 15 دقيقة' },
    { value: 30, label: 'كل 30 دقيقة' },
    { value: 60, label: 'كل ساعة' },
    { value: 360, label: 'كل 6 ساعات' },
    { value: 720, label: 'كل 12 ساعة' },
    { value: 1440, label: 'كل يوم' },
    { value: 4320, label: 'كل 3 أيام' },
    { value: 10080, label: 'كل أسبوع' },
];

function formatBytes(n: number) {
    if (n < 1024) return `${n} بايت`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ك.ب`;
    return `${(n / 1024 / 1024).toFixed(2)} م.ب`;
}

export default function RestorePointsCard() {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const { showNotification } = useNotification();

    const [items, setItems] = useState<AutoBackupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [snapshotting, setSnapshotting] = useState(false);
    const [directory, setDirectory] = useState<string>('');
    const [kept, setKept] = useState<number>(7);
    const [restoreTarget, setRestoreTarget] = useState<AutoBackupItem | null>(null);

    const [schedule, setSchedule] = useState<AutoBackupSchedule>({
        interval_minutes: 10080,
        enabled: true,
    });
    const [scheduleSaving, setScheduleSaving] = useState(false);

    const [namedOpen, setNamedOpen] = useState(false);
    const [snapName, setSnapName] = useState('');
    const [snapNote, setSnapNote] = useState('');

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [list, sched] = await Promise.all([
                backupService.listAuto(),
                backupService.getSchedule().catch(() => null),
            ]);
            setItems(list.items);
            setKept(list.kept);
            setDirectory(list.directory);
            if (sched) setSchedule(sched);
        } catch {
            // network/backend issue — leave empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const persistSchedule = useCallback(
        async (next: AutoBackupSchedule) => {
            setScheduleSaving(true);
            const prev = schedule;
            setSchedule(next);
            try {
                await backupService.setSchedule(next);
                showNotification('تم حفظ إعدادات الجدولة', 'success');
            } catch {
                setSchedule(prev);
                showNotification('تعذّر حفظ الإعدادات', 'error');
            } finally {
                setScheduleSaving(false);
            }
        },
        [schedule, showNotification],
    );

    const handleQuickSnapshot = async () => {
        setSnapshotting(true);
        try {
            await backupService.takeManualSnapshot();
            showNotification('تم إنشاء نقطة استعادة', 'success');
            await refresh();
        } catch {
            showNotification('تعذّر إنشاء النقطة', 'error');
        } finally {
            setSnapshotting(false);
        }
    };

    const handleNamedSnapshot = async () => {
        const name = snapName.trim();
        if (!name) {
            showNotification('الرجاء إدخال اسم للنقطة', 'warning');
            return;
        }
        setSnapshotting(true);
        try {
            await backupService.takeManualSnapshot({ name, note: snapNote.trim() || undefined });
            showNotification(`تم إنشاء نقطة الاستعادة: ${name}`, 'success');
            setNamedOpen(false);
            setSnapName('');
            setSnapNote('');
            await refresh();
        } catch {
            showNotification('تعذّر إنشاء النقطة', 'error');
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

    const intervalLabel = useMemo(
        () =>
            INTERVAL_OPTIONS.find((o) => o.value === schedule.interval_minutes)?.label ??
            `كل ${schedule.interval_minutes} دقيقة`,
        [schedule.interval_minutes],
    );

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                overflow: 'hidden',
            }}
        >
            {/* Header */}
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
                        نقاط الاستعادة
                    </Typography>
                    <Chip
                        size="small"
                        label={`الاحتفاظ بآخر ${kept}`}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="إنشاء نقطة باسم">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => setNamedOpen(true)}
                                disabled={snapshotting}
                            >
                                <BookmarkAddOutlined fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="نقطة سريعة الآن">
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleQuickSnapshot}
                                disabled={snapshotting}
                            >
                                {snapshotting ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <AddPhotoAlternateOutlined fontSize="small" />
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

            {/* Schedule controls */}
            <Box
                sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: alpha(theme.palette.background.default, 0.4),
                }}
            >
                <ScheduleRounded sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2" fontWeight={700}>
                    الجدولة التلقائية
                </Typography>
                <Box sx={{ flex: 1 }} />
                <FormControl size="small" sx={{ minWidth: 170 }} disabled={!schedule.enabled || scheduleSaving}>
                    <InputLabel>الفاصل الزمني</InputLabel>
                    <Select
                        label="الفاصل الزمني"
                        value={schedule.interval_minutes}
                        onChange={(e) =>
                            persistSchedule({
                                ...schedule,
                                interval_minutes: Number(e.target.value),
                            })
                        }
                    >
                        {INTERVAL_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Tooltip title={schedule.enabled ? intervalLabel : 'الجدولة موقوفة'}>
                    <Switch
                        checked={schedule.enabled}
                        onChange={(_, v) => persistSchedule({ ...schedule, enabled: v })}
                        disabled={scheduleSaving}
                        color="primary"
                    />
                </Tooltip>
            </Box>

            {/* List */}
            <Box sx={{ p: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : items.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            لا توجد نقاط استعادة بعد.
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            تُنشأ تلقائياً حسب الجدولة، وقبل أي إعادة تعيين أو استعادة.
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 2, borderRadius: 2 }}
                            onClick={handleQuickSnapshot}
                            disabled={snapshotting}
                        >
                            إنشاء نقطة الآن
                        </Button>
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {items.map((item) => {
                            const tagInfo = item.tag ? TAG_LABELS[item.tag] : null;
                            const dt = new Date(item.modified);
                            const friendly = isNaN(dt.getTime())
                                ? item.filename
                                : dt.toLocaleString('ar-DZ', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                  });
                            const titleLine = item.name?.trim() ? item.name : friendly;
                            const subLine = item.name?.trim() ? friendly : null;
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
                                                {titleLine}
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
                                        {subLine && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {subLine}
                                            </Typography>
                                        )}
                                        {item.note?.trim() && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                                sx={{ fontStyle: 'italic' }}
                                            >
                                                {item.note}
                                            </Typography>
                                        )}
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

            {/* Named snapshot dialog */}
            <Dialog
                open={namedOpen}
                onClose={() => (snapshotting ? null : setNamedOpen(false))}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>إنشاء نقطة استعادة باسم</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <TextField
                            autoFocus
                            label="اسم النقطة"
                            placeholder="مثلاً: قبل تعديل الأسعار"
                            value={snapName}
                            onChange={(e) => setSnapName(e.target.value)}
                            inputProps={{ maxLength: 120 }}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="ملاحظة (اختياري)"
                            value={snapNote}
                            onChange={(e) => setSnapNote(e.target.value)}
                            inputProps={{ maxLength: 500 }}
                            fullWidth
                            multiline
                            minRows={2}
                            size="small"
                        />
                        <Divider />
                        <Typography variant="caption" color="text.secondary">
                            يمكنك العودة إلى هذه النقطة لاحقاً عبر زر «استعادة» في القائمة.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setNamedOpen(false)} disabled={snapshotting}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleNamedSnapshot}
                        disabled={snapshotting || !snapName.trim()}
                        startIcon={snapshotting ? <CircularProgress size={14} /> : <BookmarkAddOutlined />}
                    >
                        إنشاء النقطة
                    </Button>
                </DialogActions>
            </Dialog>

            <RestoreBackupDialog
                open={!!restoreTarget}
                onClose={() => setRestoreTarget(null)}
                autoFilename={restoreTarget?.filename ?? null}
                autoLabel={
                    restoreTarget
                        ? restoreTarget.name?.trim()
                            ? `${restoreTarget.name} (${new Date(restoreTarget.modified).toLocaleString('ar-DZ')})`
                            : `${new Date(restoreTarget.modified).toLocaleString('ar-DZ')} (${restoreTarget.filename})`
                        : null
                }
            />
        </Paper>
    );
}
