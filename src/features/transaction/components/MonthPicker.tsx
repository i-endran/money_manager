import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { Colors, Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';
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
                                        { borderColor: theme.border },
                                        isSelected && { backgroundColor: colors.primary },
                                    ]}
                                    onPress={() => {
                                        onSelect(m);
                                        onClose();
                                    }}>
                                    <Text
                                        style={[
                                            styles.monthText,
                                            { color: isSelected ? colors.white : theme.text },
                                        ]}>
                                        {format(m, 'MMM')}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={[styles.closeText, { color: colors.primary }]}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: Colors.overlayMedium,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xxl,
    },
    content: {
        width: '100%',
        padding: Spacing.xxl,
        borderRadius: Layout.radius.lg,
        alignItems: 'center',
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: 'bold',
        marginBottom: Spacing.xxl,
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
        borderRadius: Layout.radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
    },
    monthText: {
        fontSize: Typography.sizes.md,
        fontWeight: '500',
    },
    closeBtn: {
        marginTop: Spacing.xxl,
        padding: Spacing.lg,
    },
    closeText: {
        fontWeight: 'bold',
        fontSize: Typography.sizes.md,
    },
});
