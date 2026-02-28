import { groupByDay, getMonthRange, formatDayHeader, formatMonthYearLabel } from '../../src/core/utils/date';

describe('Date Utilities', () => {
    describe('groupByDay', () => {
        it('groups transactions by day correctly', () => {
            const txns = [
                { id: 1, date: '2026-02-28T10:00:00Z', amount: 100, type: 'income' },
                { id: 2, date: '2026-02-28T12:00:00Z', amount: 50, type: 'expense' },
                { id: 3, date: '2026-02-27T09:00:00Z', amount: 200, type: 'income' },
            ];

            const grouped = groupByDay(txns);

            expect(grouped.length).toBe(2);
            expect(grouped[0].data.length).toBe(2); // Feb 28
            expect(grouped[1].data.length).toBe(1); // Feb 27
            expect(grouped[0].dayIncome).toBe(100);
            expect(grouped[0].dayExpense).toBe(50);
        });

        it('sorts groups by date descending', () => {
            const txns = [
                { id: 1, date: '2026-02-01T10:00:00Z', amount: 100 },
                { id: 2, date: '2026-02-28T10:00:00Z', amount: 100 },
            ];
            const grouped = groupByDay(txns);
            expect(grouped[0].title.getDate()).toBe(28);
            expect(grouped[1].title.getDate()).toBe(1);
        });

        it('sorts items within a day by createdAt descending', () => {
            const txns = [
                { id: 1, date: '2026-02-28T10:00:00Z', createdAt: '2026-02-28T10:00:00Z', amount: 10 },
                { id: 2, date: '2026-02-28T10:00:00Z', createdAt: '2026-02-28T11:00:00Z', amount: 20 },
            ];
            const grouped = groupByDay(txns);
            expect(grouped[0].data[0].id).toBe(2);
            expect(grouped[0].data[1].id).toBe(1);
        });

        it('handles effectiveType for summaries', () => {
            const txns = [
                { id: 1, date: '2026-02-28T10:00:00Z', amount: 100, type: 'transfer', effectiveType: 'income' },
            ];
            const grouped = groupByDay(txns);
            expect(grouped[0].dayIncome).toBe(100);
        });
    });

    describe('getMonthRange', () => {
        it('returns correct start and end of month', () => {
            const { start, end } = getMonthRange(2026, 1); // Feb 2026
            expect(start.getDate()).toBe(1);
            expect(start.getMonth()).toBe(1);
            expect(end.getDate()).toBe(28);
            expect(end.getMonth()).toBe(1);
        });
    });

    describe('formatting helpers', () => {
        const testDate = new Date(2026, 1, 28); // Feb 28, 2026 (Saturday)

        it('formatDayHeader returns correct string', () => {
            expect(formatDayHeader(testDate)).toBe('Sat, 28 Feb 2026');
        });

        it('formatMonthYearLabel returns correct string', () => {
            expect(formatMonthYearLabel(testDate)).toBe('February 2026');
        });
    });
});
