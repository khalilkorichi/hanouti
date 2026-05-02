'use strict';

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Notification } = require('electron');
const log = require('electron-log');

const {
  startBackend, stopBackend, BACKEND_HOST, BACKEND_PORT,
} = require('./backend-launcher.cjs');
const updater = require('./updater.cjs');
const hotUpdater = require('./hotUpdater.cjs');
// updater.cjs handles the version+SHA-256 check and the NSIS installer
// flow (for changes that touch backend.exe / electron / native modules).
// hotUpdater.cjs handles LIVE frontend-only updates by extracting a
// signed tarball into a side channel and reloading the window — no UAC,
// no restart, no installer. See each module's header for details.
const { APP_NAME, APP_FILES_DIR, APP_FILES_LAYOUT, FRONTEND_DEV_URL } = require('./config.cjs');

log.transports.file.level = 'info';
log.info('====================');
log.info(`[${APP_NAME}] starting v${app.getVersion()} (packaged=${app.isPackaged})`);

const isDev = !app.isPackaged || process.env.HANOUTI_DEV === '1';
let mainWindow = null;
let backendUrl = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getFrontendIndexPath() {
  // Packaged: ask the hot-updater for the active channel directory
  // (falls back to baseline if no channel is active or it's corrupt).
  // Dev: load directly from frontend/dist (Vite preview path) — only
  // used when developers explicitly disable the dev URL.
  if (app.isPackaged) {
    const dir = hotUpdater.getActiveFrontendDir();
    return path.join(dir, 'index.html');
  }
  return path.join(__dirname, '..', APP_FILES_DIR, APP_FILES_LAYOUT.frontend, 'index.html');
}

function sendStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', payload);
  }
}

