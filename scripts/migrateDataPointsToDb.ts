import { initializeCoreDBSchema, upsertDataPointDefinition, DataPointDefinitionDB, getDBInstance } from '../lib/duckdbClient';
import { dataPoints as originalDataPoints, DataPoint as OriginalDataPointType, IconComponentType } from '../config/dataPoints'; // Assuming original path
import { LucideIcon } from 'lucide-react';

// Helper to attempt to get a string name for an icon component
function getIconName(icon?: LucideIcon | IconComponentType): string | null {
    if (!icon) return null;
    if (typeof icon === 'function') {
        // For React functional components, .name might give the component's name
        // e.g., if icon is `Zap` from `import { Zap } from 'lucide-react'`, Zap.name should be "Zap".
        // This can be brittle if icons are passed as anonymous functions or are heavily optimized/minified.
        const name = (icon as any).displayName || icon.name;
        if (name && name.length > 1) { // Avoid single-letter minified names if possible
            return name;
        }
    }
    // If it's an object (like some Lucide icons might be structured, though typically they are functions/SvgrComponent)
    // or if .name was not useful, we might need a more robust mapping or manual entry.
    // For this script, we'll return null if a clear name isn't found.
    console.warn(`Could not determine a good string name for icon:`, icon);
    return null;
}


async function main() {
    console.log('Starting data_point_definitions migration script...');
    try {
        await initializeCoreDBSchema();
        console.log('Database schema initialized.');

        let successCount = 0;
        let errorCount = 0;

        for (const dp of originalDataPoints) {
            // Type assertion because originalDataPoints is ExtendedDataPoint[]
            const originalDP = dp as OriginalDataPointType & { phase?: string; isSinglePhase?: boolean; threePhaseGroup?: string; notes?: string; };

            const definition: Omit<DataPointDefinitionDB, 'last_modified'> = {
                id: originalDP.id,
                name: originalDP.name,
                opcua_node_id: originalDP.nodeId, // Map nodeId to opcua_node_id
                label: originalDP.label || originalDP.name, // Use name if label is empty
                data_type: originalDP.dataType,
                ui_type: originalDP.uiType || null,
                icon_name: getIconName(originalDP.icon),
                unit: originalDP.unit || null,
                min_val: typeof originalDP.min === 'number' ? originalDP.min : null,
                max_val: typeof originalDP.max === 'number' ? originalDP.max : null,
                description: originalDP.description || null,
                category: originalDP.category || null,
                factor: typeof originalDP.factor === 'number' ? originalDP.factor : null,
                precision_val: typeof originalDP.precision === 'number' ? originalDP.precision : null, // Map precision to precision_val
                is_writable: typeof originalDP.isWritable === 'boolean' ? originalDP.isWritable : false, // Default to false
                decimal_places: typeof originalDP.decimalPlaces === 'number' ? originalDP.decimalPlaces : null,
                enum_set_json: originalDP.enumSet ? JSON.stringify(originalDP.enumSet) : null,
                phase: originalDP.phase || null,
                is_single_phase: typeof originalDP.isSinglePhase === 'boolean' ? originalDP.isSinglePhase : null,
                three_phase_group: originalDP.threePhaseGroup || null,
                notes: originalDP.notes || null,
            };

            try {
                await upsertDataPointDefinition(definition);
                console.log(`Upserted data point: ${definition.id} (${definition.name})`);
                successCount++;
            } catch (error) {
                console.error(`Failed to upsert data point ${definition.id}:`, error);
                errorCount++;
            }
        }

        console.log(`\nMigration summary:`);
        console.log(`Successfully upserted: ${successCount} data points.`);
        console.log(`Failed to upsert: ${errorCount} data points.`);
        if (errorCount > 0) {
            console.warn("Some data points failed to migrate. Check logs above.");
        }
        console.log('Data point migration script finished.');

    } catch (error) {
        console.error('Error during migration process:', error);
        process.exit(1);
    } finally {
        // Ensure the DB instance is properly closed if it was opened by this script.
        // getDBInstance() manages a singleton; direct close here might affect other parts if this script was part of a larger app boot.
        // For a standalone script, it's fine.
        const instance = await getDBInstance();
        // DuckDB Node API doesn't have an explicit instance.close(). Connections are closed.
        // The process exiting will handle resource cleanup.
    }
}

main().catch(e => {
    console.error("Unhandled error in migration script main:", e);
    process.exit(1);
});
