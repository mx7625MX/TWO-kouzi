/**
 * 收益分析 IPC 处理器
 * 提供主进程与渲染进程之间的通信接口
 */

import { ipcMain } from 'electron'
import { profitAnalyzer } from '../workers/profit-analyzer'

/**
 * 注册所有收益分析相关的 IPC 处理器
 */
export function registerProfitHandlers(): void {
  console.log('注册收益分析 IPC 处理器...')

  // ==================== 收益计算 ====================

  /**
   * 计算收益
   * 通道: profit:calculate
   */
  ipcMain.handle('profit:calculate', async (_event, params: {
    buyPrice: string
    sellPrice: string
    amount: string
  }) => {
    try {
      const result = profitAnalyzer.calculateProfit(params)
      return { success: true, ...result }
    } catch (error: any) {
      console.error('计算收益失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 创建收益记录
   * 通道: profit:create-record
   */
  ipcMain.handle('profit:create-record', async (_event, params: {
    tokenAddress: string
    network: 'bsc' | 'solana'
    walletId?: string
    buyPrice: string
    sellPrice: string
    amount: string
    buyTxHash?: string
    sellTxHash?: string
    buyTime: number
    sellTime: number
    status?: string
  }) => {
    try {
      const result = profitAnalyzer.createProfitRecord(params)
      return result
    } catch (error: any) {
      console.error('创建收益记录失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ==================== 数据查询 ====================

  /**
   * 获取收益记录
   * 通道: profit:get-records
   */
  ipcMain.handle('profit:get-records', async (_event, params?: {
    tokenAddress?: string
    network?: 'bsc' | 'solana'
    walletId?: string
    status?: string
    timeRange?: { start: number; end: number }
    limit?: number
    offset?: number
  }) => {
    try {
      const result = profitAnalyzer.getProfitRecords(params)
      return result
    } catch (error: any) {
      console.error('获取收益记录失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取收益汇总
   * 通道: profit:get-summary
   */
  ipcMain.handle('profit:get-summary', async (_event, params?: {
    tokenAddress?: string
    network?: 'bsc' | 'solana'
    walletId?: string
    timeRange?: { start: number; end: number }
  }) => {
    try {
      const result = profitAnalyzer.getProfitSummary(params)
      return result
    } catch (error: any) {
      console.error('获取收益汇总失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 获取收益趋势
   * 通道: profit:get-trends
   */
  ipcMain.handle(
    'profit:get-trends',
    async (_event, params: {
      tokenAddress?: string
      network?: 'bsc' | 'solana'
      timeRange: { start: number; end: number }
      groupBy?: 'day' | 'week' | 'month'
    }) => {
      try {
        const result = profitAnalyzer.getProfitTrends(params)
        return result
      } catch (error: any) {
        console.error('获取收益趋势失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  /**
   * 获取排行榜
   * 通道: profit:get-rankings
   */
  ipcMain.handle(
    'profit:get-rankings',
    async (_event, params: {
      type: 'token' | 'wallet'
      limit?: number
      orderBy?: 'profit' | 'profitPercentage' | 'tradeCount' | 'winRate'
      order?: 'ASC' | 'DESC'
      timeRange?: { start: number; end: number }
    }) => {
      try {
        const result = profitAnalyzer.getRankings(params)
        return result
      } catch (error: any) {
        console.error('获取排行榜失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  // ==================== 数据管理 ====================

  /**
   * 删除收益记录
   * 通道: profit:delete-record
   */
  ipcMain.handle('profit:delete-record', async (_event, recordId: string) => {
    try {
      const result = profitAnalyzer.deleteProfitRecord(recordId)
      return result
    } catch (error: any) {
      console.error('删除收益记录失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 清理旧数据
   * 通道: profit:cleanup
   */
  ipcMain.handle('profit:cleanup', async (_event, daysToKeep?: number) => {
    try {
      const result = profitAnalyzer.cleanupOldData(daysToKeep)
      return result
    } catch (error: any) {
      console.error('清理旧数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('收益分析 IPC 处理器注册完成')
}

/**
 * 取消注册所有处理器
 */
export function unregisterProfitHandlers(): void {
  console.log('取消注册收益分析 IPC 处理器...')

  const channels = [
    'profit:calculate',
    'profit:create-record',
    'profit:get-records',
    'profit:get-summary',
    'profit:get-trends',
    'profit:get-rankings',
    'profit:delete-record',
    'profit:cleanup'
  ]

  channels.forEach(channel => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('收益分析 IPC 处理器取消注册完成')
}
