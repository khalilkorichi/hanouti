import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Paper,
    Typography,
    MenuItem,
    TextField,
    Stack,
    useTheme,
    alpha,
    CircularProgress,
    Button,
    Grid
} from '@mui/material';
import {
    TrendingUp,
    AttachMoney,
    ShoppingCart,
    Inventory,
    Download as DownloadIcon,
    CalendarToday
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { reportsService } from '../services/reportsService';

const PERIODS = [
    { value: 'today', label: 'اليوم' },
    { value: 'last_7', label: 'آخر 7 أيام' },
    { value: 'last_30', label: 'آخر 30 يوم' },
    { value: 'last_90', label: 'آخر 3 أشهر' },
    { value: 'year', label: 'هذه السنة' }
];

const COLORS = ['#00C853', '#FFAB00', '#FF5630', '#00B8D9'];

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
}

const KPICard = ({ title, value, icon, color, subtitle }: KPICardProps) => {
    const theme = useTheme();
    return (
        <Paper
            sx={{
                p: 3,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
                border: `1px solid ${alpha(color, 0.2)}`,
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: alpha(color, 0.1),
                    zIndex: 0
                }}
            />
            <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 3,
                            background: alpha(color, 0.2),
                            color: color
                        }}
                    >
                        {icon}
                    </Box>
                    {subtitle && (
                        <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.6), fontWeight: 600 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Box>
                    <Typography variant="h4" fontWeight="800" sx={{ color: theme.palette.text.primary }}>
                        {value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                        {title}
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
};

export default function Reports() {
    const [period, setPeriod] = useState('last_30');
    const theme = useTheme();

    // Fetch Data
    const { data: kpis, isLoading: kpisLoading } = useQuery({
        queryKey: ['reports-kpis', period],
        queryFn: () => reportsService.getKPIs(period)
    });

    const { data: salesData, isLoading: salesLoading } = useQuery({
        queryKey: ['reports-sales', period],
        queryFn: () => reportsService.getSalesOverTime(period)
    });

    const { data: topProducts, isLoading: topLoading } = useQuery({
        queryKey: ['reports-top', period],
        queryFn: () => reportsService.getTopProducts(period)
    });

    const { data: stockStatus, isLoading: stockLoading } = useQuery({
        queryKey: ['reports-stock'],
        queryFn: () => reportsService.getStockStatus()
    });

    const isLoading = kpisLoading || salesLoading || topLoading || stockLoading;

    const formatCurrency = (value: number) => `${value?.toLocaleString()} دج`;

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    const stockData = stockStatus ? [
        { name: 'كافي', value: stockStatus.ok },
        { name: 'منخفض', value: stockStatus.low },
        { name: 'نفد', value: stockStatus.out }
    ] : [];

    return (
        <Box sx={{ p: 3 }} dir="rtl">
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
                <Box>
                    <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1
                        }}
                    >
                        التقارير والتحليلات
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        نظرة شاملة على أداء المتجر والمبيعات
                    </Typography>
                </Box>

                <Stack direction="row" spacing={2}>
                    <TextField
                        select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                        InputProps={{
                            startAdornment: <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                    >
                        {PERIODS.map((p) => (
                            <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                        ))}
                    </TextField>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        sx={{ borderRadius: 2 }}
                    >
                        تصدير
                    </Button>
                </Stack>
            </Stack>

            {/* KPIs Grid */}
            <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard
                        title="إجمالي المبيعات"
                        value={formatCurrency(kpis?.total_sales || 0)}
                        icon={<AttachMoney />}
                        color="#0052CC"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard
                        title="صافي الربح"
                        value={formatCurrency(kpis?.net_profit || 0)}
                        icon={<TrendingUp />}
                        color="#36B37E"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard
                        title="عدد الطلبات"
                        value={kpis?.total_orders || 0}
                        icon={<ShoppingCart />}
                        color="#FFAB00"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard
                        title="متوسط قيمة الطلب"
                        value={formatCurrency(kpis?.avg_order_value || 0)}
                        icon={<Inventory />}
                        color="#6554C0"
                    />
                </Grid>
            </Grid>

            {/* Charts Grid */}
            <Grid container spacing={3}>
                {/* Sales Over Time */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: 400 }}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>
                            تحليل المبيعات عبر الزمن
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: theme.palette.text.secondary }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: theme.palette.text.secondary }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `${value / 1000}k`}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: 'none',
                                        boxShadow: theme.shadows[4],
                                        direction: 'rtl'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    name="المبيعات"
                                    stroke={theme.palette.primary.main}
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Stock Status */}
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: 400 }}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>
                            حالة المخزون
                        </Typography>
                        <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stockData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stockData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Top Products */}
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: 400 }}>
                        <Typography variant="h6" fontWeight="bold" mb={3}>
                            أفضل المنتجات مبيعاً
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={alpha(theme.palette.divider, 0.5)} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fill: theme.palette.text.primary, fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: alpha(theme.palette.primary.main, 0.1) }}
                                    contentStyle={{ borderRadius: 8 }}
                                />
                                <Bar
                                    dataKey="total_revenue"
                                    name="الإيرادات"
                                    fill={theme.palette.secondary.main}
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
