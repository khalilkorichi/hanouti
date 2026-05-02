/**
 * Type-safe wrapper around the `window.electronAPI` and `window.electronUpdater`
 * bridges exposed by `electron/preload.cjs`.
 *
 * The updater now uses the **GitHub Releases API** (the standard Electron
 * pattern): it compares the current app version to the latest published
 * release tag, downloads the .exe asset on demand, and lets NSIS handle
 * the upgrade. See electron/updater.cjs for the implementation.
 */

export interface AppInfo {
    name: string;
    version: string;
    electron: string;
    node: string;
    chrome: string;
    platform: string;
    arch: string;
    isPackaged: boolean;
    userData: string;
    appPath: string;
}

export interface UpdaterConfig {
    repoOwner: string;
    repoName: string;
    includePrerelease: boolean;
    /** Custom path for installer downloads. null → OS default at <userData>/updates/. */
    downloadDir: string | null;
    /** Last app version this user successfully launched. Written by main.cjs. */
    lastKnownVersion: string | null;
}

export interface DownloadDirInfo {
    path: string;
    isDefault: boolean;
    defaultPath: string;
    /** Free space on the volume in bytes; null if statfs unavailable. */
    freeBytes: number | null;
    minRequiredBytes: number;
}

export interface PickDownloadDirResult {
    ok: boolean;
    path?: string;
    freeBytes?: number;
    canceled?: boolean;
    reason?: string;
}

export interface ReleaseAsset {
    name: string;
    size: number;
    downloadUrl: string;
}

export interface FileDiffEntry {
    path: string;
    size: number;
    oldSize?: number;
}

export type FileDiff =
    | {
          available: true;
          inSync: boolean;
          counts: {
              changed: number;
              added: number;
              removed: number;
              unchanged: number;
              total: number;
          };
          downloadSize: number;
          localTotalSize: number;
          remoteTotalSize: number;
          changed: FileDiffEntry[];
          added: FileDiffEntry[];
          removed: FileDiffEntry[];
          truncated: { changed: boolean; added: boolean; removed: boolean };
          manifestVersion: string | null;
          manifestGeneratedAt: string | null;
      }
    | {
          available: false;
          reason: string;
          remoteFileCount?: number;
          remoteTotalSize?: number;
      };

export type UpdateMode = 'none' | 'hot' | 'installer' | 'unknown';

export interface UpdateCheckBase {
    currentVersion: string;
    latestVersion: string;
    versionIsNewer: boolean;
    filesDiffer: boolean;
    /**
     * How the update should be applied:
     * - 'hot'       → frontend-only, can be applied live (no UAC, no restart)
     * - 'installer' → backend/native files changed, NSIS installer required
     * - 'none'      → already in sync
     * - 'unknown'   → manifest unavailable
     */
    updateMode: UpdateMode;
    releaseName: string;
    releaseNotes: string;
    releaseDate: string;
    releaseUrl: string;
    repoUrl: string;
    asset: ReleaseAsset | null;
    /** The frontend-only hot-update archive, when present in the release. */
    hotArchive: ReleaseAsset | null;
    fileDiff: FileDiff;
}

export type UpdateCheckResult =
    | (UpdateCheckBase & { state: 'up-to-date' })
    | (UpdateCheckBase & { state: 'update-available' })
    | { state: 'no-releases'; repoUrl: string };

// ─── Hot update (live frontend-only) ─────────────────────────────────

export interface ChannelInfo {
    /** 'baseline' = installer-shipped frontend; 'channel' = applied hot update */
    mode: 'baseline' | 'channel';
    baselineDir: string;
    activeDir: string;
    appliedAt: string | null;
    version: string | null;
    sha8: string | null;
    configuredPath?: string;
    configuredExists?: boolean;
}

export interface HotUpdateResult {
    applied: boolean;
    channelName: string;
    version: string;
    sha8: string;
    path: string;
    appliedAt: string;
    prunedOld: number;
}

export interface HotUpdateApi {
    getChannel(): Promise<ChannelInfo>;
    apply(): Promise<HotUpdateResult>;
    rollback(): Promise<{ rolledBack: boolean; reason?: string }>;
    reload(): Promise<{ reloaded: boolean }>;
}

