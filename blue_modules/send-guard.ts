/**
 * Send protections against scams.
 *
 * The first time a wallet sends to an address it has never sent to, the customer
 * answers a short scam check; any "yes" stops the send. Customers 65 and older
 * (from their verified ID) also get a "call us first" prompt and type a short
 * confirmation. There is no waiting period in the app (decided 2026-10-06): the
 * operator's hold-and-release at the kiosk covers that before any bitcoin is sent.
 * Addresses of the customer's own wallets are exempt; there is no amount
 * exemption (scammers ask for a small test payment first).
 *
 * The wallet is non-custodial, so this is friction against a scammer's script,
 * not a hard control. State lives on the phone only (AsyncStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPPORT_PHONE = '888-437-7582';
const STORAGE_KEY = 'ABTM_SEND_GUARD_V1';

export type GuardStore = {
  /** Addresses this phone has paid, or whose scam check the customer passed (value: when). */
  known: Record<string, number>;
  /** Wallets whose past sends were already added to `known`. */
  seededWallets: Record<string, boolean>;
};

export type AddressStatus = 'known' | 'new';

export type AddressCheck = { address: string; status: AddressStatus };

/** Minimal view of a wallet; every BlueWallet wallet class has these. */
export type GuardWallet = {
  getID(): string;
  weOwnAddress(address: string): boolean;
  getTransactions(): any[];
};

export function emptyStore(): GuardStore {
  return { known: {}, seededWallets: {} };
}

/** bech32 addresses are case-insensitive; base58 ones are not. */
export function normalizeAddress(address: string): string {
  const trimmed = (address || '').trim();
  return /^(bc1|tb1|bcrt1)/i.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

export function checkAddresses(store: GuardStore, addresses: string[], isOwn: (address: string) => boolean): AddressCheck[] {
  const seen = new Set<string>();
  const result: AddressCheck[] = [];
  for (const raw of addresses) {
    const address = normalizeAddress(raw);
    if (!address || seen.has(address)) continue;
    seen.add(address);
    const known = !!store.known[address] || isOwn(raw) || isOwn(address);
    result.push({ address, status: known ? 'known' : 'new' });
  }
  return result;
}

/** True when every address may be sent to without a scam check. */
export function allClear(checks: AddressCheck[]): boolean {
  return checks.every(c => c.status === 'known');
}

/** Paid, or scam check passed: these addresses are known from now on. */
export function markKnown(store: GuardStore, addresses: string[], now: number): GuardStore {
  const known = { ...store.known };
  for (const raw of addresses) {
    const address = normalizeAddress(raw);
    if (address) known[address] = known[address] || now;
  }
  return { ...store, known };
}

/** Addresses a wallet paid in the past (outputs of its outgoing transactions that it doesn't own). */
export function pastRecipients(wallet: GuardWallet): string[] {
  const out: string[] = [];
  let txs: any[] = [];
  try {
    txs = wallet.getTransactions() || [];
  } catch (_) {
    return out;
  }
  for (const tx of txs) {
    if (!(typeof tx?.value === 'number' && tx.value < 0)) continue;
    for (const output of tx.outputs || []) {
      for (const address of output?.scriptPubKey?.addresses || []) {
        let own = false;
        try {
          own = wallet.weOwnAddress(address);
        } catch (_) {}
        if (!own) out.push(address);
      }
    }
  }
  return out;
}

/** Add each wallet's past recipients to `known`, once per wallet, so existing payees aren't checked. */
export function seedFromWallets(store: GuardStore, wallets: GuardWallet[], now: number): GuardStore {
  let next = store;
  for (const wallet of wallets) {
    const id = wallet.getID();
    if (next.seededWallets[id]) continue;
    next = markKnown(next, pastRecipients(wallet), now);
    next = { ...next, seededWallets: { ...next.seededWallets, [id]: true } };
  }
  return next;
}

export function ownedByAny(wallets: GuardWallet[]) {
  return (address: string) =>
    wallets.some(w => {
      try {
        return w.weOwnAddress(address);
      } catch (_) {
        return false;
      }
    });
}

// ------------------------------------------------------------------ "check passed" signal

const passedListeners = new Set<() => void>();

/** Send subscribes; the safety check calls `signalSafetyCheckPassed` after goBack(), so the form is kept. */
export function onSafetyCheckPassed(listener: () => void): () => void {
  passedListeners.add(listener);
  return () => {
    passedListeners.delete(listener);
  };
}

export function signalSafetyCheckPassed(): void {
  for (const listener of passedListeners) listener();
}

// ------------------------------------------------------------------ persistence

export async function loadStore(): Promise<GuardStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return { known: parsed.known || {}, seededWallets: parsed.seededWallets || {} };
  } catch (_) {
    return emptyStore();
  }
}

export async function saveStore(store: GuardStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Check a send's destinations (seeding the wallets' history first). */
export async function evaluateSend(addresses: string[], wallets: GuardWallet[], now = Date.now()): Promise<AddressCheck[]> {
  const loaded = await loadStore();
  const store = seedFromWallets(loaded, wallets, now);
  if (store !== loaded) await saveStore(store);
  return checkAddresses(store, addresses, ownedByAny(wallets));
}

/** The customer passed the scam check for these addresses, or the send was broadcast. */
export async function recordKnown(addresses: string[], now = Date.now()): Promise<void> {
  await saveStore(markKnown(await loadStore(), addresses, now));
}
