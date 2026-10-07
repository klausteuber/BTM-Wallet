import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFiatRate } from '../models/fiatUnit';
import { CreateTransactionTarget } from '../class/wallets/types';

export const SERVICE_FEE_ADDRESS = '328YdTT21QGyCTE7GHrh8em3WsrQcywvxP';
export const SERVICE_FEE_ENABLED_STORAGE_KEY = 'serviceFeeEnabled';
export const SERVICE_FEE_RATE = 0.0025; // 0.25%
export const SERVICE_FEE_CAP_USD = 5.0;
export const SERVICE_FEE_MINIMUM_SATS = 1000;
const FALLBACK_BTC_USD_RATE = 100000;
const FALLBACK_CAP_SATS = Math.floor((SERVICE_FEE_CAP_USD / FALLBACK_BTC_USD_RATE) * 100_000_000); // $5 at $100K/BTC

async function getCapInSats(): Promise<number> {
  try {
    const usdRate = await getFiatRate('USD');
    if (usdRate > 0) {
      return Math.floor((SERVICE_FEE_CAP_USD / usdRate) * 100_000_000);
    }
  } catch {
    console.warn('serviceFee: could not fetch USD rate, using fallback cap');
  }
  return FALLBACK_CAP_SATS;
}

export async function isServiceFeeEnabled(): Promise<boolean> {
  try {
    // absence of the key means the fee was never turned off
    return (await AsyncStorage.getItem(SERVICE_FEE_ENABLED_STORAGE_KEY)) !== 'false';
  } catch {
    return true;
  }
}

export async function setServiceFeeEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(SERVICE_FEE_ENABLED_STORAGE_KEY, value ? 'true' : 'false');
}

export async function calculateServiceFeeSats(sendAmountSats: number): Promise<number | null> {
  if (sendAmountSats <= 0) return null;
  if (!(await isServiceFeeEnabled())) return null;

  const rawFee = Math.floor(sendAmountSats * SERVICE_FEE_RATE);
  const capSats = await getCapInSats();
  const fee = Math.min(rawFee, capSats);

  if (fee < SERVICE_FEE_MINIMUM_SATS) return null;
  return fee;
}

export function getServiceFeeTarget(feeSats: number): CreateTransactionTarget {
  return { address: SERVICE_FEE_ADDRESS, value: feeSats };
}
