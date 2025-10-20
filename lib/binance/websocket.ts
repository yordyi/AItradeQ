/**
 * Binance WebSocket Client
 * 实时市场数据流: 价格、Open Interest、资金费率
 */

import WebSocket from 'ws';

export interface MarketStream {
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  openInterest?: number;
  fundingRate?: number;
  timestamp: number;
}

type MessageHandler = (data: MarketStream) => void;

export class BinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private baseURL: string;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectInterval = 5000;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(testnet: boolean = false) {
    this.baseURL = testnet
      ? 'wss://stream.binancefuture.com'
      : 'wss://fstream.binance.com';
  }

  /**
   * 连接WebSocket
   */
  connect(streams: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const streamString = streams.join('/');
      const url = `${this.baseURL}/stream?streams=${streamString}`;

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('✅ Binance WebSocket Connected');
        this.startPing();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('❌ WebSocket disconnected, reconnecting...');
        this.stopPing();
        setTimeout(() => this.connect(streams), this.reconnectInterval);
      });
    });
  }

  /**
   * 处理消息
   */
  private handleMessage(message: any) {
    if (message.stream) {
      const [symbol, type] = message.stream.split('@');
      const data = message.data;

      // 处理不同类型的流
      if (type === 'ticker') {
        this.emit(symbol, {
          symbol: data.s,
          price: parseFloat(data.c),
          priceChange24h: parseFloat(data.P),
          volume24h: parseFloat(data.v),
          timestamp: data.E,
        });
      } else if (type === 'markPrice') {
        this.emit(symbol, {
          symbol: data.s,
          price: parseFloat(data.p),
          priceChange24h: 0,
          volume24h: 0,
          fundingRate: parseFloat(data.r),
          timestamp: data.E,
        });
      }
    }
  }

  /**
   * 订阅标的
   */
  subscribe(symbol: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(symbol) || [];
    handlers.push(handler);
    this.messageHandlers.set(symbol, handlers);
  }

  /**
   * 取消订阅
   */
  unsubscribe(symbol: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(symbol) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * 发送消息给订阅者
   */
  private emit(symbol: string, data: MarketStream) {
    const handlers = this.messageHandlers.get(symbol) || [];
    handlers.forEach((handler) => handler(data));
  }

  /**
   * 开始ping保持连接
   */
  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // 每30秒ping一次
  }

  /**
   * 停止ping
   */
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 关闭连接
   */
  close() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 创建多个标的的实时流
   */
  static createMultiStream(symbols: string[], testnet = false): BinanceWebSocketClient {
    const client = new BinanceWebSocketClient(testnet);

    // 创建ticker流（价格、24h变化、成交量）
    const tickerStreams = symbols.map((s) => `${s.toLowerCase()}@ticker`);

    // 创建markPrice流（标记价格、资金费率）
    const markPriceStreams = symbols.map((s) => `${s.toLowerCase()}@markPrice`);

    const allStreams = [...tickerStreams, ...markPriceStreams];

    client.connect(allStreams).catch((error) => {
      console.error('Failed to connect WebSocket:', error);
    });

    return client;
  }
}

/**
 * 全局WebSocket管理器
 */
class WebSocketManager {
  private clients: Map<string, BinanceWebSocketClient> = new Map();

  /**
   * 获取或创建客户端
   */
  getClient(symbols: string[], testnet = false): BinanceWebSocketClient {
    const key = symbols.sort().join(',');

    if (!this.clients.has(key)) {
      const client = BinanceWebSocketClient.createMultiStream(symbols, testnet);
      this.clients.set(key, client);
    }

    return this.clients.get(key)!;
  }

  /**
   * 关闭所有连接
   */
  closeAll() {
    this.clients.forEach((client) => client.close());
    this.clients.clear();
  }
}

export const wsManager = new WebSocketManager();
