import { sha256 } from '@noble/hashes/sha256';
import { element } from 'detox';

export async function waitForId(id, timeout = 33000) {
  try {
    await waitFor(element(by.id(id)))
      .toBeVisible()
      .withTimeout(timeout / 2);
  } catch (_) {
    // nop
  }

  try {
    await waitFor(element(by.id(id)))
      .toBeVisible()
      .withTimeout(timeout / 2);
    return true;
  } catch (_) {
    const msg = `Assertion failed: testID ${id} is not visible`;
    throw new Error(msg);
  }
}

export async function waitForText(text, timeout = 33000) {
  try {
    await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeout / 2);
    return true;
  } catch (_) {
    // nop
  }

  try {
    await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeout / 2);
    return true;
  } catch (_) {
    const msg = `Assertion failed: text "${text}" is not visible`;
    throw new Error(msg);
  }
}

export async function getSwitchValue(switchId) {
  try {
    await expect(element(by.id(switchId))).toHaveToggleValue(true);
    return true;
  } catch (_) {
    return false;
  }
}

export async function helperImportWallet(importText, walletType, expectedWalletLabel, expectedBalance, passphrase) {
  await waitForId('WalletsList');
  await waitFor(element(by.id('CreateAWallet')))
    .toBeVisible()
    .whileElement(by.id('WalletsList'))
    .scroll(500, 'right'); // in case emu screen is small and it doesnt fit
  // going to Import Wallet screen and importing mnemonic
  await openAddWalletScreen('ImportWallet');
  await element(by.id('ImportWallet')).tap();
  await waitForId('SpeedBackdoor');
  // tapping 5 times invisible button is a backdoor:
  for (let c = 0; c < 5; c++) {
    await element(by.id('SpeedBackdoor')).tap();
  }
  await element(by.id('SpeedMnemonicInput')).replaceText(importText);
  await element(by.id('SpeedWalletTypeInput')).replaceText(walletType);
  await element(by.id('SpeedWalletTypeInput')).tapReturnKey();
  if (passphrase) {
    await element(by.id('SpeedPassphraseInput')).replaceText(passphrase);
    await element(by.id('SpeedPassphraseInput')).tapReturnKey();
  }
  await element(by.id('SpeedDoImport')).tap();

  // waiting for import result
  await waitForText('OK', 3 * 61000);
  await element(by.text('OK')).tap();

  // lets go inside wallet
  await element(by.text(expectedWalletLabel)).tap();
  // label might change in the future
  await expect(element(by.id('WalletBalance'))).toHaveText(expectedBalance);
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function hashIt(s) {
  return Buffer.from(sha256(s)).toString('hex');
}

export async function helperDeleteWallet(label, remainingBalanceSat = false) {
  await element(by.text(label)).tap();
  await element(by.id('WalletDetails')).tap();
  await element(by.id('WalletDetailsScroll')).swipe('up', 'fast', 1);
  await sleep(200);
  await element(by.id('HeaderMenuButton')).tap();
  await element(by.text('Delete')).tap();
  await waitForText('Yes, delete');
  await element(by.text('Yes, delete')).tap();
  if (remainingBalanceSat) {
    // await element(by.type('android.widget.EditText')).typeText(remainingBalanceSat);
    await typeTextIntoAlertInput(remainingBalanceSat);
    await element(by.text('Delete')).tap();
  }
  await waitForId('NoTransactionsMessage');
}

/*

module.exports.helperImportWallet = helperImportWallet;
module.exports.waitForId = waitForId;
module.exports.waitForText = waitForText;
module.exports.sleep = sleep;
module.exports.hashIt = hashIt;
module.exports.helperDeleteWallet = helperDeleteWallet;

*/

/**
 * Extracts element text or label using getAttributes()
 * @returns {Promise<string>}
 */
export async function extractTextFromElementById(id) {
  const attributes = await element(by.id(id)).getAttributes();
  return attributes.value || attributes.label;
}

export const expectToBeVisible = async id => {
  try {
    await expect(element(by.id(id))).toBeVisible();
    return true;
  } catch (e) {
    return false;
  }
};

export async function helperCreateWallet(walletName) {
  await waitFor(element(by.id('CreateAWallet')))
    .toBeVisible()
    .whileElement(by.id('WalletsList'))
    .scroll(500, 'right'); // in case emu screen is small and it doesnt fit

  await sleep(200); // Wait until bounce animation finishes.
  await openAddWalletScreen('WalletNameInput');
  await element(by.id('WalletNameInput')).replaceText(walletName || 'cr34t3d');
  await waitForId('ActivateBitcoinButton');
  await element(by.id('ActivateBitcoinButton')).tap();
  await element(by.id('ActivateBitcoinButton')).tap();
  // why tf we need 2 taps for it to work..? mystery
  await tapAndTapAgainIfElementIsNotVisible('Create', 'PleaseBackupScrollView');

  await waitFor(element(by.id('PleasebackupOk')))
    .toBeVisible()
    .whileElement(by.id('PleaseBackupScrollView'))
    .scroll(500, 'down'); // in case emu screen is small and it doesnt fit

  await element(by.id('PleasebackupOk')).tap();
  await expect(element(by.id('WalletsList'))).toBeVisible();
  await element(by.id('WalletsList')).swipe('right', 'fast', 1); // in case emu screen is small and it doesnt fit
  await sleep(200);
  await expect(element(by.id(walletName || 'cr34t3d'))).toBeVisible();
}

// "Create a wallet" opens the ATM setup screen first; BlueWallet's Add Wallet screen sits behind its
// "Advanced wallet options" link at the bottom.
export async function openAddWalletScreen(idToCheckVisible) {
  await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'ATMWalletSetupScrollView');
  await waitFor(element(by.id('AdvancedWalletOptionsLink')))
    .toBeVisible()
    .whileElement(by.id('ATMWalletSetupScrollView'))
    .scroll(300, 'down');
  await tapAndTapAgainIfElementIsNotVisible('AdvancedWalletOptionsLink', idToCheckVisible);
}

