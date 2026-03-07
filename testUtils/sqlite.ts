import Database from 'better-sqlite3';

type AccountSeed = {
    id: number;
    name: string;
    type: string;
    initialBalance?: number;
    excludeFromSummaries?: number;
    settlementDay?: number;
    isActive?: number;
    parentId?: number | null;
    sortOrder?: number;
};

type TransactionSeed = {
    id: number;
    amount: number;
    type: string;
    accountId: number;
    toAccountId?: number | null;
    categoryId?: number;
    note?: string;
    description?: string | null;
    date: string;
    linkedTransactionId?: number | null;
};

const DEFAULT_ICON = 'icon';
const DEFAULT_CREATED_AT = '2024-06-01T00:00:00.000Z';
const DEFAULT_UPDATED_AT = '2024-06-01T00:00:00.000Z';

export function createInMemoryDatabase() {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
        CREATE TABLE accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            initial_balance REAL DEFAULT 0 NOT NULL,
            icon_name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1 NOT NULL,
            parent_id INTEGER,
            sort_order INTEGER DEFAULT 0 NOT NULL,
            exclude_from_summaries INTEGER DEFAULT 0 NOT NULL,
            settlement_day INTEGER DEFAULT 28 NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );

        CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            name TEXT NOT NULL,
            parent_id INTEGER,
            level INTEGER NOT NULL,
            type TEXT NOT NULL,
            icon_name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1 NOT NULL
        );

        CREATE TABLE transactions (
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
        );
    `);

    return db;
}

export function seedSummaryFixture(db: Database.Database) {
    const insertAccount = db.prepare(`
        INSERT INTO accounts (
            id,
            name,
            type,
            initial_balance,
            icon_name,
            is_active,
            parent_id,
            sort_order,
            exclude_from_summaries,
            settlement_day,
            created_at
        ) VALUES (
            @id,
            @name,
            @type,
            @initialBalance,
            @iconName,
            @isActive,
            @parentId,
            @sortOrder,
            @excludeFromSummaries,
            @settlementDay,
            @createdAt
        );
    `);

    const insertCategory = db.prepare(`
        INSERT INTO categories (
            id,
            name,
            parent_id,
            level,
            type,
            icon_name,
            is_active
        ) VALUES (
            @id,
            @name,
            @parentId,
            @level,
            @type,
            @iconName,
            @isActive
        );
    `);

    const insertTransaction = db.prepare(`
        INSERT INTO transactions (
            id,
            amount,
            type,
            account_id,
            to_account_id,
            category_id,
            note,
            description,
            date,
            linked_transaction_id,
            created_at,
            updated_at
        ) VALUES (
            @id,
            @amount,
            @type,
            @accountId,
            @toAccountId,
            @categoryId,
            @note,
            @description,
            @date,
            @linkedTransactionId,
            @createdAt,
            @updatedAt
        );
    `);

    const transaction = db.transaction((accounts: AccountSeed[], transactions: TransactionSeed[]) => {
        insertCategory.run({
            id: 1,
            name: 'General',
            parentId: null,
            level: 1,
            type: 'expense',
            iconName: '🧾',
            isActive: 1,
        });

        accounts.forEach(account =>
            insertAccount.run({
                initialBalance: 0,
                iconName: DEFAULT_ICON,
                isActive: 1,
                parentId: null,
                sortOrder: 0,
                excludeFromSummaries: 0,
                settlementDay: 28,
                createdAt: DEFAULT_CREATED_AT,
                ...account,
            }),
        );

        transactions.forEach(txn =>
            insertTransaction.run({
                categoryId: 1,
                note: 'note',
                description: null,
                toAccountId: null,
                linkedTransactionId: null,
                createdAt: DEFAULT_CREATED_AT,
                updatedAt: DEFAULT_UPDATED_AT,
                ...txn,
            }),
        );
    });

    transaction(
        [
            {
                id: 1,
                name: 'Checking',
                type: 'bank',
                initialBalance: 1000,
            },
            {
                id: 2,
                name: 'Vault',
                type: 'bank',
                initialBalance: 500,
                excludeFromSummaries: 1,
            },
            {
                id: 3,
                name: 'Card',
                type: 'card',
                initialBalance: 200,
                settlementDay: 10,
            },
            {
                id: 4,
                name: 'Loan',
                type: 'debt',
                initialBalance: 1000,
            },
        ],
        [
            {
                id: 1,
                amount: 150,
                type: 'transfer',
                accountId: 1,
                toAccountId: 2,
                linkedTransactionId: 2,
                date: '2024-06-03T12:00:00.000Z',
            },
            {
                id: 2,
                amount: 150,
                type: 'transfer',
                accountId: 2,
                toAccountId: 1,
                linkedTransactionId: 1,
                date: '2024-06-03T12:00:00.000Z',
            },
            {
                id: 3,
                amount: 80,
                type: 'transfer',
                accountId: 2,
                toAccountId: 1,
                linkedTransactionId: 4,
                date: '2024-06-08T12:00:00.000Z',
            },
            {
                id: 4,
                amount: 80,
                type: 'transfer',
                accountId: 1,
                toAccountId: 2,
                linkedTransactionId: 3,
                date: '2024-06-08T12:00:00.000Z',
            },
            {
                id: 5,
                amount: 1000,
                type: 'income',
                accountId: 1,
                date: '2024-06-02T09:00:00.000Z',
            },
            {
                id: 6,
                amount: 200,
                type: 'expense',
                accountId: 1,
                date: '2024-06-05T09:00:00.000Z',
            },
            {
                id: 7,
                amount: 50,
                type: 'expense',
                accountId: 3,
                date: '2024-06-05T10:00:00.000Z',
            },
            {
                id: 8,
                amount: 70,
                type: 'expense',
                accountId: 3,
                date: '2024-06-12T10:00:00.000Z',
            },
            {
                id: 9,
                amount: 100,
                type: 'expense',
                accountId: 4,
                date: '2024-06-07T10:00:00.000Z',
            },
        ],
    );
}
