'use strict';

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
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

  if (isDev) {
    log.info('[main] loading dev URL', FRONTEND_DEV_URL);
    await mainWindow.loadURL(FRONTEND_DEV_URL).catch((e) => {
      log.error('[main] dev URL failed', e.message);
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(
        `<h1 style="font-family:sans-serif;color:#fff;background:#0f172a;padding:40px">Vite dev server not reachable at ${FRONTEND_DEV_URL}<br>Run: npm run frontend:dev</h1>`
      )}`);
    });
  } else {
    const indexPath = getFrontendIndexPath();
    if (!fs.existsSync(indexPath)) {
      log.error('[main] frontend index missing at', indexPath);
      await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(
        `<h1 style="font-family:sans-serif;color:#fff;background:#0f172a;padding:40px">Frontend not built. Missing: ${indexPath}</h1>`
      )}`);
    } else {
      await mainWindow.loadFile(indexPath);
    }
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
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

app.whenReady().then(async () => {
  // Clean any leftover staging/old dirs from a previously-interrupted update.
  await updater.cleanupOrphans().catch((e) => log.warn('[main] cleanupOrphans', e.message));

  try {
    const result = await startBackend(
      app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '..'),
      app.getPath('userData'),
      isDev,
    );
    backendUrl = result.url;
    log.info('[main] backend ready at', backendUrl);
  } catch (e) {
    log.error('[main] backend startup failed', e);
    dialog.showErrorBox('فشل تشغيل الخادم الداخلي', e.message);
  }
  await createMainWindow();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => stopBackend());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
