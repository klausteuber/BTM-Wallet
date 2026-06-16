import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Alert,
  BackHandler,
  InteractionManager,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@rneui/themed';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { majorTomToGroundControl, tryToObtainPermissions } from '../../blue_modules/notifications';
import { BlueButtonLink, BlueCard, BlueText } from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import presentAlert from '../../components/Alert';
import * as AmountInput from '../../components/AmountInput';
import BottomModal, { BottomModalHandle } from '../../components/BottomModal';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import QRCodeComponent from '../../components/QRCodeComponent';
import SegmentedControl from '../../components/SegmentControl';
import { useTheme } from '../../components/themes';
import TipBox from '../../components/TipBox';
import { TransactionPendingIconBig } from '../../components/TransactionPendingIconBig';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { SuccessView } from '../send/success';
import { BlueSpacing20, BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { ATM_RECEIVE_QR_FULLSCREEN_SIZE, getReceiveQRCodeSize } from './receiveQrSizing';

const segmentControlValues = [loc.wallets.details_address, loc.bip47.payment_code];
const AMERICA_BLUE = '#040766';
const AMERICA_RED = '#ED122E';

type StickyHeaderProps = {
  wallet: any;
  isBIP47Enabled: boolean;
  tabValues: string[];
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  backgroundColor: string;
};

const StickyHeader = React.memo(({ wallet, isBIP47Enabled, tabValues, currentTab, setCurrentTab, backgroundColor }: StickyHeaderProps) => {
  if (!wallet || !isBIP47Enabled) return null;

  return (
    <View style={[styles.tabsContainer, { backgroundColor }]}>
      <SegmentedControl
        values={tabValues}
        selectedIndex={tabValues.findIndex(tab => tab === currentTab)}
        onChange={index => {
          setCurrentTab(tabValues[index]);
        }}
      />
    </View>
  );
});

type AtmActionButtonProps = {
  title: string;
  iconName: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'alert';
};

const AtmActionButton = ({ title, iconName, onPress, variant = 'secondary' }: AtmActionButtonProps) => {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isAlert = variant === 'alert';
  const backgroundColor = isPrimary ? AMERICA_BLUE : isAlert ? AMERICA_RED : (colors.lightButton ?? '#F4F6FB');
  const borderColor = isPrimary || isAlert ? backgroundColor : (colors.lightBorder ?? '#D9DAE5');
  const textColor = isPrimary || isAlert ? '#FFFFFF' : AMERICA_BLUE;
  const iconBubbleColor = isPrimary || isAlert ? 'rgba(255,255,255,0.18)' : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.atmActionButton,
        { backgroundColor, borderColor, opacity: pressed ? 0.86 : 1 },
        isPrimary || isAlert ? styles.atmActionButtonElevated : null,
      ]}
    >
      <View style={[styles.atmActionIconBubble, { backgroundColor: iconBubbleColor }]}>
        <Icon color={textColor} name={iconName} size={18} type="ionicon" />
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.atmActionButtonText, { color: textColor }]}>
        {title}
      </Text>
    </Pressable>
  );
};

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'ReceiveDetails'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'ReceiveDetails'>;

