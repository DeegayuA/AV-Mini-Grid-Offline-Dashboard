// store/appStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import {
    DataPoint,
    CustomNodeType,
    CustomFlowEdge,
} from '@/types/sld';
import { User, UserRole } from '@/types/auth'; // Assuming auth types are correct
import { logActivity } from '@/lib/activityLog'; // Import logActivity
import {
    ApiConfig,
    ApiDowntimeEvent,
    ApiInstanceConfig,
    API_MONITORING_CONFIG_KEY,
    API_MONITORING_DOWNTIME_KEY
} from '@/types/apiMonitoring'; // Import new types and keys
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

import React from 'react'; // forwardRef and createElement are part of React
import { toast } from 'sonner';
import { dataPoints as rawDataPoints } from '@/config/dataPoints'; // Assuming dataPoints are defined here

import { DataPointDefinitionDB } from '@/lib/duckdbClient'; // Import DB type
import * as lucideIcons from 'lucide-react'; // For icon mapping
import { DataPointConfig } from '@/config/dataPoints'; // For UI type (DataPoint is also there)

// Helper to get Lucide icon component from string name (similar to one in OnboardingContext)
const getIconComponentFromStringForStore = (iconName?: string | null): IconComponentType => {
    if (!iconName) return lucideIcons.HelpCircle; // Default icon
    const icons = lucideIcons as unknown as Record<string, IconComponentType>;
    const iconKey = Object.keys(icons).find(key => key.toLowerCase() === iconName.toLowerCase().replace(/icon$/i, ''));
    return iconKey ? icons[iconKey] : lucideIcons.HelpCircle;
};

// Helper to transform DB definition to UI DataPointConfig for the store
const transformDbDefToStoreDataPoint = (dbDef: DataPointDefinitionDB): DataPoint => { // Using DataPoint interface from config/dataPoints.ts
    return {
        id: dbDef.id,
        name: dbDef.name,
        nodeId: dbDef.opcua_node_id, // opcua_node_id from DB maps to nodeId in UI type
        label: dbDef.label || dbDef.name,
        dataType: dbDef.data_type as DataPoint['dataType'],
        uiType: (dbDef.ui_type || 'display') as DataPoint['uiType'],
        icon: getIconComponentFromStringForStore(dbDef.icon_name),
        unit: dbDef.unit || undefined,
        min: dbDef.min_val !== null && dbDef.min_val !== undefined ? Number(dbDef.min_val) : undefined,
        max: dbDef.max_val !== null && dbDef.max_val !== undefined ? Number(dbDef.max_val) : undefined,
        description: dbDef.description || undefined,
        category: dbDef.category || 'General',
        factor: dbDef.factor !== null && dbDef.factor !== undefined ? Number(dbDef.factor) : undefined,
        precision: dbDef.precision_val !== null && dbDef.precision_val !== undefined ? Number(dbDef.precision_val) : undefined,
        isWritable: typeof dbDef.is_writable === 'boolean' ? dbDef.is_writable : (typeof dbDef.is_writable === 'number' ? Boolean(dbDef.is_writable) : false),
        decimalPlaces: dbDef.decimal_places !== null && dbDef.decimal_places !== undefined ? Number(dbDef.decimal_places) : undefined,
        enumSet: dbDef.enum_set_json ? JSON.parse(dbDef.enum_set_json) : undefined,
        // phase, isSinglePhase, threePhaseGroup, notes are part of ExtendedDataPointConfig,
        // DataPoint interface from config/dataPoints.ts might not have them.
        // If they are needed in the store's version of DataPoint, add them here.
    };
};


const defaultUser: User = {
  email: 'guest@example.com',
  name: 'Guest Viewer',
  role: UserRole.VIEWER,
  redirectPath: '/dashboard', // Example path
  avatar: `https://avatar.vercel.sh/guest.png`, // Example avatar
};

interface AppState {
  opcUaNodeValues: Record<string, string | number | boolean>;
  dataPointConfigs: Record<string, DataPoint>; // Store as Record<string, DataPoint> (UI type)
  isLoadingDataPointConfigs: boolean;
  dataPointConfigsError: string | null;

