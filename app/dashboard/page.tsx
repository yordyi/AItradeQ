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
      <div className="min-h-screen animated-gradient-bg flex items-center justify-center">
        <div className="liquid-glass px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="neon-text-cyan text-xl font-semibold">Loading Dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-gradient-bg text-white">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className="glass-card border-b border-white/10 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Navigation */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center glow-cyan group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-2xl font-bold gradient-text">Alpha Arena</span>
              </Link>
              <nav className="flex items-center gap-6 text-sm font-medium">
                <button className="text-gray-200 hover:text-white transition">Discover</button>
                <button className="neon-text-cyan font-semibold">Trade</button>
                <button className="text-gray-200 hover:text-white transition">Copy Trading</button>
                <button className="text-gray-200 hover:text-white transition">Analytics</button>
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              <div className="glass-card px-4 py-2">
                <span className="neon-text-purple text-sm font-semibold">🤖 DeepSeek V3 AI</span>
              </div>
              <button className="neon-button">
                Start Trading
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 relative z-10">
        {error && (
          <div className="glass-card border-red-500/50 p-4 mb-6">
            <p className="text-red-300">⚠️ Error: {error}</p>
          </div>
        )}

        {/* Account Overview Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Account Total Value */}
          <div className="neon-glass-card p-6 group hover:scale-105 transition-transform">
            <div className="text-gray-200 text-sm mb-2 font-medium">Account Total Value</div>
            <div className="text-4xl font-bold mb-4 neon-text-cyan">
              $ {account?.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <DonutChart
              data={[
                { label: 'Perpetual', value: account?.totalBalance || 0, color: '#06b6d4' },
                { label: 'Spot', value: 0, color: '#374151' }
              ]}
            />
          </div>

          {/* Free Margin Available */}
          <div className="neon-glass-card p-6 group hover:scale-105 transition-transform">
            <div className="text-gray-200 text-sm mb-2 font-medium">Free Margin Available</div>
            <div className="text-4xl font-bold mb-4 neon-text-purple">
              $ {account?.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <DonutChart
              data={[
                { label: 'Withdrawable', value: account?.availableBalance || 0, color: '#a855f7' },
              ]}
              percentage={(account ? (account.availableBalance / account.totalBalance) * 100 : 0).toFixed(1)}
            />
          </div>

          {/* Total Position Value */}
          <div className="neon-glass-card p-6 group hover:scale-105 transition-transform">
            <div className="text-gray-200 text-sm mb-2 font-medium">Total Position Value</div>
            <div className="text-4xl font-bold mb-4 neon-text-pink">
              $ {account?.totalPositionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <DonutChart
              data={[
                { label: 'Leverage Ratio', value: account?.leverage || 0, color: '#ec4899' },
              ]}
              percentage={`${(account?.leverage || 0).toFixed(1)}x`}
            />
          </div>

          {/* Feature Card */}
          <div className="liquid-glass p-6 group hover:scale-105 transition-transform glow-purple">
            <div className="text-sm mb-2 text-gray-100 font-medium">DeepSeek AI</div>
            <div className="text-3xl font-bold mb-2 gradient-text">Real-time Trading</div>
            <div className="text-sm text-gray-200 mb-3">AI-powered decisions</div>
            <button className="glass-button text-sm">
              Quick View →
            </button>
          </div>
        </div>

        {/* Statistics and Chart */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* Left Stats Column */}
          <div className="col-span-3 space-y-4">
            {/* Perp Total Value */}
            <div className="liquid-glass p-5">
              <div className="text-gray-200 text-sm mb-2 font-medium">Perp Total Value</div>
              <div className="text-3xl font-bold mb-4 neon-text-cyan">
                $ {account?.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div>
                <div className="text-xs text-gray-200 mb-2">Margin Used Ratio</div>
                <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all glow-cyan"
                    style={{ width: `${account?.marginRatio || 0}%` }}
                  />
                </div>
                <div className="text-xs neon-text-cyan mt-1">{(account?.marginRatio || 0).toFixed(2)}%</div>
              </div>
            </div>

            {/* Direction Bias */}
            <div className="liquid-glass p-5">
              <div className="text-gray-200 text-sm mb-3 font-medium">Direction Bias</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-400 text-sm font-semibold">↗ Long</span>
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-200 mb-2">Long Exposure</div>
                <div className="w-full bg-black/30 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                    style={{ width: `${longValue / (longValue + shortValue || 1) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-green-400 mt-1 font-semibold">
                  {((longValue / (longValue + shortValue || 1)) * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-200 mb-2">Short Exposure</div>
                <div className="w-full bg-black/30 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-rose-500 h-2 rounded-full"
                    style={{ width: `${shortValue / (longValue + shortValue || 1) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-red-400 mt-1 font-semibold">
                  {((shortValue / (longValue + shortValue || 1)) * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* ROE and uPnL */}
            <div className="liquid-glass p-5 glow-purple">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-200 text-sm font-medium">ROE</span>
                <span className={`text-2xl font-bold ${roe >= 0 ? 'neon-text-cyan' : 'text-red-400'}`}>
                  {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-200 text-sm font-medium">uPnL</span>
                <span className={`text-2xl font-bold ${totalPnl >= 0 ? 'neon-text-purple' : 'text-red-400'}`}>
                  $ {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Chart Area */}
          <div className="col-span-9">
            <div className="neon-glass-card p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold gradient-text">Current Positions</h2>
                  <div className={`text-3xl font-bold ${totalPnl >= 0 ? 'neon-text-cyan' : 'text-red-400'}`}>
                    $ {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTimeRange('1W')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === '1W' ? 'glass-button' : 'text-gray-300 hover:text-white'}`}
                  >
                    1W
                  </button>
                  <button
                    onClick={() => setTimeRange('1M')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === '1M' ? 'glass-button' : 'text-gray-300 hover:text-white'}`}
                  >
                    1M
                  </button>
                  <button
                    onClick={() => setTimeRange('3M')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === '3M' ? 'glass-button' : 'text-gray-300 hover:text-white'}`}
                  >
                    3M
                  </button>
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
        <div className="liquid-glass overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-white/10 px-6">
            <div className="flex gap-6">
              <button className="py-4 text-sm font-semibold border-b-2 border-cyan-500 neon-text-cyan">
                Perp Positions ({positions.length})
              </button>
              <button className="py-4 text-sm text-gray-300 hover:text-white transition">
                Open Orders (0)
              </button>
              <button className="py-4 text-sm text-gray-300 hover:text-white transition">
                Recent Fills
              </button>
              <button className="py-4 text-sm text-gray-300 hover:text-white transition">
                Completed Trades
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {positions.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-200 text-sm border-b border-white/10">
                    <th className="px-6 py-4 font-semibold">Symbol</th>
                    <th className="px-6 py-4 font-semibold">Position Value</th>
                    <th className="px-6 py-4 font-semibold">uPnL</th>
                    <th className="px-6 py-4 font-semibold">Entry Price</th>
                    <th className="px-6 py-4 font-semibold">Mark Price</th>
                    <th className="px-6 py-4 font-semibold">Liq. Price</th>
                    <th className="px-6 py-4 font-semibold">Margin</th>
                    <th className="px-6 py-4 font-semibold">Funding</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            position.side === 'LONG'
                              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30'
                              : 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {position.side}
                          </span>
                          <span className="font-bold neon-text-cyan">{position.symbol}</span>
                          <span className="text-gray-300 text-sm">
                            {position.leverage}x
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold">$ {position.positionValue.toLocaleString()}</div>
                        <div className="text-gray-300 text-sm">{position.size} {position.symbol.replace('USDT', '')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-bold text-lg ${position.unrealizedPnl >= 0 ? 'neon-text-cyan' : 'text-red-400'}`}>
                          $ {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)}
                        </div>
                        <div className={`text-sm ${position.pnlPercent >= 0 ? 'text-cyan-300' : 'text-red-300'}`}>
                          {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-200">$ {position.entryPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 font-semibold">$ {position.markPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-yellow-400">$ {position.liqPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-200">$ {position.margin.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={position.fundingCost >= 0 ? 'text-green-400' : 'text-red-400'}>
                          $ {position.fundingCost >= 0 ? '+' : ''}{position.fundingCost.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-20 text-center">
                <div className="text-6xl mb-4 opacity-20">📊</div>
                <p className="text-gray-300 text-lg">No open positions</p>
                <p className="text-gray-400 text-sm mt-2">Start trading to see your positions here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
