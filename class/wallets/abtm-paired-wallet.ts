import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';

type PairedWalletInfo = {
  customerId?: string;
  pairedWalletId?: string;
  currentAddress?: string;
  currentAddressId?: string;
  status?: string;
  kycVerified?: boolean;
  kycApplicantId?: string;
  authorizationId?: string;
  authorizationStatus?: string;
  serverBaseUrl?: string;
  updatedAt?: string;
};

export class ABTMPairedWallet extends HDSegwitBech32Wallet {
  static readonly type = 'abtmPairedWallet';
  static readonly typeReadable = 'ABTM Paired Wallet';
  static readonly defaultLabel = 'ABTM Paired Wallet';
  // @ts-ignore: override
  public readonly type = ABTMPairedWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = ABTMPairedWallet.typeReadable;

  pairedWalletInfo?: PairedWalletInfo;

  constructor() {
    super();
    this.setLabel(ABTMPairedWallet.defaultLabel);
    this.pairedWalletInfo = {};
  }

  getRegistrationAddress(): string {
    return this._getExternalAddressByIndex(0);
  }

  getRegistrationDerivationPath(): string {
    return `${this.getDerivationPath()}/0/0`;
  }

  getRegistrationDescriptor(): string {
    const fingerprint = this.getMasterFingerprintHex();
    const originPath = (this.getDerivationPath() || "m/84'/0'/0'").replace(/^m\//, '').replace(/'/g, 'h');

    return `wpkh([${fingerprint}/${originPath}]${this.getXpub()}/0/*)`;
  }

  buildPairingRegistration(message: string) {
    const firstAddress = this.getRegistrationAddress();

    return {
      scriptType: 'p2wpkh',
      network: 'mainnet',
      descriptor: this.getRegistrationDescriptor(),
      walletXpub: this.getXpub(),
      walletFingerprint: this.getMasterFingerprintHex(),
      firstAddress,
      derivationIndex: 0,
      derivationPath: this.getRegistrationDerivationPath(),
      firstAddressSignature: this.signMessage(message, firstAddress),
    };
  }

  setPairedWalletInfo(info?: PairedWalletInfo): void {
    this.pairedWalletInfo = info || {};
  }

  getPairedWalletInfo(): PairedWalletInfo {
    return this.pairedWalletInfo || {};
  }

  clearPairedWalletInfo(): void {
    this.pairedWalletInfo = {};
  }

  isABTMPairedWallet(): boolean {
    return true;
  }
}
