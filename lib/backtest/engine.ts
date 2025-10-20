/**
 * 回测引擎
 * 使用历史数据模拟AI交易策略
 */

import { DeepSeekClient, AIDecisionInput } from '../ai/deepseek';
import { calculateAllIndicators, getLatest } from '../indicators/technical';

export interface BacktestConfig {
  symbol: string;
  initialCapital: number; // 初始资金
  minConfidence: number; // 最小交易信心度
  aiApiKey: string;
  aiModel?: string;
  commission?: number; // 手续费率 (默认0.04%)
  slippage?: number; // 滑点 (默认0.05%)
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  reason: string; // 退出原因
}

export interface BacktestResult {
  config: BacktestConfig;
  startTime: number;
  endTime: number;
  duration: number; // 回测时长(ms)

  // 资金变化
  initialCapital: number;
  finalCapital: number;
  totalReturn: number; // 总收益率
  totalReturnPercent: number;

  // 交易统计
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number; // 盈亏比

  // 风险指标
  maxDrawdown: number; // 最大回撤
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;

  // 详细数据
  trades: Trade[];
  equityCurve: Array<{ time: number; equity: number }>;
  drawdownCurve: Array<{ time: number; drawdown: number }>;
}

export class BacktestEngine {
  private config: BacktestConfig;
  private ai: DeepSeekClient;
  private currentCapital: number;
  private currentPosition: {
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    entryTime: number;
    quantity: number;
    leverage: number;
    stopLoss: number;
    takeProfit: number;
  } | null = null;

  private trades: Trade[] = [];
  private equityCurve: Array<{ time: number; equity: number }> = [];
  private maxEquity: number;

  constructor(config: BacktestConfig) {
    this.config = {
      ...config,
      commission: config.commission || 0.0004, // 0.04%
      slippage: config.slippage || 0.0005, // 0.05%
      aiModel: config.aiModel || 'deepseek-chat',
    };

    this.currentCapital = config.initialCapital;
    this.maxEquity = config.initialCapital;
    this.ai = new DeepSeekClient(config.aiApiKey, this.config.aiModel);
  }

