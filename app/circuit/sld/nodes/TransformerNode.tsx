// components/sld/nodes/TransformerNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { TransformerNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // Added useOpcUaNodeValue
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { GitBranchPlusIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Placeholder, ideally custom SVG. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const TransformerNode: React.FC<NodeProps<TransformerNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, zIndex, dragging, xPos, yPos } = props; // Fixed destructuring
  const position = { x: xPos, y: yPos }; // Create position object from xPos and yPos
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ // Changed realtimeData to opcUaNodeValues
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues, // Changed
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Reactive OPC-UA Values for Styling and Display ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const tempLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'temperature'), [data.dataPointLinks]);
  const tempDataPointConfig = useMemo(() => tempLink ? dataPoints[tempLink.dataPointId] : undefined, [tempLink, dataPoints]);
  const tempOpcUaNodeId = useMemo(() => tempDataPointConfig?.nodeId, [tempDataPointConfig]);
  const reactiveTempValue = useOpcUaNodeValue(tempOpcUaNodeId);

  const loadLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'loadPercentage'), [data.dataPointLinks]);
  const loadDataPointConfig = useMemo(() => loadLink ? dataPoints[loadLink.dataPointId] : undefined, [loadLink, dataPoints]);
  const loadOpcUaNodeId = useMemo(() => loadDataPointConfig?.nodeId, [loadDataPointConfig]);
  const reactiveLoadValue = useOpcUaNodeValue(loadOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && reactiveStatusValue !== undefined) {
      // Original call: getDataPointValue(statusLink.dataPointId, opcUaNodeValues, dataPoints)
      // Corrected if direct: getDataPointValue(statusLink.dataPointId, dataPoints, opcUaNodeValues)
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'offline'; // Default status
  }, [statusLink, reactiveStatusValue, data.status]);

  // Example: Displaying temperature or load percentage if linked
  const additionalInfo = useMemo(() => {
    if (tempLink && reactiveTempValue !== undefined) {
      // Original call: getDataPointValue(tempLink.dataPointId, opcUaNodeValues, dataPoints)
      // Corrected if direct: getDataPointValue(tempLink.dataPointId, dataPoints, opcUaNodeValues)
      const dpMeta = dataPoints[tempLink.dataPointId];
      const mappedValue = applyValueMapping(reactiveTempValue, tempLink);
      return `Temp: ${formatDisplayValue(mappedValue, tempLink.format, dpMeta?.dataType)}`;
    }
    if (loadLink && reactiveLoadValue !== undefined) {
      // Original call: getDataPointValue(loadLink.dataPointId, opcUaNodeValues, dataPoints)
      // Corrected if direct: getDataPointValue(loadLink.dataPointId, dataPoints, opcUaNodeValues)
      const dpMeta = dataPoints[loadLink.dataPointId];
      const mappedValue = applyValueMapping(reactiveLoadValue, loadLink);
      return `Load: ${formatDisplayValue(mappedValue, loadLink.format, dpMeta?.dataType)}`;
    }
    return `${data.config?.primaryVoltage || 'HV'}/${data.config?.secondaryVoltage || 'LV'}`;
  }, [tempLink, reactiveTempValue, loadLink, reactiveLoadValue, dataPoints, data.config]);

  const opcUaValuesForDerivedStyle = useMemo(() => {
      const values: Record<string, string | number | boolean> = {};
      if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
          values[statusOpcUaNodeId] = reactiveStatusValue;
      }
      if (tempOpcUaNodeId && reactiveTempValue !== undefined) {
          values[tempOpcUaNodeId] = reactiveTempValue;
      }
      if (loadOpcUaNodeId && reactiveLoadValue !== undefined) {
          values[loadOpcUaNodeId] = reactiveLoadValue;
      }
      return values;
  }, [statusOpcUaNodeId, reactiveStatusValue, tempOpcUaNodeId, reactiveTempValue, loadOpcUaNodeId, reactiveLoadValue]);

  const statusStyles = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', symbolColorClass: 'text-destructive', textClass: 'text-destructive-foreground' };
    if (processedStatus === 'warning') 
      return { borderClass: 'border-yellow-500', bgClass: 'bg-yellow-500/10', symbolColorClass: 'text-yellow-500', textClass: 'text-yellow-600 dark:text-yellow-300' };
    if (processedStatus === 'nominal' || processedStatus === 'energized' || processedStatus === 'online') 
      return { borderClass: 'border-teal-500', bgClass: 'bg-teal-500/10', symbolColorClass: 'text-teal-500 dark:text-teal-400', textClass: 'text-teal-700 dark:text-teal-300' };
    // Default for offline, standby
    return { borderClass: 'border-neutral-400 dark:border-neutral-600', bgClass: 'bg-muted/30', symbolColorClass: 'text-muted-foreground', textClass: 'text-muted-foreground' };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, dataPoints, opcUaValuesForDerivedStyle, opcUaNodeValues),
    [data, dataPoints, opcUaValuesForDerivedStyle, opcUaNodeValues]
  );

  const isTransformerEnergized = useMemo(() => 
    ['nominal', 'energized', 'online'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );
  
  const isCriticalStatus = useMemo(() => 
    ['fault', 'alarm', 'warning'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );

  const TransformerSymbolSVG = ({ className, isEnergized }: {className?: string, isEnergized?: boolean}) => {
    const coilVariants = {
      energized: { opacity: [0.7, 1, 0.7], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
      offline: { opacity: 1 },
    };
    return (
      <motion.svg viewBox="0 0 24 24" width="32" height="32" className={className} initial={false}>
        <motion.circle 
          cx="8" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" 
          variants={coilVariants} animate={isEnergized ? "energized" : "offline"}
        />
        <motion.circle 
          cx="16" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" 
          variants={coilVariants} animate={isEnergized ? "energized" : "offline"}
          transition={{ ...coilVariants.energized.transition, delay: 0.5 }} // Offset animation for second coil
        />
        <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="12.5" y1="7" x2="12.5" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </motion.svg>
    );
  };

  const DisplayIcon = useMemo(() => {
    if (isCriticalStatus) return AlertTriangleIcon;
    return TransformerSymbolSVG;
  }, [processedStatus, isCriticalStatus]); // Dependencies updated
  
  const iconEffectiveColorClass = derivedNodeStyles.color ? '' : statusStyles.symbolColorClass;

  const mainDivClasses = `
    sld-node transformer-node group w-[80px] h-[85px] rounded-lg shadow-lg
    flex flex-col items-center justify-between p-1.5
    border-2 ${derivedNodeStyles.borderColor ? '' : statusStyles.borderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : statusStyles.bgClass}
    bg-card dark:bg-neutral-800 
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
  `;
  const textEffectiveClass = derivedNodeStyles.color ? '' : statusStyles.textClass;


  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles} // Apply all derived styles; specific properties can be overridden by classes if needed
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
            const fullNodeObject = {
                id, 
                type, 
                position: { x: xPos, y: yPos }, // Use xPos, yPos for position
                data, 
                selected, 
                dragging, 
                zIndex, 
                connectable: isConnectable
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="primary_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Primary"/>
      <Handle type="source" position={Position.Bottom} id="secondary_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Secondary"/>

      <p className={`text-[9px] font-semibold text-center truncate w-full ${textEffectiveClass}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        <motion.div
          animate={isCriticalStatus && DisplayIcon === AlertTriangleIcon ? { scale: [1, 1.05, 1], transition: { duration: 1.5, repeat: Infinity } } : {}}
        >
          <DisplayIcon 
            className={`transition-colors ${iconEffectiveColorClass}`} 
            style={{ color: derivedNodeStyles.color || '' }} // Apply derived color to icon if present
            // Pass isEnergized to TransformerSymbolSVG if it's the current DisplayIcon
            {...(DisplayIcon === TransformerSymbolSVG && { isEnergized: isTransformerEnergized })}
          />
        </motion.div>
      </div>
      
      <p className={`text-[8px] text-center truncate w-full leading-tight ${textEffectiveClass}`} title={additionalInfo}>
        {additionalInfo}
      </p>
    </motion.div>
  );
};

export default memo(TransformerNode);