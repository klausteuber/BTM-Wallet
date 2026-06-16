import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { BlueCurrentTheme, BlueDarkTheme, BlueDefaultTheme, Theme } from '../themes';

export const ThemePreference = {
  System: 'system',
  Light: 'light',
  Dark: 'dark',
} as const;

export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference];

const THEME_PREFERENCE_STORAGE_KEY = 'themePreference';

type ThemePreferenceContextType = {
  themePreference: ThemePreference;
  resolvedColorScheme: 'light' | 'dark';
  theme: Theme;
  setThemePreferenceStorage: (preference: ThemePreference) => Promise<void>;
};

const getValidThemePreference = (preference: string | null): ThemePreference => {
  switch (preference) {
    case ThemePreference.Light:
    case ThemePreference.Dark:
    case ThemePreference.System:
      return preference;
    default:
      return ThemePreference.System;
  }
};

const defaultThemePreferenceContext: ThemePreferenceContextType = {
  themePreference: ThemePreference.System,
  resolvedColorScheme: 'light',
  theme: BlueDefaultTheme,
  setThemePreferenceStorage: async () => {},
};

export const ThemePreferenceContext = createContext<ThemePreferenceContextType>(defaultThemePreferenceContext);

export const ThemePreferenceProvider: React.FC<{ children: React.ReactNode }> = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [themePreference, setThemePreference] = useState<ThemePreference>(ThemePreference.System);

    useEffect(() => {
      AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
        .then(preference => setThemePreference(getValidThemePreference(preference)))
        .catch(error => console.error('Error loading theme preference:', error));
    }, []);

    const setThemePreferenceStorage = useCallback(async (preference: ThemePreference): Promise<void> => {
      const validPreference = getValidThemePreference(preference);
      try {
        await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, validPreference);
        setThemePreference(validPreference);
      } catch (error) {
        console.error('Error setting theme preference:', error);
      }
    }, []);

    const resolvedColorScheme =
      themePreference === ThemePreference.System ? (systemColorScheme === 'dark' ? 'dark' : 'light') : themePreference;
    const theme = resolvedColorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme;
    BlueCurrentTheme.updateTheme(theme);

    const value = useMemo(
      () => ({
        themePreference,
        resolvedColorScheme,
        theme,
        setThemePreferenceStorage,
      }),
      [themePreference, resolvedColorScheme, theme, setThemePreferenceStorage],
    );

    return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
  },
);

export const useThemePreference = (): ThemePreferenceContextType => useContext(ThemePreferenceContext);
