/**
 * AI交易引擎核心
 * 协调AI决策、指标计算、订单执行
 */

import { BinanceClient } from '../binance/client';
import { DeepSeekClient, AIDecisionInput, AIDecisionOutput } from '../ai/deepseek';
import { calculateAllIndicators, getLatest } from '../indicators/technical';
import {
  withErrorHandling,
  Validator,
  TradingError,
  ErrorType,
} from '../utils/error-handler';
import { rateLimitManager } from '../utils/rate-limiter';

export interface TradingEngineConfig {
  symbol: string;
  modelId: string;
  modelName: string;
  aiProvider: 'deepseek' | 'openai' | 'anthropic';
  apiKey: string;
  binanceApiKey: string;
  binanceApiSecret: string;
  testnet?: boolean;
  minConfidence?: number; // 最小信心度才执行交易
  tradingInterval?: number; // 交易间隔（秒）
}

export interface TradingResult {
  success: boolean;
  action: string;
  decision?: AIDecisionOutput;
  order?: any;
  error?: string;
}

export class TradingEngine {
  private config: TradingEngineConfig;
  private binance: BinanceClient;
  private ai: DeepSeekClient; // TODO: 支持多AI
  private wakeupCount: number = 0;
  private lastTradeTime: number = 0;
  private cooldownMap: Map<string, number> = new Map();

  constructor(config: TradingEngineConfig) {
    this.config = config;

    // 初始化Binance客户端
    this.binance = new BinanceClient({
      apiKey: config.binanceApiKey,
      apiSecret: config.binanceApiSecret,
      testnet: config.testnet,
    });

    // 初始化AI客户端
    this.ai = new DeepSeekClient(config.apiKey);
  }

  /**
   * 主交易循环
   */
  async executeTradingCycle(): Promise<TradingResult> {
    this.wakeupCount++;

    try {
      // 1. 检查冷却期
      if (this.isInCooldown(this.config.symbol)) {
        return {
          success: true,
          action: 'COOLDOWN',
          error: 'Symbol in cooldown period',
        };
      }

      // 2. 检查现有持仓
      const positions = await this.binance.getPositions();
      const hasPosition = positions.some((p) => p.symbol === this.config.symbol);

      if (hasPosition) {
        return {
          success: true,
          action: 'SKIP',
          error: 'Already has position in this symbol',
        };
      }

      // 3. 获取市场数据和指标
      const marketData = await this.gatherMarketData();

      // 4. 获取账户信息
      const accountInfo = await this.binance.getAccountInfo();

      // 5. 构建AI决策输入
      const aiInput: AIDecisionInput = {
        symbol: this.config.symbol,
        price: marketData.currentPrice,
        indicators: marketData.indicators,
        account: {
          balance: accountInfo.balance,
          positions: positions.length,
          totalValue: accountInfo.totalValue,
          unrealizedPnL: accountInfo.unrealizedPnL,
        },
        performance: await this.getPerformanceMetrics(),
        metadata: {
          timestamp: Date.now(),
          wakeupCount: this.wakeupCount,
        },
      };

      // 6. 获取AI决策
      const decision = await this.getAIDecision(aiInput);

      // 7. 验证决策
      Validator.validateAIDecision(decision);

      // 8. 检查信心度
      const minConfidence = this.config.minConfidence || 65;
      if (decision.confidence < minConfidence) {
        return {
          success: true,
          action: 'NO_TRADE',
          decision,
          error: `Confidence too low: ${decision.confidence}% < ${minConfidence}%`,
        };
      }

      // 9. 执行交易
      if (decision.action === 'BUY' || decision.action === 'SELL') {
        const order = await this.executeOrder(decision, accountInfo.balance, marketData.currentPrice);

        // 记录交易成功
        this.lastTradeTime = Date.now();

        return {
          success: true,
          action: decision.action,
          decision,
          order,
        };
      }

      return {
        success: true,
        action: decision.action,
        decision,
      };
    } catch (error: any) {
      return {
        success: false,
        action: 'ERROR',
        error: error.message,
      };
    }
  }

  /**
   * 收集市场数据和计算指标
   */
  private async gatherMarketData() {
    // 获取K线数据
    const klines = await this.binance.getKlines(this.config.symbol, '1h', 200);

    // 转换为指标计算格式
    const klinesData = klines.map((k) => ({
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
      volume: parseFloat(k.volume),
      timestamp: k.openTime,
    }));

    // 计算所有指标
    const indicators = calculateAllIndicators(klinesData);

    // 获取当前价格
    const currentPrice = await this.binance.getCurrentPrice(this.config.symbol);

    // 获取24h行情
    const ticker = await this.binance.get24hrTicker(this.config.symbol);

    return {
      currentPrice,
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
      trend: indicators.trend,
      support: indicators.supportResistance.support,
      resistance: indicators.supportResistance.resistance,
      volume24h: parseFloat(ticker.volume),
      priceChange24h: parseFloat(ticker.priceChangePercent),
    };
  }

