'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const log = require('electron-log');
const { BACKEND_PORT, BACKEND_HOST, APP_FILES_DIR, APP_FILES_LAYOUT } = require('./config.cjs');

let child = null;
let started = false;

function getBackendExePath(appDir, isDev) {
  if (isDev) {
    return null;
  }
  const exeName = process.platform === 'win32' ? 'backend.exe' : 'backend';
  return path.join(appDir, APP_FILES_DIR, APP_FILES_LAYOUT.backend, exeName);
}

function pingBackend(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/health', timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitForBackend(host, port, maxWaitMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    if (await pingBackend(host, port)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function startBackend(appDir, userDataDir, isDev) {
  if (started) return { url: `http://${BACKEND_HOST}:${BACKEND_PORT}`, alreadyRunning: true };
  started = true;

  if (isDev) {
    const ok = await pingBackend(BACKEND_HOST, BACKEND_PORT, 800);
    if (ok) {
      log.info('[backend] dev backend already running on', BACKEND_PORT);
      return { url: `http://${BACKEND_HOST}:${BACKEND_PORT}`, alreadyRunning: true };
    }
    log.warn('[backend] dev mode: backend not detected, expecting external uvicorn on', BACKEND_PORT);
    return { url: `http://${BACKEND_HOST}:${BACKEND_PORT}`, alreadyRunning: false };
  }

  const exePath = getBackendExePath(appDir, false);
  if (!exePath || !fs.existsSync(exePath)) {
    throw new Error(`Backend executable not found at: ${exePath}`);
  }

  const dataDir = path.join(userDataDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'hanouti.db');

  // Auto-backup snapshots must live in durable user data, not the
  // PyInstaller bundle's extraction directory (which is wiped on each launch).
  const backupDir = path.join(userDataDir, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  log.info('[backend] launching', exePath);
  log.info('[backend] db path', dbPath);
  log.info('[backend] backup dir', backupDir);

  child = spawn(exePath, [], {
    cwd: path.dirname(exePath),
    env: {
      ...process.env,
      HANOUTI_DB_PATH: dbPath,
      HANOUTI_HOST: BACKEND_HOST,
      HANOUTI_PORT: String(BACKEND_PORT),
      HANOUTI_BACKUP_DIR: backupDir,
      DATABASE_URL: `sqlite:///${dbPath.replace(/\\/g, '/')}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout.on('data', (data) => log.info('[backend stdout]', data.toString().trim()));
  child.stderr.on('data', (data) => log.warn('[backend stderr]', data.toString().trim()));
  child.on('exit', (code, signal) => {
    log.warn('[backend] exited code=', code, 'signal=', signal);
    started = false;
    child = null;
  });

  // PyInstaller --onefile mode unpacks to %TEMP% on every launch which can
  // take 30-60s on slow HDDs / when antivirus inspects the bundle. Wait up
  // to 90s before declaring failure to avoid false negatives on real shop
  // machines (often Windows 10 on spinning rust).
  const healthy = await waitForBackend(BACKEND_HOST, BACKEND_PORT, 90000);
  if (!healthy) {
    log.error('[backend] failed to become healthy within 90s');
    throw new Error('Backend failed to start within 90 seconds. The PyInstaller bundle may be blocked by antivirus or extracting slowly. Check Windows Defender and try adding an exclusion for the Hanouti install folder.');
  }
  log.info('[backend] healthy on', BACKEND_PORT);
  return { url: `http://${BACKEND_HOST}:${BACKEND_PORT}`, alreadyRunning: false };
}

function stopBackend() {
  if (child && !child.killed) {
    log.info('[backend] terminating child process');
    try {
      child.kill();
    } catch (e) {
      log.warn('[backend] kill failed', e.message);
    }
  }
  started = false;
  child = null;
}

module.exports = { startBackend, stopBackend, pingBackend, BACKEND_PORT, BACKEND_HOST };
