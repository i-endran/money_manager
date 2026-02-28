import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';

export const AccountManagementScreen = ({ navigation }: any) => {
    const { theme, colors } = useAppTheme();
    const [accounts, setAccounts] = useState<schema.Account[]>([]);

    useFocusEffect(
        useCallback(() => {
            async function load() {
                const list = await db.select().from(schema.accounts);
                setAccounts(list);
            }
            load();
        }, [])
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: colors.primary }}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Accounts</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AccountForm')}>
                    <Text style={{ color: colors.primary }}>Add</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={accounts}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => {
                    const isFirst = index === 0;
                    const isLast = index === accounts.length - 1;
                    return (
                        <>
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
                                onPress={() => navigation.navigate('AccountForm', { accountId: item.id })}
                            >
                                <View>
                                    <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                                    <Text style={[styles.type, { color: theme.textSecondary }]}>{item.type}</Text>
                                </View>
                                <Text style={{ color: theme.textSecondary }}>
                                    {item.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </TouchableOpacity>
                            {!isLast && (
                                <View style={{ backgroundColor: theme.surface }}>
                                    <View style={[styles.separator, { backgroundColor: theme.border }]} />
                                </View>
                            )}
                        </>
                    );
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    name: { fontSize: 16, fontWeight: '500' },
    type: { fontSize: 12, marginTop: 2, textTransform: 'uppercase' },
});
