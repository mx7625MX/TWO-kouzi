/**
 * 市值管理核心引擎
 * 实现自动做市、价格维持、对敲交易等策略
 */

import { ethers } from 'ethers'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { bscUtils } from '../../shared/bscUtils'
import { solanaUtils } from '../../shared/solanaUtils'

// ============== 类型定义 ==============

export type MarketStrategyType = 'target_rise' | 'price_maintain' | 'wash_trading' | 'auto_trade'

export type MarketTaskStatus = 'idle' | 'running' | 'stopped' | 'profit_taken' | 'stopped_loss' | 'error'

export interface MarketStrategy {
  type: MarketStrategyType
  
  // 目标拉升策略
  target_rise?: {
    targetPrice: number          // 目标价格（相对初始价格的倍数，如 2.0 表示2倍）
    maxTradeAmount: string       // 单笔最大交易额（BNB/SOL）
    frequency: number            // 交易频率（秒）
    priceStep: number            // 价格步进（0.01表示1%）
  }
  
  // 价格维持策略
  price_maintain?: {
    minPrice: number             // 最低价（相对初始价格的倍数）
    maxPrice: number             // 最高价（相对初始价格的倍数）
    maxTradeAmount: string
    frequency: number
    tolerance: number            // 价格容忍度（0.05表示5%）
  }
  
  // 对敲交易策略
  wash_trading?: {
    targetVolume: string         // 目标交易量（USDT/USD）
    maxTradeAmount: string
    frequency: number
    minSpread: number            // 最小价差（0.005表示0.5%）
    maxSpread: number            // 最大价差（0.02表示2%）
  }
  
  // 自动交易策略
  auto_trade?: {
    buyThreshold: number         // 买入阈值（低于此价格买入）
    sellThreshold: number        // 卖出阈值（高于此价格卖出）
    maxTradeAmount: string
    frequency: number
    volatilityThreshold: number  // 波动率阈值（超过此值暂停交易）
  }
  
  // 通用配置
  enabled: boolean
  autoTakeProfit: boolean        // 是否自动止盈
  targetProfitPercent: number    // 目标利润百分比
  stopLossPercent: number        // 止损百分比
  maxRiskAmount: string          // 最大风险金额
  emergencyStop: boolean         // 紧急停止开关
}

export interface MarketTask {
  id: string
  tokenAddress: string
  network: 'bsc' | 'solana'
  tokenSymbol: string
  strategy: MarketStrategy
  status: MarketTaskStatus
  startTime: number | null
  entryPrice: number
  currentPrice: number
  profit: number
  totalTrades: number
  totalVolume: string
  errorMessage: string | null
  createdAt: number
  updatedAt: number
}

export interface TradeExecution {
  id: string
  taskId: string
  type: 'buy' | 'sell'
  amount: string
  price: number
  txHash: string
  timestamp: number
  success: boolean
  error?: string
}

// ============== 市值管理核心类 ==============

export class MarketMakerEngine {
  private activeTasks: Map<string, MarketTask> = new Map()
  private tradeHistory: Map<string, TradeExecution[]> = new Map()
  private monitors: Map<string, NodeJS.Timeout> = new Map()
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map()

