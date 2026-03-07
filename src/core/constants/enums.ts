// Transaction types
export enum TransactionType {
  EXPENSE = 'expense',
  INCOME = 'income',
  TRANSFER = 'transfer',
}

// Account types
export enum AccountType {
  BANK = 'bank',
  CASH = 'cash',
  CARD = 'card',
  DEBT = 'debt',
  WALLET = 'wallet',
  DEPOSITS = 'deposits',
  CUSTOM = 'custom',
}

// Category assignment type
export enum CategoryType {
  EXPENSE = 'expense',
  INCOME = 'income',
}

// Theme modes
export enum ThemeMode {
  SYSTEM = 'system',
  LIGHT = 'light',
  DARK = 'dark',
}

// Auth methods
export enum AuthMethod {
  PIN = 'pin',
  BIOMETRIC = 'biometric',
}

// Settings keys (for key-value store)
export enum SettingsKey {
  CURRENCY_SYMBOL = 'currencySymbol',
  CURRENCY_CODE = 'currencyCode',
  THEME_MODE = 'themeMode',
  AUTH_ENABLED = 'authEnabled',
  AUTH_METHOD = 'authMethod',
  PIN_HASH = 'pinHash',
  CARRY_FORWARD_BALANCE = 'carryForwardBalance',
}

// Max category nesting depth
export const MAX_CATEGORY_DEPTH = 3;
