/**
 * 风险预警IPC处理器
 * 处理风险预警相关的所有IPC通信
 */

import { ipcMain } from 'electron'
import { Database } from 'better-sqlite3'
import path from 'path'

// 风险预警数据库路径
const DB_PATH = path.join(__dirname, '../../risk-alerts.db')

// 类型定义
export type AlertType = 'stop_loss' | 'take_profit' | 'risk_limit' | 'position_limit' | 'mev_attack' | 'fake_hotspot'
export type Severity = 'info' | 'warning' | 'critical'
export type Status = 'pending' | 'acknowledged' | 'resolved' | 'dismissed'

export interface RiskAlert {
  id: string
  type: AlertType
  severity: Severity
  status: Status
  title: string
  message: string
  data?: {
    tokenSymbol?: string
    network?: 'BSC' | 'Solana'
    currentValue?: number
    threshold?: number
    taskId?: string
    positionId?: string
  }
  timestamp: number
  acknowledgedAt?: number
  resolvedAt?: number
  actions?: Array<{
    id: string
    label: string
    action: string
  }>
}

export interface RiskStatistics {
  totalAlerts: number
  pendingAlerts: number
  criticalAlerts: number
  resolvedToday: number
  avgResponseTime: number
}

export interface RiskTrend {
  date: string
  alerts: number
  resolved: number
}

/**
 * 初始化风险预警数据库
 */
