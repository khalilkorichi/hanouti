import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Paper,
    TextField,
    InputAdornment,
    MenuItem,
    Stack,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    alpha,
    useTheme,
    Fade,
    Divider,
    LinearProgress,
    Button,
} from '@mui/material';
import {
    Edit as EditIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Inventory2Outlined as InventoryIcon,
    ErrorOutline as OutIcon,
    WarningAmber as LowIcon,
    MosqueOutlined as ZakatIcon,
    CheckCircleOutline as PassedIcon,
    RadioButtonUnchecked as PendingIcon,
    InfoOutlined as InfoIcon,
    DeleteOutline as DeleteIcon,
    FileDownloadOutlined as ExportCsvIcon,
    PlaylistRemoveOutlined as ZeroStockIcon,
    TuneOutlined as SetMinQtyIcon,
} from '@mui/icons-material';
import { DataGrid, useGridApiRef, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import { CustomButton, UnifiedModal, BulkActionsBar, SearchInput } from '../components/Common';
import { productService, type Product } from '../services/productService';
import { useNotification } from '../contexts/NotificationContext';

/* ── Stat card ── */
interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    sub?: string;
    onClick?: () => void;
    clickable?: boolean;
}

function StatCard({ label, value, icon, color, sub, onClick, clickable }: StatCardProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                p: 2.5, borderRadius: 3, flex: 1, minWidth: 180,
                border: `1px solid ${alpha(color, 0.25)}`,
                background: isLight
                    ? `linear-gradient(135deg, ${alpha(color, 0.06)}, ${alpha(color, 0.02)})`
                    : `linear-gradient(135deg, ${alpha(color, 0.14)}, ${alpha(color, 0.05)})`,
                position: 'relative', overflow: 'hidden',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'all 0.2s',
                ...(clickable && {
                    '&:hover': {
                        boxShadow: `0 6px 20px ${alpha(color, 0.2)}`,
                        transform: 'translateY(-2px)',
                        borderColor: alpha(color, 0.5),
                    }
                }),
            }}
        >
            <Box sx={{
                position: 'absolute', top: -16, left: -16,
                width: 80, height: 80, borderRadius: '50%',
                bgcolor: alpha(color, 0.08),
            }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(color, 0.12), color, display: 'flex' }}>
                    {icon}
                </Box>
                {sub && (
                    <Typography variant="caption" fontWeight={600}
                        sx={{ color: alpha(theme.palette.text.primary, 0.5), fontSize: '0.7rem' }}>
                        {sub}
                    </Typography>
                )}
                {clickable && (
                    <Typography variant="caption" sx={{ color: alpha(color, 0.7), fontSize: '0.68rem', fontWeight: 700, letterSpacing: 0.3 }}>
                        انقر للحساب ←
                    </Typography>
                )}
            </Box>
            <Typography variant="h5" fontWeight={800} color={color} sx={{ lineHeight: 1.2, mb: 0.4 }}>
                {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
        </Paper>
    );
}

/* ─────────────────────────────────────────
   Zakat Calculator Dialog
───────────────────────────────────────── */
const HAWL_DAYS = 354; /* one lunar year */
const ZAKAT_RATE = 0.025;
const NISAB_KEY = 'hanouti_zakat_nisab';
const HAWL_KEY  = 'hanouti_zakat_hawl_date';

