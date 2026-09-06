'use client';

import React from 'react';
import type { AssetQuantState } from '@/hooks/use-multi-scanner';
import { Sparkles, ArrowUp, ArrowDown } from 'lucide-react';

interface ScannerTableProps {
  rankedAssets: AssetQuantState[];
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
}

export function ScannerTable({ rankedAssets, selectedAsset, onSelectAsset }: ScannerTableProps) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            SYNTHETIC RADAR SCANNER (10 INDICES)
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          Ranked by 5-Tick Confluence
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-border text-slate-400 text-[11px] uppercase">
              <th className="pb-2 font-normal">Asset</th>
              <th className="pb-2 font-normal text-right">Price</th>
              <th className="pb-2 font-normal text-center">Gap / Avg</th>
              <th className="pb-2 font-normal text-center">Hazard H(t)</th>
              <th className="pb-2 font-normal text-center">Coiling</th>
              <th className="pb-2 font-normal text-center">Impulse</th>
              <th className="pb-2 font-normal text-right">Prime Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rankedAssets.map((item, index) => {
              const isSelected = item.asset.id === selectedAsset;
              const isTop = index === 0;

              return (
                <tr
                  key={item.asset.id}
                  onClick={() => onSelectAsset(item.asset.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-gold/15 text-white font-bold'
                      : 'hover:bg-surface-raised text-slate-300'
                  }`}
                >
                  <td className="py-2.5 flex items-center gap-2">
                    {isTop && (
                      <span className="h-1.5 w-1.5 rounded-full bg-gold animate-ping" />
                    )}
                    <span className="font-bold text-white">{item.asset.shortName}</span>
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    {item.currentPrice ? item.currentPrice.toFixed(item.asset.decimals) : '---'}
                  </td>
                  <td className="py-2.5 text-center text-slate-400">
                    <span className={item.currentGap >= item.avgGap ? 'text-gold font-bold' : ''}>
                      {item.currentGap}
                    </span>
                    <span className="text-slate-500 text-[10px]"> / {item.avgGap}</span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.hazardScore >= 80 ? 'bg-gold/20 text-gold border border-gold/40' :
                      item.hazardScore >= 50 ? 'bg-cyber-cyan/15 text-cyber-cyan' :
                      'text-slate-400'
                    }`}>
                      {item.hazardScore}%
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.coiling.status === 'ULTRA TIGHT' ? 'bg-cyber-cyan/20 text-cyber-cyan font-bold' :
                      item.coiling.status === 'COILING' ? 'text-blue-400' : 'text-slate-500'
                    }`}>
                      {item.coiling.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="inline-flex items-center gap-0.5 text-[11px]">
                      {item.velocity.bias === 'UP' ? (
                        <span className="text-up flex items-center font-bold">
                          <ArrowUp className="h-3 w-3" /> UP
                        </span>
                      ) : item.velocity.bias === 'DOWN' ? (
                        <span className="text-down flex items-center font-bold">
                          <ArrowDown className="h-3 w-3" /> DN
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`font-bold ${
                      item.primeScore >= 80 ? 'text-up text-sm drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]' :
                      item.primeScore >= 60 ? 'text-gold' : 'text-slate-400'
                    }`}>
                      {item.primeScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
