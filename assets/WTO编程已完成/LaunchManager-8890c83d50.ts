/**
 * 统一发币管理器
 * 管理BSC和Solana代币发行任务，处理任务队列和状态追踪
 */

import EventEmitter from 'events'
import { ExtendedDatabase } from '../database-extended'
import { bscTokenLauncher, BSCTokenLaunchParams, BSCTokenLaunchResult } from './BSCTokenLauncher'
import { solanaTokenLauncher, SolanaTokenLaunchParams, SolanaTokenLaunchResult } from './SolanaTokenLauncher'
import { bscBundleBuyer, BSCBundleBuyParams, BundleBuyResult } from './BSCBundleBuyer'
import { solanaBundleBuyer, SolanaBundleBuyParams, SolanaBundleBuyResult } from './SolanaBundleBuyer'
import { TokenLaunchParams, LaunchTask } from '../../shared/types'

/**
 * 管理器配置
 */
interface ManagerConfig {
  maxConcurrentTasks: number
  taskTimeout: number
  retryAttempts: number
}

/**
 * 任务统计
 */
interface TaskStatistics {
  total: number
  completed: number
  failed: number
  inProgress: number
  pending: number
}

/**
 * 统一发币管理器类
 */
export class LaunchManager extends EventEmitter {
  private db: ExtendedDatabase
  private config: ManagerConfig
  private taskQueue: Map<string, LaunchTask> = new Map()
  private activeTasks: Set<string> = new Set()
  private isProcessing: boolean = false

  constructor(db: ExtendedDatabase, config?: Partial<ManagerConfig>) {
    super()
    this.db = db
    this.config = {
      maxConcurrentTasks: config?.maxConcurrentTasks || 3,
      taskTimeout: config?.taskTimeout || 300000, // 5分钟
      retryAttempts: config?.retryAttempts || 3
    }
  }

