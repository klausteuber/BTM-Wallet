import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import Button from '../../components/Button';
import { SecondButton } from '../../components/SecondButton';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { AbtmApiError, KioskAuthorization, pairedWalletApi } from '../../blue_modules/paired-wallet-api';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { brand } from '../../components/brand';
import loc from '../../loc';
import { Body, Card, ErrorText, Gap, Label, Pill, Title } from './ui';

export const KIOSK_POLL_MS = 2000;

type Route = RouteProp<DetailViewStackParamList, 'AbtmKioskApproval'>;

function secondsLeft(iso: string, now: number): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * "Approve purchase at <store>": the request a Bitcoin ATM sends after the customer
 * signs in there with their phone number (Chainlogic spec, "Verified Wallet at the
 * Kiosk"). 2 minutes to approve; only after Approve, signed by this phone's key,
 * does the kiosk learn the full address. Polled while this screen is open.
 */
const AbtmKioskApproval: React.FC = () => {
  const navigation = useExtendedNavigation();
  const route = useRoute<Route>();
  const [item, setItem] = useState<KioskAuthorization | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsId, setNeedsId] = useState(false);
  const [now, setNow] = useState(Date.now());
  const watching = useRef<string | null>(route.params?.authorizationId || null);

  const poll = useCallback(async () => {
    try {
      let next: KioskAuthorization | null = null;
      if (watching.current) {
        next = await pairedWalletApi.getAuthorization(watching.current);
        // Once this one is over, pick up any newer pending request.
        if (next.status !== 'pending_approval' && next.status !== 'approved') {
          const pending = await pairedWalletApi.listAuthorizations();
          if (pending.length > 0 && pending[0].id !== next.id) next = pending[0];
        }
      } else {
        next = (await pairedWalletApi.listAuthorizations())[0] || null;
      }
      if (next) watching.current = next.id;
      setItem(next);
      setError(null);
    } catch (e: any) {
      if (!(e instanceof AbtmApiError && e.code === 'network')) setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      poll();
      const timer = setInterval(poll, KIOSK_POLL_MS);
      return () => clearInterval(timer);
    }, [poll]),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const act = async (approve: boolean) => {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      const updated = approve ? await pairedWalletApi.approveAuthorization(item.id) : await pairedWalletApi.declineAuthorization(item.id);
      setItem(updated);
      triggerHapticFeedback(approve ? HapticFeedbackTypes.NotificationSuccess : HapticFeedbackTypes.NotificationWarning);
    } catch (e: any) {
      if (e instanceof AbtmApiError && e.code === 'biometric_cancelled') return;
      if (e instanceof AbtmApiError && e.code === 'identity_not_verified') setNeedsId(true);
      setError(e.message);
      poll();
    } finally {
      setBusy(false);
    }
  };

  // The store's name ("Cottonwood Mall"), never our internal location code.
  const store = item?.locationName || loc.abtm.kiosk_unknown_store;
  let content: React.ReactNode;
  if (!loaded) {
    content = <ActivityIndicator style={styles.spinner} />;
  } else if (!item) {
    content = (
      <Card>
        <Title>{loc.abtm.kiosk_none_title}</Title>
        <Body muted>{loc.abtm.kiosk_none}</Body>
      </Card>
    );
  } else if (item.status === 'pending_approval') {
    const left = secondsLeft(item.expiresAt, now);
    content = (
      <Card testID="AbtmKioskPending">
        <Title>{loc.formatString(loc.abtm.kiosk_approve_title, { store })}</Title>
        <Body>{loc.formatString(loc.abtm.kiosk_goes_to, { address: item.maskedAddress || '' })}</Body>
        <Gap size={12} />
        <Pill tone={left > 30 ? 'neutral' : 'warn'}>{loc.formatString(loc.abtm.kiosk_time_left, { time: clock(left) })}</Pill>
        <Gap size={12} />
        <Body muted>{loc.abtm.kiosk_only_if_there}</Body>
        <Gap />
        <Button
          testID="AbtmApprove"
          title={loc.abtm.kiosk_approve}
          onPress={() => act(true)}
          disabled={busy || left === 0}
          backgroundColor={brand.green}
          buttonTextColor="#ffffff"
        />
        <Gap size={10} />
        <SecondButton testID="AbtmDecline" title={loc.abtm.kiosk_decline} onPress={() => act(false)} disabled={busy} />
      </Card>
    );
  } else if (item.status === 'approved') {
    content = (
      <Card testID="AbtmKioskApproved">
        <Pill tone="good">{loc.abtm.kiosk_approved}</Pill>
        <Gap size={10} />
        <Title>{loc.abtm.kiosk_continue_title}</Title>
        <Body>{loc.formatString(loc.abtm.kiosk_continue, { store })}</Body>
        <Gap size={12} />
        <Label>{loc.abtm.kiosk_sending_to}</Label>
        <Body selectable>{item.address || ''}</Body>
      </Card>
    );
  } else {
    const message =
      item.status === 'completed'
        ? loc.abtm.kiosk_completed
        : item.status === 'declined'
          ? loc.abtm.kiosk_declined
          : item.status === 'expired'
            ? loc.abtm.kiosk_expired
            : loc.abtm.kiosk_cancelled;
    content = (
      <Card>
        <Title>{item?.locationName || loc.abtm.kiosk_purchase_title}</Title>
        <Body>{message}</Body>
        <Gap />
        <SecondButton title={loc._.ok} onPress={() => navigation.goBack()} />
      </Card>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
      {content}
      {error ? (
        <Card>
          <ErrorText>{error}</ErrorText>
          {needsId ? (
            <View>
              <Gap size={12} />
              <Button title={loc.abtm.verify_id} onPress={() => navigation.navigate('AbtmVerifyId')} />
            </View>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
};

export default AbtmKioskApproval;

const styles = StyleSheet.create({
  page: { backgroundColor: brand.page },
  scroll: { paddingTop: 16, paddingBottom: 40 },
  spinner: { marginTop: 24 },
});
