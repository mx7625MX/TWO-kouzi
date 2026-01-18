// 钱包相关类型
export interface Wallet {
  id: string
  name: string
  address: string
  network: 'BSC' | 'Solana'
  encrypted_key: string
  created_at: number
}

export interface CreateWalletInput {
  name: string
  address: string
  network: 'BSC' | 'Solana'
  encrypted_key: string
}

export interface ImportWalletInput {
  name: string
  network: 'BSC' | 'Solana'
  importType: 'privateKey' | 'mnemonic'
  privateKey?: string
  mnemonic?: string
  derivationPath?: string
  password: string
}

export interface ImportWalletResult {
  id: string
  address: string
}

// IPC通信类型定义
export interface WalletBalance {
  address: string
  balance: string
  network: 'BSC' | 'Solana'
}

export interface GetBalanceParams {
  address: string
  network: 'BSC' | 'Solana'
}

// IPC响应类型
export interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// ============== 热点监控相关类型 ==============

// 热点来源类型
export type HotspotSource = 'twitter' | 'telegram' | 'discord' | 'onchain' | 'dex'

// 热点优先级
export type HotspotPriority = 'low' | 'medium' | 'high' | 'critical'

// 热点状态
export type HotspotStatus = 'monitoring' | 'analyzing' | 'hot' | 'cooling' | 'expired'

// 社交媒体热点数据
export interface SocialHotspotData {
  source: HotspotSource
  platform: string // Twitter/Telegram/Discord
  keyword: string // 关键词或cashtag
  mentionCount: number // 提及次数
  engagementRate: number // 互动率
  sentiment: number // 情绪分数 (-1到1)
  influencers: string[] // 相关KOL列表
  timestamp: number
  growthRate: number // 增长率 (每分钟)
}

// 链上热点数据
export interface OnchainHotspotData {
  tokenAddress: string
  network: 'BSC' | 'Solana'
  tokenSymbol: string
  liquidityAdded: boolean // 是否添加流动性
  liquidityAmount: string
  transactionVolume24h: string
  holderCount: number
  priceChange1h: number
  priceChange24h: number
  largeTransactions: number // 大额交易数量
  timestamp: number
  unusualActivity: string[] // 异常活动列表
}

// DEX热点数据
export interface DexHotspotData {
  dexName: string // PancakeSwap/Raydium/Orca等
  pairAddress: string
  token0: {
    address: string
    symbol: string
  }
  token1: {
    address: string
    symbol: string
  }
  price: string
  liquidity: string
  volume24h: string
  priceChange24h: number
  createdAt: number
  transactions24h: number
}

// 热点评分结果
export interface HotspotScore {
  score: number // 总分 0-100
  socialScore: number // 社交媒体分数 0-100
  onchainScore: number // 链上数据分数 0-100
  volumeScore: number // 交易量分数 0-100
  influencerScore: number // KOL参与度分数 0-100
  priority: HotspotPriority
  confidence: number // 置信度 0-1
}

// 热点实体
export interface Hotspot {
  id: string
  type: 'social' | 'onchain' | 'dex'
  source: HotspotSource
  status: HotspotStatus
  
  // 热点数据
  socialData?: SocialHotspotData
  onchainData?: OnchainHotspotData
  dexData?: DexHotspotData
  
  // 评分信息
  score: HotspotScore
  
  // 关联信息
  relatedTokens: Array<{
    address: string
    symbol: string
    network: 'BSC' | 'Solana'
    matchScore: number
  }>
  
  // 时间信息
  firstDetectedAt: number
  lastUpdatedAt: number
  hotDuration: number // 热度持续时间（秒）
  
  // 操作记录
  actions: Array<{
    type: 'monitor' | 'analyze' | 'trade' | 'alert'
    timestamp: number
    result?: any
  }>
  
  // 用户配置
  userSettings?: {
    autoTrade: boolean
    tradeAmount: string
    stopLoss: number
    takeProfit: number
  }
}

// 热点监控配置
export interface HotspotMonitorConfig {
  // 社交媒体监控
  social: {
    enabled: boolean
    platforms: {
      twitter: {
        enabled: boolean
        apiKeys: string[]
        keywords: string[]
        cashtags: string[]
        influencers: string[]
      }
      telegram: {
        enabled: boolean
        channels: string[]
        keywords: string[]
      }
      discord: {
        enabled: boolean
        servers: string[]
        channels: string[]
        keywords: string[]
      }
    }
    minMentions: number // 最小提及次数
    minEngagementRate: number // 最小互动率
    sentimentThreshold: number // 情绪阈值
  }
  
  // 链上监控
  onchain: {
    enabled: boolean
    networks: ('BSC' | 'Solana')[]
    minLiquidity: string // 最小流动性
    minVolume24h: string // 最小24h交易量
    minHolders: number // 最小持币人数
    priceChangeThreshold: number // 价格变化阈值
    largeTransactionThreshold: string // 大额交易阈值
  }
  
