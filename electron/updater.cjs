'use strict';

/**
 * GitHub-based atomic updater (SHA-verified).
 *
 * Inspired by the "miftah" (مفتاح) updater pattern, hardened for production:
 *   1. Scan: fetch the GitHub recursive tree for repo+branch, compute git-blob
 *      SHA1 of every local file under tracked prefixes, return the diff.
 *   2. Apply (truly atomic on a single volume):
 *        a) Re-fetch the remote tree IGNORING the SHAs the renderer sent — we
 *           only trust the live GitHub tree. (defence-in-depth: a compromised
 *           renderer cannot persuade us to install arbitrary content.)
 *        b) Build a complete new tree in `<liveParent>/.hanouti-staging-<ts>/`.
 *           For every tracked remote blob: if a matching local file exists
 *           with the same sha, copy it from disk; otherwise download from
 *           raw.githubusercontent.com, verify the git-blob SHA1, with up to
 *           3 retries (exp. backoff) per file.
 *        c) On any download/verification failure → wipe staging, leave live
 *           install untouched, raise.
 *        d) Stop the backend (caller's responsibility — see `applyWithLifecycle`
 *           in main.cjs) so backend.exe is no longer locked on Windows.
 *        e) Atomic dir swap (same volume): rename live → `.hanouti-old-<ts>`,
 *           rename staging → live. On failure to swap-in, swap-back the old
 *           directory to restore the previous install.
 *        f) Best-effort cleanup of `.hanouti-old-*` (kept on disk if the
 *           rename succeeded but cleanup failed — harmless).
 *
 * Security:
 *   - Path safety: rejects absolute paths, "..", NUL bytes, and any path that
 *     does not start with one of the configured trackedPrefixes.
 *   - SHA verification on every downloaded blob (git-blob SHA1).
 *   - Renderer-supplied scan payloads are NOT trusted by `applyUpdate`; we
 *     re-scan against the live GitHub tree.
 *   - Config writes are key-whitelisted (`saveConfig`).
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const { app } = require('electron');
const log = require('electron-log');
const { DEFAULT_UPDATER_CONFIG, APP_FILES_DIR } = require('./config.cjs');

const CONFIG_FILE = 'updater-config.json';
const CONFIG_KEYS = ['repoOwner', 'repoName', 'branch', 'trackedPrefixes', 'trackedFiles', 'excluded'];

// ─── helpers ──────────────────────────────────────────────────────────
function gitBlobSha(buf) {
  const header = Buffer.from(`blob ${buf.length}\0`);
  return crypto.createHash('sha1').update(Buffer.concat([header, buf])).digest('hex');
}

function isPathSafe(filePath, trackedPrefixes) {
  const normalized = path.posix.normalize(String(filePath || '').replace(/\\/g, '/'));
  if (!normalized) return false;
  if (normalized.startsWith('/')) return false;
  if (normalized.startsWith('..')) return false;
  if (normalized.includes('/../')) return false;
  if (normalized.includes('\0')) return false;
  return trackedPrefixes.some((p) => normalized.startsWith(p));
}

async function walkDir(rootDir, baseRel = '') {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const entries = await fsp.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = baseRel ? `${baseRel}/${entry.name}` : entry.name;
    const abs = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkDir(abs, rel));
    } else if (entry.isFile()) {
      out.push({ rel, abs });
    }
  }
  return out;
}

function getLiveAppFilesDir() {
  // In packaged builds, app-files lives next to resources/, outside the asar archive.
  const base = app.isPackaged ? path.dirname(app.getAppPath()) : path.join(__dirname, '..');
  return path.join(base, APP_FILES_DIR);
}

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

async function loadConfig() {
  const p = getConfigPath();
  try {
    const raw = await fsp.readFile(p, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_UPDATER_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_UPDATER_CONFIG };
  }
}

function sanitizeConfig(partial) {
  const out = {};
  for (const k of CONFIG_KEYS) {
    if (partial[k] === undefined) continue;
    if ((k === 'trackedPrefixes' || k === 'trackedFiles' || k === 'excluded')) {
      if (!Array.isArray(partial[k])) continue;
      out[k] = partial[k]
        .map((s) => String(s || '').trim())
        .filter((s) => s && !s.includes('\0') && !s.startsWith('/'))
        .slice(0, 64);
    } else {
      const v = String(partial[k] || '').trim();
      if (!v) continue;
      // Reject obviously malicious owner/repo/branch values.
      if (!/^[A-Za-z0-9._-]{1,100}$/.test(v) && k !== 'branch') continue;
      if (k === 'branch' && !/^[A-Za-z0-9._\/-]{1,100}$/.test(v)) continue;
      out[k] = v;
    }
  }
  return out;
}

async function saveConfig(partial) {
  const cur = await loadConfig();
  const safe = sanitizeConfig(partial || {});
  const merged = { ...cur, ...safe };
  await fsp.mkdir(path.dirname(getConfigPath()), { recursive: true });
  await fsp.writeFile(getConfigPath(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

// ─── GitHub API ───────────────────────────────────────────────────────
async function ghJson(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'hanouti-updater' } });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text().catch(() => '')}`);
  return res.json();
}

async function fetchRepoMeta(owner, repo) {
  return ghJson(`https://api.github.com/repos/${owner}/${repo}`);
}

async function fetchRecentCommits(owner, repo, branch, perPage = 5) {
  return ghJson(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`);
}

async function fetchTree(owner, repo, branch) {
  const branchInfo = await ghJson(`https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
  const treeSha = branchInfo.commit.commit.tree.sha;
  return ghJson(`https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
}

async function downloadRaw(owner, repo, branch, filePath) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${filePath.split('/').map(encodeURIComponent).join('/')}?t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status} ${filePath}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function buildLocalShaIndex(liveDir, trackedPrefixes) {
  const files = await walkDir(liveDir);
  const out = new Map();
  for (const f of files) {
    const rel = f.rel.replace(/\\/g, '/');
    if (!isPathSafe(rel, trackedPrefixes)) continue;
    const buf = await fsp.readFile(f.abs);
    out.set(rel, { abs: f.abs, sha: gitBlobSha(buf), size: buf.length });
  }
  return out;
}

// ─── public API ───────────────────────────────────────────────────────

/**
 * Scan repo + local files, return diff. Used by the UI for preview only.
 */
