'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useOnboarding } from '@/app/onboarding/OnboardingContext'; // To access context loading state

export default function AppInitializer() {
    const fetchConfigs = useAppStore(state => state.fetchAndSetDataPointConfigs);
    const isLoadingConfigs = useAppStore(state => state.isLoadingDataPointConfigs);
    const configsError = useAppStore(state => state.dataPointConfigsError);
    const dataPointConfigs = useAppStore(state => state.dataPointConfigs);

    // Access OnboardingContext loading state to potentially coordinate or log
    // This assumes AppInitializer is rendered within OnboardingProvider
    // If not, this part needs to be conditional or removed.
    // For now, let's assume it might be for observing.
    const onboardingCtx = useOnboarding(); // This will only work if AppInitializer is a child of OnboardingProvider

    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (!initialized && !isLoadingConfigs && Object.keys(dataPointConfigs).length === 0 && !configsError) {
            // console.log('AppInitializer: Fetching data point configurations for appStore...');
            fetchConfigs();
            setInitialized(true); // Mark as initialized to prevent re-fetching on every render
        } else if (!isLoadingConfigs && (Object.keys(dataPointConfigs).length > 0 || configsError)) {
            // Already loaded or errored, mark as initialized attempt
            setInitialized(true);
        }
    }, [fetchConfigs, isLoadingConfigs, dataPointConfigs, configsError, initialized]);

    useEffect(() => {
        if (onboardingCtx?.isLoading === false) {
            // console.log("AppInitializer: OnboardingContext has finished its initial loading.");
        }
    }, [onboardingCtx?.isLoading]);

    // This component does not render anything itself, it's for initialization logic.
    return null;
}
