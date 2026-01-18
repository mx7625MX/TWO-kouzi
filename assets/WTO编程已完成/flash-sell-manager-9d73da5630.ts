/**
 * 闪电卖出管理器
 * - 毫秒级精度定时器
 * - 支持分批卖出
 * - 支持价格触发
 * - 支持止损保护
 */

import { ethers, Contract, Signer, parseUnits, formatUnits } from 'ethers'
import { ExtendedDatabase } from '../database-extended'
import { bscUtils } from '../bscUtils'
import { solanaUtils } from '../solanaUtils'

// PancakeSwap Router ABI
const PANCAKESWAP_ROUTER_ABI = [
  'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function WETH() external pure returns (address)'
]

// BEP20 ABI
const BEP20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
]

/**
 * 闪电卖出参数
 */
export interface FlashSellParams {
  tokenAddress: string
  network: 'bsc' | 'solana'
  sellWallets: Array<{
    address: string
    privateKey: string
  }>
  sellStrategy: 'all' | 'batch' | 'price-trigger' | 'stop-loss'
  timeSettings: {
    delay: number
    maxDelay?: number
    batches?: Array<{ time: number; ratio: number }>
  }
  priceSettings: {
    targetPrice?: number
    priceOperator?: '>=' | '<=' | '>' | '<'
    stopLossPrice?: number
  }
}

/**
 * 单次卖出结果
 */
export interface SingleSellResult {
  walletAddress: string
  txHash: string
  amount: string
  value: number
  gasUsed?: string
  status: 'success' | 'failed'
  error?: string
}

/**
 * 闪电卖出任务状态
 */
export interface FlashSellTask {
  id: string
  tokenAddress: string
  network: 'bsc' | 'solana'
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  startTime: number | null
  endTime: number | null
  sellRecords: Array<{
    batch: string
    ratio: number
    walletCount: number
    timestamp: number
  }>
  createdAt: number
}

/**
 * 闪电卖出结果
 */
export interface FlashSellResult {
  taskId: string
  results: SingleSellResult[]
  duration: number
  summary: {
    totalWallets: number
    successful: number
    failed: number
    totalValue: number
  }
}

/**
 * 闪电卖出管理器类
 */
export class FlashSellManager {
  private db: ExtendedDatabase
  private activeTasks: Map<string, FlashSellTask>
  private completedTasks: Map<string, FlashSellTask>
  private timers: Map<string, NodeJS.Timeout[]>
  private priceMonitors: Map<string, NodeJS.Timeout>
  private eventListeners: Map<string, ((data: any) => void)[]>

  // PancakeSwap Router地址 (BSC主网)
  private readonly PANCAKESWAP_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  // WBNB地址
  private readonly WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

  constructor(db: ExtendedDatabase) {
    this.db = db
    this.activeTasks = new Map()
    this.completedTasks = new Map()
    this.timers = new Map()
    this.priceMonitors = new Map()
    this.eventListeners = new Map()
  }

  /**
   * 创建闪电卖出任务
   */
  createFlashSellTask(params: FlashSellParams): { success: boolean; taskId: string } {
    const taskId = `flash-sell-${params.network}-${params.tokenAddress.slice(0, 8)}-${Date.now()}`

    const task: FlashSellTask = {
      id: taskId,
      tokenAddress: params.tokenAddress,
      network: params.network,
      status: 'pending',
      startTime: null,
      endTime: null,
      sellRecords: [],
      createdAt: Date.now()
    }

    this.activeTasks.set(taskId, task)
    this.timers.set(taskId, [])

    console.log(`闪电卖出任务已创建: ${taskId}`)
    return { success: true, taskId }
  }

  /**
   * 启动闪电卖出任务
   */
  async startFlashSellTask(taskId: string, params: FlashSellParams): Promise<void> {
    const task = this.activeTasks.get(taskId)

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    if (task.status !== 'pending') {
      throw new Error(`任务状态不正确: ${task.status}`)
    }

    task.status = 'running'
    task.startTime = Date.now()

    try {
      if (params.sellStrategy === 'all') {
        await this._startAllSellTask(task, params)
      } else if (params.sellStrategy === 'batch') {
        await this._startBatchSellTask(task, params)
      } else if (params.sellStrategy === 'price-trigger') {
        await this._startPriceTriggerTask(task, params)
      } else if (params.sellStrategy === 'stop-loss') {
        await this._startStopLossTask(task, params)
      }

      this._emitEvent('flash-sell:started', {
        taskId,
        startTime: task.startTime
      })

      console.log(`闪电卖出任务已启动: ${taskId}`)
    } catch (error) {
      this._completeTask(taskId, 'failed', error)
      throw error
    }
  }