  /**
   * 获取AI决策
   */
  private async getAIDecision(input: AIDecisionInput): Promise<AIDecisionOutput> {
    // 检查速率限制
    const aiLimiter = rateLimitManager.getAILimiter(this.config.aiProvider);
    const canProceed = await aiLimiter.checkLimit(this.config.modelId);

    if (!canProceed) {
      throw new TradingError(
        ErrorType.AI_RATE_LIMIT,
        'AI API rate limit exceeded'
      );
    }

    // 调用AI（带错误处理和重试）
    const getDecision = withErrorHandling(
      async () => await this.ai.makeDecision(input),
      { maxRetries: 3, retryDelay: 2000 }
    );

    return await getDecision();
  }

  /**
   * 执行订单
   */
  private async executeOrder(
    decision: AIDecisionOutput,
    balance: number,
    currentPrice: number
  ): Promise<any> {
    const { action, positionSize = 20, leverage = 3, stopLoss = 2, takeProfit = 4 } = decision;

    // 验证风险参数
    Validator.validateRiskParams({ balance, positionSize, leverage });

    // 计算交易金额
    const amount = (balance * positionSize) / 100;
    const notionalValue = amount * leverage;

    // 验证最小名义价值
    if (notionalValue < 20) {
      throw new TradingError(
        ErrorType.TRADING_INVALID_PARAMS,
        `Notional value $${notionalValue.toFixed(2)} is below minimum $20`
      );
    }

    // 计算数量（精度处理）
    const rawQuantity = notionalValue / currentPrice;
    const quantity = this.roundQuantity(this.config.symbol, rawQuantity);

    // 计算止损止盈价格
    const stopLossPrice = action === 'BUY'
      ? currentPrice * (1 - stopLoss / 100)
      : currentPrice * (1 + stopLoss / 100);

    const takeProfitPrice = action === 'BUY'
      ? currentPrice * (1 + takeProfit / 100)
      : currentPrice * (1 - takeProfit / 100);

    // 四舍五入到2位小数
    const roundedStopLoss = Math.round(stopLossPrice * 100) / 100;
    const roundedTakeProfit = Math.round(takeProfitPrice * 100) / 100;

    // 执行开仓
    if (action === 'BUY') {
      return await this.binance.openLong(
        this.config.symbol,
        quantity,
        leverage,
        roundedStopLoss,
        roundedTakeProfit
      );
    } else {
      return await this.binance.openShort(
        this.config.symbol,
        quantity,
        leverage,
        roundedStopLoss,
        roundedTakeProfit
      );
    }
  }

  /**
   * 数量精度处理
   */
  private roundQuantity(symbol: string, quantity: number): number {
    if (symbol.includes('BTC')) {
      return Math.round(quantity * 1000) / 1000; // 0.001
    } else if (symbol.includes('ETH')) {
      return Math.round(quantity * 1000) / 1000; // 0.001
    } else if (symbol.includes('BNB') || symbol.includes('SOL')) {
      return Math.round(quantity * 10) / 10; // 0.1
    }
    return Math.round(quantity * 1000) / 1000; // 默认 0.001
  }

  /**
   * 获取性能指标
   */
  private async getPerformanceMetrics() {
    // TODO: 从数据库查询真实指标
    // 目前返回模拟数据
    return {
      totalReturn: 0,
      sharpeRatio: 0,
      winRate: 0,
      totalTrades: 0,
    };
  }

  /**
   * 检查冷却期
   */
  private isInCooldown(symbol: string): boolean {
    const cooldownUntil = this.cooldownMap.get(symbol);
    if (!cooldownUntil) return false;

    return Date.now() < cooldownUntil;
  }

  /**
   * 设置冷却期
   */
  setCooldown(symbol: string, durationMs: number = 15 * 60 * 1000): void {
    this.cooldownMap.set(symbol, Date.now() + durationMs);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      wakeupCount: this.wakeupCount,
      lastTradeTime: this.lastTradeTime,
      modelId: this.config.modelId,
      modelName: this.config.modelName,
      symbol: this.config.symbol,
    };
  }
}
