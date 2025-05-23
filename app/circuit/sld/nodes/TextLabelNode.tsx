// components/sld/nodes/TextLabelNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position, useReactFlow, Node } from 'reactflow';
import { TextLabelNodeData, TextNodeStyleConfig, SLDElementType, DataPoint } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { TextLabelConfigPopover } from '../ui/TextLabelConfigPopover';

const TextLabelNode: React.FC<NodeProps<TextLabelNodeData>> = ({ 
  data, 
  selected, 
  id, 
  type,
  xPos,
  yPos,
}) => {
  const { setNodes } = useReactFlow();
  const { isEditMode, realtimeData, dataPoints } = useAppStore(state => ({
    isEditMode: state.isEditMode && state.currentUser?.role === 'admin',
    realtimeData: state.realtimeData,
    dataPoints: state.dataPoints,
  }));

  const staticNodeStyle = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (data.styleConfig?.fontSize) styles.fontSize = data.styleConfig.fontSize;
    if (data.styleConfig?.color) styles.color = data.styleConfig.color;
    if (data.styleConfig?.fontWeight) styles.fontWeight = data.styleConfig.fontWeight;
    if (data.styleConfig?.fontStyle) styles.fontStyle = data.styleConfig.fontStyle;
    if (data.styleConfig?.textAlign) styles.textAlign = data.styleConfig.textAlign;
    if (data.styleConfig?.backgroundColor) styles.backgroundColor = data.styleConfig.backgroundColor;
    if (data.styleConfig?.padding) styles.padding = data.styleConfig.padding;
    // Add other static styles from styleConfig as needed
    if (data.styleConfig?.fontFamily) styles.fontFamily = data.styleConfig.fontFamily;
    if (data.styleConfig?.borderRadius) styles.borderRadius = data.styleConfig.borderRadius;
    return styles;
  }, [data.styleConfig]);

  const derivedDynamicStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );

  const displayText = useMemo(() => {
    const textLink = data.dataPointLinks?.find(link => link.targetProperty === 'text' || link.targetProperty === 'value');
    if (textLink && dataPoints[textLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[textLink.dataPointId] as DataPoint; // Cast for safety
      const rawValue = getDataPointValue(textLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, textLink);
      return formatDisplayValue(mappedValue, textLink.format, dpMeta?.dataType);
    }
    return data.text || data.label || 'Text Label'; // Fallback to static text or label
  }, [data.dataPointLinks, data.text, data.label, realtimeData, dataPoints]);

  // Merge static and dynamic styles. Dynamic styles take precedence.
  const finalNodeStyle = useMemo(() => ({
    ...staticNodeStyle,
    ...derivedDynamicStyles,
  }), [staticNodeStyle, derivedDynamicStyles]);


  // --- MODIFIED UPDATE HANDLERS (Remain unchanged as they modify the base `data` object) ---
  const handleStyleConfigUpdate = (newStyleConfig: TextNodeStyleConfig) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: TextLabelNodeData = {
            ...n.data,
            styleConfig: { ...(n.data.styleConfig || {}), ...newStyleConfig },
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };

  const handleLabelUpdate = (newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: TextLabelNodeData = {
            ...n.data,
            label: newLabel,
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };

  const handleTextUpdate = (newText: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: TextLabelNodeData = {
            ...n.data,
            text: newText,
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };
  // --- END MODIFIED UPDATE HANDLERS ---

  const nodeForPopover: Node<TextLabelNodeData> = {
    id, type, data, position: { x: xPos, y: yPos }, selected,
  };

  const NodeContent = (
    <div
      className={`
        sld-node text-label-node
        whitespace-pre-wrap leading-tight outline-none
        transition-all duration-150 ease-in-out
        ${isEditMode ? 'cursor-pointer hover:ring-1 hover:ring-blue-400/70 focus:ring-1 focus:ring-blue-500' : ''}
        ${selected && isEditMode ? 'ring-1 ring-blue-500 shadow-sm' : ''}
        ${selected && !isEditMode ? 'ring-1 ring-blue-300/30' : ''}
        ${!data.styleConfig?.padding && !finalNodeStyle.padding ? 'p-1' : ''} 
        ${!data.styleConfig?.fontSize && !finalNodeStyle.fontSize ? 'text-sm' : ''}
        ${!data.styleConfig?.backgroundColor && !finalNodeStyle.backgroundColor ? 'bg-transparent' : ''}
      `}
      style={finalNodeStyle}
      tabIndex={isEditMode ? 0 : -1}
    >
      {isEditMode && <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-1.5 !h-1.5 sld-handle-style" />}
      {displayText}
      {isEditMode && <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-1.5 !h-1.5 sld-handle-style" />}
    </div>
  );

  return (
    <TextLabelConfigPopover
      node={nodeForPopover}
      onUpdateNodeStyle={handleStyleConfigUpdate}
      onUpdateNodeLabel={handleLabelUpdate}
      onUpdateNodeText={handleTextUpdate}
      isEditMode={!!isEditMode}
    >
      {NodeContent}
    </TextLabelConfigPopover>
  );
};

export default memo(TextLabelNode);