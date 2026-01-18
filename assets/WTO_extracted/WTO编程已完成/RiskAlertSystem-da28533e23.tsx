/**
 * 风险预警通知系统
 * 提供实时风险监控、预警通知、警报管理和响应功能
 */

import React, { useState, useEffect } from 'react'
import './RiskAlertSystem.css'

type AlertType = 'stop_loss' | 'take_profit' | 'risk_limit' | 'position_limit' | 'mev_attack' | 'fake_hotspot'
type Severity = 'info' | 'warning' | 'critical'
type Status = 'pending' | 'acknowledged' | 'resolved' | 'dismissed'

interface RiskAlert {
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

interface RiskStatistics {
  totalAlerts: number
  pendingAlerts: number
  criticalAlerts: number
  resolvedToday: number
  avgResponseTime: number
}

interface RiskTrend {
  date: string
  alerts: number
  resolved: number
}

function RiskAlertSystem() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [statistics, setStatistics] = useState<RiskStatistics | null>(null)
  const [trend, setTrend] = useState<RiskTrend[]>([])
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all')
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(true)

  // 加载初始数据
  useEffect(() => {
    loadAlerts()
    loadStatistics()
    loadTrend()
    requestNotificationPermission()
  }, [])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(async () => {
      await loadAlerts()
      await loadStatistics()
    }, 5000) // 5秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh])

