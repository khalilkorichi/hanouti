import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Stack, Typography, Paper, Button, Chip, LinearProgress, Collapse,
    TextField, Switch, FormControlLabel, useTheme, alpha, Avatar, Link,
    List, ListItem, ListItemIcon, ListItemText, Tooltip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import {
    SystemUpdateAlt as UpdateIcon,
    CloudDownload as DownloadIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    GitHub as GitHubIcon,
    Settings as SettingsIcon,
    OpenInNew as OpenIcon,
    RocketLaunch as InstallIcon,
    NewReleases as NewIcon,
    InfoOutlined as InfoIcon,
    WarningAmberOutlined as WarningIcon,
    Difference as DiffIcon,
    AddCircleOutline as AddIcon,
    RemoveCircleOutline as RemoveIcon,
    SwapHoriz as ChangedIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    InsertDriveFile as FileIcon,
    FlashOn as HotIcon,
    Restore as RollbackIcon,
    Replay as ReloadIcon,
    Layers as ChannelIcon,
    Pause as PauseIcon,
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    FolderOpen as FolderOpenIcon,
    Folder as FolderIcon,
    RestartAlt as ResetIcon,
    Storage as StorageIcon,
    CachedOutlined as CachedIcon,
    DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import {
    isElectron, getElectronUpdater, getElectronAPI,
    type UpdaterConfig, type UpdaterStatus, type UpdateCheckResult,
    type AppInfo, type FileDiff, type FileDiffEntry, type ChannelInfo,
    type DownloadDirInfo,
} from '../../services/electronUpdater';
import { useNotification } from '../../contexts/NotificationContext';

function formatBytes(b?: number): string {
    if (!b || b <= 0) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0; let v = b;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function formatDate(iso?: string): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return iso; }
}

/** Bytes/sec → human-readable e.g. "1.4 MB/s". 0 → empty. */
function formatSpeed(bps?: number): string {
    if (!bps || bps <= 0) return '';
    return `${formatBytes(bps)}/ث`;
}

/** Seconds → human-readable Arabic ETA, e.g. "بقي 2د 15ث". */
function formatEta(seconds?: number | null): string {
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '';
    const s = Math.round(seconds);
    if (s < 60) return `بقي ${s}ث`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    if (m < 60) return rs > 0 ? `بقي ${m}د ${rs}ث` : `بقي ${m}د`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `بقي ${h}س ${rm}د` : `بقي ${h}س`;
}

// ─── File-level diff card ────────────────────────────────────────────
// Renders the SHA-256 manifest comparison between the local install and
// the latest release. Uses MUI primitives — no extra deps.

interface FileDiffSectionProps {
    diff: FileDiff;
    isLight: boolean;
}

function FileDiffList({
    title, files, truncated, color, icon, totalCount,
}: {
    title: string;
    files: FileDiffEntry[];
    truncated: boolean;
    color: 'warning' | 'success' | 'error';
    icon: React.ReactNode;
    totalCount: number;
}) {
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    if (totalCount === 0) return null;
    return (
        <Box sx={{
            mt: 1.5, borderRadius: 2,
            border: `1px solid ${alpha(theme.palette[color].main, 0.3)}`,
            bgcolor: alpha(theme.palette[color].main, 0.04),
        }}>
            <Stack
                direction="row" alignItems="center" spacing={1}
                sx={{ px: 1.5, py: 1, cursor: 'pointer' }}
                onClick={() => setOpen((o) => !o)}
            >
                <Avatar sx={{
                    bgcolor: alpha(theme.palette[color].main, 0.15),
                    color: `${color}.main`, width: 32, height: 32,
                }}>
                    {icon}
                </Avatar>
                <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
                    {title}
                </Typography>
                <Chip
                    size="small" color={color} variant="outlined"
                    label={totalCount.toLocaleString('ar')}
                />
                <IconButton size="small">
                    {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
            </Stack>
            <Collapse in={open}>
                <List dense sx={{ pt: 0, pb: 1, maxHeight: 280, overflow: 'auto' }}>
                    {files.map((f) => (
                        <ListItem key={f.path} sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <FileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Typography
                                        variant="caption"
                                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                                    >
                                        {f.path}
                                    </Typography>
                                }
                                secondary={
                                    <Typography variant="caption" color="text.secondary">
                                        {formatBytes(f.size)}
                                        {typeof f.oldSize === 'number' && f.oldSize !== f.size && (
                                            <> · سابقاً {formatBytes(f.oldSize)}</>
                                        )}
                                    </Typography>
                                }
                            />
                        </ListItem>
                    ))}
                    {truncated && (
                        <ListItem sx={{ py: 0.25 }}>
                            <ListItemText
                                primary={
                                    <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                        ... وملفّات إضافيّة (تمّ اقتطاع القائمة للعرض)
                                    </Typography>
                                }
                            />
                        </ListItem>
                    )}
                </List>
            </Collapse>
        </Box>
    );
}

