import { useColorScheme } from 'react-native';
import { Colors } from './colors';
import { useSettingsStore } from '../../stores/settingsStore';
import { ThemeMode } from '../constants';

/**
 * Custom hook to get theme colors based on the current system preference or user setting.
 */
export function useAppTheme() {
    const systemScheme = useColorScheme();
    const { themeMode } = useSettingsStore();

    const isDark =
        themeMode === ThemeMode.DARK ? true :
            themeMode === ThemeMode.LIGHT ? false :
                systemScheme === 'dark';

    const theme = isDark ? Colors.dark : Colors.light;

    return {
        isDark,
        theme,
        colors: Colors,
    };
}

export * from './colors';
