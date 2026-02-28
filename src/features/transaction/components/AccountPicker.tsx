import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
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

                    <FlatList
                        data={accounts}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
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
                        ItemSeparatorComponent={() => (
                            <View style={[styles.separator, { backgroundColor: theme.border }]} />
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
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    item: {
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemText: {
        fontSize: 16,
    },
    itemType: {
        fontSize: 12,
        textTransform: 'uppercase',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
    },
});
