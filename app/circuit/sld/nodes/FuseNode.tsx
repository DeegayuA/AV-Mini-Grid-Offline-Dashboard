// components/sld/nodes/FuseNode.tsx
import React, { memo, useMemo } from 'react';
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Simplified imports, ExtendedNodeProps not strictly necessary
import { motion } from 'framer-motion';
import { FuseNodeData, CustomNodeType, DataPoint, SLDElementType } from '@/types/sld'; // Removed DataPointLink as it's not directly used for state logic here yet
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // Added useOpcUaNodeValue
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { ShieldOffIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // ZapIcon might not be needed if FuseSymbolSVG is primary
import { Button } from "@/components/ui/button";
import { toast } from 'sonner'; // Added toast

// FuseNodeData is already defined in types/sld.ts, no need to redefine.
// We can use NodeProps<FuseNodeData> directly.

const FuseNode: React.FC<NodeProps<FuseNodeData>> = (props) => { // Using NodeProps<FuseNodeData>
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props; // xPos, yPos are directly available on NodeProps
  
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

  // --- Reactive Data Point Handling for Fuse State ---
  // Convention: A DPL with targetProperty 'isBlown' or 'status' (mapped to boolean) drives the fuse state.
  const stateLink = useMemo(() => 
    data.dataPointLinks?.find(link => link.targetProperty === 'isBlown' || link.targetProperty === 'status'), 
    [data.dataPointLinks]
  );
  const stateDataPointConfig = useMemo(() => stateLink ? dataPoints[stateLink.dataPointId] : undefined, [stateLink, dataPoints]);
  const stateOpcUaNodeId = useMemo(() => stateDataPointConfig?.nodeId, [stateDataPointConfig]);
  const reactiveStateValue = useOpcUaNodeValue(stateOpcUaNodeId);

  const isBlown = useMemo(() => {
    if (stateLink && stateDataPointConfig && reactiveStateValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveStateValue, stateLink);
      // Interpret various "true" conditions for isBlown
      if (stateLink.targetProperty === 'status') { // If using a status link, map specific status strings to blown state
        return String(mappedValue).toLowerCase() === 'blown' || String(mappedValue).toLowerCase() === 'fault';
      }
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) !== 0;
    }
    // Fallback: if status is 'blown' or 'fault' from static data.status
    return data.status === 'blown' || data.status === 'fault';
  }, [stateLink, stateDataPointConfig, reactiveStateValue, data.status]);
  
  const processedStatusForDisplay = useMemo(() => { // For text display, could be different from isBlown boolean
    if (stateLink && stateDataPointConfig && reactiveStateValue !== undefined) {
      return String(applyValueMapping(reactiveStateValue, stateLink));
    }
    return data.status || (isBlown ? 'BLOWN' : 'OK');
  }, [stateLink, stateDataPointConfig, reactiveStateValue, data.status, isBlown]);


  const { statusText, baseClasses, BlownOverlayIcon, isWarning } = useMemo(() => {
    let icon: React.ElementType | null = null;
    let text = processedStatusForDisplay.toUpperCase();
    let classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; // Nominal 'ok'
    let warning = false;

    if (isBlown) { // Prioritize isBlown for main styling
      icon = ShieldOffIcon; text = 'BLOWN';
      classes = 'border-destructive bg-destructive/10 text-destructive';
    } else if (processedStatusForDisplay.toLowerCase() === 'warning') {
      icon = AlertTriangleIcon; text = 'WARNING';
      classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      warning = true;
    } else if (processedStatusForDisplay.toLowerCase() === 'ok' || processedStatusForDisplay.toLowerCase() === 'nominal') {
       text = 'OK';
    }
    // If not blown and not warning, it's considered OK.
    return { BlownOverlayIcon: icon, statusText: text, baseClasses: classes, isWarning: warning };
  }, [processedStatusForDisplay, isBlown]);
  
  const opcUaDataForDerivedStyle = useMemo(() => {
    const values: Record<string, string | number | boolean> = {};
    if (stateOpcUaNodeId && reactiveStateValue !== undefined) {
      values[stateOpcUaNodeId] = reactiveStateValue;
    }
    // Add other reactive style values here if implemented
    return values;
  }, [stateOpcUaNodeId, reactiveStateValue]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, dataPoints, opcUaDataForDerivedStyle, globalOpcUaNodeValues),
    [data, dataPoints, opcUaDataForDerivedStyle, globalOpcUaNodeValues]
  );

  const FuseSymbolSVG = ({ className, isBlown }: { className?: string, isBlown?: boolean }) => {
    const lineVariants = {
      intact: { pathLength: 1, opacity: 1 },
      brokenVisible: { pathLength: 0.4, opacity: 1 }, // For the first segment
      brokenHidden: { pathLength: 0, opacity: 0 },   // For the middle segment that disappears
    };
    const crossVariants = {
        hidden: { opacity: 0, scale: 0.5 },
        visible: { opacity: 1, scale: 1, transition: { delay: 0.1, duration: 0.2 } },
    };

    return (
      <motion.svg viewBox="0 0 24 12" width="36" height="18" className={className} initial={false}>
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {!isBlown && <motion.line key="intact-line" x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="intact" />}
        {isBlown && (
          <>
            {/* Two segments of the broken line */}
            <motion.line key="blown-seg1" x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="brokenVisible" />
            <motion.line key="blown-seg2" x1="14" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="brokenVisible" />
            {/* Crossed lines in the middle */}
            <motion.line key="cross1" x1="10" y1="4" x2="14" y2="8" stroke="currentColor" strokeWidth="1" variants={crossVariants} animate="visible" />
            <motion.line key="cross2" x1="10" y1="8" x2="14" y2="4" stroke="currentColor" strokeWidth="1" variants={crossVariants} animate="visible" />
          </>
        )}
      </motion.svg>
    );
  };
  
  const mainDivClasses = `
    sld-node fuse-node group w-[60px] h-[75px] rounded-md shadow-md
    flex flex-col items-center justify-between p-1.5
    border-2 ${derivedNodeStyles.borderColor ? '' : baseClasses.split(' ')[0]} 
    ${derivedNodeStyles.backgroundColor ? '' : baseClasses.split(' ')[1]}
    bg-card dark:bg-neutral-800 
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : (!data.config?.controlNodeId || isEditMode ? 'cursor-default' : 'cursor-pointer hover:shadow-lg')}
  `;
  const effectiveSymbolColor = derivedNodeStyles.color || baseClasses.split(' ')[2]; // baseClasses provides text color
  const effectiveTextColor = derivedNodeStyles.color || baseClasses.split(' ')[2];

  const handleControlClick = () => {
    if (isEditMode) return;

    const controlNodeId = data.config?.controlNodeId;
    if (!controlNodeId) {
      toast.error("Control Action Failed", { description: `Fuse '${data.label}' is not configured for remote control.` });
      return;
    }

    // Value to write: if fuse is blown, send false (to reset). If intact, send true (to blow).
    // This interpretation depends on backend logic for the controlNodeId.
    const valueToWrite = !isBlown; 

    if (sendJsonMessage) {
      sendJsonMessage({
        type: "WRITE_OPCUA",
        payload: {
          nodeId: controlNodeId,
          value: valueToWrite,
        }
      });
      toast.info(`Control signal sent to ${isBlown ? 'reset' : 'blow'} fuse '${data.label}'.`, {
        description: `Attempting to set to: ${valueToWrite ? 'BLOWN' : 'OK'}`,
      });
    } else {
      toast.error("Real-time Service Error", { description: "Unable to send control signal." });
    }
  };
  
  const handleInfoClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering control click
    const fullNodeObject: CustomNodeType = {
        id, 
        type: type || SLDElementType.Fuse, // Ensure type is passed
        position: { x: xPos, y: yPos }, 
        data, 
        selected, 
        dragging,
        zIndex,
        width: undefined, // Not available directly from NodeProps, would need to get from node instance if required
        height: undefined,
        connectable: isConnectable,
    };
    setSelectedElementForDetails(fullNodeObject);
  };

  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles}
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

      {/* Wrap visual content for pointer-events: none if it should pass clicks to parent */}
      <div className="flex flex-col items-center justify-center flex-grow pointer-events-none">
        <p className={`text-[9px] font-semibold text-center truncate w-full ${derivedNodeStyles.color ? '' : 'text-foreground dark:text-neutral-200'}`} title={data.label}>
          {data.label}
        </p>
        
        <div className="my-0.5 relative"> {/* Removed pointer-events-none from here if the SVG itself is not interactive */}
          <FuseSymbolSVG className={`transition-colors ${effectiveSymbolColor}`} isBlown={isBlown} />
          {BlownOverlayIcon && (
              <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: (isBlown || isWarning) ? 0.8 : 0, scale: (isBlown || isWarning) ? 1 : 0.5 }}
                  transition={{duration: 0.2}}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                  <BlownOverlayIcon size={12} className={`${effectiveSymbolColor}`} />
              </motion.div>
          )}
        </div>
        
        <p className={`text-[9px] text-center truncate w-full leading-tight ${effectiveTextColor}`} title={data.config?.ratingAmps ? `${data.config.ratingAmps}A` : statusText}>
          {data.config?.ratingAmps ? `${data.config.ratingAmps}A` : statusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(FuseNode);