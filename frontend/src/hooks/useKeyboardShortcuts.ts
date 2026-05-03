import { useEffect } from 'react';

export interface Shortcut {
    /** Key string (e.g., 'F1', 'F9', 'Escape', '+', '-', '?', '/'). Compared case-insensitively for letters. */
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    /** When true, fires even if the focused element is an input/textarea/contenteditable. */
    allowInInputs?: boolean;
    /** When true (default), preventDefault is called when the shortcut matches. */
    preventDefault?: boolean;
    handler: (e: KeyboardEvent) => void;
    /** Human-readable label for the help dialog (Arabic). */
    label?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return false;
}

function keyMatches(e: KeyboardEvent, sc: Shortcut): boolean {
    if (!!sc.ctrl !== (e.ctrlKey || e.metaKey)) return false;
    if (!!sc.alt !== e.altKey) return false;
    const k = sc.key.toLowerCase();
    const ek = e.key.toLowerCase();
    // Character-level synonyms whose Shift state varies by keyboard layout
    // (e.g. on US layout `+` requires Shift+`=`). For these we match on the
    // produced character (`e.key`) and ignore the registered Shift modifier.
    if (k === 'plus') {
        return ek === '+' || e.code === 'NumpadAdd';
    }
    if (k === 'minus') {
        return ek === '-' || e.code === 'NumpadSubtract';
    }
    if (k === 'esc' && ek === 'escape') {
        return !!sc.shift === e.shiftKey;
    }
    if (!!sc.shift !== e.shiftKey) return false;
    return k === ek;
}

/**
 * Registers a list of keyboard shortcuts on window keydown.
 * Re-binds whenever the shortcuts array reference changes — wrap in useMemo
 * if you want stable identity.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled: boolean = true) {
    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: KeyboardEvent) => {
            const typing = isTypingTarget(e.target);
            for (const sc of shortcuts) {
                if (!keyMatches(e, sc)) continue;
                if (typing && !sc.allowInInputs) continue;
                if (sc.preventDefault !== false) e.preventDefault();
                sc.handler(e);
                return;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [shortcuts, enabled]);
}
