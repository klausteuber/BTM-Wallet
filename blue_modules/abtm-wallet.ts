import { ABTMPairedWallet } from '../class/wallets/abtm-paired-wallet';
import { HDSegwitBech32Wallet } from '../class/wallets/hd-segwit-bech32-wallet';
import { RegistrableWallet, registrationAddress } from './abtm-registration';

export * from './abtm-registration';

export const ABTM_WALLET_LABEL = 'America Bitcoin';

type AnyWallet = { type: string };

export function abtmWallets(wallets: AnyWallet[]): ABTMPairedWallet[] {
  return wallets.filter(w => w.type === ABTMPairedWallet.type) as unknown as ABTMPairedWallet[];
}

/** America Bitcoin wallets first, then standard native-SegWit HD wallets, each in list order. */
export function registrableWallets(wallets: AnyWallet[]): RegistrableWallet[] {
  const standard = wallets.filter(
    w => w.type === HDSegwitBech32Wallet.type && !!(w as unknown as HDSegwitBech32Wallet).getSecret(),
  ) as unknown as RegistrableWallet[];
  return [...abtmWallets(wallets), ...standard];
}

/** The local wallet the account has registered (matched by receive address 0), if it is on this phone. */
export function registeredWalletOnPhone(wallets: AnyWallet[], firstAddress: string | null | undefined): RegistrableWallet | undefined {
  if (!firstAddress) return undefined;
  return registrableWallets(wallets).find(w => registrationAddress(w) === firstAddress);
}

/** Whether this wallet is the one registered to the account (`firstAddress` from the profile). */
export function isRegisteredWallet(wallet: AnyWallet, firstAddress: string | null | undefined): boolean {
  return !!firstAddress && registeredWalletOnPhone([wallet], firstAddress) !== undefined;
}

/** A fresh BIP84 wallet; the caller saves it and sends the customer to back up the recovery phrase. */
export async function newAbtmWallet(): Promise<ABTMPairedWallet> {
  const wallet = new ABTMPairedWallet();
  wallet.setLabel(ABTM_WALLET_LABEL);
  await wallet.generate();
  return wallet;
}

/** The next unused receive address (index 0 for a new wallet). */
export function nextReceiveAddress(wallet: RegistrableWallet): string {
  return wallet._getExternalAddressByIndex(wallet.next_free_address_index || 0);
}

// ------------------------------------------------------------------ registering on sign-in

let signedInJustNow = false;

/** Sign-in just finished on this phone: the Account screen registers the wallet once, on its next look. */
export function markSignedInJustNow(): void {
  signedInJustNow = true;
}

/** True once per sign-in: the first caller gets it, so a wallet is never registered twice or behind the customer's back later. */
export function takeSignedInJustNow(): boolean {
  const value = signedInJustNow;
  signedInJustNow = false;
  return value;
}

/**
 * The wallet to register straight after sign-in, so signing in is one step instead of two.
 * Only when there is no doubt which one: the account has no wallet registered, the account
 * service will accept this phone (`deviceReady`), and exactly one wallet on the phone can be
 * registered. Several wallets keep the picker on the Account screen.
 */
export function walletToRegisterOnSignIn(
  wallets: AnyWallet[],
  alreadyRegistered: boolean,
  deviceReady: boolean,
): RegistrableWallet | undefined {
  if (alreadyRegistered || !deviceReady) return undefined;
  const candidates = registrableWallets(wallets);
  return candidates.length === 1 ? candidates[0] : undefined;
}
