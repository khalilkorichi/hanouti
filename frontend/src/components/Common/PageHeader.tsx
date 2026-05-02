import type { ReactNode } from 'react';
import { Box, Stack, Typography, Avatar, useTheme, alpha, type SxProps, type Theme } from '@mui/material';

export interface PageHeaderProps {
    /** Main page title (gradient text) */
    title: string;
    /** Optional subtitle (single line, muted) */
    subtitle?: string;
    /** Avatar icon (rendered inside a gradient circle on the start side) */
    icon?: ReactNode;
    /** Optional emoji shown at the end of the title (e.g. "👋") */
    titleEmoji?: string;
    /** Right-side slot for actions: buttons, selectors, refresh icons, etc. */
    actions?: ReactNode;
    /** Override the leading gradient color (defaults to theme.primary → theme.secondary) */
    accent?: string;
    /** Compact variant for dense pages (smaller padding/avatar/title) */
    compact?: boolean;
    /** Extra sx to merge */
    sx?: SxProps<Theme>;
    /** Disable the decorative radial glow in the corner */
    disableGlow?: boolean;
}

/**
 * PageHeader — unified page-top hero used across every page.
 *
 * Goals:
 *   • One consistent visual language (avatar + gradient title + actions slot)
 *   • Polished dark mode (richer alpha values, subtle inner glow,
 *     border-color that respects divider in dark mode)
 *   • Fully RTL-safe (logical insetInlineEnd / paddingInlineStart)
 *   • Theme-driven (radius from theme.shape, no hardcoded fontFamily)
 */
export default function PageHeader({
    title, subtitle, icon, titleEmoji, actions, accent, compact = false, sx, disableGlow = false,
}: PageHeaderProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const primary = accent || theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;

    /* ── Background tuned per mode ── */
    const bg = isLight
        ? `linear-gradient(135deg, ${alpha(primary, 0.07)} 0%, ${alpha(secondary, 0.04)} 100%)`
        : `linear-gradient(135deg, ${alpha(primary, 0.22)} 0%, ${alpha(secondary, 0.12)} 100%)`;

    /* ── Border: stronger in dark to read against the dark surface ── */
    const borderColor = isLight
        ? alpha(primary, 0.15)
        : alpha(primary, 0.30);

    /* ── Title gradient: brighter in dark mode for contrast ── */
    const titleGradient = isLight
        ? `linear-gradient(135deg, ${primary}, ${secondary})`
        : `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.secondary.light})`;

    const avatarSize = compact ? 44 : 56;
    const titleSize = compact ? { xs: '1.25rem', md: '1.55rem' } : { xs: '1.45rem', md: '1.9rem' };
    const padding = compact ? { xs: 2, md: 2.5 } : { xs: 2.5, md: 3 };

    return (
        <Box
            sx={{
                position: 'relative', overflow: 'hidden',
                p: padding, mb: 3,
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: 3,
                /* Subtle inner highlight in dark mode for depth */
                ...(isLight ? {} : {
                    boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.04)}, 0 1px 2px ${alpha('#000', 0.2)}`,
                }),
                ...sx,
            }}
        >
            {/* Decorative radial glow in the start-corner (RTL-aware) */}
            {!disableGlow && (
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        top: -60, insetInlineEnd: -60,
                        width: 220, height: 220, borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(primary, isLight ? 0.14 : 0.22)} 0%, transparent 70%)`,
                        pointerEvents: 'none',
                    }}
                />
            )}

            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={{ xs: 2, md: 2 }}
                sx={{ position: 'relative', zIndex: 1, width: '100%' }}
            >
                {/* ── Left cluster: avatar + title + subtitle ── */}
                <Stack direction="row" alignItems="center" gap={1.75} sx={{ minWidth: 0, flex: 1 }}>
                    {icon && (
                        <Avatar
                            sx={{
                                width: avatarSize, height: avatarSize,
                                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                                color: '#fff',
                                boxShadow: isLight
                                    ? `0 8px 20px ${alpha(primary, 0.32)}`
                                    : `0 8px 24px ${alpha(primary, 0.45)}, inset 0 1px 0 ${alpha('#fff', 0.15)}`,
                                flexShrink: 0,
                                '& > svg': { fontSize: compact ? 22 : 28 },
                            }}
                        >
                            {icon}
                        </Avatar>
                    )}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            variant={compact ? 'h5' : 'h4'}
                            fontWeight={800}
                            sx={{
                                fontSize: titleSize,
                                lineHeight: 1.15,
                                background: titleGradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                /* keep emoji rendering in full color (not transparent) */
                                '& .pgh-emoji': {
                                    WebkitTextFillColor: 'initial',
                                    backgroundClip: 'initial',
                                    marginInlineStart: '0.4em',
                                },
                            }}
                            noWrap
                        >
                            {title}
                            {titleEmoji && <span className="pgh-emoji">{titleEmoji}</span>}
                        </Typography>
                        {subtitle && (
                            <Typography
                                variant="body2" color="text.secondary" mt={0.4}
                                sx={{
                                    fontWeight: 500,
                                    /* Slightly brighter muted text in dark mode for readability */
                                    color: isLight ? 'text.secondary' : alpha(theme.palette.text.primary, 0.72),
                                }}
                            >
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Stack>

                {/* ── Right cluster: free-form actions ── */}
                {actions && (
                    <Stack
                        direction="row" gap={1} alignItems="center"
                        flexWrap="wrap"
                        sx={{
                            width: { xs: '100%', md: 'auto' },
                            justifyContent: { xs: 'flex-start', md: 'flex-end' },
                            flexShrink: 0,
                        }}
                    >
                        {actions}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}
