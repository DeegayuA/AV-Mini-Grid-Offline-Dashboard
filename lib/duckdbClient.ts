import * as duckdb from '@duckdb/node-api';
import path from 'path';
import fs from 'fs';

// Define the path for the database file
// Store it in a 'data' directory in the project root for better organization
const projectRoot = process.cwd();
const dbDir = path.resolve(projectRoot, 'data');
const dbPath = path.resolve(dbDir, 'ranna_operations_data.db');

// Ensure the data directory exists
function ensureDataDirectoryExists(): void {
    if (!fs.existsSync(dbDir)) {
        try {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`Data directory created: ${dbDir}`);
        } catch (error) {
            console.error(`Error creating data directory ${dbDir}:`, error);
            throw error; // Propagate error if directory creation fails
        }
    }
}

// Call it once when the module is loaded.
try {
    ensureDataDirectoryExists();
} catch (e) {
    // If this fails, subsequent DB operations will likely also fail.
    console.error("Critical error: Could not ensure data directory exists. Exiting or disabling DB features might be necessary.");
}


let dbInstance: duckdb.DuckDBInstance | null = null;
let schemaInitialized = false; // Flag to track schema initialization

/**
 * Initializes and returns the DuckDB database instance.
 * Uses a cached instance to avoid issues with multiple connections to the same file.
 * @returns {Promise<duckdb.DuckDBInstance>} The DuckDB instance.
 */
export async function getDBInstance(): Promise<duckdb.DuckDBInstance> {
    if (!dbInstance) {
        try {
            ensureDataDirectoryExists(); // Ensure directory exists before creating instance
            // console.log(`Initializing DuckDB instance at: ${dbPath}`);
            dbInstance = await duckdb.DuckDBInstance.fromCache(dbPath);
        } catch (error) {
            console.error(`Failed to initialize DuckDB instance at ${dbPath}:`, error);
            throw error; // Propagate error
        }
    }
    return dbInstance;
}

/**
 * A utility function to get a new database connection.
 * The caller is responsible for closing the connection.
 * @returns {Promise<duckdb.DuckDBConnection>} A new DuckDB connection.
 */
export async function getDBConnection(): Promise<duckdb.DuckDBConnection> {
    try {
        const instance = await getDBInstance();
        const connection = await instance.connect();
        return connection;
    } catch (error) {
        console.error('Failed to get DuckDB connection:', error);
        throw error; // Propagate error
    }
}

/**
 * Initializes the core database schema, creating tables and indexes if they don't exist.
 */
