export const Colors = {
    // Common UI colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    overlayStrong: 'rgba(0, 0, 0, 0.72)',
    overlayMedium: 'rgba(0, 0, 0, 0.48)',
    overlayLight: 'rgba(0, 0, 0, 0.24)',
    lightGlass: 'rgba(255, 255, 255, 0.72)',
    darkGlass: 'rgba(18, 18, 18, 0.72)',

    // Light theme — iOS-style off-white "Cloud Gray"
    light: {
        // Accents
        primary: '#1B3A5C', // Brand accent — Navy Blue
        income: '#2E7D32',
        expense: '#C62828',
        transfer: '#1B3A5C',

        // Surfaces
        background: '#F5F5F7',
        surface: '#FFFFFF',
        text: '#1C1B1F',
        textSecondary: '#6E6E73',
        border: '#D1D1D6',
        weekendTint: '#ECEDF0',
        card: '#FFFFFF',
        tabBar: '#FFFFFF',
        tabBarActive: '#1B3A5C',
        tabBarInactive: '#8E8E93',
        statusActive: '#2E7D32',
        statusInactive: '#8E8E93',
    },

    // Dark theme — softer black to reduce eye strain with brighter accents
    dark: {
        // Accents (Brighter for dark backgrounds)
        primary: '#2568c5ff', // Medium blue
        income: '#73bd77ff',  // Soft pastel green
        expense: '#c96161ff', // Soft pastel red
        transfer: '#2568c5ff',

        // Surfaces
        background: '#121212', // Material Dark Grey
        surface: '#1E1E1E',
        text: '#F4F4F5',
        textSecondary: '#A1A1AA',
        border: '#2C2C2E',
        weekendTint: '#18181B',
        card: '#242426',
        tabBar: '#1C1C1E',
        tabBarActive: '#5B9BD5',
        tabBarInactive: '#636366',
        statusActive: '#73bd77ff',
        statusInactive: '#636366',
    },
};
