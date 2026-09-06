'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DerivWS } from '@deriv/core';
import type { DerivAccount } from '@deriv/core';
import type { DirectionType } from '@/lib/constants';
import type { AssetQuantState } from './use-multi-scanner';

export interface ActiveTradeStep {
  stepIndex: number;
  quote: number;
  prevQuote: number;
  isPassing: boolean;
}

export interface ActiveTradeState {
  contractId: number | string;
  symbol: string;
  direction: DirectionType;
  stake: number;
  entryPrice: number;
  expectedPayout: number;
  currentTick: number;
  steps: ActiveTradeStep[];
  status: 'OPEN' | 'WON' | 'LOST';
  payout: number;
  profit: number;
}

export interface TradeHistoryItem {
  id: string;
  timestamp: string;
  symbol: string;
  direction: DirectionType;
  stake: number;
  payout: number;
  profit: number;
  isWin: boolean;
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'TRIGGER' | 'WIN' | 'FAIL';
  message: string;
}

interface UseFiveTickTradeOptions {
  ws: DerivWS | null;
  isConnected: boolean;
  selectedAsset: string;
  stake: string;
  activeAccount: DerivAccount | null;
  updateBalance: (accountId: string, newBalance: number | string) => void;
  quantState?: AssetQuantState;
}

