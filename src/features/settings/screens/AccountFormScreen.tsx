import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Colors,
    FormDensityPreset,
    FormHeaderPreset,
    LedgerTextHierarchyPreset,
    Spacing,
    Typography,
    useAppTheme,
} from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { eq, desc } from 'drizzle-orm';
import { AccountType } from '../../../core/constants';
import { BlurView } from '@react-native-community/blur';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { isMandatoryClosedBoxType, normalizeInitialBalanceByType } from '../../../core/utils';

export const AccountFormScreen = ({ navigation, route }: any) => {
    const { theme, colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const { refresh } = useLedgerStore();

    const accountId = route.params?.accountId;
    const parentId = route.params?.parentId;
    const initialType = route.params?.initialType as AccountType || AccountType.BANK;

    const [name, setName] = useState('');
    const [originalName, setOriginalName] = useState('');
    const [type, setType] = useState<AccountType>(initialType);
    const [initialBalance, setInitialBalance] = useState('');
    const [settlementDay, setSettlementDay] = useState('10');
    const [isActive, setIsActive] = useState(true);
    const [excludeFromSummaries, setExcludeFromSummaries] = useState(false);

    const [parentCache, setParentCache] = useState<schema.Account | null>(null);

    const isReserveMode = !!parentId || (parentCache !== null);
    const isDebtAccountType = type === AccountType.DEBT;
    const isMandatoryClosedBoxAccountType = isMandatoryClosedBoxType(type);
    const isCardAccountType = type === AccountType.CARD;

    useEffect(() => {
        async function load() {
            if (accountId) {
                const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId)).limit(1);
                if (acc) {
                    setName(acc.name);
                    setOriginalName(acc.name);
                    setType(acc.type as AccountType);
                    setInitialBalance(acc.initialBalance.toString());
                    setSettlementDay(String(acc.settlementDay || 28));
                    setIsActive(acc.isActive);
                    setExcludeFromSummaries(
                        isMandatoryClosedBoxType(acc.type) ? true : acc.excludeFromSummaries,
                    );

                    if (acc.parentId) {
                        const [p] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, acc.parentId)).limit(1);
                        setParentCache(p);
                    }
                }
            } else if (parentId) {
                // Creating a new reserve
                const [p] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, parentId)).limit(1);
                if (p) {
                    setParentCache(p);
                    setType(p.type as AccountType);
                    setExcludeFromSummaries(
                        isMandatoryClosedBoxType(p.type) ? true : p.excludeFromSummaries,
                    );
                    setSettlementDay(String(p.settlementDay || 28));
                }
            }
        }
        load();
    }, [accountId, parentId]);

    useEffect(() => {
        if (isMandatoryClosedBoxAccountType && !excludeFromSummaries) {
            setExcludeFromSummaries(true);
        }
    }, [isMandatoryClosedBoxAccountType, excludeFromSummaries]);

    const handleTypeSelect = (selectedType: AccountType) => {
        const wasMandatoryClosedBoxType = isMandatoryClosedBoxType(type);
        const nextMandatoryClosedBoxType = isMandatoryClosedBoxType(selectedType);
        setType(selectedType);
        if (nextMandatoryClosedBoxType) {
            setExcludeFromSummaries(true);
        } else if (!accountId && !isReserveMode && wasMandatoryClosedBoxType) {
            setExcludeFromSummaries(false);
        }
        if (selectedType === AccountType.CARD && !settlementDay) {
            setSettlementDay('28');
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        // Parent limits check
        const finalParentId = accountId ? parentCache?.id : parentId;
        if (!accountId && finalParentId) {
            const reserves = await db.select().from(schema.accounts).where(eq(schema.accounts.parentId, finalParentId));
            if (reserves.length >= 10) {
                Alert.alert('Limit Reached', 'An account can have a maximum of 10 reserves.');
                return;
            }
        }

        const balance = parseFloat(initialBalance) || 0;
        const normalizedSettlementDay = Math.max(1, Math.min(31, parseInt(settlementDay, 10) || 28));
        const finalExcludeFromSummaries = isMandatoryClosedBoxType(type) ? true : excludeFromSummaries;
        const finalSettlementDay = isReserveMode
            ? (parentCache?.settlementDay || normalizedSettlementDay)
            : (isCardAccountType ? normalizedSettlementDay : 28);
        const normalizedInitialBalance = normalizeInitialBalanceByType(type, balance);
        const now = new Date().toISOString();

        try {
            if (accountId) {
                await db.update(schema.accounts).set({
                    name: name.trim(),
                    type,
                    initialBalance: isReserveMode ? 0 : normalizedInitialBalance,
                    isActive,
                    excludeFromSummaries: finalExcludeFromSummaries,
                    settlementDay: finalSettlementDay,
                }).where(eq(schema.accounts.id, accountId));

                refresh(); // Trigger ledger refresh in case name changed
                navigation.goBack();
            } else {
                // Need to compute sortOrder (put at the end of the list)
                const all = await db.select().from(schema.accounts).orderBy(desc(schema.accounts.sortOrder)).limit(1);
                const nextSort = all.length > 0 ? all[0].sortOrder + 10 : 0;

                await db.insert(schema.accounts).values({
                    name: name.trim(),
                    iconName: isReserveMode ? 'subdirectory-arrow-right' : '🏦',
                    type,
                    initialBalance: isReserveMode ? 0 : normalizedInitialBalance,
                    isActive,
                    parentId: finalParentId || null,
                    sortOrder: nextSort,
                    excludeFromSummaries: finalExcludeFromSummaries,
                    settlementDay: finalSettlementDay,
                    createdAt: now,
                });

                refresh();
                navigation.goBack();
            }
        } catch (error) {
            console.error('Failed to save account:', error);
            Alert.alert('Error', 'Failed to save account');
        }
    };

    const handleDelete = async () => {
        if (!accountId) return;

        Alert.alert('Delete Account', 'Are you sure you want to delete this account? It will fail if there are existing transactions.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        // Check if it has reserves
                        const reserves = await db.select().from(schema.accounts).where(eq(schema.accounts.parentId, accountId));
                        if (reserves.length > 0) {
                            Alert.alert('Cannot Delete', 'This account has reserves. Delete the reserves first.');
                            return;
                        }

                        await db.delete(schema.accounts).where(eq(schema.accounts.id, accountId));
                        refresh();
                        navigation.goBack();
                    } catch (error) {
                        console.error('Delete failed:', error);
                        Alert.alert('Error', 'Cannot delete account. Ensure no transactions are linked to it.');
                    }
                },
            },
        ]);
    };

    const handleExcludeToggle = () => {
        if (isMandatoryClosedBoxAccountType) return;
        const newValue = !excludeFromSummaries;
        setExcludeFromSummaries(newValue);
        if (newValue && !accountId) {
            Alert.alert(
                'Closed-Box Account',
                'This account will only allow Transfers. Its balance will not affect your Total Income or Expense summaries.'
            );
        }
    };

    return (
        <SafeAreaView
            edges={['left', 'right', 'bottom']}
            style={[styles.container, { backgroundColor: isDark ? Colors.darkGlass : Colors.lightGlass }]}
        >
            <BlurView
                style={StyleSheet.absoluteFillObject}
                blurType={isDark ? 'dark' : 'light'}
                blurAmount={10}
            />
            <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + Spacing.md }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: colors.primary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {accountId
                        ? (originalName ? `Edit ${originalName}` : (isReserveMode ? 'Edit Reserve' : 'Edit Account'))
                        : (isReserveMode ? 'New Reserve' : 'New Account')}
                </Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {isReserveMode && parentCache && (
                    <View style={[styles.parentBadge, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.parentBadgeText, { color: theme.textSecondary }]}>
                            Parent: {parentCache.name}
                        </Text>
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]}
                        value={name}
                        onChangeText={setName}
                        placeholder={isReserveMode ? "e.g., Emergency Fund" : "e.g., Checking, Wallet"}
                        placeholderTextColor={theme.textSecondary}
                    />
                </View>

                {!isReserveMode && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Type</Text>
                        <View style={styles.typeContainer}>
                            {Object.values(AccountType).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => handleTypeSelect(t as AccountType)}
                                    style={[
                                        styles.typeBtn,
                                        { backgroundColor: type === t ? colors.primary : theme.surface },
                                    ]}>
                                    <Text style={[styles.typeText, { color: type === t ? Colors.white : theme.textSecondary }]}>
                                        {t.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {!accountId && !isReserveMode && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Initial Balance</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]}
                            value={initialBalance}
                            onChangeText={setInitialBalance}
                            placeholder="0.00"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                        />
                        {(isCardAccountType || isDebtAccountType) && (
                            <Text style={[styles.warningText, { color: colors.expense }]}>
                                Loan-like accounts are stored as liabilities and shown in red.
                            </Text>
                        )}
                    </View>
                )}

                {!isReserveMode && isCardAccountType && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Settlement Day (1-31)</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]}
                            value={settlementDay}
                            onChangeText={text => setSettlementDay(text.replace(/[^0-9]/g, '').slice(0, 2))}
                            placeholder="28"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="number-pad"
                        />
                    </View>
                )}

                <View style={styles.switchGroup}>
                    <Text style={[styles.label, styles.labelNoMargin, { color: theme.text }]}>Active</Text>
                    <TouchableOpacity
                        style={[styles.switch, isActive ? { backgroundColor: colors.primary } : { backgroundColor: theme.border }]}
                        onPress={() => setIsActive(!isActive)}>
                        <Text style={styles.switchText}>{isActive ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                </View>

                {!isReserveMode && (
                    <View style={[styles.switchGroup, styles.switchGroupWithMargin]}>
                        <View style={styles.switchDescriptionContainer}>
                            <Text style={[styles.closedBoxLabel, { color: theme.text }]}>Closed-Box Account</Text>
                            <Text style={[styles.closedBoxDescription, { color: theme.textSecondary }]}>
                                {isMandatoryClosedBoxAccountType
                                    ? `Mandatory for ${type.toUpperCase()} accounts. Only transfers allowed and excluded from income/expense calculations.`
                                    : 'Only transfers allowed. Excluded from income/expense calculations.'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.switch, excludeFromSummaries ? { backgroundColor: colors.expense } : { backgroundColor: theme.border }]}
                            onPress={handleExcludeToggle}
                            disabled={isMandatoryClosedBoxAccountType}>
                            <Text style={styles.switchText}>{excludeFromSummaries ? 'ON' : 'OFF'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {accountId && (
                    <TouchableOpacity
                        style={[styles.deleteBtn, { borderColor: colors.expense }]}
                        onPress={handleDelete}
                    >
                        <Text style={[styles.deleteText, { color: colors.expense }]}>
                            {isReserveMode ? 'Delete Reserve' : 'Delete Account'}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: FormDensityPreset.rowPaddingHorizontal,
        paddingVertical: FormDensityPreset.rowPaddingVertical,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    title: { ...FormHeaderPreset.title },
    saveText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
    content: { padding: FormDensityPreset.rowPaddingHorizontal },
    parentBadge: {
        paddingVertical: FormDensityPreset.rowPaddingVertical,
        paddingHorizontal: FormDensityPreset.rowPaddingHorizontal,
        borderRadius: FormDensityPreset.controlRadius,
        marginBottom: FormDensityPreset.sectionSpacing,
        alignSelf: 'flex-start',
    },
    parentBadgeText: { ...LedgerTextHierarchyPreset.secondary },
    inputGroup: { marginBottom: FormDensityPreset.sectionSpacing },
    label: { ...LedgerTextHierarchyPreset.secondary, marginBottom: Spacing.md },
    labelNoMargin: {
        marginBottom: 0,
    },
    input: {
        ...LedgerTextHierarchyPreset.primary,
        paddingVertical: FormDensityPreset.rowPaddingVertical,
        paddingHorizontal: FormDensityPreset.rowPaddingHorizontal,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    typeBtn: {
        paddingHorizontal: FormDensityPreset.rowPaddingHorizontal,
        paddingVertical: FormDensityPreset.rowPaddingVertical,
        borderRadius: FormDensityPreset.controlRadius,
    },
    typeText: { ...LedgerTextHierarchyPreset.amount },
    warningText: { marginTop: Spacing.md, ...LedgerTextHierarchyPreset.secondary },
    switchGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: FormDensityPreset.fieldSpacing,
    },
    switchGroupWithMargin: {
        marginTop: FormDensityPreset.sectionSpacing,
    },
    switchDescriptionContainer: {
        flex: 1,
        paddingRight: FormDensityPreset.fieldSpacing,
    },
    closedBoxLabel: {
        ...LedgerTextHierarchyPreset.primary,
        marginBottom: Spacing.xs,
    },
    closedBoxDescription: {
        ...LedgerTextHierarchyPreset.secondary,
    },
    switch: {
        paddingHorizontal: FormDensityPreset.rowPaddingHorizontal,
        paddingVertical: FormDensityPreset.rowPaddingVertical,
        borderRadius: FormDensityPreset.controlRadius,
    },
    switchText: {
        color: Colors.white,
        ...LedgerTextHierarchyPreset.amount,
    },
    deleteBtn: {
        marginTop: FormDensityPreset.sectionSpacing * 2,
        paddingVertical: FormDensityPreset.rowPaddingVertical,
        paddingHorizontal: FormDensityPreset.rowPaddingHorizontal,
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: FormDensityPreset.controlRadius,
    },
    deleteText: { ...LedgerTextHierarchyPreset.amount },
});
