import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    StatusBar,
    Modal,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../core/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { SettingsKey, ThemeMode } from '../../../core/constants';

// Supported currencies
const CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

const THEME_OPTIONS = [
    { value: ThemeMode.SYSTEM, label: 'System Default' },
    { value: ThemeMode.LIGHT, label: 'Light' },
    { value: ThemeMode.DARK, label: 'Dark' },
];

export const SettingsScreen = () => {
    const { theme, colors, isDark } = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [currencyCode, setCurrencyCode] = useState('INR');
    const [currencySymbol, setCurrencySymbol] = useState('₹');
    const [themeMode, setThemeMode] = useState<ThemeMode>(ThemeMode.SYSTEM);
    const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
    const [themePickerVisible, setThemePickerVisible] = useState(false);

    useEffect(() => {
        async function loadSettings() {
            const settings = await db.select().from(schema.appSettings);
            settings.forEach(s => {
                if (s.key === SettingsKey.CURRENCY_CODE) setCurrencyCode(s.value);
                if (s.key === SettingsKey.CURRENCY_SYMBOL) setCurrencySymbol(s.value);
                if (s.key === SettingsKey.THEME_MODE) setThemeMode(s.value as ThemeMode);
            });
        }
        loadSettings();
    }, []);

    const saveSetting = async (key: string, value: string) => {
        try {
            const existing = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key));
            if (existing.length > 0) {
                await db.update(schema.appSettings).set({ value }).where(eq(schema.appSettings.key, key));
            } else {
                await db.insert(schema.appSettings).values({ key, value });
            }
        } catch (err) {
            console.error('Failed to save setting:', err);
        }
    };

    const handleCurrencySelect = async (currency: typeof CURRENCIES[0]) => {
        setCurrencyCode(currency.code);
        setCurrencySymbol(currency.symbol);
        setCurrencyPickerVisible(false);
        await saveSetting(SettingsKey.CURRENCY_CODE, currency.code);
        await saveSetting(SettingsKey.CURRENCY_SYMBOL, currency.symbol);
    };

    const handleThemeSelect = async (mode: ThemeMode) => {
        setThemeMode(mode);
        setThemePickerVisible(false);
        await saveSetting(SettingsKey.THEME_MODE, mode);
    };

    const handleExport = () => {
        Alert.alert('Coming Soon', 'CSV/Excel export functionality is under development.');
    };

    const SettingItem = ({ label, value, onPress }: any) => (
        <TouchableOpacity
            style={[styles.item, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
            onPress={onPress}
        >
            <View>
                <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
                {value && <Text style={[styles.itemValue, { color: theme.textSecondary }]}>{value}</Text>}
            </View>
            <Text style={{ color: theme.textSecondary }}>›</Text>
        </TouchableOpacity>
    );

    const currentCurrency = CURRENCIES.find(c => c.code === currencyCode);
    const currentThemeLabel = THEME_OPTIONS.find(t => t.value === themeMode)?.label || 'System';

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
                        value={`${currentCurrency?.code || currencyCode} (${currencySymbol})`}
                        onPress={() => setCurrencyPickerVisible(true)}
                    />
                    <SettingItem
                        label="Theme"
                        value={currentThemeLabel}
                        onPress={() => setThemePickerVisible(true)}
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
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>PiggyBook v1.0.0</Text>
                </View>
            </ScrollView>

            {/* Currency Picker Modal */}
            <Modal visible={currencyPickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
                            <TouchableOpacity onPress={() => setCurrencyPickerVisible(false)}>
                                <Text style={{ color: colors.primary }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={CURRENCIES}
                            keyExtractor={item => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, { borderBottomColor: theme.border }]}
                                    onPress={() => handleCurrencySelect(item)}
                                >
                                    <Text style={[styles.modalItemText, { color: theme.text }]}>
                                        {item.symbol} {item.name}
                                    </Text>
                                    <Text style={{ color: theme.textSecondary }}>{item.code}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Theme Picker Modal */}
            <Modal visible={themePickerVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: 240 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Theme</Text>
                            <TouchableOpacity onPress={() => setThemePickerVisible(false)}>
                                <Text style={{ color: colors.primary }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                        {THEME_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.modalItem,
                                    { borderBottomColor: theme.border },
                                    themeMode === opt.value && { backgroundColor: colors.primary + '15' },
                                ]}
                                onPress={() => handleThemeSelect(opt.value)}
                            >
                                <Text style={[styles.modalItemText, { color: theme.text }]}>
                                    {opt.label}
                                </Text>
                                {themeMode === opt.value && (
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        maxHeight: '50%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalItemText: {
        fontSize: 16,
    },
});
