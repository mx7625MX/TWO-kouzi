import React, { useState, useEffect } from 'react';

const AutoTrading: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [strategy, setStrategy] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const result = await (window as any).electronAPI.autoTrade.getTradingStatus();
      setStatus(result);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const handleToggleTrading = async () => {
    try {
      await (window as any).electronAPI.autoTrade.enableTrading(!status?.enabled);
      loadStatus();
    } catch (error) {
      alert('操作失败: ' + (error as Error).message);
    }
  };

  const handleSetStrategy = async () => {
    try {
      await (window as any).electronAPI.autoTrade.setStrategy({
        name: strategy,
        enabled: true,
      });
      alert('策略已更新');
    } catch (error) {
      alert('更新失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>自动交易</h2>
        <p>配置和管理自动交易策略</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">交易状态</h3>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {status?.enabled ? (
              <span className="status status-success">运行中</span>
            ) : (
              <span className="status status-neutral">已停止</span>
            )}
          </span>
          <button
            className={`button ${status?.enabled ? 'button-danger' : 'button-primary'}`}
            onClick={handleToggleTrading}
          >
            {status?.enabled ? '停止交易' : '开始交易'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">交易策略</h3>
        </div>
        <label className="input-label">策略名称</label>
        <input
          className="input"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          placeholder="输入策略名称"
        />
        <button className="button button-primary" onClick={handleSetStrategy}>
          设置策略
        </button>
      </div>
    </div>
  );
};

export default AutoTrading;
