import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 钱包管理
  wallet: {
    createWallet: (mnemonic: string) => ipcRenderer.invoke('wallet:create', mnemonic),
    importWallet: (privateKey: string) => ipcRenderer.invoke('wallet:import', privateKey),
    getWallets: () => ipcRenderer.invoke('wallet:getAll'),
    getBalance: (walletId: string, chain: string) => ipcRenderer.invoke('wallet:getBalance', walletId, chain),
    signTransaction: (walletId: string, chain: string, txData: any) => ipcRenderer.invoke('wallet:sign', walletId, chain, txData),
    deleteWallet: (walletId: string) => ipcRenderer.invoke('wallet:delete', walletId),
  },

  // 代币发行
  launch: {
    launchToken: (params: any) => ipcRenderer.invoke('launch:token', params),
    bundleBuy: (params: any) => ipcRenderer.invoke('launch:bundleBuy', params),
    getLaunchTasks: () => ipcRenderer.invoke('launch:getTasks'),
    cancelTask: (taskId: string) => ipcRenderer.invoke('launch:cancelTask', taskId),
  },

  // MEV防护
  mevProtection: {
    enableProtection: (enabled: boolean) => ipcRenderer.invoke('mev:enable', enabled),
    getProtectionStatus: () => ipcRenderer.invoke('mev:getStatus'),
    getAttackStats: () => ipcRenderer.invoke('mev:getStats'),
  },

  // AI情绪分析
  aiSentiment: {
    analyzeSentiment: (text: string) => ipcRenderer.invoke('ai:analyze', text),
    getSentimentData: (token: string) => ipcRenderer.invoke('ai:getSentimentData', token),
  },

  // 自动交易
  autoTrade: {
    enableTrading: (enabled: boolean) => ipcRenderer.invoke('trade:enable', enabled),
    setStrategy: (strategy: any) => ipcRenderer.invoke('trade:setStrategy', strategy),
    getTradingStatus: () => ipcRenderer.invoke('trade:getStatus'),
  },

  // 风险预警
  riskAlert: {
    getAlerts: () => ipcRenderer.invoke('risk:getAlerts'),
    setAlertRule: (rule: any) => ipcRenderer.invoke('risk:setRule', rule),
    clearAlert: (alertId: string) => ipcRenderer.invoke('risk:clearAlert', alertId),
  },

  // 市场监控
  market: {
    getMarketData: (token: string) => ipcRenderer.invoke('market:getData', token),
    getWatchlist: () => ipcRenderer.invoke('market:getWatchlist'),
    addToWatchlist: (token: string) => ipcRenderer.invoke('market:addToWatchlist', token),
  },

  // 热点监控
  hotspot: {
    getHotTokens: () => ipcRenderer.invoke('hotspot:getHotTokens'),
    getTrendingData: () => ipcRenderer.invoke('hotspot:getTrending'),
  },

  // 盈利分析
  profit: {
    getProfitReport: (walletId: string) => ipcRenderer.invoke('profit:getReport', walletId),
    getROIStats: (walletId: string) => ipcRenderer.invoke('profit:getROI', walletId),
  },

  // 快速卖出
  flashSell: {
    quickSell: (params: any) => ipcRenderer.invoke('flashSell:execute', params),
    getSellSettings: () => ipcRenderer.invoke('flashSell:getSettings'),
  },

  // 交易历史
  history: {
    getTransactions: (filters?: any) => ipcRenderer.invoke('history:getTransactions', filters),
    exportTransactions: (format: string) => ipcRenderer.invoke('history:export', format),
  },

  // 数据管理
  data: {
    exportData: (type: string) => ipcRenderer.invoke('data:export', type),
    importData: (type: string, filePath: string) => ipcRenderer.invoke('data:import', type, filePath),
    clearData: (type: string) => ipcRenderer.invoke('data:clear', type),
  },

  // 设置
  settings: {
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),
    resetSettings: () => ipcRenderer.invoke('settings:reset'),
  },
});

// 预留事件监听接口
contextBridge.exposeInMainWorld('electronEvents', {
  onWalletChange: (callback: (wallets: any[]) => void) => {
    ipcRenderer.on('wallet:changed', (_, wallets) => callback(wallets));
  },
  onAlertReceived: (callback: (alert: any) => void) => {
    ipcRenderer.on('alert:received', (_, alert) => callback(alert));
  },
  onTaskUpdate: (callback: (task: any) => void) => {
    ipcRenderer.on('task:updated', (_, task) => callback(task));
  },
});
