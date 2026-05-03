import api from './api';

export interface StoreProfile {
    id: number;
    store_name: string | null;
    business_type: string | null;
    staff_count: string | null;
    features_needed: string[];
    onboarding_completed: boolean;
}

export interface StoreProfileUpdate {
    store_name?: string | null;
    business_type?: string | null;
    staff_count?: string | null;
    features_needed?: string[];
    onboarding_completed?: boolean;
}

function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function getStoreProfile(): Promise<StoreProfile> {
    const { data } = await api.get('/store-profile/', { headers: authHeaders() });
    return data;
}

export async function updateStoreProfile(payload: StoreProfileUpdate): Promise<StoreProfile> {
    const { data } = await api.put('/store-profile/', payload, { headers: authHeaders() });
    return data;
}
