import { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Paper,
    TextField,
    MenuItem,
    Stack,
    Typography,
    Chip,
    alpha,
    useTheme,
    Slide,
    Button,
} from '@mui/material';
import {
    Visibility as ViewIcon,
    Print as PrintIcon,
    Cancel as CancelIcon,
    TrendingUp as TrendingUpIcon,
    Receipt as ReceiptIcon,
    AttachMoney as MoneyIcon,
    CheckCircle as CheckCircleIcon,
    FileDownloadOutlined as ExportCsvIcon,
    CancelOutlined as BulkCancelIcon,
    DeleteOutlineOutlined as DeleteIcon,
    DeleteForeverOutlined as HardDeleteIcon,
    ReceiptLongOutlined as SalesListIcon,
    WarningAmberOutlined as WarningIcon,
    PersonAddAlt1 as AssignCustomerIcon,
} from '@mui/icons-material';
import { Autocomplete } from '@mui/material';
import { DataGrid, useGridApiRef, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import { CustomButton, CustomIconButton, UnifiedModal, BulkActionsBar, SearchInput, PageHeader } from '../components/Common';
import { salesService, type Sale } from '../services/salesService';
import { customerService, type Customer } from '../services/customerService';
import { useNotification } from '../contexts/NotificationContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function SalesList() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 350);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [paymentFilter, setPaymentFilter] = useState<string>('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
    const [assignSale, setAssignSale] = useState<Sale | null>(null);
    const [assignCustomer, setAssignCustomer] = useState<Customer | null>(null);
    const apiRef = useGridApiRef();
    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });
    const [gridKey, setGridKey] = useState(0);
    const [bulkLoading, setBulkLoading] = useState(false);
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();
    const theme = useTheme();

    const handlePrintInvoice = (sale: Sale) => {
        const statusLabel = sale.status === 'completed' ? 'مكتملة' : sale.status === 'draft' ? 'مسودة' : 'ملغية';
        const payLabel = sale.payment_method === 'cash' ? 'نقداً' : 'بطاقة';
        const dateStr = (() => {
            try { return new Date(sale.created_at).toLocaleString('ar-DZ'); } catch { return sale.created_at; }
        })();

        const itemsHtml = sale.items.map(item => `
            <tr>
                <td>${item.product?.name || 'منتج #' + item.product_id}</td>
                <td class="center">${item.qty}</td>
                <td class="num">${(item.unit_price ?? 0).toFixed(2)} دج</td>
                <td class="num">${(item.line_total ?? (item.unit_price * item.qty)).toFixed(2)} دج</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>فاتورة ${sale.invoice_no}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; direction: rtl; }
  .page { max-width: 680px; margin: 0 auto; padding: 32px 28px; }
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed #c8c8d8; padding-bottom: 20px; margin-bottom: 20px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-icon { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #4F46E5, #8B5CF6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; font-weight: 900; }
  .brand-name { font-size: 18px; font-weight: 800; color: #4F46E5; }
  .brand-sub { font-size: 11px; color: #888; }
  .meta { text-align: right; }
  .meta .inv-no { font-size: 16px; font-weight: 800; color: #1a1a2e; }
  .meta .inv-date { font-size: 11px; color: #888; margin-top: 3px; }
  .badges { display: flex; gap: 6px; margin-top: 6px; justify-content: flex-end; }
  .badge { padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid; }
  .badge-status { background: #F0FDF4; color: #10B981; border-color: #10B981; }
  .badge-pay { background: #EFF6FF; color: #3B82F6; border-color: #3B82F6; }
  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #F3F4F6; }
  th { padding: 9px 12px; text-align: right; font-size: 12px; font-weight: 700; color: #4F46E5; border-bottom: 1px solid #e0e0e8; }
  th.center, td.center { text-align: center; }
  th.num, td.num { text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #f0f0f5; }
  tr:nth-child(even) td { background: #FAFAFA; }
  /* Total */
  .total-box { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(139,92,246,0.04)); border: 2px solid rgba(79,70,229,0.2); border-radius: 10px; padding: 14px 20px; }
  .total-label { font-size: 15px; font-weight: 800; }
  .total-val { font-size: 18px; font-weight: 900; color: #4F46E5; }
  /* Footer */
  .footer { text-align: center; margin-top: 28px; padding-top: 14px; border-top: 1px dashed #c8c8d8; font-size: 11px; color: #aaa; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="brand-icon">ح</div>
      <div>
        <div class="brand-name">حانوتي</div>
        <div class="brand-sub">نظام إدارة المبيعات</div>
      </div>
    </div>
    <div class="meta">
      <div class="inv-no">${sale.invoice_no}</div>
      <div class="inv-date">${dateStr}</div>
      <div class="badges">
        <span class="badge badge-status">${statusLabel}</span>
        <span class="badge badge-pay">${payLabel}</span>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>المنتج</th>
        <th class="center">الكمية</th>
        <th class="num">سعر الوحدة</th>
        <th class="num">المجموع</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="total-box">
    <span class="total-label">الإجمالي النهائي</span>
    <span class="total-val">${(sale.total ?? 0).toFixed(2)} دج</span>
  </div>

  <div class="footer">شكراً لتعاملكم معنا — برنامج حانوتي</div>
</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
</body>
</html>`;

        const w = window.open('', '_blank', 'width=720,height=900');
        if (w) { w.document.write(html); w.document.close(); }
        else showNotification('يرجى السماح بالنوافذ المنبثقة للطباعة', 'warning');
    };

    // Fetch sales
    const { data: sales, isLoading } = useQuery({
        queryKey: ['sales-list', debouncedSearch, statusFilter, paymentFilter, dateRange, page, pageSize],
        queryFn: () => salesService.getAll({
            query: debouncedSearch || undefined,
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

    // Delete sale mutation
    const deleteSaleMutation = useMutation({
        mutationFn: (id: number) => salesService.delete(id),
        onSuccess: () => {
            showNotification('تم حذف الفاتورة نهائياً', 'success');
            setShowDeleteModal(false);
            setSaleToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['sales-list'] });
            queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
        },
        onError: () => {
            showNotification('فشل حذف الفاتورة', 'error');
        }
    });

    const assignCustomerMutation = useMutation({
        mutationFn: (vars: { saleId: number; customerId: number }) =>
            salesService.assignCustomer(vars.saleId, vars.customerId),
        onSuccess: () => {
            showNotification('تم تعيين العميل للفاتورة', 'success');
            setAssignSale(null);
            setAssignCustomer(null);
            queryClient.invalidateQueries({ queryKey: ['sales-list'] });
            queryClient.invalidateQueries({ queryKey: ['anonymous-debts'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
        onError: (e: { response?: { data?: { detail?: string } } }) => {
            showNotification(e.response?.data?.detail || 'فشل تعيين العميل', 'error');
        },
    });

    // Lazy-load customers only when the assign dialog is open
    const { data: assignableCustomers = [] } = useQuery({
        queryKey: ['customers', 'all-for-assign'],
        queryFn: () => customerService.list({}),
        enabled: assignSale !== null,
    });

    const handleViewDetails = (sale: Sale) => {
        setSelectedSale(sale);
        setShowDetailsModal(true);
    };

    const handleCancelSale = (sale: Sale) => {
        setSelectedSale(sale);
        setShowCancelModal(true);
    };

    const handleDeleteSale = (sale: Sale) => {
        setSaleToDelete(sale);
        setShowDeleteModal(true);
    };

    const confirmCancel = () => {
        if (!selectedSale || !cancelReason.trim()) {
            showNotification('الرجاء إدخال سبب الإلغاء', 'warning');
            return;
        }
        cancelSaleMutation.mutate({ id: selectedSale.id, reason: cancelReason });
    };

    /* ── Bulk selection helpers ── */
    const selectedIds = useMemo(() => Array.from(rowSelectionModel.ids) as number[], [rowSelectionModel]);
    const allAvailableIds = useMemo(() => (sales || []).map(s => s.id), [sales]);
    const isAllSelected = allAvailableIds.length > 0 && selectedIds.length === allAvailableIds.length;

    const handleSelectAll = () => {
        if (!apiRef.current) return;
        if (isAllSelected) {
            apiRef.current.setRowSelectionModel({ type: 'include', ids: new Set() });
        } else {
            apiRef.current.setRowSelectionModel({ type: 'include', ids: new Set(allAvailableIds) });
        }
    };
    const selectedSales = useMemo(
        () => (sales || []).filter(s => selectedIds.includes(s.id)),
        [sales, selectedIds]
    );

    const handleBulkExportCsv = () => {
        const rows = selectedSales.length > 0 ? selectedSales : (sales || []);
        const headers = ['رقم الفاتورة', 'التاريخ', 'الحالة', 'طريقة الدفع', 'الإجمالي'];
        const lines = rows.map(s => [
            s.invoice_no,
            s.created_at ? new Date(s.created_at).toLocaleDateString('ar-DZ') : '',
            s.status === 'completed' ? 'مكتملة' : s.status === 'draft' ? 'مسودة' : 'ملغية',
            s.payment_method === 'cash' ? 'نقداً' : 'بطاقة',
            (s.total ?? 0).toFixed(2),
        ].join(','));
        const csv = '\uFEFF' + headers.join(',') + '\n' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `مبيعات_${new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-')}.csv`;
        a.click(); URL.revokeObjectURL(url);
        showNotification(`تم تصدير ${rows.length} فاتورة`, 'success');
    };

    const handleBulkCancelSales = async () => {
        setBulkLoading(true);
        let success = 0;
        for (const sale of selectedSales) {
            if (sale.status !== 'cancelled') {
                try {
                    await salesService.cancel(sale.id, 'إلغاء جماعي');
                    success++;
                } catch { /* ignore */ }
            }
        }
        setBulkLoading(false);
        setRowSelectionModel({ type: 'include', ids: new Set() });
        setGridKey(k => k + 1);
        queryClient.invalidateQueries({ queryKey: ['sales-list'] });
        queryClient.invalidateQueries({ queryKey: ['sales-kpis'] });
        showNotification(`تم إلغاء ${success} فاتورة`, 'info');
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
            width: 210,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={0.5} alignItems="center" height="100%">
                    <CustomIconButton
                        variant="primary"
                        size="small"
                        tooltip="عرض التفاصيل"
                        onClick={() => handleViewDetails(params.row)}
                    >
                        <ViewIcon sx={{ fontSize: 17 }} />
                    </CustomIconButton>
                    <CustomIconButton
                        variant="info"
                        size="small"
                        tooltip="طباعة الفاتورة"
                        onClick={() => handlePrintInvoice(params.row)}
                    >
                        <PrintIcon sx={{ fontSize: 17 }} />
                    </CustomIconButton>
                    {params.row.status === 'completed'
                        && !params.row.customer_id
                        && (params.row.due_amount || 0) > 0 && (
                        <CustomIconButton
                            variant="success"
                            size="small"
                            tooltip="تعيين عميل (دين مجهول)"
                            onClick={() => { setAssignSale(params.row); setAssignCustomer(null); }}
                        >
                            <AssignCustomerIcon sx={{ fontSize: 17 }} />
                        </CustomIconButton>
                    )}
                    {params.row.status !== 'cancelled' && (
                        <CustomIconButton
                            variant="warning"
                            size="small"
                            tooltip="إلغاء الفاتورة"
                            onClick={() => handleCancelSale(params.row)}
                        >
                            <CancelIcon sx={{ fontSize: 17 }} />
                        </CustomIconButton>
                    )}
                    <CustomIconButton
                        variant="error"
                        size="small"
                        tooltip="حذف الفاتورة نهائياً"
                        onClick={() => handleDeleteSale(params.row)}
                    >
                        <DeleteIcon sx={{ fontSize: 17 }} />
                    </CustomIconButton>
                </Stack>
            )
        }
    ];

    return (
        <Box sx={{ p: 3 }}>
            <PageHeader
                title="سجل المبيعات"
                subtitle="إدارة ومتابعة جميع عمليات البيع"
                icon={<SalesListIcon />}
            />

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
                                            width: 48,
                                            height: 48,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 2,
                                            background: alpha(theme.palette.primary.main, 0.1),
                                            mb: 2,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {/* MUI's AttachMoney "$" glyph reads visually thinner
                                            than the other three icons inside the same box, so
                                            it gets a slightly larger fontSize for optical parity. */}
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
                                            width: 48,
                                            height: 48,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 2,
                                            background: alpha(theme.palette.secondary.main, 0.1),
                                            mb: 2,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {/* Receipt glyph is the heaviest of the four;
                                            kept at 24 so it doesn't dominate. */}
                                        <ReceiptIcon sx={{ fontSize: 24, color: 'secondary.main' }} />
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
                                            width: 48,
                                            height: 48,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 2,
                                            background: alpha('#FFAB00', 0.1),
                                            mb: 2,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {/* Diagonal trending-up arrow fills the box well at 26. */}
                                        <TrendingUpIcon sx={{ fontSize: 26, color: '#FFAB00' }} />
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
                                            width: 48,
                                            height: 48,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 2,
                                            background: alpha(theme.palette.success.main, 0.1),
                                            mb: 2,
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {/* Filled check-circle reads as one solid disc; 26 keeps
                                            it visually equal to the trending-up arrow. */}
                                        <CheckCircleIcon sx={{ fontSize: 26, color: 'success.main' }} />
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
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="بحث برقم الفاتورة أو اسم العميل..."
                        isLoading={isLoading}
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

            {/* ── Bulk Actions Bar ── */}
            <BulkActionsBar
                count={selectedIds.length}
                onClear={() => { setRowSelectionModel({ type: 'include', ids: new Set() }); setGridKey(k => k + 1); }}
                onSelectAll={handleSelectAll}
                isAllSelected={isAllSelected}
                totalAvailable={allAvailableIds.length}
                minCount={1}
            >
                <Button size="small" startIcon={<BulkCancelIcon />} color="warning" variant="outlined"
                    disabled={bulkLoading} onClick={handleBulkCancelSales}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    إلغاء المحددة
                </Button>
                <Button size="small" startIcon={<ExportCsvIcon />} color="success" variant="outlined"
                    disabled={bulkLoading} onClick={handleBulkExportCsv}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    تصدير CSV
                </Button>
            </BulkActionsBar>

            {/* Data Grid */}
            <Paper sx={{ height: 600, borderRadius: 3, overflow: 'hidden', boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <DataGrid
                    key={gridKey}
                    apiRef={apiRef}
                    rows={sales || []}
                    columns={columns}
                    loading={isLoading}
                    pageSizeOptions={[10, 25, 50, 100]}
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
                        '& .MuiDataGrid-cell': {
                            borderColor: alpha(theme.palette.divider, 0.5)
                        },
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            borderRadius: 0
                        },
                        '& .MuiDataGrid-row.Mui-selected': {
                            backgroundColor: `${alpha(theme.palette.primary.main, 0.07)} !important`,
                        },
                    }}
                />
            </Paper>

            {/* Details Modal */}
            <UnifiedModal
                open={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title={`فاتورة: ${selectedSale?.invoice_no}`}
                maxWidth="md"
                actions={
                    <>
                        <CustomButton
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={() => selectedSale && handlePrintInvoice(selectedSale)}
                        >
                            طباعة الفاتورة
                        </CustomButton>
                        <CustomButton onClick={() => setShowDetailsModal(false)} color="inherit">
                            إغلاق
                        </CustomButton>
                    </>
                }
            >
                {selectedSale && <InvoiceDetails sale={selectedSale} />}
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

            {/* ── Delete Confirmation Modal ── */}
            <UnifiedModal
                open={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setSaleToDelete(null); }}
                title="حذف الفاتورة نهائياً"
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton variant="outlined" onClick={() => { setShowDeleteModal(false); setSaleToDelete(null); }}>
                            إلغاء
                        </CustomButton>
                        <CustomButton
                            color="error"
                            loading={deleteSaleMutation.isPending}
                            startIcon={<HardDeleteIcon />}
                            onClick={() => saleToDelete && deleteSaleMutation.mutate(saleToDelete.id)}
                        >
                            حذف نهائياً
                        </CustomButton>
                    </>
                }
            >
                <Box sx={{ textAlign: 'center', py: 1 }}>
                    <HardDeleteIcon sx={{ fontSize: 52, color: 'error.main', mb: 1.5, opacity: 0.85 }} />
                    <Typography variant="body1" fontWeight={700} gutterBottom>
                        هل أنت متأكد من حذف الفاتورة؟
                    </Typography>
                    {saleToDelete && (
                        <Typography variant="body2" color="text.secondary">
                            الفاتورة رقم <strong>{saleToDelete.invoice_no}</strong> بقيمة <strong>{saleToDelete.total?.toFixed(2)} دج</strong>
                        </Typography>
                    )}
                    <Typography
                        variant="caption"
                        color="error.main"
                        sx={{ mt: 1.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}
                    >
                        <WarningIcon sx={{ fontSize: 16 }} />
                        هذا الإجراء لا يمكن التراجع عنه
                    </Typography>
                </Box>
            </UnifiedModal>

            {/* ── Assign Customer to Anonymous-Debt Sale ── */}
            <UnifiedModal
                open={assignSale !== null}
                onClose={() => { setAssignSale(null); setAssignCustomer(null); }}
                title={`تعيين عميل — ${assignSale?.invoice_no || ''}`}
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton variant="outlined" onClick={() => { setAssignSale(null); setAssignCustomer(null); }}>
                            إلغاء
                        </CustomButton>
                        <CustomButton
                            variant="contained"
                            disabled={!assignCustomer}
                            loading={assignCustomerMutation.isPending}
                            startIcon={<AssignCustomerIcon />}
                            onClick={() => assignSale && assignCustomer && assignCustomerMutation.mutate({
                                saleId: assignSale.id, customerId: assignCustomer.id,
                            })}
                        >
                            تأكيد
                        </CustomButton>
                    </>
                }
            >
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {assignSale && (
                        <Typography variant="body2" color="text.secondary">
                            دين الفاتورة: <strong>{(assignSale.due_amount || 0).toFixed(2)} دج</strong>
                        </Typography>
                    )}
                    <Autocomplete<Customer, false, false, false>
                        options={assignableCustomers}
                        value={assignCustomer}
                        onChange={(_, v) => setAssignCustomer(v)}
                        getOptionLabel={(o) => o.name + (o.phone ? ` — ${o.phone}` : '')}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={(params) => <TextField {...params} label="العميل *" autoFocus />}
                    />
                </Stack>
            </UnifiedModal>
        </Box>
    );
}

/* ════════════════════════════════════════
   Invoice Details Component
════════════════════════════════════════ */
function InvoiceDetails({ sale }: { sale: Sale }) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    const statusConfig = {
        completed: { label: 'مكتملة', color: '#10B981', bg: alpha('#10B981', 0.12) },
        draft:     { label: 'مسودة',   color: '#F59E0B', bg: alpha('#F59E0B', 0.12) },
        cancelled: { label: 'ملغية',   color: '#EF4444', bg: alpha('#EF4444', 0.12) },
    };
    const st = statusConfig[sale.status as keyof typeof statusConfig] || statusConfig.draft;

    const dateFormatted = (() => {
        try { return format(new Date(sale.created_at), 'dd MMMM yyyy — HH:mm', { locale: ar }); }
        catch { return sale.created_at; }
    })();

    const paymentLabel = sale.payment_method === 'cash' ? 'نقداً' : 'بطاقة';

    /* shared cell style helpers */
    const cellSx = (align?: string) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start',
    });

    return (
        <Box dir="rtl">

            {/* ── Invoice header ── */}
            <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                mb: 3, pb: 2.5,
                borderBottom: `2px dashed ${alpha(theme.palette.divider, 0.6)}`,
                flexWrap: 'wrap', gap: 2,
            }}>
                {/* Logo / company — right side in RTL */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 48, height: 48, borderRadius: 2, flexShrink: 0,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 900, fontSize: '1.4rem',
                    }}>ح</Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="primary.main" sx={{ lineHeight: 1.2 }}>
                            حانوتي
                        </Typography>
                        <Typography variant="caption" color="text.secondary">نظام إدارة المبيعات</Typography>
                    </Box>
                </Box>

                {/* Invoice meta — left side in RTL */}
                <Box>
                    <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ mb: 0.4 }}>
                        {sale.invoice_no}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {dateFormatted}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            label={st.label} size="small"
                            sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, border: `1px solid ${alpha(st.color, 0.3)}` }}
                        />
                        <Chip
                            label={paymentLabel} size="small" variant="outlined"
                            sx={{ fontWeight: 600, borderRadius: 1 }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* ── Items table ── */}
            <Box sx={{ mb: 3, border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: 2, overflow: 'hidden' }}>
                {/* Table header */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 72px 120px 120px',
                    px: 2, py: 1.2,
                    bgcolor: alpha(theme.palette.primary.main, isLight ? 0.06 : 0.12),
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main">المنتج</Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textAlign: 'center' }}>الكمية</Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textAlign: 'end' }}>سعر الوحدة</Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textAlign: 'end' }}>المجموع</Typography>
                </Box>

                {/* Item rows */}
                {sale.items.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.disabled">لا توجد منتجات</Typography>
                    </Box>
                ) : (
                    sale.items.map((item, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 72px 120px 120px',
                                px: 2, py: 1.25,
                                borderBottom: idx < sale.items.length - 1
                                    ? `1px solid ${alpha(theme.palette.divider, 0.4)}`
                                    : 'none',
                                bgcolor: idx % 2 === 1 ? alpha(theme.palette.action.hover, 0.3) : 'transparent',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                            }}
                        >
                            <Box sx={cellSx()}>
                                <Typography variant="body2" fontWeight={600}>
                                    {item.product?.name || `منتج #${item.product_id}`}
                                </Typography>
                            </Box>
                            <Box sx={cellSx('center')}>
                                <Typography variant="body2" color="text.secondary"
                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.07), px: 1, borderRadius: 1, fontWeight: 600 }}>
                                    {item.qty}
                                </Typography>
                            </Box>
                            <Box sx={cellSx('end')}>
                                <Typography variant="body2" color="text.secondary">
                                    {item.unit_price?.toFixed(2)} دج
                                </Typography>
                            </Box>
                            <Box sx={cellSx('end')}>
                                <Typography variant="body2" fontWeight={700} color="primary.main">
                                    {(item.line_total ?? item.unit_price * item.qty)?.toFixed(2)} دج
                                </Typography>
                            </Box>
                        </Box>
                    ))
                )}
            </Box>

            {/* ── Grand total ── */}
            <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                px: 2.5, py: 1.75, borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                border: `2px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                width: { xs: '100%', sm: 340 },
                marginInlineStart: 'auto',
            }}>
                <Typography variant="subtitle2" fontWeight={800}>الإجمالي النهائي</Typography>
                <Typography variant="subtitle1" fontWeight={900} color="primary.main">
                    {sale.total?.toFixed(2)} دج
                </Typography>
            </Box>

        </Box>
    );
}
