import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';
import { seedData } from './seed';

// Open the SQLite database
const opsqlite = open({
    name: 'moneymanager.db',
});

// Create Drizzle database instance
export const db = drizzle(opsqlite, { schema });

/**
 * Initialize the database:
 * - Seed default data if empty
 */
export async function initDatabase() {
    // Check for existing settings
    const settings = await db.select().from(schema.appSettings).limit(1);

    if (settings.length === 0) {
        console.log('[Database] First launch detected. Seeding data...');
        try {
            await seedData();
            console.log('[Database] Initialization complete.');
        } catch (error) {
            console.error('[Database] Seeding failed:', error);
        }
    }
}
