# Alpha Arena Next.js - 项目架构文档

## 🎯 系统概述

基于Next.js 15+的全栈AI交易系统，模仿nof1.ai的Alpha Arena，支持多AI模型自主交易加密货币永续合约。

## 📁 项目结构

```
alpha-arena-nextjs/
├── app/                          # Next.js 15 App Router
│   ├── api/                      # API Routes (后端)
│   │   ├── binance/
│   │   │   ├── account/route.ts      # 获取账户余额/仓位
│   │   │   ├── order/route.ts        # 下单/平仓
│   │   │   ├── klines/route.ts       # 历史K线数据
│   │   │   └── websocket/route.ts    # WebSocket连接管理
│   │   ├── ai/
│   │   │   ├── deepseek/route.ts     # DeepSeek决策
│   │   │   ├── openai/route.ts       # OpenAI决策
│   │   │   └── claude/route.ts       # Claude决策
│   │   ├── trading/
│   │   │   ├── execute/route.ts      # 执行交易
│   │   │   ├── models/route.ts       # 获取所有模型状态
│   │   │   └── backtest/route.ts     # 回测
│   │   └── webhook/
│   │       └── binance/route.ts      # Binance Webhook处理
│   ├── dashboard/                # 主仪表板页面
│   │   ├── page.tsx              # 公共视图
│   │   └── admin/page.tsx        # 管理员视图
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页
│   └── globals.css               # 全局样式
│
├── components/                   # React组件
│   ├── dashboard/
│   │   ├── ModelCard.tsx         # AI模型卡片
│   │   ├── PnLChart.tsx          # 盈亏图表
│   │   ├── TradeLog.tsx          # 交易日志
│   │   ├── LeaderBoard.tsx       # 排行榜
│   │   └── RealTimePrice.tsx     # 实时价格
│   ├── ui/                       # shadcn/ui组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── chart.tsx
│   └── providers/
│       └── WebSocketProvider.tsx # WebSocket上下文
│
├── lib/                          # 核心库
│   ├── binance/
│   │   ├── client.ts             # Binance REST API客户端
│   │   ├── websocket.ts          # Binance WebSocket客户端
│   │   ├── signature.ts          # HMAC签名
│   │   └── types.ts              # TypeScript类型
│   ├── ai/
│   │   ├── base.ts               # AI模型基类
│   │   ├── deepseek.ts           # DeepSeek客户端
│   │   ├── openai.ts             # OpenAI客户端
│   │   ├── claude.ts             # Claude客户端
│   │   ├── prompt.ts             # Prompt生成器
│   │   └── parser.ts             # 响应解析器
│   ├── trading/
│   │   ├── engine.ts             # 交易引擎核心
│   │   ├── executor.ts           # 订单执行器
│   │   ├── risk-manager.ts       # 风险管理
│   │   ├── position-manager.ts   # 仓位管理
│   │   └── backtest.ts           # 回测引擎
│   ├── indicators/
│   │   ├── technical.ts          # 技术指标 (EMA, MACD, RSI)
│   │   └── market.ts             # 市场指标 (OI, 资金费率)
│   ├── db/
│   │   ├── client.ts             # PostgreSQL客户端
│   │   ├── schema.ts             # Prisma Schema
│   │   ├── queries.ts            # 查询函数
│   │   └── migrations/           # 数据库迁移
│   ├── utils/
│   │   ├── rate-limiter.ts       # 速率限制器
│   │   ├── error-handler.ts      # 错误处理
│   │   ├── logger.ts             # 日志系统
│   │   └── retry.ts              # 重试逻辑
│   └── config.ts                 # 配置管理
│
├── workers/                      # 后台任务
│   ├── trading-loop.ts           # 主交易循环
│   ├── websocket-manager.ts      # WebSocket管理器
│   └── performance-tracker.ts    # 性能追踪
│
├── prisma/
│   └── schema.prisma             # 数据库Schema
│
├── public/                       # 静态资源
│   └── assets/
│
├── types/                        # TypeScript类型定义
│   ├── binance.ts
│   ├── ai.ts
│   └── trading.ts
│
├── .env.local                    # 环境变量
├── .env.example                  # 环境变量示例
├── next.config.js                # Next.js配置
├── tsconfig.json                 # TypeScript配置
├── tailwind.config.ts            # Tailwind配置
├── package.json                  # 依赖
├── vercel.json                   # Vercel部署配置
└── README.md                     # 项目文档
```

