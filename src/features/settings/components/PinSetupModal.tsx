import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';

export type PinSetupMode = 'setup' | 'verify';

interface Props {
    visible: boolean;
    mode: PinSetupMode;
    title: string;
    onSuccess: (pin: string) => void;
    onCancel: () => void;
    validatePin?: (pin: string) => boolean;
}

const NUMPAD = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'DEL'],
];

export const PinSetupModal: React.FC<Props> = ({
    visible,
    mode,
    title,
    onSuccess,
    onCancel,
    validatePin,
}) => {
    const { theme, colors } = useAppTheme();
    const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
    const [pin, setPin] = useState('');
    const [firstPin, setFirstPin] = useState('');
    const [error, setError] = useState('');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (visible) {
            setStage('enter');
            setPin('');
            setFirstPin('');
            setError('');
        }
    }, [visible]);

    const showError = (msg: string) => {
        try {
            // Some Android versions can crash if vibration is called in certain contexts
            Vibration.vibrate(400);
        } catch (e) {
            console.warn('Vibration failed:', e);
        }
        
        setError(msg);
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        timeoutRef.current = setTimeout(() => {
            if (isMounted.current) {
                setPin('');
                setError('');
            }
        }, 700);
    };

    const handlePress = (num: string) => {
        if (pin.length >= 4) return;
        const newPin = pin + num;
        setPin(newPin);
        setError('');

        if (newPin.length < 4) return;

        if (mode === 'verify') {
            if (validatePin?.(newPin)) {
                onSuccess(newPin);
            } else {
                showError('Incorrect PIN');
            }
            return;
        }

        // setup mode
        if (stage === 'enter') {
            setFirstPin(newPin);
            setPin('');
            setStage('confirm');
        } else {
            if (newPin === firstPin) {
                onSuccess(newPin);
            } else {
                showError("PINs don't match — try again");
                setTimeout(() => setStage('enter'), 700);
            }
        }
    };

    const getHeading = () => {
        if (mode === 'verify') return title;
        return stage === 'enter' ? title : 'Confirm PIN';
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.cancel, { color: colors.primary }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.body}>
                    <Text style={[styles.heading, { color: theme.text }]}>{getHeading()}</Text>

                    {error ? (
                        <Text style={[styles.error, { color: colors.expense }]}>{error}</Text>
                    ) : (
                        <View style={styles.dots}>
                            {[0, 1, 2, 3].map(i => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        { borderColor: theme.textSecondary },
                                        pin.length > i && {
                                            backgroundColor: colors.primary,
                                            borderColor: colors.primary,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.pad}>
                    {NUMPAD.map((row, i) => (
                        <View key={i} style={styles.row}>
                            {row.map((item, j) =>
                                item === '' ? (
                                    <View key={j} style={styles.key} />
                                ) : (
                                    <TouchableOpacity
                                        key={j}
                                        style={[styles.key, { backgroundColor: theme.surface }]}
                                        onPress={() =>
                                            item === 'DEL'
                                                ? setPin(p => p.slice(0, -1))
                                                : handlePress(item)
                                        }
                                        activeOpacity={0.6}
                                    >
                                        <Text style={[styles.keyText, { color: theme.text }]}>
                                            {item === 'DEL' ? '⌫' : item}
                                        </Text>
                                    </TouchableOpacity>
                                ),
                            )}
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topBar: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        alignItems: 'flex-start',
    },
    cancel: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.medium,
    },
    body: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.xl,
    },
    heading: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold,
    },
    dots: {
        flexDirection: 'row',
        gap: Spacing.xxxl,
    },
    dot: {
        width: Spacing.xl,
        height: Spacing.xl,
        borderRadius: Layout.radius.sm,
        borderWidth: 2,
    },
    error: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.medium,
        height: Spacing.xl,
    },
    pad: {
        paddingBottom: Spacing.xxxxl,
        gap: Spacing.xl,
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.xxxl,
    },
    key: {
        width: 72,
        height: 72,
        borderRadius: Layout.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyText: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.medium,
    },
});
