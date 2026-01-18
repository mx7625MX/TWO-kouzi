/**
 * 自动交易策略配置界面
 * 提供自动交易策略创建、配置、监控和管理功能
 */

import React, { useState, useEffect } from 'react'
import './AutoTradingPanel.css'

type TradeStrategy = 'hotspot_trading' | 'trend_following' | 'mean_reversion' | 'arbitrage'
type Network = 'BSC' | 'Solana'
type RiskLevel = 'low' | 'medium' | 'high'
type TaskStatus = 'idle' | 'active' | 'paused' | 'completed' | 'failed'

interface AutoTradeConfig {
  enabled: boolean
  maxActiveTasks: number
  maxTotalPositions: number
  maxPositionValue: string
  maxDailyLoss: string
  enableRiskControl: boolean
  enableStopLoss: boolean
  enableTakeProfit: boolean
  enableAutoBuy: boolean
  enableAutoSell: boolean
  minConfidence: number
  minRiskRewardRatio: number
}

interface StopLossConfig {
  enabled: boolean
  stopLossPercent: number
  dynamicStopLoss: boolean
  trailingStopLossPercent: number
}

interface TakeProfitConfig {
  enabled: boolean
  takeProfitPercent: number
  dynamicTakeProfit: boolean
  partialTakeProfit: boolean
  partialTakeProfitPercent: number
  partialTakeProfitLevels: number[]
}

interface AutoTradeTask {
  id: string
  name: string
  status: TaskStatus
  strategy: TradeStrategy
  tokenSymbol: string
  network: Network
  amount: string
  walletId: string
  stopLoss?: StopLossConfig
  takeProfit?: TakeProfitConfig
  createdAt: number
  startedAt: number
  completedAt?: number
}

interface Position {
  id: string
  tokenSymbol: string
  network: Network
  entryPrice: number
  currentPrice: number
  amount: string
  value: string
  profit: number
  profitPercent: number
  entryTime: number
  status: 'active' | 'closed'
}

interface TradeStats {
  totalTasks: number
  activeTasks: number
  completedTasks: number
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  totalVolume: string
  totalProfit: string
  totalLoss: string
  winRate: number
  avgProfitPerTrade: string
}

