import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Box, Tabs, Tab, InputAdornment, Stack, FormControlLabel, Switch, Typography,
    Collapse, TextField, CircularProgress, Chip, alpha, useTheme,
} from '@mui/material';
import {
    AddCircleOutlineRounded as AddCatIcon,
    CheckRounded as ConfirmIcon,
    CloseRounded as CancelCatIcon,
    LabelOutlined as CatIcon,
    AutoAwesome as GenerateIcon,
} from '@mui/icons-material';
import { CustomInput, CustomButton, CustomSelect, CustomIconButton } from '../Common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService, type Category } from '../../services/categoryService';
import { productService, type Product, type ProductUpdate } from '../../services/productService';
import { generateUniqueEan13 } from '../../utils/barcode';
import { useNotification } from '../../contexts/NotificationContext';

const productSchema = z.object({
    name: z.string().min(1, 'اسم المنتج مطلوب'),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    category_id: z.number().optional().nullable(),
    purchase_price: z.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي 0'),
    sale_price: z.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي 0'),
    stock_qty: z.number().int().min(0, 'الكمية يجب أن تكون أكبر من أو تساوي 0'),
    min_qty: z.number().int().min(0, 'الحد الأدنى يجب أن يكون أكبر من أو يساوي 0'),
    unit: z.string().min(1, 'الوحدة مطلوبة'),
    image_url: z.string().optional(),
    is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
    product: Product | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
    const [tabValue, setTabValue] = useState(0);
    const [showNewCat, setShowNewCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [generatingBarcode, setGeneratingBarcode] = useState(false);
    const queryClient = useQueryClient();
    const theme = useTheme();
    const { showNotification } = useNotification();

    const handleGenerateBarcode = async () => {
        const current = (getValues('barcode') || '').trim();
        if (current) {
            const ok = window.confirm(
                `الحقل يحتوي على باركود (${current}). هل تريد استبداله بباركود جديد مولّد؟`
            );
            if (!ok) return;
        }
        setGeneratingBarcode(true);
        try {
            const code = await generateUniqueEan13(async (candidate) => {
                const found = await productService.getByBarcode(candidate);
                return !!found;
            });
            setValue('barcode', code, { shouldDirty: true, shouldValidate: true });
            showNotification('تم توليد باركود EAN-13 فريد', 'success');
        } catch (e) {
            const msg = (e as Error).message || 'تعذّر توليد باركود فريد';
            showNotification(msg, 'error');
        } finally {
            setGeneratingBarcode(false);
        }
    };

    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => categoryService.getAll()
    });

    const createCategoryMutation = useMutation({
        mutationFn: (name: string) => categoryService.create({ name }),
        onSuccess: (newCat: Category) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setValue('category_id', newCat.id);
            setShowNewCat(false);
            setNewCatName('');
        }
    });

    const { control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            sku: '',
            barcode: '',
            category_id: undefined,
            purchase_price: 0,
            sale_price: 0,
            stock_qty: 0,
            min_qty: 5,
            unit: 'piece',
            is_active: true
        }
    });

    useEffect(() => {
        if (product) {
            reset({
                name: product.name,
                sku: product.sku || '',
                barcode: product.barcode || '',
                category_id: product.category_id ?? undefined,
                purchase_price: product.purchase_price,
                sale_price: product.sale_price,
                stock_qty: product.stock_qty,
                min_qty: product.min_qty,
                unit: product.unit,
                image_url: product.image_url || '',
                is_active: product.is_active
            });
        } else {
            reset({
                name: '',
                sku: '',
                barcode: '',
                category_id: undefined,
                purchase_price: 0,
                sale_price: 0,
                stock_qty: 0,
                min_qty: 5,
                unit: 'piece',
                is_active: true
            });
        }
        setTabValue(0);
    }, [product, reset]);

    const createMutation = useMutation({
        mutationFn: productService.create,
        onSuccess
    });

    const updateMutation = useMutation({
        mutationFn: (data: ProductUpdate) => productService.update(product!.id, data),
        onSuccess
    });

    const onSubmit = (data: ProductFormData) => {
        const payload = {
            ...data,
            category_id: data.category_id ?? undefined,
        };
        if (product) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs
                value={tabValue}
                onChange={(_e, v) => setTabValue(v)}
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab label="بيانات أساسية" />
                <Tab label="التسعير" />
                <Tab label="المخزون" />
            </Tabs>

            {/* Tab 0: Basic Info — hidden بـ CSS فقط، لا تُحذف من DOM لكي تبقى قيم الحقول */}
            <Box role="tabpanel" hidden={tabValue !== 0}>
                <Stack spacing={2}>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                {...field}
                                label="اسم المنتج"
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        )}
                    />

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flex: 1 }}>
                            <Controller
                                name="barcode"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        {...field}
                                        label="الباركود"
                                        fullWidth
                                    />
                                )}
                            />
                            <CustomIconButton
                                tooltip="توليد باركود EAN-13 فريد"
                                variant="primary"
                                onClick={handleGenerateBarcode}
                                disabled={generatingBarcode}
                                sx={{ mt: 1, flexShrink: 0, border: '1.5px solid', borderColor: 'primary.main' }}
                            >
                                {generatingBarcode
                                    ? <CircularProgress size={16} />
                                    : <GenerateIcon fontSize="small" />
                                }
                            </CustomIconButton>
                        </Box>
                        <Controller
                            name="sku"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    {...field}
                                    label="SKU"
                                    fullWidth
                                />
                            )}
                        />
                    </Box>

                    {/* ── Category selector + inline creator ── */}
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <Controller
                                name="category_id"
                                control={control}
                                render={({ field }) => (
                                    <CustomSelect
                                        {...field}
                                        value={field.value ?? ''}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            field.onChange(v === '' ? undefined : Number(v));
                                        }}
                                        label="الفئة"
                                        fullWidth
                                        options={[
                                            { value: '', label: '— بدون فئة —' },
                                            ...(categories?.map(c => ({ value: c.id, label: c.name })) || [])
                                        ]}
                                    />
                                )}
                            />
                            <CustomIconButton
                                tooltip={showNewCat ? 'إغلاق' : 'إنشاء فئة جديدة'}
                                variant={showNewCat ? 'error' : 'primary'}
                                onClick={() => { setShowNewCat(p => !p); setNewCatName(''); }}
                                sx={{ mt: 1, flexShrink: 0, border: `1.5px solid`, borderColor: showNewCat ? 'error.main' : 'primary.main' }}
                            >
                                {showNewCat ? <CancelCatIcon fontSize="small" /> : <AddCatIcon fontSize="small" />}
                            </CustomIconButton>
                        </Box>

                        {/* Inline new category form */}
                        <Collapse in={showNewCat} timeout={200}>
                            <Box
                                sx={{
                                    mt: 1.5,
                                    p: 1.5,
                                    borderRadius: 2.5,
                                    border: `1.5px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                    background: alpha(theme.palette.primary.main, 0.04),
                                    display: 'flex',
                                    gap: 1,
                                    alignItems: 'center',
                                }}
                            >
                                <CatIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
                                <TextField
                                    size="small"
                                    label="اسم الفئة الجديدة"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCatName.trim()) {
                                            e.preventDefault();
                                            createCategoryMutation.mutate(newCatName.trim());
                                        }
                                    }}
                                    fullWidth
                                    autoFocus
                                    placeholder="مثال: إلكترونيات"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                                <CustomIconButton
                                    tooltip="حفظ الفئة"
                                    variant="success"
                                    onClick={() => { if (newCatName.trim()) createCategoryMutation.mutate(newCatName.trim()); }}
                                    disabled={!newCatName.trim() || createCategoryMutation.isPending}
                                    sx={{ flexShrink: 0 }}
                                >
                                    {createCategoryMutation.isPending
                                        ? <CircularProgress size={16} />
                                        : <ConfirmIcon fontSize="small" />
                                    }
                                </CustomIconButton>
                            </Box>
                            {createCategoryMutation.isSuccess && (
                                <Chip
                                    icon={<ConfirmIcon sx={{ fontSize: 14 }} />}
                                    label="تم إنشاء الفئة وتحديدها"
                                    color="success"
                                    size="small"
                                    sx={{ mt: 1, fontWeight: 700 }}
                                />
                            )}
                        </Collapse>
                    </Box>

                    <Controller
                        name="is_active"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={field.value}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body2" fontWeight={500}>
                                        {field.value ? 'المنتج نشط' : 'المنتج معطّل'}
                                    </Typography>
                                }
                            />
                        )}
                    />
                </Stack>
            </Box>

            {/* Tab 1: Pricing */}
            <Box role="tabpanel" hidden={tabValue !== 1}>
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Controller
                            name="purchase_price"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    label="سعر الشراء"
                                    type="number"
                                    fullWidth
                                    error={!!errors.purchase_price}
                                    helperText={errors.purchase_price?.message}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">دج</InputAdornment>,
                                    }}
                                />
                            )}
                        />
                        <Controller
                            name="sale_price"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    label="سعر البيع"
                                    type="number"
                                    fullWidth
                                    error={!!errors.sale_price}
                                    helperText={errors.sale_price?.message}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">دج</InputAdornment>,
                                    }}
                                />
                            )}
                        />
                    </Box>
                </Stack>
            </Box>

            {/* Tab 2: Inventory */}
            <Box role="tabpanel" hidden={tabValue !== 2}>
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Controller
                            name="stock_qty"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    label="الكمية الحالية"
                                    type="number"
                                    fullWidth
                                    error={!!errors.stock_qty}
                                    helperText={errors.stock_qty?.message}
                                />
                            )}
                        />
                        <Controller
                            name="min_qty"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    label="حد الطلب"
                                    type="number"
                                    fullWidth
                                    error={!!errors.min_qty}
                                    helperText={errors.min_qty?.message}
                                />
                            )}
                        />
                    </Box>

                    <Controller
                        name="unit"
                        control={control}
                        render={({ field }) => (
                            <CustomSelect
                                {...field}
                                label="الوحدة"
                                fullWidth
                                options={[
                                    { value: 'piece', label: 'قطعة' },
                                    { value: 'kg', label: 'كغ' },
                                    { value: 'liter', label: 'لتر' },
                                    { value: 'box', label: 'علبة' }
                                ]}
                            />
                        )}
                    />
                </Stack>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <CustomButton onClick={onCancel} color="inherit" disabled={isLoading}>
                    إلغاء
                </CustomButton>
                <CustomButton
                    type="submit"
                    variant="contained"
                    loading={isLoading}
                >
                    {product ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </CustomButton>
            </Box>
        </form>
    );
}
