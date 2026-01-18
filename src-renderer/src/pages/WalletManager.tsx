import React, { useState, useEffect } from 'react';

interface Wallet {
  id: number;
  name: string;
  address: string;
  chain: string;
  created_at: number;
}

const WalletManager: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'create' | 'import'>('create');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const result = await (window as any).electronAPI.wallet.getWallets();
      setWallets(result);
    } catch (error) {
      console.error('Failed to load wallets:', error);
    }
  };

  const handleCreateWallet = async () => {
    if (!mnemonic) {
      alert('请输入助记词');
      return;
    }

    try {
      await (window as any).electronAPI.wallet.createWallet(mnemonic);
      setShowImportModal(false);
      setMnemonic('');
      loadWallets();
    } catch (error) {
      alert('创建钱包失败: ' + (error as Error).message);
    }
  };

  const handleImportWallet = async () => {
    if (!privateKey) {
      alert('请输入私钥');
      return;
    }

    try {
      await (window as any).electronAPI.wallet.importWallet(privateKey);
      setShowImportModal(false);
      setPrivateKey('');
      loadWallets();
    } catch (error) {
      alert('导入钱包失败: ' + (error as Error).message);
    }
  };

  const handleDeleteWallet = async (walletId: number) => {
    if (!confirm('确定要删除这个钱包吗？此操作不可恢复。')) {
      return;
    }

    try {
      await (window as any).electronAPI.wallet.deleteWallet(walletId.toString());
      loadWallets();
    } catch (error) {
      alert('删除钱包失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>钱包管理</h2>
        <p>管理您的多链钱包，支持BSC和Solana</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">我的钱包</h3>
          <button
            className="button button-primary"
            onClick={() => setShowImportModal(true)}
          >
            + 添加钱包
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="loading">
            <p>暂无钱包，点击上方按钮添加</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>名称</th>
                <th>地址</th>
                <th>链</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet.id}>
                  <td>{wallet.name}</td>
                  <td>
                    <code>{wallet.address.substring(0, 10)}...{wallet.address.substring(wallet.address.length - 8)}</code>
                  </td>
                  <td>
                    <span className="status status-success">{wallet.chain}</span>
                  </td>
                  <td>{new Date(wallet.created_at * 1000).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="button button-danger"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleDeleteWallet(wallet.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showImportModal && (
        <div className="modal">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                {importType === 'create' ? '创建钱包' : '导入钱包'}
              </h3>
              <button
                className="button button-secondary"
                onClick={() => setShowImportModal(false)}
              >
                关闭
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <button
                className={`button ${importType === 'create' ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setImportType('create')}
              >
                创建钱包
              </button>
              <button
                className={`button ${importType === 'import' ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setImportType('import')}
                style={{ marginLeft: '8px' }}
              >
                导入钱包
              </button>
            </div>

            {importType === 'create' ? (
              <div>
                <label className="input-label">助记词</label>
                <textarea
                  className="input"
                  rows={4}
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="输入12或24位助记词"
                />
                <button
                  className="button button-primary"
                  onClick={handleCreateWallet}
                >
                  创建钱包
                </button>
              </div>
            ) : (
              <div>
                <label className="input-label">私钥</label>
                <input
                  className="input"
                  type="password"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="输入钱包私钥"
                />
                <button
                  className="button button-primary"
                  onClick={handleImportWallet}
                >
                  导入钱包
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletManager;
