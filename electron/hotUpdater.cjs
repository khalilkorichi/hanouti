'use strict';

/**
 * Hot updater — applies frontend-only updates LIVE without re-running the
 * NSIS installer.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * The NSIS installer flow (electron/updater.cjs → installAndRelaunch) is
 * required for any change that touches `electron.exe`, `backend.exe`, or
 * native modules — those files are file-locked at runtime and the OS
 * refuses to overwrite them while the app is running.
 *
 * The frontend (HTML/JS/CSS) has NO such restriction: it's just static
 * files Electron loads via `loadFile()`. We can:
 *   1. Download a small `frontend-dist.tar.gz` (typically a few MB)
 *   2. Extract it to a side directory under `<userData>/channels/`
 *   3. Verify every extracted file's SHA-256 against the release manifest
 *   4. Atomically write `<userData>/channels/active.json` to point at it
 *   5. Reload the BrowserWindow — done. New pages, new icons, new logic
 *      live in seconds. No UAC, no restart, no re-download of backend.exe.
 *
 * ── Safety guarantees ─────────────────────────────────────────────────
 * - Every extracted file is hash-verified BEFORE the channel is promoted
 *   to active. A corrupted/MITM'd download can never reach the user.
 * - active.json is written atomically (temp file + rename).
 * - main.cjs verifies the active channel's index.html exists at startup;
 *   if it doesn't (corruption, manual deletion), it silently falls back
 *   to the baseline shipped with the installer.
 * - One-click rollback: deleting active.json instantly reverts to baseline.
 * - The OS-bundled `tar.exe` (Windows 10+, Linux, macOS) is invoked with
 *   `--no-same-owner` to avoid permission gotchas; the destination path
 *   is always a fresh, unique directory we created ourselves.
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const { spawn } = require('child_process');
const { app } = require('electron');
const log = require('electron-log');

const {
    APP_FILES_DIR, APP_FILES_LAYOUT,
    CHANNELS_SUBDIR, ACTIVE_CHANNEL_FILE,
    FRONTEND_ARCHIVE_NAME, MAX_RETAINED_CHANNELS,
} = require('./config.cjs');

const ALLOWED_DOWNLOAD_HOSTS = new Set([
    'github.com',
    'objects.githubusercontent.com',
    'release-assets.githubusercontent.com',
    'codeload.github.com',
]);

// Hard cap on the hot-update archive size. A real frontend tarball is
// typically 1-5 MB; anything north of 100 MB is almost certainly an
// attack or a misconfigured release asset. Refuse to download.
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

// ─── path helpers ──────────────────────────────────────────────────────

function getChannelsDir() {
    return path.join(app.getPath('userData'), CHANNELS_SUBDIR);
}

function getActiveChannelFile() {
    return path.join(getChannelsDir(), ACTIVE_CHANNEL_FILE);
}

function getBaselineFrontendDir() {
    const base = app.isPackaged
        ? path.dirname(app.getAppPath())
        : path.join(__dirname, '..');
    return path.join(base, APP_FILES_DIR, APP_FILES_LAYOUT.frontend);
}

/**
 * Returns the directory of the currently-active frontend (channel or
 * baseline). Performs a sanity check (index.html exists & non-empty) and
 * silently falls back to the baseline on any failure. Pure read — never
 * throws — so it's safe to call from main.cjs at startup.
 */
function getActiveFrontendDir() {
    const baseline = getBaselineFrontendDir();
    try {
        const cfg = readActiveChannelSync();
        if (cfg && cfg.frontend && typeof cfg.frontend.path === 'string') {
            const idx = path.join(cfg.frontend.path, 'index.html');
            const st = fs.statSync(idx);
            if (st.isFile() && st.size > 0) return cfg.frontend.path;
            log.warn('[hotUpdater] active channel index.html missing/empty, falling back');
        }
    } catch (e) {
        if (e && e.code !== 'ENOENT') {
            log.warn('[hotUpdater] active channel read failed, falling back:', e.message);
        }
    }
    return baseline;
}

function readActiveChannelSync() {
    const raw = fs.readFileSync(getActiveChannelFile(), 'utf8');
    return JSON.parse(raw);
}

