import { element } from 'detox';

import { scrollUpOnHomeScreen, tapAndTapAgainIfElementIsNotVisible, waitForId, waitForText } from './helperz';

describe('ATM receive flow', () => {
  it('lets the user leave the ATM QR screen after confirming the backup warning', async () => {
    await device.clearKeychain();
    await device.launchApp({ delete: true, permissions: { notifications: 'YES' } });
    await waitForId('WalletsList');

    await scrollUpOnHomeScreen();
    await tapAndTapAgainIfElementIsNotVisible('HomeScreenScanButton', 'CreateATMWalletButton');
    await element(by.id('CreateATMWalletButton')).tap();

    await waitForId('ReceiveDetailsScrollView', 120000);
    await waitForId('NavigationCloseButton');
    await element(by.id('NavigationCloseButton')).atIndex(0).tap();

    await waitForText('Leave without backing up?');
    await element(by.text('Leave Anyway')).tap();

    await waitForId('WalletsList');
    await expect(element(by.id('WalletsList'))).toBeVisible();
  });
});
