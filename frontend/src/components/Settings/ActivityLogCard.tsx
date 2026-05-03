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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    EventNoteRounded,
    RefreshRounded,
    DeleteSweepRounded,
    InfoOutlined,
    CheckCircleOutlined,
    WarningAmberOutlined,
    ErrorOutlineOutlined,
} from '@mui/icons-material';
import {
    activityService,
    type ActivityEntry,
    type ActivitySeverity,
} from '../../services/activityService';
import { useNotification } from '../../contexts/NotificationContext';

const PAGE_SIZE = 50;

const SEVERITY_META: Record<
    ActivitySeverity,
    { label: string; color: string; icon: React.ReactNode }
> = {
    info: { label: 'معلومات', color: '#3B82F6', icon: <InfoOutlined fontSize="small" /> },
    success: {
        label: 'نجاح',
        color: '#10B981',
        icon: <CheckCircleOutlined fontSize="small" />,
    },
    warning: {
        label: 'تحذير',
        color: '#F59E0B',
        icon: <WarningAmberOutlined fontSize="small" />,
    },
    critical: {
        label: 'حرج',
        color: '#EF4444',
        icon: <ErrorOutlineOutlined fontSize="small" />,
    },
};

// Map raw action codes → friendly Arabic group labels for the filter dropdown.
// We intentionally keep this list focused on the high-traffic categories; rare
// actions still appear in the list itself with their raw code as a chip.
const ACTION_GROUPS: Array<{ value: string; label: string }> = [
    { value: '', label: 'كل النشاطات' },
    { value: 'product.created', label: 'إضافة منتج' },
    { value: 'product.updated', label: 'تعديل منتج' },
    { value: 'product.deleted', label: 'حذف منتج' },
    { value: 'inventory.adjusted', label: 'تعديل مخزون' },
    { value: 'category.created', label: 'إضافة فئة' },
    { value: 'category.updated', label: 'تعديل فئة' },
    { value: 'category.deleted', label: 'حذف فئة' },
    { value: 'sale.completed', label: 'إتمام بيع' },
    { value: 'sale.cancelled', label: 'إلغاء بيع' },
    { value: 'sale.deleted', label: 'حذف فاتورة' },
    { value: 'customer.created', label: 'إضافة عميل' },
    { value: 'customer.updated', label: 'تعديل عميل' },
    { value: 'customer.deleted', label: 'حذف عميل' },
    { value: 'customer.payment_recorded', label: 'تسجيل دفعة' },
    { value: 'backup.manual_snapshot', label: 'نقطة استعادة يدوية' },
    { value: 'backup.scheduled_snapshot', label: 'نقطة استعادة مجدولة' },
    { value: 'backup.restored', label: 'استعادة من نقطة' },
    { value: 'backup.imported', label: 'استيراد نسخة' },
    { value: 'system.factory_reset', label: 'إعادة الضبط' },
    { value: 'settings.auto_backup.updated', label: 'تعديل الجدولة' },
];

const SEVERITY_OPTIONS: Array<{ value: '' | ActivitySeverity; label: string }> = [
    { value: '', label: 'كل المستويات' },
    { value: 'info', label: 'معلومات' },
    { value: 'success', label: 'نجاح' },
    { value: 'warning', label: 'تحذير' },
    { value: 'critical', label: 'حرج' },
];

const RANGE_OPTIONS: Array<{ value: number | null; label: string }> = [
    { value: null, label: 'الكل' },
    { value: 60, label: 'آخر ساعة' },
    { value: 60 * 24, label: 'آخر 24 ساعة' },
    { value: 60 * 24 * 7, label: 'آخر أسبوع' },
    { value: 60 * 24 * 30, label: 'آخر شهر' },
];

