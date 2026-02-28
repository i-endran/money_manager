import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppState } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDatabase } from './src/database';
import RNBootSplash from 'react-native-bootsplash';
import { useAuthStore } from './src/stores/authStore';
import { LockScreen } from './src/features/auth/screens/LockScreen';
import { useSettingsStore } from './src/stores/settingsStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App(): React.JSX.Element {
  const { isLocked, initialize, lockApp } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      await initDatabase();
      await useSettingsStore.getState().loadSettings();
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {isLocked ? (
        <LockScreen />
      ) : (
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      )}
    </GestureHandlerRootView>
  );
}

export default App;
