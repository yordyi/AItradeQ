/**
 * AI Model Manager
 * 管理多个AI模型的并行运行和性能对比
 */

import { AIProvider, AIDecisionInput, AIDecisionOutput } from './base';
import { DeepSeekClient } from './deepseek';
import { OpenAIClient } from './openai';
import { ClaudeClient } from './claude';
import { BinanceClient } from '../binance/client';

export interface ModelConfig {
  id: string; // 唯一标识符
  name: string; // 显示名称
  provider: 'deepseek' | 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  enabled: boolean;
  initialCapital: number; // 初始资金
  minConfidence?: number; // 最小交易信心度
}

export interface ModelState {
  id: string;
  name: string;
  provider: string;
  model: string;
  balance: number;
  totalValue: number;
  unrealizedPnL: number;
  totalReturn: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  maxDrawdown: number;
  lastAction?: string;
  lastDecision?: AIDecisionOutput;
  lastUpdateTime: number;
  isActive: boolean;
}

export interface BenchmarkResult {
  timestamp: number;
  models: {
    [modelId: string]: {
      decision: AIDecisionOutput;
      latency: number;
      state: ModelState;
    };
  };
  marketData: AIDecisionInput;
}

export class ModelManager {
  private models: Map<string, AIProvider> = new Map();
  private modelStates: Map<string, ModelState> = new Map();
  private binance: BinanceClient;
  private benchmarkHistory: BenchmarkResult[] = [];

  constructor(binance: BinanceClient) {
    this.binance = binance;
  }