function AutoTradingPanel() {
  const [isRunning, setIsRunning] = useState(false)
  const [config, setConfig] = useState<AutoTradeConfig | null>(null)
  const [tasks, setTasks] = useState<AutoTradeTask[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [selectedTask, setSelectedTask] = useState<AutoTradeTask | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [strategyFilter, setStrategyFilter] = useState<TradeStrategy | 'all'>('all')

  // 加载初始数据
  useEffect(() => {
    loadStatus()
    loadConfig()
    loadTasks()
    loadPositions()
    loadStats()
  }, [])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(async () => {
      await loadTasks()
      await loadPositions()
      await loadStats()
    }, 5000) // 5秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh])

  // 加载状态
  const loadStatus = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('auto-trade:get-status')
        if (result.success) {
          setIsRunning(result.data.isRunning)
        }
      }
    } catch (error) {
      console.error('加载自动交易状态失败:', error)
    }
  }

  // 加载配置
  const loadConfig = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('auto-trade:get-config')
        if (result.success) {
          setConfig(result.data)
        }
      }
    } catch (error) {
      console.error('加载自动交易配置失败:', error)
    }
  }

  // 加载任务
  const loadTasks = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('auto-trade:get-tasks')
        if (result.success) {
          setTasks(result.data)
        }
      }
    } catch (error) {
      console.error('加载自动交易任务失败:', error)
    }
  }

  // 加载持仓
  const loadPositions = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('auto-trade:get-active-positions')
        if (result.success) {
          setPositions(result.data)
        }
      }
    } catch (error) {
      console.error('加载持仓失败:', error)
    }
  }

  // 加载统计
  const loadStats = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('auto-trade:get-stats')
        if (result.success) {
          setStats(result.data)
        }
      }
    } catch (error) {
      console.error('加载统计信息失败:', error)
    }
  }

  // 启动/停止自动交易
  const toggleTrading = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = isRunning
          ? await window.ipcRenderer.invoke('auto-trade:stop')
          : await window.ipcRenderer.invoke('auto-trade:start')
        if (result.success) {
          setIsRunning(!isRunning)
          alert(result.message)
        }
      }
    } catch (error) {
      console.error('切换自动交易失败:', error)
      alert('切换自动交易失败')
    }
  }

  // 启动任务
  const startTask = async (taskId: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('auto-trade:start-task', taskId)
        if (result.success) {
          await loadTasks()
          alert('任务已启动')
        }
      }
    } catch (error) {
      console.error('启动任务失败:', error)
      alert('启动任务失败')
    }
  }

  // 停止任务
  const stopTask = async (taskId: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('auto-trade:stop-task', taskId)
        if (result.success) {
          await loadTasks()
          alert('任务已停止')
        }
      }
    } catch (error) {
      console.error('停止任务失败:', error)
      alert('停止任务失败')
    }
  }

  // 关闭持仓
  const closePosition = async (positionId: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('auto-trade:close-position', positionId)
        if (result.success) {
          await loadPositions()
          alert('持仓已关闭')
        }
      }
    } catch (error) {
      console.error('关闭持仓失败:', error)
      alert('关闭持仓失败')
    }
  }

  // 获取策略名称
  const getStrategyName = (strategy: TradeStrategy) => {
    const names = {
      hotspot_trading: '热点交易',
      trend_following: '趋势跟踪',
      mean_reversion: '均值回归',
      arbitrage: '套利交易'
    }
    return names[strategy]
  }

  // 获取策略图标
  const getStrategyIcon = (strategy: TradeStrategy) => {
    const icons = {
      hotspot_trading: '🔥',
      trend_following: '📈',
      mean_reversion: '🔄',
      arbitrage: '⚖️'
    }
    return icons[strategy]
  }

  // 获取状态颜色
  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      idle: '#94a3b8',
      active: '#4ade80',
      paused: '#facc15',
      completed: '#60a5fa',
      failed: '#f87171'
    }
    return colors[status]
  }

  // 获取状态文本
  const getStatusText = (status: TaskStatus) => {
    const texts = {
      idle: '空闲',
      active: '活跃',
      paused: '暂停',
      completed: '完成',
      failed: '失败'
    }
    return texts[status]
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
    <div className="auto-trading-panel">
      {/* 头部 */}
      <div className="panel-header">
        <div className="header-title">
          <h2>🤖 自动交易系统</h2>
          <p className="subtitle">7x24小时智能交易，实现收益最大化</p>
        </div>
        <div className="header-actions">
          <div className={`status-badge ${isRunning ? 'active' : 'inactive'}`}>
            <span className="indicator"></span>
            {isRunning ? '运行中' : '已停止'}
          </div>
          <button
            className={`toggle-button ${isRunning ? 'active' : ''}`}
            onClick={toggleTrading}
          >
            {isRunning ? '停止' : '启动'}
          </button>
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
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-label">总任务数</div>
            <div className="stat-value">{stats?.totalTasks || 0}</div>
            <div className="stat-trend">活跃: {stats?.activeTasks || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">总交易次数</div>
            <div className="stat-value">{stats?.totalTrades || 0}</div>
            <div className="stat-trend positive">成功: {stats?.successfulTrades || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-label">胜率</div>
            <div className="stat-value">{stats?.winRate.toFixed(1)}%</div>
            <div className="stat-trend positive">
              {stats?.winRate > 60 ? '优秀' : stats?.winRate > 40 ? '良好' : '需改进'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">总收益</div>
            <div className={`stat-value ${parseFloat(stats?.totalProfit || '0') > 0 ? 'positive' : 'negative'}`}>
              {stats?.totalProfit || '0'}
            </div>
            <div className="stat-trend">
              平均: {stats?.avgProfitPerTrade || '0'}
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="content-grid">
        {/* 任务列表 */}
        <div className="tasks-panel">
          <div className="panel-header">
            <h3>📋 交易任务</h3>
            <div className="panel-controls">
              <select
                className="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">全部状态</option>
                <option value="active">活跃</option>
                <option value="idle">空闲</option>
                <option value="completed">完成</option>
                <option value="failed">失败</option>
              </select>
              <select
                className="strategy-filter"
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value as any)}
              >
                <option value="all">全部策略</option>
                <option value="hotspot_trading">热点交易</option>
                <option value="trend_following">趋势跟踪</option>
                <option value="mean_reversion">均值回归</option>
                <option value="arbitrage">套利交易</option>
              </select>
              <button className="create-button" onClick={() => setShowCreateTask(true)}>
                + 创建任务
              </button>
            </div>
          </div>

          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-text">暂无交易任务</div>
              </div>
            ) : (
              tasks
                .filter(task => filterStatus === 'all' || task.status === filterStatus)
                .filter(task => strategyFilter === 'all' || task.strategy === strategyFilter)
                .map(task => (
                  <div
                    key={task.id}
                    className={`task-item ${selectedTask?.id === task.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="task-header">
                      <div className="task-name">
                        {getStrategyIcon(task.strategy)} {task.name}
                      </div>
                      <div className="task-status" style={{ color: getStatusColor(task.status) }}>
                        {getStatusText(task.status)}
                      </div>
                    </div>

                    <div className="task-details">
                      <div className="detail-item">
                        <span className="detail-label">策略:</span>
                        <span className="detail-value">{getStrategyName(task.strategy)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">代币:</span>
                        <span className="detail-value">{task.tokenSymbol}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">网络:</span>
                        <span className="detail-value">{task.network}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">金额:</span>
                        <span className="detail-value">{task.amount}</span>
                      </div>
                    </div>

                    <div className="task-actions">
                      {task.status === 'idle' && (
                        <button
                          className="action-button start"
                          onClick={(e) => {
                            e.stopPropagation()
                            startTask(task.id)
                          }}
                        >
                          ▶️ 启动
                        </button>
                      )}
                      {task.status === 'active' && (
                        <button
                          className="action-button stop"
                          onClick={(e) => {
                            e.stopPropagation()
                            stopTask(task.id)
                          }}
                        >
                          ⏸️ 停止
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* 持仓列表 */}
        <div className="positions-panel">
          <div className="panel-header">
            <h3>💼 当前持仓</h3>
            <div className="panel-info">
              <span className="info-label">持仓数:</span>
              <span className="info-value">{positions.length}</span>
            </div>
          </div>

          <div className="positions-list">
            {positions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💼</div>
                <div className="empty-text">暂无活跃持仓</div>
              </div>
            ) : (
              positions.map(position => (
                <div key={position.id} className="position-item">
                  <div className="position-header">
                    <span className="token-symbol">{position.tokenSymbol}</span>
                    <span className="network-badge">{position.network}</span>
                  </div>

                  <div className="position-metrics">
                    <div className="metric">
                      <span className="metric-label">入场价:</span>
                      <span className="metric-value">${position.entryPrice.toFixed(6)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">现价:</span>
                      <span className="metric-value">${position.currentPrice.toFixed(6)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">数量:</span>
                      <span className="metric-value">{position.amount}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">价值:</span>
                      <span className="metric-value">${position.value}</span>
                    </div>
                  </div>

                  <div className="position-profit">
                    <div className={`profit-value ${position.profitPercent >= 0 ? 'positive' : 'negative'}`}>
                      {position.profitPercent >= 0 ? '+' : ''}{position.profitPercent.toFixed(2)}%
                    </div>
                    <div className="profit-amount">
                      {position.profit >= 0 ? '+' : ''}${position.profit.toFixed(2)}
                    </div>
                  </div>

                  <button
                    className="close-button"
                    onClick={() => closePosition(position.id)}
                  >
                    关闭持仓
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 任务详情侧边栏 */}
      {selectedTask && (
        <div className="task-details-sidebar">
          <div className="sidebar-header">
            <h3>任务详情</h3>
            <button className="close-button" onClick={() => setSelectedTask(null)}>✕</button>
          </div>
          <div className="sidebar-content">
            <div className="detail-section">
              <div className="section-title">基本信息</div>
              <div className="detail-row">
                <span className="label">任务名称:</span>
                <span className="value">{selectedTask.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">策略:</span>
                <span className="value">
                  {getStrategyIcon(selectedTask.strategy)} {getStrategyName(selectedTask.strategy)}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">代币:</span>
                <span className="value">{selectedTask.tokenSymbol}</span>
              </div>
              <div className="detail-row">
                <span className="label">网络:</span>
                <span className="value">{selectedTask.network}</span>
              </div>
              <div className="detail-row">
                <span className="label">金额:</span>
                <span className="value">{selectedTask.amount}</span>
              </div>
              <div className="detail-row">
                <span className="label">状态:</span>
                <span className="value" style={{ color: getStatusColor(selectedTask.status) }}>
                  {getStatusText(selectedTask.status)}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-title">止损设置</div>
              <div className="detail-row">
                <span className="label">启用:</span>
                <span className="value">{selectedTask.stopLoss?.enabled ? '是' : '否'}</span>
              </div>
              {selectedTask.stopLoss?.enabled && (
                <>
                  <div className="detail-row">
                    <span className="label">止损百分比:</span>
                    <span className="value">{selectedTask.stopLoss.stopLossPercent}%</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">动态止损:</span>
                    <span className="value">{selectedTask.stopLoss.dynamicStopLoss ? '是' : '否'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">移动止损:</span>
                    <span className="value">{selectedTask.stopLoss.trailingStopLossPercent}%</span>
                  </div>
                </>
              )}
            </div>

            <div className="detail-section">
              <div className="section-title">止盈设置</div>
              <div className="detail-row">
                <span className="label">启用:</span>
                <span className="value">{selectedTask.takeProfit?.enabled ? '是' : '否'}</span>
              </div>
              {selectedTask.takeProfit?.enabled && (
                <>
                  <div className="detail-row">
                    <span className="label">止盈百分比:</span>
                    <span className="value">{selectedTask.takeProfit.takeProfitPercent}%</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">动态止盈:</span>
                    <span className="value">{selectedTask.takeProfit.dynamicTakeProfit ? '是' : '否'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">部分止盈:</span>
                    <span className="value">{selectedTask.takeProfit.partialTakeProfit ? '是' : '否'}</span>
                  </div>
                  {selectedTask.takeProfit.partialTakeProfit && (
                    <div className="detail-row">
                      <span className="label">止盈水平:</span>
                      <span className="value">
                        {selectedTask.takeProfit.partialTakeProfitLevels.join(', ')}%
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="detail-section">
              <div className="section-title">时间信息</div>
              <div className="detail-row">
                <span className="label">创建时间:</span>
                <span className="value">{formatTime(selectedTask.createdAt)}</span>
              </div>
              {selectedTask.startedAt > 0 && (
                <div className="detail-row">
                  <span className="label">启动时间:</span>
                  <span className="value">{formatTime(selectedTask.startedAt)}</span>
                </div>
              )}
              {selectedTask.completedAt && (
                <div className="detail-row">
                  <span className="label">完成时间:</span>
                  <span className="value">{formatTime(selectedTask.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 创建任务弹窗 */}
      {showCreateTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>创建交易任务</h3>
              <button className="close-button" onClick={() => setShowCreateTask(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* 创建任务表单 */}
              <div className="form-section">
                <label>任务名称</label>
                <input type="text" placeholder="输入任务名称" />
              </div>

              <div className="form-section">
                <label>交易策略</label>
                <select>
                  <option value="hotspot_trading">🔥 热点交易</option>
                  <option value="trend_following">📈 趋势跟踪</option>
                  <option value="mean_reversion">🔄 均值回归</option>
                  <option value="arbitrage">⚖️ 套利交易</option>
                </select>
              </div>

              <div className="form-section">
                <label>代币符号</label>
                <input type="text" placeholder="例如: DOGE" />
              </div>

              <div className="form-section">
                <label>网络</label>
                <select>
                  <option value="BSC">BSC</option>
                  <option value="Solana">Solana</option>
                </select>
              </div>

              <div className="form-section">
                <label>交易金额</label>
                <input type="text" placeholder="例如: 100" />
              </div>

              <div className="form-section">
                <label>止损百分比 (%)</label>
                <input type="number" defaultValue="5" min="0" max="50" />
              </div>

              <div className="form-section">
                <label>止盈百分比 (%)</label>
                <input type="number" defaultValue="10" min="0" max="100" />
              </div>

              <div className="form-section checkbox">
                <input type="checkbox" defaultChecked={true} />
                <label>启用动态止损</label>
              </div>

              <div className="form-section checkbox">
                <input type="checkbox" defaultChecked={true} />
                <label>启用动态止盈</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setShowCreateTask(false)}>取消</button>
              <button
                className="confirm-button"
                onClick={() => {
                  setShowCreateTask(false)
                  alert('任务创建成功')
                }}
              >
                创建任务
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content settings-modal">
            <div className="modal-header">
              <h3>⚙️ 自动交易设置</h3>
              <button className="close-button" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <h4>常规设置</h4>
                <div className="setting-item">
                  <label>最大活跃任务数</label>
                  <input type="number" defaultValue={config?.maxActiveTasks || 5} min="1" max="20" />
                </div>
                <div className="setting-item">
                  <label>最大持仓数量</label>
                  <input type="number" defaultValue={config?.maxTotalPositions || 10} min="1" max="50" />
                </div>
                <div className="setting-item">
                  <label>最小置信度</label>
                  <input type="number" defaultValue={config?.minConfidence || 0.7} min="0" max="1" step="0.1" />
                </div>
              </div>

              <div className="settings-section">
                <h4>风险控制</h4>
                <div className="setting-item">
                  <label>最大持仓价值</label>
                  <input type="text" defaultValue={config?.maxPositionValue || '1000'} />
                </div>
                <div className="setting-item">
                  <label>最大日损失</label>
                  <input type="text" defaultValue={config?.maxDailyLoss || '100'} />
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={config?.enableRiskControl} />
                  <label>启用风险控制</label>
                </div>
              </div>

              <div className="settings-section">
                <h4>止损设置</h4>
                <div className="setting-item">
                  <label>默认止损百分比</label>
                  <input type="number" defaultValue={config?.stopLoss?.stopLossPercent || 5} min="0" max="50" />
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={config?.stopLoss?.dynamicStopLoss} />
                  <label>启用动态止损</label>
                </div>
                <div className="setting-item">
                  <label>移动止损百分比</label>
                  <input type="number" defaultValue={config?.stopLoss?.trailingStopLossPercent || 3} min="0" max="20" />
                </div>
              </div>

              <div className="settings-section">
                <h4>止盈设置</h4>
                <div className="setting-item">
                  <label>默认止盈百分比</label>
                  <input type="number" defaultValue={config?.takeProfit?.takeProfitPercent || 10} min="0" max="100" />
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" defaultChecked={config?.takeProfit?.partialTakeProfit} />
                  <label>启用部分止盈</label>
                </div>
                <div className="setting-item">
                  <label>部分止盈百分比</label>
                  <input type="number" defaultValue={config?.takeProfit?.partialTakeProfitPercent || 50} min="0" max="100" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setShowSettings(false)}>取消</button>
              <button
                className="confirm-button"
                onClick={() => {
                  setShowSettings(false)
                  alert('设置已保存')
                }}
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutoTradingPanel
