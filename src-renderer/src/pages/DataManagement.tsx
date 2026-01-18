import React from 'react';

const DataManagement: React.FC = () => {
  const handleExport = async (type: string) => {
    try {
      const result = await (window as any).electronAPI.data.exportData(type);
      alert(`导出成功！文件已保存到: ${result.filePath}`);
    } catch (error) {
      alert('导出失败: ' + (error as Error).message);
    }
  };

  const handleClear = async (type: string) => {
    if (!confirm(`确定要清除${type}数据吗？此操作不可恢复。`)) {
      return;
    }

    try {
      await (window as any).electronAPI.data.clearData(type);
      alert('清除成功');
    } catch (error) {
      alert('清除失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>数据管理</h2>
        <p>管理应用数据和备份</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">数据导出</h3>
        </div>
        <div className="grid grid-3">
          <button className="button button-primary" onClick={() => handleExport('wallets')}>
            导出钱包
          </button>
          <button className="button button-primary" onClick={() => handleExport('settings')}>
            导出设置
          </button>
          <button className="button button-primary" onClick={() => handleExport('full')}>
            完整备份
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">数据清理</h3>
        </div>
        <div className="grid grid-3">
          <button className="button button-secondary" onClick={() => handleClear('alerts')}>
            清除预警
          </button>
          <button className="button button-secondary" onClick={() => handleClear('transactions')}>
            清除交易记录
          </button>
          <button className="button button-secondary" onClick={() => handleClear('sentiments')}>
            清除情绪数据
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">注意事项</h3>
        </div>
        <p style={{ color: '#a0a0c0', lineHeight: '1.6' }}>
          • 数据导出功能会将数据保存到应用的exports目录<br />
          • 完整备份包含所有用户数据，建议定期备份<br />
          • 清除数据操作不可恢复，请谨慎操作
        </p>
      </div>
    </div>
  );
};

export default DataManagement;