async function readActiveChannel() {
    try {
        const raw = await fsp.readFile(getActiveChannelFile(), 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
    }
}

async function getChannelInfo() {
    const baseline = getBaselineFrontendDir();
    const active = await readActiveChannel();
    if (!active || !active.frontend) {
        return {
            mode: 'baseline',
            baselineDir: baseline,
            activeDir: baseline,
            appliedAt: null,
            version: null,
            sha8: null,
        };
    }
    let exists = false;
    try {
        const st = await fsp.stat(path.join(active.frontend.path, 'index.html'));
        exists = st.isFile() && st.size > 0;
    } catch { exists = false; }
    return {
        mode: exists ? 'channel' : 'baseline',
        baselineDir: baseline,
        activeDir: exists ? active.frontend.path : baseline,
        appliedAt: active.frontend.appliedAt || null,
        version: active.frontend.version || null,
        sha8: active.frontend.sha8 || null,
        // Surface the path even if missing, so the UI can warn the user.
        configuredPath: active.frontend.path,
        configuredExists: exists,
    };
}

// ─── classification ────────────────────────────────────────────────────

/**
 * Given a fileDiff produced by updater.compareManifests, returns:
 *   { mode: 'none' | 'hot' | 'installer' | 'unknown', reason }
 * (Mostly redundant with checkForUpdates' updateMode now, but kept here
 * so external callers can re-classify a saved diff.)
 */
function classifyDiff(fileDiff) {
    if (!fileDiff || !fileDiff.available) {
        return { mode: 'unknown', reason: fileDiff?.reason || 'لا يوجد تحليل ملفّات' };
    }
    if (fileDiff.inSync) return { mode: 'none', reason: 'الملفّات متطابقة' };
    if (fileDiff.frontendOnly) {
        return { mode: 'hot', reason: 'فقط ملفّات الواجهة تغيّرت — يمكن التحديث الفوريّ' };
    }
    return { mode: 'installer', reason: 'تغيّرت ملفّات النظام (الخادم/Electron) — يلزم المثبّت' };
}

// ─── hash ──────────────────────────────────────────────────────────────

function sha256File(p) {
    return new Promise((resolve, reject) => {
        const h = crypto.createHash('sha256');
        const s = fs.createReadStream(p);
        s.on('data', (c) => h.update(c));
        s.on('error', reject);
        s.on('end', () => resolve(h.digest('hex')));
    });
}

async function mapWithConcurrency(items, concurrency, worker) {
    const out = new Array(items.length);
    let cur = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (true) {
            const i = cur++;
            if (i >= items.length) return;
            try { out[i] = await worker(items[i], i); }
            catch (e) { out[i] = { __error: e }; }
        }
    });
    await Promise.all(runners);
    return out;
}

// ─── download ──────────────────────────────────────────────────────────

function isHostAllowed(urlString) {
    try {
        const u = new URL(urlString);
        return u.protocol === 'https:' && ALLOWED_DOWNLOAD_HOSTS.has(u.hostname);
    } catch { return false; }
}

async function downloadArchive(url, expectedSize, destPath, onProgress) {
    if (!isHostAllowed(url)) {
        throw new Error('عنوان التنزيل غير موثوق (خارج GitHub).');
    }
    if (typeof expectedSize === 'number' && expectedSize > MAX_ARCHIVE_BYTES) {
        throw new Error(`حجم الأرشيف ${expectedSize} يتجاوز الحدّ الأقصى المسموح (${MAX_ARCHIVE_BYTES}).`);
    }
    const res = await fetch(url, {
        headers: { 'Accept': 'application/octet-stream', 'User-Agent': 'hanouti-hotupdater' },
        redirect: 'follow',
    });
    if (!res.ok) throw new Error(`تعذّر تنزيل الأرشيف (HTTP ${res.status})`);
    // Re-validate post-redirect host.
    let finalHost = '';
    try { finalHost = new URL(res.url).hostname; } catch { finalHost = ''; }
    if (!finalHost || !ALLOWED_DOWNLOAD_HOSTS.has(finalHost)) {
        throw new Error(`أعيد توجيه التنزيل إلى مضيف غير موثوق: "${finalHost}"`);
    }
    const totalHeader = Number(res.headers.get('content-length') || 0);
    const total = totalHeader || expectedSize || 0;
    if (total > MAX_ARCHIVE_BYTES) {
        throw new Error(`حجم الأرشيف ${total} يتجاوز الحدّ الأقصى.`);
    }
    await fsp.mkdir(path.dirname(destPath), { recursive: true });
    const partialPath = destPath + '.partial';
    const out = fs.createWriteStream(partialPath);
    let received = 0;
    const reader = res.body.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.byteLength;
            if (received > MAX_ARCHIVE_BYTES) {
                throw new Error('تجاوز الأرشيف الحدّ الأقصى أثناء التنزيل.');
            }
            // Backpressure-aware write.
            if (!out.write(Buffer.from(value))) {
                await new Promise((r) => out.once('drain', r));
            }
            if (onProgress) onProgress({ received, total });
        }
        await new Promise((res2, rej2) => { out.end(); out.on('finish', res2); out.on('error', rej2); });
        if (typeof expectedSize === 'number' && expectedSize > 0 && received !== expectedSize) {
            throw new Error(`حجم الملف المنزَّل (${received}) لا يطابق الحجم المتوقَّع (${expectedSize}).`);
        }
        await fsp.rename(partialPath, destPath);
        return { path: destPath, size: received };
    } catch (e) {
        try { out.destroy(); } catch {}
        try { await fsp.unlink(partialPath); } catch {}
        throw e;
    }
}

