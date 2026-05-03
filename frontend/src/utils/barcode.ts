import type { Product } from '../services/productService';

export function isNumeric(s: string, len?: number): boolean {
    if (!s) return false;
    if (len !== undefined && s.length !== len) return false;
    return /^\d+$/.test(s);
}

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

export function isValidEan13(code: string): boolean {
    if (!isNumeric(code, 13)) return false;
    return ean13CheckDigit(code.slice(0, 12)) === code.charCodeAt(12) - 48;
}

// Prefix `200` is the GS1 in-store range — won't collide with real GS1 products.
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

export function pickBarcodeFormat(value: string): 'EAN13' | 'CODE128' {
    return isValidEan13(value) ? 'EAN13' : 'CODE128';
}

export interface WeightEan {
    lookupCandidates: string[];
    productCode: string;
    grams: number;
}

// Decode in-store weight EAN: `2 PPPPPP WWWWW C` (6 product digits, 5 grams, check).
export function parseWeightEan(code: string): WeightEan | null {
    if (!isValidEan13(code)) return null;
    if (code[0] !== '2') return null;
    const productCode = code.slice(1, 7);
    const gramsStr = code.slice(7, 12);
    const grams = parseInt(gramsStr, 10);
    if (!Number.isFinite(grams) || grams <= 0) return null;
    return {
        productCode,
        lookupCandidates: [productCode, '2' + productCode],
        grams,
    };
}

export function gramsToQty(grams: number, product: Pick<Product, 'unit'>): number {
    if (product.unit === 'kg') {
        return Math.round((grams / 1000) * 1000) / 1000;
    }
    return grams;
}
