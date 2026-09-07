'use client';

import { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useDerivWS } from '@deriv/core';
import { useAuth } from '@/hooks/use-auth';
import type { DerivWS } from '@deriv/core';
import type { UseAuthReturn } from '@/hooks/use-auth';

interface DerivWSContextValue {
  ws: DerivWS | null;
  isConnected: boolean;
  isExhausted: boolean;
  auth: UseAuthReturn;
}

const DerivWSContext = createContext<DerivWSContextValue | null>(null);

export function DerivWSProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { ws, isConnected, isExhausted } = useDerivWS({
    url: auth.wsUrl,
    accountId: auth.activeAccountId ?? undefined,
  });

  const hasAuthorizedRef = useRef(false);

  // Auto-restore PAT session when WebSocket connects
  useEffect(() => {
    if (!ws || !isConnected) {
      hasAuthorizedRef.current = false;
      return;
    }

    if (hasAuthorizedRef.current) return;

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('deriv_pat_token') : null;
    if (storedToken) {
      hasAuthorizedRef.current = true;
      auth.authorizeWithToken(storedToken, ws).catch((err) => {
        console.warn('Auto-auth with stored token failed:', err);
      });
    }
  }, [ws, isConnected, auth]);

  // Live balance streaming subscription when authenticated
  useEffect(() => {
    if (!ws || !isConnected || auth.authState !== 'authenticated' || !auth.activeAccountId) return;

    let unsub: (() => void) | null = null;
    let cancelled = false;

    ws.subscribe({ balance: 1 }, (data: any) => {
      if (cancelled) return;
      if (data?.balance?.balance !== undefined && data?.balance?.loginid) {
        auth.updateBalance(data.balance.loginid, data.balance.balance);
      }
    }).then((res) => {
      if (cancelled) {
        res.unsubscribe();
      } else {
        unsub = res.unsubscribe;
      }
    }).catch((err) => {
      console.warn('Balance streaming error:', err);
    });

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [ws, isConnected, auth.authState, auth.activeAccountId, auth.updateBalance]);

  return (
    <DerivWSContext.Provider value={{ ws, isConnected, isExhausted, auth }}>
      {children}
    </DerivWSContext.Provider>
  );
}

export function useDerivWSContext(): DerivWSContextValue {
  const ctx = useContext(DerivWSContext);
  if (!ctx) {
    throw new Error('useDerivWSContext must be used within a DerivWSProvider');
  }
  return ctx;
}
