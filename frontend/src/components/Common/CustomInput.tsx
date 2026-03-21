import { TextField, alpha, useTheme, InputAdornment } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';
import type { ReactNode } from 'react';

export interface CustomInputProps extends Omit<TextFieldProps, 'variant'> {
    variant?: 'filled' | 'outlined';
    startIcon?: ReactNode;
    endIcon?: ReactNode;
}

/**
 * CustomInput - حقل إدخال مخصص مع تصميم موحد
 * 
 * المميزات:
 * - زوايا دائرية (Rounded)
 * - تأثيرات focus محسنة
 * - دعم الأيقونات (start/end)
 * - تصميم متسق عبر التطبيق
 * - دعم RTL كامل
 * - تحقق بصري فوري
 */
const CustomInput = forwardRef<HTMLDivElement, CustomInputProps>(
    ({ variant = 'outlined', startIcon, endIcon, sx, InputProps, ...props }, ref) => {
        const theme = useTheme();

        return (
            <TextField
                ref={ref}
                variant={variant}
                fullWidth
                InputProps={{
                    startAdornment: startIcon ? (
                        <InputAdornment position="start">{startIcon}</InputAdornment>
                    ) : undefined,
                    endAdornment: endIcon ? (
                        <InputAdornment position="end">{endIcon}</InputAdornment>
                    ) : undefined,
                    ...InputProps
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backgroundColor: theme.palette.mode === 'light'
                            ? alpha(theme.palette.common.white, 0.9)
                            : alpha(theme.palette.background.paper, 0.6),

                        '& fieldset': {
                            borderColor: alpha(theme.palette.divider, 0.5),
                            borderWidth: '1.5px',
                            transition: 'all 0.3s'
                        },

                        '&:hover': {
                            backgroundColor: theme.palette.mode === 'light'
                                ? theme.palette.common.white
                                : alpha(theme.palette.background.paper, 0.8),
                            '& fieldset': {
                                borderColor: theme.palette.primary.main,
                                borderWidth: '1.5px'
                            }
                        },

                        '&.Mui-focused': {
                            backgroundColor: theme.palette.mode === 'light'
                                ? theme.palette.common.white
                                : alpha(theme.palette.background.paper, 0.9),
                            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                            '& fieldset': {
                                borderColor: theme.palette.primary.main,
                                borderWidth: '2px'
                            }
                        },

                        '&.Mui-error': {
                            '& fieldset': {
                                borderColor: theme.palette.error.main
                            },
                            '&.Mui-focused': {
                                boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.1)}`
                            }
                        },

                        '&.Mui-disabled': {
                            backgroundColor: alpha(theme.palette.action.disabledBackground, 0.3),
                            '& fieldset': {
                                borderColor: alpha(theme.palette.divider, 0.3)
                            }
                        }
                    },

                    '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        backgroundColor: theme.palette.mode === 'light'
                            ? alpha(theme.palette.grey[200], 0.5)
                            : alpha(theme.palette.grey[800], 0.5),
                        border: `1.5px solid transparent`,
                        transition: 'all 0.3s',

                        '&::before, &::after': {
                            display: 'none'
                        },

                        '&:hover': {
                            backgroundColor: theme.palette.mode === 'light'
                                ? alpha(theme.palette.grey[200], 0.7)
                                : alpha(theme.palette.grey[800], 0.7),
                            borderColor: alpha(theme.palette.primary.main, 0.5)
                        },

                        '&.Mui-focused': {
                            backgroundColor: theme.palette.mode === 'light'
                                ? alpha(theme.palette.grey[100], 0.9)
                                : alpha(theme.palette.grey[800], 0.9),
                            borderColor: theme.palette.primary.main,
                            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
                        }
                    },

                    '& .MuiInputLabel-root': {
                        fontWeight: 500,
                        '&.Mui-focused': {
                            fontWeight: 600
                        }
                    },

                    '& .MuiInputBase-input': {
                        padding: '14px 16px',
                        fontSize: '0.95rem'
                    },

                    ...sx
                }}
                {...props}
            />
        );
    }
);

CustomInput.displayName = 'CustomInput';

export default CustomInput;