function FileDiffSection({ diff, isLight }: FileDiffSectionProps) {
    const theme = useTheme();

    if (!diff.available) {
        return (
            <Paper elevation={0} sx={{
                p: 2.5, borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                bgcolor: alpha(theme.palette.background.paper, isLight ? 0.7 : 0.4),
            }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{
                        bgcolor: alpha(theme.palette.text.secondary, 0.12),
                        color: 'text.secondary', width: 36, height: 36,
                    }}>
                        <DiffIcon fontSize="small" />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                            تحليل شامل للملفّات غير متاح
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {diff.reason}
                        </Typography>
                    </Box>
                </Stack>
            </Paper>
        );
    }

    const { counts, downloadSize, inSync, manifestVersion, manifestGeneratedAt } = diff;
    const headerColor: 'success' | 'warning' = inSync ? 'success' : 'warning';

    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 3,
            border: `1px solid ${alpha(theme.palette[headerColor].main, 0.35)}`,
            bgcolor: alpha(theme.palette[headerColor].main, isLight ? 0.04 : 0.10),
        }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                <Avatar sx={{
                    bgcolor: alpha(theme.palette[headerColor].main, 0.18),
                    color: `${headerColor}.main`, width: 40, height: 40,
                }}>
                    <DiffIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                        تحليل شامل للملفّات (SHA-256)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {inSync
                            ? `جميع الملفّات (${counts.unchanged.toLocaleString('ar')}) متطابقة تماماً مع الإصدار المنشور.`
                            : `يحتاج التحديث إلى مزامنة ${(counts.changed + counts.added).toLocaleString('ar')} ملفّ — حجم التنزيل المتوقّع ${formatBytes(downloadSize)}.`
                        }
                    </Typography>
                </Box>
            </Stack>

            {/* Counts row */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
                <Tooltip title="إجمالي الملفّات في الإصدار البعيد">
                    <Chip
                        size="small" variant="outlined"
                        icon={<FileIcon sx={{ fontSize: 14 }} />}
                        label={`الإجمالي: ${counts.total.toLocaleString('ar')}`}
                    />
                </Tooltip>
                <Tooltip title="ملفّات على جهازك مطابقة تماماً للإصدار البعيد">
                    <Chip
                        size="small" color="success" variant="outlined"
                        icon={<CheckIcon sx={{ fontSize: 14 }} />}
                        label={`متطابقة: ${counts.unchanged.toLocaleString('ar')}`}
                    />
                </Tooltip>
                {counts.changed > 0 && (
                    <Tooltip title="ملفّات موجودة على الجانبين لكنّ المحتوى تغيّر">
                        <Chip
                            size="small" color="warning" variant="filled"
                            icon={<ChangedIcon sx={{ fontSize: 14, color: 'inherit' }} />}
                            label={`متغيّرة: ${counts.changed.toLocaleString('ar')}`}
                            sx={{ color: '#fff' }}
                        />
                    </Tooltip>
                )}
                {counts.added > 0 && (
                    <Tooltip title="ملفّات جديدة في الإصدار البعيد سيتمّ تنزيلها">
                        <Chip
                            size="small" color="success" variant="filled"
                            icon={<AddIcon sx={{ fontSize: 14, color: 'inherit' }} />}
                            label={`مُضافة: ${counts.added.toLocaleString('ar')}`}
                            sx={{ color: '#fff' }}
                        />
                    </Tooltip>
                )}
                {counts.removed > 0 && (
                    <Tooltip title="ملفّات على جهازك لم تعد موجودة في الإصدار البعيد">
                        <Chip
                            size="small" color="error" variant="outlined"
                            icon={<RemoveIcon sx={{ fontSize: 14 }} />}
                            label={`ملغاة: ${counts.removed.toLocaleString('ar')}`}
                        />
                    </Tooltip>
                )}
            </Stack>

            <FileDiffList
                title="ملفّات تغيّر محتواها"
                files={diff.changed}
                truncated={diff.truncated.changed}
                totalCount={counts.changed}
                color="warning"
                icon={<ChangedIcon sx={{ fontSize: 18 }} />}
            />
            <FileDiffList
                title="ملفّات جديدة"
                files={diff.added}
                truncated={diff.truncated.added}
                totalCount={counts.added}
                color="success"
                icon={<AddIcon sx={{ fontSize: 18 }} />}
            />
            <FileDiffList
                title="ملفّات لم تعد موجودة في الإصدار البعيد"
                files={diff.removed}
                truncated={diff.truncated.removed}
                totalCount={counts.removed}
                color="error"
                icon={<RemoveIcon sx={{ fontSize: 18 }} />}
            />

            {(manifestVersion || manifestGeneratedAt) && (
                <Typography
                    variant="caption" color="text.secondary"
                    sx={{ display: 'block', mt: 1.5, opacity: 0.75 }}
                >
                    بصمة المرجع: v{manifestVersion}{manifestGeneratedAt && ` · ${formatDate(manifestGeneratedAt)}`}
                </Typography>
            )}
        </Paper>
    );
}

