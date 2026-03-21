import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    useTheme,
    alpha,
    Box,
    Typography,
    Avatar,
    Divider
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
    Person as PersonIcon,
    Warehouse as WarehouseIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';


interface SidebarProps {
    open: boolean;
    onClose: () => void;
    onLogout: () => void;
}

const DRAWER_WIDTH = 280;

const menuItems = [
    { text: 'لوحة التحكم', icon: <DashboardIcon />, path: '/', color: '#0052CC' },
    { text: 'نقطة البيع', icon: <ShoppingCartIcon />, path: '/sales', color: '#36B37E' },
    { text: 'المنتجات', icon: <InventoryIcon />, path: '/products', color: '#00B8D9' },
    { text: 'الفئات', icon: <CategoryIcon />, path: '/categories', color: '#FFAB00' },
    { text: 'المبيعات', icon: <ReceiptIcon />, path: '/sales-list', color: '#FF5630' },
    { text: 'المخزون', icon: <WarehouseIcon />, path: '/inventory', color: '#00C853' },
    { text: 'التقارير', icon: <AssessmentIcon />, path: '/reports', color: '#6554C0' },
    { text: 'الإعدادات', icon: <SettingsIcon />, path: '/settings', color: '#172B4D' },
];

export default function Sidebar({ open, onClose, onLogout }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };

    return (
        <Drawer
            variant="temporary"
            open={open}
            onClose={onClose}
            anchor="left" // In RTL mode, 'left' anchor positions the drawer on the Left side (which is right visually)
            sx={{
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`, // Ensure border is on the inner side (Physical Right in RTL)
                    borderRight: 'none',
                    boxShadow: `-8px 0 32px ${alpha(theme.palette.common.black, 0.1)}`,
                    direction: 'rtl',
                    background: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.background.paper, 0.95)
                        : '#ffffff',
                    backdropFilter: 'blur(8px)',
                    overflowX: 'visible', // Allow button to overflow
                },
                '& .MuiBackdrop-root': {
                    backdropFilter: 'blur(4px)',
                    backgroundColor: alpha(theme.palette.common.black, 0.2),
                }
            }}
        >
            <Toolbar sx={{ minHeight: { xs: 64, md: 70 } }} />

            {/* Sidebar Header / User Info */}
            <Box sx={{
                p: 3,
                textAlign: 'center',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
                    }}
                >
                    <Avatar
                        sx={{
                            width: 64,
                            height: 64,
                            bgcolor: 'transparent',
                            color: theme.palette.primary.main
                        }}
                    >
                        <PersonIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                </Box>

                <Box>
                    <Typography variant="h6" fontWeight="bold" noWrap gutterBottom>
                        المستخدم الحالي
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                        مدير النظام
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ my: 1, mx: 3, borderColor: alpha(theme.palette.divider, 0.1) }} />

            <Box sx={{ overflow: 'auto', overflowX: 'hidden', pt: 2, px: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <List sx={{ flexGrow: 1 }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 1, display: 'block' }}>
                                <ListItemButton
                                    onClick={() => handleNavigation(item.path)}
                                    sx={{
                                        minHeight: 48,
                                        justifyContent: 'initial',
                                        borderRadius: 3,
                                        py: 1.5,
                                        px: 2.5,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'row-reverse', // أيقونة على اليمين، نص على اليسار
                                        ...(isActive && {
                                            background: `linear-gradient(45deg, ${alpha(item.color, 0.15)} 0%, ${alpha(item.color, 0.05)} 100%)`,
                                            color: item.color,
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                right: 0,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: 4,
                                                height: '60%',
                                                backgroundColor: item.color,
                                                borderRadius: '4px 0 0 4px',
                                            }
                                        }),
                                        ...(!isActive && {
                                            '&:hover': {
                                                background: alpha(item.color, 0.05),
                                                transform: 'translateX(-4px)',
                                                '& .MuiListItemIcon-root': {
                                                    color: item.color,
                                                    transform: 'scale(1.1)',
                                                },
                                            },
                                        }),
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: 2, // مسافة من اليمين للنص
                                            justifyContent: 'center',
                                            color: isActive ? item.color : 'text.secondary',
                                            transition: 'all 0.3s',
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        sx={{
                                            textAlign: 'right',
                                            m: 0 // إزالة margin الافتراضي
                                        }}
                                        primaryTypographyProps={{
                                            fontWeight: isActive ? 700 : 500,
                                            fontSize: '0.95rem',
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>

                <Box sx={{ pb: 3, mt: 2 }}>
                    <ListItemButton
                        onClick={onLogout}
                        sx={{
                            minHeight: 48,
                            justifyContent: 'initial',
                            borderRadius: 3,
                            py: 1.5,
                            px: 2.5,
                            color: theme.palette.error.main,
                            border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'row-reverse', // أيقونة على اليمين، نص على اليسار
                            '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.05),
                                borderColor: theme.palette.error.main,
                                transform: 'translateY(-2px)',
                                boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.1)}`
                            },
                        }}
                    >
                        <ListItemIcon sx={{
                            minWidth: 0,
                            mr: 2, // مسافة من اليمين للنص
                            justifyContent: 'center',
                            color: 'inherit'
                        }}>
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary="تسجيل الخروج"
                            sx={{
                                textAlign: 'right',
                                m: 0
                            }}
                            primaryTypographyProps={{ fontWeight: 600 }}
                        />
                    </ListItemButton>
                </Box>
            </Box>
        </Drawer>
    );
}
