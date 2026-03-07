import { sql } from 'drizzle-orm';
import { AccountType, TransactionType } from '../core/constants';

type SqlRow = Record<string, unknown>;

const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? fallback : parsed;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return fallback;
};

const toNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = toNumber(value, Number.NaN);
    return Number.isNaN(parsed) ? null : parsed;
};

const toBoolean = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
    return false;
};

const toStringValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value);
};

export type AccountBalance = {
    id: number;
    name: string;
    type: string;
    parentId: number | null;
    sortOrder: number;
    excludeFromSummaries: boolean;
    settlementDay: number;
    initialBalance: number;
    isLoanLike: boolean;
    isClosedBoxLike: boolean;
    balance: number;
};

export type AccountBalancesSummary = {
    holding: number;
    payable: number;
    current: number;
    accounts: AccountBalance[];
};

export type AccountSummary = {
    assets: number;
    liabilities: number;
    standingBalance: number;
    totalBalance: number;
    cardDebt: number;
    debtDebt: number;
    holding: number;
    payable: number;
    current: number;
};

export type CardCutoff = {
    accountId: number;
    cutoff: string;
};

export type CardBreakdownDeltaRow = {
    accountId: number;
    billedDelta: number;
    currentDelta: number;
};

type AccountBalanceSqlRow = {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
    sort_order: number;
    exclude_from_summaries: number | boolean;
    settlement_day: number | null;
    initial_balance: number;
    is_loan_like: number | boolean;
    is_closed_box_like: number | boolean;
    balance: number;
};

const accountBalancesCte = `
    account_base AS (
        SELECT
            a.id,
            a.name,
            a.type,
            a.parent_id,
            a.sort_order,
            a.exclude_from_summaries,
            a.settlement_day,
            -- Loan-like accounts (card/debt) start as negative balances.
            CASE
                WHEN a.type IN ('${AccountType.CARD}', '${AccountType.DEBT}') THEN -ABS(a.initial_balance)
                ELSE a.initial_balance
            END AS initial_balance,
            CASE
                WHEN a.type IN ('${AccountType.CARD}', '${AccountType.DEBT}') THEN 1
                ELSE 0
            END AS is_loan_like,
            -- Closed-box accounts are excluded from holding; debt is always closed-box.
            CASE
                WHEN a.exclude_from_summaries = 1 OR a.type = '${AccountType.DEBT}' THEN 1
                ELSE 0
            END AS is_closed_box_like
        FROM accounts a
        WHERE a.is_active = 1
    ),
    transaction_deltas AS (
        SELECT
            t.account_id,
            SUM(
                CASE
                    WHEN t.type = '${TransactionType.INCOME}' THEN t.amount
                    WHEN t.type = '${TransactionType.EXPENSE}' THEN -t.amount
                    WHEN t.type = '${TransactionType.TRANSFER}' THEN
                        CASE
                            -- Transfers are stored twice; the lower id is the "from" leg.
                            WHEN t.linked_transaction_id IS NOT NULL AND t.id < t.linked_transaction_id THEN -t.amount
                            WHEN t.linked_transaction_id IS NOT NULL THEN t.amount
                            -- Unlinked transfers behave like outgoing adjustments.
                            ELSE -t.amount
                        END
                    ELSE 0
                END
            ) AS delta
        FROM transactions t
        GROUP BY t.account_id
    ),
    account_balances AS (
        SELECT
            base.*,
            base.initial_balance + COALESCE(deltas.delta, 0) AS balance
        FROM account_base base
        LEFT JOIN transaction_deltas deltas ON deltas.account_id = base.id
    )
`;

export const accountBalancesSql = `
    WITH ${accountBalancesCte}
    SELECT
        id,
        name,
        type,
        parent_id,
        sort_order,
        exclude_from_summaries,
        settlement_day,
        initial_balance,
        is_loan_like,
        is_closed_box_like,
        balance,
        -- Holding: non-loan-like balances that are not closed-box.
        SUM(CASE WHEN is_loan_like = 0 AND is_closed_box_like = 0 THEN balance ELSE 0 END) OVER () AS holding,
        -- Payable: liability portion of loan-like balances (negative balances).
        SUM(CASE WHEN is_loan_like = 1 AND balance < 0 THEN -balance ELSE 0 END) OVER () AS payable,
        -- Current balance = holding - payable.
        SUM(CASE WHEN is_loan_like = 0 AND is_closed_box_like = 0 THEN balance ELSE 0 END) OVER ()
          - SUM(CASE WHEN is_loan_like = 1 AND balance < 0 THEN -balance ELSE 0 END) OVER () AS current
    FROM account_balances
    ORDER BY sort_order, name;
`;