function buildSplashHtml(message = 'جاري تشغيل الخادم الداخلي...') {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>Hanouti</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
         color: #fff; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .container { text-align: center; max-width: 520px; padding: 40px; }
  .logo { font-size: 64px; font-weight: 800; letter-spacing: -2px; margin-bottom: 8px;
          background: linear-gradient(135deg, #38BDF8, #818CF8); -webkit-background-clip: text;
          background-clip: text; color: transparent; }
  .tagline { font-size: 18px; color: #94A3B8; margin-bottom: 40px; }
  .spinner { width: 56px; height: 56px; border: 4px solid rgba(56, 189, 248, 0.15);
             border-top-color: #38BDF8; border-radius: 50%; margin: 0 auto 24px;
             animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .status { font-size: 16px; color: #CBD5E1; min-height: 24px; }
  .hint { font-size: 13px; color: #64748B; margin-top: 32px; line-height: 1.6; }
  .version { position: fixed; bottom: 16px; left: 0; right: 0; text-align: center;
             font-size: 12px; color: #475569; }
</style></head><body>
<div class="container">
  <div class="logo">حانوتي</div>
  <div class="tagline">نقطة بيع ذكية</div>
  <div class="spinner"></div>
  <div class="status">${message}</div>
  <div class="hint">قد يستغرق التشغيل الأوّل حتى دقيقة واحدة بينما يفكّ Windows ضغط الملفات.<br>الرجاء الانتظار...</div>
</div>
<div class="version">Hanouti v${app.getVersion()}</div>
</body></html>`;
}

function buildErrorHtml(errorMessage, logPath) {
  const safeMsg = String(errorMessage).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c]);
  const safeLog = String(logPath || '').replace(/\\/g, '\\\\');
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>Hanouti — خطأ</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0F172A; color: #fff;
         min-height: 100vh; padding: 40px; line-height: 1.6; }
  .container { max-width: 720px; margin: 0 auto; }
  h1 { color: #F87171; font-size: 28px; margin-bottom: 8px; }
  .subtitle { color: #94A3B8; font-size: 16px; margin-bottom: 32px; }
  .error-box { background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.3);
               border-radius: 8px; padding: 20px; margin-bottom: 24px; font-family: monospace;
               font-size: 13px; color: #FCA5A5; word-break: break-word; white-space: pre-wrap; }
  h2 { color: #38BDF8; font-size: 18px; margin: 24px 0 12px; }
  ol { margin-right: 20px; color: #CBD5E1; }
  ol li { margin-bottom: 10px; }
  code { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2);
         padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #7DD3FC; direction: ltr;
         display: inline-block; }
  .btn-row { display: flex; gap: 12px; margin-top: 32px; }
  button { background: #38BDF8; color: #0F172A; border: none; padding: 12px 24px;
           border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;
           font-family: inherit; }
  button:hover { background: #0EA5E9; }
  button.secondary { background: transparent; color: #94A3B8; border: 1px solid #334155; }
  button.secondary:hover { background: #1E293B; color: #fff; }
</style></head><body>
<div class="container">
  <h1>تعذّر تشغيل البرنامج</h1>
  <div class="subtitle">حدث خطأ أثناء بدء الخادم الداخلي.</div>
  <div class="error-box">${safeMsg}</div>
  <h2>خطوات الحلّ</h2>
  <ol>
    <li>أغلق البرنامج تماماً وأعد فتحه (انقر بزر الفأرة الأيمن على رمز Hanouti في شريط المهام إن وُجد → إغلاق النافذة).</li>
    <li>إن استمرّت المشكلة، أضف Windows Defender استثناءً للمجلّد:<br><code>C:\\Program Files\\Hanouti\\</code></li>
    <li>شغّل البرنامج بصلاحيات المدير: انقر بزر الفأرة الأيمن على اختصار Hanouti → <strong>Run as administrator</strong></li>
    <li>أرسل لنا ملفّ السجلّ التشخيصي:<br><code>${safeLog}</code></li>
  </ol>
  <div class="btn-row">
    <button onclick="window.location.reload()">إعادة المحاولة</button>
    <button class="secondary" onclick="window.close()">إغلاق</button>
  </div>
</div>
</body></html>`;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: '#0F172A',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // webSecurity:false allows file:// pages to make XHR/fetch calls to
      // http://127.0.0.1:51730 (the bundled backend) without CORS preflight
      // headaches. The window only ever loads our bundled HTML, so this
      // does not expose external attack surface.
      webSecurity: false,
      // Allow chunks loaded via lazy import() under file:// to work despite
      // strict CORS rules around module scripts.
      allowRunningInsecureContent: true,
      additionalArguments: [`--hanouti-backend=http://${BACKEND_HOST}:${BACKEND_PORT}`],
    },
  });

  // Surface renderer crashes / console errors in the main-process log so we
  // can diagnose blank-screen issues from the user's main.log file.
  mainWindow.webContents.on('console-message', (_e, level, message, line, source) => {
    const lvl = ['VERBOSE','INFO','WARN','ERROR'][level] || 'INFO';
    if (lvl === 'ERROR' || lvl === 'WARN') {
      log.warn(`[renderer ${lvl}] ${message} (${source}:${line})`);
    }
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log.error('[renderer] process gone:', details);
  });
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log.error(`[renderer] did-fail-load code=${code} desc=${desc} url=${url}`);
  });

  Menu.setApplicationMenu(null);

  // STEP 1: Show splash IMMEDIATELY so the user sees the app is running.
  // Without this the window only appears after backend is healthy (up to
  // 90s on cold starts) and users assume the app failed to launch.
  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildSplashHtml())}`);
  mainWindow.show();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

async function loadFrontendOrError(errorMessage) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (errorMessage) {
    const logPath = log.transports.file.getFile().path;
    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildErrorHtml(errorMessage, logPath))}`);
    return;
  }
  if (isDev) {
    log.info('[main] loading dev URL', FRONTEND_DEV_URL);
    await mainWindow.loadURL(FRONTEND_DEV_URL).catch(async (e) => {
      log.error('[main] dev URL failed', e.message);
      await loadFrontendOrError(`Vite dev server not reachable at ${FRONTEND_DEV_URL}\nRun: npm run frontend:dev`);
    });
  } else {
    const indexPath = getFrontendIndexPath();
    if (!fs.existsSync(indexPath)) {
      log.error('[main] frontend index missing at', indexPath);
      await loadFrontendOrError(`Frontend not built. Missing: ${indexPath}`);
    } else {
      await mainWindow.loadFile(indexPath);
    }
  }
}

