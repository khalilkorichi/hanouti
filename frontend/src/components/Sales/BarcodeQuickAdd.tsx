import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Box, TextField, InputAdornment, Tooltip, Typography, alpha, useTheme, IconButton } from '@mui/material';
import {
    QrCodeScanner as ScanIcon,
    HelpOutline as HelpIcon,
    Close as ClearIcon,
} from '@mui/icons-material';
import { productService } from '../../services/productService';
import { useCartStore } from '../../store/cartStore';
import { useNotification } from '../../contexts/NotificationContext';

export interface BarcodeQuickAddHandle {
    focus: () => void;
}

interface Props {
    onShowHelp: () => void;
}

/**
 * Cashier-speed barcode entry.
 *
 * Behaviors:
 * - Pressing Enter looks up the product by exact barcode and adds it to the cart.
 * - Multiplier syntax: "3*123456" or "3x123456" → adds 3 units of barcode 123456.
 * - On success, the input clears and stays focused so the next scan/typing works.
 * - On not-found, shows a toast and keeps the input populated for correction.
 *
 * The component is fully controlled by its own internal state; the parent only
 * needs the `focus()` imperative handle to wire it to a global F3 shortcut.
 */
export const BarcodeQuickAdd = forwardRef<BarcodeQuickAddHandle, Props>(({ onShowHelp }, ref) => {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);
    const addItem = useCartStore(s => s.addItem);
    const updateQty = useCartStore(s => s.updateQty);
    const cartItems = useCartStore(s => s.items);
    const { showNotification } = useNotification();

    useImperativeHandle(ref, () => ({
        focus: () => {
            inputRef.current?.focus();
            inputRef.current?.select();
        },
    }), []);

    const parseInput = (raw: string): { qty: number; code: string } => {
        const trimmed = raw.trim();
        const m = trimmed.match(/^(\d+)\s*[*xX×]\s*(.+)$/);
        if (m) {
            const qty = Math.max(1, parseInt(m[1], 10) || 1);
            return { qty, code: m[2].trim() };
        }
        return { qty: 1, code: trimmed };
    };

    const submit = async () => {
        if (busy) return;
        const { qty, code } = parseInput(value);
        if (!code) return;
        setBusy(true);
        try {
            const product = await productService.getByBarcode(code);
            if (!product) {
                showNotification(`لا يوجد منتج بالباركود: ${code}`, 'warning');
                return;
            }
            // Add once first to ensure the item exists in the cart
            const first = addItem(product);
            if (!first.success) {
                showNotification(first.message || 'تعذّر إضافة المنتج', 'warning');
                return;
            }
            if (qty > 1) {
                // Find the freshly-added item to determine the target qty.
                const existing = useCartStore.getState().items.find(i => i.id === product.id);
                const currentQty = existing?.qty ?? 1;
                // -1 because addItem already incremented by 1 above.
                const targetQty = currentQty + (qty - 1);
                const r = updateQty(product.id, targetQty);
                if (!r.success && r.message) {
                    showNotification(r.message, 'warning');
                }
            }
            showNotification(
                qty > 1
                    ? `تم إضافة ${qty} × "${product.name}"`
                    : `تم إضافة "${product.name}"`,
                'success',
            );
            setValue('');
        } catch (e) {
            showNotification('فشل البحث عن المنتج', 'error');
        } finally {
            setBusy(false);
            // Re-focus so the cashier can keep scanning without clicking.
            inputRef.current?.focus();
        }
    };

    const lastItem = cartItems[cartItems.length - 1];

    return (
        <Box
            sx={{
                p: 1.25,
                mb: 1.5,
                borderRadius: 2.5,
                border: `1.5px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                background: isLight
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)}, ${alpha(theme.palette.primary.main, 0.01)})`
                    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.10)}, ${alpha(theme.palette.primary.main, 0.04)})`,
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
            }}
        >
            <TextField
                inputRef={inputRef}
                size="small"
                fullWidth
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        void submit();
                    } else if (e.key === 'Escape') {
                        if (value) {
                            setValue('');
                        } else {
                            inputRef.current?.blur();
                        }
                    }
                }}
                placeholder="امسح أو أدخل الباركود (مثال: 3*123456) — F3"
                disabled={busy}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <ScanIcon sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                    ),
                    endAdornment: value ? (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={() => { setValue(''); inputRef.current?.focus(); }}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ) : undefined,
                    sx: {
                        bgcolor: 'background.paper',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        letterSpacing: 0.5,
                    },
                }}
            />
            {lastItem && (
                <Box
                    sx={{
                        display: { xs: 'none', md: 'flex' },
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: 'success.dark',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        maxWidth: 220,
                    }}
                >
                    <Typography variant="caption" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        آخر إضافة: {lastItem.qty}× {lastItem.name}
                    </Typography>
                </Box>
            )}
            <Tooltip title="اختصارات لوحة المفاتيح (F1)">
                <IconButton size="small" onClick={onShowHelp} sx={{ flexShrink: 0 }}>
                    <HelpIcon />
                </IconButton>
            </Tooltip>
        </Box>
    );
});

BarcodeQuickAdd.displayName = 'BarcodeQuickAdd';
