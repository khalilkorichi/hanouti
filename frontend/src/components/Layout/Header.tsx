import {
    AppBar,
    Toolbar,
    IconButton,
    Box,
    useTheme,
    alpha,
    Avatar,
    Typography,
    Tooltip,
    Badge,
    useMediaQuery,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    NotificationsNoneRounded as NotificationsIcon,
    MenuOpenRounded as CollapseIcon,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from './Sidebar';

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
    onMenuClick,
    isDarkMode,
    onThemeToggle,
    collapsed = false,
    onCollapseToggle,
    isPermanent = false,
}: HeaderProps) {
    const theme = useTheme();
    const location = useLocation();
    const isLight = theme.palette.mode === 'light';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const pageTitle = PAGE_TITLES[location.pathname] || 'حانوتي';
    const sidebarWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;
    const appBarRight = isPermanent && !isMobile ? sidebarWidth : 0;

    return (
        <AppBar
            position="fixed"
            elevation={0}
            dir="rtl"
            /* استخدام style بدلاً من sx للتحكم في right/left
               لتجنب انعكاس الخاصية بسبب إضافة RTL في emotion */
            style={{
                right: appBarRight,
                left: 0,
                width: `calc(100% - ${appBarRight}px)`,
                transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
            sx={{
                backgroundColor: isLight
                    ? alpha('#FFFFFF', 0.88)
                    : alpha('#151F32', 0.88),
                backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                color: theme.palette.text.primary,
                zIndex: theme.zIndex.drawer - 1,
            }}
        >
            <Toolbar
                sx={{
                    minHeight: { xs: 60, md: 68 },
                    px: { xs: 2, md: 3 },
                    flexDirection: 'row',   /* اليمين ← اليسار بسبب dir="rtl" على الأب */
                    gap: 1,
                }}
            >
                {/* أقصى اليمين: زر الطي (desktop) أو القائمة (mobile) */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {isPermanent && !isMobile ? (
                        <Tooltip title={collapsed ? 'توسيع القائمة' : 'طي القائمة'} arrow>
                            <IconButton
                                onClick={onCollapseToggle}
                                size="small"
                                sx={{
                                    color: 'text.secondary',
                                    borderRadius: 1.5,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        color: 'primary.main',
                                    },
                                }}
                            >
                                <CollapseIcon
                                    sx={{
                                        transition: 'transform 0.3s',
                                        transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                                    }}
                                />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <IconButton
                            onClick={onMenuClick}
                            size="small"
                            sx={{
                                color: 'text.secondary',
                                borderRadius: 1.5,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                },
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                </Box>

                {/* عنوان الصفحة — يتمدد ليملأ المساحة الوسطى */}
                <Box sx={{ flex: 1, mx: 1 }}>
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{
                            fontSize: { xs: '1rem', md: '1.1rem' },
                            color: 'text.primary',
                            textAlign: 'start',
                        }}
                    >
                        {pageTitle}
                    </Typography>
                </Box>

                {/* أقصى اليسار: أدوات المستخدم */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'} arrow>
                        <IconButton
                            onClick={onThemeToggle}
                            size="small"
                            sx={{
                                color: 'text.secondary',
                                borderRadius: 1.5,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                },
                            }}
                        >
                            {isDarkMode
                                ? <LightModeIcon sx={{ fontSize: 20 }} />
                                : <DarkModeIcon sx={{ fontSize: 20 }} />}
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="الإشعارات" arrow>
                        <IconButton
                            size="small"
                            sx={{
                                color: 'text.secondary',
                                borderRadius: 1.5,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                },
                            }}
                        >
                            <Badge
                                badgeContent={0}
                                color="error"
                                sx={{
                                    '& .MuiBadge-badge': {
                                        fontSize: '0.6rem',
                                        minWidth: 16,
                                        height: 16,
                                    },
                                }}
                            >
                                <NotificationsIcon sx={{ fontSize: 20 }} />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    {/* بيانات المستخدم:
                        في RTL flex — الأول في DOM يظهر على اليمين:
                        Avatar (أول) → يمين | النص (ثانٍ) → يسار Avatar */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            ml: 0.5,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                            },
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 34,
                                height: 34,
                                bgcolor: theme.palette.primary.main,
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}`,
                            }}
                        >
                            م
                        </Avatar>
                        <Box
                            sx={{
                                textAlign: 'start',
                                display: { xs: 'none', sm: 'block' },
                            }}
                        >
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                display="block"
                                sx={{ lineHeight: 1.3 }}
                            >
                                المدير
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ fontSize: '0.68rem' }}
                            >
                                admin
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
