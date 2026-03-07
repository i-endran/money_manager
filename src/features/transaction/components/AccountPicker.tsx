import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SectionList,
    Modal,
} from 'react-native';
import { Colors, Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';
import { Account } from '../../../database/schema';

interface AccountPickerProps {
    visible: boolean;
    onClose: () => void;
    accounts: Account[]; // Full list of allowed accounts
    onSelect: (account: Account) => void;
    title: string;
}

export const AccountPicker: React.FC<AccountPickerProps> = ({
    visible,
    onClose,
    accounts,
    onSelect,
    title,
}) => {
    const { theme, colors } = useAppTheme();
    const [currentParentId, setCurrentParentId] = useState<number | null>(null);

    const parentAccount = useMemo(() => {
        if (currentParentId === null) return null;
        return accounts.find(a => a.id === currentParentId);
    }, [accounts, currentParentId]);

    // Precompute parent IDs for sub-account indicators
    const parentIdSet = useMemo(() => {
        return new Set(accounts.map(a => a.parentId).filter(id => id !== null));
    }, [accounts]);

    const handleBack = () => {
        if (parentAccount && parentAccount.parentId) {
            setCurrentParentId(parentAccount.parentId);
        } else {
            setCurrentParentId(null);
        }
    };

    // View 1: Root accounts (grouped)
    const sections = useMemo(() => {
        if (currentParentId !== null) return [];

        const typeOrder = ['bank', 'cash', 'card', 'debt', 'wallet', 'deposits', 'custom'];
        const typeLabels: Record<string, string> = {
            bank: '🏦 Bank Accounts',
            cash: '💵 Cash',
            card: '💳 Cards',
            debt: '🧾 Debt',
            wallet: '📱 Digital Wallets',
            deposits: '🔒 Deposits',
            custom: '🏷️ Other',
        };

        const groups: Record<string, Account[]> = {};
        const accountIdSet = new Set(accounts.map(a => a.id));

        const roots = accounts.filter(a => !a.parentId);
        // Also handle cases where a child's parent is not in the list (e.g. filtered out by excludeFromSummaries)
        const childOrphans = accounts.filter(a => !!a.parentId && !accountIdSet.has(a.parentId));

        [...roots, ...childOrphans].forEach(acc => {
            const key = acc.type || 'custom';
            if (!groups[key]) groups[key] = [];
            groups[key].push(acc);
        });

        return typeOrder
            .filter(t => groups[t] && groups[t].length > 0)
            .map(t => ({
                title: typeLabels[t] || t,
                data: groups[t],
            }));
    }, [accounts, currentParentId]);

    // View 2: Reserves of a specific parent
    const reservesList = useMemo(() => {
        if (currentParentId === null) return [];
        return accounts.filter(a => a.parentId === currentParentId);
    }, [accounts, currentParentId]);

    const AccountRow = ({ item, isFirst, isLast, onPress }: { item: Account, isFirst?: boolean, isLast?: boolean, onPress: () => void }) => (
        <TouchableOpacity
            style={[
                styles.item,
                { backgroundColor: theme.surface },
                !isLast && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                isFirst && { borderTopLeftRadius: Layout.radius.md, borderTopRightRadius: Layout.radius.md },
                isLast && { borderBottomLeftRadius: Layout.radius.md, borderBottomRightRadius: Layout.radius.md },
            ]}
            onPress={onPress}>
            <View style={styles.itemRow}>
                <Text style={[styles.itemText, { color: theme.text }]}>
                    {item.name}
                </Text>
                {item.excludeFromSummaries && (
                    <View style={[styles.closedBoxBadge, { backgroundColor: colors.expense + '20' }]}>
                        <Text style={[styles.closedBoxBadgeText, { color: colors.expense }]}>
                            Opt Out
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.itemRight}>
                {parentIdSet.has(item.id) && (
                    <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            onDismiss={() => setCurrentParentId(null)}
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: theme.background }]}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            {currentParentId !== null && (
                                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                                    <Text style={[styles.navText, { color: colors.primary }]}>← Back</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.headerCenter}>
                            <Text style={[styles.title, { color: theme.text }]}>
                                {parentAccount ? parentAccount.name : title}
                            </Text>
                        </View>

                        <View style={styles.headerRight}>
                            <TouchableOpacity onPress={() => {
                                onClose();
                                setCurrentParentId(null);
                            }} style={styles.cancelBtn}>
                                <Text style={[styles.navText, { color: colors.primary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {currentParentId === null ? (
                        <SectionList
                            sections={sections}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            renderSectionHeader={({ section }) => (
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                                        {section.title}
                                    </Text>
                                </View>
                            )}
                            renderItem={({ item, index, section }) => (
                                <AccountRow
                                    item={item}
                                    isFirst={index === 0}
                                    isLast={index === section.data.length - 1}
                                    onPress={() => {
                                        if (parentIdSet.has(item.id)) {
                                            setCurrentParentId(item.id);
                                        } else {
                                            onSelect(item);
                                            onClose();
                                            setTimeout(() => setCurrentParentId(null), 300);
                                        }
                                    }}
                                />
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyRoot}>
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                        No available accounts
                                    </Text>
                                </View>
                            }
                        />
                    ) : (
                        <FlatList
                            data={reservesList}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            ListHeaderComponent={
                                parentAccount ? (
                                    <TouchableOpacity
                                        style={[
                                            styles.item,
                                            { backgroundColor: theme.surface },
                                            reservesList.length > 0 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                                            { borderTopLeftRadius: Layout.radius.md, borderTopRightRadius: Layout.radius.md },
                                            reservesList.length === 0 && { borderBottomLeftRadius: Layout.radius.md, borderBottomRightRadius: Layout.radius.md }
                                        ]}
                                        onPress={() => {
                                            onSelect(parentAccount);
                                            onClose();
                                            setTimeout(() => setCurrentParentId(null), 300);
                                        }}>
                                        <Text style={[styles.selectParentText, { color: colors.primary }]}>
                                            ✓ Select {parentAccount.name}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null
                            }
                            renderItem={({ item, index }) => (
                                <AccountRow
                                    item={item}
                                    isLast={index === reservesList.length - 1}
                                    onPress={() => {
                                        if (parentIdSet.has(item.id)) {
                                            setCurrentParentId(item.id);
                                        } else {
                                            onSelect(item);
                                            onClose();
                                            setTimeout(() => setCurrentParentId(null), 300);
                                        }
                                    }}
                                />
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptySub}>
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No sub-accounts</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: Colors.overlayMedium,
        justifyContent: 'flex-end',
    },
    content: {
        maxHeight: '80%',
        minHeight: '40%',
        borderTopLeftRadius: Layout.radius.xl,
        borderTopRightRadius: Layout.radius.xl,
        padding: Spacing.xl,
        elevation: 0,
        shadowOpacity: 0,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xxl,
        justifyContent: 'center',
    },
    headerLeft: {
        position: 'absolute',
        left: 0,
        zIndex: 1,
    },
    headerCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        position: 'absolute',
        right: 0,
        zIndex: 1,
    },
    backBtn: {
        padding: Spacing.xs,
    },
    cancelBtn: {
        padding: Spacing.xs,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: Spacing.xxxl,
    },
    sectionHeader: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xs,
    },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    item: {
        paddingVertical: Spacing.lg + Spacing.xxs,
        paddingHorizontal: Spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemText: {
        fontSize: Typography.sizes.md,
        marginRight: Spacing.md,
    },
    closedBoxBadge: {
        paddingHorizontal: Spacing.xs,
        paddingVertical: Spacing.xxs,
        borderRadius: Layout.radius.xs,
        marginLeft: Spacing.xs,
    },
    closedBoxBadgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: 'bold',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chevron: {
        fontSize: Typography.sizes.lg,
        marginLeft: Spacing.md,
    },
    navText: {
        fontSize: Typography.sizes.md,
    },
    emptyRoot: {
        padding: Spacing.xxl,
        alignItems: 'center',
    },
    emptySub: {
        padding: Spacing.xxxl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: Typography.sizes.base,
    },
    selectParentText: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
    },
});
