import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    useTheme,
    alpha,
    Box,
    Typography,
    Divider,
    Tooltip,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    ShoppingCart as ShoppingCartIcon,
    Inventory as InventoryIcon,
    Category as CategoryIcon,
    Receipt as ReceiptIcon,
    Assessment as AssessmentIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Warehouse as WarehouseIcon,
    StorefrontRounded as StoreIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    onLogout: () => void;
    variant?: 'permanent' | 'temporary';
    collapsed?: boolean;
}

export const DRAWER_WIDTH = 256;
export const DRAWER_COLLAPSED_WIDTH = 72;

const menuItems = [
    { text: 'لوحة التحكم', icon: <DashboardIcon />, path: '/', color: '#4F46E5' },
    { text: 'نقطة البيع', icon: <ShoppingCartIcon />, path: '/sales', color: '#10B981' },
    { text: 'المنتجات', icon: <InventoryIcon />, path: '/products', color: '#06B6D4' },
    { text: 'الفئات', icon: <CategoryIcon />, path: '/categories', color: '#F59E0B' },
    { text: 'سجل المبيعات', icon: <ReceiptIcon />, path: '/sales-list', color: '#EF4444' },
    { text: 'المخزون', icon: <WarehouseIcon />, path: '/inventory', color: '#10B981' },
    { text: 'التقارير', icon: <AssessmentIcon />, path: '/reports', color: '#8B5CF6' },
    { text: 'الإعدادات', icon: <SettingsIcon />, path: '/settings', color: '#64748B' },
];

function SidebarContent({ onLogout, collapsed = false }: { onLogout: () => void; collapsed?: boolean }) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    return (
        <Box
            dir="rtl"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* الشعار — محاذاة لليمين في RTL */}
            <Box
                sx={{
                    px: collapsed ? 1 : 3,
                    py: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    /* flex-start في RTL = يمين الصفحة ✓ */
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    minHeight: 70,
                }}
            >
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.7)})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                    }}
                >
                    <StoreIcon sx={{ color: 'white', fontSize: 22 }} />
                </Box>
                {!collapsed && (
                    <Box sx={{ textAlign: 'start' }}>
                        <Typography
                            variant="h6"
                            fontWeight={800}
                            sx={{
                                lineHeight: 1.2,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            حانوتي
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            نظام POS
                        </Typography>
                    </Box>
                )}
            </Box>

            <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.6) }} />

            {/* التنقل */}
            <Box sx={{ flex: 1, overflow: 'auto', px: collapsed ? 1 : 2, py: 2 }}>
                {!collapsed && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        sx={{
                            px: 1.5,
                            mb: 1,
                            display: 'block',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            fontSize: '0.65rem',
                            textAlign: 'start',
                        }}
                    >
                        القائمة الرئيسية
                    </Typography>
                )}

                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <ListItem key={item.text} disablePadding>
                                <Tooltip
                                    title={collapsed ? item.text : ''}
                                    placement="left"
                                    arrow
                                >
                                    <ListItemButton
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            borderRadius: 2,
                                            py: 1.2,
                                            px: 1.5,
                                            minHeight: 46,
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                            /* flex-start في RTL = يمين ✓ (الأيقونة تظهر يميناً والنص يساراً) */
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                            ...(isActive
                                                ? {
                                                    backgroundColor: alpha(item.color, isLight ? 0.1 : 0.15),
                                                    '& .MuiListItemIcon-root': { color: item.color },
                                                    '& .MuiListItemText-primary': {
                                                        color: item.color,
                                                        fontWeight: 700,
                                                    },
                                                    /* مؤشر الصفحة النشطة على الجانب الأيسر
                                                       (الجهة المواجهة للمحتوى الرئيسي) —
                                                       سيُعكس تلقائياً بإضافة RTL plugin  */
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: '20%',
                                                        height: '60%',
                                                        width: 3,
                                                        borderRadius: '3px 0 0 3px',
                                                        backgroundColor: item.color,
                                                    },
                                                }
                                                : {
                                                    '&:hover': {
                                                        backgroundColor: alpha(theme.palette.action.hover, 0.06),
                                                        '& .MuiListItemIcon-root': { color: item.color },
                                                    },
                                                }),
                                        }}
                                    >
                                        {/* الأيقونة — تظهر أولاً وهو يمين في RTL flex-start */}
                                        <ListItemIcon
                                            sx={{
                                                minWidth: collapsed ? 'auto' : 36,
                                                color: isActive ? item.color : 'text.secondary',
                                                transition: 'color 0.2s',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>

                                        {/* النص — يظهر بعد الأيقونة، أي يساراً في RTL */}
                                        {!collapsed && (
                                            <ListItemText
                                                primary={item.text}
                                                primaryTypographyProps={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: isActive ? 700 : 500,
                                                    fontFamily: '"Cairo", sans-serif',
                                                    textAlign: 'start',
                                                }}
                                                sx={{ m: 0 }}
                                            />
                                        )}
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>

            {/* تسجيل الخروج */}
            <Box sx={{ px: collapsed ? 1 : 2, pb: 2 }}>
                <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.6), mb: 2 }} />
                <Tooltip title={collapsed ? 'تسجيل الخروج' : ''} placement="left" arrow>
                    <ListItemButton
                        onClick={onLogout}
                        sx={{
                            borderRadius: 2,
                            py: 1.2,
                            px: 1.5,
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            color: theme.palette.error.main,
                            transition: 'all 0.2s',
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.error.main, 0.08),
                            },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: collapsed ? 'auto' : 36,
                                color: 'inherit',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <LogoutIcon />
                        </ListItemIcon>
                        {!collapsed && (
                            <ListItemText
                                primary="تسجيل الخروج"
                                primaryTypographyProps={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    fontFamily: '"Cairo", sans-serif',
                                    textAlign: 'start',
                                }}
                                sx={{ m: 0 }}
                            />
                        )}
                    </ListItemButton>
                </Tooltip>
            </Box>
        </Box>
    );
}

export default function Sidebar({ open, onClose, onLogout, variant = 'temporary', collapsed = false }: SidebarProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const width = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

    const paperSx = {
        width,
        boxSizing: 'border-box' as const,
        /* borderRight هنا → emotion RTL plugin يحوّله إلى border-left
           وهو الجانب الداخلي للشريط (المواجه للمحتوى) ✓ */
        borderRight: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        borderLeft: 'none',
        background: isLight ? '#FFFFFF' : '#151F32',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
    };

    if (variant === 'permanent') {
        return (
            <Drawer
                variant="permanent"
                /* anchor="left" → emotion RTL plugin يحوّل left:0 إلى right:0
                   فيظهر الشريط على الجانب الأيمن ✓ */
                anchor="left"
                open
                sx={{
                    width,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': paperSx,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <SidebarContent onLogout={onLogout} collapsed={collapsed} />
            </Drawer>
        );
    }

    return (
        <Drawer
            variant="temporary"
            open={open}
            onClose={onClose}
            anchor="left"
            sx={{
                '& .MuiDrawer-paper': { ...paperSx, width: DRAWER_WIDTH },
                '& .MuiBackdrop-root': {
                    backdropFilter: 'blur(4px)',
                    backgroundColor: alpha(theme.palette.common.black, 0.25),
                },
            }}
        >
            <SidebarContent onLogout={onLogout} collapsed={false} />
        </Drawer>
    );
}
