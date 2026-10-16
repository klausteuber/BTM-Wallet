import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { checkNotifications, requestNotifications, RESULTS } from 'react-native-permissions';
import PushNotification from 'react-native-push-notification';
import { hasGmsSync } from 'react-native-device-info';

import { navigationRef } from '../NavigationService';
import { configureNotifications, getAbtmAndroidToken, setAbtmPushHooks } from './notifications';
import { KioskAuthorization, pairedWalletApi } from './paired-wallet-api';

/**
 * Kiosk approval requests, pushed by the account service (account_service/push.py)
 * and noticed by the in-app poller (components/AbtmKioskWatcher).
 *
 * - Registers this phone's push token with the account service once permission is
 *   granted: the APNs token on iPhone, the FCM token on Android (where the shared
 *   react-native-push-notification setup in ./notifications owns registration).
 * - A tap on the notification opens the approval screen. Approving still needs
 *   Face ID and a signed request there; the notification itself can't approve.
 * - Keeps the waiting request (if any) for the home-screen banner.
 *
 * Listeners are added once and never removed: PushNotificationIOS.removeEventListener
 * would also drop BlueWallet's own notification listeners for the same event.
 */

export const PUSH_ASKED_KEY = 'abtm_push_asked';
export const PUSH_BANNER_DISMISSED_KEY = 'abtm_push_banner_dismissed';
const KIOSK_TYPE = 'kiosk_authorization';
/** Must match the channel_id the account service puts on FCM messages. */
export const ANDROID_KIOSK_CHANNEL = 'abtm_kiosk';

// ------------------------------------------------------------------ waiting request (banner)

let pending: KioskAuthorization | null = null;
const pendingListeners = new Set<(value: KioskAuthorization | null) => void>();

export function setPendingAuthorization(value: KioskAuthorization | null): void {
  if ((pending?.id ?? null) === (value?.id ?? null) && pending?.status === value?.status) return;
  pending = value;
  pendingListeners.forEach(listener => listener(pending));
}

export function usePendingAuthorization(): KioskAuthorization | null {
  const [value, setValue] = useState(pending);
  useEffect(() => {
    pendingListeners.add(setValue);
    setValue(pending);
    return () => {
      pendingListeners.delete(setValue);
    };
  }, []);
  return value;
}

// ------------------------------------------------------------------ opening the approval screen

const opened = new Set<string>();

/** Whether the screen tree that holds the approval screen is mounted (on a cold launch it comes up after the container). */
function walletStackMounted(state: any): boolean {
  if (!state?.routes) return false;
  return state.routes.some((route: any) => route.name === 'WalletsList' || walletStackMounted(route.state));
}

export function openApproval(authorizationId: string): void {
  const go = (attempt: number) => {
    if (navigationRef.isReady() && walletStackMounted(navigationRef.getRootState())) {
      if (navigationRef.getCurrentRoute()?.name !== 'AbtmKioskApproval') {
        (navigationRef as any).navigate('AbtmKioskApproval', { authorizationId });
      }
      return;
    }
    if (attempt < 60) setTimeout(() => go(attempt + 1), 250); // cold launch: wait for the wallet screens
  };
  go(0);
}

function handleTap(data: Record<string, any> | null | undefined): void {
  if (!data || data.type !== KIOSK_TYPE || typeof data.authorizationId !== 'string') return;
  if (opened.has(data.authorizationId)) return;
  opened.add(data.authorizationId);
  openApproval(data.authorizationId);
}

// ------------------------------------------------------------------ registration

let listening = false;
let sentToken: string | null = null;
let sendingToken: string | null = null; // iOS can report the same token twice at once

function sendToken(token: string, environment: 'production' | 'sandbox' | 'fcm'): void {
  if (!token || token === sentToken || token === sendingToken) return;
  sendingToken = token;
  pairedWalletApi
    .savePushToken(token, environment)
    .then(() => {
      sentToken = token;
    })
    .catch(e => console.debug('ABTM push token not saved:', e?.message))
    .finally(() => {
      sendingToken = null;
    });
}

