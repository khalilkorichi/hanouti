'use strict';

const DEFAULT_UPDATER_CONFIG = Object.freeze({
  repoOwner: 'khalilkorichi',
  repoName: 'hanouti',
  includePrerelease: false,
});

const BACKEND_PORT = 51730;
const BACKEND_HOST = '127.0.0.1';
const FRONTEND_DEV_URL = 'http://127.0.0.1:5000/';
const APP_NAME = 'Hanouti';
const APP_FILES_DIR = 'app-files';

const APP_FILES_LAYOUT = Object.freeze({
  frontend: 'frontend-dist',
  backend: 'backend-dist',
});

// ─── Hot-update channel system ────────────────────────────────────────
// The frontend (HTML/JS/CSS) is hot-updatable because it's just static
// files Electron loads via loadFile() — they're NOT file-locked at
// runtime, unlike electron.exe and backend.exe. We maintain "channels":
//   <userData>/channels/active.json   → pointer to currently-active channel
//   <userData>/channels/frontend-<ver>-<sha8>/   → extracted overlay
// Safety: if the active channel's index.html is missing/corrupt, main.cjs
// falls back automatically to the baseline shipped with the installer.
const CHANNELS_SUBDIR = 'channels';
const ACTIVE_CHANNEL_FILE = 'active.json';
const FRONTEND_ARCHIVE_NAME = 'frontend-dist.tar.gz';
// Only this many old channels kept on disk (current + N previous for
// rollback). Older ones are pruned at apply-time.
const MAX_RETAINED_CHANNELS = 3;

module.exports = {
  DEFAULT_UPDATER_CONFIG,
  BACKEND_PORT,
  BACKEND_HOST,
  FRONTEND_DEV_URL,
  APP_NAME,
  APP_FILES_DIR,
  APP_FILES_LAYOUT,
  CHANNELS_SUBDIR,
  ACTIVE_CHANNEL_FILE,
  FRONTEND_ARCHIVE_NAME,
  MAX_RETAINED_CHANNELS,
};
