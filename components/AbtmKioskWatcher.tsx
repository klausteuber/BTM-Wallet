import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { navigationRef } from '../NavigationService';
import { pairedWalletApi } from '../blue_modules/paired-wallet-api';
import {
  enableAbtmPush,
  hasAskedForPush,
  openApproval,
  pushPermission,
  refreshAbtmPushIfAllowed,
  setPendingAuthorization,
  startAbtmPushListeners,
} from '../blue_modules/abtm-push';
import presentAlert from './Alert';
import { useAbtmAccount } from '../hooks/useAbtmAccount';
import loc from '../loc';

const POLL_MS = 3000;

/**
 * Kiosk approval requests for an ID-verified account with a registered wallet
 * (the only accounts a kiosk will ask about):
 *
 * - When the app is closed, a push notification (blue_modules/abtm-push) brings
 *   the customer in; this asks once for notification permission, with a reason.
 * - While the app is open, it checks every few seconds, brings up the approval
 *   screen, and keeps the waiting request for the home-screen banner.
 */
const AbtmKioskWatcher = () => {
  const { status, profile } = useAbtmAccount();
  const shown = useRef(new Set<string>());
  const eligible = status === 'signed_in' && !!profile?.verification.verified && !!profile?.wallet.registered;

  useEffect(() => {
    startAbtmPushListeners();
  }, []);

  // Notifications: re-send the token when allowed; otherwise ask once, explaining why.
  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    (async () => {
      const permission = await pushPermission();
      if (cancelled || permission === 'unavailable' || permission === 'blocked') return;
      if (permission === 'granted') return refreshAbtmPushIfAllowed();
      if (await hasAskedForPush()) return;
      presentAlert({
        title: loc.abtm.push_ask_title,
        message: loc.abtm.push_ask_message,
        buttons: [
          { text: loc.abtm.push_ask_later, style: 'cancel' },
          { text: loc.abtm.push_ask_allow, onPress: () => enableAbtmPush() },
        ],
      });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eligible]);

  // While open: watch for a waiting request.
  useEffect(() => {
    if (!eligible) {
      setPendingAuthorization(null);
      return;
    }
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;

    const check = async () => {
      if (inFlight || AppState.currentState !== 'active' || !navigationRef.isReady()) return;
      inFlight = true;
      try {
        const [pending] = await pairedWalletApi.listAuthorizations();
        setPendingAuthorization(pending ?? null);
        if (!pending || shown.current.has(pending.id)) return;
        shown.current.add(pending.id);
        openApproval(pending.id); // no-op if a notification tap already opened it
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
