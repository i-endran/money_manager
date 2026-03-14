# Pocket Log — Milestone 1 Test Cases

## How to Use
After each git checkpoint, run all test cases tagged for that checkpoint. Mark `[x]` when passing.

---

## R1: Ledger — Monthly Transaction List

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R1.1 | Ledger displays transactions for current month | Open app → ledger loads | Shows current month's transactions grouped by day | 4 |
| R1.2 | Month navigation with arrows | Tap ← / → arrows | Unified bubble updates to prev/next month's data | 4 |
| R1.3 | Empty month shows empty state | Navigate to a month with no transactions | "No transactions" message displayed | 4 |
| R1.4 | Large month handles smoothly | Add 50+ transactions in one month | List scrolls smoothly, no jank | 4 |
| R1.5 | Unified Header Bubble | View Ledger Screen | Month selector and summary are inside a single rounded bubble | 17 |

---

## R2: Income/Expense Color Differentiation

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R2.1 | Income shown in green | Add income transaction | Amount displayed in green (#2E7D32) | 4 |
| R2.2 | Expense shown in red | Add expense transaction | Amount displayed in red (#C62828) | 4 |
| R2.3 | Transfer shown in navy blue | Add transfer between accounts | Merged row displayed with navy blue save button | 4/17 |
| R2.4 | Colors consistent in dark mode | Switch to dark theme | Income/expense/transfer colors remain distinguishable | 4 |

---

## R3: Monthly Aggregate Summaries

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R3.1 | Income total correct | Add multiple income txns | Summary part of bubble shows correct SUM of incomes | 4 |
| R3.2 | Expense total correct | Add multiple expense txns | Summary part of bubble shows correct SUM of expenses | 4 |
| R3.3 | Balance = Income − Expense | Mix of income and expense | Balance computed correctly | 4 |
| R3.4 | Negative balance displayed | Expenses exceed income | Balance shows negative with red color and minus sign | 4 |
| R3.5 | Carry Forward Balance | Enable Setting → View Ledger | Opening balance from prev month is added to Income/Expense summary | 17 |

---

## R4: Day Sub-Summaries (Squircle Cards)

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R4.1 | Transactions grouped in cards | Add txns on different dates | Sections appear in rounded squircle cards | 17 |
| R4.2 | Day header shows sub-totals | Multiple txns on same day | Day header shows day's income, expense, balance | 4 |
| R4.3 | Days sorted descending | Txns across multiple days | Most recent day first | 4 |
| R4.4 | Opening Balance Row | Enable Carry Forward → View start of month | Inactive muted row (50% opacity) shows opening balance | 17 |

---

## R5: Weekend Differentiation

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R5.1 | Sat/Sun Header Color | View a weekend date | Date text is colored off-red (#C24A4A) | 12 |
| R5.2 | Non-Sticky Headers | Scroll through ledger | Date headers scroll away (not sticky) | 17 |

---

## R6: Transaction Quick Info in Ledger

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R6.1 | Row shows category icon | Add txn with category | Category icon/emoji visible in row | 4 |
| R6.2 | Row shows note | Add txn with short note | Note text visible in row | 4 |
| R6.3 | Row shows account badge | Add txn with specific account | Account name/badge visible | 4 |
| R6.4 | Row shows colored amount | Add txn | Amount shown with correct color for type | 4 |

---

## R7: Tap Transaction → Edit

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R7.1 | Tap opens edit screen | Tap a transaction row | Full-screen edit form opens (except opening balance row) | 5/17 |
| R7.2 | Edit and save | Change amount → save | Ledger updates with new amount | 5 |
| R7.3 | Delete Button Location | Open edit screen | Delete button is directly below the Save button | 13 |
| R7.4 | Delete transfer deletes pair | Delete a transfer transaction | Both linked entries are removed | 5 |

---

## R8: Add Transaction

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R8.1 | FAB/button opens add form | Tap add button | Empty form opens with date defaulting to today | 5 |
| R8.2 | Consumer-Oriented Titles | Tap Add Income/Expense | Title shows "Add Income" or "Add Expense" (not Generic) | 17 |
| R8.3 | Transfer save button | Select Transfer | Save button is navy blue | 17 |
| R8.4 | Numeric Integrity | Type amount | No flicker, letters/3rd decimals strictly blocked | 16 |

---

## R11: Settings & Management (Squircle Lists)

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R11.1 | Settings Card Grouping | View Settings Screen | Items are grouped in rounded cards with inset separators | 17 |
| R11.2 | Account Management cards | View Account Management | List uses squircle cards with inset separators | 17 |
| R11.3 | Category Management cards | View Category Management | List uses squircle cards with inset separators | 17 |

---

## R14: Authentication & Brand

| ID | Test Case | Steps | Expected | Checkpoint |
|---|---|---|---|---|
| R14.1 | Pocket Log App Icon | View home screen | App icon shows pocket with coin logo | 17 |
| R14.2 | Navy Blue Splash | Launch App | Splash screen background is navy blue (#1B3A5C) | 17 |
| R14.3 | PIN / biometric auth | Enable auth → restart | App locks correctly | 7 |

---

## Execution Checklist

- [x] **CP 1-7**: Core app features complete
- [x] **CP 12**: Desktop/Weekend UI polish
- [x] **CP 13**: Delete button relocation
- [x] **CP 16**: Numeric input sync
- [x] **CP 17**: Final Branding & UI Overhaul (Pocket Log, Squircle, Carry Forward)

---

## Milestone 2 Test Cases

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| M2.1 | Theme Profiles | Settings -> Change Theme (Light/Dark/System) | App switches colors immediately with elegant contrast |
| M2.2 | Currency Symbol Reactivity | Settings -> Change Currency | All ledger screens, transaction forms, and summaries show new symbol |
| M2.3 | Grouped Account Management | Settings -> Manage Accounts | Accounts are grouped by Type (Bank, Cash, etc) |
| M2.4 | Account Reordering | Account Manage -> Edit Order -> Drag | Accounts reorder, drag handles appear, order persists on reload |
| M2.5 | Add Nested Reserve | Save new account -> click Yes on prompt | Reserve form opens with parent ID set, saves under parent |
| M2.6 | Opt Out Account | Add/Edit Account -> Toggle Opt Out | Account receives "Opt Out" badge in management |
| M2.7 | Opt Out account in picker | Open Income/Expense form | Opt-out account appears in picker (direct transactions allowed) |
| M2.8 | Opt Out transfers – global view | Transfer OUT of Opt Out account | Global ledger summary counts it as INCOME |
| M2.8b | Opt Out transfers – filtered view | Filter ledger to Opt Out account; record transfer TO it | Transaction shows as INCOME in that account's filtered view |
| M2.9 | Nested Picker UI | Transaction form -> Account Picker | Reserves shown formatted as `Paren.. > Reserve` |
| M2.10 | Account Name Live Update | Edit account name -> View Ledger | Ledger reflects new name immediately without restart |
| M2.11 | Categories Grouping | Settings -> Manage Categories | Categories are grouped into Expense and Income sections |
| M2.12 | Nested Category Creation | Manage Categories -> Tap inline `+` | New Category form opens with Expense/Income & Parent predrawn |
| M2.13 | Integrated Category Emojis | Add Category | Emoji typed into Name field displays natively; custom Emoji input is absent |
| M2.14 | Android & iOS Export | Settings -> Export (CSV/XLSX) | Share sheet opens with file correctly attached |
