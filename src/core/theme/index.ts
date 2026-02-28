import { useColorScheme } from 'react-native';
import { Colors } from './colors';

/**
 * Custom hook to get theme colors based on the current system preference.
 */
export function useAppTheme() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;

    return {
        isDark,
        theme,
        colors: Colors,
    };
}

export * from './colors';
