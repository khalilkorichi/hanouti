import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, type Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';
type Radius = 'sharp' | 'medium' | 'rounded';
type Density = 'compact' | 'comfortable' | 'spacious';
type AnimSpeed = 'off' | 'fast' | 'normal';

export type CurrencyPosition = 'before' | 'after';
export type ToastPosition =
    | 'top-right' | 'top-left' | 'top-center'
    | 'bottom-right' | 'bottom-left' | 'bottom-center';
export type DateFormat = 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'dd MMM yyyy';
export type DefaultPage =
    | '/' | '/sales' | '/products' | '/inventory' | '/categories' | '/reports' | '/customers' | '/sales-list';

export const FONT_FAMILIES = {
    Cairo:               '"Cairo", "Tajawal", "Roboto", sans-serif',
    Tajawal:             '"Tajawal", "Cairo", "Roboto", sans-serif',
    Almarai:             '"Almarai", "Cairo", "Roboto", sans-serif',
    'Noto Kufi Arabic':  '"Noto Kufi Arabic", "Cairo", "Roboto", sans-serif',
    'Noto Naskh Arabic': '"Noto Naskh Arabic", "Cairo", "Roboto", serif',
    'IBM Plex Sans Arabic': '"IBM Plex Sans Arabic", "Cairo", "Roboto", sans-serif',
} as const;
export type FontFamilyName = keyof typeof FONT_FAMILIES;

const GOOGLE_FONT_HREF = (fam: FontFamilyName) => {
    // Encode each known family with the weights we use
    const slugs: Record<FontFamilyName, string> = {
        Cairo:               'Cairo:wght@400;500;600;700;800',
        Tajawal:             'Tajawal:wght@400;500;700;800',
        Almarai:             'Almarai:wght@400;700;800',
        'Noto Kufi Arabic':  'Noto+Kufi+Arabic:wght@400;500;700;800',
        'Noto Naskh Arabic': 'Noto+Naskh+Arabic:wght@400;500;700',
        'IBM Plex Sans Arabic': 'IBM+Plex+Sans+Arabic:wght@400;500;600;700',
    };
    return `https://fonts.googleapis.com/css2?family=${slugs[fam]}&display=swap`;
};

interface AppearanceExtras {
    /* Number/money display */
    hideTrailingZeros: boolean;
    decimalPlaces: 0 | 2 | 3;
    thousandSeparator: boolean;
    currencySymbol: string;
    currencyPosition: CurrencyPosition;
    /* Fonts */
    fontScale: number;          // 0.8 .. 1.3
    fontFamily: FontFamilyName;
    boldNumbers: boolean;
    /* General */
    defaultPage: DefaultPage;
    sidebarCollapsedDefault: boolean;
    showProductImages: boolean;
    toastPosition: ToastPosition;
    dateFormat: DateFormat;
    highContrast: boolean;
}

interface AppearanceSetters {
    setHideTrailingZeros: (v: boolean) => void;
    setDecimalPlaces: (v: 0 | 2 | 3) => void;
    setThousandSeparator: (v: boolean) => void;
    setCurrencySymbol: (v: string) => void;
    setCurrencyPosition: (v: CurrencyPosition) => void;
    setFontScale: (v: number) => void;
    setFontFamily: (v: FontFamilyName) => void;
    setBoldNumbers: (v: boolean) => void;
    setDefaultPage: (v: DefaultPage) => void;
    setSidebarCollapsedDefault: (v: boolean) => void;
    setShowProductImages: (v: boolean) => void;
    setToastPosition: (v: ToastPosition) => void;
    setDateFormat: (v: DateFormat) => void;
    setHighContrast: (v: boolean) => void;
    resetAppearance: () => void;
}

interface ThemeContextType extends AppearanceExtras, AppearanceSetters {
    mode: ThemeMode;
    toggleMode: () => void;
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    radius: Radius;
    setRadius: (r: Radius) => void;
    density: Density;
    setDensity: (d: Density) => void;
    animSpeed: AnimSpeed;
    setAnimSpeed: (s: AnimSpeed) => void;
    theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAppTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used within a AppThemeProvider');
    }
    return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const COLOR_PRESETS = {
    default: '#4F46E5',
    emerald: '#10B981',
    purple: '#8B5CF6',
    amber: '#F59E0B',
    rose: '#F43F5E',
    cyan: '#06B6D4',
};

