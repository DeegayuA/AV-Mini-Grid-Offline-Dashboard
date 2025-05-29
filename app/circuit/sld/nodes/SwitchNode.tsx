// app/circuit/sld/nodes/SwitchNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { SwitchNodeData, CustomNodeType, DataPoint } from '@/types/sld'; // SwitchNodeData for type
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, getDerivedStyle } from './nodeUtils'; // Removed getDataPointValue as it's not directly used here
import { InfoIcon, ToggleLeftIcon, ToggleRightIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner'; // Added toast

// SwitchNodeData is defined in types/sld.ts (assuming it extends BaseNodeData)

const SwitchNode: React.FC<NodeProps<SwitchNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props;

  const { 
    isEditMode, 
    currentUser, 
    dataPoints, 
    setSelectedElementForDetails,
    sendJsonMessage, // Added sendJsonMessage
    globalOpcUaNodeValues // Added for getDerivedStyle fallback
  } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    dataPoints: state.dataPoints,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    sendJsonMessage: state.sendJsonMessage,
    globalOpcUaNodeValues: state.opcUaNodeValues,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- IsOn State DataPointLink Handling ---
  // Convention: The switch state is controlled by a DPL targeting 'isOn' or 'value'
  const stateLink = useMemo(() => 
    data.dataPointLinks?.find(link => link.targetProperty === 'isOn' || link.targetProperty === 'value') ||
    // Fallback if no specific targetProperty, take the first link if available
    (data.dataPointLinks?.length === 1 ? data.dataPointLinks[0] : undefined),
    [data.dataPointLinks]
  );

  const stateDataPointConfig = useMemo(() => stateLink ? dataPoints[stateLink.dataPointId] : undefined, [stateLink, dataPoints]);
  const stateOpcUaNodeId = useMemo(() => stateDataPointConfig?.nodeId, [stateDataPointConfig]);
  const reactiveStateValue = useOpcUaNodeValue(stateOpcUaNodeId); // Subscribe to OPC UA node if ID exists

  const isOn = useMemo(() => {
    if (stateLink && stateDataPointConfig && reactiveStateValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveStateValue, stateLink);
      // Interpret various "true" conditions
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || String(mappedValue).toLowerCase() === 'on' || Number(mappedValue) !== 0;
    }
    // Fallback: if no DPL or value, assume 'off' or a configured default
    return false; 
  }, [stateLink, stateDataPointConfig, reactiveStateValue]);

  // --- Derived Styles ---
  // Using a simplified version for derived styles, similar to BreakerNode
  const stylingLinks = useMemo(() => {
    return data.dataPointLinks?.filter(link => 
      link !== stateLink && (['fillColor', 'backgroundColor', 'strokeColor', 'borderColor', 'textColor', 'color', 'visible', 'visibility', 'opacity'].includes(link.targetProperty) || link.targetProperty.startsWith('--'))
    ) || [];
  }, [data.dataPointLinks, stateLink]);

  // Similar to BreakerNode, subscribe to a few style links if necessary
  const styleLink1 = useMemo(() => stylingLinks[0], [stylingLinks]);
  const styleLink1NodeId = useMemo(() => styleLink1 && dataPoints[styleLink1.dataPointId]?.nodeId, [styleLink1, dataPoints]);
  const styleLink1Value = useOpcUaNodeValue(styleLink1NodeId);

  const opcUaValuesForDerivedStyle = useMemo(() => {
    const values: Record<string, string | number | boolean> = {};
    if (stateOpcUaNodeId && reactiveStateValue !== undefined) {
      values[stateOpcUaNodeId] = reactiveStateValue;
    }
    if (styleLink1NodeId && styleLink1Value !== undefined) {
      values[styleLink1NodeId] = styleLink1Value;
    }
    return values;
  }, [stateOpcUaNodeId, reactiveStateValue, styleLink1NodeId, styleLink1Value]);
  
  const derivedNodeStyles = useMemo(() => {
    // Pass globalOpcUaNodeValues as the fallback
    return getDerivedStyle(data, dataPoints, opcUaValuesForDerivedStyle, globalOpcUaNodeValues);
  }, [data, dataPoints, opcUaValuesForDerivedStyle, globalOpcUaNodeValues]);

  const statusStyles = useMemo(() => { // Base visual state not driven by derived styles
    if (isOn) {
      return { border: 'border-green-600 dark:border-green-500', bg: 'bg-green-600/10 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-500', main: 'text-green-700 dark:text-green-500' };
    }
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-neutral-200/20 dark:bg-neutral-700/30', iconColor: 'text-neutral-500 dark:text-neutral-400', main: 'text-neutral-600 dark:text-neutral-400' };
  }, [isOn]);

  const SwitchIcon = isOn ? ToggleRightIcon : ToggleLeftIcon;

  // Handle info icon click to view node details
  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick
    const customNode: CustomNodeType = {
      ...props,
      position: { x: props.xPos ?? 0, y: props.yPos ?? 0 }
    };
    setSelectedElementForDetails(customNode);
  };

  // Handle control click for toggling the switch
  const handleControlClick = () => {
    if (!data.config?.controlNodeId || !sendJsonMessage) return;
    
    try {
      sendJsonMessage({
        type: 'OPC_UA_WRITE',
        nodeId: data.config.controlNodeId,
        value: !isOn, // Toggle the current state
      });
      toast.success(`Switch ${isOn ? 'turned off' : 'turned on'}`);
    } catch (error) {
      toast.error('Failed to toggle switch');
      console.error('Error toggling switch:', error);
    }
  };

  return (
    <motion.div
      className={`
        sld-node switch-node group w-[70px] h-[70px] rounded-lg shadow-md
        flex flex-col items-center justify-center p-1.5 
        border-2 ${derivedNodeStyles.borderColor || statusStyles.border} 
        ${derivedNodeStyles.backgroundColor || statusStyles.bg}
        bg-card dark:bg-neutral-800 
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : (!data.config?.controlNodeId || isEditMode ? 'cursor-default' : 'cursor-pointer hover:shadow-lg')}
      `}
      style={{ // Apply other derived styles not covered by classes
        color: derivedNodeStyles.color || statusStyles.main,
        opacity: derivedNodeStyles.opacity,
        display: derivedNodeStyles.display,
      }}
      variants={{ hover: { scale: (isNodeEditable || !data.config?.controlNodeId || isEditMode) ? 1 : 1.04 }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      onClick={(!isEditMode && data.config?.controlNodeId) ? handleControlClick : undefined}
      // onDoubleClick={handleDoubleClick} // Removed to simplify to single click for control
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => handleInfoClick(e)} // Pass event to stop propagation
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      
      {/* Wrap visual content for pointer-events: none */}
      <div className="flex flex-col items-center justify-center flex-grow pointer-events-none">
        <p className="text-[9px] font-medium text-center truncate w-full mt-0.5" title={data.label}>
          {data.label || 'Switch'}
        </p>
        
        <SwitchIcon size={30} className={`flex-grow transition-colors ${derivedNodeStyles.color ? '' : statusStyles.iconColor}`} />

        <p className="text-[10px] font-semibold">
          {isOn ? 'ON' : 'OFF'}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(SwitchNode);
