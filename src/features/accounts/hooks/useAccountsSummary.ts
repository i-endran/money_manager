import { useCallback, useRef, useState } from 'react';
import { AccountType } from '../../../core/constants';
import { isLoanLikeType } from '../../../core/utils';
import {
    fetchAccountBalanceRows,
    fetchAccountSummaryRow,
    fetchCardBreakdowns,
} from '../../../database/summarySql';

export type AccountBalanceItem = {
    id: number;
    name: string;
    type: AccountType;
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
    type: AccountType;
    label: string;
    accounts: AccountWithReserves[];
    total: number;
    isLoanLike: boolean;
    isClosedBoxType: boolean;
};

export type AccountTypeBalanceItem = {
    type: AccountType;
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

export function useAccountsSummary() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<SummaryState>(createEmptySummary());
    const hasLoadedOnce = useRef(false);

    const load = useCallback(async () => {
        // Only show loading spinner on initial load; keep stale data visible during refetch
        if (!hasLoadedOnce.current) {
            setLoading(true);
        }
        try {
            const now = new Date();
            const [accountRows, summaryRow, cardRows] = await Promise.all([
                fetchAccountBalanceRows(),
                fetchAccountSummaryRow(),
                fetchCardBreakdowns(now),
            ]);

            const accountBalances: AccountBalanceItem[] = accountRows.map(account => ({
                id: account.id,
                name: account.name,
                type: account.type as AccountType,
                parentId: account.parentId,
                sortOrder: account.sortOrder,
                initialBalance: account.initialBalance,
                isLoanLike: account.isLoanLike,
                isClosedBoxLike: account.isClosedBoxLike,
                balance: account.balance,
                settlementDay: account.settlementDay || 28,
            }));

            const typeBalanceMap = new Map<string, AccountTypeBalanceItem>();
            accountBalances.forEach(item => {
                const existing = typeBalanceMap.get(item.type);
                if (existing) {
                    existing.balance += item.balance;
                    existing.count += 1;
                } else {
                    typeBalanceMap.set(item.type, {
                        type: item.type,
                        balance: item.balance,
                        count: 1,
                        isLoanLike: item.isLoanLike,
                    });
                }
            });

            const cardBreakdowns: CardBreakdownItem[] = cardRows.map(row => ({
                id: row.accountId,
                name: row.name,
                billGenerated: row.billGenerated,
                current: row.current,
                total: row.total,
                settlementDay: row.settlementDay,
            }));

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

            const groups = GROUP_ORDER.map(type => {
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
                assets: summaryRow.assets,
                liabilities: summaryRow.liabilities,
                totalBalance: summaryRow.totalBalance,
                standingBalance: summaryRow.standingBalance,
                overallDebt: summaryRow.cardDebt + summaryRow.debtDebt,
                cardDebt: summaryRow.cardDebt,
                debtDebt: summaryRow.debtDebt,
                accounts: accountBalances,
                groups,
                typeBalances: Array.from(typeBalanceMap.values()),
                cardBreakdowns,
            });
            hasLoadedOnce.current = true;
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
