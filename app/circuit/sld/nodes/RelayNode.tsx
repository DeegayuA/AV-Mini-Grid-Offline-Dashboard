// components/sld/nodes/RelayNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, DataPointLink, DataPoint } from '@/types/sld'; // Or specific RelayNodeData
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ShieldCheckIcon, ShieldAlertIcon, ShieldQuestionIcon, ZapIcon, HelpCircleIcon } from 'lucide-react';

interface RelayNodeData extends BaseNodeData {
    config?: BaseNodeData['config'] & {
        relayType?: string; // e.g., "Overcurrent", "Differential", "Control"
        ansiCode?: string; // e.g., "50/51", "87T"
    }
}

const RelayNode: React.FC<NodeProps<RelayNodeData>> = ({ data, selected, isConnectable }) => {
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
    const valueLink = data.dataPointLinks?.find(link => link.targetProperty === 'value');
    if (valueLink && dataPoints[valueLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[valueLink.dataPointId];
      const rawValue = getDataPointValue(valueLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, valueLink);
      return formatDisplayValue(mappedValue, valueLink.format, dpMeta?.dataType);
    }
    return data.config?.ansiCode || data.config?.relayType || 'Relay';
  }, [data.dataPointLinks, data.config, realtimeData, dataPoints]);

  const { DisplayIcon, statusText, baseBorderClass, baseBgClass, baseTextColorClass } = useMemo(() => {
    let icon = ShieldQuestionIcon;
    let text = String(processedStatus).toUpperCase();
    let borderCls = 'border-neutral-400 dark:border-neutral-600';
    let bgCls = 'bg-muted/20';
    let textCls = 'text-muted-foreground';

    switch (String(processedStatus).toLowerCase()) {
      case 'tripped': case 'fault': case 'alarm':
        icon = ShieldAlertIcon; text = 'TRIPPED';
        borderCls = 'border-destructive'; bgCls = 'bg-destructive/10'; textCls = 'text-destructive'; break;
      case 'warning':
        icon = ShieldAlertIcon; text = 'WARNING';
        borderCls = 'border-yellow-500'; bgCls = 'bg-yellow-500/10'; textCls = 'text-yellow-600 dark:text-yellow-400'; break;
      case 'active': case 'picked_up': // Control relay active state
        icon = ZapIcon; text = 'ACTIVE';
        borderCls = 'border-sky-500'; bgCls = 'bg-sky-500/10'; textCls = 'text-sky-600 dark:text-sky-400'; break;
      case 'nominal': case 'healthy': case 'ready':
        icon = ShieldCheckIcon; text = 'READY';
        borderCls = 'border-green-500'; bgCls = 'bg-green-500/10'; textCls = 'text-green-600 dark:text-green-400'; break;
      case 'offline':
        icon = ShieldQuestionIcon; text = 'OFFLINE';
        borderCls = 'border-neutral-500'; bgCls = 'bg-neutral-500/10'; textCls = 'text-neutral-500 opacity-70'; break;
      default: // unknown or other statuses
        icon = HelpCircleIcon; text = text || 'UNKNOWN';
        borderCls = 'border-gray-400'; bgCls = 'bg-gray-400/10'; textCls = 'text-gray-500'; break;
    }
    return { DisplayIcon: icon, statusText: text, baseBorderClass: borderCls, baseBgClass: bgCls, baseTextColorClass: textCls };
  }, [processedStatus]);
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );
  
  const mainDivClasses = `
    sld-node relay-node group w-[75px] h-[70px] rounded-md shadow-md
    flex flex-col items-center justify-between p-1.5
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
      <Handle type="target" position={Position.Top} id="power_in" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !bg-red-400" title="Power"/>
      <Handle type="target" position={Position.Left} id="ct_pt_in" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !bg-yellow-400" title="Measurement Inputs"/>
      <Handle type="source" position={Position.Right} id="trip_out" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !bg-orange-400" title="Trip/Control Output"/>
      <Handle type="source" position={Position.Bottom} id="comms_out" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !bg-blue-400" title="Communication"/>

      <p className={`text-[9px] font-semibold text-center truncate w-full ${effectiveTextColor}`} title={data.label}>
        {data.label}
      </p>
      
      <DisplayIcon size={24} className={`my-0.5 transition-colors ${effectiveTextColor}`} />
      
      <p className={`text-[8px] font-medium text-center truncate w-full leading-tight ${effectiveTextColor}`} title={displayInfo}>
        {statusText} ({displayInfo})
      </p>
    </motion.div>
  );
};

export default memo(RelayNode);