export function useFiveTickTrade({
  ws,
  isConnected,
  selectedAsset,
  stake,
  activeAccount,
  updateBalance,
  quantState,
}: UseFiveTickTradeOptions) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTrade, setActiveTrade] = useState<ActiveTradeState | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live dynamic proposal pricing from Deriv
  const [livePayout, setLivePayout] = useState<number>(0);
  const [liveMultiplier, setLiveMultiplier] = useState<number>(29.2);

  // Bot State
  const [isBotArmed, setIsBotArmed] = useState(false);
  const [botMinPrime, setBotMinPrime] = useState(80);
  const [botDirectionMode, setBotDirectionMode] = useState<'AUTO' | 'UP' | 'DOWN'>('AUTO');
  const [botCooldown, setBotCooldown] = useState(false);

  const activeTradeRef = useRef<ActiveTradeState | null>(null);
  activeTradeRef.current = activeTrade;

  const addJournal = useCallback((type: JournalEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setJournal(prev => [{
      id: Math.random().toString(36).substring(2, 9),
      timestamp: time,
      type,
      message,
    }, ...prev.slice(0, 99)]);
  }, []);

  // Fetch live proposal quote whenever asset, stake, or connection updates
  useEffect(() => {
    if (!ws || !isConnected) return;
    let cancelled = false;
    const stakeVal = parseFloat(stake) || 0.35;

    async function fetchProposal() {
      try {
        const res = await ws!.send({
          proposal: 1,
          amount: stakeVal,
          basis: 'stake',
          currency: activeAccount?.currency || 'USD',
          duration: 5,
          duration_unit: 't',
          underlying_symbol: selectedAsset,
          contract_type: 'RUNHIGH',
        }) as { proposal?: { id: string; ask_price: number; payout: number }; error?: { message: string } };

        if (!cancelled && res.proposal) {
          const p = res.proposal.payout;
          const ask = res.proposal.ask_price || stakeVal;
          setLivePayout(p);
          setLiveMultiplier(p / ask);
        }
      } catch {
        // Fallback to calculated multiplier
        if (!cancelled) {
          setLivePayout(parseFloat((stakeVal * liveMultiplier).toFixed(2)));
        }
      }
    }

    fetchProposal();
    return () => { cancelled = true; };
  }, [ws, isConnected, selectedAsset, stake, activeAccount, liveMultiplier]);

  // Initial connection log
  useEffect(() => {
    if (isConnected) {
      addJournal('INFO', 'Deriv WebSocket connected. Quant radar live.');
    }
  }, [isConnected, addJournal]);

  // Log Bot Arming
  useEffect(() => {
    if (isBotArmed) {
      addJournal('INFO', `Bot armed: Prime threshold >= ${botMinPrime}%, mode: ${botDirectionMode}`);
    } else {
      addJournal('INFO', 'Bot disarmed.');
    }
  }, [isBotArmed, botMinPrime, botDirectionMode, addJournal]);

  // Sound Synthesizer (Web Audio API)
  const playSound = useCallback((type: 'win' | 'lose' | 'click' | 'step') => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.35);
        });
      } else if (type === 'step') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // AudioContext handled
    }
  }, []);

  // Monitor incoming ticks for active trade trajectory
  useEffect(() => {
    if (!quantState || !activeTradeRef.current) return;
    const trade = activeTradeRef.current;
    if (trade.status !== 'OPEN' || trade.symbol !== quantState.asset.id) return;

    const currentPrice = quantState.currentPrice;
    if (!currentPrice) return;

    const lastStep = trade.steps[trade.steps.length - 1];
    if (lastStep && lastStep.quote === currentPrice) return;

    const stepIdx = trade.steps.length + 1;
    if (stepIdx > 5) return;

    const prevPrice = lastStep ? lastStep.quote : trade.entryPrice;
    const isPassing = trade.direction === 'RUNHIGH' ? currentPrice > prevPrice : currentPrice < prevPrice;

    const newStep: ActiveTradeStep = {
      stepIndex: stepIdx,
      quote: currentPrice,
      prevQuote: prevPrice,
      isPassing,
    };

    const newSteps = [...trade.steps, newStep];
    const isFailed = !isPassing;
    const isCompleted = stepIdx === 5 || isFailed;

    let finalStatus: 'OPEN' | 'WON' | 'LOST' = 'OPEN';
    let finalPayout = 0;
    let finalProfit = -trade.stake;

    if (isCompleted) {
      if (!isFailed && stepIdx === 5) {
        finalStatus = 'WON';
        finalPayout = parseFloat(trade.expectedPayout.toFixed(2));
        finalProfit = parseFloat((finalPayout - trade.stake).toFixed(2));
        playSound('win');
        addJournal('WIN', `Contract #${trade.contractId} won +$${finalProfit.toFixed(2)} (${(finalPayout / trade.stake).toFixed(1)}x)`);
      } else {
        finalStatus = 'LOST';
        playSound('lose');
        addJournal('FAIL', `Tick ${stepIdx} breached (${currentPrice}). Contract #${trade.contractId} lost -$${trade.stake.toFixed(2)}`);
      }

      const historyItem: TradeHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
        symbol: trade.symbol,
        direction: trade.direction,
        stake: trade.stake,
        payout: finalPayout,
        profit: finalProfit,
        isWin: finalStatus === 'WON',
      };
      setTradeHistory(prev => [historyItem, ...prev.slice(0, 49)]);

      if (activeAccount) {
        const currentBal = parseFloat(activeAccount.balance || '0');
        const newBal = (currentBal + finalProfit).toFixed(2);
        updateBalance(activeAccount.account_id, newBal);
      }
    } else {
      playSound('step');
      addJournal('INFO', `Tick ${stepIdx}/5 confirmed (${currentPrice})`);
    }

    setActiveTrade({
      ...trade,
      currentTick: stepIdx,
      steps: newSteps,
      status: finalStatus,
      payout: finalPayout,
      profit: finalProfit,
    });
  }, [quantState, activeAccount, updateBalance, playSound, addJournal]);

  // Execute trade trigger
  const executeTrade = useCallback(async (direction: DirectionType) => {
    if (!ws || !isConnected || isExecuting || activeTrade?.status === 'OPEN') {
      return;
    }

    setErrorMessage(null);
    setIsExecuting(true);

    const stakeVal = parseFloat(stake) || 0.35;
    const currentPrice = quantState?.currentPrice || 0;
    const fallbackExpectedPayout = parseFloat((stakeVal * liveMultiplier).toFixed(2));

    try {
      addJournal('TRIGGER', `Fired ${direction === 'RUNHIGH' ? 'ONLY UP' : 'ONLY DOWN'} on ${selectedAsset} ($${stakeVal.toFixed(2)})`);

      // 1. Request Proposal with underlying_symbol
      const proposalRes = await ws.send({
        proposal: 1,
        amount: stakeVal,
        basis: 'stake',
        currency: activeAccount?.currency || 'USD',
        duration: 5,
        duration_unit: 't',
        underlying_symbol: selectedAsset,
        contract_type: direction,
      }) as { proposal?: { id: string; ask_price: number; payout: number }; error?: { message: string } };

      if (proposalRes.error || !proposalRes.proposal) {
        throw new Error(proposalRes.error?.message || 'Proposal rejected by Deriv');
      }

      const expectedPayout = proposalRes.proposal.payout;

      // 2. Buy Contract
      const buyRes = await ws.send({
        buy: proposalRes.proposal.id,
        price: stakeVal,
      }) as { buy?: { contract_id: number }; error?: { message: string } };

      if (buyRes.error || !buyRes.buy) {
        throw new Error(buyRes.error?.message || 'Contract purchase failed');
      }

      const newTrade: ActiveTradeState = {
        contractId: buyRes.buy.contract_id,
        symbol: selectedAsset,
        direction,
        stake: stakeVal,
        entryPrice: currentPrice,
        expectedPayout,
        currentTick: 0,
        steps: [],
        status: 'OPEN',
        payout: 0,
        profit: 0,
      };

      setActiveTrade(newTrade);
      addJournal('INFO', `Order placed #${buyRes.buy.contract_id}. Trajectory tracking active.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trade execution failed';
      setErrorMessage(msg);
      addJournal('FAIL', `Execution error: ${msg}`);

      if (!activeAccount) {
        setActiveTrade({
          contractId: 'SIM_' + Math.floor(Math.random() * 10000),
          symbol: selectedAsset,
          direction,
          stake: stakeVal,
          entryPrice: currentPrice,
          expectedPayout: fallbackExpectedPayout,
          currentTick: 0,
          steps: [],
          status: 'OPEN',
          payout: 0,
          profit: 0,
        });
      }
    } finally {
      setIsExecuting(false);
    }
  }, [ws, isConnected, isExecuting, activeTrade, stake, selectedAsset, quantState, activeAccount, addJournal, liveMultiplier]);

  // Autonomous Bot Loop
  useEffect(() => {
    if (!isBotArmed || botCooldown || activeTrade?.status === 'OPEN' || !quantState) {
      return;
    }

    if (quantState.primeScore >= botMinPrime && !quantState.isChoppy) {
      let targetDirection: DirectionType = 'RUNHIGH';

      if (botDirectionMode === 'UP') {
        targetDirection = 'RUNHIGH';
      } else if (botDirectionMode === 'DOWN') {
        targetDirection = 'RUNLOW';
      } else {
        if (quantState.velocity.bias === 'DOWN') {
          targetDirection = 'RUNLOW';
        } else {
          targetDirection = 'RUNHIGH';
        }
      }

      addJournal('TRIGGER', `Bot signal hit: Prime ${quantState.primeScore}% >= ${botMinPrime}% threshold`);
      executeTrade(targetDirection);

      setBotCooldown(true);
      setTimeout(() => setBotCooldown(false), 6500);
    }
  }, [isBotArmed, botCooldown, activeTrade, quantState, botMinPrime, botDirectionMode, executeTrade, addJournal]);

  const clearHistoryAndJournal = useCallback(() => {
    setTradeHistory([]);
    setJournal([]);
    addJournal('INFO', 'Statistics and journal cleared.');
  }, [addJournal]);

  return {
    isExecuting,
    activeTrade,
    tradeHistory,
    journal,
    errorMessage,
    executeTrade,
    isBotArmed,
    setIsBotArmed,
    botMinPrime,
    setBotMinPrime,
    botDirectionMode,
    setBotDirectionMode,
    clearActiveTrade: () => setActiveTrade(null),
    clearHistoryAndJournal,
    livePayout: livePayout > 0 ? livePayout : (parseFloat(stake) || 0.35) * liveMultiplier,
    liveMultiplier,
  };
}
