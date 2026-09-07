'use client';

import React from 'react';
import type { DirectionType } from '@/lib/constants';
import { Bot, ArrowUp, ArrowDown } from 'lucide-react';

interface ExecutionDeckProps {
  stake: string;
  onStakeChange: (newStake: string) => void;
  onExecute: (direction: DirectionType) => void;
  isExecuting: boolean;
  isTradeOpen: boolean;
  isBotArmed: boolean;
  onToggleBot: () => void;
  botMinPrime: number;
  onBotMinPrimeChange: (val: number) => void;
  botDirectionMode: 'AUTO' | 'UP' | 'DOWN';
  onBotDirectionChange: (mode: 'AUTO' | 'UP' | 'DOWN') => void;
  livePayout: number;
  liveMultiplier: number;
  errorMessage: string | null;
}

export function ExecutionDeck({
  stake,
  onStakeChange,
  onExecute,
  isExecuting,
  isTradeOpen,
  isBotArmed,
  onToggleBot,
  botMinPrime,
  onBotMinPrimeChange,
  botDirectionMode,
  onBotDirectionChange,
  livePayout,
  liveMultiplier,
  errorMessage,
}: ExecutionDeckProps) {
  const stakeVal = parseFloat(stake) || 0.35;
  const payout = livePayout > 0 ? livePayout : parseFloat((stakeVal * liveMultiplier).toFixed(2));
  const profit = parseFloat((payout - stakeVal).toFixed(2));

  const applyMultiplier = (mult: number) => {
    const updated = Math.max(0.35, parseFloat((stakeVal * mult).toFixed(2)));
    onStakeChange(String(updated));
  };

  return (
    <div className="space-y-3">
      {/* 1. Execution Controls */}
      <div className="bg-surface rounded-xl border border-border p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/50 font-mono text-xs">
          {/* Stake Input */}
          <div className="flex-1">
            <span className="text-slate-400 text-[10px] block mb-1 uppercase tracking-wider">
              STAKE
            </span>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-2 text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.35"
                  value={stake}
                  onChange={(e) => onStakeChange(e.target.value)}
                  className="w-full bg-surface-raised border border-border focus:border-gold rounded-md pl-6 pr-2 py-1.5 font-bold text-white outline-none"
                />
              </div>

              {/* Quick Multipliers */}
              <button
                type="button"
                onClick={() => applyMultiplier(1.5)}
                className="px-2 py-1.5 rounded bg-surface-raised hover:bg-surface-elevated border border-border text-slate-300"
              >
                x1.5
              </button>
              <button
                type="button"
                onClick={() => applyMultiplier(2)}
                className="px-2 py-1.5 rounded bg-surface-raised hover:bg-surface-elevated border border-border text-gold font-bold"
              >
                2x
              </button>
              <button
                type="button"
                onClick={() => onStakeChange('0.35')}
                className="px-2 py-1.5 rounded bg-surface-raised hover:bg-surface-elevated border border-border text-slate-400"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Dynamic Payout & Profit Readout */}
          <div className="text-right">
            <span className="text-slate-400 text-[10px] block uppercase tracking-wider">
              PAYOUT
            </span>
            <div className="text-base font-bold text-gold tracking-tight mt-1">
              ${payout.toFixed(2)}
              <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                (+${profit.toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-2.5 p-2 rounded bg-down/10 border border-down/30 font-mono text-[11px] text-down">
            {errorMessage}
          </div>
        )}

        {/* ONLY UP vs ONLY DOWN Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={() => onExecute('RUNHIGH')}
            disabled={isExecuting || isTradeOpen}
            className={`py-3.5 px-3 rounded-lg border flex items-center justify-center gap-2 font-mono text-base font-bold transition-all ${
              isExecuting || isTradeOpen
                ? 'opacity-30 cursor-not-allowed bg-surface-raised border-border text-slate-500'
                : 'bg-up/10 hover:bg-up/25 border-up/40 hover:border-up text-up shadow-[0_0_15px_rgba(0,230,118,0.2)] active:scale-[0.98]'
            }`}
          >
            <ArrowUp className="h-5 w-5" />
            <span>ONLY UP</span>
          </button>

          <button
            onClick={() => onExecute('RUNLOW')}
            disabled={isExecuting || isTradeOpen}
            className={`py-3.5 px-3 rounded-lg border flex items-center justify-center gap-2 font-mono text-base font-bold transition-all ${
              isExecuting || isTradeOpen
                ? 'opacity-30 cursor-not-allowed bg-surface-raised border-border text-slate-500'
                : 'bg-down/10 hover:bg-down/25 border-down/40 hover:border-down text-down shadow-[0_0_15px_rgba(255,23,68,0.2)] active:scale-[0.98]'
            }`}
          >
            <ArrowDown className="h-5 w-5" />
            <span>ONLY DOWN</span>
          </button>
        </div>
      </div>

      {/* 2. Autonomous Bot Deck */}
      <div className="bg-surface rounded-xl border border-border p-3 shadow-xl font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className={`h-4 w-4 ${isBotArmed ? 'text-gold animate-bounce' : 'text-slate-400'}`} />
            <span className="font-bold text-white">BOT</span>
            <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 text-[9px] font-bold uppercase tracking-wider">
              DEMO / PAPER
            </span>
          </div>

          <button
            onClick={onToggleBot}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              isBotArmed
                ? 'bg-up text-black shadow-[0_0_12px_rgba(0,230,118,0.4)]'
                : 'bg-surface-raised border border-border hover:border-gold text-slate-300'
            }`}
          >
            {isBotArmed ? 'ARMED' : 'ARM BOT'}
          </button>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Min:</span>
            {[75, 80, 85, 90].map((score) => (
              <button
                key={score}
                onClick={() => onBotMinPrimeChange(score)}
                className={`px-1.5 py-0.5 rounded ${
                  botMinPrime === score
                    ? 'bg-gold text-black font-bold'
                    : 'bg-surface-raised text-slate-400 hover:text-white'
                }`}
              >
                {score}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-1">
            {(['AUTO', 'UP', 'DOWN'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onBotDirectionChange(mode)}
                className={`px-1.5 py-0.5 rounded ${
                  botDirectionMode === mode
                    ? 'bg-cyber-cyan text-black font-bold'
                    : 'bg-surface-raised text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
