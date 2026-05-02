import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Switch,
    Tooltip,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Category as CategoryIcon,
} from '@mui/icons-material';
import { categoryService, type Category, type CategoryCreate, type CategoryUpdate } from '../services/categoryService';
import { UnifiedModal, CustomButton, CustomInput, CustomIconButton, PageHeader } from '../components/Common';

export default function Categories() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryCreate>({ name: '', description: '', is_active: true });

    const { data: categories, isLoading, error } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getAll
    });

    const createMutation = useMutation({
        mutationFn: categoryService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            handleCloseModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: CategoryUpdate }) => categoryService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            handleCloseModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: categoryService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                description: category.description || '',
                is_active: category.is_active
            });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', description: '', is_active: true });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '', is_active: true });
    };

    const handleSubmit = () => {
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">حدث خطأ أثناء تحميل البيانات</Alert>;

    return (
        <Box sx={{ p: 3 }}>
            <PageHeader
                title="الفئات"
                subtitle="تنظيم منتجاتك في فئات وأقسام"
                icon={<CategoryIcon />}
                actions={
                    <CustomButton variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
                        إضافة فئة
                    </CustomButton>
                }
            />

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                            <TableCell>الاسم</TableCell>
                            <TableCell>الوصف</TableCell>
                            <TableCell align="center">الحالة</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categories?.map((category) => (
                            <TableRow key={category.id} hover>
                                <TableCell sx={{ fontWeight: 600 }}>{category.name}</TableCell>
                                <TableCell>{category.description || '-'}</TableCell>
                                <TableCell align="center">
                                    <Switch
                                        checked={category.is_active}
                                        onChange={(e) => updateMutation.mutate({ id: category.id, data: { is_active: e.target.checked } })}
                                        color="success"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="تعديل">
                                        <CustomIconButton variant="info" onClick={() => handleOpenModal(category)} sx={{ ml: 1 }}>
                                            <EditIcon fontSize="small" />
                                        </CustomIconButton>
                                    </Tooltip>
                                    <Tooltip title="حذف">
                                        <CustomIconButton variant="error" onClick={() => handleDelete(category.id)}>
                                            <DeleteIcon fontSize="small" />
                                        </CustomIconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">لا توجد فئات مضافة</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <UnifiedModal
                open={isModalOpen}
                onClose={handleCloseModal}
                title={editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
                maxWidth="sm"
                actions={
                    <>
                        <CustomButton onClick={handleCloseModal} color="inherit">إلغاء</CustomButton>
                        <CustomButton
                            onClick={handleSubmit}
                            variant="contained"
                            loading={createMutation.isPending || updateMutation.isPending}
                            disabled={!formData.name}
                        >
                            حفظ
                        </CustomButton>
                    </>
                }
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
                    <CustomInput
                        label="اسم الفئة"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        fullWidth
                        required
                    />
                    <CustomInput
                        label="الوصف"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        fullWidth
                        multiline
                        rows={3}
                    />
                </Box>
            </UnifiedModal>
        </Box>
    );
}