  // DEX监控
  dex: {
    enabled: boolean
    platforms: string[] // PancakeSwap, Raydium, Orca等
    minLiquidity: string
    minVolume24h: string
    newPoolMonitor: boolean // 监控新创建的池子
  }
  
  // 评分算法
  scoring: {
    weights: {
      social: number // 社交媒体权重
      onchain: number // 链上数据权重
      volume: number // 交易量权重
      influencer: number // KOL权重
    }
    thresholds: {
      high: number // 高优先级阈值
      medium: number // 中优先级阈值
      low: number // 低优先级阈值
    }
  }
  
  // 警报设置
  alerts: {
    enabled: boolean
    minPriority: HotspotPriority // 最低警报优先级
    methods: {
      desktop: boolean
      sound: boolean
      email: boolean // 邮件通知（需配置）
    }
  }
  
  // 自动交易
  autoTrade: {
    enabled: boolean
    maxAmount: string // 最大交易金额
    minPriority: HotspotPriority // 最低交易优先级
    stopLossPercent: number // 止损百分比
    takeProfitPercent: number // 止盈百分比
  }
}

// 热点警报
export interface HotspotAlert {
  id: string
  hotspotId: string
  type: 'new_hotspot' | 'score_increase' | 'price_surge' | 'volume_surge'
  priority: HotspotPriority
  message: string
  data: any
  timestamp: number
  acknowledged: boolean
}

// 热点分析报告
export interface HotspotAnalysisReport {
  hotspotId: string
  generatedAt: number
  summary: string
  details: {
    market: {
      currentPrice: string
      marketCap: string
      liquidity: string
      volume24h: string
      priceChange1h: number
      priceChange24h: number
      priceChange7d: number
    }
    social: {
      totalMentions: number
      uniqueUsers: number
      avgSentiment: number
      topKeywords: string[]
      activeInfluencers: string[]
    }
    onchain: {
      holderCount: number
      topHolders: Array<{
        address: string
        balance: string
        percentage: number
      }>
      transactionPatterns: string[]
    }
    risk: {
      level: 'low' | 'medium' | 'high' | 'critical'
      factors: string[]
      score: number
    }
    opportunity: {
      level: 'low' | 'medium' | 'high' | 'critical'
      factors: string[]
      score: number
    }
  }
  recommendation: {
    action: 'buy' | 'sell' | 'hold' | 'ignore'
    confidence: number
    reasoning: string
    suggestedEntry?: string
    suggestedExit?: string
    suggestedStopLoss?: string
  }
}

// Electron API接口扩展
export interface ElectronAPI {
  // 钱包操作
  wallet: {
    create: (input: CreateWalletInput) => Promise<IPCResponse<string>>
    import: (input: ImportWalletInput) => Promise<IPCResponse<ImportWalletResult>>
    list: () => Promise<IPCResponse<Wallet[]>>
    getBalance: (params: GetBalanceParams) => Promise<IPCResponse<WalletBalance>>
    getById: (id: string) => Promise<IPCResponse<Wallet | null>>
    updateName: (id: string, name: string) => Promise<IPCResponse<boolean>>
    delete: (id: string) => Promise<IPCResponse<boolean>>
  }
  
  // 热点监控操作
  hotspot: {
    // 配置管理
    getConfig: () => Promise<IPCResponse<HotspotMonitorConfig>>
    updateConfig: (config: Partial<HotspotMonitorConfig>) => Promise<IPCResponse<boolean>>
    resetConfig: () => Promise<IPCResponse<boolean>>
    
    // 监控控制
    startMonitoring: () => Promise<IPCResponse<boolean>>
    stopMonitoring: () => Promise<IPCResponse<boolean>>
    isMonitoring: () => Promise<IPCResponse<boolean>>
    
    // 热点查询
    getHotspots: (filters?: { priority?: HotspotPriority, status?: HotspotStatus }) => Promise<IPCResponse<Hotspot[]>>
    getHotspot: (id: string) => Promise<IPCResponse<Hotspot | null>>
    getTrendingHotspots: (limit?: number) => Promise<IPCResponse<Hotspot[]>>
    
    // 热点分析
    analyzeHotspot: (id: string) => Promise<IPCResponse<HotspotAnalysisReport>>
    generateReport: (id: string) => Promise<IPCResponse<string>> // 返回报告URL
    
    // 警报管理
    getAlerts: (limit?: number) => Promise<IPCResponse<HotspotAlert[]>>
    acknowledgeAlert: (id: string) => Promise<IPCResponse<boolean>>
    
    // 自动交易
    enableAutoTrade: (settings: { maxAmount: string, minPriority: HotspotPriority }) => Promise<IPCResponse<boolean>>
    disableAutoTrade: () => Promise<IPCResponse<boolean>>
  }
  
  // 系统信息
  getVersion: () => NodeJS.ProcessVersions
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
