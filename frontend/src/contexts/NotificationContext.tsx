// @refresh reset
import React, {
    createContext, useContext, useCallback, useReducer, useEffect, useRef, useState
} from 'react';
import { Box, Typography, IconButton, alpha } from '@mui/material';
import {
    CheckCircleOutlined as SuccessIcon,
    ErrorOutlined as ErrorIcon,
    WarningAmberOutlined as WarningIcon,
    InfoOutlined as InfoIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

/* ════════════════════════════════════════
   Types
════════════════════════════════════════ */
export type NotifSeverity = 'success' | 'error' | 'warning' | 'info';

export interface NotifAction {
    label: string;
    onClick: () => void;
}

export interface Notification {
    id: string;
    message: string;
    title?: string;
    severity: NotifSeverity;
    duration: number;
    action?: NotifAction;
}

interface ShowOptions {
    title?: string;
    duration?: number;
    action?: NotifAction;
}

interface NotificationContextType {
    showNotification: (message: string, severity?: NotifSeverity, opts?: ShowOptions) => string;
    dismissNotification: (id: string) => void;
    dismissAll: () => void;
}

/* ════════════════════════════════════════
   Constants
════════════════════════════════════════ */
const DEFAULT_DURATIONS: Record<NotifSeverity, number> = {
    success: 4000,
    info: 5000,
    warning: 6000,
    error: 8000,
};

const MAX_VISIBLE = 5;

/* ════════════════════════════════════════
   Reducer
════════════════════════════════════════ */
type ReducerAction =
    | { type: 'ADD'; payload: Notification }
    | { type: 'REMOVE'; id: string }
    | { type: 'CLEAR' };

function reducer(state: Notification[], action: ReducerAction): Notification[] {
    switch (action.type) {
        case 'ADD':
            return [action.payload, ...state].slice(0, MAX_VISIBLE);
        case 'REMOVE':
            return state.filter(n => n.id !== action.id);
        case 'CLEAR':
            return [];
        default:
            return state;
    }
}

/* ════════════════════════════════════════
   Context
════════════════════════════════════════ */
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = (): NotificationContextType => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
    return ctx;
};

/* ════════════════════════════════════════
   Provider
════════════════════════════════════════ */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, dispatch] = useReducer(reducer, []);

    const showNotification = useCallback(
        (message: string, severity: NotifSeverity = 'info', opts?: ShowOptions): string => {
            const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const duration = opts?.duration ?? DEFAULT_DURATIONS[severity];
            dispatch({
                type: 'ADD',
                payload: {
                    id,
                    message,
                    severity,
                    duration,
                    title: opts?.title,
                    action: opts?.action,
                }
            });
            return id;
        },
        []
    );

    const dismissNotification = useCallback((id: string) => {
        dispatch({ type: 'REMOVE', id });
    }, []);

    const dismissAll = useCallback(() => {
        dispatch({ type: 'CLEAR' });
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification, dismissNotification, dismissAll }}>
            {children}
            <NotificationStack notifications={notifications} onDismiss={dismissNotification} />
        </NotificationContext.Provider>
    );
};

/* ════════════════════════════════════════
   Stack container
════════════════════════════════════════ */
function NotificationStack({
    notifications,
    onDismiss,
}: {
    notifications: Notification[];
    onDismiss: (id: string) => void;
}) {
    if (notifications.length === 0) return null;

    return (
        <Box
            dir="ltr"
            aria-live="polite"
            aria-label="الإشعارات"
            sx={{
                position: 'fixed',
                top: 16,
                right: 16,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                width: 360,
                maxWidth: 'calc(100vw - 32px)',
                pointerEvents: 'none',
            }}
        >
            {notifications.map((notif) => (
                <NotifCard key={notif.id} notif={notif} onDismiss={onDismiss} />
            ))}
        </Box>
    );
}

/* ════════════════════════════════════════
   Severity config
════════════════════════════════════════ */
const SEVERITY_CONFIG: Record<NotifSeverity, {
    icon: React.ReactNode;
    bg: string;
    border: string;
    progressColor: string;
    titleColor: string;
}> = {
    success: {
        icon: <SuccessIcon sx={{ fontSize: 18 }} />,
        bg: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
        border: '#10B981',
        progressColor: '#6EE7B7',
        titleColor: '#D1FAE5',
    },
    error: {
        icon: <ErrorIcon sx={{ fontSize: 18 }} />,
        bg: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
        border: '#EF4444',
        progressColor: '#FCA5A5',
        titleColor: '#FEE2E2',
    },
    warning: {
        icon: <WarningIcon sx={{ fontSize: 18 }} />,
        bg: 'linear-gradient(135deg, #78350F 0%, #92400E 100%)',
        border: '#F59E0B',
        progressColor: '#FCD34D',
        titleColor: '#FEF3C7',
    },
    info: {
        icon: <InfoIcon sx={{ fontSize: 18 }} />,
        bg: 'linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%)',
        border: '#3B82F6',
        progressColor: '#93C5FD',
        titleColor: '#DBEAFE',
    },
};

