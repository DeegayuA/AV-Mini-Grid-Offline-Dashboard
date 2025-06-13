'use client';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DataPoint } from '@/config/dataPoints'; // Updated import
import { useTheme } from 'next-themes';
import { formatValue } from './formatValue';
import { NodeData } from './dashboardInterfaces';

interface ValueDisplayContentProps {
    item: DataPoint; // FIX 1: Corrected item type
    nodeValues: NodeData;
    isDisabled: boolean;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    isEditMode: boolean;
}

const ValueDisplayContent: React.FC<ValueDisplayContentProps> = React.memo(
    ({ item: config, nodeValues, isDisabled, sendDataToWebSocket, isEditMode }) => {
        // Safely derive nodeId. It defaults to '' if config.nodeId is not present or falsy.
        const nodeId = ('nodeId' in config && config.nodeId) ? config.nodeId : '';
        const value = nodeId ? nodeValues[nodeId] : undefined;
        const { resolvedTheme } = useTheme();
        const key = `${nodeId}-${String(value)}-${resolvedTheme}`; // Key for AnimatePresence
        let content: React.ReactNode;
        let valueClass = "text-foreground font-medium";
        let iconPrefix: React.ReactNode = null;
        const unit = config.unit;

        if (value === undefined || value === null) {
            content = <span className="text-gray-400 dark:text-gray-500 italic">--</span>;
        } else if (value === 'Error') {
            content = <span className="font-semibold">Error</span>;
            valueClass = "text-red-600 dark:text-red-400";
            iconPrefix = <AlertCircle size={14} className="mr-1 inline-block" />;
        } else if (typeof value === 'boolean') {
            content = value ? 'ON' : 'OFF';
            valueClass = `font-semibold ${value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
        } else if (typeof value === 'number') {
            const factor = config.factor ?? 1;
            // const min = config.min; // Removed for notification logic
            // const max = config.max; // Removed for notification logic
            let adjustedValue = value * factor;
            let displayValue = formatValue(adjustedValue, config);

            const isOnOff = displayValue === 'ON' || displayValue === 'OFF';

            if (isOnOff) {
                valueClass = `font-semibold ${displayValue === 'ON' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`;
            }
            // Removed isOutOfRange check and related notification logic.
            // The valueClass will default to "text-foreground font-medium" if not ON/OFF.
            // If specific styling for numbers (not ON/OFF and not out-of-range) is needed,
            // it should be added here. For now, it inherits the default.

            content = isOnOff ? displayValue : <>{displayValue}<span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">{unit || ''}</span></>;

        } else if (typeof value === 'string') {
            if (config.dataType === 'DateTime') {
                try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) { // Check if date is valid
                        content = date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
                    } else {
                        content = value; // Fallback for invalid date string
                    }
                } catch {
                    content = value; // Fallback to raw string if parsing fails
                }
            } else if (config.dataType === 'Guid') {
                 content = value.length > 8 ? `${value.substring(0, 8)}...` : value;
            } else if (config.dataType === 'ByteString') {
                 content = `[${value.length} bytes]`;
            }
            else {
                 content = value.length > 25 ? `${value.substring(0, 22)}...` : value;
            }
            valueClass = "text-sm text-muted-foreground font-normal";
        } else {
            content = <span className="text-yellow-500">?</span>;
            valueClass = "text-yellow-500";
            iconPrefix = <Info size={14} className="mr-1 inline-block" />;
        }

        return (
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={key}
                    className={`inline-flex items-center ${valueClass}`}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.6 }}
                    transition={{ duration: 0.15, ease: "linear" }}
                >
                    {iconPrefix}
                    {content}
                </motion.span>
            </AnimatePresence>
        );
    }
);

ValueDisplayContent.displayName = 'ValueDisplayContent';

export default ValueDisplayContent;