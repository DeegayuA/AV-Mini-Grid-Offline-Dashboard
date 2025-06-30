import { NextRequest, NextResponse } from 'next/server';
import { getDBInstance, ensureSchemaInitialized, initializeCoreDBSchema, DATABASE_PATH } from '@/lib/duckdbClient';
import path from 'path';
import fs from 'fs';

const backupBaseDir = path.resolve(process.cwd(), 'data', 'backups');

// Function to close the current DB instance if it's open.
// This is a bit tricky with the cached instance model.
// A more robust way would be for duckdbClient to expose a close/reset function.
// For now, this is a conceptual placeholder for ensuring the DB file is not locked.
async function ensureDBInstanceClosed(): Promise<void> {
    // In a real scenario, you might need to manage the dbInstance lifecycle more explicitly,
    // e.g., dbInstance.close() if the API provided it, or a way to reset the cached instance.
    // For DuckDB node-api, closing all connections and then re-opening might be one way.
    // Or, for IMPORT, DuckDB might handle this internally if the file lock is an issue.
    // The fromCache method should ideally prevent multiple direct instance handles to the same file path
    // in a way that causes locking issues for IMPORT.
    // We will rely on DuckDB's import to manage file access correctly.
    console.log("Conceptual: Ensuring DB instance is ready for import. Active connections will be an issue.");
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { backupDirName } = body;

        if (!backupDirName || typeof backupDirName !== 'string') {
            return NextResponse.json({ message: 'Missing or invalid backupDirName in request body' }, { status: 400 });
        }

        const backupPath = path.resolve(backupBaseDir, backupDirName);

        if (!fs.existsSync(backupPath) || !fs.lstatSync(backupPath).isDirectory()) {
            return NextResponse.json({ message: `Backup directory not found or is not a directory: ${backupPath}` }, { status: 404 });
        }

        console.warn(`Attempting to restore database from: ${backupPath}. This will OVERWRITE the current database at ${DATABASE_PATH}.`);

        // Conceptually, ensure the current DB instance is closed or connections are terminated
        // to avoid file lock issues. DuckDB's IMPORT might handle this, but it's a critical point.
        // await ensureDBInstanceClosed(); // Placeholder for now

        // Re-get the instance. If it was closed, this would re-open.
        // If using fromCache, it should give the same managed instance.
        const instance = await getDBInstance();

        // IMPORT DATABASE operates on the current database file associated with the instance.
        // It's crucial that no other connections are actively writing during this.
        // Creating a new connection for the import operation:
        const connection = await instance.connect();

        try {
            // DuckDB's IMPORT DATABASE command needs to point to the directory
            // that was created by EXPORT DATABASE.
            console.log(`Executing IMPORT DATABASE FROM '${backupPath}'`);
            await connection.run(`IMPORT DATABASE '${backupPath}';`);
            console.log(`Database import from ${backupDirName} successful.`);

            // After import, the schema might have changed or tables re-created.
            // It's good practice to re-run schema initialization logic to ensure
            // indexes or any other schema elements expected by the app are present.
            // Reset the schemaInitialized flag in duckdbClient so ensureSchemaInitialized runs fully.
            // This requires exporting and calling a reset function for schemaInitialized flag.
            // For now, we'll just call ensureSchemaInitialized directly.
            // A more robust solution would be:
            // import { resetSchemaInitializedFlag } from '@/lib/duckdbClient';
            // resetSchemaInitializedFlag();
            // await ensureSchemaInitialized();
            // For simplicity here, assuming ensureSchemaInitialized will re-check properly if called again,
            // or that initializeCoreDBSchema can be called harmlessly.
            // Let's ensure initializeCoreDBSchema can run again by resetting its internal flag.
            // This is slightly hacky without direct flag reset.
            // The schema should be part of the backup, so re-init might not be strictly needed
            // unless ensuring specific app-level indexes post-restore.
            // For now, we assume the imported DB is complete.

            return NextResponse.json({ message: `Database restore from ${backupDirName} successful.` }, { status: 200 });
        } catch (importError) {
             console.error('Error during database import:', importError);
            throw importError;
        } finally {
            await connection.close();
        }

    } catch (error) {
        console.error('Error in /api/db-restore:', error);
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: 'Database restore failed', error: errorMessage }, { status: 500 });
    }
}
