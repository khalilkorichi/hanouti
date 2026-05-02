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
    InputAdornment,
    IconButton,
} from '@mui/material';
import {
    LockOutlined,
    StorefrontRounded as StoreIcon,
    LoginRounded as LoginIcon,
    VisibilityOutlined,
    VisibilityOffOutlined,
} from '@mui/icons-material';
import api from '../services/api';
import axios from 'axios';

export default function Login() {
    const navigate = useNavigate();
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data } = await api.post('/login', { password });
            localStorage.setItem('token', data.access_token);
            navigate('/');
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                setError(err.response.data?.detail || 'خطأ في تسجيل الدخول');
            } else {
                setError('فشل الاتصال بالخادم، تأكد من تشغيل النظام');
            }
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
                position: 'relative',
                overflow: 'hidden',
                background: isLight
                    ? 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 50%, #F0F9FF 100%)'
                    : 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #0B1120 100%)',
            }}
        >
            {/* Decorative blobs */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '-20%',
                    right: '-10%',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)}, transparent 70%)`,
                    pointerEvents: 'none',
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: '-20%',
                    left: '-10%',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.12)}, transparent 70%)`,
                    pointerEvents: 'none',
                }}
            />

            <Card
                sx={{
                    maxWidth: 420,
                    width: '100%',
                    mx: 2,
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                    backdropFilter: 'blur(20px)',
                    background: isLight
                        ? alpha('#FFFFFF', 0.9)
                        : alpha('#151F32', 0.9),
                    boxShadow: `0 24px 64px ${alpha(theme.palette.primary.main, 0.15)}, 0 8px 24px ${alpha('#000', 0.08)}`,
                    position: 'relative',
                    zIndex: 1,
                    overflow: 'hidden',
                }}
            >
                {/* Top accent bar */}
                <Box
                    sx={{
                        height: 4,
                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    }}
                />

                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                    {/* Logo */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: 3,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.7)})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2.5,
                                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                            }}
                        >
                            <StoreIcon sx={{ color: 'white', fontSize: 38 }} />
                        </Box>
                        <Typography
                            variant="h4"
                            fontWeight={900}
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                mb: 0.5,
                            }}
                        >
                            حانوتي
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            نظام إدارة المخزون والمبيعات الذكي
                        </Typography>
                    </Box>

                    {/* Error */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 3, borderRadius: 2, fontSize: '0.85rem' }}
                            onClose={() => setError('')}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            <TextField
                                fullWidth
                                type={showPassword ? 'text' : 'password'}
                                label="كلمة المرور"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                autoFocus
                                autoComplete="current-password"
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setShowPassword((prev) => !prev)}
                                                    edge="end"
                                                >
                                                    {showPassword ? (
                                                        <VisibilityOffOutlined sx={{ fontSize: 18 }} />
                                                    ) : (
                                                        <VisibilityOutlined sx={{ fontSize: 18 }} />
                                                    )}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading || !password}
                                startIcon={
                                    loading ? (
                                        <CircularProgress size={18} color="inherit" />
                                    ) : (
                                        <LoginIcon />
                                    )
                                }
                                sx={{
                                    py: 1.5,
                                    borderRadius: 2.5,
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.8)})`,
                                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.5)}`,
                                        transform: 'translateY(-1px)',
                                    },
                                    '&:active': { transform: 'translateY(0)' },
                                }}
                            >
                                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                            </Button>
                        </Box>
                    </form>

                    {/* Hint */}
                    <Box
                        sx={{
                            mt: 3,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.info.main, 0.06),
                            border: `1px dashed ${alpha(theme.palette.info.main, 0.25)}`,
                            textAlign: 'center',
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            💡 كلمة المرور الافتراضية:{' '}
                            <Box component="span" fontWeight={800} color="primary.main">
                                1234
                            </Box>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
