# Implementation Plan: SLD Enhancements

This document outlines the detailed tasks required to implement the identified gaps and adjustments for the SLD (Symbolic Link Diagram) editor.

## 1. UI Enhancements for SLDInspectorDialog

The `SLDInspectorDialog` needs to be updated to provide comprehensive configuration options for various node types and edge styles.

### 1.1. Gauge Node Configuration

Implement UI controls within `SLDInspectorDialog` for the following `GaugeNode` properties:

*   `minValue`: Number input
*   `maxValue`: Number input
*   `value`: Number input (potentially linked to data source)
*   `unit`: Text input
*   `shape`: Dropdown (e.g., "circle", "semicircle", "linear")
*   `borderColor`: Color picker
*   `fillColor`: Color picker
*   `valueColor`: Color picker (for the gauge's value representation)
*   `shadowColor`: Color picker
*   `fontColor`: Color picker (for text elements like min/max labels, value label)
*   `fontSize`: Number input
*   `fontWeight`: Dropdown/Buttons (e.g., "normal", "bold")
*   `fontFamily`: Dropdown/Text input

### 1.2. Control Node Configuration

Implement UI controls within `SLDInspectorDialog` for the following `ControlNode` properties:

*   `controlType`: Dropdown (e.g., "button", "slider", "switch", "dropdown")
*   `controlValue`: Input appropriate for `controlType` (e.g., boolean for switch, number for slider)
*   `label`: Text input
*   `labelPosition`: Dropdown (e.g., "top", "bottom", "left", "right")
*   `labelColor`: Color picker
*   `labelFontSize`: Number input
*   `labelFontWeight`: Dropdown/Buttons
*   `labelFontFamily`: Dropdown/Text input
*   `backgroundColor`: Color picker
*   `borderColor`: Color picker
*   `borderWidth`: Number input
*   `shadowColor`: Color picker

### 1.3. General Node Configuration (Common Properties)

Ensure UI controls are present and functional in `SLDInspectorDialog` for common properties applicable to most node types:

*   `label`: Text input
*   `labelPosition`: Dropdown
*   `labelColor`: Color picker
*   `labelFontSize`: Number input
*   `labelFontWeight`: Dropdown/Buttons
*   `labelFontFamily`: Dropdown/Text input
*   `backgroundColor`: Color picker
*   `borderColor`: Color picker
*   `borderWidth`: Number input
*   `shadowColor`: Color picker
*   `icon`: Icon picker/uploader
*   `image`: Image uploader/URL input

### 1.4. DataLabelNode `styleConfig`

*   Implement a flexible UI section within `SLDInspectorDialog` to manage the `styleConfig` object for `DataLabelNode`. This might involve:
    *   A key-value pair editor.
    *   A predefined list of common CSS properties with appropriate inputs (e.g., `padding`, `margin`, `borderRadius`).
*   **Enable `TextLabelConfigPopover` for `DataLabelNode`:** Ensure that the `TextLabelConfigPopover` can be invoked for `DataLabelNode` instances to allow for detailed and intuitive configuration of text-related styles (font, color, alignment, etc.).

### 1.5. Edge Base Styles Configuration

Implement UI controls within `SLDInspectorDialog` (when an edge is selected) for the following base style properties:

*   `strokeColor`: Color picker
*   `strokeWidth`: Number input
*   `strokeDasharray`: Text input (e.g., "5, 5") or predefined patterns
*   `arrowhead`: Dropdown (e.g., "default", "vee", "triangle", "none")
*   `arrowtail`: Dropdown (e.g., "default", "vee", "triangle", "none")

## 2. SLDElementControlPopup Enhancements

*   Identify boolean configuration properties for various SLD elements (nodes and edges) that would benefit from quick toggling.
*   Add `Switch` components to the `SLDElementControlPopup` for these identified boolean properties. Examples might include:
    *   Node: `visibility`, `showLabel`
    *   Edge: `showArrowhead`, `showArrowtail`

## 3. Data Link Precedence for Edges

*   **Edge `strokeColor`:** Modify the rendering logic for edges to prioritize `strokeColor` values received through data links.
    *   If an edge has a data link that provides a `strokeColor`, this value should override any statically defined `strokeColor` in the SLD configuration.
    *   Ensure this behavior is consistent and well-documented.

## 4. WebSocket Message Standardization for Write Operations

Define and implement a standardized set of WebSocket message types and formats for all operations that modify the SLD. This is crucial for ensuring reliable real-time communication and state synchronization.

*   **General Message Structure:**
    ```json
    {
      "type": "SLD_OPERATION_TYPE",
      "payload": {
        // Operation-specific data
      }
    }
    ```

*   **Node Operations:**
    *   `CREATE_NODE`: `payload: { type: "GaugeNode" | "ControlNode" | ..., properties: { ... } }`
    *   `UPDATE_NODE_PROPERTY`: `payload: { nodeId: string, property: string, value: any }`
    *   `UPDATE_NODE_PROPERTIES`: `payload: { nodeId: string, properties: { ... } }` (for multiple properties)
    *   `DELETE_NODE`: `payload: { nodeId: string }`

*   **Edge Operations:**
    *   `CREATE_EDGE`: `payload: { sourceNodeId: string, targetNodeId: string, properties: { ... } }`
    *   `UPDATE_EDGE_PROPERTY`: `payload: { edgeId: string, property: string, value: any }`
    *   `UPDATE_EDGE_PROPERTIES`: `payload: { edgeId: string, properties: { ... } }`
    *   `DELETE_EDGE`: `payload: { edgeId: string }`

*   **Style Configuration Changes (e.g., DataLabelNode `styleConfig`):**
    *   `UPDATE_NODE_STYLE_CONFIG`: `payload: { nodeId: string, styleProperty: string, value: any }`
    *   `REPLACE_NODE_STYLE_CONFIG`: `payload: { nodeId: string, styleConfig: object }`

*   **Data Link Updates:**
    *   `SET_NODE_DATA_LINK`: `payload: { nodeId: string, dataPath: string, propertyToLink: string }`
    *   `REMOVE_NODE_DATA_LINK`: `payload: { nodeId: string, propertyToLink: string }`
    *   `SET_EDGE_DATA_LINK`: `payload: { edgeId: string, dataPath: string, propertyToLink: string }`
    *   `REMOVE_EDGE_DATA_LINK`: `payload: { edgeId: string, propertyToLink: string }`

*   **Canvas/SLD Metadata Operations (if any):**
    *   `UPDATE_SLD_METADATA`: `payload: { property: string, value: any }` (e.g., background color, grid settings)

Ensure all backend and frontend components adhere to these standardized message types for write operations.

## 5. TextLabelConfigPopover for DataLabelNode

*   Verify the existing `TextLabelConfigPopover` component.
*   Ensure it can be correctly instantiated and used to configure the text properties of `DataLabelNode` elements.
*   Test its functionality thoroughly, including applying various font styles, colors, sizes, and alignments.

This list will be used as a guide for the development tasks. Each item should be broken down further into specific sub-tasks during the implementation phase.
