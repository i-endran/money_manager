import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';

export const CategoryManagementScreen = ({ navigation }: any) => {
    const { theme, colors } = useAppTheme();
    const [categories, setCategories] = useState<schema.Category[]>([]);

    useFocusEffect(
        useCallback(() => {
            async function load() {
                const list = await db.select().from(schema.categories);
                setCategories(list);
            }
            load();
        }, [])
    );

    const getFlattenedCategories = () => {
        const result: schema.Category[] = [];
        const rootCategories = categories.filter(c => c.level === 1);

        const addChildren = (parentId: number) => {
            const children = categories.filter(c => c.parentId === parentId);
            for (const child of children) {
                result.push(child);
                addChildren(child.id);
            }
        };

        for (const root of rootCategories) {
            result.push(root);
            addChildren(root.id);
        }
        return result;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: colors.primary }}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Categories</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CategoryForm')}>
                    <Text style={{ color: colors.primary }}>Add</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={getFlattenedCategories()}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.item,
                            {
                                borderBottomColor: theme.border,
                                backgroundColor: theme.surface,
                                paddingLeft: 16 + (item.level - 1) * 24
                            }
                        ]}
                        onPress={() => navigation.navigate('CategoryForm', { categoryId: item.id })}
                    >
                        <Text style={[styles.name, { color: theme.text }]}>
                            {item.level > 1 ? '↳ ' : ''}{item.iconName} {item.name}
                        </Text>
                        <Text style={[styles.type, { color: theme.textSecondary }]}>{item.type}</Text>
                    </TouchableOpacity>
                )}
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
    type: { fontSize: 12, textTransform: 'uppercase' },
});
