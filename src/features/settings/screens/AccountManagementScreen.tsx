import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { AccountType } from '../../../core/constants';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Helper to map AccountType to UI Display
const TYPE_CONFIG = {
    [AccountType.CASH]: { title: '💵 Cash', icon: 'payments' },
    [AccountType.BANK]: { title: '🏦 Bank', icon: 'account-balance' },
    [AccountType.CARD]: { title: '💳 Cards', icon: 'credit-card' },
    [AccountType.WALLET]: { title: '👛 Wallets', icon: 'account-balance-wallet' },
    [AccountType.DEPOSITS]: { title: '🏦 Deposits', icon: 'savings' },
    [AccountType.CUSTOM]: { title: '📁 Custom', icon: 'category' },
};

type AccountWithReserves = schema.Account & { reserves: schema.Account[] };

export const AccountManagementScreen = ({ navigation }: any) => {
    const { theme, colors, isDark } = useAppTheme();
    const [accounts, setAccounts] = useState<schema.Account[]>([]);

    useFocusEffect(
        useCallback(() => {
            async function load() {
                const list = await db.select().from(schema.accounts);
                setAccounts(list);
            }
            load();
        }, [])
    );

    const sections = useMemo(() => {
        // Find roots and group reserves inside them
        const roots = accounts.filter(a => a.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);
        const allReserves = accounts.filter(a => a.parentId !== null).sort((a, b) => a.sortOrder - b.sortOrder);

        const rootsWithReserves: AccountWithReserves[] = roots.map(root => ({
            ...root,
            reserves: allReserves.filter(r => r.parentId === root.id)
        }));

        // Group by AccountType
        const grouped = [
            { type: AccountType.CASH, data: [] as AccountWithReserves[] },
            { type: AccountType.BANK, data: [] as AccountWithReserves[] },
            { type: AccountType.CARD, data: [] as AccountWithReserves[] },
            { type: AccountType.WALLET, data: [] as AccountWithReserves[] },
            { type: AccountType.DEPOSITS, data: [] as AccountWithReserves[] },
            { type: AccountType.CUSTOM, data: [] as AccountWithReserves[] },
        ];

        rootsWithReserves.forEach(acc => {
            const group = grouped.find(g => g.type === acc.type);
            if (group) group.data.push(acc);
        });

        // Only return groups that have data
        return grouped.filter(g => g.data.length > 0).map(g => ({
            title: TYPE_CONFIG[g.type].title,
            type: g.type,
            data: g.data
        }));
    }, [accounts]);

    const renderReserve = (reserve: schema.Account, isLastReserve: boolean) => (
        <View key={reserve.id} style={styles.reserveRowContainer}>
            <View style={[styles.treeLine, { borderLeftColor: theme.border }]} />
            <TouchableOpacity
                style={styles.reserveRow}
                onPress={() => navigation.navigate('AccountForm', { accountId: reserve.id })}
            >
                <View style={styles.reserveInfo}>
                    <Icon name="subdirectory-arrow-right" size={16} color={theme.textSecondary} />
                    <Text style={[styles.reserveName, { color: theme.textSecondary }]}>{reserve.name}</Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {reserve.isActive ? 'Active' : 'Inactive'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderItem = ({ item, index, section }: { item: AccountWithReserves, index: number, section: any }) => {
        const isFirst = index === 0;
        const isLast = index === section.data.length - 1;

        return (
            <View style={[
                styles.itemContainer,
                {
                    backgroundColor: theme.surface,
                    borderTopLeftRadius: isFirst ? 16 : 0,
                    borderTopRightRadius: isFirst ? 16 : 0,
                    borderBottomLeftRadius: isLast ? 16 : 0,
                    borderBottomRightRadius: isLast ? 16 : 0,
                },
                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }
            ]}>
                <TouchableOpacity
                    style={styles.rootRow}
                    onPress={() => navigation.navigate('AccountForm', { accountId: item.id })}
                >
                    <View style={styles.rootInfo}>
                        <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.black : colors.white }]}>
                            <Icon name={item.iconName} size={20} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                            {item.excludeFromSummaries && (
                                <View style={[styles.badge, { backgroundColor: colors.expense + '20' }]}>
                                    <Text style={[styles.badgeText, { color: colors.expense }]}>Closed-Box</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.rootActions}>
                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginRight: 12 }}>
                            {item.isActive ? 'Active' : 'Inactive'}
                        </Text>
                        <TouchableOpacity
                            style={[styles.addReserveBtn, { backgroundColor: theme.background }]}
                            onPress={() => navigation.navigate('AccountForm', { parentId: item.id })}
                        >
                            <Icon name="add" size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {/* Reserves List */}
                {item.reserves.length > 0 && (
                    <View style={styles.reservesContainer}>
                        {item.reserves.map((reserve, idx) =>
                            renderReserve(reserve, idx === item.reserves.length - 1)
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Text style={{ color: colors.primary, fontSize: 16 }}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Accounts</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AccountForm')} style={styles.headerBtn}>
                    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Add</Text>
                </TouchableOpacity>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title, type } }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AccountForm', { initialType: type })}>
                            <Icon name="add-circle" size={22} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.textSecondary }}>No accounts found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: { padding: 4, minWidth: 60, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    itemContainer: {
        overflow: 'hidden',
    },
    rootRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    rootInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    name: { fontSize: 16, fontWeight: '500' },
    badge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    badgeText: { fontSize: 10, fontWeight: '600' },
    rootActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addReserveBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reservesContainer: {
        paddingBottom: 8,
    },
    reserveRowContainer: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    treeLine: {
        width: 34,
        borderLeftWidth: 1,
        marginLeft: 34, // aligns under the center of the 36px icon (16 padding + 18 half icon)
    },
    reserveRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingRight: 16,
        paddingLeft: 4,
    },
    reserveInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reserveName: {
        fontSize: 15,
        marginLeft: 8,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
});
