#!/usr/bin/env node
'use strict';

/**
 * Builds a SHA-256 manifest of every file under `app-files/` and writes it
 * to `release/manifest.json`. The CI workflow uploads this file as a
 * release asset so the in-app updater can do file-level diffing instead
 * of relying solely on version numbers.
 *
 * Manifest schema (v1):
 *   {
 *     "schemaVersion": 1,
 *     "appName": "hanouti-desktop",
 *     "version": "1.0.7",
 *     "generatedAt": "2026-05-02T18:30:00.000Z",
 *     "fileCount": 423,
 *     "totalSize": 89456123,
 *     "files": [
 *       { "path": "frontend-dist/index.html", "size": 1234, "sha256": "..." },
 *       ...
 *     ]
 *   }
 *
 * Paths are POSIX-style (forward slashes) so they compare consistently
 * between Windows-build and Linux/macOS-dev installs.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const APP_FILES = path.join(ROOT, 'app-files');
const OUT_DIR = path.join(ROOT, 'release');
const OUT_FILE = path.join(OUT_DIR, 'manifest.json');

function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

async function walk(dir, base = dir) {
    const out = [];
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            const child = await walk(full, base);
            out.push(...child);
        } else if (e.isFile()) {
            const rel = path.relative(base, full).split(path.sep).join('/');
            const stat = await fsp.stat(full);
            const sha256 = await sha256File(full);
            out.push({ path: rel, size: stat.size, sha256 });
        }
    }
    return out;
}

async function main() {
    if (!fs.existsSync(APP_FILES)) {
        console.error(`[manifest] app-files directory not found at ${APP_FILES}`);
        console.error('[manifest] run `npm run stage:app-files` first');
        process.exit(1);
    }

    const pkg = JSON.parse(await fsp.readFile(path.join(ROOT, 'package.json'), 'utf8'));
    console.log(`[manifest] scanning ${APP_FILES}...`);

    const t0 = Date.now();
    const files = await walk(APP_FILES);
    files.sort((a, b) => a.path.localeCompare(b.path));
    const totalSize = files.reduce((s, f) => s + f.size, 0);

    const manifest = {
        schemaVersion: 1,
        appName: pkg.name,
        version: pkg.version,
        generatedAt: new Date().toISOString(),
        fileCount: files.length,
        totalSize,
        files,
    };

    await fsp.mkdir(OUT_DIR, { recursive: true });
    await fsp.writeFile(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const mb = (totalSize / 1024 / 1024).toFixed(1);
    console.log(`[manifest] wrote ${OUT_FILE}`);
    console.log(`[manifest]   ${files.length} files, ${mb} MB, ${elapsed}s`);
}

main().catch((e) => {
    console.error('[manifest] failed:', e);
    process.exit(1);
});