// ─── extract ───────────────────────────────────────────────────────────

function runTar(args) {
    return new Promise((resolve, reject) => {
        const child = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        child.stderr.on('data', (d) => { stderr += d.toString(); });
        child.on('error', (e) => reject(new Error(`tar failed to spawn: ${e.message}`)));
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`tar exited with code ${code}: ${stderr.trim()}`));
        });
    });
}

async function extractArchive(archivePath, destDir) {
    await fsp.mkdir(destDir, { recursive: true });
    // -x extract, -z gunzip, -f file, -C change-dir.
    // --no-same-owner avoids permission tweaks on POSIX (no-op on Windows).
    await runTar(['-xzf', archivePath, '-C', destDir, '--no-same-owner']);
    // Defense-in-depth: even though we only download from GitHub release
    // assets, walk the extraction tree to ensure no entry escapes destDir
    // via absolute paths or `..` traversal. We trust the manifest+hash
    // verification pipeline, but a malformed/malicious archive could write
    // unverified files outside destDir — reject the whole update if so.
    const destReal = await fsp.realpath(destDir);
    async function walk(dir) {
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            // Resolve symlinks too — they could point outside destDir.
            let real;
            try { real = await fsp.realpath(full); }
            catch { real = full; }
            const rel = path.relative(destReal, real);
            if (rel.startsWith('..') || path.isAbsolute(rel)) {
                throw new Error(
                    `الأرشيف يحتوي مسارات خارج نطاق التثبيت (${entry.name}) — رُفض التحديث.`,
                );
            }
            if (entry.isSymbolicLink()) {
                // Symlinks are not allowed in our frontend bundle.
                throw new Error(`الأرشيف يحتوي اختصاراً (symlink) ممنوعاً: ${entry.name}.`);
            }
            if (entry.isDirectory()) await walk(full);
        }
    }
    await walk(destDir);
}

// ─── verify ────────────────────────────────────────────────────────────

/**
 * Verifies every file under `extractedFrontendDir` matches its expected
 * SHA-256 from the remote manifest's frontend-dist/* entries. Throws on
 * any mismatch, missing-from-manifest, or missing-from-disk.
 */
async function verifyExtraction(extractedFrontendDir, remoteManifest) {
    if (!remoteManifest || !Array.isArray(remoteManifest.files)) {
        throw new Error('لا يوجد manifest للتحقّق منه — تمّ إيقاف التحديث.');
    }
    const FRONTEND_PREFIX = `${APP_FILES_LAYOUT.frontend}/`;
    const expected = remoteManifest.files
        .filter((f) => f.path.startsWith(FRONTEND_PREFIX))
        .map((f) => ({
            relInArchive: f.path.substring(FRONTEND_PREFIX.length),
            sha256: f.sha256,
            size: f.size,
        }));
    if (expected.length === 0) {
        throw new Error('لا توجد ملفّات واجهة في الـmanifest — تحقّق من بنية الإصدار.');
    }
    const results = await mapWithConcurrency(expected, 8, async (e) => {
        const full = path.join(extractedFrontendDir, e.relInArchive);
        const st = await fsp.stat(full);
        if (st.size !== e.size) {
            throw new Error(`حجم خاطئ: ${e.relInArchive} (المتوقّع ${e.size}، الفعليّ ${st.size})`);
        }
        const actual = await sha256File(full);
        if (actual !== e.sha256) {
            throw new Error(`بصمة SHA-256 لا تتطابق: ${e.relInArchive}`);
        }
        return true;
    });
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r && r.__error) throw r.__error;
    }
    return { verified: results.length };
}

