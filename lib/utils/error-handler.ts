/**
 * 统一错误处理系统
 * 包括错误分类、日志、重试策略
 */

export enum ErrorType {
  // Binance错误
  BINANCE_API_ERROR = 'BINANCE_API_ERROR',
  BINANCE_INSUFFICIENT_BALANCE = 'BINANCE_INSUFFICIENT_BALANCE',
  BINANCE_INVALID_ORDER = 'BINANCE_INVALID_ORDER',
  BINANCE_RATE_LIMIT = 'BINANCE_RATE_LIMIT',
  BINANCE_NETWORK_ERROR = 'BINANCE_NETWORK_ERROR',

  // AI错误
  AI_API_ERROR = 'AI_API_ERROR',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',
  AI_TIMEOUT = 'AI_TIMEOUT',

  // 交易错误
  TRADING_RISK_EXCEEDED = 'TRADING_RISK_EXCEEDED',
  TRADING_POSITION_LIMIT = 'TRADING_POSITION_LIMIT',
  TRADING_INVALID_PARAMS = 'TRADING_INVALID_PARAMS',

  // 系统错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class TradingError extends Error {
  type: ErrorType;
  code?: string | number;
  retryable: boolean;
  details?: any;

  constructor(
    type: ErrorType,
    message: string,
    options: {
      code?: string | number;
      retryable?: boolean;
      details?: any;
    } = {}
  ) {
    super(message);
    this.name = 'TradingError';
    this.type = type;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;

    // 维护正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TradingError);
    }
  }
}

/**
 * 错误分类器
 */
export function classifyError(error: any): TradingError {
  // Binance API错误
  if (error.response?.data?.code) {
    const code = error.response.data.code;
    const msg = error.response.data.msg || error.message;

    // 速率限制
    if (code === -1003 || code === 429) {
      return new TradingError(ErrorType.BINANCE_RATE_LIMIT, msg, {
        code,
        retryable: true,
        details: error.response.data,
      });
    }

    // 余额不足
    if (code === -2019 || msg.includes('insufficient balance')) {
      return new TradingError(ErrorType.BINANCE_INSUFFICIENT_BALANCE, msg, {
        code,
        retryable: false,
      });
    }

    // 无效订单
    if (code === -1111 || code === -4164 || code === -1106) {
      return new TradingError(ErrorType.BINANCE_INVALID_ORDER, msg, {
        code,
        retryable: false,
        details: error.response.data,
      });
    }

    // 其他Binance错误
    return new TradingError(ErrorType.BINANCE_API_ERROR, msg, {
      code,
      retryable: code >= -1000 && code < -1100, // 部分错误可重试
      details: error.response.data,
    });
  }

  // AI API错误
  if (error.response?.status === 429) {
    return new TradingError(
      ErrorType.AI_RATE_LIMIT,
      'AI API rate limit exceeded',
      { retryable: true }
    );
  }

  if (error.message?.includes('timeout')) {
    return new TradingError(ErrorType.AI_TIMEOUT, 'AI API timeout', {
      retryable: true,
    });
  }

  // 网络错误
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new TradingError(ErrorType.NETWORK_ERROR, error.message, {
      retryable: true,
    });
  }

  // 数据库错误
  if (error.name === 'PrismaClientKnownRequestError') {
    return new TradingError(ErrorType.DATABASE_ERROR, error.message, {
      retryable: false,
      details: error,
    });
  }

  // 默认未知错误
  return new TradingError(
    ErrorType.UNKNOWN_ERROR,
    error.message || 'Unknown error',
    {
      retryable: false,
      details: error,
    }
  );
}

/**
 * 错误日志器
 */
export class ErrorLogger {
  private static errors: TradingError[] = [];
  private static maxErrors = 1000;

  /**
   * 记录错误
   */
  static log(error: TradingError): void {
    this.errors.push(error);

    // 保持错误列表在限制内
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // 输出到控制台
    console.error(`[${error.type}] ${error.message}`, {
      code: error.code,
      retryable: error.retryable,
      details: error.details,
      stack: error.stack,
    });

    // TODO: 集成Sentry或其他错误监控服务
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(error);
    // }
  }

