#!/usr/bin/env node
'use strict';

/**
 * Stage the built frontend (`frontend/dist/`) and the bundled
 * backend (`backend-dist/`) into `app-files/` exactly the way the
 * GitHub Actions workflow does, so that local `electron-builder`
 * runs see the same payload it expects under `extraResources`.
 *
 * Cross-platform (works on Windows, macOS, Linux) — no shell tricks.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STAGE_ROOT = path.join(ROOT, 'app-files');

const SOURCES = [
  { from: path.join(ROOT, 'frontend', 'dist'),  to: path.join(STAGE_ROOT, 'frontend-dist'), required: true },
  { from: path.join(ROOT, 'backend-dist'),       to: path.join(STAGE_ROOT, 'backend-dist'),  required: true },
];

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

function main() {
  console.log('[stage] resetting', STAGE_ROOT);
  rmrf(STAGE_ROOT);
  fs.mkdirSync(STAGE_ROOT, { recursive: true });

  for (const src of SOURCES) {
    if (!fs.existsSync(src.from)) {
      const msg = `[stage] missing source: ${src.from}`;
      if (src.required) { console.error(msg); process.exit(1); }
      console.warn(msg);
      continue;
    }
    console.log('[stage] copy', src.from, '→', src.to);
    copyRecursive(src.from, src.to);
  }

  let count = 0;
  (function walk(p) {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const f = path.join(p, e.name);
      if (e.isDirectory()) walk(f);
      else count++;
    }
  })(STAGE_ROOT);
  console.log(`[stage] done — ${count} files staged in app-files/`);
}

main();
