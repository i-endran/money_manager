# PiggyBook — Milestone 1 Test Cases

## How to Use
After each git checkpoint, run all test cases tagged for that checkpoint. Mark `[x]` when passing.

---

## R1: Ledger — Monthly Transaction List

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R1.1 | Ledger displays transactions for current month | Open app → ledger loads | Shows current month's transactions grouped by day | 4 |
| R1.2 | Month navigation with arrows | Tap ← / → arrows | Ledger updates to prev/next month's data | 4 |
| R1.3 | Empty month shows empty state | Navigate to a month with no transactions | "No transactions" message displayed | 4 |
| R1.4 | Large month handles smoothly | Add 50+ transactions in one month | List scrolls smoothly, no jank | 4 |

## R2: Income/Expense Color Differentiation

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R2.1 | Income shown in green | Add income transaction | Amount displayed in green (#2E7D32) | 4 |
| R2.2 | Expense shown in red | Add expense transaction | Amount displayed in red (#C62828) | 4 |
| R2.3 | Transfer shown in blue | Add transfer between accounts | Merged row displayed in blue (#1565C0) | 4 |
| R2.4 | Colors consistent in dark mode | Switch to dark theme | Income/expense/transfer colors remain distinguishable | 4 |

## R3: Monthly Aggregate Summaries

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R3.1 | Income total correct | Add multiple income txns | Summary card shows correct SUM of incomes | 4 |
| R3.2 | Expense total correct | Add multiple expense txns | Summary card shows correct SUM of expenses | 4 |
| R3.3 | Balance = Income − Expense | Mix of income and expense | Balance computed correctly | 4 |
| R3.4 | Negative balance displayed | Expenses exceed income | Balance shows negative with red color and minus sign | 4 |
| R3.5 | Transfers excluded from summary | Add transfer between accounts | Transfer does not affect income/expense totals in summary | 4 |

## R4: Day Sub-Summaries

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R4.1 | Transactions grouped by day | Add txns on different dates | Sections appear per day with date headers | 4 |
| R4.2 | Day header shows sub-totals | Multiple txns on same day | Day header shows day's income, expense, balance | 4 |
| R4.3 | Days sorted descending | Txns across multiple days | Most recent day first (or newest at top) | 4 |

## R5: Weekend Differentiation

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R5.1 | Saturday section has tinted bg | Add txn on a Saturday | Day section has visually distinct background tint | 4 |
| R5.2 | Sunday section has tinted bg | Add txn on a Sunday | Day section has visually distinct background tint | 4 |
| R5.3 | Weekday section normal bg | Add txn on a weekday | Day section has standard background | 4 |
| R5.4 | Weekend tint in dark mode | Switch to dark theme | Weekend tint visible and distinct in dark mode | 4 |

## R6: Transaction Quick Info in Ledger

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R6.1 | Row shows category icon | Add txn with category | Category icon/emoji visible in row | 4 |
| R6.2 | Row shows note | Add txn with short note | Note text visible in row | 4 |
| R6.3 | Row shows account badge | Add txn with specific account | Account name/badge visible | 4 |
| R6.4 | Row shows colored amount | Add txn | Amount shown with correct color for type | 4 |
| R6.5 | Row truncates long note | Add txn with very long note | Note truncated with ellipsis, not broken layout | 4 |

## R7: Tap Transaction → Edit

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R7.1 | Tap opens edit screen | Tap a transaction row | Full-screen edit form opens with pre-filled data | 5 |
| R7.2 | Edit and save | Change amount → save | Ledger updates with new amount | 5 |
| R7.3 | Delete from edit screen | Tap delete → confirm | Transaction removed from ledger, summary updated | 5 |
| R7.4 | Delete transfer deletes pair | Delete a transfer transaction | Both linked entries are removed | 5 |
| R7.5 | Cancel edit without changes | Open edit → tap back | No changes saved, ledger unchanged | 5 |

## R8: Add Transaction

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R8.1 | FAB/button opens add form | Tap add button | Empty form opens with date defaulting to today | 5 |
| R8.2 | Add expense | Fill form as expense → save | Expense appears in ledger, summary updated | 5 |
| R8.3 | Add income | Fill form as income → save | Income appears in ledger, summary updated | 5 |
| R8.4 | Add transfer | Select transfer, pick From/To accounts → save | Two linked entries created; merged row shown in "All Accounts" | 5 |
| R8.5 | Required field validation | Leave amount empty → save | Error shown, save blocked | 5 |
| R8.6 | Amount accepts decimals | Enter 199.50 | Stored and displayed correctly | 5 |

## R9: Transaction Fields

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R9.1 | Amount field works | Enter various amounts | Correct numeric input, no alpha chars | 5 |
| R9.2 | Type selector switches | Toggle Expense/Income/Transfer | Form adapts (shows From/To for transfer) | 5 |
| R9.3 | Account picker shows grouped list | Tap account field | Bottom sheet with accounts grouped by type | 5 |
| R9.4 | Category picker shows hierarchy | Tap category field | 3-level drill-down, shows emoji names | 5 |
| R9.5 | Inline "Add New" category | Tap ➕ in category picker | Can create new category without leaving form | 5 |
| R9.6 | Note field (short) | Enter short note | Saved and shown in ledger row | 5 |
| R9.7 | Description field (long) | Enter long description | Saved and shown in edit view only | 5 |
| R9.8 | Date picker works | Change date | Transaction saved with correct date, appears under right day | 5 |
| R9.9 | iOS month-view date picker | (iOS) Open date picker | Shows month view with weekends distinguishable (not wheel picker) | 5 |

## R10: Transfer Merge Logic

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R10.1 | All Accounts: shows merged | Create transfer → view All Accounts | Single row: "SBI → Cash ₹5,000" in blue | 4 |
| R10.2 | Source account: shows expense | View SBI account ledger | "Transfer to Cash ₹5,000" in red | 4 |
| R10.3 | Dest account: shows income | View Cash account ledger | "Transfer from SBI ₹5,000" in green | 4 |
| R10.4 | Edit transfer updates both | Edit merged transfer amount | Both linked entries updated | 5 |
| R10.5 | Delete transfer removes both | Delete transfer | Both linked entries removed | 5 |

## R11: Accounts (CRUD)

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R11.1 | Default Cash account exists | First launch | "💵 Cash" account present | 3 |
| R11.2 | Create bank account | Settings → Accounts → Add | New account appears in list, picker | 6 |
| R11.3 | Set initial balance | Create account with ₹10,000 | Balance shows ₹10,000 before any transactions | 6 |
| R11.4 | Edit account name | Change account name | Updated everywhere (ledger rows, pickers) | 6 |
| R11.5 | Soft-delete account with txns | Delete account that has transactions | Account deactivated, existing txns preserved | 6 |
| R11.6 | Delete account without txns | Delete empty account | Account fully removed | 6 |
| R11.7 | Account types grouped in picker | Open account picker in txn form | Accounts grouped under Bank, Cash, Card, etc. | 6 |

## R12: Categories (CRUD, 3-Level Hierarchy)

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R12.1 | Pre-seeded categories exist | First launch | Food, Transport, Shopping, etc. with sub-categories | 3 |
| R12.2 | Create root category (level 1) | Settings → Categories → Add | New root category appears | 6 |
| R12.3 | Create child (level 2) | Add sub-category under root | Shows nested under parent | 6 |
| R12.4 | Create grandchild (level 3) | Add sub-sub-category | Shows nested 2 levels deep | 6 |
| R12.5 | Block level 4 creation | Try adding child under level-3 | Error/disabled — max 3 levels enforced | 6 |
| R12.6 | Emoji in category name | Create "🏋️ Gym" category | Emoji stored and rendered correctly | 6 |
| R12.7 | Delete category with txns | Delete category used by transactions | Reassignment prompt shown | 6 |
| R12.8 | Delete unused category | Delete empty category | Category removed | 6 |
| R12.9 | Category tree collapsible | Tap parent category | Children collapse/expand | 6 |
| R12.10 | Categories linked to type | Create expense-only category | Only shows in picker when type=expense | 6 |

## R13: Settings

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R13.1 | Currency defaults to INR | First launch → settings | Shows ₹ INR | 6 |
| R13.2 | Change currency | Change to $ USD | All amounts in app show $ symbol | 6 |
| R13.3 | Theme default = system | First launch | Theme follows OS setting | 6 |
| R13.4 | Switch to dark mode | Settings → Theme → Dark | App switches to dark theme | 6 |
| R13.5 | Switch to light mode | Settings → Theme → Light | App switches to light theme | 6 |
| R13.6 | Backup shows "Coming Soon" | Tap backup option | Placeholder message displayed | 6 |
| R13.7 | Export shows "Coming Soon" | Tap export option | Placeholder message displayed | 6 |

## R14: Authentication

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R14.1 | Auth disabled by default | First launch | App opens directly to ledger (no lock) | 7 |
| R14.2 | Enable PIN auth | Settings → Security → PIN → enter + confirm | PIN saved securely | 7 |
| R14.3 | App locked on relaunch | Close and reopen app | PIN pad shown, must enter PIN | 7 |
| R14.4 | Wrong PIN rejected | Enter wrong PIN | Error message, stays locked | 7 |
| R14.5 | Correct PIN unlocks | Enter correct PIN | App unlocks to ledger | 7 |
| R14.6 | Enable biometric auth | Settings → Security → Biometric | Biometric prompt on launch | 7 |
| R14.7 | Biometric fallback to PIN | Cancel biometric | PIN pad shown as fallback | 7 |
| R14.8 | Disable auth | Settings → Security → Disable | App opens without lock | 7 |

## R15: UI/UX Platform Compliance

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R15.1 | Android: Material 3 widgets | Run on Android | Native Material components, FAB, etc. | 4 |
| R15.2 | iOS: UIKit-native components | Run on iOS | Native navigation bar, list rows, SF symbols | 4 |
| R15.3 | iOS: Liquid glass transitions | Navigate between ledger ↔ settings | Smooth glass-effect page transitions | 6 |
| R15.4 | Splash screen on launch | Cold start the app | Splash screen with app icon before loading | 7 |
| R15.5 | UI consistent across platforms | Compare Android & iOS | Same layout, functionality; platform-native styling | all |
| R15.6 | FAB on Android | View ledger on Android | Floating action button visible | 4 |
| R15.7 | Toolbar button on iOS | View ledger on iOS | Add button in navigation bar area | 4 |
| R15.8 | Auto-palette colors | Create multiple accounts/categories | Each gets a distinct, pleasant color from palette | 6 |

---

## Execution Checklist

After each checkpoint, verify all test cases for that checkpoint:

- [ ] **Checkpoint 1**: Project initialized, builds on both platforms
- [ ] **Checkpoint 2**: Theme system, utilities working
- [ ] **Checkpoint 3**: Database created, seed data verified (R11.1, R12.1)
- [ ] **Checkpoint 4**: Ledger screen complete (R1–R6, R10.1–R10.3, R15.1–R15.2)
- [ ] **Checkpoint 5**: Add/Edit/Delete transaction (R7–R9, R10.4–R10.5)
- [ ] **Checkpoint 6**: Settings + Account/Category CRUD + transitions (R11–R13, R15.3, R15.8)
- [ ] **Checkpoint 7**: Auth + splash screen (R14, R15.4)
