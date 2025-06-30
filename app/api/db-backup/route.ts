import { NextRequest, NextResponse } from 'next/server';
import { getDBInstance, initializeDBSchema } from '@/lib/duckdbClient';
import path from 'path';
import fs from 'fs';
import { format } from 'date-fns';

// Flag to ensure schema is initialized only once - might be redundant if other APIs are hit first
let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        try {
            await initializeDBSchema(); // Ensure tables exist, though EXPORT doesn't strictly need it if DB exists
            dbInitialized = true;
            console.log('Database schema check/init from db-backup.');
        } catch (error) {
            console.error('Failed to initialize database schema from db-backup:', error);
            throw new Error('Database initialization failed');
        }
    }
}

const backupBaseDir = path.resolve(process.cwd(), 'data', 'backups');

export async function POST(request: NextRequest) { // Using POST for action
    try {
        await ensureDbInitialized();

        if (!fs.existsSync(backupBaseDir)) {
            fs.mkdirSync(backupBaseDir, { recursive: true });
        }

        const instance = await getDBInstance(); // Get the main DB instance
        const connection = await instance.connect();

        const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
        const backupDirName = `backup_${timestamp}`;
        const backupPath = path.resolve(backupBaseDir, backupDirName);

        try {
            // EXPORT DATABASE specifies a directory. DuckDB will manage files within it.
            await connection.run(`EXPORT DATABASE '${backupPath}' (FORMAT PARQUET);`);
            // Parquet is a good, efficient format for analytical data.
            // Alternatively, use (FORMAT CSV) or omit FORMAT for DuckDB's internal binary format.

            return NextResponse.json({ message: `Database backup successful. Exported to directory: ${backupPath}` }, { status: 200 });
        } catch (exportError) {
            console.error('Error during database export:', exportError);
            // Attempt to clean up partially created backup directory if export fails
            if (fs.existsSync(backupPath)) {
                fs.rmSync(backupPath, { recursive: true, force: true });
            }
            throw exportError; // Re-throw to be caught by outer try-catch
        }
        finally {
            await connection.close();
        }
    } catch (error) {
        console.error('Error in /api/db-backup:', error);
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: 'Database backup failed', error: errorMessage }, { status: 500 });
    }
}
