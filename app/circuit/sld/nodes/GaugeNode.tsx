// app/circuit/sld/nodes/GaugeNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, DataPointLink, DataPoint } from '@/types/sld'; // Removed CustomNodeType as it's not used
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils'; // Added getDerivedStyle
import { GaugeIcon } from 'lucide-react'; // Placeholder icon

// Define the data structure for GaugeNode
export interface GaugeNodeData extends BaseNodeData {
  config?: BaseNodeData['config'] & {
    minVal?: number;
    maxVal?: number;
    valueDataPointLink?: DataPointLink; // This is the new dedicated link
    unit?: string;
  };
}

const GaugeNode: React.FC<NodeProps<GaugeNodeData>> = (props) => {
  const { data, selected, isConnectable, id } = props;

  const { dataPoints, isEditMode, currentUser, globalOpcUaNodeValues } = useAppStore(state => ({ // Renamed opcUaNodeValues for clarity
    dataPoints: state.dataPoints,
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    globalOpcUaNodeValues: state.opcUaNodeValues, 
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const minVal = data.config?.minVal ?? 0;
  const maxVal = data.config?.maxVal ?? 100;
  const unit = data.config?.unit ?? ''; // Unit from config (e.g. for display purposes)

  // Determine the primary DataPointLink: use valueDataPointLink if available
  const primaryValueLink = data.config?.valueDataPointLink;

  // Fallback to the first generic dataPointLink if primaryValueLink is not set AND targetProperty is 'value'
  const fallbackValueLink = useMemo(() => {
    if (!primaryValueLink && data.dataPointLinks && data.dataPointLinks.length > 0) {
      return data.dataPointLinks.find(link => link.targetProperty === 'value' || !link.targetProperty); // Prefer 'value' or unspecified
    }
    return undefined;
  }, [primaryValueLink, data.dataPointLinks]);

  const valueLink = primaryValueLink || fallbackValueLink;

  // Get Node ID for the primary value link
  const valueLinkNodeId = useMemo(() => {
    if (valueLink && valueLink.dataPointId && dataPoints) {
      return dataPoints[valueLink.dataPointId]?.nodeId;
    }
    return undefined;
  }, [valueLink, dataPoints]);

  // Use reactive value for the primary value link
  const reactivePrimaryValue = useOpcUaNodeValue(valueLinkNodeId);

  const { numericValue, formattedValue, displayUnit } = useMemo(() => {
    if (!valueLink || !valueLink.dataPointId || !dataPoints) {
      return { numericValue: null, formattedValue: "N/A", displayUnit: unit || '' };
    }

    const dpMeta = dataPoints[valueLink.dataPointId] as DataPoint | undefined;
    let rawValueToProcess: any;

    // Prioritize reactive value if its nodeId matches the valueLink's nodeId
    if (valueLinkNodeId && reactivePrimaryValue !== undefined) {
      rawValueToProcess = reactivePrimaryValue;
    } else if (valueLinkNodeId) { // If nodeId exists but reactivePrimaryValue is undefined (e.g. initial load)
      // Attempt to get from global store as a one-time fallback if needed, though useOpcUaNodeValue should handle this.
      rawValueToProcess = globalOpcUaNodeValues[valueLinkNodeId];
    }
    
    const mappedValue = applyValueMapping(rawValueToProcess, valueLink);
    
    let currentNumericValue: number | null = null;
    if (typeof mappedValue === 'number') {
      currentNumericValue = mappedValue;
    } else if (typeof mappedValue === 'string') {
      const parsed = parseFloat(mappedValue);
      if (!isNaN(parsed)) {
        currentNumericValue = parsed;
      }
    } else if (typeof mappedValue === 'boolean') {
      // Simple boolean to number conversion for gauge display
      currentNumericValue = mappedValue ? 1 : 0; 
      // Potentially, map true/false to maxVal/minVal or other configured values
      // currentNumericValue = mappedValue ? maxVal : minVal;
    }

    // Formatting for display
    // The format object on valueLink should ideally be set up in SLDInspectorDialog
    const displayFormat = valueLink.format || { type: dpMeta?.dataType === 'Boolean' ? 'boolean' : (dpMeta?.dataType === 'String' ? 'string' : 'number') };
    const finalFormattedValue = formatDisplayValue(mappedValue, displayFormat, dpMeta?.dataType);
    
    // Determine unit: explicit config unit > DP unit > format suffix
    const finalUnit = unit || dpMeta?.unit || valueLink.format?.suffix || '';

    return {
        numericValue: currentNumericValue,
        formattedValue: finalFormattedValue,
        displayUnit: finalUnit
    };
  }, [valueLink, valueLinkNodeId, reactivePrimaryValue, globalOpcUaNodeValues, dataPoints, unit]);

  const clampedValue = useMemo(() => {
    if (numericValue === null) return minVal;
    return Math.min(Math.max(numericValue, minVal), maxVal);
  }, [numericValue, minVal, maxVal]);

  const percentage = useMemo(() => {
    if (maxVal === minVal) return 0; // Avoid division by zero
    return ((clampedValue - minVal) / (maxVal - minVal)) * 100;
  }, [clampedValue, minVal, maxVal]);

  // SVG Gauge calculations (semi-circle)
  const svgWidth = 80;
  const svgHeight = 45; // Adjusted for semi-circle + text
  const arcRadius = 30;
  const arcStrokeWidth = 8;
  const arcCenterX = svgWidth / 2;
  const arcCenterY = svgHeight - arcStrokeWidth / 2 - 2; // Position Y to leave space for text

  const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0; // Adjust angle for semi-circle starting left
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };
  
  // Angles for semi-circle: 0 is left, 180 is right for this mapping
  const backgroundArcPath = describeArc(arcCenterX, arcCenterY, arcRadius, 0, 180);
  const valueArcAngle = (percentage / 100) * 180; // Map percentage to 0-180 degrees
  const valueArcPath = describeArc(arcCenterX, arcCenterY, arcRadius, 0, valueArcAngle);

  // --- Derived Styles DataPointLink Handling ---
  const stylingLinks = useMemo(() => {
    return (data.dataPointLinks || []).filter(link =>
      link !== valueLink && // Exclude the primary value link if it's already in data.dataPointLinks
      (link.targetProperty.startsWith('fill') || link.targetProperty.startsWith('stroke') || link.targetProperty.startsWith('text') ||
       link.targetProperty.startsWith('background') || link.targetProperty === 'opacity' || link.targetProperty === 'visible' ||
       link.targetProperty.startsWith('--')) // Include CSS custom properties
    );
  }, [data.dataPointLinks, valueLink]);

  // Explicitly subscribe to up to 3 styling links
  const styleLink1 = useMemo(() => stylingLinks[0], [stylingLinks]);
  const styleLink1NodeId = useMemo(() => styleLink1 && dataPoints[styleLink1.dataPointId]?.nodeId, [styleLink1, dataPoints]);
  const styleLink1Value = useOpcUaNodeValue(styleLink1NodeId);

  const styleLink2 = useMemo(() => stylingLinks[1], [stylingLinks]);
  const styleLink2NodeId = useMemo(() => styleLink2 && dataPoints[styleLink2.dataPointId]?.nodeId, [styleLink2, dataPoints]);
  const styleLink2Value = useOpcUaNodeValue(styleLink2NodeId);

  const styleLink3 = useMemo(() => stylingLinks[2], [stylingLinks]);
  const styleLink3NodeId = useMemo(() => styleLink3 && dataPoints[styleLink3.dataPointId]?.nodeId, [styleLink3, dataPoints]);
  const styleLink3Value = useOpcUaNodeValue(styleLink3NodeId);

  const opcUaDataForDerivedStyle = useMemo(() => {
    const reactiveValues: Record<string, string | number | boolean> = {};

    // Add primary value if its nodeId is defined and value available
    if (valueLinkNodeId && reactivePrimaryValue !== undefined) {
      reactiveValues[valueLinkNodeId] = reactivePrimaryValue;
    }

    // Add styling link values
    if (styleLink1NodeId && styleLink1Value !== undefined) reactiveValues[styleLink1NodeId] = styleLink1Value;
    if (styleLink2NodeId && styleLink2Value !== undefined) reactiveValues[styleLink2NodeId] = styleLink2Value;
    if (styleLink3NodeId && styleLink3Value !== undefined) reactiveValues[styleLink3NodeId] = styleLink3Value;
    
    return reactiveValues;
  }, [
    valueLinkNodeId, reactivePrimaryValue,
    styleLink1NodeId, styleLink1Value,
    styleLink2NodeId, styleLink2Value,
    styleLink3NodeId, styleLink3Value,
  ]);
  
  const derivedNodeStyles = useMemo(() => {
    return getDerivedStyle(data, dataPoints, opcUaDataForDerivedStyle, globalOpcUaNodeValues);
  }, [data, dataPoints, opcUaDataForDerivedStyle, globalOpcUaNodeValues]);


  const nodeWidth = 90;
  const nodeHeight = 75; // Adjusted height

  return (
    <motion.div
      className={`
        sld-node gauge-node group w-[${nodeWidth}px] h-[${nodeHeight}px] rounded-lg shadow-md
        flex flex-col items-center justify-center p-1
        border-2 
        bg-card dark:bg-neutral-800 
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      style={{ 
        borderColor: derivedNodeStyles.borderColor || 'var(--border-neutral-strong)', // Default from theme or specific
        backgroundColor: derivedNodeStyles.backgroundColor, // Let getDerivedStyle override if present
        color: derivedNodeStyles.color,
        opacity: derivedNodeStyles.opacity,
        display: derivedNodeStyles.display,
        // Spread other derived styles that are not explicitly handled above
        ...derivedNodeStyles 
      }}
      title={data.label}
      whileHover={{ scale: isNodeEditable ? 1.03 : 1 }}
      initial={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-ml-1.5" />
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-mr-1.5" />

      <p 
        className="text-[9px] font-semibold text-center truncate w-full px-1" 
        style={{ color: derivedNodeStyles.color || 'inherit' }} // Apply text color from derived styles or inherit
        title={data.label}
      >
        {data.label}
      </p>

      <div className="relative flex flex-col items-center justify-center w-full">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[${svgHeight-10}px] mt-0.5">
          <path 
            d={backgroundArcPath} 
            strokeDasharray="2 2" 
            className="stroke-gray-300 dark:stroke-gray-600" // Default, can be overridden by derivedStyle
            style={{ stroke: derivedNodeStyles['--gauge-background-stroke-color'] }} // Example custom property
            strokeWidth={arcStrokeWidth-2} 
            fill="none" 
          />
          {numericValue !== null && (
            <path 
              d={valueArcPath} 
              className="stroke-primary" // Default, can be overridden by derivedStyle
              style={{ stroke: derivedNodeStyles['--gauge-value-stroke-color'] || derivedNodeStyles.stroke }}
              strokeWidth={arcStrokeWidth} 
              fill="none" 
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center justify-center" style={{ top: arcCenterY - arcRadius - 5}}>
            <span 
              className="text-[12px] font-bold text-primary" // Default, can be overridden
              style={{ color: derivedNodeStyles.color || derivedNodeStyles['--gauge-value-text-color'] }}
              title={`${formattedValue} ${displayUnit}`}
            >
                {formattedValue}
            </span>
            {displayUnit && <span 
              className="text-[7px] text-muted-foreground -mt-0.5" // Default, can be overridden
              style={{ color: derivedNodeStyles.color || derivedNodeStyles['--gauge-unit-text-color'] }}
            >{displayUnit}</span>}
        </div>
      </div>
       <p 
        className="text-[7px] text-muted-foreground text-center w-full mt-auto leading-tight" 
        style={{ color: derivedNodeStyles.color || 'var(--muted-foreground)'}}
        title={`Range: ${minVal} - ${maxVal}`}
      >
        {minVal} ... {maxVal}
      </p>
    </motion.div>
  );
};

export default memo(GaugeNode);
