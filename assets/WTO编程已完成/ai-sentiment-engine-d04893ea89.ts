/**
 * AI情绪分析与预测引擎
 * 提供高级AI情绪分析、价格预测、风险评估和决策支持功能
 */

import { EventEmitter } from 'events'
import { logger } from '../utils/errorHandler'
import type {
  SentimentScore,
  PricePrediction,
  TrendAnalysis,
  RiskAssessment,
  AISentimentConfig,
  MarketSentiment,
  TokenAnalysis,
  DecisionSupport
} from '../../../shared/types'

// ============== 类型定义 ==============

interface SocialMediaPost {
  id: string
  platform: 'twitter' | 'telegram' | 'discord' | 'reddit'
  content: string
  author: string
  followers: number
  timestamp: number
  likes: number
  retweets: number
  replies: number
  hashtags: string[]
  mentions: string[]
}

interface OnchainData {
  tokenAddress: string
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  price: number
  priceChange24h: number
  volume24h: number
  liquidity: number
  holders: number
  transactions24h: number
  whaleTransactions: number
  largeBuys: number
  largeSells: number
}

interface MarketData {
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  price: number
  priceChange1h: number
  priceChange24h: number
  priceChange7d: number
  volume24h: number
  marketCap: number
  liquidity: number
  timestamp: number
}

interface PricePredictionModel {
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  prediction1h: { price: number; confidence: number }
  prediction24h: { price: number; confidence: number }
  prediction7d: { price: number; confidence: number }
  trend: 'bullish' | 'bearish' | 'neutral'
  factors: string[]
  generatedAt: number
}

interface RiskAssessmentModel {
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  overallRisk: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  riskScore: number
  riskFactors: {
    volatility: number
    liquidityRisk: number
    marketRisk: number
    socialRisk: number
    technicalRisk: number
  }
  riskLevel: number
  recommendations: string[]
  generatedAt: number
}

interface TrendAnalysisModel {
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  shortTermTrend: 'strong_up' | 'moderate_up' | 'neutral' | 'moderate_down' | 'strong_down'
  mediumTermTrend: 'strong_up' | 'moderate_up' | 'neutral' | 'moderate_down' | 'strong_down'
  longTermTrend: 'strong_up' | 'moderate_up' | 'neutral' | 'moderate_down' | 'strong_down'
  supportLevels: number[]
  resistanceLevels: number[]
  momentum: number
  volatility: number
  generatedAt: number
}

interface DecisionSupportModel {
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  action: 'buy' | 'sell' | 'hold' | 'wait'
  confidence: number
  reasoning: string[]
  riskRewardRatio: number
  suggestedEntryPrice?: number
  suggestedExitPrice?: number
  positionSize: string
  stopLoss?: number
  takeProfit?: number
  timeHorizon: 'short' | 'medium' | 'long'
  generatedAt: number
}

// ============== AI情绪分析引擎 ==============

export class AISentimentEngine extends EventEmitter {
  private isAnalyzing: boolean = false
  private config: AISentimentConfig
  private analysisInterval: NodeJS.Timeout | null = null
  private socialMediaCache: Map<string, SocialMediaPost[]> = new Map()
  private onchainDataCache: Map<string, OnchainData> = new Map()
  private marketDataCache: Map<string, MarketData[]> = new Map()
  private predictions: Map<string, PricePredictionModel> = new Map()
  private riskAssessments: Map<string, RiskAssessmentModel> = new Map()
  private trendAnalyses: Map<string, TrendAnalysisModel> = new Map()
  private decisionSupports: Map<string, DecisionSupportModel> = new Map()

  constructor(config?: Partial<AISentimentConfig>) {
    super()
    this.config = {
      enableSentimentAnalysis: true,
      enablePricePrediction: true,
      enableRiskAssessment: true,
      enableTrendAnalysis: true,
      enableDecisionSupport: true,
      analysisInterval: 30000, // 30秒
      predictionInterval: 60000, // 1分钟
      sentimentThresholds: {
        veryBullish: 0.8,
        bullish: 0.6,
        neutral: 0.4,
        bearish: 0.2,
        veryBearish: 0
      },
      predictionModels: ['lstm', 'arima', 'ensemble'],
      riskThresholds: {
        veryLow: 0.2,
        low: 0.4,
        medium: 0.6,
        high: 0.8,
        veryHigh: 1.0
      }
    }
    this.initialize()
  }

