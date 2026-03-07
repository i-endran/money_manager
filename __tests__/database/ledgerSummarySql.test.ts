import Database from 'better-sqlite3';
import { buildLedgerMonthlySummaryQuery } from '../../src/database/summarySql';
import { createInMemoryDatabase, seedSummaryFixture } from '../../testUtils/sqlite';

describe('Ledger summary SQL', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = createInMemoryDatabase();
        seedSummaryFixture(db);
    });

    afterEach(() => {
        db.close();
    });

    it('treats closed-box transfers as income or expense', () => {
        const start = '2024-06-01T00:00:00.000Z';
        const end = '2024-06-30T23:59:59.999Z';
        const { sql, params } = buildLedgerMonthlySummaryQuery({ startDate: start, endDate: end });
        const summary = db.prepare(sql).get(params) as {
            incomeTotal: number;
            expenseTotal: number;
        };

        expect(summary.incomeTotal).toBeCloseTo(1080);
        expect(summary.expenseTotal).toBeCloseTo(570);
        expect(summary.incomeTotal - summary.expenseTotal).toBeCloseTo(510);
    });
});
