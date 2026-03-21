import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
    Stack,
    Divider,
    Chip,
    keyframes
} from '@mui/material';
import { LoginOutlined, LockOutlined, StoreOutlined } from '@mui/icons-material';

const float = keyframes`
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
`;

const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

export default function Login() {
    const navigate = useNavigate();
    const theme = useTheme();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                navigate('/');
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'خطأ في تسجيل الدخول');
            }
        } catch (err) {
            setError('فشل الاتصال بالخادم');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'auto',
                padding: { xs: 2, sm: 3 },
                background: `linear-gradient(135deg, 
                    ${alpha(theme.palette.primary.main, 0.08)} 0%, 
                    ${alpha(theme.palette.secondary.main, 0.05)} 50%,
                    ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.05)} 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    animation: `${float} 20s ease-in-out infinite`,
                    zIndex: 0,
                },
            }}
        >
            <Card
                sx={{
                    maxWidth: { xs: '100%', sm: 420, md: 480 },
                    width: '100%',
                    position: 'relative',
                    zIndex: 1,
                    borderRadius: { xs: 3, sm: 4 },
                    boxShadow: `
                        0 20px 60px ${alpha(theme.palette.primary.main, 0.2)},
                        0 8px 16px ${alpha(theme.palette.common.black, 0.1)}
                    `,
                    animation: `${slideUp} 0.6s ease-out`,
                    backdropFilter: 'blur(10px)',
                    background: alpha(theme.palette.background.paper, 0.95),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    overflow: 'visible',
                }}
            >
                {/* Decorative Top Bar */}
                <Box
                    sx={{
                        height: 6,
                        background: `linear-gradient(90deg, 
                            ${theme.palette.primary.main} 0%, 
                            ${theme.palette.secondary.main} 50%, 
                            ${theme.palette.primary.main} 100%)`,
                        borderRadius: '16px 16px 0 0',
                    }}
                />

                <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
                    {/* Logo & Title Section */}
                    <Stack spacing={{ xs: 2, sm: 3 }} alignItems="center" mb={{ xs: 3, sm: 4 }}>
                        <Box
                            sx={{
                                width: { xs: 70, sm: 80, md: 90 },
                                height: { xs: 70, sm: 80, md: 90 },
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                                animation: `${float} 3s ease-in-out infinite`,
                            }}
                        >
                            <StoreOutlined sx={{ fontSize: { xs: 40, sm: 45, md: 50 }, color: 'white' }} />
                        </Box>

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography
                                variant="h3"
                                fontWeight="900"
                                gutterBottom
                                sx={{
                                    fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                حانوتي
                            </Typography>
                            <Typography
                                variant="body1"
                                color="text.secondary"
                                fontWeight="500"
                                sx={{
                                    fontSize: { xs: '0.9rem', sm: '1rem' },
                                }}
                            >
                                نظام إدارة المخزون والمبيعات الذكي
                            </Typography>
                        </Box>

                        <Chip
                            icon={<LockOutlined sx={{ fontSize: 18 }} />}
                            label="تسجيل دخول آمن"
                            size="small"
                            sx={{
                                background: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 600,
                                borderRadius: 2,
                                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                            }}
                        />
                    </Stack>

                    <Divider sx={{ mb: { xs: 3, sm: 4 }, opacity: 0.5 }} />

                    {/* Error Alert */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{
                                mb: 3,
                                borderRadius: 2,
                                animation: `${slideUp} 0.3s ease-out`,
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin}>
                        <Stack spacing={{ xs: 2.5, sm: 3 }}>
                            <TextField
                                fullWidth
                                type="password"
                                label="كلمة المرور"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                autoFocus
                                InputProps={{
                                    startAdornment: (
                                        <LockOutlined
                                            sx={{
                                                mr: 1,
                                                color: 'text.secondary',
                                                fontSize: 22,
                                            }}
                                        />
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                                        },
                                        '&.Mui-focused': {
                                            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
                                        },
                                    },
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading || !password}
                                startIcon={loading ? <CircularProgress size={22} color="inherit" /> : <LoginOutlined />}
                                sx={{
                                    borderRadius: 3,
                                    py: { xs: 1.5, sm: 1.8 },
                                    fontWeight: 'bold',
                                    textTransform: 'none',
                                    fontSize: { xs: '1rem', sm: '1.15rem' },
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.45)}`,
                                    },
                                    '&:active': {
                                        transform: 'translateY(0)',
                                    },
                                    '&.Mui-disabled': {
                                        background: alpha(theme.palette.action.disabledBackground, 0.5),
                                    },
                                }}
                            >
                                {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                            </Button>
                        </Stack>
                    </form>

                    {/* Footer Info */}
                    <Box sx={{ mt: { xs: 3, sm: 4 }, textAlign: 'center' }}>
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'inline-block',
                                px: { xs: 2, sm: 3 },
                                py: { xs: 1, sm: 1.5 },
                                borderRadius: 2,
                                background: alpha(theme.palette.info.main, 0.08),
                                color: theme.palette.info.main,
                                fontWeight: 600,
                                border: `1px dashed ${alpha(theme.palette.info.main, 0.3)}`,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            }}
                        >
                            💡 كلمة المرور الافتراضية: <strong>1234</strong>
                        </Typography>
                    </Box>
                </CardContent>

                {/* Decorative Bottom Elements */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -3,
                        right: -3,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.15)}, transparent)`,
                        filter: 'blur(20px)',
                        pointerEvents: 'none',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: -3,
                        left: -3,
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)}, transparent)`,
                        filter: 'blur(20px)',
                        pointerEvents: 'none',
                    }}
                />
            </Card>
        </Box>
    );
}
