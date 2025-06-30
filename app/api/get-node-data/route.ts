import { NextRequest, NextResponse } from 'next/server';
import { getNodeDataInRange, ensureSchemaInitialized, NodeDataPoint } from '@/lib/duckdbClient';

export async function GET(request: NextRequest) {
    try {
        await ensureSchemaInitialized(); // Ensures DB and tables are ready

        const { searchParams } = new URL(request.url);
        const nodeId = searchParams.get('nodeId'); // This is the OPC UA Node ID
        const startTimeStr = searchParams.get('startTime'); // ISO 8601 string
        const endTimeStr = searchParams.get('endTime');     // ISO 8601 string
        const limitStr = searchParams.get('limit');

        if (!nodeId) {
            return NextResponse.json({ message: 'Missing required parameter: nodeId' }, { status: 400 });
        }
        if (!startTimeStr || !endTimeStr) {
            return NextResponse.json({ message: 'Missing required parameters: startTime and endTime' }, { status: 400 });
        }

        const startTime = new Date(startTimeStr);
        const endTime = new Date(endTimeStr);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return NextResponse.json({ message: 'Invalid startTime or endTime format. Please use ISO 8601 format.' }, { status: 400 });
        }

        let limit: number | undefined = undefined;
        if (limitStr) {
            const parsedLimit = parseInt(limitStr, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                limit = parsedLimit;
            } else {
                return NextResponse.json({ message: 'Invalid limit format. Must be a positive integer.' }, { status: 400 });
            }
        }

        const results: NodeDataPoint[] = await getNodeDataInRange(nodeId, startTime, endTime, limit);

        // Transform Date objects to ISO strings for JSON serialization, as Next.js default might vary.
        const formattedResults = results.map(row => ({
            timestamp: row.timestamp.toISOString(),
            value: row.value,
        }));

        return NextResponse.json(formattedResults, { status: 200 });
    } catch (error) {
        console.error('Error in /api/get-node-data:', error);
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: 'Failed to retrieve node data', error: errorMessage }, { status: 500 });
    }
}
