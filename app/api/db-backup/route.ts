import { NextRequest, NextResponse } from 'next/server';
import { getDBInstance, ensureSchemaInitialized, DATABASE_PATH } from '@/lib/duckdbClient';
import path from 'path';
import fs from 'fs';
import { format } from 'date-fns';

const backupBaseDir = path.resolve(process.cwd(), 'data', 'backups');

export async function POST(request: NextRequest) {
    try {
        // Ensure schema is initialized more for the getDBInstance call to be safe,
        // EXPORT itself doesn't strictly need tables to be pre-defined if DB file exists.
        await ensureSchemaInitialized();

        if (!fs.existsSync(backupBaseDir)) {
            fs.mkdirSync(backupBaseDir, { recursive: true });
        }

        // It's crucial that getDBInstance() returns the instance connected to the correct DB file.
        // DATABASE_PATH from duckdbClient should point to the live database file.
        const instance = await getDBInstance();
        const connection = await instance.connect();

        const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
        const backupDirName = `backup_all_tables_${timestamp}`; // Indicate it's a full backup
        const backupPath = path.resolve(backupBaseDir, backupDirName);

        // Ensure the specific backup target directory does not already exist to avoid EXPORT error
        if (fs.existsSync(backupPath)) {
            // This case should be rare due to timestamp, but good to handle
            return NextResponse.json({ message: `Backup directory ${backupPath} already exists. Please try again.` }, { status: 409 });
        }

        try {
            console.log(`Attempting to export database to: ${backupPath}`);
            // EXPORT DATABASE specifies a directory. DuckDB will manage files within it.
            // Default format is binary, which is efficient for DuckDB to DuckDB backup/restore.
            // Using (FORMAT PARQUET) is also a good option for interoperability.
            await connection.run(`EXPORT DATABASE '${backupPath}';`);

            console.log(`Database export successful to directory: ${backupPath}`);
            return NextResponse.json({ message: `Database backup successful. Exported to directory: ${backupDirName}`, backupDir: backupDirName }, { status: 200 });
        } catch (exportError) {
            console.error('Error during database export:', exportError);
            // Attempt to clean up partially created backup directory if export fails
            if (fs.existsSync(backupPath)) {
                try {
                    fs.rmSync(backupPath, { recursive: true, force: true });
                } catch (cleanupError) {
                    console.error(`Failed to cleanup partial backup directory ${backupPath}:`, cleanupError);
                }
            }
            throw exportError;
        } finally {
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
