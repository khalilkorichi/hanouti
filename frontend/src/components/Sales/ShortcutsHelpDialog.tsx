import { Box, Typography, Stack, Chip, alpha, useTheme } from '@mui/material';
import { UnifiedModal, CustomButton } from '../Common';

interface Props {
    open: boolean;
    onClose: () => void;
}

interface Row {
    keys: string[];
    label: string;
}

const ROWS: Row[] = [
    { keys: ['F1'], label: 'عرض هذه القائمة' },
    { keys: ['F2'], label: 'إدخال رمز الباركود (يعمل من أي شاشة)' },
    { keys: ['F3'], label: 'البحث في المنتجات' },
    { keys: ['F4'], label: 'تعديل الخصم' },
    { keys: ['F6'], label: 'إخفاء/إظهار أدوات السلة (العميل، الخصم، الدفع)' },
    { keys: ['F8'], label: 'تبديل طريقة الدفع (نقد/بطاقة)' },
    { keys: ['F9'], label: 'إتمام البيع' },
    { keys: ['F10'], label: 'تفريغ السلة' },
    { keys: ['Esc'], label: 'إلغاء التركيز / إغلاق' },
    { keys: ['+'], label: 'زيادة كمية آخر منتج في السلة' },
    { keys: ['-'], label: 'إنقاص كمية آخر منتج في السلة' },
    { keys: ['3', '*', 'باركود'], label: 'إضافة عدّة وحدات (مثال: 3*123456)' },
];

export function ShortcutsHelpDialog({ open, onClose }: Props) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    return (
        <UnifiedModal
            open={open}
            onClose={onClose}
            title="اختصارات لوحة المفاتيح"
            maxWidth="sm"
            actions={
                <CustomButton variant="contained" onClick={onClose}>
                    تم
                </CustomButton>
            }
        >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                هذه الاختصارات مفعّلة في صفحة المبيعات. اضغط <Chip label="F1" size="small" sx={{ mx: 0.5 }} /> في أي وقت لعرض هذه القائمة.
            </Typography>
            <Stack spacing={1}>
                {ROWS.map((row, i) => (
                    <Box
                        key={i}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            px: 1.5,
                            py: 1,
                            borderRadius: 2,
                            bgcolor: i % 2 === 0
                                ? (isLight ? alpha(theme.palette.primary.main, 0.04) : alpha(theme.palette.primary.main, 0.08))
                                : 'transparent',
                        }}
                    >
                        <Typography variant="body2" fontWeight={500}>
                            {row.label}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                            {row.keys.map((k, j) => (
                                <Chip
                                    key={j}
                                    label={k}
                                    size="small"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        minWidth: 32,
                                        height: 26,
                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        color: theme.palette.primary.main,
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                ))}
            </Stack>
        </UnifiedModal>
    );
}
