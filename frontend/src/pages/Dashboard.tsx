import { useEffect, useState, useCallback } from 'react';
import { useFormatters } from '../utils/format';
import {
    Typography,
    Box,
    useTheme,
    alpha,
    Card,
    CardContent,
    Skeleton,
    Button,
    Chip,
    Avatar,
    LinearProgress,
    TextField,
    MenuItem,
    Stack,
    Autocomplete,
    FormControlLabel,
    Switch,
    IconButton,
    Divider,
    Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Inventory as InventoryIcon,
    TrendingUp as TrendingUpIcon,
    ShoppingCart as ShoppingCartIcon,
    Warning as WarningIcon,
    Add as AddIcon,
    ReceiptLong as ReceiptIcon,
    ArrowBackIosNew as ArrowIcon,
    AttachMoney as MoneyIcon,
    Category as CategoryIcon,
    Remove as RemoveIcon,
    Delete as DeleteIcon,
    ShoppingCartCheckout as CheckoutIcon,
    Refresh as RefreshIcon,
    CheckCircleOutline as InventoryHealthyIcon,
    CreditScoreRounded as DebtIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { productService, type Product } from '../services/productService';
import { categoryService, type Category, type CategoryCreate } from '../services/categoryService';
import { salesService } from '../services/salesService';
import { customerService } from '../services/customerService';
import { useSettingsStore } from '../store/settingsStore';
import { UnifiedModal, CustomButton, CustomInput, PageHeader } from '../components/Common';
import { Storefront as StorefrontIcon } from '@mui/icons-material';
import ProductForm from '../components/Products/ProductForm';
import { useNotification } from '../contexts/NotificationContext';

interface KPIData {
    total_products?: number;
    total_sales_today?: number;
    transactions_today?: number;
    low_stock?: number;
    total_sales?: number;
    total_orders?: number;
    avg_order_value?: number;
    net_profit?: number;
    low_stock_count?: number;
    out_of_stock_count?: number;
}

interface TopProduct {
    id: number;
    name: string;
    total_qty: number;
    total_revenue: number;
}

interface MiniCartItem {
    product: Product;
    qty: number;
    price: number;
}

function StatCard({
    title, value, subtitle, icon, color, loading = false, badge, onClick,
}: {
    title: string; value: string; subtitle: string;
    icon: React.ReactNode; color: string; loading?: boolean; badge?: string;
    onClick?: () => void;
}) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    return (
        <Card
            onClick={onClick}
            sx={{
                border: `1px solid ${alpha(color, 0.15)}`,
                borderRadius: 3,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.25s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 32px ${alpha(color, 0.18)}`,
                    borderColor: alpha(color, 0.3),
                },
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 50, height: 50, borderRadius: 2.5,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(color, isLight ? 0.12 : 0.2)}, ${alpha(color, isLight ? 0.06 : 0.1)})`,
                            color, flexShrink: 0,
                        }}
                    >
                        {icon}
                    </Box>
                    <Box>
                        {badge && (
                            <Chip
                                label={badge}
                                size="small"
                                sx={{
                                    height: 22, fontSize: '0.7rem', fontWeight: 700,
                                    bgcolor: alpha(color, 0.1), color,
                                    border: `1px solid ${alpha(color, 0.2)}`, mb: 1,
                                }}
                            />
                        )}
                    </Box>
                </Box>
                <Typography
                    variant="caption" fontWeight={600} color="text.secondary"
                    sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                    {title}
                </Typography>
                {loading ? (
                    <Skeleton variant="text" width="60%" height={48} />
                ) : (
                    <Typography
                        variant="h4" fontWeight={800}
                        sx={{ color, lineHeight: 1.2, my: 0.5, fontSize: { xs: '1.6rem', sm: '2rem' } }}
                    >
                        {value}
                    </Typography>
                )}
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {subtitle}
                </Typography>
            </CardContent>
        </Card>
    );
}

