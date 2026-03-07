import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
} from 'react-native';
import { Colors, Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';
import { Category } from '../../../database/schema';
import { splitEmoji } from '../../../core/utils';

const CategoryLabel = ({ name, textStyle }: { name: string; textStyle?: any }) => {
    const { emoji, text } = splitEmoji(name, '');
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!!emoji && <Text style={[textStyle, { marginRight: Spacing.sm }]}>{emoji}</Text>}
            <Text style={textStyle}>{text}</Text>
        </View>
    );
};

interface CategoryPickerProps {
    visible: boolean;
    onClose: () => void;
    categories: Category[];
    onSelect: (category: Category) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
    visible,
    onClose,
    categories,
    onSelect,
}) => {
    const { theme, colors } = useAppTheme();
    const [currentParentId, setCurrentParentId] = useState<number | null>(null);

    // Precompute parent IDs for sub-category indicators
    const parentIdSet = useMemo(() => {
        return new Set(categories.map(c => c.parentId).filter(id => id !== null));
    }, [categories]);

    // Filter categories by parent
    const visibleCategories = useMemo(() => {
        return categories.filter(c => c.parentId === currentParentId);
    }, [categories, currentParentId]);

    const parentCategory = useMemo(() => {
        if (currentParentId === null) return null;
        return categories.find(c => c.id === currentParentId);
    }, [categories, currentParentId]);

    const handleBack = () => {
        if (parentCategory) {
            setCurrentParentId(parentCategory.parentId);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: theme.surface }]}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            {currentParentId !== null && (
                                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                                    <Text style={[styles.navText, { color: colors.primary }]}>← Back</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.headerCenter}>
                            {parentCategory ? (
                                <CategoryLabel
                                    name={parentCategory.name}
                                    textStyle={[styles.title, { color: theme.text }]}
                                />
                            ) : (
                                <Text style={[styles.title, { color: theme.text }]}>Select Category</Text>
                            )}
                        </View>

                        <View style={styles.headerRight}>
                            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                                <Text style={[styles.navText, { color: colors.primary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        data={visibleCategories}
                        keyExtractor={item => item.id.toString()}
                        ListHeaderComponent={
                            parentCategory ? (
                                <TouchableOpacity
                                    style={[styles.selectParentItem, { borderBottomColor: theme.border }]}
                                    onPress={() => {
                                        onSelect(parentCategory);
                                        onClose();
                                    }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.selectParentPrefix, { color: colors.primary }]}>✓ Select</Text>
                                        <CategoryLabel
                                            name={parentCategory.name}
                                            textStyle={[styles.selectParentText, { color: colors.primary }]}
                                        />
                                    </View>
                                </TouchableOpacity>
                            ) : null
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => {
                                    const hasChildren = parentIdSet.has(item.id);
                                    if (hasChildren) {
                                        setCurrentParentId(item.id);
                                    } else {
                                        onSelect(item);
                                        onClose();
                                    }
                                }}>
                                <CategoryLabel name={item.name} textStyle={[styles.itemText, { color: theme.text }]} />
                                {categories.some(c => c.parentId === item.id) && (
                                    <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => (
                            <View style={[styles.separator, { backgroundColor: theme.border }]} />
                        )}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No sub-categories</Text>
                                {parentCategory && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            onSelect(parentCategory);
                                            onClose();
                                        }}
                                        style={styles.selectParentBtn}
                                    >
                                        <Text style={[styles.selectParentBtnText, { color: colors.primary }]}>
                                            Select "{parentCategory.name}"
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        }
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: Colors.overlayMedium,
        justifyContent: 'flex-end',
    },
    content: {
        maxHeight: '80%',
        borderTopLeftRadius: Layout.radius.xl,
        borderTopRightRadius: Layout.radius.xl,
        padding: Spacing.xl,
        elevation: 0,
        shadowOpacity: 0,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xxl,
        justifyContent: 'center',
    },
    headerLeft: {
        position: 'absolute',
        left: 0,
        zIndex: 1,
    },
    headerCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        position: 'absolute',
        right: 0,
        zIndex: 1,
    },
    backBtn: {
        padding: Spacing.xs,
    },
    cancelBtn: {
        padding: Spacing.xs,
    },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: 'bold',
    },
    item: {
        paddingVertical: Spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemText: {
        fontSize: Typography.sizes.md,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
    },
    empty: {
        padding: Spacing.xxxl,
        alignItems: 'center',
    },
    selectParentBtn: {
        marginTop: Spacing.xl,
    },
    selectParentItem: {
        paddingVertical: Spacing.lg + Spacing.xxs,
        paddingHorizontal: Spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    navText: {
        fontSize: Typography.sizes.md,
    },
    selectParentText: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
    },
    selectParentPrefix: {
        fontSize: Typography.sizes.md,
        fontWeight: '600',
        marginRight: Spacing.xs,
    },
    chevron: {
        fontSize: Typography.sizes.lg,
    },
    emptyText: {
        fontSize: Typography.sizes.base,
    },
    selectParentBtnText: {
        fontSize: Typography.sizes.base,
    },
});
