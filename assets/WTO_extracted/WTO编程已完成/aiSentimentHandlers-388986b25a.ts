/**
 * AI情绪分析IPC处理器
 * 处理AI情绪分析相关的所有IPC通信
 */

import { ipcMain } from 'electron'
import { AISentimentEngine } from '../workers/ai-sentiment-engine'

// 创建AI情绪引擎实例
let sentimentEngine: AISentimentEngine | null = null

/**
 * 初始化AI情绪分析IPC处理器
 */
export function initAISentimentHandlers() {
  console.log('初始化AI情绪分析IPC处理器...')

  // 获取AI情绪分析状态
  ipcMain.handle('ai-sentiment:get-status', async () => {
    try {
      if (!sentimentEngine) {
        sentimentEngine = new AISentimentEngine()
      }

      const status = await sentimentEngine.getStatus()
      return {
        success: true,
        data: status
      }
    } catch (error) {
      console.error('获取AI情绪分析状态失败:', error)
      return {
        success: false,
        error: '获取AI情绪分析状态失败'
      }
    }
  })

  // 启动AI情绪分析
  ipcMain.handle('ai-sentiment:start', async () => {
    try {
      if (!sentimentEngine) {
        sentimentEngine = new AISentimentEngine()
      }

      await sentimentEngine.start()
      return {
        success: true,
        data: { message: 'AI情绪分析已启动' }
      }
    } catch (error) {
      console.error('启动AI情绪分析失败:', error)
      return {
        success: false,
        error: '启动AI情绪分析失败'
      }
    }
  })

  // 停止AI情绪分析
  ipcMain.handle('ai-sentiment:stop', async () => {
    try {
      if (sentimentEngine) {
        await sentimentEngine.stop()
      }

      return {
        success: true,
        data: { message: 'AI情绪分析已停止' }
      }
    } catch (error) {
      console.error('停止AI情绪分析失败:', error)
      return {
        success: false,
        error: '停止AI情绪分析失败'
      }
    }
  })

  // 获取情绪概览
  ipcMain.handle('ai-sentiment:get-overview', async () => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const overview = await sentimentEngine.getOverview()
      return {
        success: true,
        data: overview
      }
    } catch (error) {
      console.error('获取情绪概览失败:', error)
      return {
        success: false,
        error: '获取情绪概览失败'
      }
    }
  })

  // 获取热点情感分析
  ipcMain.handle('ai-sentiment:get-hotspot-sentiment', async (_event, options?: {
    limit?: number
    sortBy?: 'interest' | 'sentiment' | 'timestamp'
  }) => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const { limit = 50, sortBy = 'interest' } = options || {}
      const hotspots = await sentimentEngine.getHotspotSentiment(limit, sortBy)

      return {
        success: true,
        data: hotspots
      }
    } catch (error) {
      console.error('获取热点情感分析失败:', error)
      return {
        success: false,
        error: '获取热点情感分析失败'
      }
    }
  })

  // 获取情绪分布
  ipcMain.handle('ai-sentiment:get-sentiment-distribution', async () => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const distribution = await sentimentEngine.getSentimentDistribution()
      return {
        success: true,
        data: distribution
      }
    } catch (error) {
      console.error('获取情绪分布失败:', error)
      return {
        success: false,
        error: '获取情绪分布失败'
      }
    }
  })

  // 获取多源数据对比
  ipcMain.handle('ai-sentiment:get-source-comparison', async (_event, options?: {
    days?: number
  }) => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const { days = 7 } = options || {}
      const comparison = await sentimentEngine.getSourceComparison(days)

      return {
        success: true,
        data: comparison
      }
    } catch (error) {
      console.error('获取多源数据对比失败:', error)
      return {
        success: false,
        error: '获取多源数据对比失败'
      }
    }
  })

  // 获取情绪预测
  ipcMain.handle('ai-sentiment:get-prediction', async (_event, options?: {
    hours?: number
  }) => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const { hours = 24 } = options || {}
      const prediction = await sentimentEngine.getPrediction(hours)

      return {
        success: true,
        data: prediction
      }
    } catch (error) {
      console.error('获取情绪预测失败:', error)
      return {
        success: false,
        error: '获取情绪预测失败'
      }
    }
  })

  // 分析特定热点
  ipcMain.handle('ai-sentiment:analyze-hotspot', async (_event, data: {
    hotspotId: string
    network?: 'BSC' | 'Solana'
  }) => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const result = await sentimentEngine.analyzeHotspot(data.hotspotId, data.network)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('分析热点失败:', error)
      return {
        success: false,
        error: '分析热点失败'
      }
    }
  })

  // 获取虚假热点列表
  ipcMain.handle('ai-sentiment:get-fake-hotspots', async () => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const fakeHotspots = await sentimentEngine.getFakeHotspots()

      return {
        success: true,
        data: fakeHotspots
      }
    } catch (error) {
      console.error('获取虚假热点列表失败:', error)
      return {
        success: false,
        error: '获取虚假热点列表失败'
      }
    }
  })

  // 获取情绪趋势
  ipcMain.handle('ai-sentiment:get-trend', async (_event, options?: {
    hours?: number
  }) => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const { hours = 24 } = options || {}
      const trend = await sentimentEngine.getTrend(hours)

      return {
        success: true,
        data: trend
      }
    } catch (error) {
      console.error('获取情绪趋势失败:', error)
      return {
        success: false,
        error: '获取情绪趋势失败'
      }
    }
  })

  // 配置数据源
  ipcMain.handle('ai-sentiment:configure-sources', async (_event, config: {
    twitter?: { enabled: boolean; apiKey?: string }
    news?: { enabled: boolean; sources?: string[] }
    onsite?: { enabled: boolean }
    dex?: { enabled: boolean }
  }) => {
    try {
      if (!sentimentEngine) {
        sentimentEngine = new AISentimentEngine()
      }

      await sentimentEngine.configureSources(config)

      return {
        success: true,
        data: { message: '数据源配置已更新' }
      }
    } catch (error) {
      console.error('配置数据源失败:', error)
      return {
        success: false,
        error: '配置数据源失败'
      }
    }
  })

  // 设置情绪阈值
  ipcMain.handle('ai-sentiment:set-thresholds', async (_event, thresholds: {
    bullish?: number
    bearish?: number
    fakeHotspot?: number
  }) => {
    try {
      if (!sentimentEngine) {
        sentimentEngine = new AISentimentEngine()
      }

      await sentimentEngine.setThresholds(thresholds)

      return {
        success: true,
        data: { message: '情绪阈值已设置' }
      }
    } catch (error) {
      console.error('设置情绪阈值失败:', error)
      return {
        success: false,
        error: '设置情绪阈值失败'
      }
    }
  })

  // 设置预警配置
  ipcMain.handle('ai-sentiment:set-alert-config', async (_event, config: {
    enabled: boolean
    sentimentChange?: number
    fakeHotspotAlert?: boolean
  }) => {
    try {
      if (!sentimentEngine) {
        sentimentEngine = new AISentimentEngine()
      }

      await sentimentEngine.setAlertConfig(config)

      return {
        success: true,
        data: { message: '预警配置已更新' }
      }
    } catch (error) {
      console.error('设置预警配置失败:', error)
      return {
        success: false,
        error: '设置预警配置失败'
      }
    }
  })

  // 获取历史情绪数据
  ipcMain.handle('ai-sentiment:get-history', async (_event, options?: {
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    try {
      if (!sentimentEngine) {
        return {
          success: false,
          error: 'AI情绪引擎未初始化'
        }
      }

      const { startDate, endDate, limit = 100 } = options || {}
      const history = await sentimentEngine.getHistory({ startDate, endDate, limit })

      return {
        success: true,
        data: history
      }
    } catch (error) {
      console.error('获取历史情绪数据失败:', error)
      return {
        success: false,
        error: '获取历史情绪数据失败'
      }
    }
  })

  // 清理资源
  ipcMain.handle('ai-sentiment:cleanup', async () => {
    try {
      if (sentimentEngine) {
        await sentimentEngine.stop()
        sentimentEngine = null
      }

      return {
        success: true,
        data: { message: 'AI情绪引擎资源已清理' }
      }
    } catch (error) {
      console.error('清理资源失败:', error)
      return {
        success: false,
        error: '清理资源失败'
      }
    }
  })

  console.log('AI情绪分析IPC处理器初始化完成')
}
