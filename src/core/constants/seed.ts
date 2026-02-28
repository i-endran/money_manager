import { AccountType, CategoryType } from './enums';

// Pre-seeded accounts created on first launch
export interface SeedAccount {
    name: string;
    type: AccountType;
    iconName: string;
    initialBalance: number;
}

export const SEED_ACCOUNTS: SeedAccount[] = [
    { name: 'Cash', type: AccountType.CASH, iconName: 'cash', initialBalance: 0 },
    { name: 'Bank', type: AccountType.BANK, iconName: 'account-balance', initialBalance: 0 },
];

// Pre-seeded categories with hierarchy (parentIndex references index in flattened array)
export interface SeedCategory {
    name: string;
    type: CategoryType;
    iconName: string;
    level: number;
    parentRef?: string; // name of parent category for linking
}

export const SEED_CATEGORIES: SeedCategory[] = [
    // --- Expense root categories ---
    { name: 'Food', type: CategoryType.EXPENSE, iconName: 'restaurant', level: 1 },
    { name: 'Meals', type: CategoryType.EXPENSE, iconName: 'restaurant-menu', level: 2, parentRef: 'Food' },
    { name: 'Groceries', type: CategoryType.EXPENSE, iconName: 'shopping-cart', level: 2, parentRef: 'Food' },
    { name: 'Supplements', type: CategoryType.EXPENSE, iconName: 'medication', level: 2, parentRef: 'Food' },

    { name: 'Transport', type: CategoryType.EXPENSE, iconName: 'directions-car', level: 1 },
    { name: 'Fuel', type: CategoryType.EXPENSE, iconName: 'local-gas-station', level: 2, parentRef: 'Transport' },
    { name: 'Public', type: CategoryType.EXPENSE, iconName: 'directions-bus', level: 2, parentRef: 'Transport' },

    { name: 'Shopping', type: CategoryType.EXPENSE, iconName: 'shopping-bag', level: 1 },

    { name: 'Bills', type: CategoryType.EXPENSE, iconName: 'receipt', level: 1 },
    { name: 'Electricity', type: CategoryType.EXPENSE, iconName: 'bolt', level: 2, parentRef: 'Bills' },
    { name: 'Water', type: CategoryType.EXPENSE, iconName: 'water-drop', level: 2, parentRef: 'Bills' },
    { name: 'Internet', type: CategoryType.EXPENSE, iconName: 'wifi', level: 2, parentRef: 'Bills' },

    { name: 'Health', type: CategoryType.EXPENSE, iconName: 'local-hospital', level: 1 },
    { name: 'Entertainment', type: CategoryType.EXPENSE, iconName: 'movie', level: 1 },
    { name: 'Education', type: CategoryType.EXPENSE, iconName: 'school', level: 1 },

    // --- Income root categories ---
    { name: 'Salary', type: CategoryType.INCOME, iconName: 'account-balance-wallet', level: 1 },
    { name: 'Freelance', type: CategoryType.INCOME, iconName: 'computer', level: 1 },
    { name: 'Investment Returns', type: CategoryType.INCOME, iconName: 'trending-up', level: 1 },
    { name: 'Other', type: CategoryType.INCOME, iconName: 'category', level: 1 },
];
