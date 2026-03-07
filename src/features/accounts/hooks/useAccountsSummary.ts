import { useCallback, useState } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { accounts, transactions } from '../../../database/schema';
import { AccountType, TransactionType } from '../../../core/constants';
import {
    isClosedBoxLikeAccount,
    isLoanLikeType,
    liabilityAmountFromBalance,
    normalizeInitialBalanceByType,
} from '../../../core/utils';

type TransactionRow = {
    id: number;
    amount: number;
    type: string;
    accountId: number;
    linkedTransactionId: number | null;
    date: string;
};

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

function transferDelta(txn: TransactionRow): number {
    if (txn.linkedTransactionId) {
        return txn.id < txn.linkedTransactionId ? -txn.amount : txn.amount;
    }
    return -txn.amount;
}

function transactionDelta(txn: TransactionRow): number {
    if (txn.type === TransactionType.INCOME) return txn.amount;
    if (txn.type === TransactionType.EXPENSE) return -txn.amount;
    if (txn.type === TransactionType.TRANSFER) return transferDelta(txn);
    return 0;
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

            const [activeAccounts, transactionRows] = await Promise.all([
                db.select().from(accounts).where(eq(accounts.isActive, true)),
                db
                    .select({
                        id: transactions.id,
                        amount: transactions.amount,
                        type: transactions.type,
                        accountId: transactions.accountId,
                        linkedTransactionId: transactions.linkedTransactionId,
                        date: transactions.date,
                    })
                    .from(transactions),
            ]);

        const balances = new Map<number, number>();
        const transactionsByAccount = new Map<number, TransactionRow[]>();

        activeAccounts.forEach(account => {
            balances.set(account.id, normalizeInitialBalanceByType(account.type, account.initialBalance));
            transactionsByAccount.set(account.id, []);
        });

        transactionRows.forEach(txn => {
            if (!balances.has(txn.accountId)) return;
            const delta = transactionDelta(txn);
            balances.set(txn.accountId, (balances.get(txn.accountId) || 0) + delta);
            transactionsByAccount.get(txn.accountId)?.push(txn);
        });

        const accountBalances: AccountBalanceItem[] = activeAccounts
            .map(account => ({
                id: account.id,
                name: account.name,
                type: account.type,
                parentId: account.parentId,
                sortOrder: account.sortOrder,
                initialBalance: normalizeInitialBalanceByType(account.type, account.initialBalance),
                isLoanLike: isLoanLikeType(account.type),
                isClosedBoxLike: isClosedBoxLikeAccount(account),
                balance: balances.get(account.id) || 0,
                settlementDay: account.settlementDay || 28,
            }))
            .sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
                return a.name.localeCompare(b.name);
            });

        const assets = accountBalances
            .filter(item => !item.isLoanLike)
            .reduce((sum, item) => sum + item.balance, 0);
        const liabilities = accountBalances
            .filter(item => item.isLoanLike)
            .reduce((sum, item) => sum + liabilityAmountFromBalance(item.balance), 0);
        const standingBalance = accountBalances
            .filter(item => !item.isClosedBoxLike && !item.isLoanLike)
            .reduce((sum, item) => sum + item.balance, 0);
        const totalBalance = standingBalance - liabilities;

        const cardDebt = accountBalances
            .filter(item => item.type === AccountType.CARD)
            .reduce((sum, item) => sum + liabilityAmountFromBalance(item.balance), 0);
        const debtDebt = accountBalances
            .filter(item => item.type === AccountType.DEBT)
            .reduce((sum, item) => sum + liabilityAmountFromBalance(item.balance), 0);

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

        const now = new Date();
        const cardBreakdowns: CardBreakdownItem[] = accountBalances
            .filter(item => item.type === AccountType.CARD)
            .map(item => {
                const cutoff = getLatestSettlementCutoff(now, item.settlementDay);
                const cardTransactions = transactionsByAccount.get(item.id) || [];
                let billGenerated = item.initialBalance;
                let current = 0;

                cardTransactions.forEach(txn => {
                    const delta = transactionDelta(txn);
                    const txnDate = new Date(txn.date);
                    if (txnDate <= cutoff) {
                        billGenerated += delta;
                    } else {
                        current += delta;
                    }
                });

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
                assets,
                liabilities,
                totalBalance,
                standingBalance,
                overallDebt: cardDebt + debtDebt,
                cardDebt,
                debtDebt,
                accounts: accountBalances,
                groups,
                typeBalances: Array.from(typeBalanceMap.values()),
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
