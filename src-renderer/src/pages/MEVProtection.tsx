import React, { useState, useEffect } from 'react';

const MEVProtection: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statusResult = await (window as any).electronAPI.mevProtection.getProtectionStatus();
      const statsResult = await (window as any).electronAPI.mevProtection.getAttackStats();
      setStatus(statusResult);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleToggleProtection = async () => {
    try {
      const result = await (window as any).electronAPI.mevProtection.enableProtection(!status?.enabled);
      loadData();
    } catch (error) {
      alert('操作失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>MEV防护</h2>
        <p>保护您的交易免受MEV攻击</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">防护状态</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {status?.enabled ? (
                <span className="status status-success">已启用</span>
              ) : (
                <span className="status status-danger">已禁用</span>
              )}
            </span>
            <button
              className={`button ${status?.enabled ? 'button-danger' : 'button-primary'}`}
              onClick={handleToggleProtection}
            >
              {status?.enabled ? '禁用防护' : '启用防护'}
            </button>
          </div>
          <div style={{ marginTop: '16px' }}>
            <p>Flashbots: {status?.flashbotsEnabled ? '✓' : '✗'}</p>
            <p>Jito: {status?.jitoEnabled ? '✓' : '✗'}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">攻击统计</h3>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#00d4ff' }}>
            {stats?.totalBlocked || 0}
          </h2>
          <p style={{ color: '#a0a0c0' }}>已阻止的攻击</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">按类型统计</h3>
        </div>
        {stats?.byType && Object.keys(stats.byType).length > 0 ? (
          <div className="grid grid-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} style={{ padding: '12px', backgroundColor: '#2a2a4a', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '8px' }}>{type}</h4>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4ff' }}>
                  {count as number}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无统计数据</p>
        )}
      </div>
    </div>
  );
};

export default MEVProtection;
