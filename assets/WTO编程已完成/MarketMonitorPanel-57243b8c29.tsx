import React, { useState, useEffect } from 'react'
import { ipcRenderer } from 'electron'
import './MarketMonitorPanel.css'

interface MarketData {
  price: string
  marketCap: string
  liquidity: string
  volume24h: string
  priceChange24h: string
  lastUpdated: number
}

interface Alert {
  id: string
  type: 'price' | 'marketCap' | 'liquidity'
  condition: string
  value: string
  triggeredAt: number
}

interface MonitorTask {
  id: string
  tokenAddress: string
  network: 'bsc' | 'solana'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled'
  currentData: MarketData
  alerts: Alert[]
}

export default function MarketMonitorPanel() {
  // 状态
  const [tasks, setTasks] = useState<{
    active: MonitorTask[]
    paused: MonitorTask[]
    completed: MonitorTask[]
  }>({ active: [], paused: [], completed: [] })

  const [selectedTask, setSelectedTask] = useState<MonitorTask | null>(null)
  const [newMonitorAddress, setNewMonitorAddress] = useState('')
  const [newMonitorNetwork, setNewMonitorNetwork] = useState<'bsc' | 'solana'>('bsc')
  const [updateInterval, setUpdateInterval] = useState(5000)
  const [alerts, setAlerts] = useState<Alert[]>([])

  // 加载所有任务
  useEffect(() => {
    loadAllTasks()
  }, [])

  // 监听事件
  useEffect(() => {
    const handleCreated = (_event: any, data: any) => {
      loadAllTasks()
    }

    const handleStarted = (_event: any, data: any) => {
      loadAllTasks()
    }

    const handlePaused = (_event: any, data: any) => {
      loadAllTasks()
    }

    const handleCancelled = (_event: any, data: any) => {
      loadAllTasks()
    }

    const handleDataUpdated = (_event: any, data: any) => {
      if (selectedTask?.id === data.taskId) {
        updateTaskData(data.taskId)
      }
      loadAllTasks()
    }

    const handleAlertTriggered = (_event: any, data: any) => {
      if (selectedTask?.id === data.taskId) {
        updateTaskData(data.taskId)
        loadAllTasks()
      }

      // 显示通知
      if (Notification.permission === 'granted') {
        new Notification('市盈率预警', {
          body: `${data.type} 条件触发: ${data.condition} ${data.thresholdValue}, 当前值: ${data.currentValue}`
        })
      }
    }

    const handleError = (_event: any, data: any) => {
      console.error('市值监控错误:', data.error)
    }

    ipcRenderer.on('market-monitor:created', handleCreated)
    ipcRenderer.on('market-monitor:started', handleStarted)
    ipcRenderer.on('market-monitor:paused', handlePaused)
    ipcRenderer.on('market-monitor:cancelled', handleCancelled)
    ipcRenderer.on('market-monitor:data-updated', handleDataUpdated)
    ipcRenderer.on('market-monitor:alert-triggered', handleAlertTriggered)
    ipcRenderer.on('market-monitor:error', handleError)

    return () => {
      ipcRenderer.removeListener('market-monitor:created', handleCreated)
      ipcRenderer.removeListener('market-monitor:started', handleStarted)
      ipcRenderer.removeListener('market-monitor:paused', handlePaused)
      ipcRenderer.removeListener('market-monitor:cancelled', handleCancelled)
      ipcRenderer.removeListener('market-monitor:data-updated', handleDataUpdated)
      ipcRenderer.removeListener('market-monitor:alert-triggered', handleAlertTriggered)
      ipcRenderer.removeListener('market-monitor:error', handleError)
    }
  }, [selectedTask])

  // 更新任务数据
  const updateTaskData = async (taskId: string) => {
    try {
      const result = await ipcRenderer.invoke('market-monitor:get-status', taskId)
      if (result.success && result.task) {
        setSelectedTask(result.task)
        setAlerts(result.task.alerts || [])
      }
    } catch (error) {
      console.error('更新任务数据失败:', error)
    }
  }

  // 加载所有任务
  const loadAllTasks = async () => {
    try {
      const result = await ipcRenderer.invoke('market-monitor:get-all')
      if (result.success && result.tasks) {
        setTasks(result.tasks)
      }
    } catch (error) {
      console.error('加载任务失败:', error)
    }
  }

  // 创建监控任务
  const handleCreateTask = async () => {
    if (!newMonitorAddress) {
      alert('请输入代币地址')
      return
    }

    try {
      const result = await ipcRenderer.invoke('market-monitor:create', {
        tokenAddress: newMonitorAddress,
        network: newMonitorNetwork,
        config: {
          updateInterval,
          alertThresholds: {
            price: [],
            marketCap: [],
            liquidity: []
          }
        }
      })

      if (result.success) {
        alert('监控任务创建成功！')

        // 自动启动
        await ipcRenderer.invoke('market-monitor:start', result.taskId)

        // 清空输入
        setNewMonitorAddress('')

        // 刷新任务列表
        loadAllTasks()
      } else {
        alert('创建失败: ' + result.error)
      }
    } catch (error: any) {
      alert('创建失败: ' + error.message)
    }
  }

  // 启动任务
  const handleStartTask = async (taskId: string) => {
    try {
      const result = await ipcRenderer.invoke('market-monitor:start', taskId)
      if (result.success) {
        loadAllTasks()
      } else {
        alert('启动失败: ' + result.error)
      }
    } catch (error: any) {
      alert('启动失败: ' + error.message)
    }
  }

  // 暂停任务
  const handlePauseTask = async (taskId: string) => {
    try {
      const result = await ipcRenderer.invoke('market-monitor:pause', taskId)
      if (result.success) {
        loadAllTasks()
      } else {
        alert('暂停失败: ' + result.error)
      }
    } catch (error: any) {
      alert('暂停失败: ' + error.message)
    }
  }

  // 恢复任务
  const handleResumeTask = async (taskId: string) => {
    try {
      const result = await ipcRenderer.invoke('market-monitor:resume', taskId)
      if (result.success) {
        loadAllTasks()
      } else {
        alert('恢复失败: ' + result.error)
      }
    } catch (error: any) {
      alert('恢复失败: ' + error.message)
    }
  }

  // 取消任务
  const handleCancelTask = async (taskId: string) => {
    if (!confirm('确定要取消此监控任务吗？')) {
      return
    }

    try {
      const result = await ipcRenderer.invoke('market-monitor:cancel', taskId)
      if (result.success) {
        if (selectedTask?.id === taskId) {
          setSelectedTask(null)
        }
        loadAllTasks()
      } else {
        alert('取消失败: ' + result.error)
      }
    } catch (error: any) {
      alert('取消失败: ' + error.message)
    }
  }

  // 添加预警
  const handleAddAlert = async (
    type: 'price' | 'marketCap' | 'liquidity',
    condition: string,
    value: string
  ) => {
    if (!selectedTask) return

    try {
      const result = await ipcRenderer.invoke('market-monitor:add-alert', {
        taskId: selectedTask.id,
        type,
        condition,
        value
      })

      if (result.success) {
        updateTaskData(selectedTask.id)
      } else {
        alert('添加预警失败: ' + result.error)
      }
    } catch (error: any) {
      alert('添加预警失败: ' + error.message)
    }
  }

  // 格式化数值
  const formatValue = (value: string, decimals: number = 2): string => {
    try {
      const num = parseFloat(value)
      if (num === 0) return '0'
      if (num < 0.0001) return num.toFixed(6)
      if (num < 1) return num.toFixed(4)
      return num.toFixed(decimals)
    } catch {
      return '0'
    }
  }

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="market-monitor-panel">
      <div className="monitor-header">
        <h2>📊 市盈率与市值监控</h2>
      </div>

      {/* 创建新监控 */}
      <div className="create-monitor-section">
        <h3>创建新监控</h3>
        <div className="form-row">
          <input
            type="text"
            placeholder="代币地址"
            value={newMonitorAddress}
            onChange={(e) => setNewMonitorAddress(e.target.value)}
          />
          <select
            value={newMonitorNetwork}
            onChange={(e) => setNewMonitorNetwork(e.target.value as any)}
          >
            <option value="bsc">BSC</option>
            <option value="solana">Solana</option>
          </select>
          <input
            type="number"
            placeholder="更新频率(ms)"
            value={updateInterval}
            onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
          />
          <button className="btn-primary" onClick={handleCreateTask}>
            创建监控
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="tasks-section">
        <h3>监控任务</h3>

        {/* 活跃任务 */}
        <div className="task-group">
          <h4>🟢 活跃中 ({tasks.active.length})</h4>
          {tasks.active.map(task => (
            <div key={task.id} className="task-card">
              <div className="task-info">
                <div className="task-address">
                  {task.tokenAddress.slice(0, 8)}...{task.tokenAddress.slice(-6)}
                </div>
                <div className="task-network">{task.network.toUpperCase()}</div>
                <div className="task-price">
                  ${formatValue(task.currentData.price)}
                </div>
                <div className="task-marketcap">
                  MC: ${formatValue(task.currentData.marketCap)}
                </div>
              </div>
              <div className="task-actions">
                <button onClick={() => setSelectedTask(task)}>详情</button>
                <button onClick={() => handlePauseTask(task.id)}>暂停</button>
                <button onClick={() => handleCancelTask(task.id)}>取消</button>
              </div>
            </div>
          ))}
        </div>

        {/* 暂停任务 */}
        <div className="task-group">
          <h4>⏸️ 已暂停 ({tasks.paused.length})</h4>
          {tasks.paused.map(task => (
            <div key={task.id} className="task-card">
              <div className="task-info">
                <div className="task-address">
                  {task.tokenAddress.slice(0, 8)}...{task.tokenAddress.slice(-6)}
                </div>
                <div className="task-network">{task.network.toUpperCase()}</div>
                <div className="task-price">
                  ${formatValue(task.currentData.price)}
                </div>
              </div>
              <div className="task-actions">
                <button onClick={() => setSelectedTask(task)}>详情</button>
                <button onClick={() => handleResumeTask(task.id)}>恢复</button>
                <button onClick={() => handleCancelTask(task.id)}>取消</button>
              </div>
            </div>
          ))}
        </div>

        {/* 已完成任务 */}
        <div className="task-group">
          <h4>✅ 已完成 ({tasks.completed.length})</h4>
          {tasks.completed.map(task => (
            <div key={task.id} className="task-card completed">
              <div className="task-info">
                <div className="task-address">
                  {task.tokenAddress.slice(0, 8)}...{task.tokenAddress.slice(-6)}
                </div>
                <div className="task-network">{task.network.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 任务详情 */}
      {selectedTask && (
        <div className="task-details">
          <h3>任务详情</h3>
          <div className="details-header">
            <div className="detail-item">
              <span className="label">代币地址:</span>
              <span className="value">{selectedTask.tokenAddress}</span>
            </div>
            <div className="detail-item">
              <span className="label">网络:</span>
              <span className="value">{selectedTask.network.toUpperCase()}</span>
            </div>
            <div className="detail-item">
              <span className="label">状态:</span>
              <span className={`value status-${selectedTask.status}`}>
                {selectedTask.status}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">最后更新:</span>
              <span className="value">{formatTime(selectedTask.currentData.lastUpdated)}</span>
            </div>
          </div>

          {/* 实时数据 */}
          <div className="realtime-data">
            <h4>实时数据</h4>
            <div className="data-grid">
              <div className="data-card">
                <div className="data-label">当前价格</div>
                <div className="data-value">
                  ${formatValue(selectedTask.currentData.price)}
                </div>
              </div>
              <div className="data-card">
                <div className="data-label">市值</div>
                <div className="data-value">
                  ${formatValue(selectedTask.currentData.marketCap)}
                </div>
              </div>
              <div className="data-card">
                <div className="data-label">流动性</div>
                <div className="data-value">
                  ${formatValue(selectedTask.currentData.liquidity)}
                </div>
              </div>
              <div className="data-card">
                <div className="data-label">24h 交易量</div>
                <div className="data-value">
                  ${formatValue(selectedTask.currentData.volume24h)}
                </div>
              </div>
              <div className="data-card">
                <div className="data-label">24h 价格变化</div>
                <div className="data-value">
                  {formatValue(selectedTask.currentData.priceChange24h)}%
                </div>
              </div>
            </div>
          </div>

          {/* 预警设置 */}
          <div className="alerts-section">
            <h4>预警设置</h4>
            <div className="alert-config">
              <div className="alert-type">
                <h5>价格预警</h5>
                <div className="form-row">
                  <select id="price-condition">
                    <option value=">">大于</option>
                    <option value=">=">大于等于</option>
                    <option value="<">小于</option>
                    <option value="<=">小于等于</option>
                  </select>
                  <input
                    type="number"
                    id="price-value"
                    placeholder="价格值"
                  />
                  <button
                    onClick={() => {
                      const condition = (document.getElementById('price-condition') as HTMLSelectElement).value
                      const value = (document.getElementById('price-value') as HTMLInputElement).value
                      handleAddAlert('price', condition, value)
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="alert-type">
                <h5>市值预警</h5>
                <div className="form-row">
                  <select id="marketcap-condition">
                    <option value=">">大于</option>
                    <option value=">=">大于等于</option>
                    <option value="<">小于</option>
                    <option value="<=">小于等于</option>
                  </select>
                  <input
                    type="number"
                    id="marketcap-value"
                    placeholder="市值"
                  />
                  <button
                    onClick={() => {
                      const condition = (document.getElementById('marketcap-condition') as HTMLSelectElement).value
                      const value = (document.getElementById('marketcap-value') as HTMLInputElement).value
                      handleAddAlert('marketCap', condition, value)
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="alert-type">
                <h5>流动性预警</h5>
                <div className="form-row">
                  <select id="liquidity-condition">
                    <option value="<">小于</option>
                    <option value="<=">小于等于</option>
                  </select>
                  <input
                    type="number"
                    id="liquidity-value"
                    placeholder="流动性"
                  />
                  <button
                    onClick={() => {
                      const condition = (document.getElementById('liquidity-condition') as HTMLSelectElement).value
                      const value = (document.getElementById('liquidity-value') as HTMLInputElement).value
                      handleAddAlert('liquidity', condition, value)
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>

            {/* 预警记录 */}
            <div className="alerts-history">
              <h5>预警记录 ({alerts.length})</h5>
              {alerts.length === 0 ? (
                <p className="no-alerts">暂无预警记录</p>
              ) : (
                <div className="alert-list">
                  {alerts.map(alert => (
                    <div key={alert.id} className="alert-item">
                      <div className="alert-type-badge">{alert.type}</div>
                      <div className="alert-condition">
                        {alert.condition} {alert.value}
                      </div>
                      <div className="alert-time">{formatTime(alert.triggeredAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
