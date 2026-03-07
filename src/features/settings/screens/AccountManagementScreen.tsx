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
import { Colors, Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { AccountType } from '../../../core/constants';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { runOnJS } from 'react-native-reanimated';

// Helper to map AccountType to UI Display
const TYPE_CONFIG: Record<string, { title: string; emoji: string }> = {
    [AccountType.CASH]: { title: '💵 CASH', emoji: '💵' },
    [AccountType.BANK]: { title: '🏦 BANK', emoji: '🏦' },
    [AccountType.CARD]: { title: '💳 CARDS', emoji: '💳' },
    [AccountType.DEBT]: { title: '🧾 DEBT', emoji: '🧾' },
    [AccountType.WALLET]: { title: '👛 WALLETS', emoji: '👛' },
    [AccountType.DEPOSITS]: { title: '🏦 DEPOSITS', emoji: '🏦' },
    [AccountType.CUSTOM]: { title: '📁 CUSTOM', emoji: '📁' },
};

type AccountWithReserves = schema.Account & { reserves: schema.Account[] };

export const AccountManagementScreen = ({ navigation }: any) => {
    const { theme, colors } = useAppTheme();
    const [accounts, setAccounts] = useState<schema.Account[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    const load = useCallback(async () => {
        const list = await db.select().from(schema.accounts);
        setAccounts(list);
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    // Compute derived data
    const rootsWithReserves = useMemo(() => {
        const roots = accounts.filter(a => a.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);
        const allReserves = accounts.filter(a => a.parentId !== null).sort((a, b) => a.sortOrder - b.sortOrder);

        return roots.map(root => ({
            ...root,
            reserves: allReserves.filter(r => r.parentId === root.id)
        }));
    }, [accounts]);

    const sections = useMemo(() => {
        const grouped = [
            { type: AccountType.CASH, data: [] as AccountWithReserves[] },
            { type: AccountType.BANK, data: [] as AccountWithReserves[] },
            { type: AccountType.CARD, data: [] as AccountWithReserves[] },
            { type: AccountType.DEBT, data: [] as AccountWithReserves[] },
            { type: AccountType.WALLET, data: [] as AccountWithReserves[] },
            { type: AccountType.DEPOSITS, data: [] as AccountWithReserves[] },
            { type: AccountType.CUSTOM, data: [] as AccountWithReserves[] },
        ];

        rootsWithReserves.forEach(acc => {
            const group = grouped.find(g => g.type === acc.type);
            if (group) group.data.push(acc);
        });

        return grouped.filter(g => g.data.length > 0).map(g => ({
            title: TYPE_CONFIG[g.type].title,
            type: g.type,
            data: g.data
        }));
    }, [rootsWithReserves]);

    const handleDragEnd = ({ data }: { data: AccountWithReserves[] }) => {
        // Update local state by reconstructing flat accounts array
        const updatedAccounts = [...accounts];

        // Assign new sortOrders based on final index
        for (let i = 0; i < data.length; i++) {
            const root = data[i];
            const accIndex = updatedAccounts.findIndex(a => a.id === root.id);
            if (accIndex !== -1) {
                updatedAccounts[accIndex] = { ...updatedAccounts[accIndex], sortOrder: i };
            }
        }

        setAccounts(updatedAccounts);

        // Bulk update Database without an async callback from UI thread event
        (async () => {
            try {
                for (let i = 0; i < data.length; i++) {
                    await db.update(schema.accounts)
                        .set({ sortOrder: i })
                        .where(eq(schema.accounts.id, data[i].id));
                }
            } catch (error) {
                console.error('Failed to save sort order:', error);
            }
        })();
    };

    const renderReserve = (reserve: schema.Account, _isLastReserve: boolean) => (
        <View key={reserve.id} style={styles.reserveRowContainer}>
            <TouchableOpacity
                style={styles.reserveRow}
                activeOpacity={0.6}
                onPress={() => !isEditing && navigation.navigate('AccountForm', { accountId: reserve.id })}
                disabled={isEditing}
            >
                <Text style={[styles.reserveName, { color: theme.textSecondary }]}>↳ {reserve.name}</Text>
                {!isEditing && (
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: reserve.isActive ? theme.statusActive : theme.statusInactive }
                    ]} />
                )}
            </TouchableOpacity>
        </View>
    );

    // Common item renderer for both modes
    const renderNode = (item: AccountWithReserves, isFirst: boolean, isLast: boolean, drag?: () => void, isActiveDrag?: boolean) => {
        return (
            <View style={[
                styles.itemContainer,
                {
                    backgroundColor: isActiveDrag ? theme.border : theme.surface,
                    borderTopLeftRadius: isFirst ? Layout.radius.lg : 0,
                    borderTopRightRadius: isFirst ? Layout.radius.lg : 0,
                    borderBottomLeftRadius: isLast ? Layout.radius.lg : 0,
                    borderBottomRightRadius: isLast ? Layout.radius.lg : 0,
                },
                !isLast && !isActiveDrag && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                isActiveDrag && { elevation: 5, shadowColor: Colors.black, shadowOffset: { width: 0, height: Spacing.xxs }, shadowOpacity: 0.2, shadowRadius: Spacing.xs }
            ]}>
                <TouchableOpacity
                    style={styles.rootRow}
                    onPress={() => {
                        if (!isEditing) navigation.navigate('AccountForm', { accountId: item.id });
                    }}
                    onLongPress={drag}
                    disabled={isEditing && !drag}
                    activeOpacity={isEditing ? 0.9 : 0.6}
                >
                    <View style={styles.rootInfo}>
                        {isEditing && (
                            <View style={styles.dragHandleContainer}>
                                <Icon name="drag-handle" size={24} color={theme.textSecondary} />
                            </View>
                        )}

                        <View>
                            <View style={styles.nameRow}>
                                <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                                {!isEditing && item.excludeFromSummaries && (
                                    <View style={[styles.badge, { backgroundColor: colors.expense }]}>
                                        <Text style={styles.badgeText}>Closed-Box</Text>
                                    </View>
                                )}
                            </View>
                            {isEditing && <Text style={[styles.type, { color: theme.textSecondary }]}>{item.type}</Text>}
                        </View>
                    </View>
                    {!isEditing && (
                        <View style={styles.rootActions}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: item.isActive ? theme.statusActive : theme.statusInactive, marginRight: Spacing.lg }
                            ]} />
                            <TouchableOpacity
                                style={[styles.addReserveBtn, { backgroundColor: theme.background }]}
                                onPress={() => navigation.navigate('AccountForm', { parentId: item.id })}
                            >
                                <Icon name="add" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    )}
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
                    <Text style={[styles.headerButtonText, { color: colors.primary }]}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Accounts</Text>
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.headerBtn}>
                    <Text style={[styles.headerActionText, { color: colors.primary }]}>
                        {isEditing ? 'Done' : 'Edit Order'}
                    </Text>
                </TouchableOpacity>
            </View>

            {isEditing ? (
                <DraggableFlatList
                    data={rootsWithReserves}
                    onDragEnd={({ data }) => runOnJS(handleDragEnd)({ data })}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<AccountWithReserves>) => {
                        const index = getIndex() ?? 0;
                        return renderNode(item, index === 0, index === rootsWithReserves.length - 1, drag, isActive);
                    }}
                />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index, section }) =>
                        renderNode(item, index === 0, index === section.data.length - 1)
                    }
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
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: { padding: Spacing.xs, minWidth: 60, alignItems: 'center' },
    headerButtonText: { fontSize: Typography.sizes.md },
    headerActionText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
    },
    headerTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
    listContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxxxl,
        paddingTop: Spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.xs,
    },
    sectionTitle: {
        fontSize: Typography.sizes.sm2,
        fontWeight: Typography.weights.semibold,
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
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    rootInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dragHandleContainer: { marginRight: Spacing.xl },
    statusDot: {
        width: Spacing.md + Spacing.xxs,
        height: Spacing.md + Spacing.xxs,
        borderRadius: (Spacing.md + Spacing.xxs) / 2,
    },
    name: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    type: { fontSize: Typography.sizes.sm, marginTop: Spacing.xxs, textTransform: 'uppercase' },
    badge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm / 2,
        borderRadius: Layout.radius.full,
    },
    badgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.bold,
        letterSpacing: 0.2,
        color: Colors.white,
    },
    rootActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addReserveBtn: {
        width: Typography.sizes.xl,
        height: Typography.sizes.xl,
        borderRadius: Layout.radius.sm + Spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reservesContainer: {
        paddingBottom: Spacing.md,
    },
    reserveRowContainer: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    reserveRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md + Spacing.xxs,
        paddingRight: Spacing.xl,
        paddingLeft: Spacing.xxxl + Spacing.md + Spacing.xxs,
    },
    reserveName: {
        fontSize: Typography.sizes.sm2 + Spacing.xxs,
        marginLeft: Spacing.md,
    },
    emptyContainer: {
        padding: Spacing.xxxxxl,
        alignItems: 'center',
    },
});
