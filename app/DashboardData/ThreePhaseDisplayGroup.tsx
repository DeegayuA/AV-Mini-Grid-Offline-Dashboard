// src/components/dashboard/ThreePhaseDisplayGroup.tsx

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ThreePhaseGroupInfo, NodeData } from './dashboardInterfaces';
import { DataPoint } from '@/config/dataPoints'; // Make sure DataPoint is exported
import { HelpCircle, Sigma, TrendingUp } from 'lucide-react'; // Sigma for Total, TrendingUp for Average
import ValueDisplayContent from './ValueDisplayContent';

interface ThreePhaseDisplayGroupProps {
    group: ThreePhaseGroupInfo;
    nodeValues: NodeData;
    isDisabled: boolean;
    currentHoverEffect: any;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    isEditMode: boolean;
}

const ThreePhaseDisplayGroup: React.FC<ThreePhaseDisplayGroupProps> = React.memo(
    ({ group, nodeValues, isDisabled, currentHoverEffect, playNotificationSound, lastToastTimestamps, sendDataToWebSocket, isEditMode }) => {
        const RepresentativeIcon = group.icon || HelpCircle;
        const POWER_UNITS = ['W', 'KW', 'MW', 'VA', 'KVA', 'MVA', 'VAR', 'KVAR', 'MVAR'];
        const isPowerGroup = POWER_UNITS.includes(group.unit?.toUpperCase() || '');

        // Calculate Total Value (only for power groups)
        const totalValue = useMemo(() => {
            if (!isPowerGroup) return undefined;
            let sum = 0;
            let hasValidPhase = false;
            (['a', 'b', 'c'] as const).forEach(phase => {
                const point = group.points[phase];
                if (point && point.nodeId) {
                    const rawValue = nodeValues[point.nodeId];
                    if (typeof rawValue === 'number' && !isNaN(rawValue)) {
                        sum += rawValue * (point.factor ?? 1); // Apply factor if present
                        hasValidPhase = true;
                    }
                }
            });
            return hasValidPhase ? sum : undefined;
        }, [group.points, nodeValues, isPowerGroup]);

        // Calculate Average Value (only for non-power groups)
        const averageValue = useMemo(() => {
            if (isPowerGroup) return undefined;
            let sum = 0;
            let validPhaseCount = 0;
            (['a', 'b', 'c'] as const).forEach(phase => {
                const point = group.points[phase];
                if (point && point.nodeId) {
                    const rawValue = nodeValues[point.nodeId];
                    if (typeof rawValue === 'number' && !isNaN(rawValue)) {
                        sum += rawValue * (point.factor ?? 1); // Apply factor
                        validPhaseCount++;
                    }
                }
            });
            return validPhaseCount > 0 ? sum / validPhaseCount : undefined;
        }, [group.points, nodeValues, isPowerGroup]);
        
        const firstPhasePoint = useMemo(() => group.points.a || group.points.b || group.points.c, [group.points]);

        const totalItemConfig: DataPoint | null = useMemo(() => {
            if (!isPowerGroup) return null;
            return {
                id: `${group.groupKey}-total`,
                nodeId: `${group.groupKey}-total`,
                name: 'Total',
                label: 'Total',
                dataType: firstPhasePoint?.dataType || 'Float',
                unit: group.unit || firstPhasePoint?.unit || '',
                factor: 1,
                uiType: 'display',
                decimalPlaces: firstPhasePoint?.decimalPlaces,
                icon: Sigma,
                category: 'three-phase',
            };
        }, [group.groupKey, group.points, group.unit, firstPhasePoint, isPowerGroup]);

        const averageItemConfig: DataPoint | null = useMemo(() => {
            if (isPowerGroup) return null;
            // Try to use group.average if it's a full DataPoint configuration
            if (group.average && group.average.id && group.average.nodeId && group.average.name && group.average.label) {
                 return {
                    ...group.average, // Spread existing config
                    unit: group.unit || firstPhasePoint?.unit || group.average.unit || '', // Prioritize group unit
                    dataType: group.average.dataType || firstPhasePoint?.dataType || 'Float',
                    decimalPlaces: group.average.decimalPlaces ?? firstPhasePoint?.decimalPlaces,
                    icon: group.average.icon || TrendingUp, // Use provided icon or default
                 };
            }
            // Fallback if group.average is not a complete config
            return {
                id: `${group.groupKey}-average`,
                nodeId: `${group.groupKey}-average`,
                name: 'Average',
                label: 'Average',
                dataType: firstPhasePoint?.dataType || 'Float',
                unit: group.unit || firstPhasePoint?.unit || '',
                factor: 1, 
                uiType: 'display',
                decimalPlaces: firstPhasePoint?.decimalPlaces,
                icon: TrendingUp, 
                category: 'three-phase',
            };
        }, [group.groupKey, group.average, group.unit, firstPhasePoint, isPowerGroup]);


        return (
            <motion.div className="rounded-lg overflow-hidden" whileHover={currentHoverEffect}>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className={`h-full shadow-lg hover:shadow-xl transition-all duration-300 border dark:border-neutral-700 bg-card ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'}`}>
                                <CardHeader className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-b dark:border-neutral-700 sticky top-0 z-10">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground truncate">
                                        <RepresentativeIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                        <span className="truncate" title={group.title}>{group.title}</span>
                                        {group.unit && <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">({group.unit})</span>}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 text-sm">
                                    {isPowerGroup && totalItemConfig ? (
                                        // 4-column layout for Power groups
                                        <div className="grid grid-cols-4 gap-x-2 gap-y-2 items-stretch">
                                            {(['a', 'b', 'c', 'total'] as const).map(colType => (
                                                <div
                                                    key={`head-${group.groupKey}-${colType}`}
                                                    className={`text-xs font-medium text-center border-b pb-1.5 dark:border-neutral-700 ${colType === 'total' ? 'text-primary dark:text-primary-light font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`}
                                                >
                                                    {colType === 'total' ? (
                                                        <span className="flex items-center justify-center gap-1">
                                                            <Sigma size={13} className="opacity-80"/> Total
                                                        </span>
                                                    ) : (
                                                        group.points[colType as 'a'|'b'|'c'] ? `Phase ${colType.toUpperCase()}` : '–'
                                                    )}
                                                </div>
                                            ))}
                                            {(['a', 'b', 'c'] as const).map((phase) => {
                                                const point = group.points[phase];
                                                return (
                                                    <div key={`${group.groupKey}-${phase}`} className="text-center pt-1.5 min-h-[36px] flex flex-col items-center justify-center">
                                                        {point ? (
                                                            <ValueDisplayContent item={point} nodeValues={nodeValues} isDisabled={isDisabled} sendDataToWebSocket={sendDataToWebSocket} playNotificationSound={playNotificationSound} lastToastTimestamps={lastToastTimestamps} isEditMode={isEditMode} />
                                                        ) : ( <span className="text-neutral-400 dark:text-neutral-600 text-lg">-</span> )}
                                                    </div>
                                                );
                                            })}
                                            <div key={`${group.groupKey}-total-value`} className="text-center pt-1.5 min-h-[36px] flex flex-col items-center justify-center font-semibold bg-neutral-50/50 dark:bg-neutral-800/30 rounded-sm">
                                                {totalValue !== undefined ? (
                                                    <ValueDisplayContent item={totalItemConfig} nodeValues={{ ...nodeValues, [totalItemConfig.nodeId]: totalValue }} isDisabled={isDisabled} sendDataToWebSocket={sendDataToWebSocket} playNotificationSound={playNotificationSound} lastToastTimestamps={lastToastTimestamps} isEditMode={false} />
                                                ) : ( <span className="text-neutral-400 dark:text-neutral-600 text-lg">-</span> )}
                                            </div>
                                        </div>
                                    ) : averageItemConfig ? (
                                        // Single display for Average for non-power groups
                                        <div className="flex flex-col items-center justify-center h-full pt-2">
                                             <div className={`text-xs font-medium text-center pb-1.5 text-neutral-500 dark:text-neutral-400`}>
                                                Average
                                             </div>
                                            {averageValue !== undefined ? (
                                                <ValueDisplayContent
                                                    item={averageItemConfig}
                                                    nodeValues={{ ...nodeValues, [averageItemConfig.nodeId]: averageValue }}
                                                    isDisabled={isDisabled}
                                                    sendDataToWebSocket={sendDataToWebSocket}
                                                    playNotificationSound={playNotificationSound}
                                                    lastToastTimestamps={lastToastTimestamps}
                                                    isEditMode={false} // Average is not directly editable
                                                    // Consider adding specific styling for average display if ValueDisplayContent supports it
                                                    // e.g. valueClassName="text-2xl font-bold" 
                                                />
                                            ) : (
                                                <span className="text-neutral-400 dark:text-neutral-600 text-2xl font-bold">-</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-neutral-500 dark:text-neutral-400 py-4">
                                            Data configuration error or type not supported.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        {group.description && (<TooltipContent align="center" side="bottom"><p>{group.description}</p></TooltipContent>)}
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

ThreePhaseDisplayGroup.displayName = 'ThreePhaseDisplayGroup';

export default ThreePhaseDisplayGroup;