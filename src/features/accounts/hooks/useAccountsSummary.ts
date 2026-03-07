import { useCallback, useState } from 'react';
import { AccountType } from '../../../core/constants';
import {
    isLoanLikeType,
    liabilityAmountFromBalance,
} from '../../../core/utils';
import {
    fetchAccountBalanceRows,
    fetchCardBreakdownDeltas,
} from '../../../database/summarySql';

export type AccountBalanceItem = {
    id: number;
    name: string;
    type: string;
    parentId: number | null;
    sortOrder: number;
    initialBalance: number;
    isLoanLike: boolean;
    isClosedBoxLike: boolean;
    balance: number;
    settlementDay: number;
};

export type AccountWithReserves = AccountBalanceItem & {
    reserves: AccountBalanceItem[];
};

export type AccountGroup = {
    type: string;
    label: string;
    accounts: AccountWithReserves[];
    total: number;
    isLoanLike: boolean;
    isClosedBoxType: boolean;
};

export type AccountTypeBalanceItem = {
    type: string;
    balance: number;
    count: number;
    isLoanLike: boolean;
};

export type CardBreakdownItem = {
    id: number;
    name: string;
    billGenerated: number;
    current: number;
    total: number;
    settlementDay: number;
};

type SummaryState = {
    assets: number;
    liabilities: number;
    totalBalance: number;
    standingBalance: number;
    overallDebt: number;
    cardDebt: number;
    debtDebt: number;
    accounts: AccountBalanceItem[];
    groups: AccountGroup[];
    typeBalances: AccountTypeBalanceItem[];
    cardBreakdowns: CardBreakdownItem[];
};

const GROUP_ORDER = [
    AccountType.CASH,
    AccountType.BANK,
    AccountType.CARD,
    AccountType.DEPOSITS,
    AccountType.WALLET,
    AccountType.DEBT,
    AccountType.CUSTOM,
];

const GROUP_LABELS: Record<string, string> = {
    [AccountType.CASH]: 'Cash',
    [AccountType.BANK]: 'Accounts',
    [AccountType.CARD]: 'Card',
    [AccountType.DEPOSITS]: 'Deposits',
    [AccountType.WALLET]: 'Top-Up/Prepaid',
    [AccountType.DEBT]: 'Debt',
    [AccountType.CUSTOM]: 'Custom',
};

function createEmptySummary(): SummaryState {
    return {
        assets: 0,
        liabilities: 0,
        totalBalance: 0,
        standingBalance: 0,
        overallDebt: 0,
        cardDebt: 0,
        debtDebt: 0,
        accounts: [],
        groups: [],
        typeBalances: [],
        cardBreakdowns: [],
    };
}

function getLatestSettlementCutoff(now: Date, settlementDay: number): Date {
    const boundedDay = Math.max(1, Math.min(31, settlementDay || 28));
    const thisMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const thisMonthCutoff = new Date(
        now.getFullYear(),
        now.getMonth(),
        Math.min(boundedDay, thisMonthLastDay),
        23,
        59,
        59,
        999,
    );

    if (now >= thisMonthCutoff) return thisMonthCutoff;

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthLastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
    return new Date(
        prevMonth.getFullYear(),
        prevMonth.getMonth(),
        Math.min(boundedDay, prevMonthLastDay),
        23,
        59,
        59,
        999,
    );
}