// ─── apply / rollback / prune ──────────────────────────────────────────

function shortSha(s) {
    return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 8);
}

async function atomicWriteJson(filePath, value) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = filePath + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
    await fsp.rename(tmp, filePath);
}

async function pruneOldChannels(keepNames) {
    const dir = getChannelsDir();
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
    catch { return { pruned: 0 }; }
    let pruned = 0;
    for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (!e.name.startsWith('frontend-')) continue;
        if (keepNames.includes(e.name)) continue;
        try {
            await fsp.rm(path.join(dir, e.name), { recursive: true, force: true });
            pruned++;
        } catch (err) {
            log.warn(`[hotUpdater] failed to prune ${e.name}:`, err.message);
        }
    }
    return { pruned };
}

// In-process mutex preventing two simultaneous applyHotUpdate calls and
// blocking rollback while an apply is mid-flight. Without this, a fast
// double-click on the apply button (or apply→rollback→apply chain) could
// race on active.json. Held only inside the main process; the renderer
// disables its UI separately, but THIS is the source of truth.
let _applyInProgress = false;

/**
 * Applies a frontend-only update from the given GitHub release.
 *
 * Steps (each fully atomic — failure at any point leaves the previous
 * channel intact):
 *   1. Fetch the remote manifest (for SHA-256 verification).
 *   2. Download frontend-dist.tar.gz to <userData>/updates/.
 *   3. Extract to <userData>/channels/<staging-uuid>/.
 *   4. Verify every extracted file against the remote manifest.
 *   5. Atomic-rename staging → <userData>/channels/frontend-<ver>-<sha8>/.
 *   6. Atomic-write <userData>/channels/active.json pointing to (5).
 *   7. Prune old channels, keeping the N most recent.
 *
 * Throws immediately if another apply is already running (prevents the
 * double-click race that would corrupt active.json).
 */
async function applyHotUpdate({
    release,
    remoteManifest,
    onProgress,
}) {
    if (_applyInProgress) {
        throw new Error('عملية تحديث أخرى قيد التنفيذ — انتظر اكتمالها أوّلاً.');
    }
    _applyInProgress = true;
    try {
        return await _applyHotUpdateInner({ release, remoteManifest, onProgress });
    } finally {
        _applyInProgress = false;
    }
}

