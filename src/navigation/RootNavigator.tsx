import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LedgerScreen } from '../features/ledger/screens/LedgerScreen';
// @ts-ignore
import { TransactionFormScreen } from '../features/transaction/screens/TransactionFormScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { AccountManagementScreen } from '../features/settings/screens/AccountManagementScreen';
import { CategoryManagementScreen } from '../features/settings/screens/CategoryManagementScreen';

export type RootStackParamList = {
    Ledger: undefined;
    TransactionForm: { transactionId?: number } | undefined;
    Settings: undefined;
    AccountManagement: undefined;
    CategoryManagement: undefined;
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
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AccountManagement" component={AccountManagementScreen} />
            <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
        </Stack.Navigator>
    );
};
