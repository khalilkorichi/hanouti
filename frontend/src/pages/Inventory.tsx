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
    Fade
} from '@mui/material';
import {
    Search as SearchIcon,
    Edit as EditIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { CustomButton, UnifiedModal } from '../components/Common';
import { productService, type Product } from '../services/productService';
import { useNotification } from '../contexts/NotificationContext';

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

    // Fetch inventory
    const { data: products, isLoading } = useQuery({
        queryKey: ['inventory', searchQuery, stockStatusFilter, page, pageSize],
        queryFn: () => productService.getAll({
            query: searchQuery || undefined,
            skip: page * pageSize,
            limit: pageSize
        })
    });

    // Update product mutation
    const updateProductMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
            productService.update(id, data as Product),
        onSuccess: () => {
            showNotification('تم تحديث المنتج بنجاح', 'success');
            setShowEditModal(false);
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
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
        updateProductMutation.mutate({
            id: selectedProduct.id,
            data: editForm as Partial<Product>
        });
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'اسم المنتج',
            flex: 1,
            minWidth: 200
        },
        {
            field: 'sku',
            headerName: 'رمز SKU',
            width: 120
        },
        {
            field: 'stock_qty',
            headerName: 'الكمية',
            width: 100,
            renderCell: (params) => {
                const status = getStockStatus(params.row);
                return (
                    <Chip
                        icon={status.icon}
                        label={params.value}
                        color={status.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        size="small"
                    />
                );
            }
        },
        {
            field: 'min_qty',
            headerName: 'الحد الأدنى',
            width: 110
        },
        {
            field: 'purchase_price',
            headerName: 'سعر الشراء',
            width: 120,
            valueFormatter: (value) => `${(value as number)?.toFixed(2) || '0.00'} دج`
        },
        {
            field: 'sale_price',
            headerName: 'سعر البيع',
            width: 120,
            valueFormatter: (value) => `${(value as number)?.toFixed(2) || '0.00'} دج`
        },
        {
            field: 'status',
            headerName: 'الحالة',
            width: 120,
            renderCell: (params) => {
                const status = getStockStatus(params.row);
                return (
                    <Chip
                        label={status.label}
                        color={status.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        size="small"
                    />
                );
            }
        },
        {
            field: 'actions',
            headerName: 'الإجراءات',
            width: 100,
            sortable: false,
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
                        إدارة المخزون
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        متابعة المخزون وتعديل الكميات والأسعار
                    </Typography>
                </Box>
            </Fade>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <TextField
                        placeholder="بحث عن منتج..."
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
                        label="حالة المخزون"
                        value={stockStatusFilter}
                        onChange={(e) => setStockStatusFilter(e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="">الكل</MenuItem>
                        <MenuItem value="ok">كافي</MenuItem>
                        <MenuItem value="low">منخفض</MenuItem>
                        <MenuItem value="out">نفد</MenuItem>
                    </TextField>
                </Stack>
            </Paper>

            {/* Data Grid */}
            <Paper sx={{ height: 600, borderRadius: 3, overflow: 'hidden', boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <DataGrid
                    rows={products || []}
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

            {/* Quick Edit Modal */}
            <UnifiedModal
                open={showEditModal}
                onClose={() => setShowEditModal(false)}
                title={`تعديل: ${selectedProduct?.name}`}
                maxWidth="sm"
                actions={
                    <>
                        <CustomButton onClick={() => setShowEditModal(false)} color="inherit">
                            إلغاء
                        </CustomButton>
                        <CustomButton
                            variant="contained"
                            onClick={handleSaveEdit}
                            loading={updateProductMutation.isPending}
                        >
                            حفظ
                        </CustomButton>
                    </>
                }
            >
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="الكمية"
                        type="number"
                        value={editForm.stock_qty}
                        onChange={(e) => setEditForm({ ...editForm, stock_qty: parseInt(e.target.value) })}
                        fullWidth
                    />
                    <TextField
                        label="الحد الأدنى"
                        type="number"
                        value={editForm.min_qty}
                        onChange={(e) => setEditForm({ ...editForm, min_qty: parseInt(e.target.value) })}
                        fullWidth
                    />
                    <TextField
                        label="سعر الشراء"
                        type="number"
                        value={editForm.purchase_price}
                        onChange={(e) => setEditForm({ ...editForm, purchase_price: parseFloat(e.target.value) })}
                        fullWidth
                    />
                    <TextField
                        label="سعر البيع"
                        type="number"
                        value={editForm.sale_price}
                        onChange={(e) => setEditForm({ ...editForm, sale_price: parseFloat(e.target.value) })}
                        fullWidth
                    />
                </Stack>
            </UnifiedModal>
        </Box>
    );
}