function QuickActionCard({
    title, description, icon, color, onClick,
}: {
    title: string; description: string; icon: React.ReactNode; color: string; onClick: () => void;
}) {
    useTheme();

    return (
        <Card
            onClick={onClick}
            sx={{
                cursor: 'pointer',
                border: `1px solid ${alpha(color, 0.15)}`,
                borderRadius: 3,
                transition: 'all 0.25s ease',
                '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 16px 36px ${alpha(color, 0.2)}`,
                    borderColor: alpha(color, 0.4),
                    bgcolor: alpha(color, 0.03),
                },
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'row-reverse' }}>
                    <Box
                        sx={{
                            width: 46, height: 46, borderRadius: 2,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(color, 0.15)}, ${alpha(color, 0.07)})`,
                            color, flexShrink: 0,
                        }}
                    >
                        {icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.3 }}>
                            {title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {description}
                        </Typography>
                    </Box>
                    <ArrowIcon sx={{ fontSize: 14, color: alpha(color, 0.5), flexShrink: 0, transform: 'rotate(180deg)' }} />
                </Box>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const fmt = useFormatters();
    const theme = useTheme();
    const { showNotification: _showNotification } = useNotification();

    const [kpi, setKpi] = useState<KPIData | null>(null);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [kpiError, setKpiError] = useState(false);

    const debtsEnabled = useSettingsStore((s) => s.isPathVisible('/customers'));
    const { data: debtSummary } = useQuery({
        queryKey: ['customers-debt-summary'],
        queryFn: customerService.debtSummary,
        enabled: debtsEnabled,
    });

    const [activeDialog, setActiveDialog] = useState<'addProduct' | 'quickSale' | 'addCategory' | 'lowStock' | null>(null);

    const closeDialog = useCallback(() => setActiveDialog(null), []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setKpiError(false);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [kpiRes, topRes] = await Promise.allSettled([
                api.get('/reports/kpis', { headers }),
                api.get('/reports/top-products?limit=5', { headers }),
            ]);
            if (kpiRes.status === 'fulfilled') setKpi(kpiRes.value.data);
            else setKpiError(true);
            if (topRes.status === 'fulfilled') setTopProducts(topRes.value.data || []);
        } catch (_) {
            setKpiError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const fmtMoney0 = (v: number) => fmt.money(v, { decimalPlaces: 0, hideTrailingZeros: true });
    const fmtNum0   = (v: number) => fmt.number(v, { decimalPlaces: 0, hideTrailingZeros: true });

    const stats = [
        {
            title: 'إجمالي المبيعات',
            value: kpi?.total_sales != null ? fmtMoney0(kpi.total_sales) : '—',
            subtitle: 'آخر 30 يوم',
            icon: <MoneyIcon />, color: '#4F46E5', badge: 'الإيرادات',
        },
        {
            title: 'عدد الطلبات',
            value: kpi?.total_orders != null ? fmtNum0(kpi.total_orders) : '—',
            subtitle: 'طلب مكتمل',
            icon: <ShoppingCartIcon />, color: '#10B981', badge: 'المعاملات',
        },
        {
            title: 'متوسط قيمة الطلب',
            value: kpi?.avg_order_value != null ? fmtMoney0(kpi.avg_order_value) : '—',
            subtitle: 'لكل معاملة',
            icon: <TrendingUpIcon />, color: '#F59E0B', badge: 'المتوسط',
        },
        {
            title: 'تنبيهات المخزون',
            value: kpi?.low_stock_count != null ? String(kpi.low_stock_count) : '—',
            subtitle: 'منتج قارب النفاد',
            icon: <WarningIcon />, color: '#EF4444', badge: 'تحذير',
        },
        ...(debtsEnabled ? [{
            title: 'إجمالي الديون',
            value: debtSummary ? fmtMoney0(debtSummary.total_debt) : '—',
            subtitle: debtSummary ? `${debtSummary.customers_with_debt} عميل مدين — انقر للعرض` : 'لا توجد ديون',
            icon: <DebtIcon />, color: '#EC4899', badge: 'الديون',
            onClick: () => navigate('/customers?filter=debt'),
        }] : []),
    ];

    const quickActions = [
        {
            title: 'إضافة منتج',
            description: 'أضف منتجاً جديداً للمخزون',
            icon: <AddIcon />, color: '#4F46E5',
            dialog: 'addProduct' as const,
        },
        {
            title: 'بيع سريع',
            description: 'ابدأ معاملة بيع من الصفحة الرئيسية',
            icon: <ReceiptIcon />, color: '#10B981',
            dialog: 'quickSale' as const,
        },
        {
            title: 'إضافة فئة',
            description: 'تنظيم فئات المنتجات',
            icon: <CategoryIcon />, color: '#F59E0B',
            dialog: 'addCategory' as const,
        },
        {
            title: 'تنبيهات المخزون',
            description: 'المنتجات القريبة من النفاد',
            icon: <InventoryIcon />, color: '#EF4444',
            dialog: 'lowStock' as const,
        },
    ];

    const maxRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.total_revenue)) : 1;

    return (
        <Box>
            <PageHeader
                title="مرحباً بك في حانوتي"
                subtitle="هذا ملخص أداء متجرك اليوم"
                icon={<StorefrontIcon />}
                actions={
                    <Button
                        variant="contained"
                        startIcon={<ReceiptIcon />}
                        onClick={() => setActiveDialog('quickSale')}
                        sx={{
                            borderRadius: 2.5, px: 3, py: 1.1,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                            '&:hover': { boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.45)}` },
                        }}
                    >
                        بيع جديد
                    </Button>
                }
            />

            {/* KPI Error Banner */}
            {kpiError && !loading && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 2.5, fontWeight: 600 }}
                    action={
                        <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={fetchDashboardData}>
                            إعادة المحاولة
                        </Button>
                    }
                >
                    تعذّر تحميل بيانات لوحة التحكم — تحقق من تشغيل الخادم
                </Alert>
            )}

            {/* KPI Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 4 }}>
                {stats.map((stat) => (
                    <StatCard key={stat.title} {...stat} loading={loading} />
                ))}
            </Box>

            {/* Quick Actions + Top Products */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
                {/* Quick Actions */}
                <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.8)}` }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" fontWeight={700}>إجراءات سريعة</Typography>
                            <Typography variant="caption" color="text.secondary">انقر لفتح صندوق الإجراء</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {quickActions.map((action) => (
                                <QuickActionCard
                                    key={action.title}
                                    title={action.title}
                                    description={action.description}
                                    icon={action.icon}
                                    color={action.color}
                                    onClick={() => setActiveDialog(action.dialog)}
                                />
                            ))}
                        </Box>
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.8)}` }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" fontWeight={700}>أفضل المنتجات مبيعاً</Typography>
                            <Button size="small" onClick={() => navigate('/reports')} sx={{ borderRadius: 1.5, fontSize: '0.78rem' }}>
                                عرض الكل
                            </Button>
                        </Box>

                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rounded" height={48} />)}
                            </Box>
                        ) : topProducts.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, gap: 2 }}>
                                <Box sx={{ width: 70, height: 70, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <InventoryIcon sx={{ fontSize: 32, color: alpha(theme.palette.primary.main, 0.5) }} />
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>لا توجد بيانات بعد</Typography>
                                    <Typography variant="caption" color="text.secondary">ابدأ البيع لرؤية أفضل المنتجات</Typography>
                                </Box>
                                <Button variant="outlined" size="small" onClick={() => setActiveDialog('quickSale')} sx={{ borderRadius: 2, mt: 1 }}>
                                    ابدأ البيع الآن
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {topProducts.map((product, index) => {
                                    const pct = (product.total_revenue / maxRevenue) * 100;
                                    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                                    const color = colors[index % colors.length];
                                    return (
                                        <Box key={product.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75, flexDirection: 'row-reverse' }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(color, 0.12), color, fontSize: '0.78rem', fontWeight: 800, flexShrink: 0 }}>
                                                    {index + 1}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
                                                    <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.85rem' }}>
                                                        {product.name}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" fontWeight={700} sx={{ color, flexShrink: 0, fontSize: '0.78rem' }}>
                                                    {fmtMoney0(product.total_revenue)}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate" value={pct}
                                                sx={{
                                                    height: 5, borderRadius: 3, bgcolor: alpha(color, 0.1),
                                                    '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: color },
                                                }}
                                            />
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>

            {/* ─── Dialog: إضافة منتج ─── */}
            <AddProductDialog open={activeDialog === 'addProduct'} onClose={closeDialog} />

            {/* ─── Dialog: بيع سريع ─── */}
            <QuickSaleDialog open={activeDialog === 'quickSale'} onClose={closeDialog} />

            {/* ─── Dialog: إضافة فئة ─── */}
            <AddCategoryDialog open={activeDialog === 'addCategory'} onClose={closeDialog} />

            {/* ─── Dialog: تنبيهات المخزون ─── */}
            <LowStockDialog open={activeDialog === 'lowStock'} onClose={closeDialog} />
        </Box>
    );
}

/* ════════════════════════════════════════
   Dialog: إضافة منتج سريع
════════════════════════════════════════ */
function AddProductDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const queryClient = useQueryClient();
    const { showNotification } = useNotification();

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['products-count'] });
        showNotification('تم إضافة المنتج بنجاح', 'success');
        onClose();
    };

    return (
        <UnifiedModal open={open} onClose={onClose} title="إضافة منتج جديد" maxWidth="md">
            <ProductForm product={null} onSuccess={handleSuccess} onCancel={onClose} />
        </UnifiedModal>
    );
}

