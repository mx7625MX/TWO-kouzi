/**
 * API设置面板
 * 集成和管理Twitter、Telegram、Discord、BSC、Solana等API
 */

import React, { useState, useEffect } from 'react'
import { useI18n } from '../utils/I18nContext'

interface APISettingsPanelProps {
  onClose: () => void
  onSave: (settings: any) => void
}

export const APISettingsPanel: React.FC<APISettingsPanelProps> = ({ onClose, onSave }) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'twitter' | 'telegram' | 'discord' | 'bsc' | 'solana' | 'dex'>('twitter')
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})

  // Twitter API配置
  const [twitterConfig, setTwitterConfig] = useState({
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessSecret: '',
    bearerToken: ''
  })

  // Telegram API配置
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: '',
    channels: ''
  })

  // Discord API配置
  const [discordConfig, setDiscordConfig] = useState({
    webhookUrl: '',
    servers: '',
    channels: ''
  })

  // BSC RPC配置
  const [bscConfig, setBscConfig] = useState({
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    wsUrl: 'wss://bsc-ws-node.nariox.org:443'
  })

  // Solana RPC配置
  const [solanaConfig, setSolanaConfig] = useState({
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    wsUrl: 'wss://api.mainnet-beta.solana.com'
  })

  // DEX API配置
  const [dexConfig, setDexConfig] = useState({
    pancakeSwapEnabled: true,
    raydiumEnabled: true,
    orcaEnabled: true,
    jupiterEnabled: true
  })

  useEffect(() => {
    loadSettings()
  }, [])

  /**
   * 加载API设置
   */
  const loadSettings = async () => {
    try {
      if ('ipcRenderer' in window) {
        const settings = await window.ipcRenderer.invoke('settings:get-api-config')
        if (settings) {
          if (settings.twitter) setTwitterConfig(settings.twitter)
          if (settings.telegram) setTelegramConfig(settings.telegram)
          if (settings.discord) setDiscordConfig(settings.discord)
          if (settings.bsc) setBscConfig(settings.bsc)
          if (settings.solana) setSolanaConfig(settings.solana)
          if (settings.dex) setDexConfig(settings.dex)
        }
      }
    } catch (error) {
      console.error('加载API设置失败:', error)
    }
  }

  /**
   * 保存API设置
   */
  const handleSave = async () => {
    try {
      setIsLoading(true)
      const settings = {
        twitter: twitterConfig,
        telegram: telegramConfig,
        discord: discordConfig,
        bsc: bscConfig,
        solana: solanaConfig,
        dex: dexConfig
      }

      if ('ipcRenderer' in window) {
        await window.ipcRenderer.invoke('settings:save-api-config', settings)
        onSave(settings)
        onClose()
      }
    } catch (error) {
      console.error('保存API设置失败:', error)
      alert('保存失败: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 测试API连接
   */
  const testAPI = async (type: string) => {
    try {
      if ('ipcRenderer' in window) {
        const result = await window.ipcRenderer.invoke('settings:test-api', { type, config: getConfigByType(type) })
        setTestResults(prev => ({
          ...prev,
          [type]: result
        }))
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [type]: { success: false, message: String(error) }
      }))
    }
  }

  /**
   * 根据类型获取配置
   */
  const getConfigByType = (type: string) => {
    switch (type) {
      case 'twitter': return twitterConfig
      case 'telegram': return telegramConfig
      case 'discord': return discordConfig
      case 'bsc': return bscConfig
      case 'solana': return solanaConfig
      case 'dex': return dexConfig
      default: return {}
    }
  }

  /**
   * 渲染Twitter设置
   */
  const renderTwitterSettings = () => (
    <div className="api-settings-section">
      <h3>{t('api.twitter.title')}</h3>
      <p className="api-description">{t('api.twitter.description')}</p>

      <div className="api-form">
        <div className="form-group">
          <label>{t('api.twitter.apiKey')}:</label>
          <input
            type="text"
            value={twitterConfig.apiKey}
            onChange={(e) => setTwitterConfig({ ...twitterConfig, apiKey: e.target.value })}
            placeholder="Twitter API Key"
          />
        </div>

        <div className="form-group">
          <label>{t('api.twitter.apiSecret')}:</label>
          <input
            type="password"
            value={twitterConfig.apiSecret}
            onChange={(e) => setTwitterConfig({ ...twitterConfig, apiSecret: e.target.value })}
            placeholder="Twitter API Secret"
          />
        </div>

        <div className="form-group">
          <label>{t('api.twitter.accessToken')}:</label>
          <input
            type="text"
            value={twitterConfig.accessToken}
            onChange={(e) => setTwitterConfig({ ...twitterConfig, accessToken: e.target.value })}
            placeholder="Access Token"
          />
        </div>

        <div className="form-group">
          <label>{t('api.twitter.accessSecret')}:</label>
          <input
            type="password"
            value={twitterConfig.accessSecret}
            onChange={(e) => setTwitterConfig({ ...twitterConfig, accessSecret: e.target.value })}
            placeholder="Access Secret"
          />
        </div>

        <div className="form-group">
          <label>{t('api.twitter.bearerToken')}:</label>
          <textarea
            value={twitterConfig.bearerToken}
            onChange={(e) => setTwitterConfig({ ...twitterConfig, bearerToken: e.target.value })}
            placeholder="Bearer Token"
            rows={3}
          />
        </div>

        <div className="api-test-section">
          <button className="test-button" onClick={() => testAPI('twitter')}>
            测试连接
          </button>
          {testResults.twitter && (
            <div className={`test-result ${testResults.twitter.success ? 'success' : 'error'}`}>
              {testResults.twitter.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /**
   * 渲染Telegram设置
   */
  const renderTelegramSettings = () => (
    <div className="api-settings-section">
      <h3>{t('api.telegram.title')}</h3>
      <p className="api-description">{t('api.telegram.description')}</p>

      <div className="api-form">
        <div className="form-group">
          <label>{t('api.telegram.botToken')}:</label>
          <input
            type="text"
            value={telegramConfig.botToken}
            onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
            placeholder="Bot Token"
          />
        </div>

        <div className="form-group">
          <label>{t('api.telegram.channels')}:</label>
          <textarea
            value={telegramConfig.channels}
            onChange={(e) => setTelegramConfig({ ...telegramConfig, channels: e.target.value })}
            placeholder="@channel1, @channel2"
            rows={3}
          />
        </div>

        <div className="api-test-section">
          <button className="test-button" onClick={() => testAPI('telegram')}>
            测试连接
          </button>
          {testResults.telegram && (
            <div className={`test-result ${testResults.telegram.success ? 'success' : 'error'}`}>
              {testResults.telegram.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /**
   * 渲染Discord设置
   */
  const renderDiscordSettings = () => (
    <div className="api-settings-section">
      <h3>{t('api.discord.title')}</h3>
      <p className="api-description">{t('api.discord.description')}</p>

      <div className="api-form">
        <div className="form-group">
          <label>{t('api.discord.webhookUrl')}:</label>
          <input
            type="text"
            value={discordConfig.webhookUrl}
            onChange={(e) => setDiscordConfig({ ...discordConfig, webhookUrl: e.target.value })}
            placeholder="https://discord.com/api/webhooks/..."
          />
        </div>

        <div className="form-group">
          <label>{t('api.discord.servers')}:</label>
          <textarea
            value={discordConfig.servers}
            onChange={(e) => setDiscordConfig({ ...discordConfig, servers: e.target.value })}
            placeholder="Server ID 1, Server ID 2"
            rows={2}
          />
        </div>

        <div className="form-group">
          <label>{t('api.discord.channels')}:</label>
          <textarea
            value={discordConfig.channels}
            onChange={(e) => setDiscordConfig({ ...discordConfig, channels: e.target.value })}
            placeholder="Channel ID 1, Channel ID 2"
            rows={2}
          />
        </div>

        <div className="api-test-section">
          <button className="test-button" onClick={() => testAPI('discord')}>
            测试连接
          </button>
          {testResults.discord && (
            <div className={`test-result ${testResults.discord.success ? 'success' : 'error'}`}>
              {testResults.discord.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /**
   * 渲染BSC RPC设置
   */
  const renderBSCSettings = () => (
    <div className="api-settings-section">
      <h3>{t('api.bsc.title')}</h3>
      <p className="api-description">{t('api.bsc.description')}</p>

      <div className="api-form">
        <div className="form-group">
          <label>{t('api.bsc.rpcUrl')}:</label>
          <input
            type="text"
            value={bscConfig.rpcUrl}
            onChange={(e) => setBscConfig({ ...bscConfig, rpcUrl: e.target.value })}
            placeholder="https://bsc-dataseed.binance.org/"
          />
        </div>

        <div className="form-group">
          <label>{t('api.bsc.wsUrl')}:</label>
          <input
            type="text"
            value={bscConfig.wsUrl}
            onChange={(e) => setBscConfig({ ...bscConfig, wsUrl: e.target.value })}
            placeholder="wss://bsc-ws-node.nariox.org:443"
          />
        </div>

        <div className="api-test-section">
          <button className="test-button" onClick={() => testAPI('bsc')}>
            测试连接
          </button>
          {testResults.bsc && (
            <div className={`test-result ${testResults.bsc.success ? 'success' : 'error'}`}>
              {testResults.bsc.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /**
   * 渲染Solana RPC设置
   */
  const renderSolanaSettings = () => (
    <div className="api-settings-section">
      <h3>{t('api.solana.title')}</h3>
      <p className="api-description">{t('api.solana.description')}</p>

      <div className="api-form">
        <div className="form-group">
          <label>{t('api.solana.rpcUrl')}:</label>
          <input
            type="text"
            value={solanaConfig.rpcUrl}
            onChange={(e) => setSolanaConfig({ ...solanaConfig, rpcUrl: e.target.value })}
            placeholder="https://api.mainnet-beta.solana.com"
          />
        </div>

        <div className="form-group">
          <label>{t('api.solana.wsUrl')}:</label>
          <input
            type="text"
            value={solanaConfig.wsUrl}
            onChange={(e) => setSolanaConfig({ ...solanaConfig, wsUrl: e.target.value })}
            placeholder="wss://api.mainnet-beta.solana.com"
          />
        </div>

        <div className="api-test-section">
          <button className="test-button" onClick={() => testAPI('solana')}>
            测试连接
          </button>
          {testResults.solana && (
            <div className={`test-result ${testResults.solana.success ? 'success' : 'error'}`}>
              {testResults.solana.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /**
   * 渲染DEX API设置
   */
  const renderDEXSettings = () => (
    <div className="api-settings-section">
      <h3>{t('api.dex.title')}</h3>
      <p className="api-description">{t('api.dex.description')}</p>

      <div className="api-form">
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={dexConfig.pancakeSwapEnabled}
              onChange={(e) => setDexConfig({ ...dexConfig, pancakeSwapEnabled: e.target.checked })}
            />
            {t('api.dex.pancakeSwap')}
          </label>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={dexConfig.raydiumEnabled}
              onChange={(e) => setDexConfig({ ...dexConfig, raydiumEnabled: e.target.checked })}
            />
            {t('api.dex.raydium')}
          </label>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={dexConfig.orcaEnabled}
              onChange={(e) => setDexConfig({ ...dexConfig, orcaEnabled: e.target.checked })}
            />
            {t('api.dex.orca')}
          </label>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={dexConfig.jupiterEnabled}
              onChange={(e) => setDexConfig({ ...dexConfig, jupiterEnabled: e.target.checked })}
            />
            {t('api.dex.jupiter')}
          </label>
        </div>

        <div className="api-test-section">
          <button className="test-button" onClick={() => testAPI('dex')}>
            测试连接
          </button>
          {testResults.dex && (
            <div className={`test-result ${testResults.dex.success ? 'success' : 'error'}`}>
              {testResults.dex.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="api-settings-panel-overlay">
      <div className="api-settings-panel">
        <div className="api-settings-header">
          <h2>API Settings</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="api-settings-tabs">
          <button
            className={`tab ${activeTab === 'twitter' ? 'active' : ''}`}
            onClick={() => setActiveTab('twitter')}
          >
            Twitter
          </button>
          <button
            className={`tab ${activeTab === 'telegram' ? 'active' : ''}`}
            onClick={() => setActiveTab('telegram')}
          >
            Telegram
          </button>
          <button
            className={`tab ${activeTab === 'discord' ? 'active' : ''}`}
            onClick={() => setActiveTab('discord')}
          >
            Discord
          </button>
          <button
            className={`tab ${activeTab === 'bsc' ? 'active' : ''}`}
            onClick={() => setActiveTab('bsc')}
          >
            BSC
          </button>
          <button
            className={`tab ${activeTab === 'solana' ? 'active' : ''}`}
            onClick={() => setActiveTab('solana')}
          >
            Solana
          </button>
          <button
            className={`tab ${activeTab === 'dex' ? 'active' : ''}`}
            onClick={() => setActiveTab('dex')}
          >
            DEX
          </button>
        </div>

        <div className="api-settings-content">
          {activeTab === 'twitter' && renderTwitterSettings()}
          {activeTab === 'telegram' && renderTelegramSettings()}
          {activeTab === 'discord' && renderDiscordSettings()}
          {activeTab === 'bsc' && renderBSCSettings()}
          {activeTab === 'solana' && renderSolanaSettings()}
          {activeTab === 'dex' && renderDEXSettings()}
        </div>

        <div className="api-settings-footer">
          <button className="cancel-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="save-button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