function initDatabase(): Database.Database {
  const db = new Database(DB_PATH)

  // 创建警报表
  db.exec(`
    CREATE TABLE IF NOT EXISTS risk_alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      timestamp INTEGER NOT NULL,
      acknowledged_at INTEGER,
      resolved_at INTEGER,
      actions TEXT
    )
  `)

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON risk_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON risk_alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON risk_alerts(type);
    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON risk_alerts(timestamp);
  `)

  return db
}

// 数据库实例
let db: Database.Database | null = null

/**
 * 初始化风险预警IPC处理器
 */
export function initRiskAlertHandlers() {
  console.log('初始化风险预警IPC处理器...')

  // 初始化数据库
  db = initDatabase()

  // 获取警报列表
  ipcMain.handle('risk-alerts:get-alerts', async (_event, options?: {
    limit?: number
    offset?: number
  }) => {
    try {
      if (!db) {
        db = initDatabase()
      }

      const { limit = 100, offset = 0 } = options || {}

      const stmt = db.prepare(`
        SELECT * FROM risk_alerts
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `)

      const rows = stmt.all(limit, offset) as any[]

      // 解析JSON字段
      const alerts: RiskAlert[] = rows.map(row => ({
        ...row,
        data: row.data ? JSON.parse(row.data) : undefined,
        actions: row.actions ? JSON.parse(row.actions) : undefined
      }))

      return {
        success: true,
        data: alerts
      }
    } catch (error) {
      console.error('获取警报列表失败:', error)
      return {
        success: false,
        error: '获取警报列表失败'
      }
    }
  })

  // 创建警报
  ipcMain.handle('risk-alerts:create-alert', async (_event, alert: Omit<RiskAlert, 'id' | 'timestamp'>) => {
    try {
      if (!db) {
        db = initDatabase()
      }

      const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = Date.now()

      const stmt = db.prepare(`
        INSERT INTO risk_alerts (
          id, type, severity, status, title, message, data, timestamp,
          acknowledged_at, resolved_at, actions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id,
        alert.type,
        alert.severity,
        alert.status,
        alert.title,
        alert.message,
        alert.data ? JSON.stringify(alert.data) : null,
        timestamp,
        alert.acknowledgedAt || null,
        alert.resolvedAt || null,
        alert.actions ? JSON.stringify(alert.actions) : null
      )

      return {
        success: true,
        data: { id, timestamp }
      }
    } catch (error) {
      console.error('创建警报失败:', error)
      return {
        success: false,
        error: '创建警报失败'
      }
    }
  })

  // 确认警报
  ipcMain.handle('risk-alerts:acknowledge', async (_event, alertId: string) => {
    try {
      if (!db) {
        db = initDatabase()
      }

      const acknowledgedAt = Date.now()

      const stmt = db.prepare(`
        UPDATE risk_alerts
        SET status = 'acknowledged', acknowledged_at = ?
        WHERE id = ?
      `)

      stmt.run(acknowledgedAt, alertId)

      return {
        success: true,
        data: { message: '警报已确认' }
      }
    } catch (error) {
      console.error('确认警报失败:', error)
      return {
        success: false,
        error: '确认警报失败'
      }
    }
  })

  // 解决警报
  ipcMain.handle('risk-alerts:resolve', async (_event, alertId: string) => {
    try {
      if (!db) {
        db = initDatabase()
      }

      const resolvedAt = Date.now()

      const stmt = db.prepare(`
        UPDATE risk_alerts
        SET status = 'resolved', resolved_at = ?
        WHERE id = ?
      `)

      stmt.run(resolvedAt, alertId)

      return {
        success: true,
        data: { message: '警报已解决' }
      }
    } catch (error) {
      console.error('解决警报失败:', error)
      return {
        success: false,
        error: '解决警报失败'
      }
    }
  })

  // 忽略警报
  ipcMain.handle('risk-alerts:dismiss', async (_event, alertId: string) => {
    try {
      if (!db) {
        db = initDatabase()
      }

      const stmt = db.prepare(`
        UPDATE risk_alerts
        SET status = 'dismissed'
        WHERE id = ?
      `)

      stmt.run(alertId)

      return {
        success: true,
        data: { message: '警报已忽略' }
      }
    } catch (error) {
      console.error('忽略警报失败:', error)
      return {
        success: false,
        error: '忽略警报失败'
      }
    }
  })

  // 执行警报操作
  ipcMain.handle('risk-alerts:execute-action', async (_event, data: {
    alertId: string
    action: string
  }) => {
    try {
      // 这里可以根据action类型执行相应的操作
      // 例如：触发止损、平仓等

      console.log(`执行警报操作: ${data.action} for alert ${data.alertId}`)

      // 模拟执行操作
      await new Promise(resolve => setTimeout(resolve, 100))

      return {
        success: true,
        data: { message: '操作执行成功' }
      }
    } catch (error) {
      console.error('执行操作失败:', error)
      return {
        success: false,
        error: '执行操作失败'
      }
    }
  })

  // 获取警报统计
  ipcMain.handle('risk-alerts:get-statistics', async () => {
    try {
      if (!db) {
        db = initDatabase()
      }

      // 总警报数
      const totalAlertsStmt = db.prepare('SELECT COUNT(*) as count FROM risk_alerts')
      const totalAlerts = totalAlertsStmt.get() as { count: number }

      // 待处理警报
      const pendingStmt = db.prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE status = ?')
      const pendingAlerts = pendingStmt.get('pending') as { count: number }

      // 严重警报
      const criticalStmt = db.prepare('SELECT COUNT(*) as count FROM risk_alerts WHERE severity = ?')
      const criticalAlerts = criticalStmt.get('critical') as { count: number }

      // 今日已解决
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayResolvedStmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM risk_alerts
        WHERE status = 'resolved' AND resolved_at >= ?
      `)
      const resolvedToday = todayResolvedStmt.get(todayStart.getTime()) as { count: number }

      // 平均响应时间
      const avgTimeStmt = db.prepare(`
        SELECT AVG(acknowledged_at - timestamp) as avg_time
        FROM risk_alerts
        WHERE acknowledged_at IS NOT NULL
      `)
      const avgTimeResult = avgTimeStmt.get() as { avg_time: number | null }

      const statistics: RiskStatistics = {
        totalAlerts: totalAlerts.count,
        pendingAlerts: pendingAlerts.count,
        criticalAlerts: criticalAlerts.count,
        resolvedToday: resolvedToday.count,
        avgResponseTime: avgTimeResult.avg_time ? avgTimeResult.avg_time / 1000 : 0
      }

      return {
        success: true,
        data: statistics
      }
    } catch (error) {
      console.error('获取统计失败:', error)
      return {
        success: false,
        error: '获取统计失败'
      }
    }
  })

  // 获取趋势
  ipcMain.handle('risk-alerts:get-trend', async (_event, options?: {
    days?: number
  }) => {
    try {
      if (!db) {
        db = initDatabase()
      }

      const { days = 7 } = options || {}

      const trend: RiskTrend[] = []
      const now = new Date()

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const startTime = date.getTime()
        const endTime = startTime + 24 * 60 * 60 * 1000 - 1

        // 警报数
        const alertsStmt = db.prepare(`
          SELECT COUNT(*) as count
          FROM risk_alerts
          WHERE timestamp >= ? AND timestamp <= ?
        `)
        const alertsResult = alertsStmt.get(startTime, endTime) as { count: number }

        // 已解决数
        const resolvedStmt = db.prepare(`
          SELECT COUNT(*) as count
          FROM risk_alerts
          WHERE resolved_at >= ? AND resolved_at <= ?
        `)
        const resolvedResult = resolvedStmt.get(startTime, endTime) as { count: number }

        trend.push({
          date: date.toISOString().split('T')[0],
          alerts: alertsResult.count,
          resolved: resolvedResult.count
        })
      }

      return {
        success: true,
        data: trend
      }
    } catch (error) {
      console.error('获取趋势失败:', error)
      return {
        success: false,
        error: '获取趋势失败'
      }
    }
  })

  // 获取警报详情
  ipcMain.handle('risk-alerts:get-alert-detail', async (_event, alertId: string) => {
    try {
      if (!db) {
        db = initDatabase()
      }

      const stmt = db.prepare('SELECT * FROM risk_alerts WHERE id = ?')
      const row = stmt.get(alertId) as any

      if (!row) {
        return {
          success: false,
          error: '警报不存在'
        }
      }

      const alert: RiskAlert = {
        ...row,
        data: row.data ? JSON.parse(row.data) : undefined,
        actions: row.actions ? JSON.parse(row.actions) : undefined
      }

      return {
        success: true,
        data: alert
      }
    } catch (error) {
      console.error('获取警报详情失败:', error)
      return {
        success: false,
        error: '获取警报详情失败'
      }
    }
  })

  // 清理旧警报
  ipcMain.handle('risk-alerts:cleanup', async (_event, options?: {
    days?: number
  }) => {
    try {
      if (!db) {
        db = initDatabase()
      }

      const { days = 30 } = options || {}

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      const cutoffTime = cutoffDate.getTime()

      const stmt = db.prepare(`
        DELETE FROM risk_alerts
        WHERE status IN ('resolved', 'dismissed') AND (resolved_at < ? OR timestamp < ?)
      `)

      const result = stmt.run(cutoffTime, cutoffTime)

      return {
        success: true,
        data: {
          message: `已清理 ${result.changes} 条旧警报`,
          count: result.changes
        }
      }
    } catch (error) {
      console.error('清理旧警报失败:', error)
      return {
        success: false,
        error: '清理旧警报失败'
      }
    }
  })

  // 清理资源
  ipcMain.handle('risk-alerts:cleanup-resources', async () => {
    try {
      if (db) {
        db.close()
        db = null
      }

      return {
        success: true,
        data: { message: '风险预警资源已清理' }
      }
    } catch (error) {
      console.error('清理资源失败:', error)
      return {
        success: false,
        error: '清理资源失败'
      }
    }
  })

  console.log('风险预警IPC处理器初始化完成')
}
