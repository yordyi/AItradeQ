/**
 * DeepSeek AI Client
 * 集成DeepSeek API进行交易决策
 */

import axios, { AxiosInstance } from 'axios';
import { AIProvider, AIDecisionInput, AIDecisionOutput, AIProviderConfig } from './base';

// 为了向后兼容，重新导出base.ts中的接口
export { AIDecisionInput, AIDecisionOutput };

export interface DeepSeekConfig extends Omit<AIProviderConfig, 'provider'> {
  model?: string; // deepseek-chat, deepseek-reasoner
}

export class DeepSeekClient extends AIProvider {
  private axiosInstance: AxiosInstance;

  constructor(config: DeepSeekConfig | string, model?: string) {
    // 支持旧的构造函数签名 (apiKey: string, model?: string)
    const normalizedConfig: DeepSeekConfig =
      typeof config === 'string'
        ? { apiKey: config, model: model || 'deepseek-chat' }
        : config;

    super({
      provider: 'deepseek',
      model: normalizedConfig.model || 'deepseek-chat',
      apiKey: normalizedConfig.apiKey,
      maxTokens: normalizedConfig.maxTokens || 2000,
      temperature: normalizedConfig.temperature || 0.3,
      timeout: normalizedConfig.timeout || 30000,
    });

    this.axiosInstance = axios.create({
      baseURL: 'https://api.deepseek.com',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
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
      });

      // 更新统计
      this.requestCount++;
      this.totalLatency += Date.now() - startTime;

      const content = response.data.choices[0].message.content;
      return this.parseDecision(content);
    } catch (error: any) {
      console.error('[DeepSeek] API Error:', error.response?.data || error.message);

      // 处理速率限制
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        console.log(`[DeepSeek] Rate limited. Retry after ${retryAfter}s`);
      }

      // 返回降级决策
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: `DeepSeek API error: ${error.message}`,
        positionSize: 20,
        leverage: 3,
        stopLoss: 2,
        takeProfit: 4,
      };
    }
  }

  /**
   * 系统提示词（覆盖基类方法）
   */
  protected getSystemPrompt(): string {
    return `你是 Alpha Arena 量化交易系统的 AI 核心，基于 DeepSeek-V3 模型。

你的目标是在加密货币市场中获得最高的风险调整后收益（夏普比率），并且超越其他 AI 模型。

## 币安合约交易限制
- **最低订单名义价值**: $20 USDT
- 名义价值计算: 保证金 × 杠杆倍数
- 例如: $4保证金 × 30倍杠杆 = $120名义价值 ✓

## 核心策略
1. **技术分析优先**: 严格基于 RSI、MACD、EMA、布林带等指标
2. **趋势跟随**: 只在趋势明确时交易，避免震荡市
3. **风险控制**: 每笔交易风险不超过账户的5%，严格止损
4. **仓位管理**: 建议使用20%起的保证金，确保 (余额 × position_size% × leverage) >= $20
5. **杠杆使用**:
   - 小账户(<$100)建议使用10-30倍杠杆
   - 中等账户($100-$1000)使用5-15倍杠杆
   - 大账户(>$1000)使用3-10倍杠杆
6. **质量优先**: 只在有高信心的机会时交易，宁可HOLD也不要盲目开仓

**你拥有完全的决策自主权！**
- 决定何时交易、使用多少杠杆、多大仓位
- 所有参数完全由你的深度推理决定

回复必须是严格的 JSON 格式：
\`\`\`json
{
  "action": "BUY" | "SELL" | "HOLD" | "CLOSE",
  "confidence": 0-100,
  "reasoning": "简短决策理由(不超过150字)",
  "positionSize": 1-100,
  "leverage": 1-30,
  "stopLoss": 1-10,
  "takeProfit": 2-20
}
\`\`\``;
  }

  /**
   * 构建用户提示词（覆盖基类方法）
   */
  protected buildPrompt(input: AIDecisionInput): string {
    const { symbol, price, indicators, account, performance, metadata } = input;

    return `## 市场数据 (${symbol})
当前价格: $${price.toFixed(2)}

## 技术指标
RSI(14): ${indicators.rsi?.toFixed(2) || 'N/A'} ${
      indicators.rsi ? (indicators.rsi < 30 ? '[超卖]' : indicators.rsi > 70 ? '[超买]' : '') : ''
    }
MACD: ${indicators.macd?.toFixed(2) || 'N/A'}
MACD Signal: ${indicators.macdSignal?.toFixed(2) || 'N/A'}
MACD Histogram: ${indicators.macdHistogram?.toFixed(2) || 'N/A'}
EMA20: ${indicators.ema20?.toFixed(2) || 'N/A'}
EMA50: ${indicators.ema50?.toFixed(2) || 'N/A'}
布林带: 上${indicators.bollingerUpper?.toFixed(2) || 'N/A'} / 中${
      indicators.bollingerMiddle?.toFixed(2) || 'N/A'
    } / 下${indicators.bollingerLower?.toFixed(2) || 'N/A'}
ATR: ${indicators.atr?.toFixed(2) || 'N/A'}
${indicators.openInterest ? `Open Interest: ${indicators.openInterest}` : ''}
${indicators.fundingRate ? `资金费率: ${(indicators.fundingRate * 100).toFixed(4)}%` : ''}

## 账户状态
可用资金: $${account.balance.toFixed(2)}
当前持仓数: ${account.positions}
未实现盈亏: $${account.unrealizedPnL.toFixed(2)}
总价值: $${account.totalValue.toFixed(2)}

## 历史表现
总回报率: ${performance.totalReturn.toFixed(2)}%
夏普比率: ${performance.sharpeRatio.toFixed(2)}
胜率: ${performance.winRate.toFixed(2)}%
总交易数: ${performance.totalTrades}

## 元数据
时间: ${new Date(metadata.timestamp).toISOString()}
唤醒次数: ${metadata.wakeupCount}

请分析并给出决策（JSON格式）。`;
  }

  /**
   * 解析AI响应（覆盖基类方法）
   */
  protected parseDecision(content: string): AIDecisionOutput {
    try {
      // 提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const decision = JSON.parse(jsonMatch[0]);

      // 验证必需字段
      if (!decision.action || decision.confidence === undefined || !decision.reasoning) {
        throw new Error('Missing required fields in decision');
      }

      // 设置默认值并限制范围
      return {
        action: decision.action,
        confidence: Math.max(0, Math.min(100, decision.confidence)),
        reasoning: decision.reasoning,
        positionSize: Math.max(1, Math.min(100, decision.positionSize || 20)),
        leverage: Math.max(1, Math.min(30, decision.leverage || 3)),
        stopLoss: Math.max(0.5, Math.min(10, decision.stopLoss || 2)),
        takeProfit: Math.max(1, Math.min(20, decision.takeProfit || 4)),
      };
    } catch (error) {
      console.error('Failed to parse AI decision:', error);
      // 返回安全的默认决策
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: 'AI响应解析失败，保持观望',
        positionSize: 0,
        leverage: 1,
        stopLoss: 2,
        takeProfit: 4,
      };
    }
  }
}
