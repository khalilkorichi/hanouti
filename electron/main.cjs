'use strict';

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Notification } = require('electron');
const log = require('electron-log');

const {
  startBackend, stopBackend, BACKEND_HOST, BACKEND_PORT,
} = require('./backend-launcher.cjs');
const updater = require('./updater.cjs');
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
  const base = app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '..');
  return path.join(base, APP_FILES_DIR, APP_FILES_LAYOUT.frontend, 'index.html');
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
      additionalArguments: [`--hanouti-backend=http://${BACKEND_HOST}:${BACKEND_PORT}`],
    },
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
  liveDir: updater.getLiveAppFilesDir(),
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
ipcMain.handle('updater:set-config', (_e, partial) => updater.saveConfig(partial || {}));
ipcMain.handle('updater:scan-changes', async () => {
  try {
    return await updater.scanChanges(sendStatus);
  } catch (e) {
    log.error('[updater] scan failed', e);
    sendStatus({ state: 'error', message: e.message });
    throw e;
  }
});
ipcMain.handle('updater:create-backup', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'اختر مجلد النسخة الاحتياطية',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return await updater.createBackup(result.filePaths[0]);
});
ipcMain.handle('updater:apply-update', async (_e, scanResult) => {
  // Stop the backend BEFORE we apply, otherwise renaming the live dir on
  // Windows fails because backend.exe is locked. We restart it after the swap.
  let backendWasRunning = false;
  try {
    backendWasRunning = true;
    log.info('[updater] stopping backend before apply');
    stopBackend();
    await new Promise((r) => setTimeout(r, 800));
    const result = await updater.applyUpdate(scanResult, sendStatus);
    return result;
  } catch (e) {
    log.error('[updater] apply failed', e);
    sendStatus({ state: 'error', message: e.message, details: e.details });
    throw e;
  } finally {
    if (backendWasRunning && !isDev) {
      try {
        log.info('[updater] restarting backend after apply');
        const r = await startBackend(
          app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '..'),
          app.getPath('userData'),
          isDev,
        );
        backendUrl = r.url;
      } catch (re) {
        log.error('[updater] backend restart failed; user must restart app', re.message);
      }
    }
  }
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
    const result = await updater.scanChanges();
    if (result && result.totalChanges > 0) {
      log.info(`[main] background check: ${result.totalChanges} updates available`);
      // Tell the renderer so it can badge the Settings tab.
      sendStatus({ state: 'updates-available-bg', totalChanges: result.totalChanges, branch: result.branch });
      // OS notification (Windows 10/11 toast).
      if (Notification.isSupported()) {
        const n = new Notification({
          title: 'تحديث جديد متاح — Hanouti',
          body: `يوجد ${result.totalChanges} ملف(ات) جديد(ة). افتح الإعدادات → التحديثات لتطبيق التحديث.`,
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
    } else {
      log.info('[main] background check: up to date');
    }
  } catch (e) {
    log.warn('[main] background check failed (silent):', e.message);
  }
}

app.whenReady().then(async () => {
  // Clean any leftover staging/old dirs from a previously-interrupted update.
  await updater.cleanupOrphans().catch((e) => log.warn('[main] cleanupOrphans', e.message));

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
