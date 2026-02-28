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
import { SettingsKey, ThemeMode, CURRENCIES, THEME_OPTIONS } from '../../../core/constants';
import { useSettingsStore } from '../../../stores/settingsStore';

export const SettingsScreen = () => {
    const { theme, colors } = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const {
        currencyCode,
        currencySymbol,
        themeMode,
        carryForwardBalance: carryForward,
        updateSetting
    } = useSettingsStore();

    const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
    const [themePickerVisible, setThemePickerVisible] = useState(false);

    const handleCurrencySelect = async (currency: typeof CURRENCIES[0]) => {
        setCurrencyPickerVisible(false);
        await updateSetting(SettingsKey.CURRENCY_CODE, currency.code);
        await updateSetting(SettingsKey.CURRENCY_SYMBOL, currency.symbol);
    };

    const handleThemeSelect = async (mode: ThemeMode) => {
        setThemePickerVisible(false);
        await updateSetting(SettingsKey.THEME_MODE, mode);
    };

    const handleExport = () => {
        Alert.alert('Coming Soon', 'CSV/Excel export functionality is under development.');
    };

    const handleCarryForwardToggle = async () => {
        const newValue = !carryForward;
        await updateSetting(SettingsKey.CARRY_FORWARD_BALANCE, newValue.toString());
    };

    const currentCurrency = CURRENCIES.find(c => c.code === currencyCode);
    const currentThemeLabel = THEME_OPTIONS.find(t => t.value === themeMode)?.label || 'System';

    // Reusable grouped item renderer
    const GroupedItem = ({ label, value, onPress, isFirst, isLast }: any) => (
        <TouchableOpacity
            style={[
                styles.item,
                {
                    backgroundColor: theme.surface,
                    borderTopLeftRadius: isFirst ? 12 : 0,
                    borderTopRightRadius: isFirst ? 12 : 0,
                    borderBottomLeftRadius: isLast ? 12 : 0,
                    borderBottomRightRadius: isLast ? 12 : 0,
                },
            ]}
            onPress={onPress}
        >
            <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
                {value && <Text style={[styles.itemValue, { color: theme.textSecondary }]}>{value}</Text>}
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
    );

    // Inset separator
    const Separator = () => (
        <View style={{ backgroundColor: theme.surface }}>
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* PREFERENCES */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>
                <View style={styles.cardGroup}>
                    <GroupedItem
                        label="Currency"
                        value={`${currentCurrency?.code || currencyCode} (${currencySymbol})`}
                        onPress={() => setCurrencyPickerVisible(true)}
                        isFirst
                    />
                    <Separator />
                    <GroupedItem
                        label="Theme"
                        value={currentThemeLabel}
                        onPress={() => setThemePickerVisible(true)}
                    />
                    <Separator />
                    <TouchableOpacity
                        style={[
                            styles.item,
                            {
                                backgroundColor: theme.surface,
                                borderBottomLeftRadius: 12,
                                borderBottomRightRadius: 12,
                            },
                        ]}
                        onPress={handleCarryForwardToggle}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.itemLabel, { color: theme.text }]}>Carry Forward Balance</Text>
                            <Text style={[styles.itemValue, { color: theme.textSecondary }]}>Show last month's balance as opening</Text>
                        </View>
                        <View style={[styles.toggle, carryForward ? { backgroundColor: colors.primary } : { backgroundColor: theme.border }]}>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{carryForward ? 'ON' : 'OFF'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* MANAGEMENT */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MANAGEMENT</Text>
                <View style={styles.cardGroup}>
                    <GroupedItem
                        label="Accounts"
                        onPress={() => navigation.navigate('AccountManagement')}
                        isFirst
                    />
                    <Separator />
                    <GroupedItem
                        label="Categories"
                        onPress={() => navigation.navigate('CategoryManagement')}
                        isLast
                    />
                </View>

                {/* DATA */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATA</Text>
                <View style={styles.cardGroup}>
                    <GroupedItem
                        label="Export Data"
                        value="CSV, Excel"
                        onPress={handleExport}
                        isFirst
                    />
                    <Separator />
                    <GroupedItem
                        label="Cloud Backup"
                        value="Google Drive / iCloud"
                        onPress={() => Alert.alert('Coming Soon', 'Cloud backup is under development.')}
                        isLast
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Pocket Log v1.0.0</Text>
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
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
        marginBottom: 6,
        marginTop: 24,
        textTransform: 'uppercase',
    },
    cardGroup: {
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    itemLabel: { fontSize: 16 },
    itemValue: { fontSize: 12, marginTop: 2 },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    toggle: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
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
