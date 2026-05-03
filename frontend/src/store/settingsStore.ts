import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreProfile } from '../services/storeProfileService';

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
        (set) => ({
            storeName: 'حانوتي',
            businessType: null,
            staffCount: null,
            featuresNeeded: [],
            visibleSidebarPaths: null,

            applyStoreProfile: (profile) => {
                const features = profile.features_needed || [];
                // We keep `featuresNeeded` for analytics/onboarding context, but we
                // intentionally do NOT hide sidebar items based on it anymore — all
                // built pages should remain accessible regardless of onboarding picks.
                set({
                    storeName: profile.store_name || 'حانوتي',
                    businessType: profile.business_type,
                    staffCount: profile.staff_count,
                    featuresNeeded: features,
                    visibleSidebarPaths: null,
                });
            },

            setStoreName: (name) => set({ storeName: name || 'حانوتي' }),

            // All pages are always visible. The onboarding choice no longer hides
            // sidebar entries — users requested that no pages disappear.
            isPathVisible: () => true,
        }),
        { name: 'hanouti-settings' },
    ),
);
