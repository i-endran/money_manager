import { liabilityAmountFromBalance } from '../../../core/utils/accountRules';

type SignedColorPalette = {
    positive: string;
    negative: string;
    neutral: string;
};

export function colorForSignedAmount(amount: number, palette: SignedColorPalette): string {
    if (amount > 0) return palette.positive;
    if (amount < 0) return palette.negative;
    return palette.neutral;
}

export function signedAmountFromLiability(liabilityAmount: number): number {
    return liabilityAmount === 0 ? 0 : -liabilityAmount;
}

export function signedAmountForLoanAwareTotal(total: number, isLoanLike: boolean): number {
    if (!isLoanLike) return total;
    const liabilityAmount = liabilityAmountFromBalance(total);
    return liabilityAmount === 0 ? 0 : -liabilityAmount;
}
