import { AccountType } from '../constants';

type AccountLike = {
    type?: string | null;
    excludeFromSummaries?: boolean | null;
};

export function isDebtType(type?: string | null): boolean {
    return type === AccountType.DEBT;
}

export function isMandatoryClosedBoxType(type?: string | null): boolean {
    return isDebtType(type);
}

export function isLoanLikeType(type?: string | null): boolean {
    return type === AccountType.CARD || type === AccountType.DEBT;
}

export function isClosedBoxLikeAccount(account?: AccountLike | null): boolean {
    if (!account) return false;
    return Boolean(account.excludeFromSummaries) || isMandatoryClosedBoxType(account.type);
}

export function normalizeInitialBalanceByType(type: string | null | undefined, balance: number): number {
    if (isLoanLikeType(type)) {
        return -Math.abs(balance);
    }
    return balance;
}

export function liabilityAmountFromBalance(balance: number): number {
    return Math.max(0, -balance);
}
