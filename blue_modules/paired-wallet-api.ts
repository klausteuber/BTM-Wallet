import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import ReactNativeBiometrics from 'react-native-biometrics';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import { sha256 } from '@noble/hashes/sha256';

import { ABTMPairedWallet } from '../class';
import { uint8ArrayToHex } from './uint8array-extras';

const MOBILE_API_PREFIX = '/api/mobile/v1';
const DEFAULT_API_BASE_URL = 'https://api.americabitcoinatm.com';
const SESSION_KEY = 'ABTM_PAIRED_WALLET_SESSION';
const BASE_URL_KEY = 'ABTM_PAIRED_WALLET_BASE_URL';
const DEVICE_PUBLIC_KEY_KEY = 'ABTM_PAIRED_WALLET_DEVICE_PUBLIC_KEY';

const biometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

type Session = {
  accessToken: string;
  refreshToken: string;
  customerId: string;
  deviceId: string;
  sessionId: string;
  phone?: string;
  baseUrl: string;
};

type RequestOptions = {
  auth?: boolean;
  signed?: boolean;
  promptMessage?: string;
  retry?: boolean;
  baseUrl?: string;
};

function normalizeBaseUrl(baseUrl?: string): string {
  const candidate = (baseUrl || DEFAULT_API_BASE_URL).trim();
  return candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
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

function hashBody(body: string): string {
  return uint8ArrayToHex(sha256(body || ''));
}

function buildSignedPayload(method: string, path: string, timestamp: string, body: string): string {
  return `${method.toUpperCase()}\n${path}\n${timestamp}\n${hashBody(body)}`;
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
    kycApplicantId: remoteWallet.kycApplicantId,
    authorizationId: latestAuthorization?.id,
    authorizationStatus: latestAuthorization?.status,
    serverBaseUrl: baseUrl,
    updatedAt: remoteWallet.updated,
  };
}

class PairedWalletApi {
  async getConfiguredBaseUrl(): Promise<string> {
    return normalizeBaseUrl((await secureGet(BASE_URL_KEY)) || DEFAULT_API_BASE_URL);
  }

  async setConfiguredBaseUrl(baseUrl: string): Promise<string> {
    const normalized = normalizeBaseUrl(baseUrl);
    await secureSet(BASE_URL_KEY, normalized);
    return normalized;
  }

