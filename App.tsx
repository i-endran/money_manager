import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppState } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDatabase } from './src/database';
import RNBootSplash from 'react-native-bootsplash';
import { useAuthStore } from './src/stores/authStore';
import { LockScreen } from './src/features/auth/screens/LockScreen';

function App(): React.JSX.Element {
  const { isLocked, initialize, lockApp } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      await initDatabase();
      await initialize();
      setIsReady(true);
      await RNBootSplash.hide({ fade: true });
    }
    setup();
  }, [initialize]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background') {
        lockApp();
      }
    });
    return () => subscription.remove();
  }, [lockApp]);

  if (!isReady) return <React.Fragment />;

  return isLocked ? (
    <LockScreen />
  ) : (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default App;
