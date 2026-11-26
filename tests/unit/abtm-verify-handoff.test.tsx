import React from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';
import { pairedWalletApi } from '../../blue_modules/paired-wallet-api';
import VerifyId from '../../screen/abtm/VerifyId';

jest.mock('@sumsub/react-native-mobilesdk-module', () => ({ init: jest.fn() }));
jest.mock('../../blue_modules/paired-wallet-api', () => ({
  pairedWalletApi: { getKycOptions: jest.fn(), startIdVerification: jest.fn() },
}));
jest.mock('../../hooks/useAbtmAccount', () => ({
  refreshAbtmAccount: jest.fn(),
}));
jest.mock('../../hooks/useExtendedNavigation', () => ({
  useExtendedNavigation: () => ({}),
}));
jest.mock('../../components/Button', () => 'Button');
jest.mock('../../components/SecondButton', () => ({ SecondButton: 'Button' }));
jest.mock('../../screen/abtm/ui', () => ({
  Body: 'Text',
  Card: 'View',
  ErrorText: 'Text',
  Gap: 'View',
  Label: 'Text',
  Title: 'Text',
}));
jest.mock('../../loc', () => ({ abtm: {}, _: {}, formatString: () => '' }));

it('opens the kiosk site and checks for the existing approval when the wallet returns', async () => {
  const consent = { version: 'v1', text: 'Consent' };
  const options = jest.mocked(pairedWalletApi.getKycOptions);
  options.mockResolvedValueOnce({
    state: 'kyc_offer',
    consent,
    supportPhone: '',
  });
  options.mockResolvedValueOnce({
    state: 'found',
    source: 'ATM',
    consent,
    supportPhone: '',
  });
  const url = 'https://verify.americabitcoinatm.com/login';
  jest.mocked(pairedWalletApi.startIdVerification).mockResolvedValue({ verificationUrl: url });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const subscription = jest.spyOn(AppState, 'addEventListener');
  const screen = render(<VerifyId />);
  fireEvent.press(await screen.findByTestId('AbtmConsent'));
  fireEvent.press(screen.getByTestId('AbtmStartKyc'));
  await waitFor(() => expect(open).toHaveBeenCalledWith(url));
  expect(SNSMobileSDK.init).not.toHaveBeenCalled();
  const change = subscription.mock.calls.find(([event]) => event === 'change')![1] as (state: AppStateStatus) => void;
  act(() => change('active'));
  expect(await screen.findByTestId('AbtmTakeSelfie')).toBeTruthy();
  expect(screen.queryByTestId('AbtmStartKyc')).toBeNull();
  expect(options).toHaveBeenCalledTimes(2);
  screen.unmount();
  jest.restoreAllMocks();
});
