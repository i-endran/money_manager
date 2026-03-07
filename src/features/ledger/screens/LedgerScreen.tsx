import React from 'react';
import {
    Platform,
    SectionList,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { useMonthlyLedger } from '../hooks/useMonthlyLedger';
import { MonthSelector } from '../components/MonthSelector';
import { MonthlySummary } from '../components/MonthlySummary';
import { TransactionItem } from '../components/TransactionItem';
import { formatCurrency } from '../../../core/utils';
import { useSettingsStore } from '../../../stores/settingsStore';

import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../../../navigation/RootNavigator';
import { BottomTabNavigationProp, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { format, subMonths } from 'date-fns';

export const LedgerScreen: React.FC = () => {
    const { theme, colors } = useAppTheme();
    const { currentDate, nextMonth, prevMonth } = useLedgerStore();
    const route = useRoute<RouteProp<TabParamList, 'Ledger'>>();
    const activeFilterAccountId = route.params?.accountId as number | undefined;
    const activeFilterAccountName = route.params?.accountName as string | undefined;
    const hasAccountFilter = typeof activeFilterAccountId === 'number';
    const { data, summary, loading } = useMonthlyLedger(activeFilterAccountId);
    const { currencySymbol } = useSettingsStore();
    const stackNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const tabNavigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const handleTransactionPress = (txn: any) => {
        stackNavigation.navigate('TransactionForm', { transactionId: txn.id });
    };

    const handleAddPress = () => {
        stackNavigation.navigate('TransactionForm');
    };

    const clearAccountFilter = () => {
        tabNavigation.setParams({
            accountId: undefined,
            accountName: undefined,
            fromAccounts: undefined,
        });
    };

    const goBackToAccounts = () => {
        clearAccountFilter();
        tabNavigation.navigate('Accounts');
    };

    const renderSectionHeader = ({ section: { title, dayIncome, dayExpense, isOpeningBalanceSection } }: any) => {
        const sectionDate = new Date(title);
        const weekendLabel = format(sectionDate, 'EEE').toUpperCase();
        const isWeekendDay = weekendLabel === 'SAT' || weekendLabel === 'SUN';
        const dayStampLabel = `${format(sectionDate, 'dd')}, ${weekendLabel}`;

        return (
            <TouchableOpacity
                onPress={() => stackNavigation.navigate('TransactionForm', { selectedDate: sectionDate.toISOString() })}
                style={styles.sectionHeader}>
                <View style={styles.sectionLeft}>
                    {isOpeningBalanceSection ? (
                        <Text style={[styles.openingBalanceMonthText, { color: theme.textSecondary }]}>
                            {format(subMonths(sectionDate, 1), 'MMMM')}
                        </Text>
                    ) : (
                        isWeekendDay ? (
                            <Text style={[styles.weekendBadgeText, { color: colors.expense }]}>
                                {dayStampLabel}
                            </Text>
                        ) : (
                            <Text style={[styles.weekdayBadgeText, { color: theme.text }]}>
                                {dayStampLabel}
                            </Text>
                        )
                    )}
                </View>
                <View style={styles.daySummary}>
                    {dayIncome > 0 && (
                        <Text style={[styles.daySummaryText, { color: colors.income }]}>
                            {formatCurrency(dayIncome, currencySymbol)}
                        </Text>
                    )}
                    {dayExpense > 0 && (
                        <Text style={[styles.daySummaryText, { color: colors.expense }]}>
                            {formatCurrency(dayExpense, currencySymbol)}
                        </Text>
                    )}
                    {dayIncome === 0 && dayExpense === 0 && (
                        <Text style={[styles.daySummaryText, { color: theme.textSecondary }]}>
                            {formatCurrency(0, currencySymbol)}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item, index, section }: any) => {
        const isFirst = index === 0;
        const isLast = index === section.data.length - 1;

        return (
            <View style={[
                styles.cardWrapper,
                {
                    backgroundColor: theme.surface,
                    borderTopLeftRadius: isFirst ? Layout.radius.md : 0,
                    borderTopRightRadius: isFirst ? Layout.radius.md : 0,
                    borderBottomLeftRadius: isLast ? Layout.radius.md : 0,
                    borderBottomRightRadius: isLast ? Layout.radius.md : 0,
                },
            ]}>
                <TransactionItem
                    transaction={item}
                    onPress={handleTransactionPress}
                />
                {!isLast && (
                    <View style={[styles.itemSeparator, { backgroundColor: theme.border }]} />
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Pocket Log</Text>
            </View>

            {hasAccountFilter && (
                <View style={[styles.filterControls, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity onPress={goBackToAccounts} style={styles.filterButton}>
                        <Text style={[styles.filterButtonText, { color: colors.primary }]}>Back</Text>
                    </TouchableOpacity>
                    <View style={styles.filterCenter}>
                        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Filtered Account</Text>
                        <Text style={[styles.filterAccountName, { color: theme.text }]}>
                            {activeFilterAccountName || 'Account'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={clearAccountFilter} style={styles.filterButton}>
                        <Text style={[styles.filterButtonText, { color: colors.primary }]}>Clear</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={[styles.summaryBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <MonthSelector
                    currentDate={currentDate}
                    onPrev={prevMonth}
                    onNext={nextMonth}
                />
                <View style={[styles.bubbleDivider, { backgroundColor: theme.border }]} />
                <MonthlySummary
                    income={summary.income}
                    expense={summary.expense}
                    balance={summary.balance}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <SectionList
                    sections={data}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    stickySectionHeadersEnabled={false}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: tabBarHeight + 92 },
                    ]}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No transactions found</Text>
                        </View>
                    }
                />
            )}

            {/* FAB for Add */}
            <TouchableOpacity
                style={[
                    styles.fab,
                    {
                        backgroundColor: colors.primary,
                        bottom: Platform.OS === 'ios' ? tabBarHeight + 22 : insets.bottom + 20,
                        shadowColor: colors.black,
                    },
                ]}
                onPress={handleAddPress}>
                <Text style={[styles.fabText, { color: colors.white }]}>+</Text>
            </TouchableOpacity>
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
    headerTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold,
    },
    summaryBubble: {
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
        borderRadius: Layout.radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    filterControls: {
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.xs,
        marginBottom: Spacing.xs,
        borderRadius: Layout.radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    filterButton: {
        minWidth: 52,
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    filterButtonText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
    },
    filterCenter: {
        flex: 1,
        alignItems: 'center',
    },
    filterLabel: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.medium,
    },
    filterAccountName: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        marginTop: Spacing.xxs,
    },
    bubbleDivider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: Spacing.xl,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        marginTop: 7,
    },
    openingBalanceMonthText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
    },
    sectionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weekendBadgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.bold,
        letterSpacing: 0.2,
    },
    weekdayBadgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.semibold,
        letterSpacing: 0.2,
    },
    daySummary: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    daySummaryText: {
        fontSize: Typography.sizes.xs2,
        fontWeight: Typography.weights.medium,
    },
    listContent: {
        paddingHorizontal: Spacing.xl,
    },
    cardWrapper: {
        paddingHorizontal: 0,
        overflow: 'hidden',
    },
    itemSeparator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 56,
    },
    fab: {
        position: 'absolute',
        right: Spacing.xxl,
        width: 56,
        height: 56,
        borderRadius: Layout.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    fabText: {
        fontSize: Typography.sizes.xxl,
        lineHeight: Typography.sizes.xxl + Spacing.xs,
    },
    emptyText: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.regular,
    },
});