  async getSession(): Promise<Session | null> {
    const raw = await secureGet(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  async clearSession(): Promise<void> {
    await secureRemove(SESSION_KEY);
  }

  async applyRemoteWallet(wallet: ABTMPairedWallet, remoteWallet: any, baseUrl: string) {
    const walletInfo = mapWalletInfo(remoteWallet, normalizeBaseUrl(baseUrl));
    if (walletInfo) wallet.setPairedWalletInfo(walletInfo);
    else wallet.clearPairedWalletInfo();
    return walletInfo;
  }

  private async saveSession(session: Session): Promise<void> {
    await secureSet(SESSION_KEY, JSON.stringify(session));
    await this.setConfiguredBaseUrl(session.baseUrl);
  }

  private async ensureDeviceKeys(): Promise<string> {
    const storedPublicKey = await secureGet(DEVICE_PUBLIC_KEY_KEY);
    const { keysExist } = await biometrics.biometricKeysExist();

    if (keysExist && storedPublicKey) return storedPublicKey;

    const { publicKey } = await biometrics.createKeys();
    await secureSet(DEVICE_PUBLIC_KEY_KEY, publicKey);
    return publicKey;
  }

  private async getDeviceId(): Promise<string> {
    return DeviceInfo.getUniqueId();
  }

  private async refreshSession(session: Session): Promise<Session> {
    const response = await this.rawRequest(
      '/auth/refresh',
      {
        method: 'POST',
        body: {
          refreshToken: session.refreshToken,
          deviceId: session.deviceId,
        },
      },
      {
        baseUrl: session.baseUrl,
      },
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

  private async createSignature(
    method: string,
    path: string,
    body: string,
    promptMessage: string,
  ): Promise<{ signature: string; timestamp: string }> {
    await this.ensureDeviceKeys();
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const payload = buildSignedPayload(method, path, timestamp, body);
    const result = await biometrics.createSignature({
      promptMessage,
      payload,
    });

    if (!result.success || !result.signature) {
      throw new Error('Biometric approval was cancelled');
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
    const baseUrl = normalizeBaseUrl(options.baseUrl || session?.baseUrl || (await this.getConfiguredBaseUrl()));
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body) headers['Content-Type'] = 'application/json';
    if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

    if (options.signed) {
      const { signature, timestamp } = await this.createSignature(
        method,
        `${MOBILE_API_PREFIX}${path}`,
        body,
        options.promptMessage || 'Confirm with biometrics',
      );
      headers['x-abtm-device-timestamp'] = timestamp;
      headers['x-abtm-device-signature'] = signature;
    }

    const response = await fetch(`${baseUrl}${MOBILE_API_PREFIX}${path}`, {
      method,
      headers,
      body: body || undefined,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (response.status === 401 && session?.refreshToken && !options.retry) {
      await this.refreshSession(session);
      return this.rawRequest(path, init, { ...options, retry: true });
    }

    if (!response.ok) {
      throw new Error(payload.error || `Request failed (${response.status})`);
    }

    return payload;
  }

  private async getDeviceRegistration(): Promise<{
    deviceId: string;
    platform: string;
    devicePublicKey: string;
    attestationType: string;
    attestationPayload: Record<string, any>;
  }> {
    return {
      deviceId: await this.getDeviceId(),
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

  async requestCode(phone: string, baseUrl?: string) {
    return this.rawRequest(
      '/auth/request-code',
      {
        method: 'POST',
        body: { phone },
      },
      { baseUrl },
    );
  }

  async verifyCode({ phone, code, baseUrl }: { phone: string; code: string; baseUrl?: string }) {
    const registration = await this.getDeviceRegistration();
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl || (await this.getConfiguredBaseUrl()));
    const response = await this.rawRequest(
      '/auth/verify-code',
      {
        method: 'POST',
        body: {
          phone,
          code,
          ...registration,
        },
      },
      { baseUrl: normalizedBaseUrl },
    );

    await this.saveSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      customerId: response.customer.id,
      deviceId: registration.deviceId,
      sessionId: response.sessionId,
      phone,
      baseUrl: normalizedBaseUrl,
    });

    return response;
  }

  async getKycStatus() {
    return this.rawRequest('/kyc/status', {}, { auth: true });
  }

  async getKycSdkToken() {
    return this.rawRequest(
      '/kyc/sdk-token',
      { method: 'POST', body: {} },
      {
        auth: true,
        signed: true,
        promptMessage: 'Confirm identity to start KYC',
      },
    );
  }

  async getPairedWallet() {
    return this.rawRequest('/paired-wallet', {}, { auth: true });
  }

  async createRegistrationChallenge() {
    return this.rawRequest(
      '/paired-wallet/register/challenge',
      { method: 'POST', body: {} },
      {
        auth: true,
        signed: true,
        promptMessage: 'Confirm wallet pairing challenge',
      },
    );
  }

  async registerPairedWallet(wallet: ABTMPairedWallet) {
    const challenge = await this.createRegistrationChallenge();
    const response = await this.rawRequest(
      '/paired-wallet/register',
      {
        method: 'POST',
        body: {
          ...wallet.buildPairingRegistration(challenge.message),
          challengeToken: challenge.challengeToken,
        },
      },
      {
        auth: true,
        signed: true,
        promptMessage: 'Confirm wallet pairing',
      },
    );

    const baseUrl = await this.getConfiguredBaseUrl();
    await this.applyRemoteWallet(wallet, response.pairedWallet, baseUrl);
    return response;
  }

  async revokePairedWallet(reason = 'Revoked from wallet app') {
    return this.rawRequest(
      '/paired-wallet/revoke',
      {
        method: 'POST',
        body: { reason },
      },
      {
        auth: true,
        signed: true,
        promptMessage: 'Confirm paired wallet revocation',
      },
    );
  }

  async getAuthorization(authorizationId: string) {
    return this.rawRequest(`/kiosk-authorizations/${authorizationId}`, {}, { auth: true });
  }

  async approveAuthorization(authorizationId: string) {
    return this.rawRequest(
      `/kiosk-authorizations/${authorizationId}/approve`,
      {
        method: 'POST',
        body: {
          vendorName: 'device_biometric',
          vendorMetadata: {
            approvalMethod: 'device_biometric',
            appVersion: DeviceInfo.getVersion(),
          },
        },
      },
      {
        auth: true,
        signed: true,
        promptMessage: 'Approve this kiosk session',
      },
    );
  }
}

export const pairedWalletApi = new PairedWalletApi();