export type HotUpdatePhase = 'check' | 'download' | 'extract' | 'verify' | 'install';

export type UpdaterStatus =
    | { state: 'idle' }
    | { state: 'checking' }
    | {
          state: 'downloading';
          current: number;
          total: number;
          percent: number;
          /** Bytes/sec computed over a 5-second sliding window. May be 0 right after resume. */
          speed?: number;
          /** Estimated seconds remaining; null when speed is 0 or total is unknown. */
          eta?: number | null;
          name?: string;
      }
    | { state: 'paused'; current: number; total: number; name?: string }
    | { state: 'downloaded'; path: string; size: number; reused?: boolean; name?: string }
    | { state: 'installing' }
    | { state: 'error'; message: string }
    | { state: 'updates-available-bg'; latestVersion: string; currentVersion: string }
    | { state: 'hot-updating'; phase: HotUpdatePhase; percent: number; received?: number; total?: number }
    | { state: 'hot-updated'; version: string; channelName: string }
    /** Fired once on the first launch after a successful upgrade. */
    | { state: 'upgrade-success'; from: string; to: string; releaseUrl: string };

declare global {
    interface Window {
        electronAPI?: {
            isElectron: true;
            platform: string;
            getAppInfo: () => Promise<AppInfo>;
            getBackendUrl: () => Promise<string>;
            restartApp: () => Promise<void>;
            openExternal: (url: string) => Promise<void>;
        };
        electronUpdater?: {
            isAvailable: true;
            getConfig: () => Promise<UpdaterConfig>;
            setConfig: (partial: Partial<UpdaterConfig>) => Promise<UpdaterConfig>;
            checkForUpdates: () => Promise<UpdateCheckResult>;
            /**
             * Triggers a download of the latest release installer.
             * Takes no arguments: the main process re-fetches the release
             * metadata from GitHub and validates the asset itself, so the
             * renderer cannot inject an arbitrary download URL.
             *
             * `reused: true` indicates an existing installer with a
             * matching SHA-512 was already on disk and was returned
             * instead of re-downloading.
             */
            downloadInstaller: () => Promise<{ path: string; size: number; name: string; reused?: boolean }>;
            installAndRelaunch: (installerPath: string) => Promise<{ launched: true }>;
            /** Pause the current download. Partial file is preserved on disk. */
            pauseDownload: () => Promise<{ ok: boolean; alreadyPaused?: boolean; reason?: string }>;
            /** Resume a paused download via HTTP Range from the saved offset. */
            resumeDownload: () => Promise<{ ok: boolean; notPaused?: boolean; reason?: string }>;
            /** Hard-cancel and delete the .partial file. */
            cancelDownload: () => Promise<{ ok: boolean; reason?: string }>;
            /** Get current download dir + free space + whether it's the OS default. */
            getDownloadDirInfo: () => Promise<DownloadDirInfo>;
            /** Open an OS folder picker; the main process validates + persists. */
            pickDownloadDir: () => Promise<PickDownloadDirResult>;
            /** Reset to the OS default <userData>/updates/. */
            resetDownloadDir: () => Promise<DownloadDirInfo>;
            /**
             * Reveal the download dir in the OS file manager. If a path is
             * given AND it's inside the dir, that file is highlighted.
             */
            openDownloadFolder: (filePath?: string) => Promise<{ ok: boolean; path?: string; reason?: string }>;
            /**
             * Hot-update API — applies frontend-only updates LIVE without UAC
             * or restart. The main process validates every extracted file's
             * SHA-256 against the manifest before activating.
             */
            hotUpdate: HotUpdateApi;
            onStatus: (cb: (status: UpdaterStatus) => void) => () => void;
        };
    }
}

export const isElectron = (): boolean =>
    typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export const getElectronUpdater = () =>
    typeof window !== 'undefined' ? window.electronUpdater : undefined;

export const getElectronAPI = () => (typeof window !== 'undefined' ? window.electronAPI : undefined);
