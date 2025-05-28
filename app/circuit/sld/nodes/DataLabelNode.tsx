// components/sld/nodes/DataLabelNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position, useReactFlow, Node as ReactFlowNode } from 'reactflow'; // Reverted, added ReactFlowNode for clarity
import { motion } from 'framer-motion';
import { CustomNodeType, DataPointLink, DataPoint, TextLabelNodeData as TextLabelNodeDataType } from '@/types/sld'; // Added CustomNodeType, TextLabelNodeData
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // Added useOpcUaNodeValue
import { 
    getDataPointValue, 
    applyValueMapping, 
    formatDisplayValue,
    getDerivedStyle // We can use this for dynamic styling of the label itself
} from './nodeUtils'; 
import { TextIcon, InfoIcon } from 'lucide-react'; // Generic icon for a data label. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button
import { TextLabelConfigPopover } from '../ui/TextLabelConfigPopover'; // Assuming this is the correct path

// Renamed interface to avoid conflict with the component name if it was also DataLabelNodeData
interface DataLabelNodeType extends Omit<TextLabelNodeDataType, 'elementType'> { // Inherits from TextLabelNodeData which has styleConfig, label, text
  elementType: 'dataLabel'; 
  dataPointLinks?: DataPointLink[]; // Specific to DataLabelNode
}


