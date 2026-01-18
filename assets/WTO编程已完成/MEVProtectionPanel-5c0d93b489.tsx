/**
 * MEV防护状态监控面板
 * 提供实时MEV防护状态、风险评估、交易分析和防御配置
 */

import React, { useState, useEffect } from 'react'
import './MEVProtectionPanel.css'

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

interface MEVProtectionStatus {
  enabled: boolean
  active: boolean
  flashbotsEnabled: boolean
  jitoEnabled: boolean
  totalProtected: number
  totalAttacksBlocked: number
  successRate: number
}

interface MEVRiskAssessment {
  riskLevel: RiskLevel
  riskScore: number
  attackProbability: number
  recommendedAction: string
  factors: string[]
}

interface ProtectedTransaction {
  id: string
  txHash: string
  network: 'BSC' | 'Solana'
  protectionMethod: 'flashbots' | 'jito' | 'privacy'
  riskLevel: RiskLevel
  gasSaved: string
  timestamp: number
  status: 'pending' | 'protected' | 'failed'
}

interface AttackBlocked {
  id: string
  attackType: 'front_run' | 'sandwich' | 'back_run'
  network: 'BSC' | 'Solana'
  blocked: boolean
  riskScore: number
  timestamp: number
  details: string
}

function MEVProtectionPanel() {
  const [protectionStatus, setProtectionStatus] = useState<MEVProtectionStatus | null>(null)
  const [riskAssessment, setRiskAssessment] = useState<MEVRiskAssessment | null>(null)
  const [protectedTransactions, setProtectedTransactions] = useState<ProtectedTransaction[]>([])
  const [attacksBlocked, setAttacksBlocked] = useState<AttackBlocked[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<ProtectedTransaction | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [networkFilter, setNetworkFilter] = useState<'all' | 'BSC' | 'Solana'>('all')

  // 加载初始数据
  useEffect(() => {
    loadProtectionStatus()
    loadRiskAssessment()
    loadProtectedTransactions()
    loadAttacksBlocked()
  }, [])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(async () => {
      await loadProtectionStatus()
      await loadRiskAssessment()
      await loadProtectedTransactions()
      await loadAttacksBlocked()
    }, 5000) // 5秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh])

  // 加载防护状态
  const loadProtectionStatus = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('mev-protection:get-status')
        if (result.success) {
          setProtectionStatus(result.data)
        }
      }
    } catch (error) {
      console.error('加载MEV防护状态失败:', error)
    }
  }

  // 加载风险评估
  const loadRiskAssessment = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('mev-protection:get-risk-assessment')
        if (result.success) {
          setRiskAssessment(result.data)
        }
      }
    } catch (error) {
      console.error('加载风险评估失败:', error)
    }
  }

  // 加载受保护交易
  const loadProtectedTransactions = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('mev-protection:get-protected-transactions', {
          limit: 50,
          timeRange
        })
        if (result.success) {
          setProtectedTransactions(result.data)
        }
      }
    } catch (error) {
      console.error('加载受保护交易失败:', error)
    }
  }

  // 加载已阻止攻击
  const loadAttacksBlocked = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('mev-protection:get-attacks-blocked', {
          limit: 50,
          timeRange
        })
        if (result.success) {
          setAttacksBlocked(result.data)
        }
      }
    } catch (error) {
      console.error('加载已阻止攻击失败:', error)
    }
  }

  // 启用/禁用MEV防护
  const toggleProtection = async () => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('mev-protection:toggle', !protectionStatus?.enabled)
        if (result.success) {
          await loadProtectionStatus()
          alert('MEV防护状态已更新')
        }
      }
    } catch (error) {
      console.error('切换MEV防护失败:', error)
      alert('切换MEV防护失败')
    }
  }

  // 获取风险级别颜色
  const getRiskLevelColor = (level: RiskLevel) => {
    const colors = {
      low: '#4ade80',
      medium: '#facc15',
      high: '#fb923c',
      critical: '#f87171'
    }
    return colors[level] || '#94a3b8'
  }

  // 获取风险级别文本
  const getRiskLevelText = (level: RiskLevel) => {
    const texts = {
      low: '低风险',
      medium: '中等风险',
      high: '高风险',
      critical: '极高风险'
    }
    return texts[level] || '未知'
  }

  // 获取网络图标
  const getNetworkIcon = (network: 'BSC' | 'Solana') => {
    return network === 'BSC' ? '🟡' : '🟣'
  }

  // 获取保护方法图标
  const getProtectionMethodIcon = (method: 'flashbots' | 'jito' | 'privacy') => {
    const icons = {
      flashbots: '⚡',
      jito: '🌊',
      privacy: '🔒'
    }
    return icons[method]
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

  return (
    <div className="mev-protection-panel">
      {/* 头部 */}
      <div className="panel-header">
        <div className="header-title">
          <h2>🛡️ MEV防护监控</h2>
          <p className="subtitle">实时监控和保护交易免受MEV攻击</p>
        </div>
        <div className="header-actions">
          <div className={`status-badge ${protectionStatus?.enabled ? 'active' : 'inactive'}`}>
            <span className="indicator"></span>
            {protectionStatus?.enabled ? '防护已启用' : '防护已禁用'}
          </div>
          <button
            className={`toggle-button ${protectionStatus?.enabled ? 'active' : ''}`}
            onClick={toggleProtection}
          >
            {protectionStatus?.enabled ? '禁用' : '启用'}
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
          <div className="stat-icon">🛡️</div>
          <div className="stat-content">
            <div className="stat-label">受保护交易</div>
            <div className="stat-value">{protectionStatus?.totalProtected || 0}</div>
            <div className="stat-trend positive">+12.5%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <div className="stat-label">已阻止攻击</div>
            <div className="stat-value">{protectionStatus?.totalAttacksBlocked || 0}</div>
            <div className="stat-trend positive">+8.3%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">防护成功率</div>
            <div className="stat-value">{protectionStatus?.successRate || 0}%</div>
            <div className="stat-trend positive">+0.5%</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">节省Gas费</div>
            <div className="stat-value">~$1,234</div>
            <div className="stat-trend positive">+15.2%</div>
          </div>
        </div>
      </div>

      {/* 风险评估面板 */}
      <div className="risk-assessment-panel">
        <div className="panel-title">
          <h3>📊 实时风险评估</h3>
          <div className="risk-level-badge" style={{ backgroundColor: getRiskLevelColor(riskAssessment?.riskLevel || 'low') }}>
            {getRiskLevelText(riskAssessment?.riskLevel || 'low')}
          </div>
        </div>

        <div className="risk-metrics">
          <div className="risk-metric">
            <div className="metric-label">风险评分</div>
            <div className="metric-value">{riskAssessment?.riskScore || 0}/100</div>
            <div className="metric-bar">
              <div
                className="metric-fill"
                style={{
                  width: `${riskAssessment?.riskScore || 0}%`,
                  backgroundColor: getRiskLevelColor(riskAssessment?.riskLevel || 'low')
                }}
              ></div>
            </div>
          </div>

          <div className="risk-metric">
            <div className="metric-label">攻击概率</div>
            <div className="metric-value">{(riskAssessment?.attackProbability || 0).toFixed(1)}%</div>
            <div className="metric-bar">
              <div
                className="metric-fill"
                style={{
                  width: `${riskAssessment?.attackProbability || 0}%`,
                  backgroundColor: getRiskLevelColor(riskAssessment?.riskLevel || 'low')
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="risk-recommendation">
          <div className="recommendation-title">建议操作</div>
          <div className="recommendation-text">{riskAssessment?.recommendedAction || '暂无建议'}</div>
        </div>

        <div className="risk-factors">
          <div className="factors-title">风险因素</div>
          <div className="factors-list">
            {riskAssessment?.factors.map((factor, index) => (
              <div key={index} className="factor-item">
                <span className="factor-bullet">•</span>
                {factor}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="content-grid">
        {/* 受保护交易列表 */}
        <div className="transactions-panel">
          <div className="panel-header">
            <h3>📋 受保护交易</h3>
            <div className="panel-controls">
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
              <select
                className="network-select"
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value as any)}
              >
                <option value="all">全部网络</option>
                <option value="BSC">BSC</option>
                <option value="Solana">Solana</option>
              </select>
            </div>
          </div>

          <div className="transactions-list">
            {protectedTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-text">暂无受保护交易</div>
              </div>
            ) : (
              protectedTransactions
                .filter(tx => networkFilter === 'all' || tx.network === networkFilter)
                .map(tx => (
                  <div
                    key={tx.id}
                    className={`transaction-item ${selectedTransaction?.id === tx.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    <div className="transaction-header">
                      <div className="transaction-network">{getNetworkIcon(tx.network)} {tx.network}</div>
                      <div className={`transaction-status ${tx.status}`}>
                        {tx.status === 'protected' ? '已保护' : tx.status === 'pending' ? '处理中' : '失败'}
                      </div>
                    </div>
                    <div className="transaction-hash">
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                    </div>
                    <div className="transaction-details">
                      <span className="detail-item">
                        {getProtectionMethodIcon(tx.protectionMethod)} {tx.protectionMethod}
                      </span>
                      <span className="detail-item">
                        风险: <span style={{ color: getRiskLevelColor(tx.riskLevel) }}>
                          {getRiskLevelText(tx.riskLevel)}
                        </span>
                      </span>
                      <span className="detail-item">
                        节省: {tx.gasSaved}
                      </span>
                    </div>
                    <div className="transaction-time">{formatTime(tx.timestamp)}</div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* 已阻止攻击列表 */}
        <div className="attacks-panel">
          <div className="panel-header">
            <h3>🚫 已阻止攻击</h3>
          </div>

          <div className="attacks-list">
            {attacksBlocked.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-text">暂无攻击记录</div>
              </div>
            ) : (
              attacksBlocked
                .filter(attack => networkFilter === 'all' || attack.network === networkFilter)
                .map(attack => (
                  <div key={attack.id} className="attack-item">
                    <div className="attack-header">
                      <div className="attack-type">
                        {attack.attackType === 'front_run' ? '⚡ 抢跑' :
                         attack.attackType === 'sandwich' ? '🥪 三明治' : '🔄 后跑'}
                      </div>
                      <div className="attack-network">{getNetworkIcon(attack.network)} {attack.network}</div>
                    </div>
                    <div className="attack-details">
                      <div className="detail-row">
                        <span className="detail-label">风险评分:</span>
                        <span className="detail-value" style={{ color: getRiskLevelColor(attack.riskLevel as RiskLevel) }}>
                          {attack.riskScore}/100
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">状态:</span>
                        <span className={`detail-value ${attack.blocked ? 'blocked' : 'failed'}`}>
                          {attack.blocked ? '✅ 已阻止' : '❌ 阻止失败'}
                        </span>
                      </div>
                    </div>
                    <div className="attack-description">{attack.details}</div>
                    <div className="attack-time">{formatTime(attack.timestamp)}</div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* 交易详情侧边栏 */}
      {selectedTransaction && (
        <div className="transaction-details-sidebar">
          <div className="sidebar-header">
            <h3>交易详情</h3>
            <button className="close-button" onClick={() => setSelectedTransaction(null)}>✕</button>
          </div>
          <div className="sidebar-content">
            <div className="detail-section">
              <div className="section-title">基本信息</div>
              <div className="detail-row">
                <span className="label">交易哈希:</span>
                <span className="value">{selectedTransaction.txHash}</span>
              </div>
              <div className="detail-row">
                <span className="label">网络:</span>
                <span className="value">
                  {getNetworkIcon(selectedTransaction.network)} {selectedTransaction.network}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">状态:</span>
                <span className={`value status-${selectedTransaction.status}`}>
                  {selectedTransaction.status === 'protected' ? '已保护' :
                   selectedTransaction.status === 'pending' ? '处理中' : '失败'}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-title">防护信息</div>
              <div className="detail-row">
                <span className="label">防护方法:</span>
                <span className="value">
                  {getProtectionMethodIcon(selectedTransaction.protectionMethod)} {selectedTransaction.protectionMethod}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">风险级别:</span>
                <span className="value" style={{ color: getRiskLevelColor(selectedTransaction.riskLevel) }}>
                  {getRiskLevelText(selectedTransaction.riskLevel)}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">节省Gas:</span>
                <span className="value positive">{selectedTransaction.gasSaved}</span>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-title">时间信息</div>
              <div className="detail-row">
                <span className="label">时间:</span>
                <span className="value">{formatTime(selectedTransaction.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-header">
              <h3>⚙️ MEV防护设置</h3>
              <button className="close-button" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="settings-content">
              <div className="setting-section">
                <h4>Flashbots设置</h4>
                <div className="setting-item">
                  <label>启用Flashbots</label>
                  <input type="checkbox" defaultChecked={protectionStatus?.flashbotsEnabled} />
                </div>
                <div className="setting-item">
                  <label>Relay URL</label>
                  <input type="text" defaultValue="https://relay.flashbots.net" />
                </div>
                <div className="setting-item">
                  <label>Gas溢价倍数</label>
                  <input type="number" defaultValue="1.1" step="0.1" min="1.0" max="2.0" />
                </div>
              </div>

              <div className="setting-section">
                <h4>Jito设置</h4>
                <div className="setting-item">
                  <label>启用Jito</label>
                  <input type="checkbox" defaultChecked={protectionStatus?.jitoEnabled} />
                </div>
                <div className="setting-item">
                  <label>端点URL</label>
                  <input type="text" defaultValue="https://mainnet.block-engine.jito.wtf" />
                </div>
                <div className="setting-item">
                  <label>小费百分比</label>
                  <input type="number" defaultValue="0.01" step="0.01" min="0" max="0.1" />
                </div>
              </div>

              <div className="setting-section">
                <h4>风险控制</h4>
                <div className="setting-item">
                  <label>最低风险评分</label>
                  <input type="number" defaultValue="80" min="0" max="100" />
                </div>
                <div className="setting-item">
                  <label>自动调整Gas</label>
                  <input type="checkbox" defaultChecked={true} />
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

export default MEVProtectionPanel