  /**
   * 获取最近的错误
   */
  static getRecent(count: number = 50): TradingError[] {
    return this.errors.slice(-count);
  }

  /**
   * 获取错误统计
   */
  static getStats(): Record<ErrorType, number> {
    const stats: Record<string, number> = {};

    this.errors.forEach((error) => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });

    return stats as Record<ErrorType, number>;
  }

  /**
   * 清除错误记录
   */
  static clear(): void {
    this.errors = [];
  }
}

/**
 * 错误处理装饰器
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onError?: (error: TradingError) => void;
  } = {}
): T {
  const { maxRetries = 3, retryDelay = 1000, onError } = options;

  return (async (...args: any[]) => {
    let lastError: TradingError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        const tradingError = classifyError(error);
        lastError = tradingError;

        // 记录错误
        ErrorLogger.log(tradingError);

        // 调用错误回调
        if (onError) {
          onError(tradingError);
        }

        // 检查是否应该重试
        if (!tradingError.retryable || attempt === maxRetries) {
          throw tradingError;
        }

        // 等待后重试
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }) as T;
}

/**
 * 验证器
 */
export class Validator {
  /**
   * 验证订单参数
   */
  static validateOrderParams(params: {
    symbol: string;
    quantity: number;
    price?: number;
    leverage?: number;
  }): void {
    const { symbol, quantity, price, leverage } = params;

    if (!symbol || typeof symbol !== 'string') {
      throw new TradingError(
        ErrorType.VALIDATION_ERROR,
        'Invalid symbol parameter'
      );
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new TradingError(
        ErrorType.VALIDATION_ERROR,
        'Quantity must be a positive number'
      );
    }

    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      throw new TradingError(
        ErrorType.VALIDATION_ERROR,
        'Price must be a positive number'
      );
    }

    if (leverage !== undefined) {
      if (typeof leverage !== 'number' || leverage < 1 || leverage > 30) {
        throw new TradingError(
          ErrorType.VALIDATION_ERROR,
          'Leverage must be between 1 and 30'
        );
      }
    }
  }

  /**
   * 验证风险参数
   */
  static validateRiskParams(params: {
    balance: number;
    positionSize: number;
    leverage: number;
  }): void {
    const { balance, positionSize, leverage } = params;

    if (balance < 20) {
      throw new TradingError(
        ErrorType.TRADING_RISK_EXCEEDED,
        'Insufficient balance for trading (minimum $20)'
      );
    }

    const notionalValue = (balance * positionSize) / 100 * leverage;

    if (notionalValue < 20) {
      throw new TradingError(
        ErrorType.TRADING_INVALID_PARAMS,
        `Notional value ($${notionalValue.toFixed(2)}) must be at least $20`
      );
    }

    if (positionSize > 100) {
      throw new TradingError(
        ErrorType.TRADING_RISK_EXCEEDED,
        'Position size cannot exceed 100% of balance'
      );
    }
  }

  /**
   * 验证AI决策
   */
  static validateAIDecision(decision: any): void {
    const requiredFields = ['action', 'confidence', 'reasoning'];

    for (const field of requiredFields) {
      if (!(field in decision)) {
        throw new TradingError(
          ErrorType.AI_INVALID_RESPONSE,
          `Missing required field: ${field}`
        );
      }
    }

    const validActions = ['BUY', 'SELL', 'HOLD', 'CLOSE'];
    if (!validActions.includes(decision.action)) {
      throw new TradingError(
        ErrorType.AI_INVALID_RESPONSE,
        `Invalid action: ${decision.action}`
      );
    }

    if (
      typeof decision.confidence !== 'number' ||
      decision.confidence < 0 ||
      decision.confidence > 100
    ) {
      throw new TradingError(
        ErrorType.AI_INVALID_RESPONSE,
        'Confidence must be between 0 and 100'
      );
    }
  }
}

/**
 * 安全执行函数（捕获所有错误）
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  fallback: T,
  errorContext: string = ''
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const tradingError = classifyError(error);
    ErrorLogger.log(tradingError);

    console.error(`[SafeExecute] ${errorContext}:`, tradingError.message);

    return fallback;
  }
}
