import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';

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
import { useAppTheme } from '../core/theme';

// --- Type definitions ---
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

// --- Bottom Tab Navigator ---
const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
    Ledger: { focused: 'book', unfocused: 'book-outline' },
    Accounts: { focused: 'wallet', unfocused: 'wallet-outline' },
    Stats: { focused: 'pie-chart', unfocused: 'pie-chart-outline' },
    Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

const MainTabs = () => {
    const { theme, isDark } = useAppTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                animation: Platform.OS === 'ios' ? 'shift' : 'none',
                transitionSpec: Platform.OS === 'ios'
                    ? {
                        animation: 'spring',
                        config: {
                            stiffness: 1000,
                            damping: 500,
                            mass: 3,
                            overshootClamping: true,
                            restDisplacementThreshold: 0.01,
                            restSpeedThreshold: 0.01,
                        },
                    }
                    : undefined,
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = TAB_ICONS[route.name];
                    const iconName = focused ? icons.focused : icons.unfocused;
                    return (
                        <Ionicons
                            name={iconName}
                            size={focused ? size + 1 : size}
                            color={color}
                        />
                    );
                },
                tabBarActiveTintColor: theme.tabBarActive,
                tabBarInactiveTintColor: theme.tabBarInactive,
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.tabBar,
                    borderTopColor: Platform.OS === 'ios' ? 'transparent' : theme.border,
                    borderTopWidth: Platform.OS === 'ios' ? 0 : 0.5,
                    elevation: 0,
                    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
                    paddingTop: 6,
                    height: Platform.OS === 'ios' ? 76 : 60,
                    ...(Platform.OS === 'ios' ? {
                        position: 'absolute',
                        marginHorizontal: 12,
                        marginBottom: 10,
                        borderRadius: 22,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOpacity: 0.15,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 8 },
                    } : {}),
                },
                tabBarItemStyle: Platform.OS === 'ios' ? {
                    marginHorizontal: 2,
                    borderRadius: 14,
                } : undefined,
                tabBarBackground: () =>
                    Platform.OS === 'ios' ? (
                        <View style={StyleSheet.absoluteFill}>
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType={isDark ? 'dark' : 'light'}
                                blurAmount={26}
                                reducedTransparencyFallbackColor={theme.tabBar}
                            />
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        backgroundColor: isDark ? 'rgba(28,28,30,0.35)' : 'rgba(255,255,255,0.35)',
                                        borderRadius: 22,
                                        borderWidth: StyleSheet.hairlineWidth,
                                        borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                            />
                        </View>
                    ) : (
                        <View style={{ flex: 1, backgroundColor: theme.tabBar }} />
                    ),
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                },
            })}
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
