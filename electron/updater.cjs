'use strict';

/**
 * GitHub Releases-based updater (the standard Electron pattern).
 *
 * How it works:
 *   1. checkForUpdates() — calls GitHub /releases/latest, parses tag_name
 *      (e.g. "v1.0.5"), and compares to app.getVersion(). Returns the
 *      release notes + the .exe asset URL if newer.
 *   2. downloadInstaller(asset) — streams the .exe to a temp file under
 *      %APPDATA%/Hanouti/updates/, emitting progress events. Atomic via
 *      `.partial` → final rename only after a complete download.
 *   3. installAndRelaunch(path) — spawns the installer DETACHED so it
 *      survives our quit, then quits the app. NSIS detects the existing
 *      install (perMachine, registered via electron-builder), prompts UAC,
 *      uninstalls the old version, installs the new, and relaunches it
 *      (electron-builder NSIS sets `runAfterFinish: true` by default).
 *
 * Why this replaces the old "git tree diff" updater:
 *   - Old approach tried to copy individual files from the `release-windows`
 *     branch — which doesn't exist on the repo (the build workflow's
 *     "Stage release artifacts on release-windows branch" step always failed
 *     silently, leaving the branch empty). Result: every check returned
 *     "GitHub 404: Branch not found".
 *   - File-by-file copy also can't update electron.exe, the bundled
 *     PyInstaller backend.exe (Windows file lock), or the NSIS uninstaller
 *     itself. Releases-based update covers all three.
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { app, shell } = require('electron');
const { spawn } = require('child_process');
const log = require('electron-log');
const { DEFAULT_UPDATER_CONFIG } = require('./config.cjs');

const CONFIG_FILE = 'updater-config.json';
const UPDATES_SUBDIR = 'updates';

// ─── config ──────────────────────────────────────────────────────────
function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function getUpdatesDir() {
  return path.join(app.getPath('userData'), UPDATES_SUBDIR);
}

async function loadConfig() {
  try {
    const raw = await fsp.readFile(getConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_UPDATER_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_UPDATER_CONFIG };
  }
}

function sanitizeConfig(partial) {
  const out = {};
  if (typeof partial.repoOwner === 'string') {
    const v = partial.repoOwner.trim();
    if (/^[A-Za-z0-9._-]{1,100}$/.test(v)) out.repoOwner = v;
  }
  if (typeof partial.repoName === 'string') {
    const v = partial.repoName.trim();
    if (/^[A-Za-z0-9._-]{1,100}$/.test(v)) out.repoName = v;
  }
  if (typeof partial.includePrerelease === 'boolean') {
    out.includePrerelease = partial.includePrerelease;
  }
  return out;
}

async function saveConfig(partial) {
  const current = await loadConfig();
  const merged = { ...current, ...sanitizeConfig(partial || {}) };
  await fsp.mkdir(path.dirname(getConfigPath()), { recursive: true });
  await fsp.writeFile(getConfigPath(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

// ─── version comparison ───────────────────────────────────────────────
function parseSemver(v) {
  const m = String(v || '').replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+](.+))?$/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), m[4] || ''];
}

function comparePrerelease(a, b) {
  // Semver §11: identifiers with letters compare lexically; numeric
  // identifiers compare numerically; numeric < non-numeric per identifier.
  if (a === b) return 0;
  const ap = a.split('.');
  const bp = b.split('.');
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const x = ap[i];
    const y = bp[i];
    if (x === undefined) return -1; // shorter prerelease < longer
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const d = parseInt(x, 10) - parseInt(y, 10);
      if (d !== 0) return d > 0 ? 1 : -1;
    } else if (xn) {
      return -1; // numeric < non-numeric
    } else if (yn) {
      return 1;
    } else if (x !== y) {
      return x > y ? 1 : -1;
    }
  }
  return 0;
}

function isNewer(remote, current) {
  const r = parseSemver(remote);
  const c = parseSemver(current);
  if (!r || !c) return false;
  for (let i = 0; i < 3; i++) {
    if (r[i] > c[i]) return true;
    if (r[i] < c[i]) return false;
  }
  // Equal numeric parts: a release with no prerelease > any prerelease.
  if (r[3] === '' && c[3] !== '') return true;
  if (r[3] !== '' && c[3] === '') return false;
  // Both prereleases — compare per semver §11 (rc10 > rc2, rc.2 > rc.1).
  return comparePrerelease(r[3], c[3]) > 0;
}

// ─── GitHub API ───────────────────────────────────────────────────────
async function ghJson(url) {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'hanouti-updater',
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchLatestRelease(cfg) {
  // /releases/latest excludes prereleases & drafts automatically.
  if (cfg.includePrerelease) {
    const list = await ghJson(`https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/releases?per_page=10`);
    return Array.isArray(list) ? list.find((r) => !r.draft) || null : null;
  }
  return ghJson(`https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/releases/latest`);
}

function pickWindowsAsset(release) {
  if (!release || !Array.isArray(release.assets)) return null;
  // Real Setup-*.exe installers (exclude blockmaps and yml metadata).
  const installers = release.assets.filter((a) =>
    /\.exe$/i.test(a.name) && !/\.blockmap$/i.test(a.name)
  );
  if (!installers.length) return null;
  // Prefer x64 / win when multiple installers exist.
  return installers.find((a) => /(x64|win)/i.test(a.name)) || installers[0];
}

// ─── public API ───────────────────────────────────────────────────────

async function checkForUpdates() {
  const cfg = await loadConfig();
  const repoUrl = `https://github.com/${cfg.repoOwner}/${cfg.repoName}`;

  let release;
  try {
    release = await fetchLatestRelease(cfg);
  } catch (e) {
    // /releases/latest returns 404 when zero published releases exist.
    if (/404/.test(e.message)) {
      return { state: 'no-releases', repoUrl };
    }
    throw e;
  }
  if (!release) {
    return { state: 'no-releases', repoUrl };
  }

  const currentVersion = app.getVersion();
  const latestVersion = String(release.tag_name || '').replace(/^v/i, '');
  const asset = pickWindowsAsset(release);
  const updateAvailable = isNewer(latestVersion, currentVersion);

  return {
    state: updateAvailable ? 'update-available' : 'up-to-date',
    currentVersion,
    latestVersion,
    releaseName: release.name || release.tag_name,
    releaseNotes: release.body || '',
    releaseDate: release.published_at,
    releaseUrl: release.html_url,
    repoUrl,
    asset: asset
      ? { name: asset.name, size: asset.size, downloadUrl: asset.browser_download_url }
      : null,
  };
}

let activeDownload = null;

// Defense-in-depth: even though we re-fetch the asset URL from GitHub
// inside the main process, also enforce that the host belongs to GitHub.
// Prevents a renderer-side compromise + a hypothetical man-in-the-middle
// in our cached release JSON from redirecting downloads to a hostile host.
const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'codeload.github.com',
]);

/**
 * Download the latest GitHub release installer.
 *
 * SECURITY: this function takes NO renderer-supplied URL. It always
 * re-fetches the latest release in the main process and picks the asset
 * itself, so a compromised renderer cannot persuade us to download or
 * later execute an attacker-controlled binary via the IPC channel.
 */