// ─── IPC ───────────────────────────────────────────────────────────────

ipcMain.handle('app:get-info', () => ({
  name: APP_NAME,
  version: app.getVersion(),
  electron: process.versions.electron,
  node: process.versions.node,
  chrome: process.versions.chrome,
  platform: process.platform,
  arch: process.arch,
  isPackaged: app.isPackaged,
  userData: app.getPath('userData'),
  appPath: app.getAppPath(),
}));

ipcMain.handle('backend:get-url', () => backendUrl || `http://${BACKEND_HOST}:${BACKEND_PORT}`);

ipcMain.handle('app:restart', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('shell:open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url);
});

ipcMain.handle('updater:get-config', () => updater.loadConfig());
ipcMain.handle('updater:set-config', (_e, partial) => {
  // Defense in depth: even though sanitizeConfig() in updater.cjs strictly
  // validates each field, restrict the renderer-facing IPC to ONLY the
  // user-mutable fields so the renderer cannot spoof `lastKnownVersion`
  // (which would falsely trigger or suppress the post-install snackbar)
  // or `downloadDir` (which has its own picker IPC that performs a free-
  // space + writability check before persisting).
  const safe = {};
  if (partial && typeof partial === 'object') {
    if (typeof partial.repoOwner === 'string') safe.repoOwner = partial.repoOwner;
    if (typeof partial.repoName === 'string') safe.repoName = partial.repoName;
    if (typeof partial.includePrerelease === 'boolean') safe.includePrerelease = partial.includePrerelease;
  }
  return updater.saveConfig(safe);
});

ipcMain.handle('updater:check', async () => {
  try {
    sendStatus({ state: 'checking' });
    const result = await updater.checkForUpdates();
    sendStatus({ state: 'idle' });
    return result;
  } catch (e) {
    log.error('[updater] check failed:', e.message);
    sendStatus({ state: 'error', message: e.message });
    throw e;
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    // No renderer-supplied data — the updater module re-fetches the
    // latest release and validates the asset host itself.
    return await updater.downloadInstaller(sendStatus);
  } catch (e) {
    // User-initiated cancel is NOT a download failure — translate the
    // sentinel error to an idle status (the renderer's own cancel
    // handler shows its own "تمّ الإلغاء" toast). Other errors keep
    // the original loud failure UI.
    const isCancel = e && (e.message === 'تمّ إلغاء التحميل' || e.name === 'AbortError');
    if (isCancel) {
      log.info('[updater] download canceled by user');
      sendStatus({ state: 'idle' });
      // Re-throw so the renderer-side handleDownload's catch branch
      // doesn't proceed as if the download succeeded.
      throw new Error('canceled');
    }
    log.error('[updater] download failed:', e.message);
    sendStatus({ state: 'error', message: e.message });
    throw e;
  }
});

ipcMain.handle('updater:install', async (_e, installerPath) => {
  try {
    // Stop the backend so its sqlite file isn't locked while NSIS replaces
    // the installed app dir. The OS will of course also kill it when we
    // app.quit(), but stopping early keeps the data file consistent.
    log.info('[updater] stopping backend before installer launch');
    stopBackend();
    await new Promise((r) => setTimeout(r, 400));
    sendStatus({ state: 'installing' });
    return await updater.installAndRelaunch(installerPath);
  } catch (e) {
    log.error('[updater] install launch failed:', e.message);
    sendStatus({ state: 'error', message: e.message });
    throw e;
  }
});