  appConstants: Record<string, string | undefined>; // Store all constants as key-value pairs
  isLoadingAppConstants: boolean;
  appConstantsError: string | null;

  isEditMode: boolean;
  currentUser: User | null;
  selectedElementForDetails: CustomNodeType | CustomFlowEdge | null;
  soundEnabled: boolean;
  activeAlarms: ActiveAlarm[];
  // API Monitoring State
  apiConfigs: Record<string, ApiConfig>;
  apiDowntimes: ApiDowntimeEvent[];
}

const initialState: AppState = {
  opcUaNodeValues: {},
  dataPointConfigs: {}, // Initialize as empty, will be fetched
  isLoadingDataPointConfigs: true,
  dataPointConfigsError: null,

  appConstants: {}, // Initialize as empty
  isLoadingAppConstants: true,
  appConstantsError: null,

  isEditMode: false,
  currentUser: defaultUser,
  selectedElementForDetails: null,
  soundEnabled: typeof window !== 'undefined' ? localStorage.getItem('dashboardSoundEnabled') === 'true' : true,
  activeAlarms: [], // Initialize as empty
  // API Monitoring Initial State
  apiConfigs: {},
  apiDowntimes: [],
};

interface ApiMonitoringActions {
  addApiConfig: (config: Omit<ApiConfig, 'id' | 'localApi' | 'onlineApi'> & { localUrl: string, onlineUrl: string }) => void;
  updateApiConfig: (configId: string, updates: Partial<ApiConfig>) => void;
  removeApiConfig: (configId: string) => void;
  setApiInstanceStatus: (configId: string, urlType: 'local' | 'online', status: ApiInstanceConfig['status'], timestamp?: Date, error?: string) => void;
  recordApiDowntimeStart: (apiConfigId: string, urlType: 'local' | 'online', urlChecked: string, startTime: Date) => void;
  resolveApiDowntimeEvent: (apiConfigId: string, urlType: 'local' | 'online', endTime: Date) => void;
  loadApiConfigs: (configs: Record<string, ApiConfig>) => void;
  loadApiDowntimes: (downtimes: ApiDowntimeEvent[]) => void;
  clearApiMonitoringData: () => void;
}

interface SLDActions extends ApiMonitoringActions {
  updateOpcUaNodeValues: (updates: Record<string, string | number | boolean>) => void;
  fetchAndSetDataPointConfigs: () => Promise<void>;
  fetchAndSetAppConstants: () => Promise<void>; // New action for constants
      // setDataPoints: (dataPoints: Record<string, DataPoint>) => void; // This was for the old dataPoints, replaced by dataPointConfigs
  toggleEditMode: () => void;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  setSelectedElementForDetails: (element: CustomNodeType | CustomFlowEdge | null) => void;
  updateNodeConfig: (nodeId: string, config: any, data?: any) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setActiveAlarms: (alarms: ActiveAlarm[]) => void;
}

