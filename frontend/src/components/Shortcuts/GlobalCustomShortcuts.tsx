import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShortcutsStore, CUSTOM_ACTIONS, type CustomActionId } from '../../store/shortcutsStore';
import { useKeyboardShortcuts, type Shortcut } from '../../hooks/useKeyboardShortcuts';

interface Props {
    onThemeToggle: () => void;
    onOpenShortcuts: () => void;
}

/**
 * Listens for all user-defined "custom" shortcuts and dispatches them to
 * the matching action. Mounted once at the app shell level.
 *
 * Built-in POS shortcuts (Sales.tsx) and the global F2 → barcode jump
 * (GlobalBarcodeShortcut.tsx) are handled separately and respect their
 * own overrides — this component only owns the user-added bindings.
 */
export default function GlobalCustomShortcuts({ onThemeToggle, onOpenShortcuts }: Props) {
    const navigate = useNavigate();
    const customs = useShortcutsStore((s) => s.customs);

    const shortcuts = useMemo<Shortcut[]>(() => {
        const dispatch = (actionId: CustomActionId) => {
            switch (actionId) {
                case 'nav.dashboard':  navigate('/'); break;
                case 'nav.sales':      navigate('/sales'); break;
                case 'nav.products':   navigate('/products'); break;
                case 'nav.inventory':  navigate('/inventory'); break;
                case 'nav.categories': navigate('/categories'); break;
                case 'nav.reports':    navigate('/reports'); break;
                case 'nav.customers':  navigate('/customers'); break;
                case 'nav.settings':   navigate('/settings'); break;
                case 'app.theme_toggle': onThemeToggle(); break;
                case 'app.shortcuts_dialog': onOpenShortcuts(); break;
                case 'app.settings_data':
                    navigate('/settings', { state: { section: 'data' } });
                    break;
            }
        };
        return customs.map<Shortcut>((c) => {
            const label = CUSTOM_ACTIONS.find((a) => a.id === c.actionId)?.label ?? c.actionId;
            return {
                key: c.combo.key,
                ctrl: c.combo.ctrl,
                shift: c.combo.shift,
                alt: c.combo.alt,
                allowInInputs: true,
                label,
                handler: () => dispatch(c.actionId),
            };
        });
    }, [customs, navigate, onThemeToggle, onOpenShortcuts]);

    useKeyboardShortcuts(shortcuts);
    return null;
}
