import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
    MainTabs: undefined;
    TransactionForm: { transactionId?: number } | undefined;
    AccountManagement: undefined;
    CategoryManagement: undefined;
    AccountForm: { accountId?: number } | undefined;
    CategoryForm: { categoryId?: number } | undefined;
};

type TabParamList = {
    Ledger: undefined;
    Accounts: undefined;
    Stats: undefined;
    Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// --- Bottom Tab Navigator ---
const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
    Ledger: { focused: 'book-open-variant', unfocused: 'book-open-outline' },
    Accounts: { focused: 'wallet', unfocused: 'wallet-outline' },
    Stats: { focused: 'chart-pie', unfocused: 'chart-arc' },
    Settings: { focused: 'cog', unfocused: 'cog-outline' },
};

const MainTabs = () => {
    const { theme, isDark } = useAppTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = TAB_ICONS[route.name];
                    const iconName = focused ? icons.focused : icons.unfocused;
                    return (
                        <MaterialCommunityIcons
                            name={iconName}
                            size={size}
                            color={color}
                        />
                    );
                },
                tabBarActiveTintColor: theme.tabBarActive,
                tabBarInactiveTintColor: theme.tabBarInactive,
                tabBarStyle: {
                    backgroundColor: theme.tabBar,
                    borderTopColor: theme.border,
                    borderTopWidth: 0.5,
                    elevation: 0,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                    paddingTop: 6,
                    height: Platform.OS === 'ios' ? 84 : 60,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                },
            })}
        >
            <Tab.Screen name="Ledger" component={LedgerScreen} />
            <Tab.Screen name="Accounts" component={AccountsScreen} />
            <Tab.Screen name="Stats" component={StatsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

// --- Root Stack Navigator (tabs + modal screens) ---
export const RootNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
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
