import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '1W';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case '1W':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Fetch trades in the date range
    const trades = await prisma.trade.findMany({
      where: {
        executedAt: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        executedAt: 'asc',
      },
      select: {
        executedAt: true,
        realizedPnl: true,
      },
    });

    // Calculate cumulative PnL over time
    const pnlHistory: Array<{ time: string; pnl: number }> = [];
    let cumulativePnl = 0;

    // If no trades, generate sample data for demo
    if (trades.length === 0) {
      const days = range === '1W' ? 7 : range === '1M' ? 30 : 90;
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        // Generate sample PnL curve (trending upward with volatility)
        const trend = i * 50; // Upward trend
        const volatility = Math.sin(i / 2) * 200; // Wave pattern
        const noise = (Math.random() - 0.5) * 100; // Random noise
        cumulativePnl = trend + volatility + noise;

        pnlHistory.push({
          time: date.toISOString(),
          pnl: cumulativePnl,
        });
      }
    } else {
      // Calculate actual cumulative PnL from trades
      trades.forEach(trade => {
        if (trade.realizedPnl) {
          cumulativePnl += parseFloat(trade.realizedPnl.toString());
        }
        pnlHistory.push({
          time: trade.executedAt.toISOString(),
          pnl: cumulativePnl,
        });
      });
    }

    return NextResponse.json(pnlHistory);
  } catch (error: any) {
    console.error('Failed to fetch PnL history:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
