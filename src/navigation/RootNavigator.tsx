import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LedgerScreen } from '../features/ledger/screens/LedgerScreen';
// @ts-ignore
import { TransactionFormScreen } from '../features/transaction/screens/TransactionFormScreen';
import { AccountsScreen } from '../features/accounts/screens/AccountsScreen';
import { StatsScreen } from '../features/stats/screens/StatsScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { AccountManagementScreen } from '../features/settings/screens/AccountManagementScreen';
import { CategoryManagementScreen } from '../features/settings/screens/CategoryManagementScreen';
import { AccountFormScreen } from '../features/settings/screens/AccountFormScreen';
import { CategoryFormScreen } from '../features/settings/screens/CategoryFormScreen';
import { Colors, Layout, Spacing, useAppTheme } from '../core/theme';

// ─── Constants ───────────────────────────────────────────────────────────────
const PILL_HEIGHT = 70;
const TAB_H_MARGIN = 20;

// Both states use filled icons. Inactive gets a dark muted color (not outline wireframe).
const TAB_ICONS: Record<string, string> = {
    Ledger: 'book',
    Accounts: 'wallet',
    Stats: 'pie-chart',
    Settings: 'settings',
};

// ─── Glass Tab Bar ────────────────────────────────────────────────────────────
const GlassTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
    const { theme, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [containerWidth, setContainerWidth] = useState(0);
    const indicatorX = useRef(new Animated.Value(0)).current;
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Hide on keyboard (Android only — iOS keyboard never covers a floating tab bar)
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    // Animate active capsule to the focused tab
    useEffect(() => {
        if (containerWidth <= 0) return;
        const itemWidth = containerWidth / state.routes.length;
        Animated.spring(indicatorX, {
            toValue: state.index * itemWidth,
            useNativeDriver: true,
            stiffness: 380,
            damping: 34,
            mass: 1,
            overshootClamping: false,
        }).start();
    }, [state.index, containerWidth, indicatorX]);

    if (keyboardVisible) return null;

    const navigate = (route: (typeof state.routes)[0]) => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });
        if (!event.defaultPrevented) {
            // @ts-ignore — merge keeps current params on same-tab re-press
            navigation.navigate({ name: route.name, merge: true });
        }
    };

    // ── Android: clean flat tab bar ──────────────────────────────────────────
    // insets.bottom = Android nav-bar height (0 on gesture nav, ~48px on 3-button nav).
    // paddingBottom pushes our content above it; height grows to fit.
    if (Platform.OS === 'android') {
        const androidTabHeight = 56;
        return (
            <View style={[androidStyles.container, {
                backgroundColor: theme.tabBar,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom,
                height: androidTabHeight + insets.bottom,
            }]}>
                {state.routes.map((route, index) => {
                    const focused = state.index === index;
                    const iconName = TAB_ICONS[route.name];
                    return (
                        <Pressable
                            key={route.key}
                            onPress={() => navigate(route)}
                            style={androidStyles.item}
                            android_ripple={{ color: theme.tabBarInactive + '33', borderless: true }}
                        >
                            <Ionicons
                                name={iconName}
                                size={22}
                                color={focused ? theme.tabBarActive : theme.tabBarInactive}
                            />
                            <Text style={[androidStyles.label, {
                                color: focused ? theme.tabBarActive : theme.tabBarInactive,
                                fontWeight: focused ? '600' : '400',
                            }]}>
                                {route.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        );
    }

    // ── iOS: liquid glass floating pill ─────────────────────────────────────
    // Sit 4pt from the screen bottom edge — matching native iOS tab bar placement.
    // The home indicator is a system overlay that floats above content, so it's
    // safe to position the pill well below the safe area inset.
    const bottomGap = 4;
    const itemWidth = containerWidth > 0 ? containerWidth / state.routes.length : 0;
    const capsuleHInset = Spacing.xs;   // horizontal gap between adjacent capsules
    const capsuleVInset = Spacing.sm;   // vertical inset inside pill

    return (
        <View
            pointerEvents="box-none"
            style={{
                position: 'absolute',
                bottom: bottomGap,
                left: TAB_H_MARGIN,
                right: TAB_H_MARGIN,
                height: PILL_HEIGHT,
            }}
        >
            <View
                style={[iosStyles.pill, {
                    shadowOpacity: isLiquidGlassSupported ? 0 : (isDark ? 0.45 : 0.18),
                }]}
                onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
            >
                {/* Glass background — native Liquid Glass on iOS 26+, BlurView fallback */}
                {isLiquidGlassSupported ? (
                    <LiquidGlassView
                        style={StyleSheet.absoluteFill}
                        effect="regular"
                        interactive
                        colorScheme={isDark ? 'dark' : 'light'}
                    />
                ) : (
                    <>
                        <BlurView
                            style={StyleSheet.absoluteFill}
                            blurType={isDark ? 'chromeMaterialDark' : 'chromeMaterial'}
                            blurAmount={40}
                            reducedTransparencyFallbackColor={theme.tabBar}
                        />
                        <View style={[StyleSheet.absoluteFill, iosStyles.glassTint, {
                            backgroundColor: isDark
                                ? 'rgba(28,28,30,0.52)'
                                : 'rgba(255,255,255,0.50)',
                            borderColor: isDark
                                ? 'rgba(255,255,255,0.13)'
                                : 'rgba(255,255,255,0.92)',
                        }]} />
                    </>
                )}

                {/* Animated active-tab capsule */}
                {itemWidth > 0 && (
                    <Animated.View style={[iosStyles.capsule, {
                        width: itemWidth - capsuleHInset * 2,
                        top: capsuleVInset,
                        bottom: capsuleVInset,
                        left: capsuleHInset,
                        backgroundColor: isDark
                            ? 'rgba(255,255,255,0.14)'
                            : 'rgba(255,255,255,0.86)',
                        shadowColor: isDark ? Colors.white : Colors.light.primary,
                        shadowOpacity: isDark ? 0.0 : 0.12,
                        transform: [{ translateX: indicatorX }],
                    }]} />
                )}

                {/* Tab items */}
                <View style={iosStyles.tabRow}>
                    {state.routes.map((route, index) => {
                        const focused = state.index === index;
                        const iconName = TAB_ICONS[route.name];
                        return (
                            <Pressable
                                key={route.key}
                                onPress={() => navigate(route)}
                                style={iosStyles.tabItem}
                                hitSlop={8}
                            >
                                <Ionicons
                                    name={iconName}
                                    size={22}
                                    color={focused ? theme.tabBarActive : theme.tabBarInactive}
                                />
                                <Text style={[iosStyles.label, {
                                    color: focused ? theme.tabBarActive : theme.tabBarInactive,
                                    fontWeight: focused ? '600' : '400',
                                }]}>
                                    {route.name}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const iosStyles = StyleSheet.create({
    pill: {
        flex: 1,
        borderRadius: Layout.radius.full,
        overflow: 'hidden',
        shadowColor: Colors.black,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 10 },
    },
    glassTint: {
        borderRadius: Layout.radius.full,
        borderWidth: StyleSheet.hairlineWidth,
    },
    capsule: {
        position: 'absolute',
        borderRadius: Layout.radius.full,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
    },
    tabRow: {
        flex: 1,
        flexDirection: 'row',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    label: {
        fontSize: 10,
        letterSpacing: 0.1,
    },
});

const androidStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    label: {
        fontSize: 10,
    },
});

// ─── Type definitions ─────────────────────────────────────────────────────────
export type RootStackParamList = {
    MainTabs: NavigatorScreenParams<TabParamList> | undefined;
    TransactionForm: { transactionId?: number; selectedDate?: string } | undefined;
    AccountManagement: undefined;
    CategoryManagement: undefined;
    AccountForm: { accountId?: number; parentId?: number; initialType?: string } | undefined;
    CategoryForm: { categoryId?: number } | undefined;
};

export type TabParamList = {
    Ledger:
    | {
        accountId?: number;
        accountName?: string;
        fromAccounts?: boolean;
    }
    | undefined;
    Accounts: undefined;
    Stats: undefined;
    Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ─── Main Tabs ────────────────────────────────────────────────────────────────
const MainTabs = () => {
    const { theme } = useAppTheme();
    const insets = useSafeAreaInsets();

    // Screen content needs padding at the bottom to avoid being hidden under the pill.
    // Pill is 4pt from screen bottom + PILL_HEIGHT + a little extra breathing room.
    const tabBarTotalHeight = PILL_HEIGHT + 4 + Spacing.lg;

    return (
        <Tab.Navigator
            tabBar={(props) => <GlassTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    height: tabBarTotalHeight,
                },
            }}
        >
            <Tab.Screen
                name="Ledger"
                component={LedgerScreen}
                listeners={({ navigation, route }) => ({
                    tabPress: () => {
                        const params = route.params as TabParamList['Ledger'];
                        if (params?.fromAccounts) {
                            navigation.setParams({
                                accountId: undefined,
                                accountName: undefined,
                                fromAccounts: undefined,
                            });
                        }
                    },
                })}
            />
            <Tab.Screen name="Accounts" component={AccountsScreen} />
            <Tab.Screen name="Stats" component={StatsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

// --- Root Stack Navigator (tabs + modal screens) ---
export const RootNavigator = () => {
    const { theme } = useAppTheme();

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
                gestureEnabled: true,
                fullScreenGestureEnabled: Platform.OS === 'ios',
                contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
                name="TransactionForm"
                component={TransactionFormScreen}
                options={{
                    presentation: 'transparentModal',
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen name="AccountManagement" component={AccountManagementScreen} />
            <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
            <Stack.Screen
                name="AccountForm"
                component={AccountFormScreen}
                options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
                name="CategoryForm"
                component={CategoryFormScreen}
                options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
        </Stack.Navigator>
    );
};
