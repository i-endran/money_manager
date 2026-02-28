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
    accounts: Account[];
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
        const typeOrder = ['bank', 'cash', 'card', 'wallet', 'custom'];
        const typeLabels: Record<string, string> = {
            bank: 'Bank Accounts',
            cash: 'Cash',
            card: 'Cards',
            wallet: 'Digital Wallets',
            custom: 'Other',
        };

        const groups: Record<string, Account[]> = {};
        accounts.forEach(acc => {
            const key = acc.type || 'custom';
            if (!groups[key]) groups[key] = [];
            groups[key].push(acc);
        });

        return typeOrder
            .filter(t => groups[t]?.length > 0)
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
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.item, { borderBottomColor: theme.border }]}
                                onPress={() => {
                                    onSelect(item);
                                    onClose();
                                }}>
                                <Text style={[styles.itemText, { color: theme.text }]}>
                                    {item.name}
                                </Text>
                                <Text style={[styles.itemType, { color: theme.textSecondary }]}>
                                    {item.type}
                                </Text>
                            </TouchableOpacity>
                        )}
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
    itemText: {
        fontSize: 16,
    },
    itemType: {
        fontSize: 12,
        textTransform: 'uppercase',
    },
});
