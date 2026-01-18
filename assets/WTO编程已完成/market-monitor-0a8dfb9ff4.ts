/**
 * 市盈率与市值监控管理器
 * - 实时监控代币价格、市值、流动性
 * - 智能预警系统
 * - 历史数据记录与查询
 * - 支持 BSC 和 Solana 双平台
 */

import { ethers } from 'ethers'
import { getProvider } from '../../shared/bscUtils'
import { RPC_ENDPOINTS } from '../../shared/constants'

// 监控任务类型定义
export interface MarketMonitorTask {
  id: string
  tokenAddress: string
  network: 'bsc' | 'solana'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled'

  // 监控配置
  config: {
    updateInterval: number // 更新频率（毫秒）
    alertThresholds: {
      price: { enabled: boolean; condition: string; value: string }[]
      marketCap: { enabled: boolean; condition: string; value: string }[]
      liquidity: { enabled: boolean; condition: string; value: string }[]
    }
  }

  // 实时数据
  currentData: {
    price: string
    marketCap: string
    liquidity: string
    volume24h: string
    priceChange24h: string
    lastUpdated: number
  }

  // 历史数据（最多保留1000条）
  priceHistory: Array<{ timestamp: number; price: string }>

  // 预警记录
  alerts: Array<{
    id: string
    type: string
    condition: string
    value: string
    triggeredAt: number
  }>

  // 时间戳
  createdAt: number
  startedAt?: number
  completedAt?: number
}

// DEX Pair 接口
export interface DexPair {
  pairAddress: string
  token0: { address: string; symbol: string; decimals: number }
  token1: { address: string; symbol: string; decimals: number }
  reserve0: string
  reserve1: string
}

/**
 * 市盈率与市值监控管理器
 */
export class MarketMonitorManager {
  // 活跃的监控任务
  private activeTasks: Map<string, MarketMonitorTask> = new Map()

  // 暂停的任务
  private pausedTasks: Map<string, MarketMonitorTask> = new Map()

  // 已完成的任务
  private completedTasks: Map<string, MarketMonitorTask> = new Map()

  // 监控定时器
  private monitorTimers: Map<string, NodeJS.Timeout> = new Map()

  // 事件监听器
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map()

  // PancakeSwap Pair ABI（简化版）
  private readonly PANCAKE_PAIR_ABI = [
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function balanceOf(address account) external view returns (uint256)'
  ]

  // ERC20 ABI（简化版）
  private readonly ERC20_ABI = [
    'function totalSupply() external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)',
    'function name() external view returns (string)'
  ]

