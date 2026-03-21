import { Card, alpha, useTheme, Box } from '@mui/material';
import type { CardProps } from '@mui/material';
import { forwardRef } from 'react';

export interface CustomCardProps extends CardProps {
    hoverEffect?: boolean;
    borderColor?: string;
    borderPosition?: 'top' | 'left' | 'right' | 'bottom' | 'none';
    gradient?: boolean;
    interactive?: boolean;
    glassEffect?: boolean;
}

/**
 * CustomCard - بطاقة مخصصة بتصميم احترافي
 * 
 * المميزات:
 * - زوايا دائرية (Rounded)
 * - تأثيرات hover اختيارية
 * - حدود ملونة قابلة للتخصيص
 * - تأثير الزجاج (glassmorphism)
 * - تدرجات لونية خلفية
 * - تصميم تفاعلي للأزرار/الروابط
 */
const CustomCard = forwardRef<HTMLDivElement, CustomCardProps>(
    (
        {
            hoverEffect = false,
            borderColor,
            borderPosition = 'none',
            gradient = false,
            interactive = false,
            glassEffect = false,
            children,
            sx,
            elevation = 2,
            ...props
        },
        ref
    ) => {
        const theme = useTheme();

        const getBorderStyles = () => {
            if (borderPosition === 'none' || !borderColor) return {};

            const borderWidth = '4px';
            return {
                [`border${borderPosition.charAt(0).toUpperCase() + borderPosition.slice(1)}`]: `${borderWidth} solid ${borderColor}`
            };
        };

        const getGradientBackground = () => {
            if (!gradient) return undefined;

            return theme.palette.mode === 'light'
                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(
                    theme.palette.secondary.main,
                    0.05
                )} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.1)} 0%, ${alpha(
                    theme.palette.secondary.dark,
                    0.1
                )} 100%)`;
        };

        const getGlassEffect = () => {
            if (!glassEffect) return {};

            return {
                backgroundColor: alpha(theme.palette.background.paper, 0.7),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            };
        };

        return (
            <Card
                ref={ref}
                elevation={elevation}
                sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: getGradientBackground(),

                    ...(hoverEffect && {
                        '&:hover': {
                            transform: 'translateY(-8px)',
                            boxShadow: theme.shadows[8],
                            '& .card-overlay': {
                                opacity: 1
                            }
                        }
                    }),

                    ...(interactive && {
                        cursor: 'pointer',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                            borderColor: borderColor ? alpha(borderColor, 0.8) : undefined
                        },
                        '&:active': {
                            transform: 'translateY(-2px)',
                            boxShadow: theme.shadows[4]
                        }
                    }),

                    ...getBorderStyles(),
                    ...getGlassEffect(),
                    ...sx
                }}
                {...props}
            >
                {/* تأثير التراكب عند الـ hover */}
                {hoverEffect && (
                    <Box
                        className="card-overlay"
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `linear-gradient(135deg, ${alpha(
                                theme.palette.primary.main,
                                0.05
                            )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                            opacity: 0,
                            transition: 'opacity 0.3s',
                            pointerEvents: 'none',
                            zIndex: 1
                        }}
                    />
                )}

                {/* محتوى البطاقة */}
                <Box sx={{ position: 'relative', zIndex: 2 }}>
                    {children}
                </Box>
            </Card>
        );
    }
);

CustomCard.displayName = 'CustomCard';

export default CustomCard;
