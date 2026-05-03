import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
} from '@mui/material';
import {
    DeleteForeverRounded,
    WarningAmberRounded,
    RestartAltRounded,
} from '@mui/icons-material';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useSettingsStore } from '../../store/settingsStore';

const CONFIRM_PHRASE = 'RESET';

export default function FactoryResetCard() {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const { showNotification } = useNotification();
    const applyStoreProfile = useSettingsStore((s) => s.applyStoreProfile);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const closeDialog = () => {
        if (submitting) return;
        setDialogOpen(false);
        setConfirmText('');
        setError(null);
    };

    const handleReset = async () => {
        if (confirmText !== CONFIRM_PHRASE) return;
        setSubmitting(true);
        setError(null);
        try {
            await api.post('/admin/factory-reset', { confirm: CONFIRM_PHRASE });

            // Reset client-side persisted state so the wizard reappears.
            applyStoreProfile({
                id: 0,
                store_name: null,
                business_type: null,
                staff_count: null,
                features_needed: [],
                onboarding_completed: false,
            });
            try {
                localStorage.removeItem('hanouti-settings');
            } catch {
                /* ignore quota / private mode */
            }

            showNotification(
                'تم حذف جميع البيانات وإعادة ضبط البرنامج بنجاح.',
                'success',
                { title: 'تمت إعادة التعيين' },
            );
            // Small delay so the user sees the toast before the reload.
            window.setTimeout(() => window.location.reload(), 900);
        } catch (e) {
            const msg =
                (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
                'تعذّر إكمال إعادة التعيين. حاول مجدداً.';
            setError(msg);
            // eslint-disable-next-line no-console
            console.error('[FactoryReset] error:', e);
        } finally {
            setSubmitting(false);
        }
    };

    const danger = theme.palette.error.main;

    return (
        <>
            <Box
                sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${alpha(danger, isLight ? 0.35 : 0.5)}`,
                    background: isLight ? alpha(danger, 0.04) : alpha(danger, 0.08),
                }}
            >
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        borderBottom: `1px solid ${alpha(danger, isLight ? 0.2 : 0.35)}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: isLight ? alpha(danger, 0.06) : alpha(danger, 0.12),
                    }}
                >
                    <WarningAmberRounded sx={{ color: danger, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: danger }}>
                        منطقة الخطر
                    </Typography>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Box sx={{ flex: 1, minWidth: 240 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                                حذف جميع البيانات والعودة إلى الإعدادات الافتراضية
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                سيتم حذف جميع المنتجات، الفئات، المبيعات، حركات المخزون، وبيانات
                                المتجر بشكل نهائي. لن يمكن التراجع عن هذا الإجراء.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteForeverRounded />}
                            onClick={() => setDialogOpen(true)}
                            sx={{ borderRadius: 2, fontWeight: 700, flexShrink: 0 }}
                        >
                            حذف وإعادة تعيين
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Dialog
                open={dialogOpen}
                onClose={closeDialog}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3 } } }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        color: danger,
                        fontWeight: 800,
                    }}
                >
                    <WarningAmberRounded />
                    تأكيد إعادة تعيين البرنامج
                </DialogTitle>

                <DialogContent>
                    <Alert
                        severity="error"
                        variant="outlined"
                        icon={<DeleteForeverRounded />}
                        sx={{ mb: 2.5, borderRadius: 2 }}
                    >
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                            هذا إجراء نهائي لا يمكن التراجع عنه
                        </Typography>
                        <Typography variant="caption">
                            سيتم حذف جميع المنتجات والفئات والمبيعات وبيانات المتجر. ينصح بشدة
                            بأخذ نسخة احتياطية قبل المتابعة.
                        </Typography>
                    </Alert>

                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        للتأكيد، اكتب{' '}
                        <Box
                            component="span"
                            sx={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: danger,
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: alpha(danger, 0.1),
                            }}
                        >
                            {CONFIRM_PHRASE}
                        </Box>{' '}
                        في الحقل أدناه:
                    </Typography>

                    <TextField
                        autoFocus
                        fullWidth
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={CONFIRM_PHRASE}
                        disabled={submitting}
                        slotProps={{
                            input: {
                                sx: {
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    letterSpacing: 2,
                                    textAlign: 'center',
                                },
                            },
                        }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={closeDialog} disabled={submitting} sx={{ borderRadius: 2 }}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleReset}
                        disabled={confirmText !== CONFIRM_PHRASE || submitting}
                        startIcon={
                            submitting ? (
                                <CircularProgress size={16} sx={{ color: 'inherit' }} />
                            ) : (
                                <RestartAltRounded />
                            )
                        }
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        {submitting ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
