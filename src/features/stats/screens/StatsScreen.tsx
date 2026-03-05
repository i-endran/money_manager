import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../core/theme';

export const StatsScreen: React.FC = () => {
    const { theme } = useAppTheme();

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Statistics</Text>
            </View>
            <View style={styles.center}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
                <Text style={[styles.comingSoon, { color: theme.textSecondary }]}>
                    Charts & Insights
                </Text>
                <Text style={{ color: theme.textSecondary, marginTop: 4 }}>Coming Soon</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    comingSoon: {
        fontSize: 18,
        fontWeight: '600',
    },
});