export const ACCOUNT_BALANCES_SQL = accountBalancesSql;

export const accountSummarySql = `
    WITH ${accountBalancesCte}
    SELECT
        COALESCE(SUM(CASE WHEN is_loan_like = 0 THEN balance ELSE 0 END), 0) AS assets,
        COALESCE(
            SUM(
                CASE
                    WHEN is_loan_like = 1 THEN CASE WHEN balance < 0 THEN -balance ELSE 0 END
                    ELSE 0
                END
            ),
            0
        ) AS liabilities,
        COALESCE(
            SUM(CASE WHEN is_loan_like = 0 AND is_closed_box_like = 0 THEN balance ELSE 0 END),
            0
        ) AS standing_balance,
        COALESCE(
            SUM(
                CASE
                    WHEN type = '${AccountType.CARD}' THEN CASE WHEN balance < 0 THEN -balance ELSE 0 END
                    ELSE 0
                END
            ),
            0
        ) AS card_debt,
        COALESCE(
            SUM(
                CASE
                    WHEN type = '${AccountType.DEBT}' THEN CASE WHEN balance < 0 THEN -balance ELSE 0 END
                    ELSE 0
                END
            ),
            0
        ) AS debt_debt,
        COALESCE(
            SUM(CASE WHEN is_loan_like = 0 AND is_closed_box_like = 0 THEN balance ELSE 0 END),
            0
        )
        - COALESCE(
            SUM(
                CASE
                    WHEN is_loan_like = 1 THEN CASE WHEN balance < 0 THEN -balance ELSE 0 END
                    ELSE 0
                END
            ),
            0
        ) AS total_balance,
        -- Holding/payable/current included for UI summary rows.
        COALESCE(
            SUM(CASE WHEN is_loan_like = 0 AND is_closed_box_like = 0 THEN balance ELSE 0 END),
            0
        ) AS holding,
        COALESCE(
            SUM(CASE WHEN is_loan_like = 1 AND balance < 0 THEN -balance ELSE 0 END),
            0
        ) AS payable,
        COALESCE(
            SUM(CASE WHEN is_loan_like = 0 AND is_closed_box_like = 0 THEN balance ELSE 0 END),
            0
        )
        - COALESCE(
            SUM(CASE WHEN is_loan_like = 1 AND balance < 0 THEN -balance ELSE 0 END),
            0
        ) AS current
    FROM account_balances;
`;

export const ACCOUNT_SUMMARY_SQL = accountSummarySql;

export function parseAccountBalances(rows: unknown[]): AccountBalancesSummary {
    const accounts: AccountBalance[] = [];
    let holding = 0;
    let payable = 0;
    let current = 0;

    rows.forEach((row, index) => {
        const record = row as SqlRow;
        const parsedHolding = toNumber(record.holding);
        const parsedPayable = toNumber(record.payable);
        const parsedCurrent = toNumber(record.current);

        if (index === 0) {
            holding = parsedHolding;
            payable = parsedPayable;
            current = parsedCurrent;
        }

        accounts.push({
            id: toNumber(record.id),
            name: toStringValue(record.name),
            type: toStringValue(record.type),
            parentId: toNullableNumber(record.parent_id),
            sortOrder: toNumber(record.sort_order),
            excludeFromSummaries: toBoolean(record.exclude_from_summaries),
            settlementDay: toNumber(record.settlement_day, 28),
            initialBalance: toNumber(record.initial_balance),
            isLoanLike: toBoolean(record.is_loan_like),
            isClosedBoxLike: toBoolean(record.is_closed_box_like),
            balance: toNumber(record.balance),
        });
    });

    return {
        holding,
        payable,
        current,
        accounts,
    };
}

