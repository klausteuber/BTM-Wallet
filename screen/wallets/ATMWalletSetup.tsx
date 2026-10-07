import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@rneui/themed';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueButtonLink, BlueText } from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import { navigationRef } from '../../NavigationService';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { createATMReceiveResetAction } from './atmReceiveNavigation';

const AMERICA_BLUE = '#040766';
const AMERICA_RED = '#ED122E';

type ATMActionButtonProps = {
  testID: string;
  title: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
};

const ATMWalletSetup = () => {
  const navigation = useExtendedNavigation();
  const { colors } = useTheme();
  const { wallets, addWallet, saveToDisk } = useStorage();
  const [isCreating, setIsCreating] = useState(false);

  const defaultWalletLabel = useMemo(() => {
    const baseLabel = loc.wallets.atm_default_wallet_name;
    const existingLabels = new Set(wallets.map(wallet => wallet.getLabel()));

    let candidate = baseLabel;
    let suffix = 2;

    while (existingLabels.has(candidate)) {
      candidate = `${baseLabel} ${suffix}`;
      suffix += 1;
    }

    return candidate;
  }, [wallets]);

  const resetToATMReceive = useCallback((walletID: string) => {
    if (!navigationRef.isReady()) {
      return;
    }

    navigationRef.dispatch(createATMReceiveResetAction(walletID));
  }, []);

  const handleCreateWallet = useCallback(async () => {
    try {
      setIsCreating(true);

      const wallet = new HDSegwitBech32Wallet();
      wallet.setLabel(defaultWalletLabel);
      wallet.setUserHasSavedExport(false);

      await wallet.generate();
      addWallet(wallet);
      await saveToDisk();

      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      resetToATMReceive(wallet.getID());
    } catch (error) {
      console.error('Failed to create ATM wallet:', error);
      Alert.alert(loc.errors.error, loc.wallets.atm_create_error);
    } finally {
      setIsCreating(false);
    }
  }, [addWallet, defaultWalletLabel, resetToATMReceive, saveToDisk]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    subcopy: {
      color: 'rgba(255, 255, 255, 0.84)',
    },
    card: {
      backgroundColor: colors.elevated,
      borderColor: colors.lightBorder,
    },
    secondaryCopy: {
      color: colors.alternativeTextColor,
    },
    secondaryButton: {
      backgroundColor: colors.lightButton,
      borderColor: colors.lightBorder,
    },
    secondaryButtonText: {
      color: colors.foregroundColor,
    },
    footerNote: {
      color: colors.alternativeTextColor,
    },
  });

  const renderActionButton = ({ testID, title, onPress, variant, disabled, loading }: ATMActionButtonProps) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'primary' ? styles.primaryButton : [styles.secondaryButton, stylesHook.secondaryButton],
        pressed && !disabled && styles.actionButtonPressed,
        disabled && styles.disabledButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <BlueText
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.actionButtonText,
              variant === 'primary' ? styles.primaryButtonText : [styles.secondaryButtonText, stylesHook.secondaryButtonText],
            ]}
          >
            {title}
          </BlueText>
          <Icon color={variant === 'primary' ? '#FFFFFF' : colors.foregroundColor} name="chevron-forward" size={18} type="ionicon" />
        </>
      )}
    </Pressable>
  );

  return (
    <SafeAreaScrollView
      contentContainerStyle={[styles.root, stylesHook.root]}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.badge}>
          <BlueText style={styles.badgeText}>{loc.wallets.atm_badge}</BlueText>
        </View>
        <BlueText style={styles.heroTitle}>{loc.wallets.atm_setup_title}</BlueText>
        <BlueText style={[styles.heroBody, stylesHook.subcopy]}>{loc.wallets.atm_setup_subtitle}</BlueText>
      </View>

      <View style={[styles.actionCard, stylesHook.card]}>
        <View style={styles.actionHeader}>
          <View style={styles.iconWrap}>
            <Icon name="add-circle-outline" type="ionicon" color={AMERICA_BLUE} size={22} />
          </View>
          <View style={styles.actionTextWrap}>
            <BlueText style={styles.actionTitle}>{loc.wallets.atm_create_wallet}</BlueText>
            <BlueText style={[styles.actionCopy, stylesHook.secondaryCopy]}>{loc.wallets.atm_create_wallet_explain}</BlueText>
          </View>
        </View>
        {renderActionButton({
          testID: 'CreateATMWalletButton',
          title: loc.wallets.atm_create_wallet,
          onPress: handleCreateWallet,
          variant: 'primary',
          disabled: isCreating,
          loading: isCreating,
        })}
      </View>

      <View style={[styles.actionCard, stylesHook.card]}>
        <View style={styles.actionHeader}>
          <View style={styles.iconWrapSecondary}>
            <Icon name="wallet-outline" type="ionicon" color={AMERICA_BLUE} size={22} />
          </View>
          <View style={styles.actionTextWrap}>
            <BlueText style={styles.actionTitle}>{loc.wallets.atm_import_wallet}</BlueText>
            <BlueText style={[styles.actionCopy, stylesHook.secondaryCopy]}>{loc.wallets.atm_import_wallet_explain}</BlueText>
          </View>
        </View>
        {renderActionButton({
          testID: 'UseExistingWalletButton',
          title: loc.wallets.atm_import_wallet,
          onPress: () => navigation.navigate('ImportWallet'),
          variant: 'secondary',
        })}
      </View>

      <BlueText style={[styles.footerNote, stylesHook.footerNote]}>{loc.wallets.atm_setup_footer}</BlueText>
      <BlueButtonLink
        testID="AdvancedWalletOptionsLink"
        title={loc.wallets.atm_advanced_wallet}
        onPress={() => navigation.navigate('AddWallet')}
      />
    </SafeAreaScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: AMERICA_BLUE,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 26,
    marginBottom: 22,
    overflow: 'hidden',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: AMERICA_RED,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    maxWidth: 280,
  },
  heroBody: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 300,
  },
  actionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: AMERICA_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8D2D2',
    marginRight: 14,
  },
  iconWrapSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0F4',
    marginRight: 14,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
  },
  actionCopy: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
  },
  actionButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
  primaryButton: {
    backgroundColor: AMERICA_BLUE,
    borderColor: AMERICA_BLUE,
  },
  secondaryButton: {
    backgroundColor: '#EEF0F4',
    borderColor: '#D9DAE5',
  },
  disabledButton: {
    opacity: 0.58,
  },
  actionButtonText: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: AMERICA_BLUE,
  },
  footerNote: {
    marginTop: 4,
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 18,
  },
});

export default ATMWalletSetup;
