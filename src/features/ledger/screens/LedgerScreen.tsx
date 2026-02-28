import React from 'react';
import {
    SectionList,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../core/theme';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { useMonthlyLedger } from '../hooks/useMonthlyLedger';
import { MonthSelector } from '../components/MonthSelector';
import { MonthlySummary } from '../components/MonthlySummary';
import { TransactionItem } from '../components/TransactionItem';
import { formatDayHeader, formatCurrency, isWeekend } from '../../../core/utils';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootNavigator';

export const LedgerScreen: React.FC = () => {
    const { theme, colors, isDark } = useAppTheme();
    const { currentDate, nextMonth, prevMonth } = useLedgerStore();
    const { data, summary, loading } = useMonthlyLedger();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const handleTransactionPress = (txn: any) => {
        navigation.navigate('TransactionForm', { transactionId: txn.id });
    };

    const handleAddPress = () => {
        navigation.navigate('TransactionForm');
    };

    const renderSectionHeader = ({ section: { title, dayIncome, dayExpense } }: any) => {
        const weekend = isWeekend(title);
        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('TransactionForm', { selectedDate: new Date(title).toISOString() })}
                style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: weekend ? '#C24A4A' : theme.textSecondary }]}>
                    {formatDayHeader(title)}
                </Text>
                <View style={styles.daySummary}>
                    {dayIncome > 0 && (
                        <Text style={[styles.daySummaryText, { color: colors.income }]}>
                            +{formatCurrency(dayIncome)}
                        </Text>
                    )}
                    {dayExpense > 0 && (
                        <Text style={[styles.daySummaryText, { color: colors.expense }]}>
                            -{formatCurrency(dayExpense)}
                        </Text>
                    )}
                    {dayIncome === 0 && dayExpense === 0 && (
                        <Text style={[styles.daySummaryText, { color: theme.textSecondary }]}>
                            {formatCurrency(0)}
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

            <MonthSelector
                currentDate={currentDate}
                onPrev={prevMonth}
                onNext={nextMonth}
            />

            <MonthlySummary
                income={summary.income}
                expense={summary.expense}
                balance={summary.balance}
            />

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
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No transactions found</Text>
                        </View>
                    }
                />
            )}

            {/* FAB for Add */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
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
        fontSize: 28,
        fontWeight: 'bold',
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
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    daySummary: {
        flexDirection: 'row',
        gap: 8,
    },
    daySummaryText: {
        fontSize: 11,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 100,
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
        bottom: 16,
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
