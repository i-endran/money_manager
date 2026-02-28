import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { db } from '../../../database';
import * as schema from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { CategoryType } from '../../../core/constants';
import { CategoryPicker } from '../../transaction/components/CategoryPicker';
import { BlurView } from '@react-native-community/blur';

export const CategoryFormScreen = ({ navigation, route }: any) => {
    const { theme, colors, isDark } = useAppTheme();
    const categoryId = route.params?.categoryId;

    const [name, setName] = useState('');
    const [iconName, setIconName] = useState('📁');
    const [type, setType] = useState<CategoryType>(CategoryType.EXPENSE);
    const [parentId, setParentId] = useState<number | null>(null);
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
                    setName(cat.name);
                    setIconName(cat.iconName || '📁');
                    setType(cat.type as CategoryType);
                    setParentId(cat.parentId);
                    setIsActive(cat.isActive);
                    if (cat.parentId) {
                        setParentCategory(list.find(c => c.id === cat.parentId) || null);
                    }
                }
            }
        }
        load();
    }, [categoryId]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Category name is required');
            return;
        }

        const now = new Date().toISOString();
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
                    name,
                    iconName,
                    type,
                    parentId: parentCategory?.id || null,
                    level,
                    isActive,
                }).where(eq(schema.categories.id, categoryId));
            } else {
                await db.insert(schema.categories).values({
                    name,
                    iconName,
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
                    {categoryId ? 'Edit Category' : 'New Category'}
                </Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 0.3, marginRight: 16 }]}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Emoji</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderBottomColor: theme.border, textAlign: 'center' }]}
                            value={iconName}
                            onChangeText={setIconName}
                            maxLength={2}
                        />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g., Food"
                            placeholderTextColor={theme.textSecondary}
                        />
                    </View>
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
                                    type === t && { backgroundColor: t === CategoryType.EXPENSE ? colors.expense : colors.income },
                                ]}>
                                <Text style={[styles.typeText, type === t && { color: 'white' }]}>
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
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{isActive ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                </View>

                {categoryId && (
                    <TouchableOpacity
                        style={[styles.deleteBtn, { borderColor: colors.expense }]}
                        onPress={handleDelete}
                    >
                        <Text style={{ color: colors.expense, fontWeight: 'bold' }}>Delete Category</Text>
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
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    saveText: { fontWeight: 'bold', fontSize: 16 },
    content: { padding: 16 },
    row: { flexDirection: 'row' },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
    input: {
        fontSize: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    typeContainer: { flexDirection: 'row', gap: 8 },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#eee',
        alignItems: 'center',
    },
    typeText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
    pickerField: {
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginBottom: 24,
    },
    pickerValue: { fontSize: 16, marginTop: 4 },
    switchGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
