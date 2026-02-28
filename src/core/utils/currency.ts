/**
 * Format a numeric amount into a currency string.
 * @param amount The numeric amount to format
 * @param symbol The currency symbol (e.g., ₹, $)
 * @returns Formatted string
 */
export function formatCurrency(amount: number, symbol: string = '₹'): string {
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${symbol}${formatted}`;
}
