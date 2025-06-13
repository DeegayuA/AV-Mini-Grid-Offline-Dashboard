'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
} from '@/components/ui/select'; // Keep Select for other fields
import { Switch } from '@/components/ui/switch';
import { DataPoint } from '@/config/dataPoints';
import { NotificationRule } from '@/types/notifications';
import { Tags, Target, Binary, Sigma, Baseline, Zap, AlertTriangle, InfoIcon, Check, Loader2, Save, X, ChevronsUpDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area'; // If form becomes very long
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAppStore } from '@/lib/store';
import { formatValue } from '@/app/DashboardData/formatValue';

// Define the OPC data types based on usage in the component
type OPC_DATA_TYPE_FriendlyNames = 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32' | 'Byte' | 'SByte' | 'Int64' | 'UInt64' | 'String';

// Updated schema for more refined validation based on data type later
const ruleFormSchemaBase = z.object({
  name: z.string().min(3, 'Rule name must be at least 3 characters').max(100, 'Rule name too long'),
  dataPointKey: z.string().min(1, 'Data Point is required'), // Changed from nodeId to dataPointKey for clarity if it represents that
  condition: z.enum(['==', '!=', '<', '<=', '>', '>=', 'contains', 'not_contains', 'is_true', 'is_false'], {
    required_error: 'Condition is required',
  }),
  // thresholdValue will be validated dynamically
  severity: z.enum(['info', 'warning', 'critical'], { // Changed from priority, common naming for severity
    required_error: 'Severity is required',
  }),
  message: z.string().max(500, 'Message is too long').optional(),
  enabled: z.boolean(), // Renamed from isEnabled for consistency
});

// We'll handle thresholdValue validation within the component or refine schema later if using superRefine
type RuleFormValuesBase = z.infer<typeof ruleFormSchemaBase>;
interface RuleFormValues extends RuleFormValuesBase {
    thresholdValue?: string | number | boolean; // To hold the actual typed value
    thresholdInputString?: string; // For the text input field before conversion
}


interface NotificationRuleFormProps {
  initialData?: Partial<NotificationRule>; // Use 'dataPointKey' instead of 'nodeId' if that's the primary identifier for selection
  onSubmit: (
    data: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onCancel: () => void;
  allDataPoints: DataPoint[];
  isSubmitting?: boolean; // Prop from parent to control submit button state
}

const formItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: 'easeOut' },
  }),
};

