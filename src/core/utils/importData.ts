import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { eq } from 'drizzle-orm';
import { db } from '../../database';
import { accounts, appSettings, categories, transactions } from '../../database/schema';
import { DEFAULT_SETTINGS, TransactionType } from '../constants';
import type { ExportPayload } from './exportData';

type SheetRow = Record<string, unknown>;

export interface ImportResult {
    mode: 'replace' | 'append';
    accounts: number;
    categories: number;
    transactions: number;
    settings: number;
    skipped: number;
}

type NormalizedTransaction = {
    date: string;
    type: string;
    amount: number;
    accountName: string;
    toAccountName: string;
    categoryName: string;
    note: string;
    description: string;
    createdAt: string;
    updatedAt: string;
};

function createSheet(rows: SheetRow[], headers: string[]) {
    return XLSX.utils.json_to_sheet(rows, { header: headers });
}

function getCell(row: SheetRow, keys: string[]): string {
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
}

function getSheetRows(workbook: XLSX.WorkBook, targetName: string): SheetRow[] {
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === targetName.toLowerCase());
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: '' });
}

function parseBoolean(value: string, defaultValue: boolean): boolean {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return defaultValue;
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
    return defaultValue;
}

function parseNumber(value: string, defaultValue = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeDateTime(value: string, fallback: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function normalizeType(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (normalized === TransactionType.INCOME) return TransactionType.INCOME;
    if (normalized === TransactionType.EXPENSE) return TransactionType.EXPENSE;
    if (normalized === TransactionType.TRANSFER) return TransactionType.TRANSFER;
    return '';
}

function parseTransactions(rows: SheetRow[], now: string): NormalizedTransaction[] {
    return rows.map(row => ({
        date: normalizeDateTime(getCell(row, ['Date', 'date']), now),
        type: normalizeType(getCell(row, ['Type', 'type'])),
        amount: parseNumber(getCell(row, ['Amount', 'amount']), NaN),
        accountName: getCell(row, ['Account', 'account']),
        toAccountName: getCell(row, ['To Account', 'to_account', 'toAccount']),
        categoryName: getCell(row, ['Category', 'category']),
        note: getCell(row, ['Note', 'note']),
        description: getCell(row, ['Description', 'description']),
        createdAt: normalizeDateTime(getCell(row, ['Created At', 'created_at']), now),
        updatedAt: normalizeDateTime(getCell(row, ['Updated At', 'updated_at']), now),
    }));
}

async function importTransactionsRows(
    tx: any,
    rows: NormalizedTransaction[],
    accountIdByName: Map<string, number>,
    categoryIdByName: Map<string, number>,
): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
        if (!row.type || !Number.isFinite(row.amount) || row.amount <= 0 || !row.accountName) {
            skipped += 1;
            continue;
        }

        const accountId = accountIdByName.get(row.accountName);
        if (!accountId) {
            skipped += 1;
            continue;
        }

        if (row.type === TransactionType.TRANSFER) {
            const toAccountId = accountIdByName.get(row.toAccountName);
            if (!toAccountId) {
                skipped += 1;
                continue;
            }

            const [first] = await tx.insert(transactions).values({
                amount: row.amount,
                type: TransactionType.TRANSFER,
                accountId,
                toAccountId,
                categoryId: 0,
                note: row.note,
                description: row.description,
                date: row.date,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            }).returning({ insertedId: transactions.id });

            const [second] = await tx.insert(transactions).values({
                amount: row.amount,
                type: TransactionType.TRANSFER,
                accountId: toAccountId,
                toAccountId: accountId,
                categoryId: 0,
                note: row.note,
                description: row.description,
                date: row.date,
                linkedTransactionId: first.insertedId,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            }).returning({ insertedId: transactions.id });

            await tx.update(transactions)
                .set({ linkedTransactionId: second.insertedId })
                .where(eq(transactions.id, first.insertedId));

            inserted += 2;
            continue;
        }

        const categoryId = categoryIdByName.get(row.categoryName);
        if (!categoryId) {
            skipped += 1;
            continue;
        }

        await tx.insert(transactions).values({
            amount: row.amount,
            type: row.type,
            accountId,
            categoryId,
            note: row.note,
            description: row.description,
            date: row.date,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        });
        inserted += 1;
    }

    return { inserted, skipped };
}

