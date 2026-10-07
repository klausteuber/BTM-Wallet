import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { ThemePreference, useThemePreference } from '../../components/Context/ThemePreferenceProvider';

type NavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'GeneralSettings'>;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const GeneralSettings: React.FC = () => {
  const { wallets } = useStorage();
  const {
    isHandOffUseEnabled,
    setIsHandOffUseEnabledAsyncStorage,
    isLegacyURv1Enabled,
    setIsLegacyURv1EnabledStorage,
    isServiceFeeEnabled,
    setIsServiceFeeEnabledStorage,
  } = useSettings();
  const { themePreference, setThemePreferenceStorage } = useThemePreference();
  const { navigate } = useNavigation<NavigationProp>();
  const { colors } = useTheme();

  const navigateToPrivacy = () => {
    navigate('SettingsPrivacy');
  };

  const onHandOffUseEnabledChange = async (value: boolean) => {
    await setIsHandOffUseEnabledAsyncStorage(value);
  };

  const onThemePreferencePress = async (preference: ThemePreference) => {
    await setThemePreferenceStorage(preference);
  };

  const stylesWithThemeHook = {
    root: {
      backgroundColor: colors.background,
    },
  };

  return (
    <SafeAreaScrollView
      style={[styles.root, stylesWithThemeHook.root]}
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      {wallets.length > 0 && (
        <>
          <ListItem onPress={() => navigate('DefaultView')} title={loc.settings.default_title} chevron />
        </>
      )}
      <ListItem title={loc.settings.privacy} onPress={navigateToPrivacy} testID="SettingsPrivacy" chevron />
      <ListItem
        title={loc.settings.appearance_system}
        subtitle={loc.settings.appearance_explanation}
        onPress={() => onThemePreferencePress(ThemePreference.System)}
        testID="AppearanceSystem"
        checkmark={themePreference === ThemePreference.System}
      />
      <ListItem
        title={loc.settings.appearance_light}
        onPress={() => onThemePreferencePress(ThemePreference.Light)}
        testID="AppearanceLight"
        checkmark={themePreference === ThemePreference.Light}
      />
      <ListItem
        title={loc.settings.appearance_dark}
        onPress={() => onThemePreferencePress(ThemePreference.Dark)}
        testID="AppearanceDark"
        checkmark={themePreference === ThemePreference.Dark}
      />
      <BlueSpacing20 />
      {Platform.OS === 'ios' ? (
        <>
          <ListItem
            title={loc.settings.general_continuity}
            Component={PressableWrapper}
            switch={{
              onValueChange: onHandOffUseEnabledChange,
              value: isHandOffUseEnabled,
            }}
            subtitle={loc.settings.general_continuity_e}
          />
        </>
      ) : null}
      <ListItem
        Component={PressableWrapper}
        title="Legacy URv1 QR"
        switch={{
          onValueChange: setIsLegacyURv1EnabledStorage,
          value: isLegacyURv1Enabled,
        }}
      />
      <BlueSpacing20 />
      <ListItem
        Component={PressableWrapper}
        title={loc.settings.general_service_fee}
        subtitle={loc.settings.general_service_fee_e}
        testID="ServiceFeeSwitch"
        switch={{
          onValueChange: setIsServiceFeeEnabledStorage,
          value: isServiceFeeEnabled,
        }}
      />
      <BlueSpacing20 />
    </SafeAreaScrollView>
  );
};

export default GeneralSettings;
