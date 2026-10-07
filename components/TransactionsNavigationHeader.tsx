import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import BrandSlash from './BrandSlash';
import { LightningArkWallet, LightningCustodianWallet, MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { TWallet } from '../class/wallets/types';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useSettings } from '../hooks/context/useSettings';
import ToolTipMenu from './TooltipMenu';
import useAnimateOnChange from '../hooks/useAnimateOnChange';
import { useLocale } from '@react-navigation/native';

interface TransactionsNavigationHeaderProps {
  wallet: TWallet;
  unit: BitcoinUnit;
  onWalletUnitChange: (unit: BitcoinUnit) => void;
  onManageFundsPressed?: (id?: string) => void;
  onWalletBalanceVisibilityChange?: (isShouldBeVisible: boolean) => void;
}

const TransactionsNavigationHeader: React.FC<TransactionsNavigationHeaderProps> = ({
  wallet,
  onWalletUnitChange,
  onManageFundsPressed,
  onWalletBalanceVisibilityChange,
  unit = BitcoinUnit.BTC,
}) => {
  const { hideBalance } = wallet;
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(false);
  const { preferredFiatCurrency } = useSettings();
  const { direction } = useLocale();

  const verifyIfWalletAllowsOnchainAddress = useCallback(() => {
    if (wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type) {
      wallet
        .allowOnchainAddress()
        .then((value: boolean) => setAllowOnchainAddress(value))
        .catch(() => {
          console.error('This LNDhub wallet does not have an onchain address API.');
          setAllowOnchainAddress(false);
        });
    }
  }, [wallet]);

  useEffect(() => {
    verifyIfWalletAllowsOnchainAddress();
  }, [wallet, verifyIfWalletAllowsOnchainAddress]);

  const handleCopyPress = useCallback(() => {
    const value = formatBalance(wallet.getBalance(), unit);
    if (value) {
      Clipboard.setString(value);
    }
  }, [unit, wallet]);

  const handleBalanceVisibility = useCallback(() => {
    onWalletBalanceVisibilityChange?.(!hideBalance);
  }, [onWalletBalanceVisibilityChange, hideBalance]);

  const changeWalletBalanceUnit = () => {
    let newWalletPreferredUnit = wallet.getPreferredBalanceUnit();

    if (newWalletPreferredUnit === BitcoinUnit.BTC) {
      newWalletPreferredUnit = BitcoinUnit.SATS;
    } else if (newWalletPreferredUnit === BitcoinUnit.SATS) {
      newWalletPreferredUnit = BitcoinUnit.LOCAL_CURRENCY;
    } else {
      newWalletPreferredUnit = BitcoinUnit.BTC;
    }

    onWalletUnitChange(newWalletPreferredUnit);
  };

  const handleManageFundsPressed = useCallback(
    (actionKeyID?: string) => {
      if (onManageFundsPressed) {
        onManageFundsPressed(actionKeyID);
      }
    },
    [onManageFundsPressed],
  );

  const onPressMenuItem = useCallback(
    (id: string) => {
      if (id === 'walletBalanceVisibility') {
        handleBalanceVisibility();
      } else if (id === 'copyToClipboard') {
        handleCopyPress();
      }
    },
    [handleBalanceVisibility, handleCopyPress],
  );

  const toolTipActions = useMemo(() => {
    return [
      {
        id: actionKeys.Refill,
        text: loc.lnd.refill,
        icon: actionIcons.Refill,
      },
      {
        id: actionKeys.RefillWithExternalWallet,
        text: loc.lnd.refill_external,
        icon: actionIcons.RefillWithExternalWallet,
      },
    ];
  }, []);

  const currentBalance = wallet ? wallet.getBalance() : 0;
  const formattedBalance = useMemo(() => {
    return unit === BitcoinUnit.LOCAL_CURRENCY
      ? formatBalance(currentBalance, unit, true)
      : formatBalanceWithoutSuffix(currentBalance, unit, true);
  }, [unit, currentBalance]);

  const balance = !wallet.hideBalance && formattedBalance;

  const toolTipWalletBalanceActions = useMemo(() => {
    return hideBalance
      ? [
          {
            id: 'walletBalanceVisibility',
            text: loc.transactions.details_balance_show,
            icon: {
              iconValue: 'eye',
            },
          },
        ]
      : [
          {
            id: 'walletBalanceVisibility',
            text: loc.transactions.details_balance_hide,
            icon: {
              iconValue: 'eye.slash',
            },
          },
          {
            id: 'copyToClipboard',
            text: loc.transactions.details_copy,
            icon: {
              iconValue: 'doc.on.doc',
            },
          },
        ];
  }, [hideBalance]);

  const imageSource = useMemo(() => {
    switch (wallet.type) {
      case LightningCustodianWallet.type:
      case LightningArkWallet.type:
        return direction === 'rtl' ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
      case MultisigHDWallet.type:
        return direction === 'rtl' ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
      default:
        // Plain bitcoin wallets carry the website's red slash instead of a watermark.
        return undefined;
    }
  }, [direction, wallet.type]);

  useAnimateOnChange(balance);
  useAnimateOnChange(hideBalance);
  useAnimateOnChange(unit);
  useAnimateOnChange(wallet.getID?.());

  return (
    <LinearGradient colors={WalletGradient.gradientsFor(wallet.type)} style={styles.lineaderGradient}>
      {imageSource ? <ImageBackground source={imageSource} style={styles.chainIcon} /> : <BrandSlash width={190} bottom={26} />}

      <Text testID="WalletLabel" numberOfLines={1} style={[styles.walletLabel, { writingDirection: direction }]}>
        {wallet.getLabel()}
      </Text>
      <View style={styles.walletBalanceAndUnitContainer}>
        <ToolTipMenu
          isMenuPrimaryAction
          isButton
          enableAndroidRipple={false}
          buttonStyle={styles.walletBalance}
          onPressMenuItem={onPressMenuItem}
          actions={toolTipWalletBalanceActions}
        >
          <View style={styles.walletBalance}>
            {hideBalance ? (
              <BlurredBalanceView />
            ) : (
              <View>
                <Text
                  key={String(balance)} // force component recreation on balance change. To fix right-to-left languages, like Farsis
                  testID="WalletBalance"
                  numberOfLines={1}
                  minimumFontScale={0.5}
                  adjustsFontSizeToFit
                  style={styles.walletBalanceText}
                >
                  {balance}
                </Text>
              </View>
            )}
          </View>
        </ToolTipMenu>
        <TouchableOpacity style={styles.walletPreferredUnitView} onPress={changeWalletBalanceUnit}>
          <Text style={styles.walletPreferredUnitText}>
            {unit === BitcoinUnit.LOCAL_CURRENCY ? (preferredFiatCurrency?.endPointKey ?? FiatUnit.USD) : unit}
          </Text>
        </TouchableOpacity>
      </View>
      {(wallet.type === LightningCustodianWallet.type || wallet.type === LightningArkWallet.type) && allowOnchainAddress && (
        <ToolTipMenu
          isMenuPrimaryAction
          isButton
          onPressMenuItem={handleManageFundsPressed}
          actions={toolTipActions}
          buttonStyle={styles.manageFundsButton}
        >
          <Text style={styles.manageFundsButtonText}>{loc.lnd.title}</Text>
        </ToolTipMenu>
      )}
      {wallet.type === MultisigHDWallet.type && (
        <TouchableOpacity style={styles.manageFundsButton} accessibilityRole="button" onPress={() => handleManageFundsPressed()}>
          <Text style={styles.manageFundsButtonText}>{loc.multisig.manage_keys}</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  lineaderGradient: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    minHeight: 140,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chainIcon: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  walletLabel: {
    backgroundColor: 'transparent',
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 6,
  },
  walletBalance: {
    flexShrink: 1,
    marginRight: 6,
  },
  manageFundsButton: {
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9,
    minHeight: 39,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageFundsButtonText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#FFFFFF',
    padding: 12,
  },
  walletBalanceAndUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10, // Ensure there's some padding to the right
  },
  walletBalanceText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 38,
    flexShrink: 1, // Allow the text to shrink if there's not enough space
  },
  walletPreferredUnitView: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 999,
    minHeight: 32,
    minWidth: 60,
    paddingHorizontal: 12,
  },
  walletPreferredUnitText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export const actionKeys = {
  CopyToClipboard: 'copyToClipboard',
  WalletBalanceVisibility: 'walletBalanceVisibility',
  Refill: 'refill',
  RefillWithExternalWallet: 'refillWithExternalWallet',
};

export const actionIcons = {
  Eye: {
    iconValue: 'eye',
  },
  EyeSlash: {
    iconValue: 'eye.slash',
  },
  Clipboard: {
    iconValue: 'doc.on.doc',
  },
  Refill: {
    iconValue: 'goforward.plus',
  },
  RefillWithExternalWallet: {
    iconValue: 'qrcode',
  },
};

export default TransactionsNavigationHeader;
