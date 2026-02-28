import {
    format,
    isWeekend,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
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
 * Format a month/year label (e.g., 'February 2026').
 */
export function formatMonthYearLabel(date: Date): string {
    return format(date, 'MMMM yyyy');
}

/**
 * Group transactions by day for SectionList display.
 */
export function groupByDay<T extends { date: string | Date }>(transactions: T[]) {
    const groups: { title: Date; data: T[] }[] = [];

    transactions.forEach(txn => {
        const d = new Date(txn.date);
        const existingGroup = groups.find(g => isSameDay(g.title, d));

        if (existingGroup) {
            existingGroup.data.push(txn);
        } else {
            groups.push({ title: d, data: [txn] });
        }
    });

    // Sort groups by date descending
    return groups.sort((a, b) => b.title.getTime() - a.title.getTime());
}
