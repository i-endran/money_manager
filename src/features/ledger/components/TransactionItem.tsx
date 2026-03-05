import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../../core/theme';
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
                        <Text style={styles.iconText}>{transaction.type === TransactionType.INCOME ? '📥' : '📤'}</Text>
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
            style={[styles.container]}>
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
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 16,
    },
    details: {
        flex: 1,
    },
    category: {
        fontSize: 16,
        fontWeight: '500',
    },
    note: {
        fontSize: 12,
        marginTop: 2,
    },
    right: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: '500',
    },
    account: {
        fontSize: 10,
        marginTop: 2,
    },
});
