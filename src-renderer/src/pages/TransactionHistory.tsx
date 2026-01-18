import React, { useState, useEffect } from 'react';

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filterChain, setFilterChain] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [filterChain]);

  const loadTransactions = async () => {
    try {
      const result = await (window as any).electronAPI.history.getTransactions({
        chain: filterChain || undefined,
      });
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const result = await (window as any).electronAPI.history.exportTransactions(format);
      alert(`导出成功！文件已保存到: ${result.filePath}`);
    } catch (error) {
      alert('导出失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>交易历史</h2>
        <p>查看和导出交易记录</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">筛选</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <select
            className="input"
            style={{ flex: 1, marginBottom: 0 }}
            value={filterChain}
            onChange={(e) => setFilterChain(e.target.value)}
          >
            <option value="">所有链</option>
            <option value="BSC">BSC</option>
            <option value="Solana">Solana</option>
          </select>
          <button className="button button-secondary" onClick={() => handleExport('csv')}>
            导出CSV
          </button>
          <button className="button button-secondary" onClick={() => handleExport('json')}>
            导出JSON
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">交易记录</h3>
        </div>
        {transactions.length === 0 ? (
          <p>暂无交易记录</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>交易哈希</th>
                <th>类型</th>
                <th>链</th>
                <th>金额</th>
                <th>状态</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td><code>{tx.tx_hash.substring(0, 10)}...</code></td>
                  <td>{tx.type}</td>
                  <td>{tx.chain}</td>
                  <td>{tx.amount}</td>
                  <td>
                    <span className={`status status-${tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td>{new Date(tx.created_at * 1000).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
