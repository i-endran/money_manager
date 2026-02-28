import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CategoryType } from '../../../core/constants';

type CategoryWithChildren = schema.Category & { children: CategoryWithChildren[] };

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

    const sections = useMemo(() => {
        const buildTree = (parentId: number | null, type: string): CategoryWithChildren[] => {
            return categories
                .filter(c => c.parentId === parentId && c.type === type)
                .sort((a, b) => {
                    const aName = (a.iconName ? a.iconName + ' ' : '') + a.name;
                    const bName = (b.iconName ? b.iconName + ' ' : '') + b.name;
                    return aName.localeCompare(bName);
                })
                .map(c => ({
                    ...c,
                    children: buildTree(c.id, type)
                }));
        };

        const expenses = buildTree(null, CategoryType.EXPENSE);
        const incomes = buildTree(null, CategoryType.INCOME);

        const result = [];
        result.push({ title: 'EXPENSE CATEGORIES', type: CategoryType.EXPENSE, data: expenses });
        result.push({ title: 'INCOME CATEGORIES', type: CategoryType.INCOME, data: incomes });

        return result;
    }, [categories]);

    const renderNode = (item: CategoryWithChildren, isFirst: boolean, isLast: boolean) => {
        const renderChild = (child: CategoryWithChildren, isChildLast: boolean) => {
            return (
                <View key={child.id} style={styles.childRowContainer}>
                    <TouchableOpacity
                        style={[styles.childRow, { paddingLeft: 16 + (child.level - 1) * 20 }]}
                        activeOpacity={0.6}
                        onPress={() => navigation.navigate('CategoryForm', { categoryId: child.id })}
                    >
                        <Text style={[styles.childName, { color: theme.textSecondary }]}>
                            {child.level > 1 ? '↳ ' : ''}{child.iconName ? `${child.iconName} ` : ''}{child.name}
                        </Text>
                        <View style={styles.rootActions}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: child.isActive ? '#34C759' : '#AEAEB2', marginRight: child.level < 3 ? 12 : 0 }
                            ]} />
                            {child.level < 3 && (
                                <TouchableOpacity
                                    style={[styles.addReserveBtn, { backgroundColor: theme.background }]}
                                    onPress={() => navigation.navigate('CategoryForm', { initialType: child.type, parentId: child.id })}
                                >
                                    <Icon name="add" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableOpacity>
                    {child.children.length > 0 && (
                        <View style={styles.childrenContainer}>
                            {child.children.map((grandchild, idx) =>
                                renderChild(grandchild, idx === child.children.length - 1)
                            )}
                        </View>
                    )}
                </View>
            );
        };

        return (
            <View style={[
                styles.itemContainer,
                {
                    backgroundColor: theme.surface,
                    borderTopLeftRadius: isFirst ? 16 : 0,
                    borderTopRightRadius: isFirst ? 16 : 0,
                    borderBottomLeftRadius: isLast ? 16 : 0,
                    borderBottomRightRadius: isLast ? 16 : 0,
                },
                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
            ]}>
                <TouchableOpacity
                    style={styles.rootRow}
                    onPress={() => navigation.navigate('CategoryForm', { categoryId: item.id })}
                    activeOpacity={0.6}
                >
                    <View style={styles.rootInfo}>
                        <Text style={[styles.name, { color: theme.text }]}>
                            {item.iconName ? `${item.iconName} ` : ''}{item.name}
                        </Text>
                    </View>
                    <View style={styles.rootActions}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: item.isActive ? '#34C759' : '#AEAEB2', marginRight: 12 }
                        ]} />
                        <TouchableOpacity
                            style={[styles.addReserveBtn, { backgroundColor: theme.background }]}
                            onPress={() => navigation.navigate('CategoryForm', { initialType: item.type, parentId: item.id })}
                        >
                            <Icon name="add" size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {item.children.length > 0 && (
                    <View style={styles.childrenContainer}>
                        {item.children.map((child, idx) =>
                            renderChild(child, idx === item.children.length - 1)
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Text style={{ color: colors.primary, fontSize: 16 }}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Categories</Text>
                <View style={styles.headerBtn} />
            </View>

            <SectionList
                sections={sections}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index, section }) =>
                    renderNode(item as CategoryWithChildren, index === 0, index === section.data.length - 1)
                }
                renderSectionHeader={({ section: { title, type } }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('CategoryForm', { initialType: type })}>
                            <Icon name="add-circle" size={22} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.textSecondary }}>No categories found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: { padding: 4, minWidth: 60, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        paddingTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    itemContainer: {
        overflow: 'hidden',
    },
    rootRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    rootInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: { fontSize: 16, fontWeight: '500' },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    rootActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addReserveBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    childrenContainer: {
        paddingBottom: 8,
    },
    childRowContainer: {
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    childRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingRight: 16,
    },
    childName: {
        fontSize: 15,
        marginLeft: 8,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
});
