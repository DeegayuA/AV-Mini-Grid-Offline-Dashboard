import React from 'react';
import { render } from '@testing-library/react';
import { Position, EdgeProps } from 'reactflow';
import AnimatedFlowEdge from './AnimatedFlowEdge';
import { SLDElementType, CustomFlowEdgeData, AnimationFlowConfig, DynamicFlowType } from '@/types/sld';

// Mock getSmoothStepPath
const mockGetSmoothStepPath = jest.fn();
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  getSmoothStepPath: (...args: any[]) => {
    mockGetSmoothStepPath(...args);
    // Return a valid path string and label positions for rendering
    return ['M 0 0 Q 0 0 0 0', 0, 0];
  },
}));

// Mock useAppStore
jest.mock('@/stores/appStore', () => ({
  useAppStore: jest.fn(() => ({
    opcUaNodeValues: {},
    dataPoints: {},
  })),
}));

const defaultEdgeProps: EdgeProps<CustomFlowEdgeData> = {
  id: 'test-edge',
  sourceX: 50,
  sourceY: 50,
  targetX: 150,
  targetY: 150,
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  source: 'source-node',
  target: 'target-node',
  selected: false,
  // markerEnd, style, etc. can be added if needed by specific tests
};

describe('AnimatedFlowEdge Connection Points', () => {
  beforeEach(() => {
    mockGetSmoothStepPath.mockClear();
  });

  test('Test Case 1: Unidirectional Export Flow uses Bottom positions', () => {
    const props: EdgeProps<CustomFlowEdgeData> = {
      ...defaultEdgeProps,
      sourcePosition: Position.Left, // Initial arbitrary position
      targetPosition: Position.Right, // Initial arbitrary position
      data: {
        animationSettings: {
          animationType: 'dynamic_power_flow',
          dynamicFlowType: 'unidirectional_export',
        } as AnimationFlowConfig,
      },
    };
    render(<AnimatedFlowEdge {...props} />);
    expect(mockGetSmoothStepPath).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePosition: Position.Bottom,
        targetPosition: Position.Bottom,
      })
    );
  });

  test('Test Case 2: Unidirectional Import Flow uses Bottom positions', () => {
    const props: EdgeProps<CustomFlowEdgeData> = {
      ...defaultEdgeProps,
      sourcePosition: Position.Top,   // Initial arbitrary position
      targetPosition: Position.Left, // Initial arbitrary position
      data: {
        animationSettings: {
          animationType: 'dynamic_power_flow',
          dynamicFlowType: 'unidirectional_import',
        } as AnimationFlowConfig,
      },
    };
    render(<AnimatedFlowEdge {...props} />);
    expect(mockGetSmoothStepPath).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePosition: Position.Bottom,
        targetPosition: Position.Bottom,
      })
    );
  });

  test('Test Case 3: Bidirectional Flow uses original positions', () => {
    const originalSourcePos = Position.Top;
    const originalTargetPos = Position.Right;
    const props: EdgeProps<CustomFlowEdgeData> = {
      ...defaultEdgeProps,
      sourcePosition: originalSourcePos,
      targetPosition: originalTargetPos,
      data: {
        animationSettings: {
          animationType: 'dynamic_power_flow',
          dynamicFlowType: 'bidirectional_from_net',
        } as AnimationFlowConfig,
      },
    };
    render(<AnimatedFlowEdge {...props} />);
    expect(mockGetSmoothStepPath).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePosition: originalSourcePos,
        targetPosition: originalTargetPos,
      })
    );
  });

  test('Test Case 4: No Animation Settings uses original positions', () => {
    const originalSourcePos = Position.Left;
    const originalTargetPos = Position.Left;
    const props: EdgeProps<CustomFlowEdgeData> = {
      ...defaultEdgeProps,
      sourcePosition: originalSourcePos,
      targetPosition: originalTargetPos,
      data: {}, // No animationSettings
    };
    render(<AnimatedFlowEdge {...props} />);
    expect(mockGetSmoothStepPath).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePosition: originalSourcePos,
        targetPosition: originalTargetPos,
      })
    );
  });

  test('Test Case 5: Constant Unidirectional Flow uses original positions', () => {
    const originalSourcePos = Position.Top;
    const originalTargetPos = Position.Top;
    const props: EdgeProps<CustomFlowEdgeData> = {
      ...defaultEdgeProps,
      sourcePosition: originalSourcePos,
      targetPosition: originalTargetPos,
      data: {
        animationSettings: {
          animationType: 'constant_unidirectional',
          constantFlowDirection: 'forward',
        } as AnimationFlowConfig,
      },
    };
    render(<AnimatedFlowEdge {...props} />);
    expect(mockGetSmoothStepPath).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePosition: originalSourcePos,
        targetPosition: originalTargetPos,
      })
    );
  });

  test('Test Case 6: Dynamic flow with no specific dynamicFlowType uses original positions', () => {
    // This case implies a misconfiguration or fallback scenario.
    // The current implementation defaults dynamicFlowType to 'bidirectional_from_net' if undefined
    // INSIDE the switch statement. The check for bottom positions happens BEFORE this default is applied.
    // So, if dynamicFlowType is undefined, it should use original positions.
    const originalSourcePos = Position.Right;
    const originalTargetPos = Position.Bottom;
    const props: EdgeProps<CustomFlowEdgeData> = {
      ...defaultEdgeProps,
      sourcePosition: originalSourcePos,
      targetPosition: originalTargetPos,
      data: {
        animationSettings: {
          animationType: 'dynamic_power_flow',
          // dynamicFlowType is intentionally undefined
        } as Partial<AnimationFlowConfig>, // Cast to partial as dynamicFlowType is missing
      },
    };
    render(<AnimatedFlowEdge {...props} />);
    expect(mockGetSmoothStepPath).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePosition: originalSourcePos,
        targetPosition: originalTargetPos,
      })
    );
  });
});
