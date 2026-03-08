import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatMonthYearLabel } from '../../../core/utils';
import { Spacing, Typography, useAppTheme } from '../../../core/theme';

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
        <View style={styles.container}>
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
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    button: {
        padding: Spacing.sm,
    },
    arrow: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
    },
    label: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
});
