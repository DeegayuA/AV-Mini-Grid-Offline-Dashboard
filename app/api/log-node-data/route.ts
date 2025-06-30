import { NextRequest, NextResponse } from 'next/server';
import { insertNodeData, ensureSchemaInitialized } from '@/lib/duckdbClient'; // ensureSchemaInitialized might be called by insertNodeData already

export async function POST(request: NextRequest) {
    try {
        // ensureSchemaInitialized is called within insertNodeData, but calling here ensures
        // that any other pre-checks or general DB readiness is established if needed.
        await ensureSchemaInitialized();

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
        } else {
            return NextResponse.json({ message: `Invalid value type for nodeId ${nodeId}: ${typeof value}` }, { status: 400 });
        }

        const dateTimestamp = new Date(timestamp);
        if (isNaN(dateTimestamp.getTime())) {
            return NextResponse.json({ message: 'Invalid timestamp format. Please use ISO 8601 format.' }, { status: 400 });
        }

        // The nodeId here should be the actual OPC UA nodeId string, e.g., "ns=2;s=MyVariable"
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
