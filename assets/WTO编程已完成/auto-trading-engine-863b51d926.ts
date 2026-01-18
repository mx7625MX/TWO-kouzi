/**
 * 自动交易引擎
 * 提供智能自动交易功能，包括热点自动交易、风险控制、止盈止损、多策略组合
 */

import { EventEmitter } from 'events'
import { logger } from '../utils/errorHandler'
import { aiSentimentEngine } from './ai-sentiment-engine'
import { hotspotMonitor } from './hotspot-monitor'
import type {
  AutoTradeStrategy,
  AutoTradeTask,
  TradeExecution,
  RiskControlConfig,
  StopLossConfig,
  TakeProfitConfig,
  AutoTradeStats,
  AutoTradeConfig
} from '../../../shared/types'

// ============== 类型定义 ==============

interface TradingSignal {
  id: string
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  reason: string
  timestamp: number
  source: 'ai_sentiment' | 'hotspot' | 'trend' | 'manual'
  data?: any
}

interface TradeExecutionDetail {
  executionId: string
  taskId: string
  action: 'buy' | 'sell'
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  amount: string
  price: number
  txHash: string
  walletAddress: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
  gasUsed?: string
  errorMessage?: string
}

interface Position {
  id: string
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  tokenAddress: string
  walletAddress: string
  entryPrice: number
  currentPrice: number
  amount: string
  value: string
  profit: number
  profitPercent: number
  entryTime: number
  lastUpdated: number
  status: 'active' | 'closed'
  closeTime?: number
  closeReason?: 'manual' | 'stop_loss' | 'take_profit' | 'strategy_end'
}

interface RiskAlert {
  id: string
  taskId: string
  alertType: 'stop_loss' | 'take_profit' | 'risk_limit' | 'position_limit'
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  currentValue: number
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  message: string
  timestamp: number
  resolved?: boolean
}

// ============== 自动交易引擎 ==============