  /**
   * 全部卖出任务
   */
  private async _startAllSellTask(task: FlashSellTask, params: FlashSellParams): Promise<void> {
    const { timeSettings, sellWallets } = params
    const { delay = 2 } = timeSettings

    const delayMs = delay * 1000

    console.log(`闪电卖出: ${task.id}, 将在${delay}秒后执行`)

    const timer = setTimeout(async () => {
      try {
        await this._executeSell(task, sellWallets, 'all', 'normal')
        this._completeTask(task.id, 'success')
      } catch (error) {
        console.error(`闪电卖出执行失败: ${task.id}`, error)
        this._completeTask(task.id, 'failed', error)
      }
    }, delayMs)

    this.timers.get(task.id)?.push(timer)
  }

  /**
   * 分批卖出任务
   */
  private async _startBatchSellTask(task: FlashSellTask, params: FlashSellParams): Promise<void> {
    const { timeSettings, sellWallets } = params
    let { batches = [] } = timeSettings

    // 默认分批配置
    if (batches.length === 0) {
      batches = [
        { time: 2, ratio: 0.2 },
        { time: 5, ratio: 0.3 },
        { time: 10, ratio: 0.5 }
      ]
    }

    console.log(`闪电卖出: ${task.id}, 分批卖出，共${batches.length}批`)

    let currentWallets = [...sellWallets]

    for (const batch of batches) {
      const { time, ratio } = batch
      const delayMs = time * 1000
      const walletCount = Math.ceil(currentWallets.length * ratio)
      const batchWallets = currentWallets.slice(0, walletCount)
      currentWallets = currentWallets.slice(walletCount)

      const timer = setTimeout(async () => {
        try {
          const results = await this._executeSell(task, batchWallets, `batch-${time}s`, 'normal')

          task.sellRecords.push({
            batch: `${time}s`,
            ratio,
            walletCount: batchWallets.length,
            timestamp: Date.now()
          })

          this._emitEvent('flash-sell:batch-completed', {
            taskId: task.id,
            batch: `${time}s`,
            ratio,
            walletCount: batchWallets.length,
            results
          })

          // 检查是否所有批次完成
          if (task.sellRecords.length === batches.length) {
            this._completeTask(task.id, 'success')
          }
        } catch (error) {
          console.error(`分批卖出失败: ${task.id}, 批次: ${time}s`, error)
          this._completeTask(task.id, 'failed', error)
        }
      }, delayMs)

      this.timers.get(task.id)?.push(timer)
    }
  }

  /**
   * 价格触发卖出任务
   */
  private async _startPriceTriggerTask(task: FlashSellTask, params: FlashSellParams): Promise<void> {
    const { timeSettings, priceSettings, sellWallets } = params
    const { delay = 10, maxDelay = 60 } = timeSettings
    const { targetPrice, priceOperator = '>=' } = priceSettings

    if (!targetPrice) {
      throw new Error('价格触发模式需要设置目标价格')
    }

    console.log(`闪电卖出: ${task.id}, 价格触发, 目标价: ${targetPrice}`)

    // 价格监控定时器（每100ms检查一次）
    const priceMonitor = setInterval(async () => {
      try {
        const currentPrice = await this._getCurrentPrice(task.tokenAddress, task.network)

        console.log(`当前价格: ${currentPrice}, 目标价: ${targetPrice}`)

        let priceConditionMet = false

        if (priceOperator === '>=') {
          priceConditionMet = currentPrice >= targetPrice
        } else if (priceOperator === '<=') {
          priceConditionMet = currentPrice <= targetPrice
        } else if (priceOperator === '>') {
          priceConditionMet = currentPrice > targetPrice
        } else if (priceOperator === '<') {
          priceConditionMet = currentPrice < targetPrice
        }

        if (priceConditionMet) {
          console.log(`价格条件满足，执行卖出: ${task.id}`)
          clearInterval(priceMonitor)
          this.priceMonitors.delete(task.id)
          await this._executeSell(task, sellWallets, 'price-trigger', 'high')
          this._completeTask(task.id, 'success')
        }
      } catch (error) {
        console.error(`价格监控失败: ${task.id}`, error)
      }
    }, 100)

    this.priceMonitors.set(task.id, priceMonitor)

    // 超时定时器
    const delayMs = Math.min(delay, maxDelay) * 1000
    const timeoutTimer = setTimeout(async () => {
      try {
        console.log(`价格触发超时，执行卖出: ${task.id}`)
        clearInterval(priceMonitor)
        this.priceMonitors.delete(task.id)
        await this._executeSell(task, sellWallets, 'price-timeout', 'normal')
        this._completeTask(task.id, 'success')
      } catch (error) {
        console.error(`价格触发超时卖出失败: ${task.id}`, error)
        this._completeTask(task.id, 'failed', error)
      }
    }, delayMs)

    this.timers.get(task.id)?.push(timeoutTimer)
  }

