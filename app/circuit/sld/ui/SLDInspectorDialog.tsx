// components/sld/ui/SLDInspectorDialog.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge, isEdge as isReactFlowEdge } from 'reactflow';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataLinkLiveValuePreview from './DataLinkLiveValuePreview';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, PlusCircle, MinusCircle, X, Info as InfoIcon, Sparkles, PencilLine, Link2, Settings2, Palmtree, Palette as PaletteIcon, CaseSensitive, AlignLeftIcon, BaselineIcon, Zap as ZapIcon, ChevronDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    CustomNodeData, CustomFlowEdgeData, DataPoint,
    DataPointLink, SLDElementType, CustomNodeType, CustomFlowEdge,
    TextLabelNodeData, TextNodeStyleConfig,
    ContactorNodeData, InverterNodeData, PanelNodeData, BreakerNodeData, MeterNodeData,
    BatteryNodeData, GridNodeData, LoadNodeData, BusbarNodeData, TransformerNodeData,
    GeneratorNodeData, PLCNodeData, SensorNodeData, GenericDeviceNodeData, IsolatorNodeData,
    ATSNodeData, JunctionBoxNodeData, FuseNodeData, GaugeNodeData,
    BaseNodeData,
} from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ComboboxOption, SearchableSelect } from './SearchableSelect';
import { MultiSelectCombobox, MultiSelectOption } from './MultiSelectCombobox'; // Import MultiSelectCombobox
import { AVAILABLE_SLD_LAYOUT_IDS } from '@/config/constants';
import { ValueMappingCard } from './ValueMappingCard';
import DisplayFormatCard from './DisplayFormatCard';
import { Textarea } from '@/components/ui/textarea';


// --- Helper Data and Functions ---
const getTargetPropertiesOptions = (elementType?: SLDElementType): ComboboxOption[] => {
    const commonProps: ComboboxOption[] = [
        { value: 'label', label: 'Display Label', description: "Sets the main text label visible on/near the element." },
        { value: 'statusText', label: 'Status Text', description: 'Sets a descriptive text based on data (e.g., "Running", "Tripped").' },
        { value: 'fillColor', label: 'Fill Color', description: 'Changes background/fill color (e.g., node body, shape interior).' },
        { value: 'strokeColor', label: 'Stroke/Border Color', description: 'Changes border or edge line color.' },
        { value: 'textColor', label: 'Text Color (General)', description: 'Changes the color of dynamic text (like data values) if supported.' },
        { value: 'visible', label: 'Visibility', description: 'Shows or hides the element based on boolean data (true=visible, false=hidden).' },
        { value: 'opacity', label: 'Opacity', description: 'Sets element opacity (0.0 to 1.0). Map numeric data directly.'},
        { value: 'status', label: 'Device Status (Generic)', description: 'General status string e.g., "FAULT", "WARNING", "NOMINAL", "OFFLINE". Can drive color changes.' },
    ];
    const edgeProps: ComboboxOption[] = [
        { value: 'flowDirection', label: 'Flow Direction (Edge)', description: 'Animates edge: "forward", "reverse", or "none". Typically for power flow.' },
        { value: 'animationSpeedFactor', label: 'Animation Speed Factor (Edge)', description: 'Multiplies base edge animation speed (e.g., 0.5, 1, 2). Higher = faster.' },
        { value: 'currentLoadPercent', label: 'Load Percentage (Edge/Device)', description: 'Represents load from 0-100%. Can affect visuals like animation speed or color intensity.' },
        { value: 'isEnergized', label: 'Energized State (Edge/Device)', description: 'Boolean: true if energized, false if de-energized. Affects color/animation.'},
    ];
    const nodeSpecificProps: Record<string, ComboboxOption[]> = {
        [SLDElementType.TextLabel]: [{ value: 'text', label: 'Static Text (TextLabel)', description: "Sets the primary static text content for a TextLabel node." }],
        [SLDElementType.DataLabel]: [{ value: 'value', label: 'Data Value (DataLabel)', description: 'Displays the raw or formatted data point value for DataLabel.' }],
        [SLDElementType.Breaker]: [{ value: 'breaker.isOpen', label: 'Breaker Open State', description: 'Boolean: true if breaker is open, false if closed.'}],
        [SLDElementType.Contactor]: [{ value: 'contactor.isClosed', label: 'Contactor Closed State', description: 'Boolean: true if contactor is closed, false if open.'}],
        // Add more specific properties here as needed
    };
    
    let allProps = [...commonProps];
    if (elementType && nodeSpecificProps[elementType]) {
        allProps = [...allProps, ...nodeSpecificProps[elementType]];
    } else if (!elementType) { // If it's an edge or unknown, include edge props
        allProps = [...allProps, ...edgeProps];
    }
    
    // Remove duplicates that might arise if a specific prop is also in common
    const uniqueProps = Array.from(new Set(allProps.map(p => p.value)))
                           .map(value => allProps.find(p => p.value === value)!);
    return uniqueProps.sort((a,b) => a.label.localeCompare(b.label));
};


