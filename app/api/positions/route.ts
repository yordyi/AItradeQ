import { NextResponse } from 'next/server';
import { BinanceClient } from '@/lib/binance/client';

export async function GET() {
  try {
    const binance = new BinanceClient({
      apiKey: process.env.BINANCE_API_KEY!,
      apiSecret: process.env.BINANCE_API_SECRET!,
      testnet: process.env.BINANCE_TESTNET === 'true',
    });

    const positionRisks = await binance.getPositionRisk();

    // Filter out positions with 0 quantity
    const activePositions = positionRisks
      .filter((p: any) => Math.abs(parseFloat(p.positionAmt)) > 0)
      .map((p: any) => {
        const size = Math.abs(parseFloat(p.positionAmt));
        const entryPrice = parseFloat(p.entryPrice);
        const markPrice = parseFloat(p.markPrice);
        const unrealizedPnl = parseFloat(p.unRealizedProfit);
        const leverage = parseInt(p.leverage);
        const side = parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT';
        const liquidationPrice = parseFloat(p.liquidationPrice);

        // Calculate position value
        const positionValue = size * markPrice;

        // Calculate margin (position value / leverage)
        const margin = positionValue / leverage;

        // Calculate PnL percentage
        const pnlPercent = side === 'LONG'
          ? ((markPrice - entryPrice) / entryPrice) * 100 * leverage
          : ((entryPrice - markPrice) / entryPrice) * 100 * leverage;

        // Estimate funding cost (placeholder - would need actual funding rate history)
        const fundingCost = unrealizedPnl * 0.05; // Rough estimate

        return {
          symbol: p.symbol,
          side,
          size,
          leverage,
          positionValue,
          entryPrice,
          markPrice,
          liqPrice: liquidationPrice,
          unrealizedPnl,
          pnlPercent,
          margin,
          fundingCost,
        };
      });

    return NextResponse.json(activePositions);
  } catch (error: any) {
    console.error('Failed to fetch positions:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
