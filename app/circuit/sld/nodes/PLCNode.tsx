// components/sld/nodes/PLCNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position, Node } from 'reactflow';
import { motion } from 'framer-motion';
import { PLCNodeData, DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { CpuIcon, NetworkIcon, AlertTriangleIcon, CheckSquareIcon, HelpCircleIcon } from 'lucide-react';

const PLCNode: React.FC<NodeProps<PLCNodeData>> = ({ data, selected, isConnectable }) => {
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
    return data.status || 'unknown'; // Default status
  }, [data.dataPointLinks, data.status, realtimeData, dataPoints]);
  
  const displayInfo = useMemo(() => {
    // Example: Link a data point to 'value' or 'diagCode' to display some info
    const valueLink = data.dataPointLinks?.find(link => link.targetProperty === 'value' || link.targetProperty === 'diagCode');
    if (valueLink && dataPoints[valueLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[valueLink.dataPointId];
      const rawValue = getDataPointValue(valueLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, valueLink);
      return formatDisplayValue(mappedValue, valueLink.format, dpMeta?.dataType);
    }
    return data.config?.model || data.label; // Fallback to model or label
  }, [data.dataPointLinks, data.config?.model, data.label, realtimeData, dataPoints]);


  const { StatusIcon, statusText, baseBorderClass, baseBgClass, baseTextColorClass } = useMemo(() => {
    let icon = CpuIcon;
    let text = String(processedStatus).toUpperCase();
    let borderCls = 'border-neutral-400 dark:border-neutral-600';
    let bgCls = 'bg-muted/30';
    let textCls = 'text-muted-foreground';

    switch (String(processedStatus).toLowerCase()) {
      case 'fault': case 'alarm':
        icon = AlertTriangleIcon; text = 'FAULT';
        borderCls = 'border-destructive'; bgCls = 'bg-destructive/10'; textCls = 'text-destructive'; break;
      case 'running': case 'online': case 'ok':
        icon = CheckSquareIcon; text = 'RUNNING';
        borderCls = 'border-green-500'; bgCls = 'bg-green-500/10'; textCls = 'text-green-600 dark:text-green-400'; break;
      case 'stopped': case 'offline':
        icon = CpuIcon; text = 'STOPPED';
        borderCls = 'border-neutral-500'; bgCls = 'bg-neutral-500/10'; textCls = 'text-neutral-500 opacity-70'; break;
      default: // unknown or other statuses
        icon = HelpCircleIcon; text = text || 'UNKNOWN';
        borderCls = 'border-gray-400'; bgCls = 'bg-gray-400/10'; textCls = 'text-gray-500'; break;
    }
    return { StatusIcon: icon, statusText: text, baseBorderClass: borderCls, baseBgClass: bgCls, baseTextColorClass: textCls };
  }, [processedStatus]);
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );
  
  const mainDivClasses = `
    sld-node plc-node group w-[100px] h-[70px] rounded-lg shadow-md
    flex flex-col items-center justify-between p-2
    border-2 ${derivedNodeStyles.borderColor ? '' : baseBorderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : baseBgClass}
    bg-card dark:bg-neutral-800 text-foreground
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
  `;
  const effectiveTextColor = derivedNodeStyles.color || baseTextColorClass;

  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
<<<<<<< Updated upstream
=======
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
            const fullNodeObject: CustomNodeType = {
                id, type, position, data, selected, dragging, zIndex,
                width: 100, // Default width since props.width is not available
                height: 70, // Default height since props.height is not available
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* PLCs often have multiple I/O and network connections */}
>>>>>>> Stashed changes
      <Handle type="target" position={Position.Top} id="power_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !-mt-1 sld-handle-style !bg-red-400 !border-red-500" title="Power In"/>
      <Handle type="source" position={Position.Bottom} id="network_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !-mb-1 sld-handle-style !bg-blue-400 !border-blue-500" title="Network/IO"/>
      <Handle type="target" position={Position.Left} id="digital_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !-ml-1 sld-handle-style !bg-yellow-400 !border-yellow-500" title="Digital Inputs"/>
      <Handle type="source" position={Position.Right} id="digital_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !-mr-1 sld-handle-style !bg-purple-400 !border-purple-500" title="Digital Outputs"/>

      <p className={`text-[10px] font-semibold text-center truncate w-full ${effectiveTextColor}`} title={data.label}>
        {data.label}
      </p>
      
      <StatusIcon size={22} className={`my-0.5 transition-colors ${effectiveTextColor}`} />
      
      <p className={`text-[9px] font-medium text-center truncate w-full leading-tight ${effectiveTextColor}`} title={displayInfo}>
        {statusText} ({displayInfo})
      </p>
    </motion.div>
  );
};

export default memo(PLCNode);