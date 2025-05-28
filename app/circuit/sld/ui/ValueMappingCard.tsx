// app/circuit/sld/ui/ValueMappingCard.tsx
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InfoIcon, PlusCircle, MinusCircle } from 'lucide-react';
import { DataPoint, DataPointLink } from '@/types/sld';

export interface ValueMappingCardProps {
  valueMapping: DataPointLink['valueMapping'];
  dataPointId?: string; // To provide context, e.g., for data type specific placeholders
  // dataPoints: Record<string, DataPoint>; // May not be needed if dataPointId is sufficient for context
  onChangeMappingType: (newType: string | undefined) => void; // Pass undefined if '_none_'
  onChangeMappingEntry: (mapIndex: number, field: string, value: any) => void;
  onAddMappingEntry: () => void;
  onRemoveMappingEntry: (mapIndex: number) => void;
  onChangeDefaultValue: (defaultValue: any) => void;
}

export const ValueMappingCard: React.FC<ValueMappingCardProps> = ({
  valueMapping,
  dataPointId,
  // dataPoints,
  onChangeMappingType,
  onChangeMappingEntry,
  onAddMappingEntry,
  onRemoveMappingEntry,
  onChangeDefaultValue,
}) => {
  const currentMappingType = valueMapping?.type ?? '_none_';

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium flex justify-between items-center">
        Value Mapping (Optional)
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>
                Transform data point values before they affect the target
                property. E.g., map 0/1 to "red"/"green", or numeric ranges to
                status strings.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>
      <Select
        value={currentMappingType}
        onValueChange={(value) => onChangeMappingType(value === '_none_' ? undefined : value)}
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Select Mapping Type..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none_">No Mapping (Use Direct Value)</SelectItem>
          <SelectItem value="exact">Exact Match (String/Number)</SelectItem>
          <SelectItem value="range">Numeric Range</SelectItem>
          <SelectItem value="threshold">Numeric Threshold (Value &gt;= X)</SelectItem>
          <SelectItem value="boolean">Boolean (True/False to Values)</SelectItem>
        </SelectContent>
      </Select>

      {currentMappingType && currentMappingType !== '_none_' && (
        <div className="pl-2 mt-2 space-y-2 border-l-2 border-primary/20 ">
          {valueMapping?.mapping?.map((mapEntry, mapIdx) => (
            <div
              key={mapIdx}
              className="flex gap-2 items-center text-xs p-2 bg-background rounded-md shadow-sm"
            >
              {currentMappingType === 'exact' && (
                <>
                  <Input
                    placeholder="If Source Value Is..."
                    value={mapEntry.match ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'match', e.target.value)
                    }
                    className="h-8 flex-1"
                  />
                  <span className="text-muted-foreground mx-1">then set to</span>
                  <Input
                    placeholder="Target Value"
                    value={mapEntry.value ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'value', e.target.value)
                    }
                    className="h-8 flex-1"
                  />
                </>
              )}
              {currentMappingType === 'range' && (
                <>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={mapEntry.min ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'min', parseFloat(e.target.value))
                    }
                    className="h-8 w-20"
                  />
                  <span className="text-muted-foreground mx-1">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={mapEntry.max ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'max', parseFloat(e.target.value))
                    }
                    className="h-8 w-20"
                  />
                  <span className="text-muted-foreground mx-1">then set to</span>
                  <Input
                    placeholder="Target Value"
                    value={mapEntry.value ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'value', e.target.value)
                    }
                    className="h-8 flex-1"
                  />
                </>
              )}
              {currentMappingType === 'threshold' && (
                <>
                  <Input
                    type="number"
                    placeholder="If Source >= "
                    value={mapEntry.threshold ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'threshold', parseFloat(e.target.value))
                    }
                    className="h-8 w-28"
                  />
                  <span className="text-muted-foreground mx-1">then set to</span>
                  <Input
                    placeholder="Target Value"
                    value={mapEntry.value ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'value', e.target.value)
                    }
                    className="h-8 flex-1"
                  />
                </>
              )}
              {currentMappingType === 'boolean' && mapIdx === 0 && (
                <>
                  <Label className="w-24 text-right pr-2">If True, set to:</Label>
                  <Input
                    placeholder="Target Value for True"
                    value={mapEntry.value ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'value', e.target.value)
                    }
                    className="h-8 flex-1"
                  />
                </>
              )}
              {currentMappingType === 'boolean' && mapIdx === 1 && (
                <>
                  <Label className="w-24 text-right pr-2">If False, set to:</Label>
                  <Input
                    placeholder="Target Value for False"
                    value={mapEntry.value ?? ''}
                    onChange={(e) =>
                      onChangeMappingEntry(mapIdx, 'value', e.target.value)
                    }
                    className="h-8 flex-1"
                  />
                </>
              )}
              {currentMappingType !== 'boolean' && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => onRemoveMappingEntry(mapIdx)}
                      >
                        <MinusCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove This Mapping Rule</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ))}
          {currentMappingType && !['_none_', 'boolean'].includes(currentMappingType) && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddMappingEntry}
              className="text-xs h-8 mt-1"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Rule
            </Button>
          )}
          <div className="mt-2">
            <Label htmlFor={`map-default-value`} className="text-xs">
              Default Value (if no rule matches or on error)
            </Label>
            <Input
              id={`map-default-value`}
              placeholder="e.g., 'gray' or {passthrough_value}"
              value={valueMapping?.defaultValue ?? ''}
              onChange={(e) => onChangeDefaultValue(e.target.value)}
              className="h-8 text-xs"
            />
            <p className="text-xs text-muted-foreground pt-0.5">
              Use{' '}
              <code className="text-xs p-0.5 bg-muted rounded-sm">
                {'{passthrough_value}'}
              </code>{' '}
              to use the original data point value.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValueMappingCard;
