/**
 * 真实API集成工具
 * 集成Twitter、Telegram、Discord、BSC、Solana等API
 */

import { logger } from './errorHandler'

// ============== Twitter API ==============

/**
 * Twitter API配置
 */
export interface TwitterAPIConfig {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessSecret: string
  bearerToken: string
}

/**
 * Twitter API客户端
 */
export class TwitterAPIClient {
  private config: TwitterAPIConfig
  private baseURL = 'https://api.twitter.com/2'

  constructor(config: TwitterAPIConfig) {
    this.config = config
  }

  /**
   * 搜索推文
   */
  async searchTweets(query: string, options: {
    maxResults?: number
    tweetFields?: string[]
    expansions?: string[]
    userFields?: string[]
  } = {}): Promise<any> {
    try {
      const params = new URLSearchParams({
        query,
        'max_results': String(options.maxResults || 10),
        'tweet.fields': options.tweetFields?.join(',') || 'created_at,public_metrics,author_id,lang',
        'expansions': options.expansions?.join(',') || 'author_id',
        'user.fields': options.userFields?.join(',') || 'name,username,verified'
      })

      const response = await fetch(`${this.baseURL}/tweets/search/recent?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      logger.info('TwitterAPI', `搜索推文成功: ${query}`)
      return data
    } catch (error) {
      logger.error('TwitterAPI', '搜索推文失败', error)
      throw error
    }
  }

  /**
   * 获取用户信息
   */
  async getUser(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      logger.info('TwitterAPI', `获取用户信息成功: ${userId}`)
      return data
    } catch (error) {
      logger.error('TwitterAPI', '获取用户信息失败', error)
      throw error
    }
  }

  /**
   * 创建流式连接（用于实时监控）
   */
  async createFilterStream(rules: Array<{ value: string, tag?: string }>): Promise<any> {
    try {
      // 添加规则
      await fetch(`${this.baseURL}/tweets/search/stream/rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ add: rules })
      })

      // 创建流式连接
      const response = await fetch(`${this.baseURL}/tweets/search/stream`, {
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        }
      })

      logger.info('TwitterAPI', '创建流式连接成功')
      return response
    } catch (error) {
      logger.error('TwitterAPI', '创建流式连接失败', error)
      throw error
    }
  }

  /**
   * 删除流式规则
   */
  async deleteStreamRules(ids: string[]): Promise<void> {
    try {
      await fetch(`${this.baseURL}/tweets/search/stream/rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ delete: { ids } })
      })

      logger.info('TwitterAPI', '删除流式规则成功')
    } catch (error) {
      logger.error('TwitterAPI', '删除流式规则失败', error)
      throw error
    }
  }
}

// ============== Telegram Bot API ==============

/**
 * Telegram Bot API配置
 */
export interface TelegramAPIConfig {
  botToken: string
}

/**
 * Telegram Bot API客户端
 */
export class TelegramBotAPIClient {
  private config: TelegramAPIConfig
  private baseURL: string

  constructor(config: TelegramAPIConfig) {
    this.config = config
    this.baseURL = `https://api.telegram.org/bot${config.botToken}`
  }

  /**
   * 获取Bot信息
   */
  async getMe(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/getMe`)
      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      logger.info('TelegramAPI', '获取Bot信息成功')
      return data.result
    } catch (error) {
      logger.error('TelegramAPI', '获取Bot信息失败', error)
      throw error
    }
  }

  /**
   * 获取更新（轮询模式）
   */
  async getUpdates(offset?: number, limit?: number, timeout?: number): Promise<any> {
    try {
      const params = new URLSearchParams()
      if (offset !== undefined) params.append('offset', String(offset))
      if (limit !== undefined) params.append('limit', String(limit))
      if (timeout !== undefined) params.append('timeout', String(timeout))

      const response = await fetch(`${this.baseURL}/getUpdates?${params}`)
      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      return data.result
    } catch (error) {
      logger.error('TelegramAPI', '获取更新失败', error)
      throw error
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: string | number, text: string, options: {
    parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
    disableWebPagePreview?: boolean
  } = {}): Promise<any> {
    try {
      const body: any = {
        chat_id: chatId,
        text
      }

      if (options.parseMode) body.parse_mode = options.parseMode
      if (options.disableWebPagePreview) body.disable_web_page_preview = true

      const response = await fetch(`${this.baseURL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      logger.info('TelegramAPI', '发送消息成功')
      return data.result
    } catch (error) {
      logger.error('TelegramAPI', '发送消息失败', error)
      throw error
    }
  }

  /**
   * 获取频道消息
   */
  async getChatHistory(chatId: string | number, limit?: number): Promise<any> {
    try {
      // 通过轮询获取频道消息
      const updates = await this.getUpdates(undefined, limit)
      
      // 过滤出指定频道的消息
      const chatMessages = updates
        .filter((update: any) => update.channel_post?.chat?.id === Number(chatId))
        .map((update: any) => update.channel_post)

      logger.info('TelegramAPI', `获取频道消息成功: ${chatId}`)
      return chatMessages
    } catch (error) {
      logger.error('TelegramAPI', '获取频道消息失败', error)
      throw error
    }
  }
}

// ============== Discord Webhook ==============

/**
 * Discord Webhook配置
 */
export interface DiscordWebhookConfig {
  webhookUrl: string
}

/**
 * Discord Webhook客户端
 */
export class DiscordWebhookClient {
  private config: DiscordWebhookConfig

  constructor(config: DiscordWebhookConfig) {
    this.config = config
  }

  /**
   * 发送Webhook消息
   */
  async sendMessage(content: string, options: {
    username?: string
    avatarUrl?: string
    embeds?: any[]
  } = {}): Promise<void> {
    try {
      const body: any = { content }
      if (options.username) body.username = options.username
      if (options.avatarUrl) body.avatar_url = options.avatarUrl
      if (options.embeds) body.embeds = options.embeds

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`Discord Webhook error: ${response.status}`)
      }

      logger.info('DiscordWebhook', '发送消息成功')
    } catch (error) {
      logger.error('DiscordWebhook', '发送消息失败', error)
      throw error
    }
  }
}

