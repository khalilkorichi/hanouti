import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Paper, Typography, MenuItem, TextField, Stack, useTheme, alpha,
    CircularProgress, Button, Grid, Chip, Avatar, LinearProgress, Divider, IconButton,
} from '@mui/material';
import {
    TrendingUp, TrendingDown, AttachMoney, ShoppingCart, Inventory, Download as DownloadIcon,
    CalendarToday, Category as CategoryIcon, Payments, Schedule, EventNote,
    LocalAtm, CreditCard, Warehouse, ArrowUpward, ArrowDownward, Refresh,
    EmojiEvents, Insights,
} from '@mui/icons-material';
import {
    AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar,
    PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts';
import { reportsService } from '../services/reportsService';
import { PageHeader } from '../components/Common';

const PERIODS = [
    { value: 'today',   label: 'اليوم' },
    { value: 'last_7',  label: 'آخر 7 أيام' },
    { value: 'last_30', label: 'آخر 30 يوم' },
    { value: 'last_90', label: 'آخر 3 أشهر' },
    { value: 'year',    label: 'هذه السنة' },
];

const CAT_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#06B6D4', '#EC4899', '#8B5CF6', '#F43F5E', '#3B82F6', '#84CC16'];
const STOCK_COLORS = { ok: '#10B981', low: '#F59E0B', out: '#EF4444' };

const fmtMoney = (v: number) => `${(v ?? 0).toLocaleString('ar-DZ', { maximumFractionDigits: 0 })} دج`;
const fmtNum = (v: number) => (v ?? 0).toLocaleString('ar-DZ', { maximumFractionDigits: 0 });

/* ─── KPI Card with growth indicator ─── */
interface KPICardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    growth?: number;
    previousValue?: string;
}
const KPICard = ({ title, value, icon, color, growth, previousValue }: KPICardProps) => {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const isPositive = (growth ?? 0) >= 0;
    const growthColor = isPositive ? theme.palette.success.main : theme.palette.error.main;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5, height: '100%', position: 'relative', overflow: 'hidden',
                background: isLight
                    ? `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`
                    : `linear-gradient(135deg, ${alpha(color, 0.18)} 0%, ${alpha(color, 0.06)} 100%)`,
                border: `1px solid ${alpha(color, 0.2)}`,
            }}
        >
            <Box sx={{
                position: 'absolute', top: -30, insetInlineEnd: -30, width: 120, height: 120,
                borderRadius: '50%', bgcolor: alpha(color, isLight ? 0.08 : 0.12),
            }} />
            <Stack spacing={1.5} sx={{ position: 'relative', zIndex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{
                        width: 48, height: 48, borderRadius: 2.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: alpha(color, 0.18), color: color,
                        boxShadow: `0 4px 12px ${alpha(color, 0.25)}`,
                    }}>
                        {icon}
                    </Box>
                    {growth !== undefined && (
                        <Chip
                            size="small"
                            icon={isPositive ? <ArrowUpward sx={{ fontSize: '14px !important' }} /> : <ArrowDownward sx={{ fontSize: '14px !important' }} />}
                            label={`${isPositive ? '+' : ''}${growth.toFixed(1)}%`}
                            sx={{
                                bgcolor: alpha(growthColor, isLight ? 0.12 : 0.2),
                                color: growthColor, fontWeight: 700, fontSize: '0.72rem',
                                '& .MuiChip-icon': { color: growthColor, marginInlineStart: '4px' },
                            }}
                        />
                    )}
                </Stack>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.3 }}>
                        {title}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ color: theme.palette.text.primary, lineHeight: 1.2 }}>
                        {value}
                    </Typography>
                    {previousValue && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            السابق: {previousValue}
                        </Typography>
                    )}
                </Box>
            </Stack>
        </Paper>
    );
};

/* ─── Section Header ─── */
const SectionHeader = ({ title, subtitle, icon, color, action }: {
    title: string; subtitle?: string; icon: React.ReactNode; color: string; action?: React.ReactNode;
}) => {
    const theme = useTheme();
    return (
        <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
            <Box sx={{
                width: 40, height: 40, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(color, theme.palette.mode === 'light' ? 0.12 : 0.2), color: color,
            }}>
                {icon}
            </Box>
            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
                {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </Box>
            {action}
        </Stack>
    );
};

/* ─── Tooltip styling helpers ─── */
function useChartTooltip() {
    const theme = useTheme();
    return {
        contentStyle: {
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[3],
            direction: 'rtl' as const,
            fontFamily: 'inherit',
        },
        labelStyle: { color: theme.palette.text.primary, fontWeight: 700 },
        itemStyle: { color: theme.palette.text.secondary },
    };
}

/* ────────────────────────── MAIN COMPONENT ────────────────────────── */
export default function Reports() {
    const [period, setPeriod] = useState('last_30');
    const theme = useTheme();
    const tooltipStyle = useChartTooltip();

    const kpisQ      = useQuery({ queryKey: ['reports-kpis', period],     queryFn: () => reportsService.getKPIs(period) });
    const salesQ     = useQuery({ queryKey: ['reports-sales', period],    queryFn: () => reportsService.getSalesOverTime(period) });
    const topQ       = useQuery({ queryKey: ['reports-top', period],      queryFn: () => reportsService.getTopProducts(period, 8) });
    const stockQ     = useQuery({ queryKey: ['reports-stock'],            queryFn: () => reportsService.getStockStatus() });
    const profitQ    = useQuery({ queryKey: ['reports-profit', period],   queryFn: () => reportsService.getProfitMargin(period) });
    const catQ       = useQuery({ queryKey: ['reports-cat', period],      queryFn: () => reportsService.getSalesByCategory(period) });
    const paymentQ   = useQuery({ queryKey: ['reports-pay', period],      queryFn: () => reportsService.getPaymentMethods(period) });
    const weekdayQ   = useQuery({ queryKey: ['reports-week', period],     queryFn: () => reportsService.getSalesByWeekday(period) });
    const hourQ      = useQuery({ queryKey: ['reports-hour', period],     queryFn: () => reportsService.getSalesByHour(period) });
    const invValueQ  = useQuery({ queryKey: ['reports-inv-value'],        queryFn: () => reportsService.getInventoryValue() });

    const isLoading = kpisQ.isLoading || salesQ.isLoading || topQ.isLoading || stockQ.isLoading;
    const isFetching = kpisQ.isFetching || salesQ.isFetching || topQ.isFetching;
    const hasError =
        kpisQ.isError || salesQ.isError || topQ.isError || stockQ.isError ||
        profitQ.isError || catQ.isError || paymentQ.isError ||
        weekdayQ.isError || hourQ.isError || invValueQ.isError;

    const kpis = kpisQ.data;
    const salesData = salesQ.data || [];
    const topProducts = topQ.data || [];
    const stockStatus = stockQ.data;
    const profit = profitQ.data;
    const categories = catQ.data || [];
    const payments = paymentQ.data || [];
    const weekday = weekdayQ.data || [];
    const hours = hourQ.data || [];
    const invValue = invValueQ.data;

    const refetchAll = () => {
        kpisQ.refetch(); salesQ.refetch(); topQ.refetch(); stockQ.refetch();
        profitQ.refetch(); catQ.refetch(); paymentQ.refetch();
        weekdayQ.refetch(); hourQ.refetch(); invValueQ.refetch();
    };

    const stockData = useMemo(() => stockStatus ? [
        { name: 'كافي', value: stockStatus.ok, color: STOCK_COLORS.ok },
        { name: 'منخفض', value: stockStatus.low, color: STOCK_COLORS.low },
        { name: 'نفد', value: stockStatus.out, color: STOCK_COLORS.out },
    ].filter(d => d.value > 0) : [], [stockStatus]);

    const peakHour = useMemo(() => {
        if (hours.length === 0) return null;
        return hours.reduce((max, h) => h.total > max.total ? h : max, hours[0]);
    }, [hours]);

    const peakDay = useMemo(() => {
        if (weekday.length === 0) return null;
        return weekday.reduce((max, w) => w.total > max.total ? w : max, weekday[0]);
    }, [weekday]);

    const topCategory = categories[0];

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
                <Stack alignItems="center" gap={2}>
                    <CircularProgress size={48} />
                    <Typography variant="body2" color="text.secondary">جاري تحميل التقارير...</Typography>
                </Stack>
            </Box>
        );
    }

    if (hasError) {
        return (
            <Box sx={{ p: 3 }}>
                <Paper elevation={0} sx={{
                    p: 4, textAlign: 'center',
                    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                    bgcolor: alpha(theme.palette.error.main, 0.05),
                }}>
                    <Box sx={{
                        width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2,
                        bgcolor: alpha(theme.palette.error.main, 0.15),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <TrendingDown sx={{ fontSize: 32, color: 'error.main' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={800} color="error.main" mb={1}>
                        تعذّر تحميل بعض التقارير
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        تأكّد من اتصال الخادم ثم أعِد المحاولة
                    </Typography>
                    <Button variant="contained" color="error" startIcon={<Refresh />} onClick={refetchAll}>
                        إعادة المحاولة
                    </Button>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* ═══ HERO HEADER ═══ */}
            <PageHeader
                title="التقارير والتحليلات"
                subtitle="نظرة شاملة على أداء متجرك مع مقارنة بالفترة السابقة"
                icon={<Insights />}
                actions={
                    <>
                        <TextField
                            select size="small"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            sx={{ minWidth: 170, bgcolor: 'background.paper', borderRadius: 2 }}
                            InputProps={{
                                startAdornment: <CalendarToday fontSize="small" sx={{ marginInlineEnd: 1, color: 'primary.main' }} />,
                            }}
                        >
                            {PERIODS.map((p) => (
                                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                            ))}
                        </TextField>
                        <IconButton
                            onClick={refetchAll}
                            sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}
                        >
                            <Refresh sx={{ fontSize: 20, animation: isFetching ? 'spin 1s linear infinite' : 'none',
                                '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
                        </IconButton>
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleExportReports(period, kpis, topProducts, categories, profit)}
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                            }}
                        >
                            تصدير PDF
                        </Button>
                    </>
                }
            />

            {/* ═══ KPI ROW ═══ */}
            <Grid container spacing={2.5} mb={3}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <KPICard
                        title="إجمالي المبيعات"
                        value={fmtMoney(kpis?.total_sales || 0)}
                        icon={<AttachMoney />}
                        color="#4F46E5"
                        growth={kpis?.growth?.total_sales}
                        previousValue={fmtMoney(kpis?.previous?.total_sales || 0)}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <KPICard
                        title="صافي الربح"
                        value={fmtMoney(kpis?.net_profit || 0)}
                        icon={<TrendingUp />}
                        color="#10B981"
                        growth={kpis?.growth?.net_profit}
                        previousValue={fmtMoney(kpis?.previous?.net_profit || 0)}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <KPICard
                        title="عدد الطلبات"
                        value={fmtNum(kpis?.total_orders || 0)}
                        icon={<ShoppingCart />}
                        color="#F59E0B"
                        growth={kpis?.growth?.total_orders}
                        previousValue={fmtNum(kpis?.previous?.total_orders || 0)}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <KPICard
                        title="متوسط قيمة الطلب"
                        value={fmtMoney(kpis?.avg_order_value || 0)}
                        icon={<Inventory />}
                        color="#06B6D4"
                        growth={kpis?.growth?.avg_order_value}
                        previousValue={fmtMoney(kpis?.previous?.avg_order_value || 0)}
                    />
                </Grid>
            </Grid>

            {/* ═══ INSIGHTS STRIP ═══ */}
            {(peakDay || peakHour || topCategory) && (
                <Grid container spacing={2.5} mb={3}>
                    {topCategory && (
                        <Grid size={{ xs: 12, md: 4 }}>
                            <InsightCard
                                icon={<EmojiEvents />}
                                color="#F59E0B"
                                label="أفضل فئة مبيعاً"
                                value={topCategory.name}
                                sub={fmtMoney(topCategory.revenue)}
                            />
                        </Grid>
                    )}
                    {peakDay && (
                        <Grid size={{ xs: 12, md: 4 }}>
                            <InsightCard
                                icon={<EventNote />}
                                color="#8B5CF6"
                                label="أفضل يوم في الأسبوع"
                                value={peakDay.name}
                                sub={`${fmtNum(peakDay.count)} طلب`}
                            />
                        </Grid>
                    )}
                    {peakHour && (
                        <Grid size={{ xs: 12, md: 4 }}>
                            <InsightCard
                                icon={<Schedule />}
                                color="#06B6D4"
                                label="ساعة الذروة"
                                value={peakHour.label}
                                sub={`${fmtNum(peakHour.count)} طلب`}
                            />
                        </Grid>
                    )}
                </Grid>
            )}

            {/* ═══ MAIN CHARTS GRID ═══ */}
            <Grid container spacing={2.5}>

                {/* ── Sales Over Time (Area Chart) ── */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}` }}>
                        <SectionHeader
                            title="تطور المبيعات عبر الزمن"
                            subtitle="مقارنة الإيرادات اليومية"
                            icon={<TrendingUp />}
                            color="#4F46E5"
                        />
                        <Box sx={{ height: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                                    <RechartsTooltip {...tooltipStyle} formatter={(v: number) => [fmtMoney(v), 'الإيرادات']} />
                                    <Area type="monotone" dataKey="total" stroke={theme.palette.primary.main}
                                        strokeWidth={2.5} fill="url(#salesGradient)"
                                        activeDot={{ r: 5, strokeWidth: 2, stroke: theme.palette.background.paper }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* ── Stock Status (Donut) ── */}
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                        <SectionHeader
                            title="حالة المخزون"
                            subtitle="توزيع المنتجات حسب المخزون"
                            icon={<Warehouse />}
                            color="#10B981"
                        />
                        <Box sx={{ height: 240, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stockData} cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={90}
                                        paddingAngle={3} dataKey="value"
                                        stroke={theme.palette.background.paper} strokeWidth={3}
                                    >
                                        {stockData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <RechartsTooltip {...tooltipStyle} formatter={(v: number) => [`${v} منتج`, '']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{
                                position: 'absolute', inset: 0, display: 'flex',
                                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none',
                            }}>
                                <Typography variant="h4" fontWeight={800} color="primary.main">
                                    {stockData.reduce((s, d) => s + d.value, 0)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">إجمالي</Typography>
                            </Box>
                        </Box>
                        <Stack spacing={0.8} mt={1.5}>
                            {stockData.map(d => (
                                <Stack key={d.name} direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" gap={1} alignItems="center">
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color }} />
                                        <Typography variant="caption" fontWeight={600}>{d.name}</Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">{d.value}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>

                {/* ── Top Products (with progress bars) ── */}
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}` }}>
                        <SectionHeader
                            title="أفضل 8 منتجات مبيعاً"
                            subtitle="مرتبة حسب الإيرادات"
                            icon={<EmojiEvents />}
                            color="#F59E0B"
                        />
                        <Stack spacing={1.5}>
                            {topProducts.length === 0 && (
                                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                                    لا توجد بيانات للعرض
                                </Typography>
                            )}
                            {topProducts.map((p, i) => {
                                const max = topProducts[0]?.total_revenue || 1;
                                const pct = (p.total_revenue / max) * 100;
                                const color = CAT_COLORS[i % CAT_COLORS.length];
                                return (
                                    <Box key={p.id}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                            <Stack direction="row" gap={1} alignItems="center">
                                                <Avatar sx={{
                                                    width: 24, height: 24, fontSize: '0.72rem', fontWeight: 800,
                                                    bgcolor: alpha(color, 0.15), color: color,
                                                }}>{i + 1}</Avatar>
                                                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 240 }}>
                                                    {p.name}
                                                </Typography>
                                            </Stack>
                                            <Stack direction="row" gap={1.5} alignItems="center">
                                                <Chip size="small" label={`${p.total_qty} قطعة`}
                                                    sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1), height: 22, fontSize: '0.7rem' }} />
                                                <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ minWidth: 90, textAlign: 'left' }}>
                                                    {fmtMoney(p.total_revenue)}
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate" value={pct}
                                            sx={{
                                                height: 6, borderRadius: 3,
                                                bgcolor: alpha(color, 0.1),
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 3,
                                                    background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.7)})`,
                                                },
                                            }}
                                        />
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid>

                {/* ── Categories Distribution (Donut) ── */}
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                        <SectionHeader
                            title="المبيعات حسب الفئة"
                            subtitle={`${categories.length} فئة نشطة`}
                            icon={<CategoryIcon />}
                            color="#8B5CF6"
                        />
                        {categories.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>
                                لا توجد بيانات
                            </Typography>
                        ) : (
                            <Box sx={{ height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categories} dataKey="revenue" nameKey="name"
                                            cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                                            stroke={theme.palette.background.paper} strokeWidth={2}
                                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {categories.map((_, i) => (
                                                <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip {...tooltipStyle} formatter={(v: number) => [fmtMoney(v), 'الإيرادات']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* ── Sales by Weekday (Bar Chart) ── */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}` }}>
                        <SectionHeader
                            title="الأداء حسب أيام الأسبوع"
                            subtitle="معرفة أفضل الأيام"
                            icon={<EventNote />}
                            color="#06B6D4"
                        />
                        <Box sx={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weekday} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="wkGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#06B6D4" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.4} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} axisLine={false} tickLine={false}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                                    <RechartsTooltip {...tooltipStyle} formatter={(v: number) => [fmtMoney(v), 'الإيرادات']} />
                                    <Bar dataKey="total" fill="url(#wkGradient)" radius={[8, 8, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* ── Payment Methods (Radial) ── */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                        <SectionHeader
                            title="طرق الدفع"
                            subtitle="نسبة كل طريقة دفع"
                            icon={<Payments />}
                            color="#EC4899"
                        />
                        {payments.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>لا توجد بيانات</Typography>
                        ) : (
                            <Stack spacing={2} mt={1}>
                                {payments.map((p) => {
                                    const totalAll = payments.reduce((s, x) => s + x.count, 0);
                                    const pct = totalAll === 0 ? 0 : (p.count / totalAll) * 100;
                                    const isCash = p.method === 'cash';
                                    const color = isCash ? '#10B981' : '#3B82F6';
                                    const label = isCash ? 'نقداً' : (p.method === 'card' ? 'بطاقة' : p.method);
                                    const Icon = isCash ? LocalAtm : CreditCard;
                                    return (
                                        <Box key={p.method}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.8}>
                                                <Stack direction="row" gap={1} alignItems="center">
                                                    <Box sx={{
                                                        width: 32, height: 32, borderRadius: 1.5,
                                                        bgcolor: alpha(color, 0.15), color, display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <Icon sx={{ fontSize: 18 }} />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={700}>{label}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {fmtNum(p.count)} طلب · {fmtMoney(p.total)}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                                <Typography variant="h6" fontWeight={800} sx={{ color }}>
                                                    {pct.toFixed(0)}%
                                                </Typography>
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate" value={pct}
                                                sx={{
                                                    height: 8, borderRadius: 4, bgcolor: alpha(color, 0.1),
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.7)})`,
                                                    },
                                                }}
                                            />
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </Paper>
                </Grid>

                {/* ── Sales by Hour (Line Chart) ── */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}` }}>
                        <SectionHeader
                            title="توزيع المبيعات على ساعات اليوم"
                            subtitle="معرفة ساعات الذروة"
                            icon={<Schedule />}
                            color="#F43F5E"
                        />
                        <Box sx={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={hours} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                                        axisLine={false} tickLine={false} interval={2} />
                                    <YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip {...tooltipStyle} formatter={(v: number) => [`${v} طلب`, 'عدد الطلبات']} />
                                    <Line type="monotone" dataKey="count" stroke="#F43F5E" strokeWidth={2.5}
                                        dot={{ r: 3, fill: '#F43F5E' }}
                                        activeDot={{ r: 6, strokeWidth: 2, stroke: theme.palette.background.paper }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* ── Profit & Inventory Value Combined ── */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Stack spacing={2.5} sx={{ height: '100%' }}>
                        {/* Profit Margin */}
                        {profit && (
                            <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, flex: 1 }}>
                                <SectionHeader title="هامش الربح" icon={<TrendingUp />} color="#10B981" />
                                <Box sx={{ height: 100 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="100%" barSize={14}
                                            data={[{ name: 'margin', value: Math.max(0, Math.min(100, isFinite(profit.margin_percentage) ? profit.margin_percentage : 0)), fill: '#10B981' }]}
                                            startAngle={90} endAngle={-270}
                                        >
                                            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: alpha('#10B981', 0.1) }} />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                </Box>
                                <Typography variant="h4" fontWeight={800} textAlign="center" color="success.main" sx={{ mt: -7, mb: 1 }}>
                                    {profit.margin_percentage.toFixed(1)}%
                                </Typography>
                                <Divider sx={{ my: 1.5 }} />
                                <Stack spacing={0.6}>
                                    <MiniStatRow label="الإيرادات" value={fmtMoney(profit.revenue)} color="#4F46E5" />
                                    <MiniStatRow label="التكلفة" value={fmtMoney(profit.cost)} color="#F59E0B" />
                                    <MiniStatRow label="الربح" value={fmtMoney(profit.profit)} color="#10B981" />
                                </Stack>
                            </Paper>
                        )}

                        {/* Inventory Value */}
                        {invValue && (
                            <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}` }}>
                                <SectionHeader title="قيمة المخزون" icon={<Warehouse />} color="#06B6D4" />
                                <Stack spacing={0.8}>
                                    <MiniStatRow label="قيمة الشراء" value={fmtMoney(invValue.cost_value)} color="#F59E0B" />
                                    <MiniStatRow label="قيمة البيع" value={fmtMoney(invValue.retail_value)} color="#06B6D4" />
                                    <MiniStatRow label="ربح متوقع" value={fmtMoney(invValue.potential_profit)} color="#10B981" highlight />
                                    <Divider sx={{ my: 0.5 }} />
                                    <MiniStatRow label="عدد الأصناف" value={fmtNum(invValue.total_skus)} color="#8B5CF6" />
                                    <MiniStatRow label="إجمالي القطع" value={fmtNum(invValue.total_units)} color="#8B5CF6" />
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </Grid>

            </Grid>
        </Box>
    );
}

/* ── Insight Card (compact) ── */
function InsightCard({ icon, color, label, value, sub }: {
    icon: React.ReactNode; color: string; label: string; value: string; sub: string;
}) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    return (
        <Paper elevation={0} sx={{
            p: 2, border: `1px solid ${alpha(color, 0.2)}`,
            background: isLight
                ? `linear-gradient(135deg, ${alpha(color, 0.05)}, transparent)`
                : `linear-gradient(135deg, ${alpha(color, 0.12)}, transparent)`,
        }}>
            <Stack direction="row" gap={1.5} alignItems="center">
                <Box sx={{
                    width: 44, height: 44, borderRadius: 2,
                    bgcolor: alpha(color, isLight ? 0.12 : 0.2), color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ color, lineHeight: 1.2 }} noWrap>
                        {value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{sub}</Typography>
                </Box>
            </Stack>
        </Paper>
    );
}

/* ── Mini Stat Row ── */
function MiniStatRow({ label, value, color, highlight }: {
    label: string; value: string; color: string; highlight?: boolean;
}) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{
            py: 0.5, px: highlight ? 1 : 0,
            bgcolor: highlight ? alpha(color, 0.08) : 'transparent',
            borderRadius: 1,
        }}>
            <Stack direction="row" gap={0.8} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
                <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Stack>
            <Typography variant="body2" fontWeight={highlight ? 800 : 700} sx={{ color: highlight ? color : 'text.primary' }}>
                {value}
            </Typography>
        </Stack>
    );
}

/* ────────── Export PDF ────────── */
function handleExportReports(
    period: string,
    kpis: import('../services/reportsService').KPIResponse | undefined,
    topProducts: import('../services/reportsService').TopProductData[],
    categories: import('../services/reportsService').CategorySalesData[],
    profit: import('../services/reportsService').ProfitMarginData | undefined,
) {
    const periodLabels: Record<string, string> = {
        today: 'اليوم', last_7: 'آخر 7 أيام', last_30: 'آخر 30 يوم', last_90: 'آخر 3 أشهر', year: 'هذه السنة',
    };
    const periodLabel = periodLabels[period] || period;
    const dateStr = new Date().toLocaleString('ar-DZ');
    const fmt = (n?: number) => `${(n ?? 0).toLocaleString('ar-DZ', { maximumFractionDigits: 0 })} دج`;

    const growthBadge = (g?: number) => {
        if (g === undefined) return '';
        const arrow = g >= 0 ? '▲' : '▼';
        const color = g >= 0 ? '#10B981' : '#EF4444';
        return `<span style="color:${color};font-size:10px;font-weight:700">${arrow} ${Math.abs(g).toFixed(1)}%</span>`;
    };

    const topRows = topProducts.slice(0, 10).map((p, i) => `
        <tr>
            <td class="center">${i + 1}</td>
            <td>${p.name}</td>
            <td class="num">${p.total_qty}</td>
            <td class="num">${fmt(p.total_revenue)}</td>
        </tr>`).join('');

    const catRows = categories.slice(0, 10).map((c, i) => `
        <tr>
            <td class="center">${i + 1}</td>
            <td>${c.name}</td>
            <td class="num">${c.qty}</td>
            <td class="num">${fmt(c.revenue)}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>تقرير حانوتي — ${periodLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Cairo','Segoe UI',Tahoma,Arial,sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; direction: rtl; }
  .page { max-width: 850px; margin: 0 auto; padding: 36px 32px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 3px solid #4F46E5; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg,#4F46E5,#8B5CF6); display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900; }
  .brand-name { font-size: 20px; font-weight: 900; color: #4F46E5; }
  .brand-sub { font-size: 11px; color: #888; }
  .report-meta { text-align: left; }
  .report-title { font-size: 15px; font-weight: 800; color: #1a1a2e; }
  .report-date { font-size: 11px; color: #aaa; margin-top: 4px; }
  .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { border-radius: 12px; padding: 14px; text-align: center; border: 1px solid; }
  .kpi-1 { background:#EEF2FF; border-color:#C7D2FE; } .kpi-1 .kpi-val { color: #4F46E5; }
  .kpi-2 { background:#F0FDF4; border-color:#BBF7D0; } .kpi-2 .kpi-val { color: #10B981; }
  .kpi-3 { background:#FFFBEB; border-color:#FDE68A; } .kpi-3 .kpi-val { color: #F59E0B; }
  .kpi-4 { background:#ECFEFF; border-color:#A5F3FC; } .kpi-4 .kpi-val { color: #06B6D4; }
  .kpi-val { font-size: 18px; font-weight: 900; }
  .kpi-label { font-size: 11px; color: #777; margin-top: 4px; font-weight: 600; }
  .kpi-growth { margin-top: 4px; }
  .section-title { font-size: 14px; font-weight: 800; color: #4F46E5; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e0e0f0; }
  .profit-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
  .profit-card { border:1px solid #e5e7eb; border-radius:8px; padding:10px; text-align:center; }
  .profit-card .pl { font-size: 10px; color: #777; }
  .profit-card .pv { font-size: 14px; font-weight: 800; color: #1a1a2e; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  thead tr { background: #F3F4F6; }
  th { padding: 8px 12px; text-align: right; font-size: 12px; font-weight: 700; color: #4F46E5; }
  th.center, td.center { text-align: center; width: 40px; }
  th.num, td.num { text-align: left; }
  td { padding: 7px 12px; border-bottom: 1px solid #f0f0f5; }
  tr:nth-child(even) td { background: #FAFAFA; }
  .footer { text-align: center; margin-top: 32px; padding-top: 14px; border-top: 1px dashed #c8c8d8; font-size: 11px; color: #bbb; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="brand-icon">ح</div>
      <div>
        <div class="brand-name">حانوتي</div>
        <div class="brand-sub">نظام إدارة المبيعات</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-title">تقرير الأداء — ${periodLabel}</div>
      <div class="report-date">تاريخ الإصدار: ${dateStr}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi kpi-1">
      <div class="kpi-val">${fmt(kpis?.total_sales)}</div>
      <div class="kpi-label">إجمالي المبيعات</div>
      <div class="kpi-growth">${growthBadge(kpis?.growth?.total_sales)}</div>
    </div>
    <div class="kpi kpi-2">
      <div class="kpi-val">${fmt(kpis?.net_profit)}</div>
      <div class="kpi-label">صافي الربح</div>
      <div class="kpi-growth">${growthBadge(kpis?.growth?.net_profit)}</div>
    </div>
    <div class="kpi kpi-3">
      <div class="kpi-val">${(kpis?.total_orders ?? 0).toLocaleString('ar-DZ')}</div>
      <div class="kpi-label">عدد الطلبات</div>
      <div class="kpi-growth">${growthBadge(kpis?.growth?.total_orders)}</div>
    </div>
    <div class="kpi kpi-4">
      <div class="kpi-val">${fmt(kpis?.avg_order_value)}</div>
      <div class="kpi-label">متوسط الطلب</div>
      <div class="kpi-growth">${growthBadge(kpis?.growth?.avg_order_value)}</div>
    </div>
  </div>

  ${profit ? `
  <div class="section-title">تحليل الربحية</div>
  <div class="profit-row">
    <div class="profit-card"><div class="pl">الإيرادات</div><div class="pv">${fmt(profit.revenue)}</div></div>
    <div class="profit-card"><div class="pl">التكلفة</div><div class="pv">${fmt(profit.cost)}</div></div>
    <div class="profit-card"><div class="pl">الربح الصافي</div><div class="pv">${fmt(profit.profit)}</div></div>
    <div class="profit-card"><div class="pl">هامش الربح</div><div class="pv">${profit.margin_percentage.toFixed(1)}%</div></div>
  </div>` : ''}

  <div class="section-title">أفضل المنتجات مبيعاً</div>
  <table>
    <thead><tr><th class="center">#</th><th>المنتج</th><th class="num">الكمية</th><th class="num">الإيرادات</th></tr></thead>
    <tbody>${topRows || '<tr><td colspan="4" style="text-align:center;color:#aaa">لا توجد بيانات</td></tr>'}</tbody>
  </table>

  ${catRows ? `
  <div class="section-title">المبيعات حسب الفئة</div>
  <table>
    <thead><tr><th class="center">#</th><th>الفئة</th><th class="num">الكمية</th><th class="num">الإيرادات</th></tr></thead>
    <tbody>${catRows}</tbody>
  </table>` : ''}

  <div class="footer">تقرير مُولَّد بواسطة برنامج حانوتي — ${dateStr}</div>
</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (w) { w.document.write(html); w.document.close(); }
}
