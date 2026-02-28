import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface DatePickerProps {
    visible: boolean;
    onClose: () => void;
    selectedDate: Date;
    onSelect: (date: Date) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DatePicker: React.FC<DatePickerProps> = ({
    visible,
    onClose,
    selectedDate,
    onSelect,
}) => {
    const { theme, colors } = useAppTheme();
    const [viewDate, setViewDate] = useState(selectedDate);

    // Generate the calendar grid for the displayed month
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(viewDate);
        const calStart = startOfWeek(monthStart); // Sunday
        const calEnd = endOfWeek(monthEnd);

        const days: Date[] = [];
        let day = calStart;
        while (day <= calEnd) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [viewDate]);

    const handleDayPress = (day: Date) => {
        onSelect(day);
        onClose();
    };

    const today = new Date();

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: theme.surface }]}>
                    {/* Month/Year navigation header */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity onPress={() => setViewDate(subMonths(viewDate, 1))} style={styles.navBtn}>
                            <Text style={[styles.navArrow, { color: colors.primary }]}>‹</Text>
                        </TouchableOpacity>
                        <Text style={[styles.monthTitle, { color: theme.text }]}>
                            {format(viewDate, 'MMMM yyyy')}
                        </Text>
                        <TouchableOpacity onPress={() => setViewDate(addMonths(viewDate, 1))} style={styles.navBtn}>
                            <Text style={[styles.navArrow, { color: colors.primary }]}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Weekday headers */}
                    <View style={styles.weekRow}>
                        {WEEKDAY_LABELS.map(label => (
                            <View key={label} style={styles.dayCell}>
                                <Text style={[styles.weekLabel, { color: theme.textSecondary }]}>
                                    {label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Day grid */}
                    <View style={styles.grid}>
                        {calendarDays.map((day, index) => {
                            const inMonth = isSameMonth(day, viewDate);
                            const isSelected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, today);
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.dayCell,
                                        isSelected && { backgroundColor: colors.primary, borderRadius: 20 },
                                        isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary, borderRadius: 20 },
                                    ]}
                                    onPress={() => inMonth && handleDayPress(day)}
                                    disabled={!inMonth}
                                >
                                    <Text
                                        style={[
                                            styles.dayText,
                                            { color: inMonth ? theme.text : theme.border },
                                            isWeekend && inMonth && { color: theme.textSecondary },
                                            isSelected && { color: '#FFFFFF', fontWeight: 'bold' },
                                        ]}
                                    >
                                        {format(day, 'd')}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Footer buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => { onSelect(today); onClose(); }} style={styles.footerBtn}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Today</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={styles.footerBtn}>
                            <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
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
        padding: 16,
        borderRadius: 16,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    navBtn: {
        padding: 8,
    },
    navArrow: {
        fontSize: 28,
        fontWeight: '300',
    },
    monthTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    dayText: {
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#eee',
    },
    footerBtn: {
        padding: 8,
    },
});
