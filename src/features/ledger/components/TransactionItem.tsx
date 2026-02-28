import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { formatCurrency } from '../../../core/utils';
import { TransactionType } from '../../../core/constants';

interface TransactionItemProps {
    transaction: any;
    onPress: (txn: any) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
    transaction,
    onPress,
}) => {
    const { theme, colors } = useAppTheme();

    const isIncome = transaction.type === TransactionType.INCOME;
    const isTransfer = transaction.type === TransactionType.TRANSFER;

    const amountColor = isIncome
        ? colors.income
        : isTransfer
            ? colors.transfer
            : colors.expense;

    return (
        <TouchableOpacity
            onPress={() => onPress(transaction)}
            style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.left}>
                <View style={[styles.iconPlaceholder, { backgroundColor: theme.background }]}>
                    <Text style={styles.iconText}>{transaction.categoryIcon || '💰'}</Text>
                </View>
                <View style={styles.details}>
                    <Text style={[styles.category, { color: theme.text }]}>
                        {transaction.categoryName || 'Uncategorized'}
                    </Text>
                    <Text style={[styles.note, { color: theme.textSecondary }]}>
                        {transaction.note || transaction.accountName}
                    </Text>
                </View>
            </View>

            <View style={styles.right}>
                <Text style={[styles.amount, { color: amountColor }]}>
                    {isIncome ? '+' : isTransfer ? '' : '-'}
                    {formatCurrency(transaction.amount)}
                </Text>
                <Text style={[styles.account, { color: theme.textSecondary }]}>
                    {transaction.accountName}
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 20,
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
        fontWeight: 'bold',
    },
    account: {
        fontSize: 10,
        marginTop: 2,
    },
});
