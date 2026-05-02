import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Stack, Typography, Paper, Button, Chip, LinearProgress, Collapse,
    TextField, Switch, FormControlLabel, useTheme, alpha, Avatar, Link,
    List, ListItem, ListItemIcon, ListItemText, Tooltip, IconButton,
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
    Difference as DiffIcon,
    AddCircleOutline as AddIcon,
    RemoveCircleOutline as RemoveIcon,
    SwapHoriz as ChangedIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import {
    isElectron, getElectronUpdater, getElectronAPI,
    type UpdaterConfig, type UpdaterStatus, type UpdateCheckResult,
    type AppInfo, type FileDiff, type FileDiffEntry,
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
    const [busy, setBusy] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!electronAvailable || !updater || !electronAPI) return;
        let alive = true;
        (async () => {
            try {
                const [info, cfg] = await Promise.all([
                    electronAPI.getAppInfo(),
                    updater.getConfig(),
                ]);
                if (!alive) return;
                setAppInfo(info);
                setConfig(cfg);
                setDraftConfig(cfg);
            } catch (e) {
                console.error('[updater] init failed', e);
            }
        })();
        cleanupRef.current = updater.onStatus((s) => {
            setStatus(s);
            if (s.state === 'downloaded') setDownloadedPath(s.path);
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
        try {
            // No asset arg passed — main process re-fetches and validates.
            const r = await updater.downloadInstaller();
            setDownloadedPath(r.path);
            showNotification(
                'اكتمل التحميل. اضغط "ابدأ التثبيت الآن" لإكمال الترقية.',
                'success',
                { title: 'جاهز للتثبيت' },
            );
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل التحميل' });
            setStatus({ state: 'error', message: msg });
        } finally {
            setBusy(false);
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
            case 'downloaded': return { label: 'جاهز للتثبيت', color: 'success' as const };
            case 'installing': return { label: 'جارٍ التثبيت', color: 'info' as const };
            case 'error': return { label: 'خطأ', color: 'error' as const };
            default:
                if (check?.state === 'update-available') return { label: 'تحديث متوفّر', color: 'warning' as const };
                if (check?.state === 'up-to-date') return { label: 'آخر إصدار', color: 'success' as const };
                if (check?.state === 'no-releases') return { label: 'لا توجد إصدارات', color: 'default' as const };
                return { label: 'جاهز', color: 'default' as const };
        }
    }, [status.state, check?.state]);

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
    const downloadProgress = downloading ? status.percent : 0;
    const downloadCurrent = downloading ? status.current : 0;
    const downloadTotal = downloading
        ? status.total
        : (check?.state === 'update-available' && check.asset ? check.asset.size : 0);

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

                {downloading && (
                    <Box sx={{ mt: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                جارٍ التحميل... {formatBytes(downloadCurrent)} / {formatBytes(downloadTotal)}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>{downloadProgress}%</Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={downloadProgress}
                            sx={{ height: 8, borderRadius: 4 }}
                        />
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
                        <Stack direction="row" spacing={1}>
                            {!downloadedPath && !downloading && check.asset && (
                                <Button
                                    variant="contained" color="warning"
                                    startIcon={<DownloadIcon />}
                                    disabled={busy}
                                    onClick={handleDownload}
                                >
                                    تحميل التحديث
                                </Button>
                            )}
                            {downloadedPath && (
                                <Button
                                    variant="contained" color="success"
                                    startIcon={<InstallIcon />}
                                    onClick={handleInstall}
                                >
                                    ابدأ التثبيت الآن
                                </Button>
                            )}
                            {!check.asset && (
                                <Chip
                                    label="لا يوجد ملفّ مثبّت في هذا الإصدار"
                                    color="error" variant="outlined"
                                />
                            )}
                        </Stack>
                    </Stack>

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

                    {/* Special banner: same version but files differ (hot-fix re-publish) */}
                    {!check.versionIsNewer && check.filesDiffer && (
                        <Box sx={{
                            mt: 2, p: 1.5, borderRadius: 2,
                            border: `1px dashed ${alpha(theme.palette.warning.main, 0.5)}`,
                            bgcolor: alpha(theme.palette.warning.main, 0.08),
                        }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <InfoIcon color="warning" fontSize="small" />
                                <Typography variant="caption" color="warning.main" fontWeight={700}>
                                    الإصدار v{check.currentVersion} نفسه لكنّ بعض الملفّات على جهازك
                                    تختلف عن الإصدار المنشور — يُنصح بإعادة التثبيت لاستعادة سلامة الملفّات.
                                </Typography>
                            </Stack>
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

            <style>{`
                .spin { animation: hanouti-spin 1.2s linear infinite; }
                @keyframes hanouti-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </Stack>
    );
}
