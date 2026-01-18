import React, { useState, useEffect } from 'react';

const FlashSell: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await (window as any).electronAPI.flashSell.getSellSettings();
      setSettings(result);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleQuickSell = async () => {
    if (!amount) {
      alert('请输入卖出数量');
      return;
    }

    if (!confirm('确定要执行快速卖出吗？此操作不可撤销。')) {
      return;
    }

    try {
      const result = await (window as any).electronAPI.flashSell.executeQuickSell({
        amount,
        maxSlippage: settings?.maxSlippage,
      });
      alert(`卖出成功！交易ID: ${result.transactionId}`);
      setAmount('');
    } catch (error) {
      alert('卖出失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>快速卖出</h2>
        <p>快速执行卖出操作</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚡ 快速卖出</h3>
        </div>
        <label className="input-label">卖出数量</label>
        <input
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="输入要卖出的数量"
        />
        <div className="grid grid-2" style={{ marginBottom: '16px' }}>
          <div>
            <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>最大滑点</p>
            <p>{settings?.maxSlippage}%</p>
          </div>
          <div>
            <p style={{ color: '#a0a0c0', marginBottom: '8px' }}>卖出策略</p>
            <p>{settings?.sellStrategy}</p>
          </div>
        </div>
        <button className="button button-danger" onClick={handleQuickSell}>
          ⚡ 立即卖出
        </button>
      </div>
    </div>
  );
};

export default FlashSell;
