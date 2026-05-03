import { useState } from 'react';
import {
    AppBar, Toolbar, IconButton, Box, useTheme, alpha, Avatar,
    Typography, Tooltip, Badge, useMediaQuery, Popover,
    Divider, Button, Chip,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    NotificationsNoneRounded as NotificationsIcon,
    MenuOpenRounded as CollapseIcon,
    DoneAll as DoneAllIcon,
    DeleteOutline as ClearIcon,
    NotificationsOff as EmptyBellIcon,
    CheckRounded as AllReadIcon,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from './Sidebar';
import { useNotification, SEVERITY_CONFIG, type NotifHistoryItem } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const PAGE_TITLES: Record<string, string> = {
    '/': 'لوحة التحكم',
    '/sales': 'نقطة البيع',
    '/products': 'المنتجات',
    '/categories': 'الفئات',
    '/sales-list': 'سجل المبيعات',
    '/inventory': 'المخزون',
    '/reports': 'التقارير',
    '/settings': 'الإعدادات',
};

interface HeaderProps {
    onMenuClick: () => void;
    isDarkMode: boolean;
    onThemeToggle: () => void;
    collapsed?: boolean;
    onCollapseToggle?: () => void;
    isPermanent?: boolean;
}

export default function Header({
    onMenuClick, isDarkMode, onThemeToggle,
    collapsed = false, onCollapseToggle, isPermanent = false,
}: HeaderProps) {
    const theme = useTheme();
    const location = useLocation();
    const isLight = theme.palette.mode === 'light';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const { history, unreadCount, markAllAsRead, markAsRead, clearHistory } = useNotification();

    const [bellAnchor, setBellAnchor] = useState<HTMLButtonElement | null>(null);
    const bellOpen = Boolean(bellAnchor);

    const pageTitle = PAGE_TITLES[location.pathname] || 'حانوتي';
    const sidebarWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;
    const appBarRight = isPermanent && !isMobile ? sidebarWidth : 0;

    const handleBellClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setBellAnchor(e.currentTarget);
    };
    const handleBellClose = () => setBellAnchor(null);

    return (
        <>
            <AppBar
                position="fixed"
                elevation={0}
                style={{
                    insetInlineStart: appBarRight,
                    insetInlineEnd: 0,
                    width: `calc(100% - ${appBarRight}px)`,
                    transition: 'inset-inline-start 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)',
                }}
                sx={{
                    backgroundColor: isLight ? alpha('#FFFFFF', 0.88) : alpha('#151F32', 0.88),
                    backdropFilter: 'blur(12px)',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    color: theme.palette.text.primary,
                    zIndex: theme.zIndex.drawer - 1,
                }}
            >
                <Toolbar sx={{ minHeight: { xs: 60, md: 68 }, px: { xs: 2, md: 3 }, flexDirection: 'row', gap: 1 }}>
                    {/* Right: collapse/menu button */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {isPermanent && !isMobile ? (
                            <Tooltip title={collapsed ? 'توسيع القائمة' : 'طي القائمة'} arrow>
                                <IconButton onClick={onCollapseToggle} size="small"
                                    sx={{ color: 'text.secondary', borderRadius: 1.5, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' } }}>
                                    <CollapseIcon sx={{ transition: 'transform 0.3s', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <IconButton onClick={onMenuClick} size="small"
                                sx={{ color: 'text.secondary', borderRadius: 1.5, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' } }}>
                                <MenuIcon />
                            </IconButton>
                        )}
                    </Box>

                    {/* Title */}
                    <Box sx={{ flex: 1, mx: 1 }}>
                        <Typography variant="h6" fontWeight={700}
                            sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, color: 'text.primary', textAlign: 'start' }}>
                            {pageTitle}
                        </Typography>
                    </Box>

                    {/* Left: tools */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'} arrow>
                            <IconButton onClick={onThemeToggle} size="small"
                                sx={{ color: 'text.secondary', borderRadius: 1.5, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' } }}>
                                {isDarkMode ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
                            </IconButton>
                        </Tooltip>

                        {/* Bell */}
                        <Tooltip title="الإشعارات" arrow>
                            <IconButton onClick={handleBellClick} size="small"
                                sx={{
                                    color: bellOpen ? 'primary.main' : 'text.secondary',
                                    borderRadius: 1.5,
                                    bgcolor: bellOpen ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' },
                                }}>
                                <Badge
                                    badgeContent={unreadCount}
                                    color="error"
                                    max={99}
                                    sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                                >
                                    <NotificationsIcon sx={{ fontSize: 20 }} />
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        {/* User */}
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1, marginInlineStart: 0.5, px: 1.5, py: 0.5,
                            borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                        }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: theme.palette.primary.main, fontSize: '0.85rem', fontWeight: 700, boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}` }}>
                                م
                            </Avatar>
                            <Box sx={{ textAlign: 'start', display: { xs: 'none', sm: 'block' } }}>
                                <Typography variant="caption" fontWeight={700} display="block" sx={{ lineHeight: 1.3 }}>المدير</Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem' }}>admin</Typography>
                            </Box>
                        </Box>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* ── Notification Panel ── */}
            <Popover
                open={bellOpen}
                anchorEl={bellAnchor}
                onClose={handleBellClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 12,
                    sx: {
                        width: 380,
                        maxHeight: 520,
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }}
            >
                <Box dir="rtl" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Panel header */}
                    <Box sx={{
                        px: 2.5, py: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: isLight
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)}, ${alpha(theme.palette.secondary.main, 0.04)})`
                            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.secondary.main, 0.08)})`,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        flexShrink: 0,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}>الإشعارات</Typography>
                            {unreadCount > 0 && (
                                <Chip label={unreadCount} size="small" color="error"
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {unreadCount > 0 && (
                                <Tooltip title="تعليم الكل مقروء" arrow>
                                    <IconButton size="small" onClick={markAllAsRead}
                                        sx={{ color: 'primary.main', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
                                        <DoneAllIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {history.length > 0 && (
                                <Tooltip title="مسح الكل" arrow>
                                    <IconButton size="small" onClick={clearHistory}
                                        sx={{ color: 'text.secondary', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' } }}>
                                        <ClearIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </Box>

                    {/* List */}
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        {history.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
                                <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <EmptyBellIcon sx={{ fontSize: 32, color: alpha(theme.palette.primary.main, 0.4) }} />
                                </Box>
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>لا توجد إشعارات</Typography>
                                <Typography variant="caption" color="text.disabled">ستظهر هنا إشعاراتك السابقة</Typography>
                            </Box>
                        ) : (
                            history.map((item, idx) => (
                                <NotifHistoryRow
                                    key={item.id}
                                    item={item}
                                    isLast={idx === history.length - 1}
                                    onRead={() => markAsRead(item.id)}
                                />
                            ))
                        )}
                    </Box>

                    {/* Footer */}
                    {history.length > 0 && unreadCount === 0 && (
                        <>
                            <Divider />
                            <Box sx={{ p: 1.5, textAlign: 'center' }}>
                                <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                >
                                    <AllReadIcon sx={{ fontSize: 14 }} />
                                    جميع الإشعارات مقروءة
                                </Typography>
                            </Box>
                        </>
                    )}
                    {history.length > 0 && unreadCount > 0 && (
                        <>
                            <Divider />
                            <Box sx={{ p: 1.5 }}>
                                <Button fullWidth size="small" startIcon={<DoneAllIcon />}
                                    onClick={markAllAsRead}
                                    sx={{ borderRadius: 1.5, textTransform: 'none' }}>
                                    تعليم الكل كمقروء
                                </Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Popover>
        </>
    );
}

/* ── Single history row ── */
function NotifHistoryRow({
    item, isLast, onRead
}: { item: NotifHistoryItem; isLast: boolean; onRead: () => void }) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const cfg = SEVERITY_CONFIG[item.severity];

    const timeAgo = (() => {
        try {
            return formatDistanceToNow(new Date(item.receivedAt), { addSuffix: true, locale: ar });
        } catch {
            return '';
        }
    })();

    return (
        <Box
            onClick={onRead}
            sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1.5,
                px: 2.5, py: 1.75,
                cursor: item.read ? 'default' : 'pointer',
                borderBottom: isLast ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                bgcolor: item.read
                    ? 'transparent'
                    : (isLight ? alpha(cfg.lightColor, 0.04) : alpha(cfg.border, 0.06)),
                transition: 'background-color 0.2s',
                '&:hover': !item.read ? {
                    bgcolor: isLight ? alpha(cfg.lightColor, 0.08) : alpha(cfg.border, 0.1),
                } : {},
                position: 'relative',
            }}
        >
            {/* Unread dot */}
            {!item.read && (
                <Box sx={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 6, height: 6, borderRadius: '50%',
                    bgcolor: cfg.border, boxShadow: `0 0 6px ${cfg.border}`,
                }} />
            )}

            {/* Icon */}
            <Box sx={{
                width: 34, height: 34, borderRadius: 2, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: isLight ? cfg.lightBg : alpha(cfg.border, 0.12),
                color: isLight ? cfg.lightColor : cfg.border,
                mt: 0.25,
            }}>
                {cfg.icon}
            </Box>

            {/* Text */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                {item.title && (
                    <Typography variant="caption" fontWeight={700}
                        sx={{ display: 'block', color: isLight ? cfg.lightColor : cfg.border, mb: 0.2, lineHeight: 1.3 }}>
                        {item.title}
                    </Typography>
                )}
                <Typography variant="body2"
                    sx={{ fontWeight: item.read ? 400 : 600, lineHeight: 1.4, color: item.read ? 'text.secondary' : 'text.primary', fontSize: '0.82rem' }}>
                    {item.message}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', mt: 0.3, display: 'block' }}>
                    {timeAgo}
                </Typography>
            </Box>
        </Box>
    );
}
