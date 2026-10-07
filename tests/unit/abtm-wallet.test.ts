import assert from 'assert';

// The wallet classes first: importing a single wallet module before `class/index` hits an import cycle.
import { ABTMPairedWallet, HDLegacyP2PKHWallet, HDSegwitBech32Wallet, HDTaprootWallet, WatchOnlyWallet } from '../../class';
import {
  buildPairingRegistration,
  isRegisteredWallet,
  registeredWalletOnPhone,
  registrableWallets,
  registrationAddress,
  registrationDescriptor,
} from '../../blue_modules/abtm-wallet';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ADDRESS_0 = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';

function standardWallet(): HDSegwitBech32Wallet {
  // What 7.2.x created: a plain HD native-SegWit wallet labelled "Wallet".
  const w = new HDSegwitBech32Wallet();
  w.setLabel('Wallet');
  w.setSecret(MNEMONIC);
  return w;
}

function abtmWallet(): ABTMPairedWallet {
  const w = new ABTMPairedWallet();
  w.setSecret(MNEMONIC);
  return w;
}

describe('ABTM wallet registration helpers', () => {
  it('a wallet made by an earlier version of the app can be registered', () => {
    const legacy = standardWallet();
    assert.deepStrictEqual(registrableWallets([legacy]), [legacy]);
  });

  it('lists America Bitcoin wallets before standard ones', () => {
    const legacy = standardWallet();
    const abtm = abtmWallet();
    assert.deepStrictEqual(registrableWallets([legacy, abtm]), [abtm, legacy]);
  });

  it('leaves out wallets the account service cannot derive addresses for', () => {
    const watchOnly = new WatchOnlyWallet();
    watchOnly.setSecret('zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs');
    const legacyP2pkh = new HDLegacyP2PKHWallet();
    legacyP2pkh.setSecret(MNEMONIC);
    const taproot = new HDTaprootWallet();
    taproot.setSecret(MNEMONIC);
    const noSecret = new HDSegwitBech32Wallet();
    assert.deepStrictEqual(registrableWallets([watchOnly, legacyP2pkh, taproot, noSecret]), []);
  });

  it('builds the same registration for a standard wallet as for an America Bitcoin wallet of the same seed', () => {
    const legacy = buildPairingRegistration(standardWallet(), 'challenge');
    const abtm = abtmWallet().buildPairingRegistration('challenge');
    for (const key of [
      'scriptType',
      'network',
      'descriptor',
      'walletXpub',
      'walletFingerprint',
      'firstAddress',
      'derivationIndex',
      'derivationPath',
    ] as const) {
      assert.deepStrictEqual(legacy[key], abtm[key], key);
    }
    assert.strictEqual(legacy.firstAddress, ADDRESS_0);
    assert.strictEqual(standardWallet().verifyMessage('challenge', ADDRESS_0, legacy.firstAddressSignature), true);
    assert.strictEqual(registrationDescriptor(standardWallet()), abtmWallet().getRegistrationDescriptor());
  });

  it("sends where the wallet's unused receive addresses start", () => {
    const fresh = standardWallet();
    assert.strictEqual(buildPairingRegistration(fresh, 'm').firstUnusedIndex, 0);
    const used = standardWallet();
    used.next_free_address_index = 7;
    assert.strictEqual(buildPairingRegistration(used, 'm').firstUnusedIndex, 7);
  });

  it('finds the registered wallet on the phone whatever its type', () => {
    const legacy = standardWallet();
    assert.strictEqual(registrationAddress(legacy), ADDRESS_0);
    assert.strictEqual(registeredWalletOnPhone([legacy], ADDRESS_0), legacy);
    assert.strictEqual(registeredWalletOnPhone([legacy], 'bc1qother'), undefined);
    assert.strictEqual(registeredWalletOnPhone([legacy], null), undefined);
  });

  it('marks only the registered wallet (the mint check on its card)', () => {
    assert.strictEqual(isRegisteredWallet(standardWallet(), ADDRESS_0), true);
    assert.strictEqual(isRegisteredWallet(abtmWallet(), ADDRESS_0), true);
    assert.strictEqual(isRegisteredWallet(standardWallet(), 'bc1qother'), false);
    assert.strictEqual(isRegisteredWallet(standardWallet(), null), false);
    const taproot = new HDTaprootWallet();
    taproot.setSecret(MNEMONIC);
    assert.strictEqual(isRegisteredWallet(taproot, ADDRESS_0), false);
  });
});
