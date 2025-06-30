import { NextRequest, NextResponse } from 'next/server';
import {
    getConstant,
    upsertConstant,
    deleteConstant,
    ConstantDB // Assuming this is exported or defined accessible here
} from '@/lib/duckdbClient';

interface RouteParams {
    params: {
        key: string; // The dynamic part of the route, e.g., "PLANT_NAME"
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { key } = params;
        const decodedKey = decodeURIComponent(key); // Decode URL encoded key
        const constant = await getConstant(decodedKey);
        if (!constant) {
            return NextResponse.json({ message: `Constant with key '${decodedKey}' not found` }, { status: 404 });
        }
        return NextResponse.json(constant, { status: 200 });
    } catch (error) {
        console.error(`Error fetching constant ${params.key}:`, error);
        return NextResponse.json({ message: 'Failed to retrieve constant', error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { key } = params;
        const decodedKey = decodeURIComponent(key);
        const body = await request.json() as Partial<Omit<ConstantDB, 'key' | 'last_modified'>>; // value and description

        if (body.value === undefined) { // Value is mandatory for a constant
            return NextResponse.json({ message: 'Missing required field: value' }, { status: 400 });
        }

        const updatedConstant = await upsertConstant(decodedKey, String(body.value), body.description);
        return NextResponse.json(updatedConstant, { status: 200 }); // 200 for update, 201 if we could distinguish creation
    } catch (error) {
        console.error(`Error updating constant ${params.key}:`, error);
        return NextResponse.json({ message: 'Failed to update constant', error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { key } = params;
        const decodedKey = decodeURIComponent(key);

        // Check if constant exists before attempting delete for a more accurate response
        const existingConstant = await getConstant(decodedKey);
        if (!existingConstant) {
            return NextResponse.json({ message: `Constant with key '${decodedKey}' not found` }, { status: 404 });
        }

        const success = await deleteConstant(decodedKey);
        if (!success) {
            // This case should ideally not be reached if the check above passes and DB operation fails for other reasons
            return NextResponse.json({ message: 'Failed to delete constant for an unknown reason' }, { status: 500 });
        }
        return NextResponse.json(null, { status: 204 }); // No content, successful deletion
    } catch (error) {
        console.error(`Error deleting constant ${params.key}:`, error);
        return NextResponse.json({ message: 'Failed to delete constant', error: (error as Error).message }, { status: 500 });
    }
}
