import { useEffect, useMemo, useState } from 'react';
import {
    Box, Tabs, Tab, Typography, Stack, Chip, IconButton, Tooltip,
    Button, alpha, useTheme, Divider, MenuItem, Select, FormControl,
    InputLabel, Paper,
} from '@mui/material';
import {
    EditRounded as EditIcon,
    RestartAltRounded as ResetIcon,
    AddRounded as AddIcon,
    DeleteOutlineRounded as DeleteIcon,
    KeyboardRounded as KeyboardIcon,
    CheckRounded as CheckIcon,
    CloseRounded as CancelIcon,
} from '@mui/icons-material';
import { UnifiedModal, CustomButton } from '../Common';
import {
    useShortcutsStore, SHORTCUT_DEFS, CUSTOM_ACTIONS,
    comboLabel, findConflict,
    type ShortcutCombo, type ShortcutScope, type CustomActionId,
} from '../../store/shortcutsStore';

interface Props {
    open: boolean;
    onClose: () => void;
}

const SCOPE_LABEL: Record<ShortcutScope, string> = {
    pos: 'نقطة البيع',
    global: 'عام',
    navigation: 'التنقل',
};

const SCOPE_COLOR: Record<ShortcutScope, string> = {
    pos: '#10B981',
    global: '#0EA5E9',
    navigation: '#8B5CF6',
};

/** Capture the next keypress and turn it into a ShortcutCombo. */
function useComboCapture(active: boolean, onCapture: (c: ShortcutCombo) => void, onCancel: () => void) {
    useEffect(() => {
        if (!active) return;
        const handler = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            // Pure modifier press → ignore, wait for the real key
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
            if (e.key === 'Escape') {
                onCancel();
                return;
            }
            let key = e.key;
            // Normalise special keys to match useKeyboardShortcuts semantics
            if (key === '+' || e.code === 'NumpadAdd') key = 'plus';
            else if (key === '-' || e.code === 'NumpadSubtract') key = 'minus';
            onCapture({
                key,
                ctrl: e.ctrlKey || e.metaKey,
                shift: e.shiftKey,
                alt: e.altKey,
            });
        };
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [active, onCapture, onCancel]);
}

