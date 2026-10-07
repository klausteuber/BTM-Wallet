import { ABTMPairedWallet } from '../class/wallets/abtm-paired-wallet';

export const ABTM_WALLET_LABEL = 'America Bitcoin';

type AnyWallet = { type: string };

export function abtmWallets(wallets: AnyWallet[]): ABTMPairedWallet[] {
  return wallets.filter(w => w.type === ABTMPairedWallet.type) as unknown as ABTMPairedWallet[];
}

/** The local wallet the account has registered (matched by receive address 0), if it is on this phone. */
export function registeredWalletOnPhone(wallets: AnyWallet[], firstAddress: string | null | undefined): ABTMPairedWallet | undefined {
  if (!firstAddress) return undefined;
  return abtmWallets(wallets).find(w => w.getRegistrationAddress() === firstAddress);
}

/** A fresh BIP84 wallet; the caller saves it and sends the customer to back up the recovery phrase. */
export async function newAbtmWallet(): Promise<ABTMPairedWallet> {
  const wallet = new ABTMPairedWallet();
  wallet.setLabel(ABTM_WALLET_LABEL);
  await wallet.generate();
  return wallet;
}

/** The next unused receive address (index 0 for a new wallet). */
export function nextReceiveAddress(wallet: ABTMPairedWallet): string {
  return wallet._getExternalAddressByIndex(wallet.next_free_address_index || 0);
}
