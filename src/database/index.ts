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
 * - Create tables if they don't exist
 * - Seed default data if empty
 */
export async function initDatabase() {
    // Create tables if they don't exist
    await opsqlite.execute(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        initial_balance REAL DEFAULT 0 NOT NULL,
        icon_name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT NOT NULL
    )`);

    await opsqlite.execute(`CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
    )`);

    await opsqlite.execute(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        parent_id INTEGER,
        level INTEGER NOT NULL,
        type TEXT NOT NULL,
        icon_name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL
    )`);

    await opsqlite.execute(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        account_id INTEGER NOT NULL,
        to_account_id INTEGER,
        category_id INTEGER NOT NULL,
        note TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        linked_transaction_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
        FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE NO ACTION
    )`);

    // Migration: Add new columns to accounts table for Milestone 2
    try {
        await opsqlite.execute(`ALTER TABLE accounts ADD COLUMN parent_id INTEGER`);
    } catch (e) {
        // Column might already exist
    }

    try {
        await opsqlite.execute(`ALTER TABLE accounts ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL`);
    } catch (e) {
        // Column might already exist
    }

    try {
        await opsqlite.execute(`ALTER TABLE accounts ADD COLUMN exclude_from_summaries INTEGER DEFAULT 0 NOT NULL`);
    } catch (e) {
        // Column might already exist
    }

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
