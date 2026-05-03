import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreProfile } from '../services/storeProfileService';

/**
 * Map onboarding feature keys → sidebar paths that should remain visible
 * when that feature is selected. Items not covered here are always shown
 * (Dashboard, Settings).
 */
const FEATURE_TO_PATHS: Record<string, string[]> = {
    pos: ['/sales', '/sales-list'],
    inventory: ['/products', '/inventory'],
    categories: ['/categories'],
    reports: ['/reports'],
    debts: ['/customers'],
};

const ALWAYS_VISIBLE = new Set(['/', '/settings']);

interface SettingsState {
    storeName: string;
    businessType: string | null;
    staffCount: string | null;
    featuresNeeded: string[];
    visibleSidebarPaths: string[] | null;

    applyStoreProfile: (profile: StoreProfile) => void;
    setStoreName: (name: string) => void;
    isPathVisible: (path: string) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            storeName: 'حانوتي',
            businessType: null,
            staffCount: null,
            featuresNeeded: [],
            visibleSidebarPaths: null,

            applyStoreProfile: (profile) => {
                const features = profile.features_needed || [];

                let visible: string[] | null = null;
                if (features.length > 0) {
                    const allowed = new Set<string>(ALWAYS_VISIBLE);
                    for (const f of features) {
                        const paths = FEATURE_TO_PATHS[f];
                        if (paths) paths.forEach((p) => allowed.add(p));
                    }
                    visible = Array.from(allowed);
                }

                set({
                    storeName: profile.store_name || 'حانوتي',
                    businessType: profile.business_type,
                    staffCount: profile.staff_count,
                    featuresNeeded: features,
                    visibleSidebarPaths: visible,
                });
            },

            setStoreName: (name) => set({ storeName: name || 'حانوتي' }),

            isPathVisible: (path) => {
                const visible = get().visibleSidebarPaths;
                if (!visible) return true;
                return visible.includes(path);
            },
        }),
        { name: 'hanouti-settings' },
    ),
);
