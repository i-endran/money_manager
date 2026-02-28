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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { eq, desc } from 'drizzle-orm';
import { AccountType } from '../../../core/constants';
import { BlurView } from '@react-native-community/blur';
import { useLedgerStore } from '../../../stores/ledgerStore';

export const AccountFormScreen = ({ navigation, route }: any) => {
    const { theme, colors, isDark } = useAppTheme();
    const { refresh } = useLedgerStore();

    const accountId = route.params?.accountId;
    const parentId = route.params?.parentId;
    const initialType = route.params?.initialType as AccountType || AccountType.BANK;

    const [name, setName] = useState('');
    const [originalName, setOriginalName] = useState('');
    const [type, setType] = useState<AccountType>(initialType);
    const [initialBalance, setInitialBalance] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [excludeFromSummaries, setExcludeFromSummaries] = useState(false);

    const [parentCache, setParentCache] = useState<schema.Account | null>(null);

    const isReserveMode = !!parentId || (parentCache !== null);

    useEffect(() => {
        async function load() {
            if (accountId) {
                const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId)).limit(1);
                if (acc) {
                    setName(acc.name);
                    setOriginalName(acc.name);
                    setType(acc.type as AccountType);
                    setInitialBalance(acc.initialBalance.toString());
                    setIsActive(acc.isActive);
                    setExcludeFromSummaries(acc.excludeFromSummaries);

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
                    setExcludeFromSummaries(p.excludeFromSummaries);
                }
            }
        }
        load();
    }, [accountId, parentId]);

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
        const now = new Date().toISOString();

        try {
            if (accountId) {
                await db.update(schema.accounts).set({
                    name: name.trim(),
                    type,
                    initialBalance: isReserveMode ? 0 : balance,
                    isActive,
                    excludeFromSummaries,
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
                    initialBalance: isReserveMode ? 0 : balance,
                    isActive,
                    parentId: finalParentId || null,
                    sortOrder: nextSort,
                    excludeFromSummaries,
                    createdAt: now,
                });

                refresh();

                if (!isReserveMode) {
                    Alert.alert('Success', 'Account created. Would you like to add a reserve for this account?', [
                        { text: 'No', style: 'cancel', onPress: () => navigation.goBack() },
                        {
                            text: 'Yes',
                            onPress: async () => {
                                // Find the inserted account
                                const latest = await db.select().from(schema.accounts)
                                    .where(eq(schema.accounts.name, name.trim()))
                                    .orderBy(desc(schema.accounts.id)).limit(1);

                                if (latest[0]) {
                                    navigation.replace('AccountForm', { parentId: latest[0].id });
                                } else {
                                    navigation.goBack();
                                }
                            }
                        }
                    ]);
                } else {
                    navigation.goBack();
                }
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
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }]}>
            <BlurView
                style={StyleSheet.absoluteFillObject}
                blurType={isDark ? 'dark' : 'light'}
                blurAmount={10}
            />
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: colors.primary }}>Cancel</Text>
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
                                    onPress={() => setType(t as AccountType)}
                                    style={[
                                        styles.typeBtn,
                                        { backgroundColor: type === t ? colors.primary : theme.surface },
                                    ]}>
                                    <Text style={[styles.typeText, { color: type === t ? 'white' : theme.textSecondary }]}>
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
                    </View>
                )}

                <View style={styles.switchGroup}>
                    <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>Active</Text>
                    <TouchableOpacity
                        style={[styles.switch, isActive ? { backgroundColor: colors.primary } : { backgroundColor: theme.border }]}
                        onPress={() => setIsActive(!isActive)}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{isActive ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                </View>

                {!isReserveMode && (
                    <View style={[styles.switchGroup, { marginTop: 24 }]}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={[styles.label, { color: theme.text, marginBottom: 4 }]}>Closed-Box Account</Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                                Only transfers allowed. Excluded from income/expense calculations.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.switch, excludeFromSummaries ? { backgroundColor: colors.expense } : { backgroundColor: theme.border }]}
                            onPress={handleExcludeToggle}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>{excludeFromSummaries ? 'ON' : 'OFF'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {accountId && (
                    <TouchableOpacity
                        style={[styles.deleteBtn, { borderColor: colors.expense }]}
                        onPress={handleDelete}
                    >
                        <Text style={{ color: colors.expense, fontWeight: 'bold' }}>
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
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    saveText: { fontWeight: 'bold', fontSize: 16 },
    content: { padding: 16 },
    parentBadge: {
        padding: 8,
        borderRadius: 8,
        marginBottom: 24,
        alignSelf: 'flex-start',
    },
    parentBadgeText: { fontSize: 12, fontWeight: '600' },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
    input: {
        fontSize: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
    },
    typeText: { fontSize: 12, fontWeight: 'bold' },
    switchGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    switch: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    deleteBtn: {
        marginTop: 40,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
    },
});
