import React, { useState, useEffect } from 'react';

const LaunchToken: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [chain, setChain] = useState('BSC');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const result = await (window as any).electronAPI.launch.getLaunchTasks();
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleLaunch = async () => {
    if (!tokenName || !tokenSymbol || !totalSupply) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      await (window as any).electronAPI.launch.launchToken({
        tokenName,
        tokenSymbol,
        totalSupply,
        chain,
      });
      alert('代币发行任务已创建');
      loadTasks();
    } catch (error) {
      alert('创建任务失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>代币发行</h2>
        <p>在BSC或Solana链上发行您的代币</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">发行新代币</h3>
        </div>
        <div className="grid grid-2">
          <div>
            <label className="input-label">代币名称</label>
            <input
              className="input"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="例如: My Token"
            />
          </div>
          <div>
            <label className="input-label">代币符号</label>
            <input
              className="input"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              placeholder="例如: MTK"
            />
          </div>
          <div>
            <label className="input-label">总供应量</label>
            <input
              className="input"
              value={totalSupply}
              onChange={(e) => setTotalSupply(e.target.value)}
              placeholder="例如: 1000000"
            />
          </div>
          <div>
            <label className="input-label">区块链</label>
            <select className="input" value={chain} onChange={(e) => setChain(e.target.value)}>
              <option value="BSC">BSC (Binance Smart Chain)</option>
              <option value="Solana">Solana</option>
            </select>
          </div>
        </div>
        <button className="button button-primary" onClick={handleLaunch}>
          🚀 发行代币
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">发行任务</h3>
        </div>
        {tasks.length === 0 ? (
          <p>暂无任务</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>任务ID</th>
                <th>代币</th>
                <th>链</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.task_id}>
                  <td><code>{task.task_id.substring(0, 8)}...</code></td>
                  <td>{task.token_name} ({task.token_symbol})</td>
                  <td>{task.chain}</td>
                  <td>
                    <span className={`status status-${task.status === 'completed' ? 'success' : task.status === 'failed' ? 'danger' : 'warning'}`}>
                      {task.status}
                    </span>
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

export default LaunchToken;
