// Import React for component types
import React from 'react';
import type { LucideIcon } from 'lucide-react'; // Import LucideIcon type
import {
  // Keep specific icons used
  Battery, Zap, Activity, Gauge, AudioWaveform, Thermometer, Clock, Percent,
  Power, ToggleLeft, ToggleRight, AlertTriangle, Settings, Sigma, Waves,
  Minimize2, Maximize2, FileOutput, Waypoints, Info, SigmaSquare, Lightbulb, HelpCircle,
  // LucideProps is implicitly handled by LucideIcon, but keeping explicit import if other code uses it
  LucideProps
} from 'lucide-react';

// Define a precise type for the icon components (as used in current file, part of the union for DataPoint.icon)
export type IconComponentType = React.FC<React.SVGProps<SVGSVGElement>>;

// THIS IS THE NEW LAYOUT FOR DataPoint AS REQUESTED
export interface DataPoint {
  label: string;
  id: string;
  name: string;
  nodeId: string;
  dataType:
  | 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32'
  | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte'
  | 'Int64' | 'UInt64' | 'StatusCode' | 'LocalizedText';
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input';
  icon?: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category?: string;
  factor?: number;
  precision?: number; // Typically for display formatting, used by formatValue util
  isWritable?: boolean;
  decimalPlaces?: number; // Can be synonymous with precision for formatting
  enumSet?: Record<number | string, string>;
}


// --- The following interfaces are from the original file and are kept as is ---
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
  uiType: 'display' | 'button' | 'switch' | 'gauge';
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

export interface ThreePhasePointsConfig {
    a?: DataPointConfig;
    b?: DataPointConfig;
    c?: DataPointConfig;
}

export interface ThreePhaseDisplayGroup {
    groupName: string;
    uiType: 'display' | 'gauge';
    points: ThreePhasePointsConfig;
    average?: DataPointConfig;
    total?: DataPointConfig;
    category: string;
    id?: string;
}

// Helper function for creating kebab-case IDs
const createId = (name: string): string => {
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

// Define an extended type for internal use in this file to accommodate existing fields
// not present in the strictly defined `DataPoint` interface.
// This ensures type safety within this file and allows `dataPoints` to be assignable
// to `DataPoint[]` externally.
type ExtendedDataPoint = DataPoint & {
  phase?: 'a' | 'b' | 'c' | 'x';
  isSinglePhase?: boolean;
  threePhaseGroup?: string;
  notes?: string;
  // decimalPlaces is in DataPoint, no need to repeat here.
};


export const dataPoints: ExtendedDataPoint[] = [
  
];

// Export Node IDs for convenience if used by other parts of the application
export const nodeIds: string[] = dataPoints.map(dataPoint => dataPoint.nodeId);

/**
 * Example function to combine High/Low words.
 * IMPORTANT: Client-side combination of WORDs from OPC UA is complex and error-prone.
 * Relies on correct assumptions about endianness, signedness, and register order.
 * Prefer server-side combination or library features if available.
 * This example assumes Low Word is less significant, High Word is more significant,
 * and handles potential 32-bit signed conversion.
 *
 * @param high - The high word (16-bit value).
 * @param low - The low word (16-bit value).
 * @param isSigned - Whether the target 32-bit value should be treated as signed.
 * @returns A combined 32-bit number.
 */
export function combineWordsExample(high: number, low: number, isSigned: boolean = false): number {
  const lowUnsigned = low & 0xFFFF;
  const highUnsigned = high & 0xFFFF;
  let combined = (highUnsigned << 16) | lowUnsigned;

  if (isSigned && (combined & 0x80000000)) { // Check MSB for signed conversion
    combined = combined - 0x100000000; // Convert from 32-bit unsigned to JS signed number
  }
  return combined;
}


export interface BaseDataPointConfig {
    id: string;
    name: string;
    nodeId: string;
    label: string;
    dataType: DataPointConfig['dataType']; // Use the strict enum
    uiType: DataPointConfig['uiType'];   // Use the strict enum
    icon: IconComponentType;             // Store the component directly
    category: string;
    // Optional fields can be added here if needed during base conversion
    iconName?: string; // Storing original icon name string for edit modal
    unit?: string;
    min?: number;
    max?: number;
    description?: string;
    factor?: number;
    phase?: 'L1' | 'L2' | 'L3' | 'System' | 'Aggregate' | 'x';
    notes?: string;
    isWritable?: boolean;
    precision?: number;
    enumSet?: Record<number | string, string>;
}

