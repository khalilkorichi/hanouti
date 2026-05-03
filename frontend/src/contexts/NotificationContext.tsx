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
import { useAppTheme, type ToastPosition } from './ThemeContext';

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

export interface NotifHistoryItem {
    id: string;
    message: string;
    title?: string;
    severity: NotifSeverity;
    read: boolean;
    receivedAt: number;
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
    history: NotifHistoryItem[];
    unreadCount: number;
    markAllAsRead: () => void;
    markAsRead: (id: string) => void;
    clearHistory: () => void;
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
const MAX_HISTORY = 100;

/* ════════════════════════════════════════
   Toast reducer
════════════════════════════════════════ */
type ToastAction =
    | { type: 'ADD'; payload: Notification }
    | { type: 'REMOVE'; id: string }
    | { type: 'CLEAR' };

function toastReducer(state: Notification[], action: ToastAction): Notification[] {
    switch (action.type) {
        case 'ADD': return [action.payload, ...state].slice(0, MAX_VISIBLE);
        case 'REMOVE': return state.filter(n => n.id !== action.id);
        case 'CLEAR': return [];
        default: return state;
    }
}

/* ════════════════════════════════════════
   History reducer
════════════════════════════════════════ */
type HistoryAction =
    | { type: 'ADD'; payload: NotifHistoryItem }
    | { type: 'MARK_READ'; id: string }
    | { type: 'MARK_ALL_READ' }
    | { type: 'CLEAR' };

function historyReducer(state: NotifHistoryItem[], action: HistoryAction): NotifHistoryItem[] {
    switch (action.type) {
        case 'ADD': return [action.payload, ...state].slice(0, MAX_HISTORY);
        case 'MARK_READ': return state.map(h => h.id === action.id ? { ...h, read: true } : h);
        case 'MARK_ALL_READ': return state.map(h => ({ ...h, read: true }));
        case 'CLEAR': return [];
        default: return state;
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
    const [toasts, dispatchToast] = useReducer(toastReducer, []);
    const [history, dispatchHistory] = useReducer(historyReducer, []);

    const unreadCount = history.filter(h => !h.read).length;

    const showNotification = useCallback(
        (message: string, severity: NotifSeverity = 'info', opts?: ShowOptions): string => {
            const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const duration = opts?.duration ?? DEFAULT_DURATIONS[severity];

            dispatchToast({
                type: 'ADD',
                payload: { id, message, severity, duration, title: opts?.title, action: opts?.action }
            });
            dispatchHistory({
                type: 'ADD',
                payload: { id, message, severity, title: opts?.title, read: false, receivedAt: Date.now() }
            });
            return id;
        },
        []
    );

    const dismissNotification = useCallback((id: string) => {
        dispatchToast({ type: 'REMOVE', id });
    }, []);

    const dismissAll = useCallback(() => dispatchToast({ type: 'CLEAR' }), []);
    const markAllAsRead = useCallback(() => dispatchHistory({ type: 'MARK_ALL_READ' }), []);
    const markAsRead = useCallback((id: string) => dispatchHistory({ type: 'MARK_READ', id }), []);
    const clearHistory = useCallback(() => dispatchHistory({ type: 'CLEAR' }), []);

    return (
        <NotificationContext.Provider value={{
            showNotification, dismissNotification, dismissAll,
            history, unreadCount, markAllAsRead, markAsRead, clearHistory
        }}>
            {children}
            <NotificationStack toasts={toasts} onDismiss={dismissNotification} />
        </NotificationContext.Provider>
    );
};

/* ════════════════════════════════════════
   Toast stack
════════════════════════════════════════ */
const POSITION_STYLES: Record<ToastPosition, Record<string, number | string>> = {
    'top-right':     { top: 16, right: 16 },
    'top-left':      { top: 16, left: 16 },
    'top-center':    { top: 16, left: '50%', transform: 'translateX(-50%)' },
    'bottom-right':  { bottom: 16, right: 16 },
    'bottom-left':   { bottom: 16, left: 16 },
    'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
};

function NotificationStack({ toasts, onDismiss }: { toasts: Notification[]; onDismiss: (id: string) => void }) {
    const { toastPosition } = useAppTheme();
    if (toasts.length === 0) return null;
    const isBottom = toastPosition.startsWith('bottom');
    return (
        <Box
            dir="ltr"
            aria-live="polite"
            sx={{
                position: 'fixed', zIndex: 9999,
                display: 'flex', flexDirection: isBottom ? 'column-reverse' : 'column', gap: 1.25,
                width: 360, maxWidth: 'calc(100vw - 32px)', pointerEvents: 'none',
                ...POSITION_STYLES[toastPosition],
            }}
        >
            {toasts.map(t => <NotifCard key={t.id} notif={t} onDismiss={onDismiss} />)}
        </Box>
    );
}

/* ════════════════════════════════════════
   Severity config
════════════════════════════════════════ */
export const SEVERITY_CONFIG: Record<NotifSeverity, {
    icon: React.ReactNode;
    bg: string;
    border: string;
    progressColor: string;
    titleColor: string;
    lightBg: string;
    lightColor: string;
}> = {
    success: {
        icon: <SuccessIcon sx={{ fontSize: 18 }} />,
        bg: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
        border: '#10B981', progressColor: '#6EE7B7', titleColor: '#D1FAE5',
        lightBg: '#F0FDF4', lightColor: '#16A34A',
    },
    error: {
        icon: <ErrorIcon sx={{ fontSize: 18 }} />,
        bg: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
        border: '#EF4444', progressColor: '#FCA5A5', titleColor: '#FEE2E2',
        lightBg: '#FEF2F2', lightColor: '#DC2626',
    },
    warning: {
        icon: <WarningIcon sx={{ fontSize: 18 }} />,
        bg: 'linear-gradient(135deg, #78350F 0%, #92400E 100%)',
        border: '#F59E0B', progressColor: '#FCD34D', titleColor: '#FEF3C7',
        lightBg: '#FFFBEB', lightColor: '#D97706',
    },
    info: {
        icon: <InfoIcon sx={{ fontSize: 18 }} />,
        bg: 'linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%)',
        border: '#3B82F6', progressColor: '#93C5FD', titleColor: '#DBEAFE',
        lightBg: '#EFF6FF', lightColor: '#2563EB',
    },
};

/* ════════════════════════════════════════
   Single toast card
════════════════════════════════════════ */
function NotifCard({ notif, onDismiss }: { notif: Notification; onDismiss: (id: string) => void }) {
    const [isExiting, setIsExiting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const dismissTimerRef = useRef<number | null>(null);
    const startRef = useRef<number>(Date.now());
    const remainingRef = useRef<number>(notif.duration);

    const cfg = SEVERITY_CONFIG[notif.severity];
    const hasDuration = notif.duration > 0;

    const dismiss = useCallback(() => {
        if (isExiting) return;
        setIsExiting(true);
        setTimeout(() => onDismiss(notif.id), 360);
    }, [isExiting, notif.id, onDismiss]);

    // اعتمد على CSS animation للشريط الزمني (سلس على الـGPU) — ومؤقّت دقيق للإغلاق
    useEffect(() => {
        if (!hasDuration) return;
        const schedule = (ms: number) => {
            if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = window.setTimeout(dismiss, ms);
        };
        if (isPaused) {
            if (dismissTimerRef.current) {
                window.clearTimeout(dismissTimerRef.current);
                dismissTimerRef.current = null;
            }
            remainingRef.current = Math.max(0, notif.duration - (Date.now() - startRef.current));
        } else {
            startRef.current = Date.now() - (notif.duration - remainingRef.current);
            schedule(remainingRef.current);
        }
        return () => {
            if (dismissTimerRef.current) {
                window.clearTimeout(dismissTimerRef.current);
                dismissTimerRef.current = null;
            }
        };
    }, [hasDuration, notif.duration, isPaused, dismiss]);

    return (
        <Box
            role="alert"
            onMouseEnter={() => { if (hasDuration) setIsPaused(true); }}
            onMouseLeave={() => { if (hasDuration) setIsPaused(false); }}
            sx={{
                pointerEvents: 'auto',
                borderRadius: 2.5,
                overflow: 'hidden',
                position: 'relative',
                background: cfg.bg,
                border: `1px solid ${alpha(cfg.border, 0.45)}`,
                boxShadow: `0 14px 44px ${alpha('#000', 0.42)}, 0 2px 8px ${alpha(cfg.border, 0.22)}, inset 0 1px 0 ${alpha('#fff', 0.08)}`,
                transform: 'translateZ(0)',
                animation: isExiting
                    ? 'notifSlideOut 0.36s cubic-bezier(0.55, 0, 0.95, 0.4) forwards'
                    : 'notifSlideIn 0.5s cubic-bezier(0.16, 1.1, 0.3, 1) forwards',
                '@keyframes notifSlideIn': {
                    '0%':   { opacity: 0, transform: 'translateX(120%) translateY(-6px) scale(0.92)' },
                    '60%':  { opacity: 1, transform: 'translateX(-2%) translateY(0) scale(1.01)' },
                    '100%': { opacity: 1, transform: 'translateX(0) translateY(0) scale(1)' },
                },
                '@keyframes notifSlideOut': {
                    '0%':   { opacity: 1, transform: 'translateX(0) scale(1)', maxHeight: '220px', marginTop: 0, marginBottom: 0 },
                    '40%':  { opacity: 0, transform: 'translateX(20%) scale(0.98)' },
                    '100%': { opacity: 0, transform: 'translateX(115%) scale(0.95)', maxHeight: '0px', marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 },
                },
                '@keyframes notifShimmer': {
                    '0%':   { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                '@keyframes notifProgress': {
                    '0%':   { transform: 'scaleX(1)' },
                    '100%': { transform: 'scaleX(0)' },
                },
                willChange: 'transform, opacity',
                transition: 'box-shadow 0.25s ease',
                '&:hover': {
                    boxShadow: `0 18px 56px ${alpha('#000', 0.5)}, 0 4px 14px ${alpha(cfg.border, 0.32)}, inset 0 1px 0 ${alpha('#fff', 0.1)}`,
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: '14px 14px 10px 14px' }}>
                <Box sx={{ color: cfg.border, flexShrink: 0, mt: '1px', filter: `drop-shadow(0 0 5px ${alpha(cfg.border, 0.7)})`, display: 'flex' }}>
                    {cfg.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {notif.title && (
                        <Typography sx={{ display: 'block', color: cfg.titleColor, fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.3, mb: 0.3 }}>
                            {notif.title}
                        </Typography>
                    )}
                    <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '0.82rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {notif.message}
                    </Typography>
                    {notif.action && (
                        <Box component="button" onClick={() => { notif.action!.onClick(); dismiss(); }}
                            sx={{
                                mt: 1, px: 1.5, py: 0.4, borderRadius: 1.5,
                                border: `1px solid ${alpha(cfg.border, 0.55)}`,
                                bgcolor: alpha(cfg.border, 0.18), color: cfg.titleColor,
                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'inherit', display: 'inline-block',
                                '&:hover': { bgcolor: alpha(cfg.border, 0.35) },
                            }}
                        >
                            {notif.action.label}
                        </Box>
                    )}
                </Box>
                <IconButton size="small" onClick={dismiss}
                    sx={{
                        color: 'rgba(255,255,255,0.45)', width: 22, height: 22,
                        flexShrink: 0, mt: '-2px', mr: '-2px',
                        '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' },
                    }}
                >
                    <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
            </Box>
            {hasDuration && (
                <Box sx={{ px: 1.75, pb: '10px' }}>
                    <Box sx={{
                        height: 3,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.09)',
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        {/* الشريط الزمنيّ — CSS animation لسلاسة قصوى على الـGPU */}
                        <Box sx={{
                            position: 'absolute',
                            inset: 0,
                            transformOrigin: 'right center',
                            transform: 'scaleX(1)',
                            background: `linear-gradient(90deg, ${alpha(cfg.progressColor, 0.7)} 0%, ${cfg.progressColor} 50%, ${alpha(cfg.progressColor, 0.7)} 100%)`,
                            backgroundSize: '200% 100%',
                            borderRadius: 2,
                            boxShadow: `0 0 10px ${alpha(cfg.progressColor, 0.85)}, 0 0 4px ${cfg.progressColor}`,
                            animation: `notifProgress ${notif.duration}ms linear forwards, notifShimmerBg 1.6s ease-in-out infinite`,
                            animationPlayState: isPaused ? 'paused' : 'running',
                            '@keyframes notifShimmerBg': {
                                '0%, 100%': { backgroundPosition: '0% 50%' },
                                '50%':      { backgroundPosition: '100% 50%' },
                            },
                        }} />
                        {/* لمعان متحرّك خفيف فوق الشريط */}
                        <Box sx={{
                            position: 'absolute',
                            inset: 0,
                            background: `linear-gradient(90deg, transparent 0%, ${alpha('#fff', 0.35)} 50%, transparent 100%)`,
                            animation: 'notifShimmer 1.8s ease-in-out infinite',
                            animationPlayState: isPaused ? 'paused' : 'running',
                            mixBlendMode: 'overlay',
                            pointerEvents: 'none',
                        }} />
                    </Box>
                </Box>
            )}
        </Box>
    );
}
