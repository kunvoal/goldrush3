'use client';

import React, { useState } from 'react';
import { useDerivWSContext } from '@/components/deriv-ws-provider';
import { useMultiScanner } from '@/hooks/use-multi-scanner';
import { useFiveTickTrade } from '@/hooks/use-five-tick-trade';
import { Header } from '@/components/header';
import { TrajectoryRadar } from '@/components/trajectory-radar';
import { QuantHud } from '@/components/quant-hud';
import { ExecutionDeck } from '@/components/execution-deck';
import { BotPanel } from '@/components/bot-panel';

export default function Goldrush3Page() {
  const { ws, isConnected, auth } = useDerivWSContext();
  const [selectedAsset, setSelectedAsset] = useState<string>('R_10');
  const [stake, setStake] = useState<string>('0.35');

  // Background Multi-Asset Statistical Scanner (1000 Historical Ticks)
  const { quantData, rankedAssets } = useMultiScanner(ws, isConnected);
  const activeQuantState = quantData[selectedAsset];

  // Execution & Bot Engine
  const {
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
    clearActiveTrade,
    clearHistoryAndJournal,
    livePayout,
    liveMultiplier,
  } = useFiveTickTrade({
    ws,
    isConnected,
    selectedAsset,
    stake,
    activeAccount: auth.activeAccount,
    updateBalance: auth.updateBalance,
    quantState: activeQuantState,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100 select-none overflow-x-hidden">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Primary Quant Radar & Signals (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Real-time 5-Tick Trajectory Radar with Intelligent Hover Dropdown */}
          <TrajectoryRadar
            quantState={activeQuantState}
            rankedAssets={rankedAssets}
            selectedAsset={selectedAsset}
            onSelectAsset={setSelectedAsset}
            activeTrade={activeTrade}
            onClearTrade={clearActiveTrade}
          />

          {/* Quant HUD Gauges */}
          <QuantHud quantState={activeQuantState} />

          {/* BotUI Transactions & Journal Panel (Adopted from goldrush2) */}
          <BotPanel
            tradeHistory={tradeHistory}
            journal={journal}
            onClear={clearHistoryAndJournal}
          />
        </div>

        {/* Execution Deck (5 cols) */}
        <div className="lg:col-span-5">
          <ExecutionDeck
            stake={stake}
            onStakeChange={setStake}
            onExecute={executeTrade}
            isExecuting={isExecuting}
            isTradeOpen={activeTrade?.status === 'OPEN'}
            isBotArmed={isBotArmed}
            onToggleBot={() => setIsBotArmed(!isBotArmed)}
            botMinPrime={botMinPrime}
            onBotMinPrimeChange={setBotMinPrime}
            botDirectionMode={botDirectionMode}
            onBotDirectionChange={setBotDirectionMode}
            livePayout={livePayout}
            liveMultiplier={liveMultiplier}
            errorMessage={errorMessage}
          />
        </div>
      </main>
    </div>
  );
}
