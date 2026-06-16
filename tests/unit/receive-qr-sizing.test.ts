import {
  ATM_RECEIVE_QR_FULLSCREEN_SIZE,
  ATM_RECEIVE_QR_MAX_SIZE,
  getReceiveQRCodeSize,
  RECEIVE_QR_MAX_SIZE,
} from '../../screen/receive/receiveQrSizing';

describe('getReceiveQRCodeSize', () => {
  it('keeps the ATM receive QR small enough for the kiosk scan bay on phones', () => {
    expect(getReceiveQRCodeSize({ height: 852, width: 393, isAtmMode: true })).toBe(ATM_RECEIVE_QR_MAX_SIZE);
  });

  it('keeps the normal receive QR smaller than the old near-full-width layout', () => {
    expect(getReceiveQRCodeSize({ height: 852, width: 393 })).toBeLessThanOrEqual(RECEIVE_QR_MAX_SIZE);
    expect(getReceiveQRCodeSize({ height: 852, width: 393 })).toBeLessThan(260);
  });

  it('keeps the optional fullscreen ATM QR kiosk-sized instead of oversized', () => {
    expect(ATM_RECEIVE_QR_FULLSCREEN_SIZE).toBe(260);
  });
});