const ReceiveDetails = () => {
  const { walletID, address, entryPoint = 'advanced' } = useRoute<RouteProps>().params;
  const { wallets, saveToDisk, sleep, fetchAndSaveWalletTransactions } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState<BitcoinUnit>(BitcoinUnit.BTC);
  const [bip21encoded, setBip21encoded] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [tempCustomLabel, setTempCustomLabel] = useState('');
  const [tempCustomAmount, setTempCustomAmount] = useState('');
  const [tempCustomUnit, setTempCustomUnit] = useState<BitcoinUnit>(BitcoinUnit.BTC);
  const [showPendingBalance, setShowPendingBalance] = useState(false);
  const [showConfirmedBalance, setShowConfirmedBalance] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [currentTab, setCurrentTab] = useState(segmentControlValues[0]);
  const bottomModalRef = useRef<BottomModalHandle | null>(null);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [eta, setEta] = useState('');
  const [initialConfirmed, setInitialConfirmed] = useState(0);
  const [initialUnconfirmed, setInitialUnconfirmed] = useState(0);
  const [displayBalance, setDisplayBalance] = useState('');
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const [isAtmQrVisible, setIsAtmQrVisible] = useState(false);
  const [isWalletBackedUp, setIsWalletBackedUp] = useState(false);
  const [hasCopiedAtmAddress, setHasCopiedAtmAddress] = useState(false);
  // Unified receive: every entry point now uses the scan-optimized "ATM" layout, so this is always true.
  // (Kept as a named flag so the layout branches below stay readable and easy to revert per-section.)
  const isAtmMode = true;
  // The forced seed-backup flow stays scoped to wallets created through the ATM onboarding flow.
  const isAtmOnboarding = entryPoint === 'atm';
  const allowAtmExitRef = useRef(false);
  const hasShownDepositReminderRef = useRef(false);
  const copiedAddressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigation = useExtendedNavigation<NavigationProps>();
  const { goBack, setParams, setOptions } = navigation;

  const wallet = walletID ? wallets.find(w => w.getID() === walletID) : undefined;
  const isBIP47Enabled = wallet?.isBIP47Enabled();

  const stylesHook = StyleSheet.create({
    customAmount: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    customAmountText: {
      color: colors.foregroundColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    amount: {
      color: colors.foregroundColor,
    },
    label: {
      color: colors.foregroundColor,
    },
    modalButton: {
      backgroundColor: colors.modalButton,
    },
    atmHint: {
      color: colors.alternativeTextColor,
    },
    atmPanel: {
      borderColor: colors.lightBorder,
      backgroundColor: colors.elevated,
    },
    atmBadgeText: {
      color: '#FFFFFF',
    },
    atmBackupBody: {
      color: colors.alternativeTextColor,
    },
    atmAddressCard: {
      backgroundColor: colors.lightButton ?? '#F4F6FB',
      borderColor: colors.lightBorder,
    },
    atmAddressLabel: {
      color: colors.alternativeTextColor,
    },
    atmAddressValue: {
      color: colors.foregroundColor,
    },
    atmBackupCard: {
      backgroundColor: colors.elevated,
      borderColor: colors.lightBorder,
    },
    atmModalOverlay: {
      backgroundColor: colors.foregroundColor === '#ffffff' ? 'rgba(4, 7, 102, 0.96)' : 'rgba(4, 7, 102, 0.98)',
    },
    atmContentTop: {
      paddingTop: insets.top + 8,
    },
    atmCloseButton: {
      top: insets.top + 6,
    },
    atmFullscreenTop: {
      paddingTop: insets.top + 16,
    },
  });

  useEffect(() => {
    setIsWalletBackedUp(wallet?.getUserHasSavedExport() ?? false);
  }, [wallet]);

  useEffect(() => {
    return () => {
      if (copiedAddressTimeoutRef.current) {
        clearTimeout(copiedAddressTimeoutRef.current);
      }
    };
  }, []);

  const setAddressBIP21Encoded = useCallback(
    (addr: string) => {
      const newBip21encoded = DeeplinkSchemaMatch.bip21encode(addr);
      setParams({ address: addr });
      setBip21encoded(newBip21encoded);
      setShowAddress(true);
    },
    [setParams],
  );

  const obtainWalletAddress = useCallback(async () => {
    console.debug('ReceiveDetails - componentDidMount');
    // this function should only be called when wallet exists
    if (!wallet) {
      console.warn('Wallet not found');
      return;
    }
    if (address) {
      setAddressBIP21Encoded(address);
      try {
        await tryToObtainPermissions();
        majorTomToGroundControl([address], [], []);
      } catch (error) {
        console.error('Error obtaining notifications permissions:', error);
      }
      return;
    }

    let newAddress;
    if (wallet.chain === Chain.ONCHAIN) {
      try {
        if (!isElectrumDisabled) newAddress = await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
      } catch (error) {
        console.warn('Error fetching wallet address (ONCHAIN):', error);
      }
      if (newAddress === undefined) {
        if ('_getExternalAddressByIndex' in wallet) {
          newAddress = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
        } else {
          newAddress = wallet.getAddress();
        }
      } else {
        saveToDisk(); // caching whatever getAddressAsync() generated internally
      }
    } else {
      try {
        await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
        newAddress = wallet.getAddress();
      } catch (error) {
        console.warn('Error fetching wallet address (OFFCHAIN):', error);
      }
      if (newAddress === undefined) {
        console.warn('either sleep expired or getAddressAsync threw an exception');
        newAddress = wallet.getAddress();
      } else {
        saveToDisk(); // caching whatever getAddressAsync() generated internally
      }
    }

    if (!newAddress) {
      presentAlert({
        title: loc.errors.error,
        message: loc.receive.address_not_found,
      });
      return;
    }

    setAddressBIP21Encoded(newAddress);

    try {
      await tryToObtainPermissions();
      majorTomToGroundControl([newAddress], [], []);
    } catch (error) {
      console.error('Error obtaining notifications permissions:', error);
    }
  }, [wallet, saveToDisk, address, setAddressBIP21Encoded, isElectrumDisabled, sleep]);

  const onEnablePaymentsCodeSwitchValue = useCallback(() => {
    if (wallet && wallet.allowBIP47()) {
      wallet.switchBIP47(!wallet.isBIP47Enabled());
    }
    saveToDisk();
    obtainWalletAddress();
  }, [wallet, saveToDisk, obtainWalletAddress]);

  useEffect(() => {
    if (showConfirmedBalance) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    }
  }, [showConfirmedBalance]);

  useEffect(() => {
    if (address) {
      setAddressBIP21Encoded(address);
    }
  }, [address, setAddressBIP21Encoded]);

  const toolTipActions = useMemo(() => {
    if (isAtmMode) {
      return [];
    }
    const action = { ...CommonToolTipActions.PaymentsCode };
    action.menuState = isBIP47Enabled;
    return [action];
  }, [isAtmMode, isBIP47Enabled]);

  const onPressMenuItem = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onEnablePaymentsCodeSwitchValue();
  }, [onEnablePaymentsCodeSwitchValue]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton actions={toolTipActions} onPressMenuItem={onPressMenuItem} />,
    [onPressMenuItem, toolTipActions],
  );

  useEffect(() => {
    setOptions({
      // ATM mode hides the native header entirely so the QR can sit as high as possible for the
      // kiosk scan bay; a floating close button (below) replaces the header's close affordance.
      headerShown: !isAtmMode,
      title: isAtmMode ? '' : loc.receive.header,
      headerRight: !isAtmMode && wallet?.allowBIP47() ? () => HeaderRight : undefined,
    });
  }, [HeaderRight, isAtmMode, setOptions, wallet]);

  // re-fetching address balance periodically
  useEffect(() => {
    console.debug('receive/details - useEffect');

    const intervalId = setInterval(async () => {
      try {
        const decoded = DeeplinkSchemaMatch.bip21decode(bip21encoded);
        const addressToUse = address || decoded.address;
        if (!addressToUse) return;

        console.debug('checking address', addressToUse, 'for balance...');
        const balance = await BlueElectrum.getBalanceByAddress(addressToUse);
        console.debug('...got', balance);

        if (balance.unconfirmed > 0) {
          if (initialConfirmed === 0 && initialUnconfirmed === 0) {
            setInitialConfirmed(balance.confirmed);
            setInitialUnconfirmed(balance.unconfirmed);
            setIntervalMs(25000);
            triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
          }

          const txs = await BlueElectrum.getMempoolTransactionsByAddress(addressToUse);
          const tx = txs.pop();
          if (tx) {
            const rez = await BlueElectrum.multiGetTransactionByTxid([tx.tx_hash], true, 10);
            if (rez[tx.tx_hash] && rez[tx.tx_hash].vsize) {
              const satPerVbyte = Math.round(tx.fee / rez[tx.tx_hash].vsize);
              const fees = await BlueElectrum.estimateFees();
              if (satPerVbyte >= fees.fast) {
                setEta(loc.formatString(loc.transactions.eta_10m));
              } else if (satPerVbyte >= fees.medium) {
                setEta(loc.formatString(loc.transactions.eta_3h));
              } else {
                setEta(loc.formatString(loc.transactions.eta_1d));
              }
            }
          }

          setDisplayBalance(
            loc.formatString(loc.transactions.pending_with_amount, {
              amt1: formatBalance(balance.unconfirmed, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
              amt2: formatBalance(balance.unconfirmed, BitcoinUnit.BTC, true).toString(),
            }),
          );
          setShowPendingBalance(true);
          setShowAddress(false);
        } else if (balance.unconfirmed === 0 && initialUnconfirmed !== 0) {
          // now, handling a case when unconfirmed == 0, but in past it wasnt (i.e. it changed while user was
          // staring at the screen)
          const balanceToShow = balance.confirmed - initialConfirmed;

          if (balanceToShow > 0) {
            // address has actually more coins than initially, so we definitely gained something
            setShowConfirmedBalance(true);
            setShowPendingBalance(false);
            setShowAddress(false);
            setDisplayBalance(
              loc.formatString(loc.transactions.received_with_amount, {
                amt1: formatBalance(balanceToShow, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
                amt2: formatBalance(balanceToShow, BitcoinUnit.BTC, true).toString(),
              }),
            );
            if (walletID) {
              fetchAndSaveWalletTransactions(walletID);
            }
          } else {
            // rare case, but probable. transaction evicted from mempool (maybe cancelled by the sender)
            setShowConfirmedBalance(false);
            setShowPendingBalance(false);
            setShowAddress(true);
          }
        }
      } catch (error) {
        console.debug('Error checking balance:', error);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [bip21encoded, address, initialConfirmed, initialUnconfirmed, intervalMs, fetchAndSaveWalletTransactions, walletID]);

  useEffect(() => {
    const handleBackButton = () => {
      goBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => subscription.remove();
  }, [goBack]);

  const navigateToWalletExport = useCallback(() => {
    if (!walletID) {
      return;
    }

    allowAtmExitRef.current = true;
    setIsAtmQrVisible(false);
    navigation.navigate('WalletExport', { walletID });
  }, [navigation, walletID]);

  const markBackupAsDone = useCallback(async () => {
    if (!wallet) {
      return;
    }

    wallet.setUserHasSavedExport(true);
    setIsWalletBackedUp(true);
    await saveToDisk();
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
  }, [saveToDisk, wallet]);

  const handleAtmCopyAddress = useCallback(() => {
    if (!address) {
      return;
    }

    Clipboard.setString(address);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    setHasCopiedAtmAddress(true);

    if (copiedAddressTimeoutRef.current) {
      clearTimeout(copiedAddressTimeoutRef.current);
    }

    copiedAddressTimeoutRef.current = setTimeout(() => {
      setHasCopiedAtmAddress(false);
    }, 1600);
  }, [address]);

  useEffect(() => {
    if (!isAtmOnboarding || isWalletBackedUp || !wallet) {
      return;
    }

    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (allowAtmExitRef.current || isWalletBackedUp) {
        allowAtmExitRef.current = false;
        return;
      }

      const nextScreen = (event.data.action as { payload?: { name?: string } })?.payload?.name;
      if (nextScreen === 'WalletExport') {
        return;
      }

      event.preventDefault();

      Alert.alert(loc.receive.atm_backup_leave_title, loc.receive.atm_backup_leave_message, [
        { text: loc._.cancel, style: 'cancel' },
        { text: loc.receive.atm_backup_cta, onPress: navigateToWalletExport },
        {
          text: loc.receive.atm_backup_leave_button,
          style: 'destructive',
          onPress: () => {
            allowAtmExitRef.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [isAtmOnboarding, isWalletBackedUp, navigation, navigateToWalletExport, wallet]);

  useEffect(() => {
    if (!isAtmOnboarding || isWalletBackedUp || !showConfirmedBalance || hasShownDepositReminderRef.current) {
      return;
    }

    hasShownDepositReminderRef.current = true;
    Alert.alert(loc.receive.atm_backup_strong_title, loc.receive.atm_backup_strong_message, [
      { text: loc._.cancel, style: 'cancel' },
      { text: loc.receive.atm_backup_cta, onPress: navigateToWalletExport },
      { text: loc.receive.atm_backup_done, onPress: markBackupAsDone },
    ]);
  }, [isAtmOnboarding, isWalletBackedUp, markBackupAsDone, navigateToWalletExport, showConfirmedBalance]);

  const renderConfirmedBalance = () => {
    return (
      <View style={styles.scrollBody}>
        {isCustom && (
          <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
            {customLabel}
          </BlueText>
        )}
        <SuccessView />
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {displayBalance}
        </BlueText>
      </View>
    );
  };

  const renderPendingBalance = () => {
    return (
      <View style={styles.scrollBody}>
        {isCustom && (
          <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
            {customLabel}
          </BlueText>
        )}
        <TransactionPendingIconBig />
        <BlueSpacing40 />
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {displayBalance}
        </BlueText>
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {eta}
        </BlueText>
      </View>
    );
  };

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number; width: number } } }) => {
      const { height, width } = e.nativeEvent.layout;
      setQRCodeSize(getReceiveQRCodeSize({ height, width, isAtmMode }));
    },
    [isAtmMode],
  );

  const renderTabContent = () => {
    if (isAtmMode && currentTab === segmentControlValues[0]) {
      return (
        <View style={[styles.container, styles.qrTopContainer, stylesHook.atmContentTop]}>
          {address && (
            <View style={styles.atmScrollBody}>
              <View style={[styles.atmPanel, stylesHook.atmPanel]}>
                {/* QR is the first element so it sits near the top of the phone screen and lands inside the
                    ATM kiosk scan bay's field of view when the customer presents their phone. */}
                <View style={styles.qrCodeContainer}>
                  <QRCodeComponent
                    value={isCustom ? bip21encoded : address}
                    isLogoRendered={false}
                    isMenuAvailable={false}
                    size={qrCodeSize}
                  />
                </View>
                {isCustom && getDisplayAmount() && (
                  <BlueText testID="BitcoinAmountText" style={styles.atmAmountText} numberOfLines={1}>
                    {getDisplayAmount()}
                  </BlueText>
                )}
                {isCustom && customLabel?.length > 0 && (
                  <BlueText style={[styles.atmAmountLabel, stylesHook.atmHint]} numberOfLines={1}>
                    {customLabel}
                  </BlueText>
                )}
                <BlueText style={styles.atmHelperText}>{loc.receive.atm_helper}</BlueText>
                <View style={styles.atmBadge}>
                  <BlueText style={[styles.atmBadgeText, stylesHook.atmBadgeText]}>{loc.wallets.atm_badge}</BlueText>
                </View>
                <View style={[styles.atmAddressCard, stylesHook.atmAddressCard]}>
                  <View style={styles.atmAddressMetaRow}>
                    <BlueText style={[styles.atmAddressLabel, stylesHook.atmAddressLabel]}>{loc.receive.atm_address_label}</BlueText>
                    {hasCopiedAtmAddress ? (
                      <View style={styles.atmAddressCopiedChip}>
                        <Icon color={AMERICA_BLUE} name="checkmark-circle" size={14} type="ionicon" />
                        <Text style={styles.atmAddressCopiedChipText}>{loc.receive.atm_copied}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={2} ellipsizeMode="middle" selectable style={[styles.atmAddressValue, stylesHook.atmAddressValue]}>
                    {address}
                  </Text>
                </View>
                <BlueText style={[styles.atmHintText, stylesHook.atmHint]}>{loc.receive.atm_brightness_tip}</BlueText>
                <View style={styles.atmButtonStack}>
                  <AtmActionButton
                    title={loc.receive.atm_fullscreen}
                    iconName="scan-outline"
                    onPress={() => setIsAtmQrVisible(true)}
                    variant="primary"
                  />
                  <View style={styles.atmActionSpacer} />
                  <AtmActionButton
                    title={loc.receive.atm_copy_address}
                    iconName={hasCopiedAtmAddress ? 'checkmark-circle-outline' : 'copy-outline'}
                    onPress={handleAtmCopyAddress}
                    variant="secondary"
                  />
                  <View style={styles.atmActionSpacer} />
                  <AtmActionButton
                    title={loc.receive.atm_share}
                    iconName="share-social-outline"
                    onPress={handleShareButtonPressed}
                    variant="secondary"
                  />
                  <View style={styles.atmActionSpacer} />
                  <AtmActionButton
                    title={loc.receive.details_setAmount}
                    iconName="pricetag-outline"
                    onPress={showCustomAmountModal}
                    variant="secondary"
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      );
    }

    if (currentTab === segmentControlValues[0]) {
      return (
        <View style={[styles.container, styles.qrTopContainer]}>
          {address && (
            <View style={[styles.scrollBody, styles.qrTopBody]}>
              {isCustom && (
                <>
                  {getDisplayAmount() && (
                    <BlueText testID="BitcoinAmountText" style={[styles.amount, stylesHook.amount]} numberOfLines={1}>
                      {getDisplayAmount()}
                    </BlueText>
                  )}
                  {customLabel?.length > 0 && (
                    <BlueText testID="CustomAmountDescriptionText" style={[styles.label, stylesHook.label]} numberOfLines={1}>
                      {customLabel}
                    </BlueText>
                  )}
                </>
              )}
              <View style={styles.qrCodeContainer}>
                <QRCodeComponent value={bip21encoded} size={qrCodeSize} />
              </View>
              <CopyTextToClipboard text={isCustom ? bip21encoded : address} />
            </View>
          )}
        </View>
      );
    } else if (wallet && isBIP47Enabled) {
      // wallet is always defined here
      const qrValue =
        'getBIP47PaymentCode' in wallet && typeof wallet.getBIP47PaymentCode === 'function' ? wallet.getBIP47PaymentCode() : undefined;
      return (
        <View style={styles.container}>
          {qrValue ? (
            <>
              <TipBox description={loc.receive.bip47_explanation} containerStyle={styles.tip} />
              <View style={styles.qrCodeContainer}>
                <QRCodeComponent value={qrValue} size={qrCodeSize} />
              </View>
              <CopyTextToClipboard text={qrValue} truncated={false} />
            </>
          ) : (
            <Text>{loc.bip47.not_found}</Text>
          )}
        </View>
      );
    } else {
      return null;
    }
  };

  useFocusEffect(
    useCallback(() => {
      allowAtmExitRef.current = false;
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          if (wallet) {
            await obtainWalletAddress();
          } else if (!wallet && address) {
            setAddressBIP21Encoded(address);
          }
        } catch (error) {
          console.error('Error during focus effect:', error);
        }
      });
      return () => {
        task.cancel();
      };
    }, [wallet, address, obtainWalletAddress, setAddressBIP21Encoded]),
  );

  const showCustomAmountModal = useCallback(() => {
    setTempCustomLabel(customLabel);
    setTempCustomAmount(customAmount);
    setTempCustomUnit(customUnit);
    bottomModalRef.current?.present();
  }, [customLabel, customAmount, customUnit]);

  const createCustomAmountAddress = () => {
    bottomModalRef.current?.dismiss();
    setIsCustom(true);
    let amount = tempCustomAmount;
    const amountNumber = Number(amount);
    switch (tempCustomUnit) {
      case BitcoinUnit.BTC:
        // nop
        break;
      case BitcoinUnit.SATS:
        amount = satoshiToBTC(amountNumber);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        if (AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
          // cache hit! we reuse old value that supposedly doesnt have rounding errors
          amount = satoshiToBTC(Number(AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]));
        } else {
          amount = fiatToBTC(amountNumber);
        }
        break;
    }
    setCustomLabel(tempCustomLabel);
    setCustomAmount(tempCustomAmount);
    setCustomUnit(tempCustomUnit);
    // address is always defined here
    setBip21encoded(
      DeeplinkSchemaMatch.bip21encode(address!, {
        amount,
        label: tempCustomLabel,
      }),
    );
    setShowAddress(true);
  };

  const resetCustomAmount = () => {
    setTempCustomLabel('');
    setTempCustomAmount('');
    setTempCustomUnit(wallet?.getPreferredBalanceUnit() || BitcoinUnit.BTC);
    setCustomLabel('');
    setCustomAmount('');
    setCustomUnit(wallet?.getPreferredBalanceUnit() || BitcoinUnit.BTC);
    // address is always defined here
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address!));
    setShowAddress(true);
    bottomModalRef.current?.dismiss();
  };

  /**
   * @returns {string} BTC amount, accounting for current `customUnit` and `customUnit`
   */
  const getDisplayAmount = (): string | null => {
    const number = Number(customAmount);
    if (number > 0) {
      switch (customUnit) {
        case BitcoinUnit.BTC:
          return customAmount + ' BTC';
        case BitcoinUnit.SATS:
          return satoshiToBTC(number) + ' BTC';
        case BitcoinUnit.LOCAL_CURRENCY:
          return fiatToBTC(number) + ' BTC';
      }
      return customAmount + ' ' + customUnit;
    } else {
      return null;
    }
  };

  const handleShareButtonPressed = () => {
    let message: string | false = false;
    if (currentTab === segmentControlValues[0]) {
      message = isCustom ? bip21encoded : (address ?? false);
    } else {
      message = (wallet && 'getBIP47PaymentCode' in wallet && wallet.getBIP47PaymentCode()) ?? false;
    }

    if (!message) {
      presentAlert({ title: loc.errors.error, message: loc.bip47.not_found });
      return;
    }

    Share.open({ message }).catch(error => console.debug('Error sharing:', error));
  };

  return (
    <View style={[styles.flex, stylesHook.root]}>
      <SafeAreaScrollView
        centerContent={currentTab !== segmentControlValues[0]}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustsScrollIndicatorInsets
        automaticallyAdjustKeyboardInsets
        testID="ReceiveDetailsScrollView"
        style={stylesHook.root}
        contentContainerStyle={[styles.root, stylesHook.root]}
        keyboardShouldPersistTaps="always"
        onLayout={onLayout}
        stickyHeaderIndices={wallet && isBIP47Enabled && !isAtmMode ? [0] : []}
      >
        {wallet && isBIP47Enabled && !isAtmMode && (
          <StickyHeader
            wallet={wallet}
            isBIP47Enabled={isBIP47Enabled}
            tabValues={segmentControlValues}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            backgroundColor={colors.elevated}
          />
        )}
        {showAddress && renderTabContent()}
        {showAddress && address !== undefined && (
          <HandOffComponent title={loc.send.details_address} type={HandOffActivityType.ReceiveOnchain} userInfo={{ address }} />
        )}
        {showConfirmedBalance && renderConfirmedBalance()}
        {showPendingBalance && renderPendingBalance()}

        {!showAddress && !showPendingBalance && !showConfirmedBalance && (
          <View style={styles.loadingContainer}>
            <BlueLoading />
          </View>
        )}

        {isAtmOnboarding && wallet && !isWalletBackedUp && (showAddress || showPendingBalance || showConfirmedBalance) && (
          <View style={styles.atmBackupSection}>
            <View style={[styles.atmBackupCard, stylesHook.atmBackupCard]}>
              <BlueText style={styles.atmBackupTitle}>{loc.receive.atm_backup_title}</BlueText>
              <BlueSpacing20 />
              <BlueText style={[styles.atmBackupBody, stylesHook.atmBackupBody]}>{loc.receive.atm_backup_body}</BlueText>
              <View style={styles.atmBackupActionRow}>
                <AtmActionButton
                  title={loc.receive.atm_backup_cta}
                  iconName="shield-checkmark-outline"
                  onPress={navigateToWalletExport}
                  variant="alert"
                />
              </View>
              <View style={styles.atmBackupActionSpacer} />
              <View style={styles.atmBackupActionRow}>
                <AtmActionButton title={loc.receive.atm_backup_done} iconName="checkmark-circle-outline" onPress={markBackupAsDone} />
              </View>
            </View>
          </View>
        )}

        {!isAtmMode && (
          <View style={styles.share}>
            <BlueCard>
              {showAddress && currentTab === loc.wallets.details_address && (
                <BlueButtonLink
                  style={styles.link}
                  testID="SetCustomAmountButton"
                  title={loc.receive.details_setAmount}
                  onPress={showCustomAmountModal}
                />
              )}
              <Button
                onPress={handleShareButtonPressed}
                title={loc.receive.details_share}
                disabled={!bip21encoded && !(currentTab === segmentControlValues[1] && isBIP47Enabled)}
              />
            </BlueCard>
          </View>
        )}
      </SafeAreaScrollView>

      {isAtmMode && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc._.close}
          testID="NavigationCloseButton"
          onPress={() => goBack()}
          hitSlop={10}
          style={[styles.atmCloseButton, stylesHook.atmCloseButton]}
        >
          <Icon name="close" type="ionicon" size={22} color={AMERICA_BLUE} />
        </Pressable>
      )}

      <Modal animationType="fade" transparent visible={isAtmQrVisible} onRequestClose={() => setIsAtmQrVisible(false)}>
        <View style={[styles.atmModalOverlay, stylesHook.atmModalOverlay]}>
          <Pressable onPress={() => setIsAtmQrVisible(false)} style={styles.atmModalClose}>
            <BlueText style={styles.atmModalCloseText}>{loc._.close}</BlueText>
          </Pressable>
          <View style={[styles.atmModalContent, stylesHook.atmFullscreenTop]}>
            {address ? (
              <QRCodeComponent
                value={isCustom ? bip21encoded : address}
                isLogoRendered={false}
                isMenuAvailable={false}
                size={ATM_RECEIVE_QR_FULLSCREEN_SIZE}
              />
            ) : null}
            <BlueText style={styles.atmModalTitle}>{loc.receive.atm_helper}</BlueText>
          </View>
        </View>
      </Modal>

      <BottomModal
        ref={bottomModalRef}
        contentContainerStyle={styles.modalContainerJustify}
        backgroundColor={colors.modal}
        footer={
          <View style={styles.modalButtonContainer}>
            <Button
              testID="CustomAmountResetButton"
              style={[styles.modalButton, stylesHook.modalButton]}
              title={loc.receive.reset}
              onPress={resetCustomAmount}
            />
            <View style={styles.modalButtonSpacing} />
            <Button
              testID="CustomAmountSaveButton"
              style={[styles.modalButton, stylesHook.modalButton]}
              title={loc.receive.details_create}
              onPress={createCustomAmountAddress}
            />
          </View>
        }
      >
        <AmountInput.AmountInput
          unit={tempCustomUnit}
          amount={tempCustomAmount || ''}
          onChangeText={setTempCustomAmount}
          onAmountUnitChange={setTempCustomUnit}
        />
        <View style={[styles.customAmount, stylesHook.customAmount]}>
          <TextInput
            onChangeText={setTempCustomLabel}
            placeholderTextColor="#81868e"
            placeholder={loc.receive.details_label}
            value={tempCustomLabel || ''}
            numberOfLines={1}
            style={[styles.customAmountText, stylesHook.customAmountText]}
            testID="CustomAmountDescription"
          />
        </View>
        <BlueSpacing20 />

        <BlueSpacing20 />
      </BottomModal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainerJustify: {
    alignContent: 'center',
    padding: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customAmount: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  root: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  atmScrollBody: {
    width: '100%',
  },
  flex: {
    flex: 1,
  },
  tabsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : undefined,
  },
  scrollBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: {
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  link: {
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  amount: {
    fontWeight: '600',
    fontSize: 36,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 12,
  },
  modalButton: {
    paddingVertical: 14,
    minWidth: 100,
    paddingHorizontal: 16,
    borderRadius: 50,
    fontWeight: '700',
    flex: 0.5,
    alignItems: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  modalButtonSpacing: {
    width: 16,
  },
  customAmountText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTopContainer: {
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  qrTopBody: {
    flex: 0,
    justifyContent: 'flex-start',
  },
  tip: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  atmPanel: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: AMERICA_BLUE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  atmBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: AMERICA_RED,
    marginBottom: 4,
  },
  atmBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  atmAmountText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
    color: AMERICA_BLUE,
  },
  atmAmountLabel: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  atmHelperText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
    color: AMERICA_BLUE,
  },
  atmAddressCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  atmAddressMetaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  atmAddressLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  atmAddressValue: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  atmAddressCopiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  atmAddressCopiedChipText: {
    fontSize: 12,
    lineHeight: 16,
    color: AMERICA_BLUE,
    fontWeight: '700',
    marginLeft: 4,
  },
  atmHintText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  atmButtonStack: {
    marginTop: 14,
    width: '100%',
  },
  atmActionButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  atmActionButtonElevated: {
    shadowColor: AMERICA_BLUE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  atmActionIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  atmActionButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    flex: 1,
    flexShrink: 1,
  },
  atmActionSpacer: {
    height: 10,
  },
  atmBackupSection: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  atmBackupCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DAE5',
  },
  atmBackupTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: AMERICA_BLUE,
  },
  atmBackupBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  atmBackupActionRow: {
    width: '100%',
  },
  atmBackupActionSpacer: {
    height: 10,
  },
  atmCloseButton: {
    position: 'absolute',
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E4EE',
    zIndex: 20,
    shadowColor: AMERICA_BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  atmModalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },
  atmModalClose: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  atmModalCloseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  atmModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  atmModalTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    marginBottom: 24,
  },
});

export default ReceiveDetails;
