import { NextRequest, NextResponse } from 'next/server';
import { getDBConnection, initializeDBSchema } from '@/lib/duckdbClient'; // Assuming duckdbClient.ts is in lib

// Flag to ensure schema is initialized only once
let dbInitialized = false;

async function ensureDbInitialized() {
    if (!dbInitialized) {
        try {
            await initializeDBSchema();
            dbInitialized = true;
            console.log('Database schema initialized successfully from API route get-node-data.');
        } catch (error) {
            console.error('Failed to initialize database schema from API route get-node-data:', error);
            throw new Error('Database initialization failed');
        }
    }
}

export async function GET(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const { searchParams } = new URL(request.url);
        const nodeId = searchParams.get('nodeId');
        const startTime = searchParams.get('startTime'); // ISO 8601 string
        const endTime = searchParams.get('endTime');     // ISO 8601 string
        // const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 1000; // Default limit

        if (!nodeId) {
            return NextResponse.json({ message: 'Missing required parameter: nodeId' }, { status: 400 });
        }
        if (!startTime || !endTime) {
            return NextResponse.json({ message: 'Missing required parameters: startTime and endTime' }, { status: 400 });
        }

        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ message: 'Invalid startTime or endTime format. Please use ISO 8601 format.' }, { status: 400 });
        }

        const connection = await getDBConnection();
        try {
            // Ensure TIMESTAMPTZ is correctly handled in query. DuckDB uses ISO 8601 for TIMESTAMPTZ literals.
            const query = `
                SELECT timestamp, value
                FROM node_data
                WHERE node_id = ? AND timestamp >= ? AND timestamp <= ?
                ORDER BY timestamp ASC;
            `;
            // Potentially add LIMIT ? and pass limit if pagination/load more is needed

            const results = await connection.all(query, nodeId, startDate.toISOString(), endDate.toISOString());

            // The node-api for DuckDB should return Date objects for TIMESTAMPTZ
            // and numbers for DOUBLE. Let's ensure the format is what the frontend expects.
            const formattedResults = results.map(row => ({
                // timestamp: (row.timestamp as Date).toISOString(), // Ensure ISO string if not already
                timestamp: row.timestamp, // Keep as Date object if possible, or convert to desired format
                value: row.value,
            }));

            return NextResponse.json(formattedResults, { status: 200 });
        } finally {
            await connection.close();
        }
    } catch (error) {
        console.error('Error in /api/get-node-data:', error);
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: 'Failed to retrieve node data', error: errorMessage }, { status: 500 });
    }
}
