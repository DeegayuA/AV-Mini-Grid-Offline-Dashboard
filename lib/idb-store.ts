// lib/idb-store.ts
import { VERSION } from '@/config/constants';
import { DataPointConfig } from '@/config/dataPoints'; // Assuming DataPointConfig is the type for a single data point config object
import { openDB, DBSchema, IDBPDatabase, IDBPTransaction } from 'idb';
// Note: 'toast' for user feedback is generally better handled in the UI component
// that calls these functions, but if you prefer it here for logging/errors, import it.
import { toast } from 'sonner';

const DB_NAME = 'SolarMinigridDB';
const DB_VERSION = 2; // Incremented version due to schema change
const APP_CONFIG_STORE_NAME = 'AppConfigStore';
const POWER_TIMELINE_STORE_NAME = 'PowerTimelineDataStore';
const CONFIG_KEY = 'onboardingData'; // This will be the key in the exported JSON for this data

export interface AppOnboardingData {
  plantName: string;
  plantLocation: string;
  plantType: string;
  plantCapacity: string;
  opcUaEndpointOffline: string;
  opcUaEndpointOnline?: string;
  appName?: string;
  configuredDataPoints: DataPointConfig[]; // Array of data point configurations
  onboardingCompleted: boolean;
  version: string; // App version when data was saved
}

export interface PowerTimelineData {
  timestamp: number; // UTC milliseconds
  generation: number; // kWh
  usage: number; // kWh
  gridFeed: number; // kWh (positive for feed-in, negative for draw)
  isSelfSufficient?: boolean; // Optional: true if generation >= usage
}

interface MyAppDB extends DBSchema {
  [APP_CONFIG_STORE_NAME]: {
    key: string; // Key will be CONFIG_KEY ('onboardingData')
    value: AppOnboardingData;
  };
  [POWER_TIMELINE_STORE_NAME]: {
    key: number; // timestamp
    value: PowerTimelineData;
    indexes: { timestamp: number }; // Index on timestamp for range queries
  };
}

async function getDb(): Promise<IDBPDatabase<MyAppDB>> {
  return openDB<MyAppDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction: IDBPTransaction<MyAppDB, (typeof APP_CONFIG_STORE_NAME | typeof POWER_TIMELINE_STORE_NAME)[], "versionchange">) {
      if (oldVersion < 1) { // Initial setup or upgrade from version < 1
        if (!db.objectStoreNames.contains(APP_CONFIG_STORE_NAME)) {
          db.createObjectStore(APP_CONFIG_STORE_NAME);
        }
      }
      if (oldVersion < 2) { // Upgrade from version 1 to 2
        if (!db.objectStoreNames.contains(POWER_TIMELINE_STORE_NAME)) {
          const store = db.createObjectStore(POWER_TIMELINE_STORE_NAME, { keyPath: 'timestamp' });
          store.createIndex('timestamp', 'timestamp'); // Index for querying by time range
        }
      }
      // Handle further upgrades here if newVersion > 2
    },
  });
}

export async function saveOnboardingData(
  data: Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>,
): Promise<void> {
  const db = await getDb();
  const fullData: AppOnboardingData = {
    ...data,
    onboardingCompleted: true,
    version: VERSION, // VERSION from constants
  };
  try {
    await db.put(APP_CONFIG_STORE_NAME, fullData, CONFIG_KEY);
    console.log('Onboarding data saved to IndexedDB:', fullData);
    toast.success("Onboarding Data Saved", { description: "Configuration stored successfully in browser." });
  } catch (error) {
    console.error('Error saving onboarding data to IndexedDB:', error);
    toast.error("IDB Save Error", { description: String(error) });
    throw error; // Re-throw for the caller to handle if necessary
  }
}

export async function getOnboardingData(): Promise<AppOnboardingData | null> {
  try {
    const db = await getDb();
    const data = await db.get(APP_CONFIG_STORE_NAME, CONFIG_KEY);
    return data || null;
  } catch (error) {
    console.error('Error fetching onboarding data from IndexedDB:', error);
    toast.error("IDB Fetch Error", { description: String(error) });
    return null; // Or throw error, depending on desired handling
  }
}

export async function clearOnboardingData(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(APP_CONFIG_STORE_NAME, CONFIG_KEY);
    console.log('Onboarding data cleared from IndexedDB.');
    toast.info("Onboarding Data Cleared", { description: "Local configuration has been removed." });
  } catch (error) {
    console.error('Error clearing onboarding data from IndexedDB:', error);
    toast.error("IDB Clear Error", { description: String(error) });
    throw error;
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  const data = await getOnboardingData();
  return !!data?.onboardingCompleted;
}

// Functions for PowerTimelineDataStore

/**
 * Adds or updates a power timeline data point.
 * @param data The power timeline data to save.
 */
