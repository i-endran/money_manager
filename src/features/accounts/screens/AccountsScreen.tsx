import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { useAppTheme } from '../../../core/theme';

export const AccountsScreen: React.FC = () => {
    const { theme, colors } = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Accounts</Text>
            </View>
            <View style={styles.center}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🏦</Text>
                <Text style={[styles.comingSoon, { color: theme.textSecondary }]}>
                    Account Balances
                </Text>
                <Text style={{ color: theme.textSecondary, marginTop: 4 }}>Coming Soon</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    comingSoon: {
        fontSize: 18,
        fontWeight: '600',
    },
});
