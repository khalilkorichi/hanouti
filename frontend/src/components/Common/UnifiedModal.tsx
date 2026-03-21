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

const Transition = forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement },
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
    const isLight = theme.palette.mode === 'light';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            TransitionComponent={Transition}
            TransitionProps={{ timeout: { enter: 280, exit: 180 } }}
            PaperProps={{
                elevation: 8,
                sx: {
                    borderRadius: 3.5,
                    overflow: 'hidden',
                }
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: alpha(theme.palette.common.black, 0.55),
                    backdropFilter: 'blur(6px)'
                }
            }}
        >
            {/* dir="rtl" كـ wrapper لأن Dialog يُرسَم في Portal خارج شجرة React */}
            <Box dir="rtl">
                {/* Header */}
                <DialogTitle
                    component="div"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        px: 3,
                        py: 2,
                        background: isLight
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
                        borderBottom: dividers ? `1px solid ${theme.palette.divider}` : 'none',
                    }}
                >
                    <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                        {title}
                    </Typography>
                    {showCloseButton && (
                        <IconButton
                            onClick={onClose}
                            size="small"
                            sx={{
                                color: 'text.secondary',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    color: 'error.main',
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                    transform: 'rotate(90deg)'
                                }
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
                        py: 3,
                        px: 3,
                        borderTop: dividers ? `1px solid ${theme.palette.divider}` : 'none',
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
                                ? alpha(theme.palette.grey[50], 0.8)
                                : alpha(theme.palette.grey[900], 0.6),
                            borderTop: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-start' }}>
                            {actions}
                        </Box>
                    </DialogActions>
                )}
            </Box>
        </Dialog>
    );
}
