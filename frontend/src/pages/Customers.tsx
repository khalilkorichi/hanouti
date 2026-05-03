import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Card, CardContent, Stack, alpha, useTheme, Chip, IconButton,
    Tooltip, Avatar, Divider, TextField, MenuItem, Drawer, Tabs, Tab, Autocomplete,
    Alert, AlertTitle,
} from '@mui/material';
import {
    People as PeopleIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Payments as PaymentsIcon,
    PhoneRounded as PhoneIcon,
    PersonRounded as PersonIcon,
    AttachMoney as MoneyIcon,
    TrendingUp as TrendingUpIcon,
    CreditScoreRounded as DebtIcon,
    ReceiptLong as ReceiptIcon,
    Close as CloseIcon,
    PersonAddAlt1 as AssignIcon,
    HelpOutline as AnonIcon,
    EventRounded as DateIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService, type Customer, type CustomerPayment } from '../services/customerService';
import { salesService, type Sale } from '../services/salesService';
import {
    PageHeader, CustomButton, UnifiedModal, SearchInput, CustomCard,
} from '../components/Common';
import { useNotification } from '../contexts/NotificationContext';
import { useDebounce } from '../hooks/useDebounce';

function fmt(n: number) {
    return `${(n || 0).toLocaleString('ar-DZ', { maximumFractionDigits: 0 })} دج`;
}

interface FormState {
    name: string;
    phone: string;
    notes: string;
}

const EMPTY_FORM: FormState = { name: '', phone: '', notes: '' };

export default function Customers() {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const [search, setSearch] = useState('');
    const [onlyDebt, setOnlyDebt] = useState(searchParams.get('filter') === 'debt');
    const [editing, setEditing] = useState<Customer | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
    const [payDialog, setPayDialog] = useState<Customer | null>(null);
    const [assignSale, setAssignSale] = useState<Sale | null>(null);

    const debouncedSearch = useDebounce(search, 300);

    // Keep ?filter=debt in sync with the toggle so it can be deep-linked.
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (onlyDebt) params.set('filter', 'debt'); else params.delete('filter');
        setSearchParams(params, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onlyDebt]);

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['customers', debouncedSearch, onlyDebt],
        queryFn: () => customerService.list({ q: debouncedSearch || undefined, only_with_debt: onlyDebt }),
    });

    const { data: summary } = useQuery({
        queryKey: ['customers-debt-summary'],
        queryFn: customerService.debtSummary,
    });

    const totalCustomers = customers.length;
    const totalDebt = useMemo(
        () => customers.reduce((sum, c) => sum + (c.total_due || 0), 0),
        [customers]
    );

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['customers-debt-summary'] });
    };

    const createMutation = useMutation({
        mutationFn: customerService.create,
        onSuccess: () => {
            showNotification('تمت إضافة العميل بنجاح', 'success');
            setCreating(false);
            setForm(EMPTY_FORM);
            invalidate();
        },
        onError: (e: { response?: { data?: { detail?: string } } }) => {
            showNotification(e.response?.data?.detail || 'فشل إضافة العميل', 'error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (vars: { id: number; payload: { name: string; phone: string | null; notes: string | null } }) =>
            customerService.update(vars.id, vars.payload),
        onSuccess: () => {
            showNotification('تم تحديث العميل', 'success');
            setEditing(null);
            invalidate();
        },
        onError: (e: { response?: { data?: { detail?: string } } }) => {
            showNotification(e.response?.data?.detail || 'فشل تحديث العميل', 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: customerService.remove,
        onSuccess: () => {
            showNotification('تم حذف العميل', 'success');
            setConfirmDelete(null);
            invalidate();
        },
        onError: () => showNotification('فشل حذف العميل', 'error'),
    });

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setCreating(true);
    };

    const openEdit = (c: Customer) => {
        setForm({ name: c.name, phone: c.phone || '', notes: c.notes || '' });
        setEditing(c);
    };

    const submitForm = () => {
        if (!form.name.trim()) {
            showNotification('الاسم مطلوب', 'warning');
            return;
        }
        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            notes: form.notes.trim() || null,
        };
        if (editing) {
            updateMutation.mutate({ id: editing.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <Box>
            <PageHeader
                title="العملاء والديون"
                subtitle="إدارة العملاء وتسجيل الدفعات المؤجلة"
                icon={<PeopleIcon />}
                actions={
                    <CustomButton variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                        عميل جديد
                    </CustomButton>
                }
            />

            {/* Anonymous debts banner (sales with debt and no customer) */}
            <AnonymousDebtsPanel onAssign={(s) => setAssignSale(s)} />

            {/* KPI Strip */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                <KPI
                    title="إجمالي العملاء"
                    value={String(totalCustomers)}
                    icon={<PersonIcon />}
                    color="#4F46E5"
                />
                <KPI
                    title="إجمالي الديون"
                    value={fmt(summary?.total_debt ?? totalDebt)}
                    icon={<DebtIcon />}
                    color="#EF4444"
                />
                <KPI
                    title="عملاء عليهم ديون"
                    value={String(summary?.customers_with_debt ?? 0)}
                    icon={<TrendingUpIcon />}
                    color="#F59E0B"
                />
            </Box>

            <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.8)}` }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems="center">
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <SearchInput
                                value={search}
                                onChange={setSearch}
                                placeholder="ابحث بالاسم أو الهاتف…"
                                fullWidth
                            />
                        </Box>
                        <Chip
                            icon={<DebtIcon />}
                            label={onlyDebt ? 'يعرض المدينين فقط' : 'إظهار المدينين فقط'}
                            color={onlyDebt ? 'error' : 'default'}
                            onClick={() => setOnlyDebt(v => !v)}
                            sx={{ fontWeight: 600, cursor: 'pointer' }}
                        />
                    </Stack>

                    {isLoading ? (
                        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                            جارٍ التحميل…
                        </Typography>
                    ) : customers.length === 0 ? (
                        <EmptyState onAdd={openCreate} hasFilter={!!debouncedSearch || onlyDebt} />
                    ) : (
                        <Stack spacing={1.25}>
                            {customers.map(c => (
                                <CustomerRow
                                    key={c.id}
                                    customer={c}
                                    onEdit={() => openEdit(c)}
                                    onDelete={() => setConfirmDelete(c)}
                                    onDetail={() => setDetailCustomer(c)}
                                    onPay={() => setPayDialog(c)}
                                />
                            ))}
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Modal */}
            <UnifiedModal
                open={creating || editing !== null}
                onClose={() => { setCreating(false); setEditing(null); }}
                title={editing ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                maxWidth="sm"
                actions={
                    <>
                        <CustomButton
                            variant="contained"
                            onClick={submitForm}
                            loading={createMutation.isPending || updateMutation.isPending}
                        >
                            حفظ
                        </CustomButton>
                        <CustomButton color="inherit" onClick={() => { setCreating(false); setEditing(null); }}>
                            إلغاء
                        </CustomButton>
                    </>
                }
            >
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="الاسم *"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        fullWidth
                        autoFocus
                    />
                    <TextField
                        label="رقم الهاتف"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        fullWidth
                        placeholder="0555 123 456"
                    />
                    <TextField
                        label="ملاحظات"
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        fullWidth
                        multiline
                        rows={3}
                    />
                </Stack>
            </UnifiedModal>

            {/* Delete confirmation */}
            <UnifiedModal
                open={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                title="حذف العميل"
                maxWidth="xs"
                actions={
                    <>
                        <CustomButton
                            color="error"
                            variant="contained"
                            onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
                            loading={deleteMutation.isPending}
                        >
                            حذف
                        </CustomButton>
                        <CustomButton color="inherit" onClick={() => setConfirmDelete(null)}>
                            إلغاء
                        </CustomButton>
                    </>
                }
            >
                <Typography>
                    هل أنت متأكد من حذف العميل <strong>{confirmDelete?.name}</strong>؟
                </Typography>
                {confirmDelete && confirmDelete.total_due > 0 && (
                    <Typography color="error" sx={{ mt: 1, fontWeight: 600 }}>
                        تنبيه: على هذا العميل دين بقيمة {fmt(confirmDelete.total_due)}.
                    </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    سيتم فصل سجل العميل عن الفواتير السابقة (لن تُحذف الفواتير).
                </Typography>
            </UnifiedModal>

            {/* Customer Detail Drawer */}
            <CustomerDetailDrawer
                customer={detailCustomer}
                onClose={() => setDetailCustomer(null)}
                onPay={() => detailCustomer && setPayDialog(detailCustomer)}
            />

            {/* Record Payment Modal */}
            <RecordPaymentDialog
                customer={payDialog}
                onClose={() => setPayDialog(null)}
                onSuccess={() => {
                    invalidate();
                    queryClient.invalidateQueries({ queryKey: ['customer-sales'] });
                    queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
                }}
            />

            {/* Assign customer to anonymous debt sale */}
            <AssignCustomerDialog
                sale={assignSale}
                customers={customers}
                onClose={() => setAssignSale(null)}
                onSuccess={() => {
                    invalidate();
                    queryClient.invalidateQueries({ queryKey: ['anonymous-debts'] });
                }}
            />
        </Box>
    );
}

function AnonymousDebtsPanel({ onAssign }: { onAssign: (s: Sale) => void }) {
    const { data: anon = [] } = useQuery({
        queryKey: ['anonymous-debts'],
        queryFn: salesService.listAnonymousDebts,
    });
    if (anon.length === 0) return null;
    const total = anon.reduce((s, x) => s + (x.due_amount || 0), 0);
    return (
        <Alert
            severity="warning"
            icon={<AnonIcon />}
            sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
        >
            <AlertTitle sx={{ fontWeight: 800 }}>
                ديون مجهولة الهوية ({anon.length}) — إجمالي {fmt(total)}
            </AlertTitle>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                فواتير مؤجلة لم يُسجَّل عليها عميل. عيِّن لها عميلاً لتظهر ضمن سجله.
            </Typography>
            <Stack spacing={0.75} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {anon.map(s => (
                    <Stack
                        key={s.id}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1.5 }}
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                                {s.invoice_no}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(s.created_at).toLocaleDateString('ar-DZ')} · دين {fmt(s.due_amount)}
                            </Typography>
                        </Box>
                        <CustomButton
                            size="small"
                            variant="outlined"
                            startIcon={<AssignIcon />}
                            onClick={() => onAssign(s)}
                        >
                            تعيين عميل
                        </CustomButton>
                    </Stack>
                ))}
            </Stack>
        </Alert>
    );
}

function AssignCustomerDialog({
    sale, customers, onClose, onSuccess,
}: {
    sale: Sale | null;
    customers: Customer[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { showNotification } = useNotification();
    const [selected, setSelected] = useState<Customer | null>(null);

    useEffect(() => { if (sale) setSelected(null); }, [sale]);

    const mutation = useMutation({
        mutationFn: (vars: { saleId: number; customerId: number }) =>
            salesService.assignCustomer(vars.saleId, vars.customerId),
        onSuccess: () => {
            showNotification('تم تعيين العميل للفاتورة', 'success');
            onSuccess();
            onClose();
        },
        onError: (e: { response?: { data?: { detail?: string } } }) => {
            showNotification(e.response?.data?.detail || 'فشل التعيين', 'error');
        },
    });

    return (
        <UnifiedModal
            open={sale !== null}
            onClose={onClose}
            title={`تعيين عميل — ${sale?.invoice_no || ''}`}
            maxWidth="xs"
            actions={
                <>
                    <CustomButton
                        variant="contained"
                        disabled={!selected}
                        loading={mutation.isPending}
                        onClick={() => sale && selected && mutation.mutate({ saleId: sale.id, customerId: selected.id })}
                    >
                        تأكيد
                    </CustomButton>
                    <CustomButton color="inherit" onClick={onClose}>إلغاء</CustomButton>
                </>
            }
        >
            <Stack spacing={2} sx={{ mt: 1 }}>
                {sale && (
                    <Typography variant="body2" color="text.secondary">
                        دين الفاتورة: <strong>{fmt(sale.due_amount)}</strong>
                    </Typography>
                )}
                <Autocomplete<Customer, false, false, false>
                    options={customers}
                    value={selected}
                    onChange={(_, v) => setSelected(v)}
                    getOptionLabel={(o) => o.name + (o.phone ? ` — ${o.phone}` : '')}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(params) => <TextField {...params} label="العميل *" autoFocus />}
                />
            </Stack>
        </UnifiedModal>
    );
}

function KPI({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
    return (
        <CustomCard sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                    width: 48, height: 48, borderRadius: 2.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${alpha(color, 0.18)}, ${alpha(color, 0.08)})`,
                    color,
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {title}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>
                        {value}
                    </Typography>
                </Box>
            </Stack>
        </CustomCard>
    );
}

function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
    const theme = useTheme();
    return (
        <Box sx={{ py: 6, textAlign: 'center' }}>
            <Avatar sx={{ width: 72, height: 72, mx: 'auto', bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, mb: 2 }}>
                <PeopleIcon sx={{ fontSize: 36 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={700} gutterBottom>
                {hasFilter ? 'لا توجد نتائج' : 'لا يوجد عملاء بعد'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
                {hasFilter ? 'جرّب تعديل البحث أو إزالة الفلاتر' : 'أضف عميلك الأول لتسجيل الديون والدفعات المؤجلة'}
            </Typography>
            {!hasFilter && (
                <CustomButton variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
                    إضافة عميل
                </CustomButton>
            )}
        </Box>
    );
}

function CustomerRow({
    customer, onEdit, onDelete, onDetail, onPay,
}: {
    customer: Customer;
    onEdit: () => void; onDelete: () => void; onDetail: () => void; onPay: () => void;
}) {
    const theme = useTheme();
    const hasDebt = customer.total_due > 0;

    return (
        <Box
            onClick={onDetail}
            sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                p: 1.75, borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
                '&:hover': {
                    borderColor: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                },
            }}
        >
            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main }}>
                {customer.name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>{customer.name}</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.25 }}>
                    {customer.phone && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <PhoneIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">{customer.phone}</Typography>
                        </Stack>
                    )}
                    <Typography variant="caption" color="text.secondary">
                        {customer.sales_count} فاتورة
                    </Typography>
                    {customer.last_sale_date && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <DateIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                                آخر فاتورة: {new Date(customer.last_sale_date).toLocaleDateString('ar-DZ')}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </Box>
            <Stack alignItems="flex-end" spacing={0.25} sx={{ minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">الدين الحالي</Typography>
                <Typography
                    fontWeight={800}
                    sx={{ color: hasDebt ? theme.palette.error.main : theme.palette.success.main }}
                >
                    {fmt(customer.total_due)}
                </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} onClick={e => e.stopPropagation()}>
                {hasDebt && (
                    <Tooltip title="تسجيل دفعة">
                        <IconButton size="small" color="success" onClick={onPay}>
                            <PaymentsIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                <Tooltip title="تعديل">
                    <IconButton size="small" onClick={onEdit}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={onDelete}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
    );
}

function CustomerDetailDrawer({
    customer, onClose, onPay,
}: { customer: Customer | null; onClose: () => void; onPay: () => void }) {
    const theme = useTheme();
    const [tab, setTab] = useState(0);

    const { data: sales = [] } = useQuery({
        queryKey: ['customer-sales', customer?.id],
        queryFn: () => customerService.sales(customer!.id),
        enabled: !!customer,
    });
    const { data: payments = [] } = useQuery({
        queryKey: ['customer-payments', customer?.id],
        queryFn: () => customerService.payments(customer!.id),
        enabled: !!customer,
    });

    return (
        <Drawer
            anchor="left"
            open={customer !== null}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%' } }}
        >
            {customer && (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{
                        p: 2.5,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        color: '#fff',
                    }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)' }}>
                                    {customer.name.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" fontWeight={800}>{customer.name}</Typography>
                                    {customer.phone && (
                                        <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                            {customer.phone}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                            <IconButton onClick={onClose} sx={{ color: '#fff' }}>
                                <CloseIcon />
                            </IconButton>
                        </Stack>

                        <Stack direction="row" spacing={2} sx={{ mt: 2.5 }}>
                            <MiniStat label="الإجمالي" value={fmt(customer.total_purchases)} />
                            <MiniStat label="الديون" value={fmt(customer.total_due)} highlight={customer.total_due > 0} />
                            <MiniStat label="الفواتير" value={String(customer.sales_count)} />
                        </Stack>

                        {customer.total_due > 0 && (
                            <CustomButton
                                variant="contained"
                                startIcon={<PaymentsIcon />}
                                onClick={onPay}
                                fullWidth
                                sx={{
                                    mt: 2, bgcolor: '#fff', color: theme.palette.primary.main,
                                    '&:hover': { bgcolor: alpha('#fff', 0.9) },
                                }}
                            >
                                تسجيل دفعة
                            </CustomButton>
                        )}
                    </Box>

                    <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
                        <Tab label={`الفواتير (${sales.length})`} />
                        <Tab label={`الدفعات (${payments.length})`} />
                    </Tabs>

                    <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                        {tab === 0 && <SalesList sales={sales} />}
                        {tab === 1 && <PaymentsList payments={payments} />}
                    </Box>

                    {customer.notes && (
                        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="caption" color="text.secondary">ملاحظات</Typography>
                            <Typography variant="body2">{customer.notes}</Typography>
                        </Box>
                    )}
                </Box>
            )}
        </Drawer>
    );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <Box sx={{ flex: 1, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1.5, py: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.85, display: 'block' }}>{label}</Typography>
            <Typography fontWeight={800} sx={{ color: highlight ? '#FCA5A5' : '#fff' }}>
                {value}
            </Typography>
        </Box>
    );
}

function SalesList({ sales }: { sales: Sale[] }) {
    const theme = useTheme();
    if (sales.length === 0) {
        return <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>لا توجد فواتير</Typography>;
    }
    return (
        <Stack spacing={1}>
            {sales.map(s => {
                const due = s.due_amount || 0;
                return (
                    <Box key={s.id} sx={{
                        p: 1.5, borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="body2" fontWeight={700}>
                                    <ReceiptIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                    {s.invoice_no}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {new Date(s.created_at).toLocaleDateString('ar-DZ')}
                                </Typography>
                            </Box>
                            <Stack alignItems="flex-end">
                                <Typography variant="caption" color="text.secondary">
                                    {fmt(s.total)}
                                </Typography>
                                {due > 0 ? (
                                    <Chip
                                        size="small"
                                        label={`دين: ${fmt(due)}`}
                                        color="error"
                                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                    />
                                ) : (
                                    <Chip
                                        size="small"
                                        label="مدفوعة"
                                        color="success"
                                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                    />
                                )}
                            </Stack>
                        </Stack>
                    </Box>
                );
            })}
        </Stack>
    );
}

function PaymentsList({ payments }: { payments: CustomerPayment[] }) {
    const theme = useTheme();
    if (payments.length === 0) {
        return <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>لا توجد دفعات</Typography>;
    }
    return (
        <Stack spacing={1}>
            {payments.map(p => (
                <Box key={p.id} sx={{
                    p: 1.5, borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="body2" fontWeight={700} color="success.main">
                                <PaymentsIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                {fmt(p.amount)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(p.created_at).toLocaleDateString('ar-DZ')} · {p.method === 'card' ? 'بطاقة' : 'نقداً'}
                            </Typography>
                        </Box>
                        {p.notes && (
                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, textAlign: 'end' }}>
                                {p.notes}
                            </Typography>
                        )}
                    </Stack>
                </Box>
            ))}
        </Stack>
    );
}

function RecordPaymentDialog({
    customer, onClose, onSuccess,
}: { customer: Customer | null; onClose: () => void; onSuccess: () => void }) {
    const { showNotification } = useNotification();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [saleId, setSaleId] = useState<string>(''); // '' = FIFO across all
    const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

    const open = customer !== null;
    const due = customer?.total_due || 0;

    // Reset form whenever the dialog opens for a different customer
    useEffect(() => {
        if (customer) {
            setAmount(''); setMethod('cash'); setNotes(''); setSaleId('');
            setPaymentDate(new Date().toISOString().slice(0, 10));
        }
    }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch unpaid sales so the user can target a specific invoice if desired
    const { data: customerSales = [] } = useQuery({
        queryKey: ['customer-sales', customer?.id],
        queryFn: () => customer ? customerService.sales(customer.id) : Promise.resolve([] as Sale[]),
        enabled: open,
    });
    const unpaidSales = customerSales.filter(s => (s.due_amount || 0) > 0 && s.status === 'completed');

    const mutation = useMutation({
        mutationFn: (vars: {
            id: number;
            payload: {
                amount: number; method: string; notes?: string | null;
                sale_id?: number | null; payment_date?: string | null;
            };
        }) => customerService.recordPayment(vars.id, vars.payload),
        onSuccess: () => {
            showNotification('تم تسجيل الدفعة بنجاح', 'success');
            onSuccess();
            onClose();
        },
        onError: (e: { response?: { data?: { detail?: string } } }) => {
            showNotification(e.response?.data?.detail || 'فشل تسجيل الدفعة', 'error');
        },
    });

    const submit = () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) {
            showNotification('أدخل مبلغاً صحيحاً', 'warning');
            return;
        }
        if (!customer) return;
        mutation.mutate({
            id: customer.id,
            payload: {
                amount: amt,
                method,
                notes: notes.trim() || null,
                sale_id: saleId ? Number(saleId) : null,
                payment_date: paymentDate ? new Date(paymentDate).toISOString() : null,
            },
        });
    };

    return (
        <UnifiedModal
            open={open}
            onClose={onClose}
            title={`تسجيل دفعة — ${customer?.name || ''}`}
            maxWidth="sm"
            actions={
                <>
                    <CustomButton
                        variant="contained"
                        color="success"
                        onClick={submit}
                        loading={mutation.isPending}
                        startIcon={<PaymentsIcon />}
                    >
                        تأكيد الدفعة
                    </CustomButton>
                    <CustomButton color="inherit" onClick={onClose}>إلغاء</CustomButton>
                </>
            }
        >
            <Stack spacing={2} sx={{ mt: 1 }}>
                {due > 0 && (
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#EF4444', 0.08), border: '1px solid', borderColor: alpha('#EF4444', 0.2) }}>
                        <Typography variant="caption" color="error.main" fontWeight={700}>
                            الدين الحالي: {fmt(due)}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            ستُوزَّع الدفعة تلقائياً على الفواتير غير المدفوعة (الأقدم أولاً).
                        </Typography>
                    </Box>
                )}
                <TextField
                    label="المبلغ *"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    fullWidth
                    autoFocus
                    InputProps={{ endAdornment: <Typography variant="caption">دج</Typography> }}
                />
                {due > 0 && (
                    <CustomButton
                        size="small"
                        variant="outlined"
                        startIcon={<MoneyIcon />}
                        onClick={() => setAmount(String(due))}
                    >
                        دفع كامل الدين ({fmt(due)})
                    </CustomButton>
                )}
                {unpaidSales.length > 0 && (
                    <TextField
                        label="تطبيق على فاتورة محددة (اختياري)"
                        select
                        value={saleId}
                        onChange={e => setSaleId(e.target.value)}
                        fullWidth
                        helperText="اتركه فارغاً للتوزيع التلقائي على الفواتير الأقدم أولاً"
                    >
                        <MenuItem value="">— توزيع تلقائي (الأقدم أولاً) —</MenuItem>
                        {unpaidSales.map(s => (
                            <MenuItem key={s.id} value={String(s.id)}>
                                {s.invoice_no} — دين {fmt(s.due_amount)} — {new Date(s.created_at).toLocaleDateString('ar-DZ')}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
                <TextField
                    label="تاريخ الدفع"
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="طريقة الدفع"
                    select
                    value={method}
                    onChange={e => setMethod(e.target.value)}
                    fullWidth
                >
                    <MenuItem value="cash">نقداً</MenuItem>
                    <MenuItem value="card">بطاقة</MenuItem>
                </TextField>
                <TextField
                    label="ملاحظات"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                />
                <Divider />
                <Typography variant="caption" color="text.secondary">
                    سيُحفظ سجل الدفعة في تاريخ العميل ويُحدَّث الدين تلقائياً.
                </Typography>
            </Stack>
        </UnifiedModal>
    );
}
