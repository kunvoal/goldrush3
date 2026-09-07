'use client';

import React, { useState } from 'react';
import { useDerivWSContext } from './deriv-ws-provider';
import { RefreshCw, LogOut, User } from 'lucide-react';

export function Header() {
  const { isConnected, auth, ws } = useDerivWSContext();
  const {
    authState,
    accounts,
    activeAccount,
    login,
    logout,
    switchAccount,
  } = auth;

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const isAuthenticated = authState === 'authenticated';
  const isDemo = activeAccount?.account_type === 'demo' || activeAccount?.account_id.startsWith('VRTC');
  const balance = activeAccount
    ? Number(activeAccount.balance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  const currency = activeAccount?.currency || 'USD';

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

  return (
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

      {/* Right Controls: Account & Login/User Icon */}
      <div className="flex items-center gap-2">
        {isAuthenticated && activeAccount ? (
          <div className="relative">
            {/* Account Trigger Button */}
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-2 rounded border border-border px-2.5 py-1 hover:bg-surface-raised transition text-[11px] font-mono cursor-pointer"
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
                        className={`w-full text-left rounded px-2 py-1.5 transition text-[11px] font-mono flex items-center justify-between cursor-pointer ${
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

        {/* Clean Login button when unauthenticated */}
        {!isAuthenticated && (
          <button
            onClick={() => login()}
            className="px-2.5 py-1 rounded bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 font-mono text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Sign in with Deriv"
          >
            <span>Log In</span>
          </button>
        )}

        {/* Person SVG Avatar / Login Icon */}
        <div className="relative">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                login();
              } else {
                setShowUserDropdown(!showUserDropdown);
              }
            }}
            className={`flex items-center justify-center w-7 h-7 rounded-full border transition cursor-pointer ${
              isAuthenticated
                ? 'border-gold/60 text-gold bg-gold/10 hover:bg-gold/20'
                : 'border-border text-slate-400 hover:text-white hover:bg-surface-raised hover:border-gold/50'
            }`}
            title={isAuthenticated ? `Logged in: ${activeAccount?.account_id}` : 'Log In with Deriv'}
          >
            <User className="w-4 h-4" />
          </button>

          {showUserDropdown && isAuthenticated && (
            <div className="absolute right-0 mt-1.5 w-44 rounded-lg bg-surface-elevated border border-border p-1 shadow-2xl z-50">
              <div className="px-2.5 py-1.5 border-b border-border/50 text-[10px] font-mono text-slate-400">
                <span className="block text-white font-bold">{activeAccount?.account_id}</span>
                <span className="text-slate-400">Official Deriv Session</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  setShowUserDropdown(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded font-mono text-xs text-down hover:bg-down/10 font-bold transition flex items-center gap-1.5 mt-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
