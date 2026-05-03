import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ShortcutScope = 'pos' | 'global' | 'navigation';

export interface ShortcutCombo {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
}

export interface ShortcutDef {
    id: string;
    scope: ShortcutScope;
    label: string;
    defaultCombo: ShortcutCombo;
    customizable: boolean;
}

/* ── Built-in shortcut catalogue (kept in sync with Sales.tsx + GlobalBarcodeShortcut.tsx) ── */
export const SHORTCUT_DEFS: ShortcutDef[] = [
    // POS — مفاتيح الوظائف الكلاسيكية. F1 و Esc غير قابلين للتخصيص (مفاتيح نظام).
    { id: 'pos.help',          scope: 'pos', label: 'عرض المساعدة (نقطة البيع)', defaultCombo: { key: 'F1' },  customizable: false },
    { id: 'pos.barcode',       scope: 'pos', label: 'تركيز حقل الباركود',         defaultCombo: { key: 'F2' },  customizable: true  },
    { id: 'pos.search',        scope: 'pos', label: 'البحث في المنتجات',          defaultCombo: { key: 'F3' },  customizable: true  },
    { id: 'pos.discount',      scope: 'pos', label: 'تعديل الخصم',                defaultCombo: { key: 'F4' },  customizable: true  },
    { id: 'pos.toggleTools',   scope: 'pos', label: 'إخفاء/إظهار أدوات السلة',    defaultCombo: { key: 'F6' },  customizable: true  },
    { id: 'pos.togglePayment', scope: 'pos', label: 'تبديل طريقة الدفع',         defaultCombo: { key: 'F8' },  customizable: true  },
    { id: 'pos.checkout',      scope: 'pos', label: 'إتمام البيع',                defaultCombo: { key: 'F9' },  customizable: true  },
    { id: 'pos.clearCart',     scope: 'pos', label: 'تفريغ السلة',                defaultCombo: { key: 'F10' }, customizable: true  },
    { id: 'pos.qtyPlus',       scope: 'pos', label: 'زيادة كمية آخر منتج',        defaultCombo: { key: 'plus' },  customizable: false },
    { id: 'pos.qtyMinus',      scope: 'pos', label: 'إنقاص كمية آخر منتج',       defaultCombo: { key: 'minus' }, customizable: false },

    // Global — يعمل من أي شاشة
    { id: 'global.barcodeJump', scope: 'global', label: 'الانتقال إلى نقطة البيع وتركيز الباركود', defaultCombo: { key: 'F2' }, customizable: true },
];

/* ── Custom (user-added) shortcuts — bound to a fixed action catalogue ── */
export type CustomActionId =
    | 'nav.dashboard'
    | 'nav.sales'
    | 'nav.products'
    | 'nav.inventory'
    | 'nav.categories'
    | 'nav.reports'
    | 'nav.customers'
    | 'nav.settings'
    | 'app.theme_toggle'
    | 'app.shortcuts_dialog'
    | 'app.settings_data';

export interface CustomActionDef {
    id: CustomActionId;
    label: string;
    scope: ShortcutScope;
}

export const CUSTOM_ACTIONS: CustomActionDef[] = [
    { id: 'nav.dashboard',        label: 'الانتقال إلى لوحة التحكم', scope: 'navigation' },
    { id: 'nav.sales',            label: 'الانتقال إلى نقطة البيع',  scope: 'navigation' },
    { id: 'nav.products',         label: 'الانتقال إلى المنتجات',    scope: 'navigation' },
    { id: 'nav.inventory',        label: 'الانتقال إلى المخزون',     scope: 'navigation' },
    { id: 'nav.categories',       label: 'الانتقال إلى الفئات',      scope: 'navigation' },
    { id: 'nav.reports',          label: 'الانتقال إلى التقارير',    scope: 'navigation' },
    { id: 'nav.customers',        label: 'الانتقال إلى العملاء',     scope: 'navigation' },
    { id: 'nav.settings',         label: 'الانتقال إلى الإعدادات',   scope: 'navigation' },
    { id: 'app.theme_toggle',     label: 'تبديل المظهر (نهاري/ليلي)', scope: 'global' },
    { id: 'app.shortcuts_dialog', label: 'فتح نافذة الاختصارات',     scope: 'global' },
    { id: 'app.settings_data',    label: 'النسخ الاحتياطي السريع',   scope: 'global' },
];