function ZakatDialog({ open, onClose, inventoryValue }: { open: boolean; onClose: () => void; inventoryValue: number }) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    const [nisab, setNisab] = useState<number>(() => {
        const saved = localStorage.getItem(NISAB_KEY);
        return saved ? parseFloat(saved) : 476_000;
    });
    const [hawlDate, setHawlDate] = useState<string>(() => {
        return localStorage.getItem(HAWL_KEY) || '';
    });

    useEffect(() => { localStorage.setItem(NISAB_KEY, String(nisab)); }, [nisab]);
    useEffect(() => { if (hawlDate) localStorage.setItem(HAWL_KEY, hawlDate); }, [hawlDate]);

    const calc = useMemo(() => {
        const exceedsNisab = inventoryValue >= nisab;
        const zakatAmount  = exceedsNisab ? inventoryValue * ZAKAT_RATE : 0;

        let daysPassed = 0;
        let daysLeft = HAWL_DAYS;
        let hawlComplete = false;
        let hawlProgress = 0;
        let dueDate = '';

        if (hawlDate) {
            const start = new Date(hawlDate);
            const now   = new Date();
            daysPassed  = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
            daysLeft    = Math.max(0, HAWL_DAYS - daysPassed);
            hawlComplete = daysPassed >= HAWL_DAYS;
            hawlProgress = Math.min(100, (daysPassed / HAWL_DAYS) * 100);
            const due   = new Date(start);
            due.setDate(due.getDate() + HAWL_DAYS);
            dueDate     = due.toLocaleDateString('ar-DZ');
        }

        const zakatDue = exceedsNisab && hawlComplete;
        return { exceedsNisab, zakatAmount, daysPassed, daysLeft, hawlComplete, hawlProgress, dueDate, zakatDue };
    }, [inventoryValue, nisab, hawlDate]);

    const fmt = (n: number) => n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' دج';

    const statusColor = calc.zakatDue ? '#EF4444' : calc.exceedsNisab ? '#F59E0B' : '#10B981';
    const statusLabel = calc.zakatDue
        ? 'الزكاة واجبة الآن'
        : calc.exceedsNisab
            ? 'بلغ النصاب — الحول قيد التتبع'
            : 'لم يبلغ النصاب بعد';

    return (
        <UnifiedModal
            open={open}
            onClose={onClose}
            title="حاسبة زكاة عروض التجارة"
            maxWidth="sm"
            actions={
                <CustomButton onClick={onClose} color="inherit">إغلاق</CustomButton>
            }
        >
            <Box dir="rtl">

                {/* Status banner */}
                <Box sx={{
                    p: 2, borderRadius: 2.5, mb: 3,
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    bgcolor: alpha(statusColor, isLight ? 0.08 : 0.14),
                    border: `1.5px solid ${alpha(statusColor, 0.3)}`,
                }}>
                    {calc.zakatDue
                        ? <WarningIcon sx={{ color: statusColor, fontSize: 24 }} />
                        : calc.exceedsNisab
                            ? <PendingIcon sx={{ color: statusColor, fontSize: 24 }} />
                            : <PassedIcon sx={{ color: statusColor, fontSize: 24 }} />}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={800} color={statusColor}>{statusLabel}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            قيمة المخزون الحالية: {fmt(inventoryValue)}
                        </Typography>
                    </Box>
                </Box>

                {/* Config fields */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            قيمة النصاب (دج) <Tooltip title="يساوي 595 غرام فضة أو 85 غرام ذهب — يمكنك تعديله حسب أسعار اليوم" arrow><InfoIcon sx={{ fontSize: 14, cursor: 'help', verticalAlign: 'middle', color: 'text.disabled' }} /></Tooltip>
                        </Typography>
                        <TextField
                            fullWidth size="small" type="number"
                            value={nisab}
                            onChange={(e) => setNisab(parseFloat(e.target.value) || 0)}
                            InputProps={{ endAdornment: <InputAdornment position="end">دج</InputAdornment> }}
                        />
                    </Box>
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            تاريخ بلوغ النصاب (بداية الحول) <Tooltip title="أدخل التاريخ الذي بلغ فيه مخزونك النصاب لأول مرة" arrow><InfoIcon sx={{ fontSize: 14, cursor: 'help', verticalAlign: 'middle', color: 'text.disabled' }} /></Tooltip>
                        </Typography>
                        <TextField
                            fullWidth size="small" type="date"
                            value={hawlDate}
                            onChange={(e) => setHawlDate(e.target.value)}
                            inputProps={{ max: new Date().toISOString().split('T')[0] }}
                        />
                    </Box>
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Results */}
                <Stack spacing={2}>
                    {/* Nisab comparison */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <InfoRow
                            label="قيمة المخزون"
                            value={fmt(inventoryValue)}
                            color={theme.palette.primary.main}
                        />
                        <InfoRow
                            label="النصاب المطلوب"
                            value={fmt(nisab)}
                            color="#8B5CF6"
                        />
                    </Box>

                    {/* Hawl progress */}
                    {hawlDate && (
                        <Box sx={{
                            p: 2, borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    تقدم الحول القمري ({HAWL_DAYS} يوم)
                                </Typography>
                                <Typography variant="caption" fontWeight={700} color={calc.hawlComplete ? '#10B981' : 'primary.main'}>
                                    {calc.daysPassed} / {HAWL_DAYS} يوم
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={calc.hawlProgress}
                                sx={{
                                    height: 8, borderRadius: 4,
                                    bgcolor: alpha(theme.palette.divider, 0.4),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                        bgcolor: calc.hawlComplete ? '#10B981' : '#F59E0B',
                                    }
                                }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.8 }}>
                                <Typography variant="caption" color="text.disabled">
                                    {calc.hawlComplete
                                        ? '✅ اكتمل الحول'
                                        : `⏳ متبقٍّ ${calc.daysLeft} يوم`}
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    تاريخ الاستحقاق: {calc.dueDate}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {!hawlDate && (
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#F59E0B', 0.07), border: `1px dashed ${alpha('#F59E0B', 0.4)}` }}>
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                أدخل تاريخ بلوغ النصاب لحساب الحول وموعد استحقاق الزكاة
                            </Typography>
                        </Box>
                    )}

                    {/* Zakat amount */}
                    <Box sx={{
                        p: 2.5, borderRadius: 2.5,
                        background: calc.zakatDue
                            ? `linear-gradient(135deg, ${alpha('#EF4444', 0.1)}, ${alpha('#EF4444', 0.05)})`
                            : calc.exceedsNisab
                                ? `linear-gradient(135deg, ${alpha('#F59E0B', 0.08)}, ${alpha('#F59E0B', 0.03)})`
                                : alpha(theme.palette.action.hover, 0.3),
                        border: `2px solid ${alpha(statusColor, 0.3)}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <Box>
                            <Typography variant="body2" fontWeight={700} color="text.secondary">
                                مقدار الزكاة الواجبة
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                                2.5% من قيمة المخزون {calc.exceedsNisab ? '' : '(لم يبلغ النصاب)'}
                            </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight={900} color={statusColor}>
                            {fmt(calc.zakatAmount)}
                        </Typography>
                    </Box>

                    {/* Islamic note */}
                    <Box sx={{
                        p: 1.5, borderRadius: 2,
                        bgcolor: alpha('#4F46E5', 0.04),
                        border: `1px solid ${alpha('#4F46E5', 0.1)}`,
                        display: 'flex', gap: 1,
                    }}>
                        <InfoIcon sx={{ fontSize: 16, color: '#4F46E5', mt: 0.2, flexShrink: 0 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            زكاة عروض التجارة: تجب على التاجر المسلم إذا بلغت قيمة بضاعته النصاب وحال عليها الحول القمري (354 يوماً).
                            المعدل: 2.5% من قيمة البضاعة بسعر الشراء أو البيع حسب رأي الفقهاء.
                        </Typography>
                    </Box>
                </Stack>

            </Box>
        </UnifiedModal>
    );
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
    const theme = useTheme();
    return (
        <Box sx={{
            p: 1.5, borderRadius: 2, textAlign: 'center',
            bgcolor: alpha(color, 0.05),
            border: `1px solid ${alpha(color, 0.15)}`,
        }}>
            <Typography variant="h6" fontWeight={800} color={color} sx={{ fontSize: '0.95rem' }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
    );
}

/* ═══════════════════════════════════════ */
export default function Inventory() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 350);
    const [stockStatusFilter, setStockStatusFilter] = useState<string>('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showZakat, setShowZakat] = useState(false);
    const [editForm, setEditForm] = useState({ stock_qty: 0, purchase_price: 0, sale_price: 0, min_qty: 0 });

    /* ── Bulk selection ── */
    const apiRef = useGridApiRef();
    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });
    const [gridKey, setGridKey] = useState(0);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [showBulkMinQty, setShowBulkMinQty] = useState(false);
    const [bulkMinQtyValue, setBulkMinQtyValue] = useState(5);
    const [bulkLoading, setBulkLoading] = useState(false);

    const { showNotification } = useNotification();
    const queryClient = useQueryClient();
    const theme = useTheme();

    /* Paged query for the DataGrid */
    const { data: products, isLoading } = useQuery({
        queryKey: ['inventory', debouncedSearch, stockStatusFilter, page, pageSize],
        queryFn: () => productService.getAll({
            query: debouncedSearch || undefined,
            skip: page * pageSize,
            limit: pageSize,
        })
    });

    /* Full query for accurate stats */
    const { data: allProducts } = useQuery({
        queryKey: ['inventory-all-stats'],
        queryFn: () => productService.getAll({ limit: 10000 }),
        staleTime: 30_000,
    });

    /* ── Computed stats ── */
    const stats = useMemo(() => {
        const list = allProducts || [];
        const totalValue = list.reduce((s, p) => s + (p.stock_qty ?? 0) * (p.purchase_price ?? 0), 0);
        const outCount   = list.filter(p => p.stock_qty <= 0).length;
        const lowCount   = list.filter(p => p.stock_qty > 0 && p.stock_qty <= p.min_qty).length;
        return { totalValue, outCount, lowCount, total: list.length };
    }, [allProducts]);

    /* Filtered rows */
    const filteredRows = useMemo(() => {
        let rows = products || [];
        if (stockStatusFilter === 'out') rows = rows.filter(p => p.stock_qty <= 0);
        else if (stockStatusFilter === 'low') rows = rows.filter(p => p.stock_qty > 0 && p.stock_qty <= p.min_qty);
        else if (stockStatusFilter === 'ok') rows = rows.filter(p => p.stock_qty > p.min_qty);
        return rows;
    }, [products, stockStatusFilter]);

    /* Mutation */
    const updateProductMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
            productService.update(id, data as Product),
        onSuccess: () => {
            showNotification('تم تحديث المنتج بنجاح', 'success');
            setShowEditModal(false);
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-all-stats'] });
        },
        onError: (error) => {
            showNotification('فشل تحديث المنتج: ' + error, 'error');
        }
    });

    const getStockStatus = (product: Product) => {
        if (product.stock_qty <= 0) return { color: 'error', label: 'نفد', icon: <CancelIcon /> };
        if (product.stock_qty <= product.min_qty) return { color: 'warning', label: 'منخفض', icon: <WarningIcon /> };
        return { color: 'success', label: 'كافي', icon: <CheckCircleIcon /> };
    };

    const handleEditClick = (product: Product) => {
        setSelectedProduct(product);
        setEditForm({
            stock_qty: product.stock_qty,
            purchase_price: product.purchase_price,
            sale_price: product.sale_price,
            min_qty: product.min_qty
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = () => {
        if (!selectedProduct) return;
        updateProductMutation.mutate({ id: selectedProduct.id, data: editForm as Partial<Product> });
    };

    /* ── Bulk actions ── */
    const selectedIds = useMemo(() => Array.from(rowSelectionModel.ids) as number[], [rowSelectionModel]);
    const allAvailableIds = useMemo(() => (filteredRows || []).map(r => r.id), [filteredRows]);
    const isAllSelected = allAvailableIds.length > 0 && selectedIds.length === allAvailableIds.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            apiRef.current.setRowSelectionModel({ type: 'include', ids: new Set() });
        } else {
            apiRef.current.setRowSelectionModel({ type: 'include', ids: new Set(allAvailableIds) });
        }
    };

    const selectedRows = useMemo(
        () => (filteredRows || []).filter(p => selectedIds.includes(p.id)),
        [filteredRows, selectedIds]
    );

    const handleBulkDelete = async () => {
        setBulkLoading(true);
        let success = 0; let fail = 0;
        for (const id of selectedIds) {
            try { await productService.delete(id); success++; }
            catch { fail++; }
        }
        setBulkLoading(false);
        setShowBulkDeleteConfirm(false);
        setRowSelectionModel({ type: 'include', ids: new Set() });
        setGridKey(k => k + 1);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-all-stats'] });
        showNotification(
            fail > 0
                ? `تم حذف ${success} منتج، فشل ${fail}`
                : `تم حذف ${success} منتج بنجاح`,
            fail > 0 ? 'warning' : 'success'
        );
    };

    const handleBulkZeroStock = async () => {
        setBulkLoading(true);
        let success = 0;
        for (const product of selectedRows) {
            try {
                await productService.update(product.id, { ...product, stock_qty: 0 });
                success++;
            } catch { /* ignore */ }
        }
        setBulkLoading(false);
        setRowSelectionModel({ type: 'include', ids: new Set() });
        setGridKey(k => k + 1);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-all-stats'] });
        showNotification(`تم تصفير كمية ${success} منتج`, 'info');
    };

    const handleBulkSetMinQty = async () => {
        setBulkLoading(true);
        let success = 0;
        for (const product of selectedRows) {
            try {
                await productService.update(product.id, { ...product, min_qty: bulkMinQtyValue });
                success++;
            } catch { /* ignore */ }
        }
        setBulkLoading(false);
        setShowBulkMinQty(false);
        setRowSelectionModel({ type: 'include', ids: new Set() });
        setGridKey(k => k + 1);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        showNotification(`تم تحديث الحد الأدنى لـ ${success} منتج`, 'success');
    };

    const handleExportCsv = () => {
        const rows = selectedRows.length > 0 ? selectedRows : (filteredRows || []);
        const headers = ['الاسم', 'SKU', 'الكمية', 'الحد الأدنى', 'سعر الشراء', 'سعر البيع', 'قيمة المخزون'];
        const lines = rows.map(p => [
            p.name, p.sku || '', p.stock_qty, p.min_qty,
            p.purchase_price?.toFixed(2), p.sale_price?.toFixed(2),
            ((p.stock_qty ?? 0) * (p.purchase_price ?? 0)).toFixed(2),
        ].join(','));
        const csv = '\uFEFF' + headers.join(',') + '\n' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `مخزون_${new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-')}.csv`;
        a.click(); URL.revokeObjectURL(url);
        showNotification(`تم تصدير ${rows.length} منتج كملف CSV`, 'success');
    };

    const fmt = (n: number) => n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' دج';

    const columns: GridColDef[] = [
        { field: 'name', headerName: 'اسم المنتج', flex: 1, minWidth: 200 },
        { field: 'sku', headerName: 'رمز SKU', width: 120 },
        {
            field: 'stock_qty', headerName: 'الكمية', width: 110,
            renderCell: (params) => {
                const status = getStockStatus(params.row);
                return (
                    <Chip icon={status.icon} label={params.value}
                        color={status.color as 'error' | 'warning' | 'success'} size="small" />
                );
            }
        },
        { field: 'min_qty', headerName: 'الحد الأدنى', width: 110 },
        {
            field: 'purchase_price', headerName: 'سعر الشراء', width: 130,
            valueFormatter: (value) => `${(value as number)?.toFixed(2) || '0.00'} دج`
        },
        {
            field: 'sale_price', headerName: 'سعر البيع', width: 130,
            valueFormatter: (value) => `${(value as number)?.toFixed(2) || '0.00'} دج`
        },
        {
            field: 'inventory_value', headerName: 'قيمة المخزون', width: 140,
            sortable: true,
            valueGetter: (_value, row) => (row.stock_qty ?? 0) * (row.purchase_price ?? 0),
            valueFormatter: (value) => `${(value as number)?.toFixed(2) || '0.00'} دج`,
        },
        {
            field: 'status', headerName: 'الحالة', width: 110,
            renderCell: (params) => {
                const status = getStockStatus(params.row);
                return (
                    <Chip label={status.label}
                        color={status.color as 'error' | 'warning' | 'success'}
                        size="small" variant="outlined" />
                );
            }
        },
        {
            field: 'actions', headerName: 'تعديل', width: 80, sortable: false,
            renderCell: (params) => (
                <CustomButton
                    onClick={() => handleEditClick(params.row)}
                    size="small"
                    sx={{
                        minWidth: 0,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                        color: '#fff',
                        boxShadow: theme => `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: theme => `0 4px 14px ${alpha(theme.palette.primary.main, 0.45)}`
                        },
                        transition: 'all 0.2s'
                    }}
                >
                    <EditIcon sx={{ fontSize: 15, mr: 0.5 }} />
                    تعديل
                </CustomButton>
            )
        }
    ];

    return (
        <Box>
            {/* Header */}
            <Fade in timeout={500}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h4" fontWeight="bold" sx={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5
                    }}>
                        إدارة المخزون
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        متابعة المخزون وتعديل الكميات والأسعار
                    </Typography>
                </Box>
            </Fade>

            {/* ── Stats cards ── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <StatCard
                    label="إجمالي قيمة المخزون"
                    value={fmt(stats.totalValue)}
                    icon={<InventoryIcon fontSize="small" />}
                    color={theme.palette.primary.main}
                    sub={`${stats.total} منتج`}
                />
                {/* Zakat calculator card */}
                <StatCard
                    label="حاسبة زكاة التجارة"
                    value="احسب الزكاة"
                    icon={<ZakatIcon fontSize="small" />}
                    color="#10B981"
                    sub="النقر للحساب"
                    clickable
                    onClick={() => setShowZakat(true)}
                />
                <StatCard
                    label="منتجات منخفضة"
                    value={stats.lowCount}
                    icon={<LowIcon fontSize="small" />}
                    color="#F59E0B"
                    sub="تحت الحد الأدنى"
                />
                <StatCard
                    label="منتجات نفدت"
                    value={stats.outCount}
                    icon={<OutIcon fontSize="small" />}
                    color="#EF4444"
                    sub="المخزون = صفر"
                />
            </Box>

            {/* Filters */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="بحث عن منتج بالاسم أو الباركود..."
                        isLoading={isLoading}
                        sx={{ flex: 1, minWidth: '200px' }}
                    />
                    <TextField
                        select label="حالة المخزون" value={stockStatusFilter}
                        onChange={(e) => setStockStatusFilter(e.target.value)}
                        size="small" sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="">الكل</MenuItem>
                        <MenuItem value="ok">✅ كافي</MenuItem>
                        <MenuItem value="low">⚠️ منخفض</MenuItem>
                        <MenuItem value="out">❌ نفد</MenuItem>
                    </TextField>
                </Stack>
            </Paper>

            {/* ── Bulk Actions Bar ── */}
            <BulkActionsBar
                count={selectedIds.length}
                onClear={() => { setRowSelectionModel({ type: 'include', ids: new Set() }); setGridKey(k => k + 1); }}
                onSelectAll={handleSelectAll}
                isAllSelected={isAllSelected}
                totalAvailable={allAvailableIds.length}
                minCount={1}
            >
                <Button size="small" startIcon={<DeleteIcon />} color="error" variant="outlined"
                    disabled={bulkLoading} onClick={() => setShowBulkDeleteConfirm(true)}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    حذف المحددة
                </Button>
                <Button size="small" startIcon={<ZeroStockIcon />} color="warning" variant="outlined"
                    disabled={bulkLoading} onClick={handleBulkZeroStock}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    تصفير الكمية
                </Button>
                <Button size="small" startIcon={<SetMinQtyIcon />} color="info" variant="outlined"
                    disabled={bulkLoading} onClick={() => setShowBulkMinQty(true)}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    تعيين الحد الأدنى
                </Button>
                <Button size="small" startIcon={<ExportCsvIcon />} color="success" variant="outlined"
                    disabled={bulkLoading} onClick={handleExportCsv}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    تصدير CSV
                </Button>
            </BulkActionsBar>

            {/* Data Grid */}
            <Paper elevation={0} sx={{ height: 560, borderRadius: 3, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
                <DataGrid
                    key={gridKey}
                    apiRef={apiRef}
                    rows={filteredRows}
                    columns={columns}
                    loading={isLoading}
                    pageSizeOptions={[25, 50, 100]}
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        setPage(model.page);
                        setPageSize(model.pageSize);
                    }}
                    onRowSelectionModelChange={(ids) => setRowSelectionModel(ids)}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': { borderColor: alpha(theme.palette.divider, 0.4) },
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 0,
                        },
                        '& .MuiDataGrid-row:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.03) },
                        '& .MuiDataGrid-row.Mui-selected': {
                            backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`,
                        },
                    }}
                />
            </Paper>

            {/* Quick Edit Modal */}
            <UnifiedModal
                open={showEditModal}
                onClose={() => setShowEditModal(false)}
                title={`تعديل: ${selectedProduct?.name}`}
                maxWidth="sm"
                actions={
                    <>
                        <CustomButton onClick={() => setShowEditModal(false)} color="inherit">إلغاء</CustomButton>
                        <CustomButton variant="contained" onClick={handleSaveEdit} loading={updateProductMutation.isPending}>
                            حفظ
                        </CustomButton>
                    </>
                }
            >
                <Box dir="rtl">
                    {selectedProduct && (
                        <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                            <Typography variant="caption" color="text.secondary">قيمة المخزون الحالية:</Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                                {fmt(editForm.stock_qty * editForm.purchase_price)}
                            </Typography>
                        </Box>
                    )}
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="الكمية" type="number" value={editForm.stock_qty} fullWidth size="small"
                            onChange={(e) => setEditForm({ ...editForm, stock_qty: Math.max(0, parseInt(e.target.value) || 0) })} />
                        <TextField label="الحد الأدنى للتنبيه" type="number" value={editForm.min_qty} fullWidth size="small"
                            onChange={(e) => setEditForm({ ...editForm, min_qty: Math.max(0, parseInt(e.target.value) || 0) })} />
                        <TextField label="سعر الشراء (دج)" type="number" value={editForm.purchase_price} fullWidth size="small"
                            onChange={(e) => setEditForm({ ...editForm, purchase_price: parseFloat(e.target.value) || 0 })} />
                        <TextField label="سعر البيع (دج)" type="number" value={editForm.sale_price} fullWidth size="small"
                            onChange={(e) => setEditForm({ ...editForm, sale_price: parseFloat(e.target.value) || 0 })} />
                    </Stack>
                </Box>
            </UnifiedModal>

            {/* Zakat Calculator Dialog */}
            <ZakatDialog
                open={showZakat}
                onClose={() => setShowZakat(false)}
                inventoryValue={stats.totalValue}
            />

            {/* Bulk Delete Confirmation */}
            <UnifiedModal
                open={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                title="تأكيد الحذف الجماعي"
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton onClick={() => setShowBulkDeleteConfirm(false)} color="inherit">إلغاء</CustomButton>
                        <CustomButton
                            variant="contained"
                            color="error"
                            loading={bulkLoading}
                            onClick={handleBulkDelete}
                        >
                            حذف {selectedIds.length} منتج
                        </CustomButton>
                    </>
                }
            >
                <Box dir="rtl" sx={{ pt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#EF4444', 0.1), color: '#EF4444', display: 'flex' }}>
                            <DeleteIcon />
                        </Box>
                        <Box>
                            <Typography fontWeight={700}>هل أنت متأكد؟</Typography>
                            <Typography variant="body2" color="text.secondary">
                                سيتم حذف <strong>{selectedIds.length}</strong> منتج نهائياً ولا يمكن التراجع عن هذا الإجراء.
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#EF4444', 0.05), border: `1px solid ${alpha('#EF4444', 0.2)}` }}>
                        <Typography variant="caption" color="error.main" fontWeight={600}>
                            المنتجات المحددة:
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {selectedRows.slice(0, 5).map(p => p.name).join('، ')}
                            {selectedRows.length > 5 ? ` ... و${selectedRows.length - 5} آخرين` : ''}
                        </Typography>
                    </Box>
                </Box>
            </UnifiedModal>

            {/* Bulk Set Min Qty */}
            <UnifiedModal
                open={showBulkMinQty}
                onClose={() => setShowBulkMinQty(false)}
                title="تعيين الحد الأدنى للكمية"
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton onClick={() => setShowBulkMinQty(false)} color="inherit">إلغاء</CustomButton>
                        <CustomButton
                            variant="contained"
                            loading={bulkLoading}
                            onClick={handleBulkSetMinQty}
                        >
                            تطبيق على {selectedIds.length} منتج
                        </CustomButton>
                    </>
                }
            >
                <Box dir="rtl" sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        سيتم تطبيق الحد الأدنى الجديد على جميع المنتجات المحددة ({selectedIds.length} منتج).
                    </Typography>
                    <TextField
                        label="الحد الأدنى للكمية"
                        type="number"
                        value={bulkMinQtyValue}
                        onChange={(e) => setBulkMinQtyValue(Math.max(0, parseInt(e.target.value) || 0))}
                        fullWidth size="small"
                        inputProps={{ min: 0 }}
                    />
                </Box>
            </UnifiedModal>
        </Box>
    );
}
