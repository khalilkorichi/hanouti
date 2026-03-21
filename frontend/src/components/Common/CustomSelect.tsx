import { TextField, MenuItem, alpha, useTheme } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';
import type { ReactNode } from 'react';

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
    icon?: ReactNode;
}

export interface CustomSelectProps extends Omit<TextFieldProps, 'select'> {
    options: SelectOption[];
}

/**
 * CustomSelect - قائمة اختيار مخصصة مع تصميم موحد
 * 
 * المميزات:
 * - زوايا دائرية (Rounded)
 * - تأثيرات hover وfocus محسنة
 * - دعم الأيقونات في الخيارات
 * - تصميم متسق مع CustomInput
 * - دعم RTL كامل
 */
const CustomSelect = forwardRef<HTMLDivElement, CustomSelectProps>(
    ({ options, sx, SelectProps, ...props }, ref) => {
        const theme = useTheme();

        return (
            <TextField
                ref={ref}
                select
                fullWidth
                SelectProps={{
                    MenuProps: {
                        PaperProps: {
                            elevation: 8,
                            sx: {
                                borderRadius: 2,
                                mt: 1,
                                maxHeight: 300,
                                '& .MuiMenuItem-root': {
                                    borderRadius: 1.5,
                                    mx: 1,
                                    my: 0.5,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        transform: 'translateX(-4px)'
                                    },
                                    '&.Mui-selected': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                        fontWeight: 600,
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.2)
                                        }
                                    }
                                }
                            }
                        }
                    },
                    ...SelectProps
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
                        }
                    },

                    '& .MuiSelect-icon': {
                        transition: 'transform 0.3s',
                        color: theme.palette.text.secondary
                    },

                    '& .MuiOutlinedInput-root.Mui-focused .MuiSelect-icon': {
                        transform: 'rotate(180deg)',
                        color: theme.palette.primary.main
                    },

                    ...sx
                }}
                {...props}
            >
                {options.map((option) => (
                    <MenuItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        {option.icon && option.icon}
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
        );
    }
);

CustomSelect.displayName = 'CustomSelect';

export default CustomSelect;
