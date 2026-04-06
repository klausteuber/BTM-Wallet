import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import Button from '../../components/Button';
import HeaderRightButton from '../../components/HeaderRightButton';
import { useTheme } from '../../components/themes';
import { ATM_LOCATIONS_TITLE, ATM_LOCATIONS_URL } from './atmLocationsConfig';

const IN_APP_HOSTS = ['americabitcoinatm.com', 'www.americabitcoinatm.com', 'cdn.storepoint.co'];
const EXTERNAL_SCHEMES = ['mailto:', 'tel:', 'sms:'];

const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const shouldKeepInApp = (url: string): boolean => {
  if (!url || url === 'about:blank') return true;
  if (EXTERNAL_SCHEMES.some(scheme => url.startsWith(scheme))) return false;

  const hostname = getHostname(url);
  return IN_APP_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
};

const AtmLocations: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(ATM_LOCATIONS_URL);
  const [hasError, setHasError] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const openCurrentPageExternally = useCallback(() => {
    Linking.openURL(currentUrl);
  }, [currentUrl]);

  const HeaderRightAction = useCallback(
    () => <HeaderRightButton title="Open" onPress={openCurrentPageExternally} disabled={false} testID="AtmLocationsOpen" />,
    [openCurrentPageExternally],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: HeaderRightAction,
    });
  }, [HeaderRightAction, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;

      const handleBackButton = () => {
        if (canGoBack) {
          webViewRef.current?.goBack();
          return true;
        }

        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
      return () => subscription.remove();
    }, [canGoBack]),
  );

  const handleNavigationStateChange = useCallback((navigationState: WebViewNavigation) => {
    setCanGoBack(Boolean(navigationState.canGoBack));
    setCurrentUrl(navigationState.url || ATM_LOCATIONS_URL);
  }, []);

  const handleShouldStartLoadWithRequest = useCallback((request: ShouldStartLoadRequest) => {
    if (request.isTopFrame === false) return true;
    if (shouldKeepInApp(request.url)) return true;

    Linking.openURL(request.url);
    return false;
  }, []);

  const handleReload = useCallback(() => {
    setHasError(false);
    setWebViewKey(currentKey => currentKey + 1);
  }, []);

  const renderLoading = useCallback(
    () => (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.foregroundColor} />
        <Text style={[styles.loadingText, { color: colors.alternativeTextColor }]}>Loading ATM locator...</Text>
      </View>
    ),
    [colors.alternativeTextColor, colors.background, colors.foregroundColor],
  );

  if (hasError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.foregroundColor }]}>{ATM_LOCATIONS_TITLE}</Text>
        <Text style={[styles.errorText, { color: colors.alternativeTextColor }]}>
          The in-app locator could not be loaded right now. You can try again or open it in your browser.
        </Text>
        <View style={styles.buttonRow}>
          <Button title="Try Again" onPress={handleReload} />
        </View>
        <View style={styles.buttonRow}>
          <Button title="Open in Browser" onPress={openCurrentPageExternally} backgroundColor={colors.lightButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ uri: ATM_LOCATIONS_URL }}
        startInLoadingState
        renderLoading={renderLoading}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onLoadStart={() => setHasError(false)}
        onError={() => setHasError(true)}
        onHttpError={() => setHasError(true)}
        pullToRefreshEnabled
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        bounces={false}
        allowsLinkPreview={false}
        originWhitelist={['https://*', 'http://*']}
        testID="AtmLocationsWebView"
      />
    </View>
  );
};

export default AtmLocations;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
});
