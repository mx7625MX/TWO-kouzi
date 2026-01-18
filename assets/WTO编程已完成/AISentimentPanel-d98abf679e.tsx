/**
 * AI情绪分析与预测可视化界面
 * 提供情绪分析结果可视化、热点趋势预测、虚假热点识别等功能
 */

import React, { useState, useEffect } from 'react'
import './AISentimentPanel.css'

type SentimentType = 'positive' | 'negative' | 'neutral'
type HotspotType = 'social' | 'onchain' | 'dex'

interface SentimentData {
  score: number // -1.0 到 1.0
  intensity: number // 0.0 到 1.0
  confidence: number // 0.0 到 1.0
  type: SentimentType
  timestamp: number
}

interface MarketSentimentIndex {
  overall: number
  social: number
  onchain: number
  news: number
  trend: 'up' | 'down' | 'stable'
  change24h: number
}

interface HotspotPrediction {
  id: string
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  type: HotspotType
  currentScore: number
  predictedScore: number
  confidence: number
  timeframe: string
  predictionType: 'price_increase' | 'price_decrease' | 'stable'
  riskLevel: 'low' | 'medium' | 'high'
}

interface FakeHotspot {
  id: string
  tokenSymbol: string
  network: 'BSC' | 'Solana'
  fakeProbability: number
  reasons: string[]
  detectedAt: number
  status: 'detected' | 'reviewed' | 'dismissed'
}

interface SentimentTrend {
  timestamp: number
  score: number
  volume: number
}

