# Pocket Log – Architecture Documentation

## Overview

Pocket Log is a **React Native** mobile application for iOS and Android. The app records personal financial transactions (expenses, incomes, transfers), categorizes them using a 3-level hierarchy, and provides a polished monthly ledger view with balance carry-forward capabilities.

### Core Technology Stack

| Layer | Technology |
|---|---|
| **UI Framework** | React Native 0.84 (TypeScript) |
| **Navigation** | React Navigation 7 (Native Stack + Bottom Tabs) |
| **Database** | `op-sqlite` + Drizzle ORM |
| **State Management** | Zustand |
| **Security** | `react-native-keychain` + `react-native-biometrics` |
| **Visual Effects** | `@react-native-community/blur` (Frosted Glass) |
| **Branding** | `react-native-bootsplash` (Splash) + `react-native-make` (Icons) |

---

## Directory Structure

```
d:/Projects/money_manager/
├── App.tsx                    # Root component (auth gate + navigation)
├── android/                   # Android native project
├── ios/                       # iOS native project
├── assets/                    # Static assets (brand logos, splash)
└── src/
    ├── core/                  # Shared utilities and design system
    ├── database/              # ORM schema, migrations, seed
    ├── features/              # Feature modules (auth, ledger, transaction, settings)
    ├── navigation/            # Tab and Stack navigators
    └── stores/                # Zustand global state stores
```

---

## `src/core/` – Shared Core Layer

The core layer provides the shared design system and cross-feature utilities.

```
src/core/
├── constants/
│   ├── enums.ts               # Enum definitions (SettingsKey, TransactionType, etc.)
│   ├── defaults.ts            # App-level constants (MAX_CATEGORY_DEPTH, CURRENCIES, etc.)
│   ├── seed.ts                # Seed data definitions
│   └── index.ts               # Barrel export
├── theme/
│   ├── colors.ts              # Light/Dark color tokens (Navy Blue / Medium Blue accent)
│   ├── presets.ts             # Shared style presets (LedgerRowDensityPreset,
│   │                          #   LedgerTextHierarchyPreset, LedgerSummaryCardMetricsPreset,
│   │                          #   FormHeaderPreset)
│   └── index.ts               # useAppTheme() hook + barrel export
└── utils/
    ├── currency.ts            # Currency formatting
    ├── date/                  # getMonthRange(), groupByDay(), etc.
    └── index.ts               # Barrel export
```

### Key Patterns
- **iOS Aesthetic**: Off-white background (`#F5F5F7`), navy blue primary accents (`#1B3A5C` light / `#2568c5` dark), squircle-rounded cards (iOS Settings-style) for lists.
- **Theme Hook**: `useAppTheme()` provides reactive access to the user's selected theme (Light/Dark/System).
- **Style Presets**: Shared tokens in `presets.ts` enforce visual consistency across screens:
  - `LedgerRowDensityPreset` — row `paddingVertical`/`paddingHorizontal` and separator thickness
  - `LedgerTextHierarchyPreset` — primary, secondary, amount, and meta text styles
  - `LedgerSummaryCardMetricsPreset` — summary card padding
  - `FormHeaderPreset` — management/form screen title font
- **Sub-item Left-Border**: Reserve accounts and sub-categories are visually indented using `borderLeftWidth: 2, borderLeftColor: theme.primary` (visible in both Light and Dark themes).

---

## `src/database/` – Database Layer

```
src/database/
├── index.ts                   # DB initialization & migrations
├── schema.ts                  # Drizzle ORM tables
├── seed.ts                    # Default set of accounts and categories
└── migrations/                # Versioned SQL migrations
```

### Schema Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `accounts` | User bank/cash accounts | `name`, `type`, `isActive`, `parentId`, `excludeFromSummaries`, `sortOrder` |
| `categories` | 3-level hierarchy | `name`, `iconName`, `parentId` |
| `transactions` | Ledger entries | `amount`, `type`, `date`, `linkedTransactionId` |
| `appSettings` | Key-value store | `key`, `value` |

### Feature: Closed-Box Accounts & Nested Reserves
Accounts support 1-level deep nesting (Reserves) and custom grouping. Accounts marked `excludeFromSummaries` (Closed-Box) do not participate directly in the monthly income/expense totals. Special ledger logic ensures transfers *to* a closed box count as expenses, while transfers *from* a closed box count as income.

### Feature: Carry Forward Balance
The `appSettings` table stores a `carryForwardBalance` toggle. When enabled, the ledger hook queries all transactions prior to the current month to calculate an opening balance, which is then injected as a virtual row in the ledger.

---

## `src/features/` – Feature Modules

```
src/features/
├── auth/
│   └── screens/LockScreen.tsx          # PIN/Biometric gate
├── ledger/
│   ├── components/
│   │   ├── MonthSelector.tsx           # Compact month nav
│   │   ├── MonthlySummary.tsx          # Top summary stats
│   │   └── TransactionItem.tsx         # Ledger row renderer
│   ├── hooks/useMonthlyLedger.ts       # Data fetching & carry-forward logic
│   └── screens/LedgerScreen.tsx        # Unified Bubble (Selector + Summary) + List
├── accounts/
│   ├── hooks/useAccountsSummary.ts     # SQL-driven account summary aggregation
│   └── screens/AccountsScreen.tsx      # Accounts summary with reserves (left-border indent)
├── transaction/
│   ├── components/
│   │   ├── AccountPicker.tsx           # Grouped account selection
│   │   ├── CategoryPicker.tsx          # Hierarchical picking
│   │   └── DatePicker.tsx              # @react-native-community/datetimepicker
│   └── screens/TransactionFormScreen.tsx  # Dynamic form (Expense/Income/Transfer)
└── settings/
    └── screens/
        ├── SettingsScreen.tsx           # Preferences, currency/theme pickers with selection highlight
        ├── AccountManagementScreen.tsx  # CRUD for accounts; collapsible type sections, left-border reserves
        ├── AccountFormScreen.tsx        # Add/Edit account form
        └── CategoryManagementScreen.tsx # CRUD for categories; collapsible sections, left-border sub-categories
```

---

## Navigation Architecture

The app uses a hybrid navigation structure:
1. **RootStack**: Manages top-level screens and modal forms.
2. **MainTabs**: 4-tab bottom navigator (Ledger, Accounts, Stats, Settings).

---

## `src/stores/` – Global State

- **`authStore`**: Manages app locking, session state, and biometrics.
- **`ledgerStore`**: Tracks the currently viewed month and triggers refreshes.

---

## Data Flow Diagram

```mermaid
flowchart TD
    A[App.tsx] -->|isLocked?| B[LockScreen]
    A -->|unlocked| C[TabNavigator]
    C --> D[LedgerScreen]
    C --> G[AccountsScreen]
    C --> H[StatsScreen]
    C --> I[SettingsScreen]
    
    D -->|navigate| E[TransactionFormScreen]
    I --> J[AccountManagementScreen]
    I --> K[CategoryManagementScreen]

    E -->|db.transaction| L[(op-sqlite DB)]
    D -->|useMonthlyLedger| L
```
