import assert from 'assert';
import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';

import { collectWalletExternalAddressesForNotifications, setApplicationIconBadgeNumber } from '../../blue_modules/notifications';

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

  describe('setApplicationIconBadgeNumber', () => {
    const originalOS = Platform.OS;
    let setBadge;

    beforeEach(() => {
      PushNotification.setApplicationIconBadgeNumber = PushNotification.setApplicationIconBadgeNumber || (() => {});
      setBadge = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber').mockImplementation(() => {});
    });

    afterEach(() => {
      Platform.OS = originalOS;
      setBadge.mockRestore();
    });

    // The native badge helper crashed the app on Xiaomi HyperOS (Android 16).
    it('never touches the native badge on Android', () => {
      Platform.OS = 'android';
      setApplicationIconBadgeNumber(0);
      expect(setBadge).not.toHaveBeenCalled();
    });

    it('sets the badge on iOS', () => {
      Platform.OS = 'ios';
      setApplicationIconBadgeNumber(3);
      expect(setBadge).toHaveBeenCalledWith(3);
    });
  });
});
