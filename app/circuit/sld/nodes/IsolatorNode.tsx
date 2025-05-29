// components/sld/nodes/IsolatorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { IsolatorNodeData, CustomNodeType, DataPoint, SLDElementType } from '@/types/sld'; // IsolatorNodeData for type
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // Added useOpcUaNodeValue
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { AlertTriangleIcon, InfoIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner'; // Added toast

// IsolatorNodeData is defined in types/sld.ts
// NodeProps<IsolatorNodeData> can be used directly.

const IsolatorNode: React.FC<NodeProps<IsolatorNodeData>> = (props) => { // Using NodeProps<IsolatorNodeData>
  const { data, selected, isConnectable, id, type, zIndex, dragging, position, xPos, yPos } = props;
  const xPosition = xPos ?? position?.x ?? 0;
  const yPosition = yPos ?? position?.y ?? 0;
  
  const { 
    isEditMode, 
    currentUser, 
    globalOpcUaNodeValues, // Renamed for clarity
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

  // --- Reactive Data Point Handling for Isolator State ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const isOpenLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'isOpen'), [data.dataPointLinks]);
  const isOpenDataPointConfig = useMemo(() => isOpenLink ? dataPoints[isOpenLink.dataPointId] : undefined, [isOpenLink, dataPoints]);
  const isOpenOpcUaNodeId = useMemo(() => isOpenDataPointConfig?.nodeId, [isOpenDataPointConfig]);
  const reactiveIsOpenValue = useOpcUaNodeValue(isOpenOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'open'; // Default to open if no status DPL
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const isOpen = useMemo(() => {
    if (isOpenLink && isOpenDataPointConfig && reactiveIsOpenValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveIsOpenValue, isOpenLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) === 1;
    }
    // Fallback logic based on processedStatus if no dedicated isOpen DPL
    return processedStatus === 'open' || processedStatus === 'isolated';
  }, [isOpenLink, isOpenDataPointConfig, reactiveIsOpenValue, processedStatus]);

  const { statusText, baseClasses, effectiveColor } = useMemo(() => {
    let text = isOpen ? 'OPEN' : 'CLOSED';
    let classes = isOpen 
        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' // Typically open might be amber/yellow or neutral
        : 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; // Closed is typically green
    
    // Override with fault/warning if applicable
    if (String(processedStatus).toLowerCase() === 'fault' || String(processedStatus).toLowerCase() === 'alarm') {
        text = 'FAULT';
        classes = 'border-destructive bg-destructive/10 text-destructive';
    } else if (String(processedStatus).toLowerCase() === 'warning') {
        text = 'WARNING';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    }
    return { statusText: text, baseClasses: classes, effectiveColor: classes.split(' ')[2] }; // text color is usually the 3rd class
  }, [isOpen, processedStatus]);
  
  const opcUaDataForDerivedStyle = useMemo(() => {
    const values: Record<string, string | number | boolean> = {};
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      values[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (isOpenOpcUaNodeId && reactiveIsOpenValue !== undefined) {
      values[isOpenOpcUaNodeId] = reactiveIsOpenValue;
    }
    // Add other reactive style values here if implemented
    return values;
  }, [statusOpcUaNodeId, reactiveStatusValue, isOpenOpcUaNodeId, reactiveIsOpenValue]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, dataPoints, opcUaDataForDerivedStyle, globalOpcUaNodeValues),
    [data, dataPoints, opcUaDataForDerivedStyle, globalOpcUaNodeValues]
  );

  const IsolatorArmSVG = ({ className, isOpen }: { className?: string, isOpen?: boolean }) => {
    const armVariants = {
      open: { rotate: -45, x: -4, y: 4 }, // Adjust x,y for visual pivot
      closed: { rotate: 0, x: 0, y: 0 },
    };
    return (
      <motion.svg viewBox="0 0 10 24" width="12" height="28" 
        className={className} 
        initial={false} 
        animate={isOpen ? "open" : "closed"}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <motion.line 
            x1="5" y1="2" x2="5" y2="22" 
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            variants={armVariants}
            style={{ transformOrigin: "5px 12px" }} // Mid-point of a 24px tall viewbox
        />
      </motion.svg>
    );
  };
  
  const mainDivClasses = `
    sld-node isolator-node group w-[50px] h-[70px] rounded-md shadow-sm
    flex flex-col items-center justify-between pt-1 pb-1.5 px-0.5
    border-2 ${derivedNodeStyles.borderColor ? '' : baseClasses.split(' ')[0]} 
    ${derivedNodeStyles.backgroundColor ? '' : baseClasses.split(' ')[1]}
    bg-card dark:bg-neutral-800
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : (!data.config?.controlNodeId || isEditMode ? 'cursor-default' : 'cursor-pointer hover:shadow-lg')}
  `;
  const finalEffectiveColor = derivedNodeStyles.color || effectiveColor;

  const handleControlClick = () => {
    if (isEditMode) return;

    const controlNodeId = data.config?.controlNodeId;
    if (!controlNodeId) {
      toast.error("Control Action Failed", { description: `Isolator '${data.label}' is not configured for control.` });
      return;
    }

    const valueToWrite = !isOpen; // Toggle the current state

    if (sendJsonMessage) {
      sendJsonMessage({
        type: "WRITE_OPCUA",
        payload: {
          nodeId: controlNodeId,
          value: valueToWrite,
        }
      });
      toast.info(`Control signal sent to ${isOpen ? 'close' : 'open'} isolator '${data.label}'.`, {
        description: `Attempting to set to: ${valueToWrite ? 'OPEN' : 'CLOSED'}`,
      });
    } else {
      toast.error("Real-time Service Error", { description: "Unable to send control signal." });
    }
  };
  
  const handleInfoClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering control click
    const fullNodeObject: CustomNodeType = {
        id, 
        type: type || SLDElementType.Isolator, // Ensure type is passed
        position: { x: xPosition, y: yPosition }, 
        data, 
        selected, 
        dragging, 
        zIndex, 
        connectable: isConnectable,
    };
    setSelectedElementForDetails(fullNodeObject);
  };

  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles} // Derived styles can override all aspects
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
      
      {/* Wrap visual content for pointer-events: none */}
      <div className="flex flex-col items-center justify-between flex-grow pointer-events-none">
        <p className={`text-[9px] font-medium text-center truncate w-full leading-none ${derivedNodeStyles.color ? '' : 'text-foreground dark:text-neutral-200'}`} title={data.label}>
          {data.label}
        </p>
        
        <div className="flex flex-col items-center my-0.5 h-[32px] justify-center relative">
           <div className={`w-1.5 h-1.5 rounded-full absolute top-0`} style={{backgroundColor: finalEffectiveColor}}></div> {/* Top contact */}
           <IsolatorArmSVG className={`${finalEffectiveColor}`} isOpen={isOpen} />
           <div className={`w-1.5 h-1.5 rounded-full absolute bottom-0`} style={{backgroundColor: finalEffectiveColor}}></div> {/* Bottom contact */}
           {(String(processedStatus).toLowerCase() === 'fault' || String(processedStatus).toLowerCase() === 'alarm' || String(processedStatus).toLowerCase() === 'warning') && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute">
                   <AlertTriangleIcon size={14} className={finalEffectiveColor} />
              </motion.div>
           )}
        </div>
        
        <p className={`text-[9px] font-bold leading-tight ${finalEffectiveColor}`}>
          {statusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(IsolatorNode);