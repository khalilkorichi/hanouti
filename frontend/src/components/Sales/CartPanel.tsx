import {
    Box, Typography, IconButton, Divider, TextField, Select, MenuItem,
    FormControl, InputLabel, Paper, Stack, Chip, alpha, useTheme, Tooltip,
    Autocomplete, Collapse,
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    Delete as DeleteIcon,
    ShoppingCartCheckout as CheckoutIcon,
    Print as PrintIcon,
    Edit as EditIcon,
    ShoppingCartOutlined as EmptyCartIcon,
    PersonAddRounded as PersonAddIcon,
    UnfoldLess as CollapseIcon,
    UnfoldMore as ExpandIcon,
} from '@mui/icons-material';
import { useCartStore } from '../../store/cartStore';
import { qtyStep, qtyMin, formatQty, unitLabel, isFractionalUnit, roundQty } from '../../utils/units';
import { useDroppable } from '@dnd-kit/core';
import { CustomButton, UnifiedModal } from '../Common';
import { forwardRef, useImperativeHandle, useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { salesService, type Sale } from '../../services/salesService';
import { productService } from '../../services/productService';
import { customerService, type Customer } from '../../services/customerService';
import { useSettingsStore } from '../../store/settingsStore';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from './Receipt';
import { useNotification } from '../../contexts/NotificationContext';
import { useFormatters } from '../../utils/format';

interface EditProductForm {
    name: string;
    sale_price: number;
    purchase_price: number;
    stock_qty: number;
}

interface CartQtyControlProps {
    item: { id: number; qty: number; unit: string; stock_qty: number };
    onChange: (qty: number) => void;
}

function CartQtyControl({ item, onChange }: CartQtyControlProps) {
    const theme = useTheme();
    const fractional = isFractionalUnit(item.unit);
    const step = qtyStep(item.unit);
    const min = qtyMin(item.unit);
    const [draft, setDraft] = useState<string>(formatQty(item.qty, item.unit));
    const [editing, setEditing] = useState(false);

    // Sync external qty changes back into the input when not editing.
    if (!editing && draft !== formatQty(item.qty, item.unit)) {
        setDraft(formatQty(item.qty, item.unit));
    }

    const commit = (raw: string) => {
        const v = parseFloat(raw.replace(',', '.'));
        if (!Number.isFinite(v) || v <= 0) {
            setDraft(formatQty(item.qty, item.unit));
            return;
        }
        const clamped = Math.max(min, Math.min(v, item.stock_qty));
        const rounded = roundQty(clamped, item.unit);
        onChange(rounded);
        setDraft(formatQty(rounded, item.unit));
    };

    const adjust = (delta: number) => {
        const next = roundQty(item.qty + delta, item.unit);
        onChange(Math.max(min, Math.min(next, item.stock_qty)));
    };

    const stepperBorder = alpha(theme.palette.primary.main, 0.4);
    const stepperBg = theme.palette.primary.main;
    const stepperBgHover = theme.palette.primary.dark;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
            {/* Unified stepper: - [number unit] +  */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    height: 28,
                    border: `1px solid ${stepperBorder}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                }}
            >
                <Box
                    component="button"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); adjust(-step); }}
                    disabled={item.qty <= min}
                    sx={{
                        cursor: 'pointer',
                        border: 'none',
                        bgcolor: stepperBg,
                        color: theme.palette.primary.contrastText,
                        width: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s',
                        '&:hover:not(:disabled)': { bgcolor: stepperBgHover },
                        '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
                    }}
                >
                    <RemoveIcon sx={{ fontSize: 14 }} />
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                        gap: 0.25,
                        borderInline: `1px solid ${stepperBorder}`,
                        minWidth: fractional ? 78 : 56,
                    }}
                >
                    <input
                        type="number"
                        value={draft}
                        onFocus={(e) => { setEditing(true); e.target.select(); }}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => { setEditing(false); commit(draft); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') {
                                setDraft(formatQty(item.qty, item.unit));
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        step={step}
                        min={min}
                        max={item.stock_qty}
                        style={{
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            textAlign: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            width: fractional ? 44 : 32,
                            padding: 0,
                            color: 'inherit',
                            fontFamily: 'inherit',
                            MozAppearance: 'textfield',
                        }}
                    />
                    <Typography
                        component="span"
                        sx={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'text.secondary',
                            lineHeight: 1,
                        }}
                    >
                        {unitLabel(item.unit)}
                    </Typography>
                </Box>

                <Box
                    component="button"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); adjust(step); }}
                    disabled={item.qty >= item.stock_qty}
                    sx={{
                        cursor: 'pointer',
                        border: 'none',
                        bgcolor: stepperBg,
                        color: theme.palette.primary.contrastText,
                        width: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s',
                        '&:hover:not(:disabled)': { bgcolor: stepperBgHover },
                        '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
                    }}
                >
                    <AddIcon sx={{ fontSize: 14 }} />
                </Box>
            </Box>
        </Box>
    );
}

export interface CartPanelHandle {
    focusDiscount: () => void;
    triggerCheckout: () => void;
    togglePayment: () => void;
    clearCart: () => void;
    togglePosTools: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CartPanelProps {}

const CartPanel = forwardRef<CartPanelHandle, CartPanelProps>((_props, ref) => {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const fmt = useFormatters();

    const {
        items, removeItem, updateQty, updateItemPrice,
        clearCart, getSubtotal, getDiscount, getTotal,
        discountValue, discountType, setDiscount
    } = useCartStore();

    const { setNodeRef, isOver } = useDroppable({ id: 'cart-droppable' });
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [paidAmountInput, setPaidAmountInput] = useState<string>('');
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '' });
    const receiptRef = useRef<HTMLDivElement>(null);
    const discountInputRef = useRef<HTMLInputElement>(null);
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();
    const debtsEnabled = useSettingsStore((s) => s.isPathVisible('/customers'));
    const posToolsCollapsed = useSettingsStore((s) => s.posToolsCollapsed);
    const togglePosToolsCollapsed = useSettingsStore((s) => s.togglePosToolsCollapsed);

    const { data: customers = [] } = useQuery({
        queryKey: ['customers-list-cart'],
        queryFn: () => customerService.list(),
        enabled: debtsEnabled,
    });

    const createCustomerMutation = useMutation({
        mutationFn: customerService.create,
        onSuccess: (c) => {
            queryClient.invalidateQueries({ queryKey: ['customers-list-cart'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            setSelectedCustomer(c);
            setShowAddCustomer(false);
            setNewCustomerForm({ name: '', phone: '' });
            showNotification('تمت إضافة العميل', 'success');
        },
        onError: (e: { response?: { data?: { detail?: string } } }) => {
            showNotification(e.response?.data?.detail || 'فشل إضافة العميل', 'error');
        },
    });

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
            setSelectedCustomer(null);
            setPaidAmountInput('');
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customers-list-cart'] });
            queryClient.invalidateQueries({ queryKey: ['customers-debt-summary'] });
            showNotification(
                data.due_amount > 0
                    ? `تمت العملية — دين بقيمة ${data.due_amount.toFixed(0)} دج على ${data.customer?.name || 'العميل'}`
                    : 'تمت عملية البيع بنجاح',
                'success'
            );
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

    const subtotal = getSubtotal();
    const discount = getDiscount();
    const total = getTotal();
    const isProcessing = createSaleMutation.isPending || completeSaleMutation.isPending;

    const paidAmount = useMemo(() => {
        if (paidAmountInput === '') return total;
        const parsed = parseFloat(paidAmountInput);
        if (isNaN(parsed) || parsed < 0) return 0;
        return Math.min(parsed, total);
    }, [paidAmountInput, total]);
    const dueAmount = Math.max(0, total - paidAmount);
    const hasDebt = dueAmount > 0.001;

    const handleCheckout = () => {
        if (items.length === 0) return;
        if (hasDebt && !selectedCustomer) {
            showNotification('يجب اختيار عميل للبيع المؤجل', 'warning');
            return;
        }
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
            tax_value: 0,
            customer_id: selectedCustomer?.id ?? null,
            paid_amount: paidAmountInput === '' ? null : paidAmount,
        };
        createSaleMutation.mutate(saleData);
    };

    useImperativeHandle(ref, () => ({
        focusDiscount: () => {
            // Auto-expand the tools panel if it was hidden so the field is reachable.
            if (posToolsCollapsed) togglePosToolsCollapsed();
            // Defer focus one tick so the Collapse animation has mounted the input.
            setTimeout(() => {
                discountInputRef.current?.focus();
                discountInputRef.current?.select();
            }, posToolsCollapsed ? 220 : 0);
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
        togglePosTools: () => {
            togglePosToolsCollapsed();
        },
    }), [items.length, isProcessing, paymentMethod, clearCart, showNotification, posToolsCollapsed, togglePosToolsCollapsed]);

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    <Tooltip title={posToolsCollapsed ? 'إظهار العميل والخصم والدفع (F6)' : 'إخفاء العميل والخصم والدفع (F6)'}>
                        <IconButton
                            size="small"
                            onClick={togglePosToolsCollapsed}
                            sx={{
                                color: '#fff',
                                bgcolor: 'rgba(255,255,255,0.15)',
                                width: 28,
                                height: 28,
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
                            }}
                        >
                            {posToolsCollapsed
                                ? <ExpandIcon sx={{ fontSize: 18 }} />
                                : <CollapseIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                    </Tooltip>
                </Box>
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
                                            {item.sale_price} دج / {unitLabel(item.unit)}
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
                                    <CartQtyControl
                                        item={item}
                                        onChange={(q) => handleUpdateQty(item.id, q)}
                                    />

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
                                        sx={{ minWidth: 64, textAlign: 'start', fontSize: '0.9rem' }}
                                    >
                                        {Math.round(item.sale_price * item.qty)} دج
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
                    {/* Compact summary shown when tools are hidden */}
                    {posToolsCollapsed && (
                        <Box
                            onClick={togglePosToolsCollapsed}
                            role="button"
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.75,
                                alignItems: 'center',
                                px: 1.25,
                                py: 0.75,
                                borderRadius: 1.5,
                                cursor: 'pointer',
                                border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
                                bgcolor: isLight
                                    ? alpha(theme.palette.primary.main, 0.04)
                                    : alpha(theme.palette.primary.main, 0.10),
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                },
                            }}
                        >
                            <Chip
                                size="small"
                                label={`الدفع: ${paymentMethod === 'cash' ? 'نقداً' : 'بطاقة'}`}
                                sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                            />
                            {discountValue > 0 && (
                                <Chip
                                    size="small"
                                    color="success"
                                    label={`خصم: ${discountValue}${discountType === 'percentage' ? '%' : ' دج'}`}
                                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                                />
                            )}
                            {debtsEnabled && selectedCustomer && (
                                <Chip
                                    size="small"
                                    color="primary"
                                    label={`العميل: ${selectedCustomer.name}`}
                                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600, maxWidth: 180 }}
                                />
                            )}
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ ml: 'auto', fontWeight: 500 }}
                            >
                                F6 للتعديل
                            </Typography>
                        </Box>
                    )}

                    <Collapse in={!posToolsCollapsed} timeout={200} unmountOnExit>
                        <Stack spacing={1.5}>
                    {/* Customer attach (debts feature) */}
                    {debtsEnabled && (
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Autocomplete<Customer, false, false, false>
                                size="small"
                                options={customers}
                                value={selectedCustomer}
                                onChange={(_, v) => setSelectedCustomer(v)}
                                getOptionLabel={(o) => o.name + (o.phone ? ` — ${o.phone}` : '')}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={hasDebt ? 'العميل (مطلوب للدين) *' : 'العميل (اختياري)'}
                                        error={hasDebt && !selectedCustomer}
                                    />
                                )}
                                sx={{ flex: 1 }}
                            />
                            <Tooltip title="إضافة عميل جديد">
                                <IconButton
                                    color="primary"
                                    onClick={() => setShowAddCustomer(true)}
                                    sx={{
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                        borderRadius: 1.5,
                                    }}
                                >
                                    <PersonAddIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}

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
                        </Stack>
                    </Collapse>

                    {/* Paid amount (debts feature only) */}
                    {debtsEnabled && (
                        <TextField
                            label="المبلغ المدفوع"
                            size="small"
                            type="number"
                            value={paidAmountInput}
                            onChange={(e) => setPaidAmountInput(e.target.value)}
                            placeholder={fmt.amount(total)}
                            helperText={
                                hasDebt
                                    ? `سيُسجَّل دين بقيمة ${fmt.money(dueAmount, { decimalPlaces: 0 })}`
                                    : 'اتركه فارغاً للدفع الكامل'
                            }
                            FormHelperTextProps={{
                                sx: { color: hasDebt ? 'error.main' : 'text.secondary', fontWeight: hasDebt ? 700 : 400 },
                            }}
                            InputProps={{ endAdornment: <Typography variant="caption">{fmt.settings.currencySymbol}</Typography> }}
                        />
                    )}

                    <Divider />

                    {/* Totals */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">المجموع:</Typography>
                            <Typography variant="body2" fontWeight={600}>{fmt.money(subtotal)}</Typography>
                        </Box>
                        {discount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="success.main">الخصم:</Typography>
                                <Typography variant="body2" fontWeight={600} color="success.main">- {fmt.money(discount)}</Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={800} color="primary.main">الإجمالي:</Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="primary.main">{fmt.money(total)}</Typography>
                        </Box>
                        {debtsEnabled && hasDebt && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="error.main" fontWeight={700}>الدين:</Typography>
                                <Typography variant="body2" fontWeight={800} color="error.main">{fmt.money(dueAmount)}</Typography>
                            </Box>
                        )}
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
                        الإجمالي: <strong>{fmt.money(completedSale?.total ?? 0)}</strong>
                    </Typography>
                    {completedSale?.customer && (
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                            العميل: <strong>{completedSale.customer.name}</strong>
                        </Typography>
                    )}
                    {completedSale && completedSale.due_amount > 0 && (
                        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08) }}>
                            <Typography color="error.main" fontWeight={800}>
                                دين مستحق: {fmt.money(completedSale.due_amount)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                مدفوع: {fmt.money(completedSale.paid_amount)}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </UnifiedModal>

            {/* Add Customer Modal */}
            <UnifiedModal
                open={showAddCustomer}
                onClose={() => setShowAddCustomer(false)}
                title="إضافة عميل جديد"
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton
                            variant="contained"
                            onClick={() => {
                                if (!newCustomerForm.name.trim()) {
                                    showNotification('الاسم مطلوب', 'warning');
                                    return;
                                }
                                createCustomerMutation.mutate({
                                    name: newCustomerForm.name.trim(),
                                    phone: newCustomerForm.phone.trim() || null,
                                });
                            }}
                            loading={createCustomerMutation.isPending}
                        >
                            حفظ
                        </CustomButton>
                        <CustomButton color="inherit" onClick={() => setShowAddCustomer(false)}>
                            إلغاء
                        </CustomButton>
                    </>
                }
            >
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="الاسم *"
                        value={newCustomerForm.name}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                        fullWidth
                        autoFocus
                    />
                    <TextField
                        label="رقم الهاتف"
                        value={newCustomerForm.phone}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                        fullWidth
                    />
                </Stack>
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