export async function fetchAccountBalanceRows(): Promise<AccountBalance[]> {
    const { db } = await import('./index');
    const rows = await db.all<AccountBalanceSqlRow>(sql.raw(ACCOUNT_BALANCES_SQL));
    return rows.map(row => ({
        id: toNumber(row.id),
        name: toStringValue(row.name),
        type: toStringValue(row.type),
        parentId: toNullableNumber(row.parent_id),
        sortOrder: toNumber(row.sort_order),
        excludeFromSummaries: toBoolean(row.exclude_from_summaries),
        settlementDay: toNumber(row.settlement_day, 28),
        initialBalance: toNumber(row.initial_balance),
        isLoanLike: toBoolean(row.is_loan_like),
        isClosedBoxLike: toBoolean(row.is_closed_box_like),
        balance: toNumber(row.balance),
    }));
}

const transactionDeltaSql = sql<number>`
    CASE
        WHEN t.type = ${TransactionType.INCOME} THEN t.amount
        WHEN t.type = ${TransactionType.EXPENSE} THEN -t.amount
        WHEN t.type = ${TransactionType.TRANSFER} THEN
            CASE
                WHEN t.linked_transaction_id IS NOT NULL AND t.id < t.linked_transaction_id THEN -t.amount
                WHEN t.linked_transaction_id IS NOT NULL THEN t.amount
                ELSE -t.amount
            END
        ELSE 0
    END
`;

export async function fetchCardBreakdownDeltas(
    cutoffs: CardCutoff[],
): Promise<CardBreakdownDeltaRow[]> {
    if (cutoffs.length === 0) return [];

    const { db } = await import('./index');
    const values = cutoffs.map(cutoff => sql`(${cutoff.accountId}, ${cutoff.cutoff})`);

    return db.all<CardBreakdownDeltaRow>(sql`
        WITH card_cutoffs(account_id, cutoff) AS (VALUES ${sql.join(values, sql`, `)})
        SELECT
            c.account_id AS accountId,
            COALESCE(
                SUM(CASE WHEN t.date <= c.cutoff THEN ${transactionDeltaSql} ELSE 0 END),
                0
            ) AS billedDelta,
            COALESCE(
                SUM(CASE WHEN t.date > c.cutoff THEN ${transactionDeltaSql} ELSE 0 END),
                0
            ) AS currentDelta
        FROM card_cutoffs c
        LEFT JOIN transactions t ON t.account_id = c.account_id
        GROUP BY c.account_id
    `);
}

export function parseAccountSummary(rows: unknown[]): AccountSummary {
    const record = (rows[0] ?? {}) as SqlRow;
    const assets = toNumber(record.assets);
    const liabilities = toNumber(record.liabilities);
    const standingBalance = toNumber(record.standing_balance);
    const totalBalance = toNumber(record.total_balance);
    const holding = toNumber(record.holding, standingBalance);
    const payable = toNumber(record.payable, liabilities);
    const current = toNumber(record.current, holding - payable);

    return {
        assets,
        liabilities,
        standingBalance,
        totalBalance,
        cardDebt: toNumber(record.card_debt),
        debtDebt: toNumber(record.debt_debt),
        holding,
        payable,
        current,
    };
}

export type CardBreakdown = {
    accountId: number;
    name: string;
    settlementDay: number;
    cutoffJulian: number;
    billGenerated: number;
    current: number;
    total: number;
};

