'use strict';

const DEFAULT_UPDATER_CONFIG = Object.freeze({
  repoOwner: 'khalilkorichi',
  repoName: 'hanouti',
  branch: 'release-windows',
  trackedPrefixes: ['frontend-dist/', 'backend-dist/'],
  trackedFiles: [],
  excluded: ['node_modules/', '.git/', '.cache/', '.local/', 'dist/', 'release/', 'attached_assets/'],
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

module.exports = {
  DEFAULT_UPDATER_CONFIG,
  BACKEND_PORT,
  BACKEND_HOST,
  FRONTEND_DEV_URL,
  APP_NAME,
  APP_FILES_DIR,
  APP_FILES_LAYOUT,
};
