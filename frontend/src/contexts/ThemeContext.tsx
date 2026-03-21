import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, type Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
    mode: ThemeMode;
    toggleMode: () => void;
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
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

const FONT_SCALES = {
    small: 12,
    medium: 14,
    large: 16,
};

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        return (localStorage.getItem('theme_mode') as ThemeMode) || 'light';
    });

    const [primaryColor, setPrimaryColorState] = useState<string>(() => {
        return localStorage.getItem('theme_primary') || COLOR_PRESETS.default;
    });

    const [fontSize, setFontSizeState] = useState<FontSize>(() => {
        return (localStorage.getItem('theme_font_size') as FontSize) || 'medium';
    });

    const toggleMode = () => {
        setMode((prev) => {
            const newMode = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme_mode', newMode);
            return newMode;
        });
    };

    const setPrimaryColor = (color: string) => {
        setPrimaryColorState(color);
        localStorage.setItem('theme_primary', color);
    };

    const setFontSize = (size: FontSize) => {
        setFontSizeState(size);
        localStorage.setItem('theme_font_size', size);
    };

    const theme = useMemo(() => {
        const baseFontSize = FONT_SCALES[fontSize];
        const isLight = mode === 'light';

        return createTheme({
            direction: 'rtl',
            palette: {
                mode,
                primary: {
                    main: primaryColor,
                    light: primaryColor + '33',
                    dark: primaryColor,
                },
                secondary: {
                    main: '#06B6D4',
                },
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
            shape: { borderRadius: 12 },
            shadows: [
                'none',
                isLight
                    ? '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)'
                    : '0 1px 3px 0 rgba(0,0,0,0.4)',
                isLight
                    ? '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07)'
                    : '0 4px 6px -1px rgba(0,0,0,0.4)',
                isLight
                    ? '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.07)'
                    : '0 10px 15px -3px rgba(0,0,0,0.4)',
                isLight
                    ? '0 20px 25px -5px rgba(0,0,0,0.07), 0 8px 10px -6px rgba(0,0,0,0.07)'
                    : '0 20px 25px -5px rgba(0,0,0,0.4)',
                isLight
                    ? '0 25px 50px -12px rgba(0,0,0,0.15)'
                    : '0 25px 50px -12px rgba(0,0,0,0.6)',
                ...Array(19).fill('none'),
            ] as Theme['shadows'],
            components: {
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 10,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontFamily: '"Cairo", sans-serif',
                            boxShadow: 'none',
                            '&:hover': { boxShadow: 'none' },
                        },
                        contained: {
                            '&:hover': { boxShadow: `0 4px 12px ${primaryColor}44` },
                        },
                    },
                },
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            backgroundImage: 'none',
                            borderRadius: 12,
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            backgroundImage: 'none',
                            borderRadius: 16,
                            border: `1px solid ${isLight ? '#E2E8F0' : '#1E293B'}`,
                            boxShadow: isLight
                                ? '0 1px 3px 0 rgba(0,0,0,0.05)'
                                : '0 1px 3px 0 rgba(0,0,0,0.3)',
                        },
                    },
                },
                MuiTextField: {
                    styleOverrides: {
                        root: {
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 10,
                                fontFamily: '"Cairo", sans-serif',
                            },
                        },
                    },
                },
                MuiChip: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                            fontFamily: '"Cairo", sans-serif',
                            fontWeight: 600,
                        },
                    },
                },
                MuiTooltip: {
                    styleOverrides: {
                        tooltip: {
                            borderRadius: 8,
                            fontFamily: '"Cairo", sans-serif',
                            fontSize: '0.8rem',
                        },
                    },
                },
                MuiTableCell: {
                    styleOverrides: {
                        root: {
                            fontFamily: '"Cairo", sans-serif',
                        },
                    },
                },
            },
        });
    }, [mode, primaryColor, fontSize]);

    return (
        <ThemeContext.Provider value={{ mode, toggleMode, primaryColor, setPrimaryColor, fontSize, setFontSize, theme }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
