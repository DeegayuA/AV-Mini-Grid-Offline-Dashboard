// components/sld/nodes/GenericDeviceNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { GenericDeviceNodeData, DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle, mapIconByName } from './nodeUtils';
import { BoxIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon, ZapIcon, HelpCircleIcon } from 'lucide-react'; // Default and status icons

const GenericDeviceNode: React.FC<NodeProps<GenericDeviceNodeData>> = ({ data, selected, isConnectable }) => {
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
  
  const dynamicIconName = useMemo(() => {
    const iconLink = data.dataPointLinks?.find(link => link.targetProperty === 'iconName');
    if (iconLink && dataPoints[iconLink.dataPointId] && realtimeData) {
        const rawValue = getDataPointValue(iconLink.dataPointId, realtimeData);
        return applyValueMapping(rawValue, iconLink);
    }
    return data.config?.iconName; // Fallback to static config
  }, [data.dataPointLinks, data.config?.iconName, realtimeData, dataPoints]);

  const displayValue = useMemo(() => {
    const valueLink = data.dataPointLinks?.find(link => link.targetProperty === 'value');
    if (valueLink && dataPoints[valueLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[valueLink.dataPointId];
      const rawValue = getDataPointValue(valueLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, valueLink);
      return formatDisplayValue(mappedValue, valueLink.format, dpMeta?.dataType);
    }
    return data.config?.deviceType || 'Device'; // Fallback to deviceType or generic term
  }, [data.dataPointLinks, data.config?.deviceType, realtimeData, dataPoints]);

  const { StatusIcon, statusText, baseBorderClass, baseBgClass, baseTextColorClass } = useMemo(() => {
    let icon = mapIconByName(dynamicIconName) || BoxIcon; // Use dynamic icon name first
    let text = String(processedStatus).toUpperCase();
    let borderCls = 'border-neutral-400 dark:border-neutral-600';
    let bgCls = 'bg-muted/20';
    let textCls = 'text-muted-foreground';

    switch (String(processedStatus).toLowerCase()) {
      case 'fault': case 'alarm':
        icon = XCircleIcon; text = 'FAULT';
        borderCls = 'border-destructive'; bgCls = 'bg-destructive/10'; textCls = 'text-destructive'; break;
      case 'warning':
        icon = AlertTriangleIcon; text = 'WARNING';
        borderCls = 'border-yellow-500'; bgCls = 'bg-yellow-500/10'; textCls = 'text-yellow-600 dark:text-yellow-400'; break;
      case 'nominal': case 'running': case 'active': case 'online': case 'on':
        icon = dynamicIconName ? mapIconByName(dynamicIconName) || CheckCircleIcon : CheckCircleIcon; // Keep dynamic icon if status is good
        text = String(processedStatus).toUpperCase();
        borderCls = 'border-green-500'; bgCls = 'bg-green-500/10'; textCls = 'text-green-600 dark:text-green-400'; break;
      case 'offline': case 'off':
        icon = dynamicIconName ? mapIconByName(dynamicIconName) || BoxIcon : BoxIcon;
        text = 'OFFLINE';
        borderCls = 'border-neutral-500'; bgCls = 'bg-neutral-500/10'; textCls = 'text-neutral-500 opacity-70'; break;
      default: // unknown or other statuses
        icon = dynamicIconName ? mapIconByName(dynamicIconName) || HelpCircleIcon : HelpCircleIcon;
        text = text || 'UNKNOWN';
        borderCls = 'border-gray-400'; bgCls = 'bg-gray-400/10'; textCls = 'text-gray-500'; break;
    }
    return { StatusIcon: icon, statusText: text, baseBorderClass: borderCls, baseBgClass: bgCls, baseTextColorClass: textCls };
  }, [processedStatus, dynamicIconName]);
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );

  const mainDivClasses = `
    sld-node generic-device-node group w-[90px] h-[75px] rounded-lg shadow-md
    flex flex-col items-center justify-between p-2
    border-2 ${derivedNodeStyles.borderColor ? '' : baseBorderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : baseBgClass}
    bg-card dark:bg-neutral-800 
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
  `;
  const effectiveTextColor = derivedNodeStyles.color || baseTextColorClass;


  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles} // derivedNodeStyles can override base classes
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Input"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Output"/>
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-ml-1.5" title="Side Input"/>
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-mr-1.5" title="Side Output"/>

      <p className={`text-[9px] font-semibold text-center truncate w-full ${effectiveTextColor}`} title={data.label}>
        {data.label}
      </p>
      
      <StatusIcon size={24} className={`my-0.5 transition-colors ${effectiveTextColor}`} />
      
      <p className={`text-[8px] text-center truncate w-full leading-tight ${effectiveTextColor}`} title={displayValue}>
        {displayValue}
      </p>
    </motion.div>
  );
};

export default memo(GenericDeviceNode);