import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts, type Shortcut } from '../hooks/useKeyboardShortcuts';
import { useShortcutCombo } from '../store/shortcutsStore';

const FOCUS_FLAG = 'hanouti.focus-barcode-on-mount';

export function requestBarcodeFocusOnMount() {
    try { window.sessionStorage.setItem(FOCUS_FLAG, '1'); } catch { /* no-op */ }
}

export function consumeBarcodeFocusFlag(): boolean {
    try {
        if (window.sessionStorage.getItem(FOCUS_FLAG) === '1') {
            window.sessionStorage.removeItem(FOCUS_FLAG);
            return true;
        }
    } catch { /* ignore */ }
    return false;
}

export default function GlobalBarcodeShortcut() {
    const navigate = useNavigate();
    const location = useLocation();
    const onPos = location.pathname.startsWith('/sales') && !location.pathname.startsWith('/sales-list');
    const combo = useShortcutCombo('global.barcodeJump');

    const shortcuts = useMemo<Shortcut[]>(() => {
        if (onPos) return [];
        return [
            {
                ...combo,
                label: 'فتح نقطة البيع وتركيز الباركود',
                allowInInputs: true,
                handler: () => {
                    requestBarcodeFocusOnMount();
                    navigate('/sales');
                },
            },
        ];
    }, [onPos, navigate, combo]);

    useKeyboardShortcuts(shortcuts);
    return null;
}
