import React, { useState, useEffect } from 'react';

const RiskAlert: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const result = await (window as any).electronAPI.riskAlert.getAlerts();
      setAlerts(result);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const handleClearAlert = async (alertId: number) => {
    try {
      await (window as any).electronAPI.riskAlert.clearAlert(alertId.toString());
      loadAlerts();
    } catch (error) {
      alert('清除失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>风险预警</h2>
        <p>监控和管理风险预警</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">预警列表</h3>
        </div>
        {alerts.length === 0 ? (
          <p>暂无预警</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>级别</th>
                <th>类型</th>
                <th>消息</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <span className={`status status-${alert.level === 'high' ? 'danger' : alert.level === 'medium' ? 'warning' : 'neutral'}`}>
                      {alert.level}
                    </span>
                  </td>
                  <td>{alert.type}</td>
                  <td>{alert.message}</td>
                  <td>{new Date(alert.created_at * 1000).toLocaleString()}</td>
                  <td>
                    <button
                      className="button button-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleClearAlert(alert.id)}
                    >
                      清除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RiskAlert;
