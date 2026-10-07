import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

import { ABTMPairedWallet } from '../../class';
import { BlueCard, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import { useStorage } from '../../hooks/context/useStorage';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { pairedWalletApi } from '../../blue_modules/paired-wallet-api';

type RouteProps = RouteProp<DetailViewStackParamList, 'PairedWalletSetup'>;

const PairedWalletSetup: React.FC = () => {
  const { walletID } = useRoute<RouteProps>().params;
  const { wallets, saveToDisk } = useStorage();
  const { colors } = useTheme();
  const wallet = wallets.find(item => item.getID() === walletID);
  const pairedWallet = wallet?.type === ABTMPairedWallet.type ? (wallet as ABTMPairedWallet) : null;

  const [baseUrl, setBaseUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [remoteWallet, setRemoteWallet] = useState<any>(null);

  const pendingAuthorization = useMemo(
    () => remoteWallet?.authorizations?.find((authorization: any) => authorization.status === 'pending') || null,
    [remoteWallet],
  );

  const localInfo = pairedWallet?.getPairedWalletInfo() || {};

  const persistRemoteWallet = useCallback(
    async (nextRemoteWallet: any, nextBaseUrl: string) => {
      if (!pairedWallet) return;
      await pairedWalletApi.applyRemoteWallet(pairedWallet, nextRemoteWallet, nextBaseUrl);
      await saveToDisk();
    },
    [pairedWallet, saveToDisk],
  );

  const refreshState = useCallback(async () => {
    if (!pairedWallet) return;
    setLoading(true);

    try {
      const configuredBaseUrl = await pairedWalletApi.getConfiguredBaseUrl();
      setBaseUrl(configuredBaseUrl);

      const session = await pairedWalletApi.getSession();
      if (session?.phone) setPhone(session.phone);

      if (session) {
        const [kycResponse, pairedWalletResponse] = await Promise.all([pairedWalletApi.getKycStatus(), pairedWalletApi.getPairedWallet()]);

        setKycStatus(kycResponse.kycStatus);
        setRemoteWallet(pairedWalletResponse.pairedWallet);
        await persistRemoteWallet(pairedWalletResponse.pairedWallet, configuredBaseUrl);
      } else {
        setKycStatus(null);
        setRemoteWallet(null);
      }
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setLoading(false);
      setBootstrapping(false);
    }
  }, [pairedWallet, persistRemoteWallet]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const handleSaveBaseUrl = useCallback(async () => {
    try {
      const nextBaseUrl = await pairedWalletApi.setConfiguredBaseUrl(baseUrl);
      setBaseUrl(nextBaseUrl);
      presentAlert({ message: 'ABTM server URL saved.' });
    } catch (error: any) {
      presentAlert({ message: error.message });
    }
  }, [baseUrl]);

  const handleRequestCode = useCallback(async () => {
    if (!phone.trim()) {
      presentAlert({ message: 'Enter the phone number linked to your ABTM customer record.' });
      return;
    }

    setLoading(true);
    try {
      await pairedWalletApi.setConfiguredBaseUrl(baseUrl);
      const response = await pairedWalletApi.requestCode(phone.trim(), baseUrl);
      if (response.debugCode) {
        setCode(response.debugCode);
        presentAlert({ message: `Debug code: ${response.debugCode}` });
      } else {
        presentAlert({ message: 'Verification code sent.' });
      }
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, phone]);

  const handleVerifyCode = useCallback(async () => {
    if (!phone.trim() || !code.trim()) {
      presentAlert({ message: 'Enter both your phone number and the SMS code.' });
      return;
    }

    setLoading(true);
    try {
      const response = await pairedWalletApi.verifyCode({
        phone: phone.trim(),
        code: code.trim(),
        baseUrl,
      });

      setKycStatus(response.kycStatus);
      setRemoteWallet(response.pairedWallet);
      await persistRemoteWallet(response.pairedWallet, baseUrl);
      presentAlert({ message: 'Phone verified for ABTM pairing.' });
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, code, phone, persistRemoteWallet]);

  const handleCreateKycSession = useCallback(async () => {
    setLoading(true);
    try {
      await pairedWalletApi.getKycSdkToken();
      const latestStatus = await pairedWalletApi.getKycStatus();
      setKycStatus(latestStatus.kycStatus);
      presentAlert({
        message:
          'KYC session prepared on the server. Native SumSub SDK launch still needs the SumSub mobile package installed in this wallet build.',
      });
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePairWallet = useCallback(async () => {
    if (!pairedWallet) return;

    setLoading(true);
    try {
      const response = await pairedWalletApi.registerPairedWallet(pairedWallet);
      setRemoteWallet(response.pairedWallet);
      await persistRemoteWallet(response.pairedWallet, baseUrl);
      presentAlert({ message: 'Wallet paired with ABTM.' });
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, pairedWallet, persistRemoteWallet]);

  const handleRevokePairing = useCallback(async () => {
    if (!pairedWallet) return;

    setLoading(true);
    try {
      await pairedWalletApi.revokePairedWallet();
      setRemoteWallet(null);
      pairedWallet.clearPairedWalletInfo();
      await saveToDisk();
      presentAlert({ message: 'Paired wallet revoked.' });
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [pairedWallet, saveToDisk]);

  const handleApproveAuthorization = useCallback(async () => {
    if (!pendingAuthorization) return;

    setLoading(true);
    try {
      await pairedWalletApi.approveAuthorization(pendingAuthorization.id);
      await refreshState();
      presentAlert({ message: 'Kiosk session approved.' });
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [pendingAuthorization, refreshState]);

  if (!pairedWallet) {
    return (
      <SafeAreaScrollView>
        <BlueCard>
          <BlueText>This wallet is not eligible for ABTM paired-wallet enrollment.</BlueText>
        </BlueCard>
      </SafeAreaScrollView>
    );
  }

  if (bootstrapping) {
    return (
      <SafeAreaScrollView centerContent>
        <BlueLoading />
      </SafeAreaScrollView>
    );
  }

  const styles = StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
      borderRadius: 6,
      paddingHorizontal: 12,
      height: 44,
      color: colors.foregroundColor,
    },
    label: {
      color: colors.feeText,
      fontWeight: '500',
      marginBottom: 8,
    },
    value: {
      color: colors.outputValue,
    },
  });

  return (
    <SafeAreaScrollView centerContent={loading}>
      {loading ? (
        <BlueLoading />
      ) : (
        <>
          <BlueCard>
            <BlueText style={styles.label}>ABTM server URL</BlueText>
            <TextInput autoCapitalize="none" autoCorrect={false} style={styles.input} value={baseUrl} onChangeText={setBaseUrl} />
            <BlueSpacing20 />
            <Button title="Save server URL" onPress={handleSaveBaseUrl} />
          </BlueCard>

          <BlueCard>
            <BlueText style={styles.label}>ABTM login</BlueText>
            <TextInput keyboardType="phone-pad" style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1..." />
            <BlueSpacing10 />
            <TextInput keyboardType="number-pad" style={styles.input} value={code} onChangeText={setCode} placeholder="SMS code" />
            <BlueSpacing20 />
            <Button title="Send SMS code" onPress={handleRequestCode} />
            <BlueSpacing10 />
            <SecondButton title="Verify phone" onPress={handleVerifyCode} />
          </BlueCard>

          <BlueCard>
            <BlueText style={styles.label}>KYC status</BlueText>
            <BlueText style={styles.value}>{kycStatus?.answer || 'NOT_CONNECTED'}</BlueText>
            {kycStatus?.applicantId ? (
              <>
                <BlueSpacing10 />
                <BlueText style={styles.label}>Applicant ID</BlueText>
                <BlueText style={styles.value}>{kycStatus.applicantId}</BlueText>
              </>
            ) : null}
            <BlueSpacing20 />
            <SecondButton title="Prepare KYC session" onPress={handleCreateKycSession} />
          </BlueCard>

          <BlueCard>
            <BlueText style={styles.label}>Pairing status</BlueText>
            <BlueText style={styles.value}>{remoteWallet?.status || localInfo.status || 'not_paired'}</BlueText>
            <BlueSpacing10 />
            <BlueText style={styles.label}>Registration address</BlueText>
            <BlueText style={styles.value}>
              {remoteWallet?.currentAddress?.address || localInfo.currentAddress || pairedWallet.getRegistrationAddress()}
            </BlueText>
            <BlueSpacing10 />
            <BlueText style={styles.label}>Descriptor fingerprint</BlueText>
            <BlueText style={styles.value}>{pairedWallet.getMasterFingerprintHex()}</BlueText>
            <BlueSpacing20 />
            <Button title="Pair this wallet" onPress={handlePairWallet} />
            <BlueSpacing10 />
            <SecondButton title="Revoke pairing" onPress={handleRevokePairing} />
          </BlueCard>

          <BlueCard>
            <BlueText style={styles.label}>Kiosk authorization</BlueText>
            <BlueText style={styles.value}>
              {pendingAuthorization ? `Pending: ${pendingAuthorization.id}` : localInfo.authorizationStatus || 'No pending kiosk session'}
            </BlueText>
            <BlueSpacing20 />
            <Button title="Refresh status" onPress={refreshState} />
            {pendingAuthorization ? (
              <>
                <BlueSpacing10 />
                <SecondButton title="Approve pending kiosk session" onPress={handleApproveAuthorization} />
              </>
            ) : null}
          </BlueCard>

          {loading ? <ActivityIndicator /> : null}
        </>
      )}
    </SafeAreaScrollView>
  );
};

export default PairedWalletSetup;