const DataLabelNode: React.FC<NodeProps<DataLabelNodeType>> = (props) => { // Reverted to NodeProps, used new interface
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props; // Fixed destructuring
  const position = { x: xPos, y: yPos }; // Create position object from xPos and yPos
  const { setNodes } = useReactFlow(); // Added for direct updates if TextLabelConfigPopover is used
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode && state.currentUser?.role === 'admin', // Combined admin check
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));

  // --- Main Display DataPointLink Handling ---
  const mainDisplayLink = useMemo(() =>
    data.dataPointLinks?.find(link => link.targetProperty === 'value' || link.targetProperty === 'text'),
    [data.dataPointLinks]
  );

  const mainDisplayNodeId = useMemo(() => {
    if (mainDisplayLink && dataPoints && dataPoints[mainDisplayLink.dataPointId]) {
      return dataPoints[mainDisplayLink.dataPointId]?.nodeId;
    }
    return undefined;
  }, [mainDisplayLink, dataPoints]);

  const mainDisplayRawValue = useOpcUaNodeValue(mainDisplayNodeId);

  const { displayText, unitText } = useMemo(() => {
    if (mainDisplayLink && dataPoints && dataPoints[mainDisplayLink.dataPointId]) {
      const dpMeta = dataPoints[mainDisplayLink.dataPointId] as DataPoint;
      // Construct primaryOpcUaValues for getDataPointValue
      const primaryValues: Record<string, string | number | boolean> = {};
      if (mainDisplayNodeId && mainDisplayRawValue !== undefined) {
        primaryValues[mainDisplayNodeId] = mainDisplayRawValue;
      }
      // Pass primaryValues to getDataPointValue
      const rawValue = getDataPointValue(mainDisplayLink.dataPointId, dataPoints, primaryValues);
      const mappedValue = applyValueMapping(rawValue, mainDisplayLink);
      const formattedText = formatDisplayValue(mappedValue, mainDisplayLink.format, dpMeta?.dataType);
      const unit = mainDisplayLink.format?.suffix || dpMeta?.unit || '';
      return { displayText: formattedText, unitText: unit };
    }
    return { displayText: data.text || data.label || '---', unitText: '' };
  }, [mainDisplayLink, data.label, data.text, mainDisplayRawValue, dataPoints, mainDisplayNodeId]);


  // --- Derived Styles DataPointLink Handling ---
  const opcUaDataForDerivedStyle = useMemo(() => {
    const reactiveValues: Record<string, string | number | boolean> = {};
    if (data.dataPointLinks && dataPoints) {
      data.dataPointLinks.forEach(link => {
        // Exclude the main display link if it's already handled, though harmless if included
        // if (link === mainDisplayLink) return; 

        const dp = dataPoints[link.dataPointId];
        if (dp?.nodeId) {
          // This is a conceptual placeholder. In a real scenario, you'd call useOpcUaNodeValue for *each* of these.
          // However, hooks cannot be called in loops or callbacks.
          // So, we'd need a more complex setup if MANY distinct nodeIds are used for styling,
          // possibly involving a custom hook or component that aggregates these.
          // For now, assuming getDerivedStyle will use the global store as a fallback if a value isn't in primaryOpcUaValues.
          // Or, if only a few style-driving data points, they could be handled like mainDisplayRawValue.
          // Let's assume for this refactor, we'll pass what reactive values we *do* have (e.g. mainDisplayRawValue if relevant to style)
          // and let getDerivedStyle use its existing fallback logic for others.
          // A more advanced solution might involve a context or a different hook pattern for multiple reactive values.
          if (dp.nodeId === mainDisplayNodeId && mainDisplayRawValue !== undefined) {
             reactiveValues[dp.nodeId] = mainDisplayRawValue;
          }
          // If other specific dataPointLinks were critical for styling and needed to be reactive,
          // they would need their own useOpcUaNodeValue hooks declared at the top level.
        }
      });
    }
    return reactiveValues;
  }, [data.dataPointLinks, dataPoints, mainDisplayNodeId, mainDisplayRawValue]);

  const derivedNodeStyles = useMemo(() =>
    getDerivedStyle(data, dataPoints, opcUaDataForDerivedStyle, useAppStore.getState().opcUaNodeValues), // Pass reactive values and global fallbacks
    [data, dataPoints, opcUaDataForDerivedStyle]
  );

  // Combine static styles from data.styleConfig with derived dynamic styles
  const finalNodeStyle = useMemo(() => {
    const staticStyles: React.CSSProperties = {
        padding: '4px 8px',
        fontSize: '11px',
        lineHeight: '1.3',
        color: 'var(--foreground)',
        backgroundColor: 'var(--card-muted)',
        textAlign: data.styleConfig?.textAlign || 'left',
        minWidth: '50px',
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
    };
    if (data.styleConfig) {
        if (data.styleConfig.fontSize) staticStyles.fontSize = data.styleConfig.fontSize;
        if (data.styleConfig.color) staticStyles.color = data.styleConfig.color;
        if (data.styleConfig.fontWeight) staticStyles.fontWeight = String(data.styleConfig.fontWeight);
        if (data.styleConfig.fontStyle) staticStyles.fontStyle = data.styleConfig.fontStyle;
        if (data.styleConfig.backgroundColor) staticStyles.backgroundColor = data.styleConfig.backgroundColor;
        if (data.styleConfig.padding) staticStyles.padding = data.styleConfig.padding;
        if (data.styleConfig.fontFamily) staticStyles.fontFamily = data.styleConfig.fontFamily;
    }
    return { ...staticStyles, ...derivedNodeStyles };
  }, [data.styleConfig, derivedNodeStyles]);

  const showHandles = isConnectable && isEditMode; // Show handles only if connectable & in edit mode

  const nodeForPopover: ReactFlowNode<DataLabelNodeType> = { // Use ReactFlowNode for clarity
    id,
    type,
    data,
    position: position,
    selected,
    dragging: !!dragging,
    zIndex: zIndex || 0,
    // connectable: isConnectable, // This property is part of NodeProps, not Node directly
  };
  
  // --- MODIFIED UPDATE HANDLERS for TextLabelConfigPopover ---
  const handleStyleConfigUpdate = (newStyleConfig: TextLabelNodeDataType['styleConfig']) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: DataLabelNodeType = { // Use correct type
            ...n.data,
            styleConfig: { ...(n.data.styleConfig || {}), ...newStyleConfig },
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };

  const handleLabelUpdate = (newLabel: string) => { // For the 'label' field if it exists
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: DataLabelNodeType = { ...n.data, label: newLabel };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };
  
  const handleTextUpdate = (newText: string) => { // For the 'text' field
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: DataLabelNodeType = { ...n.data, text: newText };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };


  const NodeContent = (
    <div
      className={`
        sld-node data-label-node
        whitespace-pre-wrap leading-tight outline-none
        transition-all duration-150 ease-in-out
        ${isEditMode ? 'cursor-pointer hover:ring-1 hover:ring-blue-400/70 focus:ring-1 focus:ring-blue-500' : ''}
        ${selected && isEditMode ? 'ring-1 ring-blue-500 shadow-sm' : ''}
        ${selected && !isEditMode ? 'ring-1 ring-blue-300/30' : ''}
        ${!data.styleConfig?.padding ? 'p-1' : ''} 
        ${!data.styleConfig?.fontSize ? 'text-sm' : ''}
        ${!data.styleConfig?.backgroundColor ? 'bg-transparent' : ''}
      `}
      style={finalNodeStyle}
      tabIndex={isEditMode ? 0 : -1}
    >
      {showHandles && <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-1.5 !h-1.5" />}
      {/* For DataLabelNode, displayText (from DataPointLink or fallback) is primary */}
      {data.label && <span className="font-medium whitespace-nowrap opacity-90 mr-1">{data.label}:</span>}
      <span className="font-semibold font-mono whitespace-nowrap">{displayText}</span>
      {unitText && <span className="text-[0.9em] opacity-70 whitespace-nowrap ml-0.5">{unitText}</span>}
      {showHandles && <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-1.5 !h-1.5" />}
    </div>
  );

  return (
    <> 
      {isEditMode && false ? ( // DataLabelNode doesn't use TextLabelConfigPopover
          <TextLabelConfigPopover
            node={nodeForPopover as unknown as ReactFlowNode<TextLabelNodeDataType>} // Double cast to avoid type incompatibility
            onUpdateNodeStyle={handleStyleConfigUpdate}
            onUpdateNodeLabel={handleLabelUpdate} // Keep if 'label' is editable for TextLabels
            onUpdateNodeText={handleTextUpdate}   // Keep if 'text' is editable for TextLabels
            isEditMode={isEditMode} 
          >
            {NodeContent}
          </TextLabelConfigPopover>
        ) : (
          NodeContent // Render DataLabelNode content directly, or TextLabel if not in edit mode
      )}
      {/* Info button for DataLabel (and potentially TextLabel if not in edit mode) */}
      {!isEditMode && (
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
            style={{top: '2px', right: '2px'}}
            onClick={(e) => {
                const nodeObjectForDetailView = {
                    id, type, data, selected: !!selected, dragging: !!dragging, zIndex: zIndex || 0,
                    position: position, 
                    connectable: isConnectable,
                } as unknown as CustomNodeType;
                setSelectedElementForDetails(nodeObjectForDetailView);
                e.stopPropagation();
            }}
            title="View Details"
        >
            <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}
    </>
  );
};
export default memo(DataLabelNode);