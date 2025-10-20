/**
 * 技术指标计算库
 * 包括: EMA, SMA, RSI, MACD, 布林带, ATR
 */

export interface Kline {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

/**
 * 简单移动平均线 (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }

  return result;
}

/**
 * 指数移动平均线 (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // 第一个EMA使用SMA
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }

  return result;
}

/**
 * 相对强弱指标 (RSI)
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const changes: number[] = [];

  // 计算价格变化
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }

    const recentChanges = changes.slice(i - period, i);
    const gains = recentChanges.filter((c) => c > 0);
    const losses = recentChanges.filter((c) => c < 0).map((c) => Math.abs(c));

    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      result.push(rsi);
    }
  }

  return result;
}

/**
 * MACD (移动平均收敛散度)
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // MACD线 = 快线 - 慢线
  const macd = fastEMA.map((fast, i) => {
    if (isNaN(fast) || isNaN(slowEMA[i])) return NaN;
    return fast - slowEMA[i];
  });

  // 信号线 = MACD的EMA
  const validMacd = macd.filter((v) => !isNaN(v));
  const signalEMA = calculateEMA(validMacd, signalPeriod);

  // 填充信号线
  const signal: number[] = [];
  let signalIndex = 0;
  for (let i = 0; i < macd.length; i++) {
    if (isNaN(macd[i])) {
      signal.push(NaN);
    } else {
      signal.push(signalEMA[signalIndex] || NaN);
      signalIndex++;
    }
  }

  // 柱状图 = MACD - 信号线
  const histogram = macd.map((m, i) => {
    if (isNaN(m) || isNaN(signal[i])) return NaN;
    return m - signal[i];
  });

  return { macd, signal, histogram };
}

/**
 * 布林带 (Bollinger Bands)
 */
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }

    const slice = data.slice(i - period + 1, i + 1);
    const mean = middle[i];

    // 计算标准差
    const squaredDiffs = slice.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(variance);

    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }

  return { upper, middle, lower };
}

/**
 * ATR (平均真实波幅)
 */
export function calculateATR(klines: Kline[], period: number = 14): number[] {
  const trueRanges: number[] = [];

  for (let i = 0; i < klines.length; i++) {
    if (i === 0) {
      trueRanges.push(klines[i].high - klines[i].low);
      continue;
    }

    const high = klines[i].high;
    const low = klines[i].low;
    const prevClose = klines[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    trueRanges.push(tr);
  }

  return calculateEMA(trueRanges, period);
}

/**
 * 支撑位和阻力位识别
 */
export function findSupportResistance(
  klines: Kline[],
  lookback: number = 20
): {
  support: number[];
  resistance: number[];
} {
  const support: number[] = [];
  const resistance: number[] = [];

  for (let i = lookback; i < klines.length - lookback; i++) {
    const slice = klines.slice(i - lookback, i + lookback + 1);
    const current = klines[i];

    // 支撑位：局部最低点
    const isSupport = slice.every((k) => current.low <= k.low);
    if (isSupport) {
      support.push(current.low);
    }

    // 阻力位：局部最高点
    const isResistance = slice.every((k) => current.high >= k.high);
    if (isResistance) {
      resistance.push(current.high);
    }
  }

  return { support, resistance };
}

/**
 * 趋势识别
 */
export function identifyTrend(
  ema20: number[],
  ema50: number[],
  ema200: number[]
): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
  const last20 = ema20[ema20.length - 1];
  const last50 = ema50[ema50.length - 1];
  const last200 = ema200[ema200.length - 1];

  if (isNaN(last20) || isNaN(last50) || isNaN(last200)) {
    return 'SIDEWAYS';
  }

  // 上升趋势：短期 > 中期 > 长期
  if (last20 > last50 && last50 > last200) {
    return 'UPTREND';
  }

  // 下降趋势：短期 < 中期 < 长期
  if (last20 < last50 && last50 < last200) {
    return 'DOWNTREND';
  }

  return 'SIDEWAYS';
}

/**
 * 批量计算所有指标
 */
export function calculateAllIndicators(klines: Kline[]): {
  closes: number[];
  ema20: number[];
  ema50: number[];
  ema200: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  atr: number[];
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  supportResistance: {
    support: number[];
    resistance: number[];
  };
} {
  const closes = klines.map((k) => k.close);

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bollingerBands = calculateBollingerBands(closes);
  const atr = calculateATR(klines);
  const trend = identifyTrend(ema20, ema50, ema200);
  const supportResistance = findSupportResistance(klines);

  return {
    closes,
    ema20,
    ema50,
    ema200,
    rsi,
    macd,
    bollingerBands,
    atr,
    trend,
    supportResistance,
  };
}

/**
 * 获取最新值（非NaN）
 */
export function getLatest(arr: number[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!isNaN(arr[i])) {
      return arr[i];
    }
  }
  return null;
}
