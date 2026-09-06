'use client';

import React from 'react';
import type { AssetQuantState } from '@/hooks/use-multi-scanner';
import { Activity, ShieldAlert, Sparkles, TrendingUp, TrendingDown, Gauge } from 'lucide-react';

interface QuantHudProps {
  quantState?: AssetQuantState;
}

export function QuantHud({ quantState }: QuantHudProps) {
  const hazard = quantState?.hazardScore ?? 10;
  const coiling = quantState?.coiling ?? { status: 'COILING', variance: 0.01, score: 50 };
  const velocity = quantState?.velocity ?? { velocity: 0, acceleration: 0, bias: 'NEUTRAL', normalizedStrength: 0 };
  const isChoppy = quantState?.isChoppy ?? false;
  const prime = quantState?.primeScore ?? 35;

  return (
    <div className="grid grid-cols-4 gap-2.5 my-3">
      {/* 1. Hazard Score */}
      <div className="bg-surface rounded-xl border border-border p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
            <Gauge className="h-3 w-3 text-gold" />
            HAZARD H(t)
          </span>
        </div>
        <div className="my-1">
          <span className={`font-mono text-xl font-bold tracking-tight ${
            hazard >= 80 ? 'text-gold' : hazard >= 50 ? 'text-cyber-cyan' : 'text-slate-300'
          }`}>
            {hazard}%
          </span>
        </div>
        <div className="w-full bg-surface-raised h-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              hazard >= 80 ? 'bg-gold' : hazard >= 50 ? 'bg-cyber-cyan' : 'bg-slate-600'
            }`}
            style={{ width: `${hazard}%` }}
          />
        </div>
      </div>

      {/* 2. Coiling Compression */}
      <div className="bg-surface rounded-xl border border-border p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
            <Activity className="h-3 w-3 text-cyber-cyan" />
            COILING σ²
          </span>
        </div>
        <div className="my-1">
          <span className={`font-mono text-xs font-bold ${
            coiling.status === 'ULTRA TIGHT' ? 'text-cyber-cyan' :
            coiling.status === 'COILING' ? 'text-blue-400' : 'text-amber-400'
          }`}>
            {coiling.status}
          </span>
          <span className="font-mono text-[10px] text-slate-400 ml-1">
            {coiling.variance.toFixed(4)}
          </span>
        </div>
        <div className="w-full bg-surface-raised h-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              coiling.status === 'ULTRA TIGHT' ? 'bg-cyber-cyan' :
              coiling.status === 'COILING' ? 'bg-blue-400' : 'bg-amber-400'
            }`}
            style={{ width: `${coiling.score}%` }}
          />
        </div>
      </div>

      {/* 3. Micro-Velocity Impulse */}
      <div className="bg-surface rounded-xl border border-border p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
            {velocity.bias === 'UP' ? <TrendingUp className="h-3 w-3 text-up" /> : <TrendingDown className="h-3 w-3 text-down" />}
            IMPULSE v
          </span>
        </div>
        <div className="my-1 flex items-center gap-1.5">
          <span className={`font-mono text-sm font-bold ${
            velocity.bias === 'UP' ? 'text-up' : velocity.bias === 'DOWN' ? 'text-down' : 'text-slate-400'
          }`}>
            {velocity.bias}
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {velocity.normalizedStrength}%
          </span>
        </div>
        <div className="w-full bg-surface-raised h-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              velocity.bias === 'UP' ? 'bg-up' : velocity.bias === 'DOWN' ? 'bg-down' : 'bg-slate-600'
            }`}
            style={{ width: `${velocity.normalizedStrength}%` }}
          />
        </div>
      </div>

      {/* 4. Prime Score */}
      <div className="bg-surface rounded-xl border border-border p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-gold" />
            PRIME
          </span>
          {isChoppy && (
            <span className="text-[9px] font-mono text-down bg-down/10 px-1 py-0.2 rounded border border-down/30">
              CHOP
            </span>
          )}
        </div>
        <div className="my-1">
          <span className={`font-mono text-xl font-bold ${
            prime >= 80 ? 'text-up' : prime >= 60 ? 'text-gold' : 'text-slate-400'
          }`}>
            {prime}<span className="text-[10px] text-slate-500 font-normal">/100</span>
          </span>
        </div>
        <div className="w-full bg-surface-raised h-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isChoppy ? 'bg-down' : prime >= 80 ? 'bg-up' : prime >= 60 ? 'bg-gold' : 'bg-slate-600'
            }`}
            style={{ width: `${prime}%` }}
          />
        </div>
      </div>
    </div>
  );
}
