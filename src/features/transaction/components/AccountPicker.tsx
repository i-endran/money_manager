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
import { useAppTheme } from '../../../core/theme';
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

        const typeOrder = ['bank', 'cash', 'card', 'wallet', 'deposits', 'custom'];
        const typeLabels: Record<string, string> = {
            bank: '🏦 Bank Accounts',
            cash: '💵 Cash',
            card: '💳 Cards',
            wallet: '📱 Digital Wallets',
            deposits: '🔒 Deposits',
            custom: '🏷️ Other',
        };

        const groups: Record<string, Account[]> = {};

        const roots = accounts.filter(a => !a.parentId);

        // Also handle cases where a child's parent is not in the list (e.g. filtered out by excludeFromSummaries)
        const childOrphans = accounts.filter(a => !!a.parentId && !accounts.find(p => p.id === a.parentId));

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
                                    <Text style={{ color: colors.primary, fontSize: 16 }}>← Back</Text>
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
                                <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
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
                            renderItem={({ item, index, section }) => {
                                const hasChildren = accounts.some(a => a.parentId === item.id);
                                const isFirst = index === 0;
                                const isLast = index === section.data.length - 1;

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.item,
                                            { backgroundColor: theme.surface },
                                            !isLast && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                                            isFirst && { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
                                            isLast && { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
                                        ]}
                                        onPress={() => {
                                            if (hasChildren) {
                                                setCurrentParentId(item.id);
                                            } else {
                                                onSelect(item);
                                                onClose();
                                                setTimeout(() => setCurrentParentId(null), 300);
                                            }
                                        }}>
                                        <View style={styles.itemRow}>
                                            <Text style={[styles.itemText, { color: theme.text }]}>
                                                {item.name}
                                            </Text>
                                            {item.excludeFromSummaries && (
                                                <View style={[styles.closedBoxBadge, { backgroundColor: colors.expense + '20' }]}>
                                                    <Text style={[{ color: colors.expense, fontSize: 10, fontWeight: 'bold' }]}>
                                                        Closed-Box
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {hasChildren && (
                                                <Text style={{ color: theme.textSecondary, fontSize: 18, marginLeft: 8 }}>›</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: theme.textSecondary }}>No available accounts</Text>
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
                                            { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
                                            reservesList.length === 0 && { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }
                                        ]}
                                        onPress={() => {
                                            onSelect(parentAccount);
                                            onClose();
                                            setTimeout(() => setCurrentParentId(null), 300);
                                        }}>
                                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>
                                            ✓ Select {parentAccount.name}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null
                            }
                            renderItem={({ item, index }) => {
                                const isLast = index === reservesList.length - 1;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.item,
                                            { backgroundColor: theme.surface },
                                            !isLast && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                                            isLast && { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }
                                        ]}
                                        onPress={() => {
                                            const hasChildren = accounts.some(a => a.parentId === item.id);
                                            if (hasChildren) {
                                                setCurrentParentId(item.id);
                                            } else {
                                                onSelect(item);
                                                onClose();
                                                setTimeout(() => setCurrentParentId(null), 300);
                                            }
                                        }}>
                                        <View style={styles.itemRow}>
                                            <Text style={[styles.itemText, { color: theme.text }]}>
                                                {item.name}
                                            </Text>
                                            {item.excludeFromSummaries && (
                                                <View style={[styles.closedBoxBadge, { backgroundColor: colors.expense + '20' }]}>
                                                    <Text style={[{ color: colors.expense, fontSize: 10, fontWeight: 'bold' }]}>
                                                        Closed-Box
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {accounts.some(a => a.parentId === item.id) && (
                                            <Text style={{ color: theme.textSecondary, fontSize: 18, marginLeft: 8 }}>›</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={{ padding: 24, alignItems: 'center' }}>
                                    <Text style={{ color: theme.textSecondary }}>No sub-accounts</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        maxHeight: '80%',
        minHeight: '40%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        elevation: 0,
        shadowOpacity: 0,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
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
        padding: 4,
    },
    cancelBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 24,
    },
    sectionHeader: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginTop: 12,
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    item: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemText: {
        fontSize: 16,
        marginRight: 8,
    },
    closedBoxBadge: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 4,
    },
    itemType: {
        fontSize: 12,
        textTransform: 'uppercase',
    },
    selectParentItem: {
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
