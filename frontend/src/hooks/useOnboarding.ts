import { useCallback, useEffect, useState } from 'react';
import { getStoreProfile, type StoreProfile } from '../services/storeProfileService';
import { useSettingsStore } from '../store/settingsStore';

interface UseOnboardingResult {
    showOnboarding: boolean;
    loading: boolean;
    completeOnboarding: (profile: StoreProfile) => void;
}

/**
 * On app load, fetches the current store profile and decides whether the
 * onboarding wizard should be shown. Also pushes profile data into the
 * settings store so the rest of the UI (header title, sidebar items)
 * reflects the user's choices immediately.
 *
 * Only runs once we have an auth token — onboarding is a post-login flow.
 */
export default function useOnboarding(): UseOnboardingResult {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [loading, setLoading] = useState(true);
    const applyStoreProfile = useSettingsStore((s) => s.applyStoreProfile);

    useEffect(() => {
        let cancelled = false;
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const profile = await getStoreProfile();
                if (cancelled) return;
                applyStoreProfile(profile);
                setShowOnboarding(!profile.onboarding_completed);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('[useOnboarding] failed to load store profile:', e);
                if (!cancelled) setShowOnboarding(false);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [applyStoreProfile]);

    const completeOnboarding = useCallback(
        (profile: StoreProfile) => {
            applyStoreProfile(profile);
            setShowOnboarding(false);
        },
        [applyStoreProfile],
    );

    return { showOnboarding, loading, completeOnboarding };
}
