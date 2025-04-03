import { DivideIcon as LucideIcon, Battery, Zap, Activity, Gauge, AudioWaveform } from 'lucide-react';

export interface DataPoint {
  id: string;
  name: string;
  nodeId: string;
  dataType: 'Boolean' | 'Int16' | 'Float' | 'String';
  uiType: 'display' | 'button' | 'switch' | 'gauge';
  icon: typeof LucideIcon;
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category: 'battery' | 'grid' | 'inverter' | 'control';
}

export const dataPoints: DataPoint[] = [
  {
    id: 'work-mode',
    name: 'Work Mode',
    nodeId: 'ns=4;i=104',
    dataType: 'Boolean',
    uiType: 'switch',
    icon: Activity,
    category: 'control',
    description: 'System work mode control'
  },
  {
    id: 'frequency',
    name: 'Frequency',
    nodeId: 'ns=4;i=346',
    dataType: 'Float',
    uiType: 'display',
    icon: AudioWaveform,
    unit: ' Hz',
    min: 0,
    max: 100,
    category: 'battery',
    description: 'Current Frequency'
  },
  {
    id: 'battery-voltage',
    name: 'Battery Voltage',
    nodeId: 'ns=4;i=114',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Battery,
    unit: 'V',
    min: 0,
    max: 100,
    category: 'battery',
    description: 'Current battery voltage'
  },
  {
    id: 'battery-capacity',
    name: 'Battery Capacity',
    nodeId: 'ns=4;i=115',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Battery,
    unit: '%',
    min: 0,
    max: 100,
    category: 'battery',
    description: 'Current battery capacity'
  },
  {
    id: 'grid-power-a',
    name: 'Grid Power Phase A',
    nodeId: 'ns=4;i=145',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'W',
    category: 'grid',
    description: 'Grid side Phase A power'
  },
  {
    id: 'grid-power-b',
    name: 'Grid Power Phase B',
    nodeId: 'ns=4;i=146',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'W',
    category: 'grid',
    description: 'Grid side Phase B power'
  },
  {
    id: 'grid-power-c',
    name: 'Grid Power Phase C',
    nodeId: 'ns=4;i=147',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'W',
    category: 'grid',
    description: 'Grid side Phase C power'
  },
  {
    id: 'grid-voltage-a',
    name: 'Grid Voltage Phase A',
    nodeId: 'ns=4;i=121',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Grid Phase A voltage'
  },
  {
    id: 'grid-voltage-b',
    name: 'Grid Voltage Phase B',
    nodeId: 'ns=4;i=122',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Grid Phase B voltage'
  },
  {
    id: 'grid-voltage-c',
    name: 'Grid Voltage Phase C',
    nodeId: 'ns=4;i=123',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Grid Phase C voltage'
  },
  {
    id: 'inverter-frequency',
    name: 'Inverter Frequency',
    nodeId: 'ns=4;i=346',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Gauge,
    unit: 'Hz',
    min: 45,
    max: 65,
    category: 'inverter',
    description: 'Inverter output frequency'
  },
  {
    id: 'current-a',
    name: 'Current A',
    nodeId: 'ns=4;i=291',
    dataType: 'Float',
    uiType: 'display',
    icon: Activity,
    unit: 'A',
    category: 'battery',
    description: 'Current A'
  },
  {
    id: 'current-b',
    name: 'Current B',
    nodeId: 'ns=4;i=292',
    dataType: 'Float',
    uiType: 'display',
    icon: Activity,
    unit: 'A',
    category: 'battery',
    description: 'Current B'
  },
  {
    id: 'current-c',
    name: 'Current C',
    nodeId: 'ns=4;i=293',
    dataType: 'Float',
    uiType: 'display',
    icon: Activity,
    unit: 'A',
    category: 'battery',
    description: 'Current C'
  },
  {
    id: 'current-n',
    name: 'Current N',
    nodeId: 'ns=4;i=294',
    dataType: 'Float',
    uiType: 'display',
    icon: Activity,
    unit: 'A',
    category: 'battery',
    description: 'Current N'
  },
  {
    id: 'voltage-a-b',
    name: 'Voltage A-B',
    nodeId: 'ns=4;i=301',
    dataType: 'Float',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Voltage A-B'
  },
  {
    id: 'voltage-b-c',
    name: 'Voltage B-C',
    nodeId: 'ns=4;i=302',
    dataType: 'Float',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Voltage B-C'
  },
  {
    id: 'voltage-c-a',
    name: 'Voltage C-A',
    nodeId: 'ns=4;i=303',
    dataType: 'Float',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    category: 'grid',
    description: 'Voltage C-A'
  },
  {
    id: 'active-power-total',
    name: 'Active Power Total',
    nodeId: 'ns=4;i=321',
    dataType: 'Float',
    uiType: 'display',
    icon: Zap,
    unit: 'kW',
    category: 'grid',
    description: 'Total active power'
  },
  {
    id: 'reactive-power-total',
    name: 'Reactive Power Total',
    nodeId: 'ns=4;i=325',
    dataType: 'Float',
    uiType: 'display',
    icon: Zap,
    unit: 'kVAR',
    category: 'grid',
    description: 'Total reactive power'
  },
  {
    id: 'apparent-power-total',
    name: 'Apparent Power Total',
    nodeId: 'ns=4;i=329',
    dataType: 'Float',
    uiType: 'display',
    icon: Zap,
    unit: 'kVA',
    category: 'grid',
    description: 'Total apparent power'
  },
  {
    id: 'energy-meter2-active-load-timer',
    name: 'Energy Meter 2 Active Load Timer',
    nodeId: 'ns=4;i=382',
    dataType: 'Boolean',
    uiType: 'switch',
    icon: Activity,
    category: 'control',
    description: 'Energy Meter 2 Active Load Timer'
  },
  {
    id: 'energy-meter2-meter-operation-timer',
    name: 'Energy Meter 2 Meter Operation Timer',
    nodeId: 'ns=4;i=383',
    dataType: 'Boolean',
    uiType: 'switch',
    icon: Activity,
    category: 'control',
    description: 'Energy Meter 2 Meter Operation Timer'
  },
  {
    id: 'active-energy-delivered',
    name: 'Active Energy Delivered (Into Load)',
    nodeId: 'ns=4;i=386',
    dataType: 'Int16',
    uiType: 'display',
    icon: Battery,
    unit: 'kWh',
    category: 'battery',
    description: 'Active energy delivered into load'
  },
  {
    id: 'active-energy-received',
    name: 'Active Energy Received (Out of Load)',
    nodeId: 'ns=4;i=387',
    dataType: 'Float',
    uiType: 'display',
    icon: Battery,
    unit: 'kWh',
    category: 'battery',
    description: 'Active energy received out of load'
  },
  {
    id: 'reactive-energy-delivered',
    name: 'Reactive Energy Delivered',
    nodeId: 'ns=4;i=390',
    dataType: 'Float',
    uiType: 'display',
    icon: Battery,
    unit: 'kVARh',
    category: 'battery',
    description: 'Reactive energy delivered'
  },
  {
    id: 'reactive-energy-received',
    name: 'Reactive Energy Received',
    nodeId: 'ns=4;i=391',
    dataType: 'Float',
    uiType: 'display',
    icon: Battery,
    unit: 'kVARh',
    category: 'battery',
    description: 'Reactive energy received'
  },
  {
    id: 'apparent-energy-delivered',
    name: 'Apparent Energy Delivered',
    nodeId: 'ns=4;i=394',
    dataType: 'Float',
    uiType: 'display',
    icon: Battery,
    unit: 'kVAh',
    category: 'battery',
    description: 'Apparent energy delivered'
  }
];
export const nodeIds = dataPoints.map(dataPoint => {
  // Round to two decimal points if the value is a float
  if (dataPoint.dataType === 'Float') {
    dataPoint.min = dataPoint.min ? parseFloat(dataPoint.min.toFixed(2)) : undefined;
    dataPoint.max = dataPoint.max ? parseFloat(dataPoint.max.toFixed(2)) : undefined;
  }
  return dataPoint.nodeId;
});
