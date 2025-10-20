/**
 * AI Provider 抽象基类
 * 统一不同AI提供商的接口
 */

export interface AIDecisionInput {
  symbol: string;
  price: number;
  indicators: {
    rsi?: number;
    macd?: number;
    macdSignal?: number;
    macdHistogram?: number;
    ema20?: number;
    ema50?: number;
    ema200?: number;
    bollingerUpper?: number;
    bollingerMiddle?: number;
    bollingerLower?: number;
    atr?: number;
    openInterest?: number;
    fundingRate?: number;
  };
  account: {
    balance: number;
    positions: number;
    totalValue: number;
    unrealizedPnL: number;
  };
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
    maxDrawdown?: number;
  };
  metadata: {
    timestamp: number;
    wakeupCount: number;
    lastAction?: string;
    consecutiveLosses?: number;
  };
}

export interface AIDecisionOutput {
  action: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE';
  confidence: number; // 0-100
  reasoning: string;
  positionSize?: number; // % of balance (1-100)
  leverage?: number; // 1-30
  stopLoss?: number; // % from entry (1-10)
  takeProfit?: number; // % from entry (2-20)
}

export interface AIProviderConfig {
  provider: 'deepseek' | 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

/**
 * AI Provider抽象类
 */
export abstract class AIProvider {
  protected config: AIProviderConfig;
  protected requestCount: number = 0;
  protected totalLatency: number = 0;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * 生成AI决策（子类必须实现）
   */
  abstract makeDecision(input: AIDecisionInput): Promise<AIDecisionOutput>;

  /**
   * 获取系统提示词（子类可覆盖）
   */
  protected getSystemPrompt(): string {
    return `你是一位专业的加密货币合约交易AI。你的目标是通过分析市场数据做出高质量的交易决策，实现长期稳定盈利。

## 核心原则
1. **质量优先**: 只在高信心度(>70%)时交易
2. **风险控制**: 严格使用止损和止盈
3. **趋势跟随**: 顺势而为，不逆势操作
4. **资金管理**: 合理控制仓位和杠杆

## 决策流程
1. 分析技术指标识别趋势和动量
2. 评估风险/回报比
3. 确定入场点和止损/止盈位
4. 计算合适的仓位和杠杆

## 输出格式
你必须返回JSON格式的决策：
{
  "action": "BUY|SELL|HOLD|CLOSE",
  "confidence": 0-100,
  "reasoning": "详细的决策理由",
  "positionSize": 1-100,  // 使用账户余额的百分比
  "leverage": 1-30,       // 杠杆倍数
  "stopLoss": 1-10,       // 止损百分比
  "takeProfit": 2-20      // 止盈百分比
}`;
  }

  /**
   * 构建用户提示词（子类可覆盖）
   */
  protected buildPrompt(input: AIDecisionInput): string {
    const {
      symbol,
      price,
      indicators,
      account,
      performance,
      metadata,
    } = input;

    return `## 市场数据 (${symbol})
当前价格: $${price.toFixed(2)}
唤醒次数: ${metadata.wakeupCount}

## 技术指标
${indicators.rsi ? `RSI(14): ${indicators.rsi.toFixed(2)}` : ''}
${indicators.macd ? `MACD: ${indicators.macd.toFixed(2)}` : ''}
${indicators.macdSignal ? `MACD Signal: ${indicators.macdSignal.toFixed(2)}` : ''}
${indicators.macdHistogram ? `MACD Histogram: ${indicators.macdHistogram.toFixed(2)}` : ''}
${indicators.ema20 ? `EMA20: $${indicators.ema20.toFixed(2)}` : ''}
${indicators.ema50 ? `EMA50: $${indicators.ema50.toFixed(2)}` : ''}
${indicators.ema200 ? `EMA200: $${indicators.ema200.toFixed(2)}` : ''}
${indicators.bollingerUpper ? `布林带上轨: $${indicators.bollingerUpper.toFixed(2)}` : ''}
${indicators.bollingerMiddle ? `布林带中轨: $${indicators.bollingerMiddle.toFixed(2)}` : ''}
${indicators.bollingerLower ? `布林带下轨: $${indicators.bollingerLower.toFixed(2)}` : ''}
${indicators.atr ? `ATR: ${indicators.atr.toFixed(2)}` : ''}
${indicators.openInterest ? `持仓量: ${indicators.openInterest}` : ''}
${indicators.fundingRate ? `资金费率: ${(indicators.fundingRate * 100).toFixed(4)}%` : ''}

## 账户状态
可用余额: $${account.balance.toFixed(2)}
持仓数量: ${account.positions}
总价值: $${account.totalValue.toFixed(2)}
未实现盈亏: $${account.unrealizedPnL.toFixed(2)}

## 历史表现
总收益率: ${performance.totalReturn.toFixed(2)}%
夏普比率: ${performance.sharpeRatio.toFixed(2)}
胜率: ${performance.winRate.toFixed(2)}%
总交易次数: ${performance.totalTrades}
${performance.maxDrawdown ? `最大回撤: ${performance.maxDrawdown.toFixed(2)}%` : ''}

## 其他信息
${metadata.lastAction ? `上次操作: ${metadata.lastAction}` : ''}
${metadata.consecutiveLosses ? `连续亏损: ${metadata.consecutiveLosses}次` : ''}
时间戳: ${new Date(metadata.timestamp).toISOString()}

请基于以上数据做出交易决策。`;
  }

  /**
   * 解析AI响应（子类可覆盖）
   */
  protected parseDecision(content: string): AIDecisionOutput {
    try {
      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const decision = JSON.parse(jsonMatch[0]);

      // 验证和标准化
      return {
        action: this.normalizeAction(decision.action),
        confidence: Math.max(0, Math.min(100, decision.confidence || 0)),
        reasoning: decision.reasoning || 'No reasoning provided',
        positionSize: decision.positionSize
          ? Math.max(1, Math.min(100, decision.positionSize))
          : 20,
        leverage: decision.leverage
          ? Math.max(1, Math.min(30, decision.leverage))
          : 3,
        stopLoss: decision.stopLoss
          ? Math.max(1, Math.min(10, decision.stopLoss))
          : 2,
        takeProfit: decision.takeProfit
          ? Math.max(2, Math.min(20, decision.takeProfit))
          : 4,
      };
    } catch (error) {
      // 降级方案：返回HOLD
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        positionSize: 20,
        leverage: 3,
        stopLoss: 2,
        takeProfit: 4,
      };
    }
  }

  /**
   * 标准化动作字符串
   */
  private normalizeAction(action: string): 'BUY' | 'SELL' | 'HOLD' | 'CLOSE' {
    const normalized = action.toUpperCase().trim();

    if (['BUY', 'LONG', 'OPEN_LONG'].includes(normalized)) return 'BUY';
    if (['SELL', 'SHORT', 'OPEN_SHORT'].includes(normalized)) return 'SELL';
    if (['CLOSE', 'EXIT', 'CLOSE_POSITION'].includes(normalized))
      return 'CLOSE';

    return 'HOLD';
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      provider: this.config.provider,
      model: this.config.model,
      requestCount: this.requestCount,
      averageLatency:
        this.requestCount > 0 ? this.totalLatency / this.requestCount : 0,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.requestCount = 0;
    this.totalLatency = 0;
  }
}
