import axios from 'axios';

/**
 * Resolve API base URL.
 *
 * - In the Electron desktop build, the bundled FastAPI backend listens on a
 *   fixed local port; the preload bridge exposes the URL via electronAPI and
 *   also injects `--hanouti-backend=...` into `process.argv`, which we mirror
 *   into a global at app boot below.
 * - In the web/Vite dev build, requests go through Vite's `/api` proxy which
 *   forwards to localhost:8000.
 */
function resolveBaseURL(): string {
    if (typeof window !== 'undefined') {
        const fromGlobal = (window as unknown as { __HANOUTI_BACKEND_URL__?: string }).__HANOUTI_BACKEND_URL__;
        if (fromGlobal) return fromGlobal;
        const electronAPI = (window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI;
        if (electronAPI?.isElectron) {
            return 'http://127.0.0.1:51730';
        }
    }
    return '/api';
}

const api = axios.create({
    baseURL: resolveBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false,
});

export default api;