async function scanChanges(send) {
  const cfg = await loadConfig();
  send?.({ state: 'checking', message: 'جارٍ الاتصال بـ GitHub...' });

  const repoMeta = await fetchRepoMeta(cfg.repoOwner, cfg.repoName);
  const branch = cfg.branch || repoMeta.default_branch;
  const recentCommits = await fetchRecentCommits(cfg.repoOwner, cfg.repoName, branch, 5).catch(() => []);
  const tree = await fetchTree(cfg.repoOwner, cfg.repoName, branch);

  const trackedRemote = (tree.tree || []).filter((e) => e.type === 'blob' && isPathSafe(e.path, cfg.trackedPrefixes));

  const liveDir = getLiveAppFilesDir();
  const localIndex = await buildLocalShaIndex(liveDir, cfg.trackedPrefixes);

  const modified = [];
  const added = [];
  const unchanged = [];

  for (const entry of trackedRemote) {
    const local = localIndex.get(entry.path);
    if (!local) {
      added.push({ path: entry.path, sha: entry.sha, size: entry.size || 0 });
      continue;
    }
    if (local.sha !== entry.sha) {
      modified.push({ path: entry.path, sha: entry.sha, size: entry.size || 0 });
    } else {
      unchanged.push(entry.path);
    }
  }

  const remotePaths = new Set(trackedRemote.map((e) => e.path));
  const removed = [];
  for (const [rel] of localIndex) {
    if (!remotePaths.has(rel)) removed.push(rel);
  }

  const result = {
    state: (modified.length || added.length || removed.length) ? 'changes-found' : 'up-to-date',
    branch,
    repo: `${cfg.repoOwner}/${cfg.repoName}`,
    repoUrl: repoMeta.html_url,
    modified, added, removed,
    unchangedCount: unchanged.length,
    totalChanges: modified.length + added.length + removed.length,
    recentCommits: recentCommits.slice(0, 5).map((c) => ({
      sha: c.sha.slice(0, 7),
      message: (c.commit.message || '').split('\n')[0],
      author: c.commit.author?.name || 'unknown',
      date: c.commit.author?.date,
      url: c.html_url,
    })),
  };
  send?.(result);
  return result;
}

