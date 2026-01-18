/**
 * 热点监控模块的IPC通信处理器
 * 提供热点监控的完整IPC接口
 */

import { ipcMain } from 'electron'
import { hotspotMonitor } from '../workers/hotspot-monitor'
import { logger } from '../utils/errorHandler'
import type {
  Hotspot,
  HotspotMonitorConfig,
  HotspotAnalysisReport,
  HotspotAlert,
  HotspotPriority
} from '../../../shared/types'

// ============== IPC处理器注册 ==============

export function registerHotspotHandlers(): void {
  // 配置管理
  registerConfigHandlers()
  
  // 监控控制
  registerMonitoringHandlers()
  
  // 热点查询
  registerHotspotQueryHandlers()
  
  // 热点分析
  registerAnalysisHandlers()
  
  // 警报管理
  registerAlertHandlers()
  
  // 自动交易
  registerAutoTradeHandlers()
  
  logger.info('HotspotIPC', '热点监控IPC处理器已注册')
}

// ============== 配置管理处理器 ==============

function registerConfigHandlers(): void {
  /**
   * 获取热点监控配置
   */
  ipcMain.handle('hotspot:get-config', async () => {
    try {
      const config = hotspotMonitor.getConfig()
      return { success: true, data: config }
    } catch (error) {
      logger.error('HotspotIPC', '获取配置失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 更新热点监控配置
   */
  ipcMain.handle('hotspot:update-config', async (_event, partialConfig: Partial<HotspotMonitorConfig>) => {
    try {
      hotspotMonitor.updateConfig(partialConfig)
      logger.info('HotspotIPC', '配置已更新')
      return { success: true }
    } catch (error) {
      logger.error('HotspotIPC', '更新配置失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 重置热点监控配置
   */
  ipcMain.handle('hotspot:reset-config', async () => {
    try {
      hotspotMonitor.resetConfig()
      logger.info('HotspotIPC', '配置已重置')
      return { success: true }
    } catch (error) {
      logger.error('HotspotIPC', '重置配置失败', error)
      return { success: false, error: String(error) }
    }
  })
}

// ============== 监控控制处理器 ==============

function registerMonitoringHandlers(): void {
  /**
   * 开始热点监控
   */
  ipcMain.handle('hotspot:start-monitoring', async () => {
    try {
      const result = hotspotMonitor.startMonitoring()
      logger.info('HotspotIPC', '热点监控已启动')
      return { success: true, data: result }
    } catch (error) {
      logger.error('HotspotIPC', '启动监控失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 停止热点监控
   */
  ipcMain.handle('hotspot:stop-monitoring', async () => {
    try {
      const result = hotspotMonitor.stopMonitoring()
      logger.info('HotspotIPC', '热点监控已停止')
      return { success: true, data: result }
    } catch (error) {
      logger.error('HotspotIPC', '停止监控失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 检查是否正在监控
   */
  ipcMain.handle('hotspot:is-monitoring', async () => {
    try {
      const isMonitoring = hotspotMonitor.isRunning()
      return { success: true, data: isMonitoring }
    } catch (error) {
      logger.error('HotspotIPC', '检查监控状态失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 获取监控统计信息
   */
  ipcMain.handle('hotspot:get-stats', async () => {
    try {
      const stats = hotspotMonitor.getStats()
      return { success: true, data: stats }
    } catch (error) {
      logger.error('HotspotIPC', '获取统计信息失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 清理过期热点
   */
  ipcMain.handle('hotspot:cleanup-expired', async (_event, maxAge?: number) => {
    try {
      hotspotMonitor.cleanupExpiredHotspots(maxAge)
      logger.info('HotspotIPC', '已清理过期热点')
      return { success: true }
    } catch (error) {
      logger.error('HotspotIPC', '清理过期热点失败', error)
      return { success: false, error: String(error) }
    }
  })
}

// ============== 热点查询处理器 ==============

function registerHotspotQueryHandlers(): void {
  /**
   * 获取所有热点
   */
  ipcMain.handle('hotspot:get-hotspots', async (_event, filters?: { priority?: HotspotPriority, status?: any }) => {
    try {
      const hotspots = hotspotMonitor.getHotspots(filters)
      return { success: true, data: hotspots }
    } catch (error) {
      logger.error('HotspotIPC', '获取热点列表失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 获取单个热点
   */
  ipcMain.handle('hotspot:get-hotspot', async (_event, id: string) => {
    try {
      const hotspot = hotspotMonitor.getHotspot(id)
      return { success: true, data: hotspot }
    } catch (error) {
      logger.error('HotspotIPC', '获取热点详情失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 获取热门热点
   */
  ipcMain.handle('hotspot:get-trending', async (_event, limit?: number) => {
    try {
      const trending = hotspotMonitor.getTrendingHotspots(limit)
      return { success: true, data: trending }
    } catch (error) {
      logger.error('HotspotIPC', '获取热门热点失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 搜索热点
   */
  ipcMain.handle('hotspot:search', async (_event, keyword: string, limit?: number) => {
    try {
      const hotspots = hotspotMonitor.getHotspots()
      
      const results = hotspots
        .filter(h => {
          // 搜索关键词匹配
          const matchSocial = h.socialData?.keyword?.toLowerCase().includes(keyword.toLowerCase())
          const matchOnchain = h.onchainData?.tokenSymbol?.toLowerCase().includes(keyword.toLowerCase())
          const matchDex = h.dexData?.token1.symbol?.toLowerCase().includes(keyword.toLowerCase())
          
          return matchSocial || matchOnchain || matchDex
        })
        .slice(0, limit || 10)
      
      return { success: true, data: results }
    } catch (error) {
      logger.error('HotspotIPC', '搜索热点失败', error)
      return { success: false, error: String(error) }
    }
  })
}

// ============== 热点分析处理器 ==============

function registerAnalysisHandlers(): void {
  /**
   * 分析热点
   */
  ipcMain.handle('hotspot:analyze', async (_event, id: string) => {
    try {
      const report = await hotspotMonitor.analyzeHotspot(id)
      logger.info('HotspotIPC', `热点分析完成: ${id}`)
      return { success: true, data: report }
    } catch (error) {
      logger.error('HotspotIPC', '分析热点失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 生成热点报告
   */
  ipcMain.handle('hotspot:generate-report', async (_event, id: string) => {
    try {
      const report = await hotspotMonitor.generateReport(id)
      logger.info('HotspotIPC', `热点报告已生成: ${id}`)
      return { success: true, data: report }
    } catch (error) {
      logger.error('HotspotIPC', '生成报告失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 批量分析热点
   */
  ipcMain.handle('hotspot:analyze-batch', async (_event, ids: string[]) => {
    try {
      const reports: HotspotAnalysisReport[] = []
      
      for (const id of ids) {
        const report = await hotspotMonitor.analyzeHotspot(id)
        if (report) {
          reports.push(report)
        }
      }
      
      logger.info('HotspotIPC', `批量分析完成: ${reports.length} 个热点`)
      return { success: true, data: reports }
    } catch (error) {
      logger.error('HotspotIPC', '批量分析失败', error)
      return { success: false, error: String(error) }
    }
  })
}

// ============== 警报管理处理器 ==============

function registerAlertHandlers(): void {
  /**
   * 获取所有警报
   */
  ipcMain.handle('hotspot:get-alerts', async (_event, limit?: number) => {
    try {
      const alerts = hotspotMonitor.getAlerts(limit)
      return { success: true, data: alerts }
    } catch (error) {
      logger.error('HotspotIPC', '获取警报列表失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 确认警报
   */
  ipcMain.handle('hotspot:acknowledge-alert', async (_event, id: string) => {
    try {
      const result = hotspotMonitor.acknowledgeAlert(id)
      logger.info('HotspotIPC', `警报已确认: ${id}`)
      return { success: true, data: result }
    } catch (error) {
      logger.error('HotspotIPC', '确认警报失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 清除已确认的警报
   */
  ipcMain.handle('hotspot:clear-acknowledged-alerts', async () => {
    try {
      hotspotMonitor.clearAcknowledgedAlerts()
      logger.info('HotspotIPC', '已清除已确认的警报')
      return { success: true }
    } catch (error) {
      logger.error('HotspotIPC', '清除警报失败', error)
      return { success: false, error: String(error) }
    }
  })
}

// ============== 自动交易处理器 ==============

function registerAutoTradeHandlers(): void {
  /**
   * 启用自动交易
   */
  ipcMain.handle('hotspot:enable-auto-trade', async (_event, settings: { maxAmount: string, minPriority: HotspotPriority }) => {
    try {
      const result = hotspotMonitor.enableAutoTrade(settings)
      logger.info('HotspotIPC', '自动交易已启用', { settings })
      return { success: true, data: result }
    } catch (error) {
      logger.error('HotspotIPC', '启用自动交易失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 禁用自动交易
   */
  ipcMain.handle('hotspot:disable-auto-trade', async () => {
    try {
      const result = hotspotMonitor.disableAutoTrade()
      logger.info('HotspotIPC', '自动交易已禁用')
      return { success: true, data: result }
    } catch (error) {
      logger.error('HotspotIPC', '禁用自动交易失败', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * 检查自动交易状态
   */
  ipcMain.handle('hotspot:auto-trade-status', async () => {
    try {
      const status = hotspotMonitor.getAutoTradeStatus()
      return { success: true, data: status }
    } catch (error) {
      logger.error('HotspotIPC', '获取自动交易状态失败', error)
      return { success: false, error: String(error) }
    }
  })
}

// ============== 卸载处理器 ==============

export function unregisterHotspotHandlers(): void {
  // 配置管理
  ipcMain.removeHandler('hotspot:get-config')
  ipcMain.removeHandler('hotspot:update-config')
  ipcMain.removeHandler('hotspot:reset-config')
  
  // 监控控制
  ipcMain.removeHandler('hotspot:start-monitoring')
  ipcMain.removeHandler('hotspot:stop-monitoring')
  ipcMain.removeHandler('hotspot:is-monitoring')
  ipcMain.removeHandler('hotspot:get-stats')
  ipcMain.removeHandler('hotspot:cleanup-expired')
  
  // 热点查询
  ipcMain.removeHandler('hotspot:get-hotspots')
  ipcMain.removeHandler('hotspot:get-hotspot')
  ipcMain.removeHandler('hotspot:get-trending')
  ipcMain.removeHandler('hotspot:search')
  
  // 热点分析
  ipcMain.removeHandler('hotspot:analyze')
  ipcMain.removeHandler('hotspot:generate-report')
  ipcMain.removeHandler('hotspot:analyze-batch')
  
  // 警报管理
  ipcMain.removeHandler('hotspot:get-alerts')
  ipcMain.removeHandler('hotspot:acknowledge-alert')
  ipcMain.removeHandler('hotspot:clear-acknowledged-alerts')
  
  // 自动交易
  ipcMain.removeHandler('hotspot:enable-auto-trade')
  ipcMain.removeHandler('hotspot:disable-auto-trade')
  ipcMain.removeHandler('hotspot:auto-trade-status')
  
  logger.info('HotspotIPC', '热点监控IPC处理器已注销')
}
