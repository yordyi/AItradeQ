# 🚀 Alpha Arena Next.js - 快速入门指南

## ⚡ 5分钟快速开始

### 步骤1: 安装依赖

```bash
cd /Volumes/Samsung/AlphaArena/alpha-arena-nextjs
npm install
```

### 步骤2: 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 复制你Python系统中的API密钥
BINANCE_API_KEY=QxrZTEurayg3VYbA4sT6Qk1C2zLd1lX5bMF2tV1aKmI40gZSQjWxAovrBEIdkBwd
BINANCE_API_SECRET=sFONmPmdVFV6zVGHjxLJWUUZLFEaRLIUHnglsFJg8Qro5BMAxmZ5Mvsq04PP8L8q
BINANCE_TESTNET=false

DEEPSEEK_API_KEY=sk-3c3bd887afb54e0ab863d16f8ab2fc14

DATABASE_URL=postgresql://postgres:password@localhost:5432/alpha_arena

JWT_SECRET=your-random-secret-here
API_SECRET_KEY=another-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 步骤3: 设置PostgreSQL

```bash
# 安装PostgreSQL（如果还没有）
brew install postgresql
brew services start postgresql

# 创建数据库
createdb alpha_arena

# 运行迁移
npx prisma generate
npx prisma db push

# 查看数据库（可选）
npx prisma studio
```

### 步骤4: 测试核心功能

创建测试文件 `test.ts`:

```typescript
import { BinanceClient } from './lib/binance/client';
import { DeepSeekClient } from './lib/ai/deepseek';
import { TradingEngine } from './lib/trading/engine';

async function test() {
  // 1. 测试Binance连接
  console.log('📡 测试Binance连接...');
  const binance = new BinanceClient({
    apiKey: process.env.BINANCE_API_KEY!,
    apiSecret: process.env.BINANCE_API_SECRET!,
  });

  const account = await binance.getAccountInfo();
  console.log('✅ 账户余额:', account.balance);
  console.log('✅ 持仓数:', account.positions.length);

  // 2. 测试DeepSeek AI
  console.log('\n🤖 测试DeepSeek AI...');
  const ai = new DeepSeekClient(process.env.DEEPSEEK_API_KEY!);

  const decision = await ai.makeDecision({
    symbol: 'BTCUSDT',
    price: 98000,
    indicators: {
      rsi: 45,
      macd: 120,
      ema20: 97500,
    },
    account: {
      balance: 20,
      positions: 0,
      totalValue: 20,
      unrealizedPnL: 0,
    },
    performance: {
      totalReturn: 0,
      sharpeRatio: 0,
      winRate: 0,
      totalTrades: 0,
    },
    metadata: {
      timestamp: Date.now(),
      wakeupCount: 1,
    },
  });

  console.log('✅ AI决策:', decision.action);
  console.log('✅ 信心度:', decision.confidence);
  console.log('✅ 理由:', decision.reasoning);

  // 3. 测试交易引擎（不实际下单）
  console.log('\n🚀 测试交易引擎...');
  const engine = new TradingEngine({
    symbol: 'BTCUSDT',
    modelId: 'deepseek-test',
    modelName: 'DeepSeek-V3 Test',
    aiProvider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY!,
    binanceApiKey: process.env.BINANCE_API_KEY!,
    binanceApiSecret: process.env.BINANCE_API_SECRET!,
    minConfidence: 65,
  });

  const stats = engine.getStats();
  console.log('✅ 引擎状态:', stats);
}

test().catch(console.error);
```

运行测试：

```bash
npx tsx test.ts
```

---

## 📚 使用示例

### 示例1: 获取市场数据

```typescript
import { BinanceClient } from './lib/binance/client';

const binance = new BinanceClient({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
});

// 获取当前价格
const price = await binance.getCurrentPrice('BTCUSDT');
console.log('BTC价格:', price);

// 获取K线数据
const klines = await binance.getKlines('BTCUSDT', '1h', 100);
console.log('最近100根1小时K线:', klines);

// 获取账户信息
const account = await binance.getAccountInfo();
console.log('余额:', account.balance);
console.log('持仓:', account.positions);
```

### 示例2: 实时WebSocket数据

```typescript
import { BinanceWebSocketClient } from './lib/binance/websocket';

const ws = BinanceWebSocketClient.createMultiStream(
  ['BTCUSDT', 'ETHUSDT'],
  false
);

ws.subscribe('BTCUSDT', (data) => {
  console.log('实时价格:', data.price);
  console.log('24h变化:', data.priceChange24h);
  console.log('资金费率:', data.fundingRate);
});

// 程序会持续接收实时数据
```

### 示例3: AI决策

```typescript
import { DeepSeekClient } from './lib/ai/deepseek';

const ai = new DeepSeekClient(process.env.DEEPSEEK_API_KEY!);

const decision = await ai.makeDecision({
  symbol: 'BTCUSDT',
  price: 98000,
  indicators: {
    rsi: 35, // 超卖
    macd: -50,
    ema20: 97500,
    ema50: 96000,
  },
  account: {
    balance: 20,
    positions: 0,
    totalValue: 20,
    unrealizedPnL: 0,
  },
  performance: {
    totalReturn: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
  },
  metadata: {
    timestamp: Date.now(),
    wakeupCount: 1,
  },
});

if (decision.action === 'BUY' && decision.confidence > 70) {
  console.log('✅ 强买信号!');
  console.log('理由:', decision.reasoning);
  console.log('建议杠杆:', decision.leverage);
  console.log('建议仓位:', decision.positionSize);
}
```

