// components/sld/ui/SLDElementDetailSheet.tsx
import React, { useState, useMemo, useCallback } from 'react'; // Added useState & useCallback
import { Node, Edge } from 'reactflow';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"; 
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"; 
import { toast } from "sonner"; 
import { Loader2 } from 'lucide-react'; // Using lucide-react for loader

import {
  CustomNodeData,
  CustomFlowEdgeData,
  RealTimeData,
  CustomNodeType,
  CustomFlowEdge,
  DataPointLink,
  SLDAction 
} from '@/types/sld';
import { getDataPointValue, formatDisplayValue, applyValueMapping } from '../nodes/nodeUtils'; 
import { useAppStore } from '@/stores/appStore';

interface SLDElementDetailSheetProps {
  element: CustomNodeType | CustomFlowEdge | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onExecuteAction?: (action: SLDAction) => Promise<{success: boolean, message?: string}>; 
}

function isNode(element: any): element is CustomNodeType {
  return element && 'position' in element && 'data' in element;
}

const SLDElementDetailSheet: React.FC<SLDElementDetailSheetProps> = ({
  element,
  isOpen,
  onOpenChange,
  onExecuteAction,
}) => {
  const [confirmAction, setConfirmAction] = useState<SLDAction | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const realtimeData = useAppStore((state) => state.realtimeData);
  const dataPoints = useAppStore((state) => state.dataPoints);

  const handleActionClick = useCallback((action: SLDAction) => {
    if (action.confirmationMessage) {
      setConfirmAction(action);
    } else {
      executeValidatedAction(action);
    }
  }, [onExecuteAction]); // Added onExecuteAction to dependency array

  const executeValidatedAction = useCallback(async (action: SLDAction) => {
    if (!onExecuteAction) {
      toast.error("Action execution function not provided.");
      setConfirmAction(null); // Close dialog if it was open
      return;
    }
    setPendingActionId(action.actionId);
    try {
      const result = await onExecuteAction(action);
      if (result.success) {
        toast.success(action.successMessage || `"${action.label}" executed successfully.`);
      } else {
        toast.error(result.message || action.errorMessage || `Failed to execute "${action.label}".`);
      }
    } catch (error) {
      console.error("Error executing action:", error);
      toast.error(action.errorMessage || `Error during "${action.label}": ${(error as Error).message || 'Unknown error'}`);
    } finally {
      setPendingActionId(null);
      setConfirmAction(null); 
    }
  }, [onExecuteAction]); // Added onExecuteAction to dependency array

  if (!element) return null;

  const elementData = element.data as CustomNodeData | CustomFlowEdgeData; 
  const elementType = isNode(element) ? element.data.elementType : 'Connection';
  const nodeConfig = isNode(element) ? (element.data as CustomNodeData).config : undefined;
  const nodeActions = isNode(element) ? (element.data as CustomNodeData).actions : undefined;

  const getDisplayData = (link: DataPointLink): { label: string; value: string; unit?: string, rawValue?: any } | null => {
      const dpDefinition = dataPoints[link.dataPointId];
      if (!dpDefinition) return null;

      const rawValue = getDataPointValue(link.dataPointId, realtimeData);
      let displayValue = rawValue;

      if (link.valueMapping) {
          const mapped = applyValueMapping(rawValue, link);
          if (mapped !== undefined && typeof mapped !== 'object' && mapped !== rawValue) {
               displayValue = mapped;
          }
      }
      
        const formattedValue = formatDisplayValue(displayValue, { 
          ...link, 
          ...(link.format ?? { type: dpDefinition.dataType as any, suffix: dpDefinition.unit }) 
        });


      return {
          label: dpDefinition.label,
          value: formattedValue,
          unit: dpDefinition.unit,
          rawValue: rawValue,
      };
  };

  const linkedDataInfo = elementData?.dataPointLinks
      ?.map(getDisplayData)
      .filter((item): item is Exclude<ReturnType<typeof getDisplayData>, null> => item !== null) ?? [];


  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{elementData?.label || 'Element Details'}</SheetTitle>
            <SheetDescription>
               Type: <Badge variant="outline">{elementType}</Badge> {isNode(element) ? `(ID: ${element.id})` : `(ID: ${element.id})`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {nodeConfig && Object.keys(nodeConfig).length > 0 && (
                  <div>
                      <h3 className="font-semibold mb-2 text-sm">Configuration</h3>
                       <div className="text-xs space-y-1 text-muted-foreground">
                          {Object.entries(nodeConfig).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                  <span>{String(value)}</span>
                              </div>
                          ))}
                      </div>
                      <Separator className="my-3" />
                  </div>
              )}

            {linkedDataInfo.length > 0 && (
               <div>
                   <h3 className="font-semibold mb-2 text-sm">Real-time Data</h3>
                  <div className="space-y-2">
                      {linkedDataInfo.map((info, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{info.label}:</span>
                          <span className="font-medium">{info.value}</span>
                      </div>
                      ))}
                  </div>
                   <Separator className="my-3" />
              </div>
            )}

            {/* Actions Section */}
            {isNode(element) && onExecuteAction && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Actions</h3>
                {nodeActions && nodeActions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {nodeActions.map((action) => (
                      <Button
                        key={action.actionId}
                        variant="outline"
                        size="sm"
                        onClick={() => handleActionClick(action)}
                        disabled={pendingActionId === action.actionId}
                        className="text-xs justify-start p-2 h-auto"
                      >
                        {pendingActionId === action.actionId && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No actions configured for this element.</p>
                )}
                <Separator className="my-3" />
              </div>
            )}
            {isNode(element) && !onExecuteAction && (
                 <div>
                    <h3 className="font-semibold mb-2 text-sm">Actions</h3>
                    <p className="text-xs text-muted-foreground">Action execution not available in this context.</p>
                    <Separator className="my-3" />
                </div>
            )}
          </div>

          <SheetFooter className="p-4 border-t">
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {confirmAction && (
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Action: {confirmAction.label}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {confirmAction.confirmationMessage || "Are you sure you want to proceed with this action?"}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmAction(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => executeValidatedAction(confirmAction)}>
                        Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default SLDElementDetailSheet;