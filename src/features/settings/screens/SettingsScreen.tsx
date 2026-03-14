import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    FlatList,
    Switch,
    ActivityIndicator,
    Platform,
} from 'react-native';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Colors,
    FormDensityPreset,
    Layout,
    LedgerRowDensityPreset,
    LedgerSummaryCardMetricsPreset,
    LedgerTextHierarchyPreset,
    Spacing,
    Typography,
    useAppTheme,
} from '../../../core/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { SettingsKey, ThemeMode, CURRENCIES, THEME_OPTIONS, APP_NAME, APP_VERSION } from '../../../core/constants';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { useAuthStore } from '../../../stores/authStore';
import { createExportPayload, ExportFormat, createImportTemplatePayload, importDataFromFilePath } from '../../../core/utils';
import DocumentPicker from 'react-native-document-picker';
import ReactNativeBiometrics from 'react-native-biometrics';
import { PinSetupModal } from '../components/PinSetupModal';

interface GroupedItemProps {
    label: string;
    value?: string;
    onPress: () => void;
    isFirst?: boolean;
    isLast?: boolean;
    loading?: boolean;
    theme: any;
    colors: any;
}

const GroupedItem = ({ label, value, onPress, isFirst, isLast, loading, theme, colors }: GroupedItemProps) => (
    <TouchableOpacity
        style={[
            styles.item,
            {
                backgroundColor: theme.surface,
                borderTopLeftRadius: isFirst ? LedgerSummaryCardMetricsPreset.cardRadius : 0,
                borderTopRightRadius: isFirst ? LedgerSummaryCardMetricsPreset.cardRadius : 0,
                borderBottomLeftRadius: isLast ? LedgerSummaryCardMetricsPreset.cardRadius : 0,
                borderBottomRightRadius: isLast ? LedgerSummaryCardMetricsPreset.cardRadius : 0,
            },
        ]}
        onPress={onPress}
        disabled={loading}
    >
        <View style={styles.itemContent}>
            <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
            {value && <Text style={[styles.itemValue, { color: theme.textSecondary }]}>{value}</Text>}
        </View>
        {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
        ) : (
            <Text style={[styles.chevronText, { color: theme.textSecondary }]}>›</Text>
        )}
    </TouchableOpacity>
);

const Separator = ({ theme }: { theme: any }) => (
    <View style={{ backgroundColor: theme.surface }}>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
    </View>
);

