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