const androidPushCapable = (): boolean => Platform.OS === 'android' && hasGmsSync();

function listenAndroid(): void {
  if (listening || !androidPushCapable()) return;
  listening = true;
  PushNotification.createChannel(
    {
      channelId: ANDROID_KIOSK_CHANNEL,
      channelName: 'ATM purchase approvals',
      channelDescription: 'Approve a purchase at our Bitcoin ATMs',
      importance: 4, // high: heads-up, the customer is standing at the kiosk
      vibrate: true,
    },
    () => {},
  );
  setAbtmPushHooks({
    onToken: token => sendToken(token, 'fcm'),
    onKioskNotification: handleTap,
  });
  // Install the shared handler so a tap (including one that cold-launched the app) is seen.
  checkNotifications()
    .then(({ status }) => (status === RESULTS.GRANTED ? configureNotifications() : false))
    .catch(() => {});
}

function listen(): void {
  if (Platform.OS === 'android') return listenAndroid();
  if (listening || Platform.OS !== 'ios') return;
  listening = true;
  PushNotificationIOS.addEventListener('register', (token: string) => {
    if (!token || token === sentToken || token === sendingToken) return;
    sendingToken = token;
    pairedWalletApi
      .savePushToken(token, __DEV__ ? 'sandbox' : 'production')
      .then(() => {
        sentToken = token;
      })
      .catch(e => console.debug('ABTM push token not saved:', e?.message))
      .finally(() => {
        sendingToken = null;
      });
  });
  PushNotificationIOS.addEventListener('registrationError', (error: { message: string }) => {
    console.debug('ABTM push registration failed:', error?.message);
  });
  PushNotificationIOS.addEventListener('notification', notification => {
    handleTap(notification.getData());
    notification.finish(PushNotificationIOS.FetchResult.NoData);
  });
  PushNotificationIOS.getInitialNotification()
    .then(notification => handleTap(notification?.getData()))
    .catch(() => {});
}

/** Listen for taps from app start, so a cold launch from a notification opens the approval. */
export function startAbtmPushListeners(): void {
  listen();
}

export type PushPermission = 'granted' | 'undetermined' | 'blocked' | 'unavailable';

export async function pushPermission(): Promise<PushPermission> {
  if (Platform.OS !== 'ios' && !androidPushCapable()) return 'unavailable';
  const { status } = await checkNotifications();
  if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) return 'granted';
  if (status === RESULTS.DENIED) return 'undetermined'; // never asked: iOS will show its prompt
  return 'blocked';
}

/**
 * Register for pushes. Shows iOS's permission prompt only when it was never
 * answered; when already granted it just (re)registers and re-sends the token.
 * Returns whether notifications are allowed.
 */
export async function enableAbtmPush(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (!androidPushCapable()) return false;
    listen();
    await AsyncStorage.setItem(PUSH_ASKED_KEY, '1').catch(() => {});
    sentToken = null; // after a new sign-in the server needs the token again
    const { status } = await requestNotifications(['alert', 'sound']); // no prompt below Android 13
    if (status !== RESULTS.GRANTED) return false;
    await configureNotifications(); // registers with FCM; the token arrives via the hook
    const token = getAbtmAndroidToken(); // already registered earlier in this launch
    if (token) sendToken(token, 'fcm');
    return true;
  }
  if (Platform.OS !== 'ios') return false;
  listen();
  await AsyncStorage.setItem(PUSH_ASKED_KEY, '1').catch(() => {});
  sentToken = null; // after a new sign-in the server needs the token again
  const permissions = await PushNotificationIOS.requestPermissions({ alert: true, badge: true, sound: true });
  return !!permissions?.alert;
}

/** Signed in again or app launched while eligible: re-send the token if permission was already given. */
export async function refreshAbtmPushIfAllowed(): Promise<void> {
  if ((await pushPermission()) === 'granted') await enableAbtmPush();
}

export async function hasAskedForPush(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_ASKED_KEY).catch(() => null)) === '1';
}
