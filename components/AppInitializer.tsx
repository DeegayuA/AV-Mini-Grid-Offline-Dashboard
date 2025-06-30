'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useOnboarding } from '@/app/onboarding/OnboardingContext'; // To access context loading state

export default function AppInitializer() {
    const {
        fetchAndSetDataPointConfigs,
        isLoadingDataPointConfigs,
        dataPointConfigsError,
        dataPointConfigs,
        fetchAndSetAppConstants,
        isLoadingAppConstants,
        appConstantsError,
        appConstants
    } = useAppStore(state => ({
        fetchAndSetDataPointConfigs: state.fetchAndSetDataPointConfigs,
        isLoadingDataPointConfigs: state.isLoadingDataPointConfigs,
        dataPointConfigsError: state.dataPointConfigsError,
        dataPointConfigs: state.dataPointConfigs,
        fetchAndSetAppConstants: state.fetchAndSetAppConstants,
        isLoadingAppConstants: state.isLoadingAppConstants,
        appConstantsError: state.appConstantsError,
        appConstants: state.appConstants,
    }));

    // OnboardingContext observation can be removed if not strictly needed for coordination here
    // const onboardingCtx = useOnboarding();

    const [dpConfigsInitialized, setDpConfigsInitialized] = useState(false);
    const [appConstantsInitialized, setAppConstantsInitialized] = useState(false);

    useEffect(() => {
        if (!dpConfigsInitialized && !isLoadingDataPointConfigs && Object.keys(dataPointConfigs).length === 0 && !dataPointConfigsError) {
            // console.log('AppInitializer: Fetching data point configurations for appStore...');
            fetchAndSetDataPointConfigs();
            setDpConfigsInitialized(true);
        } else if (!isLoadingDataPointConfigs && (Object.keys(dataPointConfigs).length > 0 || dataPointConfigsError)) {
            setDpConfigsInitialized(true);
        }
    }, [fetchAndSetDataPointConfigs, isLoadingDataPointConfigs, dataPointConfigs, dataPointConfigsError, dpConfigsInitialized]);

    useEffect(() => {
        if (!appConstantsInitialized && !isLoadingAppConstants && Object.keys(appConstants).length === 0 && !appConstantsError) {
            // console.log('AppInitializer: Fetching application constants for appStore...');
            fetchAndSetAppConstants();
            setAppConstantsInitialized(true);
        } else if (!isLoadingAppConstants && (Object.keys(appConstants).length > 0 || appConstantsError)) {
            setAppConstantsInitialized(true);
        }
    }, [fetchAndSetAppConstants, isLoadingAppConstants, appConstants, appConstantsError, appConstantsInitialized]);

    // useEffect(() => {
    //     if (onboardingCtx?.isLoading === false) {
    //         // console.log("AppInitializer: OnboardingContext has finished its initial loading.");
    //     }
    // }, [onboardingCtx?.isLoading]);

    return null;
}
