import { NextRequest, NextResponse } from 'next/server';
import {
    getDataPointDefinitionById,
    updateDataPointDefinition,
    deleteDataPointDefinition,
    DataPointDefinitionDB // Assuming this is exported or defined accessible here
} from '@/lib/duckdbClient';

interface RouteParams {
    params: {
        id: string;
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = params;
        const definition = await getDataPointDefinitionById(id);
        if (!definition) {
            return NextResponse.json({ message: 'Data point definition not found' }, { status: 404 });
        }
        return NextResponse.json(definition, { status: 200 });
    } catch (error) {
        console.error(`Error fetching data point definition ${params.id}:`, error);
        return NextResponse.json({ message: 'Failed to retrieve data point definition', error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = params;
        const body = await request.json() as Partial<Omit<DataPointDefinitionDB, 'id' | 'opcua_node_id' | 'last_modified'>>;

        // Ensure opcua_node_id is not part of the update payload from client if it's meant to be immutable post-creation
        if ('opcua_node_id' in body) {
            // delete (body as any).opcua_node_id; // Or return error if client tries to change it
            return NextResponse.json({ message: 'OPC UA Node ID (opcua_node_id) cannot be updated.' }, { status: 400 });
        }
        if (Object.keys(body).length === 0) {
             return NextResponse.json({ message: 'No update fields provided.' }, { status: 400 });
        }


        const updatedDefinition = await updateDataPointDefinition(id, body);
        if (!updatedDefinition) {
            return NextResponse.json({ message: 'Data point definition not found or update failed' }, { status: 404 });
        }
        return NextResponse.json(updatedDefinition, { status: 200 });
    } catch (error) {
        console.error(`Error updating data point definition ${params.id}:`, error);
        return NextResponse.json({ message: 'Failed to update data point definition', error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = params;
        const success = await deleteDataPointDefinition(id);
        if (!success) {
            // This might also mean it was already deleted or never existed.
            // For simplicity, treating "not successful" broadly here.
            // A more specific check in deleteDataPointDefinition could return more info.
            const existing = await getDataPointDefinitionById(id);
            if (existing) {
                 return NextResponse.json({ message: 'Failed to delete data point definition for an unknown reason' }, { status: 500 });
            }
            // If it doesn't exist, arguably a 204 is still fine, or a 404 if preferred.
            // Let's be explicit if it was not found prior to delete attempt (or after failed one).
            return NextResponse.json({ message: 'Data point definition not found or already deleted' }, { status: 404 });
        }
        return NextResponse.json(null, { status: 204 }); // No content, successful deletion
    } catch (error) {
        console.error(`Error deleting data point definition ${params.id}:`, error);
        return NextResponse.json({ message: 'Failed to delete data point definition', error: (error as Error).message }, { status: 500 });
    }
}