// The home button opens the ATM QR on tap; scan-to-send lives in its long-press menu.
export async function openScannerFromHome() {
  await element(by.id('HomeScreenScanButton')).longPress();
  await waitForText('Scan QR Code');
  await element(by.text('Scan QR Code')).tap();
  await waitForId('ScanQrBackdoorButton');
}

export async function tapAndTapAgainIfElementIsNotVisible(idToTap, idToCheckVisible) {
  // tap
  await element(by.id(idToTap)).tap();

  // check if visible
  try {
    await waitFor(element(by.id(idToCheckVisible)))
      .toBeVisible()
      .withTimeout(3_000);
    return; // did not throw? its visible, return
  } catch (_) {}

  // did not return so its not visible, lets tap again
  await element(by.id(idToTap)).tap();

  // check visibility again, this time no try-catch, if it fails it fails
  await waitFor(element(by.id(idToCheckVisible)))
    .toBeVisible()
    .withTimeout(3_000);
}

export async function tapAndTapAgainIfTextIsNotVisible(textToTap, textToCheckVisible) {
  // tap
  await element(by.text(textToTap)).tap();

  // check if visible
  try {
    await waitFor(element(by.text(textToCheckVisible)))
      .toBeVisible()
      .withTimeout(3_000);
    return; // did not throw? its visible, return
  } catch (_) {}

  // did not return so its not visible, lets tap again
  await element(by.text(textToTap)).tap();

  // check visibility again, this time no try-catch, if it fails it fails
  await waitFor(element(by.text(textToCheckVisible)))
    .toBeVisible()
    .withTimeout(3_000);
}

export async function tapIfPresent(id) {
  try {
    await element(by.id(id)).tap();
  } catch (_) {}
  // no need to check for visibility, just silently ignore exception if such testID is not present
}

export async function tapIfTextPresent(text) {
  try {
    await element(by.text(text)).tap();
  } catch (_) {}
  // no need to check for visibility, just silently ignore exception if such testID is not present
}

export async function countElements(testId) {
  let count = 0;
  while (true) {
    try {
      await expect(element(by.id(testId)).atIndex(count)).toBeVisible();
      count++;
    } catch (_) {
      break;
    }
  }
  return count;
}

export async function scanText(text) {
  await waitForId('ScanQrBackdoorButton');
  for (let c = 0; c <= 5; c++) {
    await element(by.id('ScanQrBackdoorButton')).tap();
  }
  await element(by.id('scanQrBackdoorInput')).replaceText(text);
  await element(by.id('scanQrBackdoorOkButton')).tap();
}

export async function goBack() {
  if (device.getPlatform() !== 'ios') {
    await device.pressBack();
    return;
  }

  // Ported from upstream BlueWallet. iOS screens use the native back button, which has no testID; it's found by its
  // accessibility label. A matcher can also hit hidden elements on screens stacked underneath, and tapping one of those
  // does nothing (the old helper left a test stuck on Settings > Security). So only tap an element Detox reports as
  // visible and hittable, falling back to hittable-only for iOS 26's glass back button, which fails the visibility check.
  const candidates = [by.id('BackButton'), by.id('NavigationCloseButton'), by.label('Back'), by.text('Close')];
  let lastErr;
  for (let attempt = 0; attempt < 10; attempt++) {
    for (const requireVisible of [true, false]) {
      for (const matcher of candidates) {
        for (let idx = 0; idx < 6; idx++) {
          let attrs;
          try {
            attrs = await element(matcher).atIndex(idx).getAttributes();
          } catch (err) {
            lastErr = err;
            break; // no element at this index; try the next candidate
          }
          if ((requireVisible && !attrs.visible) || attrs.hittable === false) continue;
          try {
            await element(matcher).atIndex(idx).tap();
            return;
          } catch (err) {
            lastErr = err;
          }
        }
      }
    }
    await sleep(500);
  }
  const error = new Error('goBack: no back/close button was tappable after 10 attempts');
  error.cause = lastErr;
  throw error;
}

export async function typeTextIntoAlertInput(text) {
  if (device.getPlatform() === 'android') {
    await element(by.type('android.widget.EditText')).replaceText(text);
  } else {
    await element(by.type('_UIAlertControllerTextField')).replaceText(text);
  }
}

/**
 * Scrolls up on the home screen. This is needed on the iOS.
 */
export async function scrollUpOnHomeScreen() {
  if (device.getPlatform() !== 'ios') {
    return;
  }
  try {
    await element(by.type('RCTCustomScrollView').withDescendant(by.type('RCTCustomScrollView'))).swipe('down', 'slow', 0.5);
  } catch (_) {
    // if no wallets there will be just one scroll
    await element(by.type('RCTCustomScrollView')).swipe('down', 'slow', 0.5);
  }
  await sleep(200); // bounce animation
}
