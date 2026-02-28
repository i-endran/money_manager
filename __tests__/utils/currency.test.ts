import { formatCurrency } from '../../src/core/utils/currency';

describe('Currency Utilities', () => {
    describe('formatCurrency', () => {
        it('formats amounts with symbol correctly', () => {
            // Note: project uses Intl.NumberFormat or similar, might depend on environment locale
            // We'll test against the expected standard format used in the project
            expect(formatCurrency(1234.56, '₹')).toContain('₹');
            expect(formatCurrency(1234.56, '₹')).toContain('1,234.56');
        });

        it('handles zero correctly', () => {
            expect(formatCurrency(0, '$')).toContain('0.00');
        });

        it('handles negative amounts', () => {
            const formatted = formatCurrency(-100, '$');
            expect(formatted).toContain('-');
            expect(formatted).toContain('100.00');
        });
    });
});