export const cardBreakdownSql = `
    WITH params AS (
        SELECT
            -- Pass :now as an ISO string (UTC) to keep date math aligned with stored transaction dates.
            datetime(:now) AS now_dt,
            date(:now, 'start of month') AS month_start,
            date(:now, 'start of month', '+1 month', '-1 day') AS month_end,
            date(:now, 'start of month', '-1 day') AS prev_month_end,
            date(:now, 'start of month', '-1 month') AS prev_month_start
    ),
    card_accounts AS (
        SELECT
            a.id,
            a.name,
            a.settlement_day,
            -- Cards are loan-like: normalize initial balance to a negative value.
            -ABS(a.initial_balance) AS initial_balance,
            CASE
                WHEN a.settlement_day < 1 THEN 1
                WHEN a.settlement_day > 31 THEN 31
                ELSE a.settlement_day
            END AS bounded_day,
            params.now_dt,
            params.month_start,
            params.month_end,
            params.prev_month_start,
            params.prev_month_end
        FROM accounts a
        CROSS JOIN params
        WHERE a.type = '${AccountType.CARD}' AND a.is_active = 1
    ),
    cutoff_calc AS (
        SELECT
            id,
            name,
            settlement_day,
            initial_balance,
            -- Clamp settlement day to the last day of the month to avoid invalid dates.
            CASE
                WHEN bounded_day <= CAST(strftime('%d', month_end) AS INTEGER)
                    THEN bounded_day
                ELSE CAST(strftime('%d', month_end) AS INTEGER)
            END AS this_month_day,
            CASE
                WHEN bounded_day <= CAST(strftime('%d', prev_month_end) AS INTEGER)
                    THEN bounded_day
                ELSE CAST(strftime('%d', prev_month_end) AS INTEGER)
            END AS prev_month_day,
            now_dt,
            month_start,
            prev_month_start
        FROM card_accounts
    ),
    card_cutoffs AS (
        SELECT
            id,
            name,
            settlement_day,
            initial_balance,
            -- Build end-of-day cutoff datetimes for current and previous month.
            datetime(month_start, '+' || (this_month_day - 1) || ' days', '+23 hours', '+59 minutes', '+59 seconds') AS this_month_cutoff,
            datetime(prev_month_start, '+' || (prev_month_day - 1) || ' days', '+23 hours', '+59 minutes', '+59 seconds') AS prev_month_cutoff,
            now_dt
        FROM cutoff_calc
    ),
    card_cutoffs_final AS (
        SELECT
            id,
            name,
            settlement_day,
            initial_balance,
            -- Use the latest cutoff: if now >= this-month cutoff, use it; otherwise use previous month.
            CASE
                WHEN julianday(now_dt) >= julianday(this_month_cutoff) THEN julianday(this_month_cutoff)
                ELSE julianday(prev_month_cutoff)
            END AS cutoff_jd
        FROM card_cutoffs
    ),
    txn_deltas AS (
        SELECT
            t.*,
            CASE
                WHEN t.type = '${TransactionType.INCOME}' THEN t.amount
                WHEN t.type = '${TransactionType.EXPENSE}' THEN -t.amount
                WHEN t.type = '${TransactionType.TRANSFER}' THEN
                    CASE
                        -- Transfers are stored twice; the lower id is the "from" leg.
                        WHEN t.linked_transaction_id IS NOT NULL AND t.id < t.linked_transaction_id THEN -t.amount
                        WHEN t.linked_transaction_id IS NOT NULL THEN t.amount
                        -- Unlinked transfers behave like outgoing adjustments.
                        ELSE -t.amount
                    END
                ELSE 0
            END AS delta
        FROM transactions t
    ),
    card_rollup AS (
        SELECT
            c.id AS account_id,
            c.name,
            c.settlement_day,
            c.cutoff_jd AS cutoff_julian,
            c.initial_balance
                + COALESCE(SUM(CASE
                    WHEN t.id IS NOT NULL AND julianday(t.date) <= c.cutoff_jd THEN t.delta
                    ELSE 0
                END), 0) AS bill_generated,
            COALESCE(SUM(CASE
                WHEN t.id IS NOT NULL AND julianday(t.date) > c.cutoff_jd THEN t.delta
                ELSE 0
            END), 0) AS current
        FROM card_cutoffs_final c
        LEFT JOIN txn_deltas t ON t.account_id = c.id
        GROUP BY c.id
    )
    SELECT
        account_id,
        name,
        settlement_day,
        cutoff_julian,
        bill_generated,
        current,
        bill_generated + current AS total
    FROM card_rollup
    ORDER BY name;
`;

export const CARD_BREAKDOWN_SQL = cardBreakdownSql;

