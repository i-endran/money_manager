import Database from 'better-sqlite3';
import { accountBalancesSql, cardBreakdownSql } from '../../src/database/summarySql';
import { createInMemoryDatabase, seedSummaryFixture } from '../../testUtils/sqlite';

describe('Account summary SQL', () => {
    let db: Database.Database;
    type AccountBalanceRow = {
        name: string;
        balance: number;
        is_closed_box_like: number;
        is_loan_like: number;
        holding: number;
        payable: number;
        current: number;
    };
    type CardBreakdownRow = {
        bill_generated?: number;
        billGenerated?: number;
        current: number;
        total: number;
    };

    beforeEach(() => {
        db = createInMemoryDatabase();
        seedSummaryFixture(db);
    });

    afterEach(() => {
        db.close();
    });

    it('computes balances with transfers, loan-like, and opt-out flags', () => {
        const balances = db.prepare(accountBalancesSql).all() as AccountBalanceRow[];
        const byName = new Map(balances.map(row => [row.name, row]));

        expect(byName.get('Checking')?.balance).toBeCloseTo(1730);
        expect(byName.get('Vault')?.balance).toBeCloseTo(570);
        expect(byName.get('Card')?.balance).toBeCloseTo(-320);
        expect(byName.get('Loan')?.balance).toBeCloseTo(-1100);

        expect(byName.get('Vault')?.is_closed_box_like).toBe(1);
        expect(byName.get('Loan')?.is_loan_like).toBe(1);
    });

    it('summarizes totals and card settlement cutoffs', () => {
        const balances = db.prepare(accountBalancesSql).all() as AccountBalanceRow[];
        expect(balances[0].holding).toBeCloseTo(1730);
        expect(balances[0].payable).toBeCloseTo(1420);
        expect(balances[0].current).toBeCloseTo(310);

        const now = '2024-06-15T12:00:00.000Z';
        const cardRows = db.prepare(cardBreakdownSql).all(now, now, now, now, now) as CardBreakdownRow[];
        expect(cardRows).toHaveLength(1);
        const billGenerated = cardRows[0].bill_generated ?? cardRows[0].billGenerated;
        expect(billGenerated).toBeCloseTo(-250);
        expect(cardRows[0].current).toBeCloseTo(-70);
        expect(cardRows[0].total).toBeCloseTo(-320);
    });
});
