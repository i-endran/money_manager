import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { CategoryType } from '../../../core/constants';
import { CategoryPicker } from '../../transaction/components/CategoryPicker';
import { BlurView } from '@react-native-community/blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';

export const CategoryFormScreen = ({ navigation, route }: any) => {
    const { theme, colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const categoryId = route.params?.categoryId;

    const [name, setName] = useState('');
    const [type, setType] = useState<CategoryType>(CategoryType.EXPENSE);
    const [_parentId, setParentId] = useState<number | null>(null);
    const [isActive, setIsActive] = useState(true);

    const [parentCategory, setParentCategory] = useState<schema.Category | null>(null);
    const [categories, setCategories] = useState<schema.Category[]>([]);
    const [pickerVisible, setPickerVisible] = useState(false);

    useEffect(() => {
        async function load() {
            const list = await db.select().from(schema.categories).where(eq(schema.categories.isActive, true));
            setCategories(list);

            if (categoryId) {
                const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.id, categoryId)).limit(1);
                if (cat) {
                    setName((cat.iconName ? cat.iconName + ' ' : '') + cat.name);
                    setType(cat.type as CategoryType);
                    setParentId(cat.parentId);
                    setIsActive(cat.isActive);
                    if (cat.parentId) {
                        setParentCategory(list.find(c => c.id === cat.parentId) || null);
                    }
                }
            } else {
                if (route.params?.initialType) {
                    setType(route.params.initialType as CategoryType);
                }
                if (route.params?.parentId) {
                    setParentId(route.params.parentId);
                    const parent = list.find(c => c.id === route.params.parentId) || null;
                    setParentCategory(parent);
                }
            }
        }
        load();
    }, [categoryId, route.params]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Category name is required');
            return;
        }

        let level = 1;
        if (parentCategory) {
            level = parentCategory.level + 1;
            if (level > 3) {
                Alert.alert('Error', 'Maximum category depth is 3 levels');
                return;
            }
        }

        try {
            if (categoryId) {
                await db.update(schema.categories).set({
                    name: name.trim(),
                    iconName: '',
                    type,
                    parentId: parentCategory?.id || null,
                    level,
                    isActive,
                }).where(eq(schema.categories.id, categoryId));
            } else {
                await db.insert(schema.categories).values({
                    name: name.trim(),
                    iconName: '',
                    type,
                    parentId: parentCategory?.id || null,
                    level,
                    isActive,
                });
            }
            navigation.goBack();
        } catch (error) {
            console.error('Failed to save category:', error);
            Alert.alert('Error', 'Failed to save category');
        }
    };

    const handleDelete = async () => {
        if (!categoryId) return;

        Alert.alert('Delete Category', 'Are you sure you want to delete this category?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        // Check for child categories
                        const children = await db.select().from(schema.categories).where(eq(schema.categories.parentId, categoryId)).limit(1);
                        if (children.length > 0) {
                            Alert.alert('Error', 'Cannot delete. Please delete or reassign sub-categories first.');
                            return;
                        }
                        await db.delete(schema.categories).where(eq(schema.categories.id, categoryId));
                        navigation.goBack();
                    } catch (error) {
                        console.error('Delete failed:', error);
                        Alert.alert('Error', 'Cannot delete category. Ensure no transactions are linked to it.');
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView
            edges={['left', 'right', 'bottom']}
            style={[styles.container, { backgroundColor: isDark ? Colors.overlayMedium : Colors.lightGlass }]}
        >
            <BlurView
                style={StyleSheet.absoluteFillObject}
                blurType={isDark ? 'dark' : 'light'}
                blurAmount={10}
            />
            <View style={[styles.header, { borderBottomColor: isLiquidGlassSupported ? 'transparent' : theme.border, paddingTop: insets.top + 8 }]}>
                {isLiquidGlassSupported && (
                    <LiquidGlassView
                        style={StyleSheet.absoluteFill}
                        effect="clear"
                        interactive
                        colorScheme={isDark ? 'dark' : 'light'}
                    />
                )}
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: colors.primary }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>
                    {categoryId ? (name ? `Edit ${name}` : 'Edit Category') : 'New Category'}
                </Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Name (Include Emoji if desired)</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., 🍔 Food"
                        placeholderTextColor={theme.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Type</Text>
                    <View style={styles.typeContainer}>
                        {[CategoryType.EXPENSE, CategoryType.INCOME].map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => { setType(t); setParentCategory(null); }}
                                style={[
                                     styles.typeBtn,
                                     { backgroundColor: theme.weekendTint },
                                     type === t && { backgroundColor: t === CategoryType.EXPENSE ? colors.expense : colors.income },
                                 ]}>
                                <Text style={[styles.typeText, { color: type === t ? Colors.white : theme.textSecondary }]}>
                                    {t.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.pickerField, { borderBottomColor: theme.border }]}
                    onPress={() => setPickerVisible(true)}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Parent Category</Text>
                    <Text style={[styles.pickerValue, { color: theme.text }]}>
                        {parentCategory ? `${parentCategory.iconName} ${parentCategory.name}` : 'None (Root Level)'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.switchGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Active Category</Text>
                    <TouchableOpacity
                        style={[styles.switch, isActive ? { backgroundColor: colors.primary } : { backgroundColor: theme.border }]}
                        onPress={() => setIsActive(!isActive)}>
                        <Text style={styles.switchText}>{isActive ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                </View>

                {categoryId && (
                    <TouchableOpacity
                        style={[styles.deleteBtn, { borderColor: colors.expense }]}
                        onPress={handleDelete}
                    >
                        <Text style={[styles.deleteText, { color: colors.expense }]}>Delete Category</Text>
                    </TouchableOpacity>
                )}
            </View>

            <CategoryPicker
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                categories={categories.filter(c => c.type === type && c.level < 3 && c.id !== categoryId)}
                onSelect={(cat) => {
                    setParentCategory(cat);
                    setPickerVisible(false);
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
        padding: Spacing.xl,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        overflow: 'hidden',
    },
    title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
    saveText: { fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.md },
    content: { padding: Spacing.xl },
    inputGroup: { marginBottom: Spacing.xxxl },
    label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, marginBottom: Spacing.md },
    input: {
        fontSize: Typography.sizes.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    typeContainer: { flexDirection: 'row', gap: Spacing.md },
    typeBtn: {
        flex: 1,
        paddingVertical: Spacing.md + Spacing.xxs,
        borderRadius: Layout.radius.sm,
        alignItems: 'center',
    },
    typeText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
    pickerField: {
        paddingVertical: Spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginBottom: Spacing.xxxl,
    },
    pickerValue: { fontSize: Typography.sizes.md, marginTop: Spacing.xs },
    switchGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switch: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: Layout.radius.lg,
    },
    switchText: { color: Colors.white, fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
    deleteBtn: {
        marginTop: Spacing.xxxxxl,
        paddingVertical: Spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: Layout.radius.sm,
    },
    deleteText: { fontWeight: Typography.weights.bold, fontSize: Typography.sizes.md },
});
