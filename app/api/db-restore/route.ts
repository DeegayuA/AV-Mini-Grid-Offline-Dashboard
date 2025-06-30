import { NextRequest, NextResponse } from 'next/server';
import { getDBInstance, initializeDBSchema } from '@/lib/duckdbClient';
import path from 'path';
import fs from 'fs';

// Flag to ensure schema is initialized only once - might be redundant
let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        try {
            // Initialize schema to ensure the DB connection logic itself is fine,
            // though IMPORT will overwrite.
            await initializeDBSchema();
            dbInitialized = true;
            console.log('Database schema check/init from db-restore.');
        } catch (error) {
            console.error('Failed to initialize database schema from db-restore:', error);
            throw new Error('Database initialization failed');
        }
    }
}

const backupBaseDir = path.resolve(process.cwd(), 'data', 'backups');

export async function POST(request: NextRequest) { // Using POST for action
    try {
        await ensureDbInitialized();

        const body = await request.json();
        const { backupDirName } = body;

        if (!backupDirName || typeof backupDirName !== 'string') {
            return NextResponse.json({ message: 'Missing or invalid backupDirName in request body' }, { status: 400 });
        }

        const backupPath = path.resolve(backupBaseDir, backupDirName);

        if (!fs.existsSync(backupPath) || !fs.lstatSync(backupPath).isDirectory()) {
            return NextResponse.json({ message: `Backup directory not found or is not a directory: ${backupPath}` }, { status: 404 });
        }

        // IMPORTANT: IMPORT DATABASE will replace the content of the current database.
        // This is a destructive operation. In a real app, ensure proper safeguards.
        // It might be necessary to close the current dbInstance and re-open it after import,
        // or DuckDB's IMPORT handles this internally. For `fromCache`, it should manage this.

        console.warn(`Attempting to restore database from: ${backupPath}. This will overwrite the current database.`);

        const instance = await getDBInstance(); // Get the main DB instance
        const connection = await instance.connect();

        try {
            // DuckDB's IMPORT DATABASE command needs to point to the directory
            // that was created by EXPORT DATABASE.
            // No need to explicitly close the instance before IMPORT with the node API,
            // as connections are distinct from the instance's file lock.
            // However, active connections might interfere or be invalidated.
            // Best practice would be to ensure no other operations are ongoing.

            // The path for IMPORT DATABASE should be the same one used in EXPORT.
            await connection.run(`IMPORT DATABASE '${backupPath}';`);

            // After import, the schema might have changed, re-running initializeDBSchema
            // might be a good idea if the import could be from an older schema version.
            // However, for a direct backup/restore, it should be consistent.
            // Re-initialize dbInitialized flag so schema check runs on next API call if needed.
            dbInitialized = false;
            await ensureDbInitialized(); // Re-check/init schema based on new DB content

            return NextResponse.json({ message: `Database restore from ${backupDirName} successful.` }, { status: 200 });
        } catch (importError) {
             console.error('Error during database import:', importError);
             // Restore might fail mid-way, leaving DB in an inconsistent state.
             // More advanced restore would involve restoring to a new file, then swapping.
            throw importError; // Re-throw to be caught by outer try-catch
        }
        finally {
            await connection.close();
        }

    } catch (error) {
        console.error('Error in /api/db-restore:', error);
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        // Potentially add more specific error handling here if DB becomes corrupted
        return NextResponse.json({ message: 'Database restore failed', error: errorMessage }, { status: 500 });
    }
}