  /**
   * 创建市值管理任务
   */
  async createTask(
    tokenAddress: string,
    network: 'bsc' | 'solana',
    tokenSymbol: string,
    strategy: MarketStrategy
  ): Promise<MarketTask> {
    // 获取当前价格作为入场价格
    const entryPrice = await this.getCurrentPrice(tokenAddress, network)

    const task: MarketTask = {
      id: `market_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenAddress,
      network,
      tokenSymbol,
      strategy,
      status: 'idle',
      startTime: null,
      entryPrice,
      currentPrice: entryPrice,
      profit: 0,
      totalTrades: 0,
      totalVolume: '0',
      errorMessage: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.activeTasks.set(task.id, task)
    this.tradeHistory.set(task.id, [])

    console.log(`[市值管理] 创建任务: ${task.id}, 入场价格: ${entryPrice}`)

    // 如果策略启用，自动启动
    if (strategy.enabled && !strategy.emergencyStop) {
      await this.startTask(task.id)
    }

    return task
  }

  /**
   * 启动市值管理任务
   */
  async startTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    if (task.status === 'running') {
      console.log(`[市值管理] 任务已在运行: ${taskId}`)
      return true
    }

    task.status = 'running'
    task.startTime = Date.now()
    task.updatedAt = Date.now()

    console.log(`[市值管理] 启动任务: ${taskId}, 策略: ${task.strategy.type}`)

    // 根据策略类型启动对应的监控
    switch (task.strategy.type) {
      case 'target_rise':
        this.startTargetRiseMonitor(task)
        break
      case 'price_maintain':
        this.startPriceMaintainMonitor(task)
        break
      case 'wash_trading':
        this.startWashTradingMonitor(task)
        break
      case 'auto_trade':
        this.startAutoTradeMonitor(task)
        break
    }

    return true
  }

  /**
   * 停止市值管理任务
   */
  async stopTask(taskId: string, reason?: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    if (task.status !== 'running') {
      return true
    }

    // 清除监控定时器
    const monitor = this.monitors.get(taskId)
    if (monitor) {
      clearInterval(monitor)
      this.monitors.delete(taskId)
    }

    task.status = 'stopped'
    task.updatedAt = Date.now()

    console.log(`[市值管理] 停止任务: ${taskId}, 原因: ${reason || '用户手动停止'}`)

    return true
  }

  /**
   * 紧急停止所有任务
   */
  async emergencyStopAll(): Promise<void> {
    console.log(`[市值管理] 紧急停止所有任务...`)

    for (const [taskId, task] of this.activeTasks) {
      if (task.status === 'running') {
        await this.stopTask(taskId, '紧急停止')
      }
    }
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): MarketTask | undefined {
    return this.activeTasks.get(taskId)
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): MarketTask[] {
    return Array.from(this.activeTasks.values())
  }

  /**
   * 获取交易历史
   */
  getTradeHistory(taskId: string): TradeExecution[] {
    return this.tradeHistory.get(taskId) || []
  }

  /**
   * 更新任务价格和利润
   */
  async updateTaskPrice(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId)
    if (!task) return

    const currentPrice = await this.getCurrentPrice(task.tokenAddress, task.network)
    task.currentPrice = currentPrice
    task.profit = ((currentPrice - task.entryPrice) / task.entryPrice) * 100
    task.updatedAt = Date.now()

    // 更新价格缓存
    this.priceCache.set(`${task.network}_${task.tokenAddress}`, {
      price: currentPrice,
      timestamp: Date.now()
    })

    // 检查自动止盈
    if (task.strategy.autoTakeProfit && task.profit >= task.strategy.targetProfitPercent) {
      await this.executeTakeProfit(task)
    }

    // 检查止损
    if (task.profit <= -task.strategy.stopLossPercent) {
      await this.executeStopLoss(task)
    }

    // 检查紧急停止
    if (task.strategy.emergencyStop) {
      await this.stopTask(task.id, '紧急停止触发')
    }
  }

  /**
   * 目标拉升策略监控
   */
  private startTargetRiseMonitor(task: MarketTask): void {
    const { target_rise } = task.strategy
    if (!target_rise) return

    const monitor = setInterval(async () => {
      if (task.status !== 'running') {
        clearInterval(monitor)
        return
      }

      try {
        await this.updateTaskPrice(task.id)

        const targetPrice = task.entryPrice * target_rise.targetPrice

        if (task.currentPrice < targetPrice) {
          // 继续买入拉升
          const tradeAmount = this.calculateTradeAmount(target_rise.maxTradeAmount, task.strategy.maxRiskAmount)
          await this.executeBuy(task, tradeAmount)
          
          console.log(`[目标拉升] 当前价格: ${task.currentPrice.toFixed(6)}, 目标: ${targetPrice.toFixed(6)}`)
        } else {
          // 达到目标，停止
          console.log(`[目标拉升] 达到目标价格: ${targetPrice.toFixed(6)}`)
          await this.stopTask(task.id, '达到目标价格')
        }
      } catch (error) {
        console.error(`[目标拉升] 错误:`, error)
        task.errorMessage = error.message
      }
    }, target_rise.frequency * 1000)

    this.monitors.set(task.id, monitor)
  }

  /**
   * 价格维持策略监控
   */
  private startPriceMaintainMonitor(task: MarketTask): void {
    const { price_maintain } = task.strategy
    if (!price_maintain) return

    const monitor = setInterval(async () => {
      if (task.status !== 'running') {
        clearInterval(monitor)
        return
      }

      try {
        await this.updateTaskPrice(task.id)

        const minPrice = task.entryPrice * price_maintain.minPrice
        const maxPrice = task.entryPrice * price_maintain.maxPrice
        const tolerance = price_maintain.tolerance

        if (task.currentPrice < minPrice * (1 - tolerance)) {
          // 价格过低，买入拉升
          const tradeAmount = this.calculateTradeAmount(price_maintain.maxTradeAmount, task.strategy.maxRiskAmount)
          await this.executeBuy(task, tradeAmount)
          
          console.log(`[价格维持] 价格过低，买入拉升: ${task.currentPrice.toFixed(6)} < ${minPrice.toFixed(6)}`)
        } else if (task.currentPrice > maxPrice * (1 + tolerance)) {
          // 价格过高，卖出压盘
          const tradeAmount = this.calculateTradeAmount(price_maintain.maxTradeAmount, task.strategy.maxRiskAmount)
          await this.executeSell(task, tradeAmount)
          
          console.log(`[价格维持] 价格过高，卖出压盘: ${task.currentPrice.toFixed(6)} > ${maxPrice.toFixed(6)}`)
        }
        // 价格在区间内，无需操作
      } catch (error) {
        console.error(`[价格维持] 错误:`, error)
        task.errorMessage = error.message
      }
    }, price_maintain.frequency * 1000)

    this.monitors.set(task.id, monitor)
  }

  /**
   * 对敲交易策略监控
   */
  private startWashTradingMonitor(task: MarketTask): void {
    const { wash_trading } = task.strategy
    if (!wash_trading) return

    let tradedVolume = 0
    const targetVolume = parseFloat(wash_trading.targetVolume)

    const monitor = setInterval(async () => {
      if (task.status !== 'running') {
        clearInterval(monitor)
        return
      }

      try {
        if (tradedVolume >= targetVolume) {
          console.log(`[对敲交易] 达到目标交易量: ${tradedVolume.toFixed(2)}`)
          await this.stopTask(task.id, '达到目标交易量')
          return
        }

        await this.updateTaskPrice(task.id)

        // 随机决定买入或卖出
        const isBuy = Math.random() > 0.5
        const tradeAmount = this.calculateTradeAmount(wash_trading.maxTradeAmount, task.strategy.maxRiskAmount)

        // 计算价差
        const spread = wash_trading.minSpread + Math.random() * (wash_trading.maxSpread - wash_trading.minSpread)
        const adjustedPrice = isBuy 
          ? task.currentPrice * (1 - spread)
          : task.currentPrice * (1 + spread)

        if (isBuy) {
          await this.executeBuy(task, tradeAmount, adjustedPrice)
        } else {
          await this.executeSell(task, tradeAmount, adjustedPrice)
        }

        tradedVolume += parseFloat(tradeAmount)

        console.log(`[对敲交易] 已交易: ${tradedVolume.toFixed(2)}/${targetVolume.toFixed(2)}`)
      } catch (error) {
        console.error(`[对敲交易] 错误:`, error)
        task.errorMessage = error.message
      }
    }, wash_trading.frequency * 1000)

    this.monitors.set(task.id, monitor)
  }

  /**
   * 自动交易策略监控
   */
  private startAutoTradeMonitor(task: MarketTask): void {
    const { auto_trade } = task.strategy
    if (!auto_trade) return

    let lastPrices: number[] = []

    const monitor = setInterval(async () => {
      if (task.status !== 'running') {
        clearInterval(monitor)
        return
      }

      try {
        await this.updateTaskPrice(task.id)

        // 计算波动率
        lastPrices.push(task.currentPrice)
        if (lastPrices.length > 10) {
          lastPrices.shift()
        }

        const volatility = this.calculateVolatility(lastPrices)
        const buyThreshold = task.entryPrice * auto_trade.buyThreshold
        const sellThreshold = task.entryPrice * auto_trade.sellThreshold

        // 如果波动率超过阈值，暂停交易
        if (volatility > auto_trade.volatilityThreshold) {
          console.log(`[自动交易] 波动率过高，暂停交易: ${volatility.toFixed(2)}`)
          return
        }

        // 执行交易策略
        if (task.currentPrice < buyThreshold) {
          // 价格低于买入阈值，买入
          const tradeAmount = this.calculateTradeAmount(auto_trade.maxTradeAmount, task.strategy.maxRiskAmount)
          await this.executeBuy(task, tradeAmount)
          
          console.log(`[自动交易] 价格低于买入阈值，执行买入: ${task.currentPrice.toFixed(6)} < ${buyThreshold.toFixed(6)}`)
        } else if (task.currentPrice > sellThreshold) {
          // 价格高于卖出阈值，卖出
          const tradeAmount = this.calculateTradeAmount(auto_trade.maxTradeAmount, task.strategy.maxRiskAmount)
          await this.executeSell(task, tradeAmount)
          
          console.log(`[自动交易] 价格高于卖出阈值，执行卖出: ${task.currentPrice.toFixed(6)} > ${sellThreshold.toFixed(6)}`)
        }
      } catch (error) {
        console.error(`[自动交易] 错误:`, error)
        task.errorMessage = error.message
      }
    }, auto_trade.frequency * 1000)

    this.monitors.set(task.id, monitor)
  }

  /**
   * 执行买入
   */
  private async executeBuy(task: MarketTask, amount: string, price?: number): Promise<void> {
    console.log(`[市值管理] 执行买入: ${task.tokenSymbol}, 数量: ${amount}`)

    // TODO: 实现实际的买入交易
    // 这里需要集成实际的DEX交易逻辑
    // BSC: PancakeSwap
    // Solana: Raydium/Jupiter

    // 记录交易
    const trade: TradeExecution = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: task.id,
      type: 'buy',
      amount,
      price: price || task.currentPrice,
      txHash: '0x_pending',
      timestamp: Date.now(),
      success: true
    }

    const history = this.tradeHistory.get(task.id)
    if (history) {
      history.push(trade)
    }

    task.totalTrades++
    task.updatedAt = Date.now()

    // 更新交易量
    const currentVolume = parseFloat(task.totalVolume)
    const tradeVolume = parseFloat(amount) * (price || task.currentPrice)
    task.totalVolume = (currentVolume + tradeVolume).toString()
  }

  /**
   * 执行卖出
   */
  private async executeSell(task: MarketTask, amount: string, price?: number): Promise<void> {
    console.log(`[市值管理] 执行卖出: ${task.tokenSymbol}, 数量: ${amount}`)

    // TODO: 实现实际的卖出交易
    // 这里需要集成实际的DEX交易逻辑
    // BSC: PancakeSwap
    // Solana: Raydium/Jupiter

    // 记录交易
    const trade: TradeExecution = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: task.id,
      type: 'sell',
      amount,
      price: price || task.currentPrice,
      txHash: '0x_pending',
      timestamp: Date.now(),
      success: true
    }

    const history = this.tradeHistory.get(task.id)
    if (history) {
      history.push(trade)
    }

    task.totalTrades++
    task.updatedAt = Date.now()

    // 更新交易量
    const currentVolume = parseFloat(task.totalVolume)
    const tradeVolume = parseFloat(amount) * (price || task.currentPrice)
    task.totalVolume = (currentVolume + tradeVolume).toString()
  }

  /**
   * 执行止盈
   */
  private async executeTakeProfit(task: MarketTask): Promise<void> {
    console.log(`[市值管理] 执行止盈: ${task.id}, 利润: ${task.profit.toFixed(2)}%`)

    // 卖出所有持仓
    await this.executeSellAll(task)

    task.status = 'profit_taken'
    task.updatedAt = Date.now()

    // 停止监控
    const monitor = this.monitors.get(task.id)
    if (monitor) {
      clearInterval(monitor)
      this.monitors.delete(task.id)
    }
  }

  /**
   * 执行止损
   */
  private async executeStopLoss(task: MarketTask): Promise<void> {
    console.log(`[市值管理] 执行止损: ${task.id}, 利润: ${task.profit.toFixed(2)}%`)

    // 卖出所有持仓
    await this.executeSellAll(task)

    task.status = 'stopped_loss'
    task.updatedAt = Date.now()

    // 停止监控
    const monitor = this.monitors.get(task.id)
    if (monitor) {
      clearInterval(monitor)
      this.monitors.delete(task.id)
    }
  }

  /**
   * 卖出所有持仓
   */
  private async executeSellAll(task: MarketTask): Promise<void> {
    console.log(`[市值管理] 卖出所有持仓: ${task.tokenSymbol}`)

    // TODO: 实现实际的卖出所有持仓逻辑
    // 需要查询当前持仓数量，然后全部卖出
  }

  /**
   * 计算交易金额
   */
  private calculateTradeAmount(maxTradeAmount: string, maxRiskAmount: string): string {
    const maxAmount = parseFloat(maxTradeAmount)
    const maxRisk = parseFloat(maxRiskAmount)

    // 简单实现：返回两者中的较小值
    return Math.min(maxAmount, maxRisk).toString()
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0

    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const squaredDiffs = prices.map(price => Math.pow(price - mean, 2))
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length
    const volatility = Math.sqrt(variance) / mean

    return volatility
  }

  /**
   * 获取当前价格
   */
  private async getCurrentPrice(tokenAddress: string, network: 'bsc' | 'solana'): Promise<number> {
    // 检查缓存
    const cacheKey = `${network}_${tokenAddress}`
    const cached = this.priceCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.price
    }

    // TODO: 实现实际的价格获取逻辑
    // BSC: 从PancakeSwap或其他DEX获取价格
    // Solana: 从Raydium/Jupiter或RPC获取价格

    // 临时返回模拟价格
    return 0.0001 + Math.random() * 0.00001
  }

  /**
   * 清理完成的任务
   */
  cleanupCompletedTasks(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [taskId, task] of this.activeTasks) {
      const isCompleted = ['stopped', 'profit_taken', 'stopped_loss', 'error'].includes(task.status)
      const isOld = now - task.updatedAt > olderThanMs

      if (isCompleted && isOld) {
        toDelete.push(taskId)
      }
    }

    toDelete.forEach(taskId => {
      this.activeTasks.delete(taskId)
      this.tradeHistory.delete(taskId)
      const monitor = this.monitors.get(taskId)
      if (monitor) {
        clearInterval(monitor)
        this.monitors.delete(taskId)
      }
    })

    console.log(`[市值管理] 清理了 ${toDelete.length} 个已完成任务`)
  }

  /**
   * 获取统计数据
   */
  getStatistics() {
    const tasks = Array.from(this.activeTasks.values())
    
    const stats = {
      totalTasks: tasks.length,
      runningTasks: tasks.filter(t => t.status === 'running').length,
      completedTasks: tasks.filter(t => ['stopped', 'profit_taken', 'stopped_loss'].includes(t.status)).length,
      errorTasks: tasks.filter(t => t.status === 'error').length,
      totalTrades: tasks.reduce((sum, t) => sum + t.totalTrades, 0),
      totalVolume: tasks.reduce((sum, t) => sum + parseFloat(t.totalVolume), 0),
      avgProfit: tasks.length > 0 
        ? tasks.reduce((sum, t) => sum + t.profit, 0) / tasks.length 
        : 0
    }

    return stats
  }
}

// ============== 导出单例 ==============

export const marketMakerEngine = new MarketMakerEngine()
