import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Vibration,
} from 'react-native';
import { Layout, Spacing, Typography, useAppTheme } from '../../../core/theme';
import { useAuthStore } from '../../../stores/authStore';
import ReactNativeBiometrics from 'react-native-biometrics';

export const LockScreen = () => {
    const { theme, colors } = useAppTheme();
    const { unlockWithPin, unlockWithBiometrics, biometricsEnabled } = useAuthStore();

    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [biometryType, setBiometryType] = useState<string | undefined>();

    const handleBiometrics = useCallback(async () => {
        const success = await unlockWithBiometrics();
        if (!success) {
            setError(true);
            setTimeout(() => setError(false), 1000);
        }
    }, [unlockWithBiometrics]);

    const rnBiometrics = React.useMemo(() => new ReactNativeBiometrics(), []);

    useEffect(() => {
        rnBiometrics.isSensorAvailable().then((resultObject) => {
            const { available, biometryType: detectedBiometryType } = resultObject;
            if (available) {
                setBiometryType(detectedBiometryType);
            }
        });
    }, [rnBiometrics]);

    useEffect(() => {
        if (biometricsEnabled && biometryType) {
            handleBiometrics();
        }
    }, [biometryType, biometricsEnabled, handleBiometrics]);

    const handlePress = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);

            if (newPin.length === 4) {
                const success = unlockWithPin(newPin);
                if (!success) {
                    Vibration.vibrate();
                    setError(true);
                    setTimeout(() => {
                        setPin('');
                        setError(false);
                    }, 500);
                }
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    const renderDots = () => {
        return (
            <View style={styles.dotsContainer}>
                {[0, 1, 2, 3].map(i => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            { borderColor: theme.textSecondary },
                            pin.length > i && { backgroundColor: colors.primary, borderColor: colors.primary },
                            error && { backgroundColor: colors.expense, borderColor: colors.expense }
                        ]}
                    />
                ))}
            </View>
        );
    };

    const numbers = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        [biometryType && biometricsEnabled ? 'BIO' : '', '0', 'DEL']
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Enter PIN</Text>
                {error && <Text style={[styles.error, { color: colors.expense }]}>Incorrect PIN</Text>}
            </View>

            {renderDots()}

            <View style={styles.pad}>
                {numbers.map((row, i) => (
                    <View key={i} style={styles.row}>
                        {row.map((item, j) => {
                            if (!item) return <View key={j} style={styles.btn} />;

                            return (
                                <TouchableOpacity
                                    key={j}
                                    style={[styles.btn, { backgroundColor: theme.surface }]}
                                    onPress={() => {
                                        if (item === 'DEL') handleDelete();
                                        else if (item === 'BIO') handleBiometrics();
                                        else handlePress(item);
                                    }}
                                >
                                    <Text style={[styles.btnText, { color: theme.text }]}>
                                        {item === 'BIO' ? '🔓' : item === 'DEL' ? '⌫' : item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: Spacing.xxxxxl },
    title: {
        fontSize: Typography.sizes.lg + Spacing.sm,
        fontWeight: Typography.weights.bold,
        marginBottom: Spacing.md,
    },
    error: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.xxxl,
        marginBottom: Spacing.xxxxxl + Spacing.xxl,
    },
    dot: {
        width: Spacing.xl,
        height: Spacing.xl,
        borderRadius: Layout.radius.sm,
        borderWidth: Spacing.xxs,
    },
    pad: {
        alignItems: 'center',
        gap: Spacing.xl,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.xxxl,
    },
    btn: {
        width: Spacing.xxxl * 3,
        height: Spacing.xxxl * 3,
        borderRadius: Layout.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.medium },
});