// ─── pause / resume / cancel for active download ──────────────────────
ipcMain.handle('updater:pause', () => updater.pauseDownload());
ipcMain.handle('updater:resume', () => updater.resumeDownload());
ipcMain.handle('updater:cancel', () => updater.cancelDownload());

// ─── configurable download directory ──────────────────────────────────
ipcMain.handle('updater:get-download-info', () => updater.getDownloadDirInfo());
ipcMain.handle('updater:pick-download-dir', async () => {
  // Always validate inside main; never trust a renderer-supplied path.
  return await updater.pickDownloadDir(mainWindow);
});
ipcMain.handle('updater:reset-download-dir', async () => {
  await updater.saveConfig({ downloadDir: null });
  return await updater.getDownloadDirInfo();
});
ipcMain.handle('updater:open-download-folder', async (_e, filePath) => {
  return await updater.openDownloadFolder(filePath);
});
ipcMain.handle('updater:clear-cache', async () => {
  // Wipes the configured download dir's installer artefacts (.exe,
  // .exe.partial, latest.yml). Never touches updater-config.json or
  // any unrelated files. Recovery path for stuck partials that keep
  // failing SHA-512 verification (e.g. yanked-and-republished release).
  return await updater.clearDownloadCache();
});

// ─── hot-update IPC ───────────────────────────────────────────────────
// Live frontend-only updates that don't require the NSIS installer.
// SECURITY: the renderer cannot supply URLs/paths — applyHotUpdate
// re-fetches the latest release inside the main process and validates
// the asset host + SHA-256 of every extracted file before activating.

ipcMain.handle('hotupdate:get-channel', async () => {
  return await hotUpdater.getChannelInfo();
});

ipcMain.handle('hotupdate:apply', async () => {
  try {
    sendStatus({ state: 'hot-updating', phase: 'check', percent: 0 });
    // Re-fetch release+manifest in main process — never trust renderer.
    const release = await updater._fetchLatestReleaseForHotUpdate();
    if (!release) throw new Error('لا توجد إصدارات منشورة على المستودع.');
    const remoteManifest = await updater._fetchRemoteManifest(release);
    if (!remoteManifest) {
      throw new Error('لم يُرفق manifest.json بهذا الإصدار — لا يمكن التحقّق من السلامة.');
    }
    const result = await hotUpdater.applyHotUpdate({
      release,
      remoteManifest,
      onProgress: (p) => sendStatus({
        state: 'hot-updating',
        phase: p.phase,
        percent: typeof p.percent === 'number' ? p.percent : 0,
        received: p.received,
        total: p.total,
      }),
    });
    sendStatus({ state: 'hot-updated', version: result.version, channelName: result.channelName });
    log.info(`[hotupdate] applied ${result.channelName}`);
    return result;
  } catch (e) {
    log.error('[hotupdate] apply failed:', e.message);
    sendStatus({ state: 'error', message: e.message });
    throw e;
  }
});

ipcMain.handle('hotupdate:rollback', async () => {
  try {
    return await hotUpdater.rollbackToBaseline();
  } catch (e) {
    log.error('[hotupdate] rollback failed:', e.message);
    throw e;
  }
});

ipcMain.handle('hotupdate:reload', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { reloaded: false };
  // Force-reload by re-resolving the path (which checks active channel
  // again) and calling loadFile. This applies a freshly-installed channel
  // OR a rollback without restarting the app/backend.
  await loadFrontendOrError(null);
  log.info('[hotupdate] window reloaded');
  return { reloaded: true };
});

// ─── lifecycle ─────────────────────────────────────────────────────────

// ─── background update check ───────────────────────────────────────────
// Runs ~30s after launch, then every 6h. Best-effort, fully silent on
// failure — never bothers the user with errors. Surfaces a single OS-level
// notification (and a renderer event) when updates exist.

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const UPDATE_CHECK_INITIAL_DELAY_MS = 30 * 1000;

