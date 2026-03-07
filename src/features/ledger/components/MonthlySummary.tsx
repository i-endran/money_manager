import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Typography, useAppTheme } from '../../../core/theme';
import { formatCurrency } from '../../../core/utils';
import { useSettingsStore } from '../../../stores/settingsStore';

interface MonthlySummaryProps {
    income: number;
    expense: number;
    balance: number;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({
    income,
    expense,
    balance,
}) => {
    const { theme, colors } = useAppTheme();
    const { currencySymbol } = useSettingsStore();

    return (
        <View style={styles.container}>
            <View style={styles.item}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Income</Text>
                <Text style={[styles.value, { color: colors.income }]}>
                    {formatCurrency(income, currencySymbol)}
                </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.item}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Expense</Text>
                <Text style={[styles.value, { color: colors.expense }]}>
                    {formatCurrency(expense, currencySymbol)}
                </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.item}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Total</Text>
                <Text
                    style={[
                        styles.value,
                        { color: theme.text },
                    ]}>
                    {formatCurrency(balance, currencySymbol)}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    item: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: '100%',
    },
    label: {
        fontSize: Typography.sizes.sm,
        marginBottom: Spacing.xs,
    },
    value: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.bold,
    },
});
