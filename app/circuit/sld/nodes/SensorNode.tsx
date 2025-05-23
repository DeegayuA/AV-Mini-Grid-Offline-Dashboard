// components/sld/nodes/SensorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { SensorNodeData, DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ThermometerIcon, WindIcon, DropletsIcon, GaugeIcon, RssIcon, ScanEyeIcon, AlertTriangleIcon, CheckCircleIcon, HelpCircleIcon } from 'lucide-react';

const SensorNode: React.FC<NodeProps<SensorNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser, realtimeData, dataPoints } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    realtimeData: state.realtimeData,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const processedStatus = useMemo(() => {
    const statusLink = data.dataPointLinks?.find(link => link.targetProperty === 'status');
    if (statusLink && dataPoints[statusLink.dataPointId] && realtimeData) {
      const rawValue = getDataPointValue(statusLink.dataPointId, realtimeData);
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'unknown'; // Default status
  }, [data.dataPointLinks, data.status, realtimeData, dataPoints]);

  const displayValue = useMemo(() => {
    const valueLink = data.dataPointLinks?.find(link => link.targetProperty === 'value' || link.targetProperty === 'reading');
    if (valueLink && dataPoints[valueLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[valueLink.dataPointId];
      const rawValue = getDataPointValue(valueLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, valueLink);
      return formatDisplayValue(mappedValue, valueLink.format, dpMeta?.dataType);
    }
    // Fallback to status or sensor type if no value link
    return processedStatus !== 'unknown' ? String(processedStatus).toUpperCase() : (data.config?.sensorType || 'Sensor');
  }, [data.dataPointLinks, processedStatus, data.config?.sensorType, realtimeData, dataPoints]);

  const { DisplayIcon, baseBorderClass, baseBgClass, baseTextColorClass } = useMemo(() => {
    let icon = ScanEyeIcon; // Default sensor icon
    const sType = data.config?.sensorType?.toLowerCase();
    if (sType?.includes('temp')) icon = ThermometerIcon;
    else if (sType?.includes('wind')) icon = WindIcon;
    else if (sType?.includes('flow') || sType?.includes('liquid')) icon = DropletsIcon;
    else if (sType?.includes('pressure') || sType?.includes('level')) icon = GaugeIcon;
    else if (sType?.includes('signal') || sType?.includes('wireless')) icon = RssIcon;

    let borderCls = 'border-neutral-400 dark:border-neutral-600';
    let bgCls = 'bg-muted/20';
    let textCls = 'text-muted-foreground';

    switch (String(processedStatus).toLowerCase()) {
      case 'fault': case 'alarm':
        icon = AlertTriangleIcon; // Override sensor type icon for critical status
        borderCls = 'border-destructive'; bgCls = 'bg-destructive/10'; textCls = 'text-destructive'; break;
      case 'warning': case 'out_of_range':
        icon = AlertTriangleIcon; // Override for warning
        borderCls = 'border-yellow-500'; bgCls = 'bg-yellow-500/10'; textCls = 'text-yellow-600 dark:text-yellow-400'; break;
      case 'reading': case 'ok': case 'nominal': case 'online':
        // Keep sensor type icon for normal status
        borderCls = 'border-sky-500'; bgCls = 'bg-sky-500/10'; textCls = 'text-sky-600 dark:text-sky-400'; break;
      case 'offline':
        // Keep sensor type icon, but style as offline
        borderCls = 'border-neutral-500'; bgCls = 'bg-neutral-500/10'; textCls = 'text-neutral-500 opacity-70'; break;
      default: // unknown
        icon = HelpCircleIcon; // Fallback for truly unknown status
        borderCls = 'border-gray-400'; bgCls = 'bg-gray-400/10'; textCls = 'text-gray-500'; break;
    }
    return { DisplayIcon: icon, baseBorderClass: borderCls, baseBgClass: bgCls, baseTextColorClass: textCls };
  }, [processedStatus, data.config?.sensorType]);
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );

  const mainDivClasses = `
    sld-node sensor-node group w-[80px] h-[65px] rounded-lg shadow-md
    flex flex-col items-center justify-between p-1.5
    border-2 ${derivedNodeStyles.borderColor ? '' : baseBorderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : baseBgClass}
    bg-card dark:bg-neutral-800 text-foreground
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
  `;
  const effectiveTextColor = derivedNodeStyles.color || baseTextColorClass;

  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      <Handle type="target" position={Position.Top} id="power_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-red-400 !border-red-500" title="Power"/>
      <Handle type="source" position={Position.Bottom} id="signal_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-purple-400 !border-purple-500" title="Signal Out"/>

      <p className={`text-[9px] font-medium text-center truncate w-full ${effectiveTextColor}`} title={data.label}>
        {data.label}
      </p>
      
      <DisplayIcon size={20} className={`my-0.5 transition-colors ${effectiveTextColor}`} />
      
      <p className={`text-[8px] font-normal text-center truncate w-full leading-tight ${effectiveTextColor}`} title={displayValue}>
        {displayValue}
      </p>
    </motion.div>
  );
};

export default memo(SensorNode);