  /**
   * 止损卖出任务
   */
  private async _startStopLossTask(task: FlashSellTask, params: FlashSellParams): Promise<void> {
    const { timeSettings, priceSettings, sellWallets } = params
    const { delay = 10 } = timeSettings
    const { stopLossPrice } = priceSettings

    if (!stopLossPrice) {
      throw new Error('止损模式需要设置止损价格')
    }

    console.log(`闪电卖出: ${task.id}, 止损保护, 止损价: ${stopLossPrice}`)

    // 价格监控定时器（每50ms检查一次）
    const priceMonitor = setInterval(async () => {
      try {
        const currentPrice = await this._getCurrentPrice(task.tokenAddress, task.network)

        console.log(`当前价格: ${currentPrice}, 止损价: ${stopLossPrice}`)

        if (currentPrice <= stopLossPrice) {
          console.log(`价格跌破止损价，立即卖出: ${task.id}`)
          clearInterval(priceMonitor)
          this.priceMonitors.delete(task.id)
          await this._executeSell(task, sellWallets, 'stop-loss', 'high')
          this._completeTask(task.id, 'success')
        }
      } catch (error) {
        console.error(`止损监控失败: ${task.id}`, error)
      }
    }, 50)

    this.priceMonitors.set(task.id, priceMonitor)

    // 超时定时器
    const delayMs = delay * 1000
    const timeoutTimer = setTimeout(async () => {
      try {
        console.log(`止损超时，执行卖出: ${task.id}`)
        clearInterval(priceMonitor)
        this.priceMonitors.delete(task.id)
        await this._executeSell(task, sellWallets, 'stop-timeout', 'normal')
        this._completeTask(task.id, 'success')
      } catch (error) {
        console.error(`止损超时卖出失败: ${task.id}`, error)
        this._completeTask(task.id, 'failed', error)
      }
    }, delayMs)

    this.timers.get(task.id)?.push(timeoutTimer)
  }

