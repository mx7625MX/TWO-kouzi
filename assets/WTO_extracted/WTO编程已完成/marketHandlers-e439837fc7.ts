/**
 * 市盈率与市值监控 IPC 处理器
 * 提供主进程与渲染进程之间的通信接口
 */

import { ipcMain } from 'electron'
import { marketMonitorManager } from '../workers/market-monitor'

/**
 * 注册所有市值监控相关的 IPC 处理器
 */
export function registerMarketMonitorHandlers(): void {
  console.log('注册市值监控 IPC 处理器...')

  // ==================== 任务管理 ====================

  /**
   * 创建监控任务
   * 通道: market-monitor:create
   */
  ipcMain.handle('market-monitor:create', async (_event, params: {
    tokenAddress: string
    network: 'bsc' | 'solana'
    config?: any
  }) => {
    try {
      const result = marketMonitorManager.createTask(params)
      return result
    } catch (error: any) {
      console.error('创建监控任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 启动监控任务
   * 通道: market-monitor:start
   */
  ipcMain.handle('market-monitor:start', async (_event, taskId: string) => {
    try {
      const result = await marketMonitorManager.startTask(taskId)
      return result
    } catch (error: any) {
      console.error('启动监控任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 暂停监控任务
   * 通道: market-monitor:pause
   */
  ipcMain.handle('market-monitor:pause', async (_event, taskId: string) => {
    try {
      const result = marketMonitorManager.pauseTask(taskId)
      return result
    } catch (error: any) {
      console.error('暂停监控任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 恢复监控任务
   * 通道: market-monitor:resume
   */
  ipcMain.handle('market-monitor:resume', async (_event, taskId: string) => {
    try {
      const result = await marketMonitorManager.resumeTask(taskId)
      return result
    } catch (error: any) {
      console.error('恢复监控任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 取消监控任务
   * 通道: market-monitor:cancel
   */
  ipcMain.handle('market-monitor:cancel', async (_event, taskId: string) => {
    try {
      const result = marketMonitorManager.cancelTask(taskId)
      return result
    } catch (error: any) {
      console.error('取消监控任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ==================== 数据查询 ====================

  /**
   * 获取任务状态
   * 通道: market-monitor:get-status
   */
  ipcMain.handle('market-monitor:get-status', async (_event, taskId: string) => {
    try {
      const result = marketMonitorManager.getTaskStatus(taskId)
      return result
    } catch (error: any) {
      console.error('获取任务状态失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取所有任务
   * 通道: market-monitor:get-all
   */
  ipcMain.handle('market-monitor:get-all', async () => {
    try {
      const result = marketMonitorManager.getAllTasks()
      return result
    } catch (error: any) {
      console.error('获取所有任务失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取实时数据
   * 通道: market-monitor:get-data
   */
  ipcMain.handle('market-monitor:get-data', async (_event, taskId: string) => {
    try {
      const result = marketMonitorManager.getTaskStatus(taskId)

      if (result.success && result.task) {
        return {
          success: true,
          data: result.task.currentData
        }
      } else {
        return result
      }
    } catch (error: any) {
      console.error('获取实时数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取价格历史
   * 通道: market-monitor:get-history
   */
  ipcMain.handle(
    'market-monitor:get-history',
    async (_event, taskId: string, timeRange?: number) => {
      try {
        const result = marketMonitorManager.getPriceHistory(taskId, timeRange)
        return result
      } catch (error: any) {
        console.error('获取价格历史失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  // ==================== 预警管理 ====================

  /**
   * 添加预警条件
   * 通道: market-monitor:add-alert
   */
  ipcMain.handle(
    'market-monitor:add-alert',
    async (_event, params: {
      taskId: string
      type: 'price' | 'marketCap' | 'liquidity'
      condition: string
      value: string
    }) => {
      try {
        const result = marketMonitorManager.addAlert(
          params.taskId,
          params.type,
          params.condition,
          params.value
        )
        return result
      } catch (error: any) {
        console.error('添加预警条件失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  /**
   * 移除预警条件
   * 通道: market-monitor:remove-alert
   */
  ipcMain.handle(
    'market-monitor:remove-alert',
    async (_event, params: {
      taskId: string
      type: 'price' | 'marketCap' | 'liquidity'
      alertId: string
    }) => {
      try {
        const result = marketMonitorManager.removeAlert(
          params.taskId,
          params.type,
          params.alertId
        )
        return result
      } catch (error: any) {
        console.error('移除预警条件失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  /**
   * 获取预警记录
   * 通道: market-monitor:get-alerts
   */
  ipcMain.handle('market-monitor:get-alerts', async (_event, taskId: string) => {
    try {
      const result = marketMonitorManager.getAlerts(taskId)
      return result
    } catch (error: any) {
      console.error('获取预警记录失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ==================== 事件监听 ====================

  /**
   * 监听任务创建事件
   * 事件: market-monitor:created
   */
  marketMonitorManager.on('market-monitor:created', (data) => {
    // 广播到所有渲染进程窗口
    const windows = require('electron').BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('market-monitor:created', data)
      }
    }
  })

  /**
   * 监听任务启动事件
   * 事件: market-monitor:started
   */
  marketMonitorManager.on('market-monitor:started', (data) => {
    const windows = require('electron').BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('market-monitor:started', data)
      }
    }
  })

  /**
   * 监听任务暂停事件
   * 事件: market-monitor:paused
   */
  marketMonitorManager.on('market-monitor:paused', (data) => {
    const windows = require('electron').BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('market-monitor:paused', data)
      }
    }
  })

  /**
   * 监听任务取消事件
   * 事件: market-monitor:cancelled
   */
  marketMonitorManager.on('market-monitor:cancelled', (data) => {
    const windows = require('electron').BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('market-monitor:cancelled', data)
      }
    }
  })

  /**
   * 监听数据更新事件
   * 事件: market-monitor:data-updated
   */
  marketMonitorManager.on('market-monitor:data-updated', (data) => {
    const windows = require('electron').BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('market-monitor:data-updated', data)
      }
    }
  })

  /**
   * 监听预警触发事件
   * 事件: market-monitor:alert-triggered
   */
  marketMonitorManager.on('market-monitor:alert-triggered', (data) => {
    const windows = require('electron').BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('market-monitor:alert-triggered', data)
      }
    }
  })

  /**
   * 监听错误事件
   * 事件: market-monitor:error
   */
  marketMonitorManager.on('market-monitor:error', (data) => {
    const windows = require('electron').BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('market-monitor:error', data)
      }
    }
  })

  console.log('市值监控 IPC 处理器注册完成')
}

/**
 * 取消注册所有处理器
 */
export function unregisterMarketMonitorHandlers(): void {
  console.log('取消注册市值监控 IPC 处理器...')

  const channels = [
    'market-monitor:create',
    'market-monitor:start',
    'market-monitor:pause',
    'market-monitor:resume',
    'market-monitor:cancel',
    'market-monitor:get-status',
    'market-monitor:get-all',
    'market-monitor:get-data',
    'market-monitor:get-history',
    'market-monitor:add-alert',
    'market-monitor:remove-alert',
    'market-monitor:get-alerts'
  ]

  channels.forEach(channel => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('市值监控 IPC 处理器取消注册完成')
}
