import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { navigationRef } from '../NavigationService';
import { pairedWalletApi } from '../blue_modules/paired-wallet-api';
import { useAbtmAccount } from '../hooks/useAbtmAccount';

const POLL_MS = 3000;

/**
 * While the app is open, watch for a Bitcoin ATM asking to send to this customer's
 * wallet and bring up the approval screen. Only runs for an ID-verified account with
 * a registered wallet (the only accounts a kiosk will ask about).
 *
 * Push notifications will replace this polling in a later phase.
 */
const AbtmKioskWatcher = () => {
  const { status, profile } = useAbtmAccount();
  const shown = useRef(new Set<string>());
  const eligible = status === 'signed_in' && !!profile?.verification.verified && !!profile?.wallet.registered;

  useEffect(() => {
    if (!eligible) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;

    const check = async () => {
      if (inFlight || AppState.currentState !== 'active' || !navigationRef.isReady()) return;
      inFlight = true;
      try {
        const [pending] = await pairedWalletApi.listAuthorizations();
        if (!pending || shown.current.has(pending.id)) return;
        shown.current.add(pending.id);
        if (navigationRef.getCurrentRoute()?.name === 'AbtmKioskApproval') return; // it polls on its own
        (navigationRef as any).navigate('AbtmKioskApproval', { authorizationId: pending.id });
      } catch (_) {
        // Offline or signed out: try again on the next tick.
      } finally {
        inFlight = false;
      }
    };

    const start = () => {
      if (timer) return;
      check();
      timer = setInterval(check, POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', next => (next === 'active' ? start() : stop()));
    return () => {
      stop();
      subscription.remove();
    };
  }, [eligible]);

  return null;
};

export default AbtmKioskWatcher;
