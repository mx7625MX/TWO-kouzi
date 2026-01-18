import React, { useState } from 'react';

const ProfitAnalysis: React.FC = () => {
  const [walletId, setWalletId] = useState('');
  const [report, setReport] = useState<any>(null);

  const handleGenerateReport = async () => {
    if (!walletId) {
      alert('请输入钱包ID');
      return;
    }

    try {
      const result = await (window as any).electronAPI.profit.getProfitReport(walletId);
      setReport(result);
    } catch (error) {
      alert('生成报告失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>盈利分析</h2>
        <p>分析您的投资组合和交易盈利</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">生成盈利报告</h3>
        </div>
        <label className="input-label">钱包ID</label>
        <input
          className="input"
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
          placeholder="输入钱包ID"
        />
        <button className="button button-primary" onClick={handleGenerateReport}>
          生成报告
        </button>
      </div>

      {report && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">盈利报告</h3>
          </div>
          <div className="grid grid-3">
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>总盈利</p>
              <h2 style={{ fontSize: '24px', color: '#00d4ff' }}>${report.totalProfit}</h2>
            </div>
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>总亏损</p>
              <h2 style={{ fontSize: '24px', color: '#ff4757' }}>${report.totalLoss}</h2>
            </div>
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>净盈利</p>
              <h2 style={{ fontSize: '24px', color: parseFloat(report.netProfit) > 0 ? '#00d4ff' : '#ff4757' }}>
                ${report.netProfit}
              </h2>
            </div>
          </div>
          <div className="grid grid-4" style={{ marginTop: '16px' }}>
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>胜率</p>
              <h3>{report.winRate}%</h3>
            </div>
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>总交易数</p>
              <h3>{report.totalTrades}</h3>
            </div>
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>盈利交易</p>
              <h3>{report.profitableTrades}</h3>
            </div>
            <div>
              <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>平均盈利</p>
              <h3>${report.averageProfitPerTrade}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitAnalysis;
