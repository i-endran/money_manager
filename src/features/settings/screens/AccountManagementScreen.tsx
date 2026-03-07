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
import { Colors, Layout, Spacing, Typography, FormHeaderPreset, LedgerRowDensityPreset, LedgerTextHierarchyPreset, useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { AccountType } from '../../../core/constants';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { runOnJS } from 'react-native-reanimated';

// Helper to map AccountType to UI Display
const TYPE_CONFIG: Record<string, { title: string }> = {
    [AccountType.CASH]: { title: 'Cash' },
    [AccountType.BANK]: { title: 'Bank' },
    [AccountType.CARD]: { title: 'Cards' },
    [AccountType.DEBT]: { title: 'Debt' },
    [AccountType.WALLET]: { title: 'Wallets' },
    [AccountType.DEPOSITS]: { title: 'Deposits' },
    [AccountType.CUSTOM]: { title: 'Custom' },
};

type AccountWithReserves = schema.Account & { reserves: schema.Account[] };

export const AccountManagementScreen = ({ navigation }: any) => {
    const { theme, colors } = useAppTheme();
    const [accounts, setAccounts] = useState<schema.Account[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        [AccountType.CASH]: true,
        [AccountType.BANK]: true,
        [AccountType.CARD]: true,
        [AccountType.DEBT]: true,
        [AccountType.WALLET]: true,
        [AccountType.DEPOSITS]: true,
        [AccountType.CUSTOM]: true,
    });

    const toggleSection = (type: string) => {
        setExpandedSections(prev => ({ ...prev, [type]: !prev[type] }));
    };

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
            data: expandedSections[g.type] ? g.data : [],
        }));
    }, [rootsWithReserves, expandedSections]);

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
        <View key={reserve.id} style={[styles.reserveRowContainer, { borderLeftWidth: 2, borderLeftColor: theme.primary }]}>
            <TouchableOpacity
                style={styles.reserveRow}
                activeOpacity={0.6}
                onPress={() => !isEditing && navigation.navigate('AccountForm', { accountId: reserve.id })}
                disabled={isEditing}
            >
                <Text style={[styles.reserveName, { color: theme.textSecondary }]}>{reserve.name}</Text>
                {!isEditing && (
                    <View style={styles.rootActions}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: reserve.isActive ? theme.statusActive : theme.statusInactive }
                        ]} />
                        <View style={styles.addReserveBtn} />
                    </View>
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
                                { backgroundColor: item.isActive ? theme.statusActive : theme.statusInactive }
                            ]} />
                            <TouchableOpacity
                                style={styles.addReserveBtn}
                                onPress={() => navigation.navigate('AccountForm', { parentId: item.id })}
                            >
                                <Text style={[styles.sectionPlusBtn, { color: colors.primary }]}>+</Text>
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
                    renderSectionHeader={({ section: { title, type }, section }) => (
                        <TouchableOpacity
                            activeOpacity={0.6}
                            style={styles.sectionHeader}
                            onPress={() => toggleSection(type)}>
                            <View style={styles.sectionHeaderContent}>
                                <Icon
                                    name={expandedSections[type] ? 'expand-more' : 'chevron-right'}
                                    size={14}
                                    color={theme.textSecondary}
                                    style={styles.sectionChevronIcon}
                                />
                                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
                            </View>
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); navigation.navigate('AccountForm', { initialType: type }); }}>
                                <Icon name="add-circle" size={22} color={colors.primary} />
                            </TouchableOpacity>
                        </TouchableOpacity>
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
    headerButtonText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
    headerActionText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
    },
    headerTitle: { ...FormHeaderPreset.title },
    listContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxxxl,
        paddingTop: LedgerRowDensityPreset.paddingVertical,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.xs,
        paddingRight: LedgerRowDensityPreset.paddingHorizontal,
        paddingVertical: Spacing.xs,
    },
    sectionTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
    },
    sectionHeaderContent: { flexDirection: 'row', alignItems: 'center' },
    sectionChevronIcon: { marginRight: Spacing.xxs },
    sectionPlusBtn: {
        fontSize: Typography.sizes.lg,
        lineHeight: Typography.sizes.lg,
    },
    itemContainer: {
        overflow: 'hidden',
    },
    rootRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: LedgerRowDensityPreset.paddingVertical,
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
    },
    rootInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dragHandleContainer: { marginRight: Spacing.xl },
    statusDot: {
        width: Spacing.md,
        height: Spacing.md,
        borderRadius: Spacing.md / 2,
    },
    name: { fontSize: LedgerTextHierarchyPreset.primary.fontSize, fontWeight: LedgerTextHierarchyPreset.primary.fontWeight },
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
        gap: Spacing.md,
    },
    addReserveBtn: {
        width: Spacing.xxl,
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
        paddingVertical: LedgerRowDensityPreset.paddingVertical,
        paddingRight: LedgerRowDensityPreset.paddingHorizontal,
        paddingLeft: Spacing.xl,
    },
    reserveName: {
        fontSize: LedgerTextHierarchyPreset.secondary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.secondary.fontWeight,
    },
    emptyContainer: {
        padding: Spacing.xxxxxl,
        alignItems: 'center',
    },
});