/**
 * Create a local backup (plain copy) of currently-installed app-files.
 */
async function createBackup(targetDir) {
  if (!targetDir) throw new Error('Backup target directory required');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(targetDir, `hanouti-backup-${ts}`);
  await fsp.mkdir(backupDir, { recursive: true });

  const liveDir = getLiveAppFilesDir();
  const files = await walkDir(liveDir);
  for (const f of files) {
    const dest = path.join(backupDir, f.rel);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(f.abs, dest);
  }
  return { path: backupDir, count: files.length };
}

/**
 * Truly atomic update via dir-swap on the same volume.
 *
 * IMPORTANT — caller (main.cjs) MUST stop the backend child before invoking
 * applyUpdate(), otherwise renaming a directory containing a running .exe
 * will fail on Windows. See `electron/main.cjs::applyUpdateLifecycle`.
 */
async function applyUpdate(_renderResult, send) {
  const cfg = await loadConfig();
  const liveDir = getLiveAppFilesDir();
  const liveParent = path.dirname(liveDir);
  await fsp.mkdir(liveDir, { recursive: true });

  // 1. Re-fetch remote tree as the source of truth (don't trust renderer SHAs).
  send?.({ state: 'checking', message: 'إعادة فحص المستودع للتحقّق من السلامة...' });
  const tree = await fetchTree(cfg.repoOwner, cfg.repoName, cfg.branch);
  const remote = (tree.tree || []).filter((e) => e.type === 'blob' && isPathSafe(e.path, cfg.trackedPrefixes));
  if (!remote.length) {
    throw new Error('Remote tree is empty under tracked paths — refusing to wipe local install.');
  }

  // 2. Build local sha index for "copy unchanged" optimization.
  const local = await buildLocalShaIndex(liveDir, cfg.trackedPrefixes);

  // 3. Stage in a sibling dir on the SAME volume so we can swap atomically.
  const ts = Date.now();
  const stagingDir = path.join(liveParent, `.hanouti-staging-${ts}`);
  const oldDir = path.join(liveParent, `.hanouti-old-${ts}`);

  await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
  await fsp.mkdir(stagingDir, { recursive: true });

  let downloaded = 0;
  let reused = 0;
  const errors = [];
  const total = remote.length;
  send?.({ state: 'downloading', current: 0, total, percent: 0 });

  try {
    for (const entry of remote) {
      const dest = path.join(stagingDir, entry.path);
      const destResolved = path.resolve(dest);
      if (!destResolved.startsWith(path.resolve(stagingDir))) {
        throw new Error(`staging path traversal blocked: ${entry.path}`);
      }
      await fsp.mkdir(path.dirname(dest), { recursive: true });

      const localMatch = local.get(entry.path);
      if (localMatch && localMatch.sha === entry.sha) {
        await fsp.copyFile(localMatch.abs, dest);
        reused++;
      } else {
        let lastErr = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const buf = await downloadRaw(cfg.repoOwner, cfg.repoName, cfg.branch, entry.path);
            const got = gitBlobSha(buf);
            if (got !== entry.sha) {
              throw new Error(`SHA mismatch (got ${got.slice(0, 7)}, expected ${entry.sha.slice(0, 7)})`);
            }
            await fsp.writeFile(dest, buf);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt - 1)));
          }
        }
        if (lastErr) errors.push({ file: entry.path, error: lastErr.message });
        else downloaded++;
      }

      const completed = downloaded + reused + errors.length;
      send?.({
        state: 'downloading',
        current: completed, total,
        percent: Math.round((completed / Math.max(1, total)) * 100),
        currentFile: entry.path,
      });
    }

    if (errors.length) {
      const err = new Error(`فشل تحميل ${errors.length} ملف(ات). تم إلغاء التحديث.`);
      err.details = errors;
      throw err;
    }
  } catch (e) {
    log.error('[updater] staging failed, cleaning up', e.message);
    await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw e;
  }

  // 4. ATOMIC SWAP. Both paths are siblings on the same volume.
  send?.({ state: 'applying', total });
  let swappedOldOut = false;
  try {
    if (fs.existsSync(liveDir)) {
      await fsp.rename(liveDir, oldDir);
      swappedOldOut = true;
    }
    await fsp.rename(stagingDir, liveDir);
  } catch (e) {
    log.error('[updater] swap failed, attempting rollback', e.message);
    if (swappedOldOut && fs.existsSync(oldDir) && !fs.existsSync(liveDir)) {
      await fsp.rename(oldDir, liveDir).catch((rbErr) =>
        log.error('[updater] CRITICAL: rollback failed', rbErr.message));
    }
    await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(`فشل تطبيق التحديث (تم استرجاع النسخة السابقة): ${e.message}`);
  }

  // 5. Best-effort cleanup of the old dir.
  await fsp.rm(oldDir, { recursive: true, force: true }).catch((e) =>
    log.warn('[updater] could not delete old dir (will be cleaned next start):', e.message));

  const summary = {
    state: 'complete',
    downloaded,
    reused,
    failed: 0,
    total,
  };
  send?.(summary);
  return summary;
}

