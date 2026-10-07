import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from '@rneui/themed';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  enableAbtmPush,
  openApproval,
  PUSH_BANNER_DISMISSED_KEY,
  PushPermission,
  pushPermission,
  usePendingAuthorization,
} from '../blue_modules/abtm-push';
import { useAbtmAccount } from '../hooks/useAbtmAccount';
import loc from '../loc';
import { brand, cardShadow } from './brand';

function secondsLeft(expiresAt: string, now: number): number {
  const end = new Date(expiresAt).getTime();
  return isNaN(end) ? 0 : Math.max(0, Math.round((end - now) / 1000));
}

function formatLeft(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Home-screen banner for America Bitcoin kiosk approvals:
 * - red, when a Bitcoin ATM is waiting for the customer's OK (tap to open it);
 * - otherwise, once, a card offering notifications so a request reaches them
 *   when the app is closed (dismissable; hidden when notifications are on).
 */
const AbtmApprovalBanner: React.FC = () => {
  const { status, profile } = useAbtmAccount();
  const pending = usePendingAuthorization();
  const eligible = status === 'signed_in' && !!profile?.verification.verified && !!profile?.wallet.registered;
  const [now, setNow] = useState(Date.now());
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [dismissed, setDismissed] = useState(true);

  const waiting = pending && pending.status === 'pending_approval' && secondsLeft(pending.expiresAt, now) > 0 ? pending : null;

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  const refreshPermission = useCallback(() => {
    pushPermission()
      .then(setPermission)
      .catch(() => setPermission('unavailable'));
  }, []);

  useEffect(() => {
    if (!eligible) return;
    refreshPermission();
    AsyncStorage.getItem(PUSH_BANNER_DISMISSED_KEY)
      .then(value => setDismissed(value === '1'))
      .catch(() => setDismissed(false));
    const subscription = AppState.addEventListener('change', next => next === 'active' && refreshPermission());
    return () => subscription.remove();
  }, [eligible, refreshPermission]);

  if (!eligible) return null;

  if (waiting) {
    const left = secondsLeft(waiting.expiresAt, now);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${loc.abtm.banner_waiting_title}. ${loc.abtm.banner_waiting_action}`}
        testID="AbtmApprovalBanner"
        onPress={() => openApproval(waiting.id)}
        style={({ pressed }) => [styles.waiting, cardShadow, pressed && styles.pressed]}
      >
        <View style={styles.waitingIcon}>
          <Icon name="storefront-outline" type="ionicon" color={brand.greenDark} size={20} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.waitingTitle}>{loc.abtm.banner_waiting_title}</Text>
          <Text style={styles.waitingText}>{loc.formatString(loc.abtm.banner_waiting_detail, { time: formatLeft(left) })}</Text>
        </View>
        <Icon name="chevron-forward" type="ionicon" color="#ffffff" size={20} />
      </Pressable>
    );
  }

  if (dismissed || permission === null || permission === 'granted' || permission === 'unavailable') return null;

  const turnOn = async () => {
    if (permission === 'blocked') {
      Linking.openSettings();
      return;
    }
    await enableAbtmPush().catch(() => false);
    refreshPermission();
  };
  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(PUSH_BANNER_DISMISSED_KEY, '1').catch(() => {});
  };

  return (
    <View style={[styles.offer, cardShadow]} testID="AbtmPushOffer">
      <View style={styles.offerIcon}>
        <Icon name="notifications-outline" type="ionicon" color={brand.blue} size={20} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.offerTitle}>{loc.abtm.banner_push_title}</Text>
        <Text style={styles.offerText}>{loc.abtm.banner_push_text}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={turnOn} hitSlop={8} testID="AbtmPushOfferTurnOn">
          <Text style={styles.offerAction}>{permission === 'blocked' ? loc.abtm.banner_push_settings : loc.abtm.banner_push_turn_on}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={loc._.close} onPress={dismiss} hitSlop={10}>
        <Icon name="close" type="ionicon" color={brand.muted} size={18} />
      </TouchableOpacity>
    </View>
  );
};

export default AbtmApprovalBanner;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.green, // a waiting purchase is good news, not an error
    borderRadius: brand.radius,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  waitingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  waitingText: { color: 'rgba(255,255,255,0.88)', fontSize: 13.5, marginTop: 2 },
  offer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: brand.surface,
    borderRadius: brand.radius,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    gap: 12,
  },
  offerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: brand.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: { color: brand.blue, fontSize: 15.5, fontWeight: '800' },
  offerText: { color: brand.muted, fontSize: 13.5, lineHeight: 19, marginTop: 2 },
  offerAction: { color: brand.blue, fontSize: 14.5, fontWeight: '700', marginTop: 8, textDecorationLine: 'underline' },
});
