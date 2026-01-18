"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // 钱包管理
    wallet: {
        createWallet: (mnemonic) => electron_1.ipcRenderer.invoke('wallet:create', mnemonic),
        importWallet: (privateKey) => electron_1.ipcRenderer.invoke('wallet:import', privateKey),
        getWallets: () => electron_1.ipcRenderer.invoke('wallet:getAll'),
        getBalance: (walletId, chain) => electron_1.ipcRenderer.invoke('wallet:getBalance', walletId, chain),
        signTransaction: (walletId, chain, txData) => electron_1.ipcRenderer.invoke('wallet:sign', walletId, chain, txData),
        deleteWallet: (walletId) => electron_1.ipcRenderer.invoke('wallet:delete', walletId),
    },
    // 代币发行
    launch: {
        launchToken: (params) => electron_1.ipcRenderer.invoke('launch:token', params),
        bundleBuy: (params) => electron_1.ipcRenderer.invoke('launch:bundleBuy', params),
        getLaunchTasks: () => electron_1.ipcRenderer.invoke('launch:getTasks'),
        cancelTask: (taskId) => electron_1.ipcRenderer.invoke('launch:cancelTask', taskId),
    },
    // MEV防护
    mevProtection: {
        enableProtection: (enabled) => electron_1.ipcRenderer.invoke('mev:enable', enabled),
        getProtectionStatus: () => electron_1.ipcRenderer.invoke('mev:getStatus'),
        getAttackStats: () => electron_1.ipcRenderer.invoke('mev:getStats'),
    },
    // AI情绪分析
    aiSentiment: {
        analyzeSentiment: (text) => electron_1.ipcRenderer.invoke('ai:analyze', text),
        getSentimentData: (token) => electron_1.ipcRenderer.invoke('ai:getSentimentData', token),
    },
    // 自动交易
    autoTrade: {
        enableTrading: (enabled) => electron_1.ipcRenderer.invoke('trade:enable', enabled),
        setStrategy: (strategy) => electron_1.ipcRenderer.invoke('trade:setStrategy', strategy),
        getTradingStatus: () => electron_1.ipcRenderer.invoke('trade:getStatus'),
    },
    // 风险预警
    riskAlert: {
        getAlerts: () => electron_1.ipcRenderer.invoke('risk:getAlerts'),
        setAlertRule: (rule) => electron_1.ipcRenderer.invoke('risk:setRule', rule),
        clearAlert: (alertId) => electron_1.ipcRenderer.invoke('risk:clearAlert', alertId),
    },
    // 市场监控
    market: {
        getMarketData: (token) => electron_1.ipcRenderer.invoke('market:getData', token),
        getWatchlist: () => electron_1.ipcRenderer.invoke('market:getWatchlist'),
        addToWatchlist: (token) => electron_1.ipcRenderer.invoke('market:addToWatchlist', token),
    },
    // 热点监控
    hotspot: {
        getHotTokens: () => electron_1.ipcRenderer.invoke('hotspot:getHotTokens'),
        getTrendingData: () => electron_1.ipcRenderer.invoke('hotspot:getTrending'),
    },
    // 盈利分析
    profit: {
        getProfitReport: (walletId) => electron_1.ipcRenderer.invoke('profit:getReport', walletId),
        getROIStats: (walletId) => electron_1.ipcRenderer.invoke('profit:getROI', walletId),
    },
    // 快速卖出
    flashSell: {
        quickSell: (params) => electron_1.ipcRenderer.invoke('flashSell:execute', params),
        getSellSettings: () => electron_1.ipcRenderer.invoke('flashSell:getSettings'),
    },
    // 交易历史
    history: {
        getTransactions: (filters) => electron_1.ipcRenderer.invoke('history:getTransactions', filters),
        exportTransactions: (format) => electron_1.ipcRenderer.invoke('history:export', format),
    },
    // 数据管理
    data: {
        exportData: (type) => electron_1.ipcRenderer.invoke('data:export', type),
        importData: (type, filePath) => electron_1.ipcRenderer.invoke('data:import', type, filePath),
        clearData: (type) => electron_1.ipcRenderer.invoke('data:clear', type),
    },
    // 设置
    settings: {
        getSettings: () => electron_1.ipcRenderer.invoke('settings:get'),
        updateSettings: (settings) => electron_1.ipcRenderer.invoke('settings:update', settings),
        resetSettings: () => electron_1.ipcRenderer.invoke('settings:reset'),
    },
});
// 预留事件监听接口
electron_1.contextBridge.exposeInMainWorld('electronEvents', {
    onWalletChange: (callback) => {
        electron_1.ipcRenderer.on('wallet:changed', (_, wallets) => callback(wallets));
    },
    onAlertReceived: (callback) => {
        electron_1.ipcRenderer.on('alert:received', (_, alert) => callback(alert));
    },
    onTaskUpdate: (callback) => {
        electron_1.ipcRenderer.on('task:updated', (_, task) => callback(task));
    },
});
