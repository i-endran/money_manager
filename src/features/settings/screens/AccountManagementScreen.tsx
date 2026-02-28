import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';

export const AccountManagementScreen = ({ navigation }: any) => {
    const { theme, colors } = useAppTheme();
    const [accounts, setAccounts] = useState<schema.Account[]>([]);

    useEffect(() => {
        async function load() {
            const list = await db.select().from(schema.accounts);
            setAccounts(list);
        }
        load();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: colors.primary }}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Accounts</Text>
                <TouchableOpacity onPress={() => Alert.alert('Note', 'Add Account flow coming in M2')}>
                    <Text style={{ color: colors.primary }}>Add</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={accounts}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={[styles.item, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                        <View>
                            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                            <Text style={[styles.type, { color: theme.textSecondary }]}>{item.type}</Text>
                        </View>
                        <Text style={{ color: theme.textSecondary }}>
                            {item.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

// Added Alert for simplicity in placeholder
import { Alert } from 'react-native';

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    name: { fontSize: 16, fontWeight: '500' },
    type: { fontSize: 12, marginTop: 2, textTransform: 'uppercase' },
});
