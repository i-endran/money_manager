import { SettingsKey, ThemeMode, AuthMethod } from './enums';

// Default settings applied on first launch
export const DEFAULT_SETTINGS: Record<string, string> = {
    [SettingsKey.CURRENCY_SYMBOL]: '₹',
    [SettingsKey.CURRENCY_CODE]: 'INR',
    [SettingsKey.THEME_MODE]: ThemeMode.SYSTEM,
    [SettingsKey.AUTH_ENABLED]: 'false',
    [SettingsKey.AUTH_METHOD]: AuthMethod.PIN,
    [SettingsKey.PIN_HASH]: '',
};

// Auto-palette colors — 12 curated, visually distinct colors
export const COLOR_PALETTE = [
    '#E57373', // red
    '#64B5F6', // blue
    '#81C784', // green
    '#FFB74D', // orange
    '#BA68C8', // purple
    '#4DD0E1', // cyan
    '#FFD54F', // amber
    '#A1887F', // brown
    '#90A4AE', // blue-grey
    '#F06292', // pink
    '#AED581', // light green
    '#7986CB', // indigo
] as const;

/**
 * Get a color from the palette based on entity ID.
 * Distributes colors evenly across entities.
 */
export function getPaletteColor(entityId: number): string {
    return COLOR_PALETTE[entityId % COLOR_PALETTE.length];
}
