import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    Chip,
    Tooltip,
    Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    FileDownload as ExportIcon,
    FileUpload as ImportIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { productService, type Product } from '../services/productService';
import { UnifiedModal, CustomButton, CustomIconButton } from '../components/Common';
import ProductForm from '../components/Products/ProductForm';
import ImportProductsModal from '../components/Products/ImportProductsModal';

export default function Products() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });

    const { data: products, isLoading, error } = useQuery({
        queryKey: ['products', searchQuery, paginationModel],
        queryFn: () => productService.getAll({
            skip: paginationModel.page * paginationModel.pageSize,
            limit: paginationModel.pageSize,
            query: searchQuery || undefined
        })
    });

    const { data: totalCount } = useQuery({
        queryKey: ['products-count', searchQuery],
        queryFn: () => productService.getCount({ query: searchQuery || undefined })
    });

    const deleteMutation = useMutation({
        mutationFn: productService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['products-count'] });
        }
    });

    const handleOpenModal = (product?: Product) => {
        setEditingProduct(product || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['products-count'] });
        handleCloseModal();
    };

    const handleDelete = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            deleteMutation.mutate(id);
        }
    };

    const handleExport = () => {
        if (!products || products.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(products.map(p => ({
            'ID': p.id,
            'الاسم': p.name,
            'SKU': p.sku || '',
            'الباركود': p.barcode || '',
            'الفئة': p.category?.name || '',
            'سعر الشراء': p.purchase_price,
            'سعر البيع': p.sale_price,
            'الكمية': p.stock_qty,
            'الوحدة': p.unit,
            'الحالة': p.is_active ? 'نشط' : 'معطل'
        })));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
        XLSX.writeFile(wb, "products.xlsx");
    };

    const columns: GridColDef[] = [
        {
            field: 'id',
            headerName: 'المعرف',
            width: 70
        },
        {
            field: 'name',
            headerName: 'اسم المنتج',
            flex: 1,
            minWidth: 200
        },
        {
            field: 'sku',
            headerName: 'SKU',
            width: 120
        },
        {
            field: 'barcode',
            headerName: 'الباركود',
            width: 130
        },
        {
            field: 'category',
            headerName: 'الفئة',
            width: 120,
            valueGetter: (_value, row) => row.category?.name || '-'
        },
        {
            field: 'sale_price',
            headerName: 'سعر البيع',
            width: 120,
            renderCell: (params: GridRenderCellParams) => (
                <Typography fontWeight="bold" color="primary.main">
                    {params.value} دج
                </Typography>
            )
        },
        {
            field: 'stock_qty',
            headerName: 'الكمية',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value}
                    color={params.value < 10 ? 'error' : 'success'}
                    size="small"
                    variant="outlined"
                />
            )
        },
        {
            field: 'is_active',
            headerName: 'الحالة',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value ? 'نشط' : 'معطل'}
                    color={params.value ? 'success' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'الإجراءات',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => (
                <Box>
                    <Tooltip title="تعديل">
                        <span>
                            <CustomIconButton
                                variant="info"
                                onClick={() => handleOpenModal(params.row as Product)}
                                sx={{ ml: 0.5 }}
                            >
                                <EditIcon fontSize="small" />
                            </CustomIconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="حذف">
                        <span>
                            <CustomIconButton
                                variant="error"
                                onClick={() => handleDelete(params.row.id)}
                            >
                                <DeleteIcon fontSize="small" />
                            </CustomIconButton>
                        </span>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    if (error) return <Alert severity="error">حدث خطأ أثناء تحميل البيانات</Alert>;

    return (
        <Box sx={{ p: 3 }} dir="rtl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">المنتجات</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <CustomButton
                        variant="outlined"
                        startIcon={<ImportIcon />}
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        استيراد
                    </CustomButton>
                    <CustomButton
                        variant="outlined"
                        startIcon={<ExportIcon />}
                        onClick={handleExport}
                    >
                        تصدير
                    </CustomButton>
                    <CustomButton
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenModal()}
                    >
                        إضافة منتج
                    </CustomButton>
                </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="بحث في المنتجات (الاسم، الباركود، SKU)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 3
                        }
                    }}
                />
            </Box>

            <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={products || []}
                    columns={columns}
                    loading={isLoading}
                    rowCount={totalCount || 0}
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    paginationMode="server"
                    pageSizeOptions={[10, 25, 50]}
                    checkboxSelection
                    disableRowSelectionOnClick
                    sx={{
                        borderRadius: 3,
                        boxShadow: 2,
                        direction: 'rtl', // Force RTL in DataGrid
                        '& .MuiDataGrid-cell:focus': {
                            outline: 'none'
                        }
                    }}
                />
            </Box>

            <UnifiedModal
                open={isModalOpen}
                onClose={handleCloseModal}
                title={editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                maxWidth="md"
            >
                <ProductForm
                    product={editingProduct}
                    onSuccess={handleSuccess}
                    onCancel={handleCloseModal}
                />
            </UnifiedModal>

            <ImportProductsModal
                open={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />
        </Box>
    );
}
