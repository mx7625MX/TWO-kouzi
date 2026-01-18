import React, { useState, useEffect } from 'react';

const MarketMonitor: React.FC = () => {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      const result = await (window as any).electronAPI.market.getWatchlist();
      setWatchlist(result);
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  };

  const handleAddToken = async () => {
    if (!tokenInput) {
      alert('请输入代币地址');
      return;
    }

    try {
      await (window as any).electronAPI.market.addToWatchlist(tokenInput);
      setTokenInput('');
      loadWatchlist();
    } catch (error) {
      alert('添加失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>市场监控</h2>
        <p>监控代币价格和市场动态</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">添加监控</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            className="input"
            style={{ flex: 1, marginBottom: 0 }}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="输入代币地址"
          />
          <button className="button button-primary" onClick={handleAddToken}>
            添加
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">监控列表</h3>
        </div>
        {watchlist.length === 0 ? (
          <p>暂无监控项</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>代币</th>
                <th>名称</th>
                <th>链</th>
                <th>添加时间</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => (
                <tr key={item.id}>
                  <td><code>{item.token_address.substring(0, 10)}...</code></td>
                  <td>{item.token_name} ({item.token_symbol})</td>
                  <td>{item.chain}</td>
                  <td>{new Date(item.added_at * 1000).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MarketMonitor;
