import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SectionList,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppTheme } from '../../../core/theme';
import { Account } from '../../../database/schema';

interface AccountPickerProps {
    visible: boolean;
    onClose: () => void;
    accounts: Account[]; // Should be the full list of available accounts
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

    // Group accounts by type for SectionList, ensuring reserves follow their parents
    const sections = useMemo(() => {
        const typeOrder = ['bank', 'cash', 'card', 'wallet', 'deposits', 'custom'];
        const typeLabels: Record<string, string> = {
            bank: 'Bank Accounts',
            cash: 'Cash',
            card: 'Cards',
            wallet: 'Digital Wallets',
            deposits: 'Deposits',
            custom: 'Other',
        };

        const groups: Record<string, Account[]> = {};

        const roots = accounts.filter(a => !a.parentId);
        const children = accounts.filter(a => !!a.parentId);

        // Sort roots by id (or sortOrder if needed, but ID implies creation usually)
        roots.forEach(root => {
            const key = root.type || 'custom';
            if (!groups[key]) groups[key] = [];
            groups[key].push(root);

            // Append this root's children immediately
            const myChildren = children.filter(c => c.parentId === root.id);
            myChildren.forEach(child => {
                groups[key].push(child);
            });
        });

        // Handle orphaned children if any (e.g. root was filtered out by excludeFromSummaries but child wasn't)
        children.forEach(child => {
            if (!roots.find(r => r.id === child.parentId)) {
                const key = child.type || 'custom';
                if (!groups[key]) groups[key] = [];
                groups[key].push(child);
            }
        });

        return typeOrder
            .filter(t => groups[t] && groups[t].length > 0)
            .map(t => ({
                title: typeLabels[t] || t,
                data: groups[t],
            }));
    }, [accounts]);

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: theme.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={{ color: colors.primary }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    <SectionList
                        sections={sections}
                        keyExtractor={item => item.id.toString()}
                        renderSectionHeader={({ section }) => (
                            <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
                                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                                    {section.title}
                                </Text>
                            </View>
                        )}
                        renderItem={({ item }) => {
                            const isReserve = !!item.parentId;
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.item,
                                        { borderBottomColor: theme.border },
                                        isReserve && { paddingLeft: 32 }
                                    ]}
                                    onPress={() => {
                                        onSelect(item);
                                        onClose();
                                    }}>
                                    <View style={styles.itemRow}>
                                        {isReserve && (
                                            <Icon
                                                name="subdirectory-arrow-right"
                                                size={16}
                                                color={theme.textSecondary}
                                                style={{ marginRight: 8 }}
                                            />
                                        )}
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
                                    {!isReserve && (
                                        <Text style={[styles.itemType, { color: theme.textSecondary }]}>
                                            {item.type}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: theme.textSecondary }}>No available accounts</Text>
                            </View>
                        }
                    />
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
        maxHeight: '70%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        elevation: 0,
        shadowOpacity: 0,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionHeader: {
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    item: {
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
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
});
