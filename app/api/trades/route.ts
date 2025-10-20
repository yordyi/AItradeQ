import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const trades = await prisma.trade.findMany({
      orderBy: {
        executedAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        symbol: true,
        side: true,
        price: true,
        quantity: true,
        executedAt: true,
        realizedPnl: true,
      },
    });

    return NextResponse.json(
      trades.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        price: parseFloat(trade.price.toString()),
        quantity: parseFloat(trade.quantity.toString()),
        time: trade.executedAt.toISOString(),
        realizedPnl: trade.realizedPnl ? parseFloat(trade.realizedPnl.toString()) : undefined,
      }))
    );
  } catch (error: any) {
    console.error('Failed to fetch trades:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