const FONT_SCALES = { small: 12, medium: 14, large: 16 };
const RADIUS_SCALES = { sharp: 4, medium: 10, rounded: 16 };
const DENSITY_SCALES = {
    compact:     { padX: 1.25, padY: 0.55, gap: 1.25, btnY: 0.55 },
    comfortable: { padX: 1.75, padY: 0.85, gap: 1.75, btnY: 0.85 },
    spacious:    { padX: 2.25, padY: 1.15, gap: 2.25, btnY: 1.15 },
};
const ANIM_SCALES = { off: 0, fast: 0.15, normal: 0.3 };

/* ── Defaults for the new appearance bits ── */
const APPEARANCE_DEFAULTS: AppearanceExtras = {
    hideTrailingZeros: true,
    decimalPlaces: 2,
    thousandSeparator: false,
    currencySymbol: 'دج',
    currencyPosition: 'after',
    fontScale: 1,
    fontFamily: 'Cairo',
    boldNumbers: false,
    defaultPage: '/',
    sidebarCollapsedDefault: false,
    showProductImages: true,
    toastPosition: 'top-right',
    dateFormat: 'dd/MM/yyyy',
    highContrast: false,
};

const LS_KEYS = {
    hideTrailingZeros:       'theme_hide_zeros',
    decimalPlaces:           'theme_decimal_places',
    thousandSeparator:       'theme_thousand_sep',
    currencySymbol:          'theme_currency_symbol',
    currencyPosition:        'theme_currency_pos',
    fontScale:               'theme_font_scale',
    fontFamily:              'theme_font_family',
    boldNumbers:             'theme_bold_numbers',
    defaultPage:             'theme_default_page',
    sidebarCollapsedDefault: 'theme_sidebar_default',
    showProductImages:       'theme_show_product_images',
    toastPosition:           'theme_toast_pos',
    dateFormat:               'theme_date_format',
    highContrast:            'theme_high_contrast',
};

