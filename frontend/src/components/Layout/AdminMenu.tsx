import { useState } from 'react';
import {
    Popover, Box, Avatar, Typography, Chip, Divider, Stack,
    alpha, useTheme, ListItemButton, ListItemIcon, ListItemText,
} from '@mui/material';
import {
    SettingsRounded as SettingsIcon,
    PersonRounded as PersonIcon,
    LockRounded as LockIcon,
    KeyboardRounded as KeyboardIcon,
    Brightness4Rounded as DarkIcon,
    Brightness7Rounded as LightIcon,
    BackupRounded as BackupIcon,
    InfoRounded as InfoIcon,
    LogoutRounded as LogoutIcon,
    StoreRounded as StoreIcon,
    AccessTimeRounded as ClockIcon,
    BadgeRounded as BadgeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../store/settingsStore';
import ChangePasswordDialog from '../Auth/ChangePasswordDialog';
import { UnifiedModal, CustomButton } from '../Common';

interface Props {
    anchorEl: HTMLElement | null;
    onClose: () => void;
    isDarkMode: boolean;
    onThemeToggle: () => void;
    /** Opens the shared ShortcutsManagerDialog mounted at the MainLayout level. */
    onOpenShortcuts: () => void;
}

const APP_VERSION = '1.2.0';
const ADMIN_NAME = 'المدير';
const ADMIN_EMAIL = 'admin@hanouti.com';

export default function AdminMenu({
    anchorEl, onClose, isDarkMode, onThemeToggle, onOpenShortcuts,
}: Props) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const navigate = useNavigate();

    const storeName = useSettingsStore((s) => s.storeName);
    const businessType = useSettingsStore((s) => s.businessType);

    const [pwdOpen, setPwdOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);

    const open = Boolean(anchorEl);

    const close = () => onClose();

    const goSettings = (section?: string) => {
        if (section) {
            navigate('/settings', { state: { section } });
        } else {
            navigate('/settings');
        }
        close();
    };

    const handleLogout = () => {
        try { localStorage.removeItem('token'); } catch { /* ignore */ }
        close();
        navigate('/login');
    };

    const lastLogin = new Date().toLocaleString('ar-DZ', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const items: Array<{
        icon: React.ReactNode; label: string; onClick: () => void;
        color?: string; danger?: boolean;
    }> = [
        { icon: <SettingsIcon />, label: 'الإعدادات', onClick: () => goSettings(), color: '#4F46E5' },
        { icon: <PersonIcon />,   label: 'الملف الشخصي', onClick: () => goSettings('profile'), color: '#6366F1' },
        { icon: <LockIcon />,     label: 'تغيير كلمة المرور', onClick: () => { setPwdOpen(true); close(); }, color: '#EF4444' },
        { icon: <KeyboardIcon />, label: 'اختصارات لوحة المفاتيح', onClick: () => { close(); onOpenShortcuts(); }, color: '#0EA5E9' },
        { icon: isDarkMode ? <LightIcon /> : <DarkIcon />, label: isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي', onClick: () => { onThemeToggle(); }, color: '#8B5CF6' },
        { icon: <BackupIcon />,   label: 'النسخ الاحتياطي السريع', onClick: () => goSettings('data'), color: '#10B981' },
        { icon: <InfoIcon />,     label: 'حول البرنامج', onClick: () => { setAboutOpen(true); close(); }, color: '#F59E0B' },
    ];

    return (
        <>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={close}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        elevation: 12,
                        sx: {
                            width: 340, borderRadius: 3, overflow: 'hidden',
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            transformOrigin: 'top left !important',
                            animation: 'adminPanelIn 0.32s cubic-bezier(0.16, 1.1, 0.3, 1)',
                            '@keyframes adminPanelIn': {
                                '0%':   { opacity: 0, transform: 'translateY(-8px) scale(0.96)' },
                                '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                            },
                        },
                    },
                }}
            >
                <Box dir="rtl">
                    {/* Header */}
                    <Box sx={{
                        p: 2.5,
                        background: isLight
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.secondary.main, 0.05)})`
                            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{
                                width: 56, height: 56,
                                bgcolor: theme.palette.primary.main,
                                fontSize: '1.4rem', fontWeight: 800,
                                boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.4)}`,
                            }}>
                                م
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle1" fontWeight={800} noWrap>
                                    {ADMIN_NAME}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                    {ADMIN_EMAIL}
                                </Typography>
                                <Chip
                                    label="مدير عام"
                                    size="small"
                                    icon={<BadgeIcon sx={{ fontSize: '0.85rem !important' }} />}
                                    sx={{
                                        mt: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 700,
                                        bgcolor: alpha(theme.palette.primary.main, 0.14),
                                        color: 'primary.main',
                                        '& .MuiChip-icon': { color: 'primary.main' },
                                    }}
                                />
                            </Box>
                        </Stack>
                    </Box>

                    {/* Quick stats */}
                    <Box sx={{ px: 2.5, py: 1.5 }}>
                        <Stack spacing={0.85}>
                            <StatRow icon={<StoreIcon sx={{ fontSize: 16 }} />} label="المتجر" value={storeName || 'حانوتي'} />
                            {businessType && (
                                <StatRow icon={<BadgeIcon sx={{ fontSize: 16 }} />} label="النشاط" value={businessType} />
                            )}
                            <StatRow icon={<ClockIcon sx={{ fontSize: 16 }} />} label="آخر دخول" value={lastLogin} />
                            <StatRow
                                icon={isDarkMode ? <DarkIcon sx={{ fontSize: 16 }} /> : <LightIcon sx={{ fontSize: 16 }} />}
                                label="المظهر"
                                value={isDarkMode ? 'ليلي' : 'نهاري'}
                            />
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Action list */}
                    <Box sx={{ py: 0.5 }}>
                        {items.map((it, i) => (
                            <ListItemButton
                                key={i}
                                onClick={it.onClick}
                                sx={{
                                    py: 1.1, px: 2.5,
                                    '&:hover': { bgcolor: alpha(it.color || theme.palette.primary.main, 0.08) },
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: 0, mr: 1.5,
                                    width: 32, height: 32, borderRadius: 1.5,
                                    bgcolor: alpha(it.color || theme.palette.primary.main, 0.12),
                                    color: it.color || theme.palette.primary.main,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    '& > svg': { fontSize: 18 },
                                }}>
                                    {it.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={it.label}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                />
                            </ListItemButton>
                        ))}
                    </Box>

                    <Divider />

                    {/* Logout */}
                    <Box sx={{ py: 0.5 }}>
                        <ListItemButton
                            onClick={handleLogout}
                            sx={{
                                py: 1.1, px: 2.5,
                                color: 'error.main',
                                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) },
                            }}
                        >
                            <ListItemIcon sx={{
                                minWidth: 0, mr: 1.5,
                                width: 32, height: 32, borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.error.main, 0.12),
                                color: 'error.main',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                '& > svg': { fontSize: 18 },
                            }}>
                                <LogoutIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="تسجيل الخروج"
                                primaryTypographyProps={{ variant: 'body2', fontWeight: 700, color: 'error.main' }}
                            />
                        </ListItemButton>
                    </Box>
                </Box>
            </Popover>

            <ChangePasswordDialog open={pwdOpen} onClose={() => setPwdOpen(false)} />

            <UnifiedModal
                open={aboutOpen}
                onClose={() => setAboutOpen(false)}
                title="حول البرنامج"
                icon={<InfoIcon />}
                severity="info"
                maxWidth="xs"
                actions={<CustomButton variant="contained" onClick={() => setAboutOpen(false)}>تم</CustomButton>}
            >
                <Stack spacing={1.25} alignItems="center" sx={{ py: 1, textAlign: 'center' }}>
                    <Box sx={{
                        width: 72, height: 72, borderRadius: 3,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: 800,
                    }}>
                        ح
                    </Box>
                    <Typography variant="h6" fontWeight={800}>حانوتي</Typography>
                    <Chip label={`الإصدار ${APP_VERSION}`} size="small"
                        sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                        نظام احترافي لإدارة نقطة البيع والمخزون.
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        تطوير: Khalil Korichi
                    </Typography>
                </Stack>
            </UnifiedModal>
        </>
    );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    const theme = useTheme();
    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{
                width: 24, height: 24, borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'text.secondary',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                {icon}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                {label}
            </Typography>
            <Typography variant="caption" fontWeight={700} sx={{
                ml: 'auto', textAlign: 'end',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 180,
            }}>
                {value}
            </Typography>
        </Stack>
    );
}