export interface CustomShortcut {
    /** Random local id — distinct from action id so the same action can have multiple bindings. */
    id: string;
    actionId: CustomActionId;
    combo: ShortcutCombo;
}

interface ShortcutsState {
    /** Per-builtin overrides keyed by ShortcutDef.id. */
    overrides: Record<string, ShortcutCombo>;
    /** User-added bindings for actions in CUSTOM_ACTIONS. */
    customs: CustomShortcut[];

    setOverride: (id: string, combo: ShortcutCombo) => void;
    clearOverride: (id: string) => void;
    addCustom: (actionId: CustomActionId, combo: ShortcutCombo) => string;
    removeCustom: (id: string) => void;
    resetAll: () => void;
}

export const useShortcutsStore = create<ShortcutsState>()(
    persist(
        (set) => ({
            overrides: {},
            customs: [],

            setOverride: (id, combo) =>
                set((s) => ({ overrides: { ...s.overrides, [id]: combo } })),

            clearOverride: (id) =>
                set((s) => {
                    const next = { ...s.overrides };
                    delete next[id];
                    return { overrides: next };
                }),

            addCustom: (actionId, combo) => {
                const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
                set((s) => ({ customs: [...s.customs, { id, actionId, combo }] }));
                return id;
            },

            removeCustom: (id) =>
                set((s) => ({ customs: s.customs.filter((c) => c.id !== id) })),

            resetAll: () => set({ overrides: {}, customs: [] }),
        }),
        { name: 'hanouti-shortcuts', version: 1 },
    ),
);

/* ── Helpers ── */

export function comboLabel(c: ShortcutCombo): string {
    const parts: string[] = [];
    if (c.ctrl) parts.push('Ctrl');
    if (c.alt) parts.push('Alt');
    if (c.shift) parts.push('Shift');
    let k = c.key;
    if (k === 'plus') k = '+';
    else if (k === 'minus') k = '-';
    else if (k === ' ') k = 'Space';
    else if (k.length === 1) k = k.toUpperCase();
    parts.push(k);
    return parts.join(' + ');
}

export function combosEqual(a: ShortcutCombo, b: ShortcutCombo): boolean {
    return (
        a.key.toLowerCase() === b.key.toLowerCase() &&
        !!a.ctrl === !!b.ctrl &&
        !!a.alt === !!b.alt &&
        !!a.shift === !!b.shift
    );
}

export interface ConflictInfo {
    label: string;
    source: 'builtin' | 'custom';
    refId: string;
}

/**
 * Walk all active bindings (built-ins respecting overrides + customs) and
 * return the first that collides with `combo`. `excludeBuiltinId` and
 * `excludeCustomId` let edit flows skip the row being edited.
 */
export function findConflict(
    state: ShortcutsState,
    combo: ShortcutCombo,
    excludeBuiltinId?: string,
    excludeCustomId?: string,
): ConflictInfo | null {
    for (const def of SHORTCUT_DEFS) {
        if (def.id === excludeBuiltinId) continue;
        const active = state.overrides[def.id] ?? def.defaultCombo;
        if (combosEqual(active, combo)) {
            return { label: def.label, source: 'builtin', refId: def.id };
        }
    }
    for (const c of state.customs) {
        if (c.id === excludeCustomId) continue;
        if (combosEqual(c.combo, combo)) {
            const action = CUSTOM_ACTIONS.find((a) => a.id === c.actionId);
            return { label: action?.label ?? c.actionId, source: 'custom', refId: c.id };
        }
    }
    return null;
}

/** Reactive getter — returns merged combo for a built-in shortcut id. */
export function useShortcutCombo(id: string): ShortcutCombo {
    return useShortcutsStore((s) => {
        const override = s.overrides[id];
        if (override) return override;
        const def = SHORTCUT_DEFS.find((d) => d.id === id);
        return def?.defaultCombo ?? { key: '' };
    });
}
