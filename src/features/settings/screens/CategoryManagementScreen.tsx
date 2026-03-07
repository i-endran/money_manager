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
import {
    LedgerRowDensityPreset,
    LedgerSummaryCardMetricsPreset,
    LedgerTextHierarchyPreset,
    Layout,
    Spacing,
    Typography,
    FormHeaderPreset,
    useAppTheme
} from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CategoryType } from '../../../core/constants';

type CategoryWithChildren = schema.Category & { children: CategoryWithChildren[] };

export const CategoryManagementScreen = ({ navigation }: any) => {
    const { theme, colors } = useAppTheme();
    const [categories, setCategories] = useState<schema.Category[]>([]);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        [CategoryType.EXPENSE]: true,
        [CategoryType.INCOME]: true,
    });

    const toggleSection = (type: string) => {
        setExpandedSections(prev => ({ ...prev, [type]: !prev[type] }));
    };

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
        result.push({ title: 'Expense Categories', type: CategoryType.EXPENSE, data: expandedSections[CategoryType.EXPENSE] ? expenses : [] });
        result.push({ title: 'Income Categories', type: CategoryType.INCOME, data: expandedSections[CategoryType.INCOME] ? incomes : [] });

        return result;
    }, [categories, expandedSections]);

    const renderNode = (item: CategoryWithChildren, isFirst: boolean, isLast: boolean) => {
        const renderChild = (child: CategoryWithChildren, _isChildLast: boolean) => {
            return (
                <View
                    key={child.id}
                    style={[
                        styles.childRowContainer,
                        { borderLeftWidth: 2, borderLeftColor: theme.primary },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.childRow}
                        activeOpacity={0.6}
                        onPress={() => navigation.navigate('CategoryForm', { categoryId: child.id })}
                    >
                        <Text style={[styles.childName, { color: theme.textSecondary }]}>
                            {child.iconName ? `${child.iconName} ` : ''}{child.name}
                        </Text>
                        <View style={styles.rootActions}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: child.isActive ? theme.statusActive : theme.statusInactive },
                            ]} />
                            {child.level < 3 ? (
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={() => navigation.navigate('CategoryForm', { initialType: child.type, parentId: child.id })}
                                >
                                    <Icon name="add" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.addBtn} />
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

        const itemRadiusStyle = isFirst && isLast
            ? styles.itemRadiusAll
            : isFirst
                ? styles.itemRadiusTop
                : isLast
                    ? styles.itemRadiusBottom
                    : undefined;

        return (
            <View style={[
                styles.itemContainer,
                itemRadiusStyle,
                { backgroundColor: theme.surface },
                !isLast && [styles.itemDivider, { borderBottomColor: theme.border }],
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
                            {
                                backgroundColor: item.isActive ? theme.statusActive : theme.statusInactive,
                            }
                        ]} />
                        <TouchableOpacity
                            style={styles.addBtn}
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
                    <Text style={[styles.headerButtonText, { color: colors.primary }]}>Back</Text>
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
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => toggleSection(type)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionHeaderContent}>
                            <Icon
                                name={expandedSections[type] ? 'expand-more' : 'chevron-right'}
                                size={20}
                                color={theme.textSecondary}
                                style={styles.sectionChevronIcon}
                            />
                            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
                        </View>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); navigation.navigate('CategoryForm', { initialType: type }); }}>
                            <Icon name="add-circle" size={22} color={colors.primary} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    categories.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: theme.textSecondary }}>No categories found</Text>
                        </View>
                    ) : null
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
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
        paddingVertical: LedgerSummaryCardMetricsPreset.paddingVertical,
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: { padding: Spacing.xs, minWidth: 60, alignItems: 'center' },
    headerButtonText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
    },
    headerTitle: { ...FormHeaderPreset.title },
    listContent: {
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
        paddingBottom: Spacing.xxxxxl,
        paddingTop: LedgerRowDensityPreset.paddingVertical,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.xs,
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
        paddingVertical: Spacing.xs,
    },
    sectionHeaderContent: { flexDirection: 'row', alignItems: 'center' },
    sectionChevronIcon: { marginRight: Spacing.xs },
    sectionTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
    },
    itemContainer: {
        overflow: 'hidden',
    },
    itemRadiusTop: {
        borderTopLeftRadius: LedgerSummaryCardMetricsPreset.cardRadius,
        borderTopRightRadius: LedgerSummaryCardMetricsPreset.cardRadius,
    },
    itemRadiusBottom: {
        borderBottomLeftRadius: LedgerSummaryCardMetricsPreset.cardRadius,
        borderBottomRightRadius: LedgerSummaryCardMetricsPreset.cardRadius,
    },
    itemRadiusAll: {
        borderRadius: LedgerSummaryCardMetricsPreset.cardRadius,
    },
    itemDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rootRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: LedgerRowDensityPreset.paddingVertical,
        paddingHorizontal: LedgerRowDensityPreset.paddingHorizontal,
    },
    rootInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: { ...LedgerTextHierarchyPreset.primary },
    statusDot: {
        width: Spacing.md,
        height: Spacing.md,
        borderRadius: Spacing.md / 2,
    },
    rootActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    addBtn: {
        width: Spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    childrenContainer: {
        paddingBottom: LedgerRowDensityPreset.paddingVertical,
    },
    childRowContainer: {
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    childRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: LedgerRowDensityPreset.paddingVertical,
        paddingLeft: Spacing.xl,
        paddingRight: LedgerRowDensityPreset.paddingHorizontal,
    },
    childName: {
        ...LedgerTextHierarchyPreset.secondary,
    },
    emptyContainer: {
        padding: Spacing.xxxxxl,
        alignItems: 'center',
    },
});
