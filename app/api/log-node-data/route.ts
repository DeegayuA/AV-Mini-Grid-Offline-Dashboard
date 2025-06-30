import { NextRequest, NextResponse } from 'next/server';
import { initializeDBSchema, insertNodeData } from '@/lib/duckdbClient';

// Flag to ensure schema is initialized only once
let dbInitialized = false;

async function ensureDbInitialized() {
    if (!dbInitialized) {
        try {
            await initializeDBSchema();
            dbInitialized = true;
            console.log('Database schema initialized successfully from API route.');
        } catch (error) {
            console.error('Failed to initialize database schema from API route:', error);
            // Depending on the error, you might want to prevent further operations
            // or allow the application to continue if tables might exist.
            // For now, we'll throw to indicate a critical setup failure.
            throw new Error('Database initialization failed');
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const body = await request.json();
        const { timestamp, nodeId, value } = body;

        if (!timestamp || !nodeId || value === undefined) {
            return NextResponse.json({ message: 'Missing required fields: timestamp, nodeId, value' }, { status: 400 });
        }

        let parsedValue: number;
        if (typeof value === 'number') {
            parsedValue = value;
        } else if (typeof value === 'string') {
            parsedValue = parseFloat(value);
            if (isNaN(parsedValue)) {
                return NextResponse.json({ message: `Invalid value format for nodeId ${nodeId}: cannot parse '${value}' as number` }, { status: 400 });
            }
        } else if (typeof value === 'boolean') {
            parsedValue = value ? 1 : 0;
        }
        else {
            return NextResponse.json({ message: `Invalid value type for nodeId ${nodeId}: ${typeof value}` }, { status: 400 });
        }

        const dateTimestamp = new Date(timestamp);
        if (isNaN(dateTimestamp.getTime())) {
            return NextResponse.json({ message: 'Invalid timestamp format' }, { status: 400 });
        }

        await insertNodeData(dateTimestamp, nodeId, parsedValue);

        return NextResponse.json({ message: 'Data logged successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error in /api/log-node-data:', error);
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: 'Failed to log data', error: errorMessage }, { status: 500 });
    }
}
