'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initiateLogin,
  initiateSignUp,
  handleOAuthCallback,
  refreshAccessToken,
  fetchAccounts,
  getWebSocketOTP,
  logout as coreLogout,
  getAuthInfo,
  getDerivAccounts,
  getActiveLoginId,
  setActiveLoginId,
  setAccountType,
  clearAllAuthData,
  parseReferralLink,
  storeDerivAccounts,
} from '@deriv/core';
import type { AuthInfo, DerivAccount, AuthState, AuthConfig } from '@deriv/core';

export function getEffectiveClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('deriv_custom_client_id');
    if (custom && custom.trim().length > 0) return custom.trim();
  }
  return process.env.NEXT_PUBLIC_DERIV_APP_ID ?? '34kDYD0Jh226YNUlY8nTL';
}

function getAuthConfig(overrideClientId?: string): AuthConfig {
  const config: AuthConfig = {
    clientId: overrideClientId ?? getEffectiveClientId(),
    redirectUri:
      process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI ??
      (typeof window !== 'undefined' ? window.location.origin : ''),
  };

  const scopesEnv = process.env.NEXT_PUBLIC_DERIV_OAUTH_SCOPES ?? 'trade';
  if (scopesEnv) {
    config.scopes = scopesEnv.split(',').map((s) => s.trim()).join(' ');
  }

  const referralLink = process.env.NEXT_PUBLIC_DERIV_REFERRAL_LINK ?? '';
  if (referralLink) {
    const referral = parseReferralLink(referralLink);
    if (referral) {
      config.affiliateToken      = referral.affiliateToken;
      config.affiliateTokenParam = referral.affiliateTokenParam;
      config.utmCampaign         = referral.utmCampaign;
      config.utmSource           = referral.utmSource;
      config.utmMedium           = referral.utmMedium;
    }
  }

  return config;
}

export interface UseAuthReturn {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  activeAccountId: string | null;
  wsUrl: string | undefined;
  login: (overrideClientId?: string) => Promise<void>;
  authorizeWithToken: (token: string, wsInstance: any) => Promise<{ success: boolean; error?: string }>;
  signUp: () => Promise<void>;
  logout: () => void;
  switchAccount: (accountId: string) => Promise<void>;
  error: string | null;
  updateBalance: (accountId: string, newBalance: number | string) => void;
  clientId: string;
  setCustomClientId: (id: string) => void;
  tokenLoginActive: boolean;
}