/**
 * Crash-safe startup recovery + cleanup.
 *
 * Three scenarios after a previous update attempt:
 *
 *   A) Normal: liveDir exists, no orphans → nothing to do.
 *   B) Crashed AFTER live→old rename, BEFORE staging→live rename:
 *      → liveDir is MISSING, `.hanouti-old-<ts>` exists.
 *      → We restore the old dir as live so the user is not bricked.
 *      → If a `.hanouti-staging-<ts>` also exists, it is stale → wipe it.
 *   C) Crashed DURING staging download or after a successful swap:
 *      → liveDir exists. Old/staging dirs are orphans → safe to wipe.
 *
 * IMPORTANT: never delete `.hanouti-old-*` while liveDir is missing — it may
 * be the only intact copy of the install.
 */
async function cleanupOrphans() {
  const liveDir = getLiveAppFilesDir();
  const parent = path.dirname(liveDir);
  if (!fs.existsSync(parent)) return { recovered: false, cleaned: 0 };

  const liveExists = fs.existsSync(liveDir);
  const entries = await fsp.readdir(parent).catch(() => []);
  const oldDirs = entries.filter((n) => n.startsWith('.hanouti-old-')).sort();
  const stagingDirs = entries.filter((n) => n.startsWith('.hanouti-staging-'));

  let recovered = false;
  let cleaned = 0;

  if (!liveExists && oldDirs.length) {
    // Recovery path — restore the most recent .hanouti-old-* to live.
    const newest = oldDirs[oldDirs.length - 1];
    const src = path.join(parent, newest);
    log.warn('[updater] recovering interrupted update: restoring', src, '→', liveDir);
    try {
      await fsp.rename(src, liveDir);
      recovered = true;
      // Drop the just-recovered dir from the orphan list so we don't delete it.
      oldDirs.pop();
    } catch (e) {
      log.error('[updater] CRITICAL: recovery rename failed', e.message);
      return { recovered: false, cleaned: 0, error: e.message };
    }
  }

  // Only NOW is it safe to wipe leftover orphans (live install is intact).
  if (fs.existsSync(liveDir)) {
    for (const name of [...oldDirs, ...stagingDirs]) {
      await fsp.rm(path.join(parent, name), { recursive: true, force: true })
        .then(() => { cleaned++; })
        .catch(() => {});
    }
  }
  return { recovered, cleaned };
}

module.exports = {
  loadConfig,
  saveConfig,
  scanChanges,
  createBackup,
  applyUpdate,
  cleanupOrphans,
  getLiveAppFilesDir,
};
