# Pocket Log – Copilot Instructions

Personal finance React Native app (iOS + Android). Tracks expenses, income, and transfers across multi-level accounts and categories with biometric security.

## Commands

```bash
npm start                  # Start Metro bundler (keep running)
npm run android            # Run on Android
npm run ios                # Run on iOS simulator (default)
# Or target a specific simulator:
npx react-native run-ios --simulator "iPhone 14"

npm run lint               # ESLint
npm test                   # Jest (all tests)
# Run a single test file:
npx jest __tests__/Foo.test.ts
```

> Native changes (app icon, splash, new native dependencies) may require reinstalling CocoaPods and a rebuild: `cd ios && pod install` then build in Xcode or `npx react-native run-ios`.

## Architecture

### High-Level Flow

```
App.tsx → initDatabase() + loadSettings() + authStore.initialize()
       → isLocked? → LockScreen (PIN/biometrics)
       → NavigationContainer → RootNavigator → TabNavigator
```

The app locks automatically when moved to the background (`AppState` listener in `App.tsx`).

### Directory Layout

| Path | Purpose |
|---|---|
| `src/core/` | Shared design system: theme, enums, date/currency utils |
| `src/database/` | Drizzle ORM schema, raw SQL init/migrations, seed data |
| `src/features/` | Feature-sliced modules: `auth`, `ledger`, `transaction`, `settings` |
| `src/navigation/` | `RootNavigator` (stack) wraps a 4-tab bottom navigator |
| `src/stores/` | Zustand global stores: `authStore`, `ledgerStore`, `settingsStore` |

### Database

- SQLite via `@op-engineering/op-sqlite` + Drizzle ORM.
- Database is initialised once at boot in `src/database/index.ts` using raw `CREATE TABLE IF NOT EXISTS` statements (not Drizzle migrations). New columns are added via `ALTER TABLE` wrapped in try/catch to be idempotent.
- Schema types (`Transaction`, `Account`, `Category`) are exported from `src/database/schema.ts` using `$inferSelect` / `$inferInsert`.
- `drizzle-kit` config at `drizzle.config.ts` targets `src/database/migrations/` for any future migration generation.

### State Management

Three Zustand stores:
- **`authStore`** – app lock state, PIN/biometric auth.
- **`ledgerStore`** – currently viewed month, refresh triggers.
- **`settingsStore`** – persists currency, theme mode, carry-forward toggle. Reads/writes to the `app_settings` SQLite table (key-value). Loaded once at startup before the splash hides.

## Key Conventions

### Theming — always use `useAppTheme()`
```ts
const { colors, isDark } = useAppTheme();
// ✅ colors.primary, colors.background, etc.
// ❌ Never hardcode color values in component StyleSheets
```
The hook resolves Light/Dark/System based on `settingsStore.themeMode`. Color tokens are in `src/core/theme/colors.ts`.

### Styling aesthetic
- Background: `#F5F5F7` (light) / `#121212` (dark).
- Primary accent: Navy Blue `#1B3A5C` (light) / Medium Blue `#2568c5` (dark).
- List sections use squircle-rounded cards (iOS Settings style).

### Enums over raw strings
All domain values (`TransactionType`, `AccountType`, `CategoryType`, `ThemeMode`, `SettingsKey`, `AuthMethod`) are defined in `src/core/constants/enums.ts`. Use these enums; don't use raw string literals like `'expense'`.

### Currency inputs
Enforce exactly 2 decimal places on all currency amount inputs and display.

### Transfers are atomic (linked pairs)
A transfer creates two `transactions` rows linked via `linkedTransactionId`. When deleting, always delete both entries. Transfers to a **closed-box account** (`excludeFromSummaries: true`) count as an expense; transfers from one count as income in summary calculations.

### Category hierarchy
Categories are always 3 levels deep (`level: 1 | 2 | 3`). `MAX_CATEGORY_DEPTH = 3` is exported from constants. Pickers use drill-down navigation.

### Account nesting
Accounts support 1-level deep nesting (parent → reserve child via `parentId`). The Account Picker uses drill-down UI to navigate reserves.

### Carry-forward balance
Controlled by `settingsStore.carryForwardBalance`. When enabled, `useMonthlyLedger` queries all prior-month transactions and injects a virtual opening-balance row at the top of the ledger list.

### Git discipline
Commit after completing every checkpoint/sub-task before moving to the next. Commit message format: `feat(module): description` or `fix(module): description`.