export function useAccountsSummary() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<SummaryState>(createEmptySummary());

    const load = useCallback(async () => {
        setLoading(true);
        try {

            const accountRows = await fetchAccountBalanceRows();

            const accountBalances: AccountBalanceItem[] = accountRows.map(account => ({
                id: account.id,
                name: account.name,
                type: account.type,
                parentId: account.parentId,
                sortOrder: account.sortOrder,
                initialBalance: account.initialBalance,
                isLoanLike: account.isLoanLike,
                isClosedBoxLike: account.isClosedBoxLike,
                balance: account.balance,
                settlementDay: account.settlementDay || 28,
            }));

            const totals = accountBalances.reduce(
                (acc, item) => {
                    if (item.isLoanLike) {
                        acc.liabilities += liabilityAmountFromBalance(item.balance);
                    } else {
                        acc.assets += item.balance;
                        if (!item.isClosedBoxLike) {
                            acc.standingBalance += item.balance;
                        }
                    }

                    if (item.type === AccountType.CARD) {
                        acc.cardDebt += liabilityAmountFromBalance(item.balance);
                        acc.cardAccounts.push(item);
                    } else if (item.type === AccountType.DEBT) {
                        acc.debtDebt += liabilityAmountFromBalance(item.balance);
                    }

                    const existing = acc.typeBalanceMap.get(item.type);
                    if (existing) {
                        existing.balance += item.balance;
                        existing.count += 1;
                    } else {
                        acc.typeBalanceMap.set(item.type, {
                            type: item.type,
                            balance: item.balance,
                            count: 1,
                            isLoanLike: item.isLoanLike,
                        });
                    }

                    return acc;
                },
                {
                    assets: 0,
                    liabilities: 0,
                    standingBalance: 0,
                    cardDebt: 0,
                    debtDebt: 0,
                    cardAccounts: [] as AccountBalanceItem[],
                    typeBalanceMap: new Map<string, AccountTypeBalanceItem>(),
                },
            );

            const totalBalance = totals.standingBalance - totals.liabilities;
            const now = new Date();
            const cardCutoffs = totals.cardAccounts.map(item => ({
                accountId: item.id,
                cutoff: getLatestSettlementCutoff(now, item.settlementDay).toISOString(),
            }));
            const cardDeltaRows = await fetchCardBreakdownDeltas(cardCutoffs);
            const cardDeltaMap = new Map(cardDeltaRows.map(row => [row.accountId, row]));
            const cardBreakdowns: CardBreakdownItem[] = totals.cardAccounts.map(item => {
                const deltas = cardDeltaMap.get(item.id);
                const billGenerated = item.initialBalance + (deltas?.billedDelta ?? 0);
                const current = deltas?.currentDelta ?? 0;

                return {
                    id: item.id,
                    name: item.name,
                    billGenerated,
                    current,
                    total: billGenerated + current,
                    settlementDay: item.settlementDay,
                };
            });

            const roots = accountBalances.filter(item => item.parentId === null);
            const reservesByParent = new Map<number, AccountBalanceItem[]>();
            accountBalances
                .filter(item => item.parentId !== null)
                .forEach(item => {
                    const parentId = item.parentId as number;
                    const reserves = reservesByParent.get(parentId) || [];
                    reserves.push(item);
                    reservesByParent.set(parentId, reserves);
                });

            const groups: AccountGroup[] = GROUP_ORDER.map(type => {
                const rootAccounts = roots.filter(item => item.type === type);
                if (rootAccounts.length === 0) return null;

                const groupedAccounts: AccountWithReserves[] = rootAccounts.map(item => {
                    const reserves = (reservesByParent.get(item.id) || []).sort((a, b) => {
                        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
                        return a.name.localeCompare(b.name);
                    });
                    return {
                        ...item,
                        reserves,
                    };
                });

                const total = groupedAccounts.reduce((sum, item) => {
                    const reserveTotal = item.reserves.reduce((reserveSum, reserve) => reserveSum + reserve.balance, 0);
                    return sum + item.balance + reserveTotal;
                }, 0);
                const groupRows = groupedAccounts.flatMap(item => [item, ...item.reserves]);
                const isClosedBoxType = groupRows.length > 0 && groupRows.every(item => item.isClosedBoxLike);

                return {
                    type,
                    label: GROUP_LABELS[type] || type,
                    accounts: groupedAccounts,
                    total,
                    isLoanLike: isLoanLikeType(type),
                    isClosedBoxType,
                };
            }).filter((group): group is AccountGroup => Boolean(group));

            setSummary({
                assets: totals.assets,
                liabilities: totals.liabilities,
                totalBalance,
                standingBalance: totals.standingBalance,
                overallDebt: totals.cardDebt + totals.debtDebt,
                cardDebt: totals.cardDebt,
                debtDebt: totals.debtDebt,
                accounts: accountBalances,
                groups,
                typeBalances: Array.from(totals.typeBalanceMap.values()),
                cardBreakdowns,
            });
        } catch (error) {
            console.error('Failed to load accounts summary:', error);
            setSummary(createEmptySummary());
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        summary,
        load,
    };
}
