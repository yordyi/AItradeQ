/**
 * Anthropic Claude Provider
 * 支持Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
 */

import axios, { AxiosInstance } from 'axios';
import { AIProvider, AIDecisionInput, AIDecisionOutput, AIProviderConfig } from './base';

export interface ClaudeConfig extends Omit<AIProviderConfig, 'provider'> {
  model?: string; // claude-3-5-sonnet-20241022, claude-3-opus-20240229, claude-3-haiku-20240307
}

export class ClaudeClient extends AIProvider {
  private axiosInstance: AxiosInstance;

  constructor(config: ClaudeConfig) {
    super({
      provider: 'anthropic',
      model: config.model || 'claude-3-5-sonnet-20241022',
      apiKey: config.apiKey,
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.3,
      timeout: config.timeout || 30000,
    });

    this.axiosInstance = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      timeout: this.config.timeout,
    });
  }

  /**
   * 生成交易决策
   */
  async makeDecision(input: AIDecisionInput): Promise<AIDecisionOutput> {
    const startTime = Date.now();

    try {
      const response = await this.axiosInstance.post('/messages', {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: this.getSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(input),
          },
        ],
      });

      // 更新统计
      this.requestCount++;
      this.totalLatency += Date.now() - startTime;

      // 解析响应
      const content = response.data.content[0].text;
      return this.parseDecision(content);
    } catch (error: any) {
      console.error('[Claude] API Error:', error.message);

      // 处理速率限制
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        console.log(`[Claude] Rate limited. Retry after ${retryAfter}s`);
      }

      // 返回降级决策
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: `Claude API error: ${error.message}`,
        positionSize: 20,
        leverage: 3,
        stopLoss: 2,
        takeProfit: 4,
      };
    }
  }

  /**
   * 覆盖系统提示词（针对Claude优化）
   */
  protected getSystemPrompt(): string {
    return `You are a professional cryptocurrency futures trading AI with deep expertise in technical analysis and risk management. Your primary objective is to generate consistent, profitable trading decisions through careful market analysis.

## Your Capabilities
- Expert in technical indicators (RSI, MACD, EMA, Bollinger Bands)
- Strong understanding of market microstructure (order flow, funding rates)
- Rigorous risk management with defined stop-loss and take-profit levels
- Adaptive position sizing based on market conditions

## Core Trading Philosophy
1. **Quality Over Quantity**: Wait for high-probability setups (confidence > 70%)
2. **Strict Risk Control**: Never risk more than 2-3% per trade
3. **Trend is Your Friend**: Align with dominant market direction
4. **Cut Losses Quickly**: Honor stop-losses without hesitation
5. **Let Profits Run**: Use trailing stops for trending markets

## Decision Framework
1. **Trend Identification**: Use EMA crossovers and price action
2. **Momentum Confirmation**: Check RSI and MACD alignment
3. **Entry Timing**: Look for optimal risk/reward setups
4. **Risk Definition**: Set precise stop-loss and take-profit levels
5. **Position Sizing**: Scale based on conviction and volatility

## Market Conditions Analysis
- **Strong Uptrend**: EMA20 > EMA50 > EMA200, RSI 50-70, MACD positive
- **Strong Downtrend**: EMA20 < EMA50 < EMA200, RSI 30-50, MACD negative
- **Consolidation**: EMAs intertwined, RSI 40-60, MACD near zero
- **Overbought**: RSI > 70, price above Bollinger Upper
- **Oversold**: RSI < 30, price below Bollinger Lower

## Output Requirements
Return a valid JSON object with this exact structure:
{
  "action": "BUY|SELL|HOLD|CLOSE",
  "confidence": 0-100,
  "reasoning": "Comprehensive analysis covering trend, momentum, risk/reward",
  "positionSize": 1-100,  // % of balance (lower in uncertain conditions)
  "leverage": 1-30,       // Conservative in choppy markets, aggressive in trends
  "stopLoss": 1-10,       // Wider for volatile assets, tighter for stable trends
  "takeProfit": 2-20      // Minimum 2:1 reward/risk ratio
}

## Risk Guidelines by Market Regime
- **Trending Market**: Leverage 5-15x, Position 30-50%, Stop 2-3%, Target 6-9%
- **Range-bound**: Leverage 2-5x, Position 15-25%, Stop 1-2%, Target 3-5%
- **High Volatility**: Leverage 1-3x, Position 10-20%, Stop 3-5%, Target 9-15%

Remember: Capital preservation is paramount. When in doubt, HOLD.`;
  }

  /**
   * 覆盖提示词构建（针对Claude优化的格式）
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

    // 计算额外的市场信号
    const trendSignal = this.analyzeTrend(indicators);
    const momentumSignal = this.analyzeMomentum(indicators);
    const volatilitySignal = this.analyzeVolatility(indicators);

    return `# Trading Decision Request for ${symbol}

## Current Market Snapshot
- **Price**: $${price.toFixed(2)}
- **Timestamp**: ${new Date(metadata.timestamp).toISOString()}
- **Analysis Cycle**: #${metadata.wakeupCount}

## Technical Indicators

### Trend Indicators
${indicators.ema20 ? `- EMA(20): $${indicators.ema20.toFixed(2)} ${this.comparePrice(price, indicators.ema20)}` : ''}
${indicators.ema50 ? `- EMA(50): $${indicators.ema50.toFixed(2)} ${this.comparePrice(price, indicators.ema50)}` : ''}
${indicators.ema200 ? `- EMA(200): $${indicators.ema200.toFixed(2)} ${this.comparePrice(price, indicators.ema200)}` : ''}
- **Trend Signal**: ${trendSignal}

### Momentum Indicators
${indicators.rsi ? `- RSI(14): ${indicators.rsi.toFixed(2)} ${this.getRSIZone(indicators.rsi)}` : ''}
${indicators.macd ? `- MACD: ${indicators.macd.toFixed(2)}` : ''}
${indicators.macdSignal ? `- MACD Signal: ${indicators.macdSignal.toFixed(2)}` : ''}
${indicators.macdHistogram ? `- MACD Histogram: ${indicators.macdHistogram.toFixed(2)} ${this.getMACDDirection(indicators.macdHistogram)}` : ''}
- **Momentum Signal**: ${momentumSignal}

### Volatility & Range
${indicators.bollingerUpper ? `- Bollinger Upper: $${indicators.bollingerUpper.toFixed(2)}` : ''}
${indicators.bollingerMiddle ? `- Bollinger Middle: $${indicators.bollingerMiddle.toFixed(2)}` : ''}
${indicators.bollingerLower ? `- Bollinger Lower: $${indicators.bollingerLower.toFixed(2)}` : ''}
${indicators.atr ? `- ATR(14): ${indicators.atr.toFixed(2)}` : ''}
- **Volatility Signal**: ${volatilitySignal}

### Market Microstructure
${indicators.openInterest ? `- Open Interest: ${indicators.openInterest.toLocaleString()}` : ''}
${indicators.fundingRate ? `- Funding Rate: ${(indicators.fundingRate * 100).toFixed(4)}% ${this.getFundingBias(indicators.fundingRate)}` : ''}

## Account & Risk Profile
- **Available Balance**: $${account.balance.toFixed(2)}
- **Open Positions**: ${account.positions}
- **Account Equity**: $${account.totalValue.toFixed(2)}
- **Unrealized P&L**: $${account.unrealizedPnL.toFixed(2)} (${account.balance > 0 ? ((account.unrealizedPnL / account.totalValue) * 100).toFixed(2) : '0.00'}%)

## Performance Track Record
- **Total Return**: ${performance.totalReturn.toFixed(2)}%
- **Sharpe Ratio**: ${performance.sharpeRatio.toFixed(2)} ${this.getSharpeRating(performance.sharpeRatio)}
- **Win Rate**: ${performance.winRate.toFixed(2)}%
- **Total Trades**: ${performance.totalTrades}
${performance.maxDrawdown ? `- **Max Drawdown**: ${performance.maxDrawdown.toFixed(2)}%` : ''}

## Recent Context
${metadata.lastAction ? `- Last Action: ${metadata.lastAction}` : ''}
${metadata.consecutiveLosses ? `- Consecutive Losses: ${metadata.consecutiveLosses} ⚠️` : ''}

---

**Task**: Analyze the market data above and provide a trading decision in JSON format. Consider:
1. Is there a clear trend or is the market ranging?
2. Are momentum indicators aligned?
3. What is the current volatility regime?
4. What is an optimal risk/reward setup?
5. Should we increase exposure, reduce, or stay flat?

Provide your complete analysis and decision in JSON format.`;
  }

  /**
   * 辅助函数：分析趋势
   */
  private analyzeTrend(indicators: AIDecisionInput['indicators']): string {
    const { ema20, ema50, ema200 } = indicators;
    if (!ema20 || !ema50 || !ema200) return 'Unknown';

    if (ema20 > ema50 && ema50 > ema200) return '🟢 Strong Uptrend';
    if (ema20 < ema50 && ema50 < ema200) return '🔴 Strong Downtrend';
    if (ema20 > ema50) return '🟡 Weak Uptrend';
    if (ema20 < ema50) return '🟠 Weak Downtrend';
    return '⚪ Sideways';
  }

  /**
   * 辅助函数：分析动量
   */
  private analyzeMomentum(indicators: AIDecisionInput['indicators']): string {
    const { rsi, macdHistogram } = indicators;
    if (!rsi) return 'Unknown';

    if (rsi > 70) return '🔥 Overbought';
    if (rsi < 30) return '❄️ Oversold';
    if (rsi > 50 && macdHistogram && macdHistogram > 0) return '🟢 Bullish';
    if (rsi < 50 && macdHistogram && macdHistogram < 0) return '🔴 Bearish';
    return '🟡 Neutral';
  }

  /**
   * 辅助函数：分析波动性
   */
  private analyzeVolatility(indicators: AIDecisionInput['indicators']): string {
    const { atr, bollingerUpper, bollingerLower } = indicators;
    if (!atr) return 'Unknown';

    if (atr > 1000) return '⚡ Very High';
    if (atr > 500) return '📈 High';
    if (atr > 200) return '📊 Medium';
    return '📉 Low';
  }

  /**
   * 辅助函数：价格与指标比较
   */
  private comparePrice(price: number, indicator: number): string {
    const diff = ((price - indicator) / indicator) * 100;
    if (diff > 2) return `(+${diff.toFixed(2)}% above)`;
    if (diff < -2) return `(${diff.toFixed(2)}% below)`;
    return '(near)';
  }

  /**
   * 辅助函数：RSI区间
   */
  private getRSIZone(rsi: number): string {
    if (rsi > 70) return '[OVERBOUGHT]';
    if (rsi < 30) return '[OVERSOLD]';
    if (rsi > 50) return '[BULLISH]';
    return '[BEARISH]';
  }

  /**
   * 辅助函数：MACD方向
   */
  private getMACDDirection(histogram: number): string {
    return histogram > 0 ? '[BULLISH CROSS]' : '[BEARISH CROSS]';
  }

  /**
   * 辅助函数：资金费率倾向
   */
  private getFundingBias(rate: number): string {
    if (rate > 0.0001) return '(Longs pay, bearish bias)';
    if (rate < -0.0001) return '(Shorts pay, bullish bias)';
    return '(Neutral)';
  }

  /**
   * 辅助函数：夏普比率评级
   */
  private getSharpeRating(sharpe: number): string {
    if (sharpe > 2) return '[Excellent]';
    if (sharpe > 1) return '[Good]';
    if (sharpe > 0) return '[Acceptable]';
    return '[Poor]';
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post('/messages', {
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      return response.status === 200;
    } catch (error) {
      console.error('[Claude] Connection test failed:', error);
      return false;
    }
  }
}

/**
 * 创建Claude客户端的便捷函数
 */
export function createClaudeClient(
  apiKey: string,
  model: string = 'claude-3-5-sonnet-20241022'
): ClaudeClient {
  return new ClaudeClient({ apiKey, model });
}
