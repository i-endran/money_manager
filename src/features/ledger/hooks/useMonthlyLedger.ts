import { useState, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { format } from 'date-fns';
import { db } from '../../../database';
import { accounts, appSettings } from '../../../database/schema';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { getMonthRange, groupByDay } from '../../../core/utils';
import { TransactionType, SettingsKey } from '../../../core/constants';
import {
    fetchLedgerDailySummaries,
    fetchLedgerSummaryTotals,
    fetchLedgerTransactions,
    type LedgerTransactionRow,
} from '../../../database/summarySql';

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

type LedgerItem = LedgerTransactionRow & {
    accountName: string;
    toAccountName?: string;
};

type OpeningBalanceItem = {
    id: number;
    isOpeningBalance: true;
    amount: number;
    type: TransactionType;
    effectiveType: TransactionType;
    note: string;
    categoryName: string;
    accountName: string;
    date: string;
};

type LedgerListItem = LedgerItem | OpeningBalanceItem;

type LedgerSection = {
    title: Date;
    data: LedgerListItem[];
    dayIncome: number;
    dayExpense: number;
    isOpeningBalanceSection?: boolean;
};

export function useMonthlyLedger(accountId?: number) {
    const { currentDate, refreshTick } = useLedgerStore();
    const isFocused = useIsFocused();
    const [data, setData] = useState<LedgerSection[]>([]);
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

            const startIso = start.toISOString();
            const endIso = end.toISOString();

            // Fetch all accounts into memory to resolve names & closed-box logic easily
            const [allAccounts, settings] = await Promise.all([
                db.select().from(accounts),
                db.select().from(appSettings),
            ]);
            const accountMap = new Map(allAccounts.map(a => [a.id, a]));

            // Check carry-forward setting
            const carryForward = parseStoredBoolean(
                settings.find(s => s.key === SettingsKey.CARRY_FORWARD_BALANCE)?.value,
            );

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

            const baseFilters = {
                startDate: startIso,
                endDate: endIso,
                accountId,
            };

            const [rows, dailySummaries, monthTotals, priorTotals] = await Promise.all([
                fetchLedgerTransactions(baseFilters),
                fetchLedgerDailySummaries(baseFilters),
                fetchLedgerSummaryTotals(baseFilters),
                carryForward
                    ? fetchLedgerSummaryTotals({ endDateExclusive: startIso, accountId })
                    : Promise.resolve({ incomeTotal: 0, expenseTotal: 0 }),
            ]);

            const openingBalance = carryForward
                ? priorTotals.incomeTotal - priorTotals.expenseTotal
                : 0;

            const dailySummaryMap = new Map(
                dailySummaries.map(dailySummary => [
                    dailySummary.dayKey,
                    { dayIncome: dailySummary.dayIncome, dayExpense: dailySummary.dayExpense },
                ]),
            );

            const mergedList: LedgerItem[] = rows.map(row => ({
                ...row,
                accountName: resolveAccountName(row.accountId),
                toAccountName: row.toAccountId ? resolveAccountName(row.toAccountId) : undefined,
            }));

            const grouped: LedgerSection[] = groupByDay<LedgerListItem>(mergedList).map(group => {
                const dayKey = format(group.title, 'yyyy-MM-dd');
                const daySummary = dailySummaryMap.get(dayKey);
                return {
                    ...group,
                    dayIncome: daySummary?.dayIncome ?? 0,
                    dayExpense: daySummary?.dayExpense ?? 0,
                };
            });

            // Inject opening balance as a special section at the end (oldest date)
            if (carryForward) {
                // Use start date directly to avoid timezone shifts
                const obDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                const openingBalanceItem: OpeningBalanceItem = {
                    id: -1,
                    isOpeningBalance: true,
                    amount: Math.abs(openingBalance),
                    type: openingBalance >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
                    effectiveType: openingBalance >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
                    note: 'Carried forward from previous month',
                    categoryName: openingBalance >= 0 ? '📥 Opening Balance' : '📤 Opening Deficit',
                    accountName: '',
                    date: start.toISOString(),
                };

                grouped.push({
                    title: obDate,
                    isOpeningBalanceSection: true,
                    dayIncome: Math.max(0, openingBalance),
                    dayExpense: Math.max(0, -openingBalance),
                    data: [openingBalanceItem],
                });
            }

            setData(grouped);
            setSummary({
                income: monthTotals.incomeTotal + Math.max(0, openingBalance),
                expense: monthTotals.expenseTotal + Math.max(0, -openingBalance),
                balance: (monthTotals.incomeTotal - monthTotals.expenseTotal) + openingBalance,
            });
            setLoading(false);
        }

        fetchLedger();
    }, [accountId, currentDate, refreshTick, isFocused]);

    return { data, summary, loading };
}