  /**
   * 添加AI模型
   */
  addModel(config: ModelConfig): void {
    let client: AIProvider;

    switch (config.provider) {
      case 'deepseek':
        client = new DeepSeekClient({
          apiKey: config.apiKey,
          model: config.model,
        });
        break;

      case 'openai':
        client = new OpenAIClient({
          apiKey: config.apiKey,
          model: config.model,
        });
        break;

      case 'anthropic':
        client = new ClaudeClient({
          apiKey: config.apiKey,
          model: config.model,
        });
        break;

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    this.models.set(config.id, client);

    // 初始化模型状态
    this.modelStates.set(config.id, {
      id: config.id,
      name: config.name,
      provider: config.provider,
      model: config.model,
      balance: config.initialCapital,
      totalValue: config.initialCapital,
      unrealizedPnL: 0,
      totalReturn: 0,
      sharpeRatio: 0,
      winRate: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      maxDrawdown: 0,
      lastUpdateTime: Date.now(),
      isActive: config.enabled,
    });

    console.log(`✅ Added ${config.name} (${config.provider}/${config.model})`);
  }

  /**
   * 移除AI模型
   */
  removeModel(modelId: string): void {
    this.models.delete(modelId);
    this.modelStates.delete(modelId);
    console.log(`🗑️ Removed model: ${modelId}`);
  }

  /**
   * 获取所有模型状态
   */
  getAllStates(): ModelState[] {
    return Array.from(this.modelStates.values());
  }

  /**
   * 获取单个模型状态
   */
  getState(modelId: string): ModelState | undefined {
    return this.modelStates.get(modelId);
  }

  /**
   * 获取排行榜（按总收益率排序）
   */
  getLeaderboard(): ModelState[] {
    return this.getAllStates()
      .sort((a, b) => b.totalReturn - a.totalReturn);
  }

  /**
   * 并行运行所有模型获取决策
   */
  async runAllModels(input: AIDecisionInput): Promise<BenchmarkResult> {
    const timestamp = Date.now();
    const results: BenchmarkResult['models'] = {};

    // 并行调用所有启用的模型
    const promises = Array.from(this.models.entries())
      .filter(([id]) => this.modelStates.get(id)?.isActive)
      .map(async ([id, client]) => {
        const startTime = Date.now();

        try {
          // 获取模型当前状态
          const state = this.modelStates.get(id)!;

          // 调整输入以包含模型自身的状态
          const modelInput: AIDecisionInput = {
            ...input,
            account: {
              balance: state.balance,
              positions: 0, // TODO: 从数据库获取真实持仓
              totalValue: state.totalValue,
              unrealizedPnL: state.unrealizedPnL,
            },
            performance: {
              totalReturn: state.totalReturn,
              sharpeRatio: state.sharpeRatio,
              winRate: state.winRate,
              totalTrades: state.totalTrades,
              maxDrawdown: state.maxDrawdown,
            },
          };

          // 获取AI决策
          const decision = await client.makeDecision(modelInput);
          const latency = Date.now() - startTime;

          // 更新模型状态
          state.lastDecision = decision;
          state.lastAction = decision.action;
          state.lastUpdateTime = Date.now();

          results[id] = {
            decision,
            latency,
            state: { ...state },
          };
        } catch (error) {
          console.error(`[${id}] Decision failed:`, error);

          // 记录失败的决策
          results[id] = {
            decision: {
              action: 'HOLD',
              confidence: 0,
              reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
            },
            latency: Date.now() - startTime,
            state: { ...this.modelStates.get(id)! },
          };
        }
      });

    await Promise.all(promises);

    // 创建基准测试结果
    const benchmarkResult: BenchmarkResult = {
      timestamp,
      models: results,
      marketData: input,
    };

    // 保存到历史记录
    this.benchmarkHistory.push(benchmarkResult);

    // 限制历史记录大小
    if (this.benchmarkHistory.length > 1000) {
      this.benchmarkHistory.shift();
    }

    return benchmarkResult;
  }

  /**
   * 更新模型交易结果
   */
  updateTradeResult(
    modelId: string,
    result: {
      pnl: number;
      returnPercent: number;
      wasWin: boolean;
    }
  ): void {
    const state = this.modelStates.get(modelId);
    if (!state) return;

    // 更新统计
    state.balance += result.pnl;
    state.totalValue = state.balance + state.unrealizedPnL;
    state.totalTrades++;

    if (result.wasWin) {
      state.wins++;
    } else {
      state.losses++;
    }

    state.winRate = (state.wins / state.totalTrades) * 100;

    // 计算总收益率
    const initialCapital = 20; // TODO: 从配置获取
    state.totalReturn = ((state.totalValue - initialCapital) / initialCapital) * 100;

    // 更新最大回撤
    const currentDrawdown = ((state.totalValue - initialCapital) / initialCapital) * 100;
    if (currentDrawdown < state.maxDrawdown) {
      state.maxDrawdown = currentDrawdown;
    }

    state.lastUpdateTime = Date.now();

    console.log(
      `📊 [${state.name}] Trade completed: ${result.wasWin ? '✅ WIN' : '❌ LOSS'} | PnL: $${result.pnl.toFixed(2)} | Total: $${state.totalValue.toFixed(2)} | Return: ${state.totalReturn.toFixed(2)}%`
    );
  }

  /**
   * 更新模型未实现盈亏
   */
  updateUnrealizedPnL(modelId: string, unrealizedPnL: number): void {
    const state = this.modelStates.get(modelId);
    if (!state) return;

    state.unrealizedPnL = unrealizedPnL;
    state.totalValue = state.balance + unrealizedPnL;

    // 重新计算总收益率
    const initialCapital = 20;
    state.totalReturn = ((state.totalValue - initialCapital) / initialCapital) * 100;
  }

  /**
   * 获取基准测试历史
   */
  getBenchmarkHistory(limit: number = 100): BenchmarkResult[] {
    return this.benchmarkHistory.slice(-limit);
  }

  /**
   * 获取性能对比
   */
  getPerformanceComparison(): {
    summary: {
      bestModel: string;
      worstModel: string;
      averageReturn: number;
      totalTrades: number;
    };
    models: Array<{
      id: string;
      name: string;
      return: number;
      sharpe: number;
      winRate: number;
      trades: number;
    }>;
  } {
    const states = this.getAllStates();

    if (states.length === 0) {
      return {
        summary: {
          bestModel: 'N/A',
          worstModel: 'N/A',
          averageReturn: 0,
          totalTrades: 0,
        },
        models: [],
      };
    }

    const sorted = states.sort((a, b) => b.totalReturn - a.totalReturn);
    const totalTrades = states.reduce((sum, s) => sum + s.totalTrades, 0);
    const avgReturn = states.reduce((sum, s) => sum + s.totalReturn, 0) / states.length;

    return {
      summary: {
        bestModel: sorted[0].name,
        worstModel: sorted[sorted.length - 1].name,
        averageReturn: avgReturn,
        totalTrades,
      },
      models: states.map((s) => ({
        id: s.id,
        name: s.name,
        return: s.totalReturn,
        sharpe: s.sharpeRatio,
        winRate: s.winRate,
        trades: s.totalTrades,
      })),
    };
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const comparison = this.getPerformanceComparison();
    const leaderboard = this.getLeaderboard();

    let report = `## 🏆 AI Model Performance Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += `### 📊 Summary\n`;
    report += `- Best Performer: **${comparison.summary.bestModel}**\n`;
    report += `- Worst Performer: ${comparison.summary.worstModel}\n`;
    report += `- Average Return: ${comparison.summary.averageReturn.toFixed(2)}%\n`;
    report += `- Total Trades: ${comparison.summary.totalTrades}\n\n`;

    report += `### 🥇 Leaderboard\n`;
    leaderboard.forEach((model, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      report += `${emoji} **${model.name}** (${model.provider})\n`;
      report += `   - Return: ${model.totalReturn.toFixed(2)}%\n`;
      report += `   - Sharpe: ${model.sharpeRatio.toFixed(2)}\n`;
      report += `   - Win Rate: ${model.winRate.toFixed(2)}%\n`;
      report += `   - Trades: ${model.totalTrades}\n`;
      report += `   - Balance: $${model.balance.toFixed(2)}\n\n`;
    });

    return report;
  }

  /**
   * 重置所有模型状态
   */
  resetAll(): void {
    this.modelStates.forEach((state) => {
      state.balance = 20; // 重置为初始资金
      state.totalValue = 20;
      state.unrealizedPnL = 0;
      state.totalReturn = 0;
      state.sharpeRatio = 0;
      state.winRate = 0;
      state.totalTrades = 0;
      state.wins = 0;
      state.losses = 0;
      state.maxDrawdown = 0;
      state.lastUpdateTime = Date.now();
    });

    this.benchmarkHistory = [];
    console.log('🔄 All models reset to initial state');
  }
}

/**
 * 创建预配置的模型管理器
 */
export function createDefaultModelManager(
  binance: BinanceClient,
  apiKeys: {
    deepseek?: string;
    openai?: string;
    anthropic?: string;
  }
): ModelManager {
  const manager = new ModelManager(binance);

  // 添加DeepSeek
  if (apiKeys.deepseek) {
    manager.addModel({
      id: 'deepseek-v3',
      name: 'DeepSeek V3',
      provider: 'deepseek',
      apiKey: apiKeys.deepseek,
      model: 'deepseek-chat',
      enabled: true,
      initialCapital: 20,
      minConfidence: 70,
    });
  }

  // 添加OpenAI GPT-4
  if (apiKeys.openai) {
    manager.addModel({
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      apiKey: apiKeys.openai,
      model: 'gpt-4-turbo-preview',
      enabled: true,
      initialCapital: 20,
      minConfidence: 70,
    });
  }

  // 添加Claude 3.5 Sonnet
  if (apiKeys.anthropic) {
    manager.addModel({
      id: 'claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      apiKey: apiKeys.anthropic,
      model: 'claude-3-5-sonnet-20241022',
      enabled: true,
      initialCapital: 20,
      minConfidence: 70,
    });
  }

  return manager;
}
