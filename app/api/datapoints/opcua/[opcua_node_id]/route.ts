import { NextRequest, NextResponse } from 'next/server';
import {
    getDataPointDefinitionByOpcuaNodeId,
    // DataPointDefinitionDB // Assuming this is exported or defined accessible here
} from '@/lib/duckdbClient';

interface RouteParams {
    params: {
        opcua_node_id: string; // The dynamic part of the route
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { opcua_node_id } = params;
        // The opcua_node_id might contain characters like ';', '=', which should be URL encoded by the client.
        // Here, Next.js automatically decodes them from the path parameter.
        const definition = await getDataPointDefinitionByOpcuaNodeId(opcua_node_id);

        if (!definition) {
            return NextResponse.json({ message: `Data point definition with OPC UA Node ID '${opcua_node_id}' not found` }, { status: 404 });
        }
        return NextResponse.json(definition, { status: 200 });
    } catch (error) {
        console.error(`Error fetching data point definition by OPC UA Node ID ${params.opcua_node_id}:`, error);
        return NextResponse.json({ message: 'Failed to retrieve data point definition by OPC UA Node ID', error: (error as Error).message }, { status: 500 });
    }
}
