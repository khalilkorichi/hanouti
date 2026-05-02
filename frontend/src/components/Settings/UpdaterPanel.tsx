import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Stack, Typography, Paper, Button, Chip, LinearProgress, Divider,
    List, ListItem, ListItemText, ListItemIcon, IconButton, Tooltip, TextField,
    Collapse, useTheme, alpha, Avatar, Link,
} from '@mui/material';
import {
    SystemUpdateAlt as UpdateIcon,
    CloudDownload as DownloadIcon,
    Backup as BackupIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    OpenInNew as OpenInNewIcon,
    Settings as SettingsIcon,
    InsertDriveFile as FileIcon,
    Add as AddIcon,
    Edit as EditIcon,
    DeleteOutline as DeleteIcon,
    GitHub as GitHubIcon,
    InfoOutlined as InfoIcon,
    RestartAlt as RestartIcon,
} from '@mui/icons-material';
import {
    isElectron, getElectronUpdater, getElectronAPI,
    type UpdaterConfig, type UpdaterStatus, type ScanResult, type AppInfo,
} from '../../services/electronUpdater';
import { useNotification } from '../../contexts/NotificationContext';

const STATE_LABELS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
    idle: { label: 'جاهز', color: 'default' },
    checking: { label: 'جارٍ الفحص...', color: 'info' },
    'changes-found': { label: 'تحديث متوفّر', color: 'warning' },
    'up-to-date': { label: 'آخر إصدار', color: 'success' },
    downloading: { label: 'جارٍ التحميل', color: 'info' },
    applying: { label: 'جارٍ التطبيق', color: 'info' },
    complete: { label: 'اكتمل التحديث', color: 'success' },
    error: { label: 'خطأ', color: 'error' },
};

