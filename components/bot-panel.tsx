'use client';

import React, { useState } from 'react';
import type { TradeHistoryItem, JournalEntry } from '@/hooks/use-five-tick-trade';
import { Trash2 } from 'lucide-react';

interface BotPanelProps {
  tradeHistory: TradeHistoryItem[];
  journal: JournalEntry[];
  onClear: () => void;
}

export function BotPanel({ tradeHistory, journal, onClear }: BotPanelProps) {
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'JOURNAL'>('TRANSACTIONS');

  // Compute Summary Statistics
  const totalRuns = tradeHistory.length;
  const wonRuns = tradeHistory.filter((t) => t.isWin).length;
  const lostRuns = totalRuns - wonRuns;
  const totalStake = tradeHistory.reduce((acc, t) => acc + t.stake, 0);
  const totalPayout = tradeHistory.reduce((acc, t) => acc + t.payout, 0);
  const totalProfit = tradeHistory.reduce((acc, t) => acc + t.profit, 0);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xl font-mono text-xs">
      {/* 1. Statistics Summary Bar (Derived from BotUI Run-Panel) */}
      <div className="bg-surface-raised px-3 py-2 border-b border-border/50 flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400">RUNS: </span>
            <span className="font-bold text-white">{totalRuns}</span>
          </div>
          <div>
            <span className="text-slate-400">WON/LOST: </span>
            <span className="font-bold text-up">{wonRuns}</span>
            <span className="text-slate-500"> / </span>
            <span className="font-bold text-down">{lostRuns}</span>
          </div>
          <div>
            <span className="text-slate-400">STAKE: </span>
            <span className="font-bold text-white">${totalStake.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-400">PAYOUT: </span>
            <span className="font-bold text-white">${totalPayout.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <span className="text-slate-400">P/L: </span>
            <span className={`font-bold ${totalProfit > 0 ? 'text-up' : totalProfit < 0 ? 'text-down' : 'text-slate-300'}`}>
              {totalProfit >= 0 ? `+$${totalProfit.toFixed(2)}` : `-$${Math.abs(totalProfit).toFixed(2)}`}
            </span>
          </div>

          <button
            onClick={onClear}
            className="text-slate-400 hover:text-down transition p-1"
            title="Clear Statistics and Logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center border-b border-border/50 px-3 bg-surface">
        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`py-2 px-3 text-[11px] font-bold border-b-2 transition-colors ${
            activeTab === 'TRANSACTIONS'
              ? 'border-gold text-gold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          TRANSACTIONS ({tradeHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('JOURNAL')}
          className={`py-2 px-3 text-[11px] font-bold border-b-2 transition-colors ${
            activeTab === 'JOURNAL'
              ? 'border-gold text-gold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          JOURNAL ({journal.length})
        </button>
      </div>

      {/* 3. Tab Content */}
      <div className="h-44 overflow-y-auto p-2 bg-surface/50">
        {activeTab === 'TRANSACTIONS' ? (
          tradeHistory.length > 0 ? (
            <div className="divide-y divide-border/30">
              {tradeHistory.map((trade) => (
                <div key={trade.id} className="py-1.5 px-2 flex items-center justify-between text-[11px] hover:bg-surface-raised/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{trade.timestamp}</span>
                    <span className="font-bold text-white">{trade.symbol}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                      trade.direction === 'RUNHIGH' ? 'bg-up/20 text-up' : 'bg-down/20 text-down'
                    }`}>
                      {trade.direction === 'RUNHIGH' ? 'UP' : 'DOWN'}
                    </span>
                    <span className="text-slate-400">${trade.stake.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">${trade.payout.toFixed(2)}</span>
                    <span className={`font-bold ${trade.isWin ? 'text-up' : 'text-down'}`}>
                      {trade.isWin ? `+$${trade.profit.toFixed(2)}` : `-$${trade.stake.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No transactions recorded in this session.
            </div>
          )
        ) : (
          journal.length > 0 ? (
            <div className="space-y-1">
              {journal.map((item) => (
                <div key={item.id} className="py-1 px-2 flex items-start gap-2 text-[11px] font-mono leading-tight hover:bg-surface-raised/40 rounded">
                  <span className="text-slate-500 shrink-0">{item.timestamp}</span>
                  <span className={`px-1 py-0.2 rounded font-bold text-[9px] shrink-0 ${
                    item.type === 'WIN' ? 'bg-up/20 text-up' :
                    item.type === 'FAIL' ? 'bg-down/20 text-down' :
                    item.type === 'TRIGGER' ? 'bg-gold/20 text-gold' :
                    'bg-slate-700/40 text-slate-300'
                  }`}>
                    {item.type}
                  </span>
                  <span className="text-slate-300 break-words">{item.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Journal empty.
            </div>
          )
        )}
      </div>
    </div>
  );
}
