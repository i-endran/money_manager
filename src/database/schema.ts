import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Accounts Table
export const accounts = sqliteTable('accounts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type').notNull(), // bank | cash | card | wallet | custom
    initialBalance: real('initial_balance').default(0).notNull(),
    iconName: text('icon_name').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    parentId: integer('parent_id'),
    sortOrder: integer('sort_order').default(0).notNull(),
    excludeFromSummaries: integer('exclude_from_summaries', { mode: 'boolean' }).default(false).notNull(),
    settlementDay: integer('settlement_day').default(10).notNull(),
    createdAt: text('created_at').notNull(),
});

// Categories Table
export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // Supports emoji
    parentId: integer('parent_id'),
    level: integer('level').notNull(), // 1 | 2 | 3
    type: text('type').notNull(), // expense | income | both
    iconName: text('icon_name').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

// Transactions Table
export const transactions = sqliteTable('transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    amount: real('amount').notNull(),
    type: text('type').notNull(), // expense | income | transfer
    accountId: integer('account_id')
        .notNull()
        .references(() => accounts.id),
    toAccountId: integer('to_account_id').references(() => accounts.id),
    categoryId: integer('category_id')
        .notNull()
        .references(() => categories.id),
    note: text('note').notNull(),
    description: text('description'),
    date: text('date').notNull(), // ISO string or YYYY-MM-DD
    linkedTransactionId: integer('linked_transaction_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
});

// Settings Table (Key-Value)
export const appSettings = sqliteTable('app_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(), // JSON string
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Setting = typeof appSettings.$inferSelect;
