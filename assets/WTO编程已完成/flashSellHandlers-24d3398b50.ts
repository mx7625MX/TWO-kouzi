/**
 * 闪电卖出 IPC 处理器
 * 处理前端与闪电卖出管理器之间的通信
 */

import { ipcMain } from 'electron'
import { FlashSellManager, FlashSellParams, validateFlashSellParams } from '../workers/flash-sell-manager'
import { ExtendedDatabase } from '../database-extended'

// 创建闪电卖出管理器实例
const flashSellManager = new FlashSellManager(new ExtendedDatabase('meme-master.db'))

/**
 * 注册闪电卖出相关的 IPC 处理器
 */
export function registerFlashSellHandlers(): void {
  /**
   * 创建闪电卖出任务
   */
  ipcMain.handle('flash-sell:create', async (_event, params: FlashSellParams) => {
    try {
      // 验证参数
      const validation = validateFlashSellParams(params)
      if (!validation.valid) {
        throw new Error(validation.error || '参数验证失败')
      }

      // 创建任务
      const result = flashSellManager.createFlashSellTask(params)

      return {
        success: true,
        taskId: result.taskId
      }
    } catch (error) {
      console.error('创建闪电卖出任务失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  /**
   * 启动闪电卖出任务
   */
  ipcMain.handle('flash-sell:start', async (_event, taskId: string, params: FlashSellParams) => {
    try {
      // 验证参数
      const validation = validateFlashSellParams(params)
      if (!validation.valid) {
        throw new Error(validation.error || '参数验证失败')
      }

      // 启动任务
      await flashSellManager.startFlashSellTask(taskId, params)

      return {
        success: true,
        taskId
      }
    } catch (error) {
      console.error('启动闪电卖出任务失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  /**
   * 取消闪电卖出任务
   */
  ipcMain.handle('flash-sell:cancel', async (_event, taskId: string) => {
    try {
      const result = flashSellManager.cancelTask(taskId)

      return {
        success: true,
        taskId: result.taskId
      }
    } catch (error) {
      console.error('取消闪电卖出任务失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  /**
   * 获取闪电卖出任务状态
   */
  ipcMain.handle('flash-sell:get-status', async (_event, taskId: string) => {
    try {
      const status = flashSellManager.getTaskStatus(taskId)

      if (!status) {
        return {
          success: false,
          error: '任务不存在'
        }
      }

      return {
        success: true,
        task: status
      }
    } catch (error) {
      console.error('获取闪电卖出任务状态失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  /**
   * 获取所有闪电卖出任务
   */
  ipcMain.handle('flash-sell:get-all', async () => {
    try {
      const tasks = flashSellManager.getAllTasks()

      return {
        success: true,
        tasks
      }
    } catch (error) {
      console.error('获取闪电卖出任务列表失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  /**
   * 估算闪电卖出收益
   */
  ipcMain.handle('flash-sell:estimate-profit', async (_event, params: {
    tokenPrice: number
    sellAmount: string
    sellStrategy: 'all' | 'batch'
    batches?: Array<{ time: number; ratio: number }>
  }) => {
    try {
      const { estimateProfit } = require('../workers/flash-sell-manager')
      const result = estimateProfit(params.tokenPrice, params.sellAmount, params.sellStrategy, params.batches)

      return {
        success: true,
        profit: result
      }
    } catch (error) {
      console.error('估算闪电卖出收益失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  /**
   * 监听闪电卖出任务事件
   * 将管理器的事件转发到渲染进程
   */
  flashSellManager.on('flash-sell:started', (data) => {
    // 这里可以发送到所有窗口
    console.log('闪电卖出任务已启动:', data)
  })

  flashSellManager.on('flash-sell:completed', (data) => {
    console.log('闪电卖出任务已完成:', data)
  })

  flashSellManager.on('flash-sell:batch-completed', (data) => {
    console.log('分批卖出已完成:', data)
  })

  flashSellManager.on('flash-sell:sell-completed', (data) => {
    console.log('卖出操作已完成:', data)
  })

  console.log('闪电卖出 IPC 处理器已注册')
}

/**
 * 导出闪电卖出管理器实例（供其他模块使用）
 */
export { flashSellManager }
