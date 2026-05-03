import {
    Box,
    Paper,
    Divider,
    IconButton,
    Tooltip,
    Typography,
    Button,
    Avatar,
    alpha,
    useTheme,
} from '@mui/material';
import {
    CloseOutlined as CloseIcon,
    DoneAllOutlined as SelectAllIcon,
    RemoveDoneOutlined as DeselectAllIcon,
    PlaylistAddCheckOutlined as PlaylistIcon,
} from '@mui/icons-material';
import React from 'react';

interface BulkActionsBarProps {
    count: number;
    onClear: () => void;
    onSelectAll?: () => void;
    isAllSelected?: boolean;
    totalAvailable?: number;
    children: React.ReactNode;
    minCount?: number;
    label?: string;
}

export default function BulkActionsBar({
    count,
    onClear,
    onSelectAll,
    isAllSelected = false,
    totalAvailable = 0,
    children,
    minCount = 1,
    label,
}: BulkActionsBarProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const active = count >= minCount;

    const accent = theme.palette.primary.main;
    const accent2 = theme.palette.info.main;

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 2,
                p: { xs: 1.25, sm: 1.5 },
                pl: { xs: 1.25, sm: 2 },
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                border: `1.5px solid ${alpha(
                    active ? accent : theme.palette.divider,
                    active ? 0.45 : 0.5,
                )}`,
                background: active
                    ? `linear-gradient(135deg, ${alpha(accent, isLight ? 0.08 : 0.18)}, ${alpha(accent2, isLight ? 0.04 : 0.10)})`
                    : 'transparent',
                boxShadow: active
                    ? `0 4px 18px ${alpha(accent, isLight ? 0.18 : 0.30)}`
                    : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5 },
                flexWrap: 'wrap',
                transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                // Decorative accent stripe (right side, since RTL).
                '&::before': active ? {
                    content: '""',
                    position: 'absolute',
                    insetBlock: 0,
                    insetInlineStart: 0,
                    width: 4,
                    background: `linear-gradient(180deg, ${accent}, ${accent2})`,
                } : undefined,
            }}
        >
            {/* ── Counter badge with icon avatar ─────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                    sx={{
                        width: 34,
                        height: 34,
                        background: active
                            ? `linear-gradient(135deg, ${accent}, ${accent2})`
                            : 'transparent',
                        color: active ? '#fff' : theme.palette.text.disabled,
                        border: active
                            ? 'none'
                            : `1.5px dashed ${alpha(theme.palette.text.disabled, 0.5)}`,
                        boxShadow: active
                            ? `0 2px 8px ${alpha(accent, 0.4)}`
                            : 'none',
                        transition: 'all 0.25s',
                    }}
                >
                    <PlaylistIcon fontSize="small" />
                </Avatar>
                <Box sx={{ lineHeight: 1.15, minWidth: 0 }}>
                    <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        sx={{
                            fontSize: '0.88rem',
                            color: active ? 'primary.main' : 'text.primary',
                            lineHeight: 1.2,
                        }}
                    >
                        {count > 0 ? (
                            <>
                                {count.toLocaleString('ar')}{' '}
                                <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                    عنصر محدّد
                                </Box>
                            </>
                        ) : (
                            'لا يوجد تحديد'
                        )}
                    </Typography>
                    {!active && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', fontSize: '0.7rem', mt: 0.1 }}
                        >
                            {label || (minCount === 1
                                ? 'اختَر عناصر لتفعيل الإجراءات'
                                : `اختَر ${minCount} عناصر أو أكثر`)}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* ── Select All toggle ──────────────────────────────── */}
            {onSelectAll && totalAvailable > 0 && (
                <Tooltip
                    title={isAllSelected
                        ? 'إلغاء تحديد الكل'
                        : `تحديد الكل (${totalAvailable.toLocaleString('ar')})`}
                    arrow
                >
                    <Button
                        size="small"
                        variant={isAllSelected ? 'contained' : 'outlined'}
                        color="primary"
                        startIcon={isAllSelected ? <DeselectAllIcon /> : <SelectAllIcon />}
                        onClick={onSelectAll}
                        sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            minWidth: 0,
                            px: 1.4,
                            py: 0.5,
                            textTransform: 'none',
                            borderWidth: 1.5,
                            '&:hover': { borderWidth: 1.5 },
                            ...(isAllSelected ? {
                                background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                                boxShadow: `0 2px 8px ${alpha(accent, 0.35)}`,
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${alpha(accent, 0.9)}, ${alpha(accent2, 0.9)})`,
                                    boxShadow: `0 4px 12px ${alpha(accent, 0.45)}`,
                                },
                            } : {}),
                        }}
                    >
                        {isAllSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                    </Button>
                </Tooltip>
            )}

            {/* ── Action buttons (only rendered when active) ─────── */}
            {active && (
                <>
                    <Divider
                        orientation="vertical"
                        flexItem
                        sx={{
                            borderColor: alpha(accent, 0.25),
                            mx: 0.5,
                            my: 0.5,
                        }}
                    />
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                    }}>
                        {React.Children.map(children, (child) =>
                            React.isValidElement(child)
                                ? React.cloneElement(child as React.ReactElement<{ disabled?: boolean }>, {
                                    disabled: (child.props as { disabled?: boolean }).disabled,
                                })
                                : child
                        )}
                    </Box>
                </>
            )}

            {/* ── Clear selection (RTL: pushes to far left) ──────── */}
            <Box sx={{ marginInlineStart: 'auto' }}>
                <Tooltip title="مسح التحديد" arrow>
                    <span>
                        <IconButton
                            size="small"
                            onClick={onClear}
                            disabled={count === 0}
                            sx={{
                                bgcolor: active ? alpha(theme.palette.error.main, 0.08) : 'transparent',
                                color: active ? 'error.main' : 'text.disabled',
                                border: `1px solid ${alpha(
                                    active ? theme.palette.error.main : theme.palette.divider,
                                    active ? 0.3 : 0.4,
                                )}`,
                                borderRadius: 2,
                                width: 32,
                                height: 32,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.error.main, 0.15),
                                    borderColor: alpha(theme.palette.error.main, 0.5),
                                },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
        </Paper>
    );
}
