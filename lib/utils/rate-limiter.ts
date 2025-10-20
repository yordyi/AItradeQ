/**
 * 速率限制器
 * 管理API调用速率，防止超限
 */

interface RateLimitConfig {
  maxRequests: number; // 时间窗口内最大请求数
  windowMs: number; // 时间窗口（毫秒）
  retryAfterMs?: number; // 被限制后重试等待时间
}

interface RequestRecord {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private records: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * 检查是否可以发起请求
   */
  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record) {
      // 首次请求
      this.records.set(key, { count: 1, windowStart: now });
      return true;
    }

    const timeSinceWindowStart = now - record.windowStart;

    if (timeSinceWindowStart > this.config.windowMs) {
      // 窗口过期，重置
      this.records.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (record.count < this.config.maxRequests) {
      // 未达上限
      record.count++;
      return true;
    }

    // 已达上限
    return false;
  }

  /**
   * 获取重试等待时间
   */
  getRetryAfter(key: string): number {
    const record = this.records.get(key);
    if (!record) return 0;

    const now = Date.now();
    const timeSinceWindowStart = now - record.windowStart;
    const timeRemaining = this.config.windowMs - timeSinceWindowStart;

    return Math.max(0, timeRemaining);
  }

  /**
   * 重置限制
   */
  reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * 清除所有记录
   */
  clear(): void {
    this.records.clear();
  }
}

/**
 * Binance API速率限制器
 * 权重限制：1200/分钟
 */
export class BinanceRateLimiter extends RateLimiter {
  private weightUsed: number = 0;
  private windowStart: number = Date.now();

  constructor() {
    super({
      maxRequests: 1200, // 权重上限
      windowMs: 60 * 1000, // 1分钟
    });
  }

  /**
   * 检查权重是否充足
   */
  async checkWeight(weight: number): Promise<boolean> {
    const now = Date.now();

    // 重置窗口
    if (now - this.windowStart > 60 * 1000) {
      this.weightUsed = 0;
      this.windowStart = now;
    }

    if (this.weightUsed + weight > 1200) {
      return false; // 权重不足
    }

    this.weightUsed += weight;
    return true;
  }

  /**
   * 获取剩余权重
   */
  getRemainingWeight(): number {
    return Math.max(0, 1200 - this.weightUsed);
  }

  /**
   * 等待到窗口重置
   */
  async waitForReset(): Promise<void> {
    const now = Date.now();
    const timeRemaining = 60 * 1000 - (now - this.windowStart);

    if (timeRemaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeRemaining));
    }
  }
}

/**
 * AI API速率限制器
 * 针对DeepSeek, OpenAI等
 */
export class AIRateLimiter extends RateLimiter {
  constructor(provider: 'deepseek' | 'openai' | 'anthropic') {
    const configs: Record<string, RateLimitConfig> = {
      deepseek: {
        maxRequests: 100, // 保守估计
        windowMs: 60 * 1000,
      },
      openai: {
        maxRequests: 3500, // GPT-4 RPM
        windowMs: 60 * 1000,
      },
      anthropic: {
        maxRequests: 1000, // Claude RPM
        windowMs: 60 * 1000,
      },
    };

    super(configs[provider]);
  }
}

/**
 * 指数退避重试
 */
export class ExponentialBackoff {
  private baseDelayMs: number;
  private maxDelayMs: number;
  private maxRetries: number;

  constructor(
    baseDelayMs: number = 1000,
    maxDelayMs: number = 32000,
    maxRetries: number = 5
  ) {
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.maxRetries = maxRetries;
  }

  /**
   * 执行带重试的操作
   */
  async execute<T>(
    fn: () => Promise<T>,
    retryCondition: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // 检查是否应该重试
        if (!retryCondition(error)) {
          throw error;
        }

        // 最后一次尝试后不再等待
        if (attempt === this.maxRetries) {
          break;
        }

        // 计算延迟：2^attempt * baseDelay + jitter
        const delay = Math.min(
          this.baseDelayMs * Math.pow(2, attempt),
          this.maxDelayMs
        );
        const jitter = Math.random() * 1000; // 添加随机抖动

        console.log(
          `Retry attempt ${attempt + 1}/${this.maxRetries} after ${(delay + jitter).toFixed(0)}ms`
        );

        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }

    throw new Error(`Max retries (${this.maxRetries}) exceeded: ${lastError.message}`);
  }
}

/**
 * 全局速率限制管理器
 */
class RateLimitManager {
  private binance: BinanceRateLimiter;
  private ai: Map<string, AIRateLimiter> = new Map();

  constructor() {
    this.binance = new BinanceRateLimiter();
  }

  /**
   * 获取Binance限制器
   */
  getBinanceLimiter(): BinanceRateLimiter {
    return this.binance;
  }

  /**
   * 获取AI限制器
   */
  getAILimiter(provider: 'deepseek' | 'openai' | 'anthropic'): AIRateLimiter {
    if (!this.ai.has(provider)) {
      this.ai.set(provider, new AIRateLimiter(provider));
    }
    return this.ai.get(provider)!;
  }

  /**
   * 重置所有限制器
   */
  resetAll(): void {
    this.binance.clear();
    this.ai.forEach((limiter) => limiter.clear());
  }
}

// 导出全局实例
export const rateLimitManager = new RateLimitManager();

/**
 * 速率限制装饰器
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiter: RateLimiter,
  key: string
): T {
  return (async (...args: any[]) => {
    const canProceed = await limiter.checkLimit(key);

    if (!canProceed) {
      const retryAfter = limiter.getRetryAfter(key);
      throw new Error(
        `Rate limit exceeded. Retry after ${Math.ceil(retryAfter / 1000)}s`
      );
    }

    return await fn(...args);
  }) as T;
}
