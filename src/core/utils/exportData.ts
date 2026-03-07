import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { db } from '../../database';
import { accounts, appSettings, categories, transactions } from '../../database/schema';

export type ExportFormat = 'csv' | 'xlsx';

export interface ExportPayload {
    filename: string;
    mimeType: string;
    dataUri: string;
}

function normalizeStoredValue(value: string): string {
    const trimmed = value.trim();
    const isJsonString = trimmed.startsWith('"') && trimmed.endsWith('"');
    const isJsonBoolean = trimmed === 'true' || trimmed === 'false';

    if (!isJsonString && !isJsonBoolean) return value;

    try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed === 'string' ? parsed : String(parsed);
    } catch {
        return value;
    }
}

function formatDateTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return format(date, 'yyyy-MM-dd HH:mm:ss');
}

function createSheet(rows: Record<string, unknown>[], headers: string[]) {
    return XLSX.utils.json_to_sheet(rows, { header: headers });
}

export async function createExportPayload(exportFormat: ExportFormat): Promise<ExportPayload> {
    const [accountRows, categoryRows, transactionRows, settingRows] = await Promise.all([
        db.select().from(accounts),
        db.select().from(categories),
        db.select().from(transactions),
        db.select().from(appSettings),
    ]);

    const accountNameById = new Map(accountRows.map(account => [account.id, account.name]));
    const categoryNameById = new Map(categoryRows.map(category => [category.id, category.name]));

    const transactionsSheetRows = [...transactionRows]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(transaction => ({
            Date: formatDateTime(transaction.date),
            Type: transaction.type,
            Amount: transaction.amount,
            Account: accountNameById.get(transaction.accountId) || '',
            'To Account': transaction.toAccountId ? accountNameById.get(transaction.toAccountId) || '' : '',
            Category: categoryNameById.get(transaction.categoryId) || '',
            Note: transaction.note,
            Description: transaction.description || '',
            'Linked Transaction ID': transaction.linkedTransactionId || '',
            'Created At': formatDateTime(transaction.createdAt),
            'Updated At': formatDateTime(transaction.updatedAt),
        }));

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const transactionsHeaders = [
        'Date',
        'Type',
        'Amount',
        'Account',
        'To Account',
        'Category',
        'Note',
        'Description',
        'Linked Transaction ID',
        'Created At',
        'Updated At',
    ];

    if (exportFormat === 'csv') {
        const workbook = XLSX.utils.book_new();
        const sheet = createSheet(transactionsSheetRows, transactionsHeaders);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Transactions');
        const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'csv' });

        return {
            filename: `pocket-log-transactions-${timestamp}.csv`,
            mimeType: 'text/csv',
            dataUri: `data:text/csv;base64,${base64}`,
        };
    }

    const accountsSheetRows = accountRows.map(account => ({
        ID: account.id,
        Name: account.name,
        Type: account.type,
        'Initial Balance': account.initialBalance,
        'Settlement Day': account.settlementDay,
        'Parent Account': account.parentId ? accountNameById.get(account.parentId) || '' : '',
        'Sort Order': account.sortOrder,
        'Is Active': account.isActive ? 'true' : 'false',
        'Exclude From Summaries': account.excludeFromSummaries ? 'true' : 'false',
        'Created At': formatDateTime(account.createdAt),
    }));

    const categoriesSheetRows = categoryRows.map(category => ({
        ID: category.id,
        Name: category.name,
        Type: category.type,
        Level: category.level,
        'Parent Category': category.parentId ? categoryNameById.get(category.parentId) || '' : '',
        Icon: category.iconName,
        'Is Active': category.isActive ? 'true' : 'false',
    }));

    const settingsSheetRows = settingRows.map(setting => ({
        Key: setting.key,
        Value: normalizeStoredValue(setting.value),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createSheet(transactionsSheetRows, transactionsHeaders), 'Transactions');
    XLSX.utils.book_append_sheet(workbook, createSheet(accountsSheetRows, [
        'ID',
        'Name',
        'Type',
        'Initial Balance',
        'Settlement Day',
        'Parent Account',
        'Sort Order',
        'Is Active',
        'Exclude From Summaries',
        'Created At',
    ]), 'Accounts');
    XLSX.utils.book_append_sheet(workbook, createSheet(categoriesSheetRows, [
        'ID',
        'Name',
        'Type',
        'Level',
        'Parent Category',
        'Icon',
        'Is Active',
    ]), 'Categories');
    XLSX.utils.book_append_sheet(workbook, createSheet(settingsSheetRows, ['Key', 'Value']), 'Settings');

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    return {
        filename: `pocket-log-export-${timestamp}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dataUri: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`,
    };
}
