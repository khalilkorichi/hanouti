import { Card, alpha, useTheme, Box } from '@mui/material';
import type { CardProps } from '@mui/material';
import { forwardRef } from 'react';

export interface CustomCardProps extends CardProps {
    /** Adds a subtle lift + glow on hover. */
    hoverEffect?: boolean;
    /** Color used for accent borders and interactive hover ring. */
    borderColor?: string;
    /** Side where the colored accent border is drawn. */
    borderPosition?: 'top' | 'left' | 'right' | 'bottom' | 'none';
    /** Soft primary→secondary gradient background. */
    gradient?: boolean;
    /** Becomes a clickable surface (cursor + active press). */
    interactive?: boolean;
    /** Frosted-glass background (uses backdrop-filter). */
    glassEffect?: boolean;
}

/**
 * CustomCard — application-wide card surface.
 *
 * Visual language (refreshed):
 *   - layered shadow (ambient + contact) instead of flat MUI elevation
 *   - hairline 1px border that adapts to theme mode
 *   - smooth 4px lift + softer shadow ramp on hover
 *   - colored accent borders are full-bleed (4px) and respect RTL via
 *     logical properties (`borderInlineStart` / `borderInlineEnd`)
 *
 * Public API is unchanged: existing callers do not need to be updated.
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
            elevation,
            ...props
        },
        ref,
    ) => {
        const theme = useTheme();
        const isLight = theme.palette.mode === 'light';

        const baseShadow = isLight
            ? `0 1px 2px ${alpha(theme.palette.common.black, 0.04)},
               0 1px 3px ${alpha(theme.palette.common.black, 0.06)}`
            : `0 1px 2px ${alpha(theme.palette.common.black, 0.4)},
               0 2px 6px ${alpha(theme.palette.common.black, 0.45)}`;

        const hoverShadow = isLight
            ? `0 2px 4px ${alpha(theme.palette.common.black, 0.05)},
               0 12px 24px -6px ${alpha(borderColor || theme.palette.primary.main, 0.16)}`
            : `0 4px 8px ${alpha(theme.palette.common.black, 0.5)},
               0 16px 32px -8px ${alpha(borderColor || theme.palette.primary.main, 0.35)}`;

        const getBorderStyles = () => {
            if (borderPosition === 'none' || !borderColor) return {};

            // Use logical properties so accent strips flip correctly under RTL.
            const map: Record<NonNullable<CustomCardProps['borderPosition']>, string> = {
                top: 'borderTop',
                bottom: 'borderBottom',
                left: 'borderInlineStart',
                right: 'borderInlineEnd',
                none: '',
            };
            const prop = map[borderPosition];
            if (!prop) return {};
            return { [prop]: `4px solid ${borderColor}` };
        };

        const getGradientBackground = () => {
            if (!gradient) return undefined;
            return isLight
                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.1)} 0%, ${alpha(theme.palette.secondary.dark, 0.1)} 100%)`;
        };

        const getGlassEffect = () => {
            if (!glassEffect) return {};
            return {
                backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.72 : 0.6),
                backdropFilter: 'blur(14px) saturate(140%)',
                WebkitBackdropFilter: 'blur(14px) saturate(140%)',
                border: `1px solid ${alpha(theme.palette.divider, isLight ? 0.7 : 0.4)}`,
            };
        };

        const wantsLift = hoverEffect || interactive;

        return (
            <Card
                ref={ref}
                elevation={elevation ?? 0}
                sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: getGradientBackground(),
                    border: `1px solid ${alpha(theme.palette.divider, isLight ? 0.9 : 0.6)}`,
                    boxShadow: baseShadow,
                    transition:
                        'transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s cubic-bezier(.2,.8,.2,1), border-color .2s ease',

                    ...(wantsLift && {
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: hoverShadow,
                            borderColor: borderColor
                                ? alpha(borderColor, 0.6)
                                : alpha(theme.palette.primary.main, isLight ? 0.3 : 0.45),
                            '& .card-overlay': { opacity: 1 },
                        },
                    }),

                    ...(interactive && {
                        cursor: 'pointer',
                        '&:active': {
                            transform: 'translateY(-1px)',
                            boxShadow: baseShadow,
                            transitionDuration: '.08s',
                        },
                        '&:focus-visible': {
                            outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
                            outlineOffset: 2,
                        },
                    }),

                    ...getBorderStyles(),
                    ...getGlassEffect(),
                    ...sx,
                }}
                {...props}
            >
                {/* Soft hover overlay (kept for hoverEffect API compatibility) */}
                {hoverEffect && (
                    <Box
                        className="card-overlay"
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                            opacity: 0,
                            transition: 'opacity .3s ease',
                            pointerEvents: 'none',
                            zIndex: 1,
                        }}
                    />
                )}

                <Box sx={{ position: 'relative', zIndex: 2 }}>{children}</Box>
            </Card>
        );
    },
);

CustomCard.displayName = 'CustomCard';

export default CustomCard;
