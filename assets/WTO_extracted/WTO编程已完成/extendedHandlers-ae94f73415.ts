/**
 * IPC通信扩展
 * 扩展原有IPC处理器，增加系统状态、配置管理和错误处理功能
 */

import { ipcMain } from 'electron'
import { configManager } from '../utils/configManager'
import { logger, errorHandler, LogLevel } from '../utils/errorHandler'

// ============== IPC处理器注册 ==============

export function registerExtendedHandlers(): void {
  registerSystemHandlers()
  registerConfigHandlers()
  registerErrorHandlers()
}

// ============== 系统状态处理器 ==============

function registerSystemHandlers(): void {
  /**
   * 获取系统状态
   */
  ipcMain.handle('system:get-status', async () => {
    try {
      return {
        status: 'online',
        timestamp: Date.now(),
        version: '2.0.0',
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
      }
    } catch (error) {
      logger.error('System', '获取系统状态失败', error)
      throw error
    }
  })

  /**
   * 获取系统信息
   */
  ipcMain.handle('system:get-info', async () => {
    try {
      const os = require('os')
      
      return {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus(),
        uptime: os.uptime(),
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome
      }
    } catch (error) {
      logger.error('System', '获取系统信息失败', error)
      throw error
    }
  })

  /**
   * 获取应用统计
   */
  ipcMain.handle('system:get-stats', async () => {
    try {
      // 获取各模块的统计数据
      const walletCount = await ipcMain.invoke('wallet:list')
      const tasks = await ipcMain.invoke('launch:get-tasks')
      const profitData = await ipcMain.invoke('profit:get-summary')
      
      return {
        walletCount: walletCount?.length || 0,
        activeTasks: tasks?.filter((t: any) => 
          t.status === 'pending' || t.status === 'running'
        ).length || 0,
        totalTasks: tasks?.length || 0,
        totalProfit: profitData?.totalProfit || '0',
        successRate: profitData?.successRate || 0
      }
    } catch (error) {
      logger.error('System', '获取应用统计失败', error)
      return {
        walletCount: 0,
        activeTasks: 0,
        totalTasks: 0,
        totalProfit: '0',
        successRate: 0
      }
    }
  })
}

// ============== 配置管理处理器 ==============

function registerConfigHandlers(): void {
  /**
   * 获取应用配置
   */
  ipcMain.handle('config:get', async () => {
    try {
      return configManager.getConfig()
    } catch (error) {
      logger.error('Config', '获取配置失败', error)
      throw error
    }
  })

  /**
   * 更新应用配置
   */
  ipcMain.handle('config:update', async (_event, config: any) => {
    try {
      configManager.updateConfig(config)
      logger.info('Config', '配置已更新', config)
      return { success: true }
    } catch (error) {
      logger.error('Config', '更新配置失败', error)
      throw error
    }
  })

  /**
   * 重置配置
   */
  ipcMain.handle('config:reset', async () => {
    try {
      configManager.resetConfig()
      logger.info('Config', '配置已重置为默认值')
      return { success: true }
    } catch (error) {
      logger.error('Config', '重置配置失败', error)
      throw error
    }
  })

  /**
   * 获取用户设置
   */
  ipcMain.handle('settings:get', async () => {
    try {
      return configManager.getSettings()
    } catch (error) {
      logger.error('Settings', '获取设置失败', error)
      throw error
    }
  })

  /**
   * 更新用户设置
   */
  ipcMain.handle('settings:update', async (_event, settings: any) => {
    try {
      configManager.updateSettings(settings)
      logger.info('Settings', '设置已更新', settings)
      return { success: true }
    } catch (error) {
      logger.error('Settings', '更新设置失败', error)
      throw error
    }
  })

  /**
   * 重置设置
   */
  ipcMain.handle('settings:reset', async () => {
    try {
      configManager.resetSettings()
      logger.info('Settings', '设置已重置为默认值')
      return { success: true }
    } catch (error) {
      logger.error('Settings', '重置设置失败', error)
      throw error
    }
  })

  /**
   * 获取RPC地址
   */
  ipcMain.handle('config:get-rpc', async (_event, network: string, chain: string = 'mainnet') => {
    try {
      return configManager.getRPC(network as 'bsc' | 'solana', chain as 'mainnet' | 'testnet')
    } catch (error) {
      logger.error('Config', '获取RPC地址失败', error)
      throw error
    }
  })

  /**
   * 获取DEX地址
   */
  ipcMain.handle('config:get-dex', async (_event, network: string, dex: string, key: string) => {
    try {
      return configManager.getDEXAddress(network as 'bsc' | 'solana', dex, key)
    } catch (error) {
      logger.error('Config', '获取DEX地址失败', error)
      throw error
    }
  })

  /**
   * 获取Gas配置
   */
  ipcMain.handle('config:get-gas', async (_event, network: string) => {
    try {
      return configManager.getGasConfig(network as 'bsc' | 'solana')
    } catch (error) {
      logger.error('Config', '获取Gas配置失败', error)
      throw error
    }
  })
}

