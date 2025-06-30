// app/onboarding/OnboardingContext.tsx
'use client';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { AppOnboardingData, saveOnboardingData as saveToIDB, clearOnboardingData as clearFromIDB } from '@/lib/idb-store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DataPointConfig } from '@/config/dataPoints'; // Keep type, remove data import
import { APP_NAME, OPC_UA_ENDPOINT_OFFLINE, PLANT_CAPACITY, PLANT_LOCATION, PLANT_NAME as initialPlantNameFromConst, PLANT_TYPE } from '@/config/constants';
import { Sparkles } from 'lucide-react';
// Import the DB client type for data points and a helper to transform it
import { DataPointDefinitionDB } from '@/lib/duckdbClient'; // Assuming type export
import * as lucideIcons from 'lucide-react'; // For icon mapping

export type OnboardingStep = 0 | 1 | 2 | 3 | 4;
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';
export type PartialOnboardingData = Partial<Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>>;

// Keep your existing type definitions
type PartialDataPointFromFile = Partial<Omit<DataPointConfig, 'icon'>> & { icon?: string | React.ComponentType };
interface FullConfigFile {
    plantName?: string;
    plantLocation?: string;
    plantType?: string;
    configuredDataPoints: PartialDataPointFromFile[]; // This type might need to align with DataPointDefinitionDB if files directly map to DB structure
}

export interface OnboardingConfigData {
  plantName?: string;
  plantLocation?: string;
  plantType?: string;
  plantCapacity?: string;
  opcUaEndpointOffline?: string;
  appName?: string;
  configuredDataPoints?: DataPointConfig[]; // This is UI type with IconComponent
}

export interface OnboardingContextType {
  currentStep: OnboardingStep;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  saveStatus: SaveStatus;
  completeOnboarding: () => Promise<void>;
  resetOnboardingData: () => Promise<void>;
  configData: OnboardingConfigData;
  updateConfigData: (partialData: Partial<OnboardingConfigData>) => void;
  isLoading: boolean; // General loading for async context operations like initial fetch or final save
  isStepLoading: boolean;
  setIsStepLoading: (loading: boolean) => void;
  totalSteps: number;
  onboardingData: PartialOnboardingData;
  updateOnboardingData: (data: PartialOnboardingData) => void;
  defaultDataPoints: DataPointConfig[]; // UI type
  configuredDataPoints: DataPointConfig[]; // UI type
  setConfiguredDataPoints: Dispatch<SetStateAction<DataPointConfig[]>>;
  setPlantDetails: (details: Partial<FullConfigFile>) => void; // This might also need to save to `constants` DB
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Helper to get Lucide icon component from string name
const getIconComponentFromString = (iconName?: string | null): IconComponentType => {
    if (!iconName) return Sparkles; // Default icon
    const icons = lucideIcons as unknown as Record<string, IconComponentType>;
    const iconKey = Object.keys(icons).find(key => key.toLowerCase() === iconName.toLowerCase().replace(/icon$/i, ''));
    return iconKey ? icons[iconKey] : Sparkles;
};

// Helper to transform DB definition to UI DataPointConfig
const transformDbDefToUiConfig = (dbDef: DataPointDefinitionDB): DataPointConfig => {
    return {
        id: dbDef.id,
        name: dbDef.name,
        nodeId: dbDef.opcua_node_id,
        label: dbDef.label || dbDef.name,
        dataType: dbDef.data_type as DataPointConfig['dataType'],
        uiType: (dbDef.ui_type || 'display') as DataPointConfig['uiType'],
        icon: getIconComponentFromString(dbDef.icon_name),
        unit: dbDef.unit || undefined,
        min: dbDef.min_val !== null && dbDef.min_val !== undefined ? Number(dbDef.min_val) : undefined,
        max: dbDef.max_val !== null && dbDef.max_val !== undefined ? Number(dbDef.max_val) : undefined,
        description: dbDef.description || undefined,
        category: dbDef.category || 'General',
        factor: dbDef.factor !== null && dbDef.factor !== undefined ? Number(dbDef.factor) : undefined,
        // Assuming DataPointConfig doesn't have precision, decimal_places, enumSet directly,
        // but they are part of ExtendedDataPointConfig used in steps.
        // If DataPointConfig needs them, map them here.
        // For now, keeping it aligned with the base DataPointConfig.
        phase: (dbDef.phase || undefined) as DataPointConfig['phase'],
        isSinglePhase: typeof dbDef.is_single_phase === 'boolean' ? dbDef.is_single_phase : undefined,
        threePhaseGroup: dbDef.three_phase_group || undefined,
        notes: dbDef.notes || undefined,
        // Fields like 'precision', 'isWritable', 'decimalPlaces', 'enumSet' from DataPointDefinitionDB
        // would be mapped if DataPointConfig included them or if an ExtendedDataPointConfig was used here.
    };
};


export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(true); // For initial data load