const fontSizes = [
    { label: "XXS (8px)", value: "8px" }, { label: "XS (10px)", value: "10px" }, 
    { label: "S (12px)", value: "12px" }, { label: "M (14px)", value: "14px" }, 
    { label: "L (16px)", value: "16px" }, { label: "XL (18px)", value: "18px" }, 
    { label: "2XL (22px)", value: "22px" }, { label: "3XL (26px)", value: "26px" },
];
const fontWeights = [
    { label: "Light (300)", value: "300" }, { label: "Normal (400)", value: "normal" }, 
    { label: "Medium (500)", value: "500" },{ label: "Semi-Bold (600)", value: "600" },
    { label: "Bold (700)", value: "bold" },
];


function isNode(element: any): element is CustomNodeType {
    return element && 'position' in element && 'data' in element && 'id' in element;
}

function isEdge(element: any): element is CustomFlowEdge {
    return element && 'source' in element && 'target' in element && 'id' in element;
}

const getElementTypeName = (element: CustomNodeType | CustomFlowEdge | null): string => {
    if (!element) return 'Element';
    if (isNode(element)) {
        switch (element.data?.elementType) {
            case SLDElementType.TextLabel: return 'Text Label';
            case SLDElementType.DataLabel: return 'Data Label';
            case SLDElementType.Contactor: return 'Contactor';
            case SLDElementType.Inverter: return 'Inverter';
            case SLDElementType.Panel: return 'PV Panel';
            case SLDElementType.Breaker: return 'Breaker/Switch';
            case SLDElementType.Meter: return 'Meter';
            case SLDElementType.Battery: return 'Battery System';
            case SLDElementType.Grid: return 'Grid Connection';
            case SLDElementType.Load: return 'Electrical Load';
            case SLDElementType.Busbar: return 'Busbar';
            case SLDElementType.Transformer: return 'Transformer';
            case SLDElementType.Generator: return 'Generator';
            case SLDElementType.PLC: return 'PLC';
            case SLDElementType.Sensor: return 'Sensor';
            case SLDElementType.GenericDevice: return 'Generic Device';
            case SLDElementType.Isolator: return 'Isolator';
            case SLDElementType.ATS: return 'ATS';
            case SLDElementType.JunctionBox: return 'Junction Box';
            case SLDElementType.Fuse: return 'Fuse';
            case SLDElementType.Gauge: return 'Gauge Display';
            default: 
                const typeName = (element.data as BaseNodeData)?.elementType || 'Unknown Node';
                return typeName.charAt(0).toUpperCase() + typeName.slice(1) + ' Component';
        }
    }
    if (isEdge(element)) return 'Connection Line';
    return 'Diagram Element';
};

// --- Main Component ---
interface SLDInspectorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedElement: CustomNodeType | CustomFlowEdge | null;
    onUpdateElement: (element: CustomNodeType | CustomFlowEdge) => void;
    onDeleteElement: (elementId: string) => void;
}

