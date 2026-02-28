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

// Helper to fix Android emoji baseline shift
function splitEmoji(name: string): { emoji: string; text: string } {
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
    const match = name.match(emojiRegex);
    if (match) {
        return {
            emoji: match[0],
            text: name.slice(match[0].length).trim(),
        };
    }
    return { emoji: '', text: name };
}

const CategoryLabel = ({ name, textStyle }: { name: string; textStyle?: any }) => {
    const { emoji, text } = splitEmoji(name);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!!emoji && <Text style={[textStyle, { marginRight: 6 }]}>{emoji}</Text>}
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
                                    <Text style={{ color: colors.primary, fontSize: 16 }}>← Back</Text>
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
                                <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
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
                                        <Text style={{ color: colors.primary, fontWeight: '600', marginRight: 4, fontSize: 16 }}>✓ Select</Text>
                                        <CategoryLabel name={parentCategory.name} textStyle={{ color: colors.primary, fontWeight: '600', fontSize: 16 }} />
                                    </View>
                                </TouchableOpacity>
                            ) : null
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => {
                                    const hasChildren = categories.some(c => c.parentId === item.id);
                                    if (hasChildren) {
                                        setCurrentParentId(item.id);
                                    } else {
                                        onSelect(item);
                                        onClose();
                                    }
                                }}>
                                <CategoryLabel name={item.name} textStyle={[styles.itemText, { color: theme.text }]} />
                                {categories.some(c => c.parentId === item.id) && (
                                    <Text style={{ color: theme.textSecondary, fontSize: 18 }}>›</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => (
                            <View style={[styles.separator, { backgroundColor: theme.border }]} />
                        )}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={{ color: theme.textSecondary }}>No sub-categories</Text>
                                {parentCategory && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            onSelect(parentCategory);
                                            onClose();
                                        }}
                                        style={styles.selectParentBtn}
                                    >
                                        <Text style={{ color: colors.primary }}>Select "{parentCategory.name}"</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        maxHeight: '80%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        elevation: 0,
        shadowOpacity: 0,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
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
        padding: 4,
    },
    cancelBtn: {
        padding: 4,
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
    },
    selectParentItem: {
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
