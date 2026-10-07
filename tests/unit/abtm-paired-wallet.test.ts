import assert from 'assert';

import { ABTMPairedWallet } from '../../class';

describe('ABTM Paired Wallet', () => {
  const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  it('creates the dedicated paired wallet with deterministic registration artifacts', () => {
    const wallet = new ABTMPairedWallet();
    wallet.setSecret(mnemonic);

    assert.strictEqual(wallet.type, ABTMPairedWallet.type);
    assert.strictEqual(wallet.typeReadable, ABTMPairedWallet.typeReadable);
    assert.strictEqual(wallet.getLabel(), ABTMPairedWallet.defaultLabel);
    assert.strictEqual(wallet.isABTMPairedWallet(), true);
    assert.strictEqual(wallet.getRegistrationAddress(), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    assert.strictEqual(wallet.getRegistrationDerivationPath(), "m/84'/0'/0'/0/0");
    assert.strictEqual(
      wallet.getRegistrationDescriptor(),
      'wpkh([73C5DA0A/84h/0h/0h]zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs/0/*)',
    );
  });

  it('builds a verifiable pairing registration payload for index 0', () => {
    const wallet = new ABTMPairedWallet();
    wallet.setSecret(mnemonic);

    const registration = wallet.buildPairingRegistration('ABTM pairing challenge');

    assert.strictEqual(registration.scriptType, 'p2wpkh');
    assert.strictEqual(registration.network, 'mainnet');
    assert.strictEqual(registration.derivationIndex, 0);
    assert.strictEqual(registration.derivationPath, "m/84'/0'/0'/0/0");
    assert.strictEqual(registration.firstAddress, 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    assert.strictEqual(registration.walletFingerprint, '73C5DA0A');
    assert.strictEqual(wallet.verifyMessage('ABTM pairing challenge', registration.firstAddress, registration.firstAddressSignature), true);
  });

  it('stores and clears paired-wallet metadata locally', () => {
    const wallet = new ABTMPairedWallet();

    wallet.setPairedWalletInfo({
      customerId: 'customer-1',
      pairedWalletId: 'wallet-1',
      currentAddress: 'bc1qexample',
      status: 'active',
    });

    assert.deepStrictEqual(wallet.getPairedWalletInfo(), {
      customerId: 'customer-1',
      pairedWalletId: 'wallet-1',
      currentAddress: 'bc1qexample',
      status: 'active',
    });

    wallet.clearPairedWalletInfo();

    assert.deepStrictEqual(wallet.getPairedWalletInfo(), {});
  });
});
