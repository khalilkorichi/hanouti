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
const crypto = require('crypto');
const { app, shell } = require('electron');
const { spawn } = require('child_process');
const log = require('electron-log');
const { DEFAULT_UPDATER_CONFIG, APP_FILES_DIR, APP_FILES_LAYOUT } = require('./config.cjs');
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

  // Update is offered when EITHER the version is newer OR the file
  // diff shows real differences. The latter handles same-version
  // hot-fixes; the former preserves the classic semver contract.
  const filesDiffer = fileDiff.available && !fileDiff.inSync;
  const updateAvailable = versionIsNewer || filesDiffer;

  // Decide HOW the update should be applied:
  //   'none'       → already in sync, nothing to do
  //   'hot'        → only frontend files differ → can be applied live
  //                  via hotUpdater (no UAC, no restart, no installer)
  //   'installer'  → backend.exe / electron / native files differ → must
  //                  go through the NSIS installer flow
  //   'unknown'    → manifest unavailable → fall back to installer
  const hotArchive = pickHotArchiveAsset(release);
  let updateMode = 'unknown';
  if (fileDiff.available) {
    if (fileDiff.inSync) updateMode = 'none';
    else if (fileDiff.frontendOnly && hotArchive) updateMode = 'hot';
    else updateMode = 'installer';
  } else if (updateAvailable) {
    updateMode = 'installer';
  } else {
    updateMode = 'none';
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

let activeDownload = null;

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
  // Used by hotUpdater (main process only).
  _fetchLatestReleaseForHotUpdate,
  _fetchRemoteManifest: fetchRemoteManifest,
  // Exported for tests / debugging only.
  _isNewer: isNewer,
  _pickWindowsAsset: pickWindowsAsset,
  _computeLocalManifest: computeLocalManifest,
  _compareManifests: compareManifests,
};
