/**
 * 热点监控核心引擎
 * 实时监控社交媒体、链上数据和DEX热点，识别潜在爆发机会
 */

import { EventEmitter } from 'events'
import { logger } from '../utils/errorHandler'
import { configManager } from '../utils/configManager'
import type {
  Hotspot,
  HotspotMonitorConfig,
  HotspotScore,
  HotspotPriority,
  SocialHotspotData,
  OnchainHotspotData,
  DexHotspotData
} from '../../../shared/types'

// ============== 类型定义 ==============

interface MonitorTask {
  id: string
  type: 'social' | 'onchain' | 'dex'
  interval: number
  lastRun: number
  running: boolean
}

// ============== 热点监控引擎 ==============

export class HotspotMonitorEngine extends EventEmitter {
  private isMonitoring: boolean = false
  private tasks: Map<string, MonitorTask> = new Map()
  private hotspots: Map<string, Hotspot> = new Map()
  private config: HotspotMonitorConfig
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    super()
    this.config = this.getDefaultConfig()
    this.initialize()
  }

  /**
   * 初始化监控引擎
   */
  private initialize(): void {
    logger.info('HotspotMonitor', '热点监控引擎初始化')
    this.loadConfig()
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): HotspotMonitorConfig {
    return {
      social: {
        enabled: true,
        platforms: {
          twitter: {
            enabled: true,
            apiKeys: [],
            keywords: ['meme coin', 'new token', 'launch', 'airdrop', '$MOON'],
            cashtags: ['$MOON', '$PEPE', '$SHIB', '$DOGE']
          },
          telegram: {
            enabled: true,
            channels: [],
            keywords: ['new coin', 'launch', 'token']
          },
          discord: {
            enabled: true,
            servers: [],
            channels: [],
            keywords: ['meme', 'token', 'launch']
          }
        },
        minMentions: 10,
        minEngagementRate: 0.05,
        sentimentThreshold: 0.3
      },
      onchain: {
        enabled: true,
        networks: ['BSC', 'Solana'],
        minLiquidity: '10000',
        minVolume24h: '50000',
        minHolders: 100,
        priceChangeThreshold: 0.2,
        largeTransactionThreshold: '10000'
      },
      dex: {
        enabled: true,
        platforms: ['PancakeSwap', 'Raydium', 'Orca', 'Jupiter'],
        minLiquidity: '10000',
        minVolume24h: '50000',
        newPoolMonitor: true
      },
      scoring: {
        weights: {
          social: 0.3,
          onchain: 0.25,
          volume: 0.25,
          influencer: 0.2
        },
        thresholds: {
          high: 80,
          medium: 60,
          low: 40
        }
      },
      alerts: {
        enabled: true,
        minPriority: 'medium',
        methods: {
          desktop: true,
          sound: false,
          email: false
        }
      },
      autoTrade: {
        enabled: false,
        maxAmount: '1',
        minPriority: 'high',
        stopLossPercent: 0.1,
        takeProfitPercent: 0.2
      }
    }
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      // 从配置管理器加载（如果有）
      const savedConfig = configManager.getConfig()
      if (savedConfig && 'hotspot' in savedConfig) {
        this.config = { ...this.config, ...(savedConfig as any).hotspot }
      }
    } catch (error) {
      logger.warn('HotspotMonitor', '加载配置失败，使用默认配置', error)
    }
  }

  /**
   * 更新配置
   */
  updateConfig(partialConfig: Partial<HotspotMonitorConfig>): void {
    this.config = { ...this.config, ...partialConfig }
    logger.info('HotspotMonitor', '配置已更新', { partialConfig })
    
    // 如果正在监控，重启监控
    if (this.isMonitoring) {
      this.stopMonitoring()
      this.startMonitoring()
    }
  }

  /**
   * 开始监控
   */
  startMonitoring(): boolean {
    if (this.isMonitoring) {
      logger.warn('HotspotMonitor', '监控已经在运行')
      return false
    }

    logger.info('HotspotMonitor', '开始热点监控')
    this.isMonitoring = true

    // 启动社交媒体监控
    if (this.config.social.enabled) {
      this.startSocialMonitoring()
    }

    // 启动链上数据监控
    if (this.config.onchain.enabled) {
      this.startOnchainMonitoring()
    }

    // 启动DEX监控
    if (this.config.dex.enabled) {
      this.startDexMonitoring()
    }

    this.emit('monitoring:started')
    return true
  }

  /**
   * 停止监控
   */
  stopMonitoring(): boolean {
    if (!this.isMonitoring) {
      logger.warn('HotspotMonitor', '监控未运行')
      return false
    }

    logger.info('HotspotMonitor', '停止热点监控')
    this.isMonitoring = false

    // 停止所有监控任务
    this.monitoringIntervals.forEach((interval) => {
      clearInterval(interval)
    })
    this.monitoringIntervals.clear()
    this.tasks.clear()

    this.emit('monitoring:stopped')
    return true
  }

  /**
   * 检查是否正在监控
   */
  isRunning(): boolean {
    return this.isMonitoring
  }

  // ============== 社交媒体监控 ==============

  /**
   * 启动社交媒体监控
   */
  private startSocialMonitoring(): void {
    // Twitter监控
    if (this.config.social.platforms.twitter.enabled) {
      this.scheduleTask('twitter-monitor', 'social', 60000, () => {
        this.monitorTwitter()
      })
    }

    // Telegram监控
    if (this.config.social.platforms.telegram.enabled) {
      this.scheduleTask('telegram-monitor', 'social', 90000, () => {
        this.monitorTelegram()
      })
    }

    // Discord监控
    if (this.config.social.platforms.discord.enabled) {
      this.scheduleTask('discord-monitor', 'social', 120000, () => {
        this.monitorDiscord()
      })
    }
  }

  /**
   * 监控Twitter
   */
  private async monitorTwitter(): Promise<void> {
    try {
      logger.debug('HotspotMonitor', 'Twitter监控任务开始')
      
      // 模拟Twitter数据获取（实际项目需要集成Twitter API）
      const socialData = await this.fetchTwitterData()
      
      if (socialData) {
        await this.processSocialHotspot('twitter', socialData)
      }
    } catch (error) {
      logger.error('HotspotMonitor', 'Twitter监控失败', error)
    }
  }

  /**
   * 监控Telegram
   */
  private async monitorTelegram(): Promise<void> {
    try {
      logger.debug('HotspotMonitor', 'Telegram监控任务开始')
      
      const socialData = await this.fetchTelegramData()
      
      if (socialData) {
        await this.processSocialHotspot('telegram', socialData)
      }
    } catch (error) {
      logger.error('HotspotMonitor', 'Telegram监控失败', error)
    }
  }

  /**
   * 监控Discord
   */
  private async monitorDiscord(): Promise<void> {
    try {
      logger.debug('HotspotMonitor', 'Discord监控任务开始')
      
      const socialData = await this.fetchDiscordData()
      
      if (socialData) {
        await this.processSocialHotspot('discord', socialData)
      }
    } catch (error) {
      logger.error('HotspotMonitor', 'Discord监控失败', error)
    }
  }

  /**
   * 获取Twitter数据（模拟）
   */
  private async fetchTwitterData(): Promise<SocialHotspotData | null> {
    // TODO: 集成Twitter API v2
    // 目前返回模拟数据
    return {
      source: 'twitter',
      platform: 'Twitter',
      keyword: '$MOON',
      mentionCount: Math.floor(Math.random() * 500) + 50,
      engagementRate: Math.random() * 0.3 + 0.05,
      sentiment: Math.random() * 2 - 1,
      influencers: ['@cryptoKOL1', '@memeKing'],
      timestamp: Date.now(),
      growthRate: Math.random() * 2 + 0.5
    }
  }

  /**
   * 获取Telegram数据（模拟）
   */
  private async fetchTelegramData(): Promise<SocialHotspotData | null> {
    // TODO: 集成Telegram Bot API
    return {
      source: 'telegram',
      platform: 'Telegram',
      keyword: 'new token',
      mentionCount: Math.floor(Math.random() * 200) + 20,
      engagementRate: Math.random() * 0.2 + 0.02,
      sentiment: Math.random() * 2 - 1,
      influencers: [],
      timestamp: Date.now(),
      growthRate: Math.random() * 1.5 + 0.3
    }
  }

  /**
   * 获取Discord数据（模拟）
   */
  private async fetchDiscordData(): Promise<SocialHotspotData | null> {
    // TODO: 集成Discord.js SDK
    return {
      source: 'discord',
      platform: 'Discord',
      keyword: 'meme',
      mentionCount: Math.floor(Math.random() * 100) + 10,
      engagementRate: Math.random() * 0.15 + 0.01,
      sentiment: Math.random() * 2 - 1,
      influencers: [],
      timestamp: Date.now(),
      growthRate: Math.random() * 1 + 0.2
    }
  }

  // ============== 链上数据监控 ==============

  /**
   * 启动链上数据监控
   */
  private startOnchainMonitoring(): void {
    // BSC监控
    if (this.config.onchain.networks.includes('BSC')) {
      this.scheduleTask('bsc-monitor', 'onchain', 30000, () => {
        this.monitorBSC()
      })
    }

    // Solana监控
    if (this.config.onchain.networks.includes('Solana')) {
      this.scheduleTask('solana-monitor', 'onchain', 20000, () => {
        this.monitorSolana()
      })
    }
  }

  /**
   * 监控BSC链上数据
   */
  private async monitorBSC(): Promise<void> {
    try {
      logger.debug('HotspotMonitor', 'BSC链上监控任务开始')
      
      const onchainData = await this.fetchBSCOnchainData()
      
      if (onchainData) {
        await this.processOnchainHotspot('BSC', onchainData)
      }
    } catch (error) {
      logger.error('HotspotMonitor', 'BSC链上监控失败', error)
    }
  }

  /**
   * 监控Solana链上数据
   */
  private async monitorSolana(): Promise<void> {
    try {
      logger.debug('HotspotMonitor', 'Solana链上监控任务开始')
      
      const onchainData = await this.fetchSolanaOnchainData()
      
      if (onchainData) {
        await this.processOnchainHotspot('Solana', onchainData)
      }
    } catch (error) {
      logger.error('HotspotMonitor', 'Solana链上监控失败', error)
    }
  }

  /**
   * 获取BSC链上数据（模拟）
   */
  private async fetchBSCOnchainData(): Promise<OnchainHotspotData | null> {
    // TODO: 集成BSC RPC节点监控
    return {
      tokenAddress: '0x' + Math.random().toString(16).substr(2, 40),
      network: 'BSC',
      tokenSymbol: 'MOON',
      liquidityAdded: Math.random() > 0.5,
      liquidityAmount: (Math.random() * 100000 + 10000).toFixed(2),
      transactionVolume24h: (Math.random() * 500000 + 50000).toFixed(2),
      holderCount: Math.floor(Math.random() * 5000) + 100,
      priceChange1h: (Math.random() * 1 - 0.5),
      priceChange24h: (Math.random() * 2 - 1),
      largeTransactions: Math.floor(Math.random() * 10),
      timestamp: Date.now(),
      unusualActivity: [
        'Large transfer detected',
        'Liquidity added'
      ].filter(() => Math.random() > 0.5)
    }
  }

  /**
   * 获取Solana链上数据（模拟）
   */
  private async fetchSolanaOnchainData(): Promise<OnchainHotspotData | null> {
    // TODO: 集成Solana RPC节点监控
    return {
      tokenAddress: Math.random().toString(36).substr(2, 44),
      network: 'Solana',
      tokenSymbol: 'PEPE',
      liquidityAdded: Math.random() > 0.5,
      liquidityAmount: (Math.random() * 50000 + 5000).toFixed(2),
      transactionVolume24h: (Math.random() * 300000 + 30000).toFixed(2),
      holderCount: Math.floor(Math.random() * 3000) + 50,
      priceChange1h: (Math.random() * 1.5 - 0.75),
      priceChange24h: (Math.random() * 3 - 1.5),
      largeTransactions: Math.floor(Math.random() * 15),
      timestamp: Date.now(),
      unusualActivity: [
        'PumpFun launch detected',
        'Large whale activity'
      ].filter(() => Math.random() > 0.5)
    }
  }

  // ============== DEX监控 ==============

  /**
   * 启动DEX监控
   */
  private startDexMonitoring(): void {
    // 监控各个DEX
    this.config.dex.platforms.forEach(platform => {
      this.scheduleTask(`${platform.toLowerCase()}-monitor`, 'dex', 45000, () => {
        this.monitorDex(platform)
      })
    })
  }

  /**
   * 监控DEX数据
   */
  private async monitorDex(platform: string): Promise<void> {
    try {
      logger.debug('HotspotMonitor', `${platform}监控任务开始`)
      
      const dexData = await this.fetchDexData(platform)
      
      if (dexData) {
        await this.processDexHotspot(platform, dexData)
      }
    } catch (error) {
      logger.error('HotspotMonitor', `${platform}监控失败`, error)
    }
  }

  /**
   * 获取DEX数据（模拟）
   */
  private async fetchDexData(platform: string): Promise<DexHotspotData | null> {
    // TODO: 集成DEX API（PancakeSwap、Raydium等）
    const isSolana = ['Raydium', 'Orca', 'Jupiter'].includes(platform)
    
    return {
      dexName: platform,
      pairAddress: isSolana 
        ? Math.random().toString(36).substr(2, 44)
        : '0x' + Math.random().toString(16).substr(2, 40),
      token0: {
        address: isSolana ? 'So11111111111111111111111111111111111111112' : '0x0000000000000000000000000000000000000000',
        symbol: isSolana ? 'SOL' : 'BNB'
      },
      token1: {
        address: Math.random().toString(36).substr(2, 44),
        symbol: ['MOON', 'PEPE', 'SHIB', 'DOGE'][Math.floor(Math.random() * 4)]
      },
      price: (Math.random() * 0.01 + 0.000001).toFixed(18),
      liquidity: (Math.random() * 100000 + 10000).toFixed(2),
      volume24h: (Math.random() * 500000 + 50000).toFixed(2),
      priceChange24h: (Math.random() * 3 - 1.5),
      createdAt: Date.now() - Math.random() * 86400000,
      transactions24h: Math.floor(Math.random() * 10000) + 1000
    }
  }

  // ============== 热点处理 ==============

  /**
   * 处理社交媒体热点
   */
  private async processSocialHotspot(source: string, data: SocialHotspotData): Promise<void> {
    const hotspotId = `social-${source}-${data.keyword}-${Date.now()}`
    
    const score = this.calculateSocialScore(data)
    
    const hotspot: Hotspot = {
      id: hotspotId,
      type: 'social',
      source: data.source as any,
      status: 'analyzing',
      socialData: data,
      score,
      relatedTokens: [],
      firstDetectedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      hotDuration: 0,
      actions: []
    }
    
    this.hotspots.set(hotspotId, hotspot)
    
    logger.info('HotspotMonitor', '发现社交媒体热点', {
      id: hotspotId,
      keyword: data.keyword,
      score: score.score,
      priority: score.priority
    })
    
    this.emit('hotspot:detected', hotspot)
    
    // 如果达到高优先级，触发警报
    if (score.priority === 'high' || score.priority === 'critical') {
      this.emit('hotspot:alert', {
        hotspotId,
        type: 'new_hotspot',
        priority: score.priority,
        message: `发现高优先级热点: ${data.keyword}`,
        data: hotspot
      })
    }
  }

  /**
   * 处理链上热点
   */
  private async processOnchainHotspot(network: string, data: OnchainHotspotData): Promise<void> {
    const hotspotId = `onchain-${network}-${data.tokenSymbol}-${Date.now()}`
    
    const score = this.calculateOnchainScore(data)
    
    const hotspot: Hotspot = {
      id: hotspotId,
      type: 'onchain',
      source: 'onchain' as any,
      status: 'analyzing',
      onchainData: data,
      score,
      relatedTokens: [{
        address: data.tokenAddress,
        symbol: data.tokenSymbol,
        network: network as any,
        matchScore: score.onchainScore
      }],
      firstDetectedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      hotDuration: 0,
      actions: []
    }
    
    this.hotspots.set(hotspotId, hotspot)
    
    logger.info('HotspotMonitor', '发现链上热点', {
      id: hotspotId,
      token: data.tokenSymbol,
      network,
      score: score.score,
      priority: score.priority
    })
    
    this.emit('hotspot:detected', hotspot)
    
    if (score.priority === 'high' || score.priority === 'critical') {
      this.emit('hotspot:alert', {
        hotspotId,
        type: 'new_hotspot',
        priority: score.priority,
        message: `发现高优先级链上热点: ${data.tokenSymbol}`,
        data: hotspot
      })
    }
  }

  /**
   * 处理DEX热点
   */
  private async processDexHotspot(platform: string, data: DexHotspotData): Promise<void> {
    const hotspotId = `dex-${platform}-${data.token1.symbol}-${Date.now()}`
    
    const score = this.calculateDexScore(data)
    
    const hotspot: Hotspot = {
      id: hotspotId,
      type: 'dex',
      source: 'dex' as any,
      status: 'analyzing',
      dexData: data,
      score,
      relatedTokens: [{
        address: data.token1.address,
        symbol: data.token1.symbol,
        network: ['Raydium', 'Orca', 'Jupiter'].includes(platform) ? 'Solana' : 'BSC',
        matchScore: score.score
      }],
      firstDetectedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      hotDuration: 0,
      actions: []
    }
    
    this.hotspots.set(hotspotId, hotspot)
    
    logger.info('HotspotMonitor', '发现DEX热点', {
      id: hotspotId,
      token: data.token1.symbol,
      dex: platform,
      score: score.score,
      priority: score.priority
    })
    
    this.emit('hotspot:detected', hotspot)
    
    if (score.priority === 'high' || score.priority === 'critical') {
      this.emit('hotspot:alert', {
        hotspotId,
        type: 'new_hotspot',
        priority: score.priority,
        message: `发现高优先级DEX热点: ${data.token1.symbol} on ${platform}`,
        data: hotspot
      })
    }
  }

  // ============== 评分算法 ==============

  /**
   * 计算社交媒体评分
   */
  private calculateSocialScore(data: SocialHotspotData): HotspotScore {
    const weights = this.config.scoring.weights
    
    // 提及次数评分 (0-100)
    const mentionScore = Math.min(100, (data.mentionCount / 500) * 100)
    
    // 互动率评分 (0-100)
    const engagementScore = Math.min(100, (data.engagementRate / 0.5) * 100)
    
    // 情绪评分 (0-100)
    const sentimentScore = ((data.sentiment + 1) / 2) * 100
    
    // 增长率评分 (0-100)
    const growthScore = Math.min(100, (data.growthRate / 3) * 100)
    
    // KOL参与度评分 (0-100)
    const influencerScore = Math.min(100, (data.influencers.length / 10) * 100)
    
    // 综合评分
    const socialScore = (
      mentionScore * 0.3 +
      engagementScore * 0.25 +
      sentimentScore * 0.2 +
      growthScore * 0.15 +
      influencerScore * 0.1
    )
    
    const score = Math.round(socialScore)
    const priority = this.getPriority(score)
    
    return {
      score,
      socialScore,
      onchainScore: 0,
      volumeScore: 0,
      influencerScore: Math.round(influencerScore),
      priority,
      confidence: Math.min(1, data.mentionCount / 100)
    }
  }

  /**
   * 计算链上评分
   */
  private calculateOnchainScore(data: OnchainHotspotData): HotspotScore {
    const weights = this.config.scoring.weights
    
    // 流动性评分 (0-100)
    const liquidityScore = Math.min(100, (parseFloat(data.liquidityAmount) / 100000) * 100)
    
    // 交易量评分 (0-100)
    const volumeScore = Math.min(100, (parseFloat(data.transactionVolume24h) / 500000) * 100)
    
    // 持币人数评分 (0-100)
    const holderScore = Math.min(100, (data.holderCount / 5000) * 100)
    
    // 价格变化评分 (0-100)
    const priceChangeScore = Math.min(100, (Math.abs(data.priceChange24h) / 2) * 100)
    
    // 大额交易评分 (0-100)
    const largeTxScore = Math.min(100, (data.largeTransactions / 20) * 100)
    
    // 综合评分
    const onchainScore = (
      liquidityScore * 0.25 +
      volumeScore * 0.25 +
      holderScore * 0.2 +
      priceChangeScore * 0.2 +
      largeTxScore * 0.1
    )
    
    const score = Math.round(onchainScore)
    const priority = this.getPriority(score)
    
    return {
      score,
      socialScore: 0,
      onchainScore,
      volumeScore: Math.round(volumeScore),
      influencerScore: 0,
      priority,
      confidence: Math.min(1, data.holderCount / 1000)
    }
  }

  /**
   * 计算DEX评分
   */
  private calculateDexScore(data: DexHotspotData): HotspotScore {
    const weights = this.config.scoring.weights
    
    // 流动性评分 (0-100)
    const liquidityScore = Math.min(100, (parseFloat(data.liquidity) / 100000) * 100)
    
    // 交易量评分 (0-100)
    const volumeScore = Math.min(100, (parseFloat(data.volume24h) / 500000) * 100)
    
    // 价格变化评分 (0-100)
    const priceChangeScore = Math.min(100, (Math.abs(data.priceChange24h) / 3) * 100)
    
    // 交易次数评分 (0-100)
    const txCountScore = Math.min(100, (data.transactions24h / 10000) * 100)
    
    // 新池子加分
    const poolAge = Date.now() - data.createdAt
    const newPoolScore = poolAge < 86400000 ? 100 - (poolAge / 86400000) * 100 : 0
    
    // 综合评分
    const score = Math.round(
      liquidityScore * 0.25 +
      volumeScore * 0.25 +
      priceChangeScore * 0.2 +
      txCountScore * 0.15 +
      newPoolScore * 0.15
    )
    
    const priority = this.getPriority(score)
    
    return {
      score,
      socialScore: 0,
      onchainScore: Math.round(liquidityScore * 0.5 + volumeScore * 0.5),
      volumeScore: Math.round(volumeScore),
      influencerScore: 0,
      priority,
      confidence: Math.min(1, data.transactions24h / 5000)
    }
  }

  /**
   * 根据分数获取优先级
   */
  private getPriority(score: number): HotspotPriority {
    const thresholds = this.config.scoring.thresholds
    
    if (score >= thresholds.high) return 'high'
    if (score >= thresholds.medium) return 'medium'
    if (score >= thresholds.low) return 'low'
    return 'low'
  }

  // ============== 任务调度 ==============

  /**
   * 调度任务
   */
  private scheduleTask(id: string, type: MonitorTask['type'], interval: number, task: () => void): void {
    const taskInfo: MonitorTask = {
      id,
      type,
      interval,
      lastRun: 0,
      running: false
    }
    
    this.tasks.set(id, taskInfo)
    
    const timer = setInterval(() => {
      if (!this.isMonitoring) return
      
      const now = Date.now()
      if (now - taskInfo.lastRun >= interval) {
        taskInfo.lastRun = now
        task().catch(error => {
          logger.error('HotspotMonitor', `任务执行失败: ${id}`, error)
        })
      }
    }, 5000) // 每5秒检查一次
    
    this.monitoringIntervals.set(id, timer)
    
    logger.info('HotspotMonitor', `任务已调度: ${id}`, { interval })
  }

  // ============== 查询接口 ==============

  /**
   * 获取所有热点
   */
  getHotspots(filters?: { priority?: HotspotPriority, status?: any }): Hotspot[] {
    let hotspots = Array.from(this.hotspots.values())
    
    if (filters?.priority) {
      hotspots = hotspots.filter(h => h.score.priority === filters.priority)
    }
    
    if (filters?.status) {
      hotspots = hotspots.filter(h => h.status === filters.status)
    }
    
    // 按分数降序排序
    hotspots.sort((a, b) => b.score.score - a.score.score)
    
    return hotspots
  }

  /**
   * 获取单个热点
   */
  getHotspot(id: string): Hotspot | null {
    return this.hotspots.get(id) || null
  }

  /**
   * 获取热门热点
   */
  getTrendingHotspots(limit: number = 10): Hotspot[] {
    const hotspots = this.getHotspots()
      .filter(h => h.status === 'hot' || h.status === 'analyzing')
      .sort((a, b) => b.score.score - a.score.score)
    
    return hotspots.slice(0, limit)
  }

  /**
   * 清理过期热点
   */
  cleanupExpiredHotspots(maxAge: number = 3600000): void {
    const now = Date.now()
    const expiredIds: string[] = []
    
    this.hotspots.forEach((hotspot, id) => {
      if (now - hotspot.firstDetectedAt > maxAge) {
        expiredIds.push(id)
      }
    })
    
    expiredIds.forEach(id => {
      this.hotspots.delete(id)
    })
    
    if (expiredIds.length > 0) {
      logger.info('HotspotMonitor', `清理了 ${expiredIds.length} 个过期热点`)
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const hotspots = Array.from(this.hotspots.values())
    
    return {
      totalHotspots: hotspots.length,
      byType: {
        social: hotspots.filter(h => h.type === 'social').length,
        onchain: hotspots.filter(h => h.type === 'onchain').length,
        dex: hotspots.filter(h => h.type === 'dex').length
      },
      byStatus: {
        monitoring: hotspots.filter(h => h.status === 'monitoring').length,
        analyzing: hotspots.filter(h => h.status === 'analyzing').length,
        hot: hotspots.filter(h => h.status === 'hot').length,
        cooling: hotspots.filter(h => h.status === 'cooling').length,
        expired: hotspots.filter(h => h.status === 'expired').length
      },
      byPriority: {
        critical: hotspots.filter(h => h.score.priority === 'critical').length,
        high: hotspots.filter(h => h.score.priority === 'high').length,
        medium: hotspots.filter(h => h.score.priority === 'medium').length,
        low: hotspots.filter(h => h.score.priority === 'low').length
      },
      isMonitoring: this.isMonitoring,
      activeTasks: this.tasks.size
    }
  }
}

// ============== 导出单例 ==============

export const hotspotMonitor = new HotspotMonitorEngine()