function readLS<T extends string | number | boolean>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        if (typeof fallback === 'boolean') return (raw === 'true') as T;
        if (typeof fallback === 'number') {
            const n = Number(raw);
            return (Number.isFinite(n) ? n : fallback) as T;
        }
        return raw as T;
    } catch { return fallback; }
}

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<ThemeMode>(() =>
        (localStorage.getItem('theme_mode') as ThemeMode) || 'light'
    );
    const [primaryColor, setPrimaryColorState] = useState<string>(() =>
        localStorage.getItem('theme_primary') || COLOR_PRESETS.default
    );
    const [fontSize, setFontSizeState] = useState<FontSize>(() =>
        (localStorage.getItem('theme_font_size') as FontSize) || 'medium'
    );
    const [radius, setRadiusState] = useState<Radius>(() =>
        (localStorage.getItem('theme_radius') as Radius) || 'medium'
    );
    const [density, setDensityState] = useState<Density>(() =>
        (localStorage.getItem('theme_density') as Density) || 'comfortable'
    );
    const [animSpeed, setAnimSpeedState] = useState<AnimSpeed>(() =>
        (localStorage.getItem('theme_anim') as AnimSpeed) || 'normal'
    );

    /* ── Extended appearance state ── */
    const [hideTrailingZeros, setHideTrailingZerosState] = useState<boolean>(() => readLS(LS_KEYS.hideTrailingZeros, APPEARANCE_DEFAULTS.hideTrailingZeros));
    const [decimalPlaces, setDecimalPlacesState] = useState<0 | 2 | 3>(() => {
        const v = readLS<number>(LS_KEYS.decimalPlaces, APPEARANCE_DEFAULTS.decimalPlaces);
        return ([0, 2, 3] as number[]).includes(v) ? (v as 0 | 2 | 3) : APPEARANCE_DEFAULTS.decimalPlaces;
    });
    const [thousandSeparator, setThousandSeparatorState] = useState<boolean>(() => readLS(LS_KEYS.thousandSeparator, APPEARANCE_DEFAULTS.thousandSeparator));
    const [currencySymbol, setCurrencySymbolState] = useState<string>(() => readLS(LS_KEYS.currencySymbol, APPEARANCE_DEFAULTS.currencySymbol));
    const [currencyPosition, setCurrencyPositionState] = useState<CurrencyPosition>(() =>
        (readLS(LS_KEYS.currencyPosition, APPEARANCE_DEFAULTS.currencyPosition) as CurrencyPosition));
    const [fontScale, setFontScaleState] = useState<number>(() => {
        const v = readLS<number>(LS_KEYS.fontScale, APPEARANCE_DEFAULTS.fontScale);
        return Math.min(1.3, Math.max(0.8, v));
    });
    const [fontFamily, setFontFamilyState] = useState<FontFamilyName>(() => {
        const v = readLS<string>(LS_KEYS.fontFamily, APPEARANCE_DEFAULTS.fontFamily);
        return (v in FONT_FAMILIES ? v : APPEARANCE_DEFAULTS.fontFamily) as FontFamilyName;
    });
    const [boldNumbers, setBoldNumbersState] = useState<boolean>(() => readLS(LS_KEYS.boldNumbers, APPEARANCE_DEFAULTS.boldNumbers));
    const [defaultPage, setDefaultPageState] = useState<DefaultPage>(() =>
        readLS(LS_KEYS.defaultPage, APPEARANCE_DEFAULTS.defaultPage) as DefaultPage);
    const [sidebarCollapsedDefault, setSidebarCollapsedDefaultState] = useState<boolean>(() =>
        readLS(LS_KEYS.sidebarCollapsedDefault, APPEARANCE_DEFAULTS.sidebarCollapsedDefault));
    const [showProductImages, setShowProductImagesState] = useState<boolean>(() =>
        readLS(LS_KEYS.showProductImages, APPEARANCE_DEFAULTS.showProductImages));
    const [toastPosition, setToastPositionState] = useState<ToastPosition>(() =>
        readLS(LS_KEYS.toastPosition, APPEARANCE_DEFAULTS.toastPosition) as ToastPosition);
    const [dateFormat, setDateFormatState] = useState<DateFormat>(() =>
        readLS(LS_KEYS.dateFormat, APPEARANCE_DEFAULTS.dateFormat) as DateFormat);
    const [highContrast, setHighContrastState] = useState<boolean>(() =>
        readLS(LS_KEYS.highContrast, APPEARANCE_DEFAULTS.highContrast));

    const toggleMode = () => {
        setMode((prev) => {
            const m = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme_mode', m);
            return m;
        });
    };
    const setPrimaryColor = (c: string) => { setPrimaryColorState(c); localStorage.setItem('theme_primary', c); };
    const setFontSize = (s: FontSize) => { setFontSizeState(s); localStorage.setItem('theme_font_size', s); };
    const setRadius = (r: Radius) => { setRadiusState(r); localStorage.setItem('theme_radius', r); };
    const setDensity = (d: Density) => { setDensityState(d); localStorage.setItem('theme_density', d); };
    const setAnimSpeed = (s: AnimSpeed) => { setAnimSpeedState(s); localStorage.setItem('theme_anim', s); };

    /* Persisted setters for extended appearance */
    const persist = (k: string, v: string | number | boolean) => { try { localStorage.setItem(k, String(v)); } catch { /* ignore */ } };
    const setHideTrailingZeros = (v: boolean) => { setHideTrailingZerosState(v); persist(LS_KEYS.hideTrailingZeros, v); };
    const setDecimalPlaces = (v: 0 | 2 | 3) => { setDecimalPlacesState(v); persist(LS_KEYS.decimalPlaces, v); };
    const setThousandSeparator = (v: boolean) => { setThousandSeparatorState(v); persist(LS_KEYS.thousandSeparator, v); };
    const setCurrencySymbol = (v: string) => { setCurrencySymbolState(v); persist(LS_KEYS.currencySymbol, v); };
    const setCurrencyPosition = (v: CurrencyPosition) => { setCurrencyPositionState(v); persist(LS_KEYS.currencyPosition, v); };
    const setFontScale = (v: number) => {
        const clamped = Math.min(1.3, Math.max(0.8, v));
        setFontScaleState(clamped); persist(LS_KEYS.fontScale, clamped);
    };
    const setFontFamily = (v: FontFamilyName) => { setFontFamilyState(v); persist(LS_KEYS.fontFamily, v); };
    const setBoldNumbers = (v: boolean) => { setBoldNumbersState(v); persist(LS_KEYS.boldNumbers, v); };
    const setDefaultPage = (v: DefaultPage) => { setDefaultPageState(v); persist(LS_KEYS.defaultPage, v); };
    const setSidebarCollapsedDefault = (v: boolean) => { setSidebarCollapsedDefaultState(v); persist(LS_KEYS.sidebarCollapsedDefault, v); };
    const setShowProductImages = (v: boolean) => { setShowProductImagesState(v); persist(LS_KEYS.showProductImages, v); };
    const setToastPosition = (v: ToastPosition) => { setToastPositionState(v); persist(LS_KEYS.toastPosition, v); };
    const setDateFormat = (v: DateFormat) => { setDateFormatState(v); persist(LS_KEYS.dateFormat, v); };
    const setHighContrast = (v: boolean) => { setHighContrastState(v); persist(LS_KEYS.highContrast, v); };

    const resetAppearance = () => {
        Object.values(LS_KEYS).forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
        setHideTrailingZerosState(APPEARANCE_DEFAULTS.hideTrailingZeros);
        setDecimalPlacesState(APPEARANCE_DEFAULTS.decimalPlaces);
        setThousandSeparatorState(APPEARANCE_DEFAULTS.thousandSeparator);
        setCurrencySymbolState(APPEARANCE_DEFAULTS.currencySymbol);
        setCurrencyPositionState(APPEARANCE_DEFAULTS.currencyPosition);
        setFontScaleState(APPEARANCE_DEFAULTS.fontScale);
        setFontFamilyState(APPEARANCE_DEFAULTS.fontFamily);
        setBoldNumbersState(APPEARANCE_DEFAULTS.boldNumbers);
        setDefaultPageState(APPEARANCE_DEFAULTS.defaultPage);
        setSidebarCollapsedDefaultState(APPEARANCE_DEFAULTS.sidebarCollapsedDefault);
        setShowProductImagesState(APPEARANCE_DEFAULTS.showProductImages);
        setToastPositionState(APPEARANCE_DEFAULTS.toastPosition);
        setDateFormatState(APPEARANCE_DEFAULTS.dateFormat);
        setHighContrastState(APPEARANCE_DEFAULTS.highContrast);
    };

    /* ── Inject Google Fonts <link> for the active family (idempotent per family) ── */
    useEffect(() => {
        const id = `gf-${fontFamily.replace(/\s+/g, '-')}`;
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = GOOGLE_FONT_HREF(fontFamily);
        document.head.appendChild(link);
    }, [fontFamily]);

    /* ── Apply boldNumbers / highContrast as document-level classes ── */
    useEffect(() => {
        const html = document.documentElement;
        html.classList.toggle('app-bold-numbers', boldNumbers);
        html.classList.toggle('app-high-contrast', highContrast);
    }, [boldNumbers, highContrast]);

    const theme = useMemo(() => {
        const baseFontSize = FONT_SCALES[fontSize] * fontScale;
        const isLight = mode === 'light';
        const r = RADIUS_SCALES[radius];
        const d = DENSITY_SCALES[density];
        const tDur = ANIM_SCALES[animSpeed];
        const transition = tDur === 0 ? 'none' : `all ${tDur}s cubic-bezier(0.4, 0, 0.2, 1)`;
        const familyStack = FONT_FAMILIES[fontFamily];

        return createTheme({
            direction: 'rtl',
            palette: {
                mode,
                primary: { main: primaryColor, light: primaryColor + '33', dark: primaryColor },
                secondary: { main: '#06B6D4' },
                background: {
                    default: isLight ? (highContrast ? '#FFFFFF' : '#F1F5F9') : (highContrast ? '#000000' : '#0B1120'),
                    paper:   isLight ? '#FFFFFF' : (highContrast ? '#0A0F1C' : '#151F32'),
                },
                text: {
                    primary:   isLight ? (highContrast ? '#000000' : '#0F172A') : (highContrast ? '#FFFFFF' : '#F1F5F9'),
                    secondary: isLight ? (highContrast ? '#1E293B' : '#64748B') : (highContrast ? '#CBD5E1' : '#94A3B8'),
                },
                divider: isLight
                    ? (highContrast ? '#475569' : '#E2E8F0')
                    : (highContrast ? '#94A3B8' : '#1E293B'),
                error: { main: '#EF4444' },
                warning: { main: '#F59E0B' },
                success: { main: '#10B981' },
                info: { main: '#3B82F6' },
            },
            typography: {
                fontFamily: familyStack,
                fontSize: baseFontSize,
                h1: { fontWeight: 800 },
                h2: { fontWeight: 800 },
                h3: { fontWeight: 700 },
                h4: { fontWeight: 700 },
                h5: { fontWeight: 700 },
                h6: { fontWeight: 700 },
                body1: { fontWeight: 400 },
                body2: { fontWeight: 400 },
                button: { fontWeight: 600, textTransform: 'none' },
            },
            shape: { borderRadius: r },
            transitions: {
                duration: {
                    shortest: tDur === 0 ? 0 : 100,
                    shorter: tDur === 0 ? 0 : 150,
                    short: tDur === 0 ? 0 : 200,
                    standard: tDur === 0 ? 0 : tDur * 1000,
                    complex: tDur === 0 ? 0 : 350,
                    enteringScreen: tDur === 0 ? 0 : 200,
                    leavingScreen: tDur === 0 ? 0 : 175,
                },
            },
            shadows: [
                'none',
                isLight ? '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)' : '0 1px 3px 0 rgba(0,0,0,0.4)',
                isLight ? '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07)' : '0 4px 6px -1px rgba(0,0,0,0.4)',
                isLight ? '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.07)' : '0 10px 15px -3px rgba(0,0,0,0.4)',
                isLight ? '0 20px 25px -5px rgba(0,0,0,0.07), 0 8px 10px -6px rgba(0,0,0,0.07)' : '0 20px 25px -5px rgba(0,0,0,0.4)',
                isLight ? '0 25px 50px -12px rgba(0,0,0,0.15)' : '0 25px 50px -12px rgba(0,0,0,0.6)',
                ...Array(19).fill('none'),
            ] as Theme['shadows'],
            components: {
                MuiCssBaseline: {
                    styleOverrides: {
                        '*, *::before, *::after': tDur === 0
                            ? { transition: 'none !important', animation: 'none !important' }
                            : {},
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: r,
                            textTransform: 'none',
                            fontWeight: 600,
                            paddingTop: `${d.btnY * 8}px`,
                            paddingBottom: `${d.btnY * 8}px`,
                            paddingLeft: `${d.padX * 10}px`,
                            paddingRight: `${d.padX * 10}px`,
                            transition,
                            boxShadow: 'none',
                            '&:hover': { boxShadow: 'none' },
                        },
                        contained: {
                            '&:hover': { boxShadow: `0 4px 12px ${primaryColor}44` },
                            '&.Mui-disabled': {
                                backgroundColor: `${primaryColor}${isLight ? '2E' : '47'}`,
                                color: `${primaryColor}${isLight ? '8C' : 'BF'}`,
                                boxShadow: 'none',
                            },
                        },
                        outlined: {
                            '&.Mui-disabled': {
                                borderColor: `${primaryColor}40`,
                                color: `${primaryColor}73`,
                            },
                        },
                        text: {
                            '&.Mui-disabled': {
                                color: `${primaryColor}66`,
                            },
                        },
                    },
                },
                MuiPaper: {
                    styleOverrides: {
                        root: { backgroundImage: 'none', borderRadius: r },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            backgroundImage: 'none',
                            borderRadius: r + 4,
                            border: `1px solid ${isLight ? '#E2E8F0' : '#1E293B'}`,
                            boxShadow: isLight ? '0 1px 3px 0 rgba(0,0,0,0.05)' : '0 1px 3px 0 rgba(0,0,0,0.3)',
                            transition,
                        },
                    },
                },
                MuiCardContent: {
                    styleOverrides: {
                        root: {
                            padding: `${d.padY * 16}px ${d.padX * 12}px`,
                            '&:last-child': { paddingBottom: `${d.padY * 16}px` },
                        },
                    },
                },
                MuiTextField: {
                    styleOverrides: {
                        root: {
                            '& .MuiOutlinedInput-root': { borderRadius: Math.max(r - 2, 4) },
                        },
                    },
                },
                MuiOutlinedInput: {
                    styleOverrides: {
                        root: { borderRadius: Math.max(r - 2, 4), transition },
                    },
                },
                MuiChip: {
                    styleOverrides: {
                        root: { borderRadius: Math.max(r - 4, 4), fontWeight: 600 },
                    },
                },
                MuiTooltip: {
                    styleOverrides: {
                        tooltip: { borderRadius: Math.max(r - 4, 4), fontSize: '0.8rem' },
                    },
                },
                MuiTableCell: {
                    styleOverrides: {
                        root: { paddingTop: `${d.padY * 10}px`, paddingBottom: `${d.padY * 10}px` },
                    },
                },
                MuiListItemButton: {
                    styleOverrides: {
                        root: { borderRadius: Math.max(r - 2, 4), transition },
                    },
                },
                MuiIconButton: {
                    styleOverrides: {
                        root: { borderRadius: Math.max(r - 4, 4), transition },
                    },
                },
                MuiSwitch: {
                    defaultProps: { disableRipple: true },
                    styleOverrides: {
                        switchBase: {
                            '&.Mui-checked': {
                                color: '#FFFFFF',
                                '& + .MuiSwitch-track': {
                                    opacity: 1,
                                    backgroundColor: primaryColor,
                                    backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}E6 100%)`,
                                    border: `1px solid ${primaryColor}`,
                                    boxShadow: `0 2px 8px ${primaryColor}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
                                },
                                '& .MuiSwitch-thumb': {
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)',
                                },
                            },
                            '&.Mui-disabled': {
                                '& + .MuiSwitch-track': { opacity: 0.4 },
                                '& .MuiSwitch-thumb': { opacity: 0.7 },
                            },
                            '&:hover': { backgroundColor: 'transparent' },
                        },
                        thumb: {
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.12)',
                        },
                        track: {
                            borderRadius: 13,
                            opacity: 1,
                            border: `1px solid ${isLight ? '#CBD5E1' : '#334155'}`,
                            backgroundColor: isLight ? '#E2E8F0' : '#1E293B',
                            boxShadow: isLight
                                ? 'inset 0 1px 2px rgba(15,23,42,0.06)'
                                : 'inset 0 1px 2px rgba(0,0,0,0.4)',
                            transition: 'background-color 300ms ease, border-color 200ms ease, box-shadow 300ms ease, opacity 200ms ease',
                        },
                    },
                },
                MuiRadio: {
                    styleOverrides: {
                        root: {
                            padding: 8,
                            color: isLight ? '#94A3B8' : '#64748B',
                            transition: 'color 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
                            '&:hover': {
                                backgroundColor: `${primaryColor}14`,
                                color: primaryColor,
                            },
                            '&.Mui-checked': {
                                color: primaryColor,
                                '& .MuiSvgIcon-root:last-of-type': {
                                    filter: `drop-shadow(0 0 4px ${primaryColor}80)`,
                                },
                            },
                            '&:active': { transform: 'scale(0.92)' },
                        },
                    },
                },
                MuiCheckbox: {
                    styleOverrides: {
                        root: {
                            padding: 8,
                            color: isLight ? '#94A3B8' : '#64748B',
                            borderRadius: Math.max(r - 4, 4),
                            transition: 'color 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
                            '&:hover': {
                                backgroundColor: `${primaryColor}14`,
                                color: primaryColor,
                            },
                            '&.Mui-checked': {
                                color: primaryColor,
                                '& .MuiSvgIcon-root': {
                                    filter: `drop-shadow(0 0 4px ${primaryColor}66)`,
                                },
                            },
                            '&:active': { transform: 'scale(0.92)' },
                        },
                    },
                },
                MuiDialog: {
                    styleOverrides: {
                        paper: { borderRadius: r + 4 },
                    },
                },
            },
        });
    }, [mode, primaryColor, fontSize, fontScale, fontFamily, radius, density, animSpeed, highContrast]);

    return (
        <ThemeContext.Provider value={{
            mode, toggleMode, primaryColor, setPrimaryColor,
            fontSize, setFontSize, radius, setRadius,
            density, setDensity, animSpeed, setAnimSpeed, theme,
            hideTrailingZeros, setHideTrailingZeros,
            decimalPlaces, setDecimalPlaces,
            thousandSeparator, setThousandSeparator,
            currencySymbol, setCurrencySymbol,
            currencyPosition, setCurrencyPosition,
            fontScale, setFontScale,
            fontFamily, setFontFamily,
            boldNumbers, setBoldNumbers,
            defaultPage, setDefaultPage,
            sidebarCollapsedDefault, setSidebarCollapsedDefault,
            showProductImages, setShowProductImages,
            toastPosition, setToastPosition,
            dateFormat, setDateFormat,
            highContrast, setHighContrast,
            resetAppearance,
        }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
