import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { AccountType } from '../../../core/constants';
import { BlurView } from '@react-native-community/blur';

export const AccountFormScreen = ({ navigation, route }: any) => {
    const { theme, colors, isDark } = useAppTheme();
    const accountId = route.params?.accountId;

    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>(AccountType.BANK);
    const [initialBalance, setInitialBalance] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (accountId) {
            async function load() {
                const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId)).limit(1);
                if (acc) {
                    setName(acc.name);
                    setType(acc.type as AccountType);
                    setInitialBalance(acc.initialBalance.toString());
                    setIsActive(acc.isActive);
                }
            }
            load();
        }
    }, [accountId]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Account name is required');
            return;
        }

        // Check for duplicate account name
        const existing = await db.select().from(schema.accounts);
        const duplicate = existing.find(
            a => a.name.toLowerCase() === name.trim().toLowerCase() && a.id !== accountId
        );
        if (duplicate) {
            Alert.alert('Duplicate Name', `An account named "${name.trim()}" already exists. Please choose a different name.`);
            return;
        }

        const balance = parseFloat(initialBalance) || 0;
        const now = new Date().toISOString();

        try {
            if (accountId) {
                await db.update(schema.accounts).set({
                    name: name.trim(),
                    type,
                    initialBalance: balance,
                    isActive,
                }).where(eq(schema.accounts.id, accountId));
            } else {
                await db.insert(schema.accounts).values({
                    name: name.trim(),
                    iconName: '🏦', // default icon
                    type,
                    initialBalance: balance,
                    isActive,
                    createdAt: now,
                });
            }
            navigation.goBack();
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
                        await db.delete(schema.accounts).where(eq(schema.accounts.id, accountId));
                        navigation.goBack();
                    } catch (error) {
                        console.error('Delete failed:', error);
                        Alert.alert('Error', 'Cannot delete account. Ensure no transactions are linked to it.');
                    }
                },
            },
        ]);
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
                <Text style={[styles.title, { color: theme.text }]}>
                    {accountId ? 'Edit Account' : 'New Account'}
                </Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Account Name</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Checking, Wallet"
                        placeholderTextColor={theme.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Type</Text>
                    <View style={styles.typeContainer}>
                        {Object.values(AccountType).map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setType(t as AccountType)}
                                style={[
                                    styles.typeBtn,
                                    type === t && { backgroundColor: colors.primary },
                                ]}>
                                <Text style={[styles.typeText, type === t && { color: 'white' }]}>
                                    {t.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {!accountId && (
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
                    <Text style={[styles.label, { color: theme.text }]}>Active Account</Text>
                    <TouchableOpacity
                        style={[styles.switch, isActive ? { backgroundColor: colors.primary } : { backgroundColor: theme.border }]}
                        onPress={() => setIsActive(!isActive)}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{isActive ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                </View>

                {accountId && (
                    <TouchableOpacity
                        style={[styles.deleteBtn, { borderColor: colors.expense }]}
                        onPress={handleDelete}
                    >
                        <Text style={{ color: colors.expense, fontWeight: 'bold' }}>Delete Account</Text>
                    </TouchableOpacity>
                )}
            </View>
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
        backgroundColor: '#eee',
    },
    typeText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
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
