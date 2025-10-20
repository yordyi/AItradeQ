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
    } catch (err) {
      console.error('Failed to fetch:', err);
      setIsLoading(false);
    }
  };

  const longPositions = positions.filter(p => p.side === 'LONG');
  const shortPositions = positions.filter(p => p.side === 'SHORT');
  const longValue = longPositions.reduce((sum, p) => sum + p.positionValue, 0);
  const shortValue = shortPositions.reduce((sum, p) => sum + p.positionValue, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const roe = account ? (totalPnl / (account.totalBalance - totalPnl)) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e13] flex items-center justify-center">
        <div className="text-white text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] text-white">
      {/* 顶部导航栏 */}
      <header className="bg-[#101419] border-b border-gray-800">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-bold">
                  A
                </div>
                <span className="text-xl font-bold">Alpha Arena</span>
              </Link>
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/" className="text-gray-400 hover:text-white">Discover</Link>
                <button className="text-white font-semibold">Dashboard</button>
                <button className="text-gray-400 hover:text-white">Copy Trading</button>
                <button className="text-gray-400 hover:text-white">Analytics</button>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition">
                Deposit
              </button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-semibold transition">
                Create Wallet
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <div className="p-6">
        {/* 账户信息栏 */}
        <div className="bg-[#13171d] rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
            <div>
              <div className="text-sm text-gray-400">Your Account</div>
              <div className="font-mono text-lg">Alpha Trading Bot</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-[#1a1f26] hover:bg-[#1f2530] rounded-lg text-sm transition flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Real-time Data
            </button>
            <button className="px-4 py-2 bg-[#1a1f26] hover:bg-[#1f2530] rounded-lg text-sm transition">
              Trading Statistics
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition">
              Copy Trading
            </button>
          </div>
        </div>

        {/* 4个圆环图卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <DonutCard
            title="Account Total Value"
            value={`$ ${account?.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subItems={[
              { label: 'Perpetual', value: `$ ${account?.totalBalance.toLocaleString()}`, color: 'bg-blue-500' },
              { label: 'Spot', value: '$ 0', color: 'bg-gray-600' }
            ]}
            percentage={100}
            color="blue"
          />

          <DonutCard
            title="Free margin available"
            value={`$ ${account?.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subItems={[
              { label: 'Withdrawable', value: `${((account?.availableBalance || 0) / (account?.totalBalance || 1) * 100).toFixed(2)} %`, color: 'bg-gray-600' }
            ]}
            percentage={((account?.availableBalance || 0) / (account?.totalBalance || 1) * 100)}
            color="gray"
          />

          <DonutCard
            title="Total Position Value"
            value={`$ ${account?.totalPositionValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subItems={[
              { label: 'Leverage Ratio', value: `${(account?.leverage || 0).toFixed(2)}%`, color: 'bg-yellow-500' }
            ]}
            percentage={20}
            color="yellow"
          />

          <div className="bg-[#13171d] rounded-xl p-6 border border-gray-800">
            <div className="text-sm text-gray-400 mb-2">Feature</div>
            <div className="text-xl font-bold mb-4">DeepSeek AI</div>
            <div className="text-sm text-gray-400 mb-4">Real-time Tracking · Quick View</div>
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-blue-500 rounded" />
                <div className="w-1 h-4 bg-blue-500 rounded" />
                <div className="w-1 h-4 bg-blue-500 rounded" />
              </div>
              Provide data support
            </div>
          </div>
        </div>

        {/* 主要内容区域 - 2栏布局 */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* 左侧统计栏 */}
          <div className="col-span-3 space-y-4">
            {/* Perp Total Value */}
            <div className="bg-[#13171d] rounded-xl p-6 border border-gray-800">
              <div className="text-sm text-gray-400 mb-2">Perp Total Value</div>
              <div className="text-3xl font-bold mb-4">
                $ {account?.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-400 mb-2">Margin Used Ratio</div>
              <div className="mb-1">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${account?.marginRatio || 0}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-cyan-400 font-semibold">{(account?.marginRatio || 0).toFixed(2)} %</div>
            </div>

            {/* Direction Bias */}
            <div className="bg-[#13171d] rounded-xl p-6 border border-gray-800">
              <div className="text-sm text-gray-400 mb-3">Direction Bias</div>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-green-400 text-sm font-semibold">↗ Long</div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-2">Long Exposure</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                      style={{ width: `${(longValue / (longValue + shortValue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-green-400 font-semibold">
                  {((longValue / (longValue + shortValue || 1)) * 100).toFixed(2)} %
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-2">Short Exposure</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-red-500 to-rose-400 rounded-full"
                      style={{ width: `${(shortValue / (longValue + shortValue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-red-400 font-semibold">
                  {((shortValue / (longValue + shortValue || 1)) * 100).toFixed(2)} %
                </div>
              </div>
            </div>

            {/* ROE & uPnL */}
            <div className="bg-[#13171d] rounded-xl p-6 border border-gray-800">
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">ROE</div>
                <div className={`text-2xl font-bold ${roe >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {roe >= 0 ? '+' : ''}{roe.toFixed(2)} %
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">uPnL</div>
                <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  $ {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧大图表区域 */}
          <div className="col-span-9">
            <div className="bg-[#13171d] rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Current Positions</div>
                    <div className={`text-3xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      $ {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-[#1a1f26] rounded-lg text-sm">1W</button>
                    <button className="px-3 py-1.5 bg-[#1a1f26] rounded-lg text-sm">Perp Only</button>
                    <button className="px-3 py-1.5 bg-[#1a1f26] rounded-lg text-sm">Total PnL</button>
                  </div>
                </div>
              </div>

              {/* 图表占位 */}
              <div className="h-64 bg-gradient-to-b from-transparent to-red-500/5 flex items-end justify-center p-6">
                <div className="text-gray-600 text-sm">Chart placeholder - PnL over time</div>
              </div>
            </div>
          </div>
        </div>

        {/* 持仓表格 */}
        <div className="bg-[#13171d] rounded-xl border border-gray-800 overflow-hidden">
          <div className="border-b border-gray-800">
            <div className="flex px-6">
              <button className="px-4 py-4 text-sm font-semibold border-b-2 border-green-500 text-white">
                Perp Positions ({positions.length})
              </button>
              <button className="px-4 py-4 text-sm text-gray-400 hover:text-white">Open Orders (17)</button>
              <button className="px-4 py-4 text-sm text-gray-400 hover:text-white">Recent Fills</button>
              <button className="px-4 py-4 text-sm text-gray-400 hover:text-white">Completed Trades</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {positions.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-gray-800">
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
                    <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            position.side === 'LONG'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {position.side}
                          </span>
                          <span className="font-semibold">{position.symbol}</span>
                          <span className="text-gray-500 text-xs">Cross {position.leverage}x</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold">$ {position.positionValue.toLocaleString()}</div>
                        <div className="text-gray-500 text-xs">{position.size} {position.symbol.replace('USDT', '')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-bold ${position.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          $ {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)}
                        </div>
                        <div className={`text-xs ${position.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)} %
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">$ {position.entryPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 font-semibold">$ {position.markPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-yellow-400">$ {position.liqPrice.toLocaleString()}</td>
                      <td className="px-6 py-4">$ {position.margin.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={position.fundingCost >= 0 ? 'text-green-400' : 'text-red-400'}>
                          $ {position.fundingCost >= 0 ? '+' : ''}{position.fundingCost.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">--/--</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-20 text-center">
                <div className="text-gray-500">No open positions</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutCard({
  title,
  value,
  subItems,
  percentage,
  color
}: {
  title: string;
  value: string;
  subItems: Array<{label: string; value: string; color: string}>;
  percentage: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-400',
    gray: 'from-gray-600 to-gray-500',
    yellow: 'from-yellow-500 to-orange-400'
  };

  return (
    <div className="bg-[#13171d] rounded-xl p-6 border border-gray-800">
      <div className="text-sm text-gray-400 mb-2">{title}</div>
      <div className="text-2xl font-bold mb-4">{value}</div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle cx="40" cy="40" r="32" stroke="#1f2937" strokeWidth="8" fill="none" />
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 32 * (percentage / 100)} ${2 * Math.PI * 32}`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`${colorMap[color]}`} />
                <stop offset="100%" className={`${colorMap[color]}`} />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex-1 space-y-1">
          {subItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-gray-400">{item.label}</span>
              </div>
              <span className="text-white font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
