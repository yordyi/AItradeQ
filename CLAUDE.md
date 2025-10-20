# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alpha Arena is a Next.js 15 full-stack AI trading system for cryptocurrency futures trading on Binance. It features DeepSeek AI-powered decision making, real-time WebSocket market data streams, and PostgreSQL-backed data persistence. The system is designed to support multiple AI models competing in a trading arena with comprehensive performance tracking and backtesting capabilities.

**Tech Stack**: Next.js 15, TypeScript, PostgreSQL, Prisma ORM, Binance Futures API, DeepSeek AI

## Development Commands

### Core Commands
```bash
# Development
npm run dev                    # Start Next.js dev server (http://localhost:3000)
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint

# Database
npm run postinstall            # Generate Prisma client (runs automatically after npm install)
npx prisma generate            # Manually generate Prisma client
npm run prisma:push            # Push schema changes to database (npx prisma db push)
npm run prisma:studio          # Open Prisma Studio GUI for database inspection

# Trading & Backtesting
npm run worker                 # Run trading loop worker (tsx workers/trading-loop.ts)
npm run backtest              # Run backtest with historical data (tsx examples/run-backtest.ts)
```

### Database Setup
```bash
# PostgreSQL must be installed first
brew install postgresql        # macOS
brew services start postgresql

# Create database
createdb alpha_arena

# Push schema and generate client
npx prisma generate
npx prisma db push
```

## Architecture Overview

### Core Library Structure (`lib/`)

The system is built around independent, composable libraries:

**Binance Integration** (`lib/binance/`)
- `client.ts`: REST API client with HMAC SHA256 signature authentication
  - Account info, balance, positions queries
  - Order creation (MARKET, LIMIT, STOP_MARKET, TAKE_PROFIT_MARKET)
  - Leverage management, position opening/closing
  - K-line (candlestick) data retrieval
- `websocket.ts`: Real-time market data streams
  - Multi-symbol subscription support
  - Price ticker, mark price, funding rate, open interest
  - Automatic reconnection and ping/pong keep-alive

**AI Decision Making** (`lib/ai/`)
- `deepseek.ts`: DeepSeek API client for trading decisions
  - Generates structured prompts with market data, indicators, account state
  - Parses AI responses into actionable decisions (action, confidence, reasoning, parameters)
  - Returns: BUY/SELL/HOLD/CLOSE with position size, leverage, stop-loss, take-profit

**Technical Indicators** (`lib/indicators/technical.ts`)
- EMA (Exponential Moving Average), SMA (Simple Moving Average)
- RSI (Relative Strength Index), MACD, Bollinger Bands, ATR
- `calculateAllIndicators()`: Batch calculation from K-line data
- `getLatest()`: Extract most recent indicator values

**Trading Engine** (`lib/trading/engine.ts`)
- Orchestrates AI decisions, indicator calculations, order execution
- Manages cooldown periods between trades
- Position validation and risk checks
- Main trading cycle: market data → indicators → AI decision → execution

**Backtesting** (`lib/backtest/`)
- `engine.ts`: Historical data simulation engine
- `reporter.ts`: Performance metrics and report generation
- Supports stop-loss/take-profit, commission, slippage
- Calculates Sharpe ratio, max drawdown, win rate, profit factor

**Utilities** (`lib/utils/`)
- `rate-limiter.ts`: Binance API rate limit management
- `error-handler.ts`: Trading-specific error handling and validation

### Database Schema (`prisma/schema.prisma`)

Key tables and relationships:
- **AIModel**: AI model configurations (name, provider, API key, initial capital)
- **Account**: Per-model trading accounts (balance, PnL, performance metrics)
- **Position**: Open positions (symbol, side, entry price, leverage, unrealized PnL)
- **Trade**: Historical trades (price, quantity, fees, PnL, AI reasoning)
- **AIDecision**: AI decision logs (action, confidence, market data snapshot)
- **PerformanceSnapshot**: Time-series portfolio value for charting

Relationships: AIModel → Account (1:1), Account → Position (1:N), AIModel → Trade (1:N)

### Key Data Flow

1. **Trading Loop**: TradingEngine.executeTradingCycle()
   - Fetch positions → Skip if position exists
   - Gather market data (price, K-lines) → Calculate indicators
   - Get account info → Build AI input
   - AI makes decision → Validate confidence threshold
   - Execute trade via BinanceClient → Log to database

2. **Real-time Data**: BinanceWebSocketClient
   - Subscribe to symbols → Receive ticker updates
   - Parse market data → Emit events to subscribers
   - Maintain connection health (ping/pong, auto-reconnect)

3. **Backtesting**: BacktestEngine.run(klineData)
   - Iterate historical K-lines → Calculate indicators at each step
   - AI decides based on historical data → Simulate order execution
   - Track portfolio value → Calculate performance metrics
   - Generate equity curve and drawdown analysis

## Environment Variables

Required environment variables (create `.env.local`):

```env
# Binance (REQUIRED)
BINANCE_API_KEY=              # Binance Futures API key
BINANCE_API_SECRET=           # Binance Futures API secret
BINANCE_TESTNET=false         # Use testnet (true) or mainnet (false)

# AI (REQUIRED)
DEEPSEEK_API_KEY=sk-          # DeepSeek API key

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@localhost:5432/alpha_arena

# Security (REQUIRED for production)
JWT_SECRET=                   # Random 32+ character string
API_SECRET_KEY=               # Random secret for API authentication

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

See `.env.example` for the complete template.

## Important Patterns and Conventions

### Working with Binance Client

The BinanceClient uses HMAC signature authentication. All signed requests automatically include timestamp and signature:

```typescript
const client = new BinanceClient({
  apiKey: process.env.BINANCE_API_KEY!,
  apiSecret: process.env.BINANCE_API_SECRET!,
  testnet: false, // Use mainnet
});

