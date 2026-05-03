const FRACTIONAL_UNITS = new Set([
    'kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms',
    'g', 'gr', 'gram', 'grams',
    'l', 'lt', 'ltr', 'liter', 'liters', 'litre', 'litres',
    'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres',
    'كغ', 'كلغ', 'كيلو', 'كيلوغرام',
    'غ', 'غرام', 'جرام',
    'ل', 'لتر',
    'مل', 'ميليلتر',
]);

export function normalizeUnit(unit?: string | null): string {
    return (unit || '').trim().toLowerCase();
}

export function isFractionalUnit(unit?: string | null): boolean {
    return FRACTIONAL_UNITS.has(normalizeUnit(unit));
}

export function qtyStep(unit?: string | null): number {
    return isFractionalUnit(unit) ? 0.1 : 1;
}

export function qtyMin(unit?: string | null): number {
    return isFractionalUnit(unit) ? 0.001 : 1;
}

export function qtyDecimals(unit?: string | null): number {
    return isFractionalUnit(unit) ? 3 : 0;
}

export function formatQty(qty: number, unit?: string | null): string {
    if (!isFractionalUnit(unit)) {
        return Math.round(qty).toString();
    }
    const rounded = Math.round(qty * 1000) / 1000;
    return rounded.toFixed(3).replace(/\.?0+$/, '');
}

const UNIT_LABEL: Record<string, string> = {
    kg: 'كغ', kgs: 'كغ', kilo: 'كغ', kilos: 'كغ', kilogram: 'كغ', kilograms: 'كغ',
    g: 'غ', gr: 'غ', gram: 'غ', grams: 'غ',
    l: 'ل', lt: 'ل', ltr: 'ل', liter: 'ل', liters: 'ل', litre: 'ل', litres: 'ل',
    ml: 'مل', milliliter: 'مل', milliliters: 'مل', millilitre: 'مل', millilitres: 'مل',
    pcs: 'وحدة', pc: 'وحدة', piece: 'وحدة', pieces: 'وحدة', unit: 'وحدة', units: 'وحدة',
};

export function unitLabel(unit?: string | null): string {
    const n = normalizeUnit(unit);
    if (!n) return 'وحدة';
    return UNIT_LABEL[n] || n;
}

export function roundQty(qty: number, unit?: string | null): number {
    if (!isFractionalUnit(unit)) return Math.round(qty);
    return Math.round(qty * 1000) / 1000;
}