export async function initializeCoreDBSchema(): Promise<void> {
    if (schemaInitialized) {
        // console.log('Schema already initialized, skipping.');
        return;
    }

    console.log('Attempting to initialize core database schema...');
    const connection = await getDBConnection(); // Ensure this call is robust

    try {
        // Constants Table
        await connection.run(`
            CREATE TABLE IF NOT EXISTS constants (
                key VARCHAR PRIMARY KEY,
                value VARCHAR,
                description TEXT,
                last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table "constants" ensured.');

        // Node Data Table (for time-series)
        await connection.run(`
            CREATE TABLE IF NOT EXISTS node_data (
                timestamp TIMESTAMPTZ NOT NULL,
                node_id VARCHAR NOT NULL, /* This will store the OPC UA Node ID, e.g., "ns=4;i=3" */
                value DOUBLE,
                PRIMARY KEY (timestamp, node_id)
            );
        `);
        await connection.run(`CREATE INDEX IF NOT EXISTS idx_node_data_timestamp ON node_data (timestamp ASC);`); // Explicit ASC for clarity
        await connection.run(`CREATE INDEX IF NOT EXISTS idx_node_data_node_id ON node_data (node_id);`);
        console.log('Table "node_data" and its indexes ensured.');

        // Data Point Definitions Table
        await connection.run(`
            CREATE TABLE IF NOT EXISTS data_point_definitions (
                id VARCHAR PRIMARY KEY,            -- e.g., "power-on-voltage", "sim_temp_1"
                name VARCHAR NOT NULL,             -- e.g., "Power On Voltage"
                opcua_node_id VARCHAR NOT NULL UNIQUE, -- e.g., "ns=4;i=3", "ns=2;s=SimTemp1" - made UNIQUE
                label VARCHAR,                     -- User-friendly label for UI
                data_type VARCHAR NOT NULL,        -- e.g., 'Int16', 'Float', 'Boolean'
                ui_type VARCHAR,                   -- e.g., 'display', 'gauge', 'switch', 'input'
                icon_name VARCHAR,                 -- e.g., "Zap", "Thermometer" (string name of Lucide icon)
                unit VARCHAR,                      -- e.g., "V", "°C", "%"
                min_val DOUBLE,                    -- Renamed from 'min'
                max_val DOUBLE,                    -- Renamed from 'max'
                description TEXT,
                category VARCHAR,
                factor DOUBLE,
                precision_val INTEGER,             -- Renamed from 'precision'
                is_writable BOOLEAN DEFAULT FALSE,
                decimal_places INTEGER,
                enum_set_json VARCHAR,             -- JSON string for enumSet: Record<number | string, string>
                phase VARCHAR,                     -- e.g., 'a', 'b', 'c', 'x'
                is_single_phase BOOLEAN,
                three_phase_group VARCHAR,
                notes TEXT,
                last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Index on opcua_node_id is already created due to UNIQUE constraint in some DBs, but explicit index is fine
        // await connection.run(`CREATE INDEX IF NOT EXISTS idx_dp_def_opcua_node_id ON data_point_definitions (opcua_node_id);`);
        await connection.run(`CREATE INDEX IF NOT EXISTS idx_dp_def_category ON data_point_definitions (category);`);
        console.log('Table "data_point_definitions" and its indexes ensured.');

        console.log('Database schema initialized successfully.');
        schemaInitialized = true;

    } catch (err) {
        console.error('Error initializing core database schema:', err);
        schemaInitialized = false;
        throw err;
    } finally {
        await connection.close();
        console.log('Database connection closed after schema initialization attempt.');
    }
}

/**
 * Checks if the schema has been initialized and calls the actual initialization if not.
 */
export async function ensureSchemaInitialized(): Promise<void> {
    if (!schemaInitialized) {
        // console.log("ensureSchemaInitialized: Triggering schema initialization...");
        await initializeCoreDBSchema();
    } else {
        // console.log("ensureSchemaInitialized: Schema already initialized.");
    }
}

// Export the path for reference if needed by other parts like backup/restore scripts
export const DATABASE_PATH = dbPath;
export const DATABASE_DIR = dbDir;

// --- CRUD for data_point_definitions ---

export interface DataPointDefinitionDB {
    id: string;
    name: string;
    opcua_node_id: string;
    label?: string | null;
    data_type: string;
    ui_type?: string | null;
    icon_name?: string | null;
    unit?: string | null;
    min_val?: number | null;
    max_val?: number | null;
    description?: string | null;
    category?: string | null;
    factor?: number | null;
    precision_val?: number | null;
    is_writable?: boolean | null;
    decimal_places?: number | null;
    enum_set_json?: string | null; // Stored as JSON string
    phase?: string | null;
    is_single_phase?: boolean | null;
    three_phase_group?: string | null;
    notes?: string | null;
    last_modified?: Date | string; // Input can be string, output will be Date
}

// Helper to convert boolean to 0/1 for DuckDB and nulls
const dbValue = (val: any) => {
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val === undefined ? null : val;
};


export async function createDataPointDefinition(definition: Omit<DataPointDefinitionDB, 'last_modified'>): Promise<DataPointDefinitionDB> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const query = `
            INSERT INTO data_point_definitions (
                id, name, opcua_node_id, label, data_type, ui_type, icon_name, unit,
                min_val, max_val, description, category, factor, precision_val, is_writable,
                decimal_places, enum_set_json, phase, is_single_phase, three_phase_group, notes,
                last_modified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            RETURNING *;`;

        const result = await conn.all(query,
            definition.id, definition.name, definition.opcua_node_id, dbValue(definition.label), definition.data_type,
            dbValue(definition.ui_type), dbValue(definition.icon_name), dbValue(definition.unit), dbValue(definition.min_val),
            dbValue(definition.max_val), dbValue(definition.description), dbValue(definition.category), dbValue(definition.factor),
            dbValue(definition.precision_val), dbValue(definition.is_writable), dbValue(definition.decimal_places),
            dbValue(definition.enum_set_json), dbValue(definition.phase), dbValue(definition.is_single_phase),
            dbValue(definition.three_phase_group), dbValue(definition.notes)
        );
        if (result.length === 0) {
            throw new Error('Failed to create data point definition, no rows returned.');
        }
        return result[0] as DataPointDefinitionDB;
    } finally {
        await conn.close();
    }
}

