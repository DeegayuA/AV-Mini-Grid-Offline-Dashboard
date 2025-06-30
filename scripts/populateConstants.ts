// scripts/populateConstants.ts
import { initializeDBSchema, upsertConstant, getDBInstance } from '../lib/duckdbClient'; // Adjust path as needed
// We need to import constants from the original file to migrate them.
// Note: This script is intended to be run from the project root (e.g., `node -r ts-node/register scripts/populateConstants.ts`)
// Make sure ts-node is installed (npm install -D ts-node) or compile it first.

// Constants that were originally in config/constants.ts
const constantsToMigrate = [
    { key: 'PLANT_NAME', value: "Mini Grid", description: "Name of the power plant." },
    { key: 'PLANT_LOCATION', value: "Athurugiriya, Colombo, Sri Lanka", description: "Geographical location of the plant." },
    { key: 'PLANT_TYPE', value: "Solar Power Plant", description: "Type of the power plant." },
    { key: 'PLANT_CAPACITY', value: "2000 kW", description: "Rated capacity of the plant." },
    { key: 'PLANT_CAPACITY_WATTS', value: "2000000", description: "Rated capacity of the plant in Watts." },
    { key: 'OPC_UA_ENDPOINT_OFFLINE', value: "opc.tcp://192.168.1.2:4840", description: "OPC UA endpoint for offline/local connection." },
    { key: 'OPC_UA_ENDPOINT_ONLINE', value: "opc.tcp://100.91.251.229:4840", description: "OPC UA endpoint for online/cloud connection." },
    { key: 'APP_NAME', value: "Mini Grid - AVR&D", description: "Application name." },
    { key: 'APP_DESCRIPTION', value: "A web-based plant monitoring system for real-time data visualization and control.", description: "Application description." },
    { key: 'APP_AUTHOR', value: "Synergy Power", description: "Application author or company." },
    // Add other constants from config/constants.ts that are suitable for DB storage
];

async function main() {
    console.log('Starting constants population script...');
    try {
        // Ensure DB schema is initialized
        await initializeDBSchema();
        console.log('Database schema initialized.');

        for (const constant of constantsToMigrate) {
            await upsertConstant(constant.key, String(constant.value), constant.description);
            console.log(`Upserted constant: ${constant.key} = ${constant.value}`);
        }

        console.log('Successfully populated constants into the database.');

    } catch (error) {
        console.error('Error populating constants:', error);
        process.exit(1); // Exit with error
    } finally {
        // Close the database instance if it was opened
        const db = await getDBInstance();
        // The @duckdb/node-api manages instance lifecycle, explicit closing of instance might not be needed
        // or could be handled differently (e.g. db.close() if available on instance, or specific connection closing)
        // For this script, we'll rely on the process exiting to clean up.
        // If this were a long-running app, connection management is more critical.
        console.log('Script finished.');
    }
}

main();
