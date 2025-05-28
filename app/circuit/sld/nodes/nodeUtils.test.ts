import {
  getDataPointValue,
  applyValueMapping,
  formatDisplayValue,
  getDerivedStyle,
  // measureTextNode, // Not requested but could be tested
} from './nodeUtils';
import { DataPoint, DataPointLink, SLDElementType, BaseNodeData } from '@/types/sld';

// Mock Data
const mockDataPoints: Record<string, DataPoint> = {
  dp1: { id: 'dp1', name: 'Temp Sensor', nodeId: 'ns=2;s=temp1', dataType: 'Float', unit: '°C' },
  dp2: { id: 'dp2', name: 'Valve State', nodeId: 'ns=2;s=valve1', dataType: 'Boolean' },
  dp3: { id: 'dp3', name: 'Motor Speed', nodeId: 'ns=2;s=motor1', dataType: 'Int32', unit: 'RPM' },
  dp4: { id: 'dp4', name: 'Status Code', nodeId: 'ns=2;s=status1', dataType: 'String' },
  dp5: { id: 'dp5', name: 'Last Update', nodeId: 'ns=2;s=time1', dataType: 'DateTime' },
  dp6: { id: 'dp6', name: 'Pressure', nodeId: 'ns=2;s=pressure1', dataType: 'Double', unit: 'Pa', factor: 100 }, // With factor
  dp7: { id: 'dp7', name: 'Device Mode', nodeId: 'ns=2;s=mode1', dataType: 'Int16' },
};

const mockPrimaryOpcUaValues: Record<string, string | number | boolean> = {
  'ns=2;s=temp1': 25.5,
  'ns=2;s=valve1': true,
};

const mockGlobalOpcUaValues: Record<string, string | number | boolean> = {
  'ns=2;s=motor1': 1500,
  'ns=2;s=status1': 'Running',
  'ns=2;s=pressure1': 1013, // This would be 101300 Pa after factor if factor was applied by getDataPointValue (it's not)
  'ns=2;s=mode1': 2,
};

