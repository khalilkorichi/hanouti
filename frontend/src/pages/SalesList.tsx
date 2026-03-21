import { useState } from 'react';
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
    Slide
} from '@mui/material';
import {
    Search as SearchIcon,
    Visibility as ViewIcon,
    Print as PrintIcon,
    Cancel as CancelIcon,
    TrendingUp as TrendingUpIcon,
    Receipt as ReceiptIcon,
    AttachMoney as MoneyIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { CustomButton, UnifiedModal } from '../components/Common';
import { salesService, type Sale } from '../services/salesService';
import { useNotification } from '../contexts/NotificationContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function SalesList() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [paymentFilter, setPaymentFilter] = useState<string>('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();
    const theme = useTheme();

    // Fetch sales
    const { data: sales, isLoading } = useQuery({
        queryKey: ['sales-list', searchQuery, statusFilter, paymentFilter, dateRange, page, pageSize],
        queryFn: () => salesService.getAll({
            query: searchQuery || undefined,
            status: statusFilter || undefined,
            payment_method: paymentFilter || undefined,
            from_date: dateRange.from || undefined,
            to_date: dateRange.to || undefined,
            skip: page * pageSize,
            limit: pageSize
        })
    });

    // Fetch KPIs
    const { data: kpis } = useQuery({
        queryKey: ['sales-kpis', dateRange],
        queryFn: () => salesService.getKPIs({
            from_date: dateRange.from || undefined,
            to_date: dateRange.to || undefined
        })
    });

    // Cancel sale mutation
    const cancelSaleMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            salesService.cancel(id, reason),
        onSuccess: () => {
            showNotification('تم إلغاء الفاتورة بنجاح', 'success');
            setShowCancelModal(false);
            setCancelReason('');
            queryClient.invalidateQueries({ queryKey: ['sales-list'] });
            queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
        },
        onError: (error) => {
            showNotification('فشل إلغاء الفاتورة: ' + error, 'error');
        }
    });

    const handleViewDetails = (sale: Sale) => {
        setSelectedSale(sale);
        setShowDetailsModal(true);
    };

    const handleCancelSale = (sale: Sale) => {
        setSelectedSale(sale);
        setShowCancelModal(true);
    };

    const confirmCancel = () => {
        if (!selectedSale || !cancelReason.trim()) {
            showNotification('الرجاء إدخال سبب الإلغاء', 'warning');
            return;
        }
        cancelSaleMutation.mutate({ id: selectedSale.id, reason: cancelReason });
    };

    const columns: GridColDef[] = [
        {
            field: 'invoice_no',
            headerName: 'رقم الفاتورة',
            flex: 1,
            minWidth: 150
        },
        {
            field: 'created_at',
            headerName: 'التاريخ',
            flex: 1,
            minWidth: 180,
            valueFormatter: (value) => {
                if (!value) return '';
                try {
                    return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: ar });
                } catch {
                    return value;
                }
            }
        },
        {
            field: 'status',
            headerName: 'الحالة',
            width: 120,
            renderCell: (params) => {
                const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
                    completed: 'success',
                    draft: 'warning',
                    cancelled: 'error'
                };
                const statusLabels: Record<string, string> = {
                    completed: 'مكتملة',
                    draft: 'مسودة',
                    cancelled: 'ملغية'
                };
                return (
                    <Chip
                        label={statusLabels[params.value] || params.value}
                        color={statusColors[params.value] || 'default'}
                        size="small"
                    />
                );
            }
        },
        {
            field: 'payment_method',
            headerName: 'طريقة الدفع',
            width: 120,
            valueFormatter: (value) => value === 'cash' ? 'نقدًا' : value === 'card' ? 'بطاقة' : value
        },
        {
            field: 'total',
            headerName: 'الإجمالي',
            width: 130,
            valueFormatter: (value) => `${(value as number)?.toFixed(2) || '0.00'} دج`
        },
        {
            field: 'actions',
            headerName: 'الإجراءات',
            width: 150,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" onClick={() => handleViewDetails(params.row)}>
                            <ViewIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="طباعة">
                        <IconButton size="small" color="primary">
                            <PrintIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {params.row.status !== 'cancelled' && (
                        <Tooltip title="إلغاء">
                            <IconButton size="small" color="error" onClick={() => handleCancelSale(params.row)}>
                                <CancelIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            )
        }
    ];

    return (
        <Box sx={{ p: 3 }} dir="rtl">
            {/* Header */}
            <Fade in timeout={500}>
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1
                        }}
                    >
                        سجل المبيعات
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة ومتابعة جميع عمليات البيع
                    </Typography>
                </Box>
            </Fade>

            {/* KPIs */}
            {kpis && (
                <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '240px' }}>
                        <Slide direction="down" in timeout={500}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.05)} 100%)`,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                                        '& .icon-wrapper': {
                                            transform: 'scale(1.1) rotate(5deg)',
                                        }
                                    }
                                }}
                            >
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <Box
                                        className="icon-wrapper"
                                        sx={{
                                            display: 'inline-flex',
                                            p: 1.5,
                                            borderRadius: 2,
                                            background: alpha(theme.palette.primary.main, 0.1),
                                            mb: 2,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <MoneyIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
                                        {kpis.total_sales.toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        إجمالي المبيعات
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TrendingUpIcon sx={{ fontSize: 14 }} /> دج
                                    </Typography>
                                </Box>
                            </Paper>
                        </Slide>
                    </Box>

                    <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '240px' }}>
                        <Slide direction="down" in timeout={600}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.dark, 0.05)} 100%)`,
                                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 24px ${alpha(theme.palette.secondary.main, 0.15)}`,
                                        '& .icon-wrapper': {
                                            transform: 'scale(1.1) rotate(5deg)',
                                        }
                                    }
                                }}
                            >
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <Box
                                        className="icon-wrapper"
                                        sx={{
                                            display: 'inline-flex',
                                            p: 1.5,
                                            borderRadius: 2,
                                            background: alpha(theme.palette.secondary.main, 0.1),
                                            mb: 2,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <ReceiptIcon sx={{ fontSize: 28, color: 'secondary.main' }} />
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="secondary.main" gutterBottom>
                                        {kpis.total_orders}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        عدد الطلبات
                                    </Typography>
                                </Box>
                            </Paper>
                        </Slide>
                    </Box>

                    <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '240px' }}>
                        <Slide direction="down" in timeout={700}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${alpha('#FFAB00', 0.1)} 0%, ${alpha('#FF8B00', 0.05)} 100%)`,
                                    border: `1px solid ${alpha('#FFAB00', 0.1)}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 24px ${alpha('#FFAB00', 0.15)}`,
                                        '& .icon-wrapper': {
                                            transform: 'scale(1.1) rotate(5deg)',
                                        }
                                    }
                                }}
                            >
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <Box
                                        className="icon-wrapper"
                                        sx={{
                                            display: 'inline-flex',
                                            p: 1.5,
                                            borderRadius: 2,
                                            background: alpha('#FFAB00', 0.1),
                                            mb: 2,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <TrendingUpIcon sx={{ fontSize: 28, color: '#FFAB00' }} />
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#FFAB00' }} gutterBottom>
                                        {kpis.avg_order_value.toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        متوسط قيمة الطلب
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        دج
                                    </Typography>
                                </Box>
                            </Paper>
                        </Slide>
                    </Box>

                    <Box sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '240px' }}>
                        <Slide direction="down" in timeout={800}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.dark, 0.05)} 100%)`,
                                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 24px ${alpha(theme.palette.success.main, 0.15)}`,
                                        '& .icon-wrapper': {
                                            transform: 'scale(1.1) rotate(5deg)',
                                        }
                                    }
                                }}
                            >
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <Box
                                        className="icon-wrapper"
                                        sx={{
                                            display: 'inline-flex',
                                            p: 1.5,
                                            borderRadius: 2,
                                            background: alpha(theme.palette.success.main, 0.1),
                                            mb: 2,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <CheckCircleIcon sx={{ fontSize: 28, color: 'success.main' }} />
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="success.main" gutterBottom>
                                        {kpis.completed_sales}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        مبيعات مكتملة
                                    </Typography>
                                </Box>
                            </Paper>
                        </Slide>
                    </Box>
                </Stack>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <TextField
                        placeholder="بحث برقم الفاتورة..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            )
                        }}
                        size="small"
                        sx={{ flex: 1, minWidth: '200px' }}
                    />
                    <TextField
                        select
                        label="الحالة"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="">الكل</MenuItem>
                        <MenuItem value="completed">مكتملة</MenuItem>
                        <MenuItem value="draft">مسودة</MenuItem>
                        <MenuItem value="cancelled">ملغية</MenuItem>
                    </TextField>
                    <TextField
                        select
                        label="طريقة الدفع"
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="">الكل</MenuItem>
                        <MenuItem value="cash">نقدًا</MenuItem>
                        <MenuItem value="card">بطاقة</MenuItem>
                    </TextField>
                    <TextField
                        type="date"
                        label="من تاريخ"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 160 }}
                    />
                    <TextField
                        type="date"
                        label="إلى تاريخ"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 160 }}
                    />
                </Stack>
            </Paper>

            {/* Data Grid */}
            <Paper sx={{ height: 600, borderRadius: 3, overflow: 'hidden', boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <DataGrid
                    rows={sales || []}
                    columns={columns}
                    loading={isLoading}
                    pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        setPage(model.page);
                        setPageSize(model.pageSize);
                    }}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': {
                            borderColor: alpha(theme.palette.divider, 0.5)
                        },
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            borderRadius: 0
                        }
                    }}
                />
            </Paper>

            {/* Details Modal */}
            <UnifiedModal
                open={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title={`تفاصيل الفاتورة: ${selectedSale?.invoice_no}`}
                maxWidth="md"
                actions={
                    <>
                        <CustomButton onClick={() => setShowDetailsModal(false)} color="inherit">
                            إغلاق
                        </CustomButton>
                        <CustomButton variant="contained" startIcon={<PrintIcon />}>
                            طباعة
                        </CustomButton>
                    </>
                }
            >
                {selectedSale && (
                    <Box>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography><strong>الحالة:</strong></Typography>
                                <Chip
                                    label={
                                        selectedSale.status === 'completed' ? 'مكتملة' :
                                            selectedSale.status === 'draft' ? 'مسودة' : 'ملغية'
                                    }
                                    color={
                                        selectedSale.status === 'completed' ? 'success' :
                                            selectedSale.status === 'draft' ? 'warning' : 'error'
                                    }
                                    size="small"
                                />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography><strong>طريقة الدفع:</strong></Typography>
                                <Typography>{selectedSale.payment_method === 'cash' ? 'نقدًا' : 'بطاقة'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography><strong>المجموع الفرعي:</strong></Typography>
                                <Typography>{selectedSale.subtotal.toFixed(2)} دج</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography><strong>الخصم:</strong></Typography>
                                <Typography>{selectedSale.discount_value.toFixed(2)} دج</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6"><strong>الإجمالي:</strong></Typography>
                                <Typography variant="h6" color="primary">{selectedSale.total.toFixed(2)} دج</Typography>
                            </Box>

                            {/* Items */}
                            <Typography variant="h6" sx={{ mt: 2 }}>العناصر:</Typography>
                            <Box>
                                {selectedSale.items.map((item, idx) => (
                                    <Box key={idx} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography>{item.product?.name || 'منتج'} (x{item.qty})</Typography>
                                        <Typography>{item.line_total?.toFixed(2)} دج</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Stack>
                    </Box>
                )}
            </UnifiedModal>

            {/* Cancel Modal */}
            <UnifiedModal
                open={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                title="إلغاء الفاتورة"
                maxWidth="sm"
                actions={
                    <>
                        <CustomButton onClick={() => setShowCancelModal(false)} color="inherit">
                            إلغاء
                        </CustomButton>
                        <CustomButton
                            variant="contained"
                            color="error"
                            onClick={confirmCancel}
                            loading={cancelSaleMutation.isPending}
                        >
                            تأكيد الإلغاء
                        </CustomButton>
                    </>
                }
            >
                <Box>
                    <Typography gutterBottom>
                        هل أنت متأكد من إلغاء الفاتورة <strong>{selectedSale?.invoice_no}</strong>؟
                    </Typography>
                    <TextField
                        fullWidth
                        label="سبب الإلغاء (مطلوب)"
                        multiline
                        rows={3}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        sx={{ mt: 2 }}
                        required
                    />
                </Box>
            </UnifiedModal>
        </Box>
    );
}