export async function addPowerTimelineData(data: PowerTimelineData): Promise<void> {
  const db = await getDb();
  try {
    // Calculate isSelfSufficient if not provided
    const dataToStore: PowerTimelineData = {
      ...data,
      isSelfSufficient: data.isSelfSufficient ?? data.generation >= data.usage,
    };
    await db.put(POWER_TIMELINE_STORE_NAME, dataToStore);
    console.log('Power timeline data saved to IndexedDB:', dataToStore);
    // toast.success("Power Data Saved", { description: "Timeline entry stored." }); // Optional: can be too noisy
  } catch (error) {
    console.error('Error saving power timeline data to IndexedDB:', error);
    toast.error("Power Data Save Error", { description: String(error) });
    // throw error; // Decide if re-throwing is needed
  }
}

/**
 * Retrieves power timeline data within a specified time range.
 * @param timeFrom The start of the time range (UTC milliseconds).
 * @param timeTo The end of the time range (UTC milliseconds).
 * @returns A promise that resolves to an array of PowerTimelineData.
 */
export async function getPowerTimelineData(timeFrom: number, timeTo: number): Promise<PowerTimelineData[]> {
  const db = await getDb();
  try {
    const range = IDBKeyRange.bound(timeFrom, timeTo);
    const data = await db.getAllFromIndex(POWER_TIMELINE_STORE_NAME, 'timestamp', range);
    console.log(`Fetched ${data.length} power timeline entries from ${new Date(timeFrom)} to ${new Date(timeTo)}`);
    return data;
  } catch (error) {
    console.error('Error fetching power timeline data from IndexedDB:', error);
    toast.error("Power Data Fetch Error", { description: String(error) });
    return []; // Return empty array on error
  }
}

/**
 * Placeholder function to delete old power timeline data.
 * Actual deletion logic to be implemented based on data retention policy.
 * @param olderThanTimestamp The timestamp (UTC milliseconds) before which data should be deleted.
 */
export async function deleteOldPowerTimelineData(olderThanTimestamp: number): Promise<void> {
  console.log('deleteOldPowerTimelineData called. Data older than:', new Date(olderThanTimestamp));
  // Actual deletion logic:
  try {
    const db = await getDb();
    const tx = db.transaction(POWER_TIMELINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(POWER_TIMELINE_STORE_NAME);
    const range = IDBKeyRange.upperBound(olderThanTimestamp, true); // true to exclude the boundary timestamp itself
    let deleteCount = 0;

    // Iterate and delete (more robust for large datasets than a single delete by range call in some browsers/cases)
    // However, a direct store.delete(range) is often sufficient.
    let cursor = await store.openCursor(range);
    while (cursor) {
      await cursor.delete();
      deleteCount++;
      cursor = await cursor.continue();
    }
    await tx.done;

    if (deleteCount > 0) {
      console.log(`Deleted ${deleteCount} old power timeline entries older than ${new Date(olderThanTimestamp)}.`);
      toast.info("Old Power Data Cleared", { description: `${deleteCount} old entries removed.` });
    } else {
      console.log(`No power timeline entries found older than ${new Date(olderThanTimestamp)} to delete.`);
    }
  } catch (error) {
    console.error('Error deleting old power timeline data from IndexedDB:', error);
    toast.error("Power Data Delete Error", { description: String(error) });
    // throw error;
  }
  console.log('Note: Full implementation of deleteOldPowerTimelineData might depend on specific data retention policies and performance considerations for large datasets.');
}


/**
 * Exports all relevant data from IndexedDB stores for backup.
 * Currently exports 'onboardingData' and up to last 1000 power timeline entries.
 * @returns A Promise resolving to an object where keys are data identifiers
 * (e.g., 'onboardingData', 'powerTimelineData') and values are the corresponding data.
 */
export async function exportIdbData(): Promise<Record<string, any>> {
  const exportedData: Record<string, any> = {};
  try {
    // Export onboarding data
    const onboardingData = await getOnboardingData();
    if (onboardingData) {
      exportedData[CONFIG_KEY] = onboardingData;
    }

    // Export power timeline data (e.g., last 1000 entries or a specific recent range)
    // For simplicity, let's fetch a recent large chunk. Adjust as needed.
    const db = await getDb();
    // Fetching all data might be too much for export, so consider limiting it.
    // Here, we'll fetch all, but in a real app, you might limit by date or count.
    const powerTimelineEntries = await db.getAll(POWER_TIMELINE_STORE_NAME);
    if (powerTimelineEntries && powerTimelineEntries.length > 0) {
      exportedData[POWER_TIMELINE_STORE_NAME] = powerTimelineEntries;
      console.log(`Exporting ${powerTimelineEntries.length} power timeline entries.`);
    }
    
    console.log('IndexedDB data prepared for export:', exportedData);
    return exportedData;
  } catch (error) {
    console.error("Error preparing IndexedDB data for export:", error);
    toast.error("Export Error", { description: `Failed to prepare data for export: ${String(error)}` });
    // Optionally include error information in the export
    exportedData._error = `Failed to export some IndexedDB data: ${String(error)}`;
    return exportedData; // Return whatever data was successfully fetched
  }
}