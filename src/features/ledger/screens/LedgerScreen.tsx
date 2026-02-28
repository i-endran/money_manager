import React from 'react';
import {
    SafeAreaView,
    SectionList,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
    StatusBar,
} from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { useMonthlyLedger } from '../hooks/useMonthlyLedger';
import { MonthSelector } from '../components/MonthSelector';
import { MonthlySummary } from '../components/MonthlySummary';
import { TransactionItem } from '../components/TransactionItem';
import { formatDateLabel, isWeekend } from '../../../core/utils';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootNavigator';

export const LedgerScreen: React.FC = () => {
    const { theme, colors } = useAppTheme();
    const { currentDate, nextMonth, prevMonth } = useLedgerStore();
    const { data, summary, loading } = useMonthlyLedger();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const handleTransactionPress = (txn: any) => {
        navigation.navigate('TransactionForm', { transactionId: txn.id });
    };

    const handleAddPress = () => {
        navigation.navigate('TransactionForm');
    };

    const renderSectionHeader = ({ section: { title } }: any) => {
        const weekend = isWeekend(title);
        return (
            <View
                style={[
                    styles.sectionHeader,
                    {
                        backgroundColor: weekend ? theme.weekendTint : theme.background,
                        borderBottomColor: theme.border,
                    },
                ]}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    {formatDateLabel(title)}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>PiggyBook</Text>
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
                    renderItem={({ item }) => (
                        <TransactionItem
                            transaction={item}
                            onPress={handleTransactionPress}
                        />
                    )}
                    renderSectionHeader={renderSectionHeader}
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
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    listContent: {
        paddingBottom: 80,
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
