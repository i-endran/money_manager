import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Platform,
    StatusBar,
} from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootNavigator';

export const SettingsScreen = () => {
    const { theme, colors, isDark } = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const handleExport = () => {
        Alert.alert('Coming Soon', 'CSV/Excel export functionality is under development.');
    };

    const SettingItem = ({ label, value, onPress, isPlaceholder }: any) => (
        <TouchableOpacity
            style={[styles.item, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
            onPress={onPress}
        >
            <View>
                <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
                {value && <Text style={[styles.itemValue, { color: theme.textSecondary }]}>{value}</Text>}
            </View>
            <Text style={{ color: theme.textSecondary, opacity: isPlaceholder ? 0.3 : 1 }}>›</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
            </View>

            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>PREFERENCES</Text>
                    <SettingItem
                        label="Currency"
                        value="INR (₹)"
                        onPress={() => { }}
                        isPlaceholder
                    />
                    <SettingItem
                        label="Theme"
                        value={isDark ? 'Dark' : 'Light'}
                        onPress={() => { }}
                        isPlaceholder
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>MANAGEMENT</Text>
                    <SettingItem
                        label="Accounts"
                        onPress={() => navigation.navigate('AccountManagement')}
                    />
                    <SettingItem
                        label="Categories"
                        onPress={() => navigation.navigate('CategoryManagement')}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>DATA</Text>
                    <SettingItem
                        label="Export Data"
                        value="CSV, Excel"
                        onPress={handleExport}
                    />
                    <SettingItem
                        label="Cloud Backup"
                        value="Google Drive / iCloud"
                        onPress={() => Alert.alert('Coming Soon', 'Cloud backup is under development.')}
                        isPlaceholder
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>PiggyBook v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: { fontSize: 28, fontWeight: 'bold' },
    section: { marginTop: 24 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 16,
        marginBottom: 8,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemLabel: { fontSize: 16 },
    itemValue: { fontSize: 12, marginTop: 2 },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        paddingBottom: 40,
    },
});