### 示例4: 计算技术指标

```typescript
import { calculateAllIndicators } from './lib/indicators/technical';
import { BinanceClient } from './lib/binance/client';

const binance = new BinanceClient({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
});

// 获取K线
const klines = await binance.getKlines('BTCUSDT', '1h', 200);

// 转换格式
const data = klines.map((k) => ({
  open: parseFloat(k.open),
  high: parseFloat(k.high),
  low: parseFloat(k.low),
  close: parseFloat(k.close),
  volume: parseFloat(k.volume),
  timestamp: k.openTime,
}));

// 计算所有指标
const indicators = calculateAllIndicators(data);

console.log('最新RSI:', indicators.rsi[indicators.rsi.length - 1]);
console.log('MACD:', indicators.macd.macd[indicators.macd.macd.length - 1]);
console.log('趋势:', indicators.trend); // UPTREND/DOWNTREND/SIDEWAYS
console.log('支撑位:', indicators.supportResistance.support);
console.log('阻力位:', indicators.supportResistance.resistance);
```

### 示例5: 完整交易循环

```typescript
import { TradingEngine } from './lib/trading/engine';

const engine = new TradingEngine({
  symbol: 'BTCUSDT',
  modelId: 'deepseek-prod',
  modelName: 'DeepSeek-V3',
  aiProvider: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY!,
  binanceApiKey: process.env.BINANCE_API_KEY!,
  binanceApiSecret: process.env.BINANCE_API_SECRET!,
  minConfidence: 70,
  tradingInterval: 300, // 5分钟
});

// 执行一次交易循环
const result = await engine.executeTradingCycle();

if (result.success) {
  console.log('✅ 交易循环完成');
  console.log('动作:', result.action);

  if (result.decision) {
    console.log('AI决策:', result.decision.action);
    console.log('信心度:', result.decision.confidence);
    console.log('理由:', result.decision.reasoning);
  }

  if (result.order) {
    console.log('订单已执行:', result.order);
  }
} else {
  console.error('❌ 错误:', result.error);
}

// 持续运行（每5分钟）
setInterval(async () => {
  await engine.executeTradingCycle();
}, 5 * 60 * 1000);
```

---

## 🛠️ 开发工具

### Prisma Studio（数据库管理）

```bash
# 启动Prisma Studio
npx prisma studio
```

在浏览器打开 `http://localhost:5555`，可以查看和编辑数据库。

### TypeScript编译检查

```bash
# 检查类型错误
npx tsc --noEmit
```

### 代码格式化

```bash
# 安装Prettier
npm install -D prettier

# 格式化代码
npx prettier --write .
```

---

## 🐛 故障排除

### 问题1: PostgreSQL连接失败

```bash
# 检查PostgreSQL是否运行
brew services list

# 启动PostgreSQL
brew services start postgresql

# 测试连接
psql -U postgres -d alpha_arena
```

### 问题2: Binance API错误

```
Error: Invalid API-key, IP, or permissions for action
```

**解决**:
1. 检查`.env.local`中的API密钥是否正确
2. 确认API密钥有Futures交易权限
3. 如果使用IP白名单，添加你的IP

### 问题3: DeepSeek API超限

```
Error: Rate limit exceeded
```

**解决**:
- 系统已内置速率限制器，会自动等待
- 如果频繁超限，增加`tradingInterval`

### 问题4: 模块导入错误

```
Cannot find module...
```

**解决**:
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新生成Prisma客户端
npx prisma generate
```

---

## 📊 监控和日志

### 查看错误日志

```typescript
import { ErrorLogger } from './lib/utils/error-handler';

// 获取最近50个错误
const errors = ErrorLogger.getRecent(50);
console.log('最近错误:', errors);

// 获取错误统计
const stats = ErrorLogger.getStats();
console.log('错误统计:', stats);
```

### 检查速率限制状态

```typescript
import { rateLimitManager } from './lib/utils/rate-limiter';

// Binance剩余权重
const binanceLimiter = rateLimitManager.getBinanceLimiter();
console.log('剩余权重:', binanceLimiter.getRemainingWeight());

// DeepSeek速率状态
const aiLimiter = rateLimitManager.getAILimiter('deepseek');
const canProceed = await aiLimiter.checkLimit('test');
console.log('可以调用AI:', canProceed);
```

---

## 🎯 下一步

1. **测试所有功能**: 运行上面的示例确保一切正常
2. **添加日志**: 集成Winston或Pino进行结构化日志
3. **实现API路由**: 创建`app/api/`下的endpoint
4. **构建UI**: 开始开发React仪表板
5. **添加测试**: 使用Jest编写单元测试

---

## 📞 需要帮助?

查看文档:
- `README.md` - 完整项目文档
- `PROJECT_STRUCTURE.md` - 架构说明
- `IMPLEMENTATION_STATUS.md` - 功能状态
- `FINAL_SUMMARY.md` - 总结报告

---

**🎉 现在你可以开始使用新的Next.js系统了！**

祝交易顺利！🚀💰
