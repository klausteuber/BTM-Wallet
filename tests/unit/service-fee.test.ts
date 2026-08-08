import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateServiceFeeSats,
  getServiceFeeTarget,
  isServiceFeeEnabled,
  setServiceFeeEnabled,
  SERVICE_FEE_ADDRESS,
  SERVICE_FEE_ENABLED_STORAGE_KEY,
  SERVICE_FEE_RATE,
  SERVICE_FEE_MINIMUM_SATS,
} from '../../blue_modules/serviceFee';

// Mock getFiatRate to avoid network calls
jest.mock('../../models/fiatUnit', () => ({
  getFiatRate: jest.fn().mockResolvedValue(100000), // $100,000/BTC
}));

describe('serviceFee', () => {
  describe('calculateServiceFeeSats', () => {
    it('calculates 0.25% of send amount', async () => {
      const fee = await calculateServiceFeeSats(1_000_000); // 1M sats
      expect(fee).toBe(Math.floor(1_000_000 * SERVICE_FEE_RATE)); // 2500 sats
    });

    it('returns null for zero amount', async () => {
      const fee = await calculateServiceFeeSats(0);
      expect(fee).toBeNull();
    });

    it('returns null for negative amount', async () => {
      const fee = await calculateServiceFeeSats(-100);
      expect(fee).toBeNull();
    });

    it('returns null when fee is below minimum', async () => {
      // 300,000 sats * 0.0025 = 750 sats (below 1000 minimum)
      const fee = await calculateServiceFeeSats(300_000);
      expect(fee).toBeNull();
    });

    it('returns fee at exactly the minimum threshold', async () => {
      // 400,000 sats * 0.0025 = 1000 sats (exactly at minimum)
      const fee = await calculateServiceFeeSats(400_000);
      expect(fee).toBe(SERVICE_FEE_MINIMUM_SATS);
    });

    it('caps fee at $5 USD equivalent', async () => {
      // At $100K/BTC, $5 = 5000 sats
      // 10 BTC (1,000,000,000 sats) * 0.0025 = 2,500,000 sats (uncapped)
      // Should be capped at 5000 sats
      const fee = await calculateServiceFeeSats(1_000_000_000);
      expect(fee).toBe(5000);
    });

    it('does not cap when fee is below cap', async () => {
      // 1,000,000 sats * 0.0025 = 2500 sats, cap is 5000 sats
      const fee = await calculateServiceFeeSats(1_000_000);
      expect(fee).toBe(2500);
    });
  });

  describe('getServiceFeeTarget', () => {
    it('returns correct target structure', () => {
      const target = getServiceFeeTarget(2500);
      expect(target).toEqual({
        address: SERVICE_FEE_ADDRESS,
        value: 2500,
      });
    });
  });

  describe('service fee toggle', () => {
    afterEach(async () => {
      await AsyncStorage.removeItem(SERVICE_FEE_ENABLED_STORAGE_KEY);
    });

    it('is enabled by default', async () => {
      expect(await isServiceFeeEnabled()).toBe(true);
    });

    it('returns null when the service fee is disabled', async () => {
      await setServiceFeeEnabled(false);
      const fee = await calculateServiceFeeSats(1_000_000);
      expect(fee).toBeNull();
    });

    it('charges the fee again after re-enabling', async () => {
      await setServiceFeeEnabled(false);
      await setServiceFeeEnabled(true);
      const fee = await calculateServiceFeeSats(1_000_000);
      expect(fee).toBe(2500);
    });
  });

  describe('fallback behavior', () => {
    it('uses fallback cap when rate fetch fails', async () => {
      const { getFiatRate } = require('../../models/fiatUnit');
      getFiatRate.mockRejectedValueOnce(new Error('Network error'));

      // With fallback cap of 5,000 sats, large send should be capped at 5,000
      const fee = await calculateServiceFeeSats(100_000_000_000); // 1000 BTC
      expect(fee).toBe(5000);
    });
  });
});
