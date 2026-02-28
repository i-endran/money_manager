import { useState, useEffect } from 'react';
import { eq, and, gte, lte, lt } from 'drizzle-orm';
import { db } from '../../../database';
import { transactions, accounts, categories, appSettings } from '../../../database/schema';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { getMonthRange, groupByDay } from '../../../core/utils';
import { TransactionType, SettingsKey } from '../../../core/constants';

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

            // Check carry-forward setting
            const settings = await db.select().from(appSettings);
            const carryForward = settings.find(s => s.key === SettingsKey.CARRY_FORWARD_BALANCE)?.value === 'true';

            let openingBalance = 0;
            if (carryForward) {
                // Compute all income - expense before this month
                const priorRows = await db
                    .select({ transaction: transactions })
                    .from(transactions)
                    .where(lt(transactions.date, start.toISOString()));

                priorRows.forEach(row => {
                    const txn = row.transaction;
                    if (txn.type === TransactionType.INCOME) openingBalance += txn.amount;
                    if (txn.type === TransactionType.EXPENSE) openingBalance -= txn.amount;
                });
            }

            const rows = await db
                .select({
                    transaction: transactions,
                    accountName: accounts.name,
                    toAccountName: accounts.name,
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

            // Add opening balance to income summary
            if (carryForward && openingBalance !== 0) {
                totalIncome += Math.max(0, openingBalance);
                totalExpense += Math.max(0, -openingBalance);
            }

            const grouped = groupByDay(mergedList);

            // Inject opening balance as a special section at the end (oldest date)
            if (carryForward) {
                const obDate = start.toISOString().split('T')[0];
                grouped.push({
                    title: obDate,
                    dayIncome: Math.max(0, openingBalance),
                    dayExpense: Math.max(0, -openingBalance),
                    data: [{
                        id: -1,
                        isOpeningBalance: true,
                        amount: Math.abs(openingBalance),
                        type: openingBalance >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
                        note: 'Carried forward from previous month',
                        categoryName: openingBalance >= 0 ? '📥 Opening Balance' : '📤 Opening Deficit',
                        accountName: '',
                        date: start.toISOString(),
                    }],
                });
            }

            setData(grouped);
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