export class AutoTradingEngine extends EventEmitter {
  private isRunning: boolean = false
  private config: AutoTradeConfig
  private tasks: Map<string, AutoTradeTask> = new Map()
  private positions: Map<string, Position> = new Map()
  private signals: TradingSignal[] = []
  private executions: TradeExecutionDetail[] = []
  private riskAlerts: RiskAlert[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private riskCheckInterval: NodeJS.Timeout | null = null
  private signalProcessInterval: NodeJS.Timeout | null = null
  private stats: AutoTradeStats = {
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalVolume: '0',
    totalProfit: '0',
    totalLoss: '0',
    winRate: 0,
    avgProfitPerTrade: '0',
    avgHoldingTime: 0
  }

  constructor(config?: Partial<AutoTradeConfig>) {
    super()
    this.config = {
      enabled: true,
      maxActiveTasks: 5,
      maxTotalPositions: 10,
      maxPositionValue: '1000',
      maxDailyLoss: '100',
      enableRiskControl: true,
      enableStopLoss: true,
      enableTakeProfit: true,
      enableAutoBuy: true,
      enableAutoSell: true,
      minConfidence: 0.7,
      minRiskRewardRatio: 1.5,
      riskControl: {
        maxDailyLossPercent: 5,
        maxPositionValuePercent: 10,
        maxTotalPositionsPercent: 20,
        enableDynamicRisk: true
      },
      stopLoss: {
        enabled: true,
        defaultStopLossPercent: 5,
        dynamicStopLoss: true,
        trailingStopLossPercent: 3
      },
      takeProfit: {
        enabled: true,
        defaultTakeProfitPercent: 10,
        dynamicTakeProfit: true,
        partialTakeProfit: true,
        partialTakeProfitPercent: 50,
        partialTakeProfitLevels: [5, 10, 15]
      }
    }
    this.initialize()
  }

  /**
   * 初始化自动交易引擎
   */
  private initialize(): void {
    logger.info('AutoTradingEngine', '自动交易引擎初始化', {
      config: this.config
    })
    this.setupEventListeners()
    this.loadHistoricalData()
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听AI情绪分析的决策支持
    aiSentimentEngine.on('decision:support', (data: any) => {
      this.handleAIDecision(data)
    })

    // 监听热点监控的高优先级热点
    hotspotMonitor.on('hotspot:alert', (data: any) => {
      this.handleHotspotAlert(data)
    })
  }

  /**
   * 启动自动交易
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('AutoTradingEngine', '自动交易已在运行')
      return
    }

    this.isRunning = true
    logger.info('AutoTradingEngine', '启动自动交易')

    // 定期监控任务状态
    this.monitoringInterval = setInterval(() => {
      this.monitorTasks()
    }, 5000) // 5秒

    // 定期检查风险
    if (this.config.enableRiskControl) {
      this.riskCheckInterval = setInterval(() => {
        this.checkRiskControls()
      }, 10000) // 10秒
    }

    // 定期处理交易信号
    if (this.config.enableAutoBuy || this.config.enableAutoSell) {
      this.signalProcessInterval = setInterval(() => {
        this.processSignals()
      }, 30000) // 30秒
    }

    this.emit('trading:started')
  }

  /**
   * 停止自动交易
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('AutoTradingEngine', '自动交易未运行')
      return
    }

    this.isRunning = false
    logger.info('AutoTradingEngine', '停止自动交易')

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.riskCheckInterval) {
      clearInterval(this.riskCheckInterval)
      this.riskCheckInterval = null
    }

    if (this.signalProcessInterval) {
      clearInterval(this.signalProcessInterval)
      this.signalProcessInterval = null
    }

    this.emit('trading:stopped')
  }

  /**
   * 监控任务状态
   */
  private async monitorTasks(): Promise<void> {
    try {
      const tasks = Array.from(this.tasks.values()).filter(t => t.status === 'active')

      for (const task of tasks) {
        await this.updateTaskStatus(task)
      }
    } catch (error) {
      logger.error('AutoTradingEngine', '任务监控失败', error)
    }
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(task: AutoTradeTask): Promise<void> {
    try {
      // 获取当前价格
      const currentPrice = await this.getCurrentPrice(task.tokenSymbol, task.network)

      // 更新持仓
      const positions = Array.from(this.positions.values()).filter(
        p => p.tokenSymbol === task.tokenSymbol && p.network === task.network && p.status === 'active'
      )

      for (const position of positions) {
        position.currentPrice = currentPrice
        position.lastUpdated = Date.now()
        position.profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100

        // 检查止损
        if (this.config.enableStopLoss) {
          await this.checkStopLoss(position, task)
        }

        // 检查止盈
        if (this.config.enableTakeProfit) {
          await this.checkTakeProfit(position, task)
        }
      }

      // 更新任务统计
      this.updateTaskStats(task)

      // 发送状态更新事件
      this.emit('task:updated', task)

    } catch (error) {
      logger.error('AutoTradingEngine', '任务状态更新失败', { taskId: task.id, error })
    }
  }

  /**
   * 检查止损
   */
  private async checkStopLoss(position: Position, task: AutoTradeTask): Promise<void> {
    const stopLossPercent = task.stopLoss?.stopLossPercent || this.config.stopLoss.defaultStopLossPercent

    // 固定止损
    if (position.profitPercent <= -stopLossPercent) {
      logger.warn('AutoTradingEngine', '触发止损', {
        tokenSymbol: position.tokenSymbol,
        profitPercent: position.profitPercent,
        stopLossPercent
      })

      await this.closePosition(position, 'stop_loss')
      this.createRiskAlert({
        id: `sl-${Date.now()}`,
        taskId: task.id,
        alertType: 'stop_loss',
        tokenSymbol: position.tokenSymbol,
        network: position.network,
        currentValue: position.profitPercent,
        threshold: -stopLossPercent,
        severity: 'warning',
        message: `触发止损: ${position.tokenSymbol} 下跌${Math.abs(position.profitPercent).toFixed(2)}%`,
        timestamp: Date.now()
      })

      return
    }

    // 移动止损
    if (this.config.stopLoss.dynamicStopLoss && task.stopLoss?.trailingStopLossPercent) {
      const trailingStopLossPercent = task.stopLoss.trailingStopLossPercent
      const newStopLossPercent = position.profitPercent - trailingStopLossPercent

      if (newStopLossPercent > 0 && newStopLossPercent > (position.stopLossLevel || 0)) {
        position.stopLossLevel = newStopLossPercent
        logger.info('AutoTradingEngine', '调整移动止损', {
          tokenSymbol: position.tokenSymbol,
          newStopLossPercent: newStopLossPercent.toFixed(2)
        })
      }

      if (position.profitPercent <= (position.stopLossLevel || -stopLossPercent)) {
        await this.closePosition(position, 'stop_loss')
      }
    }
  }

  /**
   * 检查止盈
   */
  private async checkTakeProfit(position: Position, task: AutoTradeTask): Promise<void> {
    const takeProfitPercent = task.takeProfit?.takeProfitPercent || this.config.takeProfit.defaultTakeProfitPercent

    // 完全止盈
    if (position.profitPercent >= takeProfitPercent) {
      logger.info('AutoTradingEngine', '触发止盈', {
        tokenSymbol: position.tokenSymbol,
        profitPercent: position.profitPercent,
        takeProfitPercent
      })

      await this.closePosition(position, 'take_profit')
      this.createRiskAlert({
        id: `tp-${Date.now()}`,
        taskId: task.id,
        alertType: 'take_profit',
        tokenSymbol: position.tokenSymbol,
        network: position.network,
        currentValue: position.profitPercent,
        threshold: takeProfitPercent,
        severity: 'info',
        message: `触发止盈: ${position.tokenSymbol} 上涨${position.profitPercent.toFixed(2)}%`,
        timestamp: Date.now()
      })

      return
    }

    // 部分止盈
    if (this.config.takeProfit.partialTakeProfit && this.config.takeProfit.partialTakeProfitLevels) {
      for (const level of this.config.takeProfit.partialTakeProfitLevels) {
        if (position.profitPercent >= level && !position.partialProfitLevels?.includes(level)) {
          logger.info('AutoTradingEngine', '触发部分止盈', {
            tokenSymbol: position.tokenSymbol,
            profitPercent: position.profitPercent,
            level
          })

          // 执行部分止盈
          await this.executePartialTakeProfit(position, level)
          position.partialProfitLevels = position.partialProfitLevels || []
          position.partialProfitLevels.push(level)
        }
      }
    }
  }

  /**
   * 关闭持仓
   */
  private async closePosition(position: Position, reason: Position['closeReason']): Promise<void> {
    try {
      // 执行卖出
      const execution = await this.executeTrade({
        action: 'sell',
        tokenSymbol: position.tokenSymbol,
        network: position.network,
        amount: position.amount,
        reason: `自动${reason === 'stop_loss' ? '止损' : reason === 'take_profit' ? '止盈' : '关闭'}`
      })

      // 更新持仓状态
      position.status = 'closed'
      position.closeTime = Date.now()
      position.closeReason = reason

      // 更新统计
      this.updateStats(execution)

      logger.info('AutoTradingEngine', '持仓已关闭', {
        tokenSymbol: position.tokenSymbol,
        reason,
        profitPercent: position.profitPercent
      })

      this.emit('position:closed', position)

    } catch (error) {
      logger.error('AutoTradingEngine', '关闭持仓失败', { position, reason, error })
    }
  }

  /**
   * 执行部分止盈
   */
  private async executePartialTakeProfit(position: Position, level: number): Promise<void> {
    const sellAmount = (parseFloat(position.amount) * this.config.takeProfit.partialTakeProfitPercent / 100).toString()

    const execution = await this.executeTrade({
      action: 'sell',
      tokenSymbol: position.tokenSymbol,
      network: position.network,
      amount: sellAmount,
      reason: `部分止盈${level}%`
    })

    // 减少持仓数量
    position.amount = (parseFloat(position.amount) - parseFloat(sellAmount)).toString()
    position.value = (parseFloat(position.amount) * position.currentPrice).toString()

    logger.info('AutoTradingEngine', '部分止盈完成', {
      tokenSymbol: position.tokenSymbol,
      level,
      sellAmount,
      remainingAmount: position.amount
    })

    this.emit('position:partial_profit', { position, level, execution })
  }

  /**
   * 检查风险控制
   */
  private async checkRiskControls(): Promise<void> {
    try {
      // 检查日损失限制
      if (this.config.enableRiskControl) {
        await this.checkDailyLossLimit()
      }

      // 检查持仓价值限制
      if (this.config.enableRiskControl) {
        await this.checkPositionValueLimit()
      }

      // 检查总持仓数量限制
      if (this.config.enableRiskControl) {
        await this.checkTotalPositionsLimit()
      }

    } catch (error) {
      logger.error('AutoTradingEngine', '风险检查失败', error)
    }
  }

  /**
   * 检查日损失限制
   */
  private async checkDailyLossLimit(): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()

    // 计算今日亏损
    const todayLoss = this.executions
      .filter(e => e.timestamp >= todayStart && e.status === 'completed' && e.action === 'sell')
      .reduce((total, e) => {
        const profit = parseFloat(e.amount) * (this.getExecutionProfit(e) || 0)
        return total + (profit < 0 ? Math.abs(profit) : 0)
      }, 0)

    const maxDailyLoss = parseFloat(this.config.maxDailyLoss)
    const maxDailyLossPercent = this.config.riskControl.maxDailyLossPercent

    // 获取总资产
    const totalAssets = await this.getTotalAssets()

    if (todayLoss > maxDailyLoss) {
      logger.warn('AutoTradingEngine', '触发日损失限制', {
        todayLoss,
        maxDailyLoss,
        limitExceeded: true
      })

      this.emit('risk:alert', {
        type: 'daily_loss_limit',
        message: `今日亏损${todayLoss.toFixed(2)}已超过限制${maxDailyLoss}`,
        severity: 'critical'
      })

      // 停止所有自动买入
      this.config.enableAutoBuy = false
    }

    // 按百分比检查
    if ((todayLoss / totalAssets) * 100 > maxDailyLossPercent) {
      logger.warn('AutoTradingEngine', '触发日损失百分比限制', {
        todayLossPercent: (todayLoss / totalAssets) * 100,
        maxDailyLossPercent,
        limitExceeded: true
      })

      this.emit('risk:alert', {
        type: 'daily_loss_percent_limit',
        message: `今日亏损率${((todayLoss / totalAssets) * 100).toFixed(2)}%已超过限制${maxDailyLossPercent}%`,
        severity: 'critical'
      })
    }
  }

  /**
   * 检查持仓价值限制
   */
  private async checkPositionValueLimit(): Promise<void> {
    const activePositions = Array.from(this.positions.values()).filter(p => p.status === 'active')

    for (const position of activePositions) {
      const positionValue = parseFloat(position.value)
      const maxPositionValue = parseFloat(this.config.maxPositionValue)

      if (positionValue > maxPositionValue) {
        logger.warn('AutoTradingEngine', '触发持仓价值限制', {
          tokenSymbol: position.tokenSymbol,
          positionValue,
          maxPositionValue,
          limitExceeded: true
        })

        this.emit('risk:alert', {
          type: 'position_value_limit',
          tokenSymbol: position.tokenSymbol,
          message: `${position.tokenSymbol}持仓价值${positionValue.toFixed(2)}已超过限制${maxPositionValue}`,
          severity: 'warning'
        })
      }
    }
  }

  /**
   * 检查总持仓数量限制
   */
  private async checkTotalPositionsLimit(): Promise<void> {
    const activePositions = Array.from(this.positions.values()).filter(p => p.status === 'active')

    if (activePositions.length > this.config.maxTotalPositions) {
      logger.warn('AutoTradingEngine', '触发总持仓数量限制', {
        activePositionsCount: activePositions.length,
        maxTotalPositions: this.config.maxTotalPositions,
        limitExceeded: true
      })

      this.emit('risk:alert', {
        type: 'total_positions_limit',
        message: `总持仓数量${activePositions.length}已超过限制${this.config.maxTotalPositions}`,
        severity: 'warning'
      })

      this.config.enableAutoBuy = false
    }
  }

  /**
   * 处理交易信号
   */
  private async processSignals(): Promise<void> {
    try {
      const newSignals = this.signals.filter(s => !s.processed)

      for (const signal of newSignals) {
        await this.processSignal(signal)
        signal.processed = true
      }

      // 清理已处理的信号
      this.signals = this.signals.filter(s => Date.now() - s.timestamp < 3600000) // 只保留1小时内的信号

    } catch (error) {
      logger.error('AutoTradingEngine', '信号处理失败', error)
    }
  }

  /**
   * 处理单个信号
   */
  private async processSignal(signal: TradingSignal): Promise<void> {
    try {
      // 检查置信度
      if (signal.confidence < this.config.minConfidence) {
        logger.debug('AutoTradingEngine', '信号置信度不足', {
          signalId: signal.id,
          confidence: signal.confidence,
          minConfidence: this.config.minConfidence
        })
        return
      }

      // 检查风险收益比
      const decisionSupport = aiSentimentEngine.getDecisionSupport(signal.tokenSymbol, signal.network)
      if (decisionSupport && decisionSupport.riskRewardRatio < this.config.minRiskRewardRatio) {
        logger.debug('AutoTradingEngine', '风险收益比不足', {
          signalId: signal.id,
          riskRewardRatio: decisionSupport.riskRewardRatio,
          minRatio: this.config.minRiskRewardRatio
        })
        return
      }

      // 检查是否已有持仓
      const hasPosition = this.positions.has(`${signal.network}_${signal.tokenSymbol}`)
      if (hasPosition && signal.action === 'buy') {
        logger.debug('AutoTradingEngine', '已有持仓，跳过买入', {
          signalId: signal.id,
          tokenSymbol: signal.tokenSymbol
        })
        return
      }

      // 执行交易
      if (signal.action === 'buy' && this.config.enableAutoBuy) {
        await this.executeBuyFromSignal(signal)
      } else if (signal.action === 'sell' && this.config.enableAutoSell) {
        await this.executeSellFromSignal(signal)
      }

      logger.info('AutoTradingEngine', '信号处理完成', {
        signalId: signal.id,
        action: signal.action,
        tokenSymbol: signal.tokenSymbol
      })

    } catch (error) {
      logger.error('AutoTradingEngine', '信号处理失败', { signal, error })
    }
  }

  /**
   * 处理AI决策
   */
  private handleAIDecision(data: any): void {
    const signal: TradingSignal = {
      id: `ai-${Date.now()}-${Math.random()}`,
      tokenSymbol: data.tokenSymbol,
      network: data.network,
      action: data.action,
      confidence: data.confidence,
      reason: data.reasoning.join(', '),
      timestamp: Date.now(),
      source: 'ai_sentiment',
      data: data
    }

    this.signals.push(signal)
    logger.info('AutoTradingEngine', '收到AI决策信号', signal)
  }

  /**
   * 处理热点警报
   */
  private handleHotspotAlert(data: any): void {
    // 将热点警报转换为买入信号
    const signal: TradingSignal = {
      id: `hotspot-${Date.now()}-${Math.random()}`,
      tokenSymbol: data.hotspot?.tokenSymbol || data.data?.tokenSymbol,
      network: data.network,
      action: 'buy',
      confidence: 0.8, // 热点警报默认置信度0.8
      reason: `热点警报: ${data.message}`,
      timestamp: Date.now(),
      source: 'hotspot',
      data: data
    }

    this.signals.push(signal)
    logger.info('AutoTradingEngine', '收到热点警报信号', signal)
  }

  /**
   * 执行买入（来自信号）
   */
  private async executeBuyFromSignal(signal: TradingSignal): Promise<void> {
    try {
      // 获取建议参数
      const decisionSupport = aiSentimentEngine.getDecisionSupport(signal.tokenSymbol, signal.network)
      const amount = this.calculateBuyAmount(decisionSupport)

      // 执行交易
      const execution = await this.executeTrade({
        action: 'buy',
        tokenSymbol: signal.tokenSymbol,
        network: signal.network,
        amount,
        reason: signal.reason
      })

      // 创建持仓
      if (execution.status === 'completed') {
        const position = await this.createPosition(execution, signal)
        this.positions.set(position.id, position)
        this.emit('position:opened', position)
      }

      logger.info('AutoTradingEngine', '自动买入完成', {
        tokenSymbol: signal.tokenSymbol,
        amount,
        txHash: execution.txHash
      })

    } catch (error) {
      logger.error('AutoTradingEngine', '自动买入失败', { signal, error })
    }
  }

  /**
   * 执行卖出（来自信号）
   */
  private async executeSellFromSignal(signal: TradingSignal): Promise<void> {
    try {
      // 查找持仓
      const position = Array.from(this.positions.values()).find(
        p => p.tokenSymbol === signal.tokenSymbol && p.network === signal.network && p.status === 'active'
      )

      if (!position) {
        logger.warn('AutoTradingEngine', '未找到持仓，无法执行卖出', {
          tokenSymbol: signal.tokenSymbol
        })
        return
      }

      // 执行卖出
      await this.closePosition(position, 'manual')

      logger.info('AutoTradingEngine', '自动卖出完成', {
        tokenSymbol: signal.tokenSymbol,
        profitPercent: position.profitPercent
      })

    } catch (error) {
      logger.error('AutoTradingEngine', '自动卖出失败', { signal, error })
    }
  }

  /**
   * 创建交易任务
   */
  createTask(config: Partial<AutoTradeTask>): AutoTradeTask {
    const task: AutoTradeTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: config.name || '自动交易任务',
      status: 'idle',
      strategy: config.strategy || 'hotspot_trading',
      tokenSymbol: config.tokenSymbol || '',
      network: config.network || 'BSC',
      amount: config.amount || '0',
      walletId: config.walletId || '',
      stopLoss: config.stopLoss || {
        enabled: this.config.stopLoss.enabled,
        stopLossPercent: this.config.stopLoss.defaultStopLossPercent,
        dynamicStopLoss: this.config.stopLoss.dynamicStopLoss,
        trailingStopLossPercent: this.config.stopLoss.trailingStopLossPercent
      },
      takeProfit: config.takeProfit || {
        enabled: this.config.takeProfit.enabled,
        takeProfitPercent: this.config.takeProfit.defaultTakeProfitPercent,
        dynamicTakeProfit: this.config.takeProfit.dynamicTakeProfit
      },
      riskControl: config.riskControl || {
        maxPositionValue: this.config.maxPositionValue,
        maxDailyLoss: this.config.maxDailyLoss,
        enableRiskControl: this.config.enableRiskControl
      },
      createdAt: Date.now(),
      startedAt: 0,
      completedAt: 0
    }

    this.tasks.set(task.id, task)
    this.stats.totalTasks++
    this.stats.activeTasks++

    logger.info('AutoTradingEngine', '创建交易任务', {
      taskId: task.id,
      strategy: task.strategy,
      tokenSymbol: task.tokenSymbol
    })

    return task
  }

