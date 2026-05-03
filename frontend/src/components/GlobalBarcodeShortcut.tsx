import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts, type Shortcut } from '../hooks/useKeyboardShortcuts';

const FOCUS_FLAG = 'hanouti.focus-barcode-on-mount';

/** Set the flag from anywhere; consumed once by `<BarcodeQuickAdd>` on mount. */
export function requestBarcodeFocusOnMount() {
    try {
        window.sessionStorage.setItem(FOCUS_FLAG, '1');
    } catch {
        /* private mode etc. — silently no-op */
    }
}

/** Returns true once if the flag was set (and clears it). */
export function consumeBarcodeFocusFlag(): boolean {
    try {
        if (window.sessionStorage.getItem(FOCUS_FLAG) === '1') {
            window.sessionStorage.removeItem(FOCUS_FLAG);
            return true;
        }
    } catch { /* ignore */ }
    return false;
}

/**
 * Global F2 shortcut — focuses the POS barcode input from anywhere.
 *
 * On the POS page, the existing in-page shortcut wins (it has full ref access
 * to the input and can also `select()` the contents). Off-page, this hook
 * navigates to /sales and asks `<BarcodeQuickAdd>` to focus itself once it
 * mounts via a session-storage flag.
 *
 * Reuses the project's existing `useKeyboardShortcuts` machinery rather than
 * adding a parallel keydown listener.
 */
export default function GlobalBarcodeShortcut() {
    const navigate = useNavigate();
    const location = useLocation();
    const onPos = location.pathname.startsWith('/sales') && !location.pathname.startsWith('/sales-list');

    const shortcuts = useMemo<Shortcut[]>(() => {
        if (onPos) return []; // Sales page binds its own F2; don't double-bind.
        return [
            {
                key: 'F2',
                label: 'فتح نقطة البيع وتركيز الباركود',
                allowInInputs: true,
                handler: () => {
                    requestBarcodeFocusOnMount();
                    navigate('/sales');
                },
            },
        ];
    }, [onPos, navigate]);

    useKeyboardShortcuts(shortcuts);
    return null;
}
