import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { TransactionType } from '../../../core/constants';
import { AccountPicker } from '../components/AccountPicker';
import { CategoryPicker } from '../components/CategoryPicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLedgerStore } from '../../../stores/ledgerStore';
import { eq, or } from 'drizzle-orm';
import { format } from 'date-fns';
import { BlurView } from '@react-native-community/blur';

export const TransactionFormScreen = ({ navigation, route }: any) => {
    const { theme, colors, isDark } = useAppTheme();
    const { refresh } = useLedgerStore();
    const transactionId = route.params?.transactionId;
    const initialDateStr = route.params?.selectedDate;

    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(initialDateStr ? new Date(initialDateStr) : new Date());

    const [selectedAccount, setSelectedAccount] = useState<schema.Account | null>(null);
    const [toAccount, setToAccount] = useState<schema.Account | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<schema.Category | null>(null);

    const [accounts, setAccounts] = useState<schema.Account[]>([]);
    const [categories, setCategories] = useState<schema.Category[]>([]);

    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);

    const [accPickerVisible, setAccPickerVisible] = useState(false);
    const [toAccPickerVisible, setToAccPickerVisible] = useState(false);
    const [catPickerVisible, setCatPickerVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);

    useEffect(() => {
        async function loadData() {
            const accList = await db.select().from(schema.accounts).where(eq(schema.accounts.isActive, true));
            const catList = await db.select().from(schema.categories).where(eq(schema.categories.isActive, true));
            setAccounts(accList);
            setCategories(catList);

            if (accList.length > 0) setSelectedAccount(accList[0]);

            if (transactionId) {
                // Load existing transaction for edit
                const [txn] = await db
                    .select()
                    .from(schema.transactions)
                    .where(eq(schema.transactions.id, transactionId))
                    .limit(1);

                if (txn) {
                    setType(txn.type as TransactionType);
                    setAmount(txn.amount.toString());
                    setNote(txn.note);
                    setDescription(txn.description || '');
                    setDate(new Date(txn.date));
                    setSelectedAccount(accList.find(a => a.id === txn.accountId) || null);
                    setSelectedCategory(catList.find(c => c.id === txn.categoryId) || null);
                    setCreatedAt(txn.createdAt);
                    setUpdatedAt(txn.updatedAt);
                    if (txn.toAccountId) {
                        setToAccount(accList.find(a => a.id === txn.toAccountId) || null);
                    }
                }
            }
        }
        loadData();
    }, [transactionId]);

    const handleTypeChange = (newType: TransactionType) => {
        if (newType !== type) {
            setType(newType);
            setSelectedCategory(null);
        }
    };

    const handleSave = async (addAnother = false) => {
        if (!amount || !selectedAccount || (!selectedCategory && type !== TransactionType.TRANSFER)) {
            if (type !== TransactionType.TRANSFER) {
                const availableCats = categories.filter(c =>
                    type === TransactionType.EXPENSE ? c.type !== 'income' : c.type !== 'expense'
                );
                if (availableCats.length === 0) {
                    Alert.alert('Missing Categories', `Please add a category for ${type.toUpperCase()} in Settings first.`);
                    return;
                }
            }
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const now = new Date().toISOString();
        const dateStr = date.toISOString();
        const numericAmount = parseFloat(amount);

        try {
            if (type === TransactionType.TRANSFER) {
                if (!toAccount) {
                    Alert.alert('Error', 'Please select a destination account for the transfer');
                    return;
                }

                await db.transaction(async (tx) => {
                    // 1. Create Debit entry (From Account)
                    const [res1] = await tx.insert(schema.transactions).values({
                        amount: numericAmount,
                        type: TransactionType.TRANSFER,
                        accountId: selectedAccount.id,
                        toAccountId: toAccount.id,
                        categoryId: 0,
                        note: note,
                        description: description,
                        date: dateStr,
                        createdAt: now,
                        updatedAt: now,
                    }).returning({ insertedId: schema.transactions.id });

                    // 2. Create Credit entry (To Account)
                    const [res2] = await tx.insert(schema.transactions).values({
                        amount: numericAmount,
                        type: TransactionType.TRANSFER,
                        accountId: toAccount.id,
                        toAccountId: selectedAccount.id,
                        categoryId: 0,
                        note: note,
                        description: description,
                        date: dateStr,
                        linkedTransactionId: res1.insertedId,
                        createdAt: now,
                        updatedAt: now,
                    }).returning({ insertedId: schema.transactions.id });

                    // 3. Link back the first one
                    await tx
                        .update(schema.transactions)
                        .set({ linkedTransactionId: res2.insertedId })
                        .where(eq(schema.transactions.id, res1.insertedId));
                });

            } else {
                if (transactionId) {
                    await db
                        .update(schema.transactions)
                        .set({
                            amount: numericAmount,
                            type,
                            accountId: selectedAccount.id,
                            categoryId: selectedCategory?.id || 0,
                            note,
                            description,
                            date: dateStr,
                            updatedAt: now,
                        })
                        .where(eq(schema.transactions.id, transactionId));
                } else {
                    await db.insert(schema.transactions).values({
                        amount: numericAmount,
                        type,
                        accountId: selectedAccount.id,
                        categoryId: selectedCategory?.id || 0,
                        note,
                        description,
                        date: dateStr,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            }

            refresh();
            if (addAnother) {
                setAmount('');
                setNote('');
                setDescription('');
                Alert.alert('Saved', 'Transaction recorded successfully');
            } else {
                navigation.goBack();
            }
        } catch (error) {
            console.error('Save failed:', error);
            Alert.alert('Error', 'Failed to save transaction');
        }
    };

    const handleDelete = async () => {
        if (!transactionId) return;

        Alert.alert('Delete', 'Are you sure you want to delete this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await db.transaction(async (tx) => {
                            const [txn] = await tx
                                .select()
                                .from(schema.transactions)
                                .where(eq(schema.transactions.id, transactionId))
                                .limit(1);

                            if (txn?.linkedTransactionId) {
                                await tx
                                    .delete(schema.transactions)
                                    .where(
                                        or(
                                            eq(schema.transactions.id, transactionId),
                                            eq(schema.transactions.id, txn.linkedTransactionId),
                                        ),
                                    );
                            } else {
                                await tx
                                    .delete(schema.transactions)
                                    .where(eq(schema.transactions.id, transactionId));
                            }
                        });

                        refresh();
                        navigation.goBack();
                    } catch (error) {
                        console.error('Delete failed:', error);
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
                    {transactionId ? 'Edit Transaction' : 'New Transaction'}
                </Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Type Selector — Color-coded */}
                <View style={[styles.segmentContainer, { backgroundColor: isDark ? theme.surface : '#ECEDF0' }]}>
                    {[
                        { type: TransactionType.INCOME, label: 'INCOME', color: colors.income },
                        { type: TransactionType.EXPENSE, label: 'EXPENSE', color: colors.expense },
                        { type: TransactionType.TRANSFER, label: 'TRANSFER', color: colors.transfer },
                    ].map(({ type: t, label, color }) => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => handleTypeChange(t)}
                            style={[
                                styles.segment,
                                type === t && { backgroundColor: color },
                            ]}>
                            <Text style={[styles.segmentText, { color: type === t ? '#FFFFFF' : theme.textSecondary }]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Amount */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.currencySymbol, { color: theme.textSecondary }]}>₹</Text>
                        <TextInput
                            style={[styles.amountInput, { color: theme.text }]}
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={(text) => {
                                // Allow only numbers and one decimal point
                                let filtered = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                // Limit to 2 decimal places
                                const parts = filtered.split('.');
                                if (parts.length === 2 && parts[1].length > 2) {
                                    filtered = `${parts[0]}.${parts[1].substring(0, 2)}`;
                                }
                                setAmount(filtered);
                            }}
                            placeholder="0.00"
                            placeholderTextColor={theme.textSecondary}
                            autoFocus
                        />
                    </View>
                </View>

                {/* Date Picker */}
                <TouchableOpacity
                    style={[styles.pickerField, { borderBottomColor: theme.border }]}
                    onPress={() => setDatePickerVisible(true)}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
                    <Text style={[styles.pickerValue, { color: theme.text }]}>
                        {format(date, 'dd MMM yyyy (EEEE)')}
                    </Text>
                </TouchableOpacity>

                {/* Account Pickers */}
                <TouchableOpacity
                    style={[styles.pickerField, { borderBottomColor: theme.border }]}
                    onPress={() => setAccPickerVisible(true)}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                        {type === TransactionType.TRANSFER ? 'From Account' : 'Account'}
                    </Text>
                    <Text style={[styles.pickerValue, { color: theme.text }]}>
                        {selectedAccount?.name || 'Select Account'}
                    </Text>
                </TouchableOpacity>

                {type === TransactionType.TRANSFER && (
                    <TouchableOpacity
                        style={[styles.pickerField, { borderBottomColor: theme.border }]}
                        onPress={() => setToAccPickerVisible(true)}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>To Account</Text>
                        <Text style={[styles.pickerValue, { color: theme.text }]}>
                            {toAccount?.name || 'Select Account'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Category Picker */}
                {type !== TransactionType.TRANSFER && (
                    <TouchableOpacity
                        style={[styles.pickerField, { borderBottomColor: theme.border }]}
                        onPress={() => setCatPickerVisible(true)}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                        <Text style={[styles.pickerValue, { color: theme.text }]}>
                            {selectedCategory?.name || 'Select Category'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Note */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Note</Text>
                    <TextInput
                        style={[styles.textInput, { color: theme.text, borderBottomColor: theme.border }]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Short note"
                        placeholderTextColor={theme.textSecondary}
                    />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
                    <TextInput
                        style={[styles.textInput, { color: theme.text, borderBottomColor: theme.border }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Optional details"
                        placeholderTextColor={theme.textSecondary}
                        multiline
                    />
                </View>

                {/* Primary Save Button (Dynamic Color) */}
                <TouchableOpacity
                    style={[
                        styles.primaryBtn,
                        {
                            backgroundColor:
                                type === TransactionType.INCOME ? colors.income
                                    : type === TransactionType.EXPENSE ? colors.expense
                                        : '#8E8E93' // Neutral grey-blue for transfer
                        }
                    ]}
                    onPress={() => handleSave(false)}
                >
                    <Text style={styles.primaryBtnText}>Save</Text>
                </TouchableOpacity>

                {/* Secondary 'Add Another' Button */}
                {!transactionId && (
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => handleSave(true)}
                    >
                        <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Add Another</Text>
                    </TouchableOpacity>
                )}

                {transactionId && createdAt && (
                    <View style={[styles.timestamps, { borderTopColor: theme.border }]}>
                        <Text style={[styles.timestampText, { color: theme.textSecondary }]}>
                            Created: {format(new Date(createdAt), 'dd MMM yyyy, hh:mm a')}
                        </Text>
                        {updatedAt && (
                            <Text style={[styles.timestampText, { color: theme.textSecondary }]}>
                                Modified: {format(new Date(updatedAt), 'dd MMM yyyy, hh:mm a')}
                            </Text>
                        )}
                    </View>
                )}

                {transactionId && (
                    <TouchableOpacity
                        style={[styles.deleteBtn, { borderColor: colors.expense }]}
                        onPress={handleDelete}
                    >
                        <Text style={{ color: colors.expense, fontWeight: 'bold' }}>Delete Transaction</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <AccountPicker
                visible={accPickerVisible}
                onClose={() => setAccPickerVisible(false)}
                accounts={accounts}
                onSelect={setSelectedAccount}
                title="Select Account"
            />
            <AccountPicker
                visible={toAccPickerVisible}
                onClose={() => setToAccPickerVisible(false)}
                accounts={accounts.filter(a => a.id !== selectedAccount?.id)}
                onSelect={setToAccount}
                title="Select Destination Account"
            />
            <CategoryPicker
                visible={catPickerVisible}
                onClose={() => setCatPickerVisible(false)}
                categories={categories.filter(c =>
                    type === TransactionType.EXPENSE ? c.type !== 'income' : c.type !== 'expense'
                )}
                onSelect={setSelectedCategory}
            />
            {datePickerVisible && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                        setDatePickerVisible(false);
                        if (event.type === 'set' && selectedDate) {
                            setDate(selectedDate);
                        }
                    }}
                />
            )}
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
    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 4,
        marginBottom: 24,
    },
    segment: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentText: { fontSize: 12, fontWeight: 'bold' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
    currencySymbol: { fontSize: 32, fontWeight: '300', marginRight: 4 },
    amountInput: { fontSize: 40, fontWeight: 'bold', flex: 1 },
    pickerField: {
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginBottom: 20,
    },
    pickerValue: { fontSize: 16, marginTop: 4 },
    textInput: {
        fontSize: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    primaryBtn: {
        marginTop: 10,
        marginBottom: 10,
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 8,
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryBtn: {
        marginBottom: 40,
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    secondaryBtnText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    deleteBtn: {
        marginTop: 20,
        marginBottom: 80,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
    },
    timestamps: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    timestampText: {
        fontSize: 12,
        marginBottom: 4,
    },
});