export function createImportTemplatePayload(formatType: 'csv' | 'xlsx'): ExportPayload {
    const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

    const transactionsTemplate = [{
        Date: now,
        Type: 'expense',
        Amount: 250.5,
        Account: 'Cash Wallet',
        'To Account': '',
        Category: 'Food',
        Note: 'Lunch',
        Description: 'Imported from template',
        'Created At': now,
        'Updated At': now,
    }];

    if (formatType === 'csv') {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, createSheet(transactionsTemplate, [
            'Date',
            'Type',
            'Amount',
            'Account',
            'To Account',
            'Category',
            'Note',
            'Description',
            'Created At',
            'Updated At',
        ]), 'Transactions');
        const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'csv' });
        return {
            filename: 'pocket-log-import-template.csv',
            mimeType: 'text/csv',
            dataUri: `data:text/csv;base64,${base64}`,
        };
    }

    const accountsTemplate = [{
        Name: 'Cash Wallet',
        Type: 'cash',
        'Initial Balance': 1000,
        'Parent Account': '',
        'Sort Order': 0,
        'Is Active': 'true',
        'Exclude From Summaries': 'false',
    }];

    const categoriesTemplate = [{
        Name: 'Food',
        Type: 'expense',
        Level: 1,
        'Parent Category': '',
        Icon: '🍔',
        'Is Active': 'true',
    }];

    const settingsTemplate = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
        Key: key,
        Value: String(value),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createSheet(transactionsTemplate, [
        'Date',
        'Type',
        'Amount',
        'Account',
        'To Account',
        'Category',
        'Note',
        'Description',
        'Created At',
        'Updated At',
    ]), 'Transactions');
    XLSX.utils.book_append_sheet(workbook, createSheet(accountsTemplate, [
        'Name',
        'Type',
        'Initial Balance',
        'Parent Account',
        'Sort Order',
        'Is Active',
        'Exclude From Summaries',
    ]), 'Accounts');
    XLSX.utils.book_append_sheet(workbook, createSheet(categoriesTemplate, [
        'Name',
        'Type',
        'Level',
        'Parent Category',
        'Icon',
        'Is Active',
    ]), 'Categories');
    XLSX.utils.book_append_sheet(workbook, createSheet(settingsTemplate, ['Key', 'Value']), 'Settings');

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    return {
        filename: 'pocket-log-import-template.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dataUri: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`,
    };
}