async function downloadInstaller(send) {
  if (activeDownload) {
    throw new Error('يوجد تحميل آخر نشط بالفعل');
  }

  // Re-fetch the latest release server-side; do NOT trust the renderer.
  const cfg = await loadConfig();
  const release = await fetchLatestRelease(cfg);
  if (!release) throw new Error('لا توجد إصدارات منشورة على المستودع');
  const asset = pickWindowsAsset(release);
  if (!asset || !asset.browser_download_url) {
    throw new Error('لا يوجد ملفّ مثبّت Windows في هذا الإصدار');
  }
  if (!/\.exe$/i.test(asset.name)) {
    throw new Error('الأصل المنشور ليس ملفّ تثبيت .exe');
  }

  // Validate URL & host.
  let parsedUrl;
  try {
    parsedUrl = new URL(asset.browser_download_url);
  } catch {
    throw new Error('رابط التنزيل غير صالح');
  }
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('رابط التنزيل ليس HTTPS');
  }
  if (!ALLOWED_DOWNLOAD_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(`مصدر التنزيل غير مسموح: ${parsedUrl.hostname}`);
  }

  // Whitelist filename chars (defence against weird release-naming) and
  // confine the file inside our updates dir.
  const safeName = String(asset.name).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200);
  const dir = getUpdatesDir();
  await fsp.mkdir(dir, { recursive: true });
  const dest = path.join(dir, safeName);
  const tmp = dest + '.partial';

  // Wipe any prior partial / final file with the same name.
  await fsp.rm(dest, { force: true }).catch(() => {});
  await fsp.rm(tmp, { force: true }).catch(() => {});

  const expectedSize = Number(asset.size) || 0;
  send?.({ state: 'downloading', current: 0, total: expectedSize, percent: 0 });

  log.info(`[updater] downloading ${safeName} from ${parsedUrl.hostname}`);
  const res = await fetch(asset.browser_download_url, {
    headers: { 'User-Agent': 'hanouti-updater' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) {
    throw new Error(`تعذّر التحميل من GitHub: HTTP ${res.status}`);
  }
  // Re-validate the post-redirect host (GitHub redirects to the CDN).
  const finalHost = (() => { try { return new URL(res.url).hostname; } catch { return ''; } })();
  if (finalHost && !ALLOWED_DOWNLOAD_HOSTS.has(finalHost)) {
    throw new Error(`إعادة توجيه التنزيل إلى مضيف غير موثوق: ${finalHost}`);
  }

  const total = Number(res.headers.get('content-length')) || expectedSize;
  const writer = fs.createWriteStream(tmp);

  // Trap stream errors so disk I/O failures surface as proper updater errors.
  let writerError = null;
  writer.on('error', (e) => { writerError = e; log.error('[updater] write stream error:', e.message); });

  let downloaded = 0;
  let lastEmit = 0;
  activeDownload = { tmp, dest };

  try {
    const reader = res.body.getReader();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (writerError) throw writerError;
      const { done, value } = await reader.read();
      if (done) break;
      // Backpressure-aware write.
      if (!writer.write(Buffer.from(value))) {
        await new Promise((resolve, reject) => {
          const onDrain = () => { writer.off('error', onErr); resolve(); };
          const onErr = (e) => { writer.off('drain', onDrain); reject(e); };
          writer.once('drain', onDrain);
          writer.once('error', onErr);
        });
      }
      downloaded += value.length;
      const now = Date.now();
      if (now - lastEmit > 200) {
        const percent = total ? Math.min(99, Math.round((downloaded / total) * 100)) : 0;
        send?.({ state: 'downloading', current: downloaded, total, percent });
        lastEmit = now;
      }
    }
    await new Promise((resolve, reject) => writer.end((err) => (err ? reject(err) : resolve())));

    // Verify size: GitHub gives us the asset size in the API; the download
    // must match exactly. Catches truncated/incomplete downloads.
    if (expectedSize > 0 && downloaded !== expectedSize) {
      throw new Error(`اكتمال التحميل غير متطابق: حجم الملفّ ${downloaded} لا يطابق ${expectedSize} المتوقّع`);
    }

    await fsp.rename(tmp, dest);
    log.info(`[updater] downloaded ${safeName} (${downloaded} bytes) → ${dest}`);
    send?.({ state: 'downloaded', path: dest, size: downloaded });
    return { path: dest, size: downloaded, name: safeName };
  } catch (e) {
    writer.destroy();
    await fsp.rm(tmp, { force: true }).catch(() => {});
    log.error('[updater] download failed:', e.message);
    throw e;
  } finally {
    activeDownload = null;
  }
}

