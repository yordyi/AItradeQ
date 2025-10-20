/**
 * 回测示例
 * 演示如何使用回测引擎测试DeepSeek AI策略
 */

import { BinanceClient } from '../lib/binance/client';
import { BacktestEngine } from '../lib/backtest/engine';
import { BacktestReporter } from '../lib/backtest/reporter';
import * as fs from 'fs';

async function runBacktest() {
  console.log('🚀 Starting DeepSeek AI Strategy Backtest\n');

  // 1. 初始化Binance客户端获取历史数据
  const binance = new BinanceClient({
    apiKey: process.env.BINANCE_API_KEY!,
    apiSecret: process.env.BINANCE_API_SECRET!,
    testnet: false,
  });

  // 2. 配置回测参数
  const config = {
    symbol: 'BTCUSDT',
    initialCapital: 100, // $100 初始资金
    minConfidence: 70, // 70%最小信心度
    aiApiKey: process.env.DEEPSEEK_API_KEY!,
    aiModel: 'deepseek-chat',
    commission: 0.0004, // 0.04% 手续费
    slippage: 0.0005, // 0.05% 滑点
  };

  console.log('📋 Backtest Configuration:');
  console.log(`   Symbol: ${config.symbol}`);
  console.log(`   Initial Capital: $${config.initialCapital}`);
  console.log(`   Min Confidence: ${config.minConfidence}%`);
  console.log(`   AI Model: ${config.aiModel}\n`);

  // 3. 获取历史K线数据 (最近30天, 1小时K线)
  console.log('📊 Fetching historical klines...');
  const daysAgo = 30;
  const startTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

  const klines = await binance.getKlines(
    config.symbol,
    '1h', // 1小时K线
    1000 // 最多1000根
  );

  // 过滤到指定时间范围
  const filteredKlines = klines
    .filter((k) => k.openTime >= startTime)
    .map((k) => ({
      openTime: k.openTime,
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
      volume: parseFloat(k.volume),
    }));

  console.log(`✅ Loaded ${filteredKlines.length} klines\n`);
  console.log(`Period: ${new Date(filteredKlines[0].openTime).toLocaleDateString()} - ${new Date(filteredKlines[filteredKlines.length - 1].openTime).toLocaleDateString()}\n`);

  // 4. 创建回测引擎
  const engine = new BacktestEngine(config);

  // 5. 运行回测
  console.log('🔄 Running backtest...\n');
  const result = await engine.run(filteredKlines);

  // 6. 显示报告
  BacktestReporter.printReport(result);

  // 7. 保存报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // 保存Markdown报告
  const mdReport = BacktestReporter.generateMarkdown(result);
  const mdPath = `./backtest-reports/backtest-${timestamp}.md`;
  if (!fs.existsSync('./backtest-reports')) {
    fs.mkdirSync('./backtest-reports');
  }
  fs.writeFileSync(mdPath, mdReport);
  console.log(`📄 Markdown report saved: ${mdPath}`);

  // 保存JSON数据
  const jsonReport = BacktestReporter.generateJSON(result);
  const jsonPath = `./backtest-reports/backtest-${timestamp}.json`;
  fs.writeFileSync(jsonPath, jsonReport);
  console.log(`💾 JSON data saved: ${jsonPath}\n`);

  // 8. 总结建议
  console.log('💡 Recommendations:');
  if (result.totalReturnPercent > 20) {
    console.log('✅ Strategy shows strong performance! Consider live trading.');
  } else if (result.totalReturnPercent > 10) {
    console.log('⚠️  Strategy shows moderate performance. Further optimization recommended.');
  } else if (result.totalReturnPercent > 0) {
    console.log('⚠️  Strategy shows weak performance. Significant optimization needed.');
  } else {
    console.log('❌ Strategy shows negative returns. Review strategy parameters.');
  }

  if (result.winRate < 50) {
    console.log('⚠️  Win rate below 50%. Consider adjusting entry/exit logic.');
  }

  if (result.maxDrawdownPercent > 20) {
    console.log('⚠️  High drawdown detected. Review risk management settings.');
  }

  if (result.sharpeRatio < 1) {
    console.log('⚠️  Low Sharpe ratio. Risk-adjusted returns need improvement.');
  }

  console.log('\n🎉 Backtest complete!\n');
}

// 运行回测
runBacktest().catch((error) => {
  console.error('❌ Backtest failed:', error);
  process.exit(1);
});
