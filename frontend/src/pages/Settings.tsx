import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Typography, Box, TextField, Switch, Stack, Avatar,
    useTheme, alpha, Tooltip, Paper, IconButton,
    Slider, Select, MenuItem, FormControl, InputLabel,
    Divider,
} from '@mui/material';
import {
    Security as SecurityIcon,
    Palette as PaletteIcon,
    Storage as StorageIcon,
    Info as InfoIcon,
    Person as PersonIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    CheckCircle as CheckCircleIcon,
    WhatsApp as WhatsAppIcon,
    Save as SaveIcon,
    Lock as LockIcon,
    Brightness4 as DarkIcon,
    Brightness7 as LightIcon,
    TextFields as FontIcon,
    GitHub as GitHubIcon,
    RoundedCorner as RadiusIcon,
    ViewCompact as DensityIcon,
    Animation as AnimationIcon,
    SystemUpdateAlt as UpdatesIcon,
    HistoryRounded as HistoryIcon,
    Numbers as NumbersIcon,
    FormatBold as BoldIcon,
    NotificationsActive as ToastIcon,
    DateRange as DateIcon,
    Contrast as ContrastIcon,
    Image as ImageIcon,
    Home as HomeIcon,
    ViewSidebar as SidebarIcon,
    RestartAlt as ResetIcon,
    Tune as TuneIcon,
} from '@mui/icons-material';
import { CustomButton, PageHeader } from '../components/Common';
import ChangePasswordDialog from '../components/Auth/ChangePasswordDialog';
import UpdaterPanel from '../components/Settings/UpdaterPanel';
import FactoryResetCard from '../components/Settings/FactoryResetCard';
import RestoreBackupDialog from '../components/Settings/RestoreBackupDialog';
import RestorePointsCard from '../components/Settings/RestorePointsCard';
import ActivityLogCard from '../components/Settings/ActivityLogCard';
import { backupService } from '../services/backupService';
import { useAppTheme, COLOR_PRESETS, FONT_FAMILIES } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';

/* ── Section type ── */
type SectionKey = 'profile' | 'appearance' | 'data' | 'activity' | 'updates' | 'security' | 'about';

interface NavItem {
    key: SectionKey;
    label: string;
    icon: React.ReactNode;
    color: string;
}

const NAV_ITEMS: NavItem[] = [
    { key: 'profile', label: 'الملف الشخصي', icon: <PersonIcon />, color: '#4F46E5' },
    { key: 'appearance', label: 'المظهر', icon: <PaletteIcon />, color: '#8B5CF6' },
    { key: 'data', label: 'البيانات', icon: <StorageIcon />, color: '#10B981' },
    { key: 'activity', label: 'سجل النشاطات', icon: <HistoryIcon />, color: '#0F766E' },
    { key: 'updates', label: 'التحديثات', icon: <UpdatesIcon />, color: '#0EA5E9' },
    { key: 'security', label: 'الأمان', icon: <SecurityIcon />, color: '#EF4444' },
    { key: 'about', label: 'حول البرنامج', icon: <InfoIcon />, color: '#F59E0B' },
];

/* ────────────────────────────────────────── */
export default function Settings() {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const {
        mode, toggleMode, primaryColor, setPrimaryColor, fontSize, setFontSize,
        radius, setRadius, density, setDensity, animSpeed, setAnimSpeed,
        hideTrailingZeros, setHideTrailingZeros,
        decimalPlaces, setDecimalPlaces,
        thousandSeparator, setThousandSeparator,
        currencySymbol, setCurrencySymbol,
        currencyPosition, setCurrencyPosition,
        fontScale, setFontScale,
        fontFamily, setFontFamily,
        boldNumbers, setBoldNumbers,
        defaultPage, setDefaultPage,
        sidebarCollapsedDefault, setSidebarCollapsedDefault,
        showProductImages, setShowProductImages,
        toastPosition, setToastPosition,
        dateFormat, setDateFormat,
        highContrast, setHighContrast,
        resetAppearance,
    } = useAppTheme();
    const { showNotification } = useNotification();

    const [activeSection, setActiveSection] = useState<SectionKey>('profile');

    /* Allow other pages (e.g. AdminMenu) to deep-link via navigate('/settings', { state: { section } }) */
    const location = useLocation();
    useEffect(() => {
        const target = (location.state as { section?: SectionKey } | null)?.section;
        if (target && (['profile','appearance','data','activity','updates','security','about'] as SectionKey[]).includes(target)) {
            setActiveSection(target);
        }
    }, [location.state, location.key]);
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
    const [username, setUsername] = useState('المسؤول');
    const [email] = useState('admin@hanouti.com');
    const handleSaveProfile = () => {
        showNotification('تم حفظ بيانات الملف الشخصي', 'success', { title: 'تم الحفظ' });
    };

    const handleBackup = async () => {
        try {
            const blob = await backupService.exportSnapshot();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hanouti_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('تم تصدير النسخة الاحتياطية', 'success');
        } catch (e) {
            console.error('[backup] export failed:', e);
            showNotification('تعذّر تصدير النسخة الاحتياطية', 'error');
        }
    };

    const activeNav = NAV_ITEMS.find(n => n.key === activeSection)!;

    return (
        <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 120px)', alignItems: 'flex-start' }}>

            {/* ── Sidebar Navigation ── */}
            <Paper
                elevation={0}
                sx={{
                    width: 240, flexShrink: 0, borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    overflow: 'hidden', position: 'sticky', top: 20,
                }}
            >
                {/* Sidebar header */}
                <Box sx={{
                    p: 2.5,
                    background: isLight
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.07)}, ${alpha(theme.palette.secondary.main, 0.04)})`
                        : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.08)})`,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                }}>
                    <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                        الإعدادات
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        تخصيص برنامج حانوتي
                    </Typography>
                </Box>

                {/* Nav items */}
                <Box sx={{ p: 1 }}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeSection === item.key;
                        return (
                            <Box
                                key={item.key}
                                onClick={() => setActiveSection(item.key)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                    px: 2, py: 1.4, borderRadius: 2, mb: 0.5,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    bgcolor: isActive ? alpha(item.color, isLight ? 0.1 : 0.15) : 'transparent',
                                    color: isActive ? item.color : 'text.secondary',
                                    border: `1px solid ${isActive ? alpha(item.color, 0.25) : 'transparent'}`,
                                    '&:hover': {
                                        bgcolor: alpha(item.color, 0.07),
                                        color: item.color,
                                    },
                                }}
                            >
                                <Box sx={{ color: 'inherit', display: 'flex', fontSize: 20 }}>
                                    {item.icon}
                                </Box>
                                <Typography variant="body2" fontWeight={isActive ? 700 : 500} color="inherit">
                                    {item.label}
                                </Typography>
                                {isActive && (
                                    <Box sx={{ mr: 'auto', width: 4, height: 4, borderRadius: '50%', bgcolor: item.color }} />
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Paper>

            {/* ── Main content ── */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Section header (unified PageHeader, accent color follows the active nav) */}
                <PageHeader
                    compact
                    title={activeNav.label}
                    subtitle={
                        activeSection === 'profile' ? 'إدارة بياناتك الشخصية' :
                        activeSection === 'appearance' ? 'تخصيص مظهر التطبيق' :
                        activeSection === 'data' ? 'نسخ احتياطي واستعادة البيانات' :
                        activeSection === 'activity' ? 'سجل التغييرات ونقاط الاستعادة المجدولة' :
                        activeSection === 'updates' ? 'تحديث البرنامج تلقائياً من GitHub' :
                        activeSection === 'security' ? 'حماية حسابك' :
                        'معلومات عن حانوتي'
                    }
                    icon={activeNav.icon}
                    accent={activeNav.color}
                />

                {/* ── Profile ── */}
                {activeSection === 'profile' && (
                    <Stack spacing={2.5}>
                        <SettingsCard title="الصورة الشخصية">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Avatar sx={{ width: 80, height: 80, bgcolor: theme.palette.primary.main, fontSize: '2rem', fontWeight: 700, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}` }}>
                                    {username.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>{username}</Typography>
                                    <Typography variant="caption" color="text.secondary">{email}</Typography>
                                    <Box sx={{ mt: 1 }}>
                                        <CustomButton variant="outlined" size="small" sx={{ borderRadius: 2, fontSize: '0.78rem' }}>
                                            تغيير الصورة
                                        </CustomButton>
                                    </Box>
                                </Box>
                            </Box>
                        </SettingsCard>

                        <SettingsCard title="بيانات الحساب">
                            <Stack spacing={2}>
                                <TextField fullWidth label="اسم المستخدم" value={username}
                                    onChange={(e) => setUsername(e.target.value)} variant="outlined" size="small" />
                                <TextField fullWidth label="البريد الإلكتروني" value={email}
                                    disabled variant="outlined" size="small"
                                    helperText="البريد الإلكتروني لا يمكن تغييره" />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-start', pt: 1 }}>
                                    <CustomButton variant="contained" startIcon={<SaveIcon />} onClick={handleSaveProfile}>
                                        حفظ التغييرات
                                    </CustomButton>
                                </Box>
                            </Stack>
                        </SettingsCard>
                    </Stack>
                )}

                {/* ── Appearance ── */}
                {activeSection === 'appearance' && (
                    <Stack spacing={2.5}>
                        <SettingsCard title="وضع العرض" icon={<DarkIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                                        {mode === 'dark' ? <DarkIcon color="primary" /> : <LightIcon color="primary" />}
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                            {mode === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {mode === 'dark' ? 'خلفية داكنة مريحة للعين' : 'خلفية فاتحة وواضحة'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Switch checked={mode === 'dark'} onChange={toggleMode} color="primary" />
                            </Box>
                        </SettingsCard>

                        <SettingsCard title="حجم الخط" icon={<FontIcon />}>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                {(['small', 'medium', 'large'] as const).map((size) => {
                                    const labels = { small: 'صغير', medium: 'متوسط', large: 'كبير' };
                                    const isSelected = fontSize === size;
                                    return (
                                        <Box
                                            key={size}
                                            onClick={() => setFontSize(size)}
                                            sx={{
                                                flex: 1, py: 2, borderRadius: 2.5, cursor: 'pointer',
                                                border: `2px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.8)}`,
                                                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.07) : 'transparent',
                                                textAlign: 'center', transition: 'all 0.2s',
                                                '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                            }}
                                        >
                                            <Typography sx={{
                                                fontSize: size === 'small' ? '0.8rem' : size === 'medium' ? '1rem' : '1.2rem',
                                                fontWeight: isSelected ? 700 : 400,
                                                color: isSelected ? 'primary.main' : 'text.secondary',
                                            }}>
                                                أ
                                            </Typography>
                                            <Typography variant="caption" color={isSelected ? 'primary.main' : 'text.secondary'} fontWeight={isSelected ? 700 : 400}>
                                                {labels[size]}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </SettingsCard>

                        <SettingsCard title="لون السمة الرئيسي">
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                                {Object.entries(COLOR_PRESETS).map(([name, color]) => (
                                    <Tooltip key={name} title={name} arrow>
                                        <Box
                                            onClick={() => {
                                                setPrimaryColor(color);
                                                showNotification(`تم تغيير لون السمة إلى ${name}`, 'success');
                                            }}
                                            sx={{
                                                width: 48, height: 48, borderRadius: '50%', bgcolor: color,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: primaryColor === color ? `3px solid ${isLight ? '#fff' : '#1a1a2e'}` : '3px solid transparent',
                                                boxShadow: primaryColor === color ? `0 0 0 2.5px ${color}, 0 4px 12px ${alpha(color, 0.45)}` : `0 2px 8px ${alpha(color, 0.3)}`,
                                                transition: 'all 0.2s',
                                                '&:hover': { transform: 'scale(1.12)', boxShadow: `0 0 0 2px ${color}, 0 6px 16px ${alpha(color, 0.4)}` },
                                            }}
                                        >
                                            {primaryColor === color && <CheckCircleIcon sx={{ color: '#fff', fontSize: 20 }} />}
                                        </Box>
                                    </Tooltip>
                                ))}
                                <Tooltip title="لون مخصص" arrow>
                                    <Box
                                        component="label"
                                        sx={{
                                            position: 'relative',
                                            width: 48, height: 48, borderRadius: '50%',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: `conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #06b6d4, #4f46e5, #8b5cf6, #f43f5e)`,
                                            boxShadow: !Object.values(COLOR_PRESETS).includes(primaryColor)
                                                ? `0 0 0 2.5px ${primaryColor}, 0 4px 12px ${alpha(primaryColor, 0.45)}`
                                                : `0 2px 8px rgba(0,0,0,0.15)`,
                                            border: `3px solid ${isLight ? '#fff' : '#1a1a2e'}`,
                                            transition: 'all 0.2s',
                                            '&:hover': { transform: 'scale(1.12)' },
                                        }}
                                    >
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', borderRadius: '50%' }}
                                        />
                                        {!Object.values(COLOR_PRESETS).includes(primaryColor) && (
                                            <CheckCircleIcon sx={{ color: '#fff', fontSize: 20, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                                        )}
                                    </Box>
                                </Tooltip>
                            </Box>
                        </SettingsCard>

                        <SettingsCard title="انحناء الزوايا" icon={<RadiusIcon />}>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                {(['sharp', 'medium', 'rounded'] as const).map((r) => {
                                    const labels = { sharp: 'حادة', medium: 'متوسطة', rounded: 'دائرية' };
                                    const radiusMap = { sharp: 4, medium: 10, rounded: 16 };
                                    const isSelected = radius === r;
                                    return (
                                        <Box
                                            key={r}
                                            onClick={() => {
                                                setRadius(r);
                                                showNotification(`تم تغيير انحناء الزوايا إلى ${labels[r]}`, 'success');
                                            }}
                                            sx={{
                                                flex: 1, py: 2.5, cursor: 'pointer',
                                                borderRadius: `${radiusMap[r]}px`,
                                                border: `2px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.8)}`,
                                                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.07) : 'transparent',
                                                textAlign: 'center', transition: 'all 0.2s',
                                                '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                            }}
                                        >
                                            <Box sx={{
                                                width: 40, height: 40, mx: 'auto', mb: 0.8,
                                                borderRadius: `${radiusMap[r]}px`,
                                                bgcolor: isSelected ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.3),
                                                transition: 'all 0.2s',
                                            }} />
                                            <Typography variant="caption" color={isSelected ? 'primary.main' : 'text.secondary'} fontWeight={isSelected ? 700 : 500}>
                                                {labels[r]}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </SettingsCard>

                        <SettingsCard title="كثافة العناصر" icon={<DensityIcon />}>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                {(['compact', 'comfortable', 'spacious'] as const).map((d) => {
                                    const labels = { compact: 'مدمجة', comfortable: 'مريحة', spacious: 'واسعة' };
                                    const descs = { compact: 'مساحات صغيرة', comfortable: 'متوازنة', spacious: 'مساحات كبيرة' };
                                    const isSelected = density === d;
                                    return (
                                        <Box
                                            key={d}
                                            onClick={() => {
                                                setDensity(d);
                                                showNotification(`تم تغيير الكثافة إلى ${labels[d]}`, 'success');
                                            }}
                                            sx={{
                                                flex: 1, py: 2, px: 1.5, borderRadius: 2.5, cursor: 'pointer',
                                                border: `2px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.8)}`,
                                                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.07) : 'transparent',
                                                textAlign: 'center', transition: 'all 0.2s',
                                                '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: d === 'compact' ? 0.4 : d === 'comfortable' ? 0.8 : 1.2, mb: 1 }}>
                                                {[0, 1, 2].map(i => (
                                                    <Box key={i} sx={{
                                                        width: d === 'compact' ? 5 : d === 'comfortable' ? 6 : 7,
                                                        height: d === 'compact' ? 14 : d === 'comfortable' ? 18 : 22,
                                                        borderRadius: 0.5,
                                                        bgcolor: isSelected ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.3),
                                                    }} />
                                                ))}
                                            </Box>
                                            <Typography variant="body2" color={isSelected ? 'primary.main' : 'text.primary'} fontWeight={isSelected ? 700 : 600}>
                                                {labels[d]}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                                {descs[d]}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </SettingsCard>

                        <SettingsCard title="سرعة الحركات" icon={<AnimationIcon />}>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                {(['off', 'fast', 'normal'] as const).map((s) => {
                                    const labels = { off: 'بدون', fast: 'سريعة', normal: 'عادية' };
                                    const descs = { off: 'بدون انتقالات', fast: 'انتقالات سريعة', normal: 'انتقالات سلسة' };
                                    const isSelected = animSpeed === s;
                                    return (
                                        <Box
                                            key={s}
                                            onClick={() => {
                                                setAnimSpeed(s);
                                                showNotification(`تم تغيير سرعة الحركات إلى ${labels[s]}`, 'success');
                                            }}
                                            sx={{
                                                flex: 1, py: 2, px: 1.5, borderRadius: 2.5, cursor: 'pointer',
                                                border: `2px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.8)}`,
                                                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.07) : 'transparent',
                                                textAlign: 'center', transition: 'all 0.2s',
                                                '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                            }}
                                        >
                                            <Typography variant="body2" color={isSelected ? 'primary.main' : 'text.primary'} fontWeight={isSelected ? 700 : 600}>
                                                {labels[s]}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                                {descs[s]}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </SettingsCard>

                        {/* ── Number / money display ── */}
                        <SettingsCard title="عرض الأرقام والعملة" icon={<NumbersIcon />}>
                            <Stack spacing={2}>
                                <SwitchRow
                                    label="إخفاء الأصفار غير اللازمة"
                                    desc="مثال: 100.00 → 100"
                                    checked={hideTrailingZeros}
                                    onChange={setHideTrailingZeros}
                                />
                                <SwitchRow
                                    label="فاصل الآلاف"
                                    desc="مثال: 12,345"
                                    checked={thousandSeparator}
                                    onChange={setThousandSeparator}
                                />
                                <Divider />
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>عدد الخانات العشرية</InputLabel>
                                        <Select
                                            value={decimalPlaces}
                                            label="عدد الخانات العشرية"
                                            onChange={(e) => setDecimalPlaces(Number(e.target.value) as 0 | 2 | 3)}
                                        >
                                            <MenuItem value={0}>0</MenuItem>
                                            <MenuItem value={2}>2</MenuItem>
                                            <MenuItem value={3}>3</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        size="small"
                                        label="رمز العملة"
                                        value={currencySymbol}
                                        onChange={(e) => setCurrencySymbol(e.target.value.slice(0, 8))}
                                        inputProps={{ maxLength: 8, style: { textAlign: 'center' } }}
                                    />
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>موضع العملة</InputLabel>
                                        <Select
                                            value={currencyPosition}
                                            label="موضع العملة"
                                            onChange={(e) => setCurrencyPosition(e.target.value as 'before' | 'after')}
                                        >
                                            <MenuItem value="after">بعد المبلغ ({`100 ${currencySymbol}`})</MenuItem>
                                            <MenuItem value="before">قبل المبلغ ({`${currencySymbol} 100`})</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <Box sx={{
                                    p: 1.5, borderRadius: 2, textAlign: 'center',
                                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                                }}>
                                    <Typography variant="caption" color="text.secondary" display="block">معاينة</Typography>
                                    <Typography variant="h6" fontWeight={700} color="primary.main">
                                        {previewMoney(12345.6, { hideTrailingZeros, decimalPlaces, thousandSeparator, currencySymbol, currencyPosition })}
                                    </Typography>
                                </Box>
                            </Stack>
                        </SettingsCard>

                        {/* ── Font scale & family ── */}
                        <SettingsCard title="حجم وعائلة الخط" icon={<FontIcon />}>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="body2" fontWeight={600}>مقياس الخط</Typography>
                                        <Typography variant="caption" color="primary.main" fontWeight={700}>
                                            {Math.round(fontScale * 100)}%
                                        </Typography>
                                    </Box>
                                    <Slider
                                        value={fontScale}
                                        min={0.8} max={1.3} step={0.05}
                                        onChange={(_, v) => setFontScale(v as number)}
                                        marks={[
                                            { value: 0.8, label: '80%' },
                                            { value: 1, label: '100%' },
                                            { value: 1.3, label: '130%' },
                                        ]}
                                    />
                                </Box>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>عائلة الخط</InputLabel>
                                    <Select
                                        value={fontFamily}
                                        label="عائلة الخط"
                                        onChange={(e) => setFontFamily(e.target.value as keyof typeof FONT_FAMILIES)}
                                    >
                                        {Object.keys(FONT_FAMILIES).map(name => (
                                            <MenuItem key={name} value={name}
                                                sx={{ fontFamily: FONT_FAMILIES[name as keyof typeof FONT_FAMILIES] }}>
                                                {name} — مرحبا بكم في حانوتي
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <SwitchRow
                                    label="أرقام عريضة"
                                    desc="جعل الأرقام أبرز وأسهل قراءة في الجداول"
                                    checked={boldNumbers}
                                    onChange={setBoldNumbers}
                                    icon={<BoldIcon fontSize="small" />}
                                />
                            </Stack>
                        </SettingsCard>

                        {/* ── General preferences ── */}
                        <SettingsCard title="تفضيلات عامة" icon={<TuneIcon />}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>الصفحة الافتراضية</InputLabel>
                                        <Select
                                            value={defaultPage}
                                            label="الصفحة الافتراضية"
                                            onChange={(e) => setDefaultPage(e.target.value as typeof defaultPage)}
                                            startAdornment={<HomeIcon sx={{ fontSize: 18, ml: 1, color: 'text.secondary' }} />}
                                        >
                                            <MenuItem value="/">لوحة التحكم</MenuItem>
                                            <MenuItem value="/sales">المبيعات</MenuItem>
                                            <MenuItem value="/products">المنتجات</MenuItem>
                                            <MenuItem value="/inventory">المخزون</MenuItem>
                                            <MenuItem value="/categories">الفئات</MenuItem>
                                            <MenuItem value="/sales-list">سجل المبيعات</MenuItem>
                                            <MenuItem value="/reports">التقارير</MenuItem>
                                            <MenuItem value="/customers">العملاء</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>تنسيق التاريخ</InputLabel>
                                        <Select
                                            value={dateFormat}
                                            label="تنسيق التاريخ"
                                            onChange={(e) => setDateFormat(e.target.value as typeof dateFormat)}
                                            startAdornment={<DateIcon sx={{ fontSize: 18, ml: 1, color: 'text.secondary' }} />}
                                        >
                                            <MenuItem value="dd/MM/yyyy">31/12/2025</MenuItem>
                                            <MenuItem value="yyyy-MM-dd">2025-12-31</MenuItem>
                                            <MenuItem value="dd MMM yyyy">31 ديسمبر 2025</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>موضع التنبيهات</InputLabel>
                                        <Select
                                            value={toastPosition}
                                            label="موضع التنبيهات"
                                            onChange={(e) => setToastPosition(e.target.value as typeof toastPosition)}
                                            startAdornment={<ToastIcon sx={{ fontSize: 18, ml: 1, color: 'text.secondary' }} />}
                                        >
                                            <MenuItem value="top-right">أعلى يمين</MenuItem>
                                            <MenuItem value="top-left">أعلى يسار</MenuItem>
                                            <MenuItem value="top-center">أعلى وسط</MenuItem>
                                            <MenuItem value="bottom-right">أسفل يمين</MenuItem>
                                            <MenuItem value="bottom-left">أسفل يسار</MenuItem>
                                            <MenuItem value="bottom-center">أسفل وسط</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                                <Divider />
                                <SwitchRow
                                    label="طيّ الشريط الجانبي افتراضيًا"
                                    desc="بدء التطبيق مع شريط جانبي مطويّ"
                                    checked={sidebarCollapsedDefault}
                                    onChange={(v) => {
                                        setSidebarCollapsedDefault(v);
                                        try { localStorage.removeItem('sidebar_collapsed'); } catch { /* ignore */ }
                                    }}
                                    icon={<SidebarIcon fontSize="small" />}
                                />
                                <SwitchRow
                                    label="إظهار صور المنتجات"
                                    desc="عرض الصور المصغّرة في الجداول والقوائم"
                                    checked={showProductImages}
                                    onChange={setShowProductImages}
                                    icon={<ImageIcon fontSize="small" />}
                                />
                                <SwitchRow
                                    label="تباين عالي"
                                    desc="ألوان أكثر وضوحًا للقراءة في الإضاءة الساطعة"
                                    checked={highContrast}
                                    onChange={setHighContrast}
                                    icon={<ContrastIcon fontSize="small" />}
                                />
                            </Stack>
                        </SettingsCard>

                        {/* ── Reset ── */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                            <CustomButton
                                variant="outlined"
                                startIcon={<ResetIcon />}
                                onClick={() => {
                                    resetAppearance();
                                    showNotification('تم استعادة إعدادات المظهر الافتراضية', 'success');
                                }}
                                sx={{
                                    borderColor: alpha(theme.palette.error.main, 0.5),
                                    color: theme.palette.error.main,
                                    '&:hover': {
                                        borderColor: theme.palette.error.main,
                                        bgcolor: alpha(theme.palette.error.main, 0.06),
                                    },
                                }}
                            >
                                استعادة الإعدادات الافتراضية
                            </CustomButton>
                        </Box>
                    </Stack>
                )}

                {/* ── Data ── */}
                {activeSection === 'data' && (
                    <Stack spacing={2.5}>
                        <Box sx={{
                            p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                            bgcolor: isLight ? '#EFF6FF' : alpha('#3B82F6', 0.08),
                            border: `1px solid ${alpha('#3B82F6', 0.25)}`,
                        }}>
                            <InfoIcon sx={{ color: '#3B82F6', fontSize: 20 }} />
                            <Typography variant="body2" color={isLight ? '#1D4ED8' : '#93C5FD'} fontWeight={500}>
                                قم بتصدير نسخة احتياطية بانتظام لحماية بياناتك من الضياع
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <SettingsCard title="تصدير البيانات">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 1 }}>
                                    <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: alpha('#10B981', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <DownloadIcon sx={{ fontSize: 28, color: '#10B981' }} />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        تحميل نسخة كاملة من قاعدة البيانات كملف JSON
                                    </Typography>
                                    <CustomButton variant="contained" startIcon={<DownloadIcon />} fullWidth onClick={handleBackup}
                                        sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
                                        تصدير نسخة احتياطية
                                    </CustomButton>
                                </Box>
                            </SettingsCard>

                            <SettingsCard title="استعادة البيانات">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 1 }}>
                                    <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: alpha('#8B5CF6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <UploadIcon sx={{ fontSize: 28, color: '#8B5CF6' }} />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        استعادة البيانات من ملف نسخة احتياطية سابق
                                    </Typography>
                                    <CustomButton
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<UploadIcon />}
                                        onClick={() => setOpenRestoreDialog(true)}
                                        sx={{
                                            borderColor: '#8B5CF6',
                                            color: '#8B5CF6',
                                            '&:hover': {
                                                borderColor: '#7C3AED',
                                                bgcolor: alpha('#8B5CF6', 0.05),
                                            },
                                        }}
                                    >
                                        رفع ملف النسخة
                                    </CustomButton>
                                </Box>
                            </SettingsCard>
                        </Box>

                        <RestorePointsCard />

                        <FactoryResetCard />
                    </Stack>
                )}

                {/* ── Activity log ── */}
                {activeSection === 'activity' && (
                    <Stack spacing={2.5}>
                        <ActivityLogCard />
                    </Stack>
                )}

                {/* ── Updates ── */}
                {activeSection === 'updates' && (
                    <UpdaterPanel />
                )}

                {/* ── Security ── */}
                {activeSection === 'security' && (
                    <Stack spacing={2.5}>
                        <SettingsCard title="كلمة المرور" icon={<LockIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>تغيير كلمة المرور</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        يُنصح بتغييرها بانتظام لحماية حسابك
                                    </Typography>
                                </Box>
                                <CustomButton variant="outlined" startIcon={<LockIcon />}
                                    onClick={() => setOpenPasswordDialog(true)}>
                                    تغيير
                                </CustomButton>
                            </Box>
                        </SettingsCard>

                        <SettingsCard title="معلومات الجلسة" icon={<SecurityIcon />}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[
                                    { label: 'آخر دخول', value: 'اليوم، 7:00 م' },
                                    { label: 'الجهاز', value: 'متصفح الويب' },
                                    { label: 'الحالة', value: 'نشط' },
                                ].map(row => (
                                    <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                                        <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                                        <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </SettingsCard>

                    </Stack>
                )}

                {/* ── About ── */}
                {activeSection === 'about' && (
                    <Stack spacing={2.5}>
                        <Box sx={{
                            p: 4, borderRadius: 3, textAlign: 'center',
                            background: isLight
                                ? `linear-gradient(135deg, ${alpha('#4F46E5', 0.05)}, ${alpha('#8B5CF6', 0.03)})`
                                : `linear-gradient(135deg, ${alpha('#4F46E5', 0.12)}, ${alpha('#8B5CF6', 0.08)})`,
                            border: `1px solid ${alpha('#4F46E5', 0.15)}`,
                        }}>
                            <Avatar sx={{
                                width: 80, height: 80, margin: '0 auto',
                                bgcolor: theme.palette.primary.main, fontSize: '2rem', fontWeight: 800,
                                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
                                mb: 2,
                            }}>ح</Avatar>
                            <Typography variant="h5" fontWeight={800} gutterBottom
                                sx={{
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                                }}>
                                برنامج حانوتي
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                نظام إدارة المبيعات والمخزون المتكامل
                            </Typography>
                            <Box sx={{ mt: 1.5, display: 'inline-block', px: 2, py: 0.6, borderRadius: 10, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                <Typography variant="caption" fontWeight={700} color="primary.main">الإصدار 1.0.0</Typography>
                            </Box>
                        </Box>

                        <SettingsCard title="المطوّر">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: alpha('#10B981', 0.15), color: '#10B981', fontWeight: 700 }}>خ</Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>خليل قريشي</Typography>
                                        <Typography variant="caption" color="text.secondary">مطوّر البرنامج</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <IconButton
                                        component="a" href="https://wa.me/213663730533" target="_blank"
                                        sx={{ bgcolor: alpha('#25D366', 0.1), color: '#25D366', '&:hover': { bgcolor: alpha('#25D366', 0.18) } }}
                                    >
                                        <WhatsAppIcon />
                                    </IconButton>
                                    <IconButton
                                        sx={{ bgcolor: alpha(theme.palette.text.primary, 0.06), color: 'text.primary', '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.12) } }}
                                    >
                                        <GitHubIcon />
                                    </IconButton>
                                </Box>
                            </Box>
                        </SettingsCard>

                        <SettingsCard title="التقنيات المستخدمة">
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {['React 19', 'TypeScript', 'FastAPI', 'SQLite', 'Material UI v7', 'Vite', 'TanStack Query', 'Zustand'].map(tech => (
                                    <Box key={tech} sx={{
                                        px: 1.5, py: 0.5, borderRadius: 2,
                                        bgcolor: alpha(theme.palette.primary.main, 0.07),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                    }}>
                                        <Typography variant="caption" fontWeight={600} color="primary.main">{tech}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </SettingsCard>
                    </Stack>
                )}
            </Box>

            <ChangePasswordDialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} />
            <RestoreBackupDialog
                open={openRestoreDialog}
                onClose={() => setOpenRestoreDialog(false)}
            />
        </Box>
    );
}

/* ── Reusable switch row ── */
function SwitchRow({
    label, desc, checked, onChange, icon,
}: {
    label: string; desc?: string; checked: boolean;
    onChange: (v: boolean) => void; icon?: React.ReactNode;
}) {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                {icon && (
                    <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', display: 'flex' }}>
                        {icon}
                    </Box>
                )}
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{label}</Typography>
                    {desc && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{desc}</Typography>}
                </Box>
            </Box>
            <Switch checked={checked} onChange={(_, v) => onChange(v)} color="primary" />
        </Box>
    );
}

/* ── Tiny formatter shared with the live preview in the appearance card ── */
function previewMoney(n: number, opts: {
    hideTrailingZeros: boolean; decimalPlaces: 0 | 2 | 3;
    thousandSeparator: boolean; currencySymbol: string;
    currencyPosition: 'before' | 'after';
}): string {
    let body = n.toFixed(opts.decimalPlaces);
    if (opts.hideTrailingZeros && body.includes('.')) {
        body = body.replace(/\.?0+$/, '');
    }
    if (opts.thousandSeparator) {
        const [int, frac] = body.split('.');
        body = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac ? `.${frac}` : '');
    }
    return opts.currencyPosition === 'before'
        ? `${opts.currencySymbol} ${body}`
        : `${body} ${opts.currencySymbol}`;
}

/* ── Reusable card wrapper ── */
function SettingsCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    const theme = useTheme();
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.7)}`, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon && <Box sx={{ color: 'text.secondary', display: 'flex', fontSize: 18 }}>{icon}</Box>}
                <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
                {children}
            </Box>
        </Paper>
    );
}
