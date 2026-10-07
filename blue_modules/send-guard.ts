/**
 * Send protections against scams (decided 2026-10-06).
 *
 * The first time a wallet sends to an address it has never sent to, the customer
 * answers a short scam check and the address is held before it can be used:
 * 15 minutes, or 24 hours for customers 65 and older (from their verified ID).
 * Addresses of the customer's own wallets are exempt; there is no amount exemption
 * (scammers ask for a small test payment first).
 *
 * The wallet is non-custodial, so this is friction against a scammer's script,
 * not a hard control. State lives on the phone only (AsyncStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STANDARD_HOLD_MS = 15 * 60 * 1000;
export const SENIOR_HOLD_MS = 24 * 60 * 60 * 1000;
export const SUPPORT_PHONE = '888-437-7582';
const STORAGE_KEY = 'ABTM_SEND_GUARD_V1';

export type Hold = { startedAt: number; holdMs: number };

export type GuardStore = {
  /** Addresses this phone has already sent to (value: when it was learned). */
  known: Record<string, number>;
  /** Addresses that passed the scam check, waiting out their hold. */
  holds: Record<string, Hold>;
  /** Wallets whose past sends were already added to `known`. */
  seededWallets: Record<string, boolean>;
};

export type AddressStatus = 'known' | 'new' | 'on_hold' | 'cleared';

export type AddressCheck = { address: string; status: AddressStatus; holdUntil?: number };

/** Minimal view of a wallet; every BlueWallet wallet class has these. */
export type GuardWallet = {
  getID(): string;
  weOwnAddress(address: string): boolean;
  getTransactions(): any[];
};

export function emptyStore(): GuardStore {
  return { known: {}, holds: {}, seededWallets: {} };
}

/** bech32 addresses are case-insensitive; base58 ones are not. */
export function normalizeAddress(address: string): string {
  const trimmed = (address || '').trim();
  return /^(bc1|tb1|bcrt1)/i.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

export function holdMsFor(senior: boolean): number {
  return senior ? SENIOR_HOLD_MS : STANDARD_HOLD_MS;
}

export function checkAddresses(store: GuardStore, addresses: string[], now: number, isOwn: (address: string) => boolean): AddressCheck[] {
  const seen = new Set<string>();
  const result: AddressCheck[] = [];
  for (const raw of addresses) {
    const address = normalizeAddress(raw);
    if (!address || seen.has(address)) continue;
    seen.add(address);
    if (store.known[address] || isOwn(raw) || isOwn(address)) {
      result.push({ address, status: 'known' });
      continue;
    }
    const hold = store.holds[address];
    if (hold) {
      const holdUntil = hold.startedAt + hold.holdMs;
      result.push({ address, status: now >= holdUntil ? 'cleared' : 'on_hold', holdUntil });
      continue;
    }
    result.push({ address, status: 'new' });
  }
  return result;
}

/** True when every address may be sent to now. */
export function allClear(checks: AddressCheck[]): boolean {
  return checks.every(c => c.status === 'known' || c.status === 'cleared');
}

/**
 * Start holds for addresses that passed the scam check. An address already on
 * hold keeps its start time; a longer hold (the customer turned out to be 65+)
 * extends it but a shorter one never shortens it.
 */
export function startHolds(store: GuardStore, addresses: string[], holdMs: number, now: number): GuardStore {
  const holds = { ...store.holds };
  for (const raw of addresses) {
    const address = normalizeAddress(raw);
    if (!address || store.known[address]) continue;
    const existing = holds[address];
    holds[address] = existing ? { startedAt: existing.startedAt, holdMs: Math.max(existing.holdMs, holdMs) } : { startedAt: now, holdMs };
  }
  return { ...store, holds };
}

/** After a successful broadcast: these addresses are known from now on. */
export function markSent(store: GuardStore, addresses: string[], now: number): GuardStore {
  const known = { ...store.known };
  const holds = { ...store.holds };
  for (const raw of addresses) {
    const address = normalizeAddress(raw);
    if (!address) continue;
    known[address] = known[address] || now;
    delete holds[address];
  }
  return { ...store, known, holds };
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

/** Add each wallet's past recipients to `known`, once per wallet, so existing payees aren't held. */
export function seedFromWallets(store: GuardStore, wallets: GuardWallet[], now: number): GuardStore {
  let next = store;
  for (const wallet of wallets) {
    const id = wallet.getID();
    if (next.seededWallets[id]) continue;
    const recipients = pastRecipients(wallet);
    next = markSent(next, recipients, now);
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

// ------------------------------------------------------------------ persistence

export async function loadStore(): Promise<GuardStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return { ...emptyStore(), ...parsed };
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
  return checkAddresses(store, addresses, now, ownedByAny(wallets));
}

export async function beginHolds(addresses: string[], senior: boolean, now = Date.now()): Promise<AddressCheck[]> {
  const store = startHolds(await loadStore(), addresses, holdMsFor(senior), now);
  await saveStore(store);
  return checkAddresses(store, addresses, now, () => false);
}

export async function recordSent(addresses: string[], now = Date.now()): Promise<void> {
  await saveStore(markSent(await loadStore(), addresses, now));
}
