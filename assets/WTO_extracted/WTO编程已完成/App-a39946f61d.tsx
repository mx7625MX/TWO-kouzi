import React, { useState, useEffect } from 'react'
import WalletListManager from './WalletListManager'
import LaunchToken from './LaunchToken'
import LaunchTasks from './LaunchTasks'
import MarketMonitorPanel from './components/MarketMonitorPanel'
import FlashSellPanel from './components/FlashSellPanel'
import ProfitPanel from './components/ProfitPanel'
import HotspotMonitorPanel from './components/HotspotMonitorPanel'
import MEVProtectionPanel from './components/MEVProtectionPanel'
import AISentimentPanel from './components/AISentimentPanel'
import AutoTradingPanel from './components/AutoTradingPanel'
import RiskAlertSystem from './components/RiskAlertSystem'
import TransactionHistoryPanel from './components/TransactionHistoryPanel'
import DataManagementPanel from './components/DataManagementPanel'
import SettingsPanel from './components/SettingsPanel'
import { ThemeProvider } from './utils/ThemeContext'
import { I18nProvider, useI18n } from './utils/I18nContext'
import { useKeyboardShortcuts, defaultShortcuts } from './utils/keyboardShortcuts'
import './App.css'
import './styles/Global.css'
import './styles/TransactionHistoryPanel.css'
import './styles/DataManagementPanel.css'
import './styles/MEVProtectionPanel.css'
import './styles/AISentimentPanel.css'
import './styles/AutoTradingPanel.css'
import './styles/RiskAlertSystem.css'

type TabType = 'dashboard' | 'wallets' | 'launch' | 'tasks' | 'market' | 'flashsell' | 'profit' | 'hotspot' | 'mev' | 'sentiment' | 'autotrading' | 'alerts' | 'transactions' | 'data'

