/**
 * Multi-Model Benchmark Example
 * 演示如何使用多模型管理器进行AI对比
 */

import { BinanceClient } from '../lib/binance/client';
import { createDefaultModelManager, ModelManager } from '../lib/ai/model-manager';
import { calculateAllIndicators, getLatest } from '../lib/indicators/technical';

async function runMultiModelBenchmark() {
  console.log('🚀 Starting Multi-Model AI Benchmark...\n');

  // 1. 初始化Binance客户端
  const binance = new BinanceClient({
    apiKey: process.env.BINANCE_API_KEY!,
    apiSecret: process.env.BINANCE_API_SECRET!,
    testnet: false,
  });

  // 2. 创建模型管理器
  const manager = createDefaultModelManager(binance, {
    deepseek: process.env.DEEPSEEK_API_KEY!,
    openai: process.env.OPENAI_API_KEY, // 可选
    anthropic: process.env.ANTHROPIC_API_KEY, // 可选
  });

  console.log('✅ Model Manager initialized\n');
  console.log('📋 Active Models:');
  manager.getAllStates().forEach((state) => {
    console.log(`   - ${state.name} (${state.provider}/${state.model})`);
  });
  console.log();

  // 3. 获取市场数据
  console.log('📊 Fetching market data...');
  const symbol = 'BTCUSDT';
  const klines = await binance.getKlines(symbol, '1h', 200);

  const klinesData = klines.map((k) => ({
    open: parseFloat(k.open),
    high: parseFloat(k.high),
    low: parseFloat(k.low),
    close: parseFloat(k.close),
    volume: parseFloat(k.volume),
    timestamp: k.openTime,
  }));

  const indicators = calculateAllIndicators(klinesData);
  const currentPrice = await binance.getCurrentPrice(symbol);
  const ticker = await binance.get24hrTicker(symbol);

  // 4. 构建AI输入
  const aiInput = {
    symbol,
    price: currentPrice,
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
      balance: 20, // 将被每个模型的真实余额覆盖
      positions: 0,
      totalValue: 20,
      unrealizedPnL: 0,
    },
    performance: {
      totalReturn: 0,
      sharpeRatio: 0,
      winRate: 0,
      totalTrades: 0,
    },
    metadata: {
      timestamp: Date.now(),
      wakeupCount: 1,
    },
  };

  console.log(`✅ Market data ready: ${symbol} @ $${currentPrice.toFixed(2)}\n`);

  // 5. 并行运行所有模型
  console.log('🤖 Running all AI models in parallel...\n');

  const startTime = Date.now();
  const result = await manager.runAllModels(aiInput);
  const totalTime = Date.now() - startTime;

  // 6. 显示结果
  console.log('📊 BENCHMARK RESULTS\n');
  console.log('='.repeat(80));

  Object.entries(result.models).forEach(([modelId, data]) => {
    const { decision, latency, state } = data;

    console.log(`\n🤖 ${state.name} (${state.provider}/${state.model})`);
    console.log('-'.repeat(80));
    console.log(`⏱️  Response Time: ${latency}ms`);
    console.log(`📈 Decision: ${decision.action}`);
    console.log(`🎯 Confidence: ${decision.confidence}%`);
    console.log(`💭 Reasoning: ${decision.reasoning}`);

    if (decision.action === 'BUY' || decision.action === 'SELL') {
      console.log(`💰 Position Size: ${decision.positionSize}%`);
      console.log(`📊 Leverage: ${decision.leverage}x`);
      console.log(`🛡️  Stop Loss: ${decision.stopLoss}%`);
      console.log(`🎯 Take Profit: ${decision.takeProfit}%`);
    }

    console.log(`\n📊 Performance Stats:`);
    console.log(`   Balance: $${state.balance.toFixed(2)}`);
    console.log(`   Total Value: $${state.totalValue.toFixed(2)}`);
    console.log(`   Total Return: ${state.totalReturn.toFixed(2)}%`);
    console.log(`   Win Rate: ${state.winRate.toFixed(2)}%`);
    console.log(`   Total Trades: ${state.totalTrades}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n⏱️  Total Execution Time: ${totalTime}ms`);

  // 7. 显示排行榜
  console.log('\n🏆 LEADERBOARD (by Total Return)\n');
  const leaderboard = manager.getLeaderboard();

  leaderboard.forEach((model, index) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '   ';
    const returnColor = model.totalReturn > 0 ? '+' : '';
    console.log(
      `${emoji} ${(index + 1).toString().padStart(2)}. ${model.name.padEnd(25)} | Return: ${returnColor}${model.totalReturn.toFixed(2)}% | Trades: ${model.totalTrades}`
    );
  });

  // 8. 性能对比
  console.log('\n📈 PERFORMANCE COMPARISON\n');
  const comparison = manager.getPerformanceComparison();

  console.log(`Best Performer:     ${comparison.summary.bestModel}`);
  console.log(`Worst Performer:    ${comparison.summary.worstModel}`);
  console.log(`Average Return:     ${comparison.summary.averageReturn.toFixed(2)}%`);
  console.log(`Total Trades:       ${comparison.summary.totalTrades}`);

  // 9. 生成详细报告
  console.log('\n📄 Generating performance report...\n');
  const report = manager.generateReport();
  console.log(report);
}

// 运行基准测试
runMultiModelBenchmark().catch((error) => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
