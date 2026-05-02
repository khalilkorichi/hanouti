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

function handleExportReports(
    period: string,
    kpis: { total_sales?: number; net_profit?: number; total_orders?: number; avg_order_value?: number } | undefined,
    topProducts: { name: string; total_revenue: number; qty_sold: number }[] | undefined,
) {
    const periodLabels: Record<string, string> = {
        today: 'اليوم', last_7: 'آخر 7 أيام', last_30: 'آخر 30 يوم', last_90: 'آخر 3 أشهر', year: 'هذه السنة'
    };
    const periodLabel = periodLabels[period] || period;
    const dateStr = new Date().toLocaleString('ar-DZ');
    const fmt = (n?: number) => `${(n ?? 0).toLocaleString()} دج`;

    const topRows = (topProducts || []).slice(0, 10).map((p, i) => `
        <tr>
            <td class="center">${i + 1}</td>
            <td>${p.name}</td>
            <td class="num">${p.qty_sold ?? '-'}</td>
            <td class="num">${fmt(p.total_revenue)}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>تقرير حانوتي — ${periodLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Cairo','Segoe UI',Tahoma,Arial,sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; direction: rtl; }
  .page { max-width: 800px; margin: 0 auto; padding: 36px 32px; }
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 3px solid #4F46E5; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg,#4F46E5,#8B5CF6); display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900; }
  .brand-name { font-size: 20px; font-weight: 900; color: #4F46E5; }
  .brand-sub { font-size: 11px; color: #888; }
  .report-meta { text-align: left; }
  .report-title { font-size: 15px; font-weight: 800; color: #1a1a2e; }
  .report-date { font-size: 11px; color: #aaa; margin-top: 4px; }
  /* KPIs */
  .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 28px; }
  .kpi { border-radius: 12px; padding: 16px; text-align: center; border: 1px solid; }
  .kpi-1 { background:#EFF6FF; border-color:#BFDBFE; }
  .kpi-2 { background:#F0FDF4; border-color:#BBF7D0; }
  .kpi-3 { background:#FFFBEB; border-color:#FDE68A; }
  .kpi-4 { background:#F5F3FF; border-color:#DDD6FE; }
  .kpi-val { font-size: 18px; font-weight: 900; color: #1a1a2e; }
  .kpi-1 .kpi-val { color: #3B82F6; }
  .kpi-2 .kpi-val { color: #10B981; }
  .kpi-3 .kpi-val { color: #F59E0B; }
  .kpi-4 .kpi-val { color: #8B5CF6; }
  .kpi-label { font-size: 11px; color: #777; margin-top: 5px; font-weight: 600; }
  /* Section */
  .section-title { font-size: 14px; font-weight: 800; color: #4F46E5; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e0e0f0; }
  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #F3F4F6; }
  th { padding: 9px 12px; text-align: right; font-size: 12px; font-weight: 700; color: #4F46E5; }
  th.center, td.center { text-align: center; }
  th.num, td.num { text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #f0f0f5; }
  tr:nth-child(even) td { background: #FAFAFA; }
  /* Footer */
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
    </div>
    <div class="kpi kpi-2">
      <div class="kpi-val">${fmt(kpis?.net_profit)}</div>
      <div class="kpi-label">صافي الربح</div>
    </div>
    <div class="kpi kpi-3">
      <div class="kpi-val">${kpis?.total_orders ?? 0}</div>
      <div class="kpi-label">عدد الطلبات</div>
    </div>
    <div class="kpi kpi-4">
      <div class="kpi-val">${fmt(kpis?.avg_order_value)}</div>
      <div class="kpi-label">متوسط الطلب</div>
    </div>
  </div>

  <div class="section-title">أفضل المنتجات مبيعاً</div>
  <table>
    <thead>
      <tr>
        <th class="center">#</th>
        <th>المنتج</th>
        <th class="num">الكمية المباعة</th>
        <th class="num">الإيرادات</th>
      </tr>
    </thead>
    <tbody>${topRows || '<tr><td colspan="4" style="text-align:center;color:#aaa">لا توجد بيانات</td></tr>'}</tbody>
  </table>

  <div class="footer">تقرير مُولَّد بواسطة برنامج حانوتي — ${dateStr}</div>
</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (w) { w.document.write(html); w.document.close(); }
}

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
        <Box sx={{ p: 3 }}>
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
                        onClick={() => handleExportReports(period, kpis, topProducts)}
                    >
                        تصدير PDF
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
