// app/circuit/sld/ui/DisplayFormatCard.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import { DataPoint, DataPointLink } from '@/types/sld';

export interface DisplayFormatCardProps {
  format: DataPointLink['format'];
  dataPointId: string | undefined;
  dataPoints: Record<string, DataPoint>;
  onChangeFormat: (
    field: keyof NonNullable<DataPointLink['format']>,
    value: any
  ) => void;
}

// Local FieldInput component (as it was used in SLDInspectorDialog)
const FieldInput: React.FC<{
  id: string;
  label: string | React.ReactNode;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  name?: string;
  min?: string | number;
  step?: string | number;
  className?: string;
}> = ({ id, label, value, onChange, type = "text", placeholder, name: fieldName, className, ...props }) => (
  <div className="space-y-0.5">
    <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">
      {label}
    </Label>
    <Input
      type={type}
      id={id}
      name={fieldName || id}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      className={`h-8 text-xs ${className}`}
      {...props}
    />
  </div>
);


export const DisplayFormatCard: React.FC<DisplayFormatCardProps> = ({
  format,
  dataPointId,
  dataPoints,
  onChangeFormat,
}) => {
  const currentDataPoint = dataPointId ? dataPoints[dataPointId] : null;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium flex justify-between items-center">
        Display Formatting (Optional)
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>
                Control how the data point's value is displayed IF the Target
                Property expects text (e.g., Label, Data Value). Applied AFTER
                mapping.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>

      {!currentDataPoint && (
        <p className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded-md">
          Select a Data Point above to enable formatting options based on its
          type.
        </p>
      )}

      {currentDataPoint && (
        <div className="pl-2 space-y-2 text-xs border-l-2 border-accent/30">
          {(['Int16', 'Int32', 'UInt16', 'UInt32', 'Float', 'Double', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(currentDataPoint.dataType)) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <FieldInput
                id={`format-prefix`}
                label="Prefix"
                value={format?.prefix ?? ''}
                onChange={(e) => onChangeFormat('prefix', e.target.value)}
                placeholder="e.g. $"
              />
              <FieldInput
                id={`format-suffix`}
                label="Suffix (Unit)"
                value={format?.suffix ?? currentDataPoint.unit ?? ''}
                onChange={(e) => onChangeFormat('suffix', e.target.value)}
                placeholder="e.g. kW"
              />
              <FieldInput
                type="number"
                id={`format-precision`}
                label="Decimal Places"
                value={format?.precision ?? ''}
                onChange={(e) =>
                  onChangeFormat(
                    'precision',
                    e.target.value === '' ? undefined : parseInt(e.target.value)
                  )
                }
                min="0"
                step="1"
                placeholder="e.g. 2"
              />
            </div>
          )}
          {currentDataPoint.dataType === 'Boolean' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FieldInput
                id={`format-true`}
                label="If True, Display:"
                value={format?.trueLabel ?? 'True'}
                onChange={(e) => onChangeFormat('trueLabel', e.target.value)}
                placeholder="e.g. ON, Active"
              />
              <FieldInput
                id={`format-false`}
                label="If False, Display:"
                value={format?.falseLabel ?? 'False'}
                onChange={(e) => onChangeFormat('falseLabel', e.target.value)}
                placeholder="e.g. OFF, Inactive"
              />
            </div>
          )}
          {currentDataPoint.dataType === 'DateTime' && (
            <FieldInput
              id={`format-datetime`}
              label="Date/Time Pattern"
              value={format?.dateTimeFormat ?? 'yyyy-MM-dd HH:mm:ss'}
              onChange={(e) => onChangeFormat('dateTimeFormat', e.target.value)}
              placeholder="date-fns format e.g. PPpp"
            />
          )}
          {currentDataPoint.dataType === 'String' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FieldInput
                id={`format-prefix-str`}
                label="Prefix"
                value={format?.prefix ?? ''}
                onChange={(e) => onChangeFormat('prefix', e.target.value)}
              />
              <FieldInput
                id={`format-suffix-str`}
                label="Suffix"
                value={format?.suffix ?? ''}
                onChange={(e) => onChangeFormat('suffix', e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DisplayFormatCard;
