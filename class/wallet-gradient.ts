import { useTheme } from '../components/themes';
import { HDAezeedWallet } from './wallets/hd-aezeed-wallet';
import { HDLegacyBreadwalletWallet } from './wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from './wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDLegacyP2PKHWallet } from './wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from './wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import { HDSegwitP2SHWallet } from './wallets/hd-segwit-p2sh-wallet';
import { LegacyWallet } from './wallets/legacy-wallet';
import { LightningCustodianWallet } from './wallets/lightning-custodian-wallet'; // Missing import
import { MultisigHDWallet } from './wallets/multisig-hd-wallet';
import { SegwitBech32Wallet } from './wallets/segwit-bech32-wallet';
import { SLIP39LegacyP2PKHWallet, SLIP39SegwitBech32Wallet, SLIP39SegwitP2SHWallet } from './wallets/slip39-wallets';
import { WatchOnlyWallet } from './wallets/watch-only-wallet';
import { TaprootWallet } from './wallets/taproot-wallet.ts';
import { LightningArkWallet } from './wallets/lightning-ark-wallet.ts';

export default class WalletGradient {
  static hdSegwitP2SHWallet: string[] = ['#040766', '#020344']; // American Blue
  static hdSegwitBech32Wallet: string[] = ['#ED122E', '#C00E24']; // American Red
  static segwitBech32Wallet: string[] = ['#ED122E', '#C00E24']; // American Red
  static watchOnlyWallet: string[] = ['#474646', '#282828']; // Dark Gray
  static legacyWallet: string[] = ['#38E3A5', '#2BC48A']; // American Mint
  static taprootWallet: string[] = ['#2E8B57', '#1E6B3F']; // Dark Green
  static hdLegacyP2PKHWallet: string[] = ['#B5091F', '#8A0618']; // Deep Red
  static hdLegacyBreadWallet: string[] = ['#F38C47', '#E06B20']; // Warm Orange
  static multisigHdWallet: string[] = ['#040766', '#1a1d6b', '#0a0d4a']; // American Blue
  static defaultGradients: string[] = ['#040766', '#1a1d6b']; // American Blue
  static lightningCustodianWallet: string[] = ['#F1AA07', '#FD7E37']; // Lightning Gold
  static aezeedWallet: string[] = ['#1a1d6b', '#040766']; // American Blue

  static createWallet = () => {
    const { colors } = useTheme();
    return colors.lightButton;
  };

  static gradientsFor(type: string): string[] {
    let gradient: string[];
    switch (type) {
      case WatchOnlyWallet.type:
        gradient = WalletGradient.watchOnlyWallet;
        break;
      case LegacyWallet.type:
        gradient = WalletGradient.legacyWallet;
        break;
      case TaprootWallet.type:
        gradient = WalletGradient.taprootWallet;
        break;
      case HDLegacyP2PKHWallet.type:
      case HDLegacyElectrumSeedP2PKHWallet.type:
      case SLIP39LegacyP2PKHWallet.type:
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
      case SLIP39SegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case HDSegwitBech32Wallet.type:
      case HDSegwitElectrumSeedP2WPKHWallet.type:
      case SLIP39SegwitBech32Wallet.type:
        gradient = WalletGradient.hdSegwitBech32Wallet;
        break;
      case SegwitBech32Wallet.type:
        gradient = WalletGradient.segwitBech32Wallet;
        break;
      case MultisigHDWallet.type:
        gradient = WalletGradient.multisigHdWallet;
        break;
      case HDAezeedWallet.type:
        gradient = WalletGradient.aezeedWallet;
        break;
      case LightningArkWallet.type:
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      default:
        gradient = WalletGradient.defaultGradients;
        break;
    }
    return gradient;
  }

  static headerColorFor(type: string): string {
    return WalletGradient.gradientsFor(type)[0];
  }
}
