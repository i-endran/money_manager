import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LedgerScreen } from '../features/ledger/screens/LedgerScreen';
// @ts-ignore
import { TransactionFormScreen } from '../features/transaction/screens/TransactionFormScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { AccountManagementScreen } from '../features/settings/screens/AccountManagementScreen';
import { CategoryManagementScreen } from '../features/settings/screens/CategoryManagementScreen';
import { AccountFormScreen } from '../features/settings/screens/AccountFormScreen';
import { CategoryFormScreen } from '../features/settings/screens/CategoryFormScreen';

export type RootStackParamList = {
    Ledger: undefined;
    TransactionForm: { transactionId?: number } | undefined;
    Settings: undefined;
    AccountManagement: undefined;
    CategoryManagement: undefined;
    AccountForm: { accountId?: number } | undefined;
    CategoryForm: { categoryId?: number } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="Ledger"
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}>
            <Stack.Screen name="Ledger" component={LedgerScreen} />
            <Stack.Screen
                name="TransactionForm"
                component={TransactionFormScreen}
                options={{
                    presentation: 'transparentModal',
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} />
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
