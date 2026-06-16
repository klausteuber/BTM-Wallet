import assert from 'assert';

import { collectWalletExternalAddressesForNotifications } from '../../blue_modules/notifications';

describe('notifications', () => {
  it('collects unique external wallet addresses for push notifications', () => {
    const wallets = [
      {
        getAllExternalAddresses: () => ['bc1q-first', 'bc1q-second', 'bc1q-first'],
      },
      {
        getAllExternalAddresses: () => ['bc1q-third', '', false, 'bc1q-second'],
      },
    ];

    assert.deepStrictEqual(collectWalletExternalAddressesForNotifications(wallets), ['bc1q-first', 'bc1q-second', 'bc1q-third']);
  });

  it('skips wallets that cannot provide notification addresses', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const wallets = [
      {},
      {
        getID: () => 'broken-wallet',
        getAllExternalAddresses: () => {
          throw new Error('boom');
        },
      },
      {
        getAllExternalAddresses: () => ['bc1q-ok'],
      },
    ];

    assert.deepStrictEqual(collectWalletExternalAddressesForNotifications(wallets), ['bc1q-ok']);
    consoleWarn.mockRestore();
  });
});
