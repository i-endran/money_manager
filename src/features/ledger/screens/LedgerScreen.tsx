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
import { Typography, useAppTheme } from '../../../core/theme';
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
    const { theme, colors, isDark } = useAppTheme();
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
                        <Text style={{ fontSize: Typography.sizes.sm, fontWeight: '600', color: theme.textSecondary }}>
                            {format(subMonths(sectionDate, 1), 'MMMM')}
                        </Text>
                    ) : (
                        isWeekendDay ? (
                            <Text style={[styles.weekendBadgeText, { color: colors.expense }]}>
                                {dayStampLabel}
                            </Text>
                        ) : (
                            <Text style={[styles.weekdayBadgeText, { color: isDark ? '#FFFFFF' : '#111111' }]}>
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
                    borderTopLeftRadius: isFirst ? 12 : 0,
                    borderTopRightRadius: isFirst ? 12 : 0,
                    borderBottomLeftRadius: isLast ? 12 : 0,
                    borderBottomRightRadius: isLast ? 12 : 0,
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
                            <Text style={{ color: theme.textSecondary }}>No transactions found</Text>
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
                    },
                ]}
                onPress={handleAddPress}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: 'bold',
    },
    summaryBubble: {
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 6, // Reduced from 10
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    filterControls: {
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 4,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    filterButton: {
        minWidth: 52,
        alignItems: 'center',
        paddingVertical: 4,
    },
    filterButtonText: {
        fontSize: Typography.sizes.sm,
        fontWeight: '600',
    },
    filterCenter: {
        flex: 1,
        alignItems: 'center',
    },
    filterLabel: {
        fontSize: Typography.sizes.xs,
        fontWeight: '500',
    },
    filterAccountName: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
        marginTop: 2,
    },
    bubbleDivider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 7,
    },
    sectionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weekendBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    weekendBadgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    weekdayBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: StyleSheet.hairlineWidth,
    },
    weekdayBadgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    daySummary: {
        flexDirection: 'row',
        gap: 8,
    },
    daySummaryText: {
        fontSize: 11,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 16,
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
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    fabText: {
        color: 'white',
        fontSize: 30,
        lineHeight: 34,
    },
});