function formatBytes(b: number): string {
    if (!b) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0; let v = b;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function formatDate(iso?: string): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return iso; }
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
    const [status, setStatus] = useState<UpdaterStatus>({ state: 'idle' });
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showFiles, setShowFiles] = useState(false);
    const [draftConfig, setDraftConfig] = useState<UpdaterConfig | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!electronAvailable || !updater || !electronAPI) return;
        let alive = true;
        (async () => {
            try {
                const [info, cfg] = await Promise.all([electronAPI.getAppInfo(), updater.getConfig()]);
                if (!alive) return;
                setAppInfo(info);
                setConfig(cfg);
                setDraftConfig(cfg);
            } catch (e) {
                console.error('[updater] init failed', e);
            }
        })();
        cleanupRef.current = updater.onStatus((s) => setStatus(s));
        return () => {
            alive = false;
            cleanupRef.current?.();
        };
    }, [electronAvailable, updater, electronAPI]);

    const handleScan = async () => {
        if (!updater) return;
        setBusy(true);
        setScanResult(null);
        try {
            const result = await updater.scanChanges();
            setScanResult(result);
            if (result.state === 'up-to-date') {
                showNotification('برنامجك على آخر إصدار', 'success', { title: 'لا توجد تحديثات' });
            } else {
                showNotification(`${result.totalChanges} ملف(ات) جاهزة للتحديث`, 'info', { title: 'تحديث متوفّر' });
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل الفحص' });
        } finally {
            setBusy(false);
        }
    };

    const handleBackup = async () => {
        if (!updater) return;
        try {
            const r = await updater.createBackup();
            if (r.canceled) return;
            showNotification(`تم نسخ ${r.count} ملف(ات) إلى ${r.path}`, 'success', { title: 'نسخة احتياطية' });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل النسخ' });
        }
    };

    const handleApply = async () => {
        if (!updater || !scanResult || scanResult.state !== 'changes-found') return;
        setBusy(true);
        try {
            const r = await updater.applyUpdate(scanResult);
            showNotification(`اكتمل تطبيق ${r.downloaded} ملف(ات). يُنصح بإعادة التشغيل.`, 'success', {
                title: 'تم التحديث',
            });
            setScanResult(null);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showNotification(msg, 'error', { title: 'فشل التحديث' });
        } finally {
            setBusy(false);
        }
    };

    const handleRestart = async () => {
        if (!electronAPI) return;
        await electronAPI.restartApp();
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

    const stateMeta = useMemo(() => STATE_LABELS[status.state] || STATE_LABELS.idle, [status.state]);
    const downloadProgress = status.state === 'downloading' ? status.percent : 0;

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
                            نظام التحديث التلقائي من GitHub يعمل فقط داخل تطبيق سطح المكتب (Hanouti.exe).
                            في وضع المتصفح يتم تجاهل هذه الميزة. لبناء النسخة المكتبية، شغّل
                            <code style={{ margin: '0 6px' }}>npm run dist:win</code>
                            على Windows أو استخدم سير العمل التلقائي على GitHub Actions.
                        </Typography>
                    </Box>
                </Stack>
            </Paper>
        );
    }

    return (
        <Stack spacing={3}>
            {/* ── Status banner ───────────────────────────────── */}
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
                            <Chip size="small" label={stateMeta.label} color={stateMeta.color}
                                  variant={stateMeta.color === 'default' ? 'outlined' : 'filled'} />
                            {appInfo && (
                                <Chip size="small" variant="outlined" label={`v${appInfo.version}`} />
                            )}
                            {config && (
                                <Chip
                                    size="small" variant="outlined" icon={<GitHubIcon sx={{ fontSize: 16 }} />}
                                    label={`${config.repoOwner}/${config.repoName} · ${config.branch}`}
                                    onClick={() => electronAPI?.openExternal(`https://github.com/${config.repoOwner}/${config.repoName}/tree/${config.branch}`)}
                                />
                            )}
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="إعدادات المستودع">
                            <IconButton onClick={() => setShowSettings((s) => !s)} color={showSettings ? 'primary' : 'default'}>
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="outlined" startIcon={<BackupIcon />} disabled={busy}
                            onClick={handleBackup}
                        >
                            نسخة احتياطية
                        </Button>
                        <Button
                            variant="contained" startIcon={busy ? <RefreshIcon className="spin" /> : <RefreshIcon />}
                            disabled={busy} onClick={handleScan}
                        >
                            فحص التحديثات
                        </Button>
                    </Stack>
                </Stack>

                {(status.state === 'downloading' || status.state === 'applying') && (
                    <Box sx={{ mt: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                {status.state === 'downloading'
                                    ? `جارٍ التحميل (${status.current}/${status.total})${status.currentFile ? ' — ' + status.currentFile : ''}`
                                    : `جارٍ التطبيق (${(status as { total: number }).total} ملف)`}
                            </Typography>
                            {status.state === 'downloading' && (
                                <Typography variant="caption" fontWeight={700}>{downloadProgress}%</Typography>
                            )}
                        </Stack>
                        <LinearProgress
                            variant={status.state === 'applying' ? 'indeterminate' : 'determinate'}
                            value={downloadProgress}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
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
                {status.state === 'complete' && (
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <CheckCircleIcon color="success" fontSize="small" />
                                <Typography variant="body2" color="success.main">
                                    اكتمل التحديث: {status.downloaded} ملف. يُنصح بإعادة التشغيل لتفعيل التغييرات.
                                </Typography>
                            </Stack>
                            <Button size="small" startIcon={<RestartIcon />} onClick={handleRestart} variant="outlined" color="success">
                                إعادة التشغيل
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Paper>

            {/* ── Updater settings (collapsible) ───────────────── */}
            <Collapse in={showSettings}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.7)}` }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        مصدر التحديثات
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
                                <TextField
                                    label="الفرع" size="small" sx={{ width: 180 }}
                                    value={draftConfig.branch}
                                    onChange={(e) => setDraftConfig({ ...draftConfig, branch: e.target.value })}
                                />
                            </Stack>
                            <TextField
                                label="المسارات المتتبَّعة (مفصولة بفاصلة)"
                                size="small" fullWidth
                                value={draftConfig.trackedPrefixes.join(', ')}
                                onChange={(e) => setDraftConfig({
                                    ...draftConfig,
                                    trackedPrefixes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                })}
                                helperText="مثال: frontend-dist/, backend-dist/"
                            />
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button onClick={() => { setDraftConfig(config); setShowSettings(false); }}>إلغاء</Button>
                                <Button variant="contained" onClick={handleSaveConfig}>حفظ</Button>
                            </Stack>
                        </Stack>
                    )}
                </Paper>
            </Collapse>

            {/* ── Scan result ──────────────────────────────────── */}
            {scanResult && (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.7)}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {scanResult.state === 'up-to-date' ? 'لا توجد تغييرات' : `${scanResult.totalChanges} تغيير`}
                        </Typography>
                        {scanResult.state === 'changes-found' && (
                            <Button
                                variant="contained" color="primary"
                                startIcon={<DownloadIcon />} disabled={busy}
                                onClick={handleApply}
                            >
                                تطبيق التحديث
                            </Button>
                        )}
                    </Stack>
                    <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
                        <Chip icon={<EditIcon />} label={`معدّل: ${scanResult.modified.length}`} color="warning" variant="outlined" />
                        <Chip icon={<AddIcon />} label={`جديد: ${scanResult.added.length}`} color="success" variant="outlined" />
                        <Chip icon={<DeleteIcon />} label={`محذوف: ${scanResult.removed.length}`} color="error" variant="outlined" />
                        <Chip icon={<CheckCircleIcon />} label={`بدون تغيير: ${scanResult.unchangedCount}`} variant="outlined" />
                    </Stack>

                    {scanResult.totalChanges > 0 && (
                        <>
                            <Button size="small" onClick={() => setShowFiles((v) => !v)}>
                                {showFiles ? 'إخفاء الملفات' : 'عرض الملفات'}
                            </Button>
                            <Collapse in={showFiles}>
                                <Box sx={{ mt: 2, maxHeight: 320, overflow: 'auto' }}>
                                    <List dense>
                                        {scanResult.modified.map((f) => (
                                            <ListItem key={'M' + f.path}>
                                                <ListItemIcon><EditIcon fontSize="small" color="warning" /></ListItemIcon>
                                                <ListItemText primary={f.path} secondary={`معدّل · ${formatBytes(f.size)}`} />
                                            </ListItem>
                                        ))}
                                        {scanResult.added.map((f) => (
                                            <ListItem key={'A' + f.path}>
                                                <ListItemIcon><AddIcon fontSize="small" color="success" /></ListItemIcon>
                                                <ListItemText primary={f.path} secondary={`جديد · ${formatBytes(f.size)}`} />
                                            </ListItem>
                                        ))}
                                        {scanResult.removed.map((p) => (
                                            <ListItem key={'D' + p}>
                                                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                                                <ListItemText primary={p} secondary="محذوف" />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            </Collapse>
                        </>
                    )}

                    {scanResult.recentCommits.length > 0 && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                آخر التغييرات على GitHub
                            </Typography>
                            <List dense>
                                {scanResult.recentCommits.map((c) => (
                                    <ListItem key={c.sha} secondaryAction={
                                        <IconButton edge="end" size="small" onClick={() => electronAPI?.openExternal(c.url)}>
                                            <OpenInNewIcon fontSize="small" />
                                        </IconButton>
                                    }>
                                        <ListItemIcon><FileIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText
                                            primary={c.message}
                                            secondary={`${c.author} · ${formatDate(c.date)} · ${c.sha}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    )}
                </Paper>
            )}

            {/* ── App info footer ──────────────────────────────── */}
            {appInfo && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.5)}`, fontSize: '0.8rem' }}>
                    <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ color: 'text.secondary' }}>
                        <span>الإصدار: <b>{appInfo.version}</b></span>
                        <span>Electron: <b>{appInfo.electron}</b></span>
                        <span>المنصّة: <b>{appInfo.platform}/{appInfo.arch}</b></span>
                        <span>
                            مجلّد البيانات:{' '}
                            <Link component="button" onClick={() => electronAPI?.openExternal('file:///' + appInfo.userData.replace(/\\/g, '/'))}>
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