export default function UpdaterPanel() {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const { showNotification } = useNotification();

    const electronAvailable = isElectron();
    const updater = getElectronUpdater();
    const electronAPI = getElectronAPI();

    const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
    const [config, setConfig] = useState<UpdaterConfig | null>(null);
    const [draftConfig, setDraftConfig] = useState<UpdaterConfig | null>(null);
    const [check, setCheck] = useState<UpdateCheckResult | null>(null);
    const [status, setStatus] = useState<UpdaterStatus>({ state: 'idle' });
    const [downloadedPath, setDownloadedPath] = useState<string | null>(null);
    const [downloadReused, setDownloadReused] = useState(false);
    const [busy, setBusy] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [channel, setChannel] = useState<ChannelInfo | null>(null);
    const [hotApplied, setHotApplied] = useState(false);
    const [downloadDirInfo, setDownloadDirInfo] = useState<DownloadDirInfo | null>(null);
    const [clearCacheConfirmOpen, setClearCacheConfirmOpen] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    const refreshDownloadInfo = async () => {
        if (!updater) return;
        try {
            const info = await updater.getDownloadDirInfo();
            setDownloadDirInfo(info);
        } catch (e) {
            console.error('[updater] getDownloadDirInfo failed', e);
        }
    };

    const refreshChannel = async () => {
        if (!updater?.hotUpdate) return;
        try {
            const c = await updater.hotUpdate.getChannel();
            setChannel(c);
        } catch (e) {
            console.error('[hotupdate] getChannel failed', e);
        }
    };

    useEffect(() => {
        if (!electronAvailable || !updater || !electronAPI) return;
        let alive = true;
        (async () => {
            try {
                const [info, cfg, ddi] = await Promise.all([
                    electronAPI.getAppInfo(),
                    updater.getConfig(),
                    updater.getDownloadDirInfo(),
                ]);
                if (!alive) return;
                setAppInfo(info);
                setConfig(cfg);
                setDraftConfig(cfg);
                setDownloadDirInfo(ddi);
                if (updater.hotUpdate) {
                    const c = await updater.hotUpdate.getChannel();
                    if (alive) setChannel(c);
                }
            } catch (e) {
                console.error('[updater] init failed', e);
            }
        })();
        cleanupRef.current = updater.onStatus((s) => {
            // Note: 'upgrade-success' is handled by the global
            // <UpgradeSuccessNotifier /> in App.tsx so it fires regardless
            // of which page the user is on. We deliberately ignore it here.
            if (s.state === 'upgrade-success') return;
            setStatus(s);
            if (s.state === 'downloaded') {
                setDownloadedPath(s.path);
                setDownloadReused(Boolean(s.reused));
            }
            if (s.state === 'hot-updated') setHotApplied(true);
        });
        return () => {
            alive = false;
            cleanupRef.current?.();
        };
    }, [electronAvailable, updater, electronAPI]);

    const handleCheck = async () => {
        if (!updater) return;
        setBusy(true);
        setCheck(null);
        setDownloadedPath(null);
        setStatus({ state: 'checking' });
        try {
            const r = await updater.checkForUpdates();
            setCheck(r);
            setStatus({ state: 'idle' });
            if (r.state === 'update-available') {
                showNotification(`الإصدار v${r.latestVersion} متوفّر`, 'info', { title: 'تحديث جديد' });
            } else if (r.state === 'up-to-date') {
                showNotification('برنامجك على آخر إصدار', 'success', { title: 'لا توجد تحديثات' });
            } else if (r.state === 'no-releases') {
                showNotification('لا توجد إصدارات منشورة على المستودع', 'warning', { title: 'لا يوجد تحديث' });
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setStatus({ state: 'error', message: msg });
            showNotification(msg, 'error', { title: 'فشل التحقّق' });
        } finally {
            setBusy(false);
        }
    };

    const handleDownload = async () => {
        if (!updater || !check || check.state !== 'update-available' || !check.asset) return;
        setBusy(true);
        setDownloadReused(false);
        try {
            // No asset arg passed — main process re-fetches and validates.
            const r = await updater.downloadInstaller();
            setDownloadedPath(r.path);
            setDownloadReused(Boolean(r.reused));
            showNotification(
                r.reused
                    ? 'وُجد ملفّ تثبيت سابق صالح — لا حاجة لإعادة التحميل. اضغط "ابدأ التثبيت الآن".'
                    : 'اكتمل التحميل. اضغط "ابدأ التثبيت الآن" لإكمال الترقية.',
                'success',
                { title: r.reused ? 'إعادة استخدام تنزيل سابق' : 'جاهز للتثبيت' },
            );
            // Refresh free-space chip after a successful download.
            await refreshDownloadInfo();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            // Sentinel from main.cjs when handleCancelDownload triggered the abort —
            // the cancel handler already showed its own info toast, so don't pile on
            // a "فشل التحميل" error notification.
            if (msg !== 'canceled' && msg !== 'تمّ إلغاء التحميل') {
                showNotification(msg, 'error', { title: 'فشل التحميل' });
                setStatus({ state: 'error', message: msg });
            }
        } finally {
            setBusy(false);
        }
    };

    const handlePauseDownload = async () => {
        if (!updater) return;
        try { await updater.pauseDownload(); } catch (e) {
            console.error('[updater] pause failed', e);
        }
    };

    const handleResumeDownload = async () => {
        if (!updater) return;
        try { await updater.resumeDownload(); } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'تعذّر الاستئناف' });
        }
    };

    const handleCancelDownload = async () => {
        if (!updater) return;
        try {
            await updater.cancelDownload();
            setDownloadedPath(null);
            setDownloadReused(false);
            showNotification('تمّ إلغاء التحميل وحذف الملفّ المؤقّت.', 'info');
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل الإلغاء' });
        }
    };

    const handlePickDownloadDir = async () => {
        if (!updater) return;
        try {
            const r = await updater.pickDownloadDir();
            if (r.canceled) return;
            if (!r.ok) {
                showNotification(r.reason || 'تعذّر استخدام المجلّد المختار', 'error', { title: 'مجلّد غير صالح' });
                return;
            }
            await refreshDownloadInfo();
            showNotification('تمّ تغيير مجلّد التحميل.', 'success');
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل اختيار المجلّد' });
        }
    };

    const handleResetDownloadDir = async () => {
        if (!updater) return;
        try {
            const info = await updater.resetDownloadDir();
            setDownloadDirInfo(info);
            showNotification('تمّ استرجاع المجلّد الافتراضي.', 'success');
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل الاسترجاع' });
        }
    };

    const handleClearDownloadCache = async () => {
        if (!updater) return;
        setClearingCache(true);
        try {
            const r = await updater.clearDownloadCache();
            if (!r.ok) {
                showNotification(
                    r.reason || (r.errors && r.errors.length
                        ? `تعذّر حذف ${r.errors.length} ملفّ`
                        : 'تعذّر مسح الملفّات المؤقّتة'),
                    'error',
                    { title: 'فشل المسح' },
                );
            } else if (r.removed === 0) {
                showNotification('لا توجد ملفّات تحميل مؤقّتة لمسحها.', 'info');
            } else {
                showNotification(
                    `تمّ حذف ${r.removed} ملفّ. سيُعاد التحميل من الصفر عند التحقّق التالي.`,
                    'success',
                    { title: 'تمّ المسح' },
                );
                // A successful cache wipe also invalidates any "downloaded
                // installer ready" state we were holding in the renderer.
                setDownloadedPath(null);
                setDownloadReused(false);
            }
            // Free-space chip refresh — wiping a 100+ MB partial should be visible.
            await refreshDownloadInfo();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل المسح' });
        } finally {
            setClearingCache(false);
            setClearCacheConfirmOpen(false);
        }
    };

    const handleOpenDownloadFolder = async (filePath?: string) => {
        if (!updater) return;
        try {
            const r = await updater.openDownloadFolder(filePath);
            if (!r.ok) {
                showNotification(r.reason || 'تعذّر فتح المجلّد', 'warning');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error');
        }
    };

    const handleInstall = async () => {
        if (!updater || !downloadedPath) return;
        try {
            await updater.installAndRelaunch(downloadedPath);
            showNotification(
                'سيتمّ إغلاق البرنامج لإكمال التثبيت...',
                'info',
                { title: 'جارٍ التثبيت' },
            );
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل بدء التثبيت' });
        }
    };

    const handleHotApply = async () => {
        if (!updater?.hotUpdate) return;
        setBusy(true);
        setHotApplied(false);
        try {
            const r = await updater.hotUpdate.apply();
            await refreshChannel();
            setHotApplied(true);
            showNotification(
                `تمّ تطبيق التحديث السريع (v${r.version}). اضغط "إعادة تحميل التطبيق" لتفعيله الآن.`,
                'success',
                { title: 'التحديث جاهز' },
            );
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل التحديث السريع' });
            setStatus({ state: 'error', message: msg });
        } finally {
            setBusy(false);
        }
    };

    const handleHotReload = async () => {
        if (!updater?.hotUpdate) return;
        try {
            await updater.hotUpdate.reload();
            // The window itself reloads — this code rarely runs to completion.
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل إعادة التحميل' });
        }
    };

    const handleHotRollback = async () => {
        if (!updater?.hotUpdate) return;
        setBusy(true);
        try {
            const r = await updater.hotUpdate.rollback();
            await refreshChannel();
            if (r.rolledBack) {
                showNotification(
                    'تمّ الرجوع إلى النسخة الأصليّة المثبَّتة. أعد تحميل التطبيق لتفعيلها.',
                    'success',
                    { title: 'استعادة النسخة الأصليّة' },
                );
                setHotApplied(true);
            } else {
                showNotification(r.reason || 'لا توجد قناة نشطة للرجوع منها', 'info');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل الرجوع' });
        } finally {
            setBusy(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!updater || !draftConfig) return;
        try {
            const saved = await updater.setConfig(draftConfig);
            setConfig(saved);
            showNotification('تم حفظ إعدادات التحديث', 'success');
            setShowSettings(false);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل الحفظ' });
        }
    };

    const stateMeta = useMemo(() => {
        switch (status.state) {
            case 'checking': return { label: 'جارٍ التحقّق...', color: 'info' as const };
            case 'downloading': return { label: 'جارٍ التحميل', color: 'info' as const };
            case 'paused': return { label: 'موقوف مؤقّتاً', color: 'warning' as const };
            case 'downloaded': return { label: 'جاهز للتثبيت', color: 'success' as const };
            case 'installing': return { label: 'جارٍ التثبيت', color: 'info' as const };
            case 'hot-updating': return { label: 'تحديث سريع جارٍ...', color: 'info' as const };
            case 'hot-updated': return { label: 'جاهز لإعادة التحميل', color: 'success' as const };
            case 'error': return { label: 'خطأ', color: 'error' as const };
            default:
                if (check?.state === 'update-available') {
                    if (check.updateMode === 'hot') return { label: 'تحديث سريع متوفّر', color: 'info' as const };
                    return { label: 'تحديث متوفّر', color: 'warning' as const };
                }
                if (check?.state === 'up-to-date') return { label: 'آخر إصدار', color: 'success' as const };
                if (check?.state === 'no-releases') return { label: 'لا توجد إصدارات', color: 'default' as const };
                return { label: 'جاهز', color: 'default' as const };
        }
    }, [status.state, check?.state, check]);

    // Hot-update progress derivation — kept separate from installer
    // download progress so the two never collide on screen.
    const hotUpdating = status.state === 'hot-updating';
    const hotPhaseLabel = (() => {
        if (!hotUpdating) return '';
        switch (status.phase) {
            case 'check': return 'التحقّق من الإصدار...';
            case 'download': return 'تنزيل أرشيف الواجهة...';
            case 'extract': return 'فكّ الأرشيف...';
            case 'verify': return 'التحقّق من بصمات SHA-256...';
            case 'install': return 'تفعيل القناة الجديدة...';
            default: return 'جارٍ المعالجة...';
        }
    })();

    if (!electronAvailable) {
        return (
            <Paper elevation={0} sx={{
                p: 4, borderRadius: 3,
                border: `1px dashed ${alpha(theme.palette.divider, 0.7)}`,
                bgcolor: alpha(theme.palette.info.main, isLight ? 0.04 : 0.08),
            }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.15), color: 'info.main' }}>
                        <InfoIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            ميزة التحديث متاحة في النسخة المكتبية
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            نظام التحديث التلقائي عبر GitHub Releases يعمل فقط داخل تطبيق سطح المكتب
                            (Hanouti.exe). في وضع المتصفح يتم تجاهل هذه الميزة.
                        </Typography>
                    </Box>
                </Stack>
            </Paper>
        );
    }

    const downloading = status.state === 'downloading';
    const paused = status.state === 'paused';
    const downloadActive = downloading || paused;
    const downloadCurrent = downloading || paused ? status.current : 0;
    const downloadTotal = downloading || paused
        ? status.total
        : (check?.state === 'update-available' && check.asset ? check.asset.size : 0);
    const downloadProgress = downloadActive && downloadTotal > 0
        ? Math.min(100, Math.round((downloadCurrent / downloadTotal) * 100))
        : (downloading ? status.percent : 0);
    const downloadSpeed = downloading ? status.speed : undefined;
    const downloadEta = downloading ? status.eta : undefined;
    const downloadName = downloadActive ? status.name : undefined;

    return (
        <Stack spacing={3}>
            {/* ── Header / status banner ───────────────────────── */}
            <Paper elevation={0} sx={{
                p: 3, borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                background: isLight
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)}, ${alpha(theme.palette.secondary.main, 0.02)})`
                    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.secondary.main, 0.08)})`,
            }}>
                <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                    <Avatar sx={{
                        width: 56, height: 56,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                    }}>
                        <UpdateIcon sx={{ color: '#fff', fontSize: 28 }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 240 }}>
                        <Typography variant="h6" fontWeight={800} gutterBottom>
                            تحديثات GitHub
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip
                                size="small"
                                label={stateMeta.label}
                                color={stateMeta.color}
                                variant={stateMeta.color === 'default' ? 'outlined' : 'filled'}
                            />
                            {appInfo && (
                                <Chip size="small" variant="outlined" label={`النسخة المثبَّتة: v${appInfo.version}`} />
                            )}
                            {config && (
                                <Chip
                                    size="small" variant="outlined"
                                    icon={<GitHubIcon sx={{ fontSize: 16 }} />}
                                    label={`${config.repoOwner}/${config.repoName}`}
                                    onClick={() => electronAPI?.openExternal(`https://github.com/${config.repoOwner}/${config.repoName}/releases`)}
                                />
                            )}
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="text" startIcon={<SettingsIcon />}
                            onClick={() => setShowSettings((s) => !s)}
                            color={showSettings ? 'primary' : 'inherit'}
                        >
                            إعدادات
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={busy ? <RefreshIcon className="spin" /> : <RefreshIcon />}
                            disabled={busy}
                            onClick={handleCheck}
                        >
                            تحقّق من التحديثات
                        </Button>
                    </Stack>
                </Stack>

                {downloadActive && (
                    <Box sx={{ mt: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5} flexWrap="wrap" gap={1}>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Typography variant="caption" color="text.secondary">
                                    {paused ? 'موقوف مؤقّتاً' : 'جارٍ التحميل'} · {formatBytes(downloadCurrent)} / {formatBytes(downloadTotal)}
                                </Typography>
                                {downloading && downloadSpeed ? (
                                    <Chip size="small" variant="outlined" label={formatSpeed(downloadSpeed)} />
                                ) : null}
                                {downloading && downloadEta ? (
                                    <Chip size="small" variant="outlined" color="info" label={formatEta(downloadEta)} />
                                ) : null}
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="caption" fontWeight={700}>{downloadProgress}%</Typography>
                                {downloading ? (
                                    <Tooltip title="إيقاف مؤقّت">
                                        <IconButton size="small" onClick={handlePauseDownload}>
                                            <PauseIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <Tooltip title="استئناف">
                                        <IconButton size="small" color="primary" onClick={handleResumeDownload}>
                                            <PlayIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <Tooltip title="إلغاء التحميل">
                                    <IconButton size="small" color="error" onClick={handleCancelDownload}>
                                        <StopIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="فتح مجلّد التحميل">
                                    <IconButton size="small" onClick={() => handleOpenDownloadFolder()}>
                                        <FolderOpenIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>
                        <LinearProgress
                            variant={paused ? 'determinate' : 'determinate'}
                            value={downloadProgress}
                            color={paused ? 'warning' : 'primary'}
                            sx={{ height: 8, borderRadius: 4, opacity: paused ? 0.6 : 1 }}
                        />
                        {downloadName && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {downloadName}
                            </Typography>
                        )}
                    </Box>
                )}

                {status.state === 'downloaded' && downloadReused && (
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <CachedIcon color="success" fontSize="small" />
                            <Typography variant="body2" color="success.main" sx={{ flex: 1 }}>
                                جاهز للتثبيت من تنزيل سابق — تمّ التحقّق من سلامة الملفّ بالـ SHA-512.
                            </Typography>
                            <Button
                                size="small" startIcon={<FolderOpenIcon />}
                                onClick={() => downloadedPath && handleOpenDownloadFolder(downloadedPath)}
                            >
                                فتح المجلّد
                            </Button>
                        </Stack>
                    </Box>
                )}

                {hotUpdating && (
                    <Box sx={{ mt: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <HotIcon sx={{ fontSize: 16, color: 'info.main' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {hotPhaseLabel}
                                    {status.phase === 'download' && status.received != null && status.total != null && (
                                        <> · {formatBytes(status.received)} / {formatBytes(status.total)}</>
                                    )}
                                </Typography>
                            </Stack>
                            <Typography variant="caption" fontWeight={700}>{status.percent || 0}%</Typography>
                        </Stack>
                        <LinearProgress
                            variant={status.phase === 'download' ? 'determinate' : 'indeterminate'}
                            value={status.percent || 0}
                            color="info"
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Box>
                )}

                {hotApplied && status.state !== 'hot-updating' && (
                    <Box sx={{
                        mt: 2, p: 2, borderRadius: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.10),
                        border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                    }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                            <CheckIcon color="success" />
                            <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography variant="body2" fontWeight={700} color="success.main">
                                    التحديث جاهز للتطبيق
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    اضغط الزرّ لإعادة تحميل التطبيق وتفعيل الإصدار الجديد فوراً (لن يُعاد تشغيل البرنامج).
                                </Typography>
                            </Box>
                            <Button
                                variant="contained" color="success" startIcon={<ReloadIcon />}
                                onClick={handleHotReload}
                            >
                                إعادة تحميل التطبيق الآن
                            </Button>
                        </Stack>
                    </Box>
                )}

                {status.state === 'installing' && (
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <InstallIcon color="info" fontSize="small" />
                            <Typography variant="body2" color="info.main">
                                جارٍ تشغيل المثبّت... سيُغلق البرنامج خلال ثوانٍ.
                            </Typography>
                        </Stack>
                    </Box>
                )}

                {status.state === 'error' && (
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <ErrorIcon color="error" fontSize="small" />
                            <Typography variant="body2" color="error.main">{status.message}</Typography>
                        </Stack>
                    </Box>
                )}
            </Paper>

            {/* ── Settings (collapsible) ───────────────────────── */}
            <Collapse in={showSettings}>
                <Paper elevation={0} sx={{
                    p: 3, borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        إعدادات مصدر التحديث
                    </Typography>
                    {draftConfig && (
                        <Stack spacing={2} mt={1}>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="مالك المستودع" size="small" fullWidth
                                    value={draftConfig.repoOwner}
                                    onChange={(e) => setDraftConfig({ ...draftConfig, repoOwner: e.target.value })}
                                />
                                <TextField
                                    label="اسم المستودع" size="small" fullWidth
                                    value={draftConfig.repoName}
                                    onChange={(e) => setDraftConfig({ ...draftConfig, repoName: e.target.value })}
                                />
                            </Stack>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={draftConfig.includePrerelease}
                                        onChange={(e) => setDraftConfig({ ...draftConfig, includePrerelease: e.target.checked })}
                                    />
                                }
                                label="تضمين الإصدارات التجريبية (pre-release)"
                            />

                            {/* ── Download directory picker ─────────── */}
                            <Box sx={{
                                p: 2, borderRadius: 2,
                                border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                            }}>
                                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                    <FolderIcon fontSize="small" color="action" />
                                    <Typography variant="body2" fontWeight={700}>
                                        مجلّد تحميل ملفّات التحديث
                                    </Typography>
                                    {downloadDirInfo?.isDefault && (
                                        <Chip size="small" variant="outlined" label="افتراضي" />
                                    )}
                                </Stack>
                                <Typography
                                    variant="caption" color="text.secondary"
                                    sx={{ display: 'block', mb: 1, wordBreak: 'break-all', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' }}
                                >
                                    {downloadDirInfo?.path || '...'}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Button
                                        size="small" variant="outlined" startIcon={<FolderOpenIcon />}
                                        onClick={handlePickDownloadDir}
                                    >
                                        تغيير المجلّد
                                    </Button>
                                    {!downloadDirInfo?.isDefault && (
                                        <Button
                                            size="small" variant="text" startIcon={<ResetIcon />}
                                            onClick={handleResetDownloadDir}
                                        >
                                            استرجاع الافتراضي
                                        </Button>
                                    )}
                                    <Button
                                        size="small" variant="text" startIcon={<FolderOpenIcon />}
                                        onClick={() => handleOpenDownloadFolder()}
                                    >
                                        فتح المجلّد
                                    </Button>
                                    <Tooltip title="حذف ملفّات التثبيت المؤقّتة (.exe و latest.yml) من هذا المجلّد لإعادة التحميل من الصفر. مفيد إذا فشل التحقّق من سلامة الملفّ عدّة مرّات.">
                                        <Button
                                            size="small" variant="text" color="error"
                                            startIcon={<DeleteSweepIcon />}
                                            disabled={clearingCache}
                                            onClick={() => setClearCacheConfirmOpen(true)}
                                        >
                                            مسح ملفّات التحميل المؤقّتة
                                        </Button>
                                    </Tooltip>
                                    <Box sx={{ flex: 1 }} />
                                    {downloadDirInfo?.freeBytes != null && (
                                        <Tooltip title={`الحدّ الأدنى المطلوب: ${formatBytes(downloadDirInfo.minRequiredBytes)}`}>
                                            <Chip
                                                size="small" icon={<StorageIcon sx={{ fontSize: 14 }} />}
                                                color={downloadDirInfo.freeBytes < downloadDirInfo.minRequiredBytes ? 'error' : 'default'}
                                                variant="outlined"
                                                label={`متوفّر: ${formatBytes(downloadDirInfo.freeBytes)}`}
                                            />
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>

                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button onClick={() => { setDraftConfig(config); setShowSettings(false); }}>
                                    إلغاء
                                </Button>
                                <Button variant="contained" onClick={handleSaveConfig}>
                                    حفظ
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </Paper>
            </Collapse>

            {/* ── Up-to-date card ──────────────────────────────── */}
            {check && check.state === 'up-to-date' && (
                <>
                    <Paper elevation={0} sx={{
                        p: 3, borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                        bgcolor: alpha(theme.palette.success.main, isLight ? 0.05 : 0.12),
                    }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'success.main', color: '#fff', width: 48, height: 48 }}>
                                <CheckIcon />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    أنت تستخدم آخر إصدار
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    النسخة <b>v{check.currentVersion}</b> هي الأحدث المتوفّرة.
                                    {check.releaseDate && ` نُشرت في ${formatDate(check.releaseDate)}.`}
                                    {check.fileDiff.available && check.fileDiff.inSync && (
                                        <> · جميع الملفّات سليمة (تحقّق SHA-256).</>
                                    )}
                                </Typography>
                            </Box>
                        </Stack>

                        {/* Informational only: same version installed, but some
                            local files differ from the published manifest.
                            This is NOT an "update available" — it's typically
                            caused by runtime files (DB/logs/exports) written
                            inside app-files/, or an upgrade from a pre-manifest
                            version. We let the user re-run the installer
                            manually if they want a byte-perfect repair. */}
                        {check.filesDiffer && (
                            <Box sx={{
                                mt: 2, p: 1.5, borderRadius: 2,
                                border: `1px dashed ${alpha(theme.palette.info.main, 0.5)}`,
                                bgcolor: alpha(theme.palette.info.main, 0.06),
                            }}>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <InfoIcon color="info" fontSize="small" sx={{ mt: 0.25 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" color="info.main" fontWeight={700} sx={{ display: 'block' }}>
                                            معلومة: بعض الملفّات على جهازك تختلف عن منشور الإصدار v{check.currentVersion}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                            هذا أمر طبيعيّ — قاعدة البيانات والسجلّات والتقارير تُكتب أثناء التشغيل. لا يوجد تحديث جديد. إن أردت استعادة سلامة الملفّات بالضبط كما نُشرت، يمكنك تنزيل المثبّت من{' '}
                                            <Link
                                                component="button"
                                                onClick={() => electronAPI?.openExternal(check.releaseUrl)}
                                                sx={{ verticalAlign: 'baseline' }}
                                            >
                                                صفحة الإصدار
                                            </Link>
                                            .
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        )}
                    </Paper>
                    <FileDiffSection diff={check.fileDiff} isLight={isLight} />
                </>
            )}

            {/* ── Update-available card ────────────────────────── */}
            {check && check.state === 'update-available' && (
                <Paper elevation={0} sx={{
                    p: 3, borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
                    bgcolor: alpha(theme.palette.warning.main, isLight ? 0.05 : 0.12),
                }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }} spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        mb={2}
                    >
                        <Avatar sx={{ bgcolor: 'warning.main', color: '#fff', width: 48, height: 48 }}>
                            <NewIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={800}>
                                تحديث جديد: v{check.latestVersion}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatDate(check.releaseDate)} · أنت على v{check.currentVersion}
                                {check.asset && ` · حجم التحميل: ${formatBytes(check.asset.size)}`}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {/* HOT mode → live frontend update (no UAC, no restart) */}
                            {check.updateMode === 'hot' && !hotApplied && (
                                <Button
                                    variant="contained" color="info"
                                    startIcon={<HotIcon />}
                                    disabled={busy || hotUpdating}
                                    onClick={handleHotApply}
                                >
                                    تطبيق التحديث الفوريّ
                                </Button>
                            )}
                            {/* INSTALLER mode → classic NSIS download + install */}
                            {check.updateMode !== 'hot' && !downloadedPath && !downloading && check.asset && (
                                <Button
                                    variant="contained" color="warning"
                                    startIcon={<DownloadIcon />}
                                    disabled={busy}
                                    onClick={handleDownload}
                                >
                                    تحميل التحديث
                                </Button>
                            )}
                            {check.updateMode !== 'hot' && downloadedPath && (
                                <Button
                                    variant="contained" color="success"
                                    startIcon={<InstallIcon />}
                                    onClick={handleInstall}
                                >
                                    ابدأ التثبيت الآن
                                </Button>
                            )}
                            {check.updateMode !== 'hot' && !check.asset && (
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Chip
                                        size="small"
                                        label="ملفّ المثبّت قيد التجهيز على GitHub"
                                        color="warning" variant="outlined"
                                    />
                                    <Button
                                        variant="outlined" color="warning" size="small"
                                        startIcon={<OpenIcon />}
                                        onClick={() => electronAPI?.openExternal(check.releaseUrl)}
                                    >
                                        افتح صفحة الإصدار للتنزيل
                                    </Button>
                                </Stack>
                            )}
                        </Stack>
                    </Stack>

                    {/* Mode explanation banner — tells the user WHY this update
                        is hot-or-not. Critical for trust: explains that
                        hot updates skip UAC because nothing system-level
                        is changing, and installer updates need UAC because
                        the backend exe is being replaced. */}
                    <Box sx={{
                        mt: 2, p: 1.75, borderRadius: 2,
                        border: `1px solid ${alpha(
                            check.updateMode === 'hot' ? theme.palette.info.main : theme.palette.warning.main,
                            0.35,
                        )}`,
                        bgcolor: alpha(
                            check.updateMode === 'hot' ? theme.palette.info.main : theme.palette.warning.main,
                            0.06,
                        ),
                    }}>
                        <Stack direction="row" spacing={1.25} alignItems="flex-start">
                            {check.updateMode === 'hot'
                                ? <HotIcon color="info" fontSize="small" />
                                : <InstallIcon color="warning" fontSize="small" />}
                            <Box>
                                <Typography
                                    variant="caption" fontWeight={700}
                                    color={check.updateMode === 'hot' ? 'info.main' : 'warning.main'}
                                >
                                    {check.updateMode === 'hot'
                                        ? 'تحديث فوريّ (واجهة فقط)'
                                        : 'تحديث كامل (يتطلّب المثبّت)'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                    {check.updateMode === 'hot'
                                        ? `جميع التغييرات في ملفّات الواجهة فقط. سيُنزَّل أرشيف صغير (${check.hotArchive ? formatBytes(check.hotArchive.size) : ''})، يُتحقَّق من سلامته بصمةً ببصمة، ثم يُطبَّق فوراً بإعادة تحميل النافذة فقط — بدون إعادة تثبيت أو إعادة تشغيل.`
                                        : 'هذا التحديث يعدّل ملفّات النظام (الخادم/Electron) المقفلة أثناء التشغيل، لذا يلزم المثبّت الكامل وصلاحيات المدير.'}
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    {check.releaseNotes && (
                        <Box sx={{
                            p: 2, borderRadius: 2,
                            bgcolor: alpha(theme.palette.background.paper, 0.6),
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            maxHeight: 320, overflow: 'auto',
                        }}>
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                ما الجديد في هذا الإصدار:
                            </Typography>
                            <Typography
                                variant="body2" component="div"
                                sx={{
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    fontFamily: 'inherit', color: 'text.secondary', lineHeight: 1.7,
                                }}
                            >
                                {check.releaseNotes}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ mt: 2 }}>
                        <Link
                            component="button"
                            onClick={() => electronAPI?.openExternal(check.releaseUrl)}
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                        >
                            <OpenIcon sx={{ fontSize: 16 }} />
                            عرض الإصدار كاملاً على GitHub
                        </Link>
                    </Box>
                </Paper>
            )}

            {/* ── File-level diff (always shown when an update is available) ── */}
            {check && check.state === 'update-available' && (
                <FileDiffSection diff={check.fileDiff} isLight={isLight} />
            )}

            {/* ── No releases card ─────────────────────────────── */}
            {check && check.state === 'no-releases' && (
                <Paper elevation={0} sx={{
                    p: 3, borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                }}>
                    <Typography variant="body2" color="text.secondary">
                        لا توجد إصدارات منشورة على المستودع{' '}
                        <Link component="button" onClick={() => electronAPI?.openExternal(check.repoUrl)}>
                            {check.repoUrl}
                        </Link>.
                    </Typography>
                </Paper>
            )}

            {/* ── Active channel card ──────────────────────────── */}
            {channel && (
                <Paper elevation={0} sx={{
                    p: 2.5, borderRadius: 3,
                    border: `1px solid ${alpha(
                        channel.mode === 'channel' ? theme.palette.info.main : theme.palette.divider,
                        channel.mode === 'channel' ? 0.4 : 0.7,
                    )}`,
                    bgcolor: channel.mode === 'channel'
                        ? alpha(theme.palette.info.main, isLight ? 0.04 : 0.10)
                        : 'transparent',
                }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Avatar sx={{
                            bgcolor: alpha(
                                channel.mode === 'channel' ? theme.palette.info.main : theme.palette.text.secondary,
                                0.15,
                            ),
                            color: channel.mode === 'channel' ? 'info.main' : 'text.secondary',
                            width: 40, height: 40,
                        }}>
                            <ChannelIcon fontSize="small" />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 220 }}>
                            <Typography variant="body2" fontWeight={700}>
                                {channel.mode === 'channel'
                                    ? `قناة الواجهة النشطة: v${channel.version}`
                                    : 'الواجهة الأصليّة المثبَّتة (baseline)'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {channel.mode === 'channel'
                                    ? `طُبِّقت في ${formatDate(channel.appliedAt || undefined)} · بصمة ${channel.sha8}`
                                    : 'لم يُطبَّق أيّ تحديث سريع — تعمل بالنسخة التي ركّبها المثبّت.'}
                            </Typography>
                            {channel.mode === 'baseline' && channel.configuredPath && channel.configuredExists === false && (
                                <Typography
                                    variant="caption"
                                    color="warning.main"
                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
                                >
                                    <WarningIcon sx={{ fontSize: 14 }} />
                                    يوجد ملفّ قناة لكنّه يشير لمسار غير صالح — تمّ التراجع تلقائيّاً للنسخة الأصليّة.
                                </Typography>
                            )}
                        </Box>
                        {channel.mode === 'channel' && (
                            <Button
                                variant="outlined" color="warning" size="small"
                                startIcon={<RollbackIcon />}
                                disabled={busy}
                                onClick={handleHotRollback}
                            >
                                العودة للنسخة الأصليّة
                            </Button>
                        )}
                    </Stack>
                </Paper>
            )}

            {/* ── App info footer ──────────────────────────────── */}
            {appInfo && (
                <Paper elevation={0} sx={{
                    p: 2, borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    fontSize: '0.8rem',
                }}>
                    <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ color: 'text.secondary' }}>
                        <span>الإصدار: <b>v{appInfo.version}</b></span>
                        <span>Electron: <b>{appInfo.electron}</b></span>
                        <span>المنصّة: <b>{appInfo.platform}/{appInfo.arch}</b></span>
                        <span>
                            مجلّد البيانات:{' '}
                            <Link
                                component="button"
                                onClick={() => electronAPI?.openExternal('file:///' + appInfo.userData.replace(/\\/g, '/'))}
                            >
                                {appInfo.userData}
                            </Link>
                        </span>
                    </Stack>
                </Paper>
            )}

            {/* Confirm wipe of partial download cache (.exe + latest.yml). */}
            <Dialog
                open={clearCacheConfirmOpen}
                onClose={() => !clearingCache && setClearCacheConfirmOpen(false)}
                dir="rtl"
                aria-labelledby="clear-cache-title"
                aria-describedby="clear-cache-desc"
            >
                <DialogTitle id="clear-cache-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeleteSweepIcon color="error" />
                    تأكيد مسح ملفّات التحميل المؤقّتة
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="clear-cache-desc" sx={{ mb: 1 }}>
                        سيتمّ حذف ملفّات تثبيت Hanouti المؤقّتة فقط (<code>Hanouti-Setup-*.exe</code>، <code>Hanouti-Setup-*.exe.partial</code>، <code>latest.yml</code>) من المجلّد التالي:
                    </DialogContentText>
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block', mb: 1.5,
                            p: 1, borderRadius: 1,
                            bgcolor: alpha(theme.palette.background.default, 0.6),
                            fontFamily: 'monospace', wordBreak: 'break-all',
                            direction: 'ltr', textAlign: 'left',
                        }}
                    >
                        {downloadDirInfo?.path || '...'}
                    </Typography>
                    <DialogContentText>
                        لن تُحذف إعدادات التحديث ولا أيّ ملفّات أخرى في هذا المجلّد. سيُعاد تحميل ملفّ التثبيت من الصفر عند التحقّق التالي عن التحديثات.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setClearCacheConfirmOpen(false)}
                        disabled={clearingCache}
                    >
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleClearDownloadCache}
                        color="error" variant="contained"
                        startIcon={<DeleteSweepIcon />}
                        disabled={clearingCache}
                    >
                        {clearingCache ? 'جارٍ المسح...' : 'نعم، احذف الملفّات'}
                    </Button>
                </DialogActions>
            </Dialog>

            <style>{`
                .spin { animation: hanouti-spin 1.2s linear infinite; }
                @keyframes hanouti-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </Stack>
    );
}
