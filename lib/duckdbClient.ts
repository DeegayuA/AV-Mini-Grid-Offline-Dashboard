import * as duckdb from '@duckdb/node-api';
import path from 'path';

// Define the path for the database file
// Store it in a 'data' directory in the project root for better organization
const dbDir = path.resolve(process.cwd(), 'data');
const dbPath = path.resolve(dbDir, 'ranna_operations_data.db');

// Ensure the data directory exists (Node.js specific, fs.mkdirSync)
// This part would ideally be handled by a setup script or on application start.
// For now, we'll assume the directory might need creation.
import fs from 'fs';
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance: duckdb.DuckDBInstance | null = null;

/**
 * Initializes the DuckDB database instance.
 * Uses a cached instance to avoid issues with multiple connections to the same file.
 * @returns {Promise<duckdb.DuckDBInstance>} The DuckDB instance.
 */
export async function getDBInstance(): Promise<duckdb.DuckDBInstance> {
    if (!dbInstance) {
        // console.log(`Initializing DuckDB instance at: ${dbPath}`);
        // Using fromCache to ensure only one instance attaches to the same database file.
        dbInstance = await duckdb.DuckDBInstance.fromCache(dbPath);
    }
    return dbInstance;
}

/**
 * Initializes the database schema, creating tables and indexes if they don't exist.
 */
export async function initializeDBSchema(): Promise<void> {
    const instance = await getDBInstance();
    const connection = await instance.connect();
    console.log('Successfully connected to DuckDB.');

    try {
        await connection.run(`
            CREATE TABLE IF NOT EXISTS constants (
                key VARCHAR PRIMARY KEY,
                value VARCHAR,
                description TEXT,
                last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table "constants" ensured.');

        await connection.run(`
            CREATE TABLE IF NOT EXISTS node_data (
                timestamp TIMESTAMPTZ NOT NULL,
                node_id VARCHAR NOT NULL,
                value DOUBLE,
                PRIMARY KEY (timestamp, node_id)
            );
        `);
        console.log('Table "node_data" ensured.');

        // Create indexes for faster queries on node_data
        // Index on timestamp for time-series queries
        await connection.run(`
            CREATE INDEX IF NOT EXISTS idx_node_data_timestamp ON node_data (timestamp);
        `);
        console.log('Index "idx_node_data_timestamp" on "node_data" ensured.');

        // Index on node_id for queries specific to a node
        await connection.run(`
            CREATE INDEX IF NOT EXISTS idx_node_data_node_id ON node_data (node_id);
        `);
        console.log('Index "idx_node_data_node_id" on "node_data" ensured.');

        console.log('Database schema initialized successfully.');

    } catch (err) {
        console.error('Error initializing database schema:', err);
        throw err; // Re-throw the error to be handled by the caller
    } finally {
        // It's important to close the connection
        await connection.close();
    }
}

/**
 * A utility function to get a new database connection.
 * The caller is responsible for closing the connection.
 * @returns {Promise<duckdb.DuckDBConnection>} A new DuckDB connection.
 */
export async function getDBConnection(): Promise<duckdb.DuckDBConnection> {
    const instance = await getDBInstance();
    return instance.connect();
}

// Example of how to initialize the schema when this module is loaded,
// or more likely, this would be called at application startup.
// For now, let's export it to be called explicitly.
// (async () => {
//     try {
//         await initializeDBSchema();
//     } catch (e) {
//         console.error("Failed to initialize database schema on module load", e);
//     }
// })();

/**
 * Inserts a new data point into the node_data table.
 * @param timestamp The timestamp of the data point.
 * @param nodeId The ID of the node.
 * @param value The value of the data point.
 */
export async function insertNodeData(timestamp: Date, nodeId: string, value: number): Promise<void> {
    const connection = await getDBConnection();
    try {
        // DuckDB's Node.js API uses ISO 8601 strings for TIMESTAMP / TIMESTAMPTZ
        const tsString = timestamp.toISOString();
        const stmt = await connection.prepare('INSERT INTO node_data (timestamp, node_id, value) VALUES (?, ?, ?)');
        await stmt.run(tsString, nodeId, value);
        await stmt.finalize(); // Finalize statement
        // console.log(`Data inserted for node ${nodeId}: ${value} at ${tsString}`);
    } catch (error) {
        console.error('Error inserting node data:', error);
        // Decide if to throw, or handle (e.g. if it's a PK violation, maybe log and ignore)
        // For PK violations (timestamp, node_id already exists), DuckDB will throw an error.
        // Depending on requirements, you might want an UPSERT here, or log and continue.
        // Example: Error: Constraint Error: PRIMARY KEY constraint failed: node_data.timestamp, node_data.node_id
        if (error instanceof Error && error.message.includes('PRIMARY KEY constraint failed')) {
            console.warn(`Attempted to insert duplicate data for node ${nodeId} at ${timestamp.toISOString()}. Skipping.`);
        } else {
            throw error; // Re-throw other errors
        }
    } finally {
        await connection.close();
    }
}

/**
 * Upserts a constant into the constants table.
 * If the key exists, its value and description are updated. Otherwise, a new record is inserted.
 * @param key The key of the constant.
 * @param value The value of the constant.
 * @param description An optional description for the constant.
 */
export async function upsertConstant(key: string, value: string, description?: string): Promise<void> {
    const connection = await getDBConnection();
    try {
        const stmt = await connection.prepare(`
            INSERT INTO constants (key, value, description, last_modified)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                description = EXCLUDED.description,
                last_modified = CURRENT_TIMESTAMP;
        `);
        await stmt.run(key, value, description || null); // Ensure description is null if undefined
        await stmt.finalize();
        // console.log(`Constant upserted: ${key} = ${value}`);
    } catch (error) {
        console.error('Error upserting constant:', error);
        throw error;
    } finally {
        await connection.close();
    }
}

/**
 * Retrieves a constant from the constants table.
 * @param key The key of the constant to retrieve.
 * @returns {Promise<string | null>} The value of the constant, or null if not found.
 */
export async function getConstant(key: string): Promise<string | null> {
    const connection = await getDBConnection();
    try {
        const result = await connection.all('SELECT value FROM constants WHERE key = ?', key);
        if (result.length > 0 && result[0].value !== undefined) {
            return result[0].value as string;
        }
        return null;
    } catch (error) {
        console.error('Error retrieving constant:', error);
        throw error;
    } finally {
        await connection.close();
    }
}

/**
 * Retrieves all constants from the constants table.
 * @returns {Promise<Array<{key: string, value: string, description: string | null, last_modified: Date}>>} All constants.
 */
export async function getAllConstants(): Promise<Array<{key: string, value: string, description: string | null, last_modified: Date}>> {
    const connection = await getDBConnection();
    try {
        const result = await connection.all('SELECT key, value, description, last_modified FROM constants');
        return result.map(row => ({
            key: row.key as string,
            value: row.value as string,
            description: row.description as string | null,
            // DuckDB returns timestamps as microseconds since epoch for TIMESTAMPTZ in some contexts,
            // or Date objects. The node-api should give Date objects.
            last_modified: row.last_modified instanceof Date ? row.last_modified : new Date(row.last_modified as number / 1000) // Assuming microseconds if not Date
        }));
    } catch (error) {
        console.error('Error retrieving all constants:', error);
        throw error;
    } finally {
        await connection.close();
    }
}
