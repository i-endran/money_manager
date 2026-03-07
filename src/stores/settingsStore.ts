import { create } from 'zustand';
import { db } from '../database';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { ThemeMode, SettingsKey, DEFAULT_SETTINGS } from '../core/constants';

function normalizeStoredSettingValue(value: string): string {
    const trimmed = value.trim();
    const isJsonString = trimmed.startsWith('"') && trimmed.endsWith('"');
    const isJsonBoolean = trimmed === 'true' || trimmed === 'false';

    if (!isJsonString && !isJsonBoolean) return value;

    try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed === 'string' ? parsed : String(parsed);
    } catch {
        return value;
    }
}

interface SettingsState {
    currencySymbol: string;
    currencyCode: string;
    themeMode: ThemeMode;
    carryForwardBalance: boolean;
    isLoaded: boolean;

    // Actions
    loadSettings: () => Promise<void>;
    updateSetting: (key: SettingsKey, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, _get) => ({
    currencySymbol: DEFAULT_SETTINGS[SettingsKey.CURRENCY_SYMBOL] as string,
    currencyCode: DEFAULT_SETTINGS[SettingsKey.CURRENCY_CODE] as string,
    themeMode: DEFAULT_SETTINGS[SettingsKey.THEME_MODE] as ThemeMode,
    carryForwardBalance: false,
    isLoaded: false,

    loadSettings: async () => {
        try {
            const settings = await db.select().from(schema.appSettings);
            const stateUpdate: Partial<SettingsState> = { isLoaded: true };

            settings.forEach(s => {
                const normalizedValue = normalizeStoredSettingValue(s.value);
                if (s.key === SettingsKey.CURRENCY_SYMBOL) stateUpdate.currencySymbol = normalizedValue;
                if (s.key === SettingsKey.CURRENCY_CODE) stateUpdate.currencyCode = normalizedValue;
                if (s.key === SettingsKey.THEME_MODE) stateUpdate.themeMode = normalizedValue as ThemeMode;
                if (s.key === SettingsKey.CARRY_FORWARD_BALANCE) stateUpdate.carryForwardBalance = normalizedValue === 'true';
            });

            set(stateUpdate);
        } catch (error) {
            console.error('Failed to load settings into store:', error);
            set({ isLoaded: true });
        }
    },

    updateSetting: async (key: SettingsKey, value: string) => {
        try {
            // Write to DB
            const existing = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key));
            if (existing.length > 0) {
                await db.update(schema.appSettings).set({ value }).where(eq(schema.appSettings.key, key));
            } else {
                await db.insert(schema.appSettings).values({ key, value });
            }

            // Update Store
            if (key === SettingsKey.CURRENCY_SYMBOL) set({ currencySymbol: value });
            if (key === SettingsKey.CURRENCY_CODE) set({ currencyCode: value });
            if (key === SettingsKey.THEME_MODE) set({ themeMode: value as ThemeMode });
            if (key === SettingsKey.CARRY_FORWARD_BALANCE) set({ carryForwardBalance: value === 'true' });

        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
        }
    }
}));
