import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SectionList,
    Modal,
} from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { Account } from '../../../database/schema';

interface AccountPickerProps {
    visible: boolean;
    onClose: () => void;
    accounts: Account[]; // Should be the full flat list of available accounts
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

    // Group accounts by type for SectionList
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
        accounts.forEach(acc => {
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
    }, [accounts]);

    const formatAccountName = (item: Account) => {
        if (!item.parentId) return item.name;
        const parent = accounts.find(a => a.id === item.parentId);
        if (parent) {
            const pName = parent.name.length > 5 ? parent.name.substring(0, 5) + '..' : parent.name;
            return `${pName} > ${item.name}`;
        }
        return item.name;
    };

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
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.item, { borderBottomColor: theme.border }]}
                                onPress={() => {
                                    onSelect(item);
                                    onClose();
                                }}>
                                <View style={styles.itemRow}>
                                    <Text style={[styles.itemText, { color: theme.text }]}>
                                        {formatAccountName(item)}
                                    </Text>
                                    {item.excludeFromSummaries && (
                                        <View style={[styles.closedBoxBadge, { backgroundColor: colors.expense + '20' }]}>
                                            <Text style={[{ color: colors.expense, fontSize: 10, fontWeight: 'bold' }]}>
                                                Closed-Box
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.itemType, { color: theme.textSecondary }]}>
                                    {item.type}
                                </Text>
                            </TouchableOpacity>
                        )}
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
    },
    itemType: {
        fontSize: 12,
        textTransform: 'uppercase',
    },
});
