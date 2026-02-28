import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatMonthYearLabel } from '../../../core/utils';
import { useAppTheme } from '../../../core/theme';

interface MonthSelectorProps {
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
    currentDate,
    onPrev,
    onNext,
}) => {
    const { theme, colors } = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={onPrev} style={styles.button}>
                <Text style={[styles.arrow, { color: colors.primary }]}>←</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: theme.text }]}>
                {formatMonthYearLabel(currentDate)}
            </Text>

            <TouchableOpacity onPress={onNext} style={styles.button}>
                <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    button: {
        padding: 8,
    },
    arrow: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
    },
});
