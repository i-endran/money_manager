import React, { useCallback, useMemo } from 'react';
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
import { AccountType, LABEL_OPT_OUT } from '../../../core/constants';
import { isLoanLikeType, liabilityAmountFromBalance } from '../../../core/utils';
import { AccountBalanceItem, AccountGroup, useAccountsSummary } from '../hooks/useAccountsSummary';
import {
    colorForSignedAmount,
    signedAmountForLoanAwareTotal,
    signedAmountFromLiability,
} from '../utils/summaryDisplay';

type NavType = NativeStackNavigationProp<RootStackParamList>;

function flattenGroupRows(group: AccountGroup): Array<{ item: AccountBalanceItem; isReserve: boolean }> {
    return group.accounts.flatMap(account => [
        { item: account, isReserve: false },
        ...account.reserves.map(reserve => ({ item: reserve, isReserve: true })),
    ]);
}

export const AccountsScreen: React.FC = () => {
    const { theme, colors } = useAppTheme();
    const currencySymbol = useSettingsStore(state => state.currencySymbol);
    const refreshTick    = useLedgerStore(state => state.refreshTick);
    const setCurrentDate = useLedgerStore(state => state.setCurrentDate);
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

    // Single hook: fires on focus + re-fires when refreshTick changes while focused.
    // useFocusEffect's internal useEffect re-runs when callback identity changes,
    // and re-executes the effect if navigation.isFocused() is true at that point.
    useFocusEffect(
        useCallback(() => {
            void refreshTick;
            load();
        }, [load, refreshTick]),
    );

    const holdingAmountColor = colorForSignedAmount(summary.standingBalance, {
        positive: colors.income,
        negative: colors.expense,
        neutral: theme.text,
    });
    const payableSignedAmount = signedAmountFromLiability(summary.liabilities);
    const payableAmountColor = colorForSignedAmount(payableSignedAmount, {
        positive: colors.income,
        negative: colors.expense,
        neutral: theme.text,
    });
    const summarySubtotalColor = theme.textSecondary;

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
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
                            <Text style={[styles.summaryValue, { color: holdingAmountColor }]}>
                                {formatCurrency(summary.standingBalance, currencySymbol)}
                            </Text>
                        </View>
                        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.summaryColumn}>
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Payable</Text>
                            <Text style={[styles.summaryValue, { color: payableAmountColor }]}>
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
                                const signedTotalPayable = signedAmountFromLiability(totalPayable);
                                const signedTotalUnbilled = signedAmountFromLiability(totalUnbilled);

                                return (
                                    <View key={group.type} style={styles.sectionBlock}>
                                        <View style={styles.floatingHeader}>
                                            <View style={styles.sectionHeaderLeft}>
                                                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{group.label}</Text>
                                                {group.isClosedBoxType && (
                                                    <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                                        <Text style={styles.badgeText}>{LABEL_OPT_OUT}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.cardColumnsWrap}>
                                                <View style={styles.cardColumn}>
                                                    <Text style={[styles.cardColumnLabel, { color: theme.textSecondary }]}>Billed</Text>
                                                    <Text
                                                        style={[
                                                            styles.cardColumnValue,
                                                            { color: summarySubtotalColor },
                                                        ]}>
                                                        {formatCurrency(signedTotalPayable, currencySymbol)}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardColumn}>
                                                    <Text style={[styles.cardColumnLabel, { color: theme.textSecondary }]}>Unbilled</Text>
                                                    <Text
                                                        style={[
                                                            styles.cardColumnValue,
                                                            { color: summarySubtotalColor },
                                                        ]}>
                                                        {formatCurrency(signedTotalUnbilled, currencySymbol)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
                                            {group.accounts.map((account, accountIndex) => {
                                                const accountRows = [
                                                    { item: account, isReserve: false },
                                                    ...account.reserves.map(reserve => ({ item: reserve, isReserve: true })),
                                                ];
                                                const hasReserves = account.reserves.length > 0;
                                                const isLastAccount = accountIndex === group.accounts.length - 1;
                                                const subtotalPayable = accountRows.reduce((sum, row) => {
                                                    const breakdown = cardBreakdownById.get(row.item.id);
                                                    if (!breakdown) return sum;
                                                    return sum + liabilityAmountFromBalance(breakdown.billGenerated);
                                                }, 0);
                                                const subtotalUnbilled = accountRows.reduce((sum, row) => {
                                                    const breakdown = cardBreakdownById.get(row.item.id);
                                                    if (!breakdown) return sum;
                                                    return sum + liabilityAmountFromBalance(breakdown.current);
                                                }, 0);
                                                const signedSubtotalPayable = signedAmountFromLiability(subtotalPayable);
                                                const signedSubtotalUnbilled = signedAmountFromLiability(subtotalUnbilled);

                                                return (
                                                    <React.Fragment key={`${group.type}-account-${account.id}`}>
                                                        {accountRows.map((row, rowIndex) => {
                                                            const isLastRowForAccount = rowIndex === accountRows.length - 1;
                                                            const showRowDivider = !isLastRowForAccount || (!hasReserves && !isLastAccount);
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
                                                                        row.isReserve && styles.reserveRow,
                                                                        row.isReserve && { borderLeftColor: theme.primary },
                                                                        showRowDivider && {
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
                                                                            {row.item.name}
                                                                        </Text>
                                                                        {row.item.isClosedBoxLike && !group.isClosedBoxType && (
                                                                            <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                                                                <Text style={styles.badgeText}>{LABEL_OPT_OUT}</Text>
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                    <View style={styles.cardRowAmounts}>
                                                                        <Text
                                                                            style={[
                                                                                styles.cardRowAmount,
                                                                                { color: payable > 0 ? colors.expense : theme.text },
                                                                            ]}>
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

                                                        {hasReserves && (
                                                            <View
                                                                style={[
                                                                    styles.subtotalRow,
                                                                    {
                                                                        borderTopWidth: LedgerRowDensityPreset.separatorThickness,
                                                                        borderTopColor: theme.border,
                                                                        backgroundColor: theme.background,
                                                                    },
                                                                    !isLastAccount && {
                                                                        borderBottomWidth: LedgerRowDensityPreset.separatorThickness,
                                                                        borderBottomColor: theme.border,
                                                                    },
                                                                ]}>
                                                                <Text style={[styles.subtotalLabel, { color: theme.textSecondary }]}>Total</Text>
                                                                <View style={styles.cardRowAmounts}>
                                                                    <Text
                                                                        style={[
                                                                            styles.subtotalCardAmount,
                                                                            { color: summarySubtotalColor },
                                                                        ]}>
                                                                        {formatCurrency(signedSubtotalPayable, currencySymbol)}
                                                                    </Text>
                                                                    <Text
                                                                        style={[
                                                                            styles.subtotalCardAmount,
                                                                            { color: summarySubtotalColor },
                                                                        ]}>
                                                                        {formatCurrency(signedSubtotalUnbilled, currencySymbol)}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            }

                            const normalizedGroupAmount = signedAmountForLoanAwareTotal(group.total, group.isLoanLike);

                            return (
                                <View key={group.type} style={styles.sectionBlock}>
                                    <View style={styles.floatingHeader}>
                                        <View style={styles.sectionHeaderLeft}>
                                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{group.label}</Text>
                                            {group.isClosedBoxType && (
                                                <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                                    <Text style={styles.badgeText}>{LABEL_OPT_OUT}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.sectionAmount, { color: summarySubtotalColor }]}>
                                            {formatCurrency(normalizedGroupAmount, currencySymbol)}
                                        </Text>
                                    </View>
                                    <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
                                        {group.accounts.map((account, accountIndex) => {
                                            const accountRows = [
                                                { item: account, isReserve: false },
                                                ...account.reserves.map(reserve => ({ item: reserve, isReserve: true })),
                                            ];
                                            const hasReserves = account.reserves.length > 0;
                                            const isLastAccount = accountIndex === group.accounts.length - 1;
                                            const subtotalBalance = accountRows.reduce((sum, row) => sum + row.item.balance, 0);
                                            const accountIsLoan = isLoanLikeType(account.type);
                                            const subtotalSignedAmount = signedAmountForLoanAwareTotal(
                                                subtotalBalance,
                                                accountIsLoan,
                                            );

                                            return (
                                                <React.Fragment key={`${group.type}-account-${account.id}`}>
                                                    {accountRows.map((row, rowIndex) => {
                                                        const isLastRowForAccount = rowIndex === accountRows.length - 1;
                                                        const showRowDivider = !isLastRowForAccount || (!hasReserves && !isLastAccount);
                                                        const isLoan = isLoanLikeType(row.item.type);
                                                        const signedAmount = signedAmountForLoanAwareTotal(
                                                            row.item.balance,
                                                            isLoan,
                                                        );
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
                                                                    row.isReserve && styles.reserveRow,
                                                                    row.isReserve && { borderLeftColor: theme.primary },
                                                                    showRowDivider && {
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
                                                                        {row.item.name}
                                                                    </Text>
                                                                    {row.item.isClosedBoxLike && !group.isClosedBoxType && (
                                                                        <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                                                            <Text style={styles.badgeText}>{LABEL_OPT_OUT}</Text>
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

                                                    {hasReserves && (
                                                        <View
                                                            style={[
                                                                styles.subtotalRow,
                                                                {
                                                                    borderTopWidth: LedgerRowDensityPreset.separatorThickness,
                                                                    borderTopColor: theme.border,
                                                                    backgroundColor: theme.background,
                                                                },
                                                                !isLastAccount && {
                                                                    borderBottomWidth: LedgerRowDensityPreset.separatorThickness,
                                                                    borderBottomColor: theme.border,
                                                                },
                                                            ]}>
                                                            <Text style={[styles.subtotalLabel, { color: theme.textSecondary }]}>Total</Text>
                                                            <Text style={[styles.subtotalAmount, { color: summarySubtotalColor }]}>
                                                                {formatCurrency(subtotalSignedAmount, currencySymbol)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </React.Fragment>
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
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    iconButton: {
        width: Spacing.xxxxl,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes.xl,
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
    reserveRow: {
        paddingLeft: Spacing.xxxl,
        borderLeftWidth: 2,
    },
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: LedgerRowDensityPreset.paddingVertical,
        paddingRight: LedgerRowDensityPreset.paddingHorizontal,
        paddingLeft: Spacing.xxxl,
    },
    subtotalLabel: {
        fontSize: LedgerTextHierarchyPreset.secondary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.secondary.fontWeight,
    },
    subtotalAmount: {
        fontSize: LedgerTextHierarchyPreset.secondary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.secondary.fontWeight,
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
    subtotalCardAmount: {
        flex: 1,
        textAlign: 'right',
        fontSize: LedgerTextHierarchyPreset.secondary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.secondary.fontWeight,
    },
    center: {
        paddingVertical: Spacing.xxxl,
        alignItems: 'center',
    },
});