  /**
   * 创建发币任务
   */
  async createLaunchTask(params: TokenLaunchParams): Promise<string> {
    const taskId = `launch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const task: LaunchTask = {
      id: taskId,
      network: params.network,
      params,
      status: 'pending',
      createdAt: Date.now()
    }

    // 保存到数据库
    this.db.insertLaunchTask({
      id: taskId,
      network: params.network,
      token_name: params.name,
      token_symbol: params.symbol,
      total_supply: params.totalSupply,
      status: 'pending',
      created_at: Date.now()
    })

    // 添加到队列
    this.taskQueue.set(taskId, task)
    this.emit('taskCreated', task)

    // 启动处理队列
    this.processQueue()

    return taskId
  }

  /**
   * 创建捆绑买入任务
   */
  async createBundleBuyTask(
    network: 'BSC' | 'Solana',
    params: BSCBundleBuyParams | SolanaBundleBuyParams
  ): Promise<string> {
    const batchId = `bundle_${network.toLowerCase()}_${Date.now()}`

    this.emit('bundleCreated', { batchId, network, params })
    return batchId
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) return

    this.isProcessing = true

    try {
      // 查找待处理任务
      const pendingTasks = Array.from(this.taskQueue.values())
        .filter(task => task.status === 'pending')
        .sort((a, b) => a.createdAt - b.createdAt)

      if (pendingTasks.length === 0) {
        this.isProcessing = false
        return
      }

      // 处理下一个任务
      for (const task of pendingTasks) {
        if (this.activeTasks.size >= this.config.maxConcurrentTasks) break

        this.activeTasks.add(task.id)
        this.executeTask(task)
      }

    } catch (error) {
      console.error('Error processing task queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(task: LaunchTask): Promise<void> {
    try {
      // 更新状态为处理中
      task.status = 'processing'
      this.db.updateLaunchTask(task.id, { status: 'processing' })
      this.emit('taskStatusChanged', task)

      let result: any

      // 根据网络类型执行相应的部署
      if (task.network === 'BSC') {
        result = await this.executeBSCTask(task)
      } else if (task.network === 'Solana') {
        result = await this.executeSolanaTask(task)
      } else {
        throw new Error(`Unsupported network: ${task.network}`)
      }

      // 更新状态为完成
      task.status = 'completed'
      task.result = result
      task.completedAt = Date.now()

      this.db.updateLaunchTask(task.id, {
        token_address: result.contractAddress || result.mintAddress,
        status: 'completed',
        result: JSON.stringify(result),
        completed_at: Date.now()
      })

      this.emit('taskCompleted', task)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // 更新状态为失败
      task.status = 'failed'
      task.error = errorMessage
      task.completedAt = Date.now()

      this.db.updateLaunchTask(task.id, {
        status: 'failed',
        error: errorMessage,
        completed_at: Date.now()
      })

      this.emit('taskFailed', task)

    } finally {
      this.activeTasks.delete(task.id)
      // 继续处理队列
      this.processQueue()
    }
  }

  /**
   * 执行BSC任务
   */
  private async executeBSCTask(task: LaunchTask): Promise<BSCTokenLaunchResult> {
    const bscParams: BSCTokenLaunchParams = {
      name: task.params.name,
      symbol: task.params.symbol,
      totalSupply: task.params.totalSupply,
      decimals: task.params.decimals,
      privateKey: task.params.walletId, // 需要从钱包获取私钥
      rpcUrl: 'https://bsc-dataseed.binance.org/',
      useMEVProtection: task.params.useMEVProtection || false
    }

    return await bscTokenLauncher.launchToken(bscParams)
  }

  /**
   * 执行Solana任务
   */
  private async executeSolanaTask(task: LaunchTask): Promise<SolanaTokenLaunchResult> {
    const solanaParams: SolanaTokenLaunchParams = {
      name: task.params.name,
      symbol: task.params.symbol,
      totalSupply: task.params.totalSupply,
      decimals: task.params.decimals,
      privateKey: task.params.walletId, // 需要从钱包获取私钥
      rpcUrl: 'https://api.mainnet-beta.solana.com'
    }

    return await solanaTokenLauncher.launchToken(solanaParams)
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.taskQueue.get(taskId)

    if (!task) return false
    if (task.status === 'completed' || task.status === 'failed') return false

    // 如果任务正在执行，尝试取消
    if (task.status === 'processing') {
      if (task.network === 'BSC') {
        bscTokenLauncher.cancelDeployment(taskId)
      } else if (task.network === 'Solana') {
        solanaTokenLauncher.cancelDeployment(taskId)
      }
    }

    // 更新任务状态
    task.status = 'failed'
    task.error = 'Task cancelled by user'
    task.completedAt = Date.now()

    this.db.updateLaunchTask(taskId, {
      status: 'failed',
      error: 'Task cancelled by user',
      completed_at: Date.now()
    })

    this.emit('taskCancelled', task)

    return true
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): LaunchTask | null {
    return this.taskQueue.get(taskId) || null
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): LaunchTask[] {
    return Array.from(this.taskQueue.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * 根据状态获取任务
   */
  getTasksByStatus(status: LaunchTask['status']): LaunchTask[] {
    return Array.from(this.taskQueue.values())
      .filter(task => task.status === status)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * 获取任务统计
   */
  getStatistics(): TaskStatistics {
    const tasks = Array.from(this.taskQueue.values())

    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      inProgress: tasks.filter(t => t.status === 'processing').length,
      pending: tasks.filter(t => t.status === 'pending').length
    }
  }

  /**
   * 清理已完成的任务
   */
  clearCompletedTasks(): void {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    for (const [taskId, task] of this.taskQueue) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.completedAt &&
        task.completedAt < oneDayAgo
      ) {
        this.taskQueue.delete(taskId)
        this.db.deleteLaunchTask(taskId)
      }
    }

    this.emit('tasksCleared')
  }

  /**
   * 从数据库加载任务
   */
  async loadTasksFromDatabase(): Promise<void> {
    const tasks = this.db.getAllLaunchTasks()

    for (const task of tasks) {
      this.taskQueue.set(task.id, {
        id: task.id,
        network: task.network as 'BSC' | 'Solana',
        params: {
          name: task.token_name,
          symbol: task.token_symbol,
          totalSupply: task.total_supply,
          network: task.network as 'BSC' | 'Solana',
          walletId: ''
        },
        status: task.status as LaunchTask['status'],
        result: task.result ? JSON.parse(task.result) : undefined,
        error: task.error,
        createdAt: task.created_at,
        completedAt: task.completed_at
      })
    }

    this.emit('tasksLoaded')
  }

  /**
   * 重新执行失败的任务
   */
  async retryFailedTask(taskId: string): Promise<boolean> {
    const task = this.taskQueue.get(taskId)

    if (!task || task.status !== 'failed') return false

    // 重置任务状态
    task.status = 'pending'
    task.error = undefined
    task.result = undefined
    task.completedAt = undefined

    this.db.updateLaunchTask(taskId, { status: 'pending' })
    this.emit('taskRetried', task)

    // 重新处理队列
    this.processQueue()

    return true
  }
}

/**
 * 创建统一发币管理器实例
 */
export const launchManager = new LaunchManager(
  new ExtendedDatabase('meme-master.db'),
  {
    maxConcurrentTasks: 3,
    taskTimeout: 300000,
    retryAttempts: 3
  }
)

/**
 * 初始化管理器
 */
export async function initializeLaunchManager(): Promise<void> {
  await launchManager.loadTasksFromDatabase()
  await launchManager.processQueue()
  console.log('Launch Manager initialized')
}

// 监听任务事件
launchManager.on('taskCreated', (task) => {
  console.log(`Task created: ${task.id}`)
})

launchManager.on('taskCompleted', (task) => {
  console.log(`Task completed: ${task.id}`)
})

launchManager.on('taskFailed', (task) => {
  console.log(`Task failed: ${task.id} - ${task.error}`)
})

launchManager.on('taskCancelled', (task) => {
  console.log(`Task cancelled: ${task.id}`)
})