// ============== BSC RPC ==============

/**
 * BSC RPC配置
 */
export interface BSCRPCConfig {
  rpcUrl: string
  wsUrl?: string
}

/**
 * BSC RPC客户端
 */
export class BSCRPCClient {
  private config: BSCRPCConfig
  private ws: WebSocket | null = null

  constructor(config: BSCRPCConfig) {
    this.config = config
  }

  /**
   * 发送RPC请求
   */
  async rpcCall(method: string, params: any[] = []): Promise<any> {
    try {
      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(`BSC RPC error: ${data.error.message}`)
      }

      return data.result
    } catch (error) {
      logger.error('BSCRPC', `RPC调用失败: ${method}`, error)
      throw error
    }
  }

  /**
   * 获取最新区块号
   */
  async getBlockNumber(): Promise<number> {
    const result = await this.rpcCall('eth_blockNumber')
    return parseInt(result, 16)
  }

  /**
   * 获取区块信息
   */
  async getBlock(blockNumber: number | 'latest' = 'latest'): Promise<any> {
    return await this.rpcCall('eth_getBlockByNumber', [
      typeof blockNumber === 'number' ? `0x${blockNumber.toString(16)}` : blockNumber,
      true
    ])
  }

  /**
   * 获取余额
   */
  async getBalance(address: string): Promise<string> {
    return await this.rpcCall('eth_getBalance', [address, 'latest'])
  }

  /**
   * 获取交易收据
   */
  async getTransactionReceipt(txHash: string): Promise<any> {
    return await this.rpcCall('eth_getTransactionReceipt', [txHash])
  }

  /**
   * 订阅新区块
   */
  subscribeToNewBlocks(callback: (blockNumber: number) => void): void {
    if (!this.config.wsUrl) {
      throw new Error('WebSocket URL not configured')
    }

    this.ws = new WebSocket(this.config.wsUrl)

    this.ws.onopen = () => {
      logger.info('BSCRPC', 'WebSocket连接成功')
      
      // 订阅新区块
      this.ws?.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_subscribe',
        params: ['newHeads'],
        id: 1
      }))
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.params?.result?.number) {
        const blockNumber = parseInt(data.params.result.number, 16)
        callback(blockNumber)
      }
    }

    this.ws.onerror = (error) => {
      logger.error('BSCRPC', 'WebSocket错误', error)
    }

    this.ws.onclose = () => {
      logger.info('BSCRPC', 'WebSocket连接关闭')
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// ============== Solana RPC ==============

/**
 * Solana RPC配置
 */
export interface SolanaRPCConfig {
  rpcUrl: string
  wsUrl?: string
}

/**
 * Solana RPC客户端
 */
export class SolanaRPCClient {
  private config: SolanaRPCConfig
  private ws: WebSocket | null = null

  constructor(config: SolanaRPCConfig) {
    this.config = config
  }

  /**
   * 发送RPC请求
   */
  async rpcCall(method: string, params: any[] = []): Promise<any> {
    try {
      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(`Solana RPC error: ${data.error.message}`)
      }

      return data.result
    } catch (error) {
      logger.error('SolanaRPC', `RPC调用失败: ${method}`, error)
      throw error
    }
  }

  /**
   * 获取最新区块高度
   */
  async getSlot(): Promise<number> {
    return await this.rpcCall('getSlot')
  }

  /**
   * 获取账户信息
   */
  async getAccountInfo(pubkey: string): Promise<any> {
    return await this.rpcCall('getAccountInfo', [pubkey])
  }

  /**
   * 获取交易
   */
  async getTransaction(signature: string): Promise<any> {
    return await this.rpcCall('getTransaction', [signature])
  }

  /**
   * 订阅账户变更
   */
  subscribeToAccountChange(pubkey: string, callback: (accountInfo: any) => void): void {
    if (!this.config.wsUrl) {
      throw new Error('WebSocket URL not configured')
    }

    this.ws = new WebSocket(this.config.wsUrl)

    this.ws.onopen = () => {
      logger.info('SolanaRPC', 'WebSocket连接成功')
      
      // 订阅账户变更
      this.ws?.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'accountSubscribe',
        params: [pubkey, { encoding: 'base64' }]
      }))
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.params?.result?.value) {
        callback(data.params.result.value)
      }
    }

    this.ws.onerror = (error) => {
      logger.error('SolanaRPC', 'WebSocket错误', error)
    }

    this.ws.onclose = () => {
      logger.info('SolanaRPC', 'WebSocket连接关闭')
    }
  }

  /**
   * 订阅日志
   */
  subscribeToLogs(filters: any, callback: (logs: any) => void): void {
    if (!this.config.wsUrl) {
      throw new Error('WebSocket URL not configured')
    }

    this.ws = new WebSocket(this.config.wsUrl)

    this.ws.onopen = () => {
      logger.info('SolanaRPC', 'WebSocket连接成功')
      
      // 订阅日志
      this.ws?.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'logsSubscribe',
        params: [filters, { encoding: 'jsonParsed' }]
      }))
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.params?.result) {
        callback(data.params.result)
      }
    }

    this.ws.onerror = (error) => {
      logger.error('SolanaRPC', 'WebSocket错误', error)
    }

    this.ws.onclose = () => {
      logger.info('SolanaRPC', 'WebSocket连接关闭')
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// ============== DEX API ==============

/**
 * PancakeSwap API客户端
 */
export class PancakeSwapAPIClient {
  private baseURL = 'https://api.pancakeswap.info/api/v2'

  /**
   * 获取代币信息
   */
  async getTokenInfo(address: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/tokens/${address}`)
      const data = await response.json()
      logger.info('PancakeSwapAPI', `获取代币信息成功: ${address}`)
      return data.data
    } catch (error) {
      logger.error('PancakeSwapAPI', '获取代币信息失败', error)
      throw error
    }
  }

  /**
   * 获取代币价格
   */
  async getTokenPrice(address: string): Promise<number> {
    const info = await this.getTokenInfo(address)
    return parseFloat(info.price)
  }

  /**
   * 获取交易对信息
   */
  async getPairInfo(address: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/pairs/${address}`)
      const data = await response.json()
      logger.info('PancakeSwapAPI', `获取交易对信息成功: ${address}`)
      return data.data
    } catch (error) {
      logger.error('PancakeSwapAPI', '获取交易对信息失败', error)
      throw error
    }
  }
}

/**
 * Raydium API客户端
 */
export class RaydiumAPIClient {
  private baseURL = 'https://api.raydium.io/v2'

  /**
   * 获取代币信息
   */
  async getTokenInfo(address: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/token/${address}`)
      const data = await response.json()
      logger.info('RaydiumAPI', `获取代币信息成功: ${address}`)
      return data
    } catch (error) {
      logger.error('RaydiumAPI', '获取代币信息失败', error)
      throw error
    }
  }

  /**
   * 获取流动性池信息
   */
  async getPoolInfo(address: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/pool/${address}`)
      const data = await response.json()
      logger.info('RaydiumAPI', `获取池子信息成功: ${address}`)
      return data
    } catch (error) {
      logger.error('RaydiumAPI', '获取池子信息失败', error)
      throw error
    }
  }

  /**
   * 获取所有流动性池
   */
  async getAllPools(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/liquidity/main`)
      const data = await response.json()
      logger.info('RaydiumAPI', '获取所有池子成功')
      return data
    } catch (error) {
      logger.error('RaydiumAPI', '获取所有池子失败', error)
      throw error
    }
  }
}

// ============== API管理器 ==============

/**
 * API管理器
 * 统一管理所有API客户端
 */
export class APIManager {
  private static instance: APIManager

  private twitterClient: TwitterAPIClient | null = null
  private telegramClient: TelegramBotAPIClient | null = null
  private discordClient: DiscordWebhookClient | null = null
  private bscClient: BSCRPCClient | null = null
  private solanaClient: SolanaRPCClient | null = null
  private pancakeSwapClient: PancakeSwapAPIClient | null = null
  private raydiumClient: RaydiumAPIClient | null = null

  private constructor() {}

  static getInstance(): APIManager {
    if (!APIManager.instance) {
      APIManager.instance = new APIManager()
    }
    return APIManager.instance
  }

  /**
   * 初始化Twitter客户端
   */
  initTwitter(config: TwitterAPIConfig): void {
    this.twitterClient = new TwitterAPIClient(config)
    logger.info('APIManager', 'Twitter客户端初始化成功')
  }

  /**
   * 获取Twitter客户端
   */
  getTwitter(): TwitterAPIClient {
    if (!this.twitterClient) {
      throw new Error('Twitter客户端未初始化')
    }
    return this.twitterClient
  }

  /**
   * 初始化Telegram客户端
   */
  initTelegram(config: TelegramAPIConfig): void {
    this.telegramClient = new TelegramBotAPIClient(config)
    logger.info('APIManager', 'Telegram客户端初始化成功')
  }

  /**
   * 获取Telegram客户端
   */
  getTelegram(): TelegramBotAPIClient {
    if (!this.telegramClient) {
      throw new Error('Telegram客户端未初始化')
    }
    return this.telegramClient
  }

  /**
   * 初始化Discord客户端
   */
  initDiscord(config: DiscordWebhookConfig): void {
    this.discordClient = new DiscordWebhookClient(config)
    logger.info('APIManager', 'Discord客户端初始化成功')
  }

  /**
   * 获取Discord客户端
   */
  getDiscord(): DiscordWebhookClient {
    if (!this.discordClient) {
      throw new Error('Discord客户端未初始化')
    }
    return this.discordClient
  }

  /**
   * 初始化BSC客户端
   */
  initBSC(config: BSCRPCConfig): void {
    this.bscClient = new BSCRPCClient(config)
    logger.info('APIManager', 'BSC客户端初始化成功')
  }

  /**
   * 获取BSC客户端
   */
  getBSC(): BSCRPCClient {
    if (!this.bscClient) {
      throw new Error('BSC客户端未初始化')
    }
    return this.bscClient
  }

  /**
   * 初始化Solana客户端
   */
  initSolana(config: SolanaRPCConfig): void {
    this.solanaClient = new SolanaRPCClient(config)
    logger.info('APIManager', 'Solana客户端初始化成功')
  }

  /**
   * 获取Solana客户端
   */
  getSolana(): SolanaRPCClient {
    if (!this.solanaClient) {
      throw new Error('Solana客户端未初始化')
    }
    return this.solanaClient
  }

  /**
   * 初始化DEX客户端
   */
  initDEX(): void {
    this.pancakeSwapClient = new PancakeSwapAPIClient()
    this.raydiumClient = new RaydiumAPIClient()
    logger.info('APIManager', 'DEX客户端初始化成功')
  }

  /**
   * 获取PancakeSwap客户端
   */
  getPancakeSwap(): PancakeSwapAPIClient {
    if (!this.pancakeSwapClient) {
      throw new Error('PancakeSwap客户端未初始化')
    }
    return this.pancakeSwapClient
  }

  /**
   * 获取Raydium客户端
   */
  getRaydium(): RaydiumAPIClient {
    if (!this.raydiumClient) {
      throw new Error('Raydium客户端未初始化')
    }
    return this.raydiumClient
  }

  /**
   * 清理所有客户端
   */
  cleanup(): void {
    this.bscClient?.unsubscribe()
    this.solanaClient?.unsubscribe()
    logger.info('APIManager', '所有API客户端已清理')
  }
}

// 导出单例
export const apiManager = APIManager.getInstance()
