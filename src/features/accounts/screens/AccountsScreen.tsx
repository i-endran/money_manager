import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    Colors,
    LedgerRowDensityPreset,
    LedgerSummaryCardMetricsPreset,
    LedgerTextHierarchyPreset,
    Layout,
    Spacing,
    Typography,
    useAppTheme,
} from '../../../core/theme';
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
                    <View
                        style={[
                            styles.summaryBar,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}>
                        <View style={styles.summaryColumn}>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Holding</Text>
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
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Current Bal.</Text>
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
                                const totalUnbilled = rows.reduce((sum, row) => {
                                    const breakdown = cardBreakdownById.get(row.item.id);
                                    if (!breakdown) return sum;
                                    return sum + liabilityAmountFromBalance(breakdown.current);
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
                                                    <Text style={[styles.cardColumnLabel, { color: theme.textSecondary }]}>Billed</Text>
                                                    <Text
                                                        style={[
                                                            styles.cardColumnValue,
                                                            { color: totalPayable > 0 ? colors.expense : theme.text },
                                                        ]}>
                                                        {formatCurrency(totalPayable, currencySymbol)}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardColumn}>
                                                    <Text style={[styles.cardColumnLabel, { color: theme.textSecondary }]}>Unbilled</Text>
                                                    <Text
                                                        style={[
                                                            styles.cardColumnValue,
                                                            { color: totalUnbilled > 0 ? colors.expense : theme.text },
                                                        ]}>
                                                        {formatCurrency(totalUnbilled, currencySymbol)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
                                            {rows.map((row, index) => {
                                                const isLast = index === rows.length - 1;
                                                const breakdown = cardBreakdownById.get(row.item.id);
                                                const payable = liabilityAmountFromBalance(breakdown?.billGenerated || 0);
                                                const unbilled = liabilityAmountFromBalance(breakdown?.current || 0);

                                                return (
                                                    <TouchableOpacity
                                                        key={`${group.type}-${row.item.id}`}
                                                        activeOpacity={0.72}
                                                        onPress={() => openFilteredLedger(row.item)}
                                                        style={[
                                                             styles.cardRow,
                                                             !isLast && {
                                                                borderBottomWidth: LedgerRowDensityPreset.separatorThickness,
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
                                                                    { color: unbilled > 0 ? colors.expense : theme.text },
                                                                ]}>
                                                                {formatCurrency(unbilled, currencySymbol)}
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
                                                            borderBottomWidth: LedgerRowDensityPreset.separatorThickness,
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
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
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
        width: Spacing.xxxxl,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
    },
    content: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxxxl,
        gap: Spacing.lg,
    },
    summaryBar: {
        flexDirection: 'row',
        borderRadius: LedgerSummaryCardMetricsPreset.cardRadius,
        borderWidth: LedgerSummaryCardMetricsPreset.dividerThickness,
        overflow: 'hidden',
        paddingVertical: LedgerSummaryCardMetricsPreset.paddingVertical,
        paddingHorizontal: LedgerSummaryCardMetricsPreset.paddingHorizontal,
    },
    summaryColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryDivider: {
        width: LedgerSummaryCardMetricsPreset.dividerThickness,
        marginVertical: LedgerSummaryCardMetricsPreset.dividerSpacing / 2,
        borderRadius: LedgerSummaryCardMetricsPreset.dividerRadius,
    },
    summaryLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.regular,
    },
    summaryValue: {
        marginTop: LedgerSummaryCardMetricsPreset.labelValueSpacing,
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.bold,
    },
    sectionBlock: {
        marginTop: Spacing.xxs,
    },
    floatingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginHorizontal: 0,
        marginBottom: Spacing.xs,
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
        paddingVertical: Spacing.xxs,
        zIndex: 1,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    sectionCard: {
        borderRadius: LedgerSummaryCardMetricsPreset.cardRadius,
        overflow: 'hidden',
    },
    sectionLabel: {
        fontSize: LedgerTextHierarchyPreset.secondary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.secondary.fontWeight,
    },
    sectionAmount: {
        fontSize: LedgerTextHierarchyPreset.amount.fontSize,
        fontWeight: LedgerTextHierarchyPreset.amount.fontWeight,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: LedgerRowDensityPreset.paddingVertical,
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: LedgerRowDensityPreset.paddingVertical,
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
    },
    rowNameWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    rowName: {
        fontSize: LedgerTextHierarchyPreset.primary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.primary.fontWeight,
        flexShrink: 1,
    },
    rowAmount: {
        fontSize: LedgerTextHierarchyPreset.amount.fontSize,
        fontWeight: LedgerTextHierarchyPreset.amount.fontWeight,
    },
    reserveName: {
        paddingLeft: Spacing.xl + Spacing.xxs,
        fontSize: LedgerTextHierarchyPreset.secondary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.secondary.fontWeight,
    },
    badge: {
        borderRadius: Layout.radius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    badgeText: {
        color: Colors.white,
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.bold,
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
        fontSize: LedgerTextHierarchyPreset.secondary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.secondary.fontWeight,
    },
    cardColumnValue: {
        marginTop: LedgerSummaryCardMetricsPreset.labelValueSpacing,
        fontSize: LedgerTextHierarchyPreset.amount.fontSize,
        fontWeight: LedgerTextHierarchyPreset.amount.fontWeight,
    },
    cardRowAmounts: {
        flexDirection: 'row',
        flex: 1.4,
    },
    cardRowAmount: {
        flex: 1,
        textAlign: 'right',
        fontSize: LedgerTextHierarchyPreset.amount.fontSize,
        fontWeight: LedgerTextHierarchyPreset.amount.fontWeight,
    },
    center: {
        paddingVertical: Spacing.xxxl,
        alignItems: 'center',
    },
});
