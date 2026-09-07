'use client';

import React, { useState, useEffect } from 'react';
import { useDerivWSContext } from './deriv-ws-provider';
import {
  X,
  Key,
  Globe,
  ExternalLink,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  LogOut,
  UserCheck
} from 'lucide-react';

export function Header() {
  const { isConnected, auth, ws } = useDerivWSContext();
  const {
    authState,
    accounts,
    activeAccount,
    login,
    authorizeWithToken,
    logout,
    switchAccount,
    clientId,
    setCustomClientId,
    tokenLoginActive,
  } = auth;

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'token' | 'oauth'>('token');

  // Token login form state
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isAuthorizingToken, setIsAuthorizingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // OAuth form state
  const [oauthClientIdInput, setOauthClientIdInput] = useState(clientId);
  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const isAuthenticated = authState === 'authenticated';
  const isDemo = activeAccount?.account_type === 'demo' || activeAccount?.account_id.startsWith('VRTC');
  const balance = activeAccount
    ? Number(activeAccount.balance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  const currency = activeAccount?.currency || 'USD';

  // Check if current domain matches the registered client ID
  const isDefaultClientId =
    oauthClientIdInput === '34kDYD0Jh226YNUlY8nTL' ||
    oauthClientIdInput === '33AXtdkpnn5FFGi6pkEjy' ||
    oauthClientIdInput === '33UCCegh1Ajb0WUaZVFe9';
  const isDomainMismatch =
    isDefaultClientId &&
    currentOrigin &&
    !currentOrigin.includes('goldrush-3-kunvoals-projects.vercel.app') &&
    !currentOrigin.includes('goldrush-kunvoals-projects.vercel.app') &&
    !currentOrigin.includes('goldrush2-kunvoals-projects.vercel.app');

  const handleTopup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ws) {
      try {
        await ws.send({ topup_virtual: 1 });
        await ws.send({ balance: 1 });
      } catch (err) {
        console.error('Topup failed:', err);
      }
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setTokenError('Please enter a valid Deriv API token.');
      return;
    }

    setIsAuthorizingToken(true);
    setTokenError(null);

    const result = await authorizeWithToken(cleanToken, ws);
    setIsAuthorizingToken(false);

    if (result.success) {
      setShowAuthModal(false);
      setTokenInput('');
    } else {
      setTokenError(result.error || 'Authorization failed. Please verify your token permissions (Read + Trade required).');
    }
  };

  const handleOAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (oauthClientIdInput !== clientId) {
      setCustomClientId(oauthClientIdInput);
    }
    await login(oauthClientIdInput);
  };

  return (
    <>
      <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between select-none relative z-30">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
          <span className="font-mono font-bold text-sm tracking-wider text-white">
            GOLDRUSH<span className="text-gold">3</span>
          </span>
        </div>

        {/* Center Status: Connection */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-up animate-pulse' : 'bg-down'}`} />
          <span className={isConnected ? 'text-up font-semibold' : 'text-down font-semibold'}>
            {isConnected ? 'DERIV LIVE' : 'CONNECTING'}
          </span>
        </div>

        {/* Right Controls: Account & User Icon */}
        <div className="flex items-center gap-2">
          {isAuthenticated && activeAccount ? (
            <div className="relative">
              {/* Account Trigger Button */}
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="flex items-center gap-2 rounded border border-border px-2.5 py-1 hover:bg-surface-raised transition text-[11px] font-mono"
              >
                <div className="text-left leading-none">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isDemo ? 'text-orange-500' : 'text-emerald-500'}`}>
                    {isDemo ? 'demo' : 'real'}
                  </span>
                  <div className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                    <span>{balance} {currency}</span>
                    {isDemo && (
                      <span
                        onClick={handleTopup}
                        className="p-0.5 hover:bg-surface-raised rounded cursor-pointer transition text-orange-500 flex items-center justify-center"
                        title="Reset demo balance to $10,000"
                      >
                        <RefreshCw className="w-3 h-3 hover:rotate-180 duration-300 transition-transform" />
                      </span>
                    )}
                  </div>
                </div>
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Account Switcher Dropdown */}
              {showAccountDropdown && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-surface-elevated border border-border p-1 shadow-2xl z-50">
                  <div className="space-y-0.5">
                    {accounts.map(acc => {
                      const accIsDemo = acc.account_type === 'demo' || acc.account_id.startsWith('VRTC');
                      const isActive = acc.account_id === activeAccount.account_id;
                      return (
                        <button
                          key={acc.account_id}
                          onClick={() => {
                            switchAccount(acc.account_id);
                            setShowAccountDropdown(false);
                          }}
                          className={`w-full text-left rounded px-2 py-1.5 transition text-[11px] font-mono flex items-center justify-between ${
                            isActive ? 'bg-surface-raised text-gold font-bold' : 'text-slate-300 hover:bg-surface-raised/60'
                          }`}
                        >
                          <div>
                            <span className={`text-[8px] font-bold uppercase block leading-none ${accIsDemo ? 'text-orange-500' : 'text-emerald-500'}`}>
                              {accIsDemo ? 'demo' : 'real'}
                            </span>
                            <span className="text-white text-xs mt-0.5 block">{acc.account_id}</span>
                          </div>
                          <span className="font-bold">
                            ${Number(acc.balance || '0').toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Person SVG Avatar / Auth Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                } else {
                  setShowUserDropdown(!showUserDropdown);
                }
              }}
              className={`flex items-center justify-center w-7 h-7 rounded-full border transition ${
                isAuthenticated
                  ? 'border-gold/60 text-gold bg-gold/10 hover:bg-gold/20'
                  : 'border-border text-slate-400 hover:text-white hover:bg-surface-raised'
              }`}
              title={isAuthenticated ? `Logged in: ${activeAccount?.account_id}` : 'Log In'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {showUserDropdown && isAuthenticated && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-lg bg-surface-elevated border border-border p-1 shadow-2xl z-50">
                <div className="px-2.5 py-1.5 border-b border-border/50 text-[10px] font-mono text-slate-400">
                  <span className="block text-white font-bold">{activeAccount?.account_id}</span>
                  <span className="text-slate-400">{tokenLoginActive ? 'Token Auth (PAT)' : 'OAuth 2.0 Session'}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded font-mono text-xs text-down hover:bg-down/10 font-bold transition flex items-center gap-1.5 mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modern Deriv Auth Dialog Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gold" />
                <h3 className="font-mono font-bold text-sm tracking-wider text-white">
                  DERIV SIGN IN
                </h3>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-surface-raised transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-border text-xs font-mono">
              <button
                onClick={() => {
                  setAuthTab('token');
                  setTokenError(null);
                }}
                className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 font-semibold transition border-b-2 ${
                  authTab === 'token'
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-surface-raised/40'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>API Token (Instant)</span>
              </button>
              <button
                onClick={() => {
                  setAuthTab('oauth');
                  setTokenError(null);
                }}
                className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 font-semibold transition border-b-2 ${
                  authTab === 'oauth'
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-surface-raised/40'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>OAuth 2.0 Flow</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 font-mono text-xs">
              {authTab === 'token' ? (
                /* Tab 1: Personal Access Token (PAT) */
                <form onSubmit={handleTokenSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-300">
                        DERIV API TOKEN
                      </label>
                      <a
                        href="https://app.deriv.com/account/api-token"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-gold hover:underline flex items-center gap-1"
                      >
                        <span>Create Token</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="Paste your token with Read + Trade scopes"
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-none focus:border-gold pr-10"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      >
                        {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Recommended by official Deriv API. Bypasses domain redirect restrictions and connects directly.
                    </p>
                  </div>

                  {tokenError && (
                    <div className="p-2.5 bg-down/10 border border-down/30 rounded-lg text-down text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{tokenError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthorizingToken || !tokenInput.trim()}
                    className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 tracking-wide uppercase text-xs"
                  >
                    {isAuthorizingToken ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Connect Account</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Tab 2: OAuth 2.0 PKCE Flow */
                <form onSubmit={handleOAuthSubmit} className="space-y-4">
                  {isDomainMismatch && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] space-y-1 leading-relaxed">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Domain Registration Check</span>
                      </div>
                      <p>
                        Current origin is <span className="underline font-bold text-white">{currentOrigin}</span>.
                        Deriv&apos;s OAuth server strictly verifies that this domain is registered to your Client ID.
                      </p>
                      <p className="text-[10px] text-slate-300">
                        If this domain is not yet registered on <a href="https://developers.deriv.com" target="_blank" rel="noreferrer" className="text-gold underline">developers.deriv.com</a>, use the <strong className="text-white">API Token (Instant)</strong> tab above to sign in immediately without error.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      OAUTH CLIENT ID (APP ID)
                    </label>
                    <input
                      type="text"
                      value={oauthClientIdInput}
                      onChange={(e) => setOauthClientIdInput(e.target.value)}
                      placeholder="e.g. 33AXtdkpnn5FFGi6pkEjy"
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-none focus:border-gold"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Redirect URI: <span className="text-slate-300">{currentOrigin}</span>
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-surface-raised hover:bg-surface border border-border hover:border-gold text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 tracking-wide uppercase text-xs"
                  >
                    <Globe className="w-4 h-4 text-gold" />
                    <span>Redirect to Deriv OAuth</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
