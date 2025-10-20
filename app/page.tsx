import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen animated-gradient-bg text-white overflow-hidden relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl float-animation" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl float-animation" style={{ animationDelay: '4s' }} />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <div className="liquid-glass px-6 py-2 inline-block">
              <span className="neon-text-cyan text-sm font-semibold">AI-Powered Crypto Trading</span>
            </div>
          </div>

          <h1 className="text-7xl md:text-8xl font-bold mb-6">
            <span className="gradient-text-glow">Alpha Arena</span>
          </h1>

          <p className="text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
            DeepSeek AI 驱动的加密货币量化交易系统
          </p>
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            结合 Apple Liquid Glass 美学与 Web3 科技感，打造极致交易体验
          </p>

          <div className="flex gap-6 justify-center flex-wrap">
            <Link href="/dashboard" className="neon-button text-lg">
              🚀 进入仪表板
            </Link>
            <a
              href="https://github.com/yordyi/AItradeQ"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button text-lg"
            >
              ⭐ GitHub
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <FeatureCard
            icon="🤖"
            title="DeepSeek V3 AI"
            description="强大的 AI 决策引擎，基于深度学习分析市场趋势"
            glowColor="cyan"
          />
          <FeatureCard
            icon="📊"
            title="技术分析"
            description="9 种专业技术指标：RSI, MACD, EMA, 布林带等"
            glowColor="purple"
          />
          <FeatureCard
            icon="⚡"
            title="实时交易"
            description="Binance WebSocket 实时数据流，毫秒级响应"
            glowColor="pink"
          />
          <FeatureCard
            icon="🛡️"
            title="风险控制"
            description="自动止损止盈，智能仓位管理"
            glowColor="cyan"
          />
          <FeatureCard
            icon="📈"
            title="回测系统"
            description="历史数据验证策略，详细性能分析报告"
            glowColor="purple"
          />
          <FeatureCard
            icon="💾"
            title="数据持久化"
            description="PostgreSQL 数据库，完整的交易历史记录"
            glowColor="pink"
          />
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          <StatCard label="交易引擎" value="生产级" gradient="from-cyan-500 to-blue-500" />
          <StatCard label="AI 模型" value="DeepSeek V3" gradient="from-purple-500 to-pink-500" />
          <StatCard label="技术指标" value="9+" gradient="from-pink-500 to-rose-500" />
          <StatCard label="代码行数" value="4300+" gradient="from-blue-500 to-cyan-500" />
        </div>

        {/* Tech Stack Showcase */}
        <div className="liquid-glass p-10 mb-20">
          <h2 className="text-4xl font-bold mb-8 text-center">
            <span className="gradient-text">现代化技术栈</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <TechItem icon="⚛️" name="Next.js 15" desc="App Router + React 19" />
            <TechItem icon="🔷" name="TypeScript" desc="完整类型安全" />
            <TechItem icon="🗄️" name="PostgreSQL" desc="Prisma ORM" />
            <TechItem icon="📡" name="WebSocket" desc="实时数据流" />
            <TechItem icon="🎨" name="Tailwind CSS" desc="Liquid Glass UI" />
            <TechItem icon="🔐" name="HMAC 认证" desc="企业级安全" />
          </div>
        </div>

        {/* Quick Start Section */}
        <div className="neon-glass-card p-10">
          <h2 className="text-4xl font-bold mb-8 text-center">
            <span className="neon-text-purple">快速开始</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Step number="1" text="配置环境变量 (.env.local)" />
              <Step number="2" text="npm install - 安装依赖" />
              <Step number="3" text="npm run dev - 启动开发服务器" />
              <Step number="4" text="npm run backtest - 运行策略回测" />
            </div>
            <div className="glass-card p-6">
              <div className="text-sm text-gray-400 mb-2 font-mono">$ cat .env.local</div>
              <pre className="text-xs text-cyan-300 font-mono bg-black/30 p-4 rounded-lg overflow-x-auto">
{`BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
DEEPSEEK_API_KEY=sk-xxx
DATABASE_URL=postgresql://...`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center">
          <div className="glass-card inline-block px-8 py-4">
            <p className="text-gray-400 text-sm">
              Built with ❤️ using{' '}
              <span className="neon-text-cyan">Apple Liquid Glass</span> +{' '}
              <span className="neon-text-purple">Web3</span> Design
            </p>
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
  glowColor,
}: {
  icon: string;
  title: string;
  description: string;
  glowColor: 'cyan' | 'purple' | 'pink';
}) {
  const glowClass = `glow-${glowColor}`;

  return (
    <div className={`glass-card-hover p-8 ${glowClass}`}>
      <div className="text-5xl mb-4 float-animation">{icon}</div>
      <h3 className="text-2xl font-bold mb-3 gradient-text">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  gradient
}: {
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className="liquid-glass p-6 text-center group hover:scale-105 transition-transform duration-300">
      <div className={`text-4xl font-bold mb-3 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
        {value}
      </div>
      <div className="text-gray-400 text-sm uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-4 glass-card p-4 hover:bg-white/10 transition-all duration-300">
      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 glow-cyan">
        {number}
      </div>
      <div className="text-lg font-medium">{text}</div>
    </div>
  );
}

function TechItem({
  icon,
  name,
  desc
}: {
  icon: string;
  name: string;
  desc: string;
}) {
  return (
    <div className="glass-card p-4 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="font-bold text-lg neon-text-cyan">{name}</span>
      </div>
      <p className="text-sm text-gray-400 pl-11">{desc}</p>
    </div>
  );
}