export default function ShortcutsManagerDialog({ open, onClose }: Props) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const [tab, setTab] = useState<'view' | 'customize'>('view');

    const overrides = useShortcutsStore((s) => s.overrides);
    const customs = useShortcutsStore((s) => s.customs);
    const setOverride = useShortcutsStore((s) => s.setOverride);
    const addCustom = useShortcutsStore((s) => s.addCustom);
    const removeCustom = useShortcutsStore((s) => s.removeCustom);
    const resetAll = useShortcutsStore((s) => s.resetAll);

    /** id of row currently capturing a key — '<builtin>:id' or '<custom>:id' or '<new>'. */
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newAction, setNewAction] = useState<CustomActionId>('nav.dashboard');

    useEffect(() => {
        if (!open) {
            setEditingId(null);
            setError(null);
            setTab('view');
        }
    }, [open]);

    const groups = useMemo(() => {
        const acc: Record<ShortcutScope, Array<{ id: string; label: string; combo: ShortcutCombo; customizable: boolean; source: 'builtin' | 'custom' }>> = {
            pos: [], global: [], navigation: [],
        };
        for (const def of SHORTCUT_DEFS) {
            const combo = overrides[def.id] ?? def.defaultCombo;
            acc[def.scope].push({ id: def.id, label: def.label, combo, customizable: def.customizable, source: 'builtin' });
        }
        for (const c of customs) {
            const action = CUSTOM_ACTIONS.find((a) => a.id === c.actionId);
            if (!action) continue;
            acc[action.scope].push({ id: c.id, label: action.label, combo: c.combo, customizable: true, source: 'custom' });
        }
        return acc;
    }, [overrides, customs]);

    const handleCaptured = (combo: ShortcutCombo) => {
        if (!editingId) return;

        if (editingId === '<new>') {
            const conflict = findConflict(useShortcutsStore.getState(), combo);
            if (conflict) {
                setError(`هذا المفتاح مستخدم من قبل: ${conflict.label}`);
                return;
            }
            addCustom(newAction, combo);
            setEditingId(null);
            setError(null);
            return;
        }

        const [kind, refId] = editingId.split(':');
        const conflict = findConflict(
            useShortcutsStore.getState(),
            combo,
            kind === 'builtin' ? refId : undefined,
            kind === 'custom' ? refId : undefined,
        );
        if (conflict) {
            setError(`هذا المفتاح مستخدم من قبل: ${conflict.label}`);
            return;
        }

        if (kind === 'builtin') {
            setOverride(refId, combo);
        } else if (kind === 'custom') {
            // Replace combo on the custom binding by remove+add (keeps actionId)
            const c = useShortcutsStore.getState().customs.find((x) => x.id === refId);
            if (c) {
                removeCustom(refId);
                addCustom(c.actionId, combo);
            }
        }
        setEditingId(null);
        setError(null);
    };

    useComboCapture(editingId !== null, handleCaptured, () => { setEditingId(null); setError(null); });

    return (
        <UnifiedModal
            open={open}
            onClose={onClose}
            title="اختصارات لوحة المفاتيح"
            subtitle="عرض وتخصيص جميع اختصارات البرنامج"
            icon={<KeyboardIcon />}
            maxWidth="md"
            actions={
                <>
                    <CustomButton variant="outlined" startIcon={<ResetIcon />} onClick={() => { resetAll(); setError(null); }}>
                        استعادة الافتراضيات
                    </CustomButton>
                    <Box sx={{ flex: 1 }} />
                    <CustomButton variant="contained" onClick={onClose}>تم</CustomButton>
                </>
            }
        >
            <Tabs
                value={tab}
                onChange={(_, v) => { setTab(v); setEditingId(null); setError(null); }}
                sx={{ mb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
            >
                <Tab value="view" label="عرض" />
                <Tab value="customize" label="تخصيص" />
            </Tabs>

            {error && (
                <Box sx={{
                    mb: 2, p: 1.25, borderRadius: 2,
                    bgcolor: alpha(theme.palette.error.main, isLight ? 0.08 : 0.16),
                    color: 'error.main', fontSize: '0.85rem', fontWeight: 600,
                }}>
                    {error}
                </Box>
            )}

            {(['pos', 'global', 'navigation'] as ShortcutScope[]).map((scope) => {
                const rows = groups[scope];
                if (rows.length === 0 && tab === 'view') return null;
                return (
                    <Box key={scope} sx={{ mb: 2.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Box sx={{ width: 6, height: 18, borderRadius: 1, bgcolor: SCOPE_COLOR[scope] }} />
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: SCOPE_COLOR[scope] }}>
                                {SCOPE_LABEL[scope]}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">({rows.length})</Typography>
                        </Stack>
                        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: alpha(theme.palette.divider, 0.7) }}>
                            {rows.map((row, idx) => {
                                const myEditId = `${row.source}:${row.id}`;
                                const isEditing = editingId === myEditId;
                                return (
                                    <Box
                                        key={row.id}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 2,
                                            px: 2, py: 1.25,
                                            borderBottom: idx === rows.length - 1 ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                                            bgcolor: idx % 2 === 0 ? (isLight ? alpha(SCOPE_COLOR[scope], 0.025) : alpha(SCOPE_COLOR[scope], 0.06)) : 'transparent',
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={500} sx={{ flex: 1, minWidth: 0 }}>
                                            {row.label}
                                        </Typography>

                                        {isEditing ? (
                                            <Chip
                                                label="اضغط على المفتاح..."
                                                size="small"
                                                sx={{
                                                    fontWeight: 700, px: 1,
                                                    bgcolor: alpha(theme.palette.warning.main, 0.18),
                                                    color: 'warning.main',
                                                    border: `1px dashed ${theme.palette.warning.main}`,
                                                    animation: 'pulseEdit 1.4s ease-in-out infinite',
                                                    '@keyframes pulseEdit': {
                                                        '0%, 100%': { opacity: 1 },
                                                        '50%': { opacity: 0.55 },
                                                    },
                                                }}
                                            />
                                        ) : (
                                            <Chip
                                                label={comboLabel(row.combo)}
                                                size="small"
                                                sx={{
                                                    fontFamily: 'monospace', fontWeight: 700, px: 1,
                                                    bgcolor: alpha(SCOPE_COLOR[scope], 0.14),
                                                    color: SCOPE_COLOR[scope],
                                                    border: `1px solid ${alpha(SCOPE_COLOR[scope], 0.35)}`,
                                                }}
                                            />
                                        )}

                                        {tab === 'customize' && row.customizable && (
                                            <Stack direction="row" spacing={0.5}>
                                                {isEditing ? (
                                                    <Tooltip title="إلغاء" arrow>
                                                        <IconButton size="small" onClick={() => { setEditingId(null); setError(null); }}>
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="تعديل" arrow>
                                                        <IconButton size="small" onClick={() => { setEditingId(myEditId); setError(null); }}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {row.source === 'custom' && (
                                                    <Tooltip title="حذف" arrow>
                                                        <IconButton size="small" onClick={() => removeCustom(row.id)}
                                                            sx={{ color: 'error.main' }}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        )}
                                        {tab === 'customize' && !row.customizable && (
                                            <Typography variant="caption" color="text.disabled" sx={{ minWidth: 64, textAlign: 'end' }}>
                                                مفتاح نظام
                                            </Typography>
                                        )}
                                    </Box>
                                );
                            })}
                        </Paper>
                    </Box>
                );
            })}

            {tab === 'customize' && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                        إضافة اختصار جديد
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <FormControl size="small" sx={{ flex: 1, minWidth: 220 }}>
                            <InputLabel>الإجراء</InputLabel>
                            <Select
                                value={newAction}
                                label="الإجراء"
                                onChange={(e) => setNewAction(e.target.value as CustomActionId)}
                            >
                                {CUSTOM_ACTIONS.map((a) => (
                                    <MenuItem key={a.id} value={a.id}>{a.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {editingId === '<new>' ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    label="اضغط على المفتاح المطلوب..."
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        bgcolor: alpha(theme.palette.warning.main, 0.18),
                                        color: 'warning.main',
                                        border: `1px dashed ${theme.palette.warning.main}`,
                                    }}
                                />
                                <IconButton size="small" onClick={() => { setEditingId(null); setError(null); }}>
                                    <CancelIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        ) : (
                            <Button variant="contained" startIcon={<AddIcon />}
                                onClick={() => { setEditingId('<new>'); setError(null); }}>
                                التقاط مفتاح
                            </Button>
                        )}
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5, color: 'text.secondary' }}>
                        <CheckIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption">
                            يدعم التقاط أي تركيبة مع Ctrl / Alt / Shift. اضغط Esc لإلغاء التقاط المفتاح.
                        </Typography>
                    </Stack>
                </>
            )}
        </UnifiedModal>
    );
}
