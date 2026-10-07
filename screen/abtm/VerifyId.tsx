import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet } from 'react-native';
import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';
import Button from '../../components/Button';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { refreshAbtmAccount } from '../../hooks/useAbtmAccount';
import { KycOptions, pairedWalletApi } from '../../blue_modules/paired-wallet-api';
import loc from '../../loc';
import AgreeRow from './AgreeRow';
import { Body, Card, ErrorText, Gap, Label, Title } from './ui';

type Flow = 'link' | 'kyc';
type Outcome = 'linked' | 'reviewing' | 'failed' | 'expired' | 'rejected' | 'unfinished' | 'retry';

const POLL_MS = 2000;
const POLL_TRIES = 30; // ~1 minute after SumSub closes; a manual review can take longer

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Native ID verification with SumSub's MobileSDK (the website's /verify, in the app):
 * link an approved verification from a kiosk or the Teller desk with a selfie, or
 * verify from scratch with a photo ID and a selfie. Both require the biometric
 * consent wording the server sends, and the server records the version agreed to.
 */
const AbtmVerifyId: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useExtendedNavigation();
  const [options, setOptions] = useState<KycOptions | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOptions(await pairedWalletApi.getKycOptions());
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const launch = async (accessToken: string, refresh: () => Promise<string>) => {
    const sdk = SNSMobileSDK.init(accessToken, refresh).withLocale('en').withAnalyticsEnabled(false).build();
    return sdk.launch();
  };

  const pollLink = async (attemptId: string): Promise<Outcome> => {
    for (let i = 0; i < POLL_TRIES && mounted.current; i++) {
      const state = await pairedWalletApi.getSelfieLinkStatus(attemptId);
      if (state === 'linked' || state === 'failed' || state === 'expired') return state;
      await sleep(POLL_MS);
    }
    return 'reviewing';
  };

  const pollKyc = async (): Promise<Outcome> => {
    for (let i = 0; i < POLL_TRIES && mounted.current; i++) {
      const state = await pairedWalletApi.getIdVerificationStatus();
      if (state === 'linked' || state === 'rejected' || state === 'retry') return state;
      if (state === 'existing') return 'unfinished'; // a duplicate whose original is now linkable: reload options
      if (state === 'pending') return 'unfinished'; // the customer closed SumSub before submitting
      await sleep(POLL_MS);
    }
    return 'reviewing';
  };

  const start = async (flow: Flow) => {
    if (!options) return;
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      let result: Outcome;
      if (flow === 'link') {
        const { attemptId, accessToken } = await pairedWalletApi.startSelfieLink(options.consent.version);
        await launch(accessToken, () => pairedWalletApi.refreshSelfieLinkToken(attemptId));
        result = await pollLink(attemptId);
      } else {
        const { accessToken } = await pairedWalletApi.startIdVerification(options.consent.version);
        await launch(accessToken, () => pairedWalletApi.refreshIdVerificationToken());
        result = await pollKyc();
      }
      if (!mounted.current) return;
      if (result === 'linked') await refreshAbtmAccount();
      if (result === 'unfinished' || result === 'retry') {
        await load();
        setAgreed(false);
      }
      setOutcome(result);
    } catch (e: any) {
      if (mounted.current) setError(e.message);
      await load();
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const consent = options ? (
    <>
      <Gap />
      <Label>{loc.abtm.consent_label}</Label>
      <Body muted>{options.consent.text}</Body>
      <Gap size={10} />
      <AgreeRow testID="AbtmConsent" value={agreed} onChange={setAgreed} label={loc.abtm.consent_agree} />
    </>
  ) : null;

  const supportPhone = options?.supportPhone || '888-437-7582';
  const callUs = (
    <SecondButton
      title={loc.formatString(loc.abtm.call_us, { phone: supportPhone }) as string}
      onPress={() => Linking.openURL(`tel:${supportPhone}`)}
    />
  );

  const outcomeCard = outcome ? (
    <Card>
      {outcome === 'linked' ? (
        <>
          <Title>{loc.abtm.verify_done_title}</Title>
          <Body>{loc.abtm.verify_done}</Body>
          <Gap />
          <Button title={loc._.ok} onPress={() => navigation.goBack()} testID="AbtmVerifyDone" />
        </>
      ) : outcome === 'reviewing' ? (
        <Body>{loc.abtm.verify_reviewing}</Body>
      ) : outcome === 'failed' ? (
        <Body>{loc.abtm.verify_selfie_failed}</Body>
      ) : outcome === 'expired' ? (
        <Body>{loc.abtm.verify_expired}</Body>
      ) : outcome === 'rejected' ? (
        <>
          <Body>{loc.abtm.verify_rejected}</Body>
          <Gap />
          {callUs}
        </>
      ) : (
        <Body>{loc.abtm.verify_unfinished}</Body>
      )}
    </Card>
  ) : null;

  let body: React.ReactNode = null;
  if (options && outcome !== 'linked') {
    switch (options.state) {
      case 'linked':
        body = (
          <Card>
            <Title>{loc.abtm.verify_done_title}</Title>
            <Body>{loc.formatString(loc.abtm.id_linked_from, { source: options.source || '' })}</Body>
          </Card>
        );
        break;
      case 'device':
        body = (
          <Card>
            <Title>{loc.abtm.device_title}</Title>
            <Body>{loc.abtm.device_intro}</Body>
            {consent}
            <Gap />
            <Button title={loc.abtm.take_selfie} onPress={() => start('link')} disabled={busy || !agreed} testID="AbtmDeviceSelfie" />
          </Card>
        );
        break;
      case 'found':
        body = (
          <Card>
            <Title>{loc.abtm.verify_found_title}</Title>
            <Body>{loc.formatString(loc.abtm.verify_found, { source: options.source || '' })}</Body>
            {consent}
            <Gap />
            <Button title={loc.abtm.take_selfie} onPress={() => start('link')} disabled={busy || !agreed} testID="AbtmTakeSelfie" />
          </Card>
        );
        break;
      case 'kyc_offer':
      case 'kyc_retry':
      case 'kyc_resume':
        body = (
          <Card>
            <Title>{loc.abtm.verify_title}</Title>
            <Body>
              {options.state === 'kyc_retry'
                ? loc.abtm.verify_retry
                : options.state === 'kyc_resume'
                  ? loc.abtm.verify_resume
                  : loc.abtm.verify_intro}
            </Body>
            {consent}
            <Gap />
            <Button title={loc.abtm.verify_start} onPress={() => start('kyc')} disabled={busy || !agreed} testID="AbtmStartKyc" />
          </Card>
        );
        break;
      case 'reviewing':
        body = (
          <Card>
            <Title>{loc.abtm.verify_title}</Title>
            <Body>{loc.abtm.verify_reviewing}</Body>
          </Card>
        );
        break;
      case 'rejected':
        body = (
          <Card>
            <Title>{loc.abtm.verify_title}</Title>
            <Body>{loc.abtm.verify_rejected}</Body>
            <Gap />
            {callUs}
          </Card>
        );
        break;
      default:
        body = (
          <Card>
            <Title>{loc.abtm.verify_title}</Title>
            <Body>{loc.abtm.verify_unavailable}</Body>
          </Card>
        );
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.elevated }} contentContainerStyle={styles.scroll}>
      {!options && !error ? <ActivityIndicator style={styles.spinner} /> : null}
      {outcomeCard}
      {body}
      {busy ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? (
        <Card>
          <ErrorText>{error}</ErrorText>
        </Card>
      ) : null}
    </ScrollView>
  );
};

export default AbtmVerifyId;

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  spinner: { marginTop: 24 },
});
