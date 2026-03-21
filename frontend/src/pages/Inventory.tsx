import { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
    Search as SearchIcon,
    Edit as EditIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Inventory2Outlined as InventoryIcon,
    TrendingUp as ProfitIcon,
    ErrorOutline as OutIcon,
    WarningAmber as LowIcon,
} from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { CustomButton, UnifiedModal } from '../components/Common';
import { productService, type Product } from '../services/productService';
import { useNotification } from '../contexts/NotificationContext';

/* ── Stat card ── */
interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    sub?: string;
}

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 3, flex: 1, minWidth: 180,
            border: `1px solid ${alpha(color, 0.25)}`,
            background: isLight
                ? `linear-gradient(135deg, ${alpha(color, 0.06)}, ${alpha(color, 0.02)})`
                : `linear-gradient(135deg, ${alpha(color, 0.14)}, ${alpha(color, 0.05)})`,
            position: 'relative', overflow: 'hidden',
        }}>
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
            </Box>
            <Typography variant="h5" fontWeight={800} color={color} sx={{ lineHeight: 1.2, mb: 0.4 }}>
                {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
        </Paper>
    );
}

/* ═══════════════════════════════════════ */
export default function Inventory() {
    const [searchQuery, setSearchQuery] = useState('');
    const [stockStatusFilter, setStockStatusFilter] = useState<string>('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ stock_qty: 0, purchase_price: 0, sale_price: 0, min_qty: 0 });

    const { showNotification } = useNotification();
    const queryClient = useQueryClient();
    const theme = useTheme();

    /* Paged query for the DataGrid */
    const { data: products, isLoading } = useQuery({
        queryKey: ['inventory', searchQuery, stockStatusFilter, page, pageSize],
        queryFn: () => productService.getAll({
            query: searchQuery || undefined,
            skip: page * pageSize,
            limit: pageSize,
        })
    });

    /* Full query (no pagination limit) just for stats */
    const { data: allProducts } = useQuery({
        queryKey: ['inventory-all-stats'],
        queryFn: () => productService.getAll({ limit: 10000 }),
        staleTime: 30_000,
    });

    /* ── Computed stats ── */
    const stats = useMemo(() => {
        const list = allProducts || [];
        const totalValue = list.reduce((s, p) => s + (p.stock_qty ?? 0) * (p.purchase_price ?? 0), 0);
        const saleValue  = list.reduce((s, p) => s + (p.stock_qty ?? 0) * (p.sale_price ?? 0), 0);
        const profit     = saleValue - totalValue;
        const outCount   = list.filter(p => p.stock_qty <= 0).length;
        const lowCount   = list.filter(p => p.stock_qty > 0 && p.stock_qty <= p.min_qty).length;
        return { totalValue, profit, outCount, lowCount, total: list.length };
    }, [allProducts]);

    /* Filtered rows for DataGrid */
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

    const fmt = (n: number) => n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' دج';

    const columns: GridColDef[] = [
        { field: 'name', headerName: 'اسم المنتج', flex: 1, minWidth: 200 },
        { field: 'sku', headerName: 'رمز SKU', width: 120 },
        {
            field: 'stock_qty', headerName: 'الكمية', width: 110,
            renderCell: (params) => {
                const status = getStockStatus(params.row);
                return (
                    <Chip
                        icon={status.icon}
                        label={params.value}
                        color={status.color as 'error' | 'warning' | 'success'}
                        size="small"
                    />
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
                    <Chip
                        label={status.label}
                        color={status.color as 'error' | 'warning' | 'success'}
                        size="small"
                        variant="outlined"
                    />
                );
            }
        },
        {
            field: 'actions', headerName: 'تعديل', width: 80, sortable: false,
            renderCell: (params) => (
                <Tooltip title="تعديل سريع">
                    <IconButton size="small" onClick={() => handleEditClick(params.row)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )
        }
    ];

    return (
        <Box dir="rtl">
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
                <StatCard
                    label="هامش الربح المتوقع"
                    value={fmt(stats.profit)}
                    icon={<ProfitIcon fontSize="small" />}
                    color="#10B981"
                    sub={stats.profit >= 0 ? 'ربح' : 'خسارة'}
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
                    <TextField
                        placeholder="بحث عن منتج..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            )
                        }}
                        size="small"
                        sx={{ flex: 1, minWidth: '200px' }}
                    />
                    <TextField
                        select
                        label="حالة المخزون"
                        value={stockStatusFilter}
                        onChange={(e) => setStockStatusFilter(e.target.value)}
                        size="small"
                        sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="">الكل</MenuItem>
                        <MenuItem value="ok">✅ كافي</MenuItem>
                        <MenuItem value="low">⚠️ منخفض</MenuItem>
                        <MenuItem value="out">❌ نفد</MenuItem>
                    </TextField>
                </Stack>
            </Paper>

            {/* Data Grid */}
            <Paper elevation={0} sx={{ height: 560, borderRadius: 3, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
                <DataGrid
                    rows={filteredRows}
                    columns={columns}
                    loading={isLoading}
                    pageSizeOptions={[25, 50, 100]}
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        setPage(model.page);
                        setPageSize(model.pageSize);
                    }}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': { borderColor: alpha(theme.palette.divider, 0.4) },
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            borderRadius: 0,
                        },
                        '& .MuiDataGrid-row:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.03),
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
        </Box>
    );
}