  /**
   * 启动任务
   */
  async startTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    if (task.status === 'active') {
      logger.warn('AutoTradingEngine', '任务已在运行', { taskId })
      return
    }

    task.status = 'active'
    task.startedAt = Date.now()

    logger.info('AutoTradingEngine', '启动交易任务', {
      taskId,
      strategy: task.strategy,
      tokenSymbol: task.tokenSymbol
    })

    this.emit('task:started', task)
  }

  /**
   * 停止任务
   */
  async stopTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    if (task.status === 'idle' || task.status === 'completed') {
      logger.warn('AutoTradingEngine', '任务未运行或已完成', { taskId })
      return
    }

    task.status = 'idle'
    task.completedAt = Date.now()

    // 关闭所有相关持仓
    const positions = Array.from(this.positions.values()).filter(
      p => p.tokenSymbol === task.tokenSymbol && p.network === task.network && p.status === 'active'
    )

    for (const position of positions) {
      await this.closePosition(position, 'strategy_end')
    }

    this.stats.activeTasks--
    this.stats.completedTasks++

    logger.info('AutoTradingEngine', '停止交易任务', {
      taskId,
      strategy: task.strategy
    })

    this.emit('task:stopped', task)
  }

  /**
   * 执行交易
   */
  private async executeTrade(params: {
    action: 'buy' | 'sell'
    tokenSymbol: string
    network: 'BSC' | 'Solana'
    amount: string
    reason: string
  }): Promise<TradeExecutionDetail> {
    // TODO: 实现实际交易执行逻辑
    // 这里应该调用实际的交易接口（例如WalletManager）

    const execution: TradeExecutionDetail = {
      executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: params.action === 'buy' ? 'auto' : 'sell',
      action: params.action,
      tokenSymbol: params.tokenSymbol,
      network: params.network,
      amount: params.amount,
      price: 0, // TODO: 获取实际价格
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`, // TODO: 实际交易哈希
      walletAddress: '0x...', // TODO: 实际钱包地址
      timestamp: Date.now(),
      status: 'completed'
    }

    this.executions.push(execution)
    this.updateStats(execution)

    logger.info('AutoTradingEngine', '交易执行', {
      executionId: execution.executionId,
      action: params.action,
      tokenSymbol: params.tokenSymbol,
      amount: params.amount,
      reason: params.reason
    })

    this.emit('trade:executed', execution)

    return execution
  }

  /**
   * 创建持仓
   */
  private async createPosition(execution: TradeExecutionDetail, signal?: TradingSignal): Promise<Position> {
    const position: Position = {
      id: `pos-${execution.executionId}`,
      tokenSymbol: execution.tokenSymbol,
      network: execution.network,
      tokenAddress: '0x...', // TODO: 实际代币地址
      walletAddress: execution.walletAddress,
      entryPrice: execution.price,
      currentPrice: execution.price,
      amount: execution.amount,
      value: (parseFloat(execution.amount) * execution.price).toString(),
      profit: 0,
      profitPercent: 0,
      entryTime: execution.timestamp,
      lastUpdated: execution.timestamp,
      status: 'active'
    }

    logger.info('AutoTradingEngine', '创建持仓', {
      positionId: position.id,
      tokenSymbol: position.tokenSymbol,
      amount: position.amount,
      entryPrice: position.entryPrice
    })

    return position
  }

  /**
   * 计算买入金额
   */
  private calculateBuyAmount(decisionSupport?: any): string {
    // TODO: 根据决策支持计算买入金额
    const maxPositionValue = parseFloat(this.config.maxPositionValue)
    const recommendedAmount = decisionSupport?.positionSize === 'large'
      ? maxPositionValue * 0.8
      : decisionSupport?.positionSize === 'medium'
        ? maxPositionValue * 0.5
        : maxPositionValue * 0.3

    return recommendedAmount.toString()
  }

  /**
   * 获取当前价格
   */
  private async getCurrentPrice(tokenSymbol: string, network: 'BSC' | 'Solana'): Promise<number> {
    // TODO: 实现实际价格获取
    return Math.random() * 0.01
  }

  /**
   * 获取总资产
   */
  private async getTotalAssets(): Promise<number> {
    // TODO: 实现实际总资产计算
    return 10000
  }

  /**
   * 获取执行利润
   */
  private getExecutionProfit(execution: TradeExecutionDetail): number | null {
    // TODO: 实现利润计算
    return 0
  }

  /**
   * 更新统计
   */
  private updateStats(execution: TradeExecutionDetail): void {
    this.stats.totalTrades++

    if (execution.status === 'completed') {
      this.stats.successfulTrades++

      const profit = this.getExecutionProfit(execution)
      if (profit) {
        if (profit > 0) {
          this.stats.totalProfit = (parseFloat(this.stats.totalProfit) + profit).toString()
        } else {
          this.stats.totalLoss = (parseFloat(this.stats.totalLoss) + Math.abs(profit)).toString()
        }
      }
    } else {
      this.stats.failedTrades++
    }

    // 计算胜率
    const total = this.stats.successfulTrades + this.stats.failedTrades
    this.stats.winRate = total > 0 ? (this.stats.successfulTrades / total) * 100 : 0

    // 计算平均利润
    if (this.stats.successfulTrades > 0) {
      const totalProfit = parseFloat(this.stats.totalProfit) - parseFloat(this.stats.totalLoss)
      this.stats.avgProfitPerTrade = (totalProfit / this.stats.successfulTrades).toString()
    }
  }

  /**
   * 更新任务统计
   */
  private updateTaskStats(task: AutoTradeTask): void {
    // TODO: 实现任务统计更新
  }

  /**
   * 创建风险警报
   */
  private createRiskAlert(alert: RiskAlert): void {
    this.riskAlerts.push(alert)

    // 只保留最近100条警报
    if (this.riskAlerts.length > 100) {
      this.riskAlerts.shift()
    }

    this.emit('risk:alert', alert)
    logger.warn('AutoTradingEngine', '风险警报', alert)
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
  getConfig(): AutoTradeConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AutoTradeConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('AutoTradingEngine', '配置已更新', { config })
  }

  /**
   * 获取所有任务
   */
  getTasks(): AutoTradeTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * 获取活跃任务
   */
  getActiveTasks(): AutoTradeTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'active')
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): AutoTradeTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取所有持仓
   */
  getPositions(): Position[] {
    return Array.from(this.positions.values())
  }

  /**
   * 获取活跃持仓
   */
  getActivePositions(): Position[] {
    return Array.from(this.positions.values()).filter(p => p.status === 'active')
  }

  /**
   * 获取持仓
   */
  getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId)
  }

  /**
   * 获取统计信息
   */
  getStats(): AutoTradeStats {
    return { ...this.stats }
  }

  /**
   * 获取交易历史
   */
  getExecutions(): TradeExecutionDetail[] {
    return [...this.executions]
  }

  /**
   * 获取风险警报
   */
  getRiskAlerts(): RiskAlert[] {
    return [...this.riskAlerts]
  }

  /**
   * 手动买入
   */
  async manualBuy(params: {
    tokenSymbol: string
    network: 'BSC' | 'Solana'
    amount: string
    walletId: string
  }): Promise<TradeExecutionDetail> {
    return this.executeTrade({
      action: 'buy',
      tokenSymbol: params.tokenSymbol,
      network: params.network,
      amount: params.amount,
      reason: '手动买入'
    })
  }

  /**
   * 手动卖出
   */
  async manualSell(params: {
    positionId: string
    amount?: string
  }): Promise<void> {
    const position = this.positions.get(params.positionId)
    if (!position) {
      throw new Error('持仓不存在')
    }

    const sellAmount = params.amount || position.amount

    const execution = await this.executeTrade({
      action: 'sell',
      tokenSymbol: position.tokenSymbol,
      network: position.network,
      amount: sellAmount,
      reason: '手动卖出'
    })

    if (parseFloat(sellAmount) === parseFloat(position.amount)) {
      await this.closePosition(position, 'manual')
    } else {
      position.amount = (parseFloat(position.amount) - parseFloat(sellAmount)).toString()
      position.value = (parseFloat(position.amount) * position.currentPrice).toString()
    }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalVolume: '0',
      totalProfit: '0',
      totalLoss: '0',
      winRate: 0,
      avgProfitPerTrade: '0',
      avgHoldingTime: 0
    }
    logger.info('AutoTradingEngine', '统计已重置')
  }
}

// ============== 导出单例 ==============

export const autoTradingEngine = new AutoTradingEngine()
