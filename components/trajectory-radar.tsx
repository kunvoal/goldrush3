'use client';

import React, { useState, useMemo } from 'react';
import type { AssetQuantState } from '@/hooks/use-multi-scanner';
import type { ActiveTradeState } from '@/hooks/use-five-tick-trade';
import { ArrowUpRight, ArrowDownRight, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';

interface TrajectoryRadarProps {
  quantState?: AssetQuantState;
  rankedAssets: AssetQuantState[];
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  activeTrade: ActiveTradeState | null;
  onClearTrade: () => void;
}

export function TrajectoryRadar({
  quantState,
  rankedAssets,
  selectedAsset,
  onSelectAsset,
  activeTrade,
  onClearTrade,
}: TrajectoryRadarProps) {
  const [showAssetFlyout, setShowAssetFlyout] = useState(false);
  const history = quantState?.history || [];
  const currentPrice = quantState?.currentPrice || 0;
  const prevPrice = quantState?.prevPrice || 0;
  const decimals = quantState?.asset.decimals || 2;
  const priceDiff = currentPrice - prevPrice;

  // Lightweight SVG sparkline
  const sparklineData = useMemo(() => {
    if (history.length < 2) return '';
    const slice = history.slice(-35);
    const min = Math.min(...slice);
    const max = Math.max(...slice);
    const range = max - min || 1;

    const width = 520;
    const height = 90;
    const padding = 8;

    const points = slice.map((val, idx) => {
      const x = padding + (idx / (slice.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return points.join(' ');
  }, [history]);

  return (
    <div className="bg-surface rounded-xl border border-border p-4 relative overflow-visible shadow-xl">
      {/* Top Asset & Price Bar */}
      <div className="flex items-center justify-between z-20 relative">
        {/* Intelligent Hover / Click Asset Selector */}
        <div
          className="relative"
          onMouseEnter={() => setShowAssetFlyout(true)}
          onMouseLeave={() => setShowAssetFlyout(false)}
        >
          <button
            type="button"
            onClick={() => setShowAssetFlyout(!showAssetFlyout)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-gold/50 transition-colors"
          >
            <div className="h-6 w-6 rounded bg-gold/15 flex items-center justify-center font-mono font-bold text-xs text-gold">
              {quantState?.asset.shortName?.split(' ')[1] || 'VOL'}
            </div>
            <div className="text-left font-mono">
              <span className="text-xs font-bold text-white block leading-tight">
                {quantState?.asset.name}
              </span>
              <span className="text-[10px] text-slate-400">
                GAP: <strong className="text-white">{quantState?.currentGap ?? 0}</strong>/{quantState?.avgGap ?? 32}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
          </button>

          {/* Hover Dropdown: All 10 Indices Ranked */}
          {showAssetFlyout && (
            <div className="absolute left-0 top-full mt-1 w-80 rounded-xl bg-surface-elevated/95 backdrop-blur-md border border-border p-2 shadow-2xl z-50">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-border/40 mb-1">
                <span>Asset</span>
                <span>Hazard</span>
                <span>Prime</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {rankedAssets.map((item) => {
                  const isSelected = item.asset.id === selectedAsset;
                  return (
                    <div
                      key={item.asset.id}
                      onClick={() => {
                        onSelectAsset(item.asset.id);
                        setShowAssetFlyout(false);
                      }}
                      className={`px-2 py-1.5 rounded-md font-mono text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-gold/15 text-gold font-bold'
                          : 'text-slate-300 hover:bg-surface-raised'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{item.asset.shortName}</span>
                        <span className="text-[10px] text-slate-500">
                          {item.currentPrice ? item.currentPrice.toFixed(item.asset.decimals) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] ${item.hazardScore >= 80 ? 'text-gold font-bold' : 'text-slate-400'}`}>
                          H:{item.hazardScore}%
                        </span>
                        <span className={`text-xs font-bold ${item.primeScore >= 80 ? 'text-up' : item.primeScore >= 60 ? 'text-gold' : 'text-slate-400'}`}>
                          {item.primeScore}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live Quote & Delta */}
        <div className="text-right font-mono">
          <div className="text-xl font-bold tracking-tight text-white">
            {currentPrice ? currentPrice.toFixed(decimals) : '---'}
          </div>
          <div className={`text-xs flex items-center justify-end gap-0.5 font-semibold ${
            priceDiff > 0 ? 'text-up' : priceDiff < 0 ? 'text-down' : 'text-slate-400'
          }`}>
            {priceDiff > 0 ? <ArrowUpRight className="h-3 w-3" /> : priceDiff < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
            {priceDiff > 0 ? `+${priceDiff.toFixed(decimals)}` : priceDiff.toFixed(decimals)}
          </div>
        </div>
      </div>

      {/* Center: Live Tick Sparkline */}
      <div className="my-2 relative h-24 w-full flex items-center justify-center">
        {sparklineData ? (
          <svg className="w-full h-full overflow-visible" viewBox="0 0 520 90" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#e5b842"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparklineData}
              className="drop-shadow-[0_0_6px_rgba(229,184,66,0.3)]"
            />
          </svg>
        ) : (
          <div className="font-mono text-xs text-slate-500">Streaming ticks...</div>
        )}
      </div>

      {/* 5-Tick Flight Trajectory Cockpit */}
      <div className="bg-surface-raised border border-border rounded-lg p-3">
        {activeTrade ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={`px-2 py-0.5 rounded font-bold ${
                  activeTrade.direction === 'RUNHIGH' ? 'bg-up/20 text-up' : 'bg-down/20 text-down'
                }`}>
                  {activeTrade.direction === 'RUNHIGH' ? 'UP' : 'DOWN'}
                </span>
                <span className="text-slate-400">${activeTrade.stake.toFixed(2)}</span>
              </div>

              <div className="font-mono text-xs font-bold">
                {activeTrade.status === 'OPEN' && (
                  <span className="text-gold animate-pulse">FLIGHT ({activeTrade.steps.length}/5)</span>
                )}
                {activeTrade.status === 'WON' && (
                  <span className="text-up flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    WON +${activeTrade.profit.toFixed(2)}
                  </span>
                )}
                {activeTrade.status === 'LOST' && (
                  <span className="text-down flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    LOST -${activeTrade.stake.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* 5 Step Nodes */}
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((stepNumber) => {
                const step = activeTrade.steps[stepNumber - 1];
                const isCurrent = activeTrade.status === 'OPEN' && activeTrade.steps.length + 1 === stepNumber;
                let bgStyle = 'bg-surface border-border text-slate-500';

                if (step) {
                  bgStyle = step.isPassing
                    ? 'bg-up/20 border-up/60 text-up font-bold'
                    : 'bg-down/20 border-down/60 text-down font-bold';
                } else if (isCurrent) {
                  bgStyle = 'bg-gold/15 border-gold text-gold animate-pulse font-bold';
                }

                return (
                  <div
                    key={stepNumber}
                    className={`h-12 rounded border flex flex-col items-center justify-center p-0.5 transition-all ${bgStyle}`}
                  >
                    <span className="font-mono text-[9px] opacity-70">T{stepNumber}</span>
                    <span className="font-mono text-[11px] tracking-tight">
                      {step ? step.quote.toFixed(decimals) : isCurrent ? '...' : '---'}
                    </span>
                  </div>
                );
              })}
            </div>

            {activeTrade.status !== 'OPEN' && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={onClearTrade}
                  className="font-mono text-[11px] text-slate-400 hover:text-white underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>5-TICK RADAR</span>
            <span className="text-[11px] text-slate-500">READY</span>
          </div>
        )}
      </div>
    </div>
  );
}
