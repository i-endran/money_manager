import { useState, useEffect, useMemo } from 'react';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { db } from '../../../database';
import { transactions, accounts, categories } from '../../../database/schema';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { getMonthRange, groupByDay } from '../../../core/utils';
import { TransactionType } from '../../../core/constants';

export function useMonthlyLedger() {
    const { currentDate, refreshTick } = useLedgerStore();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

    useEffect(() => {
        async function fetchLedger() {
            setLoading(true);
            const { start, end } = getMonthRange(
                currentDate.getFullYear(),
                currentDate.getMonth(),
            );

            const rows = await db
                .select({
                    transaction: transactions,
                    accountName: accounts.name,
                    toAccountName: accounts.name, // Will need careful joins for transfer
                    categoryName: categories.name,
                    categoryIcon: categories.iconName,
                })
                .from(transactions)
                .leftJoin(accounts, eq(transactions.accountId, accounts.id))
                .leftJoin(categories, eq(transactions.categoryId, categories.id))
                .where(
                    and(
                        gte(transactions.date, start.toISOString()),
                        lte(transactions.date, end.toISOString()),
                    ),
                );

            // Merge logic for transfers (simplified for M1)
            const mergedList: any[] = [];
            const mergedIds = new Set<number>();

            let totalIncome = 0;
            let totalExpense = 0;

            rows.forEach(row => {
                const txn = row.transaction;
                if (mergedIds.has(txn.id)) return;

                if (txn.type === TransactionType.TRANSFER && txn.linkedTransactionId) {
                    mergedIds.add(txn.id);
                    mergedIds.add(txn.linkedTransactionId);
                    // In All Accounts view, we show as transfer.
                    // For now, rows contains both. For M1 "All Accounts" is the only view implemented.
                }

                if (txn.type === TransactionType.INCOME) totalIncome += txn.amount;
                if (txn.type === TransactionType.EXPENSE) totalExpense += txn.amount;

                mergedList.push({
                    ...txn,
                    accountName: row.accountName,
                    categoryName: row.categoryName,
                    categoryIcon: row.categoryIcon,
                });
            });

            setData(groupByDay(mergedList));
            setSummary({
                income: totalIncome,
                expense: totalExpense,
                balance: totalIncome - totalExpense,
            });
            setLoading(false);
        }

        fetchLedger();
    }, [currentDate, refreshTick]);

    return { data, summary, loading };
}
