'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AccountInfo {
  totalBalance: number;
  availableBalance: number;
  totalPositionValue: number;
  unrealizedPnl: number;
  marginRatio: number;
  leverage: number;
}

interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  leverage: number;
  positionValue: number;
  entryPrice: number;
  markPrice: number;
  liqPrice: number;
  unrealizedPnl: number;
  pnlPercent: number;
  margin: number;
  fundingCost: number;
}

export default function Dashboard() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [accountRes, positionsRes] = await Promise.all([
        fetch('/api/account'),
        fetch('/api/positions'),
      ]);

      if (accountRes.ok) setAccount(await accountRes.json());
      if (positionsRes.ok) setPositions(await positionsRes.json());

      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const roe = account ? (totalPnl / (account.totalBalance - totalPnl)) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <div className="text-white text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      {/* 顶部导航栏 */}
      <header className="bg-[#161A1E] border-b border-gray-800 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold">
                  A
                </div>
                <span className="text-xl font-bold">Alpha Arena</span>
              </Link>
              <nav className="flex items-center gap-6">
                <button className="text-blue-500 font-semibold">Dashboard</button>
                <button className="text-gray-400 hover:text-white">Trade</button>
                <button className="text-gray-400 hover:text-white">Portfolio</button>
                <button className="text-gray-400 hover:text-white">History</button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Balance: <span className="text-white font-semibold">${account?.totalBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区 */}
      <div className="p-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            ⚠️ Error: {error}
          </div>
        )}

        {/* 账户概览卡片 - 顶部 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#161A1E] border border-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Total Balance</div>
            <div className="text-2xl font-bold text-white">
              ${account?.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 mt-1">≈ {account?.totalBalance.toFixed(0)} USDT</div>
          </div>

          <div className="bg-[#161A1E] border border-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Available Balance</div>
            <div className="text-2xl font-bold text-white">
              ${account?.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-green-500 mt-1">
              {account ? ((account.availableBalance / account.totalBalance) * 100).toFixed(1) : 0}% Free
            </div>
          </div>

          <div className="bg-[#161A1E] border border-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Total PnL (Unrealized)</div>
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </div>
            <div className={`text-sm mt-1 ${roe >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ROE: {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
            </div>
          </div>

          <div className="bg-[#161A1E] border border-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1">Margin Ratio</div>
            <div className="text-2xl font-bold text-yellow-500">
              {(account?.marginRatio || 0).toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Leverage: {(account?.leverage || 0).toFixed(1)}x
            </div>
          </div>
        </div>

        {/* 主要内容网格 - 2列布局 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 左侧 - 持仓列表 (占2列) */}
          <div className="col-span-2">
            <div className="bg-[#161A1E] border border-gray-800 rounded-lg overflow-hidden">
              <div className="border-b border-gray-800 px-6 py-4">
                <h2 className="text-lg font-bold">Open Positions ({positions.length})</h2>
              </div>

              <div className="overflow-x-auto">
                {positions.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                        <th className="px-6 py-3 font-medium">Symbol</th>
                        <th className="px-6 py-3 font-medium">Size</th>
                        <th className="px-6 py-3 font-medium">Entry</th>
                        <th className="px-6 py-3 font-medium">Mark</th>
                        <th className="px-6 py-3 font-medium">Liq. Price</th>
                        <th className="px-6 py-3 font-medium">PnL</th>
                        <th className="px-6 py-3 font-medium">ROE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position, idx) => (
                        <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                position.side === 'LONG'
                                  ? 'bg-green-500/20 text-green-500'
                                  : 'bg-red-500/20 text-red-500'
                              }`}>
                                {position.side}
                              </span>
                              <span className="font-semibold">{position.symbol}</span>
                              <span className="text-gray-500 text-sm">{position.leverage}x</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold">{position.size}</div>
                            <div className="text-gray-500 text-sm">${position.positionValue.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-300">${position.entryPrice.toLocaleString()}</td>
                          <td className="px-6 py-4 font-semibold">${position.markPrice.toLocaleString()}</td>
                          <td className="px-6 py-4 text-yellow-500">${position.liqPrice.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <div className={`font-bold ${position.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-semibold ${position.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-20 text-center">
                    <div className="text-gray-500 text-lg">No open positions</div>
                    <div className="text-gray-600 text-sm mt-2">Your positions will appear here</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧 - 统计信息 */}
          <div className="space-y-6">
            {/* 账户统计 */}
            <div className="bg-[#161A1E] border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Account Stats</h3>

              <div className="space-y-4">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Total Value</div>
                  <div className="text-xl font-bold">${account?.totalBalance.toFixed(2)}</div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <div className="text-gray-400 text-sm mb-1">Margin Used</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${account?.marginRatio || 0}%` }}
                      />
                    </div>
                    <div className="text-sm font-semibold">{(account?.marginRatio || 0).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <div className="text-gray-400 text-sm mb-1">ROE</div>
                  <div className={`text-xl font-bold ${roe >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* AI状态 */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-lg font-bold">DeepSeek AI</h3>
              </div>
              <div className="text-gray-300 text-sm">
                AI trading engine is active and monitoring markets
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
