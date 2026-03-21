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

// Color Presets
// eslint-disable-next-line react-refresh/only-export-components
export const COLOR_PRESETS = {
    default: '#0052CC',
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

        return createTheme({
            direction: 'rtl',
            palette: {
                mode,
                primary: {
                    main: primaryColor,
                },
                secondary: {
                    main: '#00B8D9', // Fixed secondary for now, or make dynamic too
                },
                background: {
                    default: mode === 'light' ? '#F4F5F7' : '#0F172A',
                    paper: mode === 'light' ? '#FFFFFF' : '#1E293B',
                },
            },
            typography: {
                fontFamily: 'Cairo, Roboto, sans-serif',
                fontSize: baseFontSize,
                h1: { fontSize: '2.5rem', fontWeight: 700 },
                h2: { fontSize: '2rem', fontWeight: 700 },
                h3: { fontSize: '1.75rem', fontWeight: 700 },
                h4: { fontSize: '1.5rem', fontWeight: 700 },
                h5: { fontSize: '1.25rem', fontWeight: 700 },
                h6: { fontSize: '1rem', fontWeight: 700 },
            },
            components: {
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                            textTransform: 'none',
                            fontWeight: 600,
                        },
                    },
                },
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            backgroundImage: 'none',
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
