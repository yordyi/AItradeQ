# 🏆 Alpha Arena - Next.js Full-Stack AI Trading System

现代化的多AI模型加密货币交易竞技场，基于Next.js 15构建。

## ✨ 系统特性

### 已完成 ✅
- [x] **现代化架构**: Next.js 15 + TypeScript + PostgreSQL
- [x] **Binance集成**: 完整的REST API客户端（HMAC签名认证）
- [x] **实时WebSocket**: 市场数据流（价格、OI、资金费率）
- [x] **DeepSeek AI**: 智能交易决策引擎
- [x] **数据库设计**: Prisma ORM + PostgreSQL schema
- [x] **项目架构**: 完整的文件结构和类型定义

### 待实现 📋
- [ ] 多AI模型支持（OpenAI, Claude）
- [ ] 交易引擎和订单执行
- [ ] 回测模块
- [ ] React仪表板UI
- [ ] 速率限制和错误处理
- [ ] API路由实现
- [ ] Vercel部署配置
- [ ] 单元和集成测试

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js App Router                     │
├─────────────────────────────────────────────────────────┤
│  React Frontend        │      API Routes (Backend)      │
│  - Dashboard           │      - /api/binance/*          │
│  - Real-time Charts    │      - /api/ai/*               │
│  - Trade Logs          │      - /api/trading/*          │
│  - Leaderboard         │                                 │
└──────────┬──────────────┴────────────────┬──────────────┘
           │                               │
      WebSocket                       REST API
           │                               │
    ┌──────▼───────┐              ┌────────▼───────┐
    │   Binance    │              │   DeepSeek     │
    │  WebSocket   │              │      API       │
    │  (市场数据)    │              │   (AI决策)      │
    └──────────────┘              └────────────────┘
           │
    ┌──────▼───────────────────────────┐
    │        PostgreSQL Database        │
    │  - AI Models                      │
    │  - Accounts & Positions           │
    │  - Trade History                  │
    │  - Performance Metrics            │
    └───────────────────────────────────┘
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 14+
- Binance Futures API密钥
- DeepSeek API密钥

### 安装步骤

```bash
# 1. 克隆项目
cd /Volumes/Samsung/AlphaArena/alpha-arena-nextjs

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的API密钥

# 4. 设置数据库
npx prisma generate
npx prisma db push

# 5. 运行开发服务器
npm run dev
```

访问 http://localhost:3000

## ⚙️ 环境变量配置

创建 `.env.local` 文件：

```env
# Binance API
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
BINANCE_TESTNET=false

# AI APIs
DEEPSEEK_API_KEY=sk-your-deepseek-key
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/alpha_arena

# Security
JWT_SECRET=your-random-secret-key-here
API_SECRET_KEY=another-random-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## 📊 核心功能

### 1. Binance Futures API集成

**文件**: `lib/binance/client.ts`

```typescript
import { BinanceClient } from '@/lib/binance/client';

const client = new BinanceClient({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
});

// 获取账户信息
const account = await client.getAccountInfo();

// 开多单
await client.openLong('BTCUSDT', 0.001, 10); // 0.001 BTC, 10x杠杆

// 获取实时价格
const price = await client.getCurrentPrice('BTCUSDT');
```

### 2. WebSocket实时数据流

**文件**: `lib/binance/websocket.ts`

```typescript
import { BinanceWebSocketClient } from '@/lib/binance/websocket';

const wsClient = BinanceWebSocketClient.createMultiStream(
  ['BTCUSDT', 'ETHUSDT'],
  false
);

wsClient.subscribe('BTCUSDT', (data) => {
  console.log('实时价格:', data.price);
  console.log('24h变化:', data.priceChange24h);
  console.log('资金费率:', data.fundingRate);
});
```

### 3. DeepSeek AI决策

**文件**: `lib/ai/deepseek.ts`

```typescript
import { DeepSeekClient } from '@/lib/ai/deepseek';

const aiClient = new DeepSeekClient(process.env.DEEPSEEK_API_KEY!);

const decision = await aiClient.makeDecision({
  symbol: 'BTCUSDT',
  price: 98000,
  indicators: {
    rsi: 45,
    macd: 120,
    ema20: 97500,
    // ... 更多指标
  },
  account: {
    balance: 20,
    positions: 0,
    // ...
  },
  // ...
});

// decision = {
//   action: 'BUY',
//   confidence: 85,
//   reasoning: 'RSI超卖，MACD金叉...',
//   leverage: 15,
//   positionSize: 25
// }
```

## 🗄️ 数据库Schema

使用Prisma ORM管理PostgreSQL数据库。主要表：

- **AIModel**: AI模型配置
- **Account**: 每个模型的账户
- **Position**: 持仓
- **Trade**: 交易历史
- **AIDecision**: AI决策日志
- **PerformanceSnapshot**: 性能快照

查看完整schema: `prisma/schema.prisma`

## 📁 项目结构

```
alpha-arena-nextjs/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   │   ├── binance/        # Binance API端点
│   │   ├── ai/             # AI决策端点
│   │   └── trading/        # 交易执行端点
│   ├── dashboard/          # 仪表板页面
│   └── layout.tsx          # 根布局
├── components/             # React组件
├── lib/                    # 核心库
│   ├── binance/            # Binance客户端 ✅
│   ├── ai/                 # AI客户端 ✅
│   ├── trading/            # 交易引擎
│   ├── indicators/         # 技术指标
│   └── db/                 # 数据库工具
├── prisma/
│   └── schema.prisma       # 数据库Schema ✅
├── package.json            # 依赖配置 ✅
└── README.md               # 本文档
```

## 🔐 安全最佳实践

1. **API密钥**: 永远不要提交到Git
2. **环境变量**: 使用`.env.local`存储敏感信息
3. **HTTPS**: 生产环境强制HTTPS
4. **速率限制**: 实现API速率限制
5. **输入验证**: 验证所有用户输入
6. **错误处理**: 不暴露敏感错误信息

## 📈 性能优化

- **WebSocket连接池**: 复用WebSocket连接
- **数据库索引**: 对常查询字段建索引
- **缓存**: 使用Redis缓存市场数据
- **Server Components**: 利用Next.js服务端组件
- **并发限制**: 限制并发API请求

## 🧪 测试

```bash
# 单元测试
npm run test

# 集成测试
npm run test:integration

# E2E测试
npm run test:e2e

# 回测（使用历史数据）
npm run backtest
```

## 🚀 部署到Vercel

```bash
# 1. 安装Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod
```

**重要**: 在Vercel dashboard配置环境变量。

## 🔄 从Python系统迁移

当前Python系统将继续运行，新Next.js系统作为升级版并行开发。

**迁移路径**:
1. ✅ 完成Next.js核心库（Binance, AI, Database）
2. 🔄 实现交易引擎和API路由
3. 🔄 构建React仪表板
4. 🔄 数据迁移（从JSON到PostgreSQL）
5. 测试和验证
6. 切换到生产环境

## 📚 API文档

### POST /api/binance/order
创建订单（开多/开空）

### GET /api/binance/account
获取账户余额和持仓

### POST /api/ai/decide
获取AI交易决策

### GET /api/trading/models
获取所有AI模型状态

详细文档见: [API.md](./API.md)

## 🤝 贡献

欢迎贡献！请遵循以下流程：
1. Fork项目
2. 创建特性分支
3. 提交代码
4. 推送到分支
5. 创建Pull Request

## 📝 许可证

私有项目 - 所有权利保留

## 🐛 已知问题

1. 多模型基准测试框架待实现
2. 回测模块待开发
3. React仪表板UI待构建
4. 速率限制器待完善

## 🔮 路线图

### Phase 1 - 核心功能 (当前)
- [x] 项目架构设计
- [x] Binance API集成
- [x] WebSocket实时数据
- [x] DeepSeek AI集成
- [x] 数据库设计

### Phase 2 - 交易引擎
- [ ] 订单执行器
- [ ] 风险管理器
- [ ] 仓位管理器
- [ ] 多模型框架

### Phase 3 - 前端界面
- [ ] React仪表板
- [ ] 实时图表
- [ ] 交易日志
- [ ] 模型排行榜

### Phase 4 - 高级功能
- [ ] 回测系统
- [ ] 策略优化
- [ ] 告警系统
- [ ] 移动端支持

## 📧 联系

问题和建议: [GitHub Issues](https://github.com/yourrepo/issues)

---

**注意**: 这是一个实盘交易系统，涉及真实资金。请务必：
- 从小额资金开始测试
- 使用Binance测试网进行开发
- 设置合理的风险限制
- 监控系统性能
- 定期备份数据
