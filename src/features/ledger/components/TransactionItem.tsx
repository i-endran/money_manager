import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';
import { formatCurrency, splitEmoji } from '../../../core/utils';
import { TransactionType } from '../../../core/constants';
import { useSettingsStore } from '../../../stores/settingsStore';

interface TransactionItemProps {
    transaction: any;
    onPress: (txn: any) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
    transaction,
    onPress,
}) => {
    const { theme, colors } = useAppTheme();
    const { currencySymbol } = useSettingsStore();

    const isIncome = transaction.type === TransactionType.INCOME;
    const isTransfer = transaction.type === TransactionType.TRANSFER;

    const amountColor = isIncome
        ? colors.income
        : isTransfer
            ? colors.transfer
            : colors.expense;

    const { emoji, text: categoryText } = splitEmoji(
        transaction.categoryName || 'Uncategorized',
    );

    // Opening balance pseudo-entry
    if (transaction.isOpeningBalance) {
        return (
            <View style={[styles.container, { opacity: 0.5 }]}>
                <View style={styles.left}>
                    <View style={[styles.iconPlaceholder, { backgroundColor: theme.border }]}>
                        <Ionicons
                            name="arrow-up-outline"
                            size={Typography.sizes.md}
                            color={theme.textSecondary}
                        />
                    </View>
                    <View style={styles.details}>
                        <Text style={[styles.category, { color: theme.textSecondary }]}>
                            Opening Balance
                        </Text>
                        <Text style={[styles.note, { color: theme.textSecondary }]} numberOfLines={1}>
                            {transaction.note}
                        </Text>
                    </View>
                </View>
                <View style={styles.right}>
                    <Text style={[styles.amount, { color: theme.textSecondary }]}>
                        {formatCurrency(transaction.amount, currencySymbol)}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <TouchableOpacity
            onPress={() => onPress(transaction)}
            style={styles.container}>
            <View style={styles.left}>
                <View style={[styles.iconPlaceholder, { backgroundColor: isTransfer ? theme.border : theme.background }]}>
                    <Text style={styles.iconText}>{isTransfer ? '🔄' : emoji}</Text>
                </View>
                <View style={styles.details}>
                    <Text style={[styles.category, { color: theme.text }]}>
                        {isTransfer ? 'Transfer' : categoryText || 'Uncategorized'}
                    </Text>
                    <Text style={[styles.note, { color: theme.textSecondary }]} numberOfLines={1}>
                        {isTransfer ? (transaction.note || 'Account Transfer') : (transaction.note || transaction.accountName)}
                    </Text>
                </View>
            </View>

            <View style={styles.right}>
                <Text style={[styles.amount, { color: amountColor }]}>
                    {formatCurrency(transaction.amount, currencySymbol)}
                </Text>
                <Text style={[styles.account, { color: theme.textSecondary }]}>
                    {isTransfer ? `${transaction.accountName} → ${transaction.toAccountName || 'Account'}` : transaction.accountName}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconPlaceholder: {
        width: Layout.iconSize.md,
        height: Layout.iconSize.md,
        borderRadius: Layout.iconSize.md / 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.lg,
    },
    iconText: {
        fontSize: Typography.sizes.base,
    },
    details: {
        flex: 1,
    },
    category: {
        fontSize: Typography.sizes.sm2,
        fontWeight: Typography.weights.medium,
    },
    note: {
        fontSize: Typography.sizes.xs2,
        marginTop: Spacing.xxs,
    },
    right: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: Typography.sizes.sm2,
        fontWeight: Typography.weights.semibold,
    },
    account: {
        fontSize: Typography.sizes.xs,
        marginTop: Spacing.xxs,
    },
});
