/**
 * OpenAI GPT Provider
 * 支持GPT-4, GPT-4 Turbo, GPT-3.5
 */

import axios, { AxiosInstance } from 'axios';
import { AIProvider, AIDecisionInput, AIDecisionOutput, AIProviderConfig } from './base';
import { withErrorHandling } from '../utils/error-handler';

export interface OpenAIConfig extends Omit<AIProviderConfig, 'provider'> {
  model?: string; // gpt-4, gpt-4-turbo-preview, gpt-3.5-turbo
  organizationId?: string;
}

export class OpenAIClient extends AIProvider {
  private axiosInstance: AxiosInstance;

  constructor(config: OpenAIConfig) {
    super({
      provider: 'openai',
      model: config.model || 'gpt-4-turbo-preview',
      apiKey: config.apiKey,
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.3,
      timeout: config.timeout || 30000,
    });

    this.axiosInstance = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.organizationId && {
          'OpenAI-Organization': config.organizationId,
        }),
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
      const response = await this.axiosInstance.post('/chat/completions', {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: this.buildPrompt(input),
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }, // 强制JSON输出
      });

      // 更新统计
      this.requestCount++;
      this.totalLatency += Date.now() - startTime;

      // 解析响应
      const content = response.data.choices[0].message.content;
      return this.parseDecision(content);
    } catch (error: any) {
      console.error('[OpenAI] API Error:', error.message);

      // 处理速率限制
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        console.log(`[OpenAI] Rate limited. Retry after ${retryAfter}s`);
      }

      // 返回降级决策
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: `OpenAI API error: ${error.message}`,
        positionSize: 20,
        leverage: 3,
        stopLoss: 2,
        takeProfit: 4,
      };
    }
  }

  /**
   * 覆盖系统提示词（针对OpenAI优化）
   */
  protected getSystemPrompt(): string {
    return `You are a professional cryptocurrency futures trading AI. Your goal is to analyze market data and make high-quality trading decisions for long-term stable profits.

## Core Principles
1. **Quality First**: Only trade when confidence > 70%
2. **Risk Control**: Strictly use stop-loss and take-profit
3. **Trend Following**: Trade with the trend, not against it
4. **Money Management**: Reasonable position sizing and leverage

## Decision Process
1. Analyze technical indicators to identify trends and momentum
2. Evaluate risk/reward ratio
3. Determine entry points and stop-loss/take-profit levels
4. Calculate appropriate position size and leverage

## Output Format
You must return a JSON object with this exact structure:
{
  "action": "BUY|SELL|HOLD|CLOSE",
  "confidence": 0-100,
  "reasoning": "Detailed reasoning for the decision",
  "positionSize": 1-100,  // Percentage of account balance
  "leverage": 1-30,       // Leverage multiplier
  "stopLoss": 1-10,       // Stop loss percentage from entry
  "takeProfit": 2-20      // Take profit percentage from entry
}

## Risk Guidelines
- Use lower leverage (2-5x) for volatile markets
- Use higher leverage (5-15x) for strong trends
- Never exceed 50% position size for a single trade
- Always set stop-loss at 1-3% for high leverage
- Target take-profit at 2-3x stop-loss distance`;
  }

  /**
   * 覆盖提示词构建（英文版本）
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

    return `## Market Data (${symbol})
Current Price: $${price.toFixed(2)}
Wakeup Count: ${metadata.wakeupCount}

## Technical Indicators
${indicators.rsi ? `RSI(14): ${indicators.rsi.toFixed(2)}` : ''}
${indicators.macd ? `MACD: ${indicators.macd.toFixed(2)}` : ''}
${indicators.macdSignal ? `MACD Signal: ${indicators.macdSignal.toFixed(2)}` : ''}
${indicators.macdHistogram ? `MACD Histogram: ${indicators.macdHistogram.toFixed(2)}` : ''}
${indicators.ema20 ? `EMA20: $${indicators.ema20.toFixed(2)}` : ''}
${indicators.ema50 ? `EMA50: $${indicators.ema50.toFixed(2)}` : ''}
${indicators.ema200 ? `EMA200: $${indicators.ema200.toFixed(2)}` : ''}
${indicators.bollingerUpper ? `Bollinger Upper: $${indicators.bollingerUpper.toFixed(2)}` : ''}
${indicators.bollingerMiddle ? `Bollinger Middle: $${indicators.bollingerMiddle.toFixed(2)}` : ''}
${indicators.bollingerLower ? `Bollinger Lower: $${indicators.bollingerLower.toFixed(2)}` : ''}
${indicators.atr ? `ATR: ${indicators.atr.toFixed(2)}` : ''}
${indicators.openInterest ? `Open Interest: ${indicators.openInterest}` : ''}
${indicators.fundingRate ? `Funding Rate: ${(indicators.fundingRate * 100).toFixed(4)}%` : ''}

## Account Status
Available Balance: $${account.balance.toFixed(2)}
Open Positions: ${account.positions}
Total Value: $${account.totalValue.toFixed(2)}
Unrealized PnL: $${account.unrealizedPnL.toFixed(2)}

## Historical Performance
Total Return: ${performance.totalReturn.toFixed(2)}%
Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
Win Rate: ${performance.winRate.toFixed(2)}%
Total Trades: ${performance.totalTrades}
${performance.maxDrawdown ? `Max Drawdown: ${performance.maxDrawdown.toFixed(2)}%` : ''}

## Additional Context
${metadata.lastAction ? `Last Action: ${metadata.lastAction}` : ''}
${metadata.consecutiveLosses ? `Consecutive Losses: ${metadata.consecutiveLosses}` : ''}
Timestamp: ${new Date(metadata.timestamp).toISOString()}

Based on the data above, make a trading decision and return your analysis in JSON format.`;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/models');
      return response.status === 200;
    } catch (error) {
      console.error('[OpenAI] Connection test failed:', error);
      return false;
    }
  }

  /**
   * 获取可用模型列表
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.axiosInstance.get('/models');
      return response.data.data
        .filter((m: any) => m.id.includes('gpt'))
        .map((m: any) => m.id);
    } catch (error) {
      console.error('[OpenAI] Failed to list models:', error);
      return [];
    }
  }
}

/**
 * 创建OpenAI客户端的便捷函数
 */
export function createOpenAIClient(
  apiKey: string,
  model: string = 'gpt-4-turbo-preview'
): OpenAIClient {
  return new OpenAIClient({ apiKey, model });
}
