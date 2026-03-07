import {
    isClosedBoxLikeAccount,
    isDebtType,
    isLoanLikeType,
    liabilityAmountFromBalance,
    normalizeInitialBalanceByType,
} from '../../src/core/utils/accountRules';

describe('Account Rules', () => {
    it('treats debt accounts as debt/loan-like', () => {
        expect(isDebtType('debt')).toBe(true);
        expect(isLoanLikeType('debt')).toBe(true);
        expect(isLoanLikeType('card')).toBe(true);
        expect(isLoanLikeType('cash')).toBe(false);
    });

    it('unifies closed-box-like behavior for debt and exclude flag', () => {
        expect(isClosedBoxLikeAccount({ type: 'debt', excludeFromSummaries: false })).toBe(true);
        expect(isClosedBoxLikeAccount({ type: 'bank', excludeFromSummaries: true })).toBe(true);
        expect(isClosedBoxLikeAccount({ type: 'bank', excludeFromSummaries: false })).toBe(false);
    });

    it('normalizes loan-like initial balances to liabilities', () => {
        expect(normalizeInitialBalanceByType('debt', 1000)).toBe(-1000);
        expect(normalizeInitialBalanceByType('card', -350)).toBe(-350);
        expect(normalizeInitialBalanceByType('bank', 500)).toBe(500);
    });

    it('returns liability amount from negative balances', () => {
        expect(liabilityAmountFromBalance(-1234.5)).toBe(1234.5);
        expect(liabilityAmountFromBalance(100)).toBe(0);
    });
});
