import { createTheme } from '@mui/material/styles';
import { arEG } from '@mui/material/locale';

// Hanouti Design System Colors (Daftra-inspired)
// الألوان المستوحاة من Daftra حسب Context.md
const primaryColor = '#0052CC';      // Primary - أزرق احترافي
const secondaryColor = '#00B8D9';    // Secondary - سماوي
const successColor = '#36B37E';      // Accent/Success - أخضر
const warningColor = '#FFAB00';      // Warning - برتقالي
const errorColor = '#FF5630';        // Danger - أحمر
const backgroundLight = '#F4F5F7';   // Background Light
const surfaceLight = '#FFFFFF';      // Surface Light
const textPrimary = '#172B4D';       // Text Primary - أزرق داكن
const textSecondary = '#6B778C';     // Text Secondary - رمادي

export const lightTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: primaryColor,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: secondaryColor,
      contrastText: '#FFFFFF',
    },
    success: {
      main: successColor,
    },
    warning: {
      main: warningColor,
    },
    error: {
      main: errorColor,
    },
    background: {
      default: backgroundLight,
      paper: surfaceLight,
    },
    text: {
      primary: textPrimary,
      secondary: textSecondary,
    },
  },
  typography: {
    fontFamily: 'Inter, "Cairo", "Roboto", "Helvetica", "Arial", sans-serif',
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
        rounded: {
          borderRadius: 12,
        },
      },
    },
  },
}, arEG);

export const darkTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: {
      main: '#4C9AFF',  // نسخة أفتح للوضع الليلي
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00C7E6',  // نسخة أفتح للوضع الليلي
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#57D9A3',  // نسخة أفتح
    },
    warning: {
      main: '#FFC400',  // نسخة أفتح
    },
    error: {
      main: '#FF7452',  // نسخة أفتح
    },
    background: {
      default: '#0D1117',     // أغمق قليلاً للتباين
      paper: '#161B22',       // أغمق قليلاً
    },
    text: {
      primary: '#E6EDF3',     // أبيض مزرق للقراءة
      secondary: '#8B949E',   // رمادي متوسط
    },
  },
  typography: {
    fontFamily: 'Inter, "Cairo", "Roboto", "Helvetica", "Arial", sans-serif',
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
        rounded: {
          borderRadius: 12,
        },
      },
    },
  },
}, arEG);
