import React, { useState, useEffect } from 'react'
import { ipcRenderer } from 'electron'
import './ProfitPanel.css'

interface ProfitSummary {
  totalInvested: string
  totalReturn: string
  totalProfit: string
  totalProfitPercentage: string
  tradeCount: number
  winCount: number
  loseCount: number
  winRate: string
  bestProfit: string
  bestProfitPercentage: string
  worstLoss: string
  worstLossPercentage: string
  avgProfit: string
  avgProfitPercentage: string
  avgHoldDuration: number
}

interface ProfitRecord {
  id: string
  tokenAddress: string
  network: string
  buyPrice: string
  sellPrice: string
  amount: string
  profit: string
  profitPercentage: string
  buyTime: number
  sellTime: number
  holdDuration: number
  status: string
}

interface RankingItem {
  tokenAddress: string
  tokenSymbol?: string
  network: string
  profit: string
  profitPercentage: string
  tradeCount: number
  winRate: string
}

export default function ProfitPanel() {
  // 状态
  const [summary, setSummary] = useState<ProfitSummary | null>(null)
  const [records, setRecords] = useState<ProfitRecord[]>([])
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [selectedTab, setSelectedTab] = useState<'overview' | 'records' | 'rankings'>('overview')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [loading, setLoading] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [timeRange])

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      // 计算时间范围
      const now = Date.now()
      let timeRangeFilter: { start: number; end: number } | undefined

      if (timeRange !== 'all') {
        const days = parseInt(timeRange)
        timeRangeFilter = {
          start: now - (days * 24 * 60 * 60 * 1000),
          end: now
        }
      }

      // 加载汇总数据
      const summaryResult = await ipcRenderer.invoke('profit:get-summary', {
        timeRange: timeRangeFilter
      })

      if (summaryResult.success) {
        setSummary(summaryResult.summary)
      }

      // 加载收益记录
      const recordsResult = await ipcRenderer.invoke('profit:get-records', {
        timeRange: timeRangeFilter,
        limit: 50
      })

      if (recordsResult.success) {
        setRecords(recordsResult.records)
      }

      // 加载排行榜
      const rankingsResult = await ipcRenderer.invoke('profit:get-rankings', {
        type: 'token',
        limit: 10,
        orderBy: 'profit',
        order: 'DESC',
        timeRange: timeRangeFilter
      })

      if (rankingsResult.success) {
        setRankings(rankingsResult.rankings)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 格式化数值
  const formatValue = (value: string, decimals: number = 2): string => {
    try {
      const num = parseFloat(value)
      if (num === 0) return '0'
      if (Math.abs(num) < 0.0001) return num.toFixed(6)
      if (Math.abs(num) < 1) return num.toFixed(4)
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals })
    } catch {
      return '0'
    }
  }

  // 格式化百分比
  const formatPercentage = (value: string): string => {
    try {
      const num = parseFloat(value)
      return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
    } catch {
      return '0%'
    }
  }

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
  }

  // 格式化持有时长
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}天${hours % 24}小时`
    }
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${minutes}分钟`
  }

  // 删除记录
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('确定要删除此收益记录吗？')) {
      return
    }

    try {
      const result = await ipcRenderer.invoke('profit:delete-record', recordId)
      if (result.success) {
        loadData()
      } else {
        alert('删除失败: ' + result.error)
      }
    } catch (error: any) {
      alert('删除失败: ' + error.message)
    }
  }

  return (
    <div className="profit-panel">
      {/* 头部 */}
      <div className="profit-header">
        <h2>💰 收益统计与分析</h2>
        <div className="time-range-selector">
          <button
            className={timeRange === '7d' ? 'active' : ''}
            onClick={() => setTimeRange('7d')}
          >
            7天
          </button>
          <button
            className={timeRange === '30d' ? 'active' : ''}
            onClick={() => setTimeRange('30d')}
          >
            30天
          </button>
          <button
            className={timeRange === '90d' ? 'active' : ''}
            onClick={() => setTimeRange('90d')}
          >
            90天
          </button>
          <button
            className={timeRange === 'all' ? 'active' : ''}
            onClick={() => setTimeRange('all')}
          >
            全部
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="profit-tabs">
        <button
          className={selectedTab === 'overview' ? 'active' : ''}
          onClick={() => setSelectedTab('overview')}
        >
          📊 概览
        </button>
        <button
          className={selectedTab === 'records' ? 'active' : ''}
          onClick={() => setSelectedTab('records')}
        >
          📝 收益记录
        </button>
        <button
          className={selectedTab === 'rankings' ? 'active' : ''}
          onClick={() => setSelectedTab('rankings')}
        >
          🏆 排行榜
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      ) : (
        <>
          {/* 概览 */}
          {selectedTab === 'overview' && summary && (
            <div className="overview-section">
              {/* 总体统计 */}
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="card-label">总投资</div>
                  <div className="card-value">
                    ${formatValue(summary.totalInvested)}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-label">总回报</div>
                  <div className="card-value">
                    ${formatValue(summary.totalReturn)}
                  </div>
                </div>
                <div className={`summary-card ${parseFloat(summary.totalProfit) >= 0 ? 'profit' : 'loss'}`}>
                  <div className="card-label">总收益</div>
                  <div className="card-value">
                    {parseFloat(summary.totalProfit) >= 0 ? '+' : ''}${formatValue(summary.totalProfit)}
                  </div>
                  <div className="card-percentage">
                    {formatPercentage(summary.totalProfitPercentage)}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-label">交易次数</div>
                  <div className="card-value">
                    {summary.tradeCount}
                  </div>
                </div>
              </div>

              {/* 交易统计 */}
              <div className="trade-stats">
                <h3>交易统计</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">胜</div>
                    <div className="stat-value win">{summary.winCount}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">负</div>
                    <div className="stat-value lose">{summary.loseCount}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">胜率</div>
                    <div className="stat-value">{formatPercentage(summary.winRate)}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">平均收益</div>
                    <div className={`stat-value ${parseFloat(summary.avgProfit) >= 0 ? 'win' : 'lose'}`}>
                      {formatPercentage(summary.avgProfitPercentage)}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">最佳收益</div>
                    <div className="stat-value win">
                      {formatPercentage(summary.bestProfitPercentage)}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">最大亏损</div>
                    <div className="stat-value lose">
                      {formatPercentage(summary.worstLossPercentage)}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">平均持有时长</div>
                    <div className="stat-value">{formatDuration(summary.avgHoldDuration)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 收益记录 */}
          {selectedTab === 'records' && (
            <div className="records-section">
              <h3>收益记录 ({records.length})</h3>
              {records.length === 0 ? (
                <div className="no-data">
                  <p>暂无收益记录</p>
                </div>
              ) : (
                <div className="records-list">
                  {records.map(record => (
                    <div
                      key={record.id}
                      className={`record-card ${parseFloat(record.profit) >= 0 ? 'profit' : 'loss'}`}
                    >
                      <div className="record-header">
                        <div className="record-token">
                          <span className="token-symbol">
                            {record.tokenAddress.slice(0, 8)}...{record.tokenAddress.slice(-6)}
                          </span>
                          <span className={`token-network ${record.network}`}>
                            {record.network.toUpperCase()}
                          </span>
                        </div>
                        <div className="record-profit">
                          <span className="profit-value">
                            {parseFloat(record.profit) >= 0 ? '+' : ''}${formatValue(record.profit)}
                          </span>
                          <span className="profit-percentage">
                            {formatPercentage(record.profitPercentage)}
                          </span>
                        </div>
                      </div>
                      <div className="record-details">
                        <div className="detail-item">
                          <span className="label">买入价:</span>
                          <span className="value">${formatValue(record.buyPrice)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">卖出价:</span>
                          <span className="value">${formatValue(record.sellPrice)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">数量:</span>
                          <span className="value">{formatValue(record.amount)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">持有时长:</span>
                          <span className="value">{formatDuration(record.holdDuration)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">买入时间:</span>
                          <span className="value">{formatTime(record.buyTime)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">卖出时间:</span>
                          <span className="value">{formatTime(record.sellTime)}</span>
                        </div>
                      </div>
                      <div className="record-actions">
                        <button onClick={() => handleDeleteRecord(record.id)}>删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 排行榜 */}
          {selectedTab === 'rankings' && (
            <div className="rankings-section">
              <h3>🏆 代币收益排行榜</h3>
              {rankings.length === 0 ? (
                <div className="no-data">
                  <p>暂无排行榜数据</p>
                </div>
              ) : (
                <div className="rankings-list">
                  {rankings.map((item, index) => (
                    <div key={item.tokenAddress} className="ranking-card">
                      <div className="ranking-position">
                        {index + 1}
                      </div>
                      <div className="ranking-info">
                        <div className="ranking-token">
                          <span className="token-address">
                            {item.tokenAddress.slice(0, 8)}...{item.tokenAddress.slice(-6)}
                          </span>
                          <span className={`token-network ${item.network}`}>
                            {item.network.toUpperCase()}
                          </span>
                        </div>
                        <div className="ranking-stats">
                          <span className="stat">交易次数: {item.tradeCount}</span>
                          <span className="stat">胜率: {formatPercentage(item.winRate)}</span>
                        </div>
                      </div>
                      <div className="ranking-profit">
                        <div className="profit-value">
                          {parseFloat(item.profit) >= 0 ? '+' : ''}${formatValue(item.profit)}
                        </div>
                        <div className="profit-percentage">
                          {formatPercentage(item.profitPercentage)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