const onRehydrateStorageCallback = (
    hydratedState: (AppState & Partial<ApiMonitoringActions>) | undefined,
    error?: Error | unknown
): void => {
    if (error) {
        console.error("Zustand (appStore): Failed to rehydrate state from storage.", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error("Session Restore Failed", { description: `Could not restore your session data. Details: ${errorMessage}. Some settings may be reset.` });
    } else {
        // console.log("Zustand (appStore): Hydration from storage complete.");
        // Trigger fetch of data point configs after rehydration if not already loading
        // This ensures fresh data from DB overrides any potentially stale persisted data (if dataPointConfigs were persisted)
        // However, dataPointConfigs are NOT part of `partialize` below, so they won't be in hydratedState from storage.
        // The fetch should happen on app initialization regardless of hydration of other fields.
        // This call is better placed in an app initializer component.
        // For now, we can call it here, but it might run multiple times if store is recreated.
        // A flag or check in useAppStore.getState().fetchAndSetDataPointConfigs() might be needed.
    }
};

// Define the storage explicitly to handle potential SSR issues if localStorage isn't available immediately
const safeLocalStorage: StateStorage = typeof window !== 'undefined'
  ? {
      getItem: (name) => {
        try {
          return localStorage.getItem(name);
        } catch (error) {
          console.warn(`Zustand (appStore): localStorage.getItem failed for '${name}'.`, error);
          return null;
        }
      },
      setItem: (name, value) => {
        try {
          localStorage.setItem(name, value);
        } catch (error) {
          console.warn(`Zustand (appStore): localStorage.setItem failed for '${name}'.`, error);
        }
      },
      removeItem: (name) => {
        try {
          localStorage.removeItem(name);
        } catch (error) {
          console.warn(`Zustand (appStore): localStorage.removeItem failed for '${name}'.`, error);
        }
      },
    }
  : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
export const useAppStore = create<AppState & SLDActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateOpcUaNodeValues: (updates: Record<string, string | number | boolean>) => // Renamed and typed
        set((state) => {
          if (typeof updates !== 'object' || updates === null) {
            // console.warn("Zustand (appStore): updateOpcUaNodeValues received non-object data. Ignoring update.", updates);
            return state; // No change if updates is not a valid object
          }
          // Merge updates with existing opcUaNodeValues
          return { opcUaNodeValues: { ...state.opcUaNodeValues, ...updates }};
        }),

      // setDataPoints: (newDataPoints: Record<string, DataPoint>) => // Old function
      //   set({ dataPointConfigs: newDataPoints }), // Ensure this updates dataPointConfigs if re-enabled

      fetchAndSetDataPointConfigs: async () => {
        if (Object.keys(get().dataPointConfigs).length > 0 && !get().dataPointConfigsError && !get().isLoadingDataPointConfigs) {
            // console.log("appStore: DataPoint configs already loaded and not in error/loading state.");
            return;
        }
        if (get().isLoadingDataPointConfigs && !get().dataPointConfigsError) {
            // console.log("appStore: DataPoint configs fetch already in progress.");
            return;
        }

        set({ isLoadingDataPointConfigs: true, dataPointConfigsError: null });
        try {
            const response = await fetch('/api/datapoints');
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: `API error ${response.status}` }));
                 throw new Error(errorData.message || `Failed to fetch data point configurations`);
            }
            const dbDefs = await response.json() as DataPointDefinitionDB[];
            const uiConfigs = dbDefs.reduce<Record<string, DataPoint>>((acc, dbDef) => {
                acc[dbDef.id] = transformDbDefToStoreDataPoint(dbDef);
                return acc;
            }, {});
            set({ dataPointConfigs: uiConfigs, isLoadingDataPointConfigs: false });
            // console.log("appStore: DataPoint configs loaded successfully.");
        } catch (error) {
            console.error("appStore: Error fetching data point configs:", error);
            set({ isLoadingDataPointConfigs: false, dataPointConfigsError: (error as Error).message });
            toast.error("Failed to Load System Configurations", { description: "Could not load data point definitions. Some features may be affected."});
        }
      },

      fetchAndSetAppConstants: async () => {
        if (Object.keys(get().appConstants).length > 0 && !get().appConstantsError && !get().isLoadingAppConstants) {
            // console.log("appStore: App constants already loaded.");
            return;
        }
         if (get().isLoadingAppConstants && !get().appConstantsError) {
            // console.log("appStore: App constants fetch already in progress.");
            return;
        }

        set({ isLoadingAppConstants: true, appConstantsError: null });
        try {
            const response = await fetch('/api/constants');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API error ${response.status}` }));
                throw new Error(errorData.message || `Failed to fetch application constants`);
            }
            const dbConstants = await response.json() as ConstantDB[];
            const constantsMap = dbConstants.reduce<Record<string, string | undefined>>((acc, constant) => {
                acc[constant.key] = constant.value; // Ensure ConstantDB has key and value
                return acc;
            }, {});
            set({ appConstants: constantsMap, isLoadingAppConstants: false });
            // console.log("appStore: Application constants loaded.", constantsMap);
        } catch (error) {
            console.error("appStore: Error fetching application constants:", error);
            set({ isLoadingAppConstants: false, appConstantsError: (error as Error).message });
            toast.error("Failed to Load Application Settings", { description: "Some application display names or settings may be incorrect."});
        }
      },

      toggleEditMode: () => {
        const currentUser = get().currentUser;
        if (currentUser?.role === UserRole.ADMIN) { 
          set((state) => ({ isEditMode: !state.isEditMode }));
          toast.info(`Edit Mode ${get().isEditMode ? "Enabled" : "Disabled"}`);
        } else {
          console.warn('Attempt to toggle edit mode by non-admin/editor user:', currentUser?.email);
          toast.error("Access Denied", { description: "You do not have permission to change edit mode." });
        }
      },

      setCurrentUser: (user: User | null) => {
        const previousUser = get().currentUser; // Get current user before update
        const currentEditMode = get().isEditMode;

        set({ 
            currentUser: user, 
            isEditMode: user && (user.role === UserRole.ADMIN) ? currentEditMode : false 
        });

        if (previousUser && user === null) {
          // User is being logged out
          logActivity(
            'LOGOUT',
            { email: previousUser.email, role: previousUser.role },
            typeof window !== 'undefined' ? window.location.pathname : undefined
          );
        } else if (!previousUser && user) {
          // User is logging in - this is already handled by the login page.
          // No action needed here to avoid double logging for login.
        }
        // Removed toast.info for login from here as it's better handled on the login page
      },

      logout: () => {
        // Also log when explicit logout action is called
        const previousUser = get().currentUser;
        if (previousUser && previousUser.email !== defaultUser.email) { // Avoid logging if already guest
          logActivity(
            'LOGOUT',
            { email: previousUser.email, role: previousUser.role },
            typeof window !== 'undefined' ? window.location.pathname : undefined
          );
        }
        set({ currentUser: defaultUser, isEditMode: false, selectedElementForDetails: null }); // Revert to default user on logout, clear selected element
        toast.success("Logged Out", { description: "You have been successfully signed out." });
      },

      setSelectedElementForDetails: (element: CustomNodeType | CustomFlowEdge | null) =>
        set({ selectedElementForDetails: element }),
      
      updateNodeConfig: (nodeId: string, config: any, data?: any) => {
        // Implementation of updateNodeConfig
        // You need to implement this method according to your requirements
        console.log('Updating node config for', nodeId, config, data);
        // Example implementation - update with actual logic as needed
        set((state) => {
          // Update logic here - this is just a placeholder
          return state;
        });
      },
      setSoundEnabled: (enabled: boolean) => {
        set({ soundEnabled: enabled });
        if (typeof window !== 'undefined') {
          localStorage.setItem('dashboardSoundEnabled', String(enabled));
        }
      },
      setActiveAlarms: (alarms: ActiveAlarm[]) => set({ activeAlarms: alarms }),

      // --- API Monitoring Actions ---
      addApiConfig: (newConfigPartial) => set((state) => {
        const newId = uuidv4();
        const fullConfig: ApiConfig = {
          id: newId,
          name: newConfigPartial.name,
          type: newConfigPartial.type,
          localApi: { url: newConfigPartial.localUrl, status: 'pending' },
          onlineApi: { url: newConfigPartial.onlineUrl, status: 'pending' },
          nodeId: newConfigPartial.nodeId,
          withFactor: newConfigPartial.withFactor,
          isEnabled: newConfigPartial.isEnabled !== undefined ? newConfigPartial.isEnabled : true,
          category: newConfigPartial.category,
        };
        return { apiConfigs: { ...state.apiConfigs, [newId]: fullConfig } };
      }),

      updateApiConfig: (configId, updates) => set((state) => {
        const existingConfig = state.apiConfigs[configId];
        if (!existingConfig) return state;
        // Handle localApi and onlineApi updates carefully if they are partial
        let updatedLocalApi = existingConfig.localApi;
        if (updates.localApi) {
            updatedLocalApi = { ...existingConfig.localApi, ...updates.localApi };
        }
        let updatedOnlineApi = existingConfig.onlineApi;
        if (updates.onlineApi) {
            updatedOnlineApi = { ...existingConfig.onlineApi, ...updates.onlineApi };
        }

        const updatedConfig = {
            ...existingConfig,
            ...updates,
            localApi: updatedLocalApi,
            onlineApi: updatedOnlineApi,
        };
        return { apiConfigs: { ...state.apiConfigs, [configId]: updatedConfig } };
      }),

      removeApiConfig: (configId) => set((state) => {
        const { [configId]: _, ...remainingConfigs } = state.apiConfigs;
        // Also remove related downtimes
        const remainingDowntimes = state.apiDowntimes.filter(dt => dt.apiConfigId !== configId);
        return { apiConfigs: remainingConfigs, apiDowntimes: remainingDowntimes };
      }),

      setApiInstanceStatus: (configId, urlType, status, timestamp, errorMsg) => set(state => {
        const config = state.apiConfigs[configId];
        if (!config) return state;

        const nowISO = (timestamp || new Date()).toISOString();
        const updatedInstanceConf: ApiInstanceConfig = {
            ...(urlType === 'local' ? config.localApi : config.onlineApi),
            status,
            lastChecked: nowISO,
            error: errorMsg || undefined, // Set error on the instance, or clear it if no errorMsg
        };

        // Clear instance error if status is now online or disabled
        if (status === 'online' || status === 'disabled') {
            delete updatedInstanceConf.error;
        }

        const updatedConfig = { ...config };
        if (urlType === 'local') {
            updatedConfig.localApi = updatedInstanceConf;
        } else {
            updatedConfig.onlineApi = updatedInstanceConf;
        }

        // Update overall ApiConfig lastError. This could be more sophisticated,
        // e.g., prioritizing local errors or combining them.
        // For now, if the current instance being updated has an error, set it as the main error.
        // If it's online, clear the main error only if the other instance is also not in error.
        if (updatedInstanceConf.error) {
            updatedConfig.lastError = `${urlType === 'local' ? 'Local' : 'Online'} Error: ${updatedInstanceConf.error}`;
        } else {
            // If this instance is now fine, check the other one before clearing the main error
            const otherInstance = urlType === 'local' ? updatedConfig.onlineApi : updatedConfig.localApi;
            if (!otherInstance.error) {
                 delete updatedConfig.lastError;
            } else {
                updatedConfig.lastError = `${urlType === 'local' ? 'Online' : 'Local'} Error: ${otherInstance.error}`;
            }
        }


        // Basic downtime tracking within this action for simplicity of transition
        // More robust logic might be in a separate service/hook that calls these store actions
        if (status === 'offline' || status === 'error') {
            if (!updatedInstanceConf.downtimeStart) {
                updatedInstanceConf.downtimeStart = nowISO;
                // Potentially create a new ApiDowntimeEvent here if not handled by dedicated actions
            }
        } else if (status === 'online') {
            if (updatedInstanceConf.downtimeStart) {
                // End the downtime period
                // This might also be a place to create/resolve an ApiDowntimeEvent
                delete updatedInstanceConf.downtimeStart;
                delete updatedInstanceConf.currentDowntimeDuration;
            }
        }


        return { apiConfigs: { ...state.apiConfigs, [configId]: updatedConfig } };
      }),

      recordApiDowntimeStart: (apiConfigId, urlType, urlChecked, startTime) => set(state => {
        const newDowntime: ApiDowntimeEvent = {
          id: uuidv4(),
          apiConfigId,
          urlType,
          urlChecked,
          startTime: startTime.toISOString(),
          endTime: null,
          acknowledged: false,
        };
        // Also update the specific ApiInstanceConfig
        const config = state.apiConfigs[apiConfigId];
        if (config) {
            const instanceToUpdate = urlType === 'local' ? config.localApi : config.onlineApi;
            const updatedInstanceConf: ApiInstanceConfig = {
                ...instanceToUpdate,
                downtimeStart: startTime.toISOString(), // Ensure this is also set on the instance
            };
            const updatedConfig = { ...config };
            if (urlType === 'local') updatedConfig.localApi = updatedInstanceConf;
            else updatedConfig.onlineApi = updatedInstanceConf;

            return {
                apiDowntimes: [...state.apiDowntimes.filter(d => !(d.apiConfigId === apiConfigId && d.urlType === urlType && d.endTime === null)), newDowntime], // Avoid duplicate ongoing downtimes
                apiConfigs: { ...state.apiConfigs, [apiConfigId]: updatedConfig }
            };
        }
        return { apiDowntimes: [...state.apiDowntimes.filter(d => !(d.apiConfigId === apiConfigId && d.urlType === urlType && d.endTime === null)), newDowntime] };
      }),

      resolveApiDowntimeEvent: (apiConfigId, urlType, endTimeDate) => set(state => {
        const endTimeISO = endTimeDate.toISOString();
        let downtimeResolved = false;
        const updatedDowntimes = state.apiDowntimes.map(dt => {
          if (dt.apiConfigId === apiConfigId && dt.urlType === urlType && dt.endTime === null) {
            const durationMs = endTimeDate.getTime() - new Date(dt.startTime).getTime();
            downtimeResolved = true;
            return { ...dt, endTime: endTimeISO, durationMinutes: Math.round(durationMs / 60000) };
          }
          return dt;
        });

        if (!downtimeResolved) return state; // No open downtime found to resolve for this specific instance

        // Also clear downtimeStart from ApiInstanceConfig
        const config = state.apiConfigs[apiConfigId];
        if (config) {
            const instanceConf = urlType === 'local' ? config.localApi : config.onlineApi;
            // Only update if downtimeStart was actually set (consistency)
            if (instanceConf.downtimeStart) {
                 const updatedInstanceConf = {...instanceConf};
                 delete updatedInstanceConf.downtimeStart;
                 delete updatedInstanceConf.currentDowntimeDuration; // This will be recalculated by UI or a selector

                 const updatedConfig = { ...config };
                 if (urlType === 'local') updatedConfig.localApi = updatedInstanceConf;
                 else updatedConfig.onlineApi = updatedInstanceConf;

                 return {
                    apiDowntimes: updatedDowntimes,
                    apiConfigs: { ...state.apiConfigs, [apiConfigId]: updatedConfig }
                 };
            }
        }
        return { apiDowntimes: updatedDowntimes };
      }),

      loadApiConfigs: (configs) => set({ apiConfigs: configs }),
      loadApiDowntimes: (downtimes) => set({ apiDowntimes: downtimes }),
      clearApiMonitoringData: () => set ({ apiConfigs: {}, apiDowntimes: [] }),

    }),
    {
      name: 'app-user-session-storage', // More specific name
      storage: createJSONStorage(() => safeLocalStorage), // Use safe local storage
      partialize: (state: AppState & SLDActions): Partial<AppState> => ({ // Only persist these parts
        // currentUser: state.currentUser, // Example: persist currentUser
        isEditMode: state.isEditMode,
        soundEnabled: state.soundEnabled, // Persist soundEnabled
        // activeAlarms: state.activeAlarms, // Persisting active alarms might be too much, they should be re-read from DB
        // Do NOT persist opcUaNodeValues or dataPoints metadata from constants
        // selectedElementForDetails should also NOT be persisted as it's transient UI state
        apiConfigs: state.apiConfigs, // Persist API configurations
        apiDowntimes: state.apiDowntimes, // Persist API downtimes
      }),
      onRehydrateStorage: (state) => onRehydrateStorageCallback(state as (AppState & Partial<ApiMonitoringActions>) | undefined), // Cast type
    }
  )
);

// Convenience hooks
export const useIsEditMode = () => useAppStore((state) => state.isEditMode);
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useCurrentUserRole = () => useAppStore((state) => state.currentUser?.role);
export const useSelectedElementForDetails = () => useAppStore((state) => state.selectedElementForDetails); // New hook
export const useSoundEnabled = () => useAppStore((state) => state.soundEnabled);
export const useActiveAlarms = () => useAppStore((state) => state.activeAlarms); // New hook

// API Monitoring Hooks
export const useApiConfigs = () => useAppStore((state) => state.apiConfigs);
export const useApiDowntimes = () => useAppStore((state) => state.apiDowntimes);

// Get a single OPC UA node value, subscribing only to changes for that ID
export const useOpcUaNodeValue = (nodeId: string | undefined): string | number | boolean | undefined => 
    useAppStore(useCallback((state) => nodeId ? state.opcUaNodeValues[nodeId] : undefined, [nodeId]));

// useCallback imported from React for useOpcUaNodeValue hook
import { useCallback } from 'react';
import { ActiveAlarm } from '@/types';