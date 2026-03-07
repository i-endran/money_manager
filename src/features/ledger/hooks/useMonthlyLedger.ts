import { useState, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { eq, and, or, gte, lte, lt } from 'drizzle-orm';
import { db } from '../../../database';
import { transactions, accounts, categories, appSettings } from '../../../database/schema';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { getMonthRange, groupByDay, isClosedBoxLikeAccount } from '../../../core/utils';
import { TransactionType, SettingsKey } from '../../../core/constants';

function parseStoredBoolean(value?: string): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    try {
        const parsed = JSON.parse(trimmed);
        return parsed === true || parsed === 'true';
    } catch {
        return false;
    }
}

export function useMonthlyLedger(accountId?: number) {
    const { currentDate, refreshTick } = useLedgerStore();
    const isFocused = useIsFocused();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

    useEffect(() => {
        if (!isFocused) return;

        async function fetchLedger() {
            setLoading(true);
            const { start, end } = getMonthRange(
                currentDate.getFullYear(),
                currentDate.getMonth(),
            );

            // Fetch all accounts into memory to resolve names & closed-box logic easily
            const allAccounts = await db.select().from(accounts);
            const accountMap = new Map(allAccounts.map(a => [a.id, a]));

            // Check carry-forward setting
            const settings = await db.select().from(appSettings);
            const carryForward = parseStoredBoolean(
                settings.find(s => s.key === SettingsKey.CARRY_FORWARD_BALANCE)?.value,
            );

            const accountFilter =
                typeof accountId === 'number'
                    ? or(
                          eq(transactions.accountId, accountId),
                          and(
                              eq(transactions.type, TransactionType.TRANSFER),
                              eq(transactions.toAccountId, accountId),
                          ),
                      )
                    : undefined;

            let openingBalance = 0;
            if (carryForward) {
                // Compute all income - expense before this month
                const priorRowsQuery = db
                    .select({ transaction: transactions })
                    .from(transactions)
                    .where(
                        accountFilter
                            ? and(lt(transactions.date, start.toISOString()), accountFilter)
                            : lt(transactions.date, start.toISOString()),
                    );
                const priorRows = await priorRowsQuery;
                const sortedPriorRows = [...priorRows].sort((a, b) => a.transaction.id - b.transaction.id);

                const priorIds = new Set<number>();
                sortedPriorRows.forEach(row => {
                    const txn = row.transaction;
                    if (priorIds.has(txn.id)) return;

                    if (txn.type === TransactionType.TRANSFER && txn.linkedTransactionId) {
                        priorIds.add(txn.id);
                        priorIds.add(txn.linkedTransactionId);

                        const fromAcc = accountMap.get(txn.accountId);
                        const toAcc = txn.toAccountId ? accountMap.get(txn.toAccountId) : null;

                        if (fromAcc && toAcc) {
                            if (!isClosedBoxLikeAccount(fromAcc) && isClosedBoxLikeAccount(toAcc)) {
                                openingBalance -= txn.amount;
                            } else if (isClosedBoxLikeAccount(fromAcc) && !isClosedBoxLikeAccount(toAcc)) {
                                openingBalance += txn.amount;
                            }
                        }
                    } else if (txn.type === TransactionType.INCOME) {
                        openingBalance += txn.amount;
                    } else if (txn.type === TransactionType.EXPENSE) {
                        openingBalance -= txn.amount;
                    }
                });
            }

            const resolveAccountName = (accId?: number | null) => {
                if (!accId) return 'Unknown';
                const acc = accountMap.get(accId);
                if (!acc) return 'Unknown';
                if (!acc.parentId) return acc.name;

                const parent = accountMap.get(acc.parentId);
                if (parent) {
                    const pName = parent.name.length > 5 ? parent.name.substring(0, 5) + '..' : parent.name;
                    return `${pName} > ${acc.name}`;
                }
                return acc.name;
            };

            const rowsQuery = db
                .select({
                    transaction: transactions,
                    categoryName: categories.name,
                    categoryIcon: categories.iconName,
                })
                .from(transactions)
                .leftJoin(categories, eq(transactions.categoryId, categories.id))
                .where(
                    accountFilter
                        ? and(
                              gte(transactions.date, start.toISOString()),
                              lte(transactions.date, end.toISOString()),
                              accountFilter,
                          )
                        : and(
                              gte(transactions.date, start.toISOString()),
                              lte(transactions.date, end.toISOString()),
                          ),
                );
            const rows = await rowsQuery;
            const sortedRows = [...rows].sort((a, b) => a.transaction.id - b.transaction.id);

            // Merge logic for transfers
            const mergedList: any[] = [];
            const mergedIds = new Set<number>();

            let totalIncome = 0;
            let totalExpense = 0;

            sortedRows.forEach(row => {
                const txn = row.transaction;
                if (mergedIds.has(txn.id)) return;

                let effectiveType = txn.type;

                if (txn.type === TransactionType.TRANSFER && txn.linkedTransactionId) {
                    mergedIds.add(txn.id);
                    mergedIds.add(txn.linkedTransactionId);

                    const fromAcc = accountMap.get(txn.accountId);
                    const toAcc = txn.toAccountId ? accountMap.get(txn.toAccountId) : null;

                    if (fromAcc && toAcc) {
                        if (!isClosedBoxLikeAccount(fromAcc) && isClosedBoxLikeAccount(toAcc)) {
                            effectiveType = TransactionType.EXPENSE;
                            totalExpense += txn.amount;
                        } else if (isClosedBoxLikeAccount(fromAcc) && !isClosedBoxLikeAccount(toAcc)) {
                            effectiveType = TransactionType.INCOME;
                            totalIncome += txn.amount;
                        }
                    }
                } else if (txn.type === TransactionType.INCOME) {
                    totalIncome += txn.amount;
                } else if (txn.type === TransactionType.EXPENSE) {
                    totalExpense += txn.amount;
                }

                mergedList.push({
                    ...txn,
                    effectiveType,
                    accountName: resolveAccountName(txn.accountId),
                    toAccountName: txn.toAccountId ? resolveAccountName(txn.toAccountId) : undefined,
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
                // Use start date directly to avoid timezone shifts
                const obDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                grouped.push({
                    title: obDate,
                    isOpeningBalanceSection: true,
                    dayIncome: Math.max(0, openingBalance),
                    dayExpense: Math.max(0, -openingBalance),
                    data: [{
                        id: -1,
                        isOpeningBalance: true,
                        amount: Math.abs(openingBalance),
                        type: openingBalance >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
                        effectiveType: openingBalance >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
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
    }, [accountId, currentDate, refreshTick, isFocused]);

    return { data, summary, loading };
}