export const NotificationRuleForm: React.FC<NotificationRuleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  allDataPoints,
  isSubmitting: parentIsSubmitting, // Renamed for clarity
}) => {
  const form = useForm<RuleFormValues>({
    // resolver: zodResolver(ruleFormSchema), // Zod resolver might need dynamic schema based on data type, or manual validation for threshold
    defaultValues: {
      name: initialData?.name || '',
      dataPointKey: initialData?.dataPointKey || initialData?.nodeId || '', // Prioritize dataPointKey
      condition: initialData?.condition || '==',
      thresholdInputString: String(initialData?.thresholdValue ?? ''), // Keep this as string for text input
      severity: initialData?.severity || 'warning',
      message: initialData?.message || '',
      enabled: initialData?.enabled === undefined ? true : initialData.enabled,
    },
  });

  const [selectedDataPointType, setSelectedDataPointType] = useState<OPC_DATA_TYPE_FriendlyNames | string | null>(null);
  const [currentDataPointValueDisplay, setCurrentDataPointValueDisplay] = useState<string>('N/A');

  const { opcUaNodeValues } = useAppStore((state) => ({
    opcUaNodeValues: state.opcUaNodeValues,
  }));

  const watchedDataPointKey = useWatch({ control: form.control, name: 'dataPointKey' });
  const watchedCondition = useWatch({ control: form.control, name: 'condition'});

  useEffect(() => {
    if (watchedDataPointKey) {
      const dataPoint = allDataPoints.find(dp => dp.id === watchedDataPointKey || dp.nodeId === watchedDataPointKey);
      setSelectedDataPointType(dataPoint ? dataPoint.dataType : null);

      if (dataPoint) {
        const rawValue = opcUaNodeValues[dataPoint.nodeId]; // dataPointKey is nodeId
        if (rawValue !== undefined && rawValue !== null) {
          const factor = dataPoint.factor ?? 1;
          const adjustedValue = typeof rawValue === 'number' ? rawValue * factor : rawValue; // Apply factor only if number

          // Ensure 'formatValue' expects the adjusted value if factor is applied before,
          // or pass rawValue and let formatValue handle factors if that's its design.
          // Based on formatValue signature, it takes raw value and config, and applies factor internally if needed.
          // However, the provided formatValue doesn't seem to use config.factor.
          // For now, let's assume formatValue expects a pre-adjusted value or a simple number.
          // Re-evaluating formatValue, it does not use factor. So we should adjust before calling.

          let displayVal: string;
          if (typeof adjustedValue === 'number') {
            displayVal = formatValue(adjustedValue, dataPoint);
          } else if (typeof adjustedValue === 'boolean') { // formatValue might handle booleans via dataType
             displayVal = formatValue(adjustedValue ? 1 : 0, dataPoint); // Convert boolean to number for formatValue
          } else {
            // For strings or other types, display directly or with minimal formatting if needed
            displayVal = String(adjustedValue);
          }
          setCurrentDataPointValueDisplay(displayVal ? `${displayVal} ${dataPoint.unit || ''}`.trim() : 'N/A');
        } else {
          setCurrentDataPointValueDisplay('N/A (no live value)');
        }

        // Reset threshold if data type changes fundamentally for some conditions
        if (dataPoint.dataType === 'Boolean' && (watchedCondition !== 'is_true' && watchedCondition !== 'is_false')) {
           form.setValue('condition', 'is_true'); // Default for boolean
           form.setValue('thresholdInputString', 'true'); // Reset threshold field
        } else if (dataPoint.dataType !== 'Boolean' && (watchedCondition === 'is_true' || watchedCondition === 'is_false')) {
           form.setValue('condition', '=='); // Reset condition
        }
      } else {
        setCurrentDataPointValueDisplay('N/A');
      }
    } else {
      setSelectedDataPointType(null);
      setCurrentDataPointValueDisplay('N/A');
    }
  }, [watchedDataPointKey, allDataPoints, form, watchedCondition, opcUaNodeValues]);


  const getProcessedThresholdValue = (inputValue: string | undefined, dataType: OPC_DATA_TYPE_FriendlyNames | string | null): number | string | boolean => {
    if (inputValue === undefined || inputValue === null) return ''; // Default or handle as error
    const val = String(inputValue).trim();

    if (dataType) {
      switch (dataType) {
        case 'Boolean':
          return val.toLowerCase() === 'true' || val === '1';
        case 'Float': case 'Double':
        case 'Int16': case 'Int32': case 'UInt16': case 'UInt32':
        case 'Byte': case 'SByte': case 'Int64': case 'UInt64':
          const num = Number(val);
          return isNaN(num) ? val : num; // Return string if parsing fails, Zod should catch later if it's strict on number type
        default: // String, Guid, DateTime etc.
          return val;
      }
    }
    // Fallback if no specific data type, attempt common conversions
    const num = Number(val);
    if (!isNaN(num)) return num;
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
    return val;
  };

  const validateAndSubmit = async (values: RuleFormValues) => {
    // Basic threshold validation - enhance with Zod superRefine or specific checks if needed
    let thresholdValue: string | number | boolean = values.thresholdInputString === undefined ? '' : values.thresholdInputString;

    if (selectedDataPointType === 'Boolean') {
        if (values.condition === 'is_true' || values.condition === 'is_false') {
             thresholdValue = values.condition === 'is_true'; // For is_true/is_false, threshold is implicit
        } else {
            const boolVal = String(values.thresholdInputString).toLowerCase();
            if (boolVal !== 'true' && boolVal !== 'false') {
                form.setError('thresholdInputString', { type: 'manual', message: 'Must be "true" or "false" for Boolean type.' });
                return;
            }
            thresholdValue = boolVal === 'true';
        }
    } else if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDataPointType || '')) {
      if (isNaN(Number(values.thresholdInputString))) {
        form.setError('thresholdInputString', { type: 'manual', message: 'Must be a valid number.' });
        return;
      }
      thresholdValue = Number(values.thresholdInputString);
    } else {
        // For string types, if threshold is empty for conditions other than "is_empty"/"is_not_empty" (if you add them)
        if (!values.thresholdInputString && !['contains', 'not_contains', '==', '!='].includes(values.condition)) { // Simplified: assume value is needed for most string ops
            // Actually, for == and != with string, empty string could be valid. This needs care.
            // Let's assume non-empty for now or rely on min(1) if always needed
        }
        thresholdValue = String(values.thresholdInputString);
    }
    
    // Construct final data for submission
    const dataToSubmit: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        dataPointKey: values.dataPointKey, // Ensure this matches NotificationRule type
        condition: values.condition,
        thresholdValue: thresholdValue as any, // Cast because processedValue can be multiple types
        severity: values.severity,
        message: values.message || `${values.name} triggered for ${values.dataPointKey}`, // Default message
        enabled: values.enabled,
    };
    if (initialData?.id) { // Include 'id' only if it's an update
        (dataToSubmit as NotificationRule).id = initialData.id;
    }


    await onSubmit(dataToSubmit);
    // Parent handles toast, form reset might be desired here or handled by parent unmounting/key change
    // form.reset(); // Consider if this is the right place or if parent unmounts/remounts the form
  };
  
  const availableConditions = React.useMemo(() => {
    if (selectedDataPointType === 'Boolean') {
      return ['is_true', 'is_false', '==', '!='] as const;
    } else if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDataPointType || '')) {
      return ['==', '!=', '<', '<=', '>', '>='] as const;
    } else if (selectedDataPointType === 'String') { // Add more specific types if needed
      return ['==', '!=', 'contains', 'not_contains'] as const;
    }
    // Default conditions if data type is unknown or not specifically handled
    return ['==', '!=', '<', '<=', '>', '>=', 'contains', 'not_contains', 'is_true', 'is_false'] as const;
  }, [selectedDataPointType]);

  const showThresholdInput = !(selectedDataPointType === 'Boolean' && (watchedCondition === 'is_true' || watchedCondition === 'is_false'));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(validateAndSubmit)} className="space-y-6 px-1 pb-2">
        {/* Section 1: Basic Info */}
        <motion.div custom={0} variants={formItemVariants} className="p-4 border rounded-lg bg-background shadow-sm dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center text-slate-700 dark:text-slate-200"><Tags className="mr-2 h-5 w-5 text-primary"/> Rule Identification</h3>
             <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem className="mb-4">
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., High Temperature Alert" {...field} className="h-10" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Custom Notification Message (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Reactor core temperature critical!" {...field} className="h-10" />
                    </FormControl>
                    <FormDescription>Leave blank for a default message based on rule name and data point.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </motion.div>

        {/* Section 2: Condition & Data Point */}
        <motion.div custom={1} variants={formItemVariants} className="p-4 border rounded-lg bg-background shadow-sm dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center text-slate-700 dark:text-slate-200"><Target className="mr-2 h-5 w-5 text-primary"/> Trigger Condition</h3>
            <FormField
              control={form.control}
              name="dataPointKey"
              render={({ field }) => (
                <FormItem className="mb-4 flex flex-col">
                  <FormLabel>Data Point to Monitor</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between h-10',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value
                            ? (allDataPoints.find(
                                (dp) => (dp.id || dp.nodeId) === field.value
                              )?.name || field.value)
                            : 'Select a data point source'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search data points..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No data point found.</CommandEmpty>
                          <CommandGroup>
                            {allDataPoints.map((dp) => {
                              const dpValue = dp.id || dp.nodeId;
                              return (
                                <CommandItem
                                  value={`${dp.name} ${dpValue} ${dp.dataType}`} // Value for search
                                  key={dpValue}
                                  onSelect={() => {
                                    form.setValue('dataPointKey', dpValue);
                                    // Popover should close automatically on select if it's typical cmdk behavior,
                                    // otherwise, add open/setOpen state for Popover and setOpen(false) here.
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span>{dp.name || dp.id}</span>
                                    <span className="text-xs opacity-70">
                                      ID: {dpValue} ({dp.dataType})
                                    </span>
                                  </div>
                                  <Check
                                    className={cn(
                                      'ml-auto h-4 w-4',
                                      dpValue === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedDataPointType && (
                    <FormDescription className="mt-1 text-xs">
                      Selected type: <span className="font-semibold text-primary">{selectedDataPointType}</span>
                    </FormDescription>
                  )}
                   <FormDescription className="mt-1 text-xs">
                      Current Value: <span className="font-semibold text-blue-600 dark:text-blue-400">{currentDataPointValueDisplay}</span>
                    </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Condition Operator</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select an operator" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {availableConditions.map((op) => (
                        <SelectItem key={op} value={op}>
                            {op}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            {showThresholdInput && (
                 <FormField
                    control={form.control}
                    name="thresholdInputString"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Threshold Value</FormLabel>
                        <FormControl>
                            {selectedDataPointType === 'Boolean' ? (
                               <Select onValueChange={(val) => { field.onChange(val); }} defaultValue={String(field.value).toLowerCase()}>
                                  <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select true or false" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="true">True</SelectItem>
                                      <SelectItem value="false">False</SelectItem>
                                  </SelectContent>
                              </Select>
                            ) : (
                                <Input
                                    placeholder={
                                        selectedDataPointType === 'Boolean' ? 'true / false' :
                                        selectedDataPointType?.includes('Int') || selectedDataPointType?.includes('Float') || selectedDataPointType?.includes('Double') ? 'e.g., 70.5' :
                                        'e.g., Critical Status'
                                    }
                                    {...field}
                                    type={selectedDataPointType?.includes('Int') || selectedDataPointType?.includes('Float') || selectedDataPointType?.includes('Double') ? 'number' : 'text'}
                                    step={selectedDataPointType?.includes('Float') || selectedDataPointType?.includes('Double') ? 'any' : undefined}
                                    className="h-10"
                                />
                            )}
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
            </div>
             {!showThresholdInput && (
                <FormDescription className="text-sm mt-2 text-primary">
                    Threshold value is implicitly defined by the chosen condition (e.g., "is true").
                </FormDescription>
            )}
        </motion.div>

        {/* Section 3: Action & Status */}
        <motion.div custom={2} variants={formItemVariants} className="p-4 border rounded-lg bg-background shadow-sm dark:border-slate-700">
             <h3 className="text-lg font-semibold mb-3 flex items-center text-slate-700 dark:text-slate-200"><Zap className="mr-2 h-5 w-5 text-primary"/> Alert Behavior</h3>
            <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                <FormItem className="mb-4">
                    <FormLabel>Alert Severity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger className="h-10">
                        <SelectValue placeholder="Set alert severity" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="info"><div className="flex items-center"><InfoIcon className="mr-2 h-4 w-4 text-sky-500"/>Info</div></SelectItem>
                        <SelectItem value="warning"><div className="flex items-center"><AlertTriangle className="mr-2 h-4 w-4 text-amber-500"/>Warning</div></SelectItem>
                        <SelectItem value="critical"><div className="flex items-center"><Zap className="mr-2 h-4 w-4 text-red-500"/>Critical</div></SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50/50 dark:bg-slate-700/30 dark:border-slate-600">
                    <div className="space-y-0.5">
                    <FormLabel className="font-semibold text-slate-800 dark:text-slate-100">Enable This Rule</FormLabel>
                    <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                        If disabled, this rule will not be evaluated or trigger notifications.
                    </FormDescription>
                    </div>
                    <FormControl>
                    <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                    />
                    </FormControl>
                </FormItem>
                )}
            />
        </motion.div>


        <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-700 mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={parentIsSubmitting} className="h-10">
            <X className="mr-2 h-4 w-4"/> Cancel
          </Button>
          <Button type="submit" disabled={parentIsSubmitting || form.formState.isSubmitting} className="h-10 min-w-[120px]">
            {parentIsSubmitting || form.formState.isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {parentIsSubmitting || form.formState.isSubmitting ? 'Saving...' : (initialData?.id ? 'Save Changes' : 'Create Rule')}
          </Button>
        </div>
      </form>
    </Form>
  );
};