  /**
   * 运行回测
   */
  async run(klines: Kline[]): Promise<BacktestResult> {
    const startTime = Date.now();

    console.log(`🔄 Starting backtest on ${klines.length} candles...`);
    console.log(`📊 Symbol: ${this.config.symbol}`);
    console.log(`💰 Initial Capital: $${this.config.initialCapital}`);
    console.log(`🎯 Min Confidence: ${this.config.minConfidence}%\n`);

    // 初始化权益曲线
    this.equityCurve.push({
      time: klines[0].openTime,
      equity: this.currentCapital,
    });

    // 遍历每根K线
    for (let i = 200; i < klines.length; i++) {
      const currentKline = klines[i];
      const historicalKlines = klines.slice(i - 200, i);

      // 检查止损止盈
      if (this.currentPosition) {
        const exitReason = this.checkStopLossTakeProfit(currentKline);
        if (exitReason) {
          this.closePosition(currentKline, exitReason);
        }
      }

      // 如果没有持仓，尝试开仓
      if (!this.currentPosition) {
        await this.tryOpenPosition(historicalKlines, currentKline, i);
      }

      // 记录权益
      const currentEquity = this.getCurrentEquity(currentKline.close);
      this.equityCurve.push({
        time: currentKline.openTime,
        equity: currentEquity,
      });

      // 更新最大权益
      if (currentEquity > this.maxEquity) {
        this.maxEquity = currentEquity;
      }

      // 进度输出
      if ((i - 200) % 100 === 0) {
        const progress = ((i - 200) / (klines.length - 200)) * 100;
        console.log(
          `Progress: ${progress.toFixed(1)}% | Equity: $${currentEquity.toFixed(2)} | Trades: ${this.trades.length}`
        );
      }
    }

    // 如果还有未平仓位，强制平仓
    if (this.currentPosition) {
      const lastKline = klines[klines.length - 1];
      this.closePosition(lastKline, 'BACKTEST_END');
    }

    const endTime = Date.now();

    console.log(`\n✅ Backtest completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);

    return this.generateResult(startTime, endTime);
  }

  /**
   * 尝试开仓
   */
  private async tryOpenPosition(
    historicalKlines: Kline[],
    currentKline: Kline,
    index: number
  ): Promise<void> {
    // 计算技术指标
    const indicators = calculateAllIndicators(
      historicalKlines.map((k) => ({
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
        timestamp: k.openTime,
      }))
    );

    // 构建AI输入
    const aiInput: AIDecisionInput = {
      symbol: this.config.symbol,
      price: currentKline.close,
      indicators: {
        rsi: getLatest(indicators.rsi),
        macd: getLatest(indicators.macd.macd),
        macdSignal: getLatest(indicators.macd.signal),
        macdHistogram: getLatest(indicators.macd.histogram),
        ema20: getLatest(indicators.ema20),
        ema50: getLatest(indicators.ema50),
        ema200: getLatest(indicators.ema200),
        bollingerUpper: getLatest(indicators.bollingerBands.upper),
        bollingerMiddle: getLatest(indicators.bollingerBands.middle),
        bollingerLower: getLatest(indicators.bollingerBands.lower),
        atr: getLatest(indicators.atr),
      },
      account: {
        balance: this.currentCapital,
        positions: this.currentPosition ? 1 : 0,
        totalValue: this.getCurrentEquity(currentKline.close),
        unrealizedPnL: this.getUnrealizedPnL(currentKline.close),
      },
      performance: this.getCurrentPerformance(),
      metadata: {
        timestamp: currentKline.openTime,
        wakeupCount: index,
      },
    };

    // 获取AI决策
    const decision = await this.ai.makeDecision(aiInput);

    // 检查信心度
    if (decision.confidence < this.config.minConfidence) {
      return;
    }

    // 执行开仓
    if (decision.action === 'BUY' || decision.action === 'SELL') {
      const side = decision.action === 'BUY' ? 'LONG' : 'SHORT';
      const positionSize = decision.positionSize || 20;
      const leverage = decision.leverage || 3;
      const stopLoss = decision.stopLoss || 2;
      const takeProfit = decision.takeProfit || 4;

      // 计算仓位大小
      const margin = (this.currentCapital * positionSize) / 100;
      const notionalValue = margin * leverage;

      // 应用滑点
      const entryPrice =
        side === 'LONG'
          ? currentKline.close * (1 + this.config.slippage!)
          : currentKline.close * (1 - this.config.slippage!);

      const quantity = notionalValue / entryPrice;

      // 计算止损止盈价格
      const stopLossPrice =
        side === 'LONG'
          ? entryPrice * (1 - stopLoss / 100)
          : entryPrice * (1 + stopLoss / 100);

      const takeProfitPrice =
        side === 'LONG'
          ? entryPrice * (1 + takeProfit / 100)
          : entryPrice * (1 - takeProfit / 100);

      // 扣除开仓手续费
      const openCommission = notionalValue * this.config.commission!;
      this.currentCapital -= openCommission;

      this.currentPosition = {
        side,
        entryPrice,
        entryTime: currentKline.openTime,
        quantity,
        leverage,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
      };

      console.log(
        `\n📈 ${side} at $${entryPrice.toFixed(2)} | Leverage: ${leverage}x | Quantity: ${quantity.toFixed(4)}`
      );
    }
  }

  /**
   * 检查止损止盈
   */
  private checkStopLossTakeProfit(kline: Kline): string | null {
    if (!this.currentPosition) return null;

    const { side, stopLoss, takeProfit } = this.currentPosition;

    if (side === 'LONG') {
      if (kline.low <= stopLoss) {
        return 'STOP_LOSS';
      }
      if (kline.high >= takeProfit) {
        return 'TAKE_PROFIT';
      }
    } else {
      // SHORT
      if (kline.high >= stopLoss) {
        return 'STOP_LOSS';
      }
      if (kline.low <= takeProfit) {
        return 'TAKE_PROFIT';
      }
    }

    return null;
  }

  /**
   * 平仓
   */
  private closePosition(kline: Kline, reason: string): void {
    if (!this.currentPosition) return;

    const { side, entryPrice, entryTime, quantity, leverage } = this.currentPosition;

    // 确定退出价格
    let exitPrice: number;
    if (reason === 'STOP_LOSS') {
      exitPrice = this.currentPosition.stopLoss;
    } else if (reason === 'TAKE_PROFIT') {
      exitPrice = this.currentPosition.takeProfit;
    } else {
      // 使用当前价格，应用滑点
      exitPrice =
        side === 'LONG'
          ? kline.close * (1 - this.config.slippage!)
          : kline.close * (1 + this.config.slippage!);
    }

    // 计算盈亏
    const notionalValue = quantity * entryPrice;
    const priceDiff = side === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice;
    const grossPnL = (priceDiff / entryPrice) * notionalValue * leverage;

    // 扣除平仓手续费
    const closeCommission = quantity * exitPrice * this.config.commission!;
    const netPnL = grossPnL - closeCommission;

    // 更新资金
    this.currentCapital += netPnL;

    // 记录交易
    const trade: Trade = {
      entryTime,
      exitTime: kline.openTime,
      side,
      entryPrice,
      exitPrice,
      quantity,
      leverage,
      pnl: netPnL,
      pnlPercent: (netPnL / (notionalValue / leverage)) * 100,
      commission: closeCommission,
      reason,
    };

    this.trades.push(trade);

    console.log(
      `📉 CLOSE ${side} at $${exitPrice.toFixed(2)} | PnL: $${netPnL.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%) | Reason: ${reason}`
    );

    this.currentPosition = null;
  }

  /**
   * 获取当前权益
   */
  private getCurrentEquity(currentPrice: number): number {
    if (!this.currentPosition) {
      return this.currentCapital;
    }

    return this.currentCapital + this.getUnrealizedPnL(currentPrice);
  }

  /**
   * 获取未实现盈亏
   */
  private getUnrealizedPnL(currentPrice: number): number {
    if (!this.currentPosition) return 0;

    const { side, entryPrice, quantity, leverage } = this.currentPosition;
    const priceDiff =
      side === 'LONG' ? currentPrice - entryPrice : entryPrice - currentPrice;
    return (priceDiff / entryPrice) * (quantity * entryPrice) * leverage;
  }

  /**
   * 获取当前性能指标
   */
  private getCurrentPerformance() {
    if (this.trades.length === 0) {
      return {
        totalReturn: 0,
        sharpeRatio: 0,
        winRate: 0,
        totalTrades: 0,
      };
    }

    const wins = this.trades.filter((t) => t.pnl > 0).length;
    const winRate = (wins / this.trades.length) * 100;
    const totalReturn =
      ((this.currentCapital - this.config.initialCapital) /
        this.config.initialCapital) *
      100;

    // 简化的夏普比率计算
    const returns = this.trades.map((t) => t.pnlPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
        returns.length
    );
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    return {
      totalReturn,
      sharpeRatio,
      winRate,
      totalTrades: this.trades.length,
    };
  }

  /**
   * 生成回测结果
   */
  private generateResult(startTime: number, endTime: number): BacktestResult {
    const wins = this.trades.filter((t) => t.pnl > 0);
    const losses = this.trades.filter((t) => t.pnl < 0);

    const totalWin = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

    const totalReturn = this.currentCapital - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;

    // 计算最大回撤
    let maxDrawdown = 0;
    let peak = this.config.initialCapital;
    const drawdownCurve: Array<{ time: number; drawdown: number }> = [];

    this.equityCurve.forEach((point) => {
      if (point.equity > peak) {
        peak = point.equity;
      }
      const drawdown = peak - point.equity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
      drawdownCurve.push({
        time: point.time,
        drawdown: (drawdown / peak) * 100,
      });
    });

    // 计算夏普比率和索提诺比率
    const returns = this.trades.map((t) => t.pnlPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
        (returns.length || 1)
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // 索提诺比率（只考虑下行波动）
    const downReturns = returns.filter((r) => r < 0);
    const downStdDev = Math.sqrt(
      downReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) /
        (downReturns.length || 1)
    );
    const sortinoRatio =
      downStdDev > 0 ? (avgReturn / downStdDev) * Math.sqrt(252) : 0;

    return {
      config: this.config,
      startTime,
      endTime,
      duration: endTime - startTime,

      initialCapital: this.config.initialCapital,
      finalCapital: this.currentCapital,
      totalReturn,
      totalReturnPercent,

      totalTrades: this.trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: this.trades.length > 0 ? (wins.length / this.trades.length) * 100 : 0,
      averageWin: wins.length > 0 ? totalWin / wins.length : 0,
      averageLoss: losses.length > 0 ? totalLoss / losses.length : 0,
      profitFactor: totalLoss > 0 ? totalWin / totalLoss : 0,

      maxDrawdown,
      maxDrawdownPercent: (maxDrawdown / peak) * 100,
      sharpeRatio,
      sortinoRatio,

      trades: this.trades,
      equityCurve: this.equityCurve,
      drawdownCurve,
    };
  }
}
