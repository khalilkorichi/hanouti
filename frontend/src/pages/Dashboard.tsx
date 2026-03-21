import { useEffect, useState } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/icons-material';
import api from '../services/api';

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

function StatCard({
    title,
    value,
    subtitle,
    icon,
    color,
    loading = false,
    badge,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    loading?: boolean;
    badge?: string;
}) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    return (
        <Card
            sx={{
                border: `1px solid ${alpha(color, 0.15)}`,
                borderRadius: 3,
                transition: 'all 0.25s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 32px ${alpha(color, 0.18)}`,
                    borderColor: alpha(color, 0.3),
                },
            }}
        >
            <CardContent sx={{ p: 3 }}>
                {/* في RTL: الأول في DOM = يمين. الأيقونة يجب أن تكون يميناً */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 50,
                            height: 50,
                            borderRadius: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(color, isLight ? 0.12 : 0.2)}, ${alpha(color, isLight ? 0.06 : 0.1)})`,
                            color,
                            flexShrink: 0,
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
                                    height: 22,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    bgcolor: alpha(color, 0.1),
                                    color,
                                    border: `1px solid ${alpha(color, 0.2)}`,
                                    mb: 1,
                                }}
                            />
                        )}
                    </Box>
                </Box>

                <Typography
                    variant="caption"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                    {title}
                </Typography>

                {loading ? (
                    <Skeleton variant="text" width="60%" height={48} />
                ) : (
                    <Typography
                        variant="h4"
                        fontWeight={800}
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
    title,
    description,
    icon,
    color,
    onClick,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
}) {
    const theme = useTheme();

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
                            width: 46,
                            height: 46,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(color, 0.15)}, ${alpha(color, 0.07)})`,
                            color,
                            flexShrink: 0,
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
                    <ArrowIcon
                        sx={{
                            fontSize: 14,
                            color: alpha(color, 0.5),
                            flexShrink: 0,
                            transform: 'rotate(180deg)',
                        }}
                    />
                </Box>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const [kpi, setKpi] = useState<KPIData | null>(null);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const [kpiRes, topRes] = await Promise.allSettled([
                    api.get('/reports/kpis', { headers }),
                    api.get('/reports/top-products?limit=5', { headers }),
                ]);

                if (kpiRes.status === 'fulfilled') setKpi(kpiRes.value.data);
                if (topRes.status === 'fulfilled') setTopProducts(topRes.value.data || []);
            } catch (_) {
                // silently fail — data stays null
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const stats = [
        {
            title: 'إجمالي المبيعات',
            value: kpi?.total_sales != null ? `${kpi.total_sales.toLocaleString('ar-DZ')} دج` : '—',
            subtitle: 'آخر 30 يوم',
            icon: <MoneyIcon />,
            color: '#4F46E5',
            badge: 'الإيرادات',
        },
        {
            title: 'عدد الطلبات',
            value: kpi?.total_orders != null ? kpi.total_orders.toLocaleString('ar-DZ') : '—',
            subtitle: 'طلب مكتمل',
            icon: <ShoppingCartIcon />,
            color: '#10B981',
            badge: 'المعاملات',
        },
        {
            title: 'متوسط قيمة الطلب',
            value: kpi?.avg_order_value != null ? `${kpi.avg_order_value.toFixed(0)} دج` : '—',
            subtitle: 'لكل معاملة',
            icon: <TrendingUpIcon />,
            color: '#F59E0B',
            badge: 'المتوسط',
        },
        {
            title: 'تنبيهات المخزون',
            value: kpi?.low_stock_count != null ? String(kpi.low_stock_count) : '—',
            subtitle: 'منتج قارب النفاد',
            icon: <WarningIcon />,
            color: '#EF4444',
            badge: 'تحذير',
        },
    ];

    const quickActions = [
        { title: 'إضافة منتج', description: 'أضف منتجاً جديداً للمخزون', icon: <AddIcon />, path: '/products', color: '#4F46E5' },
        { title: 'عملية بيع', description: 'ابدأ معاملة بيع جديدة', icon: <ReceiptIcon />, path: '/sales', color: '#10B981' },
        { title: 'إدارة الفئات', description: 'تنظيم فئات المنتجات', icon: <CategoryIcon />, path: '/categories', color: '#F59E0B' },
        { title: 'عرض المخزون', description: 'تتبع كميات المنتجات', icon: <InventoryIcon />, path: '/inventory', color: '#06B6D4' },
    ];

    const maxRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.total_revenue)) : 1;

    return (
        <Box sx={{ direction: 'rtl' }}>
            {/* Welcome Banner */}
            <Box
                sx={{
                    mb: 4,
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    background: isLight
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
                        : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            fontSize: { xs: '1.5rem', md: '2rem' },
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        مرحباً بك في حانوتي 👋
                    </Typography>
                    <Typography variant="body1" color="text.secondary" fontWeight={500}>
                        هذا ملخص أداء متجرك اليوم
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<ReceiptIcon />}
                    onClick={() => navigate('/sales')}
                    sx={{
                        borderRadius: 2.5,
                        px: 3,
                        py: 1.2,
                        boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                        '&:hover': {
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                    }}
                >
                    بيع جديد
                </Button>
            </Box>

            {/* KPI Cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                    gap: 2.5,
                    mb: 4,
                }}
            >
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
                            <Typography variant="h6" fontWeight={700}>
                                إجراءات سريعة
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                الوصول السريع
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {quickActions.map((action) => (
                                <QuickActionCard
                                    key={action.title}
                                    title={action.title}
                                    description={action.description}
                                    icon={action.icon}
                                    color={action.color}
                                    onClick={() => navigate(action.path)}
                                />
                            ))}
                        </Box>
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.8)}` }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" fontWeight={700}>
                                أفضل المنتجات مبيعاً
                            </Typography>
                            <Button
                                size="small"
                                onClick={() => navigate('/reports')}
                                sx={{ borderRadius: 1.5, fontSize: '0.78rem' }}
                            >
                                عرض الكل
                            </Button>
                        </Box>

                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} variant="rounded" height={48} />
                                ))}
                            </Box>
                        ) : topProducts.length === 0 ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 220,
                                    gap: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 70,
                                        height: 70,
                                        borderRadius: '50%',
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <InventoryIcon sx={{ fontSize: 32, color: alpha(theme.palette.primary.main, 0.5) }} />
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        لا توجد بيانات بعد
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        ابدأ البيع لرؤية أفضل المنتجات
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => navigate('/sales')}
                                    sx={{ borderRadius: 2, mt: 1 }}
                                >
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
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                    mb: 0.75,
                                                    flexDirection: 'row-reverse',
                                                }}
                                            >
                                                <Avatar
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        bgcolor: alpha(color, 0.12),
                                                        color,
                                                        fontSize: '0.78rem',
                                                        fontWeight: 800,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {index + 1}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        noWrap
                                                        sx={{ fontSize: '0.85rem' }}
                                                    >
                                                        {product.name}
                                                    </Typography>
                                                </Box>
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={700}
                                                    sx={{ color, flexShrink: 0, fontSize: '0.78rem' }}
                                                >
                                                    {product.total_revenue.toLocaleString('ar-DZ')} دج
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={pct}
                                                sx={{
                                                    height: 5,
                                                    borderRadius: 3,
                                                    bgcolor: alpha(color, 0.1),
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 3,
                                                        bgcolor: color,
                                                    },
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
        </Box>
    );
}