export function parseCardBreakdowns(rows: unknown[]): CardBreakdown[] {
    return rows.map(row => {
        const record = row as SqlRow;
        const billGenerated = toNumber(record.bill_generated);
        const current = toNumber(record.current);
        return {
            accountId: toNumber(record.account_id),
            name: toStringValue(record.name),
            settlementDay: toNumber(record.settlement_day, 28),
            cutoffJulian: toNumber(record.cutoff_julian),
            billGenerated,
            current,
            total: toNumber(record.total, billGenerated + current),
        };
    });
}

export type LedgerDailySummary = {
    summaryDate: string;
    income: number;
    expense: number;
    balance: number;
};

export type LedgerMonthlySummary = {
    income: number;
    expense: number;
    balance: number;
};

const ledgerSummaryBaseSql = `
    WITH filtered_txns AS (
        SELECT
            t.*,
            from_acc.exclude_from_summaries AS from_exclude,
            from_acc.type AS from_type,
            to_acc.exclude_from_summaries AS to_exclude,
            to_acc.type AS to_type
        FROM transactions t
        LEFT JOIN accounts from_acc ON from_acc.id = t.account_id
        LEFT JOIN accounts to_acc ON to_acc.id = t.to_account_id
        WHERE t.date >= ?
          AND t.date <= ?
    ),
    classified AS (
        SELECT
            t.*,
            CASE
                WHEN (t.from_exclude = 1 OR t.from_type = '${AccountType.DEBT}') THEN 1
                ELSE 0
            END AS from_closed,
            CASE
                WHEN (t.to_exclude = 1 OR t.to_type = '${AccountType.DEBT}') THEN 1
                ELSE 0
            END AS to_closed
        FROM filtered_txns t
    ),
    effective AS (
        SELECT
            t.*,
            CASE
                WHEN t.type = '${TransactionType.INCOME}' THEN t.amount
                -- Transfer from closed-box → open counts as income (only once per pair).
                WHEN t.type = '${TransactionType.TRANSFER}'
                    AND t.linked_transaction_id IS NOT NULL
                    AND t.id < t.linked_transaction_id
                    AND t.from_closed = 1
                    AND t.to_closed = 0
                    THEN t.amount
                ELSE 0
            END AS income_amount,
            CASE
                WHEN t.type = '${TransactionType.EXPENSE}' THEN t.amount
                -- Transfer from open → closed-box counts as expense (only once per pair).
                WHEN t.type = '${TransactionType.TRANSFER}'
                    AND t.linked_transaction_id IS NOT NULL
                    AND t.id < t.linked_transaction_id
                    AND t.from_closed = 0
                    AND t.to_closed = 1
                    THEN t.amount
                ELSE 0
            END AS expense_amount
        FROM classified t
    )
`;

export const ledgerDailySummarySql = `
    ${ledgerSummaryBaseSql}
    SELECT
        -- Group by local day so UI day headers match device expectations.
        date(e.date, 'localtime') AS summary_date,
        SUM(e.income_amount) AS income,
        SUM(e.expense_amount) AS expense,
        SUM(e.income_amount) - SUM(e.expense_amount) AS balance
    FROM effective e
    GROUP BY date(e.date, 'localtime')
    ORDER BY summary_date DESC;
`;

export function parseLedgerDailySummary(rows: unknown[]): LedgerDailySummary[] {
    return rows.map(row => {
        const record = row as SqlRow;
        const income = toNumber(record.income);
        const expense = toNumber(record.expense);
        return {
            summaryDate: toStringValue(record.summary_date),
            income,
            expense,
            balance: toNumber(record.balance, income - expense),
        };
    });
}

export const ledgerMonthlySummarySql = `
    ${ledgerSummaryBaseSql}
    SELECT
        COALESCE(SUM(e.income_amount), 0) AS income,
        COALESCE(SUM(e.expense_amount), 0) AS expense,
        COALESCE(SUM(e.income_amount), 0) - COALESCE(SUM(e.expense_amount), 0) AS balance
    FROM effective e;
`;

export const LEDGER_SUMMARY_SQL = ledgerMonthlySummarySql;

export function parseLedgerMonthlySummary(rows: unknown[]): LedgerMonthlySummary {
    const record = (rows[0] ?? {}) as SqlRow;
    const income = toNumber(record.income);
    const expense = toNumber(record.expense);
    return {
        income,
        expense,
        balance: toNumber(record.balance, income - expense),
    };
}
