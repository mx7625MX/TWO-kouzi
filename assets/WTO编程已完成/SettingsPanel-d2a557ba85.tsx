/**
 * 设置面板
 * 支持主题、语言、通知、安全、高级设置
 */

import React, { useState, useEffect } from 'react'
import { useI18n, useTheme, ThemeType, LanguageType } from '../utils/I18nContext'
import { ThemeProvider } from '../utils/ThemeContext'
import { APISettingsPanel } from './APISettingsPanel'
import { KeyboardShortcutsHelp } from '../utils/keyboardShortcuts'

interface SettingsPanelProps {
  onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { t, language, setLanguage } = useI18n()
  const { theme, setTheme, currentTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'theme' | 'language' | 'notifications' | 'security' | 'advanced'>('theme')
  const [showAPISettings, setShowAPISettings] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true)
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  /**
   * 加载设置
   */
  const loadSettings = async () => {
    try {
      if ('ipcRenderer' in window) {
        const settings = await window.ipcRenderer.invoke('settings:get-all')
        if (settings) {
          if (settings.notificationsEnabled !== undefined) setNotificationsEnabled(settings.notificationsEnabled)
          if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled)
          if (settings.autoUpdateEnabled !== undefined) setAutoUpdateEnabled(settings.autoUpdateEnabled)
          if (settings.debugMode !== undefined) setDebugMode(settings.debugMode)
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  /**
   * 保存设置
   */
  const saveSettings = async () => {
    try {
      const settings = {
        notificationsEnabled,
        soundEnabled,
        autoUpdateEnabled,
        debugMode
      }

      if ('ipcRenderer' in window) {
        await window.ipcRenderer.invoke('settings:save-all', settings)
      }
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  /**
   * 渲染主题设置
   */
  const renderThemeSettings = () => (
    <div className="settings-section">
      <h3>{t('settings.theme')}</h3>
      <div className="theme-options">
        <button
          className={`theme-option ${theme === 'light' ? 'active' : ''}`}
          onClick={() => setTheme('light')}
        >
          <div className="theme-preview light">
            <div className="theme-header"></div>
            <div className="theme-content">
              <div className="theme-card"></div>
              <div className="theme-card"></div>
            </div>
          </div>
          <span>{t('theme.light')}</span>
        </button>

        <button
          className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
        >
          <div className="theme-preview dark">
            <div className="theme-header"></div>
            <div className="theme-content">
              <div className="theme-card"></div>
              <div className="theme-card"></div>
            </div>
          </div>
          <span>{t('theme.dark')}</span>
        </button>

        <button
          className={`theme-option ${theme === 'auto' ? 'active' : ''}`}
          onClick={() => setTheme('auto')}
        >
          <div className="theme-preview auto">
            <div className="theme-header"></div>
            <div className="theme-content">
              <div className="theme-card"></div>
              <div className="theme-card"></div>
            </div>
          </div>
          <span>{t('theme.auto')}</span>
        </button>
      </div>

      <div className="current-theme-info">
        <p>当前主题: {currentTheme === 'light' ? '浅色' : '深色'}</p>
      </div>
    </div>
  )

  /**
   * 渲染语言设置
   */
  const renderLanguageSettings = () => (
    <div className="settings-section">
      <h3>{t('settings.language')}</h3>
      <div className="language-options">
        <button
          className={`language-option ${language === 'zh-CN' ? 'active' : ''}`}
          onClick={() => setLanguage('zh-CN')}
        >
          <span className="flag">🇨🇳</span>
          <span>{t('language.zh-CN')}</span>
        </button>

        <button
          className={`language-option ${language === 'en-US' ? 'active' : ''}`}
          onClick={() => setLanguage('en-US')}
        >
          <span className="flag">🇺🇸</span>
          <span>{t('language.en-US')}</span>
        </button>
      </div>
    </div>
  )

  /**
   * 渲染通知设置
   */
  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>{t('settings.notifications')}</h3>
      <div className="settings-options">
        <div className="setting-option">
          <label>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => {
                setNotificationsEnabled(e.target.checked)
                saveSettings()
              }}
            />
            <span>启用通知</span>
          </label>
          <p className="setting-description">接收热点警报和交易通知</p>
        </div>

        <div className="setting-option">
          <label>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => {
                setSoundEnabled(e.target.checked)
                saveSettings()
              }}
            />
            <span>启用声音</span>
          </label>
          <p className="setting-description">播放提示音</p>
        </div>
      </div>
    </div>
  )

  /**
   * 渲染安全设置
   */
  const renderSecuritySettings = () => (
    <div className="settings-section">
      <h3>{t('settings.security')}</h3>
      <div className="settings-options">
        <div className="setting-option">
          <label>
            <input type="checkbox" defaultChecked />
            <span>启用应用锁</span>
          </label>
          <p className="setting-description">启动时需要密码</p>
        </div>

        <div className="setting-option">
          <label>
            <input type="checkbox" defaultChecked />
            <span>自动锁定</span>
          </label>
          <p className="setting-description">5分钟无操作自动锁定</p>
        </div>

        <div className="setting-option">
          <label>
            <input type="checkbox" defaultChecked />
            <span>加密存储</span>
          </label>
          <p className="setting-description">加密存储敏感数据</p>
        </div>
      </div>
    </div>
  )

  /**
   * 渲染高级设置
   */
  const renderAdvancedSettings = () => (
    <div className="settings-section">
      <h3>{t('settings.advanced')}</h3>
      <div className="settings-options">
        <div className="setting-option">
          <label>
            <input
              type="checkbox"
              checked={autoUpdateEnabled}
              onChange={(e) => {
                setAutoUpdateEnabled(e.target.checked)
                saveSettings()
              }}
            />
            <span>自动更新</span>
          </label>
          <p className="setting-description">自动检查并更新应用</p>
        </div>

        <div className="setting-option">
          <label>
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => {
                setDebugMode(e.target.checked)
                saveSettings()
              }}
            />
            <span>调试模式</span>
          </label>
          <p className="setting-description">显示详细的调试信息</p>
        </div>

        <div className="setting-option">
          <button className="api-settings-button" onClick={() => setShowAPISettings(true)}>
            API 设置
          </button>
          <p className="setting-description">配置 Twitter、Telegram、Discord 等 API</p>
        </div>

        <div className="setting-option">
          <button className="shortcuts-help-button" onClick={() => setShowShortcutsHelp(true)}>
            快捷键帮助
          </button>
          <p className="setting-description">查看所有可用的快捷键</p>
        </div>

        <div className="setting-option">
          <button className="export-data-button">
            导出数据
          </button>
          <p className="setting-description">导出所有数据和配置</p>
        </div>

        <div className="setting-option">
          <button className="import-data-button">
            导入数据
          </button>
          <p className="setting-description">从备份文件导入数据</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="settings-panel-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>{t('settings.title')}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            主题
          </button>
          <button
            className={`tab ${activeTab === 'language' ? 'active' : ''}`}
            onClick={() => setActiveTab('language')}
          >
            语言
          </button>
          <button
            className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            通知
          </button>
          <button
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            安全
          </button>
          <button
            className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            高级
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'theme' && renderThemeSettings()}
          {activeTab === 'language' && renderLanguageSettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'advanced' && renderAdvancedSettings()}
        </div>
      </div>

      {showAPISettings && (
        <APISettingsPanel
          onClose={() => setShowAPISettings(false)}
          onSave={(settings) => console.log('API settings saved:', settings)}
        />
      )}

      {showShortcutsHelp && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
      )}
    </div>
  )
}
