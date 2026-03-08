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

const toNullableString = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
};

type SqlParams = Array<string | number | boolean | null>;

async function executeRawRows<T = SqlRow>(query: string, params: SqlParams = []): Promise<T[]> {
    const { db } = await import('./index');
    // Use execute() which returns QueryResult with .rows as Record<string, Scalar>[]
    // executeRawAsync returns raw arrays without column names — unsuitable here.
    const result = await db.$client.execute(query, params);
    return (result.rows ?? []) as T[];
}

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
    const rows = await executeRawRows<AccountBalanceSqlRow>(ACCOUNT_BALANCES_SQL);
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

export async function fetchAccountSummaryRow(): Promise<AccountSummary> {
    const rows = await executeRawRows<SqlRow>(ACCOUNT_SUMMARY_SQL);
    return parseAccountSummary(rows);
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
            -- Pass now as an ISO string (UTC) to keep date math aligned with stored transaction dates.
            datetime(?) AS now_dt,
            date(?, 'start of month') AS month_start,
            date(?, 'start of month', '+1 month', '-1 day') AS month_end,
            date(?, 'start of month', '-1 day') AS prev_month_end,
            date(?, 'start of month', '-1 month') AS prev_month_start
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

export async function fetchCardBreakdowns(now: Date | string): Promise<CardBreakdown[]> {
    const nowIso = typeof now === 'string' ? now : now.toISOString();
    const rows = await executeRawRows<SqlRow>(cardBreakdownSql, [
        nowIso,
        nowIso,
        nowIso,
        nowIso,
        nowIso,
    ]);
    return parseCardBreakdowns(rows);
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

export type LedgerFilters = {
    startDate?: string;
    endDate?: string;
    endDateExclusive?: string;
    accountId?: number;
};

export type LedgerTransactionRow = {
    id: number;
    amount: number;
    type: TransactionType;
    accountId: number;
    toAccountId: number | null;
    categoryId: number | null;
    note: string;
    description: string | null;
    date: string;
    linkedTransactionId: number | null;
    createdAt: string;
    updatedAt: string;
    categoryName: string | null;
    categoryIcon: string | null;
    effectiveType: TransactionType;
};

export type LedgerDailySummaryRow = {
    dayKey: string;
    dayIncome: number;
    dayExpense: number;
};

export type LedgerSummaryTotalsRow = {
    incomeTotal: number;
    expenseTotal: number;
};

function buildLedgerWhereClause(filters: LedgerFilters) {
    const conditions: string[] = [];
    const params: SqlParams = [];

    // When filtering to a specific account we show that account's own transaction leg
    // directly (t.account_id = ?).  Each leg already carries the correct effectiveType,
    // so no pair de-duplication is needed.  Without an account filter we apply the
    // standard de-dup to avoid double-counting transfer pairs in the global view.
    if (typeof filters.accountId !== 'number') {
        conditions.push('(t.linked_transaction_id IS NULL OR t.id < t.linked_transaction_id)');
    }

    if (filters.startDate) {
        conditions.push('t.date >= ?');
        params.push(filters.startDate);
    }

    if (filters.endDate) {
        conditions.push('t.date <= ?');
        params.push(filters.endDate);
    }

    if (filters.endDateExclusive) {
        conditions.push('t.date < ?');
        params.push(filters.endDateExclusive);
    }

    if (typeof filters.accountId === 'number') {
        // Only this account's own leg — correct effectiveType is already encoded in it.
        conditions.push('t.account_id = ?');
        params.push(filters.accountId);
    }

    return {
        whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
    };
}

function buildLedgerSummaryBaseSql(whereClause: string, filters: LedgerFilters) {
    const isAccountFiltered = typeof filters.accountId === 'number';

    // When filtering to a specific account we use direction-based income/expense:
    //   receiver leg (id > linked_id) = income, sender leg (id < linked_id) = expense.
    // In the global view we use the opt-out/open classification instead.
    const incomeTransferClause = isAccountFiltered
        ? `-- Received leg: this account is the destination (lower-ID is the from-leg).
                    WHEN t.type = '${TransactionType.TRANSFER}'
                        AND t.linked_transaction_id IS NOT NULL
                        AND t.id > t.linked_transaction_id
                        THEN t.amount`
        : `-- Transfer from opt-out → open counts as income (only once per pair).
                    WHEN t.type = '${TransactionType.TRANSFER}'
                        AND t.linked_transaction_id IS NOT NULL
                        AND t.id < t.linked_transaction_id
                        AND t.from_closed = 1
                        AND t.to_closed = 0
                        THEN t.amount`;

    const expenseTransferClause = isAccountFiltered
        ? `-- Sent leg: this account is the source (lower-ID is the from-leg).
                    WHEN t.type = '${TransactionType.TRANSFER}'
                        AND t.linked_transaction_id IS NOT NULL
                        AND t.id < t.linked_transaction_id
                        THEN t.amount`
        : `-- Transfer from open → opt-out counts as expense (only once per pair).
                    WHEN t.type = '${TransactionType.TRANSFER}'
                        AND t.linked_transaction_id IS NOT NULL
                        AND t.id < t.linked_transaction_id
                        AND t.from_closed = 0
                        AND t.to_closed = 1
                        THEN t.amount`;

    return `
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
            ${whereClause}
        ),
        classified AS (
            SELECT
                t.*,
                CASE
                    WHEN (COALESCE(t.from_exclude, 0) = 1 OR t.from_type = '${AccountType.DEBT}') THEN 1
                    ELSE 0
                END AS from_closed,
                CASE
                    WHEN (COALESCE(t.to_exclude, 0) = 1 OR t.to_type = '${AccountType.DEBT}') THEN 1
                    ELSE 0
                END AS to_closed
            FROM filtered_txns t
        ),
        effective AS (
            SELECT
                t.*,
                CASE
                    WHEN t.type = '${TransactionType.INCOME}' THEN t.amount
                    ${incomeTransferClause}
                    ELSE 0
                END AS income_amount,
                CASE
                    WHEN t.type = '${TransactionType.EXPENSE}' THEN t.amount
                    ${expenseTransferClause}
                    ELSE 0
                END AS expense_amount
            FROM classified t
        )
    `;
}

export function buildLedgerTransactionsQuery(filters: LedgerFilters) {
    const { whereClause, params } = buildLedgerWhereClause(filters);
    const isAccountFiltered = typeof filters.accountId === 'number';

    // When filtering to a specific account, classify transfers by direction:
    //   receiver leg (id > linked_id) = income, sender leg (id < linked_id) = expense.
    // In the global view use opt-out/open classification.
    const transferEffectiveTypeClause = isAccountFiltered
        ? `WHEN t.type = '${TransactionType.TRANSFER}'
                        AND t.linked_transaction_id IS NOT NULL
                        AND t.id > t.linked_transaction_id
                        THEN '${TransactionType.INCOME}'
                    WHEN t.type = '${TransactionType.TRANSFER}'
                        AND t.linked_transaction_id IS NOT NULL
                        AND t.id < t.linked_transaction_id
                        THEN '${TransactionType.EXPENSE}'`
        : `WHEN t.type = '${TransactionType.TRANSFER}'
                        AND (COALESCE(from_acc.exclude_from_summaries, 0) = 1 OR from_acc.type = '${AccountType.DEBT}')
                        AND NOT (COALESCE(to_acc.exclude_from_summaries, 0) = 1 OR to_acc.type = '${AccountType.DEBT}')
                        THEN '${TransactionType.INCOME}'
                    WHEN t.type = '${TransactionType.TRANSFER}'
                        AND NOT (COALESCE(from_acc.exclude_from_summaries, 0) = 1 OR from_acc.type = '${AccountType.DEBT}')
                        AND (COALESCE(to_acc.exclude_from_summaries, 0) = 1 OR to_acc.type = '${AccountType.DEBT}')
                        THEN '${TransactionType.EXPENSE}'`;

    return {
        sql: `
            SELECT
                t.id AS id,
                t.amount AS amount,
                t.type AS type,
                t.account_id AS accountId,
                t.to_account_id AS toAccountId,
                t.category_id AS categoryId,
                t.note AS note,
                t.description AS description,
                t.date AS date,
                t.linked_transaction_id AS linkedTransactionId,
                t.created_at AS createdAt,
                t.updated_at AS updatedAt,
                c.name AS categoryName,
                c.icon_name AS categoryIcon,
                CASE
                    WHEN t.type = '${TransactionType.INCOME}' THEN '${TransactionType.INCOME}'
                    WHEN t.type = '${TransactionType.EXPENSE}' THEN '${TransactionType.EXPENSE}'
                    ${transferEffectiveTypeClause}
                    ELSE '${TransactionType.TRANSFER}'
                END AS effectiveType
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            LEFT JOIN accounts from_acc ON from_acc.id = t.account_id
            LEFT JOIN accounts to_acc ON to_acc.id = t.to_account_id
            ${whereClause}
            ORDER BY t.date DESC, t.created_at DESC
        `,
        params,
    };
}

export function buildLedgerDailySummaryQuery(filters: LedgerFilters) {
    const { whereClause, params } = buildLedgerWhereClause(filters);
    return {
        sql: `
            ${buildLedgerSummaryBaseSql(whereClause, filters)}
            SELECT
                strftime('%Y-%m-%d', e.date, 'localtime') AS dayKey,
                COALESCE(SUM(e.income_amount), 0) AS dayIncome,
                COALESCE(SUM(e.expense_amount), 0) AS dayExpense
            FROM effective e
            GROUP BY dayKey
            ORDER BY dayKey DESC
        `,
        params,
    };
}

export function buildLedgerMonthlySummaryQuery(filters: LedgerFilters) {
    const { whereClause, params } = buildLedgerWhereClause(filters);
    return {
        sql: `
            ${buildLedgerSummaryBaseSql(whereClause, filters)}
            SELECT
                COALESCE(SUM(e.income_amount), 0) AS incomeTotal,
                COALESCE(SUM(e.expense_amount), 0) AS expenseTotal
            FROM effective e
        `,
        params,
    };
}

export async function fetchLedgerTransactions(filters: LedgerFilters): Promise<LedgerTransactionRow[]> {
    const { sql, params } = buildLedgerTransactionsQuery(filters);
    const rows = await executeRawRows<SqlRow>(sql, params);
    return rows.map(row => ({
        id: toNumber(row.id),
        amount: toNumber(row.amount),
        type: toStringValue(row.type) as TransactionType,
        accountId: toNumber(row.accountId),
        toAccountId: toNullableNumber(row.toAccountId),
        categoryId: toNullableNumber(row.categoryId),
        note: toStringValue(row.note),
        description: toNullableString(row.description),
        date: toStringValue(row.date),
        linkedTransactionId: toNullableNumber(row.linkedTransactionId),
        createdAt: toStringValue(row.createdAt),
        updatedAt: toStringValue(row.updatedAt),
        categoryName: toNullableString(row.categoryName),
        categoryIcon: toNullableString(row.categoryIcon),
        effectiveType: toStringValue(row.effectiveType) as TransactionType,
    }));
}

export async function fetchLedgerDailySummaries(filters: LedgerFilters): Promise<LedgerDailySummaryRow[]> {
    const { sql, params } = buildLedgerDailySummaryQuery(filters);
    const rows = await executeRawRows<SqlRow>(sql, params);
    return rows.map(row => ({
        dayKey: toStringValue(row.dayKey),
        dayIncome: toNumber(row.dayIncome),
        dayExpense: toNumber(row.dayExpense),
    }));
}

export async function fetchLedgerSummaryTotals(filters: LedgerFilters): Promise<LedgerSummaryTotalsRow> {
    const { sql, params } = buildLedgerMonthlySummaryQuery(filters);
    const rows = await executeRawRows<SqlRow>(sql, params);
    const record = (rows[0] ?? {}) as SqlRow;
    return {
        incomeTotal: toNumber(record.incomeTotal),
        expenseTotal: toNumber(record.expenseTotal),
    };
}

export async function fetchLedgerMonthlySummary(filters: LedgerFilters): Promise<LedgerMonthlySummary> {
    const totals = await fetchLedgerSummaryTotals(filters);
    return {
        income: totals.incomeTotal,
        expense: totals.expenseTotal,
        balance: totals.incomeTotal - totals.expenseTotal,
    };
}

export function parseLedgerMonthlySummary(rows: unknown[]): LedgerMonthlySummary {
    const record = (rows[0] ?? {}) as SqlRow;
    const income = toNumber(record.incomeTotal ?? record.income);
    const expense = toNumber(record.expenseTotal ?? record.expense);
    return {
        income,
        expense,
        balance: toNumber(record.balance, income - expense),
    };
}