function formatTime(iso: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('ar-DZ', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export default function ActivityLogCard() {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const { showNotification } = useNotification();

    const [items, setItems] = useState<ActivityEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [actionFilter, setActionFilter] = useState<string>('');
    const [severityFilter, setSeverityFilter] = useState<'' | ActivitySeverity>('');
    const [rangeMinutes, setRangeMinutes] = useState<number | null>(null);

    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [clearing, setClearing] = useState(false);

    const fetchPage = useCallback(
        async (nextOffset: number, append: boolean) => {
            if (append) setLoadingMore(true);
            else setLoading(true);
            try {
                const res = await activityService.list({
                    limit: PAGE_SIZE,
                    offset: nextOffset,
                    action: actionFilter || undefined,
                    severity: severityFilter || undefined,
                    sinceMinutes: rangeMinutes ?? undefined,
                });
                setTotal(res.total);
                setOffset(nextOffset + res.items.length);
                setItems((prev) => (append ? [...prev, ...res.items] : res.items));
            } catch {
                if (!append) setItems([]);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [actionFilter, severityFilter, rangeMinutes],
    );

    useEffect(() => {
        void fetchPage(0, false);
    }, [fetchPage]);

    const handleClear = async () => {
        setClearing(true);
        try {
            await activityService.clear();
            showNotification('تم مسح سجل النشاطات', 'success');
            setConfirmClearOpen(false);
            await fetchPage(0, false);
        } catch {
            showNotification('تعذّر مسح السجل', 'error');
        } finally {
            setClearing(false);
        }
    };

    const hasMore = useMemo(() => items.length < total, [items.length, total]);

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
                    <EventNoteRounded sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={800}>
                        سجل النشاطات
                    </Typography>
                    <Chip
                        size="small"
                        label={`الإجمالي: ${total}`}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="تحديث">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => fetchPage(0, false)}
                                disabled={loading}
                            >
                                <RefreshRounded fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="مسح كل السجلات">
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => setConfirmClearOpen(true)}
                                disabled={loading || total === 0}
                            >
                                <DeleteSweepRounded fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            {/* Filters */}
            <Box
                sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    bgcolor: alpha(theme.palette.background.default, 0.4),
                }}
            >
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>النوع</InputLabel>
                    <Select
                        label="النوع"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(String(e.target.value))}
                    >
                        {ACTION_GROUPS.map((g) => (
                            <MenuItem key={g.value || 'all'} value={g.value}>
                                {g.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>المستوى</InputLabel>
                    <Select
                        label="المستوى"
                        value={severityFilter}
                        onChange={(e) =>
                            setSeverityFilter(e.target.value as '' | ActivitySeverity)
                        }
                    >
                        {SEVERITY_OPTIONS.map((s) => (
                            <MenuItem key={s.value || 'all'} value={s.value}>
                                {s.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>الفترة</InputLabel>
                    <Select
                        label="الفترة"
                        value={rangeMinutes === null ? '' : String(rangeMinutes)}
                        onChange={(e) => {
                            const v = e.target.value;
                            setRangeMinutes(v === '' ? null : Number(v));
                        }}
                    >
                        {RANGE_OPTIONS.map((r) => (
                            <MenuItem key={String(r.value)} value={r.value === null ? '' : String(r.value)}>
                                {r.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* List */}
            <Box sx={{ p: 2 }}>
                {loading && items.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : items.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            لا توجد نشاطات تطابق المرشّحات الحالية.
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={0.75}>
                        {items.map((entry) => {
                            const sev = SEVERITY_META[entry.severity] ?? SEVERITY_META.info;
                            return (
                                <Box
                                    key={entry.id}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 1.25,
                                        py: 1,
                                        px: 1.5,
                                        borderRadius: 2,
                                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                        borderInlineStart: `3px solid ${sev.color}`,
                                        bgcolor: alpha(sev.color, isLight ? 0.04 : 0.08),
                                    }}
                                >
                                    <Box
                                        sx={{
                                            mt: '2px',
                                            color: sev.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {sev.icon}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 1,
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <Typography variant="body2" fontWeight={700}>
                                                {entry.summary || entry.action}
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={entry.action}
                                                sx={{
                                                    height: 18,
                                                    fontSize: '0.65rem',
                                                    fontFamily: 'monospace',
                                                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                                                }}
                                            />
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: 'block' }}
                                        >
                                            {formatTime(entry.created_at)} · {entry.actor}
                                            {entry.entity_type
                                                ? ` · ${entry.entity_type}${
                                                      entry.entity_id ? ` #${entry.entity_id}` : ''
                                                  }`
                                                : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                        {hasMore && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
                                <Button
                                    onClick={() => fetchPage(offset, true)}
                                    disabled={loadingMore}
                                    size="small"
                                    sx={{ borderRadius: 2 }}
                                >
                                    {loadingMore ? <CircularProgress size={18} /> : 'تحميل المزيد'}
                                </Button>
                            </Box>
                        )}
                    </Stack>
                )}
            </Box>

            {/* Confirm clear */}
            <Dialog
                open={confirmClearOpen}
                onClose={() => (clearing ? null : setConfirmClearOpen(false))}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>مسح سجل النشاطات؟</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        سيتم حذف جميع السجلات نهائياً. لا تتأثر بياناتك (المنتجات، المبيعات، إلخ)
                        ولا نقاط الاستعادة. لن يمكن التراجع عن هذه العملية.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmClearOpen(false)} disabled={clearing}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleClear}
                        disabled={clearing}
                        startIcon={
                            clearing ? <CircularProgress size={14} /> : <DeleteSweepRounded />
                        }
                    >
                        مسح السجل
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