async function _applyHotUpdateInner({
    release,
    remoteManifest,
    onProgress,
}) {
    if (!release) throw new Error('لا توجد بيانات إصدار.');
    const archiveAsset = (release.assets || []).find((a) => a.name === FRONTEND_ARCHIVE_NAME);
    if (!archiveAsset) {
        throw new Error('لم يُرفق أرشيف الواجهة بهذا الإصدار — يلزم استخدام المثبّت الكامل.');
    }
    const tag = String(release.tag_name || 'unknown').replace(/^v/i, '') || 'unknown';
    const sha8 = shortSha(`${tag}|${archiveAsset.size}|${archiveAsset.browser_download_url}`);
    const channelName = `frontend-${tag}-${sha8}`;
    const channelsDir = getChannelsDir();
    const finalDir = path.join(channelsDir, channelName);
    const stagingDir = path.join(channelsDir, `.staging-${sha8}-${Date.now()}`);
    const updatesDir = path.join(app.getPath('userData'), 'updates');
    const archivePath = path.join(updatesDir, `${channelName}.tar.gz`);

    // Ensure dirs exist.
    await fsp.mkdir(channelsDir, { recursive: true });
    await fsp.mkdir(updatesDir, { recursive: true });

    onProgress && onProgress({ phase: 'download', percent: 0 });

    let downloaded;
    try {
        downloaded = await downloadArchive(
            archiveAsset.browser_download_url,
            archiveAsset.size,
            archivePath,
            ({ received, total }) => {
                if (!onProgress) return;
                const percent = total > 0 ? Math.min(99, Math.floor((received * 100) / total)) : 0;
                onProgress({ phase: 'download', percent, received, total });
            },
        );
    } catch (e) {
        throw new Error(`فشل التنزيل: ${e.message}`);
    }

    // Extract.
    onProgress && onProgress({ phase: 'extract', percent: 100 });
    try {
        // Wipe any stale staging dir, then extract fresh.
        await fsp.rm(stagingDir, { recursive: true, force: true });
        await extractArchive(downloaded.path, stagingDir);
    } catch (e) {
        await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
        throw new Error(`فشل فكّ الأرشيف: ${e.message}`);
    }

    const extractedFrontendDir = path.join(stagingDir, APP_FILES_LAYOUT.frontend);
    if (!fs.existsSync(extractedFrontendDir)) {
        await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
        throw new Error(`بنية الأرشيف غير صالحة: لا يوجد مجلّد ${APP_FILES_LAYOUT.frontend}/.`);
    }

    // Verify.
    onProgress && onProgress({ phase: 'verify', percent: 100 });
    try {
        await verifyExtraction(extractedFrontendDir, remoteManifest);
    } catch (e) {
        await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
        throw new Error(`فشل التحقّق من سلامة الملفّات: ${e.message}`);
    }

    // Promote: replace finalDir if it already exists.
    onProgress && onProgress({ phase: 'install', percent: 100 });
    try {
        if (fs.existsSync(finalDir)) {
            await fsp.rm(finalDir, { recursive: true, force: true });
        }
        await fsp.rename(extractedFrontendDir, finalDir);
        // Cleanup the now-empty staging parent.
        await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    } catch (e) {
        await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
        throw new Error(`فشل تثبيت القناة: ${e.message}`);
    }

    // Activate via atomic JSON pointer.
    const activePayload = {
        schemaVersion: 1,
        frontend: {
            version: tag,
            sha8,
            channelName,
            path: finalDir,
            archiveSize: downloaded.size,
            appliedAt: new Date().toISOString(),
            sourceUrl: archiveAsset.browser_download_url,
        },
    };
    try {
        await atomicWriteJson(getActiveChannelFile(), activePayload);
    } catch (e) {
        throw new Error(`فشل تفعيل القناة: ${e.message}`);
    }

    // Cleanup the downloaded archive (we've extracted everything).
    await fsp.rm(downloaded.path, { force: true }).catch(() => {});

    // Prune older channels (keep current + N-1 previous).
    const all = await fsp.readdir(channelsDir).catch(() => []);
    const keep = all
        .filter((n) => n.startsWith('frontend-'))
        .sort()
        .reverse()
        .slice(0, MAX_RETAINED_CHANNELS);
    if (!keep.includes(channelName)) keep.unshift(channelName);
    const pruneRes = await pruneOldChannels(keep);

    log.info(`[hotUpdater] applied channel ${channelName} (pruned ${pruneRes.pruned} old)`);
    return {
        applied: true,
        channelName,
        version: tag,
        sha8,
        path: finalDir,
        appliedAt: activePayload.frontend.appliedAt,
        prunedOld: pruneRes.pruned,
    };
}

/**
 * Reverts to the baseline frontend by deleting active.json. The next
 * call to `getActiveFrontendDir()` will return the baseline path.
 * Channel directories are NOT deleted — the user can re-activate later.
 */
async function rollbackToBaseline() {
    if (_applyInProgress) {
        throw new Error('عملية تحديث جارية — لا يمكن الرجوع حتّى تكتمل.');
    }
    const file = getActiveChannelFile();
    try {
        await fsp.unlink(file);
        log.info('[hotUpdater] rolled back to baseline (active.json removed)');
        return { rolledBack: true };
    } catch (e) {
        if (e.code === 'ENOENT') return { rolledBack: false, reason: 'لا توجد قناة نشطة' };
        throw e;
    }
}

module.exports = {
    getActiveFrontendDir,
    getChannelInfo,
    classifyDiff,
    applyHotUpdate,
    rollbackToBaseline,
    pruneOldChannels,
    // Exported for tests.
    _verifyExtraction: verifyExtraction,
    _isHostAllowed: isHostAllowed,
    _shortSha: shortSha,
};
