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
│   ├── enums.ts               # App-level constants
│   ├── seed.ts                # Seed data definitions
│   └── index.ts               # Barrel export
├── theme/
│   ├── colors.ts              # Navy Blue accent theme defined
│   └── index.ts               # useAppTheme() hook
└── utils/
    ├── currency.ts            # Currency formatting
    ├── date/                  # getMonthRange(), groupByDay(), etc.
    └── index.ts               # Barrel export
```

### Key Patterns
- **iOS Aesthetic**: The app uses an off-white background (`#F5F5F7`), navy blue primary accents (`#1B3A5C`), and squircle-rounded cards (iOS Settings-style) for lists.
- **Theme Hook**: `useAppTheme()` provides reactive access to the user's selected theme (Light/Dark/System).

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
| `accounts` | User bank/cash accounts | `name`, `type`, `isActive` |
| `categories` | 3-level hierarchy | `name`, `iconName`, `parentId` |
| `transactions` | Ledger entries | `amount`, `type`, `date`, `linkedTransactionId` |
| `appSettings` | Key-value store | `key`, `value` |

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
├── transaction/
│   ├── components/
│   │   ├── AccountPicker.tsx           # Grouped account selection
│   │   ├── CategoryPicker.tsx          # Hierarchical picking
│   │   └── DatePicker.tsx              # @react-native-community/datetimepicker
│   └── screens/TransactionFormScreen.tsx  # Dynamic form (Expense/Income/Transfer)
└── settings/
    └── screens/
        ├── SettingsScreen.tsx           # Preferences & Grouped squircle lists
        ├── AccountManagementScreen.tsx  # CRUD for accounts
        ├── CategoryManagementScreen.tsx # CRUD for categories
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