export async function getAllDataPointDefinitions(): Promise<DataPointDefinitionDB[]> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const result = await conn.all('SELECT * FROM data_point_definitions ORDER BY name ASC;');
        return result as DataPointDefinitionDB[];
    } finally {
        await conn.close();
    }
}

export async function getDataPointDefinitionById(id: string): Promise<DataPointDefinitionDB | null> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const result = await conn.all('SELECT * FROM data_point_definitions WHERE id = ?;', id);
        return result.length > 0 ? result[0] as DataPointDefinitionDB : null;
    } finally {
        await conn.close();
    }
}

export async function getDataPointDefinitionByOpcuaNodeId(opcuaNodeId: string): Promise<DataPointDefinitionDB | null> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const result = await conn.all('SELECT * FROM data_point_definitions WHERE opcua_node_id = ?;', opcuaNodeId);
        return result.length > 0 ? result[0] as DataPointDefinitionDB : null;
    } finally {
        await conn.close();
    }
}


export async function updateDataPointDefinition(id: string, updates: Partial<Omit<DataPointDefinitionDB, 'id' | 'opcua_node_id' | 'last_modified'>>): Promise<DataPointDefinitionDB | null> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'opcua_node_id' && k !== 'last_modified');
        if (fields.length === 0) {
            return getDataPointDefinitionById(id); // No actual fields to update
        }
        const setClauses = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
        const values = fields.map(field => dbValue((updates as any)[field]));

        const query = `
            UPDATE data_point_definitions
            SET ${setClauses}, last_modified = CURRENT_TIMESTAMP
            WHERE id = $${fields.length + 1}
            RETURNING *;`;

        const result = await conn.all(query, ...values, id);
        return result.length > 0 ? result[0] as DataPointDefinitionDB : null;
    } finally {
        await conn.close();
    }
}

export async function deleteDataPointDefinition(id: string): Promise<boolean> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        // Using run for DELETE as it doesn't return rows directly in the same way.
        // We can check changes property of the statement if supported, or just assume success if no error.
        // For DuckDB, .run() returns a Statement object, but we can't easily get affected rows from it directly without preparing.
        // A common pattern is to execute and if it doesn't throw, assume success.
        // Or, select before delete, then try delete, then select again.
        // For simplicity:
        await conn.exec(`DELETE FROM data_point_definitions WHERE id = '${id.replace(/'/g, "''")}';`); // Basic sanitation for id
        // To confirm deletion, one might try to fetch it:
        // const check = await getDataPointDefinitionById(id); // This would open a new connection
        // return !check;
        return true; // Assume success if no error is thrown
    } catch (error) {
        console.error(`Error deleting data point definition ${id}:`, error);
        return false;
    }
    finally {
        await conn.close();
    }
}