async function installAndRelaunch(installerPath) {
  if (!installerPath || typeof installerPath !== 'string') {
    throw new Error('مسار المثبّت غير صالح');
  }
  // Confine to our updates dir to prevent IPC abuse.
  const resolved = path.resolve(installerPath);
  const updatesDir = path.resolve(getUpdatesDir());
  if (!resolved.startsWith(updatesDir + path.sep) && resolved !== updatesDir) {
    throw new Error('مسار المثبّت خارج المجلّد المسموح');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error('ملفّ التثبيت غير موجود — أعد التحميل');
  }

  log.info('[updater] launching installer (detached):', resolved);

  if (process.platform === 'win32') {
    // Spawn detached so the installer survives our app.quit() and Windows
    // doesn't kill it as part of our process tree. NSIS will trigger UAC
    // and handle the upgrade flow (uninstall existing → install new →
    // relaunch via runAfterFinish).
    const child = spawn(resolved, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
  } else {
    // macOS / Linux fallback — open with the OS default.
    const errMsg = await shell.openPath(resolved);
    if (errMsg) throw new Error(`تعذّر تشغيل المثبّت: ${errMsg}`);
  }

  // Give the installer ~1.2s to spawn before we exit, otherwise on slow
  // machines the UAC prompt can race with app.quit() and never appear.
  setTimeout(() => {
    log.info('[updater] quitting app to allow installer to replace files');
    app.quit();
  }, 1200);

  return { launched: true };
}

/**
 * Best-effort cleanup of stale partials and old downloaded installers
 * (older than 7 days). Runs on app start; never throws.
 */
async function cleanupOldDownloads() {
  try {
    const dir = getUpdatesDir();
    if (!fs.existsSync(dir)) return { cleaned: 0 };
    const entries = await fsp.readdir(dir);
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    let cleaned = 0;
    for (const name of entries) {
      const p = path.join(dir, name);
      try {
        const st = await fsp.stat(p);
        const isPartial = name.endsWith('.partial');
        const isOld = now - st.mtimeMs > SEVEN_DAYS;
        if (isPartial || isOld) {
          await fsp.rm(p, { force: true, recursive: true });
          cleaned++;
        }
      } catch { /* ignore */ }
    }
    if (cleaned) log.info(`[updater] cleaned ${cleaned} stale download(s)`);
    return { cleaned };
  } catch (e) {
    log.warn('[updater] cleanupOldDownloads failed:', e.message);
    return { cleaned: 0 };
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  checkForUpdates,
  downloadInstaller,
  installAndRelaunch,
  cleanupOldDownloads,
  // Exported for tests / debugging only.
  _isNewer: isNewer,
  _pickWindowsAsset: pickWindowsAsset,
};
