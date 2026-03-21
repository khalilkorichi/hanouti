import { Box, Typography, List, ListItem, ListItemText, IconButton, Divider, TextField, Select, MenuItem, FormControl, InputLabel, Paper, Stack } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon, ShoppingCartCheckout as CheckoutIcon, Print as PrintIcon } from '@mui/icons-material';
import { useCartStore } from '../../store/cartStore';
import { useDroppable } from '@dnd-kit/core';
import { CustomButton, UnifiedModal } from '../Common';
import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { salesService, type Sale } from '../../services/salesService';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from './Receipt';
import { useNotification } from '../../contexts/NotificationContext';

export default function CartPanel() {
    const { items, removeItem, updateQty, updateItemPrice, clearCart, getSubtotal, getDiscount, getTotal, discountValue, discountType, setDiscount } = useCartStore();
    const { setNodeRef, isOver } = useDroppable({ id: 'cart-droppable' });
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);
    const { showNotification } = useNotification();

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
    });

    const createSaleMutation = useMutation({
        mutationFn: salesService.create,
        onSuccess: (data) => {
            // Auto complete for now
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

    const handleUpdateQty = (id: number, newQty: number) => {
        const result = updateQty(id, newQty);
        if (!result.success && result.message) {
            showNotification(result.message, 'warning');
        }
    };

    const handleCheckout = () => {
        if (items.length === 0) return;

        const saleData = {
            items: items.map(item => ({
                product_id: item.id,
                qty: item.qty,
                unit_price: item.sale_price,
                tax_rate: 0 // Default 0 for now
            })),
            payment_method: paymentMethod,
            discount_value: discountValue,
            discount_type: discountType,
            tax_value: 0
        };

        createSaleMutation.mutate(saleData);
    };

    return (
        <Paper
            ref={setNodeRef}
            elevation={3}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: isOver ? 'action.hover' : 'background.paper',
                transition: 'background-color 0.2s',
                borderRadius: 3,
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <Typography variant="h6" fontWeight="bold">السلة ({items.length})</Typography>
            </Box>

            {/* Items List */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {items.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                        <CheckoutIcon sx={{ fontSize: 64, mb: 2 }} />
                        <Typography>السلة فارغة</Typography>
                        <Typography variant="caption">اسحب المنتجات هنا</Typography>
                    </Box>
                ) : (
                    <List>
                        {items.map((item) => (
                            <ListItem
                                key={item.id}
                                secondaryAction={
                                    <IconButton edge="end" color="error" onClick={() => removeItem(item.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                }
                                sx={{ borderBottom: 1, borderColor: 'divider' }}
                            >
                                <ListItemText
                                    primary={item.name}
                                    secondary={
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={item.sale_price}
                                            onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                                            InputProps={{
                                                endAdornment: <Typography variant="caption" sx={{ mx: 0.5 }}>دج</Typography>,
                                                disableUnderline: true,
                                                sx: { fontSize: '0.875rem', fontWeight: 500, color: 'primary.main' }
                                            }}
                                            variant="standard"
                                            sx={{ width: 80 }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    }
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton size="small" onClick={() => handleUpdateQty(item.id, item.qty - 1)}>
                                        <RemoveIcon fontSize="small" />
                                    </IconButton>
                                    <Typography fontWeight="bold">{item.qty}</Typography>
                                    <IconButton size="small" onClick={() => handleUpdateQty(item.id, item.qty + 1)}>
                                        <AddIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

            {/* Footer / Summary */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
                <Stack spacing={2}>
                    {/* Discount & Payment */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            label="الخصم"
                            size="small"
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscount(Number(e.target.value), discountType)}
                            InputProps={{
                                endAdornment: (
                                    <Select
                                        value={discountType}
                                        onChange={(e) => setDiscount(discountValue, e.target.value as 'fixed' | 'percentage')}
                                        variant="standard"
                                        disableUnderline
                                        sx={{ width: 60 }}
                                    >
                                        <MenuItem value="fixed">دج</MenuItem>
                                        <MenuItem value="percentage">%</MenuItem>
                                    </Select>
                                )
                            }}
                            fullWidth
                        />
                        <FormControl size="small" fullWidth>
                            <InputLabel>طريقة الدفع</InputLabel>
                            <Select
                                value={paymentMethod}
                                label="طريقة الدفع"
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <MenuItem value="cash">نقدًا</MenuItem>
                                <MenuItem value="card">بطاقة</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Divider />

                    {/* Totals */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">المجموع الفرعي:</Typography>
                        <Typography fontWeight="bold">{getSubtotal().toFixed(2)} دج</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                        <Typography>الخصم:</Typography>
                        <Typography fontWeight="bold">-{getDiscount().toFixed(2)} دج</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="h5" fontWeight="bold" color="primary">الإجمالي:</Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary">{getTotal().toFixed(2)} دج</Typography>
                    </Box>

                    <CustomButton
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={<CheckoutIcon />}
                        onClick={handleCheckout}
                        disabled={items.length === 0 || createSaleMutation.isPending || completeSaleMutation.isPending}
                        loading={createSaleMutation.isPending || completeSaleMutation.isPending}
                    >
                        إتمام البيع
                    </CustomButton>
                </Stack>
            </Box>

            {/* Success Modal */}
            <UnifiedModal
                open={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="تمت العملية بنجاح"
                maxWidth="sm"
                actions={
                    <>
                        <CustomButton onClick={() => setShowSuccessModal(false)} color="inherit">إغلاق</CustomButton>
                        <CustomButton
                            onClick={handlePrint}
                            variant="contained"
                            startIcon={<PrintIcon />}
                        >
                            طباعة الفاتورة
                        </CustomButton>
                    </>
                }
            >
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" gutterBottom>تم حفظ عملية البيع بنجاح!</Typography>
                    <Typography color="text.secondary">رقم الفاتورة: {completedSale?.invoice_no}</Typography>
                </Box>
            </UnifiedModal>

            {/* Hidden Receipt for Printing */}
            <div style={{ display: 'none' }}>
                {completedSale && <Receipt ref={receiptRef} sale={completedSale} />}
            </div>
        </Paper>
    );
}
