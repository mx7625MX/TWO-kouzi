import React, { useState, useEffect } from 'react';

const HotspotMonitor: React.FC = () => {
  const [hotTokens, setHotTokens] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tokens, trends] = await Promise.all([
        (window as any).electronAPI.hotspot.getHotTokens(),
        (window as any).electronAPI.hotspot.getTrending(),
      ]);
      setHotTokens(tokens);
      setTrending(trends);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>热点监控</h2>
        <p>发现热门代币和市场趋势</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔥 热门代币</h3>
        </div>
        {hotTokens.length === 0 ? (
          <p>暂无数据</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>代币</th>
                <th>价格</th>
                <th>24h涨跌</th>
                <th>24h成交量</th>
                <th>社交评分</th>
                <th>趋势</th>
              </tr>
            </thead>
            <tbody>
              {hotTokens.map((token) => (
                <tr key={token.id}>
                  <td>{token.name} ({token.symbol})</td>
                  <td>${token.price}</td>
                  <td>
                    <span className={`status ${parseFloat(token.change24h) > 0 ? 'status-success' : 'status-danger'}`}>
                      {token.change24h}%
                    </span>
                  </td>
                  <td>${parseInt(token.volume24h).toLocaleString()}</td>
                  <td>{token.socialScore}</td>
                  <td>
                    <span>{token.trend === 'up' ? '📈' : '📉'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📊 趋势话题</h3>
        </div>
        {trending.length === 0 ? (
          <p>暂无数据</p>
        ) : (
          <div className="grid grid-2">
            {trending.map((topic, index) => (
              <div key={index} style={{ padding: '16px', backgroundColor: '#2a2a4a', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '8px' }}>{topic.topic}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#a0a0c0' }}>
                  <span>提及: {topic.mentions}</span>
                  <span>情绪: {topic.sentiment.toFixed(2)}</span>
                  <span>{topic.change}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HotspotMonitor;