export async function upsertDataPointDefinition(definition: Omit<DataPointDefinitionDB, 'last_modified'>): Promise<DataPointDefinitionDB> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const { id, name, opcua_node_id, label, data_type, ui_type, icon_name, unit, min_val, max_val, description, category, factor, precision_val, is_writable, decimal_places, enum_set_json, phase, is_single_phase, three_phase_group, notes } = definition;

        // Note: opcua_node_id UNIQUE constraint means if ID exists but opcua_node_id is different, this will fail.
        // This is generally desired: an 'id' should always map to the same opcua_node_id.
        // If opcua_node_id needs to change for a given 'id', it might imply deleting the old and creating a new one.
        const query = `
            INSERT INTO data_point_definitions (
                id, name, opcua_node_id, label, data_type, ui_type, icon_name, unit,
                min_val, max_val, description, category, factor, precision_val, is_writable,
                decimal_places, enum_set_json, phase, is_single_phase, three_phase_group, notes,
                last_modified
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                opcua_node_id = EXCLUDED.opcua_node_id,
                label = EXCLUDED.label,
                data_type = EXCLUDED.data_type,
                ui_type = EXCLUDED.ui_type,
                icon_name = EXCLUDED.icon_name,
                unit = EXCLUDED.unit,
                min_val = EXCLUDED.min_val,
                max_val = EXCLUDED.max_val,
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                factor = EXCLUDED.factor,
                precision_val = EXCLUDED.precision_val,
                is_writable = EXCLUDED.is_writable,
                decimal_places = EXCLUDED.decimal_places,
                enum_set_json = EXCLUDED.enum_set_json,
                phase = EXCLUDED.phase,
                is_single_phase = EXCLUDED.is_single_phase,
                three_phase_group = EXCLUDED.three_phase_group,
                notes = EXCLUDED.notes,
                last_modified = CURRENT_TIMESTAMP
            RETURNING *;`;

        const result = await conn.all(query,
            id, name, opcua_node_id, dbValue(label), data_type,
            dbValue(ui_type), dbValue(icon_name), dbValue(unit), dbValue(min_val),
            dbValue(max_val), dbValue(description), dbValue(category), dbValue(factor),
            dbValue(precision_val), dbValue(is_writable), dbValue(decimal_places),
            dbValue(enum_set_json), dbValue(phase), dbValue(is_single_phase),
            dbValue(three_phase_group), dbValue(notes)
        );
        if (result.length === 0) {
            throw new Error(`Failed to upsert data point definition with id ${id}, no rows returned.`);
        }
        // DuckDB's node client should return boolean values directly for BOOLEAN columns.
        // The dbValue helper converts JS booleans to 0/1 for insertion if column type was INTEGER,
        // but for BOOLEAN column type, direct boolean values or 0/1 work for insertion.
        // The RETURNING * should give us values in their JS native types as mapped by the driver.
        return result[0] as DataPointDefinitionDB;
    } finally {
        await conn.close();
    }
}


// --- END CRUD for data_point_definitions ---

// --- CRUD for constants ---

export interface ConstantDB {
    key: string;
    value: string;
    description?: string | null;
    last_modified?: Date | string;
}

/**
 * Upserts a constant into the constants table.
 * If the key exists, its value and description are updated. Otherwise, a new record is inserted.
 */
export async function upsertConstant(key: string, value: string, description?: string | null): Promise<ConstantDB> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const query = `
            INSERT INTO constants (key, value, description, last_modified)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                description = EXCLUDED.description,
                last_modified = CURRENT_TIMESTAMP
            RETURNING *;`; // DuckDB supports RETURNING for INSERT ON CONFLICT

        const result = await conn.all(query, key, value, dbValue(description));
        if (result.length === 0) {
            throw new Error(`Failed to upsert constant with key ${key}, no rows returned.`);
        }
        return result[0] as ConstantDB;
    } finally {
        await conn.close();
    }
}

/**
 * Retrieves a constant from the constants table.
 * @param key The key of the constant to retrieve.
 * @returns {Promise<ConstantDB | null>} The constant object, or null if not found.
 */
