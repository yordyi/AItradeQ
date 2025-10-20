import { NextResponse } from 'next/server';
import { BinanceClient } from '@/lib/binance/client';

export async function GET() {
  try {
    const binance = new BinanceClient({
      apiKey: process.env.BINANCE_API_KEY!,
      apiSecret: process.env.BINANCE_API_SECRET!,
      testnet: process.env.BINANCE_TESTNET === 'true',
    });

    const [accountInfo, positionRisks] = await Promise.all([
      binance.getFuturesAccount(),
      binance.getPositionRisk(),
    ]);

    // Calculate total balance and unrealized PnL
    const totalBalance = parseFloat(accountInfo.totalWalletBalance);
    const availableBalance = parseFloat(accountInfo.availableBalance);
    const unrealizedPnl = parseFloat(accountInfo.totalUnrealizedProfit);
    const totalMarginBalance = parseFloat(accountInfo.totalMarginBalance);
    const totalMaintMargin = parseFloat(accountInfo.totalMaintMargin);

    // Calculate total position value from active positions
    const totalPositionValue = positionRisks
      .filter((p: any) => Math.abs(parseFloat(p.positionAmt)) > 0)
      .reduce((sum: number, p: any) => {
        const size = Math.abs(parseFloat(p.positionAmt));
        const markPrice = parseFloat(p.markPrice);
        return sum + (size * markPrice);
      }, 0);

    // Calculate average leverage (weighted by position value)
    const positions = positionRisks.filter((p: any) => Math.abs(parseFloat(p.positionAmt)) > 0);
    let totalLeverageWeight = 0;
    let totalWeight = 0;

    positions.forEach((p: any) => {
      const size = Math.abs(parseFloat(p.positionAmt));
      const markPrice = parseFloat(p.markPrice);
      const leverage = parseInt(p.leverage);
      const value = size * markPrice;

      totalLeverageWeight += leverage * value;
      totalWeight += value;
    });

    const averageLeverage = totalWeight > 0 ? totalLeverageWeight / totalWeight : 0;

    // Calculate margin used ratio (percentage of margin balance used)
    const marginRatio = totalMarginBalance > 0
      ? (totalMaintMargin / totalMarginBalance) * 100
      : 0;

    return NextResponse.json({
      totalBalance,
      availableBalance,
      totalPositionValue,
      unrealizedPnl,
      marginRatio,
      leverage: averageLeverage,
    });
  } catch (error: any) {
    console.error('Failed to fetch account info:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
