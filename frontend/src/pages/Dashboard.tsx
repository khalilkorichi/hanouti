import { useEffect } from 'react';
import { Typography, Box, CardContent, useTheme, alpha, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CustomCard } from '../components/Common';
import {
    Inventory as InventoryIcon,
    TrendingUp as TrendingUpIcon,
    ShoppingCart as ShoppingCartIcon,
    Warning as WarningIcon,
    Add as AddIcon,
    Receipt as ReceiptIcon,
    Settings as SettingsIcon,
    ArrowForward as ArrowIcon
} from '@mui/icons-material';

export default function Dashboard() {
    const navigate = useNavigate();
    const theme = useTheme();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    const stats = [
        {
            title: 'إجمالي المنتجات',
            value: '0',
            subtitle: 'منتج متاح',
            icon: <InventoryIcon />,
            color: '#0052CC',
            trend: '+0%'
        },
        {
            title: 'المبيعات اليوم',
            value: '0 دج',
            subtitle: 'إجمالي المبيعات',
            icon: <TrendingUpIcon />,
            color: '#36B37E',
            trend: '+0%'
        },
        {
            title: 'المعاملات',
            value: '0',
            subtitle: 'معاملة اليوم',
            icon: <ShoppingCartIcon />,
            color: '#FFAB00',
            trend: '0'
        },
        {
            title: 'تنبيهات المخزون',
            value: '0',
            subtitle: 'منتج قارب النفاد',
            icon: <WarningIcon />,
            color: '#FF5630',
            trend: '!'
        },
    ];

    const quickActions = [
        {
            title: 'إضافة منتج جديد',
            description: 'أضف منتجات إلى المخزون',
            icon: <AddIcon />,
            path: '/products',
            color: '#0052CC'
        },
        {
            title: 'عملية بيع جديدة',
            description: 'ابدأ عملية بيع جديدة',
            icon: <ReceiptIcon />,
            path: '/sales',
            color: '#36B37E'
        },
        {
            title: 'إعدادات النظام',
            description: 'إدارة إعدادات المتجر',
            icon: <SettingsIcon />,
            path: '/settings',
            color: '#00B8D9'
        },
    ];

    return (
        <Box sx={{ direction: 'rtl' }}>
            {/* Welcome Section */}
            <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                <Typography
                    variant="h3"
                    component="h1"
                    fontWeight="800"
                    gutterBottom
                    sx={{
                        fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    مرحباً بك في حانوتي
                </Typography>
                <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{
                        fontWeight: 400,
                        fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
                    }}
                >
                    نظام إدارة المخزون والمبيعات الذكي
                </Typography>
            </Box>

            {/* Stats Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(4, 1fr)'
                },
                gap: { xs: 2, sm: 2.5, md: 3 },
                mb: { xs: 3, sm: 4 }
            }}>
                {stats.map((stat, index) => (
                    <CustomCard
                        key={stat.title}
                        hoverEffect
                        borderColor={stat.color}
                        borderPosition="top"
                        sx={{
                            animation: `fadeInUp 0.${6 + index}s ease-out`,
                            '@keyframes fadeInUp': {
                                from: {
                                    opacity: 0,
                                    transform: 'translateY(20px)'
                                },
                                to: {
                                    opacity: 1,
                                    transform: 'translateY(0)'
                                }
                            }
                        }}
                    >
                        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                        }}
                                    >
                                        {stat.title}
                                    </Typography>
                                    <Typography
                                        variant="h3"
                                        fontWeight="800"
                                        sx={{
                                            color: stat.color,
                                            mb: 0.5,
                                            lineHeight: 1,
                                            fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }
                                        }}
                                    >
                                        {stat.value}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            display: 'block',
                                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                        }}
                                    >
                                        {stat.subtitle}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        width: { xs: 48, sm: 56 },
                                        height: { xs: 48, sm: 56 },
                                        borderRadius: 2.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: `linear-gradient(135deg, ${alpha(stat.color, 0.1)} 0%, ${alpha(stat.color, 0.05)} 100%)`,
                                        color: stat.color,
                                        flexShrink: 0
                                    }}
                                >
                                    {stat.icon}
                                </Box>
                            </Box>
                            <Chip
                                label={stat.trend}
                                size="small"
                                sx={{
                                    height: 24,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    bgcolor: alpha(stat.color, 0.1),
                                    color: stat.color,
                                    border: `1px solid ${alpha(stat.color, 0.2)}`
                                }}
                            />
                        </CardContent>
                    </CustomCard>
                ))}
            </Box>

            {/* Quick Actions - أفقي مع تفاصيل */}
            <CustomCard
                gradient
                sx={{ mb: { xs: 3, sm: 4 } }}
            >
                <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 4 } }}>
                    <Box sx={{ mb: 3 }}>
                        <Box>
                            <Typography
                                variant="h5"
                                fontWeight="bold"
                                gutterBottom
                                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                            >
                                إجراءات سريعة
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                            >
                                الوصول السريع للمهام الشائعة
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: { xs: 1.5, sm: 2 },
                        justifyContent: 'flex-start',
                        '& > *': {
                            flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(33.333% - 11px)' }
                        }
                    }}>
                        {quickActions.map((action, index) => (
                            <Box
                                key={action.title}
                                onClick={() => navigate(action.path)}
                                sx={{
                                    p: 3,
                                    borderRadius: 2.5,
                                    background: theme.palette.mode === 'light'
                                        ? alpha(theme.palette.background.paper, 0.8)
                                        : alpha(theme.palette.background.paper, 0.4),
                                    border: `2px solid ${alpha(action.color, 0.2)}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    order: index, // ترتيب صريح: 0 (إضافة منتج يمين)، 1 (عملية بيع وسط)، 2 (إعدادات يسار)
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        borderColor: action.color,
                                        boxShadow: `0 8px 24px ${alpha(action.color, 0.2)}`,
                                        background: alpha(action.color, 0.05)
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexDirection: 'row-reverse' }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: alpha(action.color, 0.1),
                                            color: action.color,
                                            flexShrink: 0
                                        }}
                                    >
                                        {action.icon}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="h6"
                                            fontWeight="700"
                                            sx={{ mb: 0.5, textAlign: 'right' }}
                                        >
                                            {action.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ mb: 2, textAlign: 'right' }}
                                        >
                                            {action.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: action.color, flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
                                            <Typography variant="caption" fontWeight="600">
                                                انتقال
                                            </Typography>
                                            <ArrowIcon sx={{ fontSize: 16, transform: 'rotate(180deg)' }} />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </CustomCard>

            {/* Bottom Section - Placeholders */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 3
            }}>
                <CustomCard gradient>
                    <CardContent sx={{ minHeight: 300, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            المنتجات الأكثر مبيعاً
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            أفضل 5 منتجات في المبيعات
                        </Typography>
                        <Box sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography color="text.secondary">
                                    لا توجد بيانات متاحة بعد
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </CustomCard>

                <CustomCard gradient>
                    <CardContent sx={{ minHeight: 300, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            النشاط الأخير
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            آخر العمليات والتحديثات
                        </Typography>
                        <Box sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <ShoppingCartIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography color="text.secondary">
                                    لا توجد بيانات متاحة بعد
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </CustomCard>
            </Box>
        </Box>
    );
}
