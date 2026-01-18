/**
 * 热点监控面板组件
 * 提供热点的实时监控、搜索、分析和警报功能
 */

import React, { useState, useEffect } from 'react'
import './HotspotMonitorPanel.css'

type HotspotPriority = 'low' | 'medium' | 'high' | 'critical'
type HotspotStatus = 'monitoring' | 'analyzing' | 'hot' | 'cooling' | 'expired'

interface Hotspot {
  id: string
  type: 'social' | 'onchain' | 'dex'
  source: string
  status: HotspotStatus
  score: {
    score: number
    priority: HotspotPriority
    socialScore: number
    onchainScore: number
    volumeScore: number
  }
  relatedTokens: Array<{
    address: string
    symbol: string
    network: 'BSC' | 'Solana'
  }>
  firstDetectedAt: number
  lastUpdatedAt: number
  socialData?: any
  onchainData?: any
  dexData?: any
}

interface HotspotAlert {
  id: string
  hotspotId: string
  type: string
  priority: HotspotPriority
  message: string
  timestamp: number
  acknowledged: boolean
}

function HotspotMonitorPanel() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)
  const [alerts, setAlerts] = useState<HotspotAlert[]>([])
  const [filter, setFilter] = useState<HotspotPriority | 'all'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [showAlerts, setShowAlerts] = useState(false)

  // 加载初始数据
  useEffect(() => {
    loadHotspots()
    loadStats()
    loadAlerts()
    checkMonitoringStatus()
  }, [])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(async () => {
      await loadHotspots()
      await loadStats()
      await loadAlerts()
    }, 30000) // 30秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh])

  // 加载热点列表
  const loadHotspots = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:get-hotspots', 
          filter !== 'all' ? { priority: filter } : undefined
        )
        if (result.success) {
          setHotspots(result.data)
        }
      }
    } catch (error) {
      console.error('加载热点失败:', error)
    }
  }

  // 加载统计信息
  const loadStats = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:get-stats')
        if (result.success) {
          setStats(result.data)
        }
      }
    } catch (error) {
      console.error('加载统计信息失败:', error)
    }
  }

  // 加载警报
  const loadAlerts = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:get-alerts', 20)
        if (result.success) {
          setAlerts(result.data)
        }
      }
    } catch (error) {
      console.error('加载警报失败:', error)
    }
  }

  // 检查监控状态
  const checkMonitoringStatus = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:is-monitoring')
        if (result.success) {
          setIsMonitoring(result.data)
        }
      }
    } catch (error) {
      console.error('检查监控状态失败:', error)
    }
  }

  // 开始监控
  const startMonitoring = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:start-monitoring')
        if (result.success) {
          setIsMonitoring(true)
          alert('热点监控已启动')
        }
      }
    } catch (error) {
      console.error('启动监控失败:', error)
      alert('启动监控失败')
    }
  }

  // 停止监控
  const stopMonitoring = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:stop-monitoring')
        if (result.success) {
          setIsMonitoring(false)
          alert('热点监控已停止')
        }
      }
    } catch (error) {
      console.error('停止监控失败:', error)
      alert('停止监控失败')
    }
  }

  // 搜索热点
  const searchHotspots = async () => {
    if (!searchKeyword.trim()) {
      loadHotspots()
      return
    }

    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:search', searchKeyword, 50)
        if (result.success) {
          setHotspots(result.data)
        }
      }
    } catch (error) {
      console.error('搜索热点失败:', error)
    }
  }

  // 分析热点
  const analyzeHotspot = async (id: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:analyze', id)
        if (result.success) {
          alert('热点分析完成')
          loadHotspots()
        }
      }
    } catch (error) {
      console.error('分析热点失败:', error)
      alert('分析热点失败')
    }
  }

  // 确认警报
  const acknowledgeAlert = async (alertId: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('hotspot:acknowledge-alert', alertId)
        if (result.success) {
          loadAlerts()
        }
      }
    } catch (error) {
      console.error('确认警报失败:', error)
    }
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: HotspotPriority): string => {
    const colors = {
      low: '#6b7280',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    }
    return colors[priority]
  }

  // 获取优先级标签
  const getPriorityLabel = (priority: HotspotPriority): string => {
    const labels = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '紧急'
    }
    return labels[priority]
  }

  // 获取状态标签
  const getStatusLabel = (status: HotspotStatus): string => {
    const labels = {
      monitoring: '监控中',
      analyzing: '分析中',
      hot: '热门',
      cooling: '冷却中',
      expired: '已过期'
    }
    return labels[status]
  }

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  return (
    <div className="hotspot-monitor-panel">
      {/* 头部 */}
      <div className="panel-header">
        <h2>🔥 热点监控</h2>
        <div className="header-actions">
          <div className="monitoring-status">
            <span className={`status-indicator ${isMonitoring ? 'active' : 'inactive'}`}>
              {isMonitoring ? '监控中' : '已停止'}
            </span>
          </div>
          <button
            className={`btn ${isMonitoring ? 'btn-danger' : 'btn-primary'}`}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? '停止监控' : '开始监控'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAlerts(!showAlerts)}>
            🔔 警报 {alerts.length > 0 && <span className="badge">{alerts.length}</span>}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">总热点数</div>
              <div className="stat-value">{stats.totalHotspots || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-label">热门热点</div>
              <div className="stat-value">{stats.byStatus?.hot || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-label">高优先级</div>
              <div className="stat-value">{stats.byPriority?.high || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <div className="stat-label">活跃任务</div>
              <div className="stat-value">{stats.activeTasks || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* 警报面板 */}
      {showAlerts && (
        <div className="alerts-panel">
          <div className="alerts-header">
            <h3>🔔 警报列表</h3>
            <button className="btn-close" onClick={() => setShowAlerts(false)}>×</button>
          </div>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="empty-state">暂无警报</div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.priority}`}>
                  <div className="alert-content">
                    <div className="alert-header">
                      <span className={`alert-badge ${alert.priority}`}>
                        {getPriorityLabel(alert.priority)}
                      </span>
                      <span className="alert-time">{formatTime(alert.timestamp)}</span>
                    </div>
                    <div className="alert-message">{alert.message}</div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      className="btn btn-small"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      确认
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="search-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索热点（代币符号、关键词等）..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchHotspots()}
          />
          <button className="btn btn-primary" onClick={searchHotspots}>
            🔍 搜索
          </button>
        </div>
        <div className="filters">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">全部优先级</option>
            <option value="critical">紧急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            自动刷新
          </label>
        </div>
      </div>

      {/* 热点列表 */}
      <div className="hotspots-list">
        {hotspots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-text">
              {isMonitoring ? '正在监控热点...' : '暂无热点数据，请开始监控'}
            </div>
          </div>
        ) : (
          hotspots.map(hotspot => (
            <div key={hotspot.id} className={`hotspot-item priority-${hotspot.score.priority}`}>
              <div className="hotspot-main">
                <div className="hotspot-info">
                  <div className="hotspot-header">
                    <span className={`hotspot-badge ${hotspot.score.priority}`}>
                      {getPriorityLabel(hotspot.score.priority)}
                    </span>
                    <span className="hotspot-type">{hotspot.type}</span>
                    <span className="hotspot-status">{getStatusLabel(hotspot.status)}</span>
                  </div>
                  <div className="hotspot-title">
                    {hotspot.onchainData?.tokenSymbol || 
                     hotspot.dexData?.token1.symbol || 
                     hotspot.socialData?.keyword || 
                     '未知'}
                  </div>
                  <div className="hotspot-details">
                    {hotspot.relatedTokens.length > 0 && (
                      <span className="token-info">
                        {hotspot.relatedTokens[0].symbol} ({hotspot.relatedTokens[0].network})
                      </span>
                    )}
                    <span className="hotspot-score">
                      评分: {hotspot.score.score}
                    </span>
                    <span className="hotspot-time">
                      {formatTime(hotspot.firstDetectedAt)}
                    </span>
                  </div>
                </div>
                <div className="hotspot-actions">
                  <button
                    className="btn btn-small"
                    onClick={() => analyzeHotspot(hotspot.id)}
                  >
                    分析
                  </button>
                  <button
                    className="btn btn-small btn-outline"
                    onClick={() => setSelectedHotspot(hotspot)}
                  >
                    详情
                  </button>
                </div>
              </div>

              {/* 详细信息 */}
              {selectedHotspot?.id === hotspot.id && (
                <div className="hotspot-details-panel">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-label">热点ID</div>
                      <div className="detail-value">{hotspot.id}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">来源</div>
                      <div className="detail-value">{hotspot.source}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">综合评分</div>
                      <div className="detail-value score">{hotspot.score.score}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">社交媒体分</div>
                      <div className="detail-value">{hotspot.score.socialScore}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">链上数据分</div>
                      <div className="detail-value">{hotspot.score.onchainScore}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">交易量分</div>
                      <div className="detail-value">{hotspot.score.volumeScore}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">首次发现</div>
                      <div className="detail-value">
                        {new Date(hotspot.firstDetectedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">最后更新</div>
                      <div className="detail-value">
                        {new Date(hotspot.lastUpdatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 社交媒体数据 */}
                  {hotspot.socialData && (
                    <div className="data-section">
                      <h4>社交媒体数据</h4>
                      <div className="data-grid">
                        <div className="data-item">
                          <span className="data-label">关键词:</span>
                          <span>{hotspot.socialData.keyword}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">提及次数:</span>
                          <span>{hotspot.socialData.mentionCount}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">互动率:</span>
                          <span>{(hotspot.socialData.engagementRate * 100).toFixed(2)}%</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">情绪:</span>
                          <span>{hotspot.socialData.sentiment.toFixed(2)}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">增长率:</span>
                          <span>{hotspot.socialData.growthRate.toFixed(2)}x</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 链上数据 */}
                  {hotspot.onchainData && (
                    <div className="data-section">
                      <h4>链上数据</h4>
                      <div className="data-grid">
                        <div className="data-item">
                          <span className="data-label">代币符号:</span>
                          <span>{hotspot.onchainData.tokenSymbol}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">网络:</span>
                          <span>{hotspot.onchainData.network}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">流动性:</span>
                          <span>{parseFloat(hotspot.onchainData.liquidityAmount).toLocaleString()}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">24h交易量:</span>
                          <span>{parseFloat(hotspot.onchainData.transactionVolume24h).toLocaleString()}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">持币人数:</span>
                          <span>{hotspot.onchainData.holderCount}</span>
                        </div>
                        <div className="data-item">
                          <span className="data-label">24h涨跌:</span>
                          <span className={hotspot.onchainData.priceChange24h >= 0 ? 'positive' : 'negative'}>
                            {(hotspot.onchainData.priceChange24h * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default HotspotMonitorPanel
