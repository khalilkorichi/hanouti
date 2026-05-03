/**
 * Unified number / money / date formatting that respects the user's
 * appearance settings stored in ThemeContext.
 *
 * Pure helpers (`formatMoney`, `formatNumber`, `formatDate`) take a settings
 * object and can be used outside React (CSV exports, print receipts, etc.).
 *
 * Inside React components, prefer the `useFormatters()` hook which pulls
 * the live settings from ThemeContext and returns memoised wrappers.
 *
 * Self-tests (mental):
 *   formatMoney(1500,    { hideTrailingZeros:true,  decimalPlaces:2, thousandSeparator:false, currencySymbol:'دج', currencyPosition:'after' })
 *     → "1500 دج"
 *   formatMoney(1500.50, … same … )                   → "1500.50 دج"   (one trailing 0 kept by toFixed)
 *   formatMoney(1500.20, { hideTrailingZeros:true, … }) → "1500.2 دج"
 *   formatMoney(1500,    { thousandSeparator:true  }) → "1,500 دج"
 *   formatMoney(1500,    { currencyPosition:'before' }) → "دج 1500"
 */

import { useMemo } from 'react';
import { useAppTheme } from '../contexts/ThemeContext';
import type { CurrencyPosition, DateFormat } from '../contexts/ThemeContext';

export interface MoneyFormatOptions {
    hideTrailingZeros: boolean;
    decimalPlaces: 0 | 2 | 3;
    thousandSeparator: boolean;
    currencySymbol: string;
    currencyPosition: CurrencyPosition;
    /** When true, omits the currency symbol entirely (rare — used for "input placeholders") */
    omitSymbol?: boolean;
}

export interface NumberFormatOptions {
    hideTrailingZeros?: boolean;
    decimalPlaces?: number;          // 0 = integer; for `formatNumber` we don't bound the choice
    thousandSeparator?: boolean;
}

/**
 * Format a numeric amount using the supplied options (no currency).
 *
 * NOTE: We deliberately use plain JS `toFixed` + manual thousand-separator
 * insertion instead of `Intl.NumberFormat` because some Arabic locales
 * render eastern-Arabic digits (٠١٢٣) which clashes with our hand-typed
 * latin-digit invoices and tests. Switch to Intl when ready to localise.
 */
export function formatNumber(value: number | null | undefined, opts: NumberFormatOptions = {}): string {
    const { hideTrailingZeros = false, decimalPlaces = 2, thousandSeparator = false } = opts;
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return '0';

    let str = decimalPlaces > 0 ? n.toFixed(decimalPlaces) : String(Math.round(n));

    if (hideTrailingZeros && decimalPlaces > 0 && str.includes('.')) {
        str = str.replace(/\.?0+$/, '');
    }

    if (thousandSeparator) {
        const [intPart, decPart] = str.split('.');
        const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        str = decPart != null ? `${withSep}.${decPart}` : withSep;
    }

    return str;
}

export function formatMoney(value: number | null | undefined, opts: MoneyFormatOptions): string {
    const numStr = formatNumber(value, {
        hideTrailingZeros: opts.hideTrailingZeros,
        decimalPlaces: opts.decimalPlaces,
        thousandSeparator: opts.thousandSeparator,
    });
    if (opts.omitSymbol) return numStr;
    return opts.currencyPosition === 'before'
        ? `${opts.currencySymbol} ${numStr}`
        : `${numStr} ${opts.currencySymbol}`;
}

/* ── Date formatting ───────────────────────────────────────── */

const MONTHS_AR_SHORT = ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

export interface DateFormatOptions {
    dateFormat: DateFormat;
    /** Append the time using locale rules. Defaults to false (date-only). */
    withTime?: boolean;
}

export function formatDate(value: Date | string | number | null | undefined, opts: DateFormatOptions): string {
    if (value == null || value === '') return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const monthName = MONTHS_AR_SHORT[d.getMonth()];

    let datePart = '';
    switch (opts.dateFormat) {
        case 'yyyy-MM-dd':  datePart = `${yyyy}-${mm}-${dd}`; break;
        case 'dd MMM yyyy': datePart = `${d.getDate()} ${monthName} ${yyyy}`; break;
        case 'dd/MM/yyyy':
        default:            datePart = `${dd}/${mm}/${yyyy}`; break;
    }

    if (opts.withTime) {
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        return `${datePart} ${hh}:${mi}`;
    }
    return datePart;
}

/* ── Hook ──────────────────────────────────────────────────── */

export function useFormatters() {
    const {
        hideTrailingZeros, decimalPlaces, thousandSeparator,
        currencySymbol, currencyPosition, dateFormat,
    } = useAppTheme();

    return useMemo(() => {
        const moneyOpts: MoneyFormatOptions = {
            hideTrailingZeros, decimalPlaces, thousandSeparator,
            currencySymbol, currencyPosition,
        };
        return {
            money:  (v: number | null | undefined, override?: Partial<MoneyFormatOptions>) =>
                        formatMoney(v, { ...moneyOpts, ...(override || {}) }),
            number: (v: number | null | undefined, override?: NumberFormatOptions) =>
                        formatNumber(v, { hideTrailingZeros, decimalPlaces, thousandSeparator, ...(override || {}) }),
            date:   (v: Date | string | number | null | undefined, override?: Partial<DateFormatOptions>) =>
                        formatDate(v, { dateFormat, ...(override || {}) }),
            /** Raw amount only, no currency symbol (handy for input placeholders). */
            amount: (v: number | null | undefined) =>
                        formatMoney(v, { ...moneyOpts, omitSymbol: true }),
            /** Settings snapshot, exposed for components that need to compose strings manually. */
            settings: { ...moneyOpts, dateFormat },
        };
    }, [hideTrailingZeros, decimalPlaces, thousandSeparator, currencySymbol, currencyPosition, dateFormat]);
}

/** Convenience: pull settings from any plain options object (e.g. while rendering inside non-hook code). */
export function buildMoneyOptions(s: Partial<MoneyFormatOptions>): MoneyFormatOptions {
    return {
        hideTrailingZeros: s.hideTrailingZeros ?? true,
        decimalPlaces: (s.decimalPlaces ?? 2) as 0 | 2 | 3,
        thousandSeparator: s.thousandSeparator ?? false,
        currencySymbol: s.currencySymbol ?? 'دج',
        currencyPosition: s.currencyPosition ?? 'after',
        omitSymbol: s.omitSymbol,
    };
}