  const [onboardingData, setOnboardingData] = useState<PartialOnboardingData>({
    plantName: initialPlantNameFromConst, // These can also be fetched from DB `constants` table
    plantLocation: PLANT_LOCATION,
    plantType: PLANT_TYPE,
    plantCapacity: PLANT_CAPACITY,
    opcUaEndpointOffline: OPC_UA_ENDPOINT_OFFLINE.replace('opc.tcp://', ''),
    appName: APP_NAME,
  });

  const [configuredDataPoints, setConfiguredDataPoints] = useState<DataPointConfig[]>([]);
  const [defaultDataPoints, setDefaultDataPoints] = useState<DataPointConfig[]>([]);

  // Fetch initial data from DB
  useEffect(() => {
    const fetchInitialConfigs = async () => {
      setIsLoadingContext(true);
      try {
        const response = await fetch('/api/datapoints');
        if (!response.ok) {
          console.error("Failed to fetch initial datapoints from API");
          // Fallback to empty or some hardcoded minimum if API fails, or throw error
          setDefaultDataPoints([]);
          setConfiguredDataPoints([]);
          toast.error("Failed to load initial configurations.");
          return;
        }
        const dbDefinitions = await response.json() as DataPointDefinitionDB[];
        const uiConfigs = dbDefinitions.map(transformDbDefToUiConfig);

        setDefaultDataPoints(JSON.parse(JSON.stringify(uiConfigs)));
        setConfiguredDataPoints(uiConfigs);

        // Fetch constants
        const constantsResponse = await fetch('/api/constants');
        if (!constantsResponse.ok) {
            console.error("Failed to fetch initial constants from API");
            toast.error("Failed to load initial app constants.");
            // Keep hardcoded defaults if API fails
        } else {
            const dbConstants = await constantsResponse.json() as ConstantDB[];
            const constantsMap = new Map(dbConstants.map(c => [c.key, c.value]));

            setOnboardingData(prev => ({
                ...prev,
                plantName: constantsMap.get('PLANT_NAME') || prev.plantName,
                plantLocation: constantsMap.get('PLANT_LOCATION') || prev.plantLocation,
                plantType: constantsMap.get('PLANT_TYPE') || prev.plantType,
                plantCapacity: constantsMap.get('PLANT_CAPACITY') || prev.plantCapacity,
                opcUaEndpointOffline: (constantsMap.get('OPC_UA_ENDPOINT_OFFLINE') || prev.opcUaEndpointOffline!)?.replace('opc.tcp://', ''),
                appName: constantsMap.get('APP_NAME') || prev.appName,
                // Add any other constants you want to load into onboardingData
            }));
            console.log("App constants loaded from database into OnboardingContext.");
        }

      } catch (error) {
        console.error("Error fetching initial data for context:", error);
        setDefaultDataPoints([]);
        setConfiguredDataPoints([]);
        // Keep hardcoded defaults for onboardingData on error
        toast.error("Error loading initial configurations from database.");
      } finally {
        setIsLoadingContext(false);
      }
    };
    fetchInitialConfigs();
  }, []); // Empty dependency array ensures this runs once on mount


  const totalSteps = 4; // Welcome, Plant, DatapointManagement, Review