export function useAuth(): UseAuthReturn {
  const [clientId, setClientIdState] = useState<string>(() => getEffectiveClientId());
  const [tokenLoginActive, setTokenLoginActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('deriv_pat_token'));
  });

  const [authState, setAuthState] = useState<AuthState>(() => {
    if (typeof window === 'undefined') return 'unauthenticated';
    if (getAuthInfo()) return 'authenticated';
    if (localStorage.getItem('deriv_pat_token')) return 'authenticated';
    return 'unauthenticated';
  });

  const [accounts, setAccounts] = useState<DerivAccount[]>(() => {
    if (typeof window === 'undefined') return [];
    return getDerivAccounts() ?? [];
  });

  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = getDerivAccounts();
    // Strictly prioritize Demo / Paper account (VRTC... or account_type === 'demo')
    const demo = stored?.find(a => a.account_type === 'demo' || a.account_id.startsWith('VRTC'));
    if (demo) return demo.account_id;
    const storedLoginId = getActiveLoginId();
    if (storedLoginId) {
      const match = stored?.find(a => a.account_id === storedLoginId);
      if (match && (match.account_type === 'demo' || match.account_id.startsWith('VRTC'))) {
        return storedLoginId;
      }
    }
    return stored?.[0]?.account_id ?? null;
  });

  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);
  const activeAccountIdRef = useRef<string | null>(null);
  const tabHiddenAtRef = useRef<number | null>(null);

  const setCustomClientId = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      const clean = id.trim();
      if (clean) {
        localStorage.setItem('deriv_custom_client_id', clean);
        setClientIdState(clean);
      } else {
        localStorage.removeItem('deriv_custom_client_id');
        setClientIdState(process.env.NEXT_PUBLIC_DERIV_APP_ID ?? '33AXtdkpnn5FFGi6pkEjy');
      }
    }
  }, []);

  const fetchOTPUrl = useCallback(async (accountId: string, authInfo: AuthInfo): Promise<string> => {
    return getWebSocketOTP(accountId, authInfo, getAuthConfig().clientId);
  }, []);

  const completeAuth = useCallback(async (authInfo: AuthInfo) => {
    const fetchedAccounts = await fetchAccounts(authInfo, getAuthConfig().clientId);
    setAccounts(fetchedAccounts);

    if (fetchedAccounts.length > 0) {
      // Strictly default to Demo / Paper account (VRTC... or account_type === 'demo')
      const demoAccount = fetchedAccounts.find(
        (a) => a.account_type === 'demo' || a.account_id.startsWith('VRTC')
      );
      const chosenAccount = demoAccount || fetchedAccounts[0];
      setActiveAccountId(chosenAccount.account_id);
      setActiveLoginId(chosenAccount.account_id);
      setAccountType(chosenAccount.account_type);

      const otpUrl = await fetchOTPUrl(chosenAccount.account_id, authInfo);
      setWsUrl(otpUrl);
    }

    setTokenLoginActive(false);
    setAuthState('authenticated');
  }, [fetchOTPUrl]);

  // Direct Token (PAT) Authorization via WebSocket
  const authorizeWithToken = useCallback(async (
    token: string,
    wsInstance: any
  ): Promise<{ success: boolean; error?: string }> => {
    if (!wsInstance) {
      return { success: false, error: 'WebSocket is connecting... please try again.' };
    }

    setAuthState('authenticating');
    setError(null);

    try {
      const res = await wsInstance.send({ authorize: token.trim() }) as {
        authorize?: {
          account_list?: Array<{
            account_category?: string;
            account_type?: string;
            currency?: string;
            is_disabled?: number;
            is_virtual?: number;
            landing_company_name?: string;
            loginid: string;
          }>;
          balance: number | string;
          currency: string;
          email?: string;
          fullname?: string;
          is_virtual: number;
          landing_company_name?: string;
          loginid: string;
          scopes?: string[];
          user_id?: number;
        };
        error?: {
          code: string;
          message: string;
        };
      };

      if (res.error || !res.authorize) {
        const errMsg = res.error?.message || 'Token authorization failed. Please check your token.';
        setError(errMsg);
        setAuthState('unauthenticated');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('deriv_pat_token');
        }
        setTokenLoginActive(false);
        return { success: false, error: errMsg };
      }

      const authData = res.authorize;
      const parsedAccounts: DerivAccount[] = (authData.account_list || []).map((acc) => ({
        account_id: acc.loginid,
        account_type: acc.is_virtual ? 'demo' : 'real',
        currency: acc.currency || authData.currency || 'USD',
        balance: acc.loginid === authData.loginid ? String(authData.balance) : '0.00',
        group: acc.account_category || 'trading',
        status: acc.is_disabled ? 'disabled' : 'active',
      }));

      if (parsedAccounts.length === 0 || !parsedAccounts.some(a => a.account_id === authData.loginid)) {
        parsedAccounts.unshift({
          account_id: authData.loginid,
          account_type: authData.is_virtual ? 'demo' : 'real',
          currency: authData.currency || 'USD',
          balance: String(authData.balance),
          group: 'trading',
          status: 'active',
        });
      }

      setAccounts(parsedAccounts);
      setActiveAccountId(authData.loginid);
      storeDerivAccounts(parsedAccounts);
      setActiveLoginId(authData.loginid);
      setAccountType(authData.is_virtual ? 'demo' : 'real');

      if (typeof window !== 'undefined') {
        localStorage.setItem('deriv_pat_token', token.trim());
      }
      setTokenLoginActive(true);
      setAuthState('authenticated');
      setError(null);

      return { success: true };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error during authorization';
      setError(errMsg);
      setAuthState('unauthenticated');
      return { success: false, error: errMsg };
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        setAuthState('authenticating');
        try {
          const authInfo = await handleOAuthCallback(window.location.href, getAuthConfig());
          await completeAuth(authInfo);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Authentication failed');
          setAuthState('error');
          clearAllAuthData();
        }
        return;
      }

      const storedAuth = getAuthInfo();
      if (storedAuth) {
        if (storedAuth.expires_at && Date.now() / 1000 > storedAuth.expires_at) {
          try {
            const refreshed = await refreshAccessToken(
              storedAuth.refresh_token,
              getAuthConfig().clientId
            );
            await completeAuth(refreshed);
          } catch {
            clearAllAuthData();
            setAuthState('unauthenticated');
          }
          return;
        }

        const storedAccounts = getDerivAccounts();
        if (storedAccounts && storedAccounts.length > 0) {
          setAccounts(storedAccounts);
          // Strictly default to Demo / Paper account (VRTC... or account_type === 'demo')
          const demoAccount = storedAccounts.find(
            (a) => a.account_type === 'demo' || a.account_id.startsWith('VRTC')
          );
          const activeStoredId = getActiveLoginId();
          const activeStored = storedAccounts.find((a) => a.account_id === activeStoredId);
          const loginId = (activeStored?.account_type === 'demo' || activeStored?.account_id.startsWith('VRTC'))
            ? activeStored.account_id
            : (demoAccount?.account_id ?? storedAccounts[0].account_id);
          setActiveAccountId(loginId);
          setActiveLoginId(loginId);

          try {
            const otpUrl = await fetchOTPUrl(loginId, storedAuth);
            setWsUrl(otpUrl);
            setAuthState('authenticated');
          } catch {
            clearAllAuthData();
            setAuthState('unauthenticated');
          }
        } else {
          try {
            await completeAuth(storedAuth);
          } catch {
            clearAllAuthData();
            setAuthState('unauthenticated');
          }
        }
      }
    };

    init();
  }, [completeAuth, fetchOTPUrl]);

  useEffect(() => {
    activeAccountIdRef.current = activeAccountId;
  }, [activeAccountId]);

  useEffect(() => {
    if (authState !== 'authenticated' || tokenLoginActive) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        tabHiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = tabHiddenAtRef.current;
      if (!hiddenAt || Date.now() - hiddenAt < 30_000) return;
      tabHiddenAtRef.current = null;

      const accountId = activeAccountIdRef.current;
      const authInfo = getAuthInfo();
      if (!authInfo || !accountId) return;

      try {
        const otpUrl = await fetchOTPUrl(accountId, authInfo);
        setWsUrl(otpUrl);
      } catch {
        clearAllAuthData();
        setAuthState('unauthenticated');
        setWsUrl(undefined);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authState, fetchOTPUrl, tokenLoginActive]);

  const login = useCallback(async (overrideClientId?: string) => {
    const config = getAuthConfig(overrideClientId);
    await initiateLogin(config);
  }, []);

  const signUp = useCallback(async () => {
    await initiateSignUp(getAuthConfig());
  }, []);

  const logout = useCallback(() => {
    coreLogout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('deriv_pat_token');
    }
    setTokenLoginActive(false);
    setAccounts([]);
    setActiveAccountId(null);
    setWsUrl(undefined);
    setAuthState('unauthenticated');
    setError(null);
  }, []);

  const switchAccount = useCallback(async (accountId: string) => {
    const authInfo = getAuthInfo();
    if (authInfo) {
      try {
        const account = accounts.find((a) => a.account_id === accountId);
        if (account) setAccountType(account.account_type);
        const otpUrl = await fetchOTPUrl(accountId, authInfo);
        setActiveLoginId(accountId);
        setActiveAccountId(accountId);
        setWsUrl(otpUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Account switch failed');
      }
    } else {
      // Local account selection
      const account = accounts.find((a) => a.account_id === accountId);
      if (account) {
        setActiveLoginId(accountId);
        setActiveAccountId(accountId);
        setAccountType(account.account_type);
      }
    }
  }, [fetchOTPUrl, accounts]);

  const updateBalance = useCallback((accountId: string, newBalance: number | string) => {
    setAccounts(prev => {
      const updated = prev.map(acc => {
        if (acc.account_id === accountId) {
          return { ...acc, balance: String(newBalance) };
        }
        return acc;
      });
      storeDerivAccounts(updated);
      return updated;
    });
  }, []);

  const demoFallback = accounts.find((acc) => acc.account_type === 'demo' || acc.account_id.startsWith('VRTC'));
  const activeAccount = accounts.find((acc) => acc.account_id === activeAccountId) ?? demoFallback ?? accounts[0] ?? null;

  return {
    authState,
    accounts,
    activeAccount,
    activeAccountId,
    wsUrl,
    login,
    authorizeWithToken,
    signUp,
    logout,
    switchAccount,
    error,
    updateBalance,
    clientId,
    setCustomClientId,
    tokenLoginActive,
  };
}