async function backgroundUpdateCheck() {
  if (isDev) return;
  try {
    const result = await updater.checkForUpdates();
    if (result && result.state === 'update-available') {
      log.info(`[main] background check: v${result.latestVersion} available (current v${result.currentVersion})`);
      // Tell the renderer so it can badge the Settings tab.
      sendStatus({
        state: 'updates-available-bg',
        latestVersion: result.latestVersion,
        currentVersion: result.currentVersion,
      });
      // Windows 10/11 toast notification.
      if (Notification.isSupported()) {
        const n = new Notification({
          title: 'تحديث جديد متاح — Hanouti',
          body: `الإصدار v${result.latestVersion} جاهز للتحميل. افتح الإعدادات → التحديثات.`,
          silent: false,
        });
        n.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.webContents.send('updater:open-panel');
          }
        });
        n.show();
      }
    } else if (result && result.state === 'up-to-date') {
      log.info('[main] background check: up to date');
    }
  } catch (e) {
    log.warn('[main] background check failed (silent):', e.message);
  }
}

/**
 * One-shot post-install success notification.
 *
 * Compare `lastKnownVersion` (persisted by the previous launch) to the
 * current `app.getVersion()`. If they differ AND the previous version
 * is older, the user just successfully upgraded — surface an Arabic
 * Snackbar with a "ما الجديد؟" link to the GitHub release page. After
 * notifying, persist the new version so we don't fire again on next
 * launch.
 */
async function checkPostInstallSuccess() {
  try {
    const cfg = await updater.loadConfig();
    const current = app.getVersion();
    const previous = cfg.lastKnownVersion;
    // Always persist the current version (idempotent — no-op when equal).
    if (previous !== current) {
      await updater.saveConfig({ lastKnownVersion: current });
    }
    if (!previous || previous === current) return; // first launch or no upgrade
    if (!updater._isNewer(current, previous)) return; // downgrade — don't celebrate

    log.info(`[main] detected successful upgrade from v${previous} to v${current}`);
    // Build the release URL (best effort — works for tags published as v<semver>).
    const releaseUrl = `https://github.com/${cfg.repoOwner}/${cfg.repoName}/releases/tag/v${current}`;
    // Wait for the renderer to be ready before sending so the snackbar
    // doesn't get dropped during initial paint.
    setTimeout(() => {
      sendStatus({
        state: 'upgrade-success',
        from: previous,
        to: current,
        releaseUrl,
      });
    }, 2500);
  } catch (e) {
    log.warn('[main] checkPostInstallSuccess failed:', e.message);
  }
}

app.whenReady().then(async () => {
  // Best-effort cleanup of stale partial downloads / week-old installers.
  await updater.cleanupOldDownloads();

  // STEP 1 — Show splash window IMMEDIATELY so the user always sees the
  // app launch within ~1s of clicking the icon, regardless of how long
  // backend startup takes.
  await createMainWindow();

  // STEP 2 — Start the backend in parallel; meanwhile the splash shows.
  try {
    const result = await startBackend(
      app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '..'),
      app.getPath('userData'),
      isDev,
    );
    backendUrl = result.url;
    log.info('[main] backend ready at', backendUrl);
    // STEP 3 — Backend is healthy: load the real frontend.
    await loadFrontendOrError(null);
  } catch (e) {
    log.error('[main] backend startup failed', e);
    // Show a helpful, in-window error screen with diagnostic steps.
    await loadFrontendOrError(e.message || String(e));
  }

  // STEP 4 — Detect a successful upgrade and notify the user once.
  await checkPostInstallSuccess();

  // Schedule background update checks.
  setTimeout(backgroundUpdateCheck, UPDATE_CHECK_INITIAL_DELAY_MS);
  setInterval(backgroundUpdateCheck, UPDATE_CHECK_INTERVAL_MS);
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => stopBackend());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
