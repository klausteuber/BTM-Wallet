import { useEffect, useSyncExternalStore } from 'react';
import { AbtmApiError, AccountProfile, pairedWalletApi, Session } from '../blue_modules/paired-wallet-api';

export type AbtmAccountState = {
  status: 'loading' | 'signed_out' | 'signed_in';
  session: Session | null;
  profile: AccountProfile | null;
  /** Set when the profile could not be loaded (offline, server down); the session is kept. */
  error: string | null;
};

let state: AbtmAccountState = { status: 'loading', session: null, profile: null, error: null };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function setState(next: Partial<AbtmAccountState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

/** Re-read the session and, when signed in, the profile from the server. */
export function refreshAbtmAccount(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const session = await pairedWalletApi.getSession();
      if (!session) {
        setState({ status: 'signed_out', session: null, profile: null, error: null });
        return;
      }
      setState({ status: 'signed_in', session });
      try {
        setState({ profile: await pairedWalletApi.getAccount(), error: null });
      } catch (e: any) {
        if (e instanceof AbtmApiError && e.code === 'signed_out') {
          setState({ status: 'signed_out', session: null, profile: null, error: null });
        } else {
          setState({ error: e.message });
        }
      }
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function getAbtmAccountState(): AbtmAccountState {
  return state;
}

export async function signOutOfAbtm(): Promise<void> {
  await pairedWalletApi.signOut();
  setState({ status: 'signed_out', session: null, profile: null, error: null });
}

pairedWalletApi.subscribe(() => {
  refreshAbtmAccount();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The America Bitcoin account the app is signed in to (shared by every screen). */
export function useAbtmAccount(): AbtmAccountState & { refresh: () => Promise<void>; signOut: () => Promise<void> } {
  const current = useSyncExternalStore(subscribe, getAbtmAccountState);
  useEffect(() => {
    if (current.status === 'loading') refreshAbtmAccount();
  }, [current.status]);
  return { ...current, refresh: refreshAbtmAccount, signOut: signOutOfAbtm };
}
