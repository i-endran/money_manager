import { db } from './index';
import * as schema from './schema';
import {
    DEFAULT_SETTINGS,
    SEED_ACCOUNTS,
    SEED_CATEGORIES,
    SettingsKey,
} from '../core/constants';

/**
 * Seed data into the database if and only if it's currently empty.
 */
export async function seedData() {
    const now = new Date().toISOString();

    // 1. Seed Settings
    console.log('Seeding settings...');
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await db.insert(schema.appSettings).values({
            key: key as string,
            value: JSON.stringify(value),
        });
    }

    // 2. Seed Accounts
    console.log('Seeding accounts...');
    for (const acc of SEED_ACCOUNTS) {
        await db.insert(schema.accounts).values({
            name: acc.name,
            type: acc.type,
            iconName: acc.iconName,
            initialBalance: acc.initialBalance,
            createdAt: now,
            isActive: true,
        });
    }

    // 3. Seed Categories (Flat pass first for level 1)
    console.log('Seeding categories...');
    // Since categories have parents, we seed level by level
    for (let level = 1; level <= 3; level++) {
        const categoriesForLevel = SEED_CATEGORIES.filter(c => c.level === level);

        for (const cat of categoriesForLevel) {
            let parentId: number | null = null;

            if (cat.parentRef) {
                const parent = await db
                    .select()
                    .from(schema.categories)
                    .where(sql`name = ${cat.parentRef}`)
                    .limit(1);
                if (parent.length > 0) {
                    parentId = parent[0].id;
                }
            }

            await db.insert(schema.categories).values({
                name: cat.name,
                type: cat.type,
                iconName: cat.iconName,
                level: cat.level,
                parentId: parentId,
                isActive: true,
            });
        }
    }
}

// Helper for raw sql (drizzle doesn't export sql from op-sqlite index easily sometimes)
import { sql } from 'drizzle-orm';
