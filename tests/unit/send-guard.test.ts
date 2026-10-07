import assert from 'assert';

import {
  allClear,
  checkAddresses,
  emptyStore,
  GuardWallet,
  markKnown,
  normalizeAddress,
  ownedByAny,
  pastRecipients,
  seedFromWallets,
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

  it('flags a never-paid address as new, and own addresses as known', () => {
    const checks = checkAddresses(emptyStore(), [PAYEE, OTHER], (a: string) => a === OTHER);
    assert.deepStrictEqual(
      checks.map(c => c.status),
      ['new', 'known'],
    );
    assert.strictEqual(allClear(checks), false);
  });

  it('has no amount exemption and dedupes repeated recipients', () => {
    const checks = checkAddresses(emptyStore(), [PAYEE, PAYEE.toUpperCase()], nobody);
    assert.strictEqual(checks.length, 1);
    assert.strictEqual(checks[0].status, 'new');
  });

  it('a passed check (or a broadcast) clears the address at once, with no waiting period', () => {
    const store = markKnown(emptyStore(), [PAYEE.toUpperCase()], T0);
    const checks = checkAddresses(store, [PAYEE], nobody);
    assert.deepStrictEqual(checks, [{ address: PAYEE, status: 'known' }]);
    assert.strictEqual(allClear(checks), true);
    // Marking again keeps the first time it was learned.
    assert.strictEqual(markKnown(store, [PAYEE], T0 + 5).known[PAYEE], T0);
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
