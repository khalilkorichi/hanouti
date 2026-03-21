import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Box, Tabs, Tab, InputAdornment, Stack, FormControlLabel, Switch, Typography
} from '@mui/material';
import { CustomInput, CustomButton, CustomSelect } from '../Common';
import { useQuery, useMutation } from '@tanstack/react-query';
import { categoryService } from '../../services/categoryService';
import { productService, type Product, type ProductUpdate } from '../../services/productService';

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

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getAll
    });

    const { control, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
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

                    <Box sx={{ display: 'flex', gap: 2 }}>
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
