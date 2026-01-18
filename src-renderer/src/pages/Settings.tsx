import React, { useState, useEffect } from 'react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await (window as any).electronAPI.settings.get();
      setSettings(result);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await (window as any).electronAPI.settings.update(settings);
      alert('设置已保存');
    } catch (error) {
      alert('保存失败: ' + (error as Error).message);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('确定要重置所有设置吗？')) {
      return;
    }

    try {
      await (window as any).electronAPI.settings.reset();
      loadSettings();
      alert('设置已重置');
    } catch (error) {
      alert('重置失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>设置</h2>
        <p>配置应用偏好和功能</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">应用设置</h3>
        </div>
        <div className="grid grid-2">
          <div>
            <label className="input-label">主题</label>
            <select
              className="input"
              value={settings.theme || 'dark'}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
            >
              <option value="dark">深色</option>
              <option value="light">浅色</option>
            </select>
          </div>
          <div>
            <label className="input-label">语言</label>
            <select
              className="input"
              value={settings.language || 'zh-CN'}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">功能设置</h3>
        </div>
        <div className="grid grid-2">
          <div>
            <label className="input-label">自动交易</label>
            <select
              className="input"
              value={settings.auto_trading_enabled || 'false'}
              onChange={(e) => setSettings({ ...settings, auto_trading_enabled: e.target.value })}
            >
              <option value="false">禁用</option>
              <option value="true">启用</option>
            </select>
          </div>
          <div>
            <label className="input-label">MEV防护</label>
            <select
              className="input"
              value={settings.mev_protection_enabled || 'true'}
              onChange={(e) => setSettings({ ...settings, mev_protection_enabled: e.target.value })}
            >
              <option value="false">禁用</option>
              <option value="true">启用</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">操作</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="button button-primary" onClick={handleUpdateSettings}>
            保存设置
          </button>
          <button className="button button-secondary" onClick={handleResetSettings}>
            重置默认
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">关于</h3>
        </div>
        <div style={{ color: '#a0a0c0', lineHeight: '1.6' }}>
          <p><strong>Meme Master Pro</strong></p>
          <p>版本: 1.0.0</p>
          <p>专业的DeFi跨链操作平台，支持BSC和Solana</p>
          <p style={{ marginTop: '16px' }}>© 2025 Meme Master Pro Team</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
