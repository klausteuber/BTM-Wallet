// Registration helpers with no runtime dependency on the wallet classes, so the
// API client can use them without loading the whole wallet stack.
import type { ABTMPairedWallet } from '../class/wallets/abtm-paired-wallet';
import type { HDSegwitBech32Wallet } from '../class/wallets/hd-segwit-bech32-wallet';

/** `ABTMPairedWallet.type`, kept as a literal for the reason above. */
export const ABTM_WALLET_TYPE = 'abtmPairedWallet';

/**
 * A wallet the account can register: an America Bitcoin wallet, or a standard
 * HD native-SegWit (BIP84) wallet holding its own keys. Every 7.2.x release
 * created the standard kind ("Wallet", "My Bitcoin Wallet"), so customers
 * updating from it already have one. Both derive receive addresses the same
 * way (xpub/0/i), which is all the account service relies on. Watch-only,
 * Taproot, legacy, nested-SegWit, multisig and Lightning wallets don't qualify.
 */
export type RegistrableWallet = ABTMPairedWallet | HDSegwitBech32Wallet;

export function isAbtmWallet(wallet: { type: string }): boolean {
  return wallet.type === ABTM_WALLET_TYPE;
}

/** Receive address 0: the address the account knows the wallet by. */
export function registrationAddress(wallet: RegistrableWallet): string {
  return wallet._getExternalAddressByIndex(0);
}

/** `wpkh([fingerprint/84h/0h/0h]xpub/0/*)` for the account service. */
export function registrationDescriptor(wallet: RegistrableWallet): string {
  const fingerprint = wallet.getMasterFingerprintHex();
  const originPath = (wallet.getDerivationPath() || "m/84'/0'/0'").replace(/^m\//, '').replace(/'/g, 'h');
  return `wpkh([${fingerprint}/${originPath}]${wallet.getXpub()}/0/*)`;
}

/**
 * The body of `POST /paired-wallet/register`: the xpub, and the challenge
 * signed with receive address 0's key. `firstUnusedIndex` tells the server
 * where this wallet's unused receive addresses start, so a kiosk is never
 * handed an address the wallet already received to (an older server ignores it).
 */
export function buildPairingRegistration(wallet: RegistrableWallet, message: string) {
  const firstAddress = registrationAddress(wallet);
  return {
    scriptType: 'p2wpkh',
    network: 'mainnet',
    descriptor: registrationDescriptor(wallet),
    walletXpub: wallet.getXpub(),
    walletFingerprint: wallet.getMasterFingerprintHex(),
    firstAddress,
    derivationIndex: 0,
    derivationPath: `${wallet.getDerivationPath()}/0/0`,
    firstAddressSignature: wallet.signMessage(message, firstAddress),
    firstUnusedIndex: Math.max(0, Math.floor(wallet.next_free_address_index || 0)),
  };
}
