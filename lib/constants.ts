export interface AssetInfo {
  id: string;
  name: string;
  shortName: string;
  decimals: number;
}

export const SYNTHETIC_ASSETS: AssetInfo[] = [
  { id: 'R_10', name: 'Volatility 10 Index', shortName: 'Vol 10', decimals: 3 },
  { id: 'R_25', name: 'Volatility 25 Index', shortName: 'Vol 25', decimals: 3 },
  { id: 'R_50', name: 'Volatility 50 Index', shortName: 'Vol 50', decimals: 4 },
  { id: 'R_75', name: 'Volatility 75 Index', shortName: 'Vol 75', decimals: 4 },
  { id: 'R_100', name: 'Volatility 100 Index', shortName: 'Vol 100', decimals: 2 },
  { id: '1HZ10V', name: 'Volatility 10 (1s) Index', shortName: 'Vol 10 (1s)', decimals: 2 },
  { id: '1HZ25V', name: 'Volatility 25 (1s) Index', shortName: 'Vol 25 (1s)', decimals: 2 },
  { id: '1HZ50V', name: 'Volatility 50 (1s) Index', shortName: 'Vol 50 (1s)', decimals: 2 },
  { id: '1HZ75V', name: 'Volatility 75 (1s) Index', shortName: 'Vol 75 (1s)', decimals: 2 },
  { id: '1HZ100V', name: 'Volatility 100 (1s) Index', shortName: 'Vol 100 (1s)', decimals: 2 },
];

export const CONTRACT_DURATION = 5; // Strictly 5 ticks
export const DURATION_UNIT = 't';

export const CONTRACT_TYPES = {
  UP: 'RUNHIGH',
  DOWN: 'RUNLOW'
} as const;

export type DirectionType = 'RUNHIGH' | 'RUNLOW';