// Get account balance
const account = await client.getAccountInfo();
// { balance: 20.5, availableBalance: 15.3 }

// Open leveraged long position
await client.openLong('BTCUSDT', 0.001, 10); // 0.001 BTC, 10x leverage

// Close all positions for symbol
await client.closeAllPositions('BTCUSDT');
```

### AI Decision Input Structure

The AI expects a comprehensive market snapshot:

```typescript
const aiInput: AIDecisionInput = {
  symbol: 'BTCUSDT',
  price: 98000,
  indicators: {
    rsi: 45,
    macd: 120,
    ema20: 97500,
    ema50: 96800,
    // ... other indicators
  },
  account: {
    balance: 20,
    positions: 0,
    totalValue: 20,
    // ... performance metrics
  },
  marketData: {
    volume24h: 1234567890,
    priceChange24h: 2.5,
    fundingRate: 0.0001,
    openInterest: 987654321,
  },
  recentPerformance: {
    totalReturn: 15.3,
    winRate: 65,
    sharpeRatio: 1.8,
    // ...
  },
};

const decision = await aiClient.makeDecision(aiInput);
// { action: 'BUY', confidence: 85, reasoning: '...', leverage: 15, positionSize: 25 }
```

### Error Handling and Validation

Use the error handling utilities from `lib/utils/error-handler.ts`:

```typescript
import { withErrorHandling, Validator, TradingError, ErrorType } from '@/lib/utils/error-handler';

// Wrap async functions
const result = await withErrorHandling(async () => {
  return await binance.createOrder(params);
});

// Validate trading parameters
Validator.validateLeverage(leverage);           // 1-125
Validator.validatePositionSize(size, balance);  // < 95% balance
Validator.validateMinNotional(quantity, price); // > $20 USDT
```

### Rate Limiting

The system tracks Binance API rate limits (1200 weight/minute for Futures):

```typescript
import { rateLimitManager } from '@/lib/utils/rate-limiter';

// Check before making request
const canProceed = await rateLimitManager.checkLimit('binance', 10); // 10 weight

// Track request
await rateLimitManager.trackRequest('binance', 10);
```

### Database Queries with Prisma

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create AI model
const model = await prisma.aIModel.create({
  data: {
    name: 'DeepSeek-V3',
    provider: 'deepseek',
    apiKey: 'sk-...',
    initialCapital: 20.0,
  },
});

// Create account for model
const account = await prisma.account.create({
  data: {
    modelId: model.id,
    balance: 20.0,
    initialBalance: 20.0,
    totalValue: 20.0,
  },
});

// Log trade
const trade = await prisma.trade.create({
  data: {
    modelId: model.id,
    symbol: 'BTCUSDT',
    action: 'OPEN_LONG',
    side: 'BUY',
    price: 98000,
    quantity: 0.001,
    leverage: 10,
    notionalValue: 980,
    fee: 0.392,
    reasoning: 'AI decision reasoning',
    confidence: 85,
  },
});
```

## Critical Safety Considerations

**Real Money Trading System**: This system trades with real funds. Follow these safety practices:

1. **Always test on Binance Testnet first**: Set `BINANCE_TESTNET=true` in `.env.local`
2. **Start with minimal capital**: Initial testing should use small amounts
3. **Monitor continuously**: Check positions and balances regularly
4. **Set reasonable limits**: Configure `minConfidence` threshold (e.g., 70+)
5. **Implement stop-losses**: Always use stop-loss orders for risk management
6. **Never commit API keys**: Keep `.env.local` in `.gitignore`
7. **Validate AI decisions**: Check confidence scores before execution
8. **Monitor rate limits**: Respect Binance API limits to avoid bans

## Testing and Development Workflow

### Running Backtests

Backtests use historical K-line data to simulate trading without risk:

```bash
npm run backtest
```

Modify `examples/run-backtest.ts` to adjust:
- Symbol, date range, initial capital
- Minimum confidence threshold
- Commission and slippage rates

### Manual Testing Workflow

1. Set up testnet environment
2. Fund testnet account at https://testnet.binancefuture.com
3. Configure `.env.local` with testnet keys
4. Run trading loop: `npm run worker`
5. Monitor via Prisma Studio: `npm run prisma:studio`

### Extending AI Models

To add OpenAI or Claude support:

1. Create `lib/ai/openai.ts` or `lib/ai/claude.ts`
2. Implement similar interface to `DeepSeekClient`
3. Update `TradingEngine` to support multiple AI providers
4. Add provider selection in `TradingEngineConfig`

## Current Implementation Status

**Completed** ✅:
- Binance REST API client with full order management
- WebSocket real-time market data streams
- DeepSeek AI integration
- Complete database schema and Prisma setup
- Technical indicators library (EMA, RSI, MACD, etc.)
- Trading engine core logic
- Backtesting engine with performance metrics
- Rate limiting and error handling

**Not Yet Implemented** 📋:
- API routes (`app/api/binance/*`, `app/api/ai/*`, `app/api/trading/*`)
- React dashboard UI components
- Multi-AI model support (OpenAI, Claude)
- Real-time WebSocket integration in UI
- Production deployment configuration

Refer to `IMPLEMENTATION_STATUS.md` for detailed roadmap.
