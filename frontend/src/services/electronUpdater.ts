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
}

export interface ReleaseAsset {
    name: string;
    size: number;
    downloadUrl: string;
}

export type UpdateCheckResult =
    | {
          state: 'up-to-date';
          currentVersion: string;
          latestVersion: string;
          releaseName: string;
          releaseNotes: string;
          releaseDate: string;
          releaseUrl: string;
          repoUrl: string;
          asset: ReleaseAsset | null;
      }
    | {
          state: 'update-available';
          currentVersion: string;
          latestVersion: string;
          releaseName: string;
          releaseNotes: string;
          releaseDate: string;
          releaseUrl: string;
          repoUrl: string;
          asset: ReleaseAsset | null;
      }
    | { state: 'no-releases'; repoUrl: string };

export type UpdaterStatus =
    | { state: 'idle' }
    | { state: 'checking' }
    | { state: 'downloading'; current: number; total: number; percent: number }
    | { state: 'downloaded'; path: string; size: number }
    | { state: 'installing' }
    | { state: 'error'; message: string }
    | { state: 'updates-available-bg'; latestVersion: string; currentVersion: string };

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
            downloadInstaller: (asset: ReleaseAsset) => Promise<{ path: string; size: number }>;
            installAndRelaunch: (installerPath: string) => Promise<{ launched: true }>;
            onStatus: (cb: (status: UpdaterStatus) => void) => () => void;
        };
    }
}

export const isElectron = (): boolean =>
    typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export const getElectronUpdater = () =>
    typeof window !== 'undefined' ? window.electronUpdater : undefined;

export const getElectronAPI = () => (typeof window !== 'undefined' ? window.electronAPI : undefined);