function AppContent() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'error'>('online')
  const [stats, setStats] = useState({
    walletCount: 0,
    activeTasks: 0,
    totalProfit: '0'
  })
  const [showSettings, setShowSettings] = useState(false)

  // 监听系统状态变化
  useEffect(() => {
    const handleSystemStatus = (_event: any, status: 'online' | 'offline' | 'error') => {
      setSystemStatus(status)
    }

    // 加载统计数据
    const loadStats = async () => {
      try {
        if ('ipcRenderer' in window) {
          const wallets = await window.ipcRenderer.invoke('wallet:list')
          const tasks = await window.ipcRenderer.invoke('launch:get-tasks')
          const profitData = await window.ipcRenderer.invoke('profit:get-summary')
          
          setStats({
            walletCount: wallets?.length || 0,
            activeTasks: tasks?.filter((t: any) => t.status === 'pending' || t.status === 'running').length || 0,
            totalProfit: profitData?.totalProfit || '0'
          })
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    }

    if ('ipcRenderer' in window) {
      window.ipcRenderer.on('system:status', handleSystemStatus)
      loadStats()
    }

    return () => {
      if ('ipcRenderer' in window) {
        window.ipcRenderer.removeAllListeners('system:status')
      }
    }
  }, [])

  // 快捷键支持
  useKeyboardShortcuts({
    shortcuts: [
      ...defaultShortcuts.map(shortcut => ({
        ...shortcut,
        action: () => {
          // 导航快捷键
          if (shortcut.ctrlKey && !shortcut.shiftKey && !shortcut.altKey) {
            const tabMap: Record<string, TabType> = {
              '1': 'dashboard',
              '2': 'wallets',
              '3': 'launch',
              '4': 'tasks',
              '5': 'market',
              '6': 'flashsell',
              '7': 'profit',
              '8': 'hotspot',
              '9': 'transactions',
              '0': 'data'
            }
            const tab = tabMap[shortcut.key]
            if (tab) setActiveTab(tab)
          }
          // 设置快捷键
          if (shortcut.key === ',' && shortcut.ctrlKey) {
            setShowSettings(true)
          }
        }
      }))
    ],
    enabled: true
  })

  // 渲染Dashboard
  const renderDashboard = () => (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🚀 Meme Master Pro</h1>
        <p className="subtitle">一站式Meme代币管理平台</p>
      </div>

      {/* 系统状态卡片 */}
      <div className="status-cards">
        <div className="status-card">
          <div className="card-icon">🟢</div>
          <div className="card-content">
            <div className="card-label">系统状态</div>
            <div className="card-value">
              {systemStatus === 'online' ? '运行中' : systemStatus === 'offline' ? '离线' : '异常'}
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon">💼</div>
          <div className="card-content">
            <div className="card-label">钱包数量</div>
            <div className="card-value">{stats.walletCount}</div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-label">活跃任务</div>
            <div className="card-value">{stats.activeTasks}</div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">总收益</div>
            <div className="card-value">{stats.totalProfit}</div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="quick-actions">
        <h3>快捷操作</h3>
        <div className="action-buttons">
          <button onClick={() => setActiveTab('wallets')}>
            <span className="icon">💼</span>
            <span>管理钱包</span>
          </button>
          <button onClick={() => setActiveTab('launch')}>
            <span className="icon">🚀</span>
            <span>一键发币</span>
          </button>
          <button onClick={() => setActiveTab('market')}>
            <span className="icon">📊</span>
            <span>市值管理</span>
          </button>
          <button onClick={() => setActiveTab('flashsell')}>
            <span className="icon">⚡</span>
            <span>闪电卖出</span>
          </button>
        </div>
      </div>

      {/* 功能模块介绍 */}
      <div className="feature-grid">
        <div className="feature-card" onClick={() => setActiveTab('wallets')}>
          <div className="feature-icon">💼</div>
          <h3>钱包管理</h3>
          <p>安全创建、导入和管理多个钱包，支持BSC和Solana双链。</p>
        </div>

        <div className="feature-card" onClick={() => setActiveTab('launch')}>
          <div className="feature-icon">🚀</div>
          <h3>一键发币</h3>
          <p>快速部署Meme代币到BSC和Solana，支持捆绑买入和流动性添加。</p>
        </div>

        <div className="feature-card" onClick={() => setActiveTab('tasks')}>
          <div className="feature-icon">📋</div>
          <h3>发币任务</h3>
          <p>实时追踪和管理所有发币任务，支持任务重试和状态监控。</p>
        </div>

        <div className="feature-card" onClick={() => setActiveTab('market')}>
          <div className="feature-icon">📊</div>
          <h3>市值管理</h3>
          <p>智能做市、价格维持、对敲交易，自动管理代币市值。</p>
        </div>

        <div className="feature-card" onClick={() => setActiveTab('flashsell')}>
          <div className="feature-icon">⚡</div>
          <h3>闪电卖出</h3>
          <p>毫秒级精度的自动卖出系统，支持多种策略和止损保护。</p>
        </div>

        <div className="feature-card" onClick={() => setActiveTab('profit')}>
          <div className="feature-icon">💰</div>
          <h3>收益统计</h3>
          <p>全面分析交易收益，提供统计报表和排行榜。</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-container">
      {/* 侧边导航栏 */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>Meme Master Pro</h1>
          <p className={`version ${systemStatus}`}>
            v2.2
            <span className={`status-dot ${systemStatus}`}></span>
          </p>
        </div>

        <div className="nav-menu">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            title={t('nav.dashboard')}
          >
            <span className="icon">🏠</span>
            <span className="label">{t('nav.dashboard')}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'wallets' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallets')}
            title={t('nav.wallets')}
          >
            <span className="icon">💼</span>
            <span className="label">{t('nav.wallets')}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'launch' ? 'active' : ''}`}
            onClick={() => setActiveTab('launch')}
            title={t('nav.launch')}
          >
            <span className="icon">🚀</span>
            <span className="label">{t('nav.launch')}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
            title={t('nav.tasks')}
          >
            <span className="icon">📋</span>
            <span className="label">{t('nav.tasks')}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'market' ? 'active' : ''}`}
            onClick={() => setActiveTab('market')}
            title={t('nav.market')}
          >
            <span className="icon">📊</span>
            <span className="label">{t('nav.market')}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'flashsell' ? 'active' : ''}`}
            onClick={() => setActiveTab('flashsell')}
            title={t('nav.flashsell')}
          >
            <span className="icon">⚡</span>
            <span className="label">{t('nav.flashsell')}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'profit' ? 'active' : ''}`}
            onClick={() => setActiveTab('profit')}
            title={t('nav.profit')}
          >
            <span className="icon">💰</span>
            <span className="label">{t('nav.profit')}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'hotspot' ? 'active' : ''}`}
            onClick={() => setActiveTab('hotspot')}
            title={t('nav.hotspot')}
          >
            <span className="icon">🔥</span>
            <span className="label">{t('nav.hotspot')}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'mev' ? 'active' : ''}`}
            onClick={() => setActiveTab('mev')}
            title="MEV防护 (Ctrl + 8)"
          >
            <span className="icon">🛡️</span>
            <span className="label">MEV防护</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'sentiment' ? 'active' : ''}`}
            onClick={() => setActiveTab('sentiment')}
            title="AI情绪 (Ctrl + 9)"
          >
            <span className="icon">🧠</span>
            <span className="label">AI情绪</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'autotrading' ? 'active' : ''}`}
            onClick={() => setActiveTab('autotrading')}
            title="自动交易 (Ctrl + 0)"
          >
            <span className="icon">🤖</span>
            <span className="label">自动交易</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
            title="风险预警 (Ctrl + -)"
          >
            <span className="icon">🚨</span>
            <span className="label">风险预警</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
            title="交易历史"
          >
            <span className="icon">📝</span>
            <span className="label">交易历史</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
            title="数据管理"
          >
            <span className="icon">💾</span>
            <span className="label">数据管理</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="settings-button" onClick={() => setShowSettings(true)} title="设置 (Ctrl + ,)">
            ⚙️
          </button>
          <div className={`status-indicator ${systemStatus}`}>
            <span className="dot"></span>
            <span className="text">
              {systemStatus === 'online' ? t('status.online') : systemStatus === 'offline' ? t('status.offline') : t('status.error')}
            </span>
          </div>
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="main-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'wallets' && <WalletListManager />}
        {activeTab === 'launch' && <LaunchToken />}
        {activeTab === 'tasks' && <LaunchTasks />}
        {activeTab === 'market' && <MarketMonitorPanel />}
        {activeTab === 'flashsell' && <FlashSellPanel />}
        {activeTab === 'profit' && <ProfitPanel />}
        {activeTab === 'hotspot' && <HotspotMonitorPanel />}
        {activeTab === 'mev' && <MEVProtectionPanel />}
        {activeTab === 'sentiment' && <AISentimentPanel />}
        {activeTab === 'autotrading' && <AutoTradingPanel />}
        {activeTab === 'alerts' && <RiskAlertSystem />}
        {activeTab === 'transactions' && <TransactionHistoryPanel />}
        {activeTab === 'data' && <DataManagementPanel />}
      </main>

      {/* 设置面板 */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

// 主应用组件，包含Provider
function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App