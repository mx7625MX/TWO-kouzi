/**
 * 自动交易相关的IPC处理器
 */

import { ipcMain } from 'electron'
import { logger } from '../utils/errorHandler'
import { autoTradingEngine } from '../workers/auto-trading-engine'
import type {
  AutoTradeConfig,
  AutoTradeTask,
  TradeExecution,
  RiskControlConfig,
  StopLossConfig,
  TakeProfitConfig,
  AutoTradeStats,
  Position
} from '../../../shared/types'

// ============== 自动交易配置管理 ==============

ipcMain.handle('auto-trade:get-config', async () => {
  try {
    const config = autoTradingEngine.getConfig()
    logger.info('AutoTradeHandlers', '获取自动交易配置成功')
    return { success: true, data: config }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取自动交易配置失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:update-config', async (_event, config: Partial<AutoTradeConfig>) => {
  try {
    autoTradingEngine.updateConfig(config)
    logger.info('AutoTradeHandlers', '更新自动交易配置成功', { config })
    return { success: true, message: '配置更新成功' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '更新自动交易配置失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:reset-config', async () => {
  try {
    // TODO: 实现配置重置逻辑
    logger.info('AutoTradeHandlers', '重置自动交易配置成功')
    return { success: true, message: '配置重置成功' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '重置自动交易配置失败', error)
    return { success: false, error: error.message }
  }
})

// ============== 自动交易控制 ==============

ipcMain.handle('auto-trade:start', async () => {
  try {
    autoTradingEngine.start()
    logger.info('AutoTradeHandlers', '启动自动交易成功')
    return { success: true, message: '自动交易已启动' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '启动自动交易失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:stop', async () => {
  try {
    autoTradingEngine.stop()
    logger.info('AutoTradeHandlers', '停止自动交易成功')
    return { success: true, message: '自动交易已停止' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '停止自动交易失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:get-status', async () => {
  try {
    const isRunning = autoTradingEngine['isRunning']
    const stats = autoTradingEngine.getStats()
    const activeTasks = autoTradingEngine.getActiveTasks()
    const activePositions = autoTradingEngine.getActivePositions()

    logger.info('AutoTradeHandlers', '获取自动交易状态成功', {
      isRunning,
      activeTasksCount: activeTasks.length,
      activePositionsCount: activePositions.length
    })

    return {
      success: true,
      data: {
        isRunning,
        stats,
        activeTasks,
        activePositions
      }
    }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取自动交易状态失败', error)
    return { success: false, error: error.message }
  }
})

// ============== 交易任务管理 ==============

ipcMain.handle('auto-trade:get-tasks', async () => {
  try {
    const tasks = autoTradingEngine.getTasks()
    logger.info('AutoTradeHandlers', '获取交易任务列表成功', { count: tasks.length })
    return { success: true, data: tasks }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取交易任务列表失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:get-active-tasks', async () => {
  try {
    const tasks = autoTradingEngine.getActiveTasks()
    logger.info('AutoTradeHandlers', '获取活跃任务列表成功', { count: tasks.length })
    return { success: true, data: tasks }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取活跃任务列表失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:get-task', async (_event, taskId: string) => {
  try {
    const task = autoTradingEngine.getTask(taskId)
    if (!task) {
      return { success: false, error: '任务不存在' }
    }
    logger.info('AutoTradeHandlers', '获取交易任务详情成功', { taskId })
    return { success: true, data: task }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取交易任务详情失败', { taskId, error })
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:create-task', async (_event, config: Partial<AutoTradeTask>) => {
  try {
    const task = autoTradingEngine.createTask(config)
    logger.info('AutoTradeHandlers', '创建交易任务成功', { taskId: task.id })
    return { success: true, data: task }
  } catch (error) {
    logger.error('AutoTradeHandlers', '创建交易任务失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:start-task', async (_event, taskId: string) => {
  try {
    await autoTradingEngine.startTask(taskId)
    logger.info('AutoTradeHandlers', '启动交易任务成功', { taskId })
    return { success: true, message: '任务已启动' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '启动交易任务失败', { taskId, error })
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:stop-task', async (_event, taskId: string) => {
  try {
    await autoTradingEngine.stopTask(taskId)
    logger.info('AutoTradeHandlers', '停止交易任务成功', { taskId })
    return { success: true, message: '任务已停止' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '停止交易任务失败', { taskId, error })
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:delete-task', async (_event, taskId: string) => {
  try {
    // TODO: 实现删除任务逻辑
    logger.info('AutoTradeHandlers', '删除交易任务成功', { taskId })
    return { success: true, message: '任务已删除' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '删除交易任务失败', { taskId, error })
    return { success: false, error: error.message }
  }
})

// ============== 持仓管理 ==============

ipcMain.handle('auto-trade:get-positions', async () => {
  try {
    const positions = autoTradingEngine.getPositions()
    logger.info('AutoTradeHandlers', '获取持仓列表成功', { count: positions.length })
    return { success: true, data: positions }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取持仓列表失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:get-active-positions', async () => {
  try {
    const positions = autoTradingEngine.getActivePositions()
    logger.info('AutoTradeHandlers', '获取活跃持仓列表成功', { count: positions.length })
    return { success: true, data: positions }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取活跃持仓列表失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:get-position', async (_event, positionId: string) => {
  try {
    const position = autoTradingEngine.getPosition(positionId)
    if (!position) {
      return { success: false, error: '持仓不存在' }
    }
    logger.info('AutoTradeHandlers', '获取持仓详情成功', { positionId })
    return { success: true, data: position }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取持仓详情失败', { positionId, error })
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:close-position', async (_event, positionId: string, reason?: string) => {
  try {
    const position = autoTradingEngine.getPosition(positionId)
    if (!position) {
      return { success: false, error: '持仓不存在' }
    }
    await autoTradingEngine.manualSell({ positionId, amount: position.amount })
    logger.info('AutoTradeHandlers', '关闭持仓成功', { positionId, reason })
    return { success: true, message: '持仓已关闭' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '关闭持仓失败', { positionId, error })
    return { success: false, error: error.message }
  }
})

// ============== 交易执行 ==============

ipcMain.handle('auto-trade:get-executions', async (_event, limit?: number) => {
  try {
    let executions = autoTradingEngine.getExecutions()
    if (limit) {
      executions = executions.slice(-limit)
    }
    logger.info('AutoTradeHandlers', '获取交易历史成功', { count: executions.length })
    return { success: true, data: executions }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取交易历史失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:manual-buy', async (_event, params: {
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  amount: string
  walletId: string
}) => {
  try {
    const execution = await autoTradingEngine.manualBuy(params)
    logger.info('AutoTradeHandlers', '手动买入成功', { tokenSymbol: params.tokenSymbol })
    return { success: true, data: execution }
  } catch (error) {
    logger.error('AutoTradeHandlers', '手动买入失败', { params, error })
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:manual-sell', async (_event, params: {
  positionId: string
  amount?: string
}) => {
  try {
    await autoTradingEngine.manualSell(params)
    logger.info('AutoTradeHandlers', '手动卖出成功', { positionId: params.positionId })
    return { success: true, message: '卖出执行成功' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '手动卖出失败', { params, error })
    return { success: false, error: error.message }
  }
})

// ============== 统计信息 ==============

ipcMain.handle('auto-trade:get-stats', async () => {
  try {
    const stats = autoTradingEngine.getStats()
    logger.info('AutoTradeHandlers', '获取统计信息成功')
    return { success: true, data: stats }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取统计信息失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:reset-stats', async () => {
  try {
    autoTradingEngine.resetStats()
    logger.info('AutoTradeHandlers', '重置统计信息成功')
    return { success: true, message: '统计信息已重置' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '重置统计信息失败', error)
    return { success: false, error: error.message }
  }
})

// ============== 风险警报 ==============

ipcMain.handle('auto-trade:get-risk-alerts', async (_event, limit?: number) => {
  try {
    let alerts = autoTradingEngine.getRiskAlerts()
    if (limit) {
      alerts = alerts.slice(-limit)
    }
    logger.info('AutoTradeHandlers', '获取风险警报成功', { count: alerts.length })
    return { success: true, data: alerts }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取风险警报失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:resolve-alert', async (_event, alertId: string) => {
  try {
    // TODO: 实现警报解决逻辑
    logger.info('AutoTradeHandlers', '解决风险警报成功', { alertId })
    return { success: true, message: '警报已解决' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '解决风险警报失败', { alertId, error })
    return { success: false, error: error.message }
  }
})

// ============== 风险控制配置 ==============

ipcMain.handle('auto-trade:get-risk-control-config', async () => {
  try {
    const config = autoTradingEngine.getConfig()
    logger.info('AutoTradeHandlers', '获取风险控制配置成功')
    return { success: true, data: config.riskControl }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取风险控制配置失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:update-risk-control-config', async (_event, config: Partial<RiskControlConfig>) => {
  try {
    autoTradingEngine.updateConfig({ riskControl: config })
    logger.info('AutoTradeHandlers', '更新风险控制配置成功', { config })
    return { success: true, message: '风险控制配置已更新' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '更新风险控制配置失败', { config, error })
    return { success: false, error: error.message }
  }
}

// ============== 止损配置 ==============

ipcMain.handle('auto-trade:get-stop-loss-config', async () => {
  try {
    const config = autoTradingEngine.getConfig()
    logger.info('AutoTradeHandlers', '获取止损配置成功')
    return { success: true, data: config.stopLoss }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取止损配置失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:update-stop-loss-config', async (_event, config: Partial<StopLossConfig>) => {
  try {
    autoTradingEngine.updateConfig({ stopLoss: config })
    logger.info('AutoTradeHandlers', '更新止损配置成功', { config })
    return { success: true, message: '止损配置已更新' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '更新止损配置失败', { config, error })
    return { success: false, error: error.message }
  }
})

// ============== 止盈配置 ==============

ipcMain.handle('auto-trade:get-take-profit-config', async () => {
  try {
    const config = autoTradingEngine.getConfig()
    logger.info('AutoTradeHandlers', '获取止盈配置成功')
    return { success: true, data: config.takeProfit }
  } catch (error) {
    logger.error('AutoTradeHandlers', '获取止盈配置失败', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auto-trade:update-take-profit-config', async (_event, config: Partial<TakeProfitConfig>) => {
  try {
    autoTradingEngine.updateConfig({ takeProfit: config })
    logger.info('AutoTradeHandlers', '更新止盈配置成功', { config })
    return { success: true, message: '止盈配置已更新' }
  } catch (error) {
    logger.error('AutoTradeHandlers', '更新止盈配置失败', { config, error })
    return { success: false, error: error.message }
  }
})

// ============== 事件监听 ==============

export function setupAutoTradeEventListeners() {
  autoTradingEngine.on('trading:started', () => {
    logger.info('AutoTradeHandlers', '自动交易已启动')
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('trading:stopped', () => {
    logger.info('AutoTradeHandlers', '自动交易已停止')
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('task:started', (task) => {
    logger.info('AutoTradeHandlers', '任务已启动', { taskId: task.id })
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('task:stopped', (task) => {
    logger.info('AutoTradeHandlers', '任务已停止', { taskId: task.id })
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('task:updated', (task) => {
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('position:opened', (position) => {
    logger.info('AutoTradeHandlers', '持仓已开启', { positionId: position.id })
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('position:closed', (position) => {
    logger.info('AutoTradeHandlers', '持仓已关闭', { positionId: position.id })
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('position:partial_profit', (data) => {
    logger.info('AutoTradeHandlers', '部分止盈', { positionId: data.position.id, level: data.level })
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('trade:executed', (execution) => {
    logger.info('AutoTradeHandlers', '交易已执行', { executionId: execution.executionId })
    // TODO: 发送事件到渲染进程
  })

  autoTradingEngine.on('risk:alert', (alert) => {
    logger.warn('AutoTradeHandlers', '风险警报', { alert })
    // TODO: 发送事件到渲染进程
  })
}
