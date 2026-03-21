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
    alpha
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef } from 'react';

// Transition animation
const Transition = forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface UnifiedModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    actions?: ReactNode;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    fullWidth?: boolean;
    showCloseButton?: boolean;
    dividers?: boolean;
}

/**
 * UnifiedModal - نافذة منبثقة موحدة لجميع أجزاء التطبيق
 * 
 * المميزات:
 * - تصميم موحد عبر التطبيق
 * - انتقالات سلسة (Fade + Slide)
 * - دعم RTL
 * - زوايا دائرية (Rounded)
 * - رأس/جسم/تذييل محددة
 */
export default function UnifiedModal({
    open,
    onClose,
    title,
    children,
    actions,
    maxWidth = 'sm',
    fullWidth = true,
    showCloseButton = true,
    dividers = true
}: UnifiedModalProps) {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            TransitionComponent={Transition}
            TransitionProps={{
                timeout: {
                    enter: 300,
                    exit: 200
                }
            }}
            PaperProps={{
                elevation: 8,
                sx: {
                    borderRadius: 3,
                    overflow: 'hidden',
                    // Add subtle animation on open
                    animation: 'scaleIn 0.3s ease-out',
                    '@keyframes scaleIn': {
                        '0%': {
                            transform: 'scale(0.9)',
                            opacity: 0
                        },
                        '100%': {
                            transform: 'scale(1)',
                            opacity: 1
                        }
                    }
                }
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: alpha(theme.palette.common.black, 0.6),
                    backdropFilter: 'blur(4px)'
                }
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 2,
                    background: theme.palette.mode === 'light'
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
                        : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                    borderBottom: dividers ? `1px solid ${theme.palette.divider}` : 'none'
                }}
            >
                <Typography variant="h6" component="div" fontWeight="bold">
                    {title}
                </Typography>
                {showCloseButton && (
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            color: theme.palette.text.secondary,
                            transition: 'all 0.2s',
                            '&:hover': {
                                color: theme.palette.error.main,
                                backgroundColor: alpha(theme.palette.error.main, 0.1),
                                transform: 'rotate(90deg)'
                            }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                )}
            </DialogTitle>

            {/* Content */}
            <DialogContent
                dividers={dividers}
                sx={{
                    py: 3,
                    px: 3
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
                        background: theme.palette.mode === 'light'
                            ? alpha(theme.palette.grey[50], 0.5)
                            : alpha(theme.palette.grey[900], 0.5),
                        borderTop: dividers ? `1px solid ${theme.palette.divider}` : 'none'
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-end' }}>
                        {actions}
                    </Box>
                </DialogActions>
            )}
        </Dialog>
    );
}