/* ════════════════════════════════════════
   Dialog: بيع سريع
════════════════════════════════════════ */
function QuickSaleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();
    const theme = useTheme();

    const [cartItems, setCartItems] = useState<MiniCartItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [qty, setQty] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discountValue, setDiscountValue] = useState(0);

    const { data: products } = useQuery({
        queryKey: ['products', { limit: 50 }],
        queryFn: () => productService.getAll({ limit: 50 }),
        enabled: open,
    });

    const addToCart = () => {
        if (!selectedProduct) return;
        const existing = cartItems.find(i => i.product.id === selectedProduct.id);
        if (existing) {
            setCartItems(cartItems.map(i =>
                i.product.id === selectedProduct.id
                    ? { ...i, qty: Math.min(i.qty + qty, selectedProduct.stock_qty) }
                    : i
            ));
        } else {
            setCartItems([...cartItems, { product: selectedProduct, qty: Math.min(qty, selectedProduct.stock_qty), price: selectedProduct.sale_price }]);
        }
        setSelectedProduct(null);
        setQty(1);
    };

    const removeFromCart = (id: number) => setCartItems(cartItems.filter(i => i.product.id !== id));

    const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
    const total = Math.max(0, subtotal - discountValue);

    const createSaleMutation = useMutation({
        mutationFn: salesService.create,
        onSuccess: (data) => completeSaleMutation.mutate(data.id),
        onError: () => showNotification('خطأ في إنشاء البيع', 'error')
    });

    const completeSaleMutation = useMutation({
        mutationFn: salesService.complete,
        onSuccess: () => {
            showNotification('تمت عملية البيع بنجاح!', 'success');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setCartItems([]);
            setDiscountValue(0);
            onClose();
        },
        onError: () => showNotification('خطأ في إتمام البيع', 'error')
    });

    const handleCheckout = () => {
        if (cartItems.length === 0) return;
        createSaleMutation.mutate({
            items: cartItems.map(i => ({ product_id: i.product.id, qty: i.qty, unit_price: i.price, tax_rate: 0 })),
            payment_method: paymentMethod,
            discount_value: discountValue,
            discount_type: 'fixed',
            tax_value: 0,
        });
    };

    const isProcessing = createSaleMutation.isPending || completeSaleMutation.isPending;

    return (
        <UnifiedModal
            open={open}
            onClose={onClose}
            title="بيع سريع"
            maxWidth="sm"
            actions={
                <>
                    <CustomButton
                        variant="contained"
                        startIcon={<CheckoutIcon />}
                        onClick={handleCheckout}
                        disabled={cartItems.length === 0 || isProcessing}
                        loading={isProcessing}
                    >
                        إتمام البيع ({total.toFixed(0)} دج)
                    </CustomButton>
                    <CustomButton onClick={onClose} color="inherit">إغلاق</CustomButton>
                </>
            }
        >
            <Stack spacing={2}>
                {/* Product search */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Autocomplete
                        options={products || []}
                        getOptionLabel={(o) => `${o.name} — ${o.sale_price} دج`}
                        value={selectedProduct}
                        onChange={(_e, v) => setSelectedProduct(v)}
                        renderInput={(params) => (
                            <TextField {...params} label="اختر منتجاً" size="small" />
                        )}
                        sx={{ flex: 1 }}
                        noOptionsText="لا توجد منتجات"
                    />
                    <TextField
                        label="الكمية"
                        type="number"
                        size="small"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        sx={{ width: 80 }}
                        inputProps={{ min: 1 }}
                    />
                    <CustomButton
                        variant="contained"
                        onClick={addToCart}
                        disabled={!selectedProduct}
                        startIcon={<AddIcon />}
                        sx={{ height: 40 }}
                    >
                        إضافة
                    </CustomButton>
                </Box>

                {/* Cart items */}
                {cartItems.length > 0 && (
                    <Box sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: 2, overflow: 'hidden' }}>
                        {cartItems.map((item, i) => (
                            <Box key={item.product.id}>
                                <Box sx={{ px: 2, py: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                                        {item.product.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <IconButton size="small" onClick={() => {
                                            if (item.qty <= 1) removeFromCart(item.product.id);
                                            else setCartItems(cartItems.map(ci => ci.product.id === item.product.id ? { ...ci, qty: ci.qty - 1 } : ci));
                                        }}>
                                            <RemoveIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                        <Typography fontWeight={700} sx={{ minWidth: 24, textAlign: 'center' }}>{item.qty}</Typography>
                                        <IconButton size="small" onClick={() => {
                                            setCartItems(cartItems.map(ci => ci.product.id === item.product.id
                                                ? { ...ci, qty: Math.min(ci.qty + 1, item.product.stock_qty) }
                                                : ci));
                                        }}>
                                            <AddIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Box>
                                    <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ minWidth: 70, textAlign: 'start' }}>
                                        {(item.price * item.qty).toFixed(0)} دج
                                    </Typography>
                                    <IconButton size="small" color="error" onClick={() => removeFromCart(item.product.id)}>
                                        <DeleteIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </Box>
                                {i < cartItems.length - 1 && <Divider />}
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Totals + payment */}
                {cartItems.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField
                            label="الخصم (دج)"
                            type="number"
                            size="small"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            select
                            label="طريقة الدفع"
                            size="small"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            sx={{ flex: 1 }}
                        >
                            <MenuItem value="cash">نقداً</MenuItem>
                            <MenuItem value="card">بطاقة</MenuItem>
                        </TextField>
                    </Box>
                )}
            </Stack>
        </UnifiedModal>
    );
}

/* ════════════════════════════════════════
   Dialog: إضافة فئة
════════════════════════════════════════ */
function AddCategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const queryClient = useQueryClient();
    const { showNotification } = useNotification();
    const [form, setForm] = useState<CategoryCreate>({ name: '', description: '', is_active: true });

    const { data: categories, isLoading } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => categoryService.getAll(),
        enabled: open,
    });

    const createMutation = useMutation({
        mutationFn: categoryService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            showNotification('تمت إضافة الفئة بنجاح', 'success');
            setForm({ name: '', description: '', is_active: true });
        },
        onError: () => showNotification('فشل إضافة الفئة', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: categoryService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            showNotification('تم حذف الفئة', 'info');
        },
    });

    return (
        <UnifiedModal
            open={open}
            onClose={onClose}
            title="إدارة الفئات"
            maxWidth="sm"
            actions={
                <>
                    <CustomButton
                        variant="contained"
                        onClick={() => {
                            if (!form.name.trim()) return;
                            createMutation.mutate(form);
                        }}
                        loading={createMutation.isPending}
                        disabled={!form.name.trim()}
                        startIcon={<AddIcon />}
                    >
                        إضافة الفئة
                    </CustomButton>
                    <CustomButton onClick={onClose} color="inherit">إغلاق</CustomButton>
                </>
            }
        >
            <Stack spacing={2}>
                {/* Add form */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <CustomInput
                        label="اسم الفئة الجديدة"
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        fullWidth
                        size="small"
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={form.is_active}
                                onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                            />
                        }
                        label={<Typography variant="caption">نشط</Typography>}
                    />
                </Box>

                <Divider />

                {/* Existing categories */}
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                    الفئات الحالية ({categories?.length || 0})
                </Typography>
                {isLoading ? (
                    <Stack spacing={1}>{[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={36} />)}</Stack>
                ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {categories?.map(cat => (
                            <Chip
                                key={cat.id}
                                label={cat.name}
                                color={cat.is_active ? 'primary' : 'default'}
                                variant="outlined"
                                onDelete={() => {
                                    if (window.confirm(`حذف فئة "${cat.name}"؟`)) {
                                        deleteMutation.mutate(cat.id);
                                    }
                                }}
                                size="small"
                            />
                        ))}
                        {categories?.length === 0 && (
                            <Typography variant="body2" color="text.secondary">لا توجد فئات بعد</Typography>
                        )}
                    </Box>
                )}
            </Stack>
        </UnifiedModal>
    );
}

