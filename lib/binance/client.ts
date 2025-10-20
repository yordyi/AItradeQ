/**
 * Binance Futures API Client
 * 支持HMAC签名认证、订单管理、账户查询
 */

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

export interface BinanceConfig {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

export interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
  quantity?: number;
  price?: number;
  stopPrice?: number;
  positionSide?: 'LONG' | 'SHORT' | 'BOTH';
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface Position {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  unRealizedProfit: string;
  leverage: string;
  positionSide: string;
}

export interface Balance {
  asset: string;
  balance: string;
  availableBalance: string;
}

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export class BinanceClient {
  private axiosInstance: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;

  constructor(config: BinanceConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseURL = config.testnet
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
      },
    });
  }

  /**
   * 生成HMAC SHA256签名
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * 构建查询字符串
   */
  private buildQueryString(params: Record<string, any>): string {
    return Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * 发起签名请求
   */
  private async signedRequest(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const timestamp = Date.now();
    const queryString = this.buildQueryString({ ...params, timestamp });
    const signature = this.generateSignature(queryString);

    const config = {
      method,
      url: `${endpoint}?${queryString}&signature=${signature}`,
    };

    try {
      const response = await this.axiosInstance.request(config);
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Binance API Error: ${error.response?.data?.msg || error.message}`
      );
    }
  }

  /**
   * 获取账户余额
   */
  async getAccountBalance(): Promise<Balance[]> {
    const response = await this.signedRequest('GET', '/fapi/v2/balance');
    return response.filter((b: Balance) => parseFloat(b.balance) > 0);
  }

  /**
   * 获取USDT余额
   */
  async getUSDTBalance(): Promise<number> {
    const balances = await this.getAccountBalance();
    const usdt = balances.find((b) => b.asset === 'USDT');
    return parseFloat(usdt?.availableBalance || '0');
  }

  /**
   * 获取所有持仓
   */
  async getPositions(): Promise<Position[]> {
    const response = await this.signedRequest('GET', '/fapi/v2/positionRisk');
    return response.filter(
      (p: Position) => parseFloat(p.positionAmt) !== 0
    );
  }

  /**
   * 获取账户信息（余额+持仓）
   */
  async getAccountInfo() {
    const [balance, positions] = await Promise.all([
      this.getUSDTBalance(),
      this.getPositions(),
    ]);

    const unrealizedPnL = positions.reduce(
      (sum, p) => sum + parseFloat(p.unRealizedProfit),
      0
    );

    return {
      balance,
      positions,
      unrealizedPnL,
      totalValue: balance + unrealizedPnL,
    };
  }

  /**
   * 设置杠杆
   */
  async setLeverage(symbol: string, leverage: number): Promise<void> {
    await this.signedRequest('POST', '/fapi/v1/leverage', {
      symbol,
      leverage,
    });
  }

  /**
   * 创建订单
   */
  async createOrder(params: OrderParams): Promise<any> {
    return await this.signedRequest('POST', '/fapi/v1/order', params);
  }

  /**
   * 开多单
   */
  async openLong(
    symbol: string,
    quantity: number,
    leverage: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<any> {
    // 设置杠杆
    await this.setLeverage(symbol, leverage);

    // 市价开多
    const order = await this.createOrder({
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quantity,
      positionSide: 'LONG',
    });

    // 设置止损止盈
    if (stopLoss) {
      await this.createOrder({
        symbol,
        side: 'SELL',
        type: 'STOP_MARKET',
        quantity,
        stopPrice: stopLoss,
        positionSide: 'LONG',
      });
    }

    if (takeProfit) {
      await this.createOrder({
        symbol,
        side: 'SELL',
        type: 'TAKE_PROFIT_MARKET',
        quantity,
        stopPrice: takeProfit,
        positionSide: 'LONG',
      });
    }

    return order;
  }

  /**
   * 开空单
   */
  async openShort(
    symbol: string,
    quantity: number,
    leverage: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<any> {
    await this.setLeverage(symbol, leverage);

    const order = await this.createOrder({
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity,
      positionSide: 'SHORT',
    });

    if (stopLoss) {
      await this.createOrder({
        symbol,
        side: 'BUY',
        type: 'STOP_MARKET',
        quantity,
        stopPrice: stopLoss,
        positionSide: 'SHORT',
      });
    }

    if (takeProfit) {
      await this.createOrder({
        symbol,
        side: 'BUY',
        type: 'TAKE_PROFIT_MARKET',
        quantity,
        stopPrice: takeProfit,
        positionSide: 'SHORT',
      });
    }

    return order;
  }

  /**
   * 平仓
   */
  async closePosition(symbol: string, positionSide: 'LONG' | 'SHORT'): Promise<any> {
    const positions = await this.getPositions();
    const position = positions.find(
      (p) => p.symbol === symbol && p.positionSide === positionSide
    );

    if (!position) {
      throw new Error(`No ${positionSide} position found for ${symbol}`);
    }

    const quantity = Math.abs(parseFloat(position.positionAmt));

    return await this.createOrder({
      symbol,
      side: positionSide === 'LONG' ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity,
      positionSide,
    });
  }

  /**
   * 获取K线数据
   */
  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 500
  ): Promise<KlineData[]> {
    const response = await this.axiosInstance.get('/fapi/v1/klines', {
      params: { symbol, interval, limit },
    });

    return response.data.map((k: any[]) => ({
      openTime: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
      closeTime: k[6],
    }));
  }

  /**
   * 获取当前价格
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    const response = await this.axiosInstance.get('/fapi/v1/ticker/price', {
      params: { symbol },
    });
    return parseFloat(response.data.price);
  }

  /**
   * 获取24小时行情
   */
  async get24hrTicker(symbol: string): Promise<any> {
    const response = await this.axiosInstance.get('/fapi/v1/ticker/24hr', {
      params: { symbol },
    });
    return response.data;
  }
}
