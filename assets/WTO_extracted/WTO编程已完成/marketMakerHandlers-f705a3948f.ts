/**
 * 市值管理IPC处理器
 * 提供主进程与渲染进程之间的通信接口
 */

import { ipcMain } from 'electron'
import { marketMakerEngine, MarketStrategy, MarketTask } from '../workers/market-maker-engine'

/**
 * 注册所有市值管理相关的 IPC 处理器
 */
export function registerMarketHandlers(): void {
  console.log('注册市值管理 IPC 处理器...')

  // ==================== 任务管理 ====================

  /**
   * 创建市值管理任务
   * 通道: market:create-task
   */
  ipcMain.handle('market:create-task', async (_event, params: {
    tokenAddress: string
    network: 'bsc' | 'solana'
    tokenSymbol: string
    strategy: MarketStrategy
  }) => {
    try {
      const task = await marketMakerEngine.createTask(
        params.tokenAddress,
        params.network,
        params.tokenSymbol,
        params.strategy
      )
      return { success: true, task }
    } catch (error: any) {
      console.error('创建市值管理任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 启动市值管理任务
   * 通道: market:start-task
   */
  ipcMain.handle('market:start-task', async (_event, taskId: string) => {
    try {
      await marketMakerEngine.startTask(taskId)
      return { success: true }
    } catch (error: any) {
      console.error('启动市值管理任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 停止市值管理任务
   * 通道: market:stop-task
   */
  ipcMain.handle('market:stop-task', async (_event, taskId: string) => {
    try {
      await marketMakerEngine.stopTask(taskId)
      return { success: true }
    } catch (error: any) {
      console.error('停止市值管理任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 紧急停止所有任务
   * 通道: market:emergency-stop
   */
  ipcMain.handle('market:emergency-stop', async () => {
    try {
      await marketMakerEngine.emergencyStopAll()
      return { success: true }
    } catch (error: any) {
      console.error('紧急停止所有任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ==================== 数据查询 ====================

  /**
   * 获取任务信息
   * 通道: market:get-task
   */
  ipcMain.handle('market:get-task', async (_event, taskId: string) => {
    try {
      const task = marketMakerEngine.getTask(taskId)
      if (!task) {
        return { success: false, error: '任务不存在' }
      }
      return { success: true, task }
    } catch (error: any) {
      console.error('获取任务信息失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取所有任务
   * 通道: market:get-all-tasks
   */
  ipcMain.handle('market:get-all-tasks', async () => {
    try {
      const tasks = marketMakerEngine.getAllTasks()
      return { success: true, tasks }
    } catch (error: any) {
      console.error('获取所有任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取交易历史
   * 通道: market:get-trade-history
   */
  ipcMain.handle('market:get-trade-history', async (_event, taskId: string) => {
    try {
      const history = marketMakerEngine.getTradeHistory(taskId)
      return { success: true, history }
    } catch (error: any) {
      console.error('获取交易历史失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 更新任务价格
   * 通道: market:update-price
   */
  ipcMain.handle('market:update-price', async (_event, taskId: string) => {
    try {
      await marketMakerEngine.updateTaskPrice(taskId)
      const task = marketMakerEngine.getTask(taskId)
      return { success: true, task }
    } catch (error: any) {
      console.error('更新任务价格失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ==================== 统计数据 ====================

  /**
   * 获取统计数据
   * 通道: market:get-statistics
   */
  ipcMain.handle('market:get-statistics', async () => {
    try {
      const stats = marketMakerEngine.getStatistics()
      return { success: true, stats }
    } catch (error: any) {
      console.error('获取统计数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ==================== 数据清理 ====================

  /**
   * 清理完成的任务
   * 通道: market:cleanup
   */
  ipcMain.handle('market:cleanup', async (_event, olderThanMs?: number) => {
    try {
      marketMakerEngine.cleanupCompletedTasks(olderThanMs)
      return { success: true }
    } catch (error: any) {
      console.error('清理完成的任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ==================== 策略配置 ====================

  /**
   * 更新任务策略
   * 通道: market:update-strategy
   */
  ipcMain.handle('market:update-strategy', async (_event, params: {
    taskId: string
    strategy: Partial<MarketStrategy>
  }) => {
    try {
      const task = marketMakerEngine.getTask(params.taskId)
      if (!task) {
        return { success: false, error: '任务不存在' }
      }

      // 更新策略
      Object.assign(task.strategy, params.strategy)
      
      // 如果任务正在运行且策略被禁用，停止任务
      if (task.status === 'running' && !task.strategy.enabled) {
        await marketMakerEngine.stopTask(params.taskId, '策略被禁用')
      }
      // 如果任务未运行且策略被启用，启动任务
      else if (task.status !== 'running' && task.strategy.enabled && !task.strategy.emergencyStop) {
        await marketMakerEngine.startTask(params.taskId)
      }

      return { success: true, task }
    } catch (error: any) {
      console.error('更新任务策略失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 触发紧急停止
   * 通道: market:trigger-emergency-stop
   */
  ipcMain.handle('market:trigger-emergency-stop', async (_event, taskId: string) => {
    try {
      const task = marketMakerEngine.getTask(taskId)
      if (!task) {
        return { success: false, error: '任务不存在' }
      }

      task.strategy.emergencyStop = true
      
      // 如果任务正在运行，立即停止
      if (task.status === 'running') {
        await marketMakerEngine.stopTask(taskId, '紧急停止触发')
      }

      return { success: true, task }
    } catch (error: any) {
      console.error('触发紧急停止失败:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('市值管理 IPC 处理器注册完成')
}

/**
 * 取消注册所有处理器
 */
export function unregisterMarketHandlers(): void {
  console.log('取消注册市值管理 IPC 处理器...')

  const channels = [
    'market:create-task',
    'market:start-task',
    'market:stop-task',
    'market:emergency-stop',
    'market:get-task',
    'market:get-all-tasks',
    'market:get-trade-history',
    'market:update-price',
    'market:get-statistics',
    'market:cleanup',
    'market:update-strategy',
    'market:trigger-emergency-stop'
  ]

  channels.forEach(channel => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('市值管理 IPC 处理器取消注册完成')
}
