import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SizeClassProvider } from './components/Context/SizeClassProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';
import { ThemePreferenceProvider, useThemePreference } from './components/Context/ThemePreferenceProvider';
import MasterView from './navigation/MasterView';
import { navigationRef } from './NavigationService';
import { useLogger } from '@react-navigation/devtools';
import { StorageProvider } from './components/Context/StorageProvider';

const AppContent = () => {
  const { theme } = useThemePreference();

  useLogger(navigationRef);

  return (
    <SizeClassProvider>
      <NavigationContainer ref={navigationRef} theme={theme}>
        <SafeAreaProvider>
          <StorageProvider>
            <SettingsProvider>
              <MasterView />
            </SettingsProvider>
          </StorageProvider>
        </SafeAreaProvider>
      </NavigationContainer>
    </SizeClassProvider>
  );
};

const App = () => (
  <ThemePreferenceProvider>
    <AppContent />
  </ThemePreferenceProvider>
);

export default App;
