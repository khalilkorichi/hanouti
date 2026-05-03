import type { ReactNode } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { CheckRounded } from '@mui/icons-material';

interface OnboardingOptionCardProps {
    icon: ReactNode;
    label: string;
    selected: boolean;
    onClick: () => void;
}

export default function OnboardingOptionCard({
    icon,
    label,
    selected,
    onClick,
}: OnboardingOptionCardProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    return (
        <Box
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            sx={{
                position: 'relative',
                cursor: 'pointer',
                userSelect: 'none',
                p: 2.5,
                borderRadius: 3,
                border: `2px solid ${
                    selected
                        ? theme.palette.primary.main
                        : alpha(theme.palette.divider, 0.6)
                }`,
                background: selected
                    ? alpha(theme.palette.primary.main, isLight ? 0.08 : 0.18)
                    : isLight
                      ? '#FFFFFF'
                      : alpha(theme.palette.background.paper, 0.6),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.25,
                minHeight: 130,
                transition:
                    'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s, background 0.18s, box-shadow 0.18s',
                transform: selected ? 'translateY(-2px) scale(1.02)' : 'none',
                boxShadow: selected
                    ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`
                    : 'none',
                '&:hover': {
                    borderColor: theme.palette.primary.main,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.18)}`,
                },
                '&:focus-visible': {
                    outline: `3px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    outlineOffset: 2,
                },
            }}
        >
            {selected && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 8,
                        insetInlineEnd: 8,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.45)}`,
                        animation: 'cardCheckIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        '@keyframes cardCheckIn': {
                            '0%': { transform: 'scale(0)' },
                            '100%': { transform: 'scale(1)' },
                        },
                    }}
                >
                    <CheckRounded sx={{ fontSize: 16 }} />
                </Box>
            )}

            <Box
                sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: selected
                        ? alpha(theme.palette.primary.main, 0.18)
                        : alpha(theme.palette.primary.main, isLight ? 0.06 : 0.1),
                    color: 'primary.main',
                    transition: 'background 0.18s',
                    '& svg': { fontSize: 28 },
                }}
            >
                {icon}
            </Box>

            <Typography
                fontWeight={700}
                sx={{
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    color: selected ? 'primary.main' : 'text.primary',
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}