  const updateOnboardingData = useCallback((data: PartialOnboardingData) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev < totalSteps ? (prev + 1) as OnboardingStep : prev));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? (prev - 1) as OnboardingStep : prev));
  }, []);

  const completeOnboarding = useCallback(async () => {
    setCurrentStep(4); // Move to finalizing screen
    setSaveStatus('saving');
    let loadingToastId: string | number | undefined;
    // Show indefinite loading toast
    loadingToastId = toast.loading("Finalizing configuration...", { duration: Infinity });

    try {
      const finalDataToSave = {
        ...onboardingData,
        configuredDataPoints: configuredDataPoints, // Ensure this is the up-to-date state
      } as Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>;

      // Basic validation
      if (!finalDataToSave.plantName || !finalDataToSave.opcUaEndpointOffline || !finalDataToSave.plantLocation) {
        console.error("Missing essential data for save:", finalDataToSave);
        throw new Error("Essential plant details or OPC UA endpoint are missing.");
      }
      if (!finalDataToSave.configuredDataPoints || finalDataToSave.configuredDataPoints.length === 0) {
        // Depending on requirements, this might be an error or a warning.
        // For now, let's assume some data points are expected.
        console.warn("No data points configured. Saving with empty set.");
        // throw new Error("At least one data point must be configured.");
      }
      
      await saveToIDB(finalDataToSave);
      // Simulate some network latency if desired for better UX feedback
      await new Promise(resolve => setTimeout(resolve, 1200)); 

      setSaveStatus('success');
      if(loadingToastId) toast.dismiss(loadingToastId); // Dismiss the loading toast
      toast.success("Configuration Complete!", { 
        description: `Welcome to ${APP_NAME}. Your settings have been saved.`,
        duration: 3500 
      });
      
      // Redirect after success
      setTimeout(() => {
        router.push('/login'); // Or to the dashboard if the user is already logged in
      }, 2000); // Delay slightly more than toast

    } catch (errorCaught) {
      console.error("Failed to save onboarding data:", errorCaught);
      if(loadingToastId) toast.dismiss(loadingToastId);
      const errorMessage = (errorCaught instanceof Error) ? errorCaught.message : "An unknown error occurred.";
      toast.error("Save Failed", {
          description: `Could not save configuration: ${errorMessage}. Please review your settings or try again.`,
          duration: 7000
      });
      setSaveStatus('error');
      // Optionally, send user back to review step or last configuration step
      setCurrentStep(4); // Example: back to review step (index before Review, which is OPC UA Test)
    }
  }, [onboardingData, configuredDataPoints, router]);


  const resetOnboardingDataInternal = useCallback(async () => { // <--- CHANGED HERE (function name)
    await clearFromIDB(); // Clear data from IndexedDB
    // Reset local state in context
    setOnboardingData({
      plantName: initialPlantNameFromConst,
      plantLocation: PLANT_LOCATION,
      plantType: PLANT_TYPE,
      plantCapacity: PLANT_CAPACITY,
      opcUaEndpointOffline: OPC_UA_ENDPOINT_OFFLINE.replace('opc.tcp://', ''),
      appName: APP_NAME,
    });
    setConfiguredDataPoints(JSON.parse(JSON.stringify(sourceDefaultDataPoints))); // Reset to deep copy of defaults
    setCurrentStep(0); // Go back to the first step
    setSaveStatus('idle'); // Reset save status
    toast.info("Onboarding Reset", { description: "Configuration has been reset to defaults." });
  }, []); // Dependencies for this reset are minimal as it uses constants and setters

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step <= totalSteps) {
      setCurrentStep(step as OnboardingStep);
    }
  }, [totalSteps]);

  const contextValue = useMemo(() => ({
    currentStep,
    setCurrentStep,
    onboardingData,
    updateOnboardingData,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    completeOnboarding,
    resetOnboardingData: resetOnboardingDataInternal, // <--- CHANGED HERE (exported name)
    defaultDataPoints: sourceDefaultDataPoints,
    configuredDataPoints,
    setConfiguredDataPoints,
    saveStatus,
    isLoading: saveStatus === 'saving' || isStepLoading,
    isStepLoading,
    setIsStepLoading,
    configData: {
      plantName: onboardingData.plantName,
      plantLocation: onboardingData.plantLocation,
      plantType: onboardingData.plantType,
      plantCapacity: onboardingData.plantCapacity,
      opcUaEndpointOffline: onboardingData.opcUaEndpointOffline,
      appName: onboardingData.appName,
      configuredDataPoints
    },
    updateConfigData: (partialData: Partial<OnboardingConfigData>) => {
      const { configuredDataPoints: newDataPoints, ...rest } = partialData;
      if (newDataPoints) {
        setConfiguredDataPoints(newDataPoints);
      }
      updateOnboardingData(rest);
    },
    setPlantDetails: (details: Partial<FullConfigFile>) => { // Renamed for clarity
        // When importing plant details, also update onboardingData for plant-specific fields
        const { plantName, plantLocation, plantType, configuredDataPoints: importedPoints } = details;
        const updatedOnboardingDetails: PartialOnboardingData = {};
        if (plantName) updatedOnboardingDetails.plantName = plantName;
        if (plantLocation) updatedOnboardingDetails.plantLocation = plantLocation;
        if (plantType) updatedOnboardingDetails.plantType = plantType;
        // Assuming capacity and opcUaEndpointOffline might not be in a simple plant config file.
        // They could be if your `FullConfigFile` includes them.

        setOnboardingData(prev => ({ ...prev, ...updatedOnboardingDetails }));

        if (Array.isArray(importedPoints)) {
          // Filter and map imported points to ensure they conform to DataPointConfig
          // This example assumes direct casting, but you might need more robust mapping/validation
          // based on how `PartialDataPointFromFile` relates to `DataPointConfig`
          const validImportedPoints = importedPoints
            .filter(dp => dp && typeof dp.id === 'string' && typeof dp.nodeId === 'string' && typeof dp.name === 'string' && typeof dp.dataType === 'string') // Add more checks as needed
            .map(dp => {
                // Attempt to find a matching actual default to get the icon function
                const actualDefault = actualDefaultDataPointsFromConfig.find(actualDp => actualDp.id === dp.id);
                return {
                    ...actualDefault, // Base it on an actual default if found (for icon and other static properties)
                    ...dp,           // Overlay with data from the file
                    icon: actualDefault ? actualDefault.icon : Sparkles, // Fallback icon
                } as DataPointConfig;
            });
          setConfiguredDataPoints(validImportedPoints);
        }
    },
  }), [
    currentStep, onboardingData, updateOnboardingData, totalSteps,
    nextStep, prevStep, goToStep, completeOnboarding, resetOnboardingDataInternal,
    configuredDataPoints, setConfiguredDataPoints, saveStatus, setOnboardingData, isStepLoading, setIsStepLoading
  ]);

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export type { AppOnboardingData };