/* ════════════════════════════════════════
   Dialog: تنبيهات المخزون
════════════════════════════════════════ */
function LowStockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const navigate = useNavigate();
    const theme = useTheme();

    const { data: products, isLoading } = useQuery({
        queryKey: ['low-stock-products'],
        queryFn: () => productService.getAll({ limit: 50 }),
        enabled: open,
        select: (data) => data.filter(p => p.stock_qty <= p.min_qty).slice(0, 15),
    });

    return (
        <UnifiedModal
            open={open}
            onClose={onClose}
            title="تنبيهات المخزون"
            maxWidth="sm"
            actions={
                <>
                    <CustomButton variant="outlined" onClick={() => { onClose(); navigate('/inventory'); }}>
                        عرض كامل المخزون
                    </CustomButton>
                    <CustomButton onClick={onClose} color="inherit">إغلاق</CustomButton>
                </>
            }
        >
            {isLoading ? (
                <Stack spacing={1}>{[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={52} />)}</Stack>
            ) : products?.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <InventoryHealthyIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6" color="success.main" fontWeight={700}>المخزون في حالة جيدة</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>جميع المنتجات تجاوزت الحد الأدنى</Typography>
                </Box>
            ) : (
                <Stack spacing={1}>
                    {products?.map(p => {
                        const isOut = p.stock_qty <= 0;
                        const color = isOut ? theme.palette.error.main : theme.palette.warning.main;
                        return (
                            <Box
                                key={p.id}
                                sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    p: 1.5, borderRadius: 2,
                                    border: `1px solid ${alpha(color, 0.3)}`,
                                    bgcolor: alpha(color, 0.05),
                                }}
                            >
                                <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label={isOut ? 'نفد' : `${p.stock_qty} متبقي`}
                                        color={isOut ? 'error' : 'warning'}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        حد: {p.min_qty}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </UnifiedModal>
    );
}
