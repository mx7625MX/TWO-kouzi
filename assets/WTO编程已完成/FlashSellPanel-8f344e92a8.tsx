import React, { useState, useEffect } from 'react'
import { ipcRenderer } from 'electron'
import '../styles/FlashSellPanel.css'

/**
 * 闪电卖出配置面板
 * - 支持时间触发卖出
 * - 支持分批卖出
 * - 支持价格触发卖出
 * - 支持止损保护
 */

interface FlashSellSettings {
  enabled: boolean
  strategy: 'all' | 'batch' | 'price-trigger' | 'stop-loss'
  delay: number
  batches: Array<{ time: number; ratio: number }>
  targetPrice: string
  priceOperator: '>=' | '<=' | '>' | '<'
  stopLossPrice: string
}

interface FlashSellTask {
  id: string
  network: string
  tokenAddress: string
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'
  createdAt: number
}

interface FlashSellPanelProps {
  tokenAddress?: string
  network?: 'bsc' | 'solana'
  onSellComplete?: (results: any) => void
  disabled?: boolean
}

export default function FlashSellPanel({
  tokenAddress,
  network = 'bsc',
  onSellComplete,
  disabled = false
}: FlashSellPanelProps) {
  // 闪电卖出配置
  const [flashSellEnabled, setFlashSellEnabled] = useState(false)
  const [flashSellStrategy, setFlashSellStrategy] = useState<'all' | 'batch' | 'price-trigger' | 'stop-loss'>('all')
  const [flashSellDelay, setFlashSellDelay] = useState(2)
  const [flashSellTargetPrice, setFlashSellTargetPrice] = useState('')
  const [flashSellStopLossPrice, setFlashSellStopLossPrice] = useState('')
  const [flashSellPriceOperator, setFlashSellPriceOperator] = useState('>=')
  const [flashSellBatches, setFlashSellBatches] = useState([
    { time: 2, ratio: 0.2 },
    { time: 5, ratio: 0.3 },
    { time: 10, ratio: 0.5 }
  ])

  // 任务状态
  const [flashSellTasks, setFlashSellTasks] = useState<FlashSellTask[]>([])
  const [isSelling, setIsSelling] = useState(false)
  const [sellResults, setSellResults] = useState<any[]>([])

  // 监听闪电卖出事件
  useEffect(() => {
    const handleFlashSellStarted = (_event: any, data: any) => {
      console.log('闪电卖出已启动:', data)
      setFlashSellTasks(prev => prev.map(task =>
        task.id === data.taskId ? { ...task, status: 'running' } : task
      ))
    }

    const handleFlashSellCompleted = (_event: any, data: any) => {
      console.log('闪电卖出已完成:', data)
      setFlashSellTasks(prev => prev.map(task =>
        task.id === data.taskId ? { ...task, status: data.status } : task
      ))
      setIsSelling(false)
      onSellComplete?.(data)
    }

    const handleFlashSellBatchCompleted = (_event: any, data: any) => {
      console.log('分批卖出已完成:', data)
    }

    const handleFlashSellCancel = (_event: any, data: any) => {
      console.log('闪电卖出已取消:', data)
      setFlashSellTasks(prev => prev.map(task =>
        task.id === data.taskId ? { ...task, status: 'cancelled' } : task
      ))
      setIsSelling(false)
    }

    // 注册事件监听
    ipcRenderer.on('flash-sell:started', handleFlashSellStarted)
    ipcRenderer.on('flash-sell:completed', handleFlashSellCompleted)
    ipcRenderer.on('flash-sell:batch-completed', handleFlashSellBatchCompleted)
    ipcRenderer.on('flash-sell:cancelled', handleFlashSellCancel)

    return () => {
      // 清理事件监听
      ipcRenderer.removeListener('flash-sell:started', handleFlashSellStarted)
      ipcRenderer.removeListener('flash-sell:completed', handleFlashSellCompleted)
      ipcRenderer.removeListener('flash-sell:batch-completed', handleFlashSellBatchCompleted)
      ipcRenderer.removeListener('flash-sell:cancelled', handleFlashSellCancel)
    }
  }, [onSellComplete])

  /**
   * 处理闪电卖出
   */
  const handleFlashSell = async (wallets: Array<{ address: string; privateKey: string }>) => {
    if (!tokenAddress) {
      alert('请先选择代币')
      return
    }

    if (wallets.length === 0) {
      alert('请选择要卖出的钱包')
      return
    }

    setIsSelling(true)

    try {
      // 创建闪电卖出参数
      const params = {
        tokenAddress,
        network,
        sellWallets: wallets,
        sellStrategy: flashSellStrategy,
        timeSettings: {
          delay: flashSellDelay,
          batches: flashSellStrategy === 'batch' ? flashSellBatches : []
        },
        priceSettings: {
          targetPrice: flashSellTargetPrice ? parseFloat(flashSellTargetPrice) : undefined,
          priceOperator: flashSellPriceOperator,
          stopLossPrice: flashSellStopLossPrice ? parseFloat(flashSellStopLossPrice) : undefined
        }
      }

      // 创建闪电卖出任务
      const createResult = await ipcRenderer.invoke('flash-sell:create', params)

      if (!createResult.success) {
        throw new Error(createResult.error || '创建闪电卖出任务失败')
      }

      // 启动闪电卖出任务
      const startResult = await ipcRenderer.invoke('flash-sell:start', createResult.taskId, params)

      if (!startResult.success) {
        throw new Error(startResult.error || '启动闪电卖出任务失败')
      }

      // 添加到任务列表
      const newTask: FlashSellTask = {
        id: createResult.taskId,
        network,
        tokenAddress,
        status: 'pending',
        createdAt: Date.now()
      }
      setFlashSellTasks(prev => [...prev, newTask])

      alert(`闪电卖出任务已启动，任务ID: ${createResult.taskId}`)

    } catch (error) {
      console.error('闪电卖出失败:', error)
      alert(`闪电卖出失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setIsSelling(false)
    }
  }

  /**
   * 取消闪电卖出
   */
  const handleCancelFlashSell = async (taskId: string) => {
    try {
      const result = await ipcRenderer.invoke('flash-sell:cancel', taskId)

      if (result.success) {
        alert('闪电卖出已取消')
      } else {
        throw new Error(result.error || '取消闪电卖出失败')
      }
    } catch (error) {
      console.error('取消闪电卖出失败:', error)
      alert(`取消闪电卖出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 添加分批配置
   */
  const handleAddBatch = () => {
    setFlashSellBatches(prev => [...prev, { time: 10, ratio: 0.1 }])
  }

  /**
   * 更新分批配置
   */
  const handleUpdateBatch = (index: number, field: 'time' | 'ratio', value: number) => {
    setFlashSellBatches(prev => prev.map((batch, i) =>
      i === index ? { ...batch, [field]: value } : batch
    ))
  }

  /**
   * 删除分批配置
   */
  const handleRemoveBatch = (index: number) => {
    setFlashSellBatches(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flash-sell-panel">
      <div className="flash-sell-header">
        <h3>闪电卖出</h3>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={flashSellEnabled}
            onChange={(e) => setFlashSellEnabled(e.target.checked)}
            disabled={disabled}
          />
          <span className="toggle"></span>
        </label>
      </div>

      {flashSellEnabled && (
        <div className="flash-sell-content">
          {/* 卖出策略 */}
          <div className="form-group">
            <label>卖出策略</label>
            <select
              value={flashSellStrategy}
              onChange={(e) => setFlashSellStrategy(e.target.value as any)}
              disabled={disabled || isSelling}
            >
              <option value="all">全部卖出</option>
              <option value="batch">分批卖出</option>
              <option value="price-trigger">价格触发卖出</option>
              <option value="stop-loss">止损保护</option>
            </select>
          </div>

          {/* 时间设置 */}
          {flashSellStrategy === 'all' && (
            <div className="form-group">
              <label>卖出时间（秒）</label>
              <div className="time-presets">
                <button
                  type="button"
                  onClick={() => setFlashSellDelay(2)}
                  disabled={disabled || isSelling}
                  className={flashSellDelay === 2 ? 'active' : ''}
                >
                  2秒
                </button>
                <button
                  type="button"
                  onClick={() => setFlashSellDelay(5)}
                  disabled={disabled || isSelling}
                  className={flashSellDelay === 5 ? 'active' : ''}
                >
                  5秒
                </button>
                <button
                  type="button"
                  onClick={() => setFlashSellDelay(10)}
                  disabled={disabled || isSelling}
                  className={flashSellDelay === 10 ? 'active' : ''}
                >
                  10秒
                </button>
                <button
                  type="button"
                  onClick={() => setFlashSellDelay(30)}
                  disabled={disabled || isSelling}
                  className={flashSellDelay === 30 ? 'active' : ''}
                >
                  30秒
                </button>
                <button
                  type="button"
                  onClick={() => setFlashSellDelay(60)}
                  disabled={disabled || isSelling}
                  className={flashSellDelay === 60 ? 'active' : ''}
                >
                  1分钟
                </button>
              </div>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="3600"
                value={flashSellDelay}
                onChange={(e) => setFlashSellDelay(parseFloat(e.target.value))}
                disabled={disabled || isSelling}
                placeholder="自定义时间（0.5-3600秒）"
              />
            </div>
          )}

          {/* 分批卖出配置 */}
          {flashSellStrategy === 'batch' && (
            <div className="form-group">
              <label>分批卖出配置</label>
              {flashSellBatches.map((batch, index) => (
                <div key={index} className="batch-config">
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="3600"
                    value={batch.time}
                    onChange={(e) => handleUpdateBatch(index, 'time', parseFloat(e.target.value))}
                    disabled={disabled || isSelling}
                    placeholder="时间（秒）"
                  />
                  <span>秒后卖出</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1"
                    value={batch.ratio}
                    onChange={(e) => handleUpdateBatch(index, 'ratio', parseFloat(e.target.value))}
                    disabled={disabled || isSelling}
                    placeholder="比例（0-1）"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBatch(index)}
                    disabled={disabled || isSelling}
                    className="remove-batch-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddBatch}
                disabled={disabled || isSelling}
                className="add-batch-btn"
              >
                + 添加批次
              </button>
            </div>
          )}

          {/* 价格触发设置 */}
          {flashSellStrategy === 'price-trigger' && (
            <>
              <div className="form-group">
                <label>目标价格</label>
                <input
                  type="number"
                  step="0.000001"
                  value={flashSellTargetPrice}
                  onChange={(e) => setFlashSellTargetPrice(e.target.value)}
                  disabled={disabled || isSelling}
                  placeholder="如: 0.0000123"
                />
              </div>
              <div className="form-group">
                <label>价格条件</label>
                <select
                  value={flashSellPriceOperator}
                  onChange={(e) => setFlashSellPriceOperator(e.target.value as any)}
                  disabled={disabled || isSelling}
                >
                  <option value=">=">价格 ≥ 目标价时卖出</option>
                  <option value="<=">价格 ≤ 目标价时卖出</option>
                  <option value=">">价格 > 目标价时卖出</option>
                  <option value="<">价格 < 目标价时卖出</option>
                </select>
              </div>
              <div className="form-group">
                <label>超时时间（秒）</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="3600"
                  value={flashSellDelay}
                  onChange={(e) => setFlashSellDelay(parseFloat(e.target.value))}
                  disabled={disabled || isSelling}
                  placeholder="如价格未达到，超时后卖出"
                />
              </div>
            </>
          )}

          {/* 止损设置 */}
          {flashSellStrategy === 'stop-loss' && (
            <>
              <div className="form-group">
                <label>止损价格</label>
                <input
                  type="number"
                  step="0.000001"
                  value={flashSellStopLossPrice}
                  onChange={(e) => setFlashSellStopLossPrice(e.target.value)}
                  disabled={disabled || isSelling}
                  placeholder="如: 0.000008"
                />
                <small>当价格跌破止损价时立即卖出</small>
              </div>
              <div className="form-group">
                <label>超时时间（秒）</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="3600"
                  value={flashSellDelay}
                  onChange={(e) => setFlashSellDelay(parseFloat(e.target.value))}
                  disabled={disabled || isSelling}
                  placeholder="如价格未跌破，超时后卖出"
                />
              </div>
            </>
          )}

          {/* 闪电卖出任务列表 */}
          {flashSellTasks.length > 0 && (
            <div className="flash-sell-tasks">
              <h4>闪电卖出任务</h4>
              {flashSellTasks.map(task => (
                <div key={task.id} className="flash-sell-task">
                  <div className="task-info">
                    <span className="task-network">{task.network.toUpperCase()}</span>
                    <span className="task-address">
                      {task.tokenAddress.slice(0, 8)}...{task.tokenAddress.slice(-6)}
                    </span>
                    <span className={`task-status status-${task.status}`}>
                      {task.status === 'pending' && '等待中'}
                      {task.status === 'running' && '执行中'}
                      {task.status === 'completed' && '已完成'}
                      {task.status === 'cancelled' && '已取消'}
                      {task.status === 'failed' && '失败'}
                    </span>
                  </div>
                  <div className="task-actions">
                    {task.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => handleCancelFlashSell(task.id)}
                        className="cancel-btn"
                      >
                        取消
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 导出 hook 以便其他组件使用
export function useFlashSell() {
  const [flashSellSettings, setFlashSellSettings] = useState<FlashSellSettings>({
    enabled: false,
    strategy: 'all',
    delay: 2,
    batches: [
      { time: 2, ratio: 0.2 },
      { time: 5, ratio: 0.3 },
      { time: 10, ratio: 0.5 }
    ],
    targetPrice: '',
    priceOperator: '>=',
    stopLossPrice: ''
  })

  const updateSettings = (settings: Partial<FlashSellSettings>) => {
    setFlashSellSettings(prev => ({ ...prev, ...settings }))
  }

  return {
    flashSellSettings,
    updateSettings
  }
}
