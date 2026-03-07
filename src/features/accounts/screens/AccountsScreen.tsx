import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Typography, useAppTheme } from '../../../core/theme';
import { formatCurrency } from '../../../core/utils';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { AccountType } from '../../../core/constants';
import { isLoanLikeType, liabilityAmountFromBalance } from '../../../core/utils';
import { AccountBalanceItem, AccountGroup, useAccountsSummary } from '../hooks/useAccountsSummary';

type NavType = NativeStackNavigationProp<RootStackParamList>;

function flattenGroupRows(group: AccountGroup): Array<{ item: AccountBalanceItem; isReserve: boolean }> {
    return group.accounts.flatMap(account => [
        { item: account, isReserve: false },
        ...account.reserves.map(reserve => ({ item: reserve, isReserve: true })),
    ]);
}

export const AccountsScreen: React.FC = () => {
    const { theme, colors } = useAppTheme();
    const { currencySymbol } = useSettingsStore();
    const { refreshTick, setCurrentDate } = useLedgerStore();
    const { loading, summary, load } = useAccountsSummary();
    const navigation = useNavigation<NavType>();
    const cardBreakdownById = useMemo(
        () => new Map(summary.cardBreakdowns.map(item => [item.id, item])),
        [summary.cardBreakdowns],
    );

    const openFilteredLedger = useCallback(
        (account: AccountBalanceItem) => {
            const now = new Date();
            setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
            navigation.navigate('MainTabs', {
                screen: 'Ledger',
                params: {
                    accountId: account.id,
                    accountName: account.name,
                    fromAccounts: true,
                },
            });
        },
        [navigation, setCurrentDate],
    );

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    useEffect(() => {
        load();
    }, [load, refreshTick]);

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View style={styles.headerSpacer} />
                <Text style={[styles.title, { color: theme.text }]}>Accounts</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AccountManagement')}>
                        <Ionicons name="pencil-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AccountForm')}>
                        <Ionicons name="add" size={29} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Text style={{ color: theme.textSecondary }}>Loading account summary...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.summaryBar, { backgroundColor: theme.surface }]}>
                        <View style={styles.summaryColumn}>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Balance</Text>
                            <Text style={[styles.summaryValue, { color: colors.income }]}>
                                {formatCurrency(summary.standingBalance, currencySymbol)}
                            </Text>
                        </View>
                        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.summaryColumn}>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Payable</Text>
                            <Text style={[styles.summaryValue, { color: colors.expense }]}>
                                {formatCurrency(summary.liabilities, currencySymbol)}
                            </Text>
                        </View>
                        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.summaryColumn}>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total</Text>
                            <Text style={[styles.summaryValue, { color: theme.text }]}>
                                {formatCurrency(summary.totalBalance, currencySymbol)}
                            </Text>
                        </View>
                    </View>

                    {summary.groups.length === 0 ? (
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No accounts found.</Text>
                        </View>
                    ) : (
                        summary.groups.map(group => {
                            const rows = flattenGroupRows(group);

                            if (group.type === AccountType.CARD) {
                                const totalPayable = rows.reduce((sum, row) => {
                                    const breakdown = cardBreakdownById.get(row.item.id);
                                    if (!breakdown) return sum;
                                    return sum + liabilityAmountFromBalance(breakdown.billGenerated);
                                }, 0);
                                const totalOutstanding = rows.reduce((sum, row) => {
                                    const breakdown = cardBreakdownById.get(row.item.id);
                                    if (!breakdown) return sum;
                                    return sum + liabilityAmountFromBalance(breakdown.total);
                                }, 0);

                                return (
                                    <View key={group.type} style={styles.sectionBlock}>
                                        <View style={styles.floatingHeader}>
                                            <View style={styles.sectionHeaderLeft}>
                                                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{group.label}</Text>
                                                {group.isClosedBoxType && (
                                                    <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                                        <Text style={styles.badgeText}>Closed-Box</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.cardColumnsWrap}>
                                                <View style={styles.cardColumn}>
                                                    <Text style={[styles.cardColumnLabel, { color: theme.textSecondary }]}>Payable</Text>
                                                    <Text
                                                        style={[
                                                            styles.cardColumnValue,
                                                            { color: totalPayable > 0 ? colors.expense : theme.text },
                                                        ]}>
                                                        {formatCurrency(totalPayable, currencySymbol)}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardColumn}>
                                                    <Text style={[styles.cardColumnLabel, { color: theme.textSecondary }]}>Outst. Bal</Text>
                                                    <Text
                                                        style={[
                                                            styles.cardColumnValue,
                                                            { color: totalOutstanding > 0 ? colors.expense : theme.text },
                                                        ]}>
                                                        {formatCurrency(totalOutstanding, currencySymbol)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
                                            {rows.map((row, index) => {
                                                const isLast = index === rows.length - 1;
                                                const breakdown = cardBreakdownById.get(row.item.id);
                                                const payable = liabilityAmountFromBalance(breakdown?.billGenerated || 0);
                                                const outstanding = liabilityAmountFromBalance(breakdown?.total || 0);

                                                return (
                                                    <TouchableOpacity
                                                        key={`${group.type}-${row.item.id}`}
                                                        activeOpacity={0.72}
                                                        onPress={() => openFilteredLedger(row.item)}
                                                        style={[
                                                            styles.cardRow,
                                                            !isLast && {
                                                                borderBottomWidth: StyleSheet.hairlineWidth,
                                                                borderBottomColor: theme.border,
                                                            },
                                                        ]}>
                                                        <View style={styles.rowNameWrap}>
                                                            <Text
                                                                style={[
                                                                    styles.rowName,
                                                                    { color: row.isReserve ? theme.textSecondary : theme.text },
                                                                    row.isReserve && styles.reserveName,
                                                                ]}>
                                                                {row.isReserve ? `↳ ${row.item.name}` : row.item.name}
                                                            </Text>
                                                            {row.item.isClosedBoxLike && !group.isClosedBoxType && (
                                                                <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                                                    <Text style={styles.badgeText}>Closed-Box</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <View style={styles.cardRowAmounts}>
                                                            <Text style={[styles.cardRowAmount, { color: payable > 0 ? colors.expense : theme.text }]}>
                                                                {formatCurrency(payable, currencySymbol)}
                                                            </Text>
                                                            <Text
                                                                style={[
                                                                    styles.cardRowAmount,
                                                                    { color: outstanding > 0 ? colors.expense : theme.text },
                                                                ]}>
                                                                {formatCurrency(outstanding, currencySymbol)}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            }

                            const normalizedGroupAmount = group.isLoanLike
                                ? -liabilityAmountFromBalance(group.total)
                                : group.total;
                            const groupAmountColor = normalizedGroupAmount > 0
                                ? colors.income
                                : normalizedGroupAmount < 0
                                    ? colors.expense
                                    : theme.text;

                            return (
                                <View key={group.type} style={styles.sectionBlock}>
                                    <View style={styles.floatingHeader}>
                                        <View style={styles.sectionHeaderLeft}>
                                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{group.label}</Text>
                                            {group.isClosedBoxType && (
                                                <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                                    <Text style={styles.badgeText}>Closed-Box</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.sectionAmount, { color: groupAmountColor }]}>
                                            {formatCurrency(
                                                group.isLoanLike ? liabilityAmountFromBalance(group.total) : group.total,
                                                currencySymbol,
                                            )}
                                        </Text>
                                    </View>
                                    <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
                                        {rows.map((row, index) => {
                                            const isLast = index === rows.length - 1;
                                            const isLoan = isLoanLikeType(row.item.type);
                                            const signedAmount = isLoan
                                                ? -liabilityAmountFromBalance(row.item.balance)
                                                : row.item.balance;
                                            const amountColor = signedAmount > 0
                                                ? colors.income
                                                : signedAmount < 0 || isLoan
                                                    ? colors.expense
                                                    : theme.text;

                                            return (
                                                <TouchableOpacity
                                                    key={`${group.type}-${row.item.id}`}
                                                    activeOpacity={0.72}
                                                    onPress={() => openFilteredLedger(row.item)}
                                                    style={[
                                                        styles.row,
                                                        !isLast && {
                                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                                            borderBottomColor: theme.border,
                                                        },
                                                    ]}>
                                                    <View style={styles.rowNameWrap}>
                                                        <Text
                                                            style={[
                                                                styles.rowName,
                                                                { color: row.isReserve ? theme.textSecondary : theme.text },
                                                                row.isReserve && styles.reserveName,
                                                            ]}>
                                                            {row.isReserve ? `↳ ${row.item.name}` : row.item.name}
                                                        </Text>
                                                        {row.item.isClosedBoxLike && !group.isClosedBoxType && (
                                                            <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                                                <Text style={styles.badgeText}>Closed-Box</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={[styles.rowAmount, { color: amountColor }]}>
                                                        {formatCurrency(
                                                            isLoan ? liabilityAmountFromBalance(row.item.balance) : row.item.balance,
                                                            currencySymbol,
                                                        )}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerSpacer: {
        width: 72,
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: 72,
    },
    iconButton: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: '700',
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 12,
    },
    summaryBar: {
        flexDirection: 'row',
        borderRadius: 16,
        overflow: 'hidden',
        paddingVertical: 12,
    },
    summaryColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryDivider: {
        width: StyleSheet.hairlineWidth,
    },
    summaryLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: '500',
    },
    summaryValue: {
        marginTop: 4,
        fontSize: Typography.sizes.md,
        fontWeight: '600',
    },
    sectionBlock: {
        marginTop: 2,
    },
    floatingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginHorizontal: 8,
        marginBottom: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        zIndex: 1,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    sectionCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    sectionLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: '600',
    },
    sectionAmount: {
        fontSize: 13,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    rowNameWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    rowName: {
        fontSize: Typography.sizes.md,
        fontWeight: '500',
        flexShrink: 1,
    },
    rowAmount: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
    },
    reserveName: {
        paddingLeft: 18,
        fontSize: Typography.sizes.sm,
    },
    badge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeText: {
        color: '#fff',
        fontSize: Typography.sizes.xs,
        fontWeight: '700',
    },
    cardColumnsWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flex: 1.4,
    },
    cardColumn: {
        flex: 1,
        alignItems: 'flex-end',
    },
    cardColumnLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: '500',
    },
    cardColumnValue: {
        marginTop: 2,
        fontSize: 13,
        fontWeight: '600',
    },
    cardRowAmounts: {
        flexDirection: 'row',
        flex: 1.4,
    },
    cardRowAmount: {
        flex: 1,
        textAlign: 'right',
        fontSize: Typography.sizes.md,
        fontWeight: '600',
    },
    center: {
        paddingVertical: 24,
        alignItems: 'center',
    },
});
