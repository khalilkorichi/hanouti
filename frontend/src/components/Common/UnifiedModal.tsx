import type { ReactNode } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Typography,
    Box,
    Slide,
    useTheme,
    alpha,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef } from 'react';

const Transition = forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export type ModalSeverity = 'default' | 'info' | 'success' | 'warning' | 'error';

interface UnifiedModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    /** Optional secondary line shown below the title in lighter weight. */
    subtitle?: string;
    /** Optional leading icon shown next to the title (e.g. <DeleteIcon />). */
    icon?: ReactNode;
    children: ReactNode;
    actions?: ReactNode;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    fullWidth?: boolean;
    showCloseButton?: boolean;
    /** Visible separator between header/content/actions. Defaults to false for the new airy look. */
    dividers?: boolean;
    /**
     * Tints the top accent strip + icon background. Defaults to "default" (primary).
     * Used to communicate intent at a glance — match the user-facing meaning of the modal.
     */
    severity?: ModalSeverity;
    /** Disable the colored top accent stripe entirely. */
    hideAccent?: boolean;
}

/**
 * UnifiedModal — application-wide dialog shell.
 *
 * Visual language:
 *   - 20px corner radius (matches modern macOS/iOS sheets)
 *   - layered shadow (soft ambient glow + tight contact shadow)
 *   - thin colored accent strip on top (severity-aware)
 *   - blurred, dimmed backdrop with vignette
 *   - airy header with optional icon + subtitle
 *   - compact footer with subtle gradient separator
 *
 * The component remains API-compatible with the previous version: callers
 * who only pass {open,onClose,title,children,actions} keep working unchanged.
 */
export default function UnifiedModal({
    open,
    onClose,
    title,
    subtitle,
    icon,
    children,
    actions,
    maxWidth = 'sm',
    fullWidth = true,
    showCloseButton = true,
    dividers = false,
    severity = 'default',
    hideAccent = false,
}: UnifiedModalProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';

    const accentColor =
        severity === 'success' ? theme.palette.success.main
        : severity === 'warning' ? theme.palette.warning.main
        : severity === 'error' ? theme.palette.error.main
        : severity === 'info' ? theme.palette.info.main
        : theme.palette.primary.main;

    // Layered shadow — ambient glow + contact shadow gives modals a real
    // "lifted" feel without the harsh flat MUI elevation 8 default.
    const layeredShadow = isLight
        ? `0 1px 2px ${alpha(theme.palette.common.black, 0.06)},
           0 12px 28px -6px ${alpha(theme.palette.common.black, 0.18)},
           0 32px 64px -12px ${alpha(theme.palette.common.black, 0.22)},
           0 0 0 1px ${alpha(theme.palette.common.black, 0.04)}`
        : `0 1px 2px ${alpha(theme.palette.common.black, 0.4)},
           0 12px 28px -6px ${alpha(theme.palette.common.black, 0.6)},
           0 32px 64px -12px ${alpha(theme.palette.common.black, 0.7)},
           0 0 0 1px ${alpha(theme.palette.common.white, 0.06)}`;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            TransitionComponent={Transition}
            TransitionProps={{ timeout: { enter: 320, exit: 220 } }}
            PaperProps={{
                elevation: 0,
                sx: {
                    borderRadius: 4, // 4 * 8 = 32 token; with theme override → ~20px feel
                    overflow: 'hidden',
                    boxShadow: layeredShadow,
                    // Subtle inner highlight on top edge in dark mode
                    backgroundImage: isLight
                        ? 'none'
                        : `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.02)} 0%, transparent 24px)`,
                },
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: alpha(theme.palette.common.black, isLight ? 0.42 : 0.62),
                    backdropFilter: 'blur(8px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                },
            }}
        >
            {/* dir="rtl" wrapper because Dialog is portaled outside the React tree */}
            <Box dir="rtl" sx={{ position: 'relative' }}>
                {/* Colored accent strip — subtle severity cue */}
                {!hideAccent && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            insetInlineStart: 0,
                            insetInlineEnd: 0,
                            height: 3,
                            background: `linear-gradient(90deg, ${alpha(accentColor, 0)} 0%, ${accentColor} 18%, ${accentColor} 82%, ${alpha(accentColor, 0)} 100%)`,
                            zIndex: 1,
                            pointerEvents: 'none',
                        }}
                    />
                )}

                {/* Header */}
                <DialogTitle
                    component="div"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        px: 3,
                        pt: 2.5,
                        pb: subtitle ? 2 : 2.25,
                        borderBottom: dividers ? `1px solid ${theme.palette.divider}` : 'none',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                        {icon && (
                            <Box
                                sx={{
                                    flex: '0 0 auto',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    color: accentColor,
                                    background: alpha(accentColor, isLight ? 0.1 : 0.18),
                                    border: `1px solid ${alpha(accentColor, isLight ? 0.18 : 0.28)}`,
                                    '& > svg': { fontSize: 22 },
                                }}
                            >
                                {icon}
                            </Box>
                        )}
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={{ lineHeight: 1.25, letterSpacing: 0.1 }}
                                noWrap
                            >
                                {title}
                            </Typography>
                            {subtitle && (
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'text.secondary', mt: 0.25, lineHeight: 1.4 }}
                                >
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {showCloseButton && (
                        <IconButton
                            onClick={onClose}
                            size="small"
                            aria-label="إغلاق"
                            sx={{
                                flex: '0 0 auto',
                                width: 36,
                                height: 36,
                                color: 'text.secondary',
                                bgcolor: alpha(theme.palette.text.primary, isLight ? 0.04 : 0.08),
                                transition: 'transform .25s ease, background-color .2s ease, color .2s ease',
                                '&:hover': {
                                    color: 'error.main',
                                    bgcolor: alpha(theme.palette.error.main, 0.12),
                                    transform: 'rotate(90deg)',
                                },
                                '&:focus-visible': {
                                    outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
                                    outlineOffset: 2,
                                },
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </DialogTitle>

                {/* Content */}
                <DialogContent
                    dividers={false}
                    sx={{
                        py: 2.5,
                        px: 3,
                        borderTop: dividers ? `1px solid ${theme.palette.divider}` : 'none',
                        // Smooth scrollbar styling for long content
                        '&::-webkit-scrollbar': { width: 8 },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: alpha(theme.palette.text.primary, 0.18),
                            borderRadius: 8,
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            backgroundColor: alpha(theme.palette.text.primary, 0.3),
                        },
                    }}
                >
                    {children}
                </DialogContent>

                {/* Actions */}
                {actions && (
                    <DialogActions
                        sx={{
                            px: 3,
                            py: 2,
                            background: isLight
                                ? `linear-gradient(180deg, ${alpha(theme.palette.grey[100], 0)} 0%, ${alpha(theme.palette.grey[100], 0.85)} 100%)`
                                : `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0)} 0%, ${alpha(theme.palette.common.black, 0.32)} 100%)`,
                            borderTop: `1px solid ${alpha(theme.palette.divider, isLight ? 0.7 : 0.5)}`,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1,
                                width: '100%',
                                justifyContent: 'flex-start',
                                flexWrap: 'wrap',
                            }}
                        >
                            {actions}
                        </Box>
                    </DialogActions>
                )}
            </Box>
        </Dialog>
    );
}
