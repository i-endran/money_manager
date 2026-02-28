import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
} from 'react-native';
import { useAppTheme } from '../../../core/theme';
import { Category } from '../../../database/schema';

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
                                    <Text style={{ color: colors.primary }}>← Back</Text>
                                </TouchableOpacity>
                            )}
                            <Text style={[styles.title, { color: theme.text }]}>
                                {parentCategory ? parentCategory.name : 'Select Category'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={{ color: colors.primary }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={visibleCategories}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => {
                                    // If it has children (simplified check for M1, just check if it's level 1 or 2)
                                    const hasChildren = categories.some(c => c.parentId === item.id);
                                    if (hasChildren) {
                                        setCurrentParentId(item.id);
                                    } else {
                                        onSelect(item);
                                        onClose();
                                    }
                                }}>
                                <Text style={[styles.itemText, { color: theme.text }]}>
                                    {item.name}
                                </Text>
                                {categories.some(c => c.parentId === item.id) && (
                                    <Text style={{ color: theme.textSecondary }}>›</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => (
                            <View style={[styles.separator, { backgroundColor: theme.border }]} />
                        )}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={{ color: theme.textSecondary }}>No sub-categories</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        onSelect(parentCategory!);
                                        onClose();
                                    }}
                                    style={styles.selectParentBtn}
                                >
                                    <Text style={{ color: colors.primary }}>Select "{parentCategory?.name}"</Text>
                                </TouchableOpacity>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        maxHeight: '80%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    item: {
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemText: {
        fontSize: 16,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
    },
    empty: {
        padding: 24,
        alignItems: 'center',
    },
    selectParentBtn: {
        marginTop: 16,
    }
});
