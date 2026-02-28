import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { formatCurrency } from '../../../core/utils';

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

    return (
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.item}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Income</Text>
                <Text style={[styles.value, { color: colors.income }]}>
                    {formatCurrency(income)}
                </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.item}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Expense</Text>
                <Text style={[styles.value, { color: colors.expense }]}>
                    {formatCurrency(expense)}
                </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.item}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Balance</Text>
                <Text
                    style={[
                        styles.value,
                        { color: balance >= 0 ? colors.income : colors.expense },
                    ]}>
                    {formatCurrency(balance)}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 4,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    item: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: '#eee',
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
