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
const os = require('os');
const crypto = require('crypto');
const { app, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const log = require('electron-log');
const {
  DEFAULT_UPDATER_CONFIG,
  MIN_DOWNLOAD_DIR_FREE_BYTES,
  APP_FILES_DIR,
  APP_FILES_LAYOUT,
} = require('./config.cjs');
const APP_FILES_LAYOUT_FRONTEND = APP_FILES_LAYOUT.frontend;

const CONFIG_FILE = 'updater-config.json';
const UPDATES_SUBDIR = 'updates';
const MANIFEST_ASSET_NAME = 'manifest.json';
// Cap how many file entries we ship back to the renderer per category to
// keep the IPC payload + UI render reasonable (a full release manifest can
// have hundreds of files). The full counts/totals are always returned.
const MAX_DIFF_ENTRIES_PER_CATEGORY = 200;

// Defense-in-depth: even though we re-fetch URLs from GitHub inside the
// main process, also enforce that the host belongs to GitHub. Used by
// both the manifest fetch and the installer download.
const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'codeload.github.com',
]);

// ─── config ──────────────────────────────────────────────────────────
function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function getDefaultUpdatesDir() {
  return path.join(app.getPath('userData'), UPDATES_SUBDIR);
}

/**
 * Resolve the directory where the next installer download will land.
 * Falls back to the OS-default <userData>/updates/ if the configured
 * path is missing/invalid/unwritable. NEVER throws — always returns a
 * usable directory.
 */
async function getUpdatesDir() {
  const cfg = await loadConfig().catch(() => ({ ...DEFAULT_UPDATER_CONFIG }));
  if (typeof cfg.downloadDir === 'string' && cfg.downloadDir.trim()) {
    const v = await validateDownloadDir(cfg.downloadDir).catch(() => null);
    if (v && v.ok) return v.path;
    log.warn(`[updater] configured downloadDir invalid (${v?.reason || 'unknown'}); falling back to default`);
  }
  return getDefaultUpdatesDir();
}

/**
 * Validate a user-supplied download directory.
 *   - Absolute path (resolved to canonical form)
 *   - Not a UNC share (\\server\share) — slow, may vanish
 *   - Drive must be a fixed/local drive on Windows (not removable, not
 *     network) — installers on USB sticks fail mid-install
 *   - Directory must exist (or be createable) and be writable
 *   - At least 200 MB of free space on its volume
 *
 * Returns { ok: true, path: <canonical>, freeBytes: <number> } on
 * success, or { ok: false, reason: <Arabic message> } on failure.
 *
 * SECURITY: this is the SOLE gate between the renderer and the actual
 * filesystem path used for downloads. It is called both when the user
 * picks a folder AND every time a download starts (defense in depth).
 */
async function validateDownloadDir(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return { ok: false, reason: 'مسار غير صالح' };
  }
  const trimmed = rawPath.trim();
  // Reject UNC paths (\\server\share\…) — slow, may vanish mid-install.
  if (process.platform === 'win32' && /^\\\\/.test(trimmed)) {
    return { ok: false, reason: 'مسارات الشبكة (\\\\server\\share) غير مدعومة' };
  }
  let resolved;
  try {
    resolved = path.resolve(trimmed);
  } catch {
    return { ok: false, reason: 'تعذّر تحويل المسار إلى صيغة مطلقة' };
  }
  if (!path.isAbsolute(resolved)) {
    return { ok: false, reason: 'يجب أن يكون المسار مطلقاً' };
  }
  // Try to create the directory if it doesn't exist (the user may
  // legitimately point at an empty subfolder of a downloads folder).
  try {
    await fsp.mkdir(resolved, { recursive: true });
  } catch (e) {
    return { ok: false, reason: `تعذّر إنشاء المجلّد: ${e.message}` };
  }
  // Writability test — touch a sentinel file then unlink it.
  const sentinel = path.join(resolved, `.hanouti-write-test-${process.pid}`);
  try {
    await fsp.writeFile(sentinel, 'x');
    await fsp.unlink(sentinel);
  } catch (e) {
    return { ok: false, reason: `المجلّد غير قابل للكتابة: ${e.message}` };
  }
  // Free space on the volume.
  let freeBytes = Number.MAX_SAFE_INTEGER;
  try {
    const st = await fsp.statfs(resolved);
    freeBytes = Number(st.bavail) * Number(st.bsize);
  } catch {
    // statfs unavailable on very old node versions; skip the check.
  }
  if (freeBytes < MIN_DOWNLOAD_DIR_FREE_BYTES) {
    return {
      ok: false,
      reason: `المساحة الفارغة غير كافية (${formatBytesShort(freeBytes)}) — يلزم ${formatBytesShort(MIN_DOWNLOAD_DIR_FREE_BYTES)} على الأقلّ`,
    };
  }
  return { ok: true, path: resolved, freeBytes };
}

