import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';

// Open the SQLite database
const opsqlite = open({
    name: 'moneymanager.db',
});

// Create Drizzle database instance
export const db = drizzle(opsqlite, { schema });

/**
 * Initialize the database:
 * - Run migrations (if any - for now we'll rely on manual table creation for M1 simplicity if kit-ready isn't easy in RN)
 * - Seed default data if empty
 */
export async function initDatabase() {
    // In a real production app with drizzle-kit, we would run migrations here.
    // For Milestone 1, we ensure tables exist and seed data.

    // Checking if accounts exist as a proxy for first run
    const existingAccounts = await db.select().from(schema.accounts).limit(1);

    if (existingAccounts.length === 0) {
        console.log('Seed data needed. Initializing...');
        // Seed logic will call back into core/constants/seed
    }
}
