// config/dataPoints.ts

// Import React for component types
import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Define a precise type for the icon components
export type IconComponentType = React.FC<React.SVGProps<SVGSVGElement>>;

// Main DataPoint interface used throughout the application for UI representation
export interface DataPoint {
  label: string;
  id: string; // Application-specific unique ID for this data point configuration
  name: string; // User-friendly name
  nodeId: string; // OPC UA Node ID (e.g., "ns=2;s=MyVariable")
  dataType:
  | 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32'
  | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte'
  | 'Int64' | 'UInt64' | 'StatusCode' | 'LocalizedText';
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input'; // Add other UI types as needed
  icon?: LucideIcon | IconComponentType; // Actual icon component for UI
  iconName?: string; // String name of the icon (e.g., "Zap") for storage/DB
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category?: string;
  factor?: number;
  precision?: number;
  isWritable?: boolean;
  decimalPlaces?: number;
  enumSet?: Record<number | string, string>; // For mapping numerical values to string representations

  // These fields were part of the original ExtendedDataPoint and DataPointConfig.
  // Consolidating them here if they are generally useful.
  phase?: 'a' | 'b' | 'c' | 'x';
  isSinglePhase?: boolean;
  threePhaseGroup?: string;
  notes?: string;
  source?: 'db' | 'discovered' | 'ai-enhanced' | 'manual' | 'imported'; // To track origin in UI
}

// This interface was part of the original file and might be used by some specific components.
// It's similar to DataPoint but has a stricter uiType and category, and icon is always IconComponentType.
// For broader compatibility and future DB storage, the main `DataPoint` interface above is preferred.
// If `DataPointConfig` is still heavily used, ensure its properties align or are transformable from `DataPoint`.
export interface DataPointConfig {
  id: string;
  label: string;
  name: string;
  nodeId: string;
  dataType:
  | 'Boolean'
  | 'Float'
  | 'Double'
  | 'Int16'
  | 'Int32'
  | 'UInt16'
  | 'UInt32'
  | 'String'
  | 'DateTime'
  | 'ByteString'
  | 'Guid'
  | 'Byte'
  | 'SByte'
  | 'Int64'
  | 'UInt64';
  uiType: 'display' | 'button' | 'switch' | 'gauge'; // Stricter than DataPoint.uiType
  icon: IconComponentType; 
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category: 'battery' | 'grid' | 'inverter' | 'control' | 'three-phase' | 'pv' | 'settings' | 'status' | 'energy' | string; 
  factor?: number;
  phase?: 'a' | 'b' | 'c' | 'x';
  isSinglePhase?: boolean;
  threePhaseGroup?: string;
  notes?: string;
}

// Related types for three-phase groupings, if still used.
export interface ThreePhasePointsConfig {
    a?: DataPointConfig; // Or DataPoint if you standardize
    b?: DataPointConfig;
    c?: DataPointConfig;
}

export interface ThreePhaseDisplayGroup {
    groupName: string;
    uiType: 'display' | 'gauge';
    points: ThreePhasePointsConfig;
    average?: DataPointConfig; // Or DataPoint
    total?: DataPointConfig;   // Or DataPoint
    category: string;
    id?: string; // This was in original, seems like a group ID
}

// The `dataPoints: ExtendedDataPoint[]` array has been removed.
// This data is now managed in the database and accessed via APIs.
// The migration script `scripts/migrateDataPointsToDb.ts` handles the initial population.

// Helper function for creating kebab-case IDs - can be kept if UI logic uses it.
export const createId = (name: string): string => {
  if (typeof name !== 'string' || !name) {
    return ''; 
  }
  return name
    .toLowerCase()
    .replace(/\s+/g, '-') 
    .replace(/[^a-z0-9-_]+/g, '') 
    .replace(/^-+|-+$/g, '') 
    .replace(/-{2,}/g, '-'); 
};

/**
 * Example function to combine High/Low words. This utility is independent of the data array.
 */
export function combineWordsExample(high: number, low: number, isSigned: boolean = false): number {
  const lowUnsigned = low & 0xFFFF;
  const highUnsigned = high & 0xFFFF;
  let combined = (highUnsigned << 16) | lowUnsigned;

  if (isSigned && (combined & 0x80000000)) {
    combined = combined - 0x100000000;
  }
  return combined;
}

// BaseDataPointConfig might be used by specific configurators, keeping for reference
// but should eventually consolidate around the main DataPoint interface.
export interface BaseDataPointConfig {
    id: string;
    name: string;
    nodeId: string;
    label: string;
    dataType: DataPointConfig['dataType'];
    uiType: DataPointConfig['uiType'];
    icon: IconComponentType;
    category: string;
    iconName?: string;
    unit?: string;
    min?: number;
    max?: number;
    description?: string;
    factor?: number;
    phase?: 'L1' | 'L2' | 'L3' | 'System' | 'Aggregate' | 'x'; // Note: phase values differ from DataPoint.phase
    notes?: string;
    isWritable?: boolean;
    precision?: number;
    enumSet?: Record<number | string, string>;
}
