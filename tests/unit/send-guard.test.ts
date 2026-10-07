import assert from 'assert';

import {
  allClear,
  checkAddresses,
  emptyStore,
  GuardWallet,
  holdMsFor,
  markSent,
  normalizeAddress,
  ownedByAny,
  pastRecipients,
  seedFromWallets,
  SENIOR_HOLD_MS,
  STANDARD_HOLD_MS,
  startHolds,
} from '../../blue_modules/send-guard';

const PAYEE = 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g';
const OTHER = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
const LEGACY = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const T0 = 1_800_000_000_000;
const nobody = () => false;

function wallet(id: string, own: string[], txs: any[] = []): GuardWallet {
  return { getID: () => id, weOwnAddress: (a: string) => own.includes(a), getTransactions: () => txs };
}

describe('send guard', () => {
  it('normalizes bech32 but not base58', () => {
    assert.strictEqual(normalizeAddress(` ${PAYEE.toUpperCase()} `), PAYEE);
    assert.strictEqual(normalizeAddress(LEGACY), LEGACY);
  });

  it('holds 15 minutes, or 24 hours for customers 65+', () => {
    assert.strictEqual(holdMsFor(false), STANDARD_HOLD_MS);
    assert.strictEqual(STANDARD_HOLD_MS, 15 * 60 * 1000);
    assert.strictEqual(holdMsFor(true), SENIOR_HOLD_MS);
    assert.strictEqual(SENIOR_HOLD_MS, 24 * 60 * 60 * 1000);
  });

  it('flags a never-paid address as new, and own addresses as known', () => {
    const checks = checkAddresses(emptyStore(), [PAYEE, OTHER], T0, a => a === OTHER);
    assert.deepStrictEqual(
      checks.map(c => c.status),
      ['new', 'known'],
    );
    assert.strictEqual(allClear(checks), false);
  });

  it('has no amount exemption and dedupes repeated recipients', () => {
    const checks = checkAddresses(emptyStore(), [PAYEE, PAYEE.toUpperCase()], T0, nobody);
    assert.strictEqual(checks.length, 1);
  });

  it('clears an address only when its hold is over', () => {
    const store = startHolds(emptyStore(), [PAYEE], STANDARD_HOLD_MS, T0);
    const during = checkAddresses(store, [PAYEE], T0 + STANDARD_HOLD_MS - 1, nobody);
    assert.strictEqual(during[0].status, 'on_hold');
    assert.strictEqual(during[0].holdUntil, T0 + STANDARD_HOLD_MS);
    assert.strictEqual(allClear(during), false);
    const after = checkAddresses(store, [PAYEE], T0 + STANDARD_HOLD_MS, nobody);
    assert.strictEqual(after[0].status, 'cleared');
    assert.strictEqual(allClear(after), true);
  });

  it('never shortens a hold, and a senior hold extends a standard one from the same start', () => {
    let store = startHolds(emptyStore(), [PAYEE], SENIOR_HOLD_MS, T0);
    store = startHolds(store, [PAYEE], STANDARD_HOLD_MS, T0 + 1000);
    assert.deepStrictEqual(store.holds[PAYEE], { startedAt: T0, holdMs: SENIOR_HOLD_MS });
    let other = startHolds(emptyStore(), [OTHER], STANDARD_HOLD_MS, T0);
    other = startHolds(other, [OTHER], SENIOR_HOLD_MS, T0 + 60_000);
    assert.deepStrictEqual(other.holds[OTHER], { startedAt: T0, holdMs: SENIOR_HOLD_MS });
  });

  it('remembers addresses once paid and drops their hold', () => {
    let store = startHolds(emptyStore(), [PAYEE], STANDARD_HOLD_MS, T0);
    store = markSent(store, [PAYEE], T0 + STANDARD_HOLD_MS + 5);
    assert.strictEqual(store.holds[PAYEE], undefined);
    assert.strictEqual(checkAddresses(store, [PAYEE], T0, nobody)[0].status, 'known');
  });

  it('seeds past recipients from outgoing transactions only, once per wallet', () => {
    const txs = [
      { value: -5000, outputs: [{ scriptPubKey: { addresses: [PAYEE] } }, { scriptPubKey: { addresses: ['bc1qchange'] } }] },
      { value: 7000, outputs: [{ scriptPubKey: { addresses: [OTHER] } }] }, // incoming: the sender isn't a payee
    ];
    const w = wallet('w1', ['bc1qchange'], txs);
    assert.deepStrictEqual(pastRecipients(w), [PAYEE]);
    const seeded = seedFromWallets(emptyStore(), [w], T0);
    assert.ok(seeded.known[PAYEE]);
    assert.strictEqual(seeded.known[OTHER], undefined);
    assert.strictEqual(seeded.known.bc1qchange, undefined);
    assert.strictEqual(seeded.seededWallets.w1, true);
    // Already seeded: a later scan doesn't re-read history.
    const again = seedFromWallets(seeded, [wallet('w1', [], [{ value: -1, outputs: [{ scriptPubKey: { addresses: [OTHER] } }] }])], T0);
    assert.strictEqual(again.known[OTHER], undefined);
  });

  it('treats any wallet on the phone as own, and survives wallets that throw', () => {
    const throwing: GuardWallet = {
      getID: () => 'ln',
      weOwnAddress: () => {
        throw new Error('not supported');
      },
      getTransactions: () => {
        throw new Error('nope');
      },
    };
    const own = ownedByAny([throwing, wallet('w2', [OTHER])]);
    assert.strictEqual(own(OTHER), true);
    assert.strictEqual(own(PAYEE), false);
    assert.deepStrictEqual(pastRecipients(throwing), []);
  });
});
