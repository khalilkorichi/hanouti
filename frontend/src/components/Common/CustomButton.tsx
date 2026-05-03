import { Button, alpha, useTheme, CircularProgress } from '@mui/material';
import type { ButtonProps } from '@mui/material';
import { forwardRef } from 'react';
import type { ReactNode } from 'react';

export interface CustomButtonProps extends ButtonProps {
    loading?: boolean;
    icon?: ReactNode;
    gradient?: boolean;
}

/**
 * CustomButton - زر مخصص بتصميم احترافي
 * 
 * المميزات:
 * - زوايا دائرية (Rounded)
 * - تأثيرات hover وانتقالية سلسة
 * - دعم حالة التحميل (loading)
 * - خيار التدرج اللوني (gradient)
 * - أيقونات اختيارية
 * - تصميم موحد عبر التطبيق
 */
const CustomButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
    ({ loading = false, icon, gradient = false, children, disabled, sx, variant = 'contained', ...props }, ref) => {
        const theme = useTheme();

        const getGradientStyles = () => {
            if (!gradient || variant !== 'contained') return {};

            return {
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`
                }
            };
        };

        return (
            <Button
                ref={ref}
                variant={variant}
                disabled={disabled || loading}
                sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    padding: '10px 24px',
                    textTransform: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

                    // تأثيرات الزر الأساسي
                    ...(variant === 'contained' && !gradient && {
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                        '&:hover': {
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                            transform: 'translateY(-2px)'
                        },
                        '&:active': {
                            transform: 'translateY(0px)',
                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`
                        }
                    }),

                    // تأثيرات الزر المحدد
                    ...(variant === 'outlined' && {
                        borderWidth: '2px',
                        '&:hover': {
                            borderWidth: '2px',
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                        }
                    }),

                    // تأثيرات الزر النصي
                    ...(variant === 'text' && {
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            transform: 'translateX(-2px)'
                        }
                    }),

                    // تدرج لوني
                    ...getGradientStyles(),

                    // تأثير الموجة عند الضغط
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: 0,
                        height: 0,
                        borderRadius: '50%',
                        background: alpha(theme.palette.common.white, 0.5),
                        transform: 'translate(-50%, -50%)',
                        transition: 'width 0.6s, height 0.6s'
                    },

                    '&:active::before': {
                        width: '300px',
                        height: '300px',
                        opacity: 0
                    },

                    // حالة التعطيل — لمسة بنفسجية خافتة بدلاً من الرمادي
                    ...(variant === 'contained' && {
                        '&.Mui-disabled': {
                            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.18 : 0.28),
                            color: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.55 : 0.75),
                            boxShadow: 'none',
                        },
                    }),
                    ...(variant === 'outlined' && {
                        '&.Mui-disabled': {
                            borderColor: alpha(theme.palette.primary.main, 0.25),
                            color: alpha(theme.palette.primary.main, 0.45),
                        },
                    }),
                    ...(variant === 'text' && {
                        '&.Mui-disabled': {
                            color: alpha(theme.palette.primary.main, 0.4),
                        },
                    }),

                    ...sx
                }}
                {...props}
            >
                {loading ? (
                    <>
                        <CircularProgress
                            size={20}
                            sx={{
                                color: variant === 'contained' ? 'inherit' : theme.palette.primary.main,
                                marginInlineEnd: 1
                            }}
                        />
                        <span style={{ marginInlineStart: 8 }}>جاري المعالجة...</span>
                    </>
                ) : (
                    <>
                        {icon && <span style={{ marginInlineEnd: 8, display: 'flex', alignItems: 'center' }}>{icon}</span>}
                        {children}
                    </>
                )}
            </Button>
        );
    }
);

CustomButton.displayName = 'CustomButton';

export default CustomButton;