function formatBytesShort(n) {
  if (!n || n <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
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
  // downloadDir: explicit null clears it; string is shape-checked here
  // (full validation happens lazily in getUpdatesDir / pickDownloadDir
  // because it requires async fs access).
  if (partial.downloadDir === null) {
    out.downloadDir = null;
  } else if (typeof partial.downloadDir === 'string') {
    const v = partial.downloadDir.trim();
    if (v.length > 0 && v.length < 4096 && !/[\u0000-\u001f]/.test(v)) {
      out.downloadDir = v;
    }
  }
  // lastKnownVersion: only main.cjs writes this; renderer cannot spoof
  // it (we accept it via saveConfig but require strict semver shape).
  if (partial.lastKnownVersion === null) {
    out.lastKnownVersion = null;
  } else if (typeof partial.lastKnownVersion === 'string') {
    const v = partial.lastKnownVersion.trim();
    if (/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(v)) {
      out.lastKnownVersion = v;
    }
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

// ─── pause/resume/cancel state machine ─────────────────────────────────
// Single in-flight download at a time. The state object below is shared
// between the download loop, the IPC handlers, and the cleanup code.
//   paused            → set by pause(); the loop aborts the fetch and
//                       waits on resumePromise. The .partial file is
//                       kept on disk; resume re-issues a Range request.
//   canceled          → hard stop; loop throws and removes the partial.
//   abortController   → current fetch's AbortController (re-created on
//                       each resume). aborting it raises AbortError in
//                       the read loop which we then translate to the
//                       paused/canceled flow.
//   resumePromise     → resolved by resume() to wake the paused loop.
let activeDownload = null;

function getActiveDownloadInfo() {
  if (!activeDownload) return null;
  return {
    name: activeDownload.name,
    total: activeDownload.total,
    downloaded: activeDownload.downloaded,
    paused: !!activeDownload.paused,
    canceled: !!activeDownload.canceled,
    dir: activeDownload.dir,
  };
}

function pauseDownload() {
  if (!activeDownload || activeDownload.canceled) {
    return { ok: false, reason: 'لا يوجد تحميل نشط' };
  }
  if (activeDownload.paused) return { ok: true, alreadyPaused: true };
  activeDownload.paused = true;
  // Sticky epoch counter: incremented on every pause request and read by
  // the loop's catch block. Even if resume fires BEFORE the loop wakes
  // and clears `paused`, the catch block can still tell that an abort
  // was caused by a pause (epoch advanced) and treat it as expected
  // instead of throwing a download-failed error.
  activeDownload.pauseEpoch = (activeDownload.pauseEpoch || 0) + 1;
  // Aborting the fetch unblocks the read() promise with an AbortError;
  // the loop catches it and switches to "wait for resume" mode.
  try { activeDownload.abortController?.abort(); } catch { /* ignore */ }
  return { ok: true };
}

function resumeDownload() {
  if (!activeDownload) return { ok: false, reason: 'لا يوجد تحميل نشط' };
  // Accept resume even if the loop hasn't yet flipped to the paused
  // wait state — the pauseEpoch check in the loop will see this and
  // continue without entering the wait.
  if (!activeDownload.paused && (activeDownload.pauseEpoch || 0) === 0) {
    return { ok: true, notPaused: true };
  }
  activeDownload.paused = false;
  const r = activeDownload.resumeResolver;
  activeDownload.resumeResolver = null;
  if (r) r();
  return { ok: true };
}

function cancelDownload() {
  if (!activeDownload) return { ok: false, reason: 'لا يوجد تحميل نشط' };
  activeDownload.canceled = true;
  // Wake the loop whether it's paused (waiting on resumePromise) or
  // mid-fetch (waiting on read()); both paths check `canceled` next.
  try { activeDownload.abortController?.abort(); } catch { /* ignore */ }
  const r = activeDownload.resumeResolver;
  activeDownload.resumeResolver = null;
  if (r) r();
  return { ok: true };
}

/**
 * Open the configured download folder in the OS file manager. Used by
 * the "فتح مجلّد التنزيلات" button in the settings panel. Returns the
 * resolved path so the renderer can display it as a confirmation.
 */
async function openDownloadFolder(filePath) {
  // If the renderer passes a specific file (e.g. the just-downloaded
  // installer), reveal IT in Explorer instead of just opening the dir.
  if (typeof filePath === 'string' && filePath) {
    const dir = await getUpdatesDir();
    const resolved = path.resolve(filePath);
    if (resolved.startsWith(path.resolve(dir) + path.sep) && fs.existsSync(resolved)) {
      shell.showItemInFolder(resolved);
      return { ok: true, path: resolved };
    }
  }
  const dir = await getUpdatesDir();
  await fsp.mkdir(dir, { recursive: true });
  const err = await shell.openPath(dir);
  if (err) return { ok: false, reason: err };
  return { ok: true, path: dir };
}

/**
 * Show an OS folder picker, validate the chosen path, and persist it
 * to updater-config.json. Called by the IPC handler `updater:pick-
 * download-dir`. Returns { ok, path | reason }.
 */
async function pickDownloadDir(parentWindow) {
  const cur = await loadConfig();
  const defaultPath = (typeof cur.downloadDir === 'string' && cur.downloadDir)
    || getDefaultUpdatesDir();
  const result = await dialog.showOpenDialog(parentWindow || undefined, {
    title: 'اختر مجلّد تنزيلات التحديثات',
    defaultPath,
    properties: ['openDirectory', 'createDirectory', 'showHiddenFiles'],
    buttonLabel: 'استخدم هذا المجلّد',
  });
  if (result.canceled || !result.filePaths || !result.filePaths[0]) {
    return { ok: false, canceled: true };
  }
  const chosen = result.filePaths[0];
  const v = await validateDownloadDir(chosen);
  if (!v.ok) return { ok: false, reason: v.reason };
  await saveConfig({ downloadDir: v.path });
  return { ok: true, path: v.path, freeBytes: v.freeBytes };
}

/**
 * Get info about the configured download directory (for the settings
 * panel display). Reports back the resolved path, free space, and
 * whether the user is using the default vs a custom location.
 */
async function getDownloadDirInfo() {
  const cfg = await loadConfig();
  const usingDefault = !cfg.downloadDir;
  const resolved = await getUpdatesDir();
  let freeBytes = null;
  try {
    const st = await fsp.statfs(resolved);
    freeBytes = Number(st.bavail) * Number(st.bsize);
  } catch { /* ignore */ }
  return {
    path: resolved,
    isDefault: usingDefault,
    defaultPath: getDefaultUpdatesDir(),
    freeBytes,
    minRequiredBytes: MIN_DOWNLOAD_DIR_FREE_BYTES,
  };
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

// ─── file-level (SHA-256) manifest comparison ─────────────────────────
// In addition to the version-number check, the updater fetches a manifest
// of the canonical app-files (frontend-dist + backend-dist) for the latest
// release and compares it against the locally installed copy. This
// surfaces hot-fix re-publishes (same version, different files) and gives
// the user a precise breakdown of what will actually change.

function getInstalledAppFilesDir() {
    // Mirror the path layout used by main.cjs / config.cjs.
    const base = app.isPackaged
        ? path.dirname(app.getAppPath())
        : path.join(__dirname, '..');
    return path.join(base, APP_FILES_DIR);
}

function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

async function walkRelativeFiles(dir, base = dir) {
    const out = [];
    let entries;
    try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            const child = await walkRelativeFiles(full, base);
            out.push(...child);
        } else if (e.isFile()) {
            out.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return out;
}

// Bounded concurrent map — runs `worker(item)` over `items` with at most
// `concurrency` in flight at once. Used to parallelise SHA-256 hashing of
// the local app-files (typically ~400 files); a serial loop adds noticeable
// latency on first update check.
async function mapWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (true) {
            const i = cursor++;
            if (i >= items.length) return;
            try {
                results[i] = await worker(items[i], i);
            } catch (e) {
                results[i] = { __error: e };
            }
        }
    });
    await Promise.all(runners);
    return results;
}

async function computeLocalManifest() {
    const dir = getInstalledAppFilesDir();
    if (!fs.existsSync(dir)) {
        return {
            available: false,
            reason: 'app-files directory not present (development mode or non-installed run)',
            dir,
            fileCount: 0,
            totalSize: 0,
            files: [],
        };
    }
    const rels = await walkRelativeFiles(dir);
    rels.sort((a, b) => a.localeCompare(b));

    // 8-way parallel hashing — safe for typical SSD/HDD I/O; well below
    // libuv's default thread pool (4) saturating limit because crypto
    // streams use the kernel's async fs read path, not the threadpool.
    const HASH_CONCURRENCY = 8;
    const computed = await mapWithConcurrency(rels, HASH_CONCURRENCY, async (rel) => {
        const full = path.join(dir, rel);
        const stat = await fsp.stat(full);
        const sha256 = await sha256File(full);
        return { path: rel, size: stat.size, sha256 };
    });

    const files = [];
    let totalSize = 0;
    for (let i = 0; i < computed.length; i++) {
        const c = computed[i];
        if (!c || c.__error) {
            log.warn(`[updater] hash failed for ${rels[i]}: ${c?.__error?.message || 'unknown'}`);
            continue;
        }
        files.push(c);
        totalSize += c.size;
    }
    return {
        available: true,
        dir,
        fileCount: files.length,
        totalSize,
        files,
    };
}

function pickManifestAsset(release) {
    if (!release || !Array.isArray(release.assets)) return null;
    return release.assets.find((a) => a.name === MANIFEST_ASSET_NAME) || null;
}

async function fetchRemoteManifest(release) {
    const asset = pickManifestAsset(release);
    if (!asset || !asset.browser_download_url) return null;
    // Validate URL host (defence-in-depth).
    let parsed;
    try { parsed = new URL(asset.browser_download_url); }
    catch { return null; }
    if (parsed.protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
        log.warn(`[updater] refusing manifest from untrusted host: ${parsed.hostname}`);
        return null;
    }
    try {
        const res = await fetch(asset.browser_download_url, {
            headers: { 'Accept': 'application/octet-stream', 'User-Agent': 'hanouti-updater' },
            redirect: 'follow',
        });
        if (!res.ok) {
            log.warn(`[updater] manifest fetch HTTP ${res.status}`);
            return null;
        }
        // Re-validate post-redirect host (CDN). Fail-closed: any failure
        // to parse or any non-allow-listed/empty host rejects the response.
        let finalHost = '';
        try { finalHost = new URL(res.url).hostname; } catch { finalHost = ''; }
        if (!finalHost || !ALLOWED_DOWNLOAD_HOSTS.has(finalHost)) {
            log.warn(`[updater] manifest redirected to untrusted/unknown host: "${finalHost}"`);
            return null;
        }
        const json = await res.json();
        if (!json || !Array.isArray(json.files)) {
            log.warn('[updater] manifest payload malformed (missing files[])');
            return null;
        }
        return json;
    } catch (e) {
        log.warn('[updater] manifest fetch/parse failed:', e.message);
        return null;
    }
}

function compareManifests(local, remote) {
    if (!remote || !Array.isArray(remote.files)) {
        return {
            available: false,
            reason: 'لم يُرفق manifest.json بهذا الإصدار — يستحيل المقارنة الشاملة بالملفّات.',
        };
    }
    if (!local.available) {
        return {
            available: false,
            reason: local.reason || 'تعذّر حساب بصمات الملفّات المحلّية',
            remoteFileCount: remote.files.length,
            remoteTotalSize: remote.totalSize || 0,
        };
    }
    const FRONTEND_PREFIX = `${APP_FILES_LAYOUT_FRONTEND}/`;
    const localMap = new Map(local.files.map((f) => [f.path, f]));
    const remoteMap = new Map(remote.files.map((f) => [f.path, f]));
    const changed = [];
    const added = [];
    const removed = [];
    let unchangedCount = 0;
    // Track whether ANY mutation touches a non-frontend file. Done while
    // building the diff so the classification works even when we later
    // truncate the per-category arrays for the IPC payload.
    let hasNonFrontendChange = false;
    for (const r of remote.files) {
        const l = localMap.get(r.path);
        if (!l) {
            added.push({ path: r.path, size: r.size });
            if (!r.path.startsWith(FRONTEND_PREFIX)) hasNonFrontendChange = true;
        } else if (l.sha256 !== r.sha256 || l.size !== r.size) {
            changed.push({ path: r.path, size: r.size, oldSize: l.size });
            if (!r.path.startsWith(FRONTEND_PREFIX)) hasNonFrontendChange = true;
        } else {
            unchangedCount++;
        }
    }
    for (const l of local.files) {
        if (!remoteMap.has(l.path)) {
            removed.push({ path: l.path, size: l.size });
            if (!l.path.startsWith(FRONTEND_PREFIX)) hasNonFrontendChange = true;
        }
    }
    const downloadSize = changed.reduce((s, f) => s + f.size, 0)
        + added.reduce((s, f) => s + f.size, 0);
    const inSync = changed.length === 0 && added.length === 0 && removed.length === 0;
    const truncate = (arr) => arr.length > MAX_DIFF_ENTRIES_PER_CATEGORY
        ? { sample: arr.slice(0, MAX_DIFF_ENTRIES_PER_CATEGORY), truncated: true }
        : { sample: arr, truncated: false };
    const c = truncate(changed);
    const a = truncate(added);
    const r = truncate(removed);
    return {
        available: true,
        inSync,
        // True when every changed/added/removed file lives under
        // app-files/frontend-dist/. Used by hotUpdater.classifyDiff() to
        // decide whether we can skip the NSIS installer.
        frontendOnly: !hasNonFrontendChange,
        counts: {
            changed: changed.length,
            added: added.length,
            removed: removed.length,
            unchanged: unchangedCount,
            total: remote.files.length,
        },
        downloadSize,
        localTotalSize: local.totalSize,
        remoteTotalSize: remote.totalSize || 0,
        changed: c.sample,
        added: a.sample,
        removed: r.sample,
        truncated: {
            changed: c.truncated,
            added: a.truncated,
            removed: r.truncated,
        },
        manifestVersion: remote.version || null,
        manifestGeneratedAt: remote.generatedAt || null,
    };
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
  const versionIsNewer = isNewer(latestVersion, currentVersion);

  // ─── file-level (SHA-256) comparison ─────────────────────────────
  // Even when the version matches, we hash every locally-installed
  // file and compare against the release's manifest.json. This catches
  // hot-fix re-publishes (same tag, different files) and gives the
  // user a precise "what will actually change" breakdown.
  let fileDiff = { available: false, reason: 'لم يبدأ التحليل بعد' };
  try {
    const [localManifest, remoteManifest] = await Promise.all([
      computeLocalManifest(),
      fetchRemoteManifest(release),
    ]);
    fileDiff = compareManifests(localManifest, remoteManifest);
  } catch (e) {
    log.warn('[updater] file diff failed:', e.message);
    fileDiff = { available: false, reason: `تعذّر التحليل الشامل: ${e.message}` };
  }

  // ─── decision rule ───────────────────────────────────────────────
  // The INSTALLED VERSION is the single source of truth for whether an
  // update exists. We only show "تحديث جديد" when the GitHub release
  // tag is strictly newer than `app.getVersion()`.
  //
  // File-level differences (filesDiffer) are kept as PURELY INFORMATIONAL
  // metadata exposed to the UI — they do NOT trigger "update available".
  //
  // Why: the local manifest hashes EVERY file under `app-files/`, but at
  // runtime the backend writes legitimate files there (sqlite DBs, logs,
  // generated PDFs/exports), and users who upgraded from < v1.0.9 may
  // never have had a manifest baseline at all. Treating any byte
  // mismatch as "new release" produced perpetual false-positive update
  // banners — exactly what this fix removes. If a same-version hot-fix
  // republish ever needs to be applied, the user can re-run the
  // installer manually from the "إصلاح الملفّات" link.
  const filesDiffer = fileDiff.available && !fileDiff.inSync;
  const updateAvailable = versionIsNewer;

  // Decide HOW the update should be applied:
  //   'none'       → no newer version published (file diff is informational)
  //   'hot'        → newer version + only frontend files differ → live update
  //                  via hotUpdater (no UAC, no restart, no installer)
  //   'installer'  → newer version + backend.exe/electron/native files
  //                  differ → must go through the NSIS installer flow
  //   'unknown'    → manifest unavailable → fall back to installer
  const hotArchive = pickHotArchiveAsset(release);
  let updateMode;
  if (!updateAvailable) {
    updateMode = 'none';
  } else if (fileDiff.available && fileDiff.frontendOnly && hotArchive) {
    updateMode = 'hot';
  } else if (fileDiff.available) {
    updateMode = 'installer';
  } else {
    updateMode = 'unknown';
  }

  return {
    state: updateAvailable ? 'update-available' : 'up-to-date',
    currentVersion,
    latestVersion,
    versionIsNewer,
    filesDiffer,
    updateMode,
    releaseName: release.name || release.tag_name,
    releaseNotes: release.body || '',
    releaseDate: release.published_at,
    releaseUrl: release.html_url,
    repoUrl,
    asset: asset
      ? { name: asset.name, size: asset.size, downloadUrl: asset.browser_download_url }
      : null,
    hotArchive: hotArchive
      ? { name: hotArchive.name, size: hotArchive.size, downloadUrl: hotArchive.browser_download_url }
      : null,
    fileDiff,
  };
}

function pickHotArchiveAsset(release) {
  if (!release || !Array.isArray(release.assets)) return null;
  return release.assets.find((a) => a.name === 'frontend-dist.tar.gz') || null;
}

function pickLatestYmlAsset(release) {
  if (!release || !Array.isArray(release.assets)) return null;
  // electron-builder names the metadata asset "latest.yml" for win32.
  return release.assets.find((a) => a.name === 'latest.yml') || null;
}

/**
 * Minimal latest.yml parser. electron-builder's metadata is a tiny,
 * well-formed YAML subset (top-level scalars + a `files:` array of
 * { url, sha512, size }). We only need three fields per file, so a
 * 50-line parser is enough — much better than pulling in js-yaml as
 * a runtime dependency for this single purpose.
 *
 * Returns: { path, sha512, size, files: [{url, sha512, size}] }
 *   sha512 is base64 (electron-builder's standard format).
 */
function parseLatestYml(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = { files: [] };
  let inFiles = false;
  let cur = null;
  const finishFile = () => {
    if (cur && cur.url) out.files.push(cur);
    cur = null;
  };
  for (const raw of lines) {
    if (!raw.trim()) continue;
    if (/^files:\s*$/i.test(raw)) { inFiles = true; continue; }
    if (inFiles) {
      const itemMatch = raw.match(/^\s*-\s*url:\s*(.+?)\s*$/);
      if (itemMatch) { finishFile(); cur = { url: itemMatch[1] }; continue; }
      const sha = raw.match(/^\s+sha512:\s*(.+?)\s*$/);
      if (sha && cur) { cur.sha512 = sha[1].replace(/^['"]|['"]$/g, ''); continue; }
      const sz = raw.match(/^\s+size:\s*(\d+)/);
      if (sz && cur) { cur.size = parseInt(sz[1], 10); continue; }
      // Top-level key after files: → end of the array.
      if (/^\S/.test(raw)) { finishFile(); inFiles = false; }
    }
    if (!inFiles) {
      const top = raw.match(/^([A-Za-z][\w]*):\s*(.*)$/);
      if (top) {
        const [, k, v] = top;
        out[k] = v.trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  finishFile();
  return out;
}

async function fetchLatestYml(release) {
  const asset = pickLatestYmlAsset(release);
  if (!asset || !asset.browser_download_url) return null;
  let parsed;
  try { parsed = new URL(asset.browser_download_url); } catch { return null; }
  if (parsed.protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
    return null;
  }
  try {
    const res = await fetch(asset.browser_download_url, {
      headers: { 'Accept': 'application/octet-stream', 'User-Agent': 'hanouti-updater' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const finalHost = (() => { try { return new URL(res.url).hostname; } catch { return ''; } })();
    if (finalHost && !ALLOWED_DOWNLOAD_HOSTS.has(finalHost)) return null;
    return parseLatestYml(await res.text());
  } catch (e) {
    log.warn('[updater] latest.yml fetch failed:', e.message);
    return null;
  }
}

function sha512FileBase64(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('base64')));
  });
}

/**
 * Look in the configured download dir for an existing installer that
 * matches the SHA-512 + size from latest.yml. If found, the user can
 * skip re-downloading entirely (e.g. they downloaded yesterday but
 * haven't installed yet). Returns { path, size } on hit, null on miss.
 */
async function findExistingMatchingInstaller(dir, asset, ymlMeta) {
  if (!asset || !ymlMeta || !Array.isArray(ymlMeta.files)) return null;
  const target = ymlMeta.files.find((f) => f.url === asset.name);
  if (!target || !target.sha512) return null;
  const candidate = path.join(dir, asset.name);
  if (!fs.existsSync(candidate)) return null;
  try {
    const stat = await fsp.stat(candidate);
    if (target.size && stat.size !== target.size) return null;
    const localSha = await sha512FileBase64(candidate);
    if (localSha === target.sha512) {
      log.info(`[updater] reusing existing installer at ${candidate} (sha512 match)`);
      return { path: candidate, size: stat.size };
    }
    log.info(`[updater] existing installer at ${candidate} has stale sha512; will re-download`);
  } catch (e) {
    log.warn(`[updater] reuse check failed for ${candidate}: ${e.message}`);
  }
  return null;
}

/**
 * Download the latest GitHub release installer.
 *
 * SECURITY: this function takes NO renderer-supplied URL. It always
 * re-fetches the latest release in the main process and picks the asset
 * itself, so a compromised renderer cannot persuade us to download or
 * later execute an attacker-controlled binary via the IPC channel.
 *
 * Features added in v1.0.8:
 *   • Pause / resume — implemented via fetch AbortController + HTTP
 *     Range header. The .partial file is preserved across pauses.
 *   • Speed / ETA — sliding 5-second window of byte counts; emitted
 *     in the `downloading` status payload roughly 5×/sec.
 *   • Reuse-existing — checks SHA-512 of an installer already on
 *     disk in the configured download dir. On match, skips the
 *     download entirely and emits `downloaded` with reused: true.
 *   • Configurable download dir — re-validates the dir on every call.
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

  // Whitelist filename chars (defence against weird release-naming).
  const safeName = String(asset.name).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200);
  const dir = await getUpdatesDir();
  await fsp.mkdir(dir, { recursive: true });
  const dest = path.join(dir, safeName);
  const tmp = dest + '.partial';

  // ─── Reuse-existing-installer check (latest.yml SHA-512) ──────
  // Saves bandwidth + time when the user has already downloaded but
  // not yet installed. Must come BEFORE we wipe the destination file.
  const ymlMeta = await fetchLatestYml(release).catch(() => null);
  const reused = await findExistingMatchingInstaller(dir, { ...asset, name: safeName }, ymlMeta);
  if (reused) {
    send?.({ state: 'downloaded', path: reused.path, size: reused.size, reused: true, name: safeName });
    return { path: reused.path, size: reused.size, name: safeName, reused: true };
  }

  // Validate URL & host (only needed when we'll actually fetch).
  let parsedUrl;
  try { parsedUrl = new URL(asset.browser_download_url); }
  catch { throw new Error('رابط التنزيل غير صالح'); }
  if (parsedUrl.protocol !== 'https:') throw new Error('رابط التنزيل ليس HTTPS');
  if (!ALLOWED_DOWNLOAD_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(`مصدر التنزيل غير مسموح: ${parsedUrl.hostname}`);
  }

  const expectedSize = Number(asset.size) || 0;

  // Decide whether to RESUME an existing partial or START FRESH.
  // We only resume when a .partial exists AND its size is < expected
  // (otherwise it's stale/complete) AND the dest doesn't exist.
  let resumeOffset = 0;
  if (fs.existsSync(tmp) && expectedSize > 0) {
    try {
      const st = await fsp.stat(tmp);
      if (st.size > 0 && st.size < expectedSize) {
        resumeOffset = st.size;
        log.info(`[updater] resuming download from byte ${resumeOffset} / ${expectedSize}`);
      } else {
        await fsp.rm(tmp, { force: true }).catch(() => {});
      }
    } catch { /* ignore — treat as fresh */ }
  } else {
    await fsp.rm(tmp, { force: true }).catch(() => {});
  }
  await fsp.rm(dest, { force: true }).catch(() => {});

  // ─── Active download state ────────────────────────────────────
  // Single in-flight download; pause/resume/cancel mutate this object
  // and the read loop polls it between chunks.
  const state = {
    name: safeName,
    dest, tmp, dir,
    total: expectedSize,
    downloaded: resumeOffset,
    paused: false,
    pauseEpoch: 0,
    canceled: false,
    abortController: null,
    resumeResolver: null,
    speedSamples: [{ at: Date.now(), bytes: resumeOffset }],
    lastEmit: 0,
  };
  activeDownload = state;

  log.info(`[updater] downloading ${safeName} → ${dir} (resume=${resumeOffset > 0})`);

  try {
    // Outer loop: each iteration = one fetch attempt. We re-enter the
    // loop on resume after a pause (re-issuing fetch with Range).
    while (true) {
      if (state.canceled) throw new Error('تمّ إلغاء التحميل');

      state.abortController = new AbortController();
      const headers = { 'User-Agent': 'hanouti-updater' };
      if (state.downloaded > 0) {
        headers['Range'] = `bytes=${state.downloaded}-`;
      }
      // Capture the epoch BEFORE issuing the fetch so the catch block
      // can detect "a pause was requested for THIS attempt" even if
      // resume already cleared `state.paused` by the time we get here.
      const epochAtStart = state.pauseEpoch;
      let res;
      try {
        res = await fetch(asset.browser_download_url, {
          headers, redirect: 'follow', signal: state.abortController.signal,
        });
      } catch (e) {
        if (e.name === 'AbortError') {
          // Either pause, resume-after-pause, or cancel.
          if (state.canceled) throw new Error('تمّ إلغاء التحميل');
          if (state.paused) {
            send?.({ state: 'paused', current: state.downloaded, total: state.total, name: safeName });
            await new Promise((r) => { state.resumeResolver = r; });
            if (state.canceled) throw new Error('تمّ إلغاء التحميل');
            send?.({ state: 'downloading', current: state.downloaded, total: state.total, percent: state.total ? Math.round((state.downloaded / state.total) * 100) : 0, speed: 0, eta: null, name: safeName });
            // Reset speed window so the resume blip doesn't poison ETA.
            state.speedSamples = [{ at: Date.now(), bytes: state.downloaded }];
            continue;
          }
          if (state.pauseEpoch > epochAtStart) {
            // User clicked pause then resume so quickly that `paused`
            // is already back to false. Treat the abort as expected
            // and just retry the fetch with a Range header.
            state.speedSamples = [{ at: Date.now(), bytes: state.downloaded }];
            continue;
          }
        }
        throw e;
      }

      // 416 Range Not Satisfiable → server rejected our offset; fall
      // back to a fresh full download.
      if (res.status === 416 && state.downloaded > 0) {
        log.warn('[updater] server rejected range; restarting fresh');
        await fsp.rm(state.tmp, { force: true }).catch(() => {});
        state.downloaded = 0;
        state.speedSamples = [{ at: Date.now(), bytes: 0 }];
        continue;
      }
      if (state.downloaded > 0 && res.status !== 206) {
        log.warn(`[updater] expected 206 partial, got ${res.status}; restarting fresh`);
        await fsp.rm(state.tmp, { force: true }).catch(() => {});
        state.downloaded = 0;
        state.speedSamples = [{ at: Date.now(), bytes: 0 }];
        continue;
      }
      if (!res.ok && res.status !== 206) {
        throw new Error(`تعذّر التحميل من GitHub: HTTP ${res.status}`);
      }
      if (!res.body) throw new Error('استجابة فارغة من GitHub');

      // Re-validate the post-redirect host (GitHub redirects to the CDN).
      const finalHost = (() => { try { return new URL(res.url).hostname; } catch { return ''; } })();
      if (finalHost && !ALLOWED_DOWNLOAD_HOSTS.has(finalHost)) {
        throw new Error(`إعادة توجيه التنزيل إلى مضيف غير موثوق: ${finalHost}`);
      }

      // Open writer in append mode if resuming, write mode if fresh.
      const writer = fs.createWriteStream(state.tmp, { flags: state.downloaded > 0 ? 'a' : 'w' });
      let writerError = null;
      writer.on('error', (e) => { writerError = e; log.error('[updater] write stream error:', e.message); });

      const reader = res.body.getReader();
      let interrupted = false;
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (writerError) throw writerError;
          if (state.canceled) { interrupted = true; throw new Error('تمّ إلغاء التحميل'); }

          let chunk;
          try {
            chunk = await reader.read();
          } catch (e) {
            if (e.name === 'AbortError') {
              interrupted = true;
              if (state.canceled) throw new Error('تمّ إلغاء التحميل');
              if (state.paused) break; // outer loop handles pause
              if (state.pauseEpoch > epochAtStart) {
                // Resume already cleared `paused`; outer loop just retries.
                break;
              }
            }
            throw e;
          }
          const { done, value } = chunk;
          if (done) break;

          if (!writer.write(Buffer.from(value))) {
            await new Promise((resolve, reject) => {
              const onDrain = () => { writer.off('error', onErr); resolve(); };
              const onErr = (e) => { writer.off('drain', onDrain); reject(e); };
              writer.once('drain', onDrain);
              writer.once('error', onErr);
            });
          }
          state.downloaded += value.length;

          // Track speed in a sliding 5-second window.
          const now = Date.now();
          state.speedSamples.push({ at: now, bytes: state.downloaded });
          while (state.speedSamples.length > 1 && now - state.speedSamples[0].at > 5000) {
            state.speedSamples.shift();
          }

          if (now - state.lastEmit > 200) {
            const percent = state.total ? Math.min(99, Math.round((state.downloaded / state.total) * 100)) : 0;
            const oldest = state.speedSamples[0];
            const span = Math.max(1, now - oldest.at);
            const bytesInWindow = state.downloaded - oldest.bytes;
            const speed = span > 200 ? Math.round((bytesInWindow * 1000) / span) : 0;
            const eta = (speed > 0 && state.total > 0)
              ? Math.max(0, Math.ceil((state.total - state.downloaded) / speed))
              : null;
            send?.({
              state: 'downloading',
              current: state.downloaded,
              total: state.total,
              percent,
              speed,
              eta,
              name: safeName,
            });
            state.lastEmit = now;
          }
        }
      } finally {
        // Flush+close before either retrying or finishing.
        await new Promise((resolve) => writer.end(resolve));
      }

      if (interrupted) {
        if (state.paused) {
          send?.({ state: 'paused', current: state.downloaded, total: state.total, name: safeName });
          await new Promise((r) => { state.resumeResolver = r; });
          if (state.canceled) throw new Error('تمّ إلغاء التحميل');
          send?.({ state: 'downloading', current: state.downloaded, total: state.total, percent: state.total ? Math.round((state.downloaded / state.total) * 100) : 0, speed: 0, eta: null, name: safeName });
          state.speedSamples = [{ at: Date.now(), bytes: state.downloaded }];
          continue; // re-enter outer loop with Range
        }
        if (state.pauseEpoch > epochAtStart) {
          // Resume-after-pause raced ahead of the loop; just retry.
          state.speedSamples = [{ at: Date.now(), bytes: state.downloaded }];
          continue;
        }
      }

      // ─── Successful completion ───────────────────────────────
      // Verify size if we know it; mismatch = corrupt download.
      if (expectedSize > 0 && state.downloaded !== expectedSize) {
        throw new Error(`اكتمال التحميل غير متطابق: حجم الملفّ ${state.downloaded} لا يطابق ${expectedSize} المتوقّع`);
      }
      // Verify SHA-512 if latest.yml gave us a target hash.
      if (ymlMeta) {
        const target = ymlMeta.files.find((f) => f.url === asset.name);
        if (target && target.sha512) {
          const localSha = await sha512FileBase64(state.tmp);
          if (localSha !== target.sha512) {
            throw new Error('بصمة SHA-512 لا تطابق latest.yml — قد يكون الملفّ تالفاً');
          }
        }
      }
      await fsp.rename(state.tmp, state.dest);
      log.info(`[updater] downloaded ${safeName} (${state.downloaded} bytes) → ${state.dest}`);
      send?.({ state: 'downloaded', path: state.dest, size: state.downloaded, name: safeName });
      return { path: state.dest, size: state.downloaded, name: safeName, reused: false };
    }
  } catch (e) {
    // Hard failure (NOT a pause): wipe partial only if cancelled or
    // if it's not a transient error worth resuming from. We KEEP the
    // partial when the user just lost wifi — they can retry and resume.
    if (state.canceled) {
      await fsp.rm(state.tmp, { force: true }).catch(() => {});
    }
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
  // Confine to either the configured updates dir OR the legacy default
  // (covers the case where the user changed the dir AFTER downloading).
  const resolved = path.resolve(installerPath);
  const allowedDirs = [
    path.resolve(await getUpdatesDir()),
    path.resolve(getDefaultUpdatesDir()),
  ];
  const inAllowed = allowedDirs.some((d) => resolved.startsWith(d + path.sep) || resolved === d);
  if (!inAllowed) {
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
 * User-initiated wipe of the download cache. Removes every `*.exe`,
 * `*.exe.partial` and `latest.yml` from the configured download dir
 * so the next update check re-downloads from scratch.
 *
 * Use case: a stuck partial that keeps failing SHA-512 verification
 * after a release was yanked + republished under the same version.
 *
 * Safety:
 *   - Refuses while a download is active (would race the writer).
 *   - Only touches a strict allow-list of extensions/names. Anything
 *     else in the folder (notably the user's own files if they pointed
 *     downloadDir at e.g. ~/Downloads, and our own `config.json` /
 *     `updater-config.json`) is left untouched.
 *   - Per-file errors are collected and reported; one stuck file does
 *     not abort the rest of the wipe.
 */
async function clearDownloadCache() {
  if (activeDownload && !activeDownload.canceled) {
    return {
      ok: false,
      reason: 'يوجد تحميل نشط — أوقفه أوّلاً قبل مسح الملفّات المؤقّتة',
      removed: 0,
    };
  }
  const dir = await getUpdatesDir();
  if (!fs.existsSync(dir)) {
    return { ok: true, removed: 0, dir, errors: [] };
  }
  let entries;
  try {
    entries = await fsp.readdir(dir);
  } catch (e) {
    return { ok: false, reason: `تعذّر قراءة المجلّد: ${e.message}`, removed: 0 };
  }
  const errors = [];
  let removed = 0;
  // Strict allow-list — only Hanouti installer artefacts. Critically,
  // the user may point downloadDir at a shared location like
  // ~/Downloads, so we MUST NOT delete arbitrary `.exe` files there.
  // electron-builder.yml sets artifactName to "Hanouti-Setup-${version}
  // -${arch}.${ext}", so every installer (and its `.partial` mid-
  // download counterpart) starts with "Hanouti-Setup-" and ends in
  // ".exe" or ".exe.partial". `latest.yml` is fixed by electron-builder.
  const HANOUTI_INSTALLER_RE = /^Hanouti-Setup-.+\.exe(\.partial)?$/i;
  for (const name of entries) {
    const isHanoutiInstaller = HANOUTI_INSTALLER_RE.test(name);
    const isYml = name.toLowerCase() === 'latest.yml';
    if (!isHanoutiInstaller && !isYml) continue;
    const full = path.join(dir, name);
    try {
      const st = await fsp.stat(full);
      if (!st.isFile()) continue;
      await fsp.rm(full, { force: true });
      removed++;
    } catch (e) {
      errors.push({ name, message: e.message });
    }
  }
  log.info(`[updater] clearDownloadCache: removed ${removed} file(s) from ${dir}` +
           (errors.length ? `, ${errors.length} error(s)` : ''));
  return { ok: errors.length === 0, removed, dir, errors };
}

/**
 * Best-effort cleanup of stale partials and old downloaded installers
 * (older than 7 days). Runs on app start; never throws.
 */
async function cleanupOldDownloads() {
  try {
    const dir = await getUpdatesDir();
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

// Convenience for the hot-update IPC: fetch the latest release using the
// user's saved updater config, applying the same prerelease/host policy
// as checkForUpdates. Exposed because hotUpdater needs the raw release
// object (with assets[]) to find frontend-dist.tar.gz.
async function _fetchLatestReleaseForHotUpdate() {
  const cfg = await loadConfig();
  return await fetchLatestRelease(cfg);
}

module.exports = {
  loadConfig,
  saveConfig,
  checkForUpdates,
  downloadInstaller,
  installAndRelaunch,
  cleanupOldDownloads,
  // Pause / resume / cancel for the active download.
  pauseDownload,
  resumeDownload,
  cancelDownload,
  getActiveDownloadInfo,
  // Configurable download directory (settings panel).
  pickDownloadDir,
  validateDownloadDir,
  getDownloadDirInfo,
  openDownloadFolder,
  clearDownloadCache,
  // Used by hotUpdater (main process only).
  _fetchLatestReleaseForHotUpdate,
  _fetchRemoteManifest: fetchRemoteManifest,
  // Exported for tests / debugging only.
  _isNewer: isNewer,
  _pickWindowsAsset: pickWindowsAsset,
  _computeLocalManifest: computeLocalManifest,
  _compareManifests: compareManifests,
  _parseLatestYml: parseLatestYml,
};
