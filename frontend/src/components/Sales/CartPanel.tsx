import {
    Box, Typography, IconButton, Divider, TextField, Select, MenuItem,
    FormControl, InputLabel, Paper, Stack, Chip, alpha, useTheme, Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    Delete as DeleteIcon,
    ShoppingCartCheckout as CheckoutIcon,
    Print as PrintIcon,
    Edit as EditIcon,
    ShoppingCartOutlined as EmptyCartIcon
} from '@mui/icons-material';
import { useCartStore } from '../../store/cartStore';
import { useDroppable } from '@dnd-kit/core';
import { CustomButton, UnifiedModal } from '../Common';
import { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService, type Sale } from '../../services/salesService';
import { productService } from '../../services/productService';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from './Receipt';
import { useNotification } from '../../contexts/NotificationContext';

interface EditProductForm {
    name: string;
    sale_price: number;
    purchase_price: number;
    stock_qty: number;
}

export interface CartPanelHandle {
    focusDiscount: () => void;
    triggerCheckout: () => void;
    togglePayment: () => void;
    clearCart: () => void;
}

type CartPanelProps = Record<string, never>;

const CartPanel = forwardRef<CartPanelHandle, CartPanelProps>((_props, ref) => {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    const {
        items, removeItem, updateQty, updateItemPrice,
        clearCart, getSubtotal, getDiscount, getTotal,
        discountValue, discountType, setDiscount
    } = useCartStore();

    const { setNodeRef, isOver } = useDroppable({ id: 'cart-droppable' });
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);
    const discountInputRef = useRef<HTMLInputElement>(null);
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();

    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<EditProductForm>({ name: '', sale_price: 0, purchase_price: 0, stock_qty: 0 });

    const handlePrint = useReactToPrint({ contentRef: receiptRef });

    const createSaleMutation = useMutation({
        mutationFn: salesService.create,
        onSuccess: (data) => {
            completeSaleMutation.mutate(data.id);
        },
        onError: (error) => {
            showNotification('حدث خطأ أثناء إنشاء الفاتورة: ' + error, 'error');
        }
    });

    const completeSaleMutation = useMutation({
        mutationFn: salesService.complete,
        onSuccess: (data) => {
            setCompletedSale(data);
            setShowSuccessModal(true);
            clearCart();
            showNotification('تمت عملية البيع بنجاح', 'success');
        },
        onError: (error) => {
            showNotification('حدث خطأ أثناء إتمام البيع: ' + error, 'error');
        }
    });

    const updateProductMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<EditProductForm> }) =>
            productService.update(id, data),
        onSuccess: (updatedProduct) => {
            updateItemPrice(updatedProduct.id, updatedProduct.sale_price);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setEditingItemId(null);
            showNotification('تم تحديث بيانات المنتج', 'success');
        },
        onError: () => {
            showNotification('فشل تحديث بيانات المنتج', 'error');
        }
    });

    const handleUpdateQty = (id: number, newQty: number) => {
        const result = updateQty(id, newQty);
        if (!result.success && result.message) {
            showNotification(result.message, 'warning');
        }
    };

    const handleOpenEditItem = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        setEditForm({
            name: item.name,
            sale_price: item.sale_price,
            purchase_price: item.purchase_price,
            stock_qty: item.stock_qty,
        });
        setEditingItemId(itemId);
    };

    const handleSaveEditItem = () => {
        if (editingItemId === null) return;
        updateProductMutation.mutate({
            id: editingItemId,
            data: {
                sale_price: editForm.sale_price,
                purchase_price: editForm.purchase_price,
                stock_qty: editForm.stock_qty,
            }
        });
    };

    const handleCheckout = () => {
        if (items.length === 0) return;
        const saleData = {
            items: items.map(item => ({
                product_id: item.id,
                qty: item.qty,
                unit_price: item.sale_price,
                tax_rate: 0
            })),
            payment_method: paymentMethod,
            discount_value: discountValue,
            discount_type: discountType,
            tax_value: 0
        };
        createSaleMutation.mutate(saleData);
    };

    const subtotal = getSubtotal();
    const discount = getDiscount();
    const total = getTotal();
    const isProcessing = createSaleMutation.isPending || completeSaleMutation.isPending;

    useImperativeHandle(ref, () => ({
        focusDiscount: () => {
            discountInputRef.current?.focus();
            discountInputRef.current?.select();
        },
        triggerCheckout: () => {
            if (items.length === 0 || isProcessing) return;
            handleCheckout();
        },
        togglePayment: () => {
            setPaymentMethod(prev => (prev === 'cash' ? 'card' : 'cash'));
            showNotification(
                paymentMethod === 'cash' ? 'تم التحويل إلى الدفع بالبطاقة' : 'تم التحويل إلى الدفع نقداً',
                'info',
            );
        },
        clearCart: () => {
            if (items.length === 0) return;
            clearCart();
            showNotification('تم تفريغ السلة', 'info');
        },
    }), [items.length, isProcessing, paymentMethod, clearCart, showNotification]);

    return (
        <Paper
            ref={setNodeRef}
            elevation={0}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: `1.5px solid ${isOver
                    ? theme.palette.primary.main
                    : alpha(theme.palette.divider, 0.8)}`,
                transition: 'border-color 0.2s, background-color 0.2s',
                bgcolor: isOver ? alpha(theme.palette.primary.main, 0.03) : 'background.paper',
                borderRadius: 3,
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Typography variant="h6" fontWeight={700}>
                    السلة
                </Typography>
                <Chip
                    label={items.length}
                    size="small"
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.25)',
                        color: '#fff',
                        fontWeight: 700,
                        height: 26
                    }}
                />
            </Box>

            {/* Items */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {items.length === 0 ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            gap: 1,
                            color: 'text.disabled',
                            p: 3
                        }}
                    >
                        <EmptyCartIcon sx={{ fontSize: 56 }} />
                        <Typography variant="body2" fontWeight={500}>السلة فارغة</Typography>
                        <Typography variant="caption">اسحب منتجاً أو انقر عليه لإضافته</Typography>
                    </Box>
                ) : (
                    <Box>
                        {items.map((item, index) => (
                            <Box
                                key={item.id}
                                sx={{
                                    px: 2,
                                    py: 1.5,
                                    borderBottom: index < items.length - 1
                                        ? `1px solid ${alpha(theme.palette.divider, 0.6)}`
                                        : 'none',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.03)
                                    },
                                    transition: 'background-color 0.15s'
                                }}
                            >
                                {/* Row 1: Name + actions */}
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            fontWeight={600}
                                            noWrap
                                            sx={{ maxWidth: '90%' }}
                                        >
                                            {item.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {item.sale_price} دج / وحدة
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                                        <Tooltip title="تعديل بيانات المنتج" placement="top">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenEditItem(item.id)}
                                                sx={{
                                                    color: 'primary.main',
                                                    width: 28,
                                                    height: 28,
                                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                                                }}
                                            >
                                                <EditIcon sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="حذف من السلة" placement="top">
                                            <IconButton
                                                size="small"
                                                onClick={() => removeItem(item.id)}
                                                sx={{
                                                    color: 'error.main',
                                                    width: 28,
                                                    height: 28,
                                                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                                                }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* Row 2: Qty controls + price editable + subtotal */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                                            disabled={item.qty <= 1}
                                            sx={{
                                                width: 26, height: 26,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                                                borderRadius: 1
                                            }}
                                        >
                                            <RemoveIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                        <Typography fontWeight={700} sx={{ minWidth: 28, textAlign: 'center', fontSize: '0.9rem' }}>
                                            {item.qty}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                                            sx={{
                                                width: 26, height: 26,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                                                borderRadius: 1
                                            }}
                                        >
                                            <AddIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Box>

                                    {/* Editable price */}
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={item.sale_price}
                                        onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                                        onClick={(e) => e.stopPropagation()}
                                        inputProps={{ style: { textAlign: 'center', fontSize: '0.82rem', width: 60 } }}
                                        InputProps={{
                                            endAdornment: <Typography variant="caption" color="text.secondary">دج</Typography>,
                                            sx: { fontSize: '0.82rem' }
                                        }}
                                        variant="outlined"
                                        sx={{
                                            width: 100,
                                            '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 30 }
                                        }}
                                    />

                                    {/* Line total */}
                                    <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        color="primary.main"
                                        sx={{ minWidth: 60, textAlign: 'start', fontSize: '0.9rem' }}
                                    >
                                        {(item.sale_price * item.qty).toFixed(0)} دج
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Footer */}
            <Box
                sx={{
                    p: 2,
                    bgcolor: isLight ? alpha(theme.palette.grey[50], 0.9) : alpha(theme.palette.grey[900], 0.5),
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`
                }}
            >
                <Stack spacing={1.5}>
                    {/* Discount & Payment */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            label="الخصم (F4)"
                            size="small"
                            type="number"
                            inputRef={discountInputRef}
                            value={discountValue}
                            onChange={(e) => setDiscount(Number(e.target.value), discountType)}
                            InputProps={{
                                endAdornment: (
                                    <Select
                                        value={discountType}
                                        onChange={(e) => setDiscount(discountValue, e.target.value as 'fixed' | 'percentage')}
                                        variant="standard"
                                        disableUnderline
                                        sx={{ width: 45, fontSize: '0.8rem' }}
                                    >
                                        <MenuItem value="fixed">دج</MenuItem>
                                        <MenuItem value="percentage">%</MenuItem>
                                    </Select>
                                )
                            }}
                            sx={{ flex: 1 }}
                        />
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>الدفع</InputLabel>
                            <Select
                                value={paymentMethod}
                                label="الدفع"
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <MenuItem value="cash">نقداً</MenuItem>
                                <MenuItem value="card">بطاقة</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Divider />

                    {/* Totals */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">المجموع:</Typography>
                            <Typography variant="body2" fontWeight={600}>{subtotal.toFixed(2)} دج</Typography>
                        </Box>
                        {discount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="success.main">الخصم:</Typography>
                                <Typography variant="body2" fontWeight={600} color="success.main">- {discount.toFixed(2)} دج</Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={800} color="primary.main">الإجمالي:</Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="primary.main">{total.toFixed(2)} دج</Typography>
                        </Box>
                    </Box>

                    <CustomButton
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={<CheckoutIcon />}
                        onClick={handleCheckout}
                        disabled={items.length === 0 || isProcessing}
                        loading={isProcessing}
                        sx={{ borderRadius: 2, py: 1.2 }}
                    >
                        إتمام البيع
                    </CustomButton>
                </Stack>
            </Box>

            {/* Edit Product Modal */}
            <UnifiedModal
                open={editingItemId !== null}
                onClose={() => setEditingItemId(null)}
                title="تعديل بيانات المنتج"
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton
                            variant="contained"
                            onClick={handleSaveEditItem}
                            loading={updateProductMutation.isPending}
                        >
                            حفظ وتزامن
                        </CustomButton>
                        <CustomButton onClick={() => setEditingItemId(null)} color="inherit">
                            إلغاء
                        </CustomButton>
                    </>
                }
            >
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        التعديلات ستُزامَن مع قاعدة البيانات وصفحة المنتجات
                    </Typography>
                    <TextField
                        label="سعر البيع"
                        type="number"
                        size="small"
                        fullWidth
                        value={editForm.sale_price}
                        onChange={(e) => setEditForm(f => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))}
                        InputProps={{ endAdornment: <Typography variant="caption">دج</Typography> }}
                    />
                    <TextField
                        label="سعر الشراء"
                        type="number"
                        size="small"
                        fullWidth
                        value={editForm.purchase_price}
                        onChange={(e) => setEditForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))}
                        InputProps={{ endAdornment: <Typography variant="caption">دج</Typography> }}
                    />
                    <TextField
                        label="الكمية في المخزون"
                        type="number"
                        size="small"
                        fullWidth
                        value={editForm.stock_qty}
                        onChange={(e) => setEditForm(f => ({ ...f, stock_qty: parseInt(e.target.value) || 0 }))}
                    />
                </Stack>
            </UnifiedModal>

            {/* Sale Success Modal */}
            <UnifiedModal
                open={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="تمت عملية البيع"
                maxWidth="sm"
                actions={
                    <>
                        <CustomButton
                            onClick={handlePrint}
                            variant="contained"
                            startIcon={<PrintIcon />}
                        >
                            طباعة الفاتورة
                        </CustomButton>
                        <CustomButton onClick={() => setShowSuccessModal(false)} color="inherit">
                            إغلاق
                        </CustomButton>
                    </>
                }
            >
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        تم حفظ الفاتورة بنجاح!
                    </Typography>
                    <Typography color="text.secondary">
                        رقم الفاتورة: <strong>{completedSale?.invoice_no}</strong>
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                        الإجمالي: <strong>{completedSale?.total?.toFixed(2)} دج</strong>
                    </Typography>
                </Box>
            </UnifiedModal>

            {/* Hidden Receipt */}
            <div style={{ display: 'none' }}>
                {completedSale && <Receipt ref={receiptRef} sale={completedSale} />}
            </div>
        </Paper>
    );
});

CartPanel.displayName = 'CartPanel';

export default CartPanel;
