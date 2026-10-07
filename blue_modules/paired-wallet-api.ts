/**
 * Client for the America Bitcoin account service's wallet-app API
 * (https://account.americabitcoinatm.com/api/mobile/v1).
 *
 * Sign-in is one texted code (or an emailed code as the backup). At sign-in the
 * app registers a device key held by react-native-biometrics; sensitive requests
 * (register a wallet, approve or decline a kiosk purchase) are then signed with
 * that key after Face ID / Touch ID:
 *
 *   x-abtm-device-timestamp: <unix seconds>
 *   x-abtm-device-signature: base64(sign(METHOD\nPATH\nTIMESTAMP\nsha256hex(BODY)))
 *
 * Tokens and the device public key live in the keychain (this device only).
 */
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import ReactNativeBiometrics from 'react-native-biometrics';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import { sha256 } from '@noble/hashes/sha256';

import type { ABTMPairedWallet } from '../class/wallets/abtm-paired-wallet';
import { ABTM_WALLET_TYPE, buildPairingRegistration, RegistrableWallet } from './abtm-registration';
import { uint8ArrayToHex } from './uint8array-extras';

export const MOBILE_API_PREFIX = '/api/mobile/v1';
export const DEFAULT_API_BASE_URL = 'https://account.americabitcoinatm.com';
// The March 2026 prototype pointed here; installs that saved it are moved to the live service.
const RETIRED_BASE_URLS = ['https://api.americabitcoinatm.com'];
const REQUEST_TIMEOUT_MS = 20_000;

const SESSION_KEY = 'ABTM_PAIRED_WALLET_SESSION';
const BASE_URL_KEY = 'ABTM_PAIRED_WALLET_BASE_URL';
const DEVICE_PUBLIC_KEY_KEY = 'ABTM_PAIRED_WALLET_DEVICE_PUBLIC_KEY';

const biometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

export type Session = {
  accessToken: string;
  refreshToken: string;
  customerId: string;
  deviceId: string;
  sessionId: string;
  firstName?: string | null;
  phone?: string;
  baseUrl: string;
};

/** An error answer from the server (`{error, message}`), or a network failure (`code: 'network'`). */
export class AbtmApiError extends Error {
  code: string;
  status: number;
  body: Record<string, any>;

  constructor(code: string, status: number, message?: string, body: Record<string, any> = {}) {
    super(message || code);
    this.code = code;
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  auth?: boolean;
  signed?: boolean;
  promptMessage?: string;
  retry?: boolean;
  baseUrl?: string;
};

type Listener = () => void;

export type Channel = 'sms' | 'email';

export type DeviceRegistration = {
  deviceId: string;
  platform: string;
  devicePublicKey: string;
  attestationType: string;
  attestationPayload: Record<string, any>;
};

export type SignedInResponse = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  deviceId: string;
  customer: { id: string; firstName: string | null; verified: boolean };
};

export type KioskAuthorization = {
  id: string;
  status: 'pending_approval' | 'approved' | 'declined' | 'expired' | 'cancelled' | 'completed';
  location: string | null;
  /** The store, for the customer ("Cottonwood Mall"); null when unknown. Never show `location` (an internal code). */
  locationName: string | null;
  btmId: string | null;
  maskedAddress: string | null;
  address: string | null;
  createdAt: string;
  expiresAt: string;
};

export type AccountProfile = {
  id: string;
  firstName: string | null;
  maskedPhone: string;
  maskedEmail: string;
  createdAt: string | null;
  /**
   * `verified`: the account is ID-verified AND this phone proved it holds that identity
   * (a phone code alone never does). `identityLinked` without `verified` means this phone
   * needs a quick selfie first (KYC state 'device').
   */
  verification: {
    verified: boolean;
    identityLinked: boolean;
    deviceVerified: boolean;
    method: string | null;
    verifiedAt: string | null;
    source: string | null;
  };
  wallet: { registered: boolean; firstAddress: string | null };
  age65Plus: boolean | null;
  supportPhone: string;
  verifyUrl: string;
};