  /**
   * 创建监控任务
   */
  createTask(params: {
    tokenAddress: string
    network: 'bsc' | 'solana'
    config?: MarketMonitorTask['config']
  }): { success: boolean; taskId?: string; error?: string } {
    try {
      const taskId = `market-monitor-${params.network}-${params.tokenAddress.slice(0, 8)}-${Date.now()}`

      const task: MarketMonitorTask = {
        id: taskId,
        tokenAddress: params.tokenAddress,
        network: params.network,
        status: 'pending',

        // 默认配置
        config: params.config || {
          updateInterval: 5000, // 默认5秒更新一次
          alertThresholds: {
            price: [],
            marketCap: [],
            liquidity: []
          }
        },

        currentData: {
          price: '0',
          marketCap: '0',
          liquidity: '0',
          volume24h: '0',
          priceChange24h: '0',
          lastUpdated: 0
        },

        priceHistory: [],
        alerts: [],

        createdAt: Date.now()
      }

      // 缓存任务
      this.activeTasks.set(taskId, task)

      console.log(`市值监控任务已创建: ${taskId}`)

      this._emitEvent('market-monitor:created', { taskId })

      return { success: true, taskId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 启动监控任务
   */
  async startTask(taskId: string): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const task = this.activeTasks.get(taskId)

      if (!task) {
        return { success: false, error: `任务不存在: ${taskId}` }
      }

      if (task.status !== 'pending' && task.status !== 'paused') {
        return { success: false, error: `任务状态不正确: ${task.status}` }
      }

      // 更新状态
      task.status = 'running'
      task.startedAt = Date.now()

      // 获取初始数据
      await this._updateMarketData(task)

      // 启动定时器
      const timer = setInterval(async () => {
        if (task.status === 'running') {
          await this._updateMarketData(task)
        } else {
          clearInterval(timer)
          this.monitorTimers.delete(taskId)
        }
      }, task.config.updateInterval)

      this.monitorTimers.set(taskId, timer)

      console.log(`市值监控任务已启动: ${taskId}, 更新频率: ${task.config.updateInterval}ms`)

      this._emitEvent('market-monitor:started', {
        taskId,
        startTime: task.startedAt,
        config: task.config
      })

      return { success: true, taskId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 暂停监控任务
   */
  pauseTask(taskId: string): { success: boolean; taskId?: string; error?: string } {
    try {
      const task = this.activeTasks.get(taskId)

      if (!task) {
        return { success: false, error: `任务不存在: ${taskId}` }
      }

      if (task.status !== 'running') {
        return { success: false, error: `任务状态不正确: ${task.status}` }
      }

      // 清除定时器
      const timer = this.monitorTimers.get(taskId)
      if (timer) {
        clearInterval(timer)
        this.monitorTimers.delete(taskId)
      }

      // 更新状态
      task.status = 'paused'

      // 移动到暂停列表
      this.pausedTasks.set(taskId, task)
      this.activeTasks.delete(taskId)

      console.log(`市值监控任务已暂停: ${taskId}`)

      this._emitEvent('market-monitor:paused', { taskId })

      return { success: true, taskId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 恢复监控任务
   */
  async resumeTask(taskId: string): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const task = this.pausedTasks.get(taskId)

      if (!task) {
        return { success: false, error: `任务不存在: ${taskId}` }
      }

      if (task.status !== 'paused') {
        return { success: false, error: `任务状态不正确: ${task.status}` }
      }

      // 移回活跃列表
      this.activeTasks.set(taskId, task)
      this.pausedTasks.delete(taskId)

      // 启动任务
      return await this.startTask(taskId)
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 取消监控任务
   */
  cancelTask(taskId: string): { success: boolean; taskId?: string; error?: string } {
    try {
      // 检查所有任务列表
      let task = this.activeTasks.get(taskId)
      let source = 'active'

      if (!task) {
        task = this.pausedTasks.get(taskId)
        source = 'paused'
      }

      if (!task) {
        return { success: false, error: `任务不存在: ${taskId}` }
      }

      // 清除定时器
      const timer = this.monitorTimers.get(taskId)
      if (timer) {
        clearInterval(timer)
        this.monitorTimers.delete(taskId)
      }

      // 更新状态
      task.status = 'cancelled'
      task.completedAt = Date.now()

      // 移动到已完成列表
      this.completedTasks.set(taskId, task)

      // 从源列表删除
      if (source === 'active') {
        this.activeTasks.delete(taskId)
      } else {
        this.pausedTasks.delete(taskId)
      }

      console.log(`市值监控任务已取消: ${taskId}`)

      this._emitEvent('market-monitor:cancelled', { taskId })

      return { success: true, taskId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): { success: boolean; task?: MarketMonitorTask; error?: string } {
    // 检查所有任务列表
    let task = this.activeTasks.get(taskId)
    if (!task) task = this.pausedTasks.get(taskId)
    if (!task) task = this.completedTasks.get(taskId)

    if (!task) {
      return { success: false, error: `任务不存在: ${taskId}` }
    }

    return { success: true, task: { ...task } }
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): {
    success: boolean
    tasks?: { active: MarketMonitorTask[]; paused: MarketMonitorTask[]; completed: MarketMonitorTask[] }
    error?: string
  } {
    return {
      success: true,
      tasks: {
        active: Array.from(this.activeTasks.values()),
        paused: Array.from(this.pausedTasks.values()),
        completed: Array.from(this.completedTasks.values())
      }
    }
  }

  /**
   * 更新市场数据
   */
  private async _updateMarketData(task: MarketMonitorTask): Promise<void> {
    try {
      let marketData: {
        price: string
        marketCap: string
        liquidity: string
        volume24h?: string
        priceChange24h?: string
      }

      if (task.network === 'bsc') {
        marketData = await this._getBSCMarketData(task.tokenAddress)
      } else {
        marketData = await this._getSolanaMarketData(task.tokenAddress)
      }

      // 更新当前数据
      task.currentData = {
        price: marketData.price,
        marketCap: marketData.marketCap,
        liquidity: marketData.liquidity,
        volume24h: marketData.volume24h || '0',
        priceChange24h: marketData.priceChange24h || '0',
        lastUpdated: Date.now()
      }

      // 添加到历史记录（最多保留1000条）
      task.priceHistory.push({
        timestamp: Date.now(),
        price: marketData.price
      })

      if (task.priceHistory.length > 1000) {
        task.priceHistory = task.priceHistory.slice(-1000)
      }

      // 检查预警条件
      this._checkAlerts(task)

      // 发送数据更新事件
      this._emitEvent('market-monitor:data-updated', {
        taskId: task.id,
        tokenAddress: task.tokenAddress,
        network: task.network,
        data: task.currentData
      })

    } catch (error: any) {
      console.error(`更新市场数据失败: ${task.id}`, error)

      this._emitEvent('market-monitor:error', {
        taskId: task.id,
        error: error.message
      })
    }
  }

  /**
   * 获取 BSC 市场数据
   */
  private async _getBSCMarketData(tokenAddress: string): Promise<{
    price: string
    marketCap: string
    liquidity: string
    volume24h?: string
    priceChange24h?: string
  }> {
    const provider = await getProvider()

    // 查找 PancakeSwap 交易对
    const pairAddress = await this._findPancakeSwapPair(tokenAddress)

    if (!pairAddress) {
      throw new Error('未找到 PancakeSwap 交易对')
    }

    // 获取交易对合约
    const pairContract = new ethers.Contract(pairAddress, this.PANCAKE_PAIR_ABI, provider)

    // 获取储备量
    const reserves = await pairContract.getReserves()

    // 获取代币地址
    const token0Address = await pairContract.token0()
    const token1Address = await pairContract.token1()

    // 确定哪个是目标代币
    const isToken0 = token0Address.toLowerCase() === tokenAddress.toLowerCase()

    // 获取代币信息
    const tokenContract = new ethers.Contract(
      tokenAddress,
      this.ERC20_ABI,
      provider
    )

    const totalSupply = await tokenContract.totalSupply()
    const decimals = await tokenContract.decimals()

    // 计算价格（BNB 为计价货币）
    const tokenReserve = isToken0 ? reserves[0] : reserves[1]
    const bnbReserve = isToken0 ? reserves[1] : reserves[0]

    const priceInBNB = parseFloat(ethers.formatEther(bnbReserve)) / parseFloat(ethers.formatEther(tokenReserve))

    // 计算市值
    const marketCap = priceInBNB * parseFloat(ethers.formatEther(totalSupply))

    // 计算流动性
    const liquidity = parseFloat(ethers.formatEther(bnbReserve)) * 2 // 简化计算

    // TODO: 获取 24h 交易量和价格变化（需要从 DEX 聚合器获取）

    return {
      price: priceInBNB.toFixed(18),
      marketCap: marketCap.toFixed(18),
      liquidity: liquidity.toFixed(18),
      volume24h: '0', // 需要实现
      priceChange24h: '0' // 需要实现
    }
  }

  /**
   * 查找 PancakeSwap 交易对
   */
  private async _findPancakeSwapPair(tokenAddress: string): Promise<string | null> {
    try {
      const provider = await getProvider()

      // PancakeSwap Factory 地址
      const factoryAddress = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'

      // Factory ABI（简化版）
      const factoryABI = [
        'function getPair(address tokenA, address tokenB) external view returns (address pair)'
      ]

      const factoryContract = new ethers.Contract(factoryAddress, factoryABI, provider)

      // WBNB 地址
      const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

      // 查询交易对
      const pairAddress = await factoryContract.getPair(tokenAddress, WBNB_ADDRESS)

      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        return null
      }

      return pairAddress
    } catch (error) {
      console.error('查找 PancakeSwap 交易对失败:', error)
      return null
    }
  }

  /**
   * 获取 Solana 市场数据
   */
  private async _getSolanaMarketData(tokenAddress: string): Promise<{
    price: string
    marketCap: string
    liquidity: string
    volume24h?: string
    priceChange24h?: string
  }> {
    // TODO: 实现 Solana 市场数据获取
    // 需要集成 Raydium 或 Jupiter API

    return {
      price: '0.00001',
      marketCap: '1000000',
      liquidity: '500000',
      volume24h: '0',
      priceChange24h: '0'
    }
  }

  /**
   * 检查预警条件
   */
  private _checkAlerts(task: MarketMonitorTask): void {
    const { price, marketCap, liquidity } = task.currentData

    // 检查价格预警
    task.config.alertThresholds.price.forEach((threshold, index) => {
      if (threshold.enabled && this._evaluateCondition(price, threshold.condition, threshold.value)) {
        const alertId = `alert-${task.id}-price-${index}-${Date.now()}`

        // 避免重复触发（同一类型的预警在10秒内不重复触发）
        const recentAlert = task.alerts.find(a =>
          a.type === 'price' &&
          a.condition === threshold.condition &&
          Date.now() - a.triggeredAt < 10000
        )

        if (!recentAlert) {
          task.alerts.push({
            id: alertId,
            type: 'price',
            condition: threshold.condition,
            value: threshold.value,
            triggeredAt: Date.now()
          })

          this._emitEvent('market-monitor:alert-triggered', {
            taskId: task.id,
            alertId,
            type: 'price',
            condition: threshold.condition,
            currentValue: price,
            thresholdValue: threshold.value
          })
        }
      }
    })

    // 检查市值预警
    task.config.alertThresholds.marketCap.forEach((threshold, index) => {
      if (threshold.enabled && this._evaluateCondition(marketCap, threshold.condition, threshold.value)) {
        const alertId = `alert-${task.id}-marketcap-${index}-${Date.now()}`

        const recentAlert = task.alerts.find(a =>
          a.type === 'marketCap' &&
          a.condition === threshold.condition &&
          Date.now() - a.triggeredAt < 10000
        )

        if (!recentAlert) {
          task.alerts.push({
            id: alertId,
            type: 'marketCap',
            condition: threshold.condition,
            value: threshold.value,
            triggeredAt: Date.now()
          })

          this._emitEvent('market-monitor:alert-triggered', {
            taskId: task.id,
            alertId,
            type: 'marketCap',
            condition: threshold.condition,
            currentValue: marketCap,
            thresholdValue: threshold.value
          })
        }
      }
    })

    // 检查流动性预警
    task.config.alertThresholds.liquidity.forEach((threshold, index) => {
      if (threshold.enabled && this._evaluateCondition(liquidity, threshold.condition, threshold.value)) {
        const alertId = `alert-${task.id}-liquidity-${index}-${Date.now()}`

        const recentAlert = task.alerts.find(a =>
          a.type === 'liquidity' &&
          a.condition === threshold.condition &&
          Date.now() - a.triggeredAt < 10000
        )

        if (!recentAlert) {
          task.alerts.push({
            id: alertId,
            type: 'liquidity',
            condition: threshold.condition,
            value: threshold.value,
            triggeredAt: Date.now()
          })

          this._emitEvent('market-monitor:alert-triggered', {
            taskId: task.id,
            alertId,
            type: 'liquidity',
            condition: threshold.condition,
            currentValue: liquidity,
            thresholdValue: threshold.value
          })
        }
      }
    })
  }

  /**
   * 评估条件
   */
  private _evaluateCondition(currentValue: string, condition: string, thresholdValue: string): boolean {
    const current = parseFloat(currentValue)
    const threshold = parseFloat(thresholdValue)

    switch (condition) {
      case '>':
        return current > threshold
      case '>=':
        return current >= threshold
      case '<':
        return current < threshold
      case '<=':
        return current <= threshold
      case '==':
        return current === threshold
      default:
        return false
    }
  }

  /**
   * 添加预警条件
   */
  addAlert(
    taskId: string,
    type: 'price' | 'marketCap' | 'liquidity',
    condition: string,
    value: string
  ): { success: boolean; alertId?: string; error?: string } {
    try {
      const task = this.activeTasks.get(taskId)

      if (!task) {
        return { success: false, error: `任务不存在: ${taskId}` }
      }

      const alertId = `alert-${taskId}-${type}-${Date.now()}`

      if (type === 'price') {
        task.config.alertThresholds.price.push({ enabled: true, condition, value })
      } else if (type === 'marketCap') {
        task.config.alertThresholds.marketCap.push({ enabled: true, condition, value })
      } else if (type === 'liquidity') {
        task.config.alertThresholds.liquidity.push({ enabled: true, condition, value })
      }

      console.log(`预警条件已添加: ${taskId}, 类型: ${type}, 条件: ${condition} ${value}`)

      return { success: true, alertId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 移除预警条件
   */
  removeAlert(
    taskId: string,
    type: 'price' | 'marketCap' | 'liquidity',
    alertId: string
  ): { success: boolean; error?: string } {
    try {
      const task = this.activeTasks.get(taskId)

      if (!task) {
        return { success: false, error: `任务不存在: ${taskId}` }
      }

      if (type === 'price') {
        task.config.alertThresholds.price = task.config.alertThresholds.price.filter(
          a => a.condition !== alertId
        )
      } else if (type === 'marketCap') {
        task.config.alertThresholds.marketCap = task.config.alertThresholds.marketCap.filter(
          a => a.condition !== alertId
        )
      } else if (type === 'liquidity') {
        task.config.alertThresholds.liquidity = task.config.alertThresholds.liquidity.filter(
          a => a.condition !== alertId
        )
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取价格历史
   */
  getPriceHistory(
    taskId: string,
    timeRange?: number // 毫秒
  ): { success: boolean; history?: Array<{ timestamp: number; price: string }>; error?: string } {
    const task = this.activeTasks.get(taskId) ||
                 this.pausedTasks.get(taskId) ||
                 this.completedTasks.get(taskId)

    if (!task) {
      return { success: false, error: `任务不存在: ${taskId}` }
    }

    let history = task.priceHistory

    if (timeRange) {
      const now = Date.now()
      history = history.filter(h => now - h.timestamp <= timeRange)
    }

    return { success: true, history }
  }

  /**
   * 获取预警记录
   */
  getAlerts(taskId: string): { success: boolean; alerts?: any[]; error?: string } {
    const task = this.activeTasks.get(taskId) ||
                 this.pausedTasks.get(taskId) ||
                 this.completedTasks.get(taskId)

    if (!task) {
      return { success: false, error: `任务不存在: ${taskId}` }
    }

    return { success: true, alerts: task.alerts }
  }

  /**
   * 触发事件
   */
  private _emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || []

    for (const listener of listeners) {
      try {
        listener(data)
      } catch (error) {
        console.error(`事件监听器执行失败: ${event}`, error)
      }
    }
  }

  /**
   * 添加事件监听器
   */
  on(event: string, listener: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }

    this.eventListeners.get(event)!.push(listener)
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event)

    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 清理所有任务
   */
  cleanup(): void {
    // 清除所有定时器
    for (const timer of this.monitorTimers.values()) {
      clearInterval(timer)
    }

    this.monitorTimers.clear()
    this.activeTasks.clear()
    this.pausedTasks.clear()
    this.completedTasks.clear()
    this.eventListeners.clear()

    console.log('市值监控管理器已清理')
  }
}

// 单例导出
export const marketMonitorManager = new MarketMonitorManager()