export async function importDataFromWorkbookBuffer(buffer: ArrayBuffer): Promise<ImportResult> {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const now = new Date().toISOString();

    const transactionRowsRaw = getSheetRows(workbook, 'Transactions');
    const accountRowsRaw = getSheetRows(workbook, 'Accounts');
    const categoryRowsRaw = getSheetRows(workbook, 'Categories');
    const settingRowsRaw = getSheetRows(workbook, 'Settings');

    const fullRestore = accountRowsRaw.length > 0 || categoryRowsRaw.length > 0 || settingRowsRaw.length > 0;

    if (!fullRestore) {
        const existingAccounts = await db.select().from(accounts);
        const existingCategories = await db.select().from(categories);
        const accountIdByName = new Map(existingAccounts.map(row => [row.name, row.id]));
        const categoryIdByName = new Map(existingCategories.map(row => [row.name, row.id]));

        let importedTransactions = 0;
        let skipped = 0;
        await db.transaction(async tx => {
            const parsedRows = parseTransactions(transactionRowsRaw, now);
            const result = await importTransactionsRows(tx, parsedRows, accountIdByName, categoryIdByName);
            importedTransactions += result.inserted;
            skipped += result.skipped;
        });

        return {
            mode: 'append',
            accounts: 0,
            categories: 0,
            transactions: importedTransactions,
            settings: 0,
            skipped,
        };
    }

    let importedAccounts = 0;
    let importedCategories = 0;
    let importedTransactions = 0;
    let importedSettings = 0;
    let skipped = 0;

    await db.transaction(async tx => {
        await tx.delete(transactions);
        await tx.delete(categories);
        await tx.delete(accounts);
        await tx.delete(appSettings);

        const accountIdByName = new Map<string, number>();
        const pendingAccounts = accountRowsRaw
            .map((row, index) => ({
                name: getCell(row, ['Name', 'name']),
                type: getCell(row, ['Type', 'type']).toLowerCase() || 'bank',
                initialBalance: parseNumber(getCell(row, ['Initial Balance', 'initial_balance']), 0),
                parentName: getCell(row, ['Parent Account', 'parent_account']),
                sortOrder: parseNumber(getCell(row, ['Sort Order', 'sort_order']), index * 10),
                isActive: parseBoolean(getCell(row, ['Is Active', 'is_active']), true),
                excludeFromSummaries: parseBoolean(getCell(row, ['Exclude From Summaries', 'exclude_from_summaries']), false),
            }))
            .filter(row => row.name);

        let unresolved = [...pendingAccounts];
        while (unresolved.length > 0) {
            const remaining: typeof unresolved = [];
            let insertedThisRound = 0;

            for (const row of unresolved) {
                const parentId = row.parentName ? accountIdByName.get(row.parentName) : null;
                if (row.parentName && !parentId) {
                    remaining.push(row);
                    continue;
                }

                const [inserted] = await tx.insert(accounts).values({
                    name: row.name,
                    type: row.type,
                    initialBalance: parentId ? 0 : row.initialBalance,
                    iconName: parentId ? 'subdirectory-arrow-right' : '🏦',
                    isActive: row.isActive,
                    parentId: parentId || null,
                    sortOrder: row.sortOrder,
                    excludeFromSummaries: row.excludeFromSummaries,
                    createdAt: now,
                }).returning({ insertedId: accounts.id });

                if (inserted?.insertedId) {
                    accountIdByName.set(row.name, inserted.insertedId);
                    importedAccounts += 1;
                    insertedThisRound += 1;
                } else {
                    skipped += 1;
                }
            }

            if (insertedThisRound === 0 && remaining.length > 0) {
                for (const row of remaining) {
                    const [inserted] = await tx.insert(accounts).values({
                        name: row.name,
                        type: row.type,
                        initialBalance: row.initialBalance,
                        iconName: '🏦',
                        isActive: row.isActive,
                        parentId: null,
                        sortOrder: row.sortOrder,
                        excludeFromSummaries: row.excludeFromSummaries,
                        createdAt: now,
                    }).returning({ insertedId: accounts.id });

                    if (inserted?.insertedId) {
                        accountIdByName.set(row.name, inserted.insertedId);
                        importedAccounts += 1;
                    } else {
                        skipped += 1;
                    }
                }
                break;
            }

            unresolved = remaining;
        }

        const categoryIdByName = new Map<string, number>();
        const categoriesSorted = categoryRowsRaw
            .map(row => ({
                name: getCell(row, ['Name', 'name']),
                type: getCell(row, ['Type', 'type']).toLowerCase() || 'expense',
                level: parseNumber(getCell(row, ['Level', 'level']), 1),
                parentName: getCell(row, ['Parent Category', 'parent_category']),
                iconName: getCell(row, ['Icon', 'icon']) || 'tag',
                isActive: parseBoolean(getCell(row, ['Is Active', 'is_active']), true),
            }))
            .filter(row => row.name)
            .sort((a, b) => a.level - b.level);

        for (const row of categoriesSorted) {
            const parentId = row.parentName ? categoryIdByName.get(row.parentName) : null;
            const [inserted] = await tx.insert(categories).values({
                name: row.name,
                type: row.type,
                level: row.level,
                parentId: parentId || null,
                iconName: row.iconName,
                isActive: row.isActive,
            }).returning({ insertedId: categories.id });

            if (inserted?.insertedId) {
                categoryIdByName.set(row.name, inserted.insertedId);
                importedCategories += 1;
            } else {
                skipped += 1;
            }
        }

        const parsedTransactions = parseTransactions(transactionRowsRaw, now);
        const importedTxnResult = await importTransactionsRows(tx, parsedTransactions, accountIdByName, categoryIdByName);
        importedTransactions += importedTxnResult.inserted;
        skipped += importedTxnResult.skipped;

        const settingsMap = new Map<string, string>(
            Object.entries(DEFAULT_SETTINGS).map(([key, value]) => [key, String(value)]),
        );
        for (const row of settingRowsRaw) {
            const key = getCell(row, ['Key', 'key']);
            if (!key) continue;
            settingsMap.set(key, getCell(row, ['Value', 'value']));
        }

        for (const [key, value] of settingsMap.entries()) {
            await tx.insert(appSettings).values({ key, value });
            importedSettings += 1;
        }
    });

    return {
        mode: 'replace',
        accounts: importedAccounts,
        categories: importedCategories,
        transactions: importedTransactions,
        settings: importedSettings,
        skipped,
    };
}
