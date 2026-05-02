#!/usr/bin/env node
'use strict';

/**
 * Bundles the staged frontend (`app-files/frontend-dist/`) into a single
 * `release/frontend-dist.tar.gz` archive. This archive is uploaded as a
 * release asset so the in-app hot-updater can fetch it (typically a few
 * hundred KB to a few MB), extract it client-side via the OS-bundled
 * `tar` utility, validate every file against the SHA-256 manifest, and
 * activate it as a new "channel" — all without re-running NSIS.
 *
 * Why tar.gz (and not zip):
 *   - Windows 10+ ships `tar.exe` at C:\Windows\System32\tar.exe (bsdtar)
 *     so the client needs zero extra dependencies.
 *   - tar.gz typically compresses minified JS+CSS+SVG ~10–20% smaller
 *     than zip's deflate at default settings (single solid stream).
 *   - Streamable: we can validate as we go in future revisions.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC_PARENT = path.join(ROOT, 'app-files');
const SRC_DIR = 'frontend-dist';
const OUT_DIR = path.join(ROOT, 'release');
const OUT_FILE = path.join(OUT_DIR, 'frontend-dist.tar.gz');

function fail(msg) {
    console.error(`[frontend-archive] ${msg}`);
    process.exit(1);
}

function main() {
    const srcFull = path.join(SRC_PARENT, SRC_DIR);
    if (!fs.existsSync(srcFull)) {
        fail(`source not found: ${srcFull} — run \`npm run stage:app-files\` first.`);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE);

    console.log(`[frontend-archive] packing ${srcFull} → ${OUT_FILE}`);
    const t0 = Date.now();
    const r = spawnSync(
        'tar',
        ['-czf', OUT_FILE, '-C', SRC_PARENT, SRC_DIR],
        { stdio: 'inherit' },
    );
    if (r.error) fail(`tar failed to spawn: ${r.error.message}`);
    if (r.status !== 0) fail(`tar exited with status ${r.status}`);

    const st = fs.statSync(OUT_FILE);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const mb = (st.size / 1024 / 1024).toFixed(2);
    console.log(`[frontend-archive] wrote ${OUT_FILE} (${mb} MB, ${elapsed}s)`);
}

main();
