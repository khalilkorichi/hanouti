/**
 * Barcode helpers for the Hanouti POS:
 *  - EAN-13 check-digit math + random generator
 *  - Auto-pick of EAN-13 vs CODE128 for rendering
 *  - Weight-embedded EAN parser (EU/MENA in-store format `2{6}{5}{1}`)
 */

import type { Product } from '../services/productService';

/** True when `s` is exactly `len` ASCII digits. */
export function isNumeric(s: string, len?: number): boolean {
    if (!s) return false;
    if (len !== undefined && s.length !== len) return false;
    return /^\d+$/.test(s);
}

/** Compute the EAN-13 check digit for a 12-digit prefix. */
export function ean13CheckDigit(twelveDigits: string): number {
    if (!isNumeric(twelveDigits, 12)) {
        throw new Error('EAN-13 prefix must be exactly 12 digits.');
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const d = twelveDigits.charCodeAt(i) - 48;
        sum += i % 2 === 0 ? d : d * 3;
    }
    return (10 - (sum % 10)) % 10;
}

/** Validates a full 13-digit EAN-13 (digits + correct check digit). */
export function isValidEan13(code: string): boolean {
    if (!isNumeric(code, 13)) return false;
    return ean13CheckDigit(code.slice(0, 12)) === code.charCodeAt(12) - 48;
}

/**
 * Build a random EAN-13 with a known prefix (default `200` — the GS1 prefix
 * range reserved for in-store/local items, so it can never collide with a
 * real product registered in the global GS1 database).
 */
export function generateEan13(prefix = '200'): string {
    if (!isNumeric(prefix) || prefix.length < 1 || prefix.length > 12) {
        throw new Error('EAN-13 prefix must be 1–12 digits.');
    }
    let body = prefix;
    while (body.length < 12) {
        body += Math.floor(Math.random() * 10).toString();
    }
    return body + ean13CheckDigit(body).toString();
}

/**
 * Generate an EAN-13 that doesn't collide with any existing barcode.
 * `existsCheck` should resolve `true` if the candidate is already taken
 * (typically a HEAD/GET against `/products/by-barcode/{code}`).
 */
export async function generateUniqueEan13(
    existsCheck: (candidate: string) => Promise<boolean>,
    maxTries = 8,
): Promise<string> {
    let lastError: Error | null = null;
    for (let i = 0; i < maxTries; i++) {
        const candidate = generateEan13();
        try {
            const taken = await existsCheck(candidate);
            if (!taken) return candidate;
        } catch (e) {
            lastError = e as Error;
        }
    }
    throw lastError || new Error('تعذّر توليد باركود فريد. حاول مجدداً.');
}

/** Pick a JsBarcode format that fits the input. */
export function pickBarcodeFormat(value: string): 'EAN13' | 'CODE128' {
    return isValidEan13(value) ? 'EAN13' : 'CODE128';
}

/* ── Weight-embedded EAN ────────────────────────────────────────────────── */

export interface WeightEan {
    /** Candidate lookup codes the caller should try in order against the products
     *  table. Different stores register the embedded code in different forms,
     *  so we try the bare 6-digit code first, then the `2{6}` prefixed form. */
    lookupCandidates: string[];
    /** The bare 6-digit product code embedded by the scale. */
    productCode: string;
    /** Embedded grams — used directly as cart quantity for `unit === 'kg'`. */
    grams: number;
}

/**
 * Decode the in-store "weight EAN" format used by deli scales:
 *   `2 P P P P P P W W W W W C`
 *      └─ 6 product digits ─┘└5 grams┘└check┘
 *
 * Returns `null` when the input isn't a valid weight EAN. The check digit is
 * verified against the standard EAN-13 algorithm; flag prefix `2` is required.
 */
export function parseWeightEan(code: string): WeightEan | null {
    if (!isValidEan13(code)) return null;
    if (code[0] !== '2') return null;
    const productCode = code.slice(1, 7);
    const gramsStr = code.slice(7, 12);
    const grams = parseInt(gramsStr, 10);
    if (!Number.isFinite(grams) || grams <= 0) return null;
    return {
        productCode,
        // Try the bare 6-digit code first (the most common shelf-edge format
        // in MENA stores), then the prefixed form.
        lookupCandidates: [productCode, '2' + productCode],
        grams,
    };
}

/**
 * Convert grams to a quantity for the given product. For weighed products
 * (`unit === 'kg'`) this returns kilograms; otherwise it returns the raw
 * gram count (caller decides whether that makes sense — typically the
 * weight EAN is only emitted for kg-priced items).
 */
export function gramsToQty(grams: number, product: Pick<Product, 'unit'>): number {
    if (product.unit === 'kg') {
        return Math.round((grams / 1000) * 1000) / 1000; // 3-decimal precision
    }
    return grams;
}