/* ════════════════════════════════════════
   Single notification card
════════════════════════════════════════ */
function NotifCard({ notif, onDismiss }: { notif: Notification; onDismiss: (id: string) => void }) {
    const [progress, setProgress] = useState(100);
    const [isExiting, setIsExiting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const startRef = useRef<number>(Date.now());
    const remainingRef = useRef<number>(notif.duration);
    const rafRef = useRef<number | null>(null);

    const cfg = SEVERITY_CONFIG[notif.severity];
    const hasDuration = notif.duration > 0;

    const dismiss = useCallback(() => {
        if (isExiting) return;
        setIsExiting(true);
        setTimeout(() => onDismiss(notif.id), 330);
    }, [isExiting, notif.id, onDismiss]);

    useEffect(() => {
        if (!hasDuration) return;

        const tick = () => {
            if (isPaused) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            const elapsed = Date.now() - startRef.current;
            const pct = Math.max(0, 100 - (elapsed / notif.duration) * 100);
            setProgress(pct);
            if (pct <= 0) {
                dismiss();
            } else {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [hasDuration, notif.duration, isPaused, dismiss]);

    const handleMouseEnter = () => {
        if (!hasDuration) return;
        setIsPaused(true);
        remainingRef.current = notif.duration * (progress / 100);
    };

    const handleMouseLeave = () => {
        if (!hasDuration) return;
        startRef.current = Date.now() - (notif.duration - remainingRef.current);
        setIsPaused(false);
    };

    return (
        <Box
            role="alert"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            sx={{
                pointerEvents: 'auto',
                borderRadius: 2.5,
                overflow: 'hidden',
                background: cfg.bg,
                border: `1px solid ${alpha(cfg.border, 0.45)}`,
                boxShadow: `0 12px 40px ${alpha('#000', 0.4)}, 0 0 0 1px ${alpha(cfg.border, 0.12)}, inset 0 1px 0 ${alpha('#fff', 0.08)}`,
                animation: isExiting
                    ? 'slideOut 0.33s cubic-bezier(0.4, 0, 1, 1) forwards'
                    : 'slideIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                '@keyframes slideIn': {
                    '0%': { opacity: 0, transform: 'translateX(110%) scale(0.9)' },
                    '100%': { opacity: 1, transform: 'translateX(0) scale(1)' },
                },
                '@keyframes slideOut': {
                    '0%': { opacity: 1, transform: 'translateX(0) scale(1)', maxHeight: '200px', marginBottom: 0 },
                    '60%': { opacity: 0 },
                    '100%': { opacity: 0, transform: 'translateX(110%) scale(0.9)', maxHeight: '0px', marginBottom: '-10px' },
                },
                willChange: 'transform, opacity',
            }}
        >
            {/* Body */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: '14px 14px 10px 14px' }}>
                {/* Icon */}
                <Box
                    sx={{
                        color: cfg.border,
                        flexShrink: 0,
                        mt: '1px',
                        filter: `drop-shadow(0 0 5px ${alpha(cfg.border, 0.7)})`,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {cfg.icon}
                </Box>

                {/* Text area */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {notif.title && (
                        <Typography
                            sx={{
                                display: 'block',
                                color: cfg.titleColor,
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                lineHeight: 1.3,
                                mb: 0.3,
                                letterSpacing: '0.01em',
                            }}
                        >
                            {notif.title}
                        </Typography>
                    )}
                    <Typography
                        sx={{
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: 500,
                            fontSize: '0.82rem',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                        }}
                    >
                        {notif.message}
                    </Typography>

                    {/* Action */}
                    {notif.action && (
                        <Box
                            component="button"
                            onClick={() => { notif.action!.onClick(); dismiss(); }}
                            sx={{
                                mt: 1,
                                px: 1.5,
                                py: 0.4,
                                borderRadius: 1.5,
                                border: `1px solid ${alpha(cfg.border, 0.55)}`,
                                bgcolor: alpha(cfg.border, 0.18),
                                color: cfg.titleColor,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                transition: 'all 0.18s',
                                display: 'inline-block',
                                lineHeight: '1.4',
                                '&:hover': {
                                    bgcolor: alpha(cfg.border, 0.35),
                                    borderColor: cfg.border,
                                    transform: 'translateY(-1px)',
                                },
                                '&:active': { transform: 'translateY(0)' },
                            }}
                        >
                            {notif.action.label}
                        </Box>
                    )}
                </Box>

                {/* Close */}
                <IconButton
                    size="small"
                    onClick={dismiss}
                    sx={{
                        color: 'rgba(255,255,255,0.45)',
                        width: 22,
                        height: 22,
                        flexShrink: 0,
                        mt: '-2px',
                        mr: '-2px',
                        transition: 'all 0.18s',
                        '&:hover': {
                            color: '#fff',
                            bgcolor: 'rgba(255,255,255,0.12)',
                            transform: 'scale(1.1)',
                        },
                    }}
                >
                    <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
            </Box>

            {/* Progress bar */}
            {hasDuration && (
                <Box sx={{ px: 1.75, pb: '10px' }}>
                    <Box
                        sx={{
                            height: 2.5,
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                height: '100%',
                                width: `${progress}%`,
                                bgcolor: cfg.progressColor,
                                borderRadius: 2,
                                boxShadow: `0 0 8px ${cfg.progressColor}`,
                                transition: isPaused ? 'none' : 'width 0.08s linear',
                            }}
                        />
                    </Box>
                </Box>
            )}
        </Box>
    );
}
