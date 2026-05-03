import { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Box,
    Typography,
    CircularProgress,
    useTheme,
    alpha,
    LinearProgress,
} from '@mui/material';
import {
    UploadFileRounded,
    WarningAmberRounded,
    RestoreRounded,
} from '@mui/icons-material';
import { backupService, type BackupPreview } from '../../services/backupService';
import { useNotification } from '../../contexts/NotificationContext';

const CONFIRM_PHRASE = 'RESTORE';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    /**
     * If set, restore from this auto-backup filename on the server instead of
     * uploading a file. The dialog skips the file picker and goes straight to
     * the typed-confirmation step.
     */
    autoFilename?: string | null;
    /** Counts to display when restoring an auto-backup (we don't preview the file). */
    autoLabel?: string | null;
}

const TABLE_LABELS: Record<string, string> = {
    categories: 'الفئات',
    products: 'المنتجات',
    customers: 'العملاء',
    customer_payments: 'المدفوعات',
    customer_payment_allocations: 'تخصيصات المدفوعات',
    sales: 'المبيعات',
    sale_items: 'بنود المبيعات',
    stock_movements: 'حركات المخزون',
    store_profile: 'بيانات المتجر',
};

export default function RestoreBackupDialog({
    open,
    onClose,
    onSuccess,
    autoFilename,
    autoLabel,
}: Props) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const { showNotification } = useNotification();

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<BackupPreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const danger = theme.palette.error.main;
    const isAutoMode = !!autoFilename;

    useEffect(() => {
        if (!open) {
            setFile(null);
            setPreview(null);
            setPreviewLoading(false);
            setConfirmText('');
            setSubmitting(false);
            setError(null);
            return;
        }
        // When restoring an auto-backup, fetch its counts up-front.
        if (autoFilename) {
            setPreview(null);
            setError(null);
            setPreviewLoading(true);
            backupService
                .previewAuto(autoFilename)
                .then((p) => setPreview(p))
                .catch((e) => {
                    const msg =
                        (e as { response?: { data?: { detail?: string } } }).response?.data
                            ?.detail || 'تعذّر قراءة ملف النسخة.';
                    setError(msg);
                })
                .finally(() => setPreviewLoading(false));
        }
    }, [open, autoFilename]);

    const handleFile = async (f: File) => {
        setFile(f);
        setPreview(null);
        setError(null);
        setPreviewLoading(true);
        try {
            const p = await backupService.preview(f);
            setPreview(p);
        } catch (e) {
            const msg =
                (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
                'تعذّر قراءة الملف.';
            setError(msg);
            setFile(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) void handleFile(f);
    };

    const handleRestore = async () => {
        if (confirmText !== CONFIRM_PHRASE) return;
        setSubmitting(true);
        setError(null);
        try {
            if (isAutoMode && autoFilename) {
                await backupService.restoreAuto(autoFilename);
            } else if (file) {
                await backupService.importFile(file);
            } else {
                return;
            }
            showNotification('تمت استعادة النسخة الاحتياطية بنجاح', 'success', {
                title: 'تمت الاستعادة',
            });
            onSuccess?.();
            window.setTimeout(() => window.location.reload(), 800);
        } catch (e) {
            const msg =
                (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
                'تعذّر استعادة النسخة الاحتياطية.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const closeIfIdle = () => {
        if (submitting) return;
        onClose();
    };

    const canConfirm =
        confirmText === CONFIRM_PHRASE &&
        !submitting &&
        !!preview &&
        (isAutoMode || !!file);

    return (
        <Dialog
            open={open}
            onClose={closeIfIdle}
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
                <RestoreRounded />
                استعادة النسخة الاحتياطية
            </DialogTitle>

            <DialogContent>
                <Alert
                    severity="warning"
                    variant="outlined"
                    icon={<WarningAmberRounded />}
                    sx={{ mb: 2.5, borderRadius: 2 }}
                >
                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                        ستحلّ بيانات النسخة محل بياناتك الحالية بالكامل
                    </Typography>
                    <Typography variant="caption">
                        سيتم حفظ نسخة "ما قبل الاستعادة" تلقائياً قبل التنفيذ، ولن يمكن
                        التراجع بدونها.
                    </Typography>
                </Alert>

                {/* File picker (only in upload mode) */}
                {!isAutoMode && (
                    <Box
                        onClick={() => inputRef.current?.click()}
                        sx={{
                            border: `2px dashed ${alpha(theme.palette.primary.main, 0.5)}`,
                            borderRadius: 2,
                            p: 2.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            mb: 2,
                            bgcolor: alpha(theme.palette.primary.main, isLight ? 0.04 : 0.08),
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.14),
                            },
                        }}
                    >
                        <UploadFileRounded sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
                        <Typography variant="body2" fontWeight={700}>
                            {file ? file.name : 'اضغط لاختيار ملف النسخة (.json)'}
                        </Typography>
                        {file && (
                            <Typography variant="caption" color="text.secondary">
                                {(file.size / 1024).toFixed(1)} كيلوبايت
                            </Typography>
                        )}
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".json,application/json"
                            hidden
                            onChange={onPick}
                        />
                    </Box>
                )}

                {isAutoMode && autoLabel && (
                    <Box
                        sx={{
                            p: 2,
                            mb: 2,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, isLight ? 0.06 : 0.12),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                        }}
                    >
                        <Typography variant="caption" color="text.secondary">
                            النسخة المختارة
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                            {autoLabel}
                        </Typography>
                    </Box>
                )}

                {previewLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

                {preview && (
                    <Box
                        sx={{
                            mb: 2,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.success.main, isLight ? 0.06 : 0.12),
                            border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                            ملخّص ملف النسخة
                        </Typography>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 0.5,
                            }}
                        >
                            {Object.entries(preview.counts).map(([k, v]) => (
                                <Box
                                    key={k}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        py: 0.3,
                                        borderBottom: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary">
                                        {TABLE_LABELS[k] ?? k}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={700}>
                                        {v}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 1 }}
                        >
                            الإصدار: {preview.version}
                            {preview.date ? ` · ${new Date(preview.date).toLocaleString('ar-DZ')}` : ''}
                        </Typography>
                    </Box>
                )}

                {preview && (
                    <>
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
                    </>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={closeIfIdle} disabled={submitting} sx={{ borderRadius: 2 }}>
                    إلغاء
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleRestore}
                    disabled={!canConfirm}
                    startIcon={
                        submitting ? (
                            <CircularProgress size={16} sx={{ color: 'inherit' }} />
                        ) : (
                            <RestoreRounded />
                        )
                    }
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                    {submitting ? 'جارٍ الاستعادة...' : 'تأكيد الاستعادة'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
