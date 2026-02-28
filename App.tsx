import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LedgerScreen } from './src/features/ledger/screens/LedgerScreen';
import { initDatabase } from './src/database';
import RNBootSplash from 'react-native-bootsplash';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  useEffect(() => {
    async function setup() {
      // Initialize Database & Seed
      await initDatabase();

      // Hide splash screen after initialization
      await RNBootSplash.hide({ fade: true });
    }

    setup();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Ledger" component={LedgerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