  // 请求通知权限
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('通知权限已获取')
      }
    }
  }

  // 加载警报
  const loadAlerts = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('risk-alerts:get-alerts', 100)
        if (result.success) {
          setAlerts(result.data)
        }
      }
    } catch (error) {
      console.error('加载警报失败:', error)
    }
  }

  // 加载统计
  const loadStatistics = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('risk-alerts:get-statistics')
        if (result.success) {
          setStatistics(result.data)
        }
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  }

  // 加载趋势
  const loadTrend = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('risk-alerts:get-trend', { days: 7 })
        if (result.success) {
          setTrend(result.data)
        }
      }
    } catch (error) {
      console.error('加载趋势失败:', error)
    }
  }

  // 确认警报
  const acknowledgeAlert = async (alertId: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('risk-alerts:acknowledge', alertId)
        if (result.success) {
          await loadAlerts()
          await loadStatistics()
        }
      }
    } catch (error) {
      console.error('确认警报失败:', error)
    }
  }

  // 解决警报
  const resolveAlert = async (alertId: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('risk-alerts:resolve', alertId)
        if (result.success) {
          await loadAlerts()
          await loadStatistics()
        }
      }
    } catch (error) {
      console.error('解决警报失败:', error)
    }
  }

  // 忽略警报
  const dismissAlert = async (alertId: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('risk-alerts:dismiss', alertId)
        if (result.success) {
          await loadAlerts()
          await loadStatistics()
        }
      }
    } catch (error) {
      console.error('忽略警报失败:', error)
    }
  }

  // 执行警报操作
  const executeAction = async (alertId: string, action: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('risk-alerts:execute-action', { alertId, action })
        if (result.success) {
          alert('操作执行成功')
          await loadAlerts()
        }
      }
    } catch (error) {
      console.error('执行操作失败:', error)
      alert('操作执行失败')
    }
  }

  // 获取警报类型图标
  const getAlertTypeIcon = (type: AlertType) => {
    const icons = {
      stop_loss: '📉',
      take_profit: '📈',
      risk_limit: '⚠️',
      position_limit: '📊',
      mev_attack: '🛡️',
      fake_hotspot: '🚫'
    }
    return icons[type]
  }

  // 获取警报类型名称
  const getAlertTypeName = (type: AlertType) => {
    const names = {
      stop_loss: '止损触发',
      take_profit: '止盈触发',
      risk_limit: '风险限制',
      position_limit: '持仓限制',
      mev_attack: 'MEV攻击',
      fake_hotspot: '虚假热点'
    }
    return names[type]
  }

  // 获取严重性颜色
  const getSeverityColor = (severity: Severity) => {
    const colors = {
      info: '#60a5fa',
      warning: '#facc15',
      critical: '#f87171'
    }
    return colors[severity]
  }

  // 获取状态颜色
  const getStatusColor = (status: Status) => {
    const colors = {
      pending: '#facc15',
      acknowledged: '#60a5fa',
      resolved: '#4ade80',
      dismissed: '#94a3b8'
    }
    return colors[status]
  }

  // 获取状态名称
  const getStatusName = (status: Status) => {
    const names = {
      pending: '待处理',
      acknowledged: '已确认',
      resolved: '已解决',
      dismissed: '已忽略'
    }
    return names[status]
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) {
      return '刚刚'
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`
    } else {
      return date.toLocaleString()
    }
  }

  // 发送桌面通知
  const sendDesktopNotification = (alert: RiskAlert) => {
    if (!desktopNotificationsEnabled) return

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`${getAlertTypeIcon(alert.type)} ${alert.title}`, {
        body: alert.message,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: alert.id,
        requireInteraction: alert.severity === 'critical'
      })

      notification.onclick = () => {
        window.focus()
        setSelectedAlert(alert)
        notification.close()
      }
    }
  }

  // 播放警报声音
  const playAlertSound = (severity: Severity) => {
    if (!soundEnabled) return

    const audio = new Audio()
    if (severity === 'critical') {
      audio.src = '/sounds/critical.mp3'
    } else if (severity === 'warning') {
      audio.src = '/sounds/warning.mp3'
    } else {
      audio.src = '/sounds/info.mp3'
    }
    audio.play().catch(e => console.error('播放声音失败:', e))
  }

  // 监听新警报
  useEffect(() => {
    if (alerts.length === 0) return

    const latestAlert = alerts[0]
    if (latestAlert.status === 'pending') {
      sendDesktopNotification(latestAlert)
      playAlertSound(latestAlert.severity)
    }
  }, [alerts])

  // 绘制趋势图
  const renderTrendChart = () => {
    if (trend.length === 0) return null

    const maxAlerts = Math.max(...trend.map(d => d.alerts))
    const chartHeight = 150
    const chartWidth = trend.length * 50

    return (
      <div className="trend-chart-container">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* 警报曲线 */}
          <polyline
            points={trend.map((d, i) => {
              const x = i * (chartWidth / trend.length)
              const y = chartHeight - (d.alerts / maxAlerts) * (chartHeight - 20) - 10
              return `${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#f87171"
            strokeWidth="2"
          />

          {/* 解决曲线 */}
          <polyline
            points={trend.map((d, i) => {
              const x = i * (chartWidth / trend.length)
              const y = chartHeight - (d.resolved / maxAlerts) * (chartHeight - 20) - 10
              return `${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#4ade80"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {/* 数据点 */}
          {trend.map((d, i) => {
            const x = i * (chartWidth / trend.length)
            const y = chartHeight - (d.alerts / maxAlerts) * (chartHeight - 20) - 10
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#f87171"
              />
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div className="risk-alert-system">
      {/* 头部 */}
      <div className="panel-header">
        <div className="header-title">
          <h2>🚨 风险预警系统</h2>
          <p className="subtitle">实时监控风险，及时预警通知</p>
        </div>
        <div className="header-actions">
          <div className={`sound-toggle ${soundEnabled ? 'enabled' : 'disabled'}`} onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? '🔊' : '🔇'}
          </div>
          <div className={`notification-toggle ${desktopNotificationsEnabled ? 'enabled' : 'disabled'}`} onClick={() => setDesktopNotificationsEnabled(!desktopNotificationsEnabled)}>
            {desktopNotificationsEnabled ? '🔔' : '🔕'}
          </div>
          <button
            className={`refresh-button ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            🔄
          </button>
          <button className="settings-button" onClick={() => setShowSettings(true)}>
            ⚙️
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">总警报数</div>
            <div className="stat-value">{statistics?.totalAlerts || 0}</div>
            <div className="stat-trend">待处理: {statistics?.pendingAlerts || 0}</div>
          </div>
        </div>

        <div className="stat-card critical">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-label">严重警报</div>
            <div className="stat-value">{statistics?.criticalAlerts || 0}</div>
            <div className="stat-trend">需要立即处理</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">今日已解决</div>
            <div className="stat-value">{statistics?.resolvedToday || 0}</div>
            <div className="stat-trend positive">响应效率良好</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-label">平均响应时间</div>
            <div className="stat-value">{statistics?.avgResponseTime.toFixed(1)}s</div>
            <div className="stat-trend">
              {statistics?.avgResponseTime < 30 ? '优秀' : statistics?.avgResponseTime < 60 ? '良好' : '需改进'}
            </div>
          </div>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="trend-section">
        <div className="section-title">
          <h3>📈 警报趋势</h3>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f87171' }}></div>
              <span>警报</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#4ade80' }}></div>
              <span>已解决</span>
            </div>
          </div>
        </div>
        {renderTrendChart()}
      </div>

      {/* 过滤器 */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>类型:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
            <option value="all">全部</option>
            <option value="stop_loss">止损触发</option>
            <option value="take_profit">止盈触发</option>
            <option value="risk_limit">风险限制</option>
            <option value="position_limit">持仓限制</option>
            <option value="mev_attack">MEV攻击</option>
            <option value="fake_hotspot">虚假热点</option>
          </select>
        </div>

        <div className="filter-group">
          <label>严重性:</label>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as any)}>
            <option value="all">全部</option>
            <option value="info">信息</option>
            <option value="warning">警告</option>
            <option value="critical">严重</option>
          </select>
        </div>

        <div className="filter-group">
          <label>状态:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">全部</option>
            <option value="pending">待处理</option>
            <option value="acknowledged">已确认</option>
            <option value="resolved">已解决</option>
            <option value="dismissed">已忽略</option>
          </select>
        </div>
      </div>

      {/* 警报列表 */}
      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-text">暂无警报</div>
          </div>
        ) : (
          alerts
            .filter(alert => filterType === 'all' || alert.type === filterType)
            .filter(alert => filterSeverity === 'all' || alert.severity === filterSeverity)
            .filter(alert => filterStatus === 'all' || alert.status === filterStatus)
            .map(alert => (
              <div
                key={alert.id}
                className={`alert-item ${alert.severity} ${alert.status} ${selectedAlert?.id === alert.id ? 'selected' : ''}`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="alert-header">
                  <div className="alert-type">
                    {getAlertTypeIcon(alert.type)} {getAlertTypeName(alert.type)}
                  </div>
                  <div className="alert-severity" style={{ color: getSeverityColor(alert.severity) }}>
                    {alert.severity === 'critical' ? '严重' : alert.severity === 'warning' ? '警告' : '信息'}
                  </div>
                  <div className="alert-status" style={{ color: getStatusColor(alert.status) }}>
                    {getStatusName(alert.status)}
                  </div>
                </div>

                <div className="alert-title">{alert.title}</div>
                <div className="alert-message">{alert.message}</div>

                {alert.data && (
                  <div className="alert-data">
                    {alert.data.tokenSymbol && (
                      <span className="data-item">
                        代币: {alert.data.tokenSymbol}
                      </span>
                    )}
                    {alert.data.network && (
                      <span className="data-item">
                        网络: {alert.data.network}
                      </span>
                    )}
                    {alert.data.currentValue !== undefined && (
                      <span className="data-item">
                        当前值: {alert.data.currentValue}
                      </span>
                    )}
                    {alert.data.threshold !== undefined && (
                      <span className="data-item">
                        阈值: {alert.data.threshold}
                      </span>
                    )}
                  </div>
                )}

                <div className="alert-time">{formatTime(alert.timestamp)}</div>

                {alert.status === 'pending' && (
                  <div className="alert-actions">
                    <button
                      className="action-button acknowledge"
                      onClick={(e) => {
                        e.stopPropagation()
                        acknowledgeAlert(alert.id)
                      }}
                    >
                      ✓ 确认
                    </button>
                    <button
                      className="action-button resolve"
                      onClick={(e) => {
                        e.stopPropagation()
                        resolveAlert(alert.id)
                      }}
                    >
                      ✅ 解决
                    </button>
                    <button
                      className="action-button dismiss"
                      onClick={(e) => {
                        e.stopPropagation()
                        dismissAlert(alert.id)
                      }}
                    >
                      ✕ 忽略
                    </button>
                  </div>
                )}

                {alert.actions && alert.actions.length > 0 && (
                  <div className="quick-actions">
                    {alert.actions.map(action => (
                      <button
                        key={action.id}
                        className="quick-action-button"
                        onClick={(e) => {
                          e.stopPropagation()
                          executeAction(alert.id, action.action)
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
        )}
      </div>

      {/* 警报详情侧边栏 */}
      {selectedAlert && (
        <div className="alert-details-sidebar">
          <div className="sidebar-header">
            <h3>警报详情</h3>
            <button className="close-button" onClick={() => setSelectedAlert(null)}>✕</button>
          </div>
          <div className="sidebar-content">
            <div className="detail-section">
              <div className="section-title">基本信息</div>
              <div className="detail-row">
                <span className="label">类型:</span>
                <span className="value">
                  {getAlertTypeIcon(selectedAlert.type)} {getAlertTypeName(selectedAlert.type)}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">严重性:</span>
                <span className="value" style={{ color: getSeverityColor(selectedAlert.severity) }}>
                  {selectedAlert.severity === 'critical' ? '严重' : selectedAlert.severity === 'warning' ? '警告' : '信息'}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">状态:</span>
                <span className="value" style={{ color: getStatusColor(selectedAlert.status) }}>
                  {getStatusName(selectedAlert.status)}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">时间:</span>
                <span className="value">{formatTime(selectedAlert.timestamp)}</span>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-title">警报内容</div>
              <div className="detail-row">
                <span className="label">标题:</span>
                <span className="value">{selectedAlert.title}</span>
              </div>
              <div className="detail-row full-width">
                <span className="label">消息:</span>
                <span className="value">{selectedAlert.message}</span>
              </div>
            </div>

            {selectedAlert.data && (
              <div className="detail-section">
                <div className="section-title">相关数据</div>
                {selectedAlert.data.tokenSymbol && (
                  <div className="detail-row">
                    <span className="label">代币:</span>
                    <span className="value">{selectedAlert.data.tokenSymbol}</span>
                  </div>
                )}
                {selectedAlert.data.network && (
                  <div className="detail-row">
                    <span className="label">网络:</span>
                    <span className="value">{selectedAlert.data.network}</span>
                  </div>
                )}
                {selectedAlert.data.currentValue !== undefined && (
                  <div className="detail-row">
                    <span className="label">当前值:</span>
                    <span className="value">{selectedAlert.data.currentValue}</span>
                  </div>
                )}
                {selectedAlert.data.threshold !== undefined && (
                  <div className="detail-row">
                    <span className="label">阈值:</span>
                    <span className="value">{selectedAlert.data.threshold}</span>
                  </div>
                )}
              </div>
            )}

            {selectedAlert.status === 'pending' && (
              <div className="detail-section">
                <div className="section-title">可用操作</div>
                <div className="action-buttons">
                  <button
                    className="sidebar-action-button acknowledge"
                    onClick={() => acknowledgeAlert(selectedAlert.id)}
                  >
                    ✓ 确认警报
                  </button>
                  <button
                    className="sidebar-action-button resolve"
                    onClick={() => resolveAlert(selectedAlert.id)}
                  >
                    ✅ 解决警报
                  </button>
                  <button
                    className="sidebar-action-button dismiss"
                    onClick={() => dismissAlert(selectedAlert.id)}
                  >
                    ✕ 忽略警报
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-header">
              <h3>⚙️ 风险预警设置</h3>
              <button className="close-button" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="settings-content">
              <div className="settings-section">
                <h4>通知设置</h4>
                <div className="setting-item checkbox">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                  <label>启用声音通知</label>
                </div>
                <div className="setting-item checkbox">
                  <input
                    type="checkbox"
                    checked={desktopNotificationsEnabled}
                    onChange={(e) => setDesktopNotificationsEnabled(e.target.checked)}
                  />
                  <label>启用桌面通知</label>
                </div>
              </div>

              <div className="settings-section">
                <h4>警报设置</h4>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={true} />
                  <label>启用止损警报</label>
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={true} />
                  <label>启用止盈警报</label>
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={true} />
                  <label>启用风险限制警报</label>
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={true} />
                  <label>启用持仓限制警报</label>
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={true} />
                  <label>启用MEV攻击警报</label>
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={true} />
                  <label>启用虚假热点警报</label>
                </div>
              </div>

              <div className="settings-section">
                <h4>严重性设置</h4>
                <div className="setting-item">
                  <label>严重警报自动确认时间 (秒)</label>
                  <input type="number" defaultValue={30} min="0" max="300" />
                </div>
                <div className="setting-item">
                  <label>警告警报自动确认时间 (秒)</label>
                  <input type="number" defaultValue={60} min="0" max="300} />
                </div>
              </div>

              <div className="settings-actions">
                <button className="save-button" onClick={() => setShowSettings(false)}>保存设置</button>
                <button className="cancel-button" onClick={() => setShowSettings(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RiskAlertSystem
