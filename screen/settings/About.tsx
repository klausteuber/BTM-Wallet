import React from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert, Image, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { getApplicationName, getBuildNumber, getBundleId, getUniqueIdSync, getVersion, hasGmsSync } from 'react-native-device-info';
import Rate, { AndroidMarket } from 'react-native-rate';
import A from '../../blue_modules/analytics';
import { BlueCard, BlueTextCentered } from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { ATM_LOCATIONS_SUBTITLE, ATM_LOCATIONS_TITLE } from './atmLocationsConfig';

const branch = require('../../current-branch.json');
const COMPANY_WEBSITE_URL = 'https://americabitcoinatm.com';
const HELP_CENTER_URL = 'https://americabitcoinatm.com/help-center/';
const APP_PRIVACY_URL = 'https://americabitcoinatm.com/app-privacy-policy/';
const BRAND_BLUE = '#040766';
const BRAND_RED = '#ED122E';

const About: React.FC = () => {
  const { navigate } = useExtendedNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const { isElectrumDisabled } = useSettings();
  const logoWidth = Math.min(width - 88, 280);

  const stylesHook = StyleSheet.create({
    brandTitle: {
      color: colors.foregroundColor,
    },
    brandDescription: {
      color: colors.alternativeTextColor,
    },
    copyToClipboardText: {
      color: BRAND_RED,
    },
  });

  const handleOnReleaseNotesPress = () => {
    navigate('ReleaseNotes');
  };

  const handleOnSelfTestPress = () => {
    if (isElectrumDisabled) {
      presentAlert({ message: loc.settings.about_selftest_electrum_disabled });
    } else {
      navigate('SelfTest');
    }
  };

  const handleOnLicensingPress = () => {
    navigate('Licensing');
  };

  const handleOnWebsitePress = () => {
    Linking.openURL(COMPANY_WEBSITE_URL);
  };

  const handleOnAtmLocationsPress = () => {
    navigate('AtmLocations');
  };

  const handleOnHelpCenterPress = () => {
    Linking.openURL(HELP_CENTER_URL);
  };

  const handleOnPrivacyPress = () => {
    Linking.openURL(APP_PRIVACY_URL);
  };

  const handleOnRatePress = () => {
    const options = {
      GooglePackageName: 'com.americabitcoinatm.wallet',
      preferredAndroidMarket: AndroidMarket.Google,
      preferInApp: Platform.OS !== 'android',
      openAppStoreIfInAppFails: true,
      fallbackPlatformURL: COMPANY_WEBSITE_URL,
    };
    Rate.rate(options, success => {
      if (success) {
        console.log('User Rated.');
      }
    });
  };

  return (
    <SafeAreaScrollView testID="AboutScrollView" contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      <BlueCard>
        <View style={styles.center}>
          <View style={styles.brandBanner}>
            <Image
              style={[styles.brandLogo, { width: logoWidth, height: Math.round(logoWidth / 3.53) }]}
              source={require('../../img/america-bitcoin-logo.png')}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandTitle, stylesHook.brandTitle]}>Self-custody Bitcoin wallet from America Bitcoin ATM</Text>
          <Text style={[styles.brandDescription, stylesHook.brandDescription]}>
            Manage your wallet, find nearby kiosks, and get support from the America Bitcoin ecosystem without mixed branding.
          </Text>
          {((Platform.OS === 'android' && hasGmsSync()) || Platform.OS !== 'android') && (
            <Button onPress={handleOnRatePress} title={loc.settings.about_review + ' ⭐🙏'} />
          )}
        </View>
      </BlueCard>
      <ListItem
        leftIcon={{
          name: 'globe',
          type: 'font-awesome',
          color: BRAND_BLUE,
        }}
        onPress={handleOnWebsitePress}
        title="Website"
        subtitle="americabitcoinatm.com"
        subtitleNumberOfLines={2}
      />
      <ListItem
        leftIcon={{
          name: 'map-marker',
          type: 'font-awesome',
          color: BRAND_RED,
        }}
        onPress={handleOnAtmLocationsPress}
        title={ATM_LOCATIONS_TITLE}
        subtitle={ATM_LOCATIONS_SUBTITLE}
        subtitleNumberOfLines={2}
      />
      <ListItem
        leftIcon={{
          name: 'life-ring',
          type: 'font-awesome',
          color: colors.foregroundColor,
        }}
        onPress={handleOnHelpCenterPress}
        title="Help Center"
        subtitle="Articles and support from America Bitcoin ATM"
        subtitleNumberOfLines={2}
      />
      <ListItem
        leftIcon={{
          name: 'shield',
          type: 'font-awesome',
          color: colors.foregroundColor,
        }}
        onPress={handleOnPrivacyPress}
        title="Privacy Policy"
        subtitle="How the wallet app handles your data"
        subtitleNumberOfLines={2}
      />
      <ListItem
        leftIcon={{
          name: 'book',
          type: 'font-awesome',
          color: '#9AA0AA',
        }}
        chevron
        onPress={handleOnReleaseNotesPress}
        title={loc.settings.about_release_notes}
      />
      <ListItem
        leftIcon={{
          name: 'balance-scale',
          type: 'font-awesome',
          color: colors.foregroundColor,
        }}
        chevron
        onPress={handleOnLicensingPress}
        title={loc.settings.about_license}
      />
      <ListItem
        leftIcon={{
          name: 'flask',
          type: 'font-awesome',
          color: '#FC0D44',
        }}
        chevron
        onPress={handleOnSelfTestPress}
        testID="RunSelfTestButton"
        title={loc.settings.about_selftest}
      />
      <ListItem
        leftIcon={{
          name: 'flask',
          type: 'font-awesome',
          color: '#FC0D44',
        }}
        chevron
        onPress={async () => {
          const secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
          const w = new HDSegwitBech32Wallet();
          w.setSecret(secret);

          const start = Date.now();
          let num;
          for (num = 0; num < 1000; num++) {
            w._getExternalAddressByIndex(num);
            if (Date.now() - start > 10 * 1000) {
              break;
            }
          }

          Alert.alert(loc.formatString(loc.settings.performance_score, { num }));
        }}
        title={loc.settings.run_performance_test}
      />
      <BlueSpacing20 />
      <BlueSpacing20 />
      <BlueTextCentered>
        {getApplicationName()} ver {getVersion()} (build {getBuildNumber() + ' ' + branch})
      </BlueTextCentered>
      <BlueTextCentered>{new Date(Number(getBuildNumber()) * 1000).toUTCString()}</BlueTextCentered>
      <BlueTextCentered>{getBundleId()}</BlueTextCentered>
      <BlueTextCentered>
        w, h = {width}, {height}
      </BlueTextCentered>
      <BlueTextCentered>Unique ID: {getUniqueIdSync()}</BlueTextCentered>
      <View style={styles.copyToClipboard}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const stringToCopy = 'userId:' + getUniqueIdSync();
            A.logError('copied unique id');
            Clipboard.setString(stringToCopy);
          }}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Text style={[styles.copyToClipboardText, stylesHook.copyToClipboardText]}>{loc.transactions.details_copy}</Text>
        </Pressable>
      </View>
      <BlueSpacing20 />
      <BlueSpacing20 />
    </SafeAreaScrollView>
  );
};

export default About;

const styles = StyleSheet.create({
  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyToClipboardText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#68bbe1',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  brandBanner: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginBottom: 24,
  },
  brandLogo: {
    maxWidth: '100%',
  },
  brandTitle: {
    maxWidth: 320,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 12,
  },
  brandDescription: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 32,
  },
  pressed: {
    opacity: 0.6,
  },
});
