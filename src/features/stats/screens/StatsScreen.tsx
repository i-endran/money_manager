import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Typography, useAppTheme } from '../../../core/theme';

export const StatsScreen: React.FC = () => {
    const { theme } = useAppTheme();

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Statistics</Text>
            </View>
            <View style={styles.center}>
                <Text style={styles.chartIcon}>📊</Text>
                <Text style={[styles.comingSoon, { color: theme.textSecondary }]}>
                    Charts & Insights
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Coming Soon</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    title: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartIcon: {
        fontSize: Typography.sizes.hero,
        marginBottom: Spacing.xl,
    },
    comingSoon: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
    },
    subtitle: {
        marginTop: Spacing.xs,
    },
});
