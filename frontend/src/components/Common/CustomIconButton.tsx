import { IconButton as MuiIconButton, type IconButtonProps, Tooltip, alpha, useTheme } from '@mui/material';

interface CustomIconButtonProps extends Omit<IconButtonProps, 'color'> {
    tooltip?: string;
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    enableHoverEffect?: boolean;
}

/**
 * CustomIconButton - زر أيقونة مخصص مع تأثيرات بصرية محسنة
 * 
 * المميزات:
 * - زوايا دائرية (Rounded)
 * - تأثيرات hover متحركة
 * - دعم tooltip
 * - ألوان متنوعة (variants)
 * - تأثيرات الظل والتحجيم
 */
export default function CustomIconButton({
    tooltip,
    variant = 'default',
    enableHoverEffect = true,
    children,
    sx,
    size = 'medium',
    ...props
}: CustomIconButtonProps) {
    const theme = useTheme();

    // تحديد الألوان حسب النوع
    const getVariantColors = () => {
        switch (variant) {
            case 'primary':
                return {
                    color: theme.palette.primary.main,
                    hoverBg: alpha(theme.palette.primary.main, 0.1),
                    activeBg: alpha(theme.palette.primary.main, 0.2)
                };
            case 'secondary':
                return {
                    color: theme.palette.secondary.main,
                    hoverBg: alpha(theme.palette.secondary.main, 0.1),
                    activeBg: alpha(theme.palette.secondary.main, 0.2)
                };
            case 'success':
                return {
                    color: theme.palette.success.main,
                    hoverBg: alpha(theme.palette.success.main, 0.1),
                    activeBg: alpha(theme.palette.success.main, 0.2)
                };
            case 'warning':
                return {
                    color: theme.palette.warning.main,
                    hoverBg: alpha(theme.palette.warning.main, 0.1),
                    activeBg: alpha(theme.palette.warning.main, 0.2)
                };
            case 'error':
                return {
                    color: theme.palette.error.main,
                    hoverBg: alpha(theme.palette.error.main, 0.1),
                    activeBg: alpha(theme.palette.error.main, 0.2)
                };
            case 'info':
                return {
                    color: theme.palette.info.main,
                    hoverBg: alpha(theme.palette.info.main, 0.1),
                    activeBg: alpha(theme.palette.info.main, 0.2)
                };
            default:
                return {
                    color: theme.palette.text.primary,
                    hoverBg: alpha(theme.palette.text.primary, 0.08),
                    activeBg: alpha(theme.palette.text.primary, 0.12)
                };
        }
    };

    const colors = getVariantColors();

    const buttonElement = (
        <MuiIconButton
            size={size}
            sx={{
                color: colors.color,
                borderRadius: 2,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(enableHoverEffect && {
                    '&:hover': {
                        backgroundColor: colors.hoverBg,
                        transform: 'scale(1.1)',
                        boxShadow: `0 4px 12px ${alpha(colors.color, 0.2)}`
                    },
                    '&:active': {
                        backgroundColor: colors.activeBg,
                        transform: 'scale(0.95)'
                    }
                }),
                // تأثير النبض عند الضغط
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 'inherit',
                    opacity: 0,
                    transition: 'opacity 0.3s',
                    pointerEvents: 'none'
                },
                '&:active::after': {
                    opacity: 0.3,
                    background: `radial-gradient(circle, ${colors.color} 1%, transparent 1%)`,
                    backgroundSize: '100%',
                    animation: 'ripple 0.6s'
                },
                '@keyframes ripple': {
                    '0%': {
                        transform: 'scale(0)',
                        opacity: 1
                    },
                    '100%': {
                        transform: 'scale(2.5)',
                        opacity: 0
                    }
                },
                ...sx
            }}
            {...props}
        >
            {children}
        </MuiIconButton>
    );

    // إضافة Tooltip إذا كان موجوداً
    if (tooltip) {
        return (
            <Tooltip title={tooltip} arrow placement="top">
                <span>{buttonElement}</span>
            </Tooltip>
        );
    }

    return buttonElement;
}
