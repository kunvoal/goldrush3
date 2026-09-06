'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SYNTHETIC_ASSETS, AssetInfo } from '@/lib/constants';
import {
  calculateHazardScore,
  calculateCoiling,
  calculateVelocityAndAccel,
  isChoppyRegime,
  analyze1000Ticks,
  CoilingMetrics,
  VelocityMetrics
} from '@/lib/quant-math';
import type { DerivWS, TicksHistoryResponse } from '@deriv/core';

export interface AssetQuantState {
  asset: AssetInfo;
  currentPrice: number;
  prevPrice: number;
  tickCount: number;
  history: number[];
  lastDigits: number[];
  currentGap: number;
  avgGap: number;
  hazardScore: number;
  coiling: CoilingMetrics;
  velocity: VelocityMetrics;
  isChoppy: boolean;
  primeScore: number;
  lastRunDirection: 'UP' | 'DOWN' | null;
  fiveTickRunCount: number;
  isInitialized: boolean;
}

export function useMultiScanner(ws: DerivWS | null, isConnected: boolean) {
  const [quantData, setQuantData] = useState<Record<string, AssetQuantState>>({});
  const quantRef = useRef<Record<string, AssetQuantState>>({});
  const tickSubscribedRef = useRef<Set<string>>(new Set());

  // Initialize placeholder state
  useEffect(() => {
    const initial: Record<string, AssetQuantState> = {};
    for (const a of SYNTHETIC_ASSETS) {
      initial[a.id] = {
        asset: a,
        currentPrice: 0,
        prevPrice: 0,
        tickCount: 0,
        history: [],
        lastDigits: [],
        currentGap: 0,
        avgGap: 32,
        hazardScore: 10,
        coiling: { status: 'COILING', variance: 0.01, score: 50 },
        velocity: { velocity: 0, acceleration: 0, bias: 'NEUTRAL', normalizedStrength: 0 },
        isChoppy: false,
        primeScore: 35,
        lastRunDirection: null,
        fiveTickRunCount: 0,
        isInitialized: false,
      };
    }
    quantRef.current = initial;
    setQuantData(initial);
  }, []);

  // Process incoming live tick
  const handleTick = useCallback((symbol: string, quote: number) => {
    const prev = quantRef.current[symbol];
    if (!prev) return;

    const newHistory = [...prev.history, quote].slice(-100);
    const decimals = prev.asset.decimals || 2;
    const mult = Math.pow(10, decimals);
    const lastDigit = Math.abs(Math.round(quote * mult) % 10);
    const newDigits = [...prev.lastDigits, lastDigit].slice(-100);

    const newCount = prev.tickCount + 1;
    let newCurrentGap = prev.currentGap + 1;
    let newAvgGap = prev.avgGap;
    let newRunCount = prev.fiveTickRunCount;
    let newLastDir = prev.lastRunDirection;

    if (newHistory.length >= 6) {
      const p = newHistory.slice(-6);
      const is5Up = p[1] > p[0] && p[2] > p[1] && p[3] > p[2] && p[4] > p[3] && p[5] > p[4];
      const is5Down = p[1] < p[0] && p[2] < p[1] && p[3] < p[2] && p[4] < p[3] && p[5] < p[4];

      if (is5Up || is5Down) {
        newRunCount++;
        newLastDir = is5Up ? 'UP' : 'DOWN';
        newAvgGap = Math.max(1, Math.round((prev.avgGap * (newRunCount - 1) + newCurrentGap) / newRunCount));
        newCurrentGap = 0;
      }
    }

    const hazardScore = calculateHazardScore(newCurrentGap, newAvgGap);
    const coiling = calculateCoiling(newHistory);
    const velocity = calculateVelocityAndAccel(newHistory);
    const isChoppy = isChoppyRegime(newHistory);

    let prime = (hazardScore * 0.5) + (coiling.score * 0.35);
    if (isChoppy) prime -= 25;
    if (velocity.normalizedStrength > 40) prime += 15;
    const primeScore = Math.min(99, Math.max(5, Math.round(prime)));

    const updated: AssetQuantState = {
      ...prev,
      currentPrice: quote,
      prevPrice: prev.currentPrice || quote,
      tickCount: newCount,
      history: newHistory,
      lastDigits: newDigits,
      currentGap: newCurrentGap,
      avgGap: newAvgGap,
      hazardScore,
      coiling,
      velocity,
      isChoppy,
      primeScore,
      lastRunDirection: newLastDir,
      fiveTickRunCount: newRunCount,
      isInitialized: true,
    };

    quantRef.current[symbol] = updated;
  }, []);

  // Fetch 1000 official ticks history on mount & subscribe to live ticks
  useEffect(() => {
    if (!ws || !isConnected) return;
    let disposed = false;
    const unsubs: Array<() => void> = [];

    async function initAndSubscribe() {
      // 1. Fetch 1000 historical ticks for each asset to establish ground truth
      for (const asset of SYNTHETIC_ASSETS) {
        if (disposed) return;
        try {
          const hist = await ws!.send<TicksHistoryResponse>({
            ticks_history: asset.id,
            end: 'latest',
            count: 1000,
            style: 'ticks'
          });

          if (hist.history?.prices && hist.history.prices.length > 0) {
            const analysis = analyze1000Ticks(hist.history.prices, asset.decimals);
            if (analysis) {
              quantRef.current[asset.id] = {
                asset,
                currentPrice: analysis.currentPrice,
                prevPrice: analysis.prevPrice,
                tickCount: 1000,
                history: analysis.history,
                lastDigits: analysis.lastDigits,
                currentGap: analysis.currentGap,
                avgGap: analysis.avgGap,
                hazardScore: analysis.hazardScore,
                coiling: analysis.coiling,
                velocity: analysis.velocity,
                isChoppy: analysis.isChoppy,
                primeScore: analysis.primeScore,
                lastRunDirection: analysis.lastRunDirection,
                fiveTickRunCount: analysis.fiveTickRunCount,
                isInitialized: true,
              };
            }
          }
        } catch {
          // History fetch fallback
        }
      }

      // Initial state sync to React right after loading 1000 historical ticks
      if (!disposed) {
        setQuantData({ ...quantRef.current });
      }

      // 2. Subscribe to live streaming ticks
      for (const asset of SYNTHETIC_ASSETS) {
        if (!tickSubscribedRef.current.has(asset.id)) {
          tickSubscribedRef.current.add(asset.id);
          try {
            const sub = await ws!.subscribe({ ticks: asset.id }, (data) => {
              const tick = data.tick as { symbol?: string; quote?: number } | undefined;
              if (tick?.symbol && typeof tick?.quote === 'number') {
                handleTick(tick.symbol, tick.quote);
              }
            });
            if (disposed) {
              sub.unsubscribe();
            } else {
              unsubs.push(sub.unsubscribe);
            }
          } catch {
            // Subscription error handled
          }
        }
      }
    }

    initAndSubscribe();

    const interval = setInterval(() => {
      setQuantData({ ...quantRef.current });
    }, 250);

    return () => {
      disposed = true;
      clearInterval(interval);
      for (const unsub of unsubs) unsub();
      tickSubscribedRef.current.clear();
    };
  }, [ws, isConnected, handleTick]);

  const rankedAssets = Object.values(quantData).sort((a, b) => b.primeScore - a.primeScore);

  return {
    quantData,
    rankedAssets,
    topPrimedAsset: rankedAssets[0] ?? null,
  };
}
