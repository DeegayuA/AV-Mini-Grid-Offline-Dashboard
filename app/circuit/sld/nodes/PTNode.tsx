// components/sld/nodes/PTNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { AlertTriangleIcon, CheckCircleIcon } from 'lucide-react'; // Icons for status

interface PTNodeData extends BaseNodeData {
    config?: BaseNodeData['config'] & {
        ratio?: string; // e.g., "11kV/110V"
        accuracyClass?: string;
        burdenVA?: number;
    }
}

const PTNode: React.FC<NodeProps<PTNodeData>> = ({ data, selected, isConnectable }) => {
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
    return data.status || 'ok'; // Default to 'ok'
  }, [data.dataPointLinks, data.status, realtimeData, dataPoints]);

  const displayValue = useMemo(() => {
    // Example: Link a data point to 'voltage' or 'value' to display measured voltage
    const valueLink = data.dataPointLinks?.find(link => link.targetProperty === 'value' || link.targetProperty === 'voltage');
    if (valueLink && dataPoints[valueLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[valueLink.dataPointId];
      const rawValue = getDataPointValue(valueLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, valueLink);
      return formatDisplayValue(mappedValue, valueLink.format, dpMeta?.dataType);
    }
    return data.config?.ratio || 'PT'; // Fallback to ratio or 'PT'
  }, [data.dataPointLinks, data.config?.ratio, realtimeData, dataPoints]);

  const { statusIcon: StatusVisualIcon, statusColorClass, statusBgClass, statusTextClass } = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { statusIcon: AlertTriangleIcon, statusColorClass: 'text-destructive', statusBgClass: 'bg-destructive/10', statusTextClass: 'text-destructive' };
    if (processedStatus === 'warning')
      return { statusIcon: AlertTriangleIcon, statusColorClass: 'text-yellow-500', statusBgClass: 'bg-yellow-500/10', statusTextClass: 'text-yellow-600 dark:text-yellow-400' };
    // Nominal ('ok', 'connected', 'online')
    return { statusIcon: CheckCircleIcon, statusColorClass: 'text-blue-600 dark:text-blue-400', statusBgClass: 'bg-blue-500/5 dark:bg-blue-400/10', statusTextClass: 'text-blue-700 dark:text-blue-300' };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );

  const PTSymbolSVG = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" width="28" height="28" className={className}>
      <path d="M6 7 C 6 4, 10 4, 10 7 S 14 10, 14 7 S 18 4, 18 7" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M6 17 C 6 14, 10 14, 10 17 S 14 20, 14 17 S 18 14, 18 17" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="12" y1="0" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor"/> 
    </svg>
  );

  const mainDivClasses = `
    sld-node pt-node group w-[60px] h-[70px] rounded-md shadow
    flex flex-col items-center justify-between pt-1 pb-1.5 px-1
    border-2 ${derivedNodeStyles.borderColor ? '' : statusBgClass.replace('bg-', 'border-')} 
    ${derivedNodeStyles.backgroundColor ? '' : statusBgClass}
    bg-card dark:bg-neutral-800 text-foreground
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
  `;
  const symbolEffectiveColor = derivedNodeStyles.color || statusColorClass;
  const textEffectiveColor = derivedNodeStyles.color || statusTextClass;

  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles}
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      <Handle type="target" position={Position.Top} id="primary_tap" isConnectable={isConnectable} className="!w-3 !h-3 !-mt-0.5 sld-handle-style" title="Primary Tap"/>
      <Handle type="source" position={Position.Bottom} id="secondary_signal_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-purple-400 !border-purple-500" title="Secondary Signal"/>

      <p className={`text-[8px] font-semibold text-center truncate w-full leading-tight ${textEffectiveColor}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none relative">
        <PTSymbolSVG className={`transition-colors ${symbolEffectiveColor}`} />
        {processedStatus !== 'ok' && StatusVisualIcon && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{duration: 0.2}}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80"
            >
                <StatusVisualIcon size={10} className={symbolEffectiveColor} />
            </motion.div>
        )}
      </div>
      
      <p className={`text-[7px] text-center truncate w-full leading-none ${textEffectiveColor}`} title={displayValue}>
        {displayValue}
      </p>
    </motion.div>
  );
};

export default memo(PTNode);