## 🔧 技术栈

### 前端
- **Next.js 15**: App Router, Server Components, Server Actions
- **React 18**: UI框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式
- **shadcn/ui**: UI组件库
- **Recharts**: 图表
- **WebSocket**: 实时数据

### 后端
- **Next.js API Routes**: RESTful API
- **Node.js**: 运行时
- **Prisma**: ORM
- **PostgreSQL**: 主数据库
- **WebSocket**: 实时通信

### 交易
- **binance-api-node**: Binance API客户端
- **ws**: WebSocket客户端
- **crypto**: HMAC签名

### AI
- **DeepSeek API**: 主要决策引擎
- **OpenAI SDK**: GPT模型
- **Anthropic SDK**: Claude模型

### 开发工具
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Husky**: Git Hooks
- **Jest**: 单元测试

## 🔑 核心功能

### 1. 多模型基准测试
- 同时运行多个AI模型（DeepSeek, GPT-4, Claude等）
- 每个模型独立账户（$20初始资金）
- 实时性能对比和排行榜

### 2. 实时交易
- Binance Futures API集成
- WebSocket实时市场数据（价格、OI、资金费率）
- 自动订单执行（多头/空头/平仓）
- 风险管理（杠杆限制、仓位大小、止损止盈）

### 3. AI决策系统
- Prompt生成：市场信号 + 账户状态 + 历史表现
- 响应解析：行动（BUY/SELL/HOLD/CLOSE）+ 理由
- 多提供商支持（DeepSeek优先）

### 4. 回测
- 历史K线数据回放
- 模拟订单执行
- 性能指标计算（Sharpe、最大回撤、胜率）

### 5. 实时仪表板
- 公共视图：模型排行榜、实时交易、PnL图表
- 管理员视图：AI日志、系统状态、手动控制
- WebSocket实时更新

### 6. 安全与错误处理
- 环境变量存储敏感信息
- HTTPS/TLS加密
- 输入验证和清理
- 速率限制管理（Binance权重、AI API限制）
- 指数退避重试
- 错误日志和告警

## 📊 数据流

```
Market Data (Binance WebSocket)
    ↓
Technical Indicators Calculation
    ↓
AI Decision Request (DeepSeek API)
    ↓
Risk Management Validation
    ↓
Order Execution (Binance API)
    ↓
Database Storage (PostgreSQL)
    ↓
Real-time Dashboard Update (WebSocket)
```

## 🚀 部署架构

### Vercel (推荐)
- Next.js应用托管
- Edge Functions用于API
- 自动CI/CD
- 环境变量管理

### 外部服务
- **Supabase/Neon**: PostgreSQL数据库
- **Upstash**: Redis缓存（可选）
- **Sentry**: 错误监控
- **LogTail**: 日志聚合

## 🔐 环境变量

```env
# Binance
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
BINANCE_TESTNET=false

# AI APIs
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Security
JWT_SECRET=random_secret
API_SECRET_KEY=random_secret

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

## 📈 性能指标

系统追踪以下指标：
- 总回报率 (%)
- Sharpe比率
- 最大回撤 (%)
- 胜率 (%)
- 平均持仓时间
- 交易次数
- 手续费
- AI决策延迟
- API响应时间

## 🧪 测试策略

1. **单元测试**: 核心逻辑（指标、风险管理）
2. **集成测试**: API路由、数据库查询
3. **E2E测试**: 完整交易流程（使用测试网）
4. **回测验证**: 历史数据验证策略

## 🛠️ 开发流程

1. 克隆仓库
2. 安装依赖: `npm install`
3. 配置环境变量: `.env.local`
4. 数据库迁移: `npx prisma migrate dev`
5. 运行开发服务器: `npm run dev`
6. 访问: `http://localhost:3000`

## 📝 API文档

### GET /api/trading/models
返回所有AI模型的状态和性能

### POST /api/trading/execute
执行交易决策

### POST /api/binance/order
下单（多头/空头）

### GET /api/binance/account
获取账户余额和仓位

### WebSocket /api/binance/websocket
实时市场数据流

详细API文档见 `API.md`
