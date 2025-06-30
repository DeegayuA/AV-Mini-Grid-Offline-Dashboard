import { NextRequest, NextResponse } from 'next/server';
import {
    createDataPointDefinition,
    getAllDataPointDefinitions,
    DataPointDefinitionDB // Assuming this is exported or defined accessible here
} from '@/lib/duckdbClient';

export async function GET(request: NextRequest) {
    try {
        const definitions = await getAllDataPointDefinitions();
        return NextResponse.json(definitions, { status: 200 });
    } catch (error) {
        console.error('Error fetching all data point definitions:', error);
        return NextResponse.json({ message: 'Failed to retrieve data point definitions', error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as Omit<DataPointDefinitionDB, 'last_modified'>;

        // Basic validation (more comprehensive validation should be added based on requirements)
        if (!body.id || !body.name || !body.opcua_node_id || !body.data_type) {
            return NextResponse.json({ message: 'Missing required fields: id, name, opcua_node_id, data_type' }, { status: 400 });
        }

        const newDefinition = await createDataPointDefinition(body);
        return NextResponse.json(newDefinition, { status: 201 });
    } catch (error) {
        console.error('Error creating data point definition:', error);
        // Handle specific errors, e.g., UNIQUE constraint violation for id or opcua_node_id
        if ((error as Error).message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ message: 'Data point definition with this ID or OPC UA Node ID already exists.', error: (error as Error).message }, { status: 409 });
        }
        return NextResponse.json({ message: 'Failed to create data point definition', error: (error as Error).message }, { status: 500 });
    }
}
