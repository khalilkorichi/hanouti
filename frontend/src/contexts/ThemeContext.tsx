import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, type Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';
type Radius = 'sharp' | 'medium' | 'rounded';
type Density = 'compact' | 'comfortable' | 'spacious';
type AnimSpeed = 'off' | 'fast' | 'normal';

interface ThemeContextType {
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

    const theme = useMemo(() => {
        const baseFontSize = FONT_SCALES[fontSize];
        const isLight = mode === 'light';
        const r = RADIUS_SCALES[radius];
        const d = DENSITY_SCALES[density];
        const tDur = ANIM_SCALES[animSpeed];
        const transition = tDur === 0 ? 'none' : `all ${tDur}s cubic-bezier(0.4, 0, 0.2, 1)`;

        return createTheme({
            direction: 'rtl',
            palette: {
                mode,
                primary: { main: primaryColor, light: primaryColor + '33', dark: primaryColor },
                secondary: { main: '#06B6D4' },
                background: {
                    default: isLight ? '#F1F5F9' : '#0B1120',
                    paper: isLight ? '#FFFFFF' : '#151F32',
                },
                text: {
                    primary: isLight ? '#0F172A' : '#F1F5F9',
                    secondary: isLight ? '#64748B' : '#94A3B8',
                },
                divider: isLight ? '#E2E8F0' : '#1E293B',
                error: { main: '#EF4444' },
                warning: { main: '#F59E0B' },
                success: { main: '#10B981' },
                info: { main: '#3B82F6' },
            },
            typography: {
                fontFamily: '"Cairo", "Tajawal", "Roboto", sans-serif',
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
                            // حالة التعطيل — لمسة بنفسجيّة خافتة بدلاً من الرمادي
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
                /* ──────────────────────────────────────────────
                   Switch — ألوان وأحجام فقط، ترك MUI يحسب الإزاحة
                   (stylis-plugin-rtl يعكس الاتجاه تلقائياً للعربية)
                ────────────────────────────────────────────── */
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
                /* ── Radio أنيق متناسق مع الثيم ── */
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
                /* ── Checkbox متناسق ── */
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
    }, [mode, primaryColor, fontSize, radius, density, animSpeed]);

    return (
        <ThemeContext.Provider value={{
            mode, toggleMode, primaryColor, setPrimaryColor,
            fontSize, setFontSize, radius, setRadius,
            density, setDensity, animSpeed, setAnimSpeed, theme
        }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
