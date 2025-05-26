// components/sld/nodes/CTNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, DataPointLink, DataPoint } from '@/types/sld'; // Use BaseNodeData or create specific CTNodeData
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { AlertTriangleIcon, CheckCircleIcon } from 'lucide-react'; // Icons for status

interface CTNodeData extends BaseNodeData { // Keep this interface if CT specific config is planned
    config?: BaseNodeData['config'] & {
        ratio?: string; // e.g., "100/5A"
        accuracyClass?: string; // e.g., "0.5S"
        burdenVA?: number;
    }
}

const CTNode: React.FC<NodeProps<CTNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, zIndex, dragging } = props; // Destructure all needed props
  const { isEditMode, currentUser, setSelectedElementForDetails } = useAppStore(state => ({
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
    // Example: Link a data point to 'current' or 'value' to display measured current
    const valueLink = data.dataPointLinks?.find(link => link.targetProperty === 'value' || link.targetProperty === 'current');
    if (valueLink && dataPoints[valueLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[valueLink.dataPointId];
      const rawValue = getDataPointValue(valueLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, valueLink);
      return formatDisplayValue(mappedValue, valueLink.format, dpMeta?.dataType);
    }
    return data.config?.ratio || 'CT'; // Fallback to ratio or 'CT'
  }, [data.dataPointLinks, data.config?.ratio, realtimeData, dataPoints]);

  const { statusIcon: StatusVisualIcon, statusColorClass, statusBgClass, statusTextClass } = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { statusIcon: AlertTriangleIcon, statusColorClass: 'text-destructive', statusBgClass: 'bg-destructive/10', statusTextClass: 'text-destructive' };
    if (processedStatus === 'warning')
      return { statusIcon: AlertTriangleIcon, statusColorClass: 'text-yellow-500', statusBgClass: 'bg-yellow-500/10', statusTextClass: 'text-yellow-600 dark:text-yellow-400' };
    // Nominal ('ok', 'connected', 'online')
    return { statusIcon: CheckCircleIcon, statusColorClass: 'text-sky-600 dark:text-sky-400', statusBgClass: 'bg-sky-500/5 dark:bg-sky-400/10', statusTextClass: 'text-sky-700 dark:text-sky-300' };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );

  // Simplified CT Symbol (a ring, conductor passes through)
  const CTSymbolSVG = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" width="28" height="28" className={className}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="3.5" r="1" fill="currentColor" />
      <circle cx="20.5" cy="12" r="1" fill="currentColor" />
    </svg>
  );

  const mainDivClasses = `
    sld-node ct-node group w-[60px] h-[70px] rounded-md shadow
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
      style={derivedNodeStyles} // derivedNodeStyles can override everything if specified
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
            const fullNodeObject: CustomNodeType = {
                id, type, position, data, selected, dragging, zIndex, width, height,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* CT is typically in-line with a main conductor, with a signal output */}
      {/* Primary current flows through, usually top-to-bottom */}
      <Handle type="target" position={Position.Top} id="primary_in" isConnectable={isConnectable} className="!w-3 !h-3 !-mt-0.5 sld-handle-style" title="Primary In"/>
      <Handle type="source" position={Position.Bottom} id="primary_out" isConnectable={isConnectable} className="!w-3 !h-3 !-mb-0.5 sld-handle-style" title="Primary Out"/>
      <Handle type="source" position={Position.Right} id="secondary_signal_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-purple-400 !border-purple-500" title="Secondary Signal"/>

      <p className={`text-[8px] font-semibold text-center truncate w-full leading-tight ${textEffectiveColor}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none relative">
        <CTSymbolSVG className={`transition-colors ${symbolEffectiveColor}`} />
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

export default memo(CTNode);