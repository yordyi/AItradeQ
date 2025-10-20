import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Alpha Arena
          </h1>
          <p className="text-2xl text-gray-300 mb-8">
            DeepSeek AI驱动的加密货币量化交易系统
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
            >
              进入仪表板
            </Link>
            <a
              href="https://github.com/yordyi/AItradeQ"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold text-lg transition-colors"
            >
              查看GitHub
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            icon="🤖"
            title="DeepSeek V3 AI"
            description="强大的AI决策引擎，基于深度学习分析市场趋势"
          />
          <FeatureCard
            icon="📊"
            title="技术分析"
            description="9种专业技术指标：RSI, MACD, EMA, 布林带等"
          />
          <FeatureCard
            icon="⚡"
            title="实时交易"
            description="Binance WebSocket实时数据流，毫秒级响应"
          />
          <FeatureCard
            icon="🛡️"
            title="风险控制"
            description="自动止损止盈，智能仓位管理"
          />
          <FeatureCard
            icon="📈"
            title="回测系统"
            description="历史数据验证策略，详细性能分析报告"
          />
          <FeatureCard
            icon="💾"
            title="数据持久化"
            description="PostgreSQL数据库，完整的交易历史记录"
          />
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <StatCard label="交易引擎" value="生产级" />
          <StatCard label="AI模型" value="DeepSeek V3" />
          <StatCard label="技术指标" value="9+" />
          <StatCard label="代码行数" value="4300+" />
        </div>

        {/* Quick Start */}
        <div className="bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-6">快速开始</h2>
          <div className="space-y-4 text-gray-300">
            <Step number="1" text="配置环境变量 (.env.local)" />
            <Step number="2" text="npm install - 安装依赖" />
            <Step number="3" text="npm run dev - 启动开发服务器" />
            <Step number="4" text="npm run backtest - 运行策略回测" />
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg hover:bg-gray-750 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg text-center">
      <div className="text-3xl font-bold text-blue-400 mb-2">{value}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
        {number}
      </div>
      <div>{text}</div>
    </div>
  );
}