const SLDInspectorDialog: React.FC<SLDInspectorDialogProps> = ({
    isOpen, onOpenChange, selectedElement, onUpdateElement, onDeleteElement
}) => {
    const { dataPoints } = useAppStore((state) => ({ dataPoints: state.dataPoints }));
    
    const [formData, setFormData] = useState<Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig }>>({});
    const [dataLinks, setDataLinks] = useState<DataPointLink[]>([]);
    const [activeTab, setActiveTab] = useState<string>("properties");

    // State for the new "Quick Link Adder"
    const [quickLinkDataPointId, setQuickLinkDataPointId] = useState<string | undefined>(undefined);
    const [quickLinkTargetProperties, setQuickLinkTargetProperties] = useState<string[]>([]);

    const initialDataLinks = useMemo(() => selectedElement?.data?.dataPointLinks || [], [selectedElement]);


    useEffect(() => {
        if (isOpen && selectedElement) {
            const elementDataCopy = JSON.parse(JSON.stringify(selectedElement.data ?? {}));
            
            const initialFormData: Partial<CustomNodeData & CustomFlowEdgeData & { styleConfig?: TextNodeStyleConfig }> = {
                ...elementDataCopy,
                label: elementDataCopy.label || '',
            };

            if (isNode(selectedElement)) {
                initialFormData.elementType = selectedElement.data.elementType;
                if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                    (initialFormData as Partial<TextLabelNodeData>).text = (elementDataCopy as TextLabelNodeData).text || '';
                    initialFormData.styleConfig = (elementDataCopy as TextLabelNodeData).styleConfig || {};
                }
                initialFormData.config = elementDataCopy.config && typeof elementDataCopy.config === 'object' 
                                         ? elementDataCopy.config 
                                         : {};
            } else if (isEdge(selectedElement)) {
                initialFormData.flowType = elementDataCopy.flowType || '';
                initialFormData.voltageLevel = elementDataCopy.voltageLevel || '';
                initialFormData.currentRatingAmps = elementDataCopy.currentRatingAmps ?? '';
                initialFormData.cableType = elementDataCopy.cableType || '';
            }

            setFormData(initialFormData);
            setDataLinks(elementDataCopy.dataPointLinks ?? []);
            setQuickLinkDataPointId(undefined); // Reset quick link fields
            setQuickLinkTargetProperties([]);
            setActiveTab("properties"); 
        } else if (!isOpen) {
            setFormData({});
            setDataLinks([]);
            setQuickLinkDataPointId(undefined);
            setQuickLinkTargetProperties([]);
        }
    }, [selectedElement, isOpen]);

    const dataPointOptions = useMemo((): ComboboxOption[] =>
        Object.values(dataPoints).map(dp => ({
            value: dp.id,
            label: `${dp.name || dp.id}${dp.description ? ` - ${dp.description}` : ''}`,
            description: `ID: ${dp.id} | Type: ${dp.dataType} | Unit: ${dp.unit || 'N/A'}`
        })).sort((a, b) => a.label.localeCompare(b.label)),
        [dataPoints]);
    
    const availableTargetProperties = useMemo(() => 
        getTargetPropertiesOptions(isNode(selectedElement) ? selectedElement.data.elementType : undefined),
    [selectedElement]);

    const targetPropertiesOptionsForSearchableSelect: ComboboxOption[] = useMemo(() => {
        return availableTargetProperties.map(prop => ({
          value: prop.value,
          label: prop.label,
          keywords: [prop.value, prop.description || '']
        }));
      }, [availableTargetProperties]);

    const multiSelectTargetPropertiesOptions: MultiSelectOption[] = useMemo(() => {
        return availableTargetProperties.map(prop => ({
          value: prop.value,
          label: prop.label,
        }));
    }, [availableTargetProperties]);


    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = event.target;
        const checked = (event.target as HTMLInputElement).checked;

        setFormData(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); 
            const keys = name.split('.'); 
            let currentLevel: any = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]] || typeof currentLevel[keys[i]] !== 'object') {
                    currentLevel[keys[i]] = {}; 
                }
                currentLevel = currentLevel[keys[i]];
            }
            
            let parsedValue: string | number | boolean = value;
            if (type === 'checkbox') parsedValue = checked;
            else if (type === 'number') {
                if (value === '') parsedValue = ''; 
                else parsedValue = parseFloat(value); 
                if (isNaN(parsedValue as number) && value !== '') parsedValue = value; 
            }
            
            currentLevel[keys[keys.length - 1]] = parsedValue;
            return newState;
        });
    }, []);

    const handleSelectChange = useCallback((name: string, value: string | boolean | number | null | undefined) => {
        setFormData(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); 
            const keys = name.split('.');
            let currentLevel: any = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]] || typeof currentLevel[keys[i]] !== 'object') {
                    currentLevel[keys[i]] = {};
                }
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return newState;
        });
    }, []);
    
    const handleDataLinkChange = useCallback((index: number, field: keyof DataPointLink, value: any) => {
        setDataLinks(prevLinks => {
            const newLinks = prevLinks.map((link, i) => {
                if (i === index) {
                    const updatedLink = { ...link, [field]: value };
                    if (field === 'dataPointId') {
                        const selectedDp = dataPoints[value as string];
                        if (selectedDp) {
                            let inferredType: NonNullable<DataPointLink['format']>['type'] = 'string';
                            if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(selectedDp.dataType)) inferredType = 'number';
                            else if (selectedDp.dataType === 'Boolean') inferredType = 'boolean';
                            else if (selectedDp.dataType === 'DateTime') inferredType = 'dateTime';
                            
                            updatedLink.format = { 
                                ...(updatedLink.format || {}), 
                                type: inferredType,
                                suffix: selectedDp.unit || updatedLink.format?.suffix 
                            };
                            if (inferredType === 'boolean' && updatedLink.format) {
                               delete updatedLink.format.suffix; 
                               delete updatedLink.format.precision;
                            }
                        } else { 
                            if (updatedLink.format) { 
                                delete updatedLink.format.suffix;
                                delete updatedLink.format.precision;
                            }
                        }
                    }
                    return updatedLink;
                }
                return link;
            });
            return newLinks;
        });
    }, [dataPoints]);

    const addDataLink = useCallback(() => setDataLinks(prev => [...prev, { dataPointId: '', targetProperty: '', valueMapping: { type: 'exact', mapping: [], defaultValue: '{passthrough_value}' }, format: { type: 'string' } }]), []);
    const removeDataLink = useCallback((index: number) => setDataLinks(prev => prev.filter((_, i) => i !== index)), []);

    const handleAddMultipleLinks = () => {
        if (!quickLinkDataPointId || quickLinkTargetProperties.length === 0) return;
    
        const newLinks: DataPointLink[] = quickLinkTargetProperties.map(targetProp => ({
          dataPointId: quickLinkDataPointId,
          targetProperty: targetProp,
          valueMapping: { type: 'exact', mapping: [], defaultValue: '{passthrough_value}' }, // Default value mapping
          format: { type: 'string' } // Default format, can be refined based on dataPointId type if needed
        }));
    
        setDataLinks(prev => [...prev, ...newLinks]);
        // Optionally reset selectors
        // setQuickLinkDataPointId(undefined); 
        // setQuickLinkTargetProperties([]);
      };
    
    const handleMappingTypeChange = useCallback((linkIndex: number, selectedValue: string) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex) {
                if (selectedValue === '_none_') {
                    return { ...link, valueMapping: undefined };
                }
                const newMappingType = selectedValue as NonNullable<DataPointLink['valueMapping']>['type'];
                return { 
                    ...link, 
                    valueMapping: { 
                        ...(link.valueMapping || {}), 
                        type: newMappingType, 
                        mapping: newMappingType === 'boolean' ? [{value: ''},{value: ''}] : [] 
                    } 
                };
            }
            return link;
        }));
    }, []);

    const handleMappingEntryChange = useCallback((linkIndex: number, mapIndex: number, field: string, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping) {
                const newMappingEntries = [...link.valueMapping.mapping];
                newMappingEntries[mapIndex] = { ...newMappingEntries[mapIndex], [field]: value };
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMappingEntries }};
            }
            return link;
        }));
    }, []);

    const addMappingEntry = useCallback((linkIndex: number) => {
            setDataLinks(prevLinks => prevLinks.map((link, i) => {
                if (i === linkIndex && link.valueMapping) {
                    return { ...link, valueMapping: { ...link.valueMapping, mapping: [...link.valueMapping.mapping, { value: '' }] }};
                }
                return link;
            }));
        }, []);
    
    const removeMappingEntry = useCallback((linkIndex: number, mapIndex: number) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex && link.valueMapping) {
                const newMappingEntries = link.valueMapping.mapping.filter((_, idx) => idx !== mapIndex);
                return { ...link, valueMapping: { ...link.valueMapping, mapping: newMappingEntries }};
            }
            return link;
        }));
    }, []);
    
    const handleFormatChange = useCallback((linkIndex: number, field: keyof NonNullable<DataPointLink['format']>, value: any) => {
        setDataLinks(prevLinks => prevLinks.map((link, i) => {
            if (i === linkIndex) {
                return { ...link, format: { ...(link.format || { type: 'string'}), [field]: value } };
            }
            return link;
        }));
    }, []);

    const handleSaveChangesAndClose = useCallback(() => {
        if (!selectedElement) return;
        const validDataLinks = dataLinks.filter(link => link.dataPointId && link.targetProperty);
        
        let updatedElementData: CustomNodeData | CustomFlowEdgeData;

        if (isNode(selectedElement)) {
            const commonNodeData: Partial<BaseNodeData> = {
                label: formData.label || selectedElement.data?.label || 'Unnamed Element',
                elementType: selectedElement.data.elementType,
                dataPointLinks: validDataLinks.length > 0 ? validDataLinks : undefined,
                config: formData.config && Object.keys(formData.config).length > 0 ? formData.config : undefined,
                isDrillable: !!formData.isDrillable,
                subLayoutId: formData.isDrillable ? formData.subLayoutId : undefined,
                notes: formData.notes,
                assetId: formData.assetId,
            };

            if (selectedElement.data.elementType === SLDElementType.TextLabel) {
                updatedElementData = {
                    ...commonNodeData,
                    elementType: SLDElementType.TextLabel,
                    text: (formData as Partial<TextLabelNodeData>).text || '',
                    styleConfig: (formData as Partial<TextLabelNodeData>).styleConfig && Object.keys((formData as Partial<TextLabelNodeData>).styleConfig!).length > 0 
                                 ? (formData as Partial<TextLabelNodeData>).styleConfig 
                                 : undefined,
                } as TextLabelNodeData;
            } else {
                updatedElementData = { ...commonNodeData, elementType: selectedElement.data.elementType } as CustomNodeData;
            }
        } else { 
            updatedElementData = {
                label: formData.label || selectedElement.data?.label || undefined,
                dataPointLinks: validDataLinks.length > 0 ? validDataLinks : undefined,
                flowType: (formData as Partial<CustomFlowEdgeData>).flowType,
                voltageLevel: (formData as Partial<CustomFlowEdgeData>).voltageLevel,
                currentRatingAmps: (formData as Partial<CustomFlowEdgeData>).currentRatingAmps,
                cableType: (formData as Partial<CustomFlowEdgeData>).cableType,
                isEnergized: !!(formData as Partial<CustomFlowEdgeData>).isEnergized,
                notes: formData.notes, // Edges can also have notes/assetId
                assetId: formData.assetId,
            } as CustomFlowEdgeData;
        }
        
        onUpdateElement({ ...selectedElement, data: updatedElementData as any }); 
        onOpenChange(false);
    }, [selectedElement, formData, dataLinks, onUpdateElement, onOpenChange]);

    const handleDeleteAndClose = useCallback(() => {
        if (selectedElement) {
            onDeleteElement(selectedElement.id);
            onOpenChange(false);
        }
    }, [selectedElement, onDeleteElement, onOpenChange]);

    if (!isOpen || !selectedElement) return null;

    const elementTypeUserFriendly = getElementTypeName(selectedElement);
    const currentElementType = isNode(selectedElement) ? selectedElement.data.elementType : undefined;

    const actionableElementTypes: SLDElementType[] = [
        SLDElementType.Breaker, SLDElementType.Contactor, SLDElementType.Fuse,
        SLDElementType.Isolator, SLDElementType.ATS, SLDElementType.Switch, // Added Switch
    ];
    
    const FieldInput = ({ id, label, value, onChange, type = "text", placeholder, name: fieldName, ...props }: any) => (
        <div className="space-y-0.5">
            <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
            <Input type={type} id={id} name={fieldName || id} value={value ?? ''} onChange={onChange} placeholder={placeholder} className="h-8 text-xs" {...props} />
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl lg:max-w-3xl max-h-[90vh] xl:max-h-[80vh] flex flex-col p-0 shadow-2xl rounded-lg border-border/70 bg-background">
                <DialogHeader className="p-4 border-b border-border/60 flex flex-row justify-between items-center top-0 bg-background/95 backdrop-blur-sm z-10">
                    <div className='space-y-0.5'>
                        <DialogTitle className="text-xl font-bold flex items-center">
                            <PencilLine className="w-5 h-5 mr-2.5 text-primary" /> Configure {elementTypeUserFriendly}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground pl-[34px]">Element ID: {selectedElement.id}</DialogDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <TooltipProvider delayDuration={100}> <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="destructive" size="icon" onClick={handleDeleteAndClose} className="h-9 w-9">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete this element from the diagram</p></TooltipContent>
                        </Tooltip> </TooltipProvider>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Close dialog"> <X className="h-5 w-5" /> </Button>
                        </DialogClose>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-grow overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0" id="inspector-scroll-area">
                    <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-11 sticky top-0 bg-background/90 backdrop-blur-sm z-[9] border-b border-border/60 rounded-none">
                            <TabsTrigger value="properties" className="text-sm data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full">
                                <Settings2 className="w-4 h-4 mr-2" />Properties
                            </TabsTrigger>
                            <TabsTrigger value="data_linking" className="text-sm data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full">
                                <Link2 className="w-4 h-4 mr-2" />Data Linking
                            </TabsTrigger>
                             <TabsTrigger value="notes" className="text-sm data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-primary rounded-none h-full">
                                <InfoIcon className="w-4 h-4 mr-2" />Notes & ID
                            </TabsTrigger>
                        </TabsList>

                        <div className="p-4 md:p-6">
                            <TabsContent value="properties" className="mt-0 space-y-6 outline-none">
                                {/* ... (Property fields - unchanged by this task, but included for completeness) ... */}
                                <Card className='shadow-sm border-border/60'>
                                    <CardHeader className='p-4'><CardTitle className='text-base font-semibold'>Basic Information</CardTitle></CardHeader>
                                    <CardContent className='p-4 pt-0 space-y-4'>
                                        <FieldInput id="label" label="Display Label / Name" value={formData.label || ''} onChange={handleInputChange} name="label" placeholder="e.g., Main Inverter, Feeder Line" />
                                    </CardContent>
                                </Card>

                                {isNode(selectedElement) && actionableElementTypes.includes(currentElementType as SLDElementType) && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'>
                                        <CardTitle className='text-base font-semibold flex items-center'>
                                            <ZapIcon className="w-4 h-4 mr-2 text-orange-500" />
                                            Control Configuration
                                        </CardTitle>
                                        </CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                        <div className="space-y-1">
                                            <Label htmlFor="config.controlNodeId" className="text-xs font-medium">
                                            Control OPC UA Node ID (Writable)
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <InfoIcon className="w-3 h-3 ml-1.5 text-muted-foreground cursor-help inline" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p>OPC UA node to write to for controlling this element (e.g., toggle open/close when clicked in view mode).</p>
                                                </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            </Label>
                                            <SearchableSelect
                                            options={dataPointOptions} 
                                            value={formData.config?.controlNodeId || ''}
                                            onChange={(value) => handleSelectChange('config.controlNodeId', value || undefined)}
                                            placeholder="Search & Select Writable Data Point..."
                                            searchPlaceholder="Type to search..."
                                            notFoundText="No data points found."
                                            />
                                            {formData.config?.controlNodeId && dataPoints[formData.config.controlNodeId] && (
                                            <p className="text-xs text-muted-foreground pt-1">
                                                Selected: {dataPoints[formData.config.controlNodeId].name} (ID: {formData.config.controlNodeId})
                                            </p>
                                            )}
                                        </div>
                                        </CardContent>
                                    </Card>
                                )}
                                {/* ... other property fields based on element type ... */}
                                 {isNode(selectedElement) && currentElementType === SLDElementType.TextLabel && (
                                    <Card className='shadow-sm border-border/60'>
                                        <CardHeader className='p-4'><CardTitle className='text-base font-semibold flex items-center'><Palmtree className="w-4 h-4 mr-2 text-green-500" />Text Content & Appearance</CardTitle></CardHeader>
                                        <CardContent className='p-4 pt-0 space-y-4'>
                                            <FieldInput as="textarea" rows={3} id="text" name="text" label="Static Text Content (can be multi-line)" value={(formData as TextLabelNodeData).text || ''} onChange={handleInputChange} placeholder="Enter text to display on the label" />
                                            <Separator />
                                            <h4 className="text-sm font-medium text-muted-foreground pt-2">Styling:</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontSize" className="text-xs flex items-center"><BaselineIcon className="w-3.5 h-3.5 mr-1" />Font Size</Label> <Select name="styleConfig.fontSize" value={(formData.styleConfig)?.fontSize || '14px'} onValueChange={(val) => handleSelectChange("styleConfig.fontSize", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontSizes.map(fs => <SelectItem key={fs.value} value={fs.value} className="text-xs">{fs.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontWeight" className="text-xs flex items-center"><CaseSensitive className="w-3.5 h-3.5 mr-1" />Font Weight</Label> <Select name="styleConfig.fontWeight" value={String((formData.styleConfig)?.fontWeight || 'normal')} onValueChange={(val) => handleSelectChange("styleConfig.fontWeight", val === '300' || val === '500' || val === '600' || val === '700' ? parseInt(val) : val )}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{fontWeights.map(fw => <SelectItem key={fw.value} value={String(fw.value)} className="text-xs">{fw.label}</SelectItem>)}</SelectContent> </Select> </div>
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.fontStyle" className="text-xs">Font Style</Label> <Select name="styleConfig.fontStyle" value={(formData.styleConfig)?.fontStyle || 'normal'} onValueChange={(val) => handleSelectChange("styleConfig.fontStyle", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="normal" className="text-xs">Normal</SelectItem><SelectItem value="italic" className="text-xs">Italic</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput name="styleConfig.color" id="styleConfig.color" label={<LabelLayout icon={PaletteIcon}>Text Color</LabelLayout>} type="color" value={(formData.styleConfig)?.color || '#000000'} onChange={handleInputChange} className="h-9 p-0.5 border-none rounded-md w-full" />
                                                <FieldInput name="styleConfig.backgroundColor" id="styleConfig.backgroundColor" label="Background Color" type="color" value={(formData.styleConfig)?.backgroundColor || '#00000000'} onChange={handleInputChange} className="h-9 p-0.5 border-none rounded-md w-full" title="Choose background color (transparent by default)" />
                                                <div className="space-y-1"> <Label htmlFor="styleConfig.textAlign" className="text-xs flex items-center"><AlignLeftIcon className="w-3.5 h-3.5 mr-1" />Text Align</Label> <Select name="styleConfig.textAlign" value={(formData.styleConfig)?.textAlign || 'left'} onValueChange={(val) => handleSelectChange("styleConfig.textAlign", val)}> <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger> <SelectContent><SelectItem value="left" className="text-xs">Left</SelectItem><SelectItem value="center" className="text-xs">Center</SelectItem><SelectItem value="right" className="text-xs">Right</SelectItem></SelectContent> </Select> </div>
                                                <FieldInput name="styleConfig.padding" id="styleConfig.padding" label="Padding (CSS)" placeholder="e.g., 2px 4px" value={(formData.styleConfig)?.padding || '2px'} onChange={handleInputChange} className="col-span-full md:col-span-1" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                                {/* ... other specific config sections ... */}
                            </TabsContent>

                            <TabsContent value="data_linking" className="mt-0 space-y-6 outline-none">
                                <Card className="p-4 bg-muted/20 shadow-sm border-border/60">
                                  <CardHeader className="p-0 pb-3">
                                    <CardTitle className="text-md font-semibold">Quick Link Adder</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                      Select a Data Point and multiple Target Properties to add several links at once.
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-0 space-y-3">
                                    <div className="space-y-1">
                                      <Label htmlFor="quick-link-dp-select" className="text-xs font-medium">Data Point (Source)</Label>
                                      <SearchableSelect
                                        id="quick-link-dp-select"
                                        options={dataPointOptions}
                                        value={quickLinkDataPointId || ''}
                                        onChange={(value) => setQuickLinkDataPointId(value)}
                                        placeholder="Search or select a data point..."
                                        searchPlaceholder="Type to search..."
                                        notFoundText="No data points found."
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label htmlFor="quick-link-target-props" className="text-xs font-medium">Target Properties</Label>
                                      <MultiSelectCombobox
                                        options={multiSelectTargetPropertiesOptions}
                                        selectedValues={quickLinkTargetProperties}
                                        onChange={setQuickLinkTargetProperties}
                                        placeholder="Select target properties..."
                                        className="w-full"
                                      />
                                    </div>
                                    <Button 
                                      onClick={handleAddMultipleLinks} 
                                      size="sm"
                                      className="h-9"
                                      disabled={!quickLinkDataPointId || quickLinkTargetProperties.length === 0}
                                    >
                                      <PlusCircle className="mr-2 h-4 w-4" /> Add Selected Links ({quickLinkTargetProperties.length})
                                    </Button>
                                  </CardContent>
                                </Card>

                                <div className="space-y-4">
                                  <div className="flex justify-between items-center pt-2">
                                    <h3 className="text-md font-semibold">Individual Data Links</h3>
                                    <Button onClick={addDataLink} variant="outline" size="sm" className="h-9">
                                      <PlusCircle className="mr-2 h-4 w-4" /> Add Single Data Link
                                    </Button>
                                  </div>
                                  {dataLinks.map((link, index) => (
                                    // Using renderDataLinkCard - unchanged
                                    <Card key={index} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border-border/60 bg-card">
                                        <CardHeader className="p-3 bg-muted/30 border-b border-border/60 flex flex-row justify-between items-center">
                                            <CardTitle className="text-sm font-semibold flex items-center">
                                                <Link2 className="w-4 h-4 mr-2 text-primary" />
                                                Data Link {index + 1}
                                            </CardTitle>
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDataLink(index)}>
                                                            <MinusCircle className="h-4 w-4 text-destructive hover:text-destructive/80" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Remove this Data Link</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </CardHeader>
                                        <CardContent className="p-3 space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label htmlFor={`dp-select-${index}`} className="text-xs font-medium">Data Point <span className="text-red-500">*</span></Label>
                                                    <SearchableSelect options={dataPointOptions} value={link.dataPointId || ''} onChange={(value) => handleDataLinkChange(index, 'dataPointId', value)} placeholder="Search & Select Data Point..." searchPlaceholder="Type to search..." notFoundText="No data points found." />
                                                    {link.dataPointId && dataPoints[link.dataPointId] && <p className="text-xs text-muted-foreground pt-1">Type: {dataPoints[link.dataPointId].dataType}, Unit: {dataPoints[link.dataPointId].unit || "N/A"}</p>}
                                                    <DataLinkLiveValuePreview 
                                                        dataPointId={link.dataPointId}
                                                        valueMapping={link.valueMapping}
                                                        format={link.format}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor={`target-prop-${index}`} className="text-xs font-medium">Target Property <span className="text-red-500">*</span></Label>
                                                    <SearchableSelect options={targetPropertiesOptionsForSearchableSelect} value={link.targetProperty || ''} onChange={(value) => handleDataLinkChange(index, 'targetProperty', value)} placeholder="Select Property to Affect..." searchPlaceholder="Type to search..." notFoundText="No properties found." />
                                                    {link.targetProperty && targetPropertiesOptionsForSearchableSelect.find(o => o.value === link.targetProperty)?.description && <p className="text-xs text-muted-foreground pt-1">{targetPropertiesOptionsForSearchableSelect.find(o => o.value === link.targetProperty)?.description}</p>}
                                                </div>
                                            </div>
                                            <Collapsible>
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="link" size="sm" className="text-xs px-0 py-1 h-auto flex items-center text-muted-foreground hover:text-primary">
                                                        <ChevronDown className="h-3.5 w-3.5 mr-1"/> Advanced Options (Mapping/Formatting)
                                                    </Button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="pt-3 space-y-4">
                                                    <ValueMappingCard 
                                                        valueMapping={link.valueMapping}
                                                        onUpdate={(updatedMapping: any) => handleDataLinkChange(index, 'valueMapping', updatedMapping)}
                                                        dataPointId={link.dataPointId}
                                                    />
                                                    <DisplayFormatCard 
                                                        format={link.format} 
                                                        onUpdate={(updatedFormat: any) => handleDataLinkChange(index, 'format', updatedFormat)}
                                                        dataPointId={link.dataPointId}
                                                    />
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </CardContent>
                                    </Card>
                                  ))}
                                  {dataLinks.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                      No data links configured. Click "Add Single Data Link" or use the Quick Link Adder.
                                    </p>
                                  )}
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="notes">
                              <Card className='shadow-sm border-border/60'>
                                <CardHeader className='p-4'>
                                  <CardTitle className='text-base font-semibold'>Notes & Identification</CardTitle>
                                  <CardDescription className='text-xs'>
                                    Additional information and asset tracking for this element.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className='p-4 pt-0 space-y-4'>
                                  <div>
                                    <Label htmlFor="notes-textarea" className="text-xs font-medium">Notes</Label>
                                    <Textarea 
                                      id="notes-textarea"
                                      name="notes" // Added name attribute
                                      value={formData.notes || ''} 
                                      onChange={handleInputChange} 
                                      placeholder="Enter any notes about this element..."
                                      rows={4}
                                      className="text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="assetId-input" className="text-xs font-medium">Asset ID</Label>
                                    <Input 
                                      id="assetId-input"
                                      name="assetId" // Added name attribute
                                      type="text" 
                                      value={formData.assetId || ''} 
                                      onChange={handleInputChange} 
                                      placeholder="Enter asset identifier (e.g., UUID, serial number)"
                                      className="text-sm h-9"
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            </TabsContent>

                        </div>
                    </Tabs>
                </ScrollArea>

                <DialogFooter className="p-4 border-t border-border/60 flex-shrink-0 bottom-0 bg-background/95 backdrop-blur-sm z-10">
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full sm:w-auto h-9">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveChangesAndClose} className="w-full sm:w-auto h-9">
                        <PencilLine className="h-4 w-4 mr-2" />Apply & Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const LabelLayout: React.FC<{ icon: React.ElementType, children: React.ReactNode }> = ({ icon: Icon, children }) => (
    <span className="flex items-center text-xs"><Icon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/80" />{children}</span>
);

export default React.memo(SLDInspectorDialog);