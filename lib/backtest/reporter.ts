/**
 * 回测报告生成器
 * 生成详细的回测分析报告
 */

import { BacktestResult } from './engine';

export class BacktestReporter {
  /**
   * 生成控制台报告
   */
  static printReport(result: BacktestResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 BACKTEST REPORT');
    console.log('='.repeat(80));

    // 基本信息
    console.log('\n📋 Configuration');
    console.log(`Symbol: ${result.config.symbol}`);
    console.log(`Initial Capital: $${result.initialCapital.toFixed(2)}`);
    console.log(`Min Confidence: ${result.config.minConfidence}%`);
    console.log(`Commission: ${(result.config.commission! * 100).toFixed(2)}%`);
    console.log(`Slippage: ${(result.config.slippage! * 100).toFixed(2)}%`);

    // 时间信息
    console.log('\n⏱️  Duration');
    console.log(`Start: ${new Date(result.equityCurve[0].time).toLocaleString()}`);
    console.log(
      `End: ${new Date(result.equityCurve[result.equityCurve.length - 1].time).toLocaleString()}`
    );
    console.log(`Backtest Runtime: ${(result.duration / 1000).toFixed(2)}s`);

    // 收益指标
    console.log('\n💰 Returns');
    const returnColor =
      result.totalReturn > 0
        ? '\x1b[32m' // 绿色
        : result.totalReturn < 0
        ? '\x1b[31m' // 红色
        : '\x1b[0m'; // 默认
    console.log(`Final Capital: $${result.finalCapital.toFixed(2)}`);
    console.log(
      `Total Return: ${returnColor}$${result.totalReturn.toFixed(2)} (${result.totalReturnPercent.toFixed(2)}%)\x1b[0m`
    );

    // 交易统计
    console.log('\n📈 Trade Statistics');
    console.log(`Total Trades: ${result.totalTrades}`);
    console.log(`Wins: ${result.wins} (${result.winRate.toFixed(2)}%)`);
    console.log(`Losses: ${result.losses}`);
    console.log(`Average Win: $${result.averageWin.toFixed(2)}`);
    console.log(`Average Loss: $${result.averageLoss.toFixed(2)}`);
    console.log(`Profit Factor: ${result.profitFactor.toFixed(2)}`);

    // 风险指标
    console.log('\n📉 Risk Metrics');
    console.log(`Max Drawdown: $${result.maxDrawdown.toFixed(2)} (${result.maxDrawdownPercent.toFixed(2)}%)`);
    console.log(`Sharpe Ratio: ${result.sharpeRatio.toFixed(3)}`);
    console.log(`Sortino Ratio: ${result.sortinoRatio.toFixed(3)}`);

    // 性能评级
    console.log('\n⭐ Performance Rating');
    const rating = this.getRating(result);
    console.log(`Overall: ${rating.stars} ${rating.label}`);
    console.log(`  - Return: ${rating.returnRating}/5`);
    console.log(`  - Win Rate: ${rating.winRateRating}/5`);
    console.log(`  - Risk-Adjusted: ${rating.riskRating}/5`);

    // 前5笔最佳交易
    if (result.trades.length > 0) {
      console.log('\n🏆 Top 5 Best Trades');
      const bestTrades = [...result.trades]
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 5);

      bestTrades.forEach((trade, i) => {
        console.log(
          `${i + 1}. ${trade.side} | ${new Date(trade.entryTime).toLocaleDateString()} | PnL: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`
        );
      });

      // 前5笔最差交易
      console.log('\n💔 Top 5 Worst Trades');
      const worstTrades = [...result.trades]
        .sort((a, b) => a.pnl - b.pnl)
        .slice(0, 5);

      worstTrades.forEach((trade, i) => {
        console.log(
          `${i + 1}. ${trade.side} | ${new Date(trade.entryTime).toLocaleDateString()} | PnL: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`
        );
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * 生成Markdown报告
   */
  static generateMarkdown(result: BacktestResult): string {
    let md = `# 📊 Backtest Report\n\n`;

    md += `## 配置信息\n\n`;
    md += `| 项目 | 值 |\n`;
    md += `|------|----|\n`;
    md += `| 交易对 | ${result.config.symbol} |\n`;
    md += `| 初始资金 | $${result.initialCapital.toFixed(2)} |\n`;
    md += `| 最小信心度 | ${result.config.minConfidence}% |\n`;
    md += `| 手续费 | ${(result.config.commission! * 100).toFixed(2)}% |\n`;
    md += `| 滑点 | ${(result.config.slippage! * 100).toFixed(2)}% |\n\n`;

    md += `## 时间范围\n\n`;
    md += `- **开始**: ${new Date(result.equityCurve[0].time).toLocaleString()}\n`;
    md += `- **结束**: ${new Date(result.equityCurve[result.equityCurve.length - 1].time).toLocaleString()}\n`;
    md += `- **回测耗时**: ${(result.duration / 1000).toFixed(2)}秒\n\n`;

    md += `## 收益指标\n\n`;
    md += `| 指标 | 值 |\n`;
    md += `|------|----|\n`;
    md += `| 最终资金 | $${result.finalCapital.toFixed(2)} |\n`;
    md += `| 总收益 | $${result.totalReturn.toFixed(2)} |\n`;
    md += `| 收益率 | ${result.totalReturnPercent.toFixed(2)}% |\n\n`;

    md += `## 交易统计\n\n`;
    md += `| 指标 | 值 |\n`;
    md += `|------|----|\n`;
    md += `| 总交易数 | ${result.totalTrades} |\n`;
    md += `| 盈利次数 | ${result.wins} |\n`;
    md += `| 亏损次数 | ${result.losses} |\n`;
    md += `| 胜率 | ${result.winRate.toFixed(2)}% |\n`;
    md += `| 平均盈利 | $${result.averageWin.toFixed(2)} |\n`;
    md += `| 平均亏损 | $${result.averageLoss.toFixed(2)} |\n`;
    md += `| 盈亏比 | ${result.profitFactor.toFixed(2)} |\n\n`;

    md += `## 风险指标\n\n`;
    md += `| 指标 | 值 |\n`;
    md += `|------|----|\n`;
    md += `| 最大回撤 | $${result.maxDrawdown.toFixed(2)} (${result.maxDrawdownPercent.toFixed(2)}%) |\n`;
    md += `| 夏普比率 | ${result.sharpeRatio.toFixed(3)} |\n`;
    md += `| 索提诺比率 | ${result.sortinoRatio.toFixed(3)} |\n\n`;

    const rating = this.getRating(result);
    md += `## 性能评级\n\n`;
    md += `**综合评分**: ${rating.stars} (${rating.label})\n\n`;
    md += `- 收益评分: ${rating.returnRating}/5\n`;
    md += `- 胜率评分: ${rating.winRateRating}/5\n`;
    md += `- 风险调整评分: ${rating.riskRating}/5\n\n`;

    // 交易详情
    if (result.trades.length > 0) {
      md += `## 交易记录\n\n`;
      md += `| # | 方向 | 入场时间 | 出场时间 | 入场价 | 出场价 | 盈亏 | 盈亏% | 原因 |\n`;
      md += `|---|------|----------|----------|--------|--------|------|-------|------|\n`;

      result.trades.slice(-20).forEach((trade, i) => {
        const entryDate = new Date(trade.entryTime).toLocaleDateString();
        const exitDate = new Date(trade.exitTime).toLocaleDateString();
        const pnlColor = trade.pnl > 0 ? '🟢' : '🔴';

        md += `| ${i + 1} | ${trade.side} | ${entryDate} | ${exitDate} | $${trade.entryPrice.toFixed(2)} | $${trade.exitPrice.toFixed(2)} | ${pnlColor} $${trade.pnl.toFixed(2)} | ${trade.pnlPercent.toFixed(2)}% | ${trade.reason} |\n`;
      });

      if (result.trades.length > 20) {
        md += `\n*显示最近20笔交易，共${result.trades.length}笔*\n`;
      }
    }

    return md;
  }

  /**
   * 生成JSON报告
   */
  static generateJSON(result: BacktestResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * 获取性能评级
   */
  private static getRating(result: BacktestResult): {
    stars: string;
    label: string;
    returnRating: number;
    winRateRating: number;
    riskRating: number;
  } {
    // 收益评分 (0-5)
    let returnRating = 0;
    if (result.totalReturnPercent > 50) returnRating = 5;
    else if (result.totalReturnPercent > 30) returnRating = 4;
    else if (result.totalReturnPercent > 15) returnRating = 3;
    else if (result.totalReturnPercent > 5) returnRating = 2;
    else if (result.totalReturnPercent > 0) returnRating = 1;

    // 胜率评分 (0-5)
    let winRateRating = 0;
    if (result.winRate > 70) winRateRating = 5;
    else if (result.winRate > 60) winRateRating = 4;
    else if (result.winRate > 50) winRateRating = 3;
    else if (result.winRate > 40) winRateRating = 2;
    else if (result.winRate > 30) winRateRating = 1;

    // 风险调整评分 (基于夏普比率和最大回撤)
    let riskRating = 0;
    if (result.sharpeRatio > 2 && result.maxDrawdownPercent < 10) riskRating = 5;
    else if (result.sharpeRatio > 1.5 && result.maxDrawdownPercent < 15)
      riskRating = 4;
    else if (result.sharpeRatio > 1 && result.maxDrawdownPercent < 20) riskRating = 3;
    else if (result.sharpeRatio > 0.5 && result.maxDrawdownPercent < 30)
      riskRating = 2;
    else if (result.sharpeRatio > 0) riskRating = 1;

    // 综合评分
    const overallRating = Math.round(
      (returnRating + winRateRating + riskRating) / 3
    );

    let stars = '';
    let label = '';

    switch (overallRating) {
      case 5:
        stars = '⭐⭐⭐⭐⭐';
        label = 'Excellent';
        break;
      case 4:
        stars = '⭐⭐⭐⭐';
        label = 'Good';
        break;
      case 3:
        stars = '⭐⭐⭐';
        label = 'Average';
        break;
      case 2:
        stars = '⭐⭐';
        label = 'Below Average';
        break;
      case 1:
        stars = '⭐';
        label = 'Poor';
        break;
      default:
        stars = '';
        label = 'Failed';
    }

    return {
      stars,
      label,
      returnRating,
      winRateRating,
      riskRating,
    };
  }
}
