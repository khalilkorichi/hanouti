import api from './api';

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'critical';

export interface ActivityEntry {
    id: number;
    created_at: string | null;
    actor: string;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    summary: string;
    severity: ActivitySeverity;
    meta: Record<string, unknown> | null;
}

export interface ActivityListResponse {
    items: ActivityEntry[];
    total: number;
    limit: number;
    offset: number;
}

export interface ActivityListQuery {
    limit?: number;
    offset?: number;
    action?: string;
    entity_type?: string;
    severity?: ActivitySeverity;
    sinceMinutes?: number;
}

export const activityService = {
    async list(query: ActivityListQuery = {}): Promise<ActivityListResponse> {
        const params: Record<string, string | number> = {
            limit: query.limit ?? 50,
            offset: query.offset ?? 0,
        };
        if (query.action) params.action = query.action;
        if (query.entity_type) params.entity_type = query.entity_type;
        if (query.severity) params.severity = query.severity;
        if (query.sinceMinutes) params.since_minutes = query.sinceMinutes;
        const res = await api.get<ActivityListResponse>('/activity/list', { params });
        return res.data;
    },

    async actions(): Promise<string[]> {
        const res = await api.get<{ actions: string[] }>('/activity/actions');
        return res.data.actions ?? [];
    },

    async clear(): Promise<{ success: boolean; deleted: number }> {
        const res = await api.delete<{ success: boolean; deleted: number }>(
            '/activity/clear',
        );
        return res.data;
    },
};
