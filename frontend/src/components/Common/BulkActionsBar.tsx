import {
    Box,
    Paper,
    Chip,
    Divider,
    IconButton,
    Tooltip,
    Typography,
    Button,
    alpha,
    useTheme,
} from '@mui/material';
import {
    CloseOutlined as CloseIcon,
    DoneAllOutlined as SelectAllIcon,
    RemoveDoneOutlined as DeselectAllIcon,
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
    minCount = 2,
    label,
}: BulkActionsBarProps) {
    const theme = useTheme();
    const active = count >= minCount;

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2.5,
                border: `1.5px solid ${alpha(
                    active ? theme.palette.primary.main : theme.palette.divider,
                    active ? 0.35 : 0.5
                )}`,
                background: active
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.07)}, ${alpha(theme.palette.secondary.main, 0.03)})`
                    : alpha(theme.palette.action.hover, 0.3),
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                transition: 'all 0.25s',
            }}
        >
            {/* Count badge */}
            <Chip
                label={count > 0 ? `${count} محدد` : 'لا يوجد تحديد'}
                size="small"
                color={active ? 'primary' : 'default'}
                sx={{ fontWeight: 800, fontSize: '0.78rem', minWidth: 76 }}
            />

            {/* Select All toggle button */}
            {onSelectAll && totalAvailable > 0 && (
                <Tooltip title={isAllSelected ? 'إلغاء تحديد الكل' : `تحديد الكل (${totalAvailable})`}>
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
                            px: 1.2,
                            py: 0.4,
                        }}
                    >
                        {isAllSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                    </Button>
                </Tooltip>
            )}

            <Divider orientation="vertical" flexItem />

            {/* Hint when not enough selected */}
            {!active && (
                <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                    {label || `حدد ${minCount} عناصر أو أكثر لتفعيل الإجراءات`}
                </Typography>
            )}

            {/* Action buttons – rendered but disabled when not active */}
            {React.Children.map(children, (child) =>
                React.isValidElement(child)
                    ? React.cloneElement(child as React.ReactElement<{ disabled?: boolean }>, {
                          disabled: !active || (child.props as { disabled?: boolean }).disabled,
                      })
                    : child
            )}

            {/* Clear selection */}
            <Box sx={{ marginInlineStart: 'auto' }}>
                <Tooltip title="مسح التحديد">
                    <span>
                        <IconButton size="small" onClick={onClear} disabled={count === 0}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
        </Paper>
    );
}
