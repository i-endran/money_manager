import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDatabase } from './src/database';
import RNBootSplash from 'react-native-bootsplash';

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
      <RootNavigator />
    </NavigationContainer>
  );
}

export default App;