// ============== 错误处理处理器 ==============

function registerErrorHandlers(): void {
  /**
   * 获取最近的日志
   */
  ipcMain.handle('logs:get-recent', async (_event, count: number = 100) => {
    try {
      return logger.getRecentLogs(count)
    } catch (error) {
      console.error('获取日志失败:', error)
      return []
    }
  })

  /**
   * 获取最近的错误
   */
  ipcMain.handle('errors:get-recent', async (_event, count: number = 10) => {
    try {
      return errorHandler.getRecentErrors(count)
    } catch (error) {
      console.error('获取错误报告失败:', error)
      return []
    }
  })

  /**
   * 获取错误报告
   */
  ipcMain.handle('errors:get-reports', async (_event, category?: string) => {
    try {
      return errorHandler.getErrorReports(category as any)
    } catch (error) {
      console.error('获取错误报告失败:', error)
      return []
    }
  })

  /**
   * 清除错误报告
   */
  ipcMain.handle('errors:clear', async () => {
    try {
      errorHandler.clearErrorReports()
      return { success: true }
    } catch (error) {
      logger.error('Errors', '清除错误报告失败', error)
      throw error
    }
  })

  /**
   * 记录错误
   */
  ipcMain.handle('errors:report', async (_event, error: any, category: string = 'UNKNOWN', context?: any) => {
    try {
      const errorId = errorHandler.handleError(
        error,
        category as any,
        context
      )
      return { success: true, errorId }
    } catch (err) {
      console.error('记录错误失败:', err)
      throw err
    }
  })

  /**
   * 设置日志级别
   */
  ipcMain.handle('logs:set-level', async (_event, level: string) => {
    try {
      const levelMap: { [key: string]: LogLevel } = {
        'debug': LogLevel.DEBUG,
        'info': LogLevel.INFO,
        'warn': LogLevel.WARN,
        'error': LogLevel.ERROR,
        'fatal': LogLevel.FATAL
      }
      
      const logLevel = levelMap[level.toLowerCase()] || LogLevel.INFO
      logger.setLevel(logLevel)
      logger.info('Logs', `日志级别已设置为: ${LogLevel[logLevel]}`)
      
      return { success: true, level: LogLevel[logLevel] }
    } catch (error) {
      logger.error('Logs', '设置日志级别失败', error)
      throw error
    }
  })
}

// ============== 卸载处理器 ==============

export function unregisterExtendedHandlers(): void {
  // 清理系统状态处理器
  ipcMain.removeHandler('system:get-status')
  ipcMain.removeHandler('system:get-info')
  ipcMain.removeHandler('system:get-stats')
  
  // 清理配置管理处理器
  ipcMain.removeHandler('config:get')
  ipcMain.removeHandler('config:update')
  ipcMain.removeHandler('config:reset')
  ipcMain.removeHandler('settings:get')
  ipcMain.removeHandler('settings:update')
  ipcMain.removeHandler('settings:reset')
  ipcMain.removeHandler('config:get-rpc')
  ipcMain.removeHandler('config:get-dex')
  ipcMain.removeHandler('config:get-gas')
  
  // 清理错误处理处理器
  ipcMain.removeHandler('logs:get-recent')
  ipcMain.removeHandler('errors:get-recent')
  ipcMain.removeHandler('errors:get-reports')
  ipcMain.removeHandler('errors:clear')
  ipcMain.removeHandler('errors:report')
  ipcMain.removeHandler('logs:set-level')
}
