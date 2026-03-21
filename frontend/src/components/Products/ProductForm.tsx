import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Tabs, Tab, InputAdornment, Stack } from '@mui/material';
import { CustomInput, CustomButton, CustomSelect } from '../Common';
import { useQuery, useMutation } from '@tanstack/react-query';
import { categoryService } from '../../services/categoryService';
import { productService, type Product, type ProductUpdate } from '../../services/productService';

const productSchema = z.object({
    name: z.string().min(1, 'اسم المنتج مطلوب'),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    category_id: z.number().optional(),
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
                category_id: product.category_id,
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
                purchase_price: 0,
                sale_price: 0,
                stock_qty: 0,
                min_qty: 5,
                unit: 'piece',
                is_active: true
            });
        }
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
        if (product) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="بيانات أساسية" />
                <Tab label="التسعير" />
                <Tab label="المخزون" />
            </Tabs>

            {/* Tab 1: Basic Info */}
            <Box role="tabpanel" hidden={tabValue !== 0}>
                {tabValue === 0 && (
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
                                    label="الفئة"
                                    fullWidth
                                    options={categories?.map(c => ({ value: c.id, label: c.name })) || []}
                                />
                            )}
                        />
                    </Stack>
                )}
            </Box>

            {/* Tab 2: Pricing */}
            <Box role="tabpanel" hidden={tabValue !== 1}>
                {tabValue === 1 && (
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
                )}
            </Box>

            {/* Tab 3: Inventory */}
            <Box role="tabpanel" hidden={tabValue !== 2}>
                {tabValue === 2 && (
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
                )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <CustomButton onClick={onCancel} color="inherit">إلغاء</CustomButton>
                <CustomButton
                    type="submit"
                    variant="contained"
                    loading={createMutation.isPending || updateMutation.isPending}
                >
                    حفظ
                </CustomButton>
            </Box>
        </form>
    );
}
