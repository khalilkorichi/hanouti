/**
 * Type-safe wrapper around the `window.electronAPI` and `window.electronUpdater`
 * bridges exposed by `electron/preload.cjs`. Safe to import in a regular browser
 * build — the wrapper simply reports `isAvailable=false` and rejects calls.
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
    liveDir: string;
}

export interface UpdaterConfig {
    repoOwner: string;
    repoName: string;
    branch: string;
    trackedPrefixes: string[];
    trackedFiles: string[];
    excluded: string[];
}

export interface ChangedFile {
    path: string;
    sha: string;
    size: number;
}

export interface RecentCommit {
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
}

export type UpdaterStatus =
    | { state: 'idle' }
    | { state: 'checking'; message?: string }
    | {
          state: 'changes-found';
          branch: string;
          repo: string;
          repoUrl: string;
          modified: ChangedFile[];
          added: ChangedFile[];
          removed: string[];
          unchangedCount: number;
          totalChanges: number;
          recentCommits: RecentCommit[];
      }
    | {
          state: 'up-to-date';
          branch: string;
          repo: string;
          repoUrl: string;
          modified: ChangedFile[];
          added: ChangedFile[];
          removed: string[];
          unchangedCount: number;
          totalChanges: number;
          recentCommits: RecentCommit[];
      }
    | { state: 'downloading'; current: number; total: number; percent: number; currentFile?: string }
    | { state: 'applying'; total: number }
    | { state: 'complete'; downloaded: number; failed: number; removed: number }
    | { state: 'error'; message: string; details?: unknown };

export type ScanResult = Extract<UpdaterStatus, { state: 'changes-found' | 'up-to-date' }>;

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
            scanChanges: () => Promise<ScanResult>;
            createBackup: () => Promise<{ canceled?: boolean; path?: string; count?: number }>;
            applyUpdate: (
                scanResult: ScanResult,
            ) => Promise<{ state: 'complete'; downloaded: number; failed: number; removed: number }>;
            onStatus: (cb: (status: UpdaterStatus) => void) => () => void;
        };
    }
}

export const isElectron = (): boolean =>
    typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export const getElectronUpdater = () =>
    typeof window !== 'undefined' ? window.electronUpdater : undefined;

export const getElectronAPI = () => (typeof window !== 'undefined' ? window.electronAPI : undefined);