export async function getConstant(key: string): Promise<ConstantDB | null> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const result = await conn.all('SELECT key, value, description, last_modified FROM constants WHERE key = ?;', key);
        return result.length > 0 ? (result[0] as ConstantDB) : null;
    } finally {
        await conn.close();
    }
}

/**
 * Retrieves all constants from the constants table.
 * @returns {Promise<ConstantDB[]>} All constants.
 */
export async function getAllConstants(): Promise<ConstantDB[]> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        const result = await conn.all('SELECT key, value, description, last_modified FROM constants ORDER BY key ASC;');
        return result as ConstantDB[];
    } finally {
        await conn.close();
    }
}

/**
 * Deletes a constant from the constants table.
 * @param key The key of the constant to delete.
 * @returns {Promise<boolean>} True if deletion was successful or constant didn't exist, false on error.
 */
export async function deleteConstant(key: string): Promise<boolean> {
    await ensureSchemaInitialized();
    const conn = await getDBConnection();
    try {
        await conn.exec(`DELETE FROM constants WHERE key = '${key.replace(/'/g, "''")}';`);
        return true; // Assume success if no error
    } catch (error) {
        console.error(`Error deleting constant ${key}:`, error);
        return false;
    } finally {
        await conn.close();
    }
}

// --- END CRUD for constants ---

// --- Time-series data functions ---

/**
 * Inserts a new data point into the node_data table.
 * @param timestamp The timestamp of the data point.
 * @param nodeId The OPC UA Node ID of the node.
 * @param value The value of the data point.
 */
export async function insertNodeData(timestamp: Date, nodeId: string, value: number): Promise<void> {
    await ensureSchemaInitialized(); // Ensures node_data table exists
    const connection = await getDBConnection();
    try {
        const tsString = timestamp.toISOString();
        // Using prepare is safer and often more performant for repeated inserts, though less critical here.
        const stmt = await connection.prepare('INSERT INTO node_data (timestamp, node_id, value) VALUES (?, ?, ?)');
        await stmt.run(tsString, nodeId, value);
        await stmt.finalize();
    } catch (error) {
        // Handle potential PK violation (timestamp, node_id already exists)
        if (error instanceof Error && error.message.includes('PRIMARY KEY constraint failed')) {
            console.warn(`Attempted to insert duplicate data for node ${nodeId} at ${timestamp.toISOString()}. Skipping.`);
        } else {
            console.error('Error inserting node data:', error);
            throw error; // Re-throw other errors
        }
    } finally {
        await connection.close();
    }
}

export interface NodeDataPoint {
    timestamp: Date; // Or string if transformed by API layer
    value: number;
}

/**
 * Retrieves node data for a specific node_id within a given time range.
 * @param nodeId The OPC UA Node ID.
 * @param startTime Start of the time range.
 * @param endTime End of the time range.
 * @param limit Optional limit on the number of points.
 * @returns {Promise<NodeDataPoint[]>} Array of data points.
 */
export async function getNodeDataInRange(nodeId: string, startTime: Date, endTime: Date, limit?: number): Promise<NodeDataPoint[]> {
    await ensureSchemaInitialized();
    const connection = await getDBConnection();
    try {
        let query = `
            SELECT timestamp, value
            FROM node_data
            WHERE node_id = ? AND timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp ASC`;

        const params: (string | number | Date)[] = [nodeId, startTime.toISOString(), endTime.toISOString()];

        if (limit && limit > 0) {
            query += ` LIMIT ?`;
            params.push(limit);
        }
        query += ';';

        const results = await connection.all(query, ...params);

        // DuckDB Node API returns Date objects for TIMESTAMPTZ
        return results.map(row => ({
            timestamp: row.timestamp as Date,
            value: row.value as number,
        }));
    } finally {
        await connection.close();
    }
}

// --- END Time-series data functions ---


export const PROJECT_ROOT = projectRoot;

// Global error handler for unhandled promise rejections, useful for debugging DB issues
if (typeof process !== 'undefined') {
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
}