export type ActivityEvent = { event: string; label: string; at: string; device: string };

export type KycState = 'linked' | 'device' | 'found' | 'kyc_offer' | 'kyc_retry' | 'kyc_resume' | 'reviewing' | 'rejected' | 'unavailable';

export type KycOptions = {
  state: KycState;
  source?: string;
  unfinished?: string;
  consent: { version: string; text: string };
  supportPhone: string;
};

export function normalizeBaseUrl(baseUrl?: string | null): string {
  let candidate = (baseUrl || DEFAULT_API_BASE_URL).trim();
  if (candidate.endsWith('/')) candidate = candidate.slice(0, -1);
  return RETIRED_BASE_URLS.includes(candidate) ? DEFAULT_API_BASE_URL : candidate;
}

export function hashBody(body: string): string {
  return uint8ArrayToHex(sha256(body || ''));
}

/** The exact bytes the device key signs (must match account_service/device_auth.py). */
export function buildSignedPayload(method: string, path: string, timestamp: string, body: string): string {
  return `${method.toUpperCase()}\n${path}\n${timestamp}\n${hashBody(body)}`;
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const value = await RNSecureKeyStore.get(key);
    return value || null;
  } catch (_) {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  await RNSecureKeyStore.set(key, value, {
    accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function secureRemove(key: string): Promise<void> {
  try {
    await RNSecureKeyStore.remove(key);
  } catch (_) {}
}

function mapWalletInfo(remoteWallet: any, baseUrl: string) {
  if (!remoteWallet) return null;
  const latestAuthorization = remoteWallet.authorizations?.[0];

  return {
    customerId: remoteWallet.customerId,
    pairedWalletId: remoteWallet.id,
    currentAddress: remoteWallet.currentAddress?.address,
    currentAddressId: remoteWallet.currentAddress?.id,
    status: remoteWallet.status,
    kycVerified: remoteWallet.kycVerified,
    authorizationId: latestAuthorization?.id,
    authorizationStatus: latestAuthorization?.status,
    serverBaseUrl: baseUrl,
    updatedAt: remoteWallet.updated,
  };
}

class PairedWalletApi {
  private listeners = new Set<Listener>();

  /** Called whenever the session is saved or cleared (sign-in, sign-out, expiry). */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  async getConfiguredBaseUrl(): Promise<string> {
    return normalizeBaseUrl(await secureGet(BASE_URL_KEY));
  }

  /** Debug builds only (the Account screen's server switch): e.g. a local account service. */
  async setConfiguredBaseUrl(baseUrl: string): Promise<string> {
    const normalized = normalizeBaseUrl(baseUrl);
    await secureSet(BASE_URL_KEY, normalized);
    return normalized;
  }

  async getSession(): Promise<Session | null> {
    const raw = await secureGet(SESSION_KEY);
    if (!raw) return null;
    try {
      const session: Session = JSON.parse(raw);
      return { ...session, baseUrl: normalizeBaseUrl(session.baseUrl) };
    } catch (_) {
      return null;
    }
  }

  async clearSession(): Promise<void> {
    await secureRemove(SESSION_KEY);
    this.emit();
  }

  async applyRemoteWallet(wallet: ABTMPairedWallet, remoteWallet: any, baseUrl: string) {
    const walletInfo = mapWalletInfo(remoteWallet, normalizeBaseUrl(baseUrl));
    if (walletInfo) wallet.setPairedWalletInfo(walletInfo);
    else wallet.clearPairedWalletInfo();
    return walletInfo;
  }

  private async saveSession(session: Session): Promise<void> {
    await secureSet(SESSION_KEY, JSON.stringify(session));
    this.emit();
  }

  private async ensureDeviceKeys(): Promise<string> {
    const storedPublicKey = await secureGet(DEVICE_PUBLIC_KEY_KEY);
    const { keysExist } = await biometrics.biometricKeysExist();

    if (keysExist && storedPublicKey) return storedPublicKey;

    const { publicKey } = await biometrics.createKeys();
    await secureSet(DEVICE_PUBLIC_KEY_KEY, publicKey);
    return publicKey;
  }

  private async refreshSession(session: Session): Promise<Session> {
    const response = await this.rawRequest(
      '/auth/refresh',
      { method: 'POST', body: { refreshToken: session.refreshToken, deviceId: session.deviceId } },
      { baseUrl: session.baseUrl },
    );
    const nextSession: Session = {
      ...session,
      accessToken: response.accessToken,
      sessionId: response.sessionId,
      customerId: response.customerId || session.customerId,
      deviceId: response.deviceId || session.deviceId,
    };
    await this.saveSession(nextSession);
    return nextSession;
  }

  private async createSignature(method: string, path: string, body: string, promptMessage: string) {
    await this.ensureDeviceKeys();
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const payload = buildSignedPayload(method, path, timestamp, body);
    const result = await biometrics.createSignature({ promptMessage, payload });
    if (!result.success || !result.signature) {
      throw new AbtmApiError('biometric_cancelled', 0, 'Approval was cancelled.');
    }
    return { signature: result.signature, timestamp };
  }

  private async rawRequest(
    path: string,
    init: { method?: string; body?: Record<string, any> } = {},
    options: RequestOptions = {},
  ): Promise<any> {
    const method = init.method || 'GET';
    const body = init.body ? JSON.stringify(init.body) : '';
    const session = options.auth || options.signed ? await this.getSession() : null;
    if ((options.auth || options.signed) && !session) {
      throw new AbtmApiError('signed_out', 401, 'Please sign in.');
    }
    const baseUrl = normalizeBaseUrl(options.baseUrl || session?.baseUrl || (await this.getConfiguredBaseUrl()));
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

    if (options.signed) {
      const { signature, timestamp } = await this.createSignature(
        method,
        `${MOBILE_API_PREFIX}${path}`,
        body,
        options.promptMessage || 'Confirm with Face ID',
      );
      headers['x-abtm-device-timestamp'] = timestamp;
      headers['x-abtm-device-signature'] = signature;
    }

    // Deliberately not util/fetch: its dev logging prints headers, which carry tokens.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${MOBILE_API_PREFIX}${path}`, {
        method,
        headers,
        body: body || undefined,
        signal: controller.signal,
      });
    } catch (_) {
      throw new AbtmApiError('network', 0, "Can't reach America Bitcoin. Check your connection and try again.");
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_) {
      payload = {};
    }

    if (response.status === 401 && session?.refreshToken && !options.retry && path !== '/auth/refresh') {
      try {
        await this.refreshSession(session);
      } catch (e: any) {
        if (e instanceof AbtmApiError && e.status === 401) {
          await this.clearSession();
          throw new AbtmApiError('signed_out', 401, 'You were signed out. Please sign in again.');
        }
        throw e;
      }
      // A signed request is signed again (new timestamp): the server accepts each signature once.
      return this.rawRequest(path, init, { ...options, retry: true });
    }

    if (!response.ok) {
      throw new AbtmApiError(payload.error || `http_${response.status}`, response.status, payload.message, payload);
    }
    return payload;
  }

  private async getDeviceRegistration(): Promise<DeviceRegistration> {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      platform: Platform.OS,
      devicePublicKey: await this.ensureDeviceKeys(),
      attestationType: 'device_biometric',
      attestationPayload: {
        appVersion: DeviceInfo.getVersion(),
        systemVersion: DeviceInfo.getSystemVersion(),
        brand: DeviceInfo.getBrand(),
        model: DeviceInfo.getModel(),
      },
    };
  }

  private async startSession(response: SignedInResponse, phone: string | undefined, baseUrl: string) {
    await this.saveSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      customerId: response.customer.id,
      firstName: response.customer.firstName,
      deviceId: response.deviceId,
      sessionId: response.sessionId,
      phone,
      baseUrl,
    });
  }

  // ---------------------------------------------------------------- sign-in

  /** Text a code (or, with channel 'email', email one to an existing account's address). */
  async requestCode(phone: string, channel: Channel = 'sms') {
    return this.rawRequest('/auth/request-code', { method: 'POST', body: channel === 'email' ? { phone, channel } : { phone } });
  }

  /**
   * Check a texted code. A number with an account is signed in; a new number
   * gets a signup token for the next steps.
   */
  async continueWithPhone(
    phone: string,
    code: string,
  ): Promise<{ existingAccount: true } | { existingAccount: false; signupToken: string; maskedPhone: string }> {
    const baseUrl = await this.getConfiguredBaseUrl();
    const registration = await this.getDeviceRegistration();
    const response = await this.rawRequest('/signup/phone', { method: 'POST', body: { phone, code, ...registration } }, { baseUrl });
    if (response.existingAccount) {
      await this.startSession(response, phone, baseUrl);
      return { existingAccount: true };
    }
    return { existingAccount: false, signupToken: response.signupToken, maskedPhone: response.maskedPhone };
  }

  /** Sign in with a code sent by email (the backup when a text doesn't arrive). */
  async signInWithEmailCode(phone: string, code: string): Promise<void> {
    const baseUrl = await this.getConfiguredBaseUrl();
    const registration = await this.getDeviceRegistration();
    const response = await this.rawRequest(
      '/auth/verify-code',
      { method: 'POST', body: { phone, code, channel: 'email', ...registration } },
      { baseUrl },
    );
    await this.startSession(response, phone, baseUrl);
  }

  async signupSendEmail(signupToken: string, email: string, firstName: string): Promise<{ emailToken: string; maskedEmail: string }> {
    return this.rawRequest('/signup/email', { method: 'POST', body: { signupToken, email, firstName } });
  }

  async signupVerifyEmail(
    signupToken: string,
    emailToken: string,
    code: string,
  ): Promise<{ verifiedToken: string; terms: { version: string; termsUrl: string; privacyUrl: string } }> {
    return this.rawRequest('/signup/email/verify', { method: 'POST', body: { signupToken, emailToken, code } });
  }

  async signupComplete(verifiedToken: string, termsVersion: string, phone: string): Promise<void> {
    const baseUrl = await this.getConfiguredBaseUrl();
    const registration = await this.getDeviceRegistration();
    const response = await this.rawRequest(
      '/signup/complete',
      { method: 'POST', body: { verifiedToken, acceptTerms: true, termsVersion, ...registration } },
      { baseUrl },
    );
    await this.startSession(response, phone, baseUrl);
  }

  /** Revoke this app session on the server (best effort) and forget it here. */
  async signOut(): Promise<void> {
    try {
      await this.rawRequest('/auth/logout', { method: 'POST', body: {} }, { auth: true, retry: true });
    } catch (_) {}
    await this.clearSession();
  }

  // ---------------------------------------------------------------- account

  async getAccount(): Promise<AccountProfile> {
    return this.rawRequest('/account', {}, { auth: true });
  }

  async getActivity(): Promise<ActivityEvent[]> {
    return (await this.rawRequest('/account/activity', {}, { auth: true })).events;
  }

  // ---------------------------------------------------------------- ID verification

  async getKycOptions(): Promise<KycOptions> {
    return this.rawRequest('/kyc/options', {}, { auth: true });
  }

  async startSelfieLink(consentVersion: string): Promise<{ attemptId: string; accessToken: string }> {
    return this.rawRequest('/kyc/link/start', { method: 'POST', body: { biometricConsent: { version: consentVersion } } }, { auth: true });
  }

  async refreshSelfieLinkToken(attemptId: string): Promise<string> {
    return (await this.rawRequest('/kyc/link/token', { method: 'POST', body: { attemptId } }, { auth: true })).accessToken;
  }

  async getSelfieLinkStatus(attemptId: string): Promise<string> {
    return (await this.rawRequest(`/kyc/link/status/${encodeURIComponent(attemptId)}`, {}, { auth: true })).state;
  }

  async startIdVerification(consentVersion: string): Promise<{ accessToken: string }> {
    return this.rawRequest(
      '/kyc/verify/start',
      { method: 'POST', body: { biometricConsent: { version: consentVersion } } },
      { auth: true },
    );
  }

  async refreshIdVerificationToken(): Promise<string> {
    return (await this.rawRequest('/kyc/verify/token', { method: 'POST', body: {} }, { auth: true })).accessToken;
  }

  async getIdVerificationStatus(): Promise<string> {
    return (await this.rawRequest('/kyc/verify/status', {}, { auth: true })).state;
  }

  // ---------------------------------------------------------------- wallet

  async getPairedWallet() {
    return this.rawRequest('/paired-wallet', {}, { auth: true });
  }

  async createRegistrationChallenge() {
    return this.rawRequest(
      '/paired-wallet/register/challenge',
      { method: 'POST', body: {} },
      { auth: true, signed: true, promptMessage: 'Confirm to register your wallet' },
    );
  }

  /**
   * Prove ownership of receive address 0 and register the wallet's xpub with the account.
   * Works for an America Bitcoin wallet and for a standard native-SegWit HD wallet
   * (see `registrableWallets`); only the former stores the account's wallet info locally.
   */
  async registerPairedWallet(wallet: RegistrableWallet) {
    const challenge = await this.createRegistrationChallenge();
    const response = await this.rawRequest(
      '/paired-wallet/register',
      {
        method: 'POST',
        body: { ...buildPairingRegistration(wallet, challenge.message), challengeToken: challenge.challengeToken },
      },
      { auth: true, signed: true, promptMessage: 'Confirm to register your wallet' },
    );
    if (wallet.type === ABTM_WALLET_TYPE) {
      await this.applyRemoteWallet(wallet, response.pairedWallet, await this.getConfiguredBaseUrl());
    }
    return response;
  }

  async revokePairedWallet(reason = 'Removed in the app') {
    return this.rawRequest(
      '/paired-wallet/revoke',
      { method: 'POST', body: { reason } },
      { auth: true, signed: true, promptMessage: 'Confirm to remove your wallet from your account' },
    );
  }

  // ---------------------------------------------------------------- push notifications

  /** This phone's APNs token, so kiosk approval requests reach it when the app is closed. */
  async savePushToken(token: string, environment: 'production' | 'sandbox'): Promise<{ pushConfigured: boolean }> {
    return this.rawRequest('/devices/push-token', { method: 'POST', body: { token, environment } }, { auth: true });
  }

  // ---------------------------------------------------------------- kiosk approvals

  async listAuthorizations(): Promise<KioskAuthorization[]> {
    return (await this.rawRequest('/kiosk-authorizations', {}, { auth: true })).authorizations;
  }

  async getAuthorization(authorizationId: string): Promise<KioskAuthorization> {
    return (await this.rawRequest(`/kiosk-authorizations/${encodeURIComponent(authorizationId)}`, {}, { auth: true })).authorization;
  }

  async approveAuthorization(authorizationId: string): Promise<KioskAuthorization> {
    const response = await this.rawRequest(
      `/kiosk-authorizations/${encodeURIComponent(authorizationId)}/approve`,
      { method: 'POST', body: { approvalMethod: 'device_biometric', appVersion: DeviceInfo.getVersion() } },
      { auth: true, signed: true, promptMessage: 'Approve this Bitcoin ATM purchase' },
    );
    return response.authorization;
  }

  async declineAuthorization(authorizationId: string): Promise<KioskAuthorization> {
    const response = await this.rawRequest(
      `/kiosk-authorizations/${encodeURIComponent(authorizationId)}/decline`,
      { method: 'POST', body: {} },
      { auth: true, signed: true, promptMessage: 'Decline this Bitcoin ATM purchase' },
    );
    return response.authorization;
  }
}

export const pairedWalletApi = new PairedWalletApi();
