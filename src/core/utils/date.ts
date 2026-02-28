import {
    format,
    isWeekend,
    startOfMonth,
    endOfMonth,
    isSameDay,
} from 'date-fns';

/**
 * Check if a date falls on a weekend (Saturday or Sunday).
 */
export { isWeekend };

/**
 * Get the start and end dates of a specific month in a year.
 */
export function getMonthRange(year: number, month: number) {
    const date = new Date(year, month);
    return {
        start: startOfMonth(date),
        end: endOfMonth(date),
    };
}

/**
 * Format a date for display (e.g., '28 Feb 2026').
 */
export function formatDateLabel(date: Date): string {
    return format(date, 'dd MMM yyyy');
}

/**
 * Format a day header with day-of-week (e.g., 'Fri, 28 Feb 2026').
 */
export function formatDayHeader(date: Date): string {
    return format(date, 'EEE, dd MMM yyyy');
}

/**
 * Format a month/year label (e.g., 'February 2026').
 */
export function formatMonthYearLabel(date: Date): string {
    return format(date, 'MMMM yyyy');
}

/**
 * Group transactions by day for SectionList display.
 * Sorts transactions within each day by createdAt (most recent first).
 * Computes per-day income, expense, and balance summaries.
 */
export function groupByDay<T extends { date: string | Date; type?: string; amount?: number; createdAt?: string | Date }>(transactions: T[]) {
    const groups: { title: Date; data: T[]; dayIncome: number; dayExpense: number }[] = [];

    transactions.forEach(txn => {
        const d = new Date(txn.date);
        const existingGroup = groups.find(g => isSameDay(g.title, d));

        if (existingGroup) {
            existingGroup.data.push(txn);
        } else {
            groups.push({ title: d, data: [txn], dayIncome: 0, dayExpense: 0 });
        }
    });

    // Sort each group's transactions by createdAt descending, then compute summaries
    groups.forEach(group => {
        group.data.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });

        group.data.forEach(txn => {
            if (txn.type === 'income') group.dayIncome += txn.amount ?? 0;
            if (txn.type === 'expense') group.dayExpense += txn.amount ?? 0;
        });
    });

    // Sort groups by date descending
    return groups.sort((a, b) => b.title.getTime() - a.title.getTime());
}