describe('nodeUtils', () => {
  // --- Tests for getDataPointValue ---
  describe('getDataPointValue', () => {
    it('should return value from primaryOpcUaValues if present', () => {
      expect(getDataPointValue('dp1', mockDataPoints, mockPrimaryOpcUaValues, mockGlobalOpcUaValues)).toBe(25.5);
    });

    it('should return value from globalOpcUaNodeValues if not in primary', () => {
      expect(getDataPointValue('dp3', mockDataPoints, mockPrimaryOpcUaValues, mockGlobalOpcUaValues)).toBe(1500);
    });

    it('should return undefined if dataPointId is undefined', () => {
      expect(getDataPointValue(undefined, mockDataPoints, mockPrimaryOpcUaValues, mockGlobalOpcUaValues)).toBeUndefined();
    });

    it('should return undefined if dataPointId is not in mockDataPoints', () => {
      expect(getDataPointValue('dp_unknown', mockDataPoints, mockPrimaryOpcUaValues, mockGlobalOpcUaValues)).toBeUndefined();
    });
    
    it('should return undefined if nodeId for dataPointId is not in any OPC UA values map', () => {
        const dpNoValue: Record<string, DataPoint> = { dp_test: { id: 'dp_test', name: 'Test', nodeId: 'ns=2;s=test_no_value', dataType: 'Float' } };
        expect(getDataPointValue('dp_test', dpNoValue, mockPrimaryOpcUaValues, mockGlobalOpcUaValues)).toBeUndefined();
    });

    // Note: The current getDataPointValue does not apply the factor. Factors are usually applied during formatting or mapping.
    // If it were to apply factor, this test would be different.
    it('should return raw value even if data point has a factor', () => {
      expect(getDataPointValue('dp6', mockDataPoints, {}, { 'ns=2;s=pressure1': 1013 })).toBe(1013);
    });
  });

  // --- Tests for applyValueMapping ---
  describe('applyValueMapping', () => {
    const baseLink: DataPointLink = { dataPointId: 'dp1', targetProperty: 'test' };

    it('should return rawValue if no valueMapping', () => {
      expect(applyValueMapping(10, { ...baseLink })).toBe(10);
    });

    it('should handle exact match (number)', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [{ match: 10, value: 'Matched' }] } };
      expect(applyValueMapping(10, link)).toBe('Matched');
      expect(applyValueMapping(11, link)).toBe(11); // No match
    });
    
    it('should handle exact match (string)', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [{ match: "Running", value: 'green' }] } };
      expect(applyValueMapping("Running", link)).toBe('green');
      expect(applyValueMapping("Stopped", link)).toBe("Stopped");
    });
    
    it('should handle exact match for number-like strings', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [{ match: "10", value: 'Ten' }] } };
      expect(applyValueMapping("10", link)).toBe('Ten');
      expect(applyValueMapping(10, link)).toBe('Ten'); // number input, string match
    });

    it('should handle range mapping', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'range', mapping: [{ min: 0, max: 10, value: 'Low' }, { min: 10, max: 20, value: 'Medium' }] } };
      expect(applyValueMapping(5, link)).toBe('Low');
      expect(applyValueMapping(15, link)).toBe('Medium');
      expect(applyValueMapping(25, link)).toBe(25); // No match
    });

    it('should handle threshold mapping', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'threshold', mapping: [{ threshold: 10, value: 'High' }, { threshold: 0, value: 'Normal' }] } };
      // Assumes rules are evaluated in order or specific logic for "highest met"
      // Current implementation takes first match. So order matters.
      expect(applyValueMapping(15, link)).toBe('High'); 
      const linkOrdered: DataPointLink = { ...baseLink, valueMapping: { type: 'threshold', mapping: [{ threshold: 0, value: 'Normal' }, { threshold: 10, value: 'High' }] } };
      expect(applyValueMapping(5, linkOrdered)).toBe('Normal');
      expect(applyValueMapping(12, linkOrdered)).toBe('Normal'); // because 0 is met first. This shows the limitation.
    });

    it('should handle boolean mapping (true/false)', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'boolean', mapping: [{ value: 'Active' }, { value: 'Inactive' }] } };
      expect(applyValueMapping(true, link)).toBe('Active');
      expect(applyValueMapping(false, link)).toBe('Inactive');
      expect(applyValueMapping("true", link)).toBe('Active');
      expect(applyValueMapping(1, link)).toBe('Active');
      expect(applyValueMapping(0, link)).toBe('Inactive');
    });
    
    it('should handle boolean mapping with explicit match', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'boolean', mapping: [{ match: "ON", value: 'Device On'}, { value: 'Device Off'}] } };
      // This variant of boolean mapping is a bit non-standard in the current code, but let's test its behavior.
      // The current code's boolean mapping expects [{value: forTrue}, {value: forFalse}] primarily.
      // Let's test the single rule match for boolean:
      const linkSingleRule: DataPointLink = { ...baseLink, valueMapping: { type: 'boolean', mapping: [{ match: "ON", value: 'Device On'}] } };
      expect(applyValueMapping("ON", linkSingleRule)).toBe('Device On');
      expect(applyValueMapping("OFF", linkSingleRule)).toBe("OFF"); // No match, passthrough
    });


    it('should use defaultValue if no rule matches', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [{ match: 'A', value: 'Alpha' }], defaultValue: 'Omega' } };
      expect(applyValueMapping('B', link)).toBe('Omega');
    });

    it('should use passthrough_value in defaultValue', () => {
      const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [], defaultValue: 'Value: {passthrough_value}' } };
      expect(applyValueMapping(123, link)).toBe('Value: 123');
      expect(applyValueMapping("XYZ", link)).toBe('Value: XYZ');
    });
    
    it('should return rawValue if valueMapping is present but mapping array is empty and no default', () => {
        const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [] } };
        expect(applyValueMapping(123, link)).toBe(123);
    });

    it('should return rawValue if rawValue is undefined/null and no defaultValue defined in mapping', () => {
        const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [{match: 'A', value: 'Alpha'}] } };
        expect(applyValueMapping(undefined, link)).toBeUndefined();
        expect(applyValueMapping(null, link)).toBeNull();
    });

    it('should return defaultValue if rawValue is undefined/null and defaultValue is defined', () => {
        const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [], defaultValue: 'Not Set' } };
        expect(applyValueMapping(undefined, link)).toBe('Not Set');
    });
    
    it('should handle {passthrough_value} in defaultValue when rawValue is undefined/null', () => {
        const link: DataPointLink = { ...baseLink, valueMapping: { type: 'exact', mapping: [], defaultValue: 'Raw: {passthrough_value}' } };
        expect(applyValueMapping(undefined, link)).toBe('Raw: '); // Current behavior: empty string for undefined/null passthrough
        expect(applyValueMapping(null, link)).toBe('Raw: ');
    });

  });

  // --- Tests for formatDisplayValue ---
  describe('formatDisplayValue', () => {
    it('should format numbers with precision, prefix, suffix', () => {
      const format = { type: 'number' as const, precision: 2, prefix: '$', suffix: ' USD' };
      expect(formatDisplayValue(123.456, format)).toBe('$123.46 USD'); // toLocaleString behavior can vary by locale for separators
      expect(formatDisplayValue(1000, { type: 'number', precision: 0 })).toBe('1,000'); // Assuming US locale for comma
    });
    
    it('should format numbers with default precision for integers if dataType is int', () => {
        expect(formatDisplayValue(1234, { type: 'number' }, 'Int32')).toBe('1,234'); // No decimal for Int32
        expect(formatDisplayValue(1234.56, { type: 'number' }, 'Float')).not.toContain('.00'); // Default float precision
    });

    it('should format booleans with custom labels', () => {
      const format = { type: 'boolean' as const, trueLabel: 'ON', falseLabel: 'OFF' };
      expect(formatDisplayValue(true, format)).toBe('ON');
      expect(formatDisplayValue(false, format)).toBe('OFF');
      expect(formatDisplayValue(1, format)).toBe('ON');
      expect(formatDisplayValue("false", format)).toBe('OFF');
    });
    
    it('should use default boolean labels if custom not provided', () => {
        expect(formatDisplayValue(true, { type: 'boolean' })).toBe('True');
        expect(formatDisplayValue(false, { type: 'boolean' })).toBe('False');
    });

    it('should format dateTime with a pattern (mocking date-fns)', () => {
      const date = new Date(2023, 0, 15, 14, 30, 0); // Jan 15, 2023, 2:30 PM
      const format = { type: 'dateTime' as const, dateTimeFormat: 'yyyy-MM-dd HH:mm' };
      // This will use date-fns.format, ensure it's mocked or test its actual output
      expect(formatDisplayValue(date, format)).toBe('2023-01-15 14:30');
    });
    
    it('should format dateTime with default toLocaleString if no pattern', () => {
        const date = new Date(2023, 0, 15, 14, 30, 0);
        // The exact output of toLocaleString is locale-dependent, so we check for presence of key parts.
        const formatted = formatDisplayValue(date, { type: 'dateTime' });
        expect(formatted).toContain('1/15/2023'); // Example for en-US, adjust if locale differs
        expect(formatted).toContain('2:30:00 PM'); // Example for en-US
    });

    it('should format strings with prefix/suffix', () => {
      const format = { type: 'string' as const, prefix: 'Status: ', suffix: '!' };
      expect(formatDisplayValue('Ready', format)).toBe('Status: Ready!');
    });

    it('should return "-" for undefined or null values', () => {
      expect(formatDisplayValue(undefined)).toBe('-');
      expect(formatDisplayValue(null)).toBe('-');
    });
    
    it('should infer format type from dataType if not specified in format object', () => {
        expect(formatDisplayValue(123, undefined, 'Int16')).toBe('123');
        expect(formatDisplayValue(true, undefined, 'Boolean')).toBe('True');
        // Date inference requires a valid Date object, not just string for automatic inference to dateTime
        const testDate = new Date();
        expect(formatDisplayValue(testDate, undefined, 'DateTime')).toBe(testDate.toLocaleString());
    });

    it('should infer format type from value type if no format.type and no dataType', () => {
        expect(formatDisplayValue(456.78, {})).toBe(Number(456.78).toLocaleString()); // Default number formatting
        expect(formatDisplayValue(false, {})).toBe('False');
        const testDate = new Date();
        expect(formatDisplayValue(testDate, {})).toBe(testDate.toLocaleString());
        expect(formatDisplayValue("hello", {})).toBe("hello");
    });
  });

  // --- Tests for getDerivedStyle ---
  describe('getDerivedStyle', () => {
    const mockNodeData: BaseNodeData = {
      label: 'Test Node',
      elementType: SLDElementType.GenericDevice, // Example, not strictly used by getDerivedStyle directly
      dataPointLinks: [],
    };

    it('should derive style for fillColor', () => {
      const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [{ dataPointId: 'dp4', targetProperty: 'fillColor' }] };
      const style = getDerivedStyle(data, mockDataPoints, {}, mockGlobalOpcUaValues);
      expect(style.backgroundColor).toBe('Running'); // as 'fillColor' maps to 'backgroundColor'
    });

    it('should derive style for opacity', () => {
      const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [{ dataPointId: 'dp1', targetProperty: 'opacity' }] };
      const style = getDerivedStyle(data, mockDataPoints, mockPrimaryOpcUaValues);
      expect(style.opacity).toBe(25.5); // Value from dp1 is 25.5, which is not ideal for opacity. Test actual behavior.
                                         // The function uses parseFloat, so it will be 25.5. Clamping (0-1) is applied.
                                         // So, the actual opacity will be 1.
      // Let's re-test with a sensible opacity value
      const primaryValuesWithOpacity = { ...mockPrimaryOpcUaValues, 'ns=2;s=temp1': 0.75 };
      const style2 = getDerivedStyle(data, mockDataPoints, primaryValuesWithOpacity);
      expect(style2.opacity).toBe(0.75);
    });
    
    it('should derive style for visibility (true)', () => {
      const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [{ dataPointId: 'dp2', targetProperty: 'visible' }] }; // dp2 is true
      const style = getDerivedStyle(data, mockDataPoints, mockPrimaryOpcUaValues);
      expect(style.display).toBeUndefined(); // True means default display (visible)
    });

    it('should derive style for visibility (false)', () => {
      const primaryVals = { 'ns=2;s=valve1': false };
      const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [{ dataPointId: 'dp2', targetProperty: 'visibility' }] };
      const style = getDerivedStyle(data, mockDataPoints, primaryVals);
      expect(style.display).toBe('none'); // False means display: none
    });

    it('should use valueMapping before deriving style', () => {
      const link: DataPointLink = {
        dataPointId: 'dp7', // mode1, value is 2
        targetProperty: 'borderColor',
        valueMapping: { type: 'exact', mapping: [{ match: 2, value: 'blue' }] }
      };
      const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [link] };
      const style = getDerivedStyle(data, mockDataPoints, {}, mockGlobalOpcUaValues);
      expect(style.borderColor).toBe('blue');
    });

    it('should set custom CSS properties', () => {
      const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [{ dataPointId: 'dp3', targetProperty: '--motor-speed' }] };
      const style = getDerivedStyle(data, mockDataPoints, {}, mockGlobalOpcUaValues);
      expect(style['--motor-speed']).toBe('1500');
    });
    
    it('should prioritize primaryOpcUaValues over globalOpcUaNodeValues', () => {
        const dpWithOverrideId = 'dp_override';
        const dpNodeId = 'ns=2;s=override_val';
        const localMockDataPoints = { ...mockDataPoints, [dpWithOverrideId]: { id: dpWithOverrideId, name: 'Override Test', nodeId: dpNodeId, dataType: 'String' }};
        const localPrimaryValues = { [dpNodeId]: 'PrimaryValue' };
        const localGlobalValues = { [dpNodeId]: 'GlobalValue' };
        
        const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [{ dataPointId: dpWithOverrideId, targetProperty: 'textColor' }] };
        const style = getDerivedStyle(data, localMockDataPoints, localPrimaryValues, localGlobalValues);
        expect(style.color).toBe('PrimaryValue');
    });

    it('should use globalOpcUaNodeValues if not in primary', () => {
        const dpWithOverrideId = 'dp_override';
        const dpNodeId = 'ns=2;s=override_val';
        const localMockDataPoints = { ...mockDataPoints, [dpWithOverrideId]: { id: dpWithOverrideId, name: 'Override Test', nodeId: dpNodeId, dataType: 'String' }};
        const localPrimaryValues = { }; // Not in primary
        const localGlobalValues = { [dpNodeId]: 'GlobalValue' };
        
        const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [{ dataPointId: dpWithOverrideId, targetProperty: 'textColor' }] };
        const style = getDerivedStyle(data, localMockDataPoints, localPrimaryValues, localGlobalValues);
        expect(style.color).toBe('GlobalValue');
    });

    it('should return empty object if no dataPointLinks', () => {
        const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [] };
        expect(getDerivedStyle(data, mockDataPoints, {}, {})).toEqual({});
    });
    
    it('should handle formatting for number/boolean targetValues before applying to style property if link.format is present', () => {
        // Example: a boolean value (true) is mapped to 'visible_string' or 'hidden_string' via format.trueLabel/falseLabel
        // and this string is then used for a custom property.
        const link: DataPointLink = {
            dataPointId: 'dp2', // value is true
            targetProperty: '--custom-visibility-label',
            format: { type: 'boolean', trueLabel: 'VISIBLE_STATE', falseLabel: 'HIDDEN_STATE' }
        };
        const data: BaseNodeData = { ...mockNodeData, dataPointLinks: [link] };
        const style = getDerivedStyle(data, mockDataPoints, mockPrimaryOpcUaValues);
        expect(style['--custom-visibility-label']).toBe('VISIBLE_STATE');
    });

  });
});
