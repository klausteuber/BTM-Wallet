import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../components/Button';
import { SecondButton } from '../../components/SecondButton';
import ListItem from '../../components/ListItem';
import presentAlert from '../../components/Alert';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useAbtmAccount } from '../../hooks/useAbtmAccount';
import { AbtmApiError, DEFAULT_API_BASE_URL, pairedWalletApi } from '../../blue_modules/paired-wallet-api';
import {
  isAbtmWallet,
  newAbtmWallet,
  nextReceiveAddress,
  RegistrableWallet,
  registrableWallets,
  registrationAddress,
  registeredWalletOnPhone,
} from '../../blue_modules/abtm-wallet';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { Body, Card, ErrorText, formatDate, Gap, Label, Pill, Title } from './ui';

const DEV_SERVER = 'http://localhost:5121';

/** The America Bitcoin account: profile, ID verification, the registered wallet, approvals, activity. */
const AbtmAccount: React.FC = () => {
  const { colors } = useTheme();
  const { navigate } = useExtendedNavigation();
  const { wallets, addWallet, saveToDisk } = useStorage();
  const account = useAbtmAccount();
  const { profile } = account;
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [server, setServer] = useState(DEFAULT_API_BASE_URL);

  useEffect(() => {
    if (__DEV__) pairedWalletApi.getConfiguredBaseUrl().then(setServer);
  }, []);

  // Debug builds only: point the app at a local account service (ACCOUNT_DEV_CODES=1, port 5121).
  const toggleServer = async () => {
    const next = server === DEFAULT_API_BASE_URL ? DEV_SERVER : DEFAULT_API_BASE_URL;
    setServer(await pairedWalletApi.setConfiguredBaseUrl(next));
  };

  useFocusEffect(
    useCallback(() => {
      account.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await account.refresh();
    setRefreshing(false);
  };

  const registered = profile?.wallet.registered ? profile.wallet.firstAddress : null;
  const onPhone = registeredWalletOnPhone(wallets, registered);
  // America Bitcoin wallets first, then standard wallets made by earlier versions of the app.
  const unregistered = registrableWallets(wallets).filter(w => !registered || registrationAddress(w) !== registered);

  const register = async (wallet: RegistrableWallet, isNew: boolean) => {
    setBusy(true);
    try {
      // An existing wallet may not have been refreshed this session: find its first unused
      // receive address so the server never hands a kiosk one the wallet already received to.
      if (!isNew) await wallet.fetchBalance();
      await pairedWalletApi.registerPairedWallet(wallet);
      await saveToDisk();
      await account.refresh();
      if (isNew) navigate('AddWalletRoot', { screen: 'PleaseBackup', params: { walletID: wallet.getID() } });
    } catch (e: any) {
      if (e instanceof AbtmApiError && e.code === 'biometric_cancelled') return;
      presentAlert({ message: e.message });
    } finally {
      setBusy(false);
    }
  };

  const createWallet = async () => {
    setBusy(true);
    let wallet: RegistrableWallet;
    try {
      wallet = await newAbtmWallet();
      addWallet(wallet);
      await saveToDisk();
    } catch (e: any) {
      setBusy(false);
      presentAlert({ message: e.message });
      return;
    }
    // Saved locally first: if registration is cancelled the customer still has the wallet.
    await register(wallet, true);
  };

  const confirmReplace = () =>
    presentAlert({
      title: loc.abtm.wallet_replace_title,
      message: loc.abtm.wallet_replace_message,
      buttons: [
        { text: loc._.cancel, style: 'cancel' },
        { text: loc.abtm.wallet_create_new, style: 'destructive', onPress: createWallet },
      ],
    });

  // A customer who already has a wallet on this phone is told the new one is separate.
  const confirmCreateInstead = () =>
    presentAlert({
      title: loc.abtm.wallet_create_instead_title,
      message: loc.abtm.wallet_create_instead_message,
      buttons: [
        { text: loc._.cancel, style: 'cancel' },
        { text: loc.abtm.wallet_create_new, onPress: createWallet },
      ],
    });

  const signOut = () =>
    presentAlert({
      title: loc.abtm.sign_out_title,
      message: loc.abtm.sign_out_message,
      buttons: [
        { text: loc._.cancel, style: 'cancel' },
        { text: loc.abtm.sign_out, style: 'destructive', onPress: () => account.signOut() },
      ],
    });

  if (account.status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: colors.elevated }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (account.status === 'signed_out') {
    return (
      <ScrollView style={{ backgroundColor: colors.elevated }} contentContainerStyle={styles.scroll}>
        <Card>
          <Title>{loc.abtm.account_title}</Title>
          <Body muted>{loc.abtm.signed_out_intro}</Body>
          <Gap />
          <Button testID="AbtmSignInButton" title={loc.abtm.sign_in_or_create} onPress={() => navigate('AbtmSignIn')} />
        </Card>
        {__DEV__ ? (
          <Card>
            <Label>Server (debug builds only)</Label>
            <Body selectable>{server}</Body>
            <Gap size={10} />
            <SecondButton title="Switch server" onPress={toggleServer} testID="AbtmDevServer" />
          </Card>
        ) : null}
      </ScrollView>
    );
  }

  const verification = profile?.verification;
  const needsDevice = !!verification?.identityLinked && !verification.verified;
  const walletCard = (() => {
    if (!profile) return null;
    if (needsDevice) {
      return (
        <>
          <Body>{loc.abtm.wallet_device_needed}</Body>
          <Gap size={12} />
          <Button title={loc.abtm.confirm_on_phone} onPress={() => navigate('AbtmVerifyId')} testID="AbtmWalletConfirmDevice" />
        </>
      );
    }
    if (registered && onPhone) {
      const address = nextReceiveAddress(onPhone);
      return (
        <>
          <Pill tone="good">{loc.abtm.wallet_registered}</Pill>
          <Gap size={10} />
          <Label>{loc.abtm.receive_address}</Label>
          <Body selectable testID="AbtmReceiveAddress">
            {address}
          </Body>
          <Gap size={12} />
          <SecondButton
            title={loc.abtm.show_qr}
            onPress={() => navigate('ReceiveDetails', { walletID: onPhone.getID(), address })}
            testID="AbtmShowQr"
          />
        </>
      );
    }
    if (registered) {
      return (
        <>
          <Body>{loc.formatString(loc.abtm.wallet_elsewhere, { address: `${registered.slice(0, 8)}…${registered.slice(-6)}` })}</Body>
          <Gap size={12} />
          <SecondButton title={loc.abtm.wallet_create_new} onPress={confirmReplace} disabled={busy} />
        </>
      );
    }
    if (unregistered.length > 0) {
      const single = unregistered.length === 1;
      const describe = (w: RegistrableWallet) => ({
        label: w.getLabel(),
        balance: formatBalance(Number(w.getBalance()) || 0, BitcoinUnit.BTC, true),
      });
      const intro = isAbtmWallet(unregistered[0])
        ? loc.formatString(loc.abtm.wallet_register_existing, { label: unregistered[0].getLabel() })
        : single
          ? loc.formatString(loc.abtm.wallet_register_legacy, describe(unregistered[0]))
          : loc.abtm.wallet_register_legacy_many;
      return (
        <>
          <Body>{intro}</Body>
          {unregistered.some(w => !isAbtmWallet(w)) ? (
            <>
              <Gap size={8} />
              <Body muted>{loc.abtm.wallet_register_legacy_note}</Body>
            </>
          ) : null}
          {unregistered.map((w, i) => (
            <React.Fragment key={w.getID()}>
              <Gap size={12} />
              <Button
                title={single ? loc.abtm.wallet_register : (loc.formatString(loc.abtm.wallet_register_named, describe(w)) as string)}
                onPress={() => register(w, false)}
                disabled={busy}
                testID={i === 0 ? 'AbtmRegisterWallet' : `AbtmRegisterWallet${i}`}
              />
            </React.Fragment>
          ))}
          <Gap size={12} />
          <SecondButton title={loc.abtm.wallet_create_instead} onPress={confirmCreateInstead} disabled={busy} testID="AbtmCreateInstead" />
        </>
      );
    }
    return (
      <>
        <Body>{loc.abtm.wallet_create_intro}</Body>
        <Gap size={12} />
        <Button title={loc.abtm.wallet_create} onPress={createWallet} disabled={busy} testID="AbtmCreateWallet" />
      </>
    );
  })();

  return (
    <ScrollView
      style={{ backgroundColor: colors.elevated }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {account.error && !profile ? (
        <Card>
          <ErrorText>{account.error}</ErrorText>
        </Card>
      ) : null}
      {profile ? (
        <Card testID="AbtmProfile">
          <Title>{profile.firstName ? loc.formatString(loc.abtm.hello_name, { name: profile.firstName }) : loc.abtm.account_title}</Title>
          <Label>{loc.abtm.phone_label}</Label>
          <Body>{profile.maskedPhone}</Body>
          <Gap size={10} />
          <Label>{loc.abtm.email_label}</Label>
          <Body>{profile.maskedEmail}</Body>
          {profile.createdAt ? (
            <>
              <Gap size={10} />
              <Body muted>{loc.formatString(loc.abtm.member_since, { date: formatDate(profile.createdAt) })}</Body>
            </>
          ) : null}
        </Card>
      ) : (
        <ActivityIndicator style={styles.spinner} />
      )}

      {profile ? (
        <Card testID="AbtmIdCard">
          <Title>{loc.abtm.id_title}</Title>
          {verification?.verified ? (
            <>
              <Pill tone="good">{loc.abtm.id_verified}</Pill>
              <Gap size={10} />
              <Body muted>
                {verification.method === 'kyc'
                  ? loc.formatString(loc.abtm.id_verified_on, { date: formatDate(verification.verifiedAt) })
                  : loc.formatString(loc.abtm.id_linked_from, { source: verification.source || '' })}
              </Body>
            </>
          ) : needsDevice ? (
            <>
              <Pill tone="warn">{loc.abtm.id_confirm_needed}</Pill>
              <Gap size={10} />
              <Body muted>{loc.abtm.device_intro}</Body>
              <Gap size={12} />
              <Button title={loc.abtm.confirm_on_phone} onPress={() => navigate('AbtmVerifyId')} testID="AbtmConfirmDevice" />
            </>
          ) : (
            <>
              <Pill tone="neutral">{loc.abtm.id_not_verified}</Pill>
              <Gap size={10} />
              <Body muted>{loc.abtm.id_why}</Body>
              <Gap size={12} />
              <Button title={loc.abtm.verify_id} onPress={() => navigate('AbtmVerifyId')} testID="AbtmVerifyIdButton" />
            </>
          )}
        </Card>
      ) : null}

      {profile ? (
        <Card testID="AbtmWalletCard">
          <Title>{loc.abtm.wallet_title}</Title>
          {walletCard}
          {busy ? <ActivityIndicator style={styles.spinner} /> : null}
        </Card>
      ) : null}

      <Gap />
      <ListItem title={loc.abtm.kiosk_approvals} onPress={() => navigate('AbtmKioskApproval', {})} chevron testID="AbtmApprovalsRow" />
      <ListItem title={loc.abtm.activity_title} onPress={() => navigate('AbtmActivity')} chevron testID="AbtmActivityRow" />
      <Gap />
      <View style={styles.signOut}>
        <SecondButton title={loc.abtm.sign_out} onPress={signOut} testID="AbtmSignOut" />
      </View>
    </ScrollView>
  );
};

export default AbtmAccount;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  spinner: { marginTop: 16 },
  signOut: { marginHorizontal: 16 },
});
