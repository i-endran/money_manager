import {
    colorForSignedAmount,
    signedAmountForLoanAwareTotal,
    signedAmountFromLiability,
} from '../../../src/features/accounts/utils/summaryDisplay';

describe('accounts summary display helpers', () => {
    it('returns sign colors for positive, negative and zero amounts', () => {
        const palette = {
            positive: 'green',
            negative: 'red',
            neutral: 'gray',
        };

        expect(colorForSignedAmount(10, palette)).toBe('green');
        expect(colorForSignedAmount(-10, palette)).toBe('red');
        expect(colorForSignedAmount(0, palette)).toBe('gray');
    });

    it('converts liability totals to signed display values', () => {
        expect(signedAmountFromLiability(250)).toBe(-250);
        expect(signedAmountFromLiability(0)).toBe(0);
    });

    it('normalizes loan-aware totals to signed values', () => {
        expect(signedAmountForLoanAwareTotal(1250, false)).toBe(1250);
        expect(signedAmountForLoanAwareTotal(-430, true)).toBe(-430);
        expect(signedAmountForLoanAwareTotal(75, true)).toBe(0);
    });
});