  /**
   * 执行卖出
   */
  private async _executeSell(
    task: FlashSellTask,
    sellWallets: Array<{ address: string; privateKey: string }>,
    sellType: string,
    priority: 'normal' | 'high' = 'normal'
  ): Promise<SingleSellResult[]> {
    console.log(`执行卖出: ${task.id}, 类型: ${sellType}, 钱包数: ${sellWallets.length}`)

    const startTime = Date.now()
    const sellResults: SingleSellResult[] = []

    const sellPromises = sellWallets.map(async (wallet) => {
      try {
        const result = await this._sellWallet(
          task.tokenAddress,
          task.network,
          wallet,
          priority
        )

        const sellResult: SingleSellResult = {
          success: true,
          walletAddress: wallet.address,
          txHash: result.txHash,
          amount: result.amount,
          value: result.value,
          gasUsed: result.gasUsed,
          status: 'success'
        }

        // 记录交易到数据库
        this.db.insertTransaction({
          id: `${task.id}_${sellType}_${wallet.address}`,
          type: 'flash_sell',
          network: task.network,
          token_address: task.tokenAddress,
          wallet_id: wallet.address,
          amount: result.amount,
          tx_hash: result.txHash,
          status: 'completed',
          gas_used: result.gasUsed,
          created_at: Date.now()
        })

        return sellResult
      } catch (error) {
        return {
          success: false,
          walletAddress: wallet.address,
          txHash: '',
          amount: '0',
          value: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    const results = await Promise.allSettled(sellPromises)

    for (const result of results) {
      if (result.status === 'fulfilled') {
        sellResults.push(result.value)
      }
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`卖出完成: ${task.id}, 耗时: ${duration}ms, 成功: ${sellResults.filter(r => r.success).length}/${sellWallets.length}`)

    this._emitEvent('flash-sell:sell-completed', {
      taskId: task.id,
      sellType,
      results: sellResults,
      duration
    })

    return sellResults
  }

  /**
   * 卖出单个钱包
   */
  private async _sellWallet(
    tokenAddress: string,
    network: 'bsc' | 'solana',
    wallet: { address: string; privateKey: string },
    priority: 'normal' | 'high'
  ): Promise<{ amount: string; value: number; txHash: string; gasUsed?: string }> {
    if (network === 'bsc') {
      return await this._sellBSCWallet(tokenAddress, wallet.privateKey, wallet.address, priority)
    } else if (network === 'solana') {
      return await this._sellSolanaWallet(tokenAddress, wallet.privateKey, wallet.address, priority)
    }

    throw new Error(`不支持的网络: ${network}`)
  }

  /**
   * 卖出BSC钱包
   */
  private async _sellBSCWallet(
    tokenAddress: string,
    privateKey: string,
    address: string,
    priority: 'normal' | 'high'
  ): Promise<{ amount: string; value: number; txHash: string; gasUsed: string }> {
    const rpcUrl = bscUtils.getRPCUrl()
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const signer = new ethers.Wallet(privateKey, provider)

    // 获取代币合约
    const tokenContract = new ethers.Contract(
      tokenAddress,
      BEP20_ABI,
      signer
    )

    // 获取余额
    const balance = await tokenContract.balanceOf(address)
    if (balance === 0n) {
      throw new Error('代币余额为0')
    }

    // 获取代币价格
    const price = await this._getCurrentPrice(tokenAddress, 'bsc')

    // 获取Router合约
    const routerContract = new ethers.Contract(
      this.PANCAKESWAP_ROUTER,
      PANCAKESWAP_ROUTER_ABI,
      signer
    )

    // 构建交易路径
    const path = [tokenAddress, this.WBNB_ADDRESS]

    // 设置截止时间
    const deadline = Math.floor(Date.now() / 1000) + 1200

    // 计算gas价格
    const feeData = await provider.getFeeData()
    const gasPrice = priority === 'high' 
      ? (feeData.maxFeePerGas || parseUnits('10', 'gwei'))
      : (feeData.gasPrice || parseUnits('5', 'gwei'))

    // 执行卖出
    const tx = await routerContract.swapExactTokensForETHSupportingFeeOnTransferTokens(
      balance,
      0, // 最小输出ETH
      path,
      address,
      deadline,
      {
        gasLimit: 300000,
        gasPrice
      }
    )

    // 等待确认
    const receipt = await tx.wait(2)

    const amount = formatUnits(balance, 18)
    const value = parseFloat(amount) * price

    return {
      amount,
      value,
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString()
    }
  }

  /**
   * 卖出Solana钱包
   */
  private async _sellSolanaWallet(
    tokenAddress: string,
    secretKey: string,
    address: string,
    priority: 'normal' | 'high'
  ): Promise<{ amount: string; value: number; txHash: string }> {
    const rpcUrl = solanaUtils.getRPCUrl()
    const connection = solanaUtils.getConnection(rpcUrl)

    // 这里需要实现Solana的卖出逻辑
    // 暂时返回模拟数据
    console.log(`Solana卖出: ${tokenAddress}, 地址: ${address}`)

    return {
      amount: '0',
      value: 0,
      txHash: 'pending'
    }
  }

  /**
   * 获取当前价格
   */
  private async _getCurrentPrice(tokenAddress: string, network: 'bsc' | 'solana'): Promise<number> {
    // 从数据库获取最新价格
    try {
      const prices = this.db.getLatestPrices(tokenAddress, network)
      if (prices && prices.length > 0) {
        return prices[0].price
      }
    } catch (error) {
      console.error('从数据库获取价格失败:', error)
    }

    // 返回默认价格（实际应该从DEX获取）
    return 0.00001
  }

  /**
   * 标记任务完成
   */
  private _completeTask(taskId: string, status: 'completed' | 'failed' | 'cancelled', error?: any): void {
    const task = this.activeTasks.get(taskId)

    if (!task) {
      return
    }

    // 清除所有定时器
    const timers = this.timers.get(taskId) || []
    for (const timer of timers) {
      clearTimeout(timer)
    }
    this.timers.delete(taskId)

    // 清除价格监控
    const priceMonitor = this.priceMonitors.get(taskId)
    if (priceMonitor) {
      clearInterval(priceMonitor)
      this.priceMonitors.delete(taskId)
    }

    // 更新状态
    task.status = status
    task.endTime = Date.now()

    // 移动到已完成列表
    this.completedTasks.set(taskId, task)
    this.activeTasks.delete(taskId)

    // 通知UI
    this._emitEvent('flash-sell:completed', {
      taskId,
      status,
      error: error instanceof Error ? error.message : String(error),
      duration: task.endTime - (task.startTime || task.createdAt)
    })

    console.log(`闪电卖出任务完成: ${taskId}, 状态: ${status}`)
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): { success: boolean; taskId: string } {
    const task = this.activeTasks.get(taskId)

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    // 清除所有定时器
    const timers = this.timers.get(taskId) || []
    for (const timer of timers) {
      clearTimeout(timer)
    }
    this.timers.delete(taskId)

    // 清除价格监控
    const priceMonitor = this.priceMonitors.get(taskId)
    if (priceMonitor) {
      clearInterval(priceMonitor)
      this.priceMonitors.delete(taskId)
    }

    // 标记为已取消
    this._completeTask(taskId, 'cancelled')

    console.log(`闪电卖出任务已取消: ${taskId}`)

    return { success: true, taskId }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): FlashSellTask | null {
    const activeTask = this.activeTasks.get(taskId)
    const completedTask = this.completedTasks.get(taskId)
    return activeTask || completedTask || null
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): { active: FlashSellTask[]; completed: FlashSellTask[] } {
    return {
      active: Array.from(this.activeTasks.values()),
      completed: Array.from(this.completedTasks.values())
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
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
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
}

/**
 * 验证闪电卖出参数
 */
export function validateFlashSellParams(params: FlashSellParams): { valid: boolean; error?: string } {
  if (!params.tokenAddress) {
    return { valid: false, error: '代币地址不能为空' }
  }

  if (params.network !== 'bsc' && params.network !== 'solana') {
    return { valid: false, error: '不支持的网络' }
  }

  if (params.sellWallets.length === 0) {
    return { valid: false, error: '卖出钱包列表不能为空' }
  }

  if (params.timeSettings.delay < 0.5) {
    return { valid: false, error: '最小延迟时间为0.5秒' }
  }

  if (params.sellStrategy === 'price-trigger' && !params.priceSettings.targetPrice) {
    return { valid: false, error: '价格触发模式需要设置目标价格' }
  }

  if (params.sellStrategy === 'stop-loss' && !params.priceSettings.stopLossPrice) {
    return { valid: false, error: '止损模式需要设置止损价格' }
  }

  return { valid: true }
}

/**
 * 计算预估收益
 */
export function estimateProfit(
  tokenPrice: number,
  sellAmount: string,
  sellStrategy: 'all' | 'batch',
  batches?: Array<{ time: number; ratio: number }>
): { totalValue: number; batchValues?: Array<{ time: number; ratio: number; value: number }> } {
  const totalValue = parseFloat(sellAmount) * tokenPrice

  if (sellStrategy === 'batch' && batches) {
    const batchValues = batches.map(batch => ({
      time: batch.time,
      ratio: batch.ratio,
      value: totalValue * batch.ratio
    }))

    return { totalValue, batchValues }
  }

  return { totalValue }
}
