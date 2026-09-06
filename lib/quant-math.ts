/**
 * Real-time Quantitative & Statistical Algorithms for 5-Tick High/Low Sprints
 */

export interface CoilingMetrics {
  status: 'ULTRA TIGHT' | 'COILING' | 'EXPANDING';
  variance: number;
  score: number; // 0 to 100
}

export interface VelocityMetrics {
  velocity: number;
  acceleration: number;
  bias: 'UP' | 'DOWN' | 'NEUTRAL';
  normalizedStrength: number;
}

export interface Tick1000Analysis {
  currentPrice: number;
  prevPrice: number;
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
}

/**
 * Calculates Poisson Hazard Rate H(t) = 1 - exp(-lambda * (G_cur / avg_gap))
 * Measures whether the index is overdue for a 5-tick run.
 */
export function calculateHazardScore(currentGap: number, averageGap: number): number {
  if (averageGap <= 0) return 10;
  const ratio = currentGap / averageGap;
  const hazard = (1 - Math.exp(-0.55 * ratio)) * 100;
  return Math.min(99, Math.max(5, Math.round(hazard)));
}

/**
 * Calculates rolling price variance over the last 10 ticks.
 * Low variance indicates tight coiling/compression before an impulsive breakout.
 */
export function calculateCoiling(prices: number[]): CoilingMetrics {
  if (!prices || prices.length < 5) {
    return { status: 'COILING', variance: 0.01, score: 50 };
  }

  const slice = prices.slice(-10);
  const n = slice.length;
  const mean = slice.reduce((a, b) => a + b, 0) / n;
  const variance = slice.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / n;

  if (variance < 0.005) {
    return { status: 'ULTRA TIGHT', variance, score: 95 };
  } else if (variance < 0.02) {
    return { status: 'COILING', variance, score: 70 };
  } else {
    return { status: 'EXPANDING', variance, score: 35 };
  }
}

/**
 * Calculates micro-velocity (v = P_t - P_{t-1}) and acceleration (a = v_t - v_{t-1})
 */
export function calculateVelocityAndAccel(prices: number[]): VelocityMetrics {
  if (!prices || prices.length < 3) {
    return { velocity: 0, acceleration: 0, bias: 'NEUTRAL', normalizedStrength: 0 };
  }

  const p0 = prices[prices.length - 1];
  const p1 = prices[prices.length - 2];
  const p2 = prices[prices.length - 3];

  const vCurrent = p0 - p1;
  const vPrev = p1 - p2;
  const accel = vCurrent - vPrev;

  let bias: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  if (vCurrent > 0 && accel >= 0) bias = 'UP';
  else if (vCurrent < 0 && accel <= 0) bias = 'DOWN';
  else if (vCurrent > 0) bias = 'UP';
  else if (vCurrent < 0) bias = 'DOWN';

  const absV = Math.abs(vCurrent);
  const normalizedStrength = Math.min(100, Math.round(absV * 500));

  return {
    velocity: vCurrent,
    acceleration: accel,
    bias,
    normalizedStrength
  };
}

/**
 * Detects whether ticks are alternating back and forth (whipsaw / chop).
 */
export function isChoppyRegime(prices: number[]): boolean {
  if (!prices || prices.length < 6) return false;
  const last6 = prices.slice(-6);
  let alternations = 0;
  for (let i = 2; i < last6.length; i++) {
    const d1 = last6[i] - last6[i - 1];
    const d2 = last6[i - 1] - last6[i - 2];
    if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
      alternations++;
    }
  }
  return alternations >= 3;
}

/**
 * Ingests and processes official Deriv 1000 ticks history on launch.
 * Extracts ground-truth gaps, baseline run occurrences, and last-digit spectrum.
 */
export function analyze1000Ticks(prices: number[], decimals: number): Tick1000Analysis | null {
  if (!prices || prices.length < 6) return null;

  const runGaps: number[] = [];
  let runCount = 0;
  let lastRunDir: 'UP' | 'DOWN' | null = null;
  let gapSinceLastRun = 0;

  const mult = Math.pow(10, decimals);
  const lastDigits = prices.map(p => {
    const rounded = Math.round(p * mult);
    return Math.abs(rounded % 10);
  });

  for (let i = 5; i < prices.length; i++) {
    const isUp = prices[i] > prices[i - 1] && prices[i - 1] > prices[i - 2] && prices[i - 2] > prices[i - 3] && prices[i - 3] > prices[i - 4] && prices[i - 4] > prices[i - 5];
    const isDown = prices[i] < prices[i - 1] && prices[i - 1] < prices[i - 2] && prices[i - 2] < prices[i - 3] && prices[i - 3] < prices[i - 4] && prices[i - 4] < prices[i - 5];

    if (isUp || isDown) {
      runCount++;
      lastRunDir = isUp ? 'UP' : 'DOWN';
      runGaps.push(gapSinceLastRun);
      gapSinceLastRun = 0;
    } else {
      gapSinceLastRun++;
    }
  }

  const currentGap = gapSinceLastRun;
  const avgGap = runGaps.length > 0
    ? Math.max(1, Math.round(runGaps.reduce((a, b) => a + b, 0) / runGaps.length))
    : 32;

  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2];
  const hazardScore = calculateHazardScore(currentGap, avgGap);
  const coiling = calculateCoiling(prices.slice(-10));
  const velocity = calculateVelocityAndAccel(prices.slice(-10));
  const isChoppy = isChoppyRegime(prices.slice(-10));

  let prime = (hazardScore * 0.5) + (coiling.score * 0.35);
  if (isChoppy) prime -= 25;
  if (velocity.normalizedStrength > 40) prime += 15;
  const primeScore = Math.min(99, Math.max(5, Math.round(prime)));

  return {
    currentPrice,
    prevPrice,
    history: prices.slice(-100),
    lastDigits: lastDigits.slice(-100),
    currentGap,
    avgGap,
    hazardScore,
    coiling,
    velocity,
    isChoppy,
    primeScore,
    lastRunDirection: lastRunDir,
    fiveTickRunCount: runCount,
  };
}
