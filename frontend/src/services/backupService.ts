import api from './api';

export interface BackupCounts {
    categories: number;
    products: number;
    customers: number;
    customer_payments: number;
    customer_payment_allocations: number;
    sales: number;
    sale_items: number;
    stock_movements: number;
    store_profile: number;
}

export interface BackupPreview {
    version: string;
    date: string | null;
    tag: string | null;
    counts: BackupCounts;
}

export interface AutoBackupItem {
    filename: string;
    size: number;
    modified: string;
    date: string | null;
    tag: string | null;
}

export interface AutoBackupListResponse {
    items: AutoBackupItem[];
    kept: number;
    directory: string;
}

export const backupService = {
    async exportSnapshot(): Promise<Blob> {
        const res = await api.get('/backup/export', { responseType: 'blob' });
        return res.data as Blob;
    },

    async preview(file: File): Promise<BackupPreview> {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post<BackupPreview>('/backup/preview', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    async importFile(file: File): Promise<{ success: boolean; counts: BackupCounts }> {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/backup/import', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    async listAuto(): Promise<AutoBackupListResponse> {
        const res = await api.get<AutoBackupListResponse>('/backup/auto-list');
        return res.data;
    },

    async restoreAuto(filename: string): Promise<{ success: boolean; counts: BackupCounts }> {
        const res = await api.post(`/backup/auto-restore/${encodeURIComponent(filename)}`);
        return res.data;
    },

    autoDownloadUrl(filename: string): string {
        return `${api.defaults.baseURL ?? ''}/backup/auto-download/${encodeURIComponent(filename)}`;
    },

    async takeManualSnapshot(): Promise<{ success: boolean; filename: string }> {
        const res = await api.post('/backup/auto-snapshot');
        return res.data;
    },
};
