import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LedgerScreen } from '../features/ledger/screens/LedgerScreen';
import { TransactionFormScreen } from '../features/transaction/screens/TransactionFormScreen';

export type RootStackParamList = {
    Ledger: undefined;
    TransactionForm: { transactionId?: number } | undefined;
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
        </Stack.Navigator>
    );
};
