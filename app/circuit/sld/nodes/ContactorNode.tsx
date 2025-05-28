// components/sld/nodes/ContactorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { ContactorNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // useOpcUaNodeValue already imported
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { PowerIcon, PowerOffIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner'; // Added toast

const ContactorNode: React.FC<NodeProps<ContactorNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props;
  const { 
    isEditMode, 
    currentUser, 
    globalOpcUaNodeValues, 
    dataPoints, 
    setSelectedElementForDetails,
    sendJsonMessage // Added sendJsonMessage
  } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    globalOpcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
    sendJsonMessage: state.sendJsonMessage,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Reactive Data Point Handling ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const isClosedLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'isClosed'), [data.dataPointLinks]);
  const isClosedDataPointConfig = useMemo(() => isClosedLink ? dataPoints[isClosedLink.dataPointId] : undefined, [isClosedLink, dataPoints]);
  const isClosedOpcUaNodeId = useMemo(() => isClosedDataPointConfig?.nodeId, [isClosedDataPointConfig]);
  const reactiveIsClosedValue = useOpcUaNodeValue(isClosedOpcUaNodeId);
  // --- End Reactive Data Point Handling ---

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'open'; // Default to open
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);
  
  const isClosed = useMemo(() => {
    if (isClosedLink && isClosedDataPointConfig && reactiveIsClosedValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveIsClosedValue, isClosedLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) === 1;
    }
    // Fallback logic based on processedStatus
    return processedStatus === 'closed' || processedStatus === 'energized';
  }, [isClosedLink, isClosedDataPointConfig, reactiveIsClosedValue, processedStatus]);


  const { borderClass, bgClass, textClass, Icon } = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', textClass: 'text-destructive', Icon: AlertTriangleIcon };
    if (processedStatus === 'warning') 
      return { borderClass: 'border-yellow-500', bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-500', Icon: AlertTriangleIcon };
    if (isClosed) 
      return { borderClass: 'border-green-600', bgClass: 'bg-green-600/10', textClass: 'text-green-600', Icon: PowerIcon };
    return { borderClass: 'border-neutral-400 dark:border-neutral-600', bgClass: 'bg-muted/30', textClass: 'text-muted-foreground', Icon: PowerOffIcon };
  }, [processedStatus, isClosed]);
  
  const derivedNodeStyles = useMemo(() => {
    const primaryOpcUaValues: Record<string, string | number | boolean> = {};
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      primaryOpcUaValues[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (isClosedOpcUaNodeId && reactiveIsClosedValue !== undefined) {
      primaryOpcUaValues[isClosedOpcUaNodeId] = reactiveIsClosedValue;
    }
    return getDerivedStyle(data, dataPoints, primaryOpcUaValues, globalOpcUaNodeValues);
  }, [data, dataPoints, statusOpcUaNodeId, reactiveStatusValue, isClosedOpcUaNodeId, reactiveIsClosedValue, globalOpcUaNodeValues]);
  
  const contactorSymbolColor = derivedNodeStyles.color || textClass;

  // Combine classes and styles
  const mainDivClasses = `
    sld-node contactor-node group w-[60px] h-[80px] rounded-md shadow-md
    flex flex-col items-center justify-between p-1
    border-2 ${derivedNodeStyles.borderColor ? '' : borderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : bgClass}
    bg-card dark:bg-neutral-800
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : (!data.config?.controlNodeId || isEditMode ? 'cursor-default' : 'cursor-pointer hover:shadow-lg')}
  `;
  
  const handleControlClick = () => {
    if (isEditMode) return;

    const controlNodeId = data.config?.controlNodeId;
    if (!controlNodeId) {
      toast.error("Control Action Failed", { description: `Contactor '${data.label}' is not configured for control.` });
      return;
    }

    const valueToWrite = !isClosed; // Toggle the current state

    if (sendJsonMessage) {
      sendJsonMessage({
        type: "WRITE_OPCUA",
        payload: {
          nodeId: controlNodeId,
          value: valueToWrite,
        }
      });
      toast.info(`Control signal sent to ${isClosed ? 'open' : 'close'} contactor '${data.label}'.`, {
        description: `Attempting to set to: ${valueToWrite ? 'CLOSED' : 'OPEN'}`,
      });
    } else {
      toast.error("Real-time Service Error", { description: "Unable to send control signal." });
    }
  };

  const handleInfoClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering control click
    const fullNodeObject: CustomNodeType = {
        id, 
        type, 
        position: { x: xPos, y: yPos }, // Use xPos, yPos for position
        data, 
        selected, 
        dragging, 
        zIndex, 
                width: undefined, // Remove reference to non-existent props.width
                height: undefined, // Remove reference to non-existent props.height
        connectable: isConnectable,
    };
    setSelectedElementForDetails(fullNodeObject);
  };

  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles} // Apply derived styles, allowing overrides
      variants={{ hover: { scale: (isNodeEditable || !data.config?.controlNodeId || isEditMode) ? 1 : 1.04 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      onClick={(!isEditMode && data.config?.controlNodeId) ? handleControlClick : undefined}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={handleInfoClick} // Already has stopPropagation
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      
      {/* Wrap visual content to ensure clicks pass to parent if not on specific interactive elements */}
      <div className="flex flex-col items-center justify-center flex-grow pointer-events-none">
        <p className={`text-[9px] font-semibold text-center truncate w-full ${derivedNodeStyles.color ? '' : textClass}`} title={data.label}>
          {data.label}
        </p>
        
        <motion.svg 
          viewBox="0 0 24 24" 
          width="30" height="30" 
          className={`transition-colors duration-200 ${derivedNodeStyles.color ? '' : textClass}`} 
          style={{ color: derivedNodeStyles.color || ''}}
          initial={false}
        >
          <circle cx="6" cy="8" r="2" fill="currentColor" /> 
          <circle cx="18" cy="8" r="2" fill="currentColor" />
          <line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" />
          
          <motion.line
            key={`left-contact-${isClosed}`}
            x1="6" y1="10"
            initial={false}
            animate={isClosed ? { x2: 6, y2: 16 } : { x2: 6, y2: 13 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            stroke="currentColor" strokeWidth="1.5"
          />
          {!isClosed && (
            <motion.line
              key="left-angled-contact"
              x1="6" y1="13" x2="8" y2="15"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, delay: 0.15 }}
              stroke="currentColor" strokeWidth="1.5"
            />
          )}
          
          <motion.line
            key={`right-contact-${isClosed}`}
            x1="18" y1="10"
            initial={false}
            animate={isClosed ? { x2: 18, y2: 16 } : { x2: 18, y2: 16 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            stroke="currentColor" strokeWidth="1.5"
          />
          
          <rect x="4" y="16" width="16" height="3" rx="1" fill="currentColor" className="opacity-70"/>
        </motion.svg>
        
        <p className={`text-[9px] font-bold ${derivedNodeStyles.color ? '' : textClass}`}>
          {isClosed ? 'CLOSED' : 'OPEN'}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(ContactorNode);