  /**
   * 初始化AI情绪分析引擎
   */
  private initialize(): void {
    logger.info('AISentimentEngine', 'AI情绪分析引擎初始化', {
      config: this.config
    })
    this.loadHistoricalData()
  }

  /**
   * 启动分析
   */
  startAnalysis(): void {
    if (this.isAnalyzing) {
      logger.warn('AISentimentEngine', '分析已在运行')
      return
    }

    this.isAnalyzing = true
    logger.info('AISentimentEngine', '启动AI情绪分析')

    // 定期分析
    this.analysisInterval = setInterval(() => {
      this.runAnalysis()
    }, this.config.analysisInterval)

    this.emit('analysis:started')
  }

  /**
   * 停止分析
   */
  stopAnalysis(): void {
    if (!this.isAnalyzing) {
      logger.warn('AISentimentEngine', '分析未运行')
      return
    }

    this.isAnalyzing = false
    logger.info('AISentimentEngine', '停止AI情绪分析')

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
      this.analysisInterval = null
    }

    this.emit('analysis:stopped')
  }

  /**
   * 运行完整分析流程
   */
  private async runAnalysis(): Promise<void> {
    try {
      // 1. 收集数据
      await this.collectData()

      // 2. 分析情绪
      await this.analyzeSentiment()

      // 3. 预测价格
      await this.predictPrices()

      // 4. 评估风险
      await this.assessRisks()

      // 5. 分析趋势
      await this.analyzeTrends()

      // 6. 生成决策支持
      await this.generateDecisionSupport()

      // 7. 发送通知
      this.emitAnalysisResults()
    } catch (error) {
      logger.error('AISentimentEngine', '分析流程失败', error)
    }
  }

  /**
   * 收集数据
   */
  private async collectData(): Promise<void> {
    try {
      // 收集社交媒体数据
      await this.collectSocialMediaData()

      // 收集链上数据
      await this.collectOnchainData()

      // 收集市场数据
      await this.collectMarketData()
    } catch (error) {
      logger.error('AISentimentEngine', '数据收集失败', error)
    }
  }

  /**
   * 收集社交媒体数据
   */
  private async collectSocialMediaData(): Promise<void> {
    // TODO: 实现从Twitter、Telegram、Discord等平台收集数据
    logger.info('AISentimentEngine', '收集社交媒体数据')
  }

  /**
   * 收集链上数据
   */
  private async collectOnchainData(): Promise<void> {
    // TODO: 实现从BSC和Solana链上收集数据
    logger.info('AISentimentEngine', '收集链上数据')
  }

  /**
   * 收集市场数据
   */
  private async collectMarketData(): Promise<void> {
    // TODO: 实现从DEX收集市场数据
    logger.info('AISentimentEngine', '收集市场数据')
  }

  /**
   * 分析情绪
   */
  private async analyzeSentiment(): Promise<void> {
    try {
      // 分析社交媒体情绪
      const socialSentiment = await this.analyzeSocialSentiment()

      // 分析链上情绪
      const onchainSentiment = await this.analyzeOnchainSentiment()

      // 综合市场情绪
      const marketSentiment = await this.combineSentiments(socialSentiment, onchainSentiment)

      // 发送情绪分析结果
      this.emit('sentiment:analyzed', marketSentiment)

      logger.info('AISentimentEngine', '情绪分析完成', {
        overallSentiment: marketSentiment.overallSentiment,
        sentimentScore: marketSentiment.sentimentScore
      })
    } catch (error) {
      logger.error('AISentimentEngine', '情绪分析失败', error)
    }
  }

  /**
   * 分析社交媒体情绪
   */
  private async analyzeSocialSentiment(): Promise<SentimentScore> {
    // TODO: 实现基于NLP的社交媒体情绪分析
    return {
      overall: 'neutral',
      score: 0.5,
      bullish: 0.45,
      bearish: 0.45,
      neutral: 0.1,
      confidence: 0.75
    }
  }

  /**
   * 分析链上情绪
   */
  private async analyzeOnchainSentiment(): Promise<SentimentScore> {
    // TODO: 实现基于链上数据的情绪分析
    return {
      overall: 'neutral',
      score: 0.5,
      bullish: 0.5,
      bearish: 0.4,
      neutral: 0.1,
      confidence: 0.7
    }
  }

  /**
   * 综合情绪
   */
  private async combineSentiments(
    socialSentiment: SentimentScore,
    onchainSentiment: SentimentScore
  ): Promise<MarketSentiment> {
    const socialWeight = 0.6
    const onchainWeight = 0.4

    const combinedScore = socialSentiment.score * socialWeight + onchainSentiment.score * onchainWeight
    const overallSentiment = this.classifySentiment(combinedScore)

    return {
      overallSentiment,
      sentimentScore: combinedScore,
      socialSentiment: socialSentiment.score,
      onchainSentiment: onchainSentiment.score,
      timestamp: Date.now()
    }
  }

  /**
   * 预测价格
   */
  private async predictPrices(): Promise<void> {
    try {
      // 对每个关注的代币进行价格预测
      const tokens = Array.from(this.onchainDataCache.keys())

      for (const tokenKey of tokens) {
        const onchainData = this.onchainDataCache.get(tokenKey)
        if (!onchainData) continue

        const prediction = await this.generatePricePrediction(onchainData)
        this.predictions.set(tokenKey, prediction)

        this.emit('price:predicted', {
          tokenSymbol: onchainData.tokenSymbol,
          network: onchainData.network,
          prediction
        })
      }

      logger.info('AISentimentEngine', '价格预测完成', {
        tokensCount: tokens.length
      })
    } catch (error) {
      logger.error('AISentimentEngine', '价格预测失败', error)
    }
  }

  /**
   * 生成价格预测
   */
  private async generatePricePrediction(data: OnchainData): Promise<PricePredictionModel> {
    try {
      // 使用多种模型进行预测
      const predictions = await this.runPredictionModels(data)

      // 融合预测结果
      const ensemblePrediction = this.ensemblePredictions(predictions)

      // 分析趋势
      const trend = this.analyzePriceTrend(data, ensemblePrediction)

      // 识别影响因素
      const factors = this.identifyPredictionFactors(data)

      return {
        tokenSymbol: data.tokenSymbol,
        network: data.network,
        prediction1h: ensemblePrediction.prediction1h,
        prediction24h: ensemblePrediction.prediction24h,
        prediction7d: ensemblePrediction.prediction7d,
        trend,
        factors,
        generatedAt: Date.now()
      }
    } catch (error) {
      logger.error('AISentimentEngine', '价格预测生成失败', error)
      throw error
    }
  }

  /**
   * 运行预测模型
   */
  private async runPredictionModels(data: OnchainData): Promise<PricePredictionModel[]> {
    const predictions: PricePredictionModel[] = []

    // LSTM模型
    const lstmPrediction = await this.runLSTMModel(data)
    predictions.push(lstmPrediction)

    // ARIMA模型
    const arimaPrediction = await this.runARIMAModel(data)
    predictions.push(arimaPrediction)

    // 集成模型
    const ensemblePrediction = await this.runEnsembleModel(data)
    predictions.push(ensemblePrediction)

    return predictions
  }

  /**
   * LSTM模型
   */
  private async runLSTMModel(data: OnchainData): Promise<PricePredictionModel> {
    // TODO: 实现LSTM神经网络模型
    return {
      tokenSymbol: data.tokenSymbol,
      network: data.network,
      prediction1h: { price: data.price * 1.02, confidence: 0.75 },
      prediction24h: { price: data.price * 1.05, confidence: 0.7 },
      prediction7d: { price: data.price * 1.15, confidence: 0.65 },
      trend: 'bullish',
      factors: ['技术指标', '历史趋势'],
      generatedAt: Date.now()
    }
  }

  /**
   * ARIMA模型
   */
  private async runARIMAModel(data: OnchainData): Promise<PricePredictionModel> {
    // TODO: 实现ARIMA时间序列模型
    return {
      tokenSymbol: data.tokenSymbol,
      network: data.network,
      prediction1h: { price: data.price * 1.015, confidence: 0.8 },
      prediction24h: { price: data.price * 1.04, confidence: 0.75 },
      prediction7d: { price: data.price * 1.12, confidence: 0.7 },
      trend: 'bullish',
      factors: ['时间序列分析', '季节性'],
      generatedAt: Date.now()
    }
  }

  /**
   * 集成模型
   */
  private async runEnsembleModel(data: OnchainData): Promise<PricePredictionModel> {
    // TODO: 实现集成学习方法
    return {
      tokenSymbol: data.tokenSymbol,
      network: data.network,
      prediction1h: { price: data.price * 1.018, confidence: 0.85 },
      prediction24h: { price: data.price * 1.045, confidence: 0.8 },
      prediction7d: { price: data.price * 1.14, confidence: 0.75 },
      trend: 'bullish',
      factors: ['多模型融合', '机器学习'],
      generatedAt: Date.now()
    }
  }

  /**
   * 融合预测结果
   */
  private ensemblePredictions(predictions: PricePredictionModel[]): any {
    // 加权平均融合
    const weights = [0.3, 0.3, 0.4] // LSTM, ARIMA, Ensemble

    const prediction1h = {
      price: predictions.reduce((sum, p, i) => sum + p.prediction1h.price * weights[i], 0),
      confidence: predictions.reduce((sum, p, i) => sum + p.prediction1h.confidence * weights[i], 0)
    }

    const prediction24h = {
      price: predictions.reduce((sum, p, i) => sum + p.prediction24h.price * weights[i], 0),
      confidence: predictions.reduce((sum, p, i) => sum + p.prediction24h.confidence * weights[i], 0)
    }

    const prediction7d = {
      price: predictions.reduce((sum, p, i) => sum + p.prediction7d.price * weights[i], 0),
      confidence: predictions.reduce((sum, p, i) => sum + p.prediction7d.confidence * weights[i], 0)
    }

    return { prediction1h, prediction24h, prediction7d }
  }

  /**
   * 分析价格趋势
   */
  private analyzePriceTrend(data: OnchainData, prediction: any): 'bullish' | 'bearish' | 'neutral' {
    const priceChange = prediction.prediction24h.price / data.price - 1

    if (priceChange > 0.05) return 'bullish'
    if (priceChange < -0.05) return 'bearish'
    return 'neutral'
  }

  /**
   * 识别预测因素
   */
  private identifyPredictionFactors(data: OnchainData): string[] {
    const factors: string[] = []

    // 流动性因素
    if (data.liquidity > 100000) factors.push('高流动性')
    if (data.liquidity < 10000) factors.push('低流动性风险')

    // 交易量因素
    if (data.volume24h > 500000) factors.push('高交易量')
    if (data.volume24h < 50000) factors.push('低交易量')

    // 持仓因素
    if (data.holders > 1000) factors.push('分散持仓')
    if (data.holders < 100) factors.push('集中持仓风险')

    // 巨鲸活动因素
    if (data.whaleTransactions > 10) factors.push('巨鲸活跃')
    if (data.largeBuys > data.largeSells) factors.push('买入压力')
    if (data.largeSells > data.largeBuys) factors.push('卖出压力')

    return factors
  }

  /**
   * 评估风险
   */
  private async assessRisks(): Promise<void> {
    try {
      const tokens = Array.from(this.onchainDataCache.keys())

      for (const tokenKey of tokens) {
        const onchainData = this.onchainDataCache.get(tokenKey)
        if (!onchainData) continue

        const riskAssessment = await this.generateRiskAssessment(onchainData)
        this.riskAssessments.set(tokenKey, riskAssessment)

        this.emit('risk:assessed', {
          tokenSymbol: onchainData.tokenSymbol,
          network: onchainData.network,
          riskAssessment
        })
      }

      logger.info('AISentimentEngine', '风险评估完成', {
        tokensCount: tokens.length
      })
    } catch (error) {
      logger.error('AISentimentEngine', '风险评估失败', error)
    }
  }

  /**
   * 生成风险评估
   */
  private async generateRiskAssessment(data: OnchainData): Promise<RiskAssessmentModel> {
    // 波动性风险
    const volatilityRisk = this.calculateVolatilityRisk(data)

    // 流动性风险
    const liquidityRisk = this.calculateLiquidityRisk(data)

    // 市场风险
    const marketRisk = this.calculateMarketRisk(data)

    // 社交媒体风险
    const socialRisk = this.calculateSocialRisk(data)

    // 技术风险
    const technicalRisk = this.calculateTechnicalRisk(data)

    // 综合风险评分
    const riskScore = (
      volatilityRisk * 0.25 +
      liquidityRisk * 0.25 +
      marketRisk * 0.2 +
      socialRisk * 0.15 +
      technicalRisk * 0.15
    )

    // 风险等级
    const overallRisk = this.classifyRisk(riskScore)

    // 生成建议
    const recommendations = this.generateRiskRecommendations(
      overallRisk,
      volatilityRisk,
      liquidityRisk,
      marketRisk
    )

    return {
      tokenSymbol: data.tokenSymbol,
      network: data.network,
      overallRisk,
      riskScore,
      riskFactors: {
        volatility: volatilityRisk,
        liquidity: liquidityRisk,
        market: marketRisk,
        social: socialRisk,
        technical: technicalRisk
      },
      riskLevel: Math.round(riskScore * 100),
      recommendations,
      generatedAt: Date.now()
    }
  }

  /**
   * 计算波动性风险
   */
  private calculateVolatilityRisk(data: OnchainData): number {
    const priceChange = Math.abs(data.priceChange24h)
    
    if (priceChange > 0.5) return 0.9 // 风险极高
    if (priceChange > 0.3) return 0.7 // 风险高
    if (priceChange > 0.15) return 0.5 // 风险中等
    if (priceChange > 0.05) return 0.3 // 风险低
    return 0.1 // 风险极低
  }

  /**
   * 计算流动性风险
   */
  private calculateLiquidityRisk(data: OnchainData): number {
    const liquidity = data.liquidity

    if (liquidity < 10000) return 0.9 // 流动性极低，风险极高
    if (liquidity < 50000) return 0.7 // 流动性低，风险高
    if (liquidity < 200000) return 0.5 // 流动性中等，风险中等
    if (liquidity < 1000000) return 0.3 // 流动性高，风险低
    return 0.1 // 流动性极高，风险极低
  }

  /**
   * 计算市场风险
   */
  private calculateMarketRisk(data: OnchainData): number {
    // 交易量风险
    const volumeRisk = data.volume24h < 50000 ? 0.7 : 0.3

    // 持仓集中度风险
    const holderRisk = data.holders < 100 ? 0.7 : 0.3

    return (volumeRisk + holderRisk) / 2
  }

  /**
   * 计算社交媒体风险
   */
  private calculateSocialRisk(data: OnchainData): number {
    // TODO: 基于社交媒体数据计算风险
    return 0.4
  }

  /**
   * 计算技术风险
   */
  private calculateTechnicalRisk(data: OnchainData): number {
    // TODO: 基于技术指标计算风险
    return 0.4
  }

  /**
   * 分类风险
   */
  private classifyRisk(riskScore: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (riskScore <= 0.2) return 'very_low'
    if (riskScore <= 0.4) return 'low'
    if (riskScore <= 0.6) return 'medium'
    if (riskScore <= 0.8) return 'high'
    return 'very_high'
  }

  /**
   * 生成风险建议
   */
  private generateRiskRecommendations(
    overallRisk: string,
    volatilityRisk: number,
    liquidityRisk: number,
    marketRisk: number
  ): string[] {
    const recommendations: string[] = []

    if (overallRisk === 'very_high') {
      recommendations.push('强烈建议避免交易')
      recommendations.push('风险极高，可能导致重大损失')
    } else if (overallRisk === 'high') {
      recommendations.push('建议谨慎交易')
      recommendations.push('使用较小的仓位')
    } else if (overallRisk === 'medium') {
      recommendations.push('可以适量交易')
      recommendations.push('建议设置止损')
    } else if (overallRisk === 'low') {
      recommendations.push('可以正常交易')
      recommendations.push('但仍需关注市场变化')
    } else {
      recommendations.push('风险较低，可以积极交易')
    }

    // 针对性建议
    if (volatilityRisk > 0.6) {
      recommendations.push('波动性较高，建议使用限价单')
    }

    if (liquidityRisk > 0.6) {
      recommendations.push('流动性较低，注意滑点风险')
    }

    if (marketRisk > 0.6) {
      recommendations.push('市场风险较高，建议分批交易')
    }

    return recommendations
  }

  /**
   * 分析趋势
   */
  private async analyzeTrends(): Promise<void> {
    try {
      const tokens = Array.from(this.marketDataCache.keys())

      for (const tokenKey of tokens) {
        const marketDataList = this.marketDataCache.get(tokenKey)
        if (!marketDataList || marketDataList.length < 10) continue

        const trendAnalysis = await this.generateTrendAnalysis(marketDataList)
        this.trendAnalyses.set(tokenKey, trendAnalysis)

        this.emit('trend:analyzed', {
          tokenSymbol: trendAnalysis.tokenSymbol,
          network: trendAnalysis.network,
          trendAnalysis
        })
      }

      logger.info('AISentimentEngine', '趋势分析完成', {
        tokensCount: tokens.length
      })
    } catch (error) {
      logger.error('AISentimentEngine', '趋势分析失败', error)
    }
  }

  /**
   * 生成趋势分析
   */
  private async generateTrendAnalysis(marketDataList: MarketData[]): Promise<TrendAnalysisModel> {
    const latest = marketDataList[marketDataList.length - 1]

    // 短期趋势（1小时）
    const shortTermTrend = this.calculateShortTermTrend(marketDataList)

    // 中期趋势（24小时）
    const mediumTermTrend = this.calculateMediumTermTrend(marketDataList)

    // 长期趋势（7天）
    const longTermTrend = this.calculateLongTermTrend(marketDataList)

    // 支撑位和阻力位
    const supportLevels = this.calculateSupportLevels(marketDataList)
    const resistanceLevels = this.calculateResistanceLevels(marketDataList)

    // 动量指标
    const momentum = this.calculateMomentum(marketDataList)

    // 波动率
    const volatility = this.calculateVolatility(marketDataList)

    return {
      tokenSymbol: latest.tokenSymbol,
      network: latest.network,
      shortTermTrend,
      mediumTermTrend,
      longTermTrend,
      supportLevels,
      resistanceLevels,
      momentum,
      volatility,
      generatedAt: Date.now()
    }
  }

  /**
   * 计算短期趋势
   */
  private calculateShortTermTrend(marketDataList: MarketData[]): any {
    const recentData = marketDataList.slice(-12) // 最近12个数据点

    const prices = recentData.map(d => d.price)
    const trend = prices[prices.length - 1] / prices[0] - 1

    if (trend > 0.03) return 'strong_up'
    if (trend > 0.01) return 'moderate_up'
    if (trend < -0.03) return 'strong_down'
    if (trend < -0.01) return 'moderate_down'
    return 'neutral'
  }

  /**
   * 计算中期趋势
   */
  private calculateMediumTermTrend(marketDataList: MarketData[]): any {
    const priceChange = marketDataList[marketDataList.length - 1].priceChange24h

    if (priceChange > 0.1) return 'strong_up'
    if (priceChange > 0.05) return 'moderate_up'
    if (priceChange < -0.1) return 'strong_down'
    if (priceChange < -0.05) return 'moderate_down'
    return 'neutral'
  }

  /**
   * 计算长期趋势
   */
  private calculateLongTermTrend(marketDataList: MarketData[]): any {
    const priceChange = marketDataList[marketDataList.length - 1].priceChange7d

    if (priceChange > 0.3) return 'strong_up'
    if (priceChange > 0.15) return 'moderate_up'
    if (priceChange < -0.3) return 'strong_down'
    if (priceChange < -0.15) return 'moderate_down'
    return 'neutral'
  }

  /**
   * 计算支撑位
   */
  private calculateSupportLevels(marketDataList: MarketData[]): number[] {
    // TODO: 实现支撑位计算
    const prices = marketDataList.map(d => d.price)
    const minPrice = Math.min(...prices)
    return [minPrice * 0.95, minPrice * 0.9, minPrice * 0.85]
  }

  /**
   * 计算阻力位
   */
  private calculateResistanceLevels(marketDataList: MarketData[]): number[] {
    // TODO: 实现阻力位计算
    const prices = marketDataList.map(d => d.price)
    const maxPrice = Math.max(...prices)
    return [maxPrice * 1.05, maxPrice * 1.1, maxPrice * 1.15]
  }

  /**
   * 计算动量指标
   */
  private calculateMomentum(marketDataList: MarketData[]): number {
    // TODO: 实现动量指标计算
    return 0.5
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(marketDataList: MarketData[]): number {
    const prices = marketDataList.map(d => d.price)
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    return Math.sqrt(variance) / mean
  }

  /**
   * 生成决策支持
   */
  private async generateDecisionSupport(): Promise<void> {
    try {
      const tokens = Array.from(this.onchainDataCache.keys())

      for (const tokenKey of tokens) {
        const onchainData = this.onchainDataCache.get(tokenKey)
        const prediction = this.predictions.get(tokenKey)
        const riskAssessment = this.riskAssessments.get(tokenKey)
        const trendAnalysis = this.trendAnalyses.get(tokenKey)

        if (!onchainData || !prediction || !riskAssessment) continue

        const decisionSupport = await this.generateDecision(
          onchainData,
          prediction,
          riskAssessment,
          trendAnalysis
        )

        this.decisionSupports.set(tokenKey, decisionSupport)

        this.emit('decision:support', {
          tokenSymbol: onchainData.tokenSymbol,
          network: onchainData.network,
          decisionSupport
        })
      }

      logger.info('AISentimentEngine', '决策支持生成完成', {
        tokensCount: tokens.length
      })
    } catch (error) {
      logger.error('AISentimentEngine', '决策支持生成失败', error)
    }
  }

  /**
   * 生成决策
   */
  private async generateDecision(
    onchainData: OnchainData,
    prediction: PricePredictionModel,
    riskAssessment: RiskAssessmentModel,
    trendAnalysis?: TrendAnalysisModel
  ): Promise<DecisionSupportModel> {
    // 分析买入信号
    const buySignals = this.analyzeBuySignals(prediction, riskAssessment, trendAnalysis)

    // 分析卖出信号
    const sellSignals = this.analyzeSellSignals(prediction, riskAssessment, trendAnalysis)

    // 综合决策
    const { action, confidence, reasoning } = this.makeDecision(buySignals, sellSignals)

    // 风险收益比
    const riskRewardRatio = this.calculateRiskRewardRatio(prediction, riskAssessment)

    // 建议参数
    const parameters = this.generateTradeParameters(onchainData, prediction, riskAssessment)

    return {
      tokenSymbol: onchainData.tokenSymbol,
      network: onchainData.network,
      action,
      confidence,
      reasoning,
      riskRewardRatio,
      ...parameters,
      generatedAt: Date.now()
    }
  }

  /**
   * 分析买入信号
   */
  private analyzeBuySignals(
    prediction: PricePredictionModel,
    riskAssessment: RiskAssessmentModel,
    trendAnalysis?: TrendAnalysisModel
  ): any[] {
    const signals: any[] = []

    // 趋势信号
    if (prediction.trend === 'bullish') {
      signals.push({ type: 'trend', strength: 0.8, reason: '价格趋势看涨' })
    }

    // 风险信号
    if (riskAssessment.overallRisk === 'low' || riskAssessment.overallRisk === 'very_low') {
      signals.push({ type: 'risk', strength: 0.7, reason: '风险较低' })
    }

    // 趋势分析信号
    if (trendAnalysis && trendAnalysis.shortTermTrend === 'strong_up') {
      signals.push({ type: 'momentum', strength: 0.9, reason: '短期动量强劲' })
    }

    return signals
  }

  /**
   * 分析卖出信号
   */
  private analyzeSellSignals(
    prediction: PricePredictionModel,
    riskAssessment: RiskAssessmentModel,
    trendAnalysis?: TrendAnalysisModel
  ): any[] {
    const signals: any[] = []

    // 趋势信号
    if (prediction.trend === 'bearish') {
      signals.push({ type: 'trend', strength: 0.8, reason: '价格趋势看跌' })
    }

    // 风险信号
    if (riskAssessment.overallRisk === 'high' || riskAssessment.overallRisk === 'very_high') {
      signals.push({ type: 'risk', strength: 0.9, reason: '风险极高' })
    }

    // 趋势分析信号
    if (trendAnalysis && trendAnalysis.shortTermTrend === 'strong_down') {
      signals.push({ type: 'momentum', strength: 0.9, reason: '短期动量疲软' })
    }

    return signals
  }

  /**
   * 做出决策
   */
  private makeDecision(buySignals: any[], sellSignals: any[]): any {
    const buyScore = buySignals.reduce((sum, s) => sum + s.strength, 0)
    const sellScore = sellSignals.reduce((sum, s) => sum + s.strength, 0)

    const reasoning = []

    if (buyScore > sellScore) {
      const confidence = Math.min(0.95, buyScore / (buyScore + sellScore))
      buySignals.forEach(s => reasoning.push(`买入信号: ${s.reason}`))
      return {
        action: 'buy',
        confidence,
        reasoning
      }
    } else if (sellScore > buyScore) {
      const confidence = Math.min(0.95, sellScore / (buyScore + sellScore))
      sellSignals.forEach(s => reasoning.push(`卖出信号: ${s.reason}`))
      return {
        action: 'sell',
        confidence,
        reasoning
      }
    } else {
      return {
        action: 'hold',
        confidence: 0.5,
        reasoning: ['市场信号不明，建议持有']
      }
    }
  }

  /**
   * 计算风险收益比
   */
  private calculateRiskRewardRatio(
    prediction: PricePredictionModel,
    riskAssessment: RiskAssessmentModel
  ): number {
    const potentialReturn = prediction.prediction24h.price / prediction.prediction1h.price - 1
    const potentialLoss = riskAssessment.riskScore

    return potentialReturn / (potentialLoss || 0.1)
  }

  /**
   * 生成交易参数
   */
  private generateTradeParameters(
    onchainData: OnchainData,
    prediction: PricePredictionModel,
    riskAssessment: RiskAssessmentModel
  ): any {
    const parameters: any = {}

    // 建议入场价格
    parameters.suggestedEntryPrice = onchainData.price * 0.99

    // 建议出场价格
    parameters.suggestedExitPrice = prediction.prediction24h.price * 0.98

    // 仓位大小
    if (riskAssessment.overallRisk === 'low' || riskAssessment.overallRisk === 'very_low') {
      parameters.positionSize = 'large'
    } else if (riskAssessment.overallRisk === 'medium') {
      parameters.positionSize = 'medium'
    } else {
      parameters.positionSize = 'small'
    }

    // 止损
    parameters.stopLoss = onchainData.price * 0.95

    // 止盈
    parameters.takeProfit = prediction.prediction24h.price * 0.98

    // 时间周期
    if (prediction.trend === 'bullish' && prediction.prediction7d.price > prediction.prediction24h.price) {
      parameters.timeHorizon = 'long'
    } else {
      parameters.timeHorizon = 'medium'
    }

    return parameters
  }

  /**
   * 发送分析结果
   */
  private emitAnalysisResults(): void {
    // 发送综合分析报告
    this.emit('analysis:complete', {
      predictions: Array.from(this.predictions.values()),
      riskAssessments: Array.from(this.riskAssessments.values()),
      trendAnalyses: Array.from(this.trendAnalyses.values()),
      decisionSupports: Array.from(this.decisionSupports.values())
    })
  }

  /**
   * 分类情绪
   */
  private classifySentiment(score: number): 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish' {
    if (score >= 0.8) return 'very_bullish'
    if (score >= 0.6) return 'bullish'
    if (score >= 0.4) return 'neutral'
    if (score >= 0.2) return 'bearish'
    return 'very_bearish'
  }

  /**
   * 加载历史数据
   */
  private loadHistoricalData(): void {
    // TODO: 从数据库加载历史数据
  }

  // ============== 公共方法 ==============

  /**
   * 获取配置
   */
  getConfig(): AISentimentConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AISentimentConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('AISentimentEngine', '配置已更新', { config })
  }

  /**
   * 获取价格预测
   */
  getPricePrediction(tokenSymbol: string, network: 'BSC' | 'Solana'): PricePredictionModel | undefined {
    const key = `${network}_${tokenSymbol}`
    return this.predictions.get(key)
  }

  /**
   * 获取风险评估
   */
  getRiskAssessment(tokenSymbol: string, network: 'BSC' | 'Solana'): RiskAssessmentModel | undefined {
    const key = `${network}_${tokenSymbol}`
    return this.riskAssessments.get(key)
  }

  /**
   * 获取趋势分析
   */
  getTrendAnalysis(tokenSymbol: string, network: 'BSC' | 'Solana'): TrendAnalysisModel | undefined {
    const key = `${network}_${tokenSymbol}`
    return this.trendAnalyses.get(key)
  }

  /**
   * 获取决策支持
   */
  getDecisionSupport(tokenSymbol: string, network: 'BSC' | 'Solana'): DecisionSupportModel | undefined {
    const key = `${network}_${tokenSymbol}`
    return this.decisionSupports.get(key)
  }

  /**
   * 获取所有预测
   */
  getAllPredictions(): PricePredictionModel[] {
    return Array.from(this.predictions.values())
  }

  /**
   * 获取所有风险评估
   */
  getAllRiskAssessments(): RiskAssessmentModel[] {
    return Array.from(this.riskAssessments.values())
  }

  /**
   * 获取所有趋势分析
   */
  getAllTrendAnalyses(): TrendAnalysisModel[] {
    return Array.from(this.trendAnalyses.values())
  }

  /**
   * 获取所有决策支持
   */
  getAllDecisionSupports(): DecisionSupportModel[] {
    return Array.from(this.decisionSupports.values())
  }
}

// ============== 导出单例 ==============

export const aiSentimentEngine = new AISentimentEngine()
