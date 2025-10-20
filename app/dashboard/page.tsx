'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PnLChart } from '@/components/charts/PnLChart';
import { DonutChart } from '@/components/charts/DonutChart';

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

interface PnLDataPoint {
  time: string;
  pnl: number;
}

export default function Dashboard() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pnlHistory, setPnlHistory] = useState<PnLDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M'>('1W');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [accountRes, positionsRes, pnlRes] = await Promise.all([
        fetch('/api/account'),
        fetch('/api/positions'),
        fetch(`/api/pnl-history?range=${timeRange}`),
      ]);

      if (accountRes.ok) setAccount(await accountRes.json());
      if (positionsRes.ok) setPositions(await positionsRes.json());
      if (pnlRes.ok) setPnlHistory(await pnlRes.json());

      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const longPositions = positions.filter(p => p.side === 'LONG');
  const shortPositions = positions.filter(p => p.side === 'SHORT');
  const longValue = longPositions.reduce((sum, p) => sum + p.positionValue, 0);
  const shortValue = shortPositions.reduce((sum, p) => sum + p.positionValue, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const roe = account ? (totalPnl / (account.totalBalance - totalPnl)) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Navigation */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold">Alpha Arena</span>
              </Link>
              <nav className="flex items-center gap-6 text-sm">
                <button className="text-gray-400 hover:text-white transition">Discover</button>
                <button className="text-white font-semibold">Trade</button>
                <button className="text-gray-400 hover:text-white transition">Copy Trading</button>
                <button className="text-gray-400 hover:text-white transition">Analytics</button>
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
                DeepSeek V3 AI
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition">
                Start Trading
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Account Overview Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Account Total Value */}
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Account Total Value</div>
            <div className="text-3xl font-bold mb-4">
              $ {account?.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <DonutChart
              data={[
                { label: 'Perpetual', value: account?.totalBalance || 0, color: '#3b82f6' },
                { label: 'Spot', value: 0, color: '#6b7280' }
              ]}
            />
          </div>

          {/* Free Margin Available */}
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Free margin available</div>
            <div className="text-3xl font-bold mb-4">
              $ {account?.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <DonutChart
              data={[
                { label: 'Withdrawable', value: account?.availableBalance || 0, color: '#eab308' },
              ]}
              percentage={(account ? (account.availableBalance / account.totalBalance) * 100 : 0).toFixed(1)}
            />
          </div>

          {/* Total Position Value */}
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Total Position Value</div>
            <div className="text-3xl font-bold mb-4">
              $ {account?.totalPositionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <DonutChart
              data={[
                { label: 'Leverage Ratio', value: account?.leverage || 0, color: '#a855f7' },
              ]}
              percentage={`${(account?.leverage || 0).toFixed(1)}x`}
            />
          </div>

          {/* Feature Card */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
            <div className="text-sm mb-2">DeepSeek AI</div>
            <div className="text-2xl font-bold mb-2">Real-time Trading</div>
            <div className="text-sm text-gray-400 mb-3">AI-powered decisions</div>
            <button className="text-purple-400 text-sm hover:text-purple-300 transition flex items-center gap-1">
              Quick View →
            </button>
          </div>
        </div>

        {/* Statistics and Chart */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* Left Stats Column */}
          <div className="col-span-3 space-y-4">
            {/* Perp Total Value */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-1">Perp Total Value</div>
              <div className="text-2xl font-bold">
                $ {account?.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-1">Margin Used Ratio</div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${account?.marginRatio || 0}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">{(account?.marginRatio || 0).toFixed(2)}%</div>
              </div>
            </div>

            {/* Direction Bias */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-3">Direction Bias</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-400 text-sm">↗ Long</span>
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">Long Exposure</div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${longValue / (longValue + shortValue || 1) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-green-400 mt-1">
                  {((longValue / (longValue + shortValue || 1)) * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Short Exposure</div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${shortValue / (longValue + shortValue || 1) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-red-400 mt-1">
                  {((shortValue / (longValue + shortValue || 1)) * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Position Distribution */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-3">Position Distribution</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Long Value</span>
                  <span className="text-white font-semibold">$ {longValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Short Value</span>
                  <span className="text-white font-semibold">$ {shortValue.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            {/* ROE and uPnL */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">ROE</span>
                <span className={`text-lg font-bold ${roe >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">uPnL</span>
                <span className={`text-lg font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  $ {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Chart Area */}
          <div className="col-span-9">
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">Current Positions</h2>
                  <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    $ {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTimeRange('1W')}
                    className={`px-3 py-1 rounded text-sm ${timeRange === '1W' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    1W
                  </button>
                  <button
                    onClick={() => setTimeRange('1M')}
                    className={`px-3 py-1 rounded text-sm ${timeRange === '1M' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    1M
                  </button>
                  <button
                    onClick={() => setTimeRange('3M')}
                    className={`px-3 py-1 rounded text-sm ${timeRange === '3M' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    3M
                  </button>
                  <select className="bg-gray-800 text-sm rounded px-3 py-1 border border-gray-700">
                    <option>Perp Only</option>
                    <option>Total PnL</option>
                  </select>
                </div>
              </div>

              {/* PnL Chart */}
              <div className="h-64">
                <PnLChart data={pnlHistory} />
              </div>
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800">
          {/* Tabs */}
          <div className="border-b border-gray-800 px-6">
            <div className="flex gap-6">
              <button className="py-4 text-sm font-semibold border-b-2 border-white">
                Perp Positions ({positions.length})
              </button>
              <button className="py-4 text-sm text-gray-400 hover:text-white">
                Open Orders (0)
              </button>
              <button className="py-4 text-sm text-gray-400 hover:text-white">
                Recent Fills
              </button>
              <button className="py-4 text-sm text-gray-400 hover:text-white">
                Completed Trades
              </button>
              <button className="py-4 text-sm text-gray-400 hover:text-white">
                Historical Orders
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {positions.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                    <th className="px-6 py-3 font-medium">Symbol</th>
                    <th className="px-6 py-3 font-medium">Position Value</th>
                    <th className="px-6 py-3 font-medium">uPnL</th>
                    <th className="px-6 py-3 font-medium">Opening Price</th>
                    <th className="px-6 py-3 font-medium">Mark Price</th>
                    <th className="px-6 py-3 font-medium">Liq. Price</th>
                    <th className="px-6 py-3 font-medium">Margin</th>
                    <th className="px-6 py-3 font-medium">Funding Cost</th>
                    <th className="px-6 py-3 font-medium">TP/SL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, idx) => (
                    <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            position.side === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {position.side}
                          </span>
                          <span className="font-semibold">{position.symbol}</span>
                          <span className="text-gray-400 text-sm">
                            Isolated {position.leverage}x
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold">$ {position.positionValue.toLocaleString()}</div>
                        <div className="text-gray-400 text-sm">{position.size} {position.symbol.replace('USDT', '')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-bold ${position.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          $ {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)}
                        </div>
                        <div className={`text-sm ${position.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4">$ {position.entryPrice.toLocaleString()}</td>
                      <td className="px-6 py-4">$ {position.markPrice.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          $ {position.liqPrice.toLocaleString()}
                          <div className="flex gap-0.5">
                            {[...Array(8)].map((_, i) => (
                              <div key={i} className="w-1 h-3 bg-yellow-500 rounded-sm" />
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">$ {position.margin.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={position.fundingCost >= 0 ? 'text-green-400' : 'text-red-400'}>
                          $ {position.fundingCost >= 0 ? '+' : ''}{position.fundingCost.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">-/-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-gray-400">
                No open positions
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