function AISentimentPanel() {
  const [marketSentiment, setMarketSentiment] = useState<MarketSentimentIndex | null>(null)
  const [hotspotPredictions, setHotspotPredictions] = useState<HotspotPrediction[]>([])
  const [fakeHotspots, setFakeHotspots] = useState<FakeHotspot[]>([])
  const [sentimentTrend, setSentimentTrend] = useState<SentimentTrend[]>([])
  const [selectedPrediction, setSelectedPrediction] = useState<HotspotPrediction | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [viewMode, setViewMode] = useState<'overview' | 'predictions' | 'fake_hotspots'>('overview')

  // 加载初始数据
  useEffect(() => {
    loadMarketSentiment()
    loadHotspotPredictions()
    loadFakeHotspots()
    loadSentimentTrend()
  }, [])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(async () => {
      await loadMarketSentiment()
      await loadHotspotPredictions()
      await loadFakeHotspots()
      await loadSentimentTrend()
    }, 10000) // 10秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh])

  // 加载市场情绪指数
  const loadMarketSentiment = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('ai-sentiment:get-market-sentiment', { timeRange })
        if (result.success) {
          setMarketSentiment(result.data)
        }
      }
    } catch (error) {
      console.error('加载市场情绪指数失败:', error)
    }
  }

  // 加载热点预测
  const loadHotspotPredictions = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('ai-sentiment:get-hotspot-predictions', {
          limit: 20,
          timeRange
        })
        if (result.success) {
          setHotspotPredictions(result.data)
        }
      }
    } catch (error) {
      console.error('加载热点预测失败:', error)
    }
  }

  // 加载虚假热点
  const loadFakeHotspots = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('ai-sentiment:get-fake-hotspots', {
          limit: 20,
          timeRange
        })
        if (result.success) {
          setFakeHotspots(result.data)
        }
      }
    } catch (error) {
      console.error('加载虚假热点失败:', error)
    }
  }

  // 加载情绪趋势
  const loadSentimentTrend = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('ai-sentiment:get-sentiment-trend', { timeRange })
        if (result.success) {
          setSentimentTrend(result.data)
        }
      }
    } catch (error) {
      console.error('加载情绪趋势失败:', error)
    }
  }

  // 获取情绪类型颜色
  const getSentimentColor = (score: number) => {
    if (score > 0.3) return '#4ade80' // 绿色 - 正面
    if (score < -0.3) return '#f87171' // 红色 - 负面
    return '#94a3b8' // 灰色 - 中性
  }

  // 获取情绪类型文本
  const getSentimentText = (score: number) => {
    if (score > 0.3) return '正面'
    if (score < -0.3) return '负面'
    return '中性'
  }

  // 获取风险级别颜色
  const getRiskLevelColor = (level: 'low' | 'medium' | 'high') => {
    const colors = {
      low: '#4ade80',
      medium: '#facc15',
      high: '#f87171'
    }
    return colors[level]
  }

  // 获取预测类型图标
  const getPredictionTypeIcon = (type: 'price_increase' | 'price_decrease' | 'stable') => {
    const icons = {
      price_increase: '📈',
      price_decrease: '📉',
      stable: '➡️'
    }
    return icons[type]
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
      return date.toLocaleDateString()
    }
  }

  // 绘制情绪趋势图
  const renderSentimentChart = () => {
    if (sentimentTrend.length === 0) return null

    const maxScore = Math.max(...sentimentTrend.map(d => Math.abs(d.score)))
    const chartHeight = 200
    const chartWidth = sentimentTrend.length * 10

    return (
      <div className="sentiment-chart-container">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* 零线 */}
          <line
            x1="0"
            y1={chartHeight / 2}
            x2={chartWidth}
            y2={chartHeight / 2}
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="5,5"
          />

          {/* 情绪曲线 */}
          <polyline
            points={sentimentTrend.map((d, i) => {
              const x = i * (chartWidth / sentimentTrend.length)
              const y = (chartHeight / 2) - (d.score / maxScore) * (chartHeight / 2 - 20)
              return `${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
          />

          {/* 数据点 */}
          {sentimentTrend.map((d, i) => {
            const x = i * (chartWidth / sentimentTrend.length)
            const y = (chartHeight / 2) - (d.score / maxScore) * (chartHeight / 2 - 20)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={getSentimentColor(d.score)}
              />
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div className="ai-sentiment-panel">
      {/* 头部 */}
      <div className="panel-header">
        <div className="header-title">
          <h2>🧠 AI情绪分析与预测</h2>
          <p className="subtitle">基于AI的市场情绪分析和热点趋势预测</p>
        </div>
        <div className="header-actions">
          <button
            className={`refresh-button ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            🔄
          </button>
          <select
            className="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="1h">1小时</option>
            <option value="24h">24小时</option>
            <option value="7d">7天</option>
            <option value="30d">30天</option>
          </select>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="view-tabs">
        <button
          className={`tab-button ${viewMode === 'overview' ? 'active' : ''}`}
          onClick={() => setViewMode('overview')}
        >
          📊 概览
        </button>
        <button
          className={`tab-button ${viewMode === 'predictions' ? 'active' : ''}`}
          onClick={() => setViewMode('predictions')}
        >
          🔮 预测
        </button>
        <button
          className={`tab-button ${viewMode === 'fake_hotspots' ? 'active' : ''}`}
          onClick={() => setViewMode('fake_hotspots')}
        >
          🚫 虚假热点
        </button>
      </div>

      {viewMode === 'overview' && (
        <>
          {/* 市场情绪指数 */}
          <div className="market-sentiment-section">
            <div className="section-title">
              <h3>📈 市场情绪指数</h3>
              <div className={`trend-badge ${marketSentiment?.trend}`}>
                {marketSentiment?.trend === 'up' ? '📈 上升' :
                 marketSentiment?.trend === 'down' ? '📉 下降' : '➡️ 稳定'}
              </div>
            </div>

            <div className="sentiment-gauge">
              <div className="gauge-container">
                <div
                  className="gauge-fill"
                  style={{
                    width: `${((marketSentiment?.overall || 0) + 1) * 50}%`,
                    backgroundColor: getSentimentColor(marketSentiment?.overall || 0)
                  }}
                ></div>
              </div>
              <div className="gauge-label">
                {getSentimentText(marketSentiment?.overall || 0)}
              </div>
              <div className="gauge-value">
                {(marketSentiment?.overall || 0).toFixed(2)}
              </div>
            </div>

            <div className="sentiment-breakdown">
              <div className="breakdown-item">
                <div className="item-label">社交媒体</div>
                <div className="item-bar">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${((marketSentiment?.social || 0) + 1) * 50}%`,
                      backgroundColor: getSentimentColor(marketSentiment?.social || 0)
                    }}
                  ></div>
                </div>
                <div className="item-value">{(marketSentiment?.social || 0).toFixed(2)}</div>
              </div>

              <div className="breakdown-item">
                <div className="item-label">链上数据</div>
                <div className="item-bar">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${((marketSentiment?.onchain || 0) + 1) * 50}%`,
                      backgroundColor: getSentimentColor(marketSentiment?.onchain || 0)
                    }}
                  ></div>
                </div>
                <div className="item-value">{(marketSentiment?.onchain || 0).toFixed(2)}</div>
              </div>

              <div className="breakdown-item">
                <div className="item-label">新闻资讯</div>
                <div className="item-bar">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${((marketSentiment?.news || 0) + 1) * 50}%`,
                      backgroundColor: getSentimentColor(marketSentiment?.news || 0)
                    }}
                  ></div>
                </div>
                <div className="item-value">{(marketSentiment?.news || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* 情绪趋势图 */}
          <div className="sentiment-trend-section">
            <div className="section-title">
              <h3>📉 情绪趋势</h3>
            </div>
            {renderSentimentChart()}
          </div>

          {/* 快速预测卡片 */}
          <div className="quick-predictions">
            <div className="section-title">
              <h3>🔮 快速预测</h3>
            </div>
            <div className="predictions-grid">
              {hotspotPredictions.slice(0, 4).map(prediction => (
                <div key={prediction.id} className="prediction-card">
                  <div className="card-header">
                    <span className="token-symbol">{prediction.tokenSymbol}</span>
                    <span className="network-badge">{prediction.network}</span>
                  </div>
                  <div className="prediction-type">
                    {getPredictionTypeIcon(prediction.predictionType)}
                    {prediction.predictionType === 'price_increase' ? '价格上涨' :
                     prediction.predictionType === 'price_decrease' ? '价格下跌' : '价格稳定'}
                  </div>
                  <div className="confidence-level">
                    置信度: {prediction.confidence.toFixed(1)}%
                  </div>
                  <div className="timeframe">{prediction.timeframe}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {viewMode === 'predictions' && (
        <div className="predictions-section">
          <div className="section-title">
            <h3>🔮 热点趋势预测</h3>
          </div>

          <div className="predictions-list">
            {hotspotPredictions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔮</div>
                <div className="empty-text">暂无预测数据</div>
              </div>
            ) : (
              hotspotPredictions.map(prediction => (
                <div
                  key={prediction.id}
                  className={`prediction-item ${selectedPrediction?.id === prediction.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPrediction(prediction)}
                >
                  <div className="prediction-header">
                    <div className="token-info">
                      <span className="token-symbol">{prediction.tokenSymbol}</span>
                      <span className="network-badge">{prediction.network}</span>
                    </div>
                    <div className={`risk-badge ${prediction.riskLevel}`} style={{ backgroundColor: getRiskLevelColor(prediction.riskLevel) }}>
                      {prediction.riskLevel === 'low' ? '低风险' :
                       prediction.riskLevel === 'medium' ? '中等风险' : '高风险'}
                    </div>
                  </div>

                  <div className="prediction-body">
                    <div className="prediction-metrics">
                      <div className="metric">
                        <span className="metric-label">当前评分:</span>
                        <span className="metric-value">{prediction.currentScore.toFixed(2)}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">预测评分:</span>
                        <span className="metric-value">{prediction.predictedScore.toFixed(2)}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">置信度:</span>
                        <span className="metric-value">{prediction.confidence.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="prediction-result">
                      <div className="result-type">
                        {getPredictionTypeIcon(prediction.predictionType)}
                        {prediction.predictionType === 'price_increase' ? '预测上涨' :
                         prediction.predictionType === 'price_decrease' ? '预测下跌' : '预测稳定'}
                      </div>
                      <div className="timeframe">{prediction.timeframe}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {viewMode === 'fake_hotspots' && (
        <div className="fake-hotspots-section">
          <div className="section-title">
            <h3>🚫 虚假热点识别</h3>
          </div>

          <div className="fake-hotspots-list">
            {fakeHotspots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-text">未检测到虚假热点</div>
              </div>
            ) : (
              fakeHotspots.map(hotspot => (
                <div key={hotspot.id} className={`fake-hotspot-item ${hotspot.status}`}>
                  <div className="hotspot-header">
                    <span className="token-symbol">{hotspot.tokenSymbol}</span>
                    <span className="network-badge">{hotspot.network}</span>
                    <div className={`status-badge ${hotspot.status}`}>
                      {hotspot.status === 'detected' ? '🔍 检测到' :
                       hotspot.status === 'reviewed' ? '👀 已审查' : '❌ 已忽略'}
                    </div>
                  </div>

                  <div className="hotspot-fake-probability">
                    <div className="probability-label">虚假概率</div>
                    <div className="probability-bar">
                      <div
                        className="probability-fill"
                        style={{ width: `${hotspot.fakeProbability * 100}%` }}
                      ></div>
                    </div>
                    <div className="probability-value">{(hotspot.fakeProbability * 100).toFixed(1)}%</div>
                  </div>

                  <div className="hotspot-reasons">
                    <div className="reasons-title">检测原因:</div>
                    <ul>
                      {hotspot.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="hotspot-actions">
                    <button className="action-button review">审查</button>
                    <button className="action-button dismiss">忽略</button>
                    <button className="action-button investigate">深入调查</button>
                  </div>

                  <div className="hotspot-time">检测于 {formatTime(hotspot.detectedAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AISentimentPanel
