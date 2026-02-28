import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
} from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { format } from 'date-fns';

interface MonthPickerProps {
    visible: boolean;
    onClose: () => void;
    selectedDate: Date;
    onSelect: (date: Date) => void;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
    visible,
    onClose,
    selectedDate,
    onSelect,
}) => {
    const { theme, colors } = useAppTheme();
    const currentYear = selectedDate.getFullYear();

    const months = Array.from({ length: 12 }, (_, i) => {
        return new Date(currentYear, i, 1);
    });

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.title, { color: theme.text }]}>Select Month</Text>

                    <View style={styles.grid}>
                        {months.map((m, index) => {
                            const isSelected = m.getMonth() === selectedDate.getMonth();
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.monthItem,
                                        isSelected && { backgroundColor: colors.primary },
                                    ]}
                                    onPress={() => {
                                        onSelect(m);
                                        onClose();
                                    }}>
                                    <Text
                                        style={[
                                            styles.monthText,
                                            { color: isSelected ? 'white' : theme.text },
                                        ]}>
                                        {format(m, 'MMM')}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    monthItem: {
        width: '30%',
        aspectRatio: 1.5,
        margin: '1.5%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#eee',
    },
    monthText: {
        fontSize: 16,
        fontWeight: '500',
    },
    closeBtn: {
        marginTop: 20,
        padding: 10,
    },
});
