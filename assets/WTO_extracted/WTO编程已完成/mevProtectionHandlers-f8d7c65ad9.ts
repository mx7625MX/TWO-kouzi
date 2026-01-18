/**
 * MEV防护IPC处理器
 * 处理MEV防护相关的所有IPC通信
 */

import { ipcMain } from 'electron'
import { MEVProtectionEngine } from '../workers/mev-protection-engine'

// 创建MEV防护引擎实例
let mevEngine: MEVProtectionEngine | null = null

/**
 * 初始化MEV防护IPC处理器
 */
export function initMEVProtectionHandlers() {
  console.log('初始化MEV防护IPC处理器...')

  // 获取MEV防护状态
  ipcMain.handle('mev-protection:get-status', async () => {
    try {
      if (!mevEngine) {
        mevEngine = new MEVProtectionEngine()
      }

      const status = await mevEngine.getStatus()
      return {
        success: true,
        data: status
      }
    } catch (error) {
      console.error('获取MEV防护状态失败:', error)
      return {
        success: false,
        error: '获取MEV防护状态失败'
      }
    }
  })

  // 启动MEV防护
  ipcMain.handle('mev-protection:start', async () => {
    try {
      if (!mevEngine) {
        mevEngine = new MEVProtectionEngine()
      }

      await mevEngine.start()
      return {
        success: true,
        data: { message: 'MEV防护已启动' }
      }
    } catch (error) {
      console.error('启动MEV防护失败:', error)
      return {
        success: false,
        error: '启动MEV防护失败'
      }
    }
  })

  // 停止MEV防护
  ipcMain.handle('mev-protection:stop', async () => {
    try {
      if (mevEngine) {
        await mevEngine.stop()
      }

      return {
        success: true,
        data: { message: 'MEV防护已停止' }
      }
    } catch (error) {
      console.error('停止MEV防护失败:', error)
      return {
        success: false,
        error: '停止MEV防护失败'
      }
    }
  })

  // 获取防护统计
  ipcMain.handle('mev-protection:get-statistics', async () => {
    try {
      if (!mevEngine) {
        return {
          success: false,
          error: 'MEV防护引擎未初始化'
        }
      }

      const stats = await mevEngine.getStatistics()
      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('获取防护统计失败:', error)
      return {
        success: false,
        error: '获取防护统计失败'
      }
    }
  })

  // 获取交易防护历史
  ipcMain.handle('mev-protection:get-transaction-history', async (_event, options?: {
    limit?: number
    offset?: number
  }) => {
    try {
      if (!mevEngine) {
        return {
          success: false,
          error: 'MEV防护引擎未初始化'
        }
      }

      const { limit = 50, offset = 0 } = options || {}
      const history = await mevEngine.getTransactionHistory(limit, offset)

      return {
        success: true,
        data: history
      }
    } catch (error) {
      console.error('获取交易防护历史失败:', error)
      return {
        success: false,
        error: '获取交易防护历史失败'
      }
    }
  })

  // 获取攻击统计
  ipcMain.handle('mev-protection:get-attack-statistics', async (_event, options?: {
    days?: number
  }) => {
    try {
      if (!mevEngine) {
        return {
          success: false,
          error: 'MEV防护引擎未初始化'
        }
      }

      const { days = 7 } = options || {}
      const stats = await mevEngine.getAttackStatistics(days)

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('获取攻击统计失败:', error)
      return {
        success: false,
        error: '获取攻击统计失败'
      }
    }
  })

  // 获取风险评分
  ipcMain.handle('mev-protection:get-risk-score', async () => {
    try {
      if (!mevEngine) {
        return {
          success: false,
          error: 'MEV防护引擎未初始化'
        }
      }

      const riskScore = await mevEngine.getRiskScore()

      return {
        success: true,
        data: riskScore
      }
    } catch (error) {
      console.error('获取风险评分失败:', error)
      return {
        success: false,
        error: '获取风险评分失败'
      }
    }
  })

  // 配置Flashbots
  ipcMain.handle('mev-protection:configure-flashbots', async (_event, config: {
    enabled: boolean
    apiKey?: string
    network?: string
  }) => {
    try {
      if (!mevEngine) {
        mevEngine = new MEVProtectionEngine()
      }

      await mevEngine.configureFlashbots(config)

      return {
        success: true,
        data: { message: 'Flashbots配置已更新' }
      }
    } catch (error) {
      console.error('配置Flashbots失败:', error)
      return {
        success: false,
        error: '配置Flashbots失败'
      }
    }
  })

  // 配置Jito
  ipcMain.handle('mev-protection:configure-jito', async (_event, config: {
    enabled: boolean
    apiKey?: string
    endpoint?: string
  }) => {
    try {
      if (!mevEngine) {
        mevEngine = new MEVProtectionEngine()
      }

      await mevEngine.configureJito(config)

      return {
        success: true,
        data: { message: 'Jito配置已更新' }
      }
    } catch (error) {
      console.error('配置Jito失败:', error)
      return {
        success: false,
        error: '配置Jito失败'
      }
    }
  })

  // 设置风险阈值
  ipcMain.handle('mev-protection:set-risk-threshold', async (_event, threshold: {
    level: 'low' | 'medium' | 'high'
    minGasPrice?: number
    maxSlippage?: number
    maxPriorityFee?: number
  }) => {
    try {
      if (!mevEngine) {
        mevEngine = new MEVProtectionEngine()
      }

      await mevEngine.setRiskThreshold(threshold)

      return {
        success: true,
        data: { message: '风险阈值已设置' }
      }
    } catch (error) {
      console.error('设置风险阈值失败:', error)
      return {
        success: false,
        error: '设置风险阈值失败'
      }
    }
  })

  // 配置Gas策略
  ipcMain.handle('mev-protection:set-gas-strategy', async (_event, strategy: {
    type: 'conservative' | 'moderate' | 'aggressive'
    maxGasPrice?: number
    priorityFee?: number
    tipStrategy?: 'fixed' | 'dynamic'
    tipAmount?: number
  }) => {
    try {
      if (!mevEngine) {
        mevEngine = new MEVProtectionEngine()
      }

      await mevEngine.setGasStrategy(strategy)

      return {
        success: true,
        data: { message: 'Gas策略已设置' }
      }
    } catch (error) {
      console.error('设置Gas策略失败:', error)
      return {
        success: false,
        error: '设置Gas策略失败'
      }
    }
  })

  // 获取引擎连接状态
  ipcMain.handle('mev-protection:get-connection-status', async () => {
    try {
      if (!mevEngine) {
        return {
          success: false,
          error: 'MEV防护引擎未初始化'
        }
      }

      const status = await mevEngine.getConnectionStatus()

      return {
        success: true,
        data: status
      }
    } catch (error) {
      console.error('获取连接状态失败:', error)
      return {
        success: false,
        error: '获取连接状态失败'
      }
    }
  })

  // 清理资源
  ipcMain.handle('mev-protection:cleanup', async () => {
    try {
      if (mevEngine) {
        await mevEngine.stop()
        mevEngine = null
      }

      return {
        success: true,
        data: { message: 'MEV防护资源已清理' }
      }
    } catch (error) {
      console.error('清理资源失败:', error)
      return {
        success: false,
        error: '清理资源失败'
      }
    }
  })

  console.log('MEV防护IPC处理器初始化完成')
}