export const SettingsScreen = () => {
    const { theme, colors } = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const refresh = useLedgerStore(state => state.refresh);

    const {
        currencyCode,
        currencySymbol,
        themeMode,
        carryForwardBalance: carryForward,
        updateSetting,
        loadSettings,
    } = useSettingsStore();

    const {
        appPin,
        biometricsEnabled,
        setPin,
        removePin,
        setBiometricsEnabled,
    } = useAuthStore();

    const authEnabled = !!appPin;

    const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
    const [themePickerVisible, setThemePickerVisible] = useState(false);
    const [exportPickerVisible, setExportPickerVisible] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
    const [busyAction, setBusyAction] = useState<'import' | 'template' | 'cloud' | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    type PinStep = 'enable' | 'disable' | 'change_verify' | 'change_setup';
    const [pinStep, setPinStep] = useState<PinStep | null>(null);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [biometricsLabel, setBiometricsLabel] = useState('Biometrics');

    useEffect(() => {
        const rnBiometrics = new ReactNativeBiometrics();
        rnBiometrics.isSensorAvailable().then(({ available, biometryType }) => {
            setBiometricsAvailable(available);
            if (biometryType === 'FaceID') setBiometricsLabel('Face ID');
            else if (biometryType === 'TouchID') setBiometricsLabel('Touch ID');
            else if (available) setBiometricsLabel('Biometrics');
        });
    }, []);

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
        setExportPickerVisible(true);
    };

    const shareFile = async (title: string, filePath: string, mimeType?: string) => {
        try {
            await Share.open({
                title,
                url: `file://${filePath}`,
                type: mimeType,
                failOnCancel: false,
            });
        } catch (error: any) {
            if (!error.message.includes('User did not share')) {
                throw error;
            }
        }
    };

    const saveFileToDevice = async (sourcePath: string) => {
        try {
            const fileName = sourcePath.split('/').pop() || `export_${Date.now()}`;
            const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
            
            let finalDestPath = destPath;
            if (await RNFS.exists(destPath)) {
                const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
                const ext = fileName.substring(fileName.lastIndexOf('.'));
                finalDestPath = `${RNFS.DownloadDirectoryPath}/${nameWithoutExt}_${Date.now()}${ext}`;
            }

            await RNFS.copyFile(sourcePath, finalDestPath);
            Alert.alert('Success', `File saved to Downloads:\n${finalDestPath}`);
        } catch (err) {
            console.error('Failed to save file:', err);
            Alert.alert('Error', 'Failed to save file structure.');
        }
    };

    const processExport = async (format: ExportFormat, action: 'share' | 'save') => {
        setExportingFormat(format);
        try {
            const payload = await createExportPayload(format);
            if (action === 'share') {
                await shareFile('Export Data', payload.filePath, payload.mimeType);
            } else {
                await saveFileToDevice(payload.filePath);
            }
            setExportPickerVisible(false);
        } catch (error) {
            console.error(`Failed to export ${format}:`, error);
            Alert.alert('Export Failed', 'Could not generate export file. Please try again.');
        } finally {
            setExportingFormat(null);
        }
    };

    const handleExportFormat = async (format: ExportFormat) => {
        setExportPickerVisible(false);
        
        // Wait briefly for modal to dismiss completely to avoid React Native alert/modal presentation issues
        setTimeout(() => {
            if (Platform.OS === 'android') {
                Alert.alert(
                    'Export Ready',
                    'How would you like to handle the exported file?',
                    [
                        { text: 'Share to another app', onPress: () => processExport(format, 'share') },
                        { text: 'Save to Downloads', onPress: () => processExport(format, 'save') },
                        { text: 'Cancel', style: 'cancel' }
                    ]
                );
            } else {
                processExport(format, 'share');
            }
        }, 100);
    };

    const downloadTemplate = async (format: 'csv' | 'xlsx') => {
        setBusyAction('template');
        setIsBusy(true);
        try {
            const payload = await createImportTemplatePayload(format);
            await shareFile('Import Template', payload.filePath, payload.mimeType);
        } catch (error) {
            console.error('Template generation failed:', error);
            Alert.alert('Template Failed', `Could not create ${format.toUpperCase()} template.`);
        } finally {
            setIsBusy(false);
            setBusyAction(null);
        }
    };

    const pickAndImportFile = async () => {
        setBusyAction('import');
        setIsBusy(true);
        try {
            const picked = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.allFiles],
                copyTo: 'cachesDirectory',
            });
            const fileUri = picked.fileCopyUri || picked.uri;
            if (!fileUri) {
                Alert.alert('Import Failed', 'Could not read selected file.');
                return;
            }

            const result = await importDataFromFilePath(fileUri);
            await loadSettings();
            refresh();

            Alert.alert(
                'Import Completed',
                `Mode: ${result.mode}\nAccounts: ${result.accounts}\nCategories: ${result.categories}\nTransactions: ${result.transactions}\nSettings: ${result.settings}\nSkipped: ${result.skipped}`,
            );
        } catch (error: any) {
            if (DocumentPicker.isCancel(error)) return;
            console.error('Import failed:', error);
            Alert.alert('Import Failed', `Could not import file. Use ${APP_NAME} CSV/XLSX format.`);
        } finally {
            setIsBusy(false);
            setBusyAction(null);
        }
    };

    const performImport = () => {
        Alert.alert('Import Data', 'What would you like to do?', [
            {
                text: 'Import File',
                onPress: pickAndImportFile,
            },
            {
                text: 'Download Template',
                onPress: () => {
                    Alert.alert('Download Template', 'Choose format', [
                        { text: 'CSV', onPress: () => downloadTemplate('csv') },
                        { text: 'XLSX', onPress: () => downloadTemplate('xlsx') },
                        { text: 'Cancel', style: 'cancel' },
                    ]);
                },
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleCloudBackup = () => {
        Alert.alert('Cloud Backup', 'Choose an action', [
            {
                text: 'Backup to Cloud',
                onPress: async () => {
                    setBusyAction('cloud');
                    setIsBusy(true);
                    try {
                        const payload = await createExportPayload('xlsx');
                        await shareFile('Cloud Backup', payload.filePath, payload.mimeType);
                    } catch (error) {
                        console.error('Cloud backup failed:', error);
                        Alert.alert('Backup Failed', 'Could not prepare backup file.');
                    } finally {
                        setIsBusy(false);
                        setBusyAction(null);
                    }
                },
            },
            {
                text: 'Restore from Cloud',
                onPress: pickAndImportFile,
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleCarryForwardToggle = async () => {
        const newValue = !carryForward;
        await updateSetting(SettingsKey.CARRY_FORWARD_BALANCE, newValue.toString());
        refresh();
    };

    const handlePinSuccess = async (pin: string) => {
        if (pinStep === 'enable') {
            await setPin(pin);
            setPinStep(null);
        } else if (pinStep === 'disable') {
            await removePin();
            setPinStep(null);
        } else if (pinStep === 'change_verify') {
            // Seamlessly advance to setup step — key prop on modal causes internal reset
            setPinStep('change_setup');
        } else if (pinStep === 'change_setup') {
            await setPin(pin);
            setPinStep(null);
        }
    };

    const getPinModalProps = () => {
        switch (pinStep) {
            case 'enable':
                return { mode: 'setup' as const, title: 'Set PIN' };
            case 'disable':
                return { mode: 'verify' as const, title: 'Enter PIN to disable' };
            case 'change_verify':
                return { mode: 'verify' as const, title: 'Enter current PIN' };
            case 'change_setup':
                return { mode: 'setup' as const, title: 'Set new PIN' };
            default:
                return { mode: 'setup' as const, title: '' };
        }
    };

    const currentCurrency = CURRENCIES.find(c => c.code === currencyCode);
    const currentThemeLabel = THEME_OPTIONS.find(t => t.value === themeMode)?.label || 'System';

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
                        theme={theme}
                        colors={colors}
                    />
                    <Separator theme={theme} />
                    <GroupedItem
                        label="Theme"
                        value={currentThemeLabel}
                        onPress={() => setThemePickerVisible(true)}
                        theme={theme}
                        colors={colors}
                    />
                    <Separator theme={theme} />
                    <TouchableOpacity
                        style={[
                            styles.item,
                            {
                                backgroundColor: theme.surface,
                                borderBottomLeftRadius: LedgerSummaryCardMetricsPreset.cardRadius,
                                borderBottomRightRadius: LedgerSummaryCardMetricsPreset.cardRadius,
                            },
                        ]}
                        onPress={handleCarryForwardToggle}
                    >
                        <View style={styles.itemContent}>
                            <Text style={[styles.itemLabel, { color: theme.text }]}>Carry Forward Balance</Text>
                            <Text style={[styles.itemSubtext, { color: theme.textSecondary }]}>Show last month's balance as opening</Text>
                        </View>
                        <View style={[styles.toggle, carryForward ? { backgroundColor: colors.primary } : { backgroundColor: theme.border }]}>
                            <Text style={styles.toggleText}>{carryForward ? 'ON' : 'OFF'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* SECURITY */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SECURITY</Text>
                <View style={styles.cardGroup}>
                    <TouchableOpacity
                        style={[
                            styles.item,
                            {
                                backgroundColor: theme.surface,
                                borderTopLeftRadius: LedgerSummaryCardMetricsPreset.cardRadius,
                                borderTopRightRadius: LedgerSummaryCardMetricsPreset.cardRadius,
                                borderBottomLeftRadius: authEnabled ? 0 : LedgerSummaryCardMetricsPreset.cardRadius,
                                borderBottomRightRadius: authEnabled ? 0 : LedgerSummaryCardMetricsPreset.cardRadius,
                            },
                        ]}
                        onPress={() => authEnabled ? setPinStep('disable') : setPinStep('enable')}
                    >
                        <View style={styles.itemContent}>
                            <Text style={[styles.itemLabel, { color: theme.text }]}>App Lock</Text>
                            <Text style={[styles.itemSubtext, { color: theme.textSecondary }]}>Require PIN to open app</Text>
                        </View>
                        <Switch
                            value={authEnabled}
                            onValueChange={v => v ? setPinStep('enable') : setPinStep('disable')}
                            trackColor={{ false: theme.border, true: colors.primary }}
                            thumbColor="white"
                        />
                    </TouchableOpacity>

                    {authEnabled && (
                        <>
                            <Separator theme={theme} />
                            <TouchableOpacity
                                style={[
                                    styles.item,
                                    {
                                        backgroundColor: theme.surface,
                                        opacity: biometricsAvailable ? 1 : 0.5,
                                    },
                                ]}
                                disabled={!biometricsAvailable}
                                onPress={() => biometricsAvailable && setBiometricsEnabled(!biometricsEnabled)}
                            >
                                <View style={styles.itemContent}>
                                    <Text style={[styles.itemLabel, { color: theme.text }]}>{biometricsLabel}</Text>
                                    <Text style={[styles.itemSubtext, { color: theme.textSecondary }]}>
                                        {biometricsAvailable ? 'Unlock without PIN' : 'Not available on this device'}
                                    </Text>
                                </View>
                                {biometricsAvailable && (
                                    <Switch
                                        value={biometricsEnabled}
                                        onValueChange={v => setBiometricsEnabled(v)}
                                        trackColor={{ false: theme.border, true: colors.primary }}
                                        thumbColor="white"
                                    />
                                )}
                            </TouchableOpacity>
                            <Separator theme={theme} />
                            <GroupedItem
                                label="Change PIN"
                                onPress={() => setPinStep('change_verify')}
                                isLast
                                theme={theme}
                                colors={colors}
                            />
                        </>
                    )}
                </View>

                {/* MANAGEMENT */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MANAGEMENT</Text>
                <View style={styles.cardGroup}>
                    <GroupedItem
                        label="Accounts"
                        onPress={() => navigation.navigate('AccountManagement')}
                        isFirst
                        theme={theme}
                        colors={colors}
                    />
                    <Separator theme={theme} />
                    <GroupedItem
                        label="Categories"
                        onPress={() => navigation.navigate('CategoryManagement')}
                        isLast
                        theme={theme}
                        colors={colors}
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
                        theme={theme}
                        colors={colors}
                    />
                    <Separator theme={theme} />
                    <GroupedItem
                        label="Import Data"
                        value="CSV, XLSX"
                        onPress={performImport}
                        loading={isBusy && busyAction === 'import'}
                        theme={theme}
                        colors={colors}
                    />
                    <Separator theme={theme} />
                    <GroupedItem
                        label="Cloud Backup"
                        value="Backup + Restore"
                        onPress={handleCloudBackup}
                        loading={isBusy && busyAction === 'cloud'}
                        isLast
                        theme={theme}
                        colors={colors}
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.textSecondary }]}>{APP_NAME} v{APP_VERSION}</Text>
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
                            initialScrollIndex={Math.max(0, CURRENCIES.findIndex(c => c.code === currencyCode))}
                            getItemLayout={(_, index) => ({
                                length: (Spacing.lg + Spacing.xxs) * 2 + Typography.sizes.md,
                                offset: ((Spacing.lg + Spacing.xxs) * 2 + Typography.sizes.md) * index,
                                index,
                            })}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.modalItem,
                                        { borderBottomColor: theme.border },
                                        item.code === currencyCode && { backgroundColor: colors.primary + '15' },
                                    ]}
                                    onPress={() => handleCurrencySelect(item)}
                                >
                                    <Text style={[styles.modalItemText, { color: theme.text }]}>
                                        {item.symbol} {item.name}
                                    </Text>
                                    {item.code === currencyCode
                                        ? <Text style={[styles.selectedText, { color: colors.primary }]}>✓</Text>
                                        : <Text style={{ color: theme.textSecondary }}>{item.code}</Text>
                                    }
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Theme Picker Modal */}
            <Modal visible={themePickerVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.themeModalContent, { backgroundColor: theme.surface }]}>
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
                                    <Text style={[styles.selectedText, { color: colors.primary }]}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Export Picker Modal */}
            <Modal visible={exportPickerVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.exportModalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Export Data</Text>
                            <TouchableOpacity
                                disabled={!!exportingFormat}
                                onPress={() => setExportPickerVisible(false)}
                            >
                                <Text style={{ color: colors.primary, opacity: exportingFormat ? 0.5 : 1 }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {[
                            { value: 'csv' as ExportFormat, label: 'CSV (.csv)', subtitle: 'Transactions only' },
                            { value: 'xlsx' as ExportFormat, label: 'Excel (.xlsx)', subtitle: 'Transactions, accounts, categories, settings' },
                        ].map(option => (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.modalItem, { borderBottomColor: theme.border }]}
                                onPress={() => handleExportFormat(option.value)}
                                disabled={!!exportingFormat}
                            >
                                <View style={styles.itemContent}>
                                    <Text style={[styles.modalItemText, { color: theme.text }]}>
                                        {option.label}
                                    </Text>
                                    <Text style={[styles.modalItemSubText, { color: theme.textSecondary }]}>
                                        {option.subtitle}
                                    </Text>
                                </View>
                                {exportingFormat === option.value ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Text style={[styles.chevronText, { color: theme.textSecondary }]}>›</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* PIN Setup Modal */}
            <PinSetupModal
                visible={pinStep !== null}
                key={pinStep || 'idle'}
                mode={pinStep ? getPinModalProps().mode : 'setup'}
                title={pinStep ? getPinModalProps().title : ''}
                validatePin={
                    (pinStep === 'disable' || pinStep === 'change_verify')
                        ? p => p === appPin
                        : undefined
                }
                onSuccess={handlePinSuccess}
                onCancel={() => setPinStep(null)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    headerTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxxxl,
    },
    sectionTitle: {
        fontSize: LedgerTextHierarchyPreset.meta.fontSize,
        fontWeight: LedgerTextHierarchyPreset.meta.fontWeight,
        marginLeft: Spacing.xs,
        marginBottom: Spacing.md,
        marginTop: FormDensityPreset.sectionSpacing,
        textTransform: 'uppercase',
    },
    cardGroup: {
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: FormDensityPreset.rowPaddingVertical,
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
    },
    itemContent: { flex: 1 },
    itemLabel: {
        fontSize: LedgerTextHierarchyPreset.primary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.primary.fontWeight,
    },
    itemValue: {
        fontSize: LedgerTextHierarchyPreset.meta.fontSize,
        fontWeight: LedgerTextHierarchyPreset.meta.fontWeight,
        marginTop: LedgerSummaryCardMetricsPreset.labelValueSpacing,
    },
    itemSubtext: {
        fontSize: LedgerTextHierarchyPreset.secondary.fontSize,
        fontWeight: LedgerTextHierarchyPreset.secondary.fontWeight,
        marginTop: LedgerSummaryCardMetricsPreset.labelValueSpacing,
    },
    separator: {
        height: LedgerRowDensityPreset.separatorThickness,
        marginLeft: LedgerRowDensityPreset.paddingHorizontal,
        marginRight: LedgerRowDensityPreset.paddingHorizontal,
    },
    toggle: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: FormDensityPreset.controlRadius + Spacing.sm,
    },
    toggleText: {
        color: Colors.white,
        fontWeight: Typography.weights.bold,
        fontSize: Typography.sizes.sm,
    },
    footer: {
        marginTop: Spacing.xxxxxl,
        alignItems: 'center',
        paddingBottom: Spacing.xxxxxl,
    },
    footerText: {
        fontSize: LedgerTextHierarchyPreset.meta.fontSize,
        fontWeight: LedgerTextHierarchyPreset.meta.fontWeight,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.overlayMedium,
        justifyContent: 'flex-end',
    },
    modalContent: {
        maxHeight: '50%',
        borderTopLeftRadius: Layout.radius.lg + Spacing.xs,
        borderTopRightRadius: Layout.radius.lg + Spacing.xs,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl,
        overflow: 'hidden',
    },
    themeModalContent: {
        maxHeight: 240,
    },
    exportModalContent: {
        maxHeight: 260,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    modalTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.lg + Spacing.xxs,
        paddingHorizontal: Spacing.xl,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalItemText: {
        fontSize: Typography.sizes.md,
    },
    modalItemSubText: {
        fontSize: Typography.sizes.sm,
        marginTop: Spacing.xxs,
    },
    chevronText: { fontSize: Typography.sizes.lg },
    selectedText: { fontWeight: Typography.weights.bold },
});
