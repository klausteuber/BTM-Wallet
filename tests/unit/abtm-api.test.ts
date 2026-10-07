import assert from 'assert';

const store: Record<string, string> = {};
const createSignature = jest.fn(async ({ payload }: { payload: string }) => ({ success: true, signature: `sig(${payload.length})` }));

jest.mock('react-native-secure-key-store', () => ({
  __esModule: true,
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'x' },
  default: {
    get: jest.fn(async (k: string) => {
      if (!(k in store)) throw new Error('missing');
      return store[k];
    }),
    set: jest.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    remove: jest.fn(async (k: string) => {
      delete store[k];
    }),
  },
}));

jest.mock('react-native-biometrics', () =>
  jest.fn().mockImplementation(() => ({
    biometricKeysExist: jest.fn(async () => ({ keysExist: true })),
    createKeys: jest.fn(async () => ({ publicKey: 'PUBKEY' })),
    createSignature,
  })),
);

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(async () => 'uniqueId'),
  getVersion: jest.fn(() => '7.2.4'),
  getSystemVersion: jest.fn(() => '26.5'),
  getBrand: jest.fn(() => 'Apple'),
  getModel: jest.fn(() => 'iPhone'),
}));

// eslint-disable-next-line import/first
import { AbtmApiError, buildSignedPayload, hashBody, normalizeBaseUrl, pairedWalletApi } from '../../blue_modules/paired-wallet-api';

type Call = { url: string; init: any };
let calls: Call[] = [];
let replies: Array<{ status: number; body: any }> = [];

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  store.ABTM_PAIRED_WALLET_DEVICE_PUBLIC_KEY = 'PUBKEY';
  calls = [];
  replies = [];
  createSignature.mockClear();
  (global as any).fetch = jest.fn(async (url: string, init: any) => {
    calls.push({ url, init });
    const reply = replies.shift() || { status: 200, body: {} };
    return { ok: reply.status < 400, status: reply.status, text: async () => JSON.stringify(reply.body) };
  });
});

function signIn() {
  store.ABTM_PAIRED_WALLET_SESSION = JSON.stringify({
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    customerId: 'c1',
    deviceId: 'uniqueId',
    sessionId: 's1',
    baseUrl: 'https://account.americabitcoinatm.com',
  });
}

describe('America Bitcoin API client', () => {
  it('signs METHOD, PATH, TIMESTAMP and the body hash, like device_auth.py', () => {
    assert.strictEqual(hashBody(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.strictEqual(
      buildSignedPayload('post', '/api/mobile/v1/kiosk-authorizations/ws_1/approve', '1800000000', '{}'),
      'POST\n/api/mobile/v1/kiosk-authorizations/ws_1/approve\n1800000000\n44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
    );
  });

  it('uses the live account service, and moves installs off the retired prototype URL', () => {
    assert.strictEqual(normalizeBaseUrl(undefined), 'https://account.americabitcoinatm.com');
    assert.strictEqual(normalizeBaseUrl('https://api.americabitcoinatm.com/'), 'https://account.americabitcoinatm.com');
    assert.strictEqual(normalizeBaseUrl('http://localhost:5121/'), 'http://localhost:5121');
  });

  it('turns server errors into AbtmApiError with the server message', async () => {
    replies.push({ status: 400, body: { error: 'wrong_code', message: "That code didn't work." } });
    await assert.rejects(pairedWalletApi.continueWithPhone('7025550142', '000000'), (e: any) => {
      assert.ok(e instanceof AbtmApiError);
      assert.strictEqual(e.code, 'wrong_code');
      assert.strictEqual(e.message, "That code didn't work.");
      return true;
    });
    assert.strictEqual(calls[0].url, 'https://account.americabitcoinatm.com/api/mobile/v1/signup/phone');
    const body = JSON.parse(calls[0].init.body);
    assert.strictEqual(body.devicePublicKey, 'PUBKEY');
    assert.strictEqual(body.deviceId, 'uniqueId');
  });

  it('saves the session when the phone step signs an existing customer in', async () => {
    replies.push({
      status: 200,
      body: { existingAccount: true, accessToken: 'a', refreshToken: 'r', sessionId: 's', deviceId: 'uniqueId', customer: { id: 'c9', firstName: 'Pat', verified: false } },
    });
    const result = await pairedWalletApi.continueWithPhone('7025550142', '123456');
    assert.strictEqual(result.existingAccount, true);
    const session = await pairedWalletApi.getSession();
    assert.strictEqual(session?.customerId, 'c9');
    assert.strictEqual(session?.firstName, 'Pat');
  });

  it('signs approvals with the device key and sends the exact signed body', async () => {
    signIn();
    replies.push({ status: 200, body: { authorization: { id: 'ws_1', status: 'approved' } } });
    const result = await pairedWalletApi.approveAuthorization('ws_1');
    assert.strictEqual(result.status, 'approved');
    const { init } = calls[0];
    assert.strictEqual(init.headers.Authorization, 'Bearer access-1');
    const ts = init.headers['x-abtm-device-timestamp'];
    const expected = buildSignedPayload('POST', '/api/mobile/v1/kiosk-authorizations/ws_1/approve', ts, init.body);
    assert.strictEqual(createSignature.mock.calls[0][0].payload, expected);
    assert.strictEqual(init.headers['x-abtm-device-signature'], `sig(${expected.length})`);
  });

  it('refreshes an expired access token once and re-signs the retried request', async () => {
    signIn();
    replies.push({ status: 401, body: { error: 'token_expired' } });
    replies.push({ status: 200, body: { accessToken: 'access-2', sessionId: 's1', customerId: 'c1', deviceId: 'uniqueId' } });
    replies.push({ status: 200, body: { authorization: { id: 'ws_1', status: 'declined' } } });
    await pairedWalletApi.declineAuthorization('ws_1');
    assert.deepStrictEqual(
      calls.map(c => c.url.split('/v1')[1]),
      ['/kiosk-authorizations/ws_1/decline', '/auth/refresh', '/kiosk-authorizations/ws_1/decline'],
    );
    assert.strictEqual(calls[2].init.headers.Authorization, 'Bearer access-2');
    assert.strictEqual(createSignature.mock.calls.length, 2);
  });

  it('signs out locally when the refresh token is rejected', async () => {
    signIn();
    replies.push({ status: 401, body: { error: 'token_expired' } });
    replies.push({ status: 401, body: { error: 'unauthorized' } });
    await assert.rejects(pairedWalletApi.getAccount(), (e: any) => e.code === 'signed_out');
    assert.strictEqual(await pairedWalletApi.getSession(), null);
  });

  it('refuses account calls without a session, without touching the network', async () => {
    await assert.rejects(pairedWalletApi.listAuthorizations(), (e: any) => e.code === 'signed_out');
    assert.strictEqual(calls.length, 0);
  });

  it('reports a cancelled Face ID prompt distinctly', async () => {
    signIn();
    createSignature.mockImplementationOnce(async () => ({ success: false, signature: '' }) as any);
    await assert.rejects(pairedWalletApi.approveAuthorization('ws_1'), (e: any) => e.code === 'biometric_cancelled');
    assert.strictEqual(calls.length, 0);
  });

  it('sends the biometric consent version with ID verification starts', async () => {
    signIn();
    replies.push({ status: 200, body: { attemptId: 'a1', accessToken: 'tok' } });
    await pairedWalletApi.startSelfieLink('2026-10-06');
    assert.deepStrictEqual(JSON.parse(calls[0].init.body), { biometricConsent: { version: '2026-10-06' } });
